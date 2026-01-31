
export enum Language {
  DE = 'DE',
  EN = 'EN',
  ES = 'ES',
  IT = 'IT',
  FR = 'FR'
}

export interface AppState {
  youtubeLink: string;
  videoTopic: string;
  storyDetails: string;
  importantDetails: string;
  detailImages: string[];
  environmentImages: string[];
  protagonistImages: string[];
  textControl: 'always' | 'none' | 'mixed';
  textCreation: 'ai' | 'user';
  userCustomText: string;
  sloganLanguage: Language;
  dna: {
    colors: string[];
    style: string[];
    camera: string[];
    customStyle: string;
    specialStyles: string[];
  };
}

export interface ThumbnailResult {
  id: number;
  url: string;
  textOnImage: string;
  titleSuggestion: string;
  descriptionSuggestion: string;
  hashtags: string[];
  isGenerating: boolean;
}

export interface Translation {
  [key: string]: {
    [lang in Language]: string;
  };
}
