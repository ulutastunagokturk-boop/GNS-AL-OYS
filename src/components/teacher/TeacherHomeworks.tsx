import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Homework, HomeworkSubmission, HomeworkStatus, RubricItem, Attachment } from '../../types';
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Users, 
  Trash2, 
  FileCheck, 
  Check, 
  Download, 
  X, 
  Search,
  Sparkles,
  MessageSquare,
  Paperclip,
  Award,
  FileText,
  Sliders,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const TeacherHomeworks: React.FC = () => {
  const { currentUser } = useAuth();
  const classes = dataService.getClasses();
  const homeworks = dataService.getHomeworks();

  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTrackingHomework, setActiveTrackingHomework] = useState<Homework | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(currentUser?.branch || 'Matematik');
  const [description, setDescription] = useState('');
  const [targetClass, setTargetClass] = useState('Tüm Okul');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString().split('T')[0]
  );
  const [dueTime, setDueTime] = useState('23:59');
  const [maxScore, setMaxScore] = useState(100);
  const [xpReward, setXpReward] = useState(50);
  
  // Attachments State
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [customAttachName, setCustomAttachName] = useState('');

  // Rubric State
  const [enableRubric, setEnableRubric] = useState(true);
  const [rubricItems, setRubricItems] = useState<RubricItem[]>([
    { id: 'rub-1', title: 'Doğruluk ve Matematiksel Çözüm', maxPoints: 40, description: 'Soruların doğru yöntem ve tam işlem basamakları ile çözülmesi.' },
    { id: 'rub-2', title: 'Sayfa Düzeni ve Okunabilirlik', maxPoints: 30, description: 'Temiz ve anlaşılır yazı düzeni.' },
    { id: 'rub-3', title: 'Zamanında ve Eksiksiz Teslim', maxPoints: 30, description: 'Belirlenen tarihten önce tüm soruların bitirilmesi.' }
  ]);

  // Filtered Homeworks
  const filteredHomeworks = homeworks.filter(hw => {
    if (selectedClassFilter !== 'all' && hw.targetClass !== selectedClassFilter && hw.targetClass !== 'Tüm Okul') {
      return false;
    }
    return true;
  });

  const handleAddAttachment = () => {
    if (!customAttachName.trim()) return;
    const newAtt: Attachment = {
      id: `att-${Date.now()}`,
      name: customAttachName.trim(),
      url: '#',
      size: '2.4 MB',
      type: 'pdf',
      uploadedAt: new Date().toISOString()
    };
    setAttachments([...attachments, newAtt]);
    setCustomAttachName('');
  };

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentUser) return;

    const newHw: Homework = {
      id: `hw-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim(),
      description: description.trim(),
      teacherId: currentUser.uid,
      teacherName: currentUser.displayName,
      targetClass: targetClass,
      dueDate: dueDate,
      dueTime: dueTime,
      maxScore: Number(maxScore) || 100,
      xpReward: Number(xpReward) || 50,
      attachments: attachments.length > 0 ? attachments : undefined,
      rubric: enableRubric && rubricItems.length > 0 ? rubricItems : undefined,
      createdAt: new Date().toISOString()
    };

    await dataService.addHomework(newHw);
    setShowCreateModal(false);
    setTitle('');
    setDescription('');
    setAttachments([]);
    
    try {
      confetti({ particleCount: 45, spread: 65 });
    } catch (e) {}
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bu ödevi ve tüm takip kayıtlarını silmek istediğinize emin misiniz?')) {
      await dataService.deleteHomework(id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Ödev Yönetimi & Takip Raporu
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sınıflara PDF/doküman ekli ve rubrik puanlama kriterli ödevler atayın; 1-tıkla değerlendirin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Class Filter */}
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">Tüm Sınıflar</option>
            {classes.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <button
            id="add-new-homework-btn"
            onClick={() => setShowCreateModal(true)}
            className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 transition shadow-sm shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Yeni Ödev Oluştur
          </button>
        </div>
      </div>

      {/* Homework Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredHomeworks.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Henüz ödev bulunmuyor</p>
            <p className="text-xs text-slate-400 mt-1">"Yeni Ödev Oluştur" butonuna basarak ilk ödevinizi tanımlayın.</p>
          </div>
        ) : (
          filteredHomeworks.map((hw) => {
            const submissions = dataService.getSubmissionsForHomework(hw.id);
            const total = submissions.length;
            const completedCount = submissions.filter(s => s.status === 'completed').length;
            const notCompletedCount = submissions.filter(s => s.status === 'not_completed').length;
            const excusedCount = submissions.filter(s => s.status === 'excused').length;
            const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

            const isPastDue = new Date(hw.dueDate).getTime() < new Date().setHours(0,0,0,0);

            return (
              <div 
                key={hw.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {hw.subject} • {hw.targetClass}
                    </span>

                    <button
                      onClick={() => handleDelete(hw.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition"
                      title="Ödevi Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-1.5 line-clamp-2">
                    {hw.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                    {hw.description}
                  </p>

                  {/* Attachments & Rubric Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {hw.attachments && hw.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900">
                        <Paperclip className="w-3 h-3" />
                        {hw.attachments.length} Ek Dosya
                      </span>
                    )}
                    {hw.rubric && hw.rubric.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900">
                        <Sliders className="w-3 h-3" />
                        {hw.rubric.length} Kriterli Rubrik
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      +{hw.xpReward || 50} XP
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Son Teslim: <strong className={isPastDue ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}>{hw.dueDate} {hw.dueTime && `(${hw.dueTime})`}</strong>
                    </span>
                  </div>

                  {/* Submission Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        Teslim Durumu ({completedCount}/{total})
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">%{completionRate}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div style={{ width: `${completionRate}%` }} className="bg-emerald-500 transition-all duration-500"></div>
                      <div style={{ width: `${total > 0 ? (notCompletedCount / total) * 100 : 0}%` }} className="bg-rose-500"></div>
                      <div style={{ width: `${total > 0 ? (excusedCount / total) * 100 : 0}%` }} className="bg-amber-400"></div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ {completedCount} Yapıldı</span>
                      <span className="text-rose-600 dark:text-rose-400 font-medium">✕ {notCompletedCount} Yapılmadı</span>
                      <span className="text-amber-600 dark:text-amber-400 font-medium">📄 {excusedCount} Raporlu</span>
                    </div>
                  </div>
                </div>

                {/* 1-Click Ödev Takip Raporu Button */}
                <button
                  id={`track-hw-btn-${hw.id}`}
                  onClick={() => setActiveTrackingHomework(hw)}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600 text-indigo-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-indigo-100 dark:border-slate-700 transition"
                >
                  <FileCheck className="w-4 h-4 text-indigo-500 group-hover:text-white" />
                  Ödev Takip Raporunu Aç & Değerlendir
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE HOMEWORK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div 
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Kapsamlı Ödev & Rubrik Oluşturucu
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHomework} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ödev Başlığı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Örn: 2. Dereceden Denklemler & Parabol Çözüm Föyü"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ders Adı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Matematik"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hedef Sınıf / Şube <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Tüm Okul">Tüm Okul</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Son Teslim Tarihi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Saat Sınırı
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Başarı XP Ödülü
                  </label>
                  <input
                    type="number"
                    value={xpReward}
                    onChange={(e) => setXpReward(Number(e.target.value))}
                    min={10}
                    max={200}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ödev Açıklaması ve Yönergeler
                </label>
                <textarea
                  rows={2}
                  placeholder="Kitaptaki sayfa aralığı, soru numaraları veya inceleme detayları..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* FILE ATTACHMENTS SECTION */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                  Ödev Ek Dosyaları (PDF / DOC)
                </label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Dosya Adı (Örn: Parabol_Test_Sorulari.pdf)"
                    value={customAttachName}
                    onChange={(e) => setCustomAttachName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-indigo-600 hover:text-white transition"
                  >
                    Dosya Ekle
                  </button>
                </div>

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attachments.map((att, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        <FileText className="w-3 h-3 text-indigo-500" />
                        {att.name} ({att.size})
                        <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="hover:text-rose-500 ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* GRADING RUBRIC SECTION */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    Değerlendirme Rubrik Kriterleri (Opsiyonel)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableRubric}
                      onChange={(e) => setEnableRubric(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Rubrik Kullan
                  </label>
                </div>

                {enableRubric && (
                  <div className="space-y-2">
                    {rubricItems.map((item, idx) => (
                      <div key={item.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                          <p className="text-[10px] text-slate-400">{item.description}</p>
                        </div>
                        <span className="font-black text-indigo-600 dark:text-indigo-400 px-2 py-1 bg-indigo-50 dark:bg-indigo-950 rounded-lg shrink-0">
                          {item.maxPoints} Puan
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition"
                >
                  Ödevi Yayınla & Bildirim Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HOMEWORK TRACKING REPORT MODAL (ÖDEV TAKİP RAPORU & RUBRİK DEĞERLENDİRME) */}
      {activeTrackingHomework && (
        <HomeworkTrackingReportModal 
          homework={activeTrackingHomework} 
          onClose={() => setActiveTrackingHomework(null)} 
        />
      )}

    </div>
  );
};

// SUB-COMPONENT: ÖDEV TAKİP RAPORU & 1-CLICK STATUS & RUBRIC EVALUATION
const HomeworkTrackingReportModal: React.FC<{
  homework: Homework;
  onClose: () => void;
}> = ({ homework, onClose }) => {
  const { currentUser } = useAuth();
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>(() => 
    dataService.getSubmissionsForHomework(homework.id)
  );
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Detailed Rubric Scoring Modal for an individual student
  const [evaluatingStudent, setEvaluatingStudent] = useState<HomeworkSubmission | null>(null);
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [teacherFeedbackText, setTeacherFeedbackText] = useState('');

  const reloadSubmissions = () => {
    setSubmissions([...dataService.getSubmissionsForHomework(homework.id)]);
  };

  const handleUpdateStatus = async (
    studentId: string, 
    newStatus: HomeworkStatus, 
    score?: number
  ) => {
    await dataService.updateSubmissionStatus(
      homework.id, 
      studentId, 
      newStatus, 
      score, 
      undefined, 
      undefined, 
      currentUser?.displayName || 'Öğretmen'
    );
    reloadSubmissions();
  };

  const handleSetAllCompleted = async () => {
    for (const sub of submissions) {
      await dataService.updateSubmissionStatus(
        homework.id, 
        sub.studentId, 
        'completed', 
        100, 
        'Harika çalışma!', 
        undefined, 
        currentUser?.displayName || 'Öğretmen'
      );
    }
    reloadSubmissions();
    try {
      confetti({ particleCount: 50, spread: 70 });
    } catch (e) {}
  };

  const handleOpenRubricEvaluation = (sub: HomeworkSubmission) => {
    setEvaluatingStudent(sub);
    setTeacherFeedbackText(sub.teacherFeedback || '');
    
    // Initial rubric scores
    const initial: Record<string, number> = {};
    if (homework.rubric) {
      homework.rubric.forEach(r => {
        initial[r.id] = sub.rubricScores?.[r.id] !== undefined ? sub.rubricScores[r.id] : r.maxPoints;
      });
    }
    setRubricScores(initial);
  };

  const handleSaveRubricEvaluation = async () => {
    if (!evaluatingStudent) return;
    
    // Calculate total score from rubrics
    let calculatedTotal = 0;
    Object.values(rubricScores).forEach(pts => {
      calculatedTotal += Number(pts) || 0;
    });

    await dataService.updateSubmissionStatus(
      homework.id,
      evaluatingStudent.studentId,
      'completed',
      calculatedTotal,
      teacherFeedbackText.trim() || undefined,
      rubricScores,
      currentUser?.displayName || 'Öğretmen'
    );

    setEvaluatingStudent(null);
    reloadSubmissions();
  };

  const filtered = submissions.filter(s => {
    const matchSearch = s.studentName.toLowerCase().includes(searchFilter.toLowerCase()) || 
                        s.studentNumber.includes(searchFilter);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const completedCount = submissions.filter(s => s.status === 'completed').length;
  const notCompletedCount = submissions.filter(s => s.status === 'not_completed').length;
  const excusedCount = submissions.filter(s => s.status === 'excused').length;
  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                {homework.targetClass}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {homework.title}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {homework.subject} • Son Teslim: {homework.dueDate} {homework.dueTime && `(${homework.dueTime})`} • Tek tıkla ödev durumlarını güncelleyin.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats & Filters Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          
          {/* Quick Status Badges */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
              Toplam: {submissions.length} Öğrenci
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 font-semibold text-emerald-700 dark:text-emerald-300">
              ✓ {completedCount} Yapıldı
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 font-semibold text-rose-700 dark:text-rose-300">
              ✕ {notCompletedCount} Yapılmadı
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 font-semibold text-amber-700 dark:text-amber-300">
              📄 {excusedCount} Raporlu
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-400">
              ⏳ {pendingCount} Bekliyor
            </span>
          </div>

          {/* Bulk Action & Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Öğrenci veya No ara..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <button
              onClick={handleSetAllCompleted}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shrink-0 flex items-center gap-1 shadow-xs"
              title="Tüm sınıfı 'Yapıldı (100 Puan)' olarak işaretler"
            >
              <Check className="w-3.5 h-3.5" />
              Tümünü Yapıldı Say
            </button>
          </div>

        </div>

        {/* Student Roster Table with 1-Click Toggle Buttons */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-20">Okul No</th>
                  <th className="py-3 px-4">Öğrenci Adı Soyadı</th>
                  <th className="py-3 px-4">Mevcut Durum</th>
                  <th className="py-3 px-4 text-center">Tek Tıkla Durum Güncelle</th>
                  <th className="py-3 px-4 text-center">Detaylı Değerlendirme</th>
                  <th className="py-3 px-4 w-20 text-right">Puan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map((sub) => (
                  <tr key={sub.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                      #{sub.studentNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {sub.studentName}
                      {sub.teacherFeedback && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5 font-normal">
                          <MessageSquare className="w-3 h-3 text-indigo-400" />
                          Geri Bildirim: {sub.teacherFeedback}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {sub.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Yapıldı
                        </span>
                      )}
                      {sub.status === 'not_completed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                          <XCircle className="w-3 h-3 text-rose-600" /> Yapılmadı
                        </span>
                      )}
                      {sub.status === 'excused' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                          <AlertCircle className="w-3 h-3 text-amber-600" /> Raporlu / İzinli
                        </span>
                      )}
                      {sub.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          <Clock className="w-3 h-3" /> Bekliyor
                        </span>
                      )}
                    </td>

                    {/* 1-Click Action Buttons */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleUpdateStatus(sub.studentId, 'completed', sub.score || 100)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                            sub.status === 'completed'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          Yapıldı
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(sub.studentId, 'not_completed', 0)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                            sub.status === 'not_completed'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50'
                          }`}
                        >
                          <X className="w-3 h-3" />
                          Yapılmadı
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(sub.studentId, 'excused')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                            sub.status === 'excused'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/50'
                          }`}
                        >
                          Raporlu
                        </button>
                      </div>
                    </td>

                    {/* Rubric Evaluator Modal trigger */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenRubricEvaluation(sub)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1 mx-auto"
                      >
                        <Sliders className="w-3 h-3" />
                        Rubrik Notla
                      </button>
                    </td>

                    {/* Score display */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {sub.score !== undefined ? `${sub.score} / ${homework.maxScore}` : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ödev durumu güncellendiğinde öğrenci paneline anlık canlı bildirim gönderilir ve XP işlenir.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition"
          >
            Raporu Kapat
          </button>
        </div>

      </div>

      {/* INDIVIDUAL RUBRIC EVALUATION POPUP MODAL */}
      {evaluatingStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in zoom-in-95">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Rubrik Değerlendirme: {evaluatingStudent.studentName}
                </h4>
                <p className="text-xs text-slate-500">#{evaluatingStudent.studentNumber} • {homework.title}</p>
              </div>
              <button onClick={() => setEvaluatingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rubric Criteria List with point sliders/selectors */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {(homework.rubric || [
                { id: 'def-1', title: 'Genel Başarı ve Doğruluk', maxPoints: 50, description: 'Ödevin gereksinimlerini karşılama düzeyi.' },
                { id: 'def-2', title: 'Zamanlama & Özen', maxPoints: 50, description: 'Zamanında teslim ve düzen.' }
              ]).map(r => {
                const currentScore = rubricScores[r.id] !== undefined ? rubricScores[r.id] : r.maxPoints;

                return (
                  <div key={r.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{r.title}</span>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{currentScore} / {r.maxPoints} P</span>
                    </div>
                    {r.description && <p className="text-[10px] text-slate-400 mb-2">{r.description}</p>}
                    
                    <input
                      type="range"
                      min={0}
                      max={r.maxPoints}
                      value={currentScore}
                      onChange={(e) => setRubricScores({ ...rubricScores, [r.id]: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                );
              })}
            </div>

            {/* Teacher Feedback textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Öğrenciye Özel Öğretmen Notu & Geri Bildirim
              </label>
              <textarea
                rows={2}
                value={teacherFeedbackText}
                onChange={(e) => setTeacherFeedbackText(e.target.value)}
                placeholder="Örn: Parabol tepe noktası formülü doğru uygulanmış, işlem sırası başarılı."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEvaluatingStudent(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSaveRubricEvaluation}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
              >
                Notu Kaydet & Bildir
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
