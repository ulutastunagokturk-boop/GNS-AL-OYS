import { 
  UserProfile, 
  AiMessage, 
  AiModelMode, 
  AiPresetPrompt, 
  AiConversationSession,
  AiProviderConfig,
  AiDiagnosticTestResult
} from '../types';
import { dataService } from './dataService';
import { getComprehensiveEducationalFallback } from './localEducationEngine';

const AI_SESSIONS_STORAGE_KEY = 'gnsial_ai_chat_sessions_v1';

export const aiService = {
  // Preset prompts crafted specifically for GNSİAL high school students & teachers
  getPresetPrompts(user?: UserProfile | null): AiPresetPrompt[] {
    const isTeacher = user?.role === 'teacher';
    const isStudent = user?.role === 'student';

    if (isTeacher) {
      return [
        {
          id: 't-lesson-plan',
          title: 'MEB Müfredatına Uygun Ders Planı',
          prompt: 'Bu hafta işleyeceğimiz ders konusu için MEB kazanımlarına tam uyumlu, 40 dakikalık interaktif bir ders planı ve dikkat çekici bir giriş etkinliği hazırla.',
          category: 'teacher',
          icon: 'BookOpen',
          badge: 'MEB Uyumlu'
        },
        {
          id: 't-exam-gen',
          title: 'Karma Sınav Soru Havuzu Oluştur',
          prompt: 'Dersim için 3 çoktan seçmeli, 2 klasik ve 1 yoruma dayalı üst düzey düşünme becerisi gerektiren soru, cevap anahtarı ve puanlama rubriği hazırla.',
          category: 'teacher',
          icon: 'Award',
          badge: 'Soru & Rubrik'
        },
        {
          id: 't-rubric-gen',
          title: 'Ödev Değerlendirme Rubriği',
          prompt: 'Öğrencilerime vereceğim performans ödevi için 4 düzeyli (Başlangıç, Gelişmekte, Yetkin, İleri) analitik bir değerlendirme rubriği tasarla.',
          category: 'teacher',
          icon: 'Layers',
          badge: 'Rubrik'
        },
        {
          id: 't-search-meb',
          title: 'DuckDuckGo ile Güncel MEB Kazanım & Kılavuz Araştırması',
          prompt: 'DuckDuckGo güvenli aramasını kullanarak MEB Talim Terbiye ve OGM Materyal üzerindeki en güncel lise müfredat değişikliklerini, sınav kılavuzu yeniliklerini ve haftalık ders çizelgelerini özetle.',
          category: 'search',
          icon: 'Globe',
          badge: 'DuckDuckGo'
        },
        {
          id: 't-motivation',
          title: 'Sınıf Başarı Analizi & Veli Bilgilendirme Notu',
          prompt: 'Şube sınav sonuçlarını değerlendirip öğrencilerin motivasyonunu artıracak, velilere yönelik yapıcı ve profesyonel bir ara dönem başarı bülteni taslağı yaz.',
          category: 'teacher',
          icon: 'Megaphone',
          badge: 'Veli Bülteni'
        }
      ];
    }

    // Default for students
    return [
      {
        id: 's-study-plan',
        title: 'Bana Özel 7 Günlük Ders Çalışma Programı',
        prompt: 'Sınav notlarıma, bekleyen ödevlerime ve sınıf seviyeme göre bana özel, saat saat dengeli ve verimli bir 7 günlük haftalık çalışma programı hazırla.',
        category: 'study',
        icon: 'Calendar',
        badge: 'Kişiselleştirilmiş'
      },
      {
        id: 's-weak-analysis',
        title: 'Akademik Durum & Zayıf Konu Analizi',
        prompt: 'Okul notlarımı ve devamsızlık durumumu incele; hangi derslerde zorlandığımı tespit et ve bu derslerdeki netlerimi yükseltmek için 3 stratejik tavsiye ver.',
        category: 'study',
        icon: 'BarChart3',
        badge: 'Karne & Not Analizi'
      },
      {
        id: 's-search-yks',
        title: 'DuckDuckGo ile Güncel YKS/LGS & MEB Sınav Bilgileri',
        prompt: 'DuckDuckGo web aramasını kullanarak 2026 MEB ve ÖSYM güncel sınav takvimi, ortak yazılı sınav tarihleri ve YKS konularını araştır.',
        category: 'search',
        icon: 'Globe',
        badge: 'DuckDuckGo'
      },
      {
        id: 's-quiz-me',
        title: 'Beni Sınava Hazırla (5 Soruluk Mini Test)',
        prompt: 'Sınıf düzeyime uygun olarak en kritik ders konularından 5 soruluk çoktan seçmeli bir quiz yap. Soruları tek tek veya toplu sorup cevaplarımı analiz et.',
        category: 'exam',
        icon: 'Award',
        badge: 'İnteraktif Quiz'
      },
      {
        id: 's-fast-formula',
        title: 'Önemli Formül & Özet Kartı',
        prompt: 'Matematik, Fizik veya Kimya derslerindeki en can alıcı formülleri, püf noktaları ve pratik soru çözüm taktiklerini madde madde özetle.',
        category: 'summary',
        icon: 'Zap',
        badge: 'Hızlı Özet'
      },
      {
        id: 's-motivation',
        title: 'Ders Çalışma Motivasyonu & Koçluk',
        prompt: 'Ders çalışırken odaklanma güçlüğü yaşıyorum. Pomodoro tekniği ve motivasyonumu yüksek tutacak pedagojik tavsiyeler verir misin?',
        category: 'motivation',
        icon: 'Sparkles',
        badge: 'Rehberlik & Koç'
      }
    ];
  },

  // Build comprehensive real contextual metadata for student (all registered data)
  buildStudentContext(user: UserProfile) {
    const grades = dataService.getGradesForStudent(user.uid);
    const homeworks = dataService.getHomeworksForStudent(user.classGrade);
    const submissions = dataService.getSubmissionsForStudent(user.uid);
    const attendanceRecords = dataService.getAttendanceForStudent(user.uid);
    const studentBadges = dataService.getStudentBadges(user.uid);
    const classSchedules = user.classGrade ? dataService.getSchedulesForClass(user.classGrade) : [];
    const announcements = dataService.getAnnouncements();

    // Attendance calculations (MEB High School Rules: 10 days unexcused max, 30 days total max)
    const unexcused = attendanceRecords.filter(a => a.status === 'absent').length;
    const excused = attendanceRecords.filter(a => a.status === 'excused').length;
    const late = attendanceRecords.filter(a => a.status === 'late').length;
    const totalAbsence = unexcused + excused;
    const unexcusedRemaining = Math.max(0, 10 - unexcused);
    const totalRemaining = Math.max(0, 30 - totalAbsence);
    const isAttendanceCritical = unexcused >= 7 || totalAbsence >= 23;

    // Grades & Subject Analytics
    let gpa = 0;
    const subjectStats: Record<string, { scores: number[]; total: number }> = {};
    grades.forEach(g => {
      if (!subjectStats[g.subject]) {
        subjectStats[g.subject] = { scores: [], total: 0 };
      }
      subjectStats[g.subject].scores.push(g.score);
      subjectStats[g.subject].total += g.score;
    });

    if (grades.length > 0) {
      const sum = grades.reduce((acc, g) => acc + g.score, 0);
      gpa = Math.round((sum / grades.length) * 10) / 10;
    }

    const subjectAverages = Object.keys(subjectStats).map(subj => {
      const arr = subjectStats[subj].scores;
      const avg = Math.round((subjectStats[subj].total / arr.length) * 10) / 10;
      return { subject: subj, avg, scores: arr };
    });

    const weakSubjects = subjectAverages.filter(s => s.avg < 70).map(s => `${s.subject} (Ort: ${s.avg})`);
    const strongSubjects = subjectAverages.filter(s => s.avg >= 80).map(s => `${s.subject} (Ort: ${s.avg})`);

    // Homework breakdown
    const pendingHomeworksList = homeworks
      .filter(hw => {
        const sub = submissions.find(s => s.homeworkId === hw.id);
        return !sub || sub.status === 'pending';
      })
      .map(hw => ({
        id: hw.id,
        title: hw.title,
        subject: hw.subject,
        dueDate: hw.dueDate,
        dueTime: hw.dueTime || '23:59',
        maxScore: hw.maxScore
      }));

    const completedHomeworksCount = submissions.filter(s => s.status === 'completed').length;

    // Weekly Schedule summary by day
    const dayNamesTr: Record<string, string> = {
      monday: 'Pazartesi',
      tuesday: 'Salı',
      wednesday: 'Çarşamba',
      thursday: 'Perşembe',
      friday: 'Cuma'
    };

    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const scheduleByDay = daysOrder.map(dayKey => {
      const daySlots = classSchedules
        .filter(s => s.day === dayKey)
        .sort((a, b) => a.period - b.period)
        .map(s => `${s.period}. Ders: ${s.subject} (${s.teacherName})`);
      return {
        day: dayNamesTr[dayKey],
        lessons: daySlots.length > 0 ? daySlots.join(', ') : 'Ders kaydı yok'
      };
    });

    // Gamification & Badges
    const badgeNames = studentBadges.map(b => b.badge?.name || b.badgeId);

    return {
      name: user.displayName,
      studentNumber: user.schoolNumber || 'Belirtilmedi',
      classGrade: user.classGrade || 'Belirtilmedi',
      gpa,
      totalGradesCount: grades.length,
      subjectAverages,
      weakSubjects,
      strongSubjects,
      detailedGrades: grades.map(g => `${g.subject} [${g.examType}]: ${g.score}/${g.maxScore} (Tarih: ${g.examDate})`),
      totalAbsence,
      unexcusedAbsence: unexcused,
      excusedAbsence: excused,
      lateCount: late,
      unexcusedRemaining,
      totalRemaining,
      isAttendanceCritical,
      level: user.level || 1,
      xp: user.totalXp || 0,
      streak: user.currentStreak || 0,
      badgeCount: studentBadges.length,
      badges: badgeNames,
      totalHomeworksCount: homeworks.length,
      pendingHomeworksCount: pendingHomeworksList.length,
      pendingHomeworks: pendingHomeworksList,
      completedHomeworksCount,
      weeklySchedule: scheduleByDay,
      recentAnnouncements: announcements.slice(0, 3).map(a => `${a.title} (${a.createdAt?.slice(0, 10) || ''})`)
    };
  },

  // Build comprehensive real contextual metadata for teacher
  buildTeacherContext(user: UserProfile) {
    const homeworks = dataService.getHomeworks().filter(h => h.teacherId === user.uid || h.teacherName === user.displayName);
    const classes = dataService.getClasses();
    const students = dataService.getStudents();
    const teacherSchedules = dataService.getSchedulesForTeacher(user.displayName);
    const allGrades = dataService.getGrades();

    // Teacher's subject grades across classes
    const teacherSubjectGrades = allGrades.filter(g => 
      (user.branch && g.subject.toLowerCase().includes(user.branch.toLowerCase())) || 
      g.teacherId === user.uid || 
      g.teacherName === user.displayName
    );

    let subjectAverage = 0;
    if (teacherSubjectGrades.length > 0) {
      const sum = teacherSubjectGrades.reduce((acc, g) => acc + g.score, 0);
      subjectAverage = Math.round((sum / teacherSubjectGrades.length) * 10) / 10;
    }

    // Homework stats
    const homeworkStats = homeworks.map(hw => {
      const subs = dataService.getSubmissionsForHomework(hw.id);
      return {
        title: hw.title,
        subject: hw.subject,
        targetClass: hw.targetClass,
        dueDate: hw.dueDate,
        totalSubmissions: subs.length,
        completedCount: subs.filter(s => s.status === 'completed').length
      };
    });

    // Schedule summary
    const dayNamesTr: Record<string, string> = {
      monday: 'Pazartesi',
      tuesday: 'Salı',
      wednesday: 'Çarşamba',
      thursday: 'Perşembe',
      friday: 'Cuma'
    };

    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const teacherScheduleByDay = daysOrder.map(dayKey => {
      const daySlots = teacherSchedules
        .filter(s => s.day === dayKey)
        .sort((a, b) => a.period - b.period)
        .map(s => `${s.period}. Ders: ${s.className} - ${s.subject} (${s.classroom})`);
      return {
        day: dayNamesTr[dayKey],
        schedule: daySlots.length > 0 ? daySlots.join(', ') : 'Boş Gün / Ders Yok'
      };
    });

    return {
      name: user.displayName,
      subject: user.branch || 'Genel Branş',
      assignedClasses: classes.map(c => c.name).join(', '),
      totalClassesCount: classes.length,
      totalStudentsCount: students.length,
      activeHomeworksCount: homeworks.length,
      homeworksList: homeworkStats,
      subjectAverage,
      totalExamEntries: teacherSubjectGrades.length,
      weeklySchedule: teacherScheduleByDay
    };
  },

  // Client-side local educational safety response generator powered by comprehensive logic-tree
  generateLocalEducationalFallback(
    userPrompt: string,
    studentContext?: any,
    teacherContext?: any
  ): { text: string; modelUsed: string; provider: string } {
    const result = getComprehensiveEducationalFallback(userPrompt, studentContext, teacherContext);
    return {
      text: result.text,
      modelUsed: result.modelUsed,
      provider: result.provider,
    };
  },

  // Send message to AI server endpoint with automatic fallback
  async sendMessage(params: {
    messages: { role: 'user' | 'assistant'; content: string }[];
    systemInstruction?: string;
    useSearchGrounding?: boolean;
    modelMode?: AiModelMode;
    requestedModel?: string;
    user?: UserProfile | null;
  }): Promise<{
    text: string;
    modelUsed: string;
    provider?: string;
    fallbackInfo?: any;
    grounding?: {
      webSearchQueries?: string[];
      sources?: { title: string; uri: string }[];
    };
  }> {
    let studentContext: any = null;
    let teacherContext: any = null;

    if (params.user?.role === 'student') {
      studentContext = this.buildStudentContext(params.user);
    } else if (params.user?.role === 'teacher') {
      teacherContext = this.buildTeacherContext(params.user);
    }

    const payload = {
      messages: params.messages,
      systemInstruction: params.systemInstruction,
      useSearchGrounding: params.useSearchGrounding || params.modelMode === 'search',
      modelMode: params.modelMode || 'general',
      requestedModel: params.requestedModel,
      studentContext,
      teacherContext,
    };

    let res: Response | null = null;
    try {
      res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr: any) {
      console.warn('[aiService] Network fetch failed, engaging local educational engine:', networkErr);
      const lastUserMsg = [...params.messages].reverse().find(m => m.role === 'user')?.content || '';
      return this.generateLocalEducationalFallback(lastUserMsg, studentContext, teacherContext);
    }

    if (!res) {
      const lastUserMsg = [...params.messages].reverse().find(m => m.role === 'user')?.content || '';
      return this.generateLocalEducationalFallback(lastUserMsg, studentContext, teacherContext);
    }

    const contentType = res.headers.get('content-type') || '';

    // If server returned non-JSON (e.g. HTML gateway page during reload), gracefully fallback
    if (!contentType.includes('application/json')) {
      const textPreview = await res.text().catch(() => '');
      console.warn('[aiService] Received non-JSON response from server (' + res.status + '):', textPreview.slice(0, 150));
      const lastUserMsg = [...params.messages].reverse().find(m => m.role === 'user')?.content || '';
      return this.generateLocalEducationalFallback(lastUserMsg, studentContext, teacherContext);
    }

    let data: any;
    try {
      data = await res.json();
    } catch (jsonErr: any) {
      console.warn('[aiService] JSON parsing failed, engaging local educational engine:', jsonErr);
      const lastUserMsg = [...params.messages].reverse().find(m => m.role === 'user')?.content || '';
      return this.generateLocalEducationalFallback(lastUserMsg, studentContext, teacherContext);
    }

    if (!res.ok) {
      console.warn('[aiService] Server responded with error status (' + res.status + '), engaging local educational engine:', data?.error);
      const lastUserMsg = [...params.messages].reverse().find(m => m.role === 'user')?.content || '';
      const localResult = this.generateLocalEducationalFallback(lastUserMsg, studentContext, teacherContext);
      return {
        text: `${localResult.text}\n\n*(GNSİAL Çevrimdışı/Yedek MEB Karar Ağacı Motoru Devrede)*`,
        modelUsed: localResult.modelUsed,
        provider: 'local',
        fallbackInfo: { serverError: data?.error },
      };
    }

    return data;
  },

  // Local Chat Sessions Persistence
  getSavedSessions(userId: string): AiConversationSession[] {
    try {
      const raw = localStorage.getItem(AI_SESSIONS_STORAGE_KEY);
      if (!raw) return [];
      const parsed: AiConversationSession[] = JSON.parse(raw);
      return parsed.filter(s => s.userId === userId).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch {
      return [];
    }
  },

  saveSession(session: AiConversationSession): void {
    try {
      const raw = localStorage.getItem(AI_SESSIONS_STORAGE_KEY);
      let list: AiConversationSession[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(s => s.id === session.id);
      if (idx >= 0) {
        list[idx] = session;
      } else {
        list.unshift(session);
      }
      // Keep up to 20 recent sessions
      list = list.slice(0, 20);
      localStorage.setItem(AI_SESSIONS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving AI session:', e);
    }
  },

  deleteSession(sessionId: string): void {
    try {
      const raw = localStorage.getItem(AI_SESSIONS_STORAGE_KEY);
      if (!raw) return;
      const list: AiConversationSession[] = JSON.parse(raw);
      const filtered = list.filter(s => s.id !== sessionId);
      localStorage.setItem(AI_SESSIONS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error deleting AI session:', e);
    }
  },

  // Developer AI Provider Configuration
  async getProviderConfig(): Promise<AiProviderConfig> {
    try {
      const res = await fetch('/api/ai/config');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch /api/ai/config:', e);
    }
    return {
      primaryProvider: 'groq',
      groqModel: 'qwen/qwen3.8-27b',
      isGroqConfigured: false,
      cascadeOrder: ['NVIDIA NIM (DeepSeek V4 Pro / Kimi K3 - Birincil)', 'Groq Cloud (Qwen 3.8 27B - Yedek)', 'Canlı Web Arama (DuckDuckGo & Vikipedi)', 'GNSİAL MEB Eğitim Motoru (Yerel)'],
      lastCheckTimestamp: new Date().toISOString()
    };
  },

  // Developer Diagnostic Test Runner
  async runDiagnosticTest(
    provider: string = 'auto', 
    prompt: string = 'GNSİAL Eğitim Sistemi için kısa bir motivasyon mesajı yaz.',
    model?: string
  ): Promise<AiDiagnosticTestResult> {
    const startTime = Date.now();
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, prompt, model })
      });
      const data = await res.json();
      if (res.ok) {
        return data;
      }
      return {
        provider,
        model: model || 'Hata',
        latencyMs: Date.now() - startTime,
        status: 'error',
        responsePreview: '',
        error: data.error || 'Test çağrısı başarısız oldu.',
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        provider,
        model: model || 'Bağlantı Hatası',
        latencyMs: Date.now() - startTime,
        status: 'error',
        responsePreview: '',
        error: err.message || 'Sunucuya ulaşılamadı.',
        timestamp: new Date().toISOString()
      };
    }
  },

  // Image Generation (targeting stable-diffusion-3.5-large)
  async generateImage(prompt: string, model: string = 'stabilityai/stable-diffusion-3.5-large') {
    const res = await fetch('/api/ai/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model })
    });
    return await res.json();
  },

  // Chatterbox TTS Multilingual Audio Synthesizer
  async synthesizeSpeech(text: string, language: string = 'tr-TR') {
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, model: 'chatterbox-multilingual-tts' })
      });
      const data = await res.json();
      
      // Also trigger Web Speech API in browser for immediate vocal output
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 300));
        utterance.lang = language;
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
      return data;
    } catch (err: any) {
      console.warn('[aiService] TTS error:', err);
      return { success: false, error: err.message };
    }
  },

  // DuckDuckGo Search API
  async searchDuckDuckGo(query: string, category: string = 'all') {
    const cleanQ = query.trim();
    if (!cleanQ) return null;

    const res = await fetch(`/api/ddg/search?q=${encodeURIComponent(cleanQ)}&category=${encodeURIComponent(category)}`);
    if (!res.ok) {
      throw new Error('DuckDuckGo arama servisine ulaşılamadı.');
    }
    return await res.json();
  },

  // DuckDuckGo Autocomplete Suggestions
  async getDuckDuckGoSuggestions(query: string): Promise<string[]> {
    const cleanQ = query.trim();
    if (!cleanQ) return [];

    try {
      const res = await fetch(`/api/ddg/suggest?q=${encodeURIComponent(cleanQ)}`);
      if (res.ok) {
        const data = await res.json();
        return data.suggestions || [];
      }
    } catch {
      // ignore
    }
    return [];
  }
};
