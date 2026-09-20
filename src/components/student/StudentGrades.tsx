import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { GradeRecord, ExamType } from '../../types';
import { GradesPrintReportModal } from './GradesPrintReportModal';
import { 
  Award, 
  TrendingUp, 
  BookOpen, 
  Calendar, 
  Star, 
  CheckCircle2, 
  Search,
  Layers,
  Sparkles,
  Printer,
  FileText
} from 'lucide-react';

export const StudentGrades: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedExamType, setSelectedExamType] = useState<string>('all');
  const [searchSubject, setSearchSubject] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [grades, setGrades] = useState<GradeRecord[]>(() => 
    currentUser ? dataService.getGradesForStudent(currentUser.uid) : []
  );

  React.useEffect(() => {
    if (!currentUser) return;
    const update = () => {
      setGrades([...dataService.getGradesForStudent(currentUser.uid)]);
    };
    update();
    const unsub = dataService.subscribe(update);
    return unsub;
  }, [currentUser?.uid]);

  if (!currentUser) return null;

  // Group grades by subject
  const subjectsMap: { [subject: string]: GradeRecord[] } = {};
  grades.forEach(g => {
    if (!subjectsMap[g.subject]) {
      subjectsMap[g.subject] = [];
    }
    subjectsMap[g.subject].push(g);
  });

  const subjectNames = Object.keys(subjectsMap);

  // Overall GPA Calculation
  const totalScore = grades.reduce((acc, g) => acc + g.score, 0);
  const overallAvg = grades.length > 0 ? (totalScore / grades.length).toFixed(1) : '0';
  const highestGrade = grades.length > 0 ? Math.max(...grades.map(g => g.score)) : 0;
  const lowestGrade = grades.length > 0 ? Math.min(...grades.map(g => g.score)) : 0;

  const getLetterGrade = (score: number) => {
    if (score >= 90) return { letter: 'AA', gpa: '4.0', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
    if (score >= 80) return { letter: 'BA', gpa: '3.5', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' };
    if (score >= 70) return { letter: 'BB', gpa: '3.0', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' };
    if (score >= 60) return { letter: 'CB', gpa: '2.5', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
    if (score >= 50) return { letter: 'CC', gpa: '2.0', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300' };
    return { letter: 'FF', gpa: '0.0', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold' };
  };

  const filteredGrades = grades.filter(g => {
    const matchType = selectedExamType === 'all' || g.examType === selectedExamType;
    const matchSubject = (g.subject || '').toLowerCase().includes((searchSubject || '').toLowerCase());
    return matchType && matchSubject;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" />
              Sınav & Deneme Notlarım
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Okul No: <strong>#{currentUser.schoolNumber}</strong> • Sınıf: <strong>{currentUser.classGrade}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="student-print-report-button"
              onClick={() => setIsPrintModalOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Raporu Yazdır / PDF</span>
            </button>

            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="all">Tüm Değerlendirmeler</option>
              <option value="Yazılı 1">Yazılı 1</option>
              <option value="Yazılı 2">Yazılı 2</option>
              <option value="Deneme Sınavı">Deneme Sınavları</option>
              <option value="Sözlü">Sözlü Notları</option>
            </select>
          </div>
        </div>
      </div>

      {/* GPA & Performance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Genel Not Ortalaması</span>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{overallAvg}</p>
            <span className="text-xs font-semibold text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">En Yüksek Notum</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{highestGrade}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">En Düşük Notum</span>
          <p className="text-2xl font-black text-amber-500 mt-1">{lowestGrade}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Girilen Sınav Sayısı</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{grades.length}</p>
        </div>
      </div>

      {/* Subject Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjectNames.map(subj => {
          const subGrades = subjectsMap[subj];
          const avg = (subGrades.reduce((a, b) => a + b.score, 0) / subGrades.length).toFixed(1);

          return (
            <div 
              key={subj}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{subj}</h3>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Ders Ortalaması: {avg}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                <div 
                  style={{ width: `${Math.min(100, Number(avg))}%` }} 
                  className={`h-full rounded-full transition-all duration-500 ${
                    Number(avg) >= 70 ? 'bg-emerald-500' : Number(avg) >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                ></div>
              </div>

              {/* Sub-exam pills */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {subGrades.map(g => {
                  const letter = getLetterGrade(g.score);
                  return (
                    <div key={g.id} className="flex items-center justify-between text-xs py-1">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        {g.examType}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-white">
                          {g.score}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${letter.color}`}>
                          {letter.letter}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Grades Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-white">
            Tüm Not Dökümü & Öğretmen Geri Bildirimleri
          </span>
          <span className="text-xs text-slate-500">
            {filteredGrades.length} Not Kaydı
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Ders Adı</th>
                <th className="py-3 px-4">Değerlendirme Türü</th>
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4 text-center">Puan</th>
                <th className="py-3 px-4 text-center">Harf Notu</th>
                <th className="py-3 px-4">Öğretmen Açıklaması</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredGrades.map(g => {
                const letter = getLetterGrade(g.score);
                return (
                  <tr key={g.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{g.subject}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{g.examType}</td>
                    <td className="py-3 px-4 text-slate-500">{g.examDate}</td>
                    <td className="py-3 px-4 text-center font-black text-sm text-slate-900 dark:text-white">
                      {g.score}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${letter.color}`}>
                        {letter.letter}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {g.notes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Report Modal */}
      <GradesPrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        currentUser={currentUser}
        grades={grades}
      />

    </div>
  );
};
