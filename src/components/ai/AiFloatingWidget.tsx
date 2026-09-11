import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { aiService } from '../../services/aiService';
import { AiMessage, AiModelMode } from '../../types';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  Globe, 
  Zap, 
  Brain, 
  GraduationCap, 
  User, 
  Copy, 
  Check, 
  ExternalLink,
  Plus,
  Mic,
  MicOff,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AiFloatingWidgetProps {
  onOpenFullView?: () => void;
}

export const AiFloatingWidget: React.FC<AiFloatingWidgetProps> = ({ onOpenFullView }) => {
  const { currentUser } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<AiModelMode>('study_coach');
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome: AiMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `👋 **Merhaba ${currentUser?.displayName || 'Öğrencimiz'}!** Hızlıca sormak istediğin bir soru, formül veya ders konusu var mı?`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'DeepSeek V4 Pro (NVIDIA NIM)',
      };
      setMessages([welcome]);
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen, isMinimized]);

  // Setup speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'tr-TR';
      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${text}` : text));
        setIsRecording(false);
      };
      rec.onerror = () => setIsRecording(false);
      rec.onend = () => setIsRecording(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    }
  };

  const handleSend = async (quickText?: string) => {
    const prompt = (quickText || inputText).trim();
    if (!prompt || isLoading) return;

    const userMsg: AiMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    const nextList = [...messages, userMsg];
    setMessages(nextList);
    setInputText('');
    setIsLoading(true);

    try {
      const apiMessages = nextList.map(m => ({ role: m.role, content: m.content }));
      const res = await aiService.sendMessage({
        messages: apiMessages,
        useSearchGrounding: useSearchGrounding || selectedMode === 'search',
        modelMode: selectedMode,
        user: currentUser,
      });

      const assistantMsg: AiMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.text,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: res.modelUsed,
        grounding: res.grounding,
      };

      setMessages([...nextList, assistantMsg]);
    } catch (err: any) {
      console.warn('[AiFloatingWidget] Fallback engaged on error:', err);
      const studentContext = currentUser?.role === 'student' ? aiService.buildStudentContext(currentUser) : null;
      const teacherContext = currentUser?.role === 'teacher' ? aiService.buildTeacherContext(currentUser) : null;
      const fallback = aiService.generateLocalEducationalFallback(prompt, studentContext, teacherContext);

      const fallbackMsg: AiMessage = {
        id: `ai-local-${Date.now()}`,
        role: 'assistant',
        content: `${fallback.text}\n\n*(GNSİAL Yerel MEB Karar Motoru Devrede)*`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: fallback.modelUsed,
      };
      setMessages([...nextList, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // If floating is closed, show floating button
  if (!isOpen) {
    return (
      <aside aria-label="Yapay Zeka Asistanı" className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 hover:scale-105 hover:shadow-indigo-600/40 transition duration-200 cursor-pointer border border-white/20"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <span>GNSİAL AI Asistan</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Yapay Zeka Asistan Penceresi" className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 w-[94vw] sm:w-[420px] shadow-2xl rounded-3xl overflow-hidden border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-5">
      
      {/* Header */}
      <div className="p-3.5 px-4 bg-linear-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs sm:text-sm">GNSİAL Akıllı Asistan</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-white/20">AI</span>
            </div>
            <div className="text-[10px] text-indigo-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Kişiselleştirilmiş Rehber</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onOpenFullView && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenFullView();
              }}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition cursor-pointer"
              title="Tam Ekran Aç"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition cursor-pointer"
            title={isMinimized ? 'Genişlet' : 'Küçült'}
          >
            {isMinimized ? <ChevronDown className="w-3.5 h-3.5 rotate-180" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition cursor-pointer"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Context / Mode Selector */}
          <div className="p-2 px-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1 text-[11px]">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedMode('study_coach')}
                className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                  selectedMode === 'study_coach' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Koç
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedMode('search');
                  setUseSearchGrounding(true);
                }}
                className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                  selectedMode === 'search' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Web Arama
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode('fast')}
                className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                  selectedMode === 'fast' ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Hızlı
              </button>
            </div>

            <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useSearchGrounding}
                onChange={(e) => setUseSearchGrounding(e.target.checked)}
                className="rounded text-orange-600 focus:ring-orange-500 w-3 h-3"
              />
              <span>DuckDuckGo</span>
            </label>
          </div>

          {/* Messages Body */}
          <div className="p-3 sm:p-4 space-y-3 overflow-y-auto h-72 sm:h-80 bg-slate-50/50 dark:bg-slate-900/50">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3" />
                    </div>
                  )}
                  <div className={`max-w-[85%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-2.5 sm:p-3 rounded-2xl text-xs leading-relaxed relative group ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-br-xs'
                          : msg.isError
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-xs shadow-2xs'
                      }`}
                    >
                      <div className={`prose prose-xs max-w-none break-words ${isUser ? 'prose-invert text-white' : 'dark:prose-invert'}`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* Grounding Source chips */}
                      {msg.grounding?.sources && msg.grounding.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
                          <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" /> Kaynaklar:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {msg.grounding.sources.slice(0, 2).map((src, i) => (
                              <a
                                key={i}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[9px] font-medium text-indigo-600 dark:text-indigo-300 hover:underline truncate max-w-[140px]"
                              >
                                {src.title || src.uri}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Copy action */}
                      <button
                        type="button"
                        onClick={() => copyText(msg.id, msg.content)}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition"
                        title="Kopyala"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="text-[9px] text-slate-400 px-1">{msg.timestamp}</div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2 items-center text-slate-400 text-xs">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center animate-pulse">
                  <Bot className="w-3 h-3" />
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  Yanıt hazırlanıyor...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions pills */}
          <div className="p-1.5 px-3 bg-slate-100/70 dark:bg-slate-800/40 flex items-center gap-1.5 overflow-x-auto text-[10px]">
            <button
              type="button"
              onClick={() => handleSend('Bana bugün için hızlı bir çalışma planı öner.')}
              className="px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer"
            >
              📅 Günlük Plan
            </button>
            <button
              type="button"
              onClick={() => handleSend('Notlarımı ve devamsızlığımı analiz et.')}
              className="px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer"
            >
              📊 Not Analizi
            </button>
            <button
              type="button"
              onClick={() => handleSend('Güncel MEB ortak sınav tarihlerini Google ile araştır.')}
              className="px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer"
            >
              🔍 MEB Sınavlar
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5"
          >
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Bir soru sorun veya konu yazın..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full px-3 py-2 pr-8 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`absolute right-2 top-2 p-0.5 rounded transition ${
                  isRecording ? 'text-rose-500 animate-pulse' : 'text-slate-400 hover:text-indigo-600'
                }`}
                title="Sesle Yaz"
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Bottom Disclaimer */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center flex items-center justify-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Yapay zeka hata yapabilir.</span>
          </div>
        </>
      )}
    </aside>
  );
};
