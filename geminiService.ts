import { GoogleGenAI } from "@google/genai";
import { AppState, ThumbnailResult, Language } from "./types";

export class GeminiService {
  private getApiKey(): string {
    const key = localStorage.getItem("ytai_gemini_api_key")?.trim();
    if (!key) throw new Error("Gemini API Key fehlt (localStorage: ytai_gemini_api_key)");
    return key;
  }

  private getLanguageName(lang: Language): string {
    const names: Record<Language, string> = {
      [Language.DE]: "German",
      [Language.EN]: "English",
      [Language.ES]: "Spanish",
      [Language.IT]: "Italian",
      [Language.FR]: "French",
    };
    return names[lang] ?? "English";
  }

  async generateThumbnailContent(
    state: AppState,
    index: number,
    refinementText?: string,
    refinementImage?: string
  ): Promise<Partial<ThumbnailResult>> {
    const ai = new GoogleGenAI({ apiKey: this.getApiKey() }); // ✅ Browser-Key aus localStorage
    const imageModel = "gemini-3-pro-image-preview";
    const sloganLangName = this.getLanguageName(state.sloganLanguage);

    // Text-Regel
    let textRule = "DO NOT include any text on the image.";
    if (state.textControl === "always" || (state.textControl === "mixed" && index <= 2)) {
      const textInstruction =
        state.textCreation === "user"
          ? `USE THIS EXACT TEXT: "${(state.userCustomText || "Action").trim()}"`
          : `Generate a catchy, high-CTR action slogan (max 5 words) that fits the story and scene.`;

      textRule = `
CRITICAL:
- Text on image MUST be in ${sloganLangName}.
- Text MUST NOT exceed 5 words.
${textInstruction}
IMPORTANT: NEVER place text across a human face.
`;
    }

    // Parts zusammenbauen (Bilder + Prompt)
    const parts: any[] = [];

    // Refinement image zuerst (falls vorhanden)
    if (refinementImage) {
      parts.push({
        inlineData: {
          data: refinementImage.split(",")[1],
          mimeType: "image/png",
        },
      });
    }

    // Referenzbilder (max. 3/2/2 wie vorher)
    state.protagonistImages.slice(0, 3).forEach((img) =>
      parts.push({ inlineData: { data: img.split(",")[1], mimeType: "image/png" } })
    );
    state.environmentImages.slice(0, 2).forEach((img) =>
      parts.push({ inlineData: { data: img.split(",")[1], mimeType: "image/png" } })
    );
    state.detailImages.slice(0, 2).forEach((img) =>
      parts.push({ inlineData: { data: img.split(",")[1], mimeType: "image/png" } })
    );

    const refinementPrompt = refinementText
      ? `CRITICAL CHANGE REQUEST: ${refinementText}. Implement ONLY this change while preserving everything else.`
      : "";

    const promptText = `
TASK: Generate high-CTR YouTube Thumbnail #${index}.

STRICT PROHIBITIONS:
- NO NUDITY, NO NSFW, NO SUGGESTIVE CONTENT.

CONTEXT:
Topic: "${state.videoTopic}"
Story: "${state.storyDetails}"
Important Detail: "${state.importantDetails}"

STYLE DNA:
Colors: ${state.dna.colors.join(", ")}
Style: ${state.dna.style.join(", ")}
Camera: ${state.dna.camera.join(", ")}
Custom Style Info: ${state.dna.customStyle}

${textRule}
${refinementPrompt}

COMPOSITION: cinematic, intense, professional YouTube quality.
Aspect ratio 16:9.
`;

    parts.push({ text: promptText });

    // Call
    const response = await ai.models.generateContent({
      model: imageModel,
      contents: { parts },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } },
    });

    // Bild aus Response holen
    const returnedParts = response.candidates?.[0]?.content?.parts || [];
    const imgPart = returnedParts.find((p: any) => p.inlineData?.data);

    if (!imgPart?.inlineData?.data) {
      throw new Error("Gemini hat kein Bild zurückgegeben (inlineData fehlt)");
    }

    const imageUrl = `data:image/png;base64,${imgPart.inlineData.data}`;

    return {
      url: imageUrl,
      isGenerating: false,
    };
  }

  async getTips(state: AppState, currentTips: string[], uiLang: Language): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    const langName = this.getLanguageName(uiLang);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Give ONE high-impact YouTube thumbnail tip in ${langName} for topic "${state.videoTopic}". Context: ${state.storyDetails}. Avoid repeating: ${currentTips.join(", ")}`,
    });

    return response.text || "Nutze starke Kontraste und ein klares Hauptmotiv.";
  }
}
