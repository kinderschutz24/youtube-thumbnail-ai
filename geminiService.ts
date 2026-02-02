// geminiService.ts
import { AppState, ThumbnailResult, Language } from './types';

type GenResult = Partial<ThumbnailResult> & { url: string };

export class GeminiService {
  private getApiKey(): string {
    const key = localStorage.getItem('ytai_gemini_api_key') || '';
    if (!key) throw new Error('NO_API_KEY');
    return key;
  }

  // ---- IMAGE: generate a thumbnail image URL (base64 data url) + text suggestions ----
  async generateThumbnailContent(
    state: AppState,
    id: number,
    refinementText?: string,
    refinementImageDataUrl?: string
  ): Promise<GenResult> {
    const apiKey = this.getApiKey();

    // 1) Build a concise prompt from your form data
    const dna = [
      ...(state.dna?.colors || []),
      ...(state.dna?.style || []),
      ...(state.dna?.camera || []),
      ...(state.dna?.specialStyles || []),
      state.dna?.customStyle || '',
    ].filter(Boolean);

    const basePrompt = [
      `Create a YouTube thumbnail (16:9) that maximizes CTR.`,
      `Topic/Title: ${state.videoTopic || ''}`,
      `Story details: ${state.storyDetails || ''}`,
      `Important details/objects: ${state.importantDetails || ''}`,
      dna.length ? `Style DNA: ${dna.join(', ')}` : '',
      state.textControl === 'none'
        ? `NO text on image.`
        : state.textCreation === 'user' && state.userCustomText
          ? `Text on image (max 5 words): "${state.userCustomText}"`
          : `Add short punchy text on image (max 5 words).`,
      refinementText ? `User refinement: ${refinementText}` : '',
      `Return a high-contrast, clean composition, subject large, readable, dramatic lighting.`,
    ]
      .filter(Boolean)
      .join('\n');

    // 2) Call Gemini Image generation via REST (key in query param)
    // Endpoint used by Gemini API for multimodal generation can vary by model.
    // We implement a robust fallback: try image model first, then a text-only fallback.
    const imageDataUrl = await this.generateImageDataUrl(apiKey, basePrompt, refinementImageDataUrl);

    // 3) Also get text suggestions (title/desc/hashtags) with a text model
    const textPack = await this.generateTextPack(apiKey, state, basePrompt);

    return {
      url: imageDataUrl,
      ...textPack,
    };
  }

  async getTips(state: AppState, _prev: string[], _lang: Language): Promise<string> {
    const apiKey = this.getApiKey();
    const prompt = `Give 1 short actionable tip to improve this YouTube thumbnail concept for CTR.\nTopic: ${state.videoTopic}\nDetails: ${state.storyDetails}\nImportant: ${state.importantDetails}\nReturn ONLY the tip.`;

    const txt = await this.callText(apiKey, prompt);
    return (txt || '').trim();
  }

  // ----------------- Helpers -----------------

  private async generateImageDataUrl(apiKey: string, prompt: string, refineImageDataUrl?: string): Promise<string> {
    // Try: Gemini image generation REST
    // If the model/endpoint differs in your account, the error will be visible in console.
    // We still handle gracefully.
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${encodeURIComponent(apiKey)}`;

    const parts: any[] = [{ text: prompt }];

    // Optional refinement image (data URL -> inlineData)
    if (refineImageDataUrl?.startsWith('data:')) {
      const { mimeType, data } = this.dataUrlToInlineData(refineImageDataUrl);
      parts.push({ inlineData: { mimeType, data } });
    }

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.8,
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      // Helpful error
      if (errText.includes('API key')) throw new Error('NO_API_KEY');
      throw new Error(`IMAGE_API_ERROR: ${res.status} ${errText}`);
    }

    const json: any = await res.json();

    // We expect an image as inlineData somewhere in candidates
    const inline = this.findInlineImage(json);
    if (inline?.mimeType && inline?.data) {
      return `data:${inline.mimeType};base64,${inline.data}`;
    }

    // If no inline image was returned, fail loudly so you see it and we adjust the model.
    throw new Error('NO_IMAGE_RETURNED');
  }

  private async generateTextPack(apiKey: string, state: AppState, basePrompt: string): Promise<Partial<ThumbnailResult>> {
    const sloganLang = state.sloganLanguage || 'DE';
    const prompt = `
You are a YouTube growth expert.
Based on this thumbnail brief, return JSON ONLY with:
{
  "textOnImage": "max 5 words",
  "titleSuggestion": "one YouTube title",
  "descriptionSuggestion": "one short description",
  "hashtags": ["#tag1","#tag2",...]
}
Language for textOnImage/title/description: ${sloganLang}
Brief:
${basePrompt}
`.trim();

    const txt = await this.callText(apiKey, prompt);

    // Try parse JSON
    try {
      const cleaned = txt.trim().replace(/^```json/i, '').replace(/```$/i, '');
      const obj = JSON.parse(cleaned);
      return {
        textOnImage: obj.textOnImage || '',
        titleSuggestion: obj.titleSuggestion || '',
        descriptionSuggestion: obj.descriptionSuggestion || '',
        hashtags: Array.isArray(obj.hashtags) ? obj.hashtags : [],
      };
    } catch {
      // Fallback: best-effort
      return {
        textOnImage: '',
        titleSuggestion: '',
        descriptionSuggestion: '',
        hashtags: [],
      };
    }
  }

  private async callText(apiKey: string, prompt: string): Promise<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6 },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (errText.includes('API key')) throw new Error('NO_API_KEY');
      throw new Error(`TEXT_API_ERROR: ${res.status} ${errText}`);
    }

    const json: any = await res.json();
    const out = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('\n');
    return out || '';
  }

  private dataUrlToInlineData(dataUrl: string): { mimeType: string; data: string } {
    const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!match) return { mimeType: 'image/png', data: '' };
    return { mimeType: match[1], data: match[2] };
  }

  private findInlineImage(json: any): { mimeType: string; data: string } | null {
    const cands = json?.candidates || [];
    for (const c of cands) {
      const parts = c?.content?.parts || [];
      for (const p of parts) {
        const inline = p?.inlineData;
        if (inline?.data && inline?.mimeType?.startsWith('image/')) {
          return { mimeType: inline.mimeType, data: inline.data };
        }
      }
    }
    return null;
  }
}
