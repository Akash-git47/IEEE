
import { GoogleGenAI } from "@google/genai";

export interface StructuredPaper {
  title: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  sections: Array<{ heading: string; level: number; content: string }>;
  references: string[];
}

/**
 * Uses Gemini to identify the structural components of the paper
 * without altering any of the original text content.
 */
export const parsePaperStructure = async (text: string): Promise<StructuredPaper> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Identify and extract the following sections from the research paper text. 
    IMPORTANT: Do NOT change any words, do NOT summarize, and do NOT correct grammar. 
    Strictly maintain all original text.
    
    Format the response as a valid JSON object:
    {
      "title": "Exact title from text",
      "authors": ["Full author list strings"],
      "abstract": "The exact abstract text",
      "keywords": ["List of keywords if found"],
      "sections": [{"heading": "SECTION NAME", "level": 1, "content": "Full section text..."}],
      "references": ["Reference list strings"]
    }

    Paper Text:
    ${text}`,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 24576 }
    }
  });

  const parsed = JSON.parse(response.text || '{}');
  return parsed as StructuredPaper;
};

/**
 * Analyzes paper content or provides general reasoning using advanced reasoning capabilities.
 * Enforces strict domain focus on research papers and IEEE formatting.
 */
export const analyzePaperContent = async (query: string) => {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Specific requirement for "hi" greeting
  if (normalizedQuery === 'hi' || normalizedQuery === 'hello') {
    return "Hello! How can I help you with your research paper today?";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: query,
    config: {
      systemInstruction: `You are a specialized AI Research Assistant. 
      Your ONLY purpose is to help users with research paper formatting (specifically IEEE), research standards, academic writing structure, and understanding scientific content.
      
      RULES:
      1. If the user asks for information NOT related to research papers, research formats, academic writing, or this specific application, you must respond with: 
      "I am an AI assistant who can only help you with research papers and their formats. Other information is not in my memory."
      2. Keep your tone professional and academic.
      3. Do not provide information on hobbies, news, entertainment, or general life advice.`,
      thinkingConfig: { thinkingBudget: 16384 }
    }
  });
  return response.text;
};

// These services are kept for internal logic but are no longer exposed in the Assistant UI
export const searchGroundingQuery = async (query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  return {
    text: response.text || '',
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const generatePaperFigure = async (prompt: string, size: "1K" | "2K" | "4K" = "1K") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: `Scientific figure: ${prompt}` }],
    },
    config: {
      imageConfig: { aspectRatio: "1:1", imageSize: size }
    }
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return "";
};

export const analyzeUploadedImage = async (base64: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType: mimeType } },
        { text: 'Analyze this scientific image.' }
      ],
    },
  });
  return response.text;
};
