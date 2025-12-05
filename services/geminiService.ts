import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType, Option } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the schema for structured output
const quizSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      questionText: { type: Type.STRING },
      type: { type: Type.STRING, enum: ['SINGLE', 'MULTIPLE'] },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      correctOptionIndices: {
        type: Type.ARRAY,
        items: { type: Type.INTEGER },
        description: "Zero-based indices of the correct options in the options array"
      },
      explanation: { type: Type.STRING }
    },
    required: ['questionText', 'type', 'options', 'correctOptionIndices']
  }
};

export const generateQuizFromPDF = async (pdfBase64: string, numQuestions: number = 5): Promise<Question[]> => {
  // Clean base64 string: Remove any data URI scheme (e.g., data:application/pdf;base64,)
  // Using a regex that catches any mime type to be safe.
  const cleanBase64 = pdfBase64.replace(/^data:.*?;base64,/, "");

  const model = "gemini-2.5-flash"; // Efficient for text processing

  const prompt = `
    Analyze the provided PDF document. 
    Generate ${numQuestions} quiz questions in Chinese based on the key concepts in the document.
    Mix single choice and multiple choice questions.
    Ensure the questions are challenging but fair.
    Provide a detailed explanation for the correct answer in Chinese.
    Output purely the JSON array, no markdown formatting.
  `;

  let lastError: any;
  // Retry logic: Attempt up to 3 times for transient errors
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: cleanBase64
              }
            },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: quizSchema,
          temperature: 0.4, // Lower temperature for more factual generation
        }
      });

      let rawText = response.text || "[]";
      
      // Fix: Remove Markdown code blocks if present (common cause of parsing errors)
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

      const rawData = JSON.parse(rawText);

      // Map the AI response to our internal App types
      const questions: Question[] = rawData.map((item: any, index: number) => {
        const options: Option[] = item.options.map((optText: string, idx: number) => ({
          id: `opt-${index}-${idx}`,
          text: optText
        }));

        const correctOptionIds = item.correctOptionIndices.map((idx: number) => 
          options[idx]?.id
        ).filter((id: string | undefined) => id !== undefined);

        return {
          id: `q-${Date.now()}-${index}`,
          text: item.questionText,
          type: item.type === 'MULTIPLE' ? QuestionType.MULTIPLE : QuestionType.SINGLE,
          options: options,
          correctOptionIds: correctOptionIds,
          explanation: item.explanation
        };
      });

      return questions;

    } catch (error: any) {
      console.error(`Gemini API Error (Attempt ${attempt + 1}):`, error);
      lastError = error;
      
      // If it's a JSON parse error, retrying might get a better format.
      // If it's a network error (500/503/XHR), retrying is definitely recommended.
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        continue;
      }
    }
  }

  throw new Error("PDF解析或题目生成失败: " + (lastError?.message || "Unknown error"));
};