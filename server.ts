import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with named parameter and setting User-Agent for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Endpoint: AI Semantic Parsing for 3-seconds ultra-quick input
app.post("/api/gemini/parse", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ success: false, error: "Text is required" });
  }

  try {
    const prompt = `你是一個極簡理財記帳助理，請解析以下記帳口語文字，並將它結構化輸出。如果是支出的文字（例如：下午買飲料50元、午餐120、高鐵票1500、付了房租8000），將金額填入 amount，類別 (飲食、交通、娛樂、購物、帳單、其他) 分類好，type 設為 "expense"；若是收入文字（例如：收到家教費5000、薪水入帳32000、中發票200），則 type 設為 "income"。
輸入文字: "${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "交易金額（新台幣 NT$）" },
            category: { type: Type.STRING, description: "交易類別，必須為：飲食、交通、娛樂、購物、帳單、其他 之一" },
            type: { type: Type.STRING, description: "必須為：expense（支出）或 income（收入）" },
            note: { type: Type.STRING, description: "簡短備註，描述是什麼產品/商家或事由 (限繁體中文)" },
          },
          required: ["amount", "category", "type", "note"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini");
    }

    const parsedJson = JSON.parse(resultText.trim());
    res.json({ success: true, transaction: parsedJson });
  } catch (error: any) {
    console.error("Gemini Parse Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to parse text with AI" });
  }
});

// Endpoint: Personal Finance Analytics and Smart Progress Prediction for saving goals
app.post("/api/gemini/insights", async (req, res) => {
  const { transactions, goals } = req.body;
  
  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ success: false, error: "Transactions must be an array" });
  }

  try {
    const prompt = `你是一個幽默、溫和且客觀的極簡理財顧問「SAVVY AI」。請依據使用者的以下數據：
1. 近期交易紀錄 (最近的30筆): ${JSON.stringify(transactions.slice(0, 30))}
2. 目前的儲蓄目標（Goals）: ${JSON.stringify(goals || [])}

請提供以下三項內容 (使用繁體中文，語氣極簡、具啟發性、沒有冗詞贅字)：
1. 財務洞察 (insights): 點出最大的消費分類佔比、有沒有异常小開銷（如手搖飲、頻繁搭計程車）、以及實用的省錢小妙招 (限 150 字)。
2. 目標智慧預測 (prediction): 針對使用者的儲蓄目標，根據其近期收支餘額（若近期結餘為負或零，則以目前每天平均可存 100 元當作估計），智慧預測目標的完成日期 (預測格式例如：預估將於 2026/08/15 達成「日本旅遊」)，並給予激勵性的加速建議 (限 150 字)。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: { type: Type.STRING, description: "客製化消費趨勢與理財洞察" },
            prediction: { type: Type.STRING, description: "針對目標的具象化預測與激勵加速計畫" },
          },
          required: ["insights", "prediction"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini");
    }

    const parsedJson = JSON.parse(resultText.trim());
    res.json({ success: true, insights: parsedJson });
  } catch (error: any) {
    console.error("Gemini Insights Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to analyze data with AI" });
  }
});

// Server layout logic (Development vs Production assets serving)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SAVVY Server] Node Dev/Prod entry running on strictly allowed port ${PORT}`);
  });
}

startServer();
