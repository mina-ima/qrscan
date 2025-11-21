import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

export const analyzeQRContent = async (content: string): Promise<AnalysisResult> => {
  if (!apiKey) {
    return {
      summary: "APIキーが見つかりません。コンテンツを分析できません。",
      safety: 'unknown',
      category: 'other'
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `以下のQRコードからデコードされたコンテンツを分析してください: "${content}"。
      
      以下の構造を持つJSONレスポンスを提供してください:
      1. summary: これが何であるかの簡単な説明（例：「Googleマップへのリンク」、「WiFi設定文字列」、「プレーンテキストメッセージ」）。日本語で記述してください。
      2. safety: 安全性の評価 ('safe', 'suspicious', 'unknown', 'info')。プレーンテキストの場合は 'info'。
      3. category: コンテンツの種類 ('url', 'text', 'wifi', 'other')。
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            safety: { type: Type.STRING, enum: ['safe', 'suspicious', 'unknown', 'info'] },
            category: { type: Type.STRING, enum: ['url', 'text', 'wifi', 'other'] },
          },
          required: ['summary', 'safety', 'category']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      summary: "AI分析は現在利用できません。",
      safety: 'unknown',
      category: 'other'
    };
  }
};