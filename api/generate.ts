import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, images } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY on server" });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const parts: any[] = [];

    if (Array.isArray(images)) {
      for (const img of images) {
        parts.push({
          inlineData: {
            data: img.split(",")[1],
            mimeType: "image/png",
          },
        });
      }
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K",
        },
      },
    });

    let imageBase64 = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        imageBase64 = part.inlineData.data;
      }
    }

    if (!imageBase64) {
      throw new Error("No image returned by Gemini");
    }

    res.status(200).json({
      image: `data:image/png;base64,${imageBase64}`,
    });
  } catch (err: any) {
    console.error("API ERROR:", err);
    res.status(500).json({ error: err.message || "Generation failed" });
  }
}
