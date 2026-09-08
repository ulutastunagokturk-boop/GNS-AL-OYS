import React from 'react';
import { UserProfile, GradeRecord } from '../../types';
import { School, Printer, Download, X, Award, CheckCircle2, Calendar, FileText, User } from 'lucide-react';

interface GradesPrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  grades: GradeRecord[];
}

export const GradesPrintReportModal: React.FC<GradesPrintReportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  grades
}) => {
  if (!isOpen) return null;

  // Group grades by subject
  const subjectsMap: { [subject: string]: GradeRecord[] } = {};
  grades.forEach(g => {
    if (!subjectsMap[g.subject]) {
      subjectsMap[g.subject] = [];
    }
    subjectsMap[g.subject].push(g);
  });

  const subjectNames = Object.keys(subjectsMap);
  const totalScore = grades.reduce((acc, g) => acc + g.score, 0);
  const overallAvg = grades.length > 0 ? (totalScore / grades.length).toFixed(2) : '0.00';
  const highestGrade = grades.length > 0 ? Math.max(...grades.map(g => g.score)) : 0;
  const lowestGrade = grades.length > 0 ? Math.min(...grades.map(g => g.score)) : 0;

  const getLetterGrade = (score: number) => {
    if (score >= 90) return { letter: 'AA', coefficient: '4.0', status: 'Pekiyi' };
    if (score >= 80) return { letter: 'BA', coefficient: '3.5', status: 'İyi' };
    if (score >= 70) return { letter: 'BB', coefficient: '3.0', status: 'Orta-İyi' };
    if (score >= 60) return { letter: 'CB', coefficient: '2.5', status: 'Orta' };
    if (score >= 50) return { letter: 'CC', coefficient: '2.0', status: 'Geçer' };
    return { letter: 'FF', coefficient: '0.0', status: 'Başarısız' };
  };

  const getSuccessStatus = (avg: number) => {
    if (avg >= 85) return 'Takdir Belgesi Kriterine Uygun';
    if (avg >= 70) return 'Teşekkür Belgesi Kriterine Uygun';
    if (avg >= 50) return 'Başarılı / Sınıfı Geçti';
    return 'Geliştirilmeli / Sorumluluk Sınavı';
  };

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div 
        className="relative w-full max-w-4xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:shadow-none print:border-none print:m-0 print:max-w-none print:w-full print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Action Bar (Hidden during Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800">
              Resmi Sınav & Not Durum Belgesi (Önizleme)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="print-action-btn"
              onClick={handlePrint}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Raporu Yazdır / PDF Olarak Kaydet</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div id="student-report-print-area" className="p-8 sm:p-10 space-y-6 bg-white print:p-6 print:space-y-4 text-slate-900">
          
          {/* Header & Logo */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-900 text-white flex flex-col items-center justify-center font-black text-xl shadow-xs print:border print:border-black">
                <span>G</span>
                <span className="text-[9px] tracking-widest uppercase font-semibold">1992</span>
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900">
                  T.C. MİLLÎ EĞİTİM BAKANLIĞI
                </h1>
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  Gaziemir Nevvar Salih İşgören Anadolu Lisesi Müdürlüğü
                </h2>
                <p className="text-[11px] text-slate-600 font-medium">
                  Öğrenci Bilgi Sistemi (ÖBS) • Resmi Not ve Gelişim Çizelgesi
                </p>
              </div>
            </div>

            <div className="text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
              <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold border border-slate-300">
                2025 - 2026 EĞİTİM-ÖĞRETİM YILI
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Düzenleme Tarihi: {currentDate}</p>
            </div>
          </div>

          {/* Student Information Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Öğrenci Adı Soyadı</span>
              <span className="font-black text-sm text-slate-900">{currentUser.displayName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Okul Numarası</span>
              <span className="font-black text-sm text-indigo-700">#{currentUser.schoolNumber || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Sınıfı / Şubesi</span>
              <span className="font-black text-sm text-slate-900">{currentUser.classGrade || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Genel Akademik Durum</span>
              <span className="font-bold text-xs text-emerald-700 block mt-0.5">
                {getSuccessStatus(Number(overallAvg))}
              </span>
            </div>
          </div>

          {/* Academic Summary KPI Boxes */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
              <span className="text-[10px] font-bold text-indigo-800 block">Genel Ağırlıklı Ortalama</span>
              <span className="text-xl font-black text-indigo-950">{overallAvg}</span>
              <span className="text-[9px] text-indigo-600 block">/ 100 Tam Puan</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-600 block">Değerlendirilen Ders</span>
              <span className="text-xl font-black text-slate-900">{subjectNames.length}</span>
              <span className="text-[9px] text-slate-500 block">Branş</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-800 block">En Yüksek Sınav Notu</span>
              <span className="text-xl font-black text-emerald-950">{highestGrade}</span>
              <span className="text-[9px] text-emerald-700 block">Başarı Zirvesi</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[10px] font-bold text-amber-800 block">En Düşük Sınav Notu</span>
              <span className="text-xl font-black text-amber-950">{lowestGrade}</span>
              <span className="text-[9px] text-amber-700 block">Gelişim Alanı</span>
            </div>
          </div>

          {/* Detailed Course Grades Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span>Ders Bazlı Sınav ve Performans Sonuçları</span>
            </h3>

            <table className="w-full text-left text-xs border border-slate-300 rounded-lg overflow-hidden border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-3 border-r border-slate-300 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Ders Adı</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Değerlendirme Türü</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center">Tarih</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center">Puan</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center">Harf Notu</th>
                  <th className="py-2.5 px-3 text-left">Öğretmen Değerlendirme Notu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {grades.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      Öğrenciye ait kayıtlı sınav notu bulunamadı.
                    </td>
                  </tr>
                ) : (
                  grades.map((g, idx) => {
                    const letter = getLetterGrade(g.score);
                    return (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-medium text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900">
                          {g.subject}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                          {g.examType}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center text-slate-600">
                          {g.examDate || '-'}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-black text-sm text-slate-900">
                          {g.score}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-bold">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 text-[11px]">
                            {letter.letter}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          {g.notes || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Subject Averages Summary */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Ders Genel Başarı Durumu İcmali
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {subjectNames.map(subj => {
                const subGrades = subjectsMap[subj];
                const avg = (subGrades.reduce((a, b) => a + b.score, 0) / subGrades.length).toFixed(1);
                const letter = getLetterGrade(Number(avg));
                return (
                  <div key={subj} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{subj}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900">{avg}</span>
                      <span className="px-1.5 py-0.2 bg-slate-200 text-[10px] font-bold rounded">
                        {letter.letter}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Official Signature and Stamp Box */}
          <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <p className="font-bold text-slate-700 mb-12">Sınıf Rehber Öğretmeni</p>
              <p className="text-[11px] text-slate-400">İmza / Kaşe</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-12">Müdür Yardımcısı</p>
              <p className="text-[11px] text-slate-400">İmza / Mühür</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 mb-12">Okul Müdürü</p>
              <p className="font-bold text-slate-900">Dr. Öğr. Görevlisi / Müdür</p>
              <p className="text-[11px] text-slate-400">Onay</p>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
            Bu belge Gaziemir Nevvar Salih İşgören Anadolu Lisesi Bilişim ve Okul Yönetim Sistemi (GNSİAL OYS) üzerinden elektronik olarak üretilmiştir.
          </div>

        </div>

      </div>
    </div>
  );
};
