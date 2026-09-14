import React from 'react';
import { WeeklyScheduleSlot } from '../../types';
import { CLASS_PERIODS, DAYS_CONFIG } from '../../services/scheduleData';
import { X, Printer, FileDown, Calendar, Clock, Info, CheckCircle2, School } from 'lucide-react';

interface SchedulePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  slots: WeeklyScheduleSlot[];
  targetName: string; // e.g. '10-A Sınıfı' or 'Ahmet Yılmaz (Matematik Öğretmeni)'
}

export const SchedulePrintModal: React.FC<SchedulePrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  slots,
  targetName
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Calculate subject hours distribution for this schedule
  const subjectDistribution: { [subject: string]: number } = {};
  slots.forEach(slot => {
    if (slot.subject) {
      subjectDistribution[slot.subject] = (subjectDistribution[slot.subject] || 0) + 1;
    }
  });

  const distinctSubjects = Object.keys(subjectDistribution).sort((a, b) => 
    subjectDistribution[b] - subjectDistribution[a]
  );
  const totalHours = slots.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-xs animate-fade-in overflow-y-auto print-modal-container">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 print-sheet">
        
        {/* Modal Header & Quick Action Bar (Hidden in Print) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Haftalık Ders Programı • PDF & Resmi Çıktı
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                08:50 - 15:45 okul idaresi saatleri ve A4 yatay formatına tam uyumlu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="print-schedule-action-btn"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95"
            >
              <FileDown className="w-4 h-4" />
              <span>PDF Olarak İndir / Yazdır</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Guidance Banner (Hidden in Print) */}
        <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>İpucu:</strong> Açılan yazdırma diyaloğunda <strong>Hedef (Destination)</strong> kısmından <strong>"PDF Olarak Kaydet" (Save as PDF)</strong> seçerek belgenizi doğrudan indirebilirsiniz. Sayfa düzeni yatay ve marjinler otomatik ayarlanmıştır.
          </span>
        </div>

        {/* Printable Paper Canvas Area */}
        <div className="p-6 sm:p-8 bg-white text-slate-950 space-y-5 print:p-2 print:space-y-3">
          
          {/* Official Document Header */}
          <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
            <div className="text-[11px] font-black tracking-widest text-slate-700 uppercase">
              T.C. MİLLÎ EĞİTİM BAKANLIĞI • İZMİR VALİLİĞİ • GAZİEMİR İLÇE MİLLÎ EĞİTİM MÜDÜRLÜĞÜ
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase leading-snug">
              GAZİEMİR NEVVAR SALİH İŞGÖREN ANADOLU LİSESİ MÜDÜRLÜĞÜ
            </h1>
            <div className="text-xs font-extrabold text-slate-800">
              2026 - 2027 EĞİTİM VE ÖĞRETİM YILI HAFTALIK DERS DAĞILIM VE ÇİZELGESİ
            </div>
            
            {/* Target Class / Teacher & School Bell Hours Badge */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="px-3.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wide">
                {targetName}
              </span>
              <span className="px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800">
                ⏰ Ders Saatleri: 08:50 - 15:45 (8 Ders)
              </span>
              <span className="px-3 py-1 bg-amber-100 border border-amber-300 rounded-lg text-xs font-bold text-amber-900">
                🍽️ Öğle Arası: 12:50 - 13:30 (40 dk)
              </span>
            </div>
          </div>

          {/* Timetable Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-700 text-center text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-700 p-2 text-[11px] font-black text-slate-900 w-28 bg-slate-200">
                    Ders & Saat
                  </th>
                  {DAYS_CONFIG.map(d => (
                    <th key={d.key} className="border border-slate-700 p-2 text-xs font-black uppercase text-slate-950">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CLASS_PERIODS.map((period) => (
                  <React.Fragment key={period.period}>
                    <tr className="break-inside-avoid">
                      <td className="border border-slate-700 p-1.5 bg-slate-50 font-bold text-slate-900 text-center">
                        <div className="font-black text-xs text-slate-950">{period.label}</div>
                        <div className="text-[10px] font-extrabold text-indigo-950 tracking-tight">
                          {period.startTime} - {period.endTime}
                        </div>
                        <div className="text-[9px] text-slate-600 font-medium">
                          {period.breakLabel}
                        </div>
                      </td>
                      
                      {DAYS_CONFIG.map((day) => {
                        const slot = slots.find(s => s.day === day.key && s.period === period.period);
                        return (
                          <td key={day.key} className="border border-slate-700 p-2 align-top text-left min-w-[130px] bg-white">
                            {slot ? (
                              <div className="space-y-0.5">
                                <div className="font-black text-slate-950 text-xs leading-tight">
                                  {slot.subject}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-800 flex items-center gap-1">
                                  <span>👤 {slot.teacherName}</span>
                                </div>
                                <div className="text-[9.5px] text-slate-600 flex items-center justify-between">
                                  <span>📍 {slot.classroom}</span>
                                  {slot.className && slot.className !== targetName && (
                                    <span className="font-bold text-slate-900">({slot.className})</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-300 font-bold text-xs text-center py-2">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Lunch Break separator after 5th period (12:50 - 13:30) */}
                    {period.isLunchAfter && (
                      <tr className="bg-amber-100/90 print-lunch-break break-inside-avoid">
                        <td colSpan={6} className="border border-slate-700 py-1.5 px-3 text-center text-[10.5px] font-black text-amber-950 tracking-wider uppercase">
                          🍽️ 12:50 - 13:30 ÖĞLE ARASI DİNLENME VE YEMEK TATİLİ (40 DAKİKA)
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Weekly Subject Hours Distribution Summary */}
          {distinctSubjects.length > 0 && (
            <div className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-[10px]">
              <div className="font-black text-slate-900 mb-1 flex items-center justify-between">
                <span>HAFTALIK DERS SAATİ DAĞILIMI (TOPLAM: {totalHours} DERS SAATİ):</span>
                <span className="text-slate-500 font-semibold">Gaziemir Nevvar Salih İşgören AL</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-800">
                {distinctSubjects.map(sub => (
                  <span key={sub} className="inline-flex items-center gap-1">
                    <strong className="text-slate-950">{sub}:</strong>
                    <span>{subjectDistribution[sub]} saat</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Document Footer, Administrative Notes & Signatures */}
          <div className="pt-3 border-t-2 border-slate-800 flex items-end justify-between text-xs text-slate-800 break-inside-avoid">
            <div className="max-w-md space-y-1">
              <p className="font-black text-slate-950 text-[11px] uppercase">Önemli Kurallar ve Açıklamalar:</p>
              <ul className="list-disc list-inside text-[10px] text-slate-700 space-y-0.5">
                <li>Dersler 40 dakika, teneffüsler 10 dakika (7. ders sonrası 5 dakika), öğle arası 40 dakikadır (12:50 - 13:30).</li>
                <li>Ders giriş saati 08:50, çıkış saati 15:45'tir. Öğrencilerin 08:45'te sınıflarında hazır bulunması esastır.</li>
                <li>İşbu program MEB Ortaöğretim Kurumları Yönetmeliği uyarınca yürürlüktedir.</li>
              </ul>
              <p className="text-[9px] text-slate-500 pt-1">
                Tarih: {new Date().toLocaleDateString('tr-TR')} • GNSİAL e-Okul Bilgi Yönetim Sistemi
              </p>
            </div>

            <div className="flex items-end gap-10">
              <div className="text-center min-w-[150px] space-y-1">
                <div className="font-bold text-slate-800 text-[11px]">Düzenleyen</div>
                <div className="text-[10px] text-slate-600">Müdür Yardımcısı</div>
                <div className="font-bold text-slate-950 pt-7 text-xs">İmza</div>
              </div>

              <div className="text-center min-w-[170px] space-y-1">
                <div className="font-black text-slate-950 text-xs">UYGUNDUR</div>
                <div className="text-[10px] text-slate-600">{new Date().toLocaleDateString('tr-TR')}</div>
                <div className="font-black text-slate-950 pt-5 text-xs">Okul Müdürü</div>
                <div className="text-[10px] text-slate-700">Mühür - İmza</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
