import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { aiService } from '../../services/aiService';
import { 
  AiMessage, 
  AiModelMode, 
  AiPresetPrompt, 
  AiConversationSession,
  GroundingSource 
} from '../../types';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Trash2, 
  RefreshCw, 
  Globe, 
  Zap, 
  Brain, 
  BookOpen, 
  GraduationCap, 
  Award, 
  Calendar, 
  Layers, 
  Copy, 
  Check, 
  ExternalLink, 
  ChevronRight, 
  MessageSquare, 
  Plus, 
  Clock, 
  HelpCircle, 
  User, 
  Compass, 
  Flame, 
  BarChart3, 
  ShieldCheck, 
  AlertCircle,
  FileDown,
  Search,
  SlidersHorizontal,
  Mic,
  MicOff,
  Volume2,
  Cpu,
  X,
  ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DeveloperAiSettings } from '../admin/DeveloperAiSettings';
import { DuckDuckGoSearchView } from '../search/DuckDuckGoSearchView';

interface AiAssistantViewProps {
  initialPrompt?: string;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({ 
  initialPrompt
}) => {
  const { currentUser } = useAuth();
  
  // Tab within AI Assistant: 'chat' or 'duckduckgo'
  const [assistantTab, setAssistantTab] = useState<'chat' | 'duckduckgo'>('chat');

  // State
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<AiModelMode>('study_coach');
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string>(`session-${Date.now()}`);
  const [savedSessions, setSavedSessions] = useState<AiConversationSession[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTabPromptCategory, setActiveTabPromptCategory] = useState<string>('all');
  const [showDevModal, setShowDevModal] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Sync initialPrompt
  useEffect(() => {
    if (initialPrompt) {
      setInputText(initialPrompt);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialPrompt]);

  // Preset prompts
  const presetPrompts = aiService.getPresetPrompts(currentUser);

  // Context summaries for user
  const studentContext = currentUser?.role === 'student' ? aiService.buildStudentContext(currentUser) : null;
  const teacherContext = currentUser?.role === 'teacher' ? aiService.buildTeacherContext(currentUser) : null;

  // Load sessions from local storage
  useEffect(() => {
    if (currentUser?.uid) {
      const sessions = aiService.getSavedSessions(currentUser.uid);
      setSavedSessions(sessions);
      if (sessions.length > 0 && messages.length === 0) {
        // Load latest session or start welcome
        const latest = sessions[0];
        setCurrentSessionId(latest.id);
        setMessages(latest.messages);
        setSelectedMode(latest.mode);
      } else if (messages.length === 0) {
        initWelcomeMessage();
      }
    } else if (messages.length === 0) {
      initWelcomeMessage();
    }
  }, [currentUser?.uid]);

  // Scroll to bottom on message change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'tr-TR';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Tarayıcınız sesle yazmayı desteklemiyor.');
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Voice start error:', err);
        setIsRecording(false);
      }
    }
  };

  const initWelcomeMessage = () => {
    let welcomeText = `👋 **Merhaba ${currentUser?.displayName || 'Öğrencimiz'}!** Ben **GNSİAL Akıllı Asistanı**.\n\n`;

    if (currentUser?.role === 'student' && studentContext) {
      welcomeText += `Seni tanıyorum! **${studentContext.classGrade || '10. Sınıf'}** şubesinde, **${studentContext.studentNumber || 'Öğrenci'}** numarasıyla kayıtlısın. \n\n` +
        `📊 **Güncel Akademik Durumun:**\n` +
        `- 🎯 Not Ortalaman: **${studentContext.gpa > 0 ? studentContext.gpa : 'Henüz not girişi yok'}**\n` +
        `- 📝 Bekleyen Ödevlerin: **${studentContext.pendingHomeworksCount} adet**\n` +
        `- ⏰ Toplam Devamsızlığın: **${studentContext.totalAbsence} gün** (${studentContext.unexcusedAbsence} gün özürsüz)\n` +
        `- 🏆 Başarı Seviyen: **Seviye ${studentContext.level}** (${studentContext.xp} XP)\n\n` +
        `Sana bugün nasıl yardımcı olabilirim? Aşağıdaki hızlı butonlardan birini seçebilir ya da aklına takılan ders konusunu doğrudan sorabilirsin!`;
    } else if (currentUser?.role === 'teacher' && teacherContext) {
      welcomeText += `Hoş geldiniz Sayın Hocam! **${teacherContext.subject}** branşınızda MEB müfredatı uyumlu ders planları, soru ve sınav havuzları, ödev rubrikleri ve şube başarı analizleri hazırlamanız için buradayım.\n\n` +
        `Nereden başlamak istersiniz?`;
    } else {
      welcomeText += `Gaziemir Nevvar Salih İşgören Anadolu Lisesi eğitim asistanı olarak ders çalışma stratejileri, MEB müfredatı, sınav hazırlıkları ve araştırma konularında hazırım.`;
    }

    const initialMsg: AiMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: welcomeText,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'DeepSeek V4 Pro (NVIDIA NIM)',
    };

    setMessages([initialMsg]);
  };

  // Start a fresh new session
  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    initWelcomeMessage();
    if (textareaRef.current) textareaRef.current.focus();
  };

  // Switch to saved session
  const handleSelectSession = (session: AiConversationSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setSelectedMode(session.mode);
    setShowHistoryDrawer(false);
  };

  // Delete session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    aiService.deleteSession(sessionId);
    if (currentUser?.uid) {
      setSavedSessions(aiService.getSavedSessions(currentUser.uid));
    }
    if (currentSessionId === sessionId) {
      handleNewSession();
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isLoading) return;

    const userMsg: AiMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Build messages payload for API (exclude errors or welcome greeting if desired)
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

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
        fallbackInfo: res.fallbackInfo,
        grounding: res.grounding,
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      // Save to localStorage if logged in
      if (currentUser?.uid) {
        const sessionTitle = prompt.length > 35 ? `${prompt.substring(0, 35)}...` : prompt;
        const currentSession: AiConversationSession = {
          id: currentSessionId,
          userId: currentUser.uid,
          title: sessionTitle,
          mode: selectedMode,
          messages: finalMessages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        aiService.saveSession(currentSession);
        setSavedSessions(aiService.getSavedSessions(currentUser.uid));
      }
    } catch (error: any) {
      console.warn('AI chat error caught, generating local educational response:', error);
      const fallback = aiService.generateLocalEducationalFallback(
        prompt,
        studentContext,
        teacherContext
      );
      const fallbackMsg: AiMessage = {
        id: `ai-local-${Date.now()}`,
        role: 'assistant',
        content: `${fallback.text}\n\n*(GNSİAL Yerel MEB Rehberlik Motoru devrede)*`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: fallback.modelUsed,
      };
      setMessages([...newMessages, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy text to clipboard
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Export conversation
  const handleExportChat = () => {
    const textContent = messages.map(m => `[${m.timestamp}] ${m.role === 'user' ? 'Kullanıcı' : 'GNSİAL Asistan'}:\n${m.content}\n\n`).join('----------------------------------------\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GNSİAL_AI_Sohbet_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Quick prompt cards filtering
  const filteredPresets = activeTabPromptCategory === 'all' 
    ? presetPrompts 
    : presetPrompts.filter(p => p.category === activeTabPromptCategory);

  return (
    <div className="space-y-6">
      
      {/* Header Banner & Personalized Status Card */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-900 via-purple-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
              <span>GNSİAL Yapay Zeka Akıllı Asistanı</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-400/40 text-[10px]">Groq Cloud Qwen 3.8 27B</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Kişiselleştirilmiş Öğrenci & Öğretmen Rehberi
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Groq Cloud Qwen 3.8 27B ultra-hızlı çıkarım altyapısıyla ders çalışma planı, MEB kazanımları, YKS/LGS soru çözümü ve zayıf ders analizi 7/24 yanınızda.
            </p>
          </div>

          {/* Quick Context Stats Box */}
          {currentUser?.role === 'student' && studentContext && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2 rounded-xl bg-white/5">
                <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Not Ortalaması</div>
                <div className="text-lg font-black text-emerald-400">{studentContext.gpa > 0 ? studentContext.gpa : '—'}</div>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Bekleyen Ödev</div>
                <div className="text-lg font-black text-amber-400">{studentContext.pendingHomeworksCount}</div>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Devamsızlık</div>
                <div className="text-lg font-black text-purple-300">{studentContext.totalAbsence} Gün</div>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">XP & Seviye</div>
                <div className="text-lg font-black text-indigo-300">Sv.{studentContext.level}</div>
              </div>
            </div>
          )}

          {currentUser?.role === 'teacher' && teacherContext && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shrink-0 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-200">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-indigo-200 font-bold">{teacherContext.subject} Branşı</div>
                <div className="text-sm font-extrabold text-white">{teacherContext.name}</div>
                <div className="text-[11px] text-slate-300 mt-0.5">{teacherContext.activeHomeworksCount} Aktif Ödev • {teacherContext.totalStudentsCount} Öğrenci</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Pills: AI Asistan Sohbet vs. DuckDuckGo Güvenli Web Arama */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setAssistantTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
            assistantTab === 'chat'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI Asistan Sohbeti</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">Groq</span>
        </button>

        <button
          type="button"
          onClick={() => setAssistantTab('duckduckgo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
            assistantTab === 'duckduckgo'
              ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4 text-orange-500" />
          <span>DuckDuckGo Güvenli Arama</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold">Canlı Web</span>
        </button>
      </div>

      {assistantTab === 'duckduckgo' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
                🦆
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  AI Asistan Entegre DuckDuckGo Güvenli Arama Portalı
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Sıfır izleyici ile MEB, YKS ve akademik kaynakları araştırın. Herhangi bir soruyu veya konuyu tek tıkla AI Danışman'a aktarıp yanıtlatabilirsiniz.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAssistantTab('chat')}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
            >
              <Bot className="w-4 h-4 text-indigo-600" />
              <span>AI Sohbete Dön</span>
            </button>
          </div>

          <DuckDuckGoSearchView 
            onAskAi={(query) => {
              setInputText(query);
              setAssistantTab('chat');
              handleSendMessage(query);
            }}
          />
        </div>
      ) : (
      /* Main Grid: Chat Workspace + Side Controls */
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Main Chat Window) */}
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-[750px] relative">
          
          {/* Top Chat Toolbar */}
          <div className="p-4 px-5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    GNSİAL Akıllı Danışman
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-ping" />
                    Çevrimiçi
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>Mod: {selectedMode === 'study_coach' ? 'Ders & Sınav Koçu' : selectedMode === 'search' ? 'Google Search' : selectedMode === 'complex' ? 'Derin Akıl Yürütme' : selectedMode === 'fast' ? 'Hızlı Flash Lite' : 'Genel Asistan'}</span>
                  <span>•</span>
                  <span>{messages.length} Mesaj</span>
                </div>
              </div>
            </div>

            {/* Top Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAssistantTab('duckduckgo')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-orange-50 dark:bg-orange-950/60 border border-orange-300 dark:border-orange-700 hover:bg-orange-100 text-orange-800 dark:text-orange-300 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="DuckDuckGo Güvenli Arama Portalı"
              >
                <Globe className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                <span className="hidden sm:inline">DuckDuckGo Arama</span>
              </button>

              <button
                type="button"
                onClick={handleNewSession}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Yeni Sohbet Başlat"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Yeni Sohbet</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Geçmiş Sohbetler"
              >
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Geçmiş ({savedSessions.length})</span>
              </button>

              <button
                type="button"
                onClick={handleExportChat}
                disabled={messages.length <= 1}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
                title="Sohbeti Metin Olarak İndir"
              >
                <FileDown className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowDevModal(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Geliştirici & AI Servis Ayarları (Groq Cloud)"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden sm:inline">AI & Groq Ayarları</span>
              </button>
            </div>
          </div>

          {/* History Drawer Overlay */}
          {showHistoryDrawer && (
            <div className="absolute inset-y-0 left-0 w-72 sm:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30 shadow-2xl flex flex-col p-4 space-y-3 animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Kayıtlı Sohbetler
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold p-1 cursor-pointer"
                >
                  ✕ Kapat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {savedSessions.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    Henüz kayıtlı bir sohbetiniz bulunmuyor.
                  </div>
                ) : (
                  savedSessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSession(s)}
                      className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between group cursor-pointer transition ${
                        currentSessionId === s.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                          : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate font-bold">{s.title || 'Başlıksız Sohbet'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(s.updatedAt).toLocaleDateString('tr-TR')} • {s.messages.length} mesaj
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Scrollable Message Thread */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-2xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[88%] sm:max-w-[80%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                    
                    {/* Message Bubble Container */}
                    <div
                      className={`p-4 sm:p-5 rounded-3xl text-sm leading-relaxed shadow-xs relative group ${
                        isUser
                          ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-br-xs'
                          : msg.isError
                          ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 rounded-bl-xs'
                          : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                      }`}
                    >
                      {/* Markdown Body */}
                      <div className={`prose prose-sm max-w-none break-words ${
                        isUser 
                          ? 'prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white prose-li:text-white' 
                          : 'dark:prose-invert prose-p:text-slate-800 dark:prose-p:text-slate-200 prose-headings:text-slate-900 dark:prose-headings:text-white prose-strong:text-slate-900 dark:prose-strong:text-white prose-code:text-indigo-600 dark:prose-code:text-indigo-300 prose-pre:bg-slate-900 prose-pre:text-slate-100'
                      }`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* DuckDuckGo Search Grounding Metadata Sources Box */}
                      {msg.grounding && msg.grounding.sources && msg.grounding.sources.length > 0 && (
                        <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[11px] font-black text-orange-600 dark:text-orange-400">
                              <Globe className="w-3.5 h-3.5" />
                              <span>DuckDuckGo & Web Teyitli Kaynaklar ({msg.grounding.sources.length}):</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAssistantTab('duckduckgo')}
                              className="text-[10px] text-orange-600 dark:text-orange-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <span>DuckDuckGo'da Ara</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          
                          {/* Search queries if any */}
                          {msg.grounding.webSearchQueries && msg.grounding.webSearchQueries.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {msg.grounding.webSearchQueries.map((q, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  🔍 "{q}"
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {msg.grounding.sources.slice(0, 4).map((src: GroundingSource, idx: number) => (
                              <a
                                key={idx}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition group/link"
                              >
                                <span className="truncate pr-2">{src.title || src.uri}</span>
                                <ExternalLink className="w-3 h-3 shrink-0 text-slate-400 group-hover/link:text-indigo-600" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hover Action Bar */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-1 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                          title="Metni Kopyala"
                        >
                          {copiedMessageId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Meta Footer */}
                    <div className="flex items-center flex-wrap gap-2 px-2 text-[10px] text-slate-400">
                      <span>{msg.timestamp}</span>
                      {msg.modelUsed && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{msg.modelUsed}</span>
                        </>
                      )}
                      {msg.fallbackInfo?.triggered && (
                        <span 
                          title={msg.fallbackInfo.reason || 'Groq Cloud otomatik yedekleme devrede'}
                          className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1 border border-amber-200 dark:border-amber-800/50"
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-600" />
                          <span>{msg.fallbackInfo.toProvider?.toUpperCase() || 'YEREL'} Yedekleme</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 shadow-xs mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex gap-3 items-center text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 rounded-2xl bg-linear-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 px-4 rounded-3xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-pink-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>
                    {useSearchGrounding ? 'Google ile araştırılıyor ve analiz ediliyor...' : 'Yapay zeka yanıtı hazırlıyor...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Bottom Chat Input Form Area */}
          <div className="p-3.5 sm:p-4 bg-slate-50/90 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            
            {/* Model & Search Grounding Controls Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
                  Mod:
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedMode('study_coach')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    selectedMode === 'study_coach'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                  }`}
                >
                  <GraduationCap className="w-3 h-3" /> Koç & MEB
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMode('search');
                    setUseSearchGrounding(true);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    selectedMode === 'search'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                  }`}
                >
                  <Globe className="w-3 h-3" /> Canlı Web Arama
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode('complex')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    selectedMode === 'complex'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-purple-400'
                  }`}
                >
                  <Brain className="w-3 h-3" /> Derin Akıl
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode('fast')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    selectedMode === 'fast'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                  }`}
                >
                  <Zap className="w-3 h-3" /> Hızlı Flash
                </button>
              </div>

              {/* DuckDuckGo Search Grounding Checkbox Switch */}
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useSearchGrounding}
                  onChange={(e) => setUseSearchGrounding(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer"
                />
                <Globe className="w-3.5 h-3.5 text-orange-500" />
                <span className="hidden sm:inline">DuckDuckGo Web Teyidi</span>
              </label>
            </div>

            {/* Input Box Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  placeholder={
                    currentUser?.role === 'student'
                      ? 'Örn: Matematik fonksiyonlar ödevim için ipucu ver veya haftalık ders programı hazırla...'
                      : 'Örn: 10-A sınıfı için MEB kazanımlarına uygun 5 soruluk fizik testi ve cevap anahtarı hazırla...'
                  }
                  className="w-full p-3 pr-10 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-xs"
                />

                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`absolute right-2.5 bottom-3.5 p-1.5 rounded-xl transition cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={isRecording ? 'Dinlemeyi Durdur' : 'Sesle Yaz (Mikrofon)'}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-3.5 sm:px-5 rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Gönder</span>
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Enter: Gönder • Shift + Enter: Yeni Satır</span>
              <span>GNSİAL Yapay Zeka Danışmanı eğitim amaçlı rehberlik sunar.</span>
            </div>
          </div>
        </div>

        {/* Right Column (Preset Prompts & Academic Tools) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Quick Preset Prompts Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                    Hızlı İstek Şablonları
                  </h3>
                  <p className="text-[11px] text-slate-500">Tek tıkla zengin komutlar</p>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTabPromptCategory('all')}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTabPromptCategory === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Tümü
              </button>
              <button
                type="button"
                onClick={() => setActiveTabPromptCategory('study')}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTabPromptCategory === 'study'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Plan & Çalışma
              </button>
              <button
                type="button"
                onClick={() => setActiveTabPromptCategory('search')}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTabPromptCategory === 'search'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Google Arama
              </button>
              <button
                type="button"
                onClick={() => setActiveTabPromptCategory('exam')}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTabPromptCategory === 'exam'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Sınav & Quiz
              </button>
            </div>

            {/* Cards List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSendMessage(preset.prompt)}
                  disabled={isLoading}
                  className="w-full text-left p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-800 transition group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                      {preset.title}
                    </span>
                    {preset.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shrink-0">
                        {preset.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                    {preset.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Academic Guidance Tips Card */}
          <div className="bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 rounded-3xl p-5 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-indigo-900 dark:text-indigo-200">
              <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Verimli Kullanım İpuçları</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span><strong>Özel Çalışma Programı:</strong> Asistana haftalık müsait olduğun saatleri söyle, sana dengeli bir program hazırlasın.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span><strong>Soru Çözüm Analizi:</strong> Çözemediğin sorunun metnini yapıştır; adım adım mantığını ve kurallarını anlatsın.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span><strong>Google Search Teyidi:</strong> Güncel MEB duyuruları ve sınav takvimi için Canlı Web Arama modunu açın.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      )}

      {/* Developer & AI Gateway Settings Modal */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDevModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <DeveloperAiSettings />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDevModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
