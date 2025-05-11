const fs = require('fs');
const path = require('path');

// 主函数
async function collectPhrases() {
  try {
    // 获取lists目录中的所有txt文件
    const listsDir = path.join(__dirname, '../lists');
    const files = fs.readdirSync(listsDir).filter(file => file.endsWith('.txt'));
    
    // 用于存储所有短语的集合，使用Set来去重
    const phrasesSet = new Set();
    
    // 遍历每个文件并读取其中的短语
    for (const file of files) {
      const filePath = path.join(listsDir, file);
      console.log(`正在处理文件: ${file}`);
      
      // 读取文件内容并按行分割
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // 添加每一行到集合中（忽略空行）
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          phrasesSet.add(trimmedLine);
        }
      }
    }
    
    // 将短语转换为数组并排序
    const phrases = Array.from(phrasesSet).sort();
    
    // 写入到phrase.txt文件
    const outputPath = path.join(__dirname, '../output/phrase.txt');
    fs.writeFileSync(outputPath, phrases.join('\n'));
    
    console.log(`处理完成！共收集了 ${phrases.length} 个短语，已写入 phrase.txt`);
  } catch (error) {
    console.error('出错了:', error);
  }
}

// 执行主函数
collectPhrases(); 