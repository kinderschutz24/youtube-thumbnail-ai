import { GoogleGenAI } from "@google/genai";

// Vercel Serverless Function: /api/generate
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY on server" });
    }

    const { state, index, refinementText, refinementImage } = req.body || {};
    if (!state || !index) {
      return res.status(400).json({ error: "Missing state or index" });
    }

    const ai = new GoogleGenAI({ apiKey });
    const imageModel = "gemini-3-pro-image-preview";

    // Baue "parts" wie vorher – aber auf dem Server
    const parts: any[] = [];

    const pushDataUrl = (dataUrl?: string) => {
      if (!dataUrl || typeof dataUrl !== "string") return;
      const base64 = dataUrl.split(",")[1];
      if (!base64) return;
      parts.push({ inlineData: { data: base64, mimeType: "image/png" } });
    };

    // 1) optional refinement image
    pushDataUrl(refinementImage);

    // 2) reference images
    (state.protagonistImages || []).slice(0, 3).forEach((img: string) => pushDataUrl(img));
    (state.environmentImages || []).slice(0, 2).forEach((img: string) => pushDataUrl(img));
    (state.detailImages || []).slice(0, 2).forEach((img: string) => pushDataUrl(img));

    const sloganLangName =
      state?.sloganLanguage === "DE" ? "German" :
      state?.sloganLanguage === "EN" ? "English" :
      state?.sloganLanguage === "ES" ? "Spanish" :
      state?.sloganLanguage === "IT" ? "Italian" :
      state?.sloganLanguage === "FR" ? "French" : "English";

    let textRule = "";
    if (state.textControl === "always" || (state.textControl === "mixed" && index <= 2)) {
      const textInstruction =
        state.textCreation === "user"
          ? `USE THIS EXACT TEXT: "${state.userCustomText || "Action"}"`
          : `AI TASK: Analyze the story and topic provided below. Generate a catchy, high-CTR viral action-slogan (max 4-5 words) that perfectly fits the scene and story.`;

      textRule = `
CRITICAL: Text on image MUST be in ${sloganLangName}.
CRITICAL: Text MUST NOT exceed 5 words.
${textInstruction}
Visual style: Bold action fonts, integrated in 3D space, positioned artistically.
IMPORTANT: NEVER cross the face of a human figure.
`;
    } else {
      textRule = "DO NOT include any text on the image.";
    }

    const refinementPrompt = refinementText
      ? `CRITICAL CHANGE REQUEST: ${refinementText}. Implement ONLY this change while preserving everything else.`
      : "";

    const promptText = `
TASK: Generate high-CTR YouTube Thumbnail #${index}.

STRICT PROHIBITIONS:
- NO NUDITY, NO NSFW, NO SUGGESTIVE CONTENT.
- NO FAKE PERSONS: Use provided reference images for the protagonist.

CONTEXT:
Topic: "${state.videoTopic}"
Story: "${state.storyDetails}"
Important Detail: "${state.importantDetails}"

STYLE DNA:
Colors: ${(state.dna?.colors || []).join(", ")}
Style: ${(state.dna?.style || []).join(", ")}
Camera: ${(state.dna?.camera || []).join(", ")}
Custom Style Info: ${state.dna?.customStyle || ""}

${textRule}
${refinementPrompt}

COMPOSITION: Cinematic, intense, professional YouTube quality. Aspect ratio 16:9.
`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: imageModel,
      contents: { parts },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } },
    });

    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: "Image generation failed (no image returned)" });
    }

    return res.status(200).json({
      url: imageUrl,
      titleSuggestion: `Viraler Titel (${sloganLangName})`,
      descriptionSuggestion: `Optimierte Beschreibung basierend auf "${state.videoTopic}"...`,
      hashtags: refinementText ? [] : ["#EliteThumbnail", "#ViralContent", "#CreatorEconomy"],
      isGenerating: false,
    });
  } catch (err: any) {
    console.error("API /generate error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
