import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { homeworkService } from '../../services/homeworkService';
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
  Zap,
  Video,
  Image as ImageIcon,
  Play,
  Eye,
  UploadCloud,
  Film
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const StudentHomeworks: React.FC = () => {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [submittingHw, setSubmittingHw] = useState<Homework | null>(null);
  const [studentNote, setStudentNote] = useState('');
  const [studentAttachments, setStudentAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeMediaPreview, setActiveMediaPreview] = useState<Attachment | null>(null);

  const [homeworks, setHomeworks] = useState<Homework[]>(() => 
    currentUser ? homeworkService.getHomeworksForStudent(currentUser.classGrade, currentUser.uid) : []
  );
  const [studentSubmissions, setStudentSubmissions] = useState<HomeworkSubmission[]>(() => 
    currentUser ? homeworkService.getSubmissionsForStudent(currentUser.uid) : []
  );

  React.useEffect(() => {
    if (!currentUser) return;
    const update = () => {
      setHomeworks([...homeworkService.getHomeworksForStudent(currentUser.classGrade, currentUser.uid)]);
      setStudentSubmissions([...homeworkService.getSubmissionsForStudent(currentUser.uid)]);
    };
    update();
    // Buluttan en güncel ödevleri ve durumları anında çek
    homeworkService.syncHomeworksFromCloud().then(update);
    const unsub = homeworkService.subscribe(update);
    return unsub;
  }, [currentUser?.classGrade, currentUser?.uid]);

  if (!currentUser) return null;

  const getSubmissionForHomework = (hwId: string): HomeworkSubmission | undefined => {
    return studentSubmissions.find(s => s.homeworkId === hwId);
  };

  const handleOpenSubmitModal = (hw: Homework) => {
    const existing = getSubmissionForHomework(hw.id);
    setSubmittingHw(hw);
    setSubmitError(null);
    setStudentNote(existing?.submissionNote || '');
    setStudentAttachments(existing?.attachments || []);
  };

  const uploadSingleFileToDatabase = async (file: File): Promise<Attachment | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = reader.result as string;
          const res = await fetch('/api/uploads/homework-submission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              homeworkId: submittingHw?.id,
              studentId: currentUser?.uid,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              fileData
            })
          });
          const data = await res.json();
          if (res.ok && data.success && data.attachment) {
            resolve(data.attachment);
            return;
          }
        } catch (err) {
          console.warn('[Direct File Upload warn]:', err);
        }

        // Direct fallback attachment if network error
        const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name);
        const isImg = file.type.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(file.name);
        const isPdf = file.type.includes('pdf') || /\.pdf$/i.test(file.name);
        const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(file.name);
        const detectedType: Attachment['type'] = isVid ? 'video' : isImg ? 'image' : isPdf ? 'pdf' : isAudio ? 'audio' : 'doc';

        const fallbackAtt: Attachment = {
          id: `att-st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          url: reader.result as string,
          size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
          type: detectedType,
          uploadedAt: new Date().toISOString()
        };
        resolve(fallbackAtt);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleStudentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setSubmitError(null);

    try {
      const fileList = Array.from(files);
      for (const file of fileList) {
        if (file.size > 80 * 1024 * 1024) {
          setSubmitError(`"${file.name}" dosyası çok büyük (maksimum 80MB video/dosya yüklenebilir).`);
          continue;
        }

        const uploadedAtt = await uploadSingleFileToDatabase(file);
        if (uploadedAtt) {
          setStudentAttachments(prev => [...prev, uploadedAtt]);
        }
      }
    } catch (err: any) {
      setSubmitError('Dosya yüklenirken bir hata oluştu: ' + (err?.message || err));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setStudentAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingHw) return;
    if (!currentUser?.uid) {
      setSubmitError('Kullanıcı oturumu doğrulanamadı. Lütfen oturumu yenileyin.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await homeworkService.submitHomework(submittingHw.id, currentUser.uid, {
        studentNote,
        attachments: studentAttachments,
        studentName: currentUser.displayName,
        schoolNumber: currentUser.schoolNumber,
        classGrade: currentUser.classGrade
      });

      setSubmittingHw(null);
      setStudentNote('');
      setStudentAttachments([]);
      setStudentSubmissions([...homeworkService.getSubmissionsForStudent(currentUser.uid)]);

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch (e) {}
    } catch (err: any) {
      console.error('Ödev teslim edilirken hata:', err);
      setSubmitError(err?.message || 'Ödev teslimi sırasında bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setIsSubmitting(false);
    }
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
            Ödevlerim ({currentUser.classGrade ? `${currentUser.classGrade} Şubesi` : 'Genel'})
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
                            href={att.url && att.url !== '#' ? att.url : undefined}
                            download={att.name}
                            onClick={(e) => {
                              if (att.url && att.url !== '#') return;
                              e.preventDefault();
                              const blob = new Blob([`GNSİAL Ödev Eki: ${att.name}`], { type: 'text/plain;charset=utf-8' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = att.name;
                              link.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-300 hover:underline font-semibold cursor-pointer"
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

                  {sub?.submissionNote && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-xs">
                      <strong className="block text-[11px] text-slate-500 mb-0.5">Sizin Teslim Notunuz:</strong>
                      {sub.submissionNote}
                    </div>
                  )}

                  {sub?.attachments && sub.attachments.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {sub.attachments.map((att, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                          <Paperclip className="w-3 h-3 text-emerald-500" />
                          {att.name}
                        </span>
                      ))}
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
                        onClick={() => handleOpenSubmitModal(hw)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                      >
                        Teslimi Güncelle
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenSubmitModal(hw)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 transition cursor-pointer"
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

              {/* Student File Upload (Video, Image, Audio, Document) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ödev Çözüm Dosyası (Video, Fotoğraf, Belge)
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Doğrudan Veritabanına Kaydedilir
                  </span>
                </div>

                {/* Uploaded attachments list */}
                {studentAttachments.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {studentAttachments.map(att => {
                      const isVid = att.type === 'video' || /\.(mp4|webm|mov|avi|mkv)$/i.test(att.name);
                      const isImg = att.type === 'image' || /\.(png|jpg|jpeg|webp|gif)$/i.test(att.name);

                      return (
                        <div 
                          key={att.id} 
                          className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isVid ? (
                              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                                <Video className="w-4 h-4" />
                              </div>
                            ) : isImg ? (
                              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0 overflow-hidden">
                                {att.url && att.url !== '#' ? (
                                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-4 h-4" />
                                )}
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}

                            <div className="truncate">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                {att.name}
                              </p>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <span>{att.size || 'Belirtilmedi'}</span>
                                <span>•</span>
                                <span className="text-emerald-600 font-semibold">
                                  {isVid ? '🎬 Video' : isImg ? '📷 Görsel' : '📄 Doküman'}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {att.url && att.url !== '#' && (
                              <button
                                type="button"
                                onClick={() => setActiveMediaPreview(att)}
                                className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                {isVid ? <Play className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {isVid ? 'İzle' : 'Önizle'}
                              </button>
                            )}

                            <button 
                              type="button" 
                              onClick={() => handleRemoveAttachment(att.id)} 
                              className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                              title="Sil"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Upload action triggers */}
                <div className="space-y-2">
                  <label className={`w-full py-3 px-4 rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                    isUploading 
                      ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600' 
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}>
                    {isUploading ? (
                      <div className="flex items-center gap-2 py-1">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          Dosya Veritabanına Yükleniyor...
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                          <UploadCloud className="w-4 h-4 text-emerald-500" />
                          <span>Video, Görsel veya Belge Seç</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          MP4, WebM, MOV, JPG, PNG, PDF (Maks. 80MB) • Veritabanında saklanır
                        </p>
                      </>
                    )}
                    <input
                      type="file"
                      multiple
                      accept="video/*,image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                      onChange={handleStudentFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <span className="font-bold text-rose-500">Hata:</span>
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubmittingHw(null)}
                  disabled={isSubmitting || isUploading}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Veritabanına Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Teslimi Onayla & Puanı Al</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA PREVIEW LIGHTBOX MODAL */}
      {activeMediaPreview && (
        <div 
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setActiveMediaPreview(null)}
        >
          <div 
            className="w-full max-w-3xl bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 text-white">
              <div className="flex items-center gap-2 truncate">
                {activeMediaPreview.type === 'video' ? (
                  <Video className="w-4 h-4 text-purple-400 shrink-0" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                )}
                <span className="font-bold text-sm truncate">{activeMediaPreview.name}</span>
                <span className="text-xs text-slate-400">({activeMediaPreview.size})</span>
              </div>
              <div className="flex items-center gap-2">
                {activeMediaPreview.url && (
                  <a
                    href={activeMediaPreview.url}
                    download={activeMediaPreview.name}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="İndir"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
                <button 
                  onClick={() => setActiveMediaPreview(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-center bg-black/95 min-h-[300px] max-h-[75vh] overflow-auto">
              {activeMediaPreview.type === 'video' || /\.(mp4|webm|mov|avi|mkv)$/i.test(activeMediaPreview.name) ? (
                <video 
                  src={activeMediaPreview.url} 
                  controls 
                  autoPlay 
                  playsInline
                  className="w-full max-h-[65vh] rounded-xl object-contain bg-black"
                >
                  Tarayıcınız video oynatmayı desteklemiyor.
                </video>
              ) : activeMediaPreview.type === 'image' || /\.(png|jpg|jpeg|webp|gif)$/i.test(activeMediaPreview.name) ? (
                <img 
                  src={activeMediaPreview.url} 
                  alt={activeMediaPreview.name} 
                  className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg"
                />
              ) : (
                <div className="text-center p-8 text-white space-y-3">
                  <FileText className="w-16 h-16 mx-auto text-emerald-400" />
                  <p className="font-bold text-base">{activeMediaPreview.name}</p>
                  <a
                    href={activeMediaPreview.url}
                    download={activeMediaPreview.name}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    <Download className="w-4 h-4" /> Dosyayı İndir
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
