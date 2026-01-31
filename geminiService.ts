
import { GoogleGenAI } from "@google/genai";
import { AppState, ThumbnailResult, Language } from './types';

export class GeminiService {
  constructor() {}

  private getLanguageName(lang: Language): string {
    const names = {
      [Language.DE]: 'German',
      [Language.EN]: 'English',
      [Language.ES]: 'Spanish',
      [Language.IT]: 'Italian',
      [Language.FR]: 'French'
    };
    return names[lang];
  }

  async generateThumbnailContent(
    state: AppState, 
    index: number, 
    refinementText?: string, 
    refinementImage?: string
  ): Promise<Partial<ThumbnailResult>> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imageModel = 'gemini-3-pro-image-preview';
    const sloganLangName = this.getLanguageName(state.sloganLanguage);
    
    let textRule = "";
    if (state.textControl === 'always' || (state.textControl === 'mixed' && index <= 2)) {
        // SICHERUNG: Dynamische Text-Instruktion statt festem Wort "Fokus"
        const textInstruction = state.textCreation === 'user' 
          ? `USE THIS EXACT TEXT: "${state.userCustomText || 'Action'}"` 
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

    const visualParts: any[] = [];
    
    // Referenzbilder für maximale Wiedergabetreue
    if (refinementImage) {
      visualParts.push({ inlineData: { data: refinementImage.split(',')[1], mimeType: 'image/png' } });
    }
    state.protagonistImages.slice(0, 3).forEach(img => {
      visualParts.push({ inlineData: { data: img.split(',')[1], mimeType: 'image/png' } });
    });
    state.environmentImages.slice(0, 2).forEach(img => {
      visualParts.push({ inlineData: { data: img.split(',')[1], mimeType: 'image/png' } });
    });
    state.detailImages.slice(0, 2).forEach(img => {
      visualParts.push({ inlineData: { data: img.split(',')[1], mimeType: 'image/png' } });
    });

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
      Colors: ${state.dna.colors.join(', ')}
      Style: ${state.dna.style.join(', ')}
      Camera: ${state.dna.camera.join(', ')}
      Custom Style Info: ${state.dna.customStyle}
      
      ${textRule}
      ${refinementPrompt}
      
      COMPOSITION: Cinematic, intense, professional YouTube quality. Aspect ratio 16:9.
    `;

    visualParts.push({ text: promptText });

    try {
      const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: visualParts },
        config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
      });

      let imageUrl = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      }

      if (!imageUrl) throw new Error("Image generation failed");

      return {
        url: imageUrl,
        titleSuggestion: `Viraler Titel (${sloganLangName})`,
        descriptionSuggestion: `Optimierte Beschreibung basierend auf "${state.videoTopic}"...`,
        hashtags: refinementText ? [] : ["#EliteThumbnail", "#ViralContent", "#CreatorEconomy"],
        isGenerating: false
      };
    } catch (err) {
      console.error("Gemini Error:", err);
      return { isGenerating: false, url: "https://picsum.photos/1280/720?sig=" + Math.random() };
    }
  }

  async getTips(state: AppState, currentTips: string[], uiLang: Language): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langName = this.getLanguageName(uiLang);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a world-class YouTube consultant. Give one high-impact tip in ${langName} for a video about "${state.videoTopic}". Context: ${state.storyDetails}. Tip must be different from: ${currentTips.join(', ')}`
      });
      return response.text || "Optimiere den Kontrast zwischen Motiv und Hintergrund.";
    } catch (err) {
      return "Fokus auf Gesichter und starke Emotionen.";
    }
  }
}
