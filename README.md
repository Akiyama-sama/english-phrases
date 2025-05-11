# 英语短语资源 (8000+)

本项目提供超过 8000 条英语短语及其相关数据，方便学习和开发使用。

## 资源概览

所有核心数据资源均位于 `output/` 目录下：

1.  **`englishPhrase.txt`**
    *   纯英文短语列表，每行一个短语。
    *   主要整合自 `lists/` 目录中的短语（部分原始短语可能存在拼写错误，已在此处进行初步校正和汇总）。

2.  **`englishPhrase.json`**
    *   包含短语、中文释义、中英文例句的 JSON 文件。
    *   释义与例句由 Google Gemini 1.5 Flash LLM 生成。
    *   **JSON 对象结构示例：**
        ```json
        {
          "phrase": "break off",
          "translations": [
            {
              "tran": "中断，停止", // 中文释义
              "sentence": "The meeting was broken off due to an emergency.", // 英文例句
              "sCN": "由于紧急情况，会议中断了。" // 例句中文翻译
            },
            {
              "tran": "断裂，折断",
              "sentence": "He broke off a piece of chocolate.",
              "sCN": "他掰下一块巧克力。"
            },
            {
              "tran": "解除（关系）",
              "sentence": "They decided to break off their engagement.",
              "sCN": "他们决定解除婚约。"
            }
          ]
        }
        ```

3.  **`englishPhrase.db`**
    *   SQLite 数据库文件，存储与 JSON 文件相同的数据，方便查询。
    *   **表结构 (`phrases`)：**
        ```sql
        CREATE TABLE IF NOT EXISTS phrases (
          phrase TEXT PRIMARY KEY NOT NULL, -- 英文短语
          translations_json TEXT          -- 包含释义、例句的数组 (JSON字符串格式)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_phrase_text ON phrases (phrase);
        ```

## 使用指南

*   **直接使用数据：** 如果您仅需要数据，可直接从 `output/` 目录下载相应文件。
*   **运行处理脚本：** `scripts/` 目录下提供以下 Node.js 脚本，方便您自行处理或生成数据：
    *   `collect_phrases.js`：从 `lists/` 目录收集并整合所有短语到 `englishPhrase.txt`。
    *   `phrase-analyze.js`：调用 LLM API (需在 `.env` 文件中配置 `GEMINI_API_KEY`)，为 `englishPhrase.txt` 中的短语生成释义和例句，并输出到 `englishPhrase.json`。
    *   `json-to-sqlite.js`：将 `englishPhrase.json` 的数据导入到 `englishPhrase.db` SQLite 数据库中。

    **运行脚本步骤：**
    ```bash
    # 1. 克隆本仓库
    git clone <repository_url>
    cd <repository_directory>
    
    # 2. 安装依赖
    npm install
    
    # 3. (可选) 配置 API 密钥
    # cp .env.example .env  (如果提供了.env.example)
    # nano .env             (编辑 .env 文件，填入您的 GEMINI_API_KEY)
    
    # 4. 运行相应脚本，例如:
    # node scripts/collect_phrases.js
    # node scripts/phrase-analyze.js
    # node scripts/json-to-sqlite.js
    ```

## 数据来源

*   基础短语列表主要参考自：[2ndLA/english-phrases](https://github.com/2ndLA/english-phrases)
*   释义和例句由 Google Gemini LLM 生成。

## 授权协议

本项目采用 [CC BY-SA 4.0](LICENSE) 授权协议。
(如果您的 LICENSE 文件在根目录，可以直接链接 `LICENSE` 或 `LICENSE.md`)