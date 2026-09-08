import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Homework, HomeworkSubmission, Attachment } from '../../types';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  Check, 
  Send, 
  AlertCircle,
  FileCheck,
  X,
  MessageSquare,
  Paperclip,
  Download,
  Sliders,
  Sparkles,
  FileText,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const StudentHomeworks: React.FC = () => {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [submittingHw, setSubmittingHw] = useState<Homework | null>(null);
  const [studentNote, setStudentNote] = useState('');
  const [studentAttachmentName, setStudentAttachmentName] = useState<string | null>(null);

  if (!currentUser) return null;

  const homeworks = dataService.getHomeworksForStudent(currentUser.classGrade);
  const studentSubmissions = dataService.getSubmissionsForStudent(currentUser.uid);

  const getSubmissionForHomework = (hwId: string): HomeworkSubmission | undefined => {
    return studentSubmissions.find(s => s.homeworkId === hwId);
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingHw) return;

    const attachments: Attachment[] | undefined = studentAttachmentName ? [{
      id: `att-st-${Date.now()}`,
      name: studentAttachmentName,
      url: '#',
      size: '3.1 MB',
      type: 'pdf',
      uploadedAt: new Date().toISOString()
    }] : undefined;

    await dataService.submitHomework(submittingHw.id, currentUser.uid, studentNote, attachments);
    setSubmittingHw(null);
    setStudentNote('');
    setStudentAttachmentName(null);

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (e) {}
  };

  const filtered = homeworks.filter(hw => {
    const sub = getSubmissionForHomework(hw.id);
    const isDone = sub?.status === 'completed';
    if (filter === 'pending') return !isDone;
    if (filter === 'completed') return isDone;
    return true;
  });

  return (
    <div className="space-y-6">

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            Ödevlerim ({currentUser.classGrade} Şubesi)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ders ödevlerini inceleyin, ek dokümanları indirin, çözümlerinizi teslim edin ve rubrik puanlarınızı görün.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'all' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Hepsi ({homeworks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'pending' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Bekleyenler
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'completed' 
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Tamamlananlar
          </button>
        </div>
      </div>

      {/* Homework Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Harika! Bekleyen ödeviniz yok.</p>
            <p className="text-xs text-slate-400 mt-1">Tüm ödevlerinizi başarıyla tamamladınız.</p>
          </div>
        ) : (
          filtered.map(hw => {
            const sub = getSubmissionForHomework(hw.id);
            const status = sub?.status || 'pending';
            const isCompleted = status === 'completed';
            const isExcused = status === 'excused';
            const isNotCompleted = status === 'not_completed';

            const daysLeft = Math.ceil(
              (new Date(hw.dueDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={hw.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border p-5 shadow-xs flex flex-col justify-between transition ${
                  isCompleted 
                    ? 'border-emerald-200 dark:border-emerald-900/60' 
                    : isNotCompleted 
                    ? 'border-rose-200 dark:border-rose-900/60' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {hw.subject}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        <Zap className="w-3 h-3 fill-amber-400" />
                        +{hw.xpReward || 50} XP
                      </span>
                    </div>

                    {/* Status badge */}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Yapıldı
                        {sub?.score !== undefined && ` (${sub.score} / ${hw.maxScore})`}
                      </span>
                    )}
                    {isNotCompleted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        <XCircle className="w-3.5 h-3.5" /> Yapılmadı
                      </span>
                    )}
                    {isExcused && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <AlertCircle className="w-3.5 h-3.5" /> Raporlu / İzinli
                      </span>
                    )}
                    {status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> Bekliyor
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    {hw.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    {hw.description}
                  </p>

                  {/* Teacher Attachments */}
                  {hw.attachments && hw.attachments.length > 0 && (
                    <div className="mb-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-indigo-500" />
                        Öğretmen Ek Dosyaları:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {hw.attachments.map((att, i) => (
                          <a
                            key={i}
                            href="#"
                            onClick={(e) => { e.preventDefault(); alert(`"${att.name}" dosya indirme simülasyonu başlatıldı.`); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-300 hover:underline font-semibold"
                          >
                            <FileText className="w-3 h-3" />
                            {att.name} ({att.size})
                            <Download className="w-3 h-3 ml-0.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rubric Criteria display */}
                  {hw.rubric && hw.rubric.length > 0 && (
                    <div className="mb-3 p-3 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                      <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1 mb-1.5">
                        <Sliders className="w-3 h-3 text-indigo-600" />
                        Değerlendirme Rubrik Kriterleri:
                      </span>
                      <div className="space-y-1">
                        {hw.rubric.map(r => (
                          <div key={r.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-700 dark:text-slate-300">{r.criterion || r.title}</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {sub?.rubricScores?.[r.id] !== undefined ? `${sub.rubricScores[r.id]} / ${r.maxPoints} P` : `${r.maxPoints} P`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 py-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Son Teslim: <strong className={daysLeft < 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}>{hw.dueDate} {hw.dueTime && `(${hw.dueTime})`}</strong>
                    </span>
                    <span>
                      Öğretmen: <strong>{hw.teacherName}</strong>
                    </span>
                  </div>

                  {sub?.teacherFeedback && (
                    <div className="mt-3 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-xs">
                      <strong className="block mb-0.5 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" /> Öğretmen Geri Bildirimi:
                      </strong>
                      {sub.teacherFeedback}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {isCompleted ? (
                    <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Check className="w-4 h-4" /> Teslim edildi ({sub?.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Tamamlandı'})
                      </span>
                      <button
                        onClick={() => setSubmittingHw(hw)}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Teslimi Güncelle
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSubmittingHw(hw)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 transition"
                    >
                      <Check className="w-4 h-4" />
                      Ödevi Tamamladım / Teslim Et (+{hw.xpReward || 50} XP)
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SUBMISSION MODAL */}
      {submittingHw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-500" />
                Ödev Teslim Formu
              </h3>
              <button onClick={() => setSubmittingHw(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStudentSubmit} className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{submittingHw.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{submittingHw.subject} • {submittingHw.teacherName}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Öğrenci Notu / Teslim Açıklaması
                </label>
                <textarea
                  rows={3}
                  placeholder="Ödevi deftere tamamladım, soruların hepsini çözdüm..."
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Student File Upload Simulation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Çözüm / Doküman Ekle (Opsiyonel)
                </label>
                {studentAttachmentName ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                      {studentAttachmentName}
                    </span>
                    <button type="button" onClick={() => setStudentAttachmentName(null)} className="hover:text-rose-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStudentAttachmentName('Matematik_Odev_Cozumu_Fotograf.pdf')}
                    className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Paperclip className="w-4 h-4 text-emerald-500" />
                    PDF veya Fotoğraf Yükle (Simüle Et)
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubmittingHw(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Teslimi Onayla & Puanı Al
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
