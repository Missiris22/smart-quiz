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
  // Clean base64 string if it contains data URI prefix
  const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

  const model = "gemini-2.5-flash"; // Efficient for text processing

  // Instruction translated to ensure Chinese output
  const prompt = `
    Analyze the provided PDF document. 
    Generate ${numQuestions} quiz questions in Chinese based on the key concepts in the document.
    Mix single choice and multiple choice questions.
    Ensure the questions are challenging but fair.
    Provide a detailed explanation for the correct answer in Chinese.
  `;

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

    const rawData = JSON.parse(response.text || "[]");

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

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("PDF解析或题目生成失败");
  }
};