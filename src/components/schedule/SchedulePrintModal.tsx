import React from 'react';
import { WeeklyScheduleSlot } from '../../types';
import { CLASS_PERIODS, DAYS_CONFIG, SUBJECT_THEMES } from '../../services/scheduleData';
import { X, Printer, Download, School, Calendar, Clock, MapPin, CheckCircle2 } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 print:border-none print:shadow-none print:m-0 print:max-w-none print:w-full">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Ders Programı Yazdırma & Resmi Çıktı Önizleme
              </h3>
              <p className="text-xs text-slate-500">
                A4 formatına tam uyumlu resmi ders çizelgesi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Yazdır / PDF Olarak Kaydet
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas Area */}
        <div className="p-6 sm:p-8 bg-white text-slate-900 space-y-6 print:p-4 print:text-black">
          
          {/* Official Document Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <div className="text-xs font-bold tracking-widest text-slate-700 uppercase">
              T.C. MİLLÎ EĞİTİM BAKANLIĞI • İZMİR / GAZİEMİR İLÇE MİLLİ EĞİTİM MÜDÜRLÜĞÜ
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase">
              GAZİEMİR NEVVAR SALİH İŞGÖREN ANADOLU LİSESİ
            </h1>
            <div className="text-xs font-semibold text-slate-800">
              2026 - 2027 EĞİTİM VE ÖĞRETİM YILI HAFTALIK DERS PROGRAMI ÇİZELGESİ
            </div>
            <div className="inline-block mt-2 px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs font-black text-slate-900">
              {targetName}
            </div>
          </div>

          {/* Timetable Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-center text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 p-2 text-[11px] font-extrabold w-24">Ders / Saat</th>
                  {DAYS_CONFIG.map(d => (
                    <th key={d.key} className="border border-slate-400 p-2 text-xs font-black uppercase text-slate-900">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CLASS_PERIODS.map((period) => (
                  <React.Fragment key={period.period}>
                    <tr>
                      <td className="border border-slate-400 p-2 bg-slate-50 font-bold text-slate-800">
                        <div className="font-extrabold">{period.label}</div>
                        <div className="text-[10px] text-slate-600 font-medium">
                          {period.startTime} - {period.endTime}
                        </div>
                      </td>
                      
                      {DAYS_CONFIG.map((day) => {
                        const slot = slots.find(s => s.day === day.key && s.period === period.period);
                        return (
                          <td key={day.key} className="border border-slate-400 p-2 align-top text-left min-w-[120px] bg-white">
                            {slot ? (
                              <div className="space-y-0.5">
                                <div className="font-black text-slate-950 text-xs">
                                  {slot.subject}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-700 flex items-center gap-1">
                                  <span>👤 {slot.teacherName}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <span>📍 {slot.classroom}</span>
                                  {slot.className && slot.className !== targetName && (
                                    <span className="font-bold text-slate-800">({slot.className})</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-300 font-medium text-[11px] text-center py-2">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Lunch Break separator if 4th period */}
                    {period.isLunchAfter && (
                      <tr className="bg-amber-50">
                        <td colSpan={6} className="border border-slate-400 py-1 px-2 text-center text-[10px] font-bold text-amber-900 tracking-wider uppercase">
                          🍽️ 11:40 - 12:30 ÖĞLE ARASI DİNLENME VE YEMEK TATİLİ (50 DAKİKA)
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Document Footer & Signatures */}
          <div className="pt-6 border-t border-slate-300 flex items-end justify-between text-xs text-slate-700">
            <div>
              <p className="font-semibold">Notlar ve Açıklamalar:</p>
              <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5 mt-1">
                <li>Dersler 40 dakika, teneffüsler 10 dakika, öğle arası 50 dakikadır.</li>
                <li>Öğrencilerin ders başlamadan 5 dakika önce derslikte hazır bulunması esastır.</li>
                <li>Resmi onaylı ders programıdır.</li>
              </ul>
              <p className="text-[10px] text-slate-400 mt-2">
                Oluşturulma Tarihi: {new Date().toLocaleDateString('tr-TR')} • GNSİAL Bilgi Yönetim Sistemi
              </p>
            </div>

            <div className="text-center min-w-[200px] space-y-1">
              <div className="font-bold text-slate-900">Uygundur</div>
              <div className="text-[11px] text-slate-600">{new Date().toLocaleDateString('tr-TR')}</div>
              <div className="font-black text-slate-950 pt-6">Okul Müdürü</div>
              <div className="text-[11px] text-slate-600">Gaziemir Nevvar Salih İşgören Anadolu Lisesi</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
