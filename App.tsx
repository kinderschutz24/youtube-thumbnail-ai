
import React, { useState, useEffect, useRef } from 'react';
import { Language, AppState, ThumbnailResult } from './types';
import { translations } from './translations';
import { GeminiService } from './geminiService';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // Fix: Removed readonly to match environment modifiers
    aistudio: AIStudio;
  }
}

const Header: React.FC<{ 
  lang: Language; 
  setLang: (l: Language) => void;
  onRegenerate: () => void;
}> = ({ lang, setLang, onRegenerate }) => (
  <header className="fixed top-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-md z-50 flex items-center justify-between px-6 border-b border-white/10">
    <div className="flex items-center gap-4">
      <a href={`https://${translations.headerLink[lang]}`} target="_blank" rel="noopener noreferrer">
        <img src="https://drive.google.com/thumbnail?id=153FZr2r59JJLnApFRrO73DIzcGT72hXv&sz=w200" alt="Logo" className="h-14 w-auto" />
      </a>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex gap-2">
        {(Object.keys(Language) as Language[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-4 py-2 rounded-lg text-sm font-black transition ${lang === l ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {l}
          </button>
        ))}
      </div>
      <a
  href="https://drive.google.com/drive/folders/1WKPlOlxZhyNiumrnW5AR65C-AGWRu4HO?usp=sharing"
  target="_blank"
  rel="noopener noreferrer"
  className="bg-red-600 text-white px-6 py-2 rounded-full font-black text-sm hover:bg-red-700 transition shadow-lg shadow-red-600/40"
>
  Tutorial
</a>
       <button 
        onClick={onRegenerate}
        className="bg-white text-black px-6 py-2 rounded-full font-black text-sm hover:bg-red-600 hover:text-white transition shadow-xl"
      >
        {translations.newGen[lang]}
      </button>
    </div>
  </header>
);

const Footer: React.FC<{ lang: Language }> = ({ lang }) => (
  <footer className="fixed bottom-0 left-0 right-0 h-24 bg-black/95 backdrop-blur-lg z-50 flex items-center justify-between px-10 border-t border-white/10 text-sm text-white">
    <a href="https://www.youtube.com/@walk-around-the-world" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition flex items-center gap-4 font-black uppercase tracking-widest group">
      <div className="bg-red-600 p-3 rounded-xl group-hover:scale-110 transition shadow-lg shadow-red-600/20">
        <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
      </div>
      <span className="text-lg">YouTube-Kanal Walk-around-the-world</span>
    </a>
    <div className="text-center">
        <a href="https://www.kinderschutz24.ch" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition underline font-black uppercase tracking-tighter text-lg block">
        {translations.madeForChildProtection[lang]}
        </a>
    </div>
    <a href="https://kinderschutz24.payrexx.com/de/pay?cid=48744b73" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 transition font-black uppercase tracking-[0.2em] text-lg border-b-4 border-red-600 pb-1">
      {translations.donation[lang]}
    </a>
  </footer>
);

const AudioInput: React.FC<{ onResult: (text: string) => void }> = ({ onResult }) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript + '. ';
      }
      if (transcript) onResult(transcript);
    };
    recognitionRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <button 
      onClick={isRecording ? stopRecording : startRecording}
      className={`p-5 rounded-2xl transition shadow-xl ${isRecording ? 'bg-red-600 animate-pulse text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
      title="Voice Input"
    >
      <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
    </button>
  );
};

export default function App() {
  const [hasKey, setHasKey] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const ok = localStorage.getItem("ytai_paid_access") === "yes";
    setIsLoggedIn(ok);
  }, []);
  const [lang, setLang] = useState<Language>(Language.DE);

  const [lang, setLang] = useState<Language>(Language.DE);
  const [step, setStep] = useState(1);
  const [activeDnaTab, setActiveDnaTab] = useState<'colors' | 'style' | 'camera' | null>(null);
  const [results, setResults] = useState<ThumbnailResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [refinementTexts, setRefinementTexts] = useState<{[key: number]: string}>({});
  const [refinementImages, setRefinementImages] = useState<{[key: number]: string}>({});

  const [state, setState] = useState<AppState>({
    youtubeLink: '', videoTopic: '', storyDetails: '', importantDetails: '',
    detailImages: [], environmentImages: [], protagonistImages: [],
    textControl: 'always', textCreation: 'ai', userCustomText: '', sloganLanguage: Language.DE,
    dna: { colors: [], style: [], camera: [], customStyle: '', specialStyles: [] }
  });

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasKey(selected);
        }
      } catch (e) {
        console.warn("Plattform-Check noch nicht bereit.");
      }
    };
    checkKey();
  }, []);

  useEffect(() => { setState(prev => ({ ...prev, sloganLanguage: lang })); }, [lang]);

  const handleKeySelection = () => {
    // LÖSUNG: Kein await verwenden, um das "Steckenbleiben" zu verhindern
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      window.aistudio.openSelectKey().catch(e => console.error("Dialog-Fehler:", e));
    }
    // Sofort fortfahren gemäß Systemregel zur Vermeidung von Race Conditions
    setHasKey(true);
  };

  const dnaOptions = {
    colors: ["Monochromatisch", "Komplementärfarben", "Analoges Farbschema", "Triadisches Farbschema", "Gedämpfte Farben", "Knallige Farben", "Erdige Töne", "High Key", "Low Key", "High Contrast", "Soft Lighting", "Hard Lighting", "Rim Light", "Backlight", "Cinematic Color Grading", "Teal & Orange", "Warm Tone", "Cool Tone"],
    style: ["Realistisch", "Ölgemälde", "3D Render", "Punk Style", "Cinematisch", "Cyberpunk", "Minimalismus", "Surrealismus", "Pop Art", "Futuristisch", "Retro (80s)", "Anime Style"],
    camera: ["Extremes Close-up", "Weitwinkel (Wide)", "Low Angle", "High Angle", "Vogelperspektive", "Dutch Angle", "Fischauge", "POV", "Action Cam", "Dynamic Zoom", "Panorama"]
  };

  const toggleDnaOption = (category: 'colors' | 'style' | 'camera', option: string) => {
    setState(prev => {
      const current = prev.dna[category];
      const next = current.includes(option) ? current.filter(o => o !== option) : [...current, option];
      return { ...prev, dna: { ...prev.dna, [category]: next } };
    });
  };

  const handleCreate = async () => {
    setIsGenerating(true); setStep(2);
    const service = new GeminiService();
    const initial = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, url: '', textOnImage: '', titleSuggestion: '', descriptionSuggestion: '', hashtags: [], isGenerating: true }));
    setResults(initial);
    for (let i = 0; i < 4; i++) {
      const res = await service.generateThumbnailContent(state, i + 1);
      setResults(prev => { const n = [...prev]; n[i] = { ...n[i], ...res, isGenerating: false }; return n; });
    }
    const tip = await service.getTips(state, [], lang);
    setTips([tip]); setIsGenerating(false);
  };

  const handleRefine = async (id: number) => {
    const text = refinementTexts[id];
    const image = refinementImages[id];
    if (!text && !image) return;
    setResults(prev => prev.map(r => r.id === id ? { ...r, isGenerating: true } : r));
    const service = new GeminiService();
    const res = await service.generateThumbnailContent(state, id, text, image);
    setResults(prev => { return prev.map(r => r.id === id ? { ...r, ...res, isGenerating: false } : r); });
    setRefinementTexts(prev => ({ ...prev, [id]: '' }));
    setRefinementImages(prev => ({ ...prev, [id]: '' }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'detailImages' | 'environmentImages' | 'protagonistImages' | number) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((f: File) => {
      const r = new FileReader();
      r.onload = ev => {
        if (typeof ev.target?.result === 'string') {
          if (typeof target === 'number') {
            setRefinementImages(prev => ({ ...prev, [target]: ev.target!.result as string }));
          } else {
            setState(s => ({ ...s, [target]: [...(s[target] as string[]), ev.target!.result as string].slice(0, 10) }));
          }
        }
      };
      r.readAsDataURL(f);
    });
  };

  const removeFile = (idx: number, target: 'detailImages' | 'environmentImages' | 'protagonistImages' | number) => {
    if (typeof target === 'number') {
      setRefinementImages(prev => ({ ...prev, [target]: '' }));
    } else {
      setState(s => ({ ...s, [target]: (s[target] as string[]).filter((_, i) => i !== idx) }));
    }
  };

  const handleRegenerate = () => {
    setState({
      youtubeLink: '', videoTopic: '', storyDetails: '', importantDetails: '',
      detailImages: [], environmentImages: [], protagonistImages: [],
      textControl: 'always', textCreation: 'ai', userCustomText: '', sloganLanguage: lang,
      dna: { colors: [], style: [], camera: [], customStyle: '', specialStyles: [] }
    });
    setStep(1); setResults([]); setTips([]); setRefinementTexts({}); setRefinementImages({});
  };

  if (!isLoggedIn) {
  return (
    <div className="min-h-screen flex items-center justify-center text-white text-xl">
      Bitte zuerst einloggen / bezahlen
    </div>
  );
}

  if (!hasKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <img src="https://drive.google.com/thumbnail?id=153FZr2r59JJLnApFRrO73DIzcGT72hXv&sz=w500" className="w-64 mb-12 opacity-80" alt="Logo" />
        <h1 className="text-4xl font-black mb-6 uppercase tracking-widest text-white">API-KEY AKTIVIERUNG</h1>
        <p className="text-white/60 mb-8 max-w-md">Die Nutzung erfordert Ihren eigenen API-Key. Alle Daten bleiben privat.</p>
        <button onClick={handleKeySelection} className="bg-red-600 text-white px-12 py-6 rounded-full font-black text-xl hover:bg-red-700 transition shadow-2xl uppercase tracking-widest">Aktivieren & Starten</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32 px-6 text-white max-w-6xl mx-auto relative z-10">
      <Header lang={lang} setLang={setLang} onRegenerate={handleRegenerate} />
      
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-8 cursor-zoom-out animate-in fade-in" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-8 right-8 text-white hover:text-red-500 transition z-[110]"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
          <img src={selectedImage} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain border-2 border-white/10" alt="Full" />
        </div>
      )}

      {step === 1 ? (
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
          {/* TEIL 1 – KONZEPT & STORY */}
          <section className="bg-white/5 backdrop-blur-xl p-12 rounded-[2.5rem] border-2 border-white/20 relative shadow-2xl">
            <div className="absolute top-0 right-0 bg-red-600 px-8 py-3 text-sm font-black uppercase tracking-[0.2em] rounded-bl-3xl shadow-2xl">Teil 1 – KONZEPT & STORY</div>
            <div className="text-center mb-16">
               <label className="block text-xl font-black text-white mb-4 uppercase tracking-widest">{translations.ytLink[lang]}</label>
               <input className="w-full max-w-3xl bg-white/10 border-2 border-white/30 rounded-3xl px-8 py-5 text-white text-xl focus:ring-4 focus:ring-red-600/50 outline-none transition" value={state.youtubeLink} onChange={e => setState({...state, youtubeLink: e.target.value})} placeholder="https://youtube.com/..." />
               <p className="text-sm text-white font-bold italic mt-3">{translations.ytLinkDesc[lang]}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <label className="block text-lg font-black uppercase tracking-[0.1em] text-red-500">{translations.videoTopic[lang]}</label>
                <div className="flex gap-5"><input className="flex-1 bg-white/10 border-2 border-white/20 rounded-2xl px-8 py-6 text-white text-xl outline-none" value={state.videoTopic} onChange={e => setState({...state, videoTopic: e.target.value})} /><AudioInput onResult={t => setState(s => ({...s, videoTopic: s.videoTopic + t}))} /></div>
              </div>
              <div className="space-y-6">
                <label className="block text-lg font-black uppercase tracking-[0.1em] text-red-500">{translations.storyDetails[lang]}</label>
                <div className="flex gap-5"><textarea rows={4} className="flex-1 bg-white/10 border-2 border-white/20 rounded-2xl px-8 py-6 text-white text-xl outline-none resize-none" value={state.storyDetails} onChange={e => setState({...state, storyDetails: e.target.value})} /><AudioInput onResult={t => setState(s => ({...s, storyDetails: s.storyDetails + t}))} /></div>
              </div>
            </div>
            <div className="mt-12 space-y-6">
               <label className="block text-lg font-black uppercase tracking-[0.1em] text-red-500">{translations.importantDetails[lang]}</label>
               <div className="flex gap-5">
                 <input className="flex-1 bg-white/10 border-2 border-white/20 rounded-2xl px-8 py-6 text-white text-xl outline-none" value={state.importantDetails} onChange={e => setState({...state, importantDetails: e.target.value})} />
                 <AudioInput onResult={t => setState(s => ({...s, importantDetails: s.importantDetails + t}))} />
               </div>
               <div className="grid grid-cols-4 md:grid-cols-6 gap-5 mt-6">
                  <div className="aspect-square border-3 border-dashed border-white/40 rounded-3xl flex items-center justify-center relative cursor-pointer hover:border-red-600 transition bg-white/5"><input type="file" multiple className="absolute inset-0 opacity-0" onChange={e => handleFileUpload(e, 'detailImages')} /><span className="text-3xl">+</span></div>
                  {state.detailImages.map((img, idx) => (<div key={idx} className="aspect-square rounded-3xl overflow-hidden relative border-2 border-white/20 group"><img src={img} className="w-full h-full object-cover" /><button onClick={() => removeFile(idx, 'detailImages')} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>))}
               </div>
            </div>
          </section>

          {/* TEIL 2 – MEDIA ASSETS */}
          <section className="bg-white/5 backdrop-blur-xl p-12 rounded-[2.5rem] border-2 border-white/20 relative shadow-2xl">
             <div className="absolute top-0 right-0 bg-red-600 px-8 py-3 text-sm font-black uppercase tracking-[0.2em] rounded-bl-3xl shadow-2xl">Teil 2 – MEDIA ASSETS</div>
             <div className="grid md:grid-cols-2 gap-20">
                <div>
                   <h3 className="text-2xl font-black uppercase mb-8 text-red-500">{translations.environmentPhotos[lang]}</h3>
                   <div className="grid grid-cols-4 gap-5">
                      <div className="aspect-square border-3 border-dashed border-white/40 rounded-3xl flex items-center justify-center relative cursor-pointer hover:border-red-600 transition bg-white/5"><input type="file" multiple className="absolute inset-0 opacity-0" onChange={e => handleFileUpload(e, 'environmentImages')} /><span className="text-4xl">+</span></div>
                      {state.environmentImages.map((img, idx) => (<div key={idx} className="aspect-square rounded-3xl overflow-hidden relative border-2 border-white/20 group"><img src={img} className="w-full h-full object-cover" /><button onClick={() => removeFile(idx, 'environmentImages')} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>))}
                   </div>
                </div>
                <div>
                   <h3 className="text-2xl font-black uppercase mb-8 text-red-500">{translations.protagonistPhotos[lang]}</h3>
                   <div className="grid grid-cols-4 gap-5">
                      <div className="aspect-square border-3 border-dashed border-white/40 rounded-3xl flex items-center justify-center relative cursor-pointer hover:border-red-600 transition bg-white/5"><input type="file" multiple className="absolute inset-0 opacity-0" onChange={e => handleFileUpload(e, 'protagonistImages')} /><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg></div>
                      {state.protagonistImages.map((img, idx) => (<div key={idx} className="aspect-square rounded-3xl overflow-hidden relative border-2 border-white/20 group"><img src={img} className="w-full h-full object-cover" /><button onClick={() => removeFile(idx, 'protagonistImages')} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>))}
                   </div>
                </div>
             </div>
          </section>

          {/* TEIL 3 – CTR-BOOST */}
          <section className="bg-white/5 backdrop-blur-xl p-12 rounded-[2.5rem] border-2 border-white/20 relative shadow-2xl">
             <div className="absolute top-0 right-0 bg-red-600 px-8 py-3 text-sm font-black uppercase tracking-[0.2em] rounded-bl-3xl shadow-2xl">Teil 3 – CTR-BOOST</div>
             <div className="grid md:grid-cols-3 gap-16">
                <div className="space-y-8">
                   <h4 className="text-base font-black uppercase text-white tracking-widest">{translations.textOptions[lang]}</h4>
                   <div className="flex flex-col gap-4">
                      {['always', 'none', 'mixed'].map(opt => (
                        <button key={opt} onClick={() => setState({...state, textControl: opt as any})} className={`text-left px-8 py-5 rounded-2xl border-3 transition font-black uppercase text-xs tracking-[0.2em] shadow-xl ${state.textControl === opt ? 'bg-red-600 border-red-600 scale-105 shadow-red-600/30' : 'bg-white/10 border-white/10 text-white'}`}>
                          {translations[opt === 'always' ? 'alwaysText' : opt === 'none' ? 'noText' : 'mixedText'][lang]}
                        </button>
                      ))}
                   </div>
                </div>
                {state.textControl !== 'none' && (
                  <div className="space-y-8">
                    <h4 className="text-base font-black uppercase text-white tracking-widest">{translations.textCreation[lang]}</h4>
                    <div className="flex flex-col gap-4">
                      <button onClick={() => setState({...state, textCreation: 'ai'})} className={`text-left px-8 py-5 rounded-2xl border-3 transition font-black uppercase text-xs tracking-[0.2em] shadow-xl ${state.textCreation === 'ai' ? 'bg-red-600 border-red-600 scale-105' : 'bg-white/10 border-white/10 text-white'}`}>{translations.aiText[lang]}</button>
                      <button onClick={() => setState({...state, textCreation: 'user'})} className={`text-left px-8 py-5 rounded-2xl border-3 transition font-black uppercase text-xs tracking-[0.2em] shadow-xl ${state.textCreation === 'user' ? 'bg-red-600 border-red-600 scale-105' : 'bg-white/10 border-white/10 text-white'}`}>{translations.userText[lang]}</button>
                      {state.textCreation === 'user' && (
                        <input className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-6 py-4 mt-2 text-white font-black uppercase text-xs outline-none" placeholder="Max 5 Wörter..." value={state.userCustomText} onChange={e => setState({...state, userCustomText: e.target.value})} />
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-8">
                   <h4 className="text-base font-black uppercase text-white tracking-widest">{translations.sloganLang[lang]}</h4>
                   <div className="flex flex-wrap gap-4">
                      {(Object.keys(Language) as Language[]).map(l => (
                        <button key={l} onClick={() => setState({...state, sloganLanguage: l})} className={`px-6 py-4 rounded-xl font-black transition text-base shadow-lg ${state.sloganLanguage === l ? 'bg-white text-black scale-110' : 'bg-white/10 text-white'}`}>{l}</button>
                      ))}
                   </div>
                </div>
             </div>
          </section>

          {/* TEIL 4 – BILD-DNA */}
          <section className="bg-white/5 backdrop-blur-xl p-12 rounded-[2.5rem] border-2 border-white/20 relative shadow-2xl">
             <div className="absolute top-0 right-0 bg-red-600 px-8 py-3 text-sm font-black uppercase tracking-[0.2em] rounded-bl-3xl shadow-2xl">Teil 4 – BILD-DNA</div>
             <h2 className="text-4xl font-black mb-4 uppercase text-white italic underline decoration-red-600 decoration-8 underline-offset-8">BILD-DNA</h2>
             <p className="text-red-600 font-black mb-12 uppercase text-base tracking-[0.4em]">{translations.optionalHint[lang]}</p>
             <div className="grid grid-cols-3 gap-8 mb-12">
                {['colors', 'style', 'camera'].map(tab => (
                  <button key={tab} onClick={() => setActiveDnaTab(activeDnaTab === tab ? null : tab as any)} className={`border-4 rounded-[2rem] py-8 font-black text-sm uppercase transition shadow-2xl tracking-[0.3em] ${activeDnaTab === tab ? 'bg-red-600 border-red-600 scale-105' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}>
                    {translations[tab === 'colors' ? 'colorsLight' : tab === 'style' ? 'style' : 'cameraPerspective'][lang]}
                  </button>
                ))}
             </div>
             {activeDnaTab && (
               <div className="bg-black/60 border-2 border-white/20 rounded-[2.5rem] p-12 mb-12 animate-in fade-in duration-300">
                  <div className="flex flex-wrap gap-4">
                    {dnaOptions[activeDnaTab].map(opt => (
                      <button key={opt} onClick={() => toggleDnaOption(activeDnaTab!, opt)} className={`px-6 py-4 rounded-2xl text-xs font-black transition border-3 ${state.dna[activeDnaTab!].includes(opt) ? 'bg-red-600 border-red-600 text-white scale-110' : 'bg-white/10 border-white/20 text-white'}`}>{opt}</button>
                    ))}
                  </div>
               </div>
             )}
             <div className="space-y-8">
                <label className="text-lg font-black uppercase text-white tracking-[0.2em]">{translations.ownStyle[lang]}</label>
                <input className="w-full bg-white/10 border-2 border-white/30 rounded-3xl px-8 py-6 text-white text-xl outline-none" value={state.dna.customStyle} onChange={e => setState({...state, dna: {...state.dna, customStyle: e.target.value}})} placeholder="Eigener Stil..." />
             </div>
          </section>

          <div className="flex justify-center"><button onClick={handleCreate} disabled={isGenerating} className="group relative bg-white text-black font-black px-24 py-10 rounded-full text-4xl hover:scale-110 active:scale-95 transition shadow-2xl uppercase tracking-tighter"><span>{isGenerating ? translations.pleaseWait[lang] : translations.createButton[lang]}</span></button></div>
        </div>
      ) : (
        <div className="space-y-20 animate-in fade-in zoom-in-95 duration-700 pb-32">
          <button onClick={() => setStep(1)} className="flex items-center gap-4 font-black text-red-500 uppercase tracking-[0.3em] text-xl transition hover:translate-x-[-8px]"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7"></path></svg>{translations.back[lang]}</button>
          <div className="grid md:grid-cols-2 gap-12">
            {results.map(res => (
              <div key={res.id} className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border-2 border-white/20 overflow-hidden flex flex-col shadow-2xl group transition hover:border-red-600/50">
                <div className="relative aspect-video bg-black/80 flex items-center justify-center cursor-zoom-in overflow-hidden" onClick={() => !res.isGenerating && setSelectedImage(res.url)}>
                   {res.isGenerating ? (<div className="text-center"><div className="animate-spin h-20 w-20 border-t-8 border-red-600 mx-auto mb-8 rounded-full"></div><p className="text-lg font-black uppercase text-white">{translations.generatingStatus[lang]}</p></div>) : (<img src={res.url} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />)}
                   <div className="absolute top-8 left-8 bg-red-600 text-white w-14 h-14 rounded-3xl flex items-center justify-center font-black z-10 shadow-xl">{res.id}</div>
                   {!res.isGenerating && (<a href={res.url} download className="absolute bottom-8 right-8 bg-white text-black p-6 rounded-full z-10 hover:scale-125 transition" onClick={e => e.stopPropagation()}><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></a>)}
                </div>
                <div className="p-10 space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase text-white tracking-[0.3em]">{translations.modSuggestion[lang]}</h4>
                    <div className="flex gap-5 relative">
                       <input 
                         className="flex-1 bg-white/10 border-2 border-white/20 rounded-2xl px-6 py-5 text-white outline-none focus:ring-2 focus:ring-red-600" 
                         placeholder={translations.modPlaceholder[lang]}
                         value={refinementTexts[res.id] || ''}
                         onChange={e => setRefinementTexts(prev => ({...prev, [res.id]: e.target.value}))}
                         onKeyDown={e => e.key === 'Enter' && handleRefine(res.id)}
                       />
                       <div className="w-16 h-16 bg-white/10 border-2 border-white/20 rounded-2xl flex items-center justify-center relative group/upload overflow-hidden">
                          {refinementImages[res.id] ? (
                            <>
                              <img src={refinementImages[res.id]} className="w-full h-full object-cover" />
                              <button onClick={(e) => {e.stopPropagation(); removeFile(0, res.id);}} className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover/upload:opacity-100 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                            </>
                          ) : (
                            <>
                              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, res.id)} />
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            </>
                          )}
                       </div>
                       <button onClick={() => handleRefine(res.id)} className="w-16 h-16 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-red-700 transition active:scale-90"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Footer lang={lang} />
    </div>
  );
}
