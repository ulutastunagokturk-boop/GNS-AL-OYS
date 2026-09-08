import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { GradeRecord, ExamType } from '../../types';
import { 
  Award, 
  Save, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  Filter, 
  Sparkles,
  BarChart2,
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';

const EXAM_TYPES: ExamType[] = [
  'Yazılı 1',
  'Yazılı 2',
  'Sözlü',
  'Deneme Sınavı',
  'Proje Ödevi',
  'Performans'
];

export const TeacherGrades: React.FC = () => {
  const { currentUser } = useAuth();
  const classes = dataService.getClasses();

  // Selection states
  const [selectedClass, setSelectedClass] = useState<string>(classes[0]?.name || '');
  const [selectedSubject, setSelectedSubject] = useState<string>(currentUser?.branch || 'Matematik');
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('Yazılı 1');
  const [examDate, setExamDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Sync selectedClass if classes change
  useEffect(() => {
    if ((!selectedClass || !classes.some(c => c.name === selectedClass)) && classes.length > 0) {
      setSelectedClass(classes[0].name);
    }
  }, [classes, selectedClass]);

  // Local state of scores keyed by studentId
  const [scores, setScores] = useState<{ [studentId: string]: number | '' }>({});
  const [notes, setNotes] = useState<{ [studentId: string]: string }>({});
  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const studentsInClass = selectedClass ? dataService.getStudentsByClass(selectedClass) : [];

  // Load existing grades for selected class, subject, and exam type
  useEffect(() => {
    const existingGrades = dataService.getGradesByClassAndSubject(selectedClass, selectedSubject, selectedExamType);
    const scoreMap: { [studentId: string]: number | '' } = {};
    const notesMap: { [studentId: string]: string } = {};

    existingGrades.forEach(g => {
      scoreMap[g.studentId] = g.score;
      if (g.notes) notesMap[g.studentId] = g.notes;
    });

    setScores(scoreMap);
    setNotes(notesMap);
    setIsSavedAlert(false);
  }, [selectedClass, selectedSubject, selectedExamType]);

  const handleScoreChange = (studentId: string, val: string) => {
    if (val === '') {
      setScores(prev => ({ ...prev, [studentId]: '' }));
      return;
    }
    const num = Math.min(100, Math.max(0, Number(val)));
    setScores(prev => ({ ...prev, [studentId]: num }));
  };

  const handleSaveAllGrades = async () => {
    if (!currentUser) return;

    const gradesToSave: GradeRecord[] = [];

    studentsInClass.forEach(st => {
      const scoreVal = scores[st.uid];
      if (scoreVal !== undefined && scoreVal !== '') {
        gradesToSave.push({
          id: `grade-${st.uid}-${selectedSubject}-${selectedExamType}`,
          studentId: st.uid,
          studentName: st.displayName,
          studentNumber: st.schoolNumber || '',
          studentClass: selectedClass,
          subject: selectedSubject,
          examType: selectedExamType,
          score: Number(scoreVal),
          maxScore: 100,
          examDate: examDate,
          teacherId: currentUser.uid,
          teacherName: currentUser.displayName,
          notes: notes[st.uid] || '',
          createdAt: new Date().toISOString()
        });
      }
    });

    await dataService.saveBatchGrades(gradesToSave);
    setIsSavedAlert(true);

    try {
      confetti({ particleCount: 40, spread: 60 });
    } catch (e) {}

    setTimeout(() => setIsSavedAlert(false), 4000);
  };

  // Quick statistics calculation
  const enteredScores = Object.values(scores).filter(s => s !== '' && typeof s === 'number') as number[];
  const classAvg = enteredScores.length > 0
    ? (enteredScores.reduce((a, b) => a + b, 0) / enteredScores.length).toFixed(1)
    : '-';
  const highestScore = enteredScores.length > 0 ? Math.max(...enteredScores) : '-';
  const lowestScore = enteredScores.length > 0 ? Math.min(...enteredScores) : '-';
  const passingCount = enteredScores.filter(s => s >= 50).length;
  const passRate = enteredScores.length > 0 ? Math.round((passingCount / enteredScores.length) * 100) : 0;

  const getLetterGrade = (score: number) => {
    if (score >= 90) return { letter: 'AA', color: 'text-emerald-600 dark:text-emerald-400' };
    if (score >= 80) return { letter: 'BA', color: 'text-emerald-500' };
    if (score >= 70) return { letter: 'BB', color: 'text-blue-500' };
    if (score >= 60) return { letter: 'CB', color: 'text-amber-500' };
    if (score >= 50) return { letter: 'CC', color: 'text-amber-600' };
    return { letter: 'FF', color: 'text-rose-500 font-bold' };
  };

  const filteredStudents = studentsInClass.filter(st => 
    st.displayName.toLowerCase().includes(searchFilter.toLowerCase()) || 
    (st.schoolNumber && st.schoolNumber.includes(searchFilter))
  );

  return (
    <div className="space-y-6">

      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" />
              Sınav & Deneme Notu Giriş Paneli
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sınıf bazlı yazılı, deneme ve sözlü notlarını toplu olarak işleyin ve başarı istatistiklerini izleyin.
            </p>
          </div>

          <button
            id="save-all-grades-btn"
            onClick={handleSaveAllGrades}
            className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition"
          >
            <Save className="w-4 h-4" />
            Notları Kaydet & Yayınla
          </button>
        </div>

        {/* Filter & Selector Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Sınıf Seçimi
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              {classes.length === 0 ? (
                <option value="">Tanımlı sınıf bulunmuyor</option>
              ) : (
                classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.branch || 'Genel'})</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Ders Adı
            </label>
            <input
              type="text"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Sınav / Değerlendirme Türü
            </label>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value as ExamType)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              {EXAM_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Sınav Tarihi
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Success Alert Banner */}
      {isSavedAlert && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            <strong>{selectedClass}</strong> sınıfı için <strong>{selectedSubject} ({selectedExamType})</strong> notları başarıyla kaydedildi ve öğrencilerin sistemine yansıtıldı!
          </span>
        </div>
      )}

      {/* Class Performance Metrics Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Sınıf Ortalaması</span>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{classAvg}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">En Yüksek Not</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{highestScore}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">En Düşük Not</span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{lowestScore}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Başarı Oranı</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">%{passRate}</p>
        </div>
      </div>

      {/* Grade Entry Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              {selectedClass} Öğrenci Listesi ({studentsInClass.length} Öğrenci)
            </span>
          </div>

          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Öğrenci ara..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-24">Okul No</th>
                <th className="py-3.5 px-4">Öğrenci Adı Soyadı</th>
                <th className="py-3.5 px-4 w-32 text-center">Sınav Notu (0-100)</th>
                <th className="py-3.5 px-4 w-24 text-center">Harf Notu</th>
                <th className="py-3.5 px-4">Öğretmen Açıklaması / Kazanım Notu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredStudents.map((st) => {
                const curScore = scores[st.uid];
                const hasScore = curScore !== undefined && curScore !== '';
                const letterObj = hasScore ? getLetterGrade(Number(curScore)) : null;

                return (
                  <tr key={st.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                      #{st.schoolNumber || '-'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {st.displayName}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0-100"
                        value={curScore !== undefined ? curScore : ''}
                        onChange={(e) => handleScoreChange(st.uid, e.target.value)}
                        className="w-24 px-3 py-1.5 text-center font-bold text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {letterObj ? (
                        <span className={`px-2 py-0.5 rounded-md text-xs ${letterObj.color}`}>
                          {letterObj.letter}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Kazanım eksikliği veya başarı notu ekle..."
                        value={notes[st.uid] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev, [st.uid]: e.target.value }))}
                        className="w-full px-3 py-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Toplam {filteredStudents.length} öğrenci listeleniyor
          </span>
          <button
            onClick={handleSaveAllGrades}
            className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Save className="w-3.5 h-3.5" />
            Değişiklikleri Kaydet
          </button>
        </div>
      </div>

    </div>
  );
};
