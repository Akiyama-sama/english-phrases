import { GoogleGenAI, Type } from "@google/genai";
import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const responseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            phrase: { type: Type.STRING },
            translations: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        tran: { type: Type.STRING },
                        sentence: { type: Type.STRING },
                        sCN: { type: Type.STRING }
                    },
                    required: ["tran", "sentence", "sCN"]
                }
            }
        },
        required: ["phrase", "translations"]
    }
};

const MODEL_NAME = "gemini-2.0-flash-lite";

async function main() {
    const BATCH_SIZE = 20;
    const PHRASES_FILE = 'output/phrase.txt';
    const PROCESSED_FILE = 'output/phrase-already.txt';
    const OUTPUT_FILE = 'output/englishPhrases.json';
    const REQUEST_DELAY = 1000;

    const allPhrases = await readInputPhrases(PHRASES_FILE);
    const processedPhrasesSet = await readProcessedPhrases(PROCESSED_FILE);
    const remainingPhrases = allPhrases.filter(phrase => !processedPhrasesSet.has(phrase));

    console.log(`总短语数: ${allPhrases.length}`);
    console.log(`已处理短语数: ${processedPhrasesSet.size}`);
    console.log(`待处理短语数: ${remainingPhrases.length}`);

    if (remainingPhrases.length === 0) {
        console.log('没有需要处理的短语，程序退出');
        return;
    }

    let existingOutput = [];
    try {
        const existingOutputData = await fs.readFile(OUTPUT_FILE, 'utf8');
        existingOutput = JSON.parse(existingOutputData);
        console.log(`从 ${OUTPUT_FILE} 读取了 ${existingOutput.length} 条现有记录`);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn(`读取现有输出文件时出错: ${error.message}`);
        }
        console.log('将创建新的输出文件');
    }

    const results = [...existingOutput];
    const batchCount = Math.ceil(remainingPhrases.length / BATCH_SIZE);

    for (let i = 0; i < batchCount; i++) {
        const startIndex = i * BATCH_SIZE;
        const endIndex = Math.min((i + 1) * BATCH_SIZE, remainingPhrases.length);
        const currentBatch = remainingPhrases.slice(startIndex, endIndex);

        console.log(`处理批次 ${i + 1}/${batchCount} (${startIndex + 1}-${endIndex} of ${remainingPhrases.length})`);

        try {
            const batchResults = await processBatch(currentBatch);
            if (batchResults) {
                results.push(...batchResults);
                await appendToProcessedFile(PROCESSED_FILE, currentBatch);
            }

            if (i % 5 === 0 || i === batchCount - 1) {
                await writeOutputToFile(results, OUTPUT_FILE);
            }

            if (i < batchCount - 1) {
                console.log(`等待 ${REQUEST_DELAY / 1000} 秒后处理下一批次...`);
                await delay(REQUEST_DELAY);
            }
        } catch (error) {
            console.error(`批次 ${i + 1} 处理失败: ${error.message}`);
            console.log('将跳过该批次并继续...');
            try {
                await fs.appendFile('failed-batches.txt',
                    `批次 ${i + 1}: ${currentBatch.join(', ')}\n错误: ${error.message}\n\n`, 'utf8');
            } catch (e) {
                console.error("无法写入 failed-batches.txt", e);
            }
        }
    }
    await writeOutputToFile(results, OUTPUT_FILE);
    console.log("所有处理完成");
}

main().catch(err => {
    console.error("主函数发生未捕获错误:", err);
    process.exit(1);
});

async function processBatch(batch) {
    console.log(`正在处理批次: ${batch.join(', ')}`);
    let apiResponse; // Declare here to be accessible in catch if needed
    try {
        const promptText = getPromptForLLM(batch);
        apiResponse = await ai.models.generateContent({ // Assign to outer scope var
            model: MODEL_NAME,
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        if (!apiResponse) {
            console.error("Gemini API 'generateContent' resolved to a falsy value.", "apiResponse:", apiResponse);
            throw new Error("API call to generateContent returned no response object or a falsy value.");
        }

        let jsonText;
        // Accessing the JSON string from the correct path for @google/genai SDK
        if (apiResponse.candidates &&
            apiResponse.candidates[0] &&
            apiResponse.candidates[0].content &&
            apiResponse.candidates[0].content.parts &&
            apiResponse.candidates[0].content.parts[0] &&
            typeof apiResponse.candidates[0].content.parts[0].text === 'string') {
            jsonText = apiResponse.candidates[0].content.parts[0].text;
        } else {
            console.error("API response does not have the expected structure to retrieve JSON text from candidates[0].content.parts[0].text.", "apiResponse:", apiResponse);
            throw new Error("API response structure is invalid for retrieving JSON text from candidates[0].content.parts[0].text.");
        }
        
        if (jsonText.trim() === "") {
            console.warn("API response text is empty. Cannot parse as JSON.", "Batch:", batch, "apiResponse:", apiResponse);
            throw new Error("API response text is empty, which cannot be parsed as JSON. This might be due to content filtering or model's inability to generate content based on the prompt/schema.");
        }

        let resultsArray;
        try {
            resultsArray = JSON.parse(jsonText);
        } catch (parseError) {
            console.error("Failed to parse JSON from API response text:", parseError, "Raw text received:", jsonText, "apiResponse:", apiResponse);
            throw new Error(`JSON parsing error: ${parseError.message}. Review the raw text received from the API.`);
        }

        if (!Array.isArray(resultsArray)) {
            console.error("Parsed API response is not an array as expected by the schema.", "Parsed data:", resultsArray, "Raw text:", jsonText);
            throw new Error('Parsed API response is not an array as expected by the schema.');
        }

        const processedItems = resultsArray.map(item => item.phrase);
        const missingPhrases = batch.filter(phrase => !processedItems.includes(phrase));

        if (missingPhrases.length > 0) {
            console.warn(`警告: 批次中的以下短语在API返回结果中缺失: ${missingPhrases.join(', ')}`);
        }

        return resultsArray;
    } catch (error) {
        const loggableApiResponse = apiResponse !== undefined ? apiResponse : "apiResponse was not assigned or is undefined at the time of error.";
        console.error(`处理批次时出错: ${error.message}`, "apiResponse (if available):", loggableApiResponse);
        throw error; 
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function writeOutputToFile(data, outputFilePath) {
    try {
        const outputDir = outputFilePath.substring(0, outputFilePath.lastIndexOf('/'));
        if (outputDir) {
             await fs.mkdir(outputDir, { recursive: true });
        }
        await fs.writeFile(outputFilePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`结果已成功保存至 ${outputFilePath}`);
    } catch (error) {
        console.error(`写入文件 ${outputFilePath} 失败: ${error.message}`);
        throw error;
    }
}

async function appendToProcessedFile(filePath, phrases) {
    try {
        await fs.appendFile(filePath, phrases.join('\n') + '\n', 'utf8');
    } catch (error) {
        console.error(`无法写入已处理文件 ${filePath}: ${error.message}`);
        throw error;
    }
}

function getPromptForLLM(batchOfPhrases) {
    return `
请为以下英语短语提供中文释义和例句。对于每个短语，请提供：
1. 多个中文释义，尽可能覆盖该短语的主要用法
2. 每个释义对应的英文例句
3. 每个英文例句的中文翻译

需要处理的短语：
${batchOfPhrases.join('\n')}

请确保每个短语都有适当的释义和例句。
`;
}

async function readInputPhrases(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return data.split('\n').map(line => line.trim()).filter(line => line);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`输入文件 ${filePath} 不存在，将视为空列表`);
            return [];
        }
        console.error(`读取输入文件 ${filePath} 失败: ${error.message}`);
        throw error;
    }
}

async function readProcessedPhrases(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return new Set(data.split('\n').map(line => line.trim()).filter(line => line));
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`已处理文件 ${filePath} 不存在，将视为空集合`);
            return new Set();
        }
        console.error(`读取已处理文件 ${filePath} 失败: ${error.message}`);
        throw error;
    }
}