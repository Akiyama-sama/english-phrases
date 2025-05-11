# 英语短语资源（8000+）

## 英语短语资源
output文件夹中：
  * englishPhrase.txt:纯英语短语，无释义例句。短语来源于lists文件夹(lists中有的有拼写错误)
  * englishPhrase.json：短语+释义+例句。短语与示例由gemini-2.0-flash-lite生成
  ```json
  {
    "phrase": "break off",
    "translations": [
      {
        "sCN": "中断，停止",
        "sentence": "The meeting was broken off due to an emergency.",
        "tran": "由于紧急情况，会议中断了。"
      },
      {
        "sCN": "断裂，折断",
        "sentence": "He broke off a piece of chocolate.",
        "tran": "他掰下一块巧克力。"
      },
      {
        "sCN": "解除（关系）",
        "sentence": "They decided to break off their engagement.",
        "tran": "他们决定解除婚约。"
      }
    ]
  }
  ```
  * englishPhrase.db：sqlite数据库，字段如下:
  ```db
  CREATE TABLE IF NOT EXISTS phrases (
  phrase TEXT PRIMARY KEY NOT NULL, -- 英文短语
  translations_json TEXT          -- 包含 sCN, sentence, tran 的数组，JSON字符串化存储
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_phrase_text ON phrases (phrase);
  ```
  ## 如何使用
  如果只是想要数据，直接在output文件夹找数据就行
  scripts文件夹提供一些脚本：
  collect_phrases.js：把lists文件夹中的所有短语和在一起
  phrase-analyze.js：用llm来填充json短语数据(需要配置.env的API KEY)
  json-to-sqlite.js：json变为db

  ```
  git clone 
  npm i
  ```
  ## 来源
  https://github.com/2ndLA/english-phrases?tab=readme-ov-file
  ## LICENSE
  ![CC BY-SA 4.0](https://github.com/2ndLA/english-phrases/blob/main/LICENSE).