import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CLASS_PERIODS } from '../../services/scheduleData';
import { SchedulePrintModal } from './SchedulePrintModal';
import { 
  Clock, 
  FileDown, 
  Printer, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  Utensils, 
  Copy, 
  Check, 
  Sparkles,
  School,
  ShieldCheck,
  Sunrise,
  Sunset,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

interface WeeklyScheduleViewProps {
  initialClass?: string;
  initialTeacher?: string;
}

export const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = () => {
  const { currentUser } = useAuth();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Helper to calculate current bell/lesson status
  const getCurrentBellStatus = () => {
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTotalMin = hours * 60 + minutes;

    const parseMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const firstStart = parseMin(CLASS_PERIODS[0].startTime); // 08:50 -> 530
    const lastEnd = parseMin(CLASS_PERIODS[CLASS_PERIODS.length - 1].endTime); // 15:45 -> 945

    if (currentTotalMin < firstStart) {
      const diff = firstStart - currentTotalMin;
      return {
        type: 'before_school',
        title: 'Dersler Henüz Başlamadı',
        badge: 'İlk Ders: 08:50',
        subtitle: `Öğrencilerin en geç 08:45'te hazır bulunması gerekmektedir (Kalan: ${diff} dk)`,
        periodNumber: null,
        progress: 0
      };
    }

    if (currentTotalMin >= lastEnd) {
      return {
        type: 'after_school',
        title: 'Günün Dersleri Sona Erdi',
        badge: 'Okul Çıkışı: 15:45',
        subtitle: 'Bugünkü 8 ders saati tamamlanmıştır. İyi dinlenmeler!',
        periodNumber: null,
        progress: 100
      };
    }

    // Check during periods or breaks
    for (let i = 0; i < CLASS_PERIODS.length; i++) {
      const p = CLASS_PERIODS[i];
      const startMin = parseMin(p.startTime);
      const endMin = parseMin(p.endTime);

      // In Lesson
      if (currentTotalMin >= startMin && currentTotalMin < endMin) {
        const elapsed = currentTotalMin - startMin;
        const total = endMin - startMin;
        const remaining = endMin - currentTotalMin;
        return {
          type: 'in_lesson',
          title: `Şu Anda: ${p.label} Devam Ediyor`,
          badge: `${p.startTime} - ${p.endTime}`,
          subtitle: `Dersin bitmesine yaklaşık ${remaining} dakika kaldı`,
          periodNumber: p.period,
          progress: Math.round((elapsed / total) * 100)
        };
      }

      // In Break after period
      if (i < CLASS_PERIODS.length - 1) {
        const nextP = CLASS_PERIODS[i + 1];
        const nextStartMin = parseMin(nextP.startTime);

        if (currentTotalMin >= endMin && currentTotalMin < nextStartMin) {
          const isLunch = p.isLunchAfter;
          const remaining = nextStartMin - currentTotalMin;
          const totalBreak = nextStartMin - endMin;
          const elapsed = currentTotalMin - endMin;

          return {
            type: isLunch ? 'in_lunch' : 'in_break',
            title: isLunch ? '🍽️ Öğle Arası ve Yemek Tatili (12:50 - 13:30)' : `Teneffüs Vakti (${p.breakLabel})`,
            badge: `${p.endTime} - ${nextP.startTime}`,
            subtitle: `Sonraki ders: ${nextP.label} (${nextP.startTime}) • Kalan: ${remaining} dk`,
            periodNumber: null,
            progress: Math.round((elapsed / totalBreak) * 100)
          };
        }
      }
    }

    return {
      type: 'general',
      title: 'Okul Ders Saatleri Uygulanıyor',
      badge: '08:50 - 15:45',
      subtitle: 'Dersler 40 dakika, teneffüsler 10 dakika',
      periodNumber: null,
      progress: 50
    };
  };

  const bellStatus = getCurrentBellStatus();

  const handleCopySchedule = () => {
    const text = `GAZİEMİR NEVVAR SALİH İŞGÖREN ANADOLU LİSESİ DERS SAATLERİ (2026-2027)
1. Ders: 08:50 - 09:30 (Teneffüs: 10 dk)
2. Ders: 09:40 - 10:20 (Teneffüs: 10 dk)
3. Ders: 10:30 - 11:10 (Teneffüs: 10 dk)
4. Ders: 11:20 - 12:00 (Teneffüs: 10 dk)
5. Ders: 12:10 - 12:50
-- ÖĞLE ARASI: 12:50 - 13:30 (40 dk) --
6. Ders: 13:30 - 14:10 (Teneffüs: 10 dk)
7. Ders: 14:20 - 15:00 (Teneffüs: 5 dk)
8. Ders: 15:05 - 15:45 (Okul Çıkışı)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5" />
                Gaziemir Nevvar Salih İşgören Anadolu Lisesi
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                2026 - 2027 Eğitim Yılı
              </span>
              <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                Sadece Ders Saatleri
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Günlük Ders & Zil Saatleri Çizelgesi
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Dersler <strong>40 dakika</strong>, standart teneffüsler <strong>10 dakika</strong>, öğle arası <strong>40 dakika</strong> (12:50 - 13:30) ve 7. ders sonrası kısa teneffüs <strong>5 dakikadır</strong>.
            </p>
          </div>

          {/* Quick Actions (PDF Download & Print) */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="download-schedule-pdf-hero-btn"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95"
            >
              <FileDown className="w-4 h-4" />
              <span>PDF Olarak İndir / Yazdır</span>
            </button>

            <button
              id="btn-copy-bell-times"
              onClick={handleCopySchedule}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-bold text-white transition flex items-center gap-2 cursor-pointer"
              title="Saat çizelgesini panoya kopyala"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Kopyalandı!' : 'Saatleri Kopyala'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notice Banner: Class Timetable Cancelled / Bell Times Active */}
      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start sm:items-center gap-3 text-xs sm:text-sm text-blue-900 dark:text-blue-200">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
        <div className="space-y-0.5">
          <p className="font-bold">
            Okul İdaresi Bilgilendirmesi:
          </p>
          <p className="text-xs text-blue-800/90 dark:text-blue-300">
            Haftalık sınıf bazlı ders dağılım programları okul idaresi tarafından henüz yayınlanmamış / iptal edilmiş olup, tüm şube ve öğretmenler için geçerli <strong>günlük ders ve zil saatleri</strong> aşağıda listelenmiştir.
          </p>
        </div>
      </div>

      {/* Live Bell & Current Period Status Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              bellStatus.type === 'in_lesson'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 animate-pulse'
                : bellStatus.type === 'in_lunch'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
            }`}>
              {bellStatus.type === 'in_lunch' ? <Utensils className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Canlı Okul Saati Durumu
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-700 dark:text-slate-300">
                  {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {bellStatus.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {bellStatus.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${
              bellStatus.type === 'in_lesson'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                : bellStatus.type === 'in_lunch'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300'
            }`}>
              {bellStatus.badge}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${
              bellStatus.type === 'in_lesson' ? 'bg-emerald-500' : bellStatus.type === 'in_lunch' ? 'bg-amber-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, bellStatus.progress))}%` }}
          />
        </div>
      </div>

      {/* Control Bar: View Mode Switch & PDF Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kart Görünümü</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'table'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tablo Görünümü</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="download-schedule-pdf-toolbar-btn"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Ders saatlerini PDF olarak indir veya yazdır"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>PDF İndir / Yazdır</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          
          {/* Morning Section Title */}
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-2">
            <Sunrise className="w-4 h-4 text-amber-500" />
            <span>Sabah Bloğu • 1. - 5. Dersler (08:50 - 12:50)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {CLASS_PERIODS.slice(0, 5).map((period) => {
              const isCurrent = bellStatus.periodNumber === period.period;
              return (
                <div
                  key={period.period}
                  className={`p-4 rounded-2xl border transition relative ${
                    isCurrent
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                      Şu An
                    </span>
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isCurrent
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900'
                    }`}>
                      {period.period}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {period.label}
                        </h4>
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          40 dk
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-950 dark:text-indigo-300">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{period.startTime} – {period.endTime}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Sonrası:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {period.breakLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* LUNCH BREAK HIGHLIGHT BANNER */}
          <div className="my-3 p-4 sm:p-5 rounded-3xl bg-linear-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-amber-950/40 border-2 border-amber-300/80 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-amber-500/30 shrink-0">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                    Önemli Dinlenme Aralığı
                  </span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    40 Dakika
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-200">
                  12:50 - 13:30 ÖĞLE ARASI & YEMEK TATİLİ
                </h3>
                <p className="text-xs text-amber-800/90 dark:text-amber-300">
                  5. ders bitiminde başlar, 6. ders zili 13:30'da çalar. Yemekhane ve kantin hizmet verir.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-black shadow-xs">
                12:50 – 13:30
              </span>
            </div>
          </div>

          {/* Afternoon Section Title */}
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-2">
            <Sunset className="w-4 h-4 text-indigo-500" />
            <span>Öğleden Sonra Bloğu • 6. - 8. Dersler (13:30 - 15:45)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {CLASS_PERIODS.slice(5).map((period) => {
              const isCurrent = bellStatus.periodNumber === period.period;
              const isFinal = period.period === 8;
              return (
                <div
                  key={period.period}
                  className={`p-4 rounded-2xl border transition relative ${
                    isCurrent
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-md ring-2 ring-emerald-500/20'
                      : isFinal
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                      Şu An
                    </span>
                  )}
                  {isFinal && !isCurrent && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">
                      Son Ders
                    </span>
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isCurrent
                        ? 'bg-emerald-600 text-white'
                        : isFinal
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900'
                    }`}>
                      {period.period}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {period.label}
                        </h4>
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          40 dk
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-950 dark:text-indigo-300">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{period.startTime} – {period.endTime}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Sonrası:</span>
                        <span className={`font-bold px-2 py-0.5 rounded-md ${
                          isFinal 
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {period.breakLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* VIEW MODE 2: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ders Sırası</th>
                  <th className="py-3 px-4">Giriş Saati</th>
                  <th className="py-3 px-4">Çıkış Saati</th>
                  <th className="py-3 px-4">Ders Süresi</th>
                  <th className="py-3 px-4">Teneffüs / Dinlenme</th>
                  <th className="py-3 px-4">Açıklama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {CLASS_PERIODS.map((period) => (
                  <React.Fragment key={period.period}>
                    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-black">
                          {period.period}
                        </span>
                        <span>{period.label}</span>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-indigo-600 dark:text-indigo-400">
                        {period.startTime}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-indigo-600 dark:text-indigo-400">
                        {period.endTime}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        40 Dakika
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {period.breakLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {period.period === 1 && 'Giriş zili. Öğrencilerin 08:45\'te hazır bulunması esastır.'}
                        {period.period === 2 && '2. Ders saati ve e-Yoklama.'}
                        {period.period === 3 && '3. Ders saati.'}
                        {period.period === 4 && '4. Ders saati.'}
                        {period.period === 5 && 'Sabah bloğu sonu. Ders bitimi öğle arasına geçilir.'}
                        {period.period === 6 && 'Öğleden sonra başlangıç zili (13:30).'}
                        {period.period === 7 && '7. Ders saati (Ders bitimi 5 dk kısa teneffüs uygulanır).'}
                        {period.period === 8 && 'Günün son dersi. 15:45 itibarıyla genel okul çıkışı gerçekleşir.'}
                      </td>
                    </tr>

                    {/* Lunch Break Row */}
                    {period.isLunchAfter && (
                      <tr className="bg-amber-100/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold border-y border-amber-200 dark:border-amber-900/60">
                        <td colSpan={6} className="py-2.5 px-4 text-center text-xs tracking-wider uppercase">
                          🍽️ 12:50 - 13:30 ÖĞLE ARASI DİNLENME VE YEMEK TATİLİ (40 DAKİKA)
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rules & Guidelines Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Time Rules */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
            <Clock className="w-5 h-5" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Zaman Çizelgesi & Giriş-Çıkış Kuralları
            </h3>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>08:45 Hazır Bulunma:</strong> İlk ders 08:50'de başlar. Öğrencilerin en geç 08:45'te okul bahçesi ve sınıflarında bulunması zorunludur.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>40 Dakika Ders:</strong> Tüm ders saatleri 40 dakika olarak kesintisiz işlenir.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>10 dk / 5 dk Teneffüs:</strong> Standart dinlenmeler 10 dakikadır; 7. ders bitiminde öğrencilerin toparlanması için 5 dakikalık hızlı teneffüs uygulanır.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>15:45 Okul Çıkışı:</strong> 8. ders bitimiyle okul günü sona erer.</span>
            </li>
          </ul>
        </div>

        {/* Card 2: Duty Teachers & Administration */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Nöbetçi Öğretmen & İdare Bilgileri
            </h3>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Nöbet Başlangıcı 08:30:</strong> Nöbetçi öğretmenler ve idareciler ilk dersten 20 dakika önce görev alanlarında hazır bulunur.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Öğle Arası Güvenliği:</strong> 12:50 - 13:30 arasında yemekhane, kantin ve okul bahçesinde nöbetçi öğretmenler denetim sağlar.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Nöbet Bitişi 16:00:</strong> Çıkış zilinden 15 dakika sonrasına kadar bina tahliyesi ve okul güvenliği kontrol edilir.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Resmi Mevzuat:</strong> MEB Ortaöğretim Kurumları Yönetmeliği hükümlerine tabidir.</span>
            </li>
          </ul>
        </div>

      </div>

      {/* Official Print & PDF Modal */}
      <SchedulePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

    </div>
  );
};
