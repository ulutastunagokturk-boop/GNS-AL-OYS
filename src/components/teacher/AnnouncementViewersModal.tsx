import React, { useState } from 'react';
import { Announcement, AnnouncementViewer, UserProfile } from '../../types';
import { dataService } from '../../services/dataService';
import { 
  X, 
  Eye, 
  Users, 
  CheckCircle2, 
  Clock, 
  Search, 
  UserCheck, 
  UserX, 
  AlertCircle,
  GraduationCap,
  Calendar,
  School,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';

interface AnnouncementViewersModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: Announcement | null;
}

export const AnnouncementViewersModal: React.FC<AnnouncementViewersModalProps> = ({
  isOpen,
  onClose,
  announcement
}) => {
  const [activeTab, setActiveTab] = useState<'viewed' | 'not_viewed'>('viewed');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'name' | 'class'>('time');

  if (!isOpen || !announcement) return null;

  // Determine target student list if class-targeted or all students
  const allStudents = dataService.getStudents();
  
  let targetCohort: UserProfile[] = [];
  if (announcement.targetAudience === 'all' || announcement.targetAudience === 'students') {
    targetCohort = allStudents;
  } else if (announcement.targetAudience === 'class') {
    if (announcement.targetClasses && announcement.targetClasses.length > 0) {
      targetCohort = allStudents.filter(s => s.classGrade && announcement.targetClasses?.includes(s.classGrade));
    } else if (announcement.targetClass) {
      targetCohort = allStudents.filter(s => s.classGrade === announcement.targetClass);
    }
  }

  // Viewed students from announcement
  const viewers: AnnouncementViewer[] = announcement.viewedByStudents || [];
  const viewedIds = new Set(viewers.map(v => v.studentId));

  // Students who haven't viewed yet (only meaningful if cohort is identifiable)
  const notViewedStudents = targetCohort.filter(s => !viewedIds.has(s.uid));

  // Filter viewed students
  const filteredViewers = viewers.filter(v => 
    v.studentName.toLowerCase().includes(search.toLowerCase()) ||
    (v.schoolNumber && v.schoolNumber.includes(search)) ||
    (v.classGrade && v.classGrade.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => {
    if (sortBy === 'time') {
      return new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime();
    }
    if (sortBy === 'name') {
      return a.studentName.localeCompare(b.studentName, 'tr');
    }
    if (sortBy === 'class') {
      return (a.classGrade || '').localeCompare(b.classGrade || '', 'tr');
    }
    return 0;
  });

  // Filter not viewed students
  const filteredNotViewed = notViewedStudents.filter(s =>
    s.displayName.toLowerCase().includes(search.toLowerCase()) ||
    (s.schoolNumber && s.schoolNumber.includes(search)) ||
    (s.classGrade && s.classGrade.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));

  // Calculate reach stats
  const totalTargetCount = targetCohort.length;
  const viewedCount = viewers.length;
  const percentage = totalTargetCount > 0 
    ? Math.min(100, Math.round((viewedCount / totalTargetCount) * 100))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <Eye className="w-3.5 h-3.5" />
              <span>Görüntüleme İstatistikleri</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white line-clamp-1">
              {announcement.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bu duyuruyu açıp okuyan öğrencilerin anlık görüntüleme kayıtları ve saatleri.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> Toplam Okuyan
            </span>
            <div className="text-xl font-black text-purple-950 dark:text-purple-100 mt-0.5">
              {viewedCount} <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Öğrenci</span>
            </div>
          </div>

          {totalTargetCount > 0 && (
            <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                <Users className="w-3 h-3" /> Hedef Kitle Oranı
              </span>
              <div className="text-xl font-black text-indigo-950 dark:text-indigo-100 mt-0.5">
                %{percentage} <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400">({viewedCount}/{totalTargetCount})</span>
              </div>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Yayın Tarihi
            </span>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
              {new Date(announcement.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/30 dark:bg-slate-900/50">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('viewed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'viewed'
                  ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Görüntüleyenler ({viewers.length})
            </button>

            {totalTargetCount > 0 && (
              <button
                onClick={() => setActiveTab('not_viewed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'not_viewed'
                    ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                Henüz Okumayanlar ({notViewedStudents.length})
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Öğrenci veya numara ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Student List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 max-h-[380px]">
          {activeTab === 'viewed' ? (
            filteredViewers.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {viewers.length === 0 
                    ? 'Bu duyuru henüz hiçbir öğrenci tarafından görüntülenmedi.' 
                    : 'Arama kriterine uygun öğrenci bulunamadı.'}
                </p>
                {viewers.length === 0 && (
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Öğrenciler kendi panellerinden bu duyuruyu açtıklarında anlık olarak burada listelenecektir.
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredViewers.map((viewer, idx) => (
                  <div 
                    key={viewer.studentId || idx}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-black shrink-0">
                        {viewer.studentName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{viewer.studentName}</span>
                          {viewer.schoolNumber && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              #{viewer.schoolNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          {viewer.classGrade && (
                            <span className="font-semibold text-purple-600 dark:text-purple-400">
                              {viewer.classGrade} Şubesi
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Görüntülendi
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {new Date(viewer.viewedAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredNotViewed.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tebrikler! Hedef kitledeki tüm öğrenciler bu duyuruyu görüntüledi.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredNotViewed.map(student => (
                  <div 
                    key={student.uid}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-xs font-black shrink-0">
                        {student.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{student.displayName}</span>
                          {student.schoolNumber && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              #{student.schoolNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {student.classGrade || 'Sınıf Belirtilmemiş'}
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="w-3 h-3" /> Henüz Açmadı
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Öğrenci duyuru ekranına girdiğinde görüntüleme kaydı otomatik olarak işlenir.
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
};
