import { GoogleGenAI } from "@google/genai";
import { AppState, ThumbnailResult, Language } from "./types";

export class GeminiService {
  private getApiKey(): string {
    // App.tsx speichert den Key unter: ytai_gemini_api_key
    const key = localStorage.getItem("ytai_gemini_api_key")?.trim() || "";
    if (!key) {
      throw new Error("Gemini API Key fehlt (localStorage: ytai_gemini_api_key)");
    }
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

  // Hard timeout wrapper: verhindert Endlos-Spinners, auch wenn die API “hängt”
  private async withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const t = window.setTimeout(() => {
        reject(new Error(`Timeout nach ${ms}ms (${label})`));
      }, ms);

      p.then((v) => {
        window.clearTimeout(t);
        resolve(v);
      }).catch((e) => {
        window.clearTimeout(t);
        reject(e);
      });
    });
  }

  private extractImageDataUrl(response: any): string {
    // @google/genai liefert Bilder typischerweise als inlineData in parts
    const parts = response?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      const data = part?.inlineData?.data;
      const mime = part?.inlineData?.mimeType || "image/png";
      if (data) return `data:${mime};base64,${data}`;
    }
    return "";
  }

  async generateThumbnailContent(
    state: AppState,
    index: number,
    refinementText?: string,
    refinementImage?: string
  ): Promise<Partial<ThumbnailResult>> {
    const apiKey = this.getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    // Hinweis: Modell kann sich ändern – aber das ist erstmal ok.
    const imageModel = "gemini-3-pro-image-preview";
    const sloganLangName = this.getLanguageName(state.sloganLanguage);

    let textRule = "";
    if (state.textControl === "always" || (state.textControl === "mixed" && index <= 2)) {
      const textInstruction =
        state.textCreation === "user"
          ? `USE THIS EXACT TEXT: "${state.userCustomText || "Action"}"`
          : `AI TASK: Generate a catchy, high-CTR action slogan (max 4-5 words) that fits topic + story perfectly.`;

      textRule = `
CRITICAL: Text on image MUST be in ${sloganLangName}.
CRITICAL: Text MUST NOT exceed 5 words.
${textInstruction}
Visual style: Bold action fonts, integrated in 3D space, positioned artistically.
IMPORTANT: NEVER cross the face of a human figure.
`.trim();
    } else {
      textRule = "DO NOT include any text on the image.";
    }

    const visualParts: any[] = [];

    // Optional: Refinement Image zuerst
    if (refinementImage) {
      visualParts.push({
        inlineData: { data: refinementImage.split(",")[1], mimeType: "image/png" },
      });
    }

    // Referenzen
    state.protagonistImages.slice(0, 3).forEach((img) => {
      visualParts.push({ inlineData: { data: img.split(",")[1], mimeType: "image/png" } });
    });
    state.environmentImages.slice(0, 2).forEach((img) => {
      visualParts.push({ inlineData: { data: img.split(",")[1], mimeType: "image/png" } });
    });
    state.detailImages.slice(0, 2).forEach((img) => {
      visualParts.push({ inlineData: { data: img.split(",")[1], mimeType: "image/png" } });
    });

    const refinementPrompt = refinementText
      ? `CRITICAL CHANGE REQUEST: ${refinementText}. Implement ONLY this change while preserving everything else.`
      : "";

    const promptText = `
TASK: Generate high-CTR YouTube Thumbnail #${index}.

STRICT PROHIBITIONS:
- NO NUDITY, NO NSFW, NO SUGGESTIVE CONTENT.
- If reference images exist: use them for the protagonist.

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

COMPOSITION: Cinematic, intense, professional YouTube quality. Aspect ratio 16:9.
`.trim();

    visualParts.push({ text: promptText });

    try {
      // 35s Timeout → UI kann nicht mehr “endlos drehen”
      const response = await this.withTimeout(
        ai.models.generateContent({
          model: imageModel,
          contents: { parts: visualParts },
          config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } },
        }) as any,
        35000,
        `generateThumbnailContent #${index}`
      );

      const imageUrl = this.extractImageDataUrl(response);
      if (!imageUrl) throw new Error("Kein Bild im Response (inlineData fehlt)");

      return {
        url: imageUrl,
        titleSuggestion: `Titel-Idee (${sloganLangName})`,
        descriptionSuggestion: `Beschreibung-Idee basierend auf "${state.videoTopic}"...`,
        hashtags: ["#EliteThumbnail", "#ViralContent", "#CreatorEconomy"],
        isGenerating: false,
      };
      } catch (err: any) {
      console.error("Gemini Error:", err);
      throw err;
    }

  async getTips(state: AppState, currentTips: string[], uiLang: Language): Promise<string> {
    const apiKey = this.getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const langName = this.getLanguageName(uiLang);

    try {
      const response = await this.withTimeout(
        ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `You are a world-class YouTube consultant. Give ONE high-impact tip in ${langName} for a video about "${state.videoTopic}". Context: ${state.storyDetails}. Tip must be different from: ${currentTips.join(
            ", "
          )}`,
        }) as any,
        20000,
        "getTips"
      );

      // @google/genai liefert Text je nach Version unterschiedlich – fallback:
      const text =
        (response as any)?.text ||
        (response as any)?.candidates?.[0]?.content?.parts?.find((p: any) => p?.text)?.text ||
        "";

      return text || "Optimiere den Kontrast zwischen Motiv und Hintergrund.";
    } catch (err) {
      console.error("Tips Error:", err);
      return "Fokus auf Gesichter und starke Emotionen.";
    }
  }
}
