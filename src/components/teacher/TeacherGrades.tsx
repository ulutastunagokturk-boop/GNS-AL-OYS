import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { GradeRecord, ExamType, UserProfile, SchoolClass } from '../../types';
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
  FileSpreadsheet,
  UserPlus,
  Plus,
  X,
  GraduationCap,
  Edit3
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

const STANDARD_SUBJECTS = [
  'Matematik',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Türk Dili ve Edebiyatı',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'İngilizce',
  'Almanca',
  'Din Kültürü ve Ahlak Bilgisi',
  'Beden Eğitimi ve Spor',
  'Görsel Sanatlar',
  'Müzik',
  'Bilişim Teknolojileri',
  'Rehberlik',
  'Genel Deneme'
];

export const TeacherGrades: React.FC = () => {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>(() => dataService.getClasses());
  const [allStudents, setAllStudents] = useState<UserProfile[]>(() => dataService.getStudents());

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setClasses([...dataService.getClasses()]);
      setAllStudents([...dataService.getStudents()]);
    });
    return unsub;
  }, []);

  // Selection states
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    const cls = dataService.getClasses();
    const has9D = cls.find(c => c.name === '9-D');
    return has9D ? '9-D' : (cls[0]?.name || '');
  });
  const [selectedSubject, setSelectedSubject] = useState<string>(currentUser?.branch || 'Matematik');
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('Yazılı 1');
  const [examDate, setExamDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modal State for Individual Student Grade Entry
  const [isSingleStudentModalOpen, setIsSingleStudentModalOpen] = useState(false);
  const [modalStudent, setModalStudent] = useState<UserProfile | null>(null);
  const [modalStudentSearch, setModalStudentSearch] = useState('');
  const [modalStudentClassFilter, setModalStudentClassFilter] = useState('all');
  const [modalSubject, setModalSubject] = useState<string>(currentUser?.branch || 'Matematik');
  const [modalExamType, setModalExamType] = useState<ExamType>('Yazılı 1');
  const [modalScore, setModalScore] = useState<string>('85');
  const [modalExamDate, setModalExamDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [modalNotes, setModalNotes] = useState<string>('');

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
  const [savedAlertMessage, setSavedAlertMessage] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const studentsInClass = selectedClass ? dataService.getStudentsByClass(selectedClass) : [];

  // Load existing grades for selected class, subject, and exam type
  const refreshClassGrades = () => {
    const existingGrades = dataService.getGradesByClassAndSubject(selectedClass, selectedSubject, selectedExamType);
    const scoreMap: { [studentId: string]: number | '' } = {};
    const notesMap: { [studentId: string]: string } = {};

    existingGrades.forEach(g => {
      scoreMap[g.studentId] = g.score;
      if (g.notes) notesMap[g.studentId] = g.notes;
    });

    setScores(scoreMap);
    setNotes(notesMap);
  };

  useEffect(() => {
    refreshClassGrades();
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

  const handleOpenSingleGradeModal = (student?: UserProfile) => {
    if (student) {
      setModalStudent(student);
      setModalSubject(selectedSubject);
      setModalExamType(selectedExamType);
      setModalExamDate(examDate);
      const cur = scores[student.uid];
      setModalScore(cur !== undefined && cur !== '' ? String(cur) : '85');
      setModalNotes(notes[student.uid] || '');
    } else {
      setModalStudent(null);
      setModalSubject(selectedSubject);
      setModalExamType(selectedExamType);
      setModalExamDate(examDate);
      setModalScore('85');
      setModalNotes('');
    }
    setIsSingleStudentModalOpen(true);
  };

  const handleSaveSingleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !modalStudent) {
      alert('Lütfen bir öğrenci seçiniz.');
      return;
    }

    const numScore = Math.min(100, Math.max(0, Number(modalScore) || 0));

    const singleRecord: GradeRecord = {
      id: `grade-${modalStudent.uid}-${modalSubject}-${modalExamType}`,
      studentId: modalStudent.uid,
      studentName: modalStudent.displayName,
      studentNumber: modalStudent.schoolNumber || '',
      studentClass: modalStudent.classGrade || selectedClass,
      subject: modalSubject,
      examType: modalExamType,
      score: numScore,
      maxScore: 100,
      examDate: modalExamDate,
      teacherId: currentUser.uid,
      teacherName: currentUser.displayName,
      notes: modalNotes.trim(),
      createdAt: new Date().toISOString()
    };

    await dataService.saveGrade(singleRecord);
    refreshClassGrades();

    setSavedAlertMessage(`${modalStudent.displayName} adlı öğrenciye ${modalSubject} (${modalExamType}: ${numScore} Puan) notu başarıyla kaydedildi.`);
    setIsSavedAlert(true);
    setIsSingleStudentModalOpen(false);

    try {
      confetti({ particleCount: 40, spread: 60 });
    } catch (err) {}

    setTimeout(() => setIsSavedAlert(false), 4500);
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
    setSavedAlertMessage(`${selectedClass} sınıfı için ${selectedSubject} (${selectedExamType}) notları başarıyla kaydedildi ve öğrencilerin sistemine yansıtıldı!`);
    setIsSavedAlert(true);

    try {
      confetti({ particleCount: 40, spread: 60 });
    } catch (e) {}

    setTimeout(() => setIsSavedAlert(false), 4500);
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenSingleGradeModal()}
              className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Öğrenci Seçerek Not Ekle
            </button>
            <button
              id="save-all-grades-btn"
              onClick={handleSaveAllGrades}
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Toplu Kaydet
            </button>
          </div>
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
            {savedAlertMessage || (
              <>
                <strong>{selectedClass}</strong> sınıfı için <strong>{selectedSubject} ({selectedExamType})</strong> notları başarıyla kaydedildi ve öğrencilerin sistemine yansıtıldı!
              </>
            )}
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
                <th className="py-3.5 px-4 w-24 text-center">Hızlı İşlem</th>
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
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenSingleGradeModal(st)}
                        className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
                        title="Öğrenciye Özel Not Detayı Gir"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
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
            className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Değişiklikleri Kaydet
          </button>
        </div>
      </div>

      {/* INDIVIDUAL STUDENT GRADE ENTRY MODAL */}
      {isSingleStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Öğrenci Seçerek Not Ekle</h3>
                  <p className="text-xs text-purple-100">Bireysel yazılı, deneme, performans veya sözlü notu girişi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSingleStudentModalOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSingleGrade} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Student Picker */}
              <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 space-y-3">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  1. Öğrenciyi Seçin <span className="text-rose-500">*</span>
                </label>

                {modalStudent ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm">
                        {modalStudent.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          {modalStudent.displayName}
                          {modalStudent.schoolNumber && (
                            <span className="text-xs font-mono text-purple-600 dark:text-purple-400">
                              #{modalStudent.schoolNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          Sınıf: <strong className="text-slate-700 dark:text-slate-300">{modalStudent.classGrade || 'Belirtilmemiş'}</strong>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalStudent(null)}
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Değiştir
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Öğrenci adı, soyadı veya okul no ile ara..."
                        value={modalStudentSearch}
                        onChange={(e) => setModalStudentSearch(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <select
                        value={modalStudentClassFilter}
                        onChange={(e) => setModalStudentClassFilter(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="all">Tüm Sınıflar</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/50">
                      {allStudents
                        .filter(st => {
                          const q = modalStudentSearch.toLowerCase();
                          const matchQ = !q || st.displayName.toLowerCase().includes(q) || (st.schoolNumber && st.schoolNumber.includes(q));
                          const matchC = modalStudentClassFilter === 'all' || st.classGrade === modalStudentClassFilter;
                          return matchQ && matchC;
                        })
                        .slice(0, 15)
                        .map(st => (
                          <button
                            key={st.uid}
                            type="button"
                            onClick={() => setModalStudent(st)}
                            className="w-full text-left p-2.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center justify-between text-xs transition"
                          >
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{st.displayName}</span>
                              {st.schoolNumber && <span className="ml-1 text-slate-400">#{st.schoolNumber}</span>}
                            </div>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                              {st.classGrade || '-'}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson & Exam Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ders Adı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="modal-subjects-list"
                    value={modalSubject}
                    onChange={(e) => setModalSubject(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <datalist id="modal-subjects-list">
                    {STANDARD_SUBJECTS.map(subj => (
                      <option key={subj} value={subj} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Değerlendirme Türü <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={modalExamType}
                    onChange={(e) => setModalExamType(e.target.value as ExamType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {EXAM_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Score & Exam Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sınav / Değerlendirme Notu (0-100) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={modalScore}
                      onChange={(e) => setModalScore(e.target.value)}
                      required
                      placeholder="0-100"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    {modalScore !== '' && (
                      <div className="shrink-0 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950 font-black text-sm text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                        {getLetterGrade(Number(modalScore)).letter}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sınav Tarihi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={modalExamDate}
                    onChange={(e) => setModalExamDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Teacher Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Öğretmen Değerlendirme Notu / Geri Bildirim
                </label>
                <textarea
                  rows={2}
                  placeholder="Öğrencinin güçlü yönleri veya geliştirmesi gereken kazanımlar..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSingleStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Notu Kaydet ve Öğrenciye Bildir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
