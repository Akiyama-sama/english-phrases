const fs = require('fs').promises;
const Database = require('better-sqlite3');

// --- 配置 ---
const JSON_FILE_PATH = 'output/englishPhrases.json';
const DB_FILE_PATH = 'output/englishPhrases.db';
// -------------

async function main() {
    let db;
    try {
        // 1. 连接到 SQLite 数据库 (如果文件不存在则创建)
        db = new Database(DB_FILE_PATH, { verbose: console.log });
        console.log(`已连接到数据库: ${DB_FILE_PATH}`);

        // 2. 创建表和索引 (如果不存在)
        const createTableSql = `
            CREATE TABLE IF NOT EXISTS phrases (
                phrase TEXT PRIMARY KEY NOT NULL, -- 英文短语
                translations_json TEXT          -- 包含 sCN, sentence, tran 的数组，JSON字符串化存储
            );
        `;
        const createIndexSql = `
            CREATE UNIQUE INDEX IF NOT EXISTS idx_phrase_text ON phrases (phrase);
        `;
        db.exec(createTableSql);
        db.exec(createIndexSql);
        console.log('表和索引已确保存在。');

        // 3. 读取 JSON 文件
        let phrasesData;
        try {
            const jsonData = await fs.readFile(JSON_FILE_PATH, 'utf8');
            phrasesData = JSON.parse(jsonData);
        } catch (readError) {
            if (readError.code === 'ENOENT') {
                console.error(`错误: JSON 文件 ${JSON_FILE_PATH} 未找到。请确保文件存在于正确的位置。`);
                return; // 退出脚本，因为没有数据可导入
            } else {
                console.error(`读取 JSON 文件 ${JSON_FILE_PATH} 失败:`, readError);
                throw readError; // 重新抛出其他读取错误
            }
        }
        
        if (!Array.isArray(phrasesData)) {
            console.error('错误: JSON 文件顶层结构不是一个数组。');
            return;
        }
        if (phrasesData.length === 0) {
            console.log('JSON 文件为空，没有数据可导入。');
            return;
        }
        console.log(`从 ${JSON_FILE_PATH} 读取了 ${phrasesData.length} 条记录。`);

        // 4. 准备插入语句
        const insertStmt = db.prepare('INSERT OR IGNORE INTO phrases (phrase, translations_json) VALUES (?, ?)');

        // 5. 遍历数据并插入 (使用事务以提高性能)
        let insertedCount = 0;
        let ignoredCount = 0;

        const insertMany = db.transaction((phrases) => {
            for (const item of phrases) {
                if (!item || typeof item.phrase !== 'string' || !Array.isArray(item.translations)) {
                    console.warn('警告: 跳过格式不正确的条目:', item);
                    ignoredCount++; // 可以视作一种忽略
                    continue;
                }
                try {
                    const translationsJson = JSON.stringify(item.translations);
                    const info = insertStmt.run(item.phrase, translationsJson);
                    if (info.changes > 0) {
                        insertedCount++;
                    } else {
                        ignoredCount++; // 主键冲突，被忽略
                    }
                } catch (stringifyError) {
                    console.warn(`警告: 无法 JSON 字符串化短语 '${item.phrase}' 的 translations，已跳过:`, stringifyError, item.translations);
                    ignoredCount++;
                }
            }
        });

        insertMany(phrasesData);

        console.log('--- 导入摘要 ---');
        console.log(`成功插入新记录数: ${insertedCount}`);
        console.log(`因重复或其他原因忽略/跳过的记录数: ${ignoredCount}`);
        console.log(`总处理记录数: ${phrasesData.length}`);

    } catch (error) {
        console.error('脚本执行过程中发生错误:', error);
    } finally {
        // 6. 关闭数据库连接
        if (db) {
            db.close();
            console.log('数据库连接已关闭。');
        }
    }
}

main().catch(err => {
    console.error("未捕获的顶层错误:", err);
}); 