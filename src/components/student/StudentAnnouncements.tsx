import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Announcement, AnnouncementPriority } from '../../types';
import { RichTextRenderer } from '../common/RichTextRenderer';
import { 
  Megaphone, 
  Search, 
  Clock, 
  Eye, 
  AlertTriangle, 
  Bell, 
  Filter, 
  Pin,
  Calendar,
  Paperclip,
  ExternalLink,
  School,
  Sparkles,
  Globe,
  HardDrive,
  FileText,
  Link2
} from 'lucide-react';

export const StudentAnnouncements: React.FC = () => {
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [studentAnnouncements, setStudentAnnouncements] = useState<Announcement[]>(() => 
    currentUser ? dataService.getAnnouncementsForStudent(currentUser.classGrade) : []
  );

  React.useEffect(() => {
    if (!currentUser) return;
    const updateList = () => {
      setStudentAnnouncements([...dataService.getAnnouncementsForStudent(currentUser.classGrade)]);
    };
    updateList();
    const unsub = dataService.subscribe(updateList);
    return unsub;
  }, [currentUser?.classGrade]);

  // Auto-record student viewing when viewing this page
  React.useEffect(() => {
    if (currentUser && currentUser.role === 'student') {
      studentAnnouncements.forEach(ann => {
        const hasViewed = ann.viewedByStudents?.some(v => v.studentId === currentUser.uid);
        if (!hasViewed) {
          dataService.recordAnnouncementStudentView(ann.id, {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            schoolNumber: currentUser.schoolNumber,
            classGrade: currentUser.classGrade
          });
        }
      });
    }
  }, [studentAnnouncements.length, currentUser?.uid]);

  const filtered = studentAnnouncements.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = 
      (a.title || '').toLowerCase().includes(q) || 
      (a.content || '').toLowerCase().includes(q) ||
      (a.authorName || '').toLowerCase().includes(q) ||
      (a.tags && a.tags.some(t => (t || '').toLowerCase().includes(q)));
    const matchPriority = priorityFilter === 'all' || a.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  const getPriorityBadge = (p: AnnouncementPriority) => {
    switch (p) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> ACİL DUYURU
          </span>
        );
      case 'important':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Bell className="w-3.5 h-3.5" /> ÖNEMLİ BİLGİLENDİRME
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Okul Duyurusu
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-black mb-1 border border-purple-200 dark:border-purple-800">
            <Megaphone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Resmi Duyuru Panosu</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Okul ve Şube Duyuruları
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Okul idaresi ve öğretmenlerinizin yayınladığı tüm resmi duyurular, sınav takvimleri ve etkinlikler.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Duyurularda ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">Tüm Öncelikler</option>
            <option value="urgent">Yalnızca Acil</option>
            <option value="important">Yalnızca Önemli</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {/* Announcements Stream */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Megaphone className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Yeni duyuru bulunmuyor</p>
          </div>
        ) : (
          filtered.map(ann => (
            <div 
              key={ann.id}
              className={`p-6 rounded-3xl border transition bg-white dark:bg-slate-900 ${
                ann.pinned
                  ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/10 shadow-md shadow-amber-500/5'
                  : ann.priority === 'urgent' 
                  ? 'border-rose-300 dark:border-rose-900/60 shadow-md shadow-rose-500/5' 
                  : ann.priority === 'important'
                  ? 'border-amber-300 dark:border-amber-900/60'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {ann.pinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      <Pin className="w-3.5 h-3.5 fill-current" /> Sabitlendi
                    </span>
                  )}
                  {getPriorityBadge(ann.priority)}
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {ann.targetAudience === 'all' 
                      ? 'Tüm Okul' 
                      : ann.targetAudience === 'students' 
                      ? 'Tüm Öğrenciler' 
                      : `${ann.targetClass || ann.targetClasses?.join(', ')} Sınıfı`}
                  </span>
                  {ann.tags && ann.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      #{t}
                    </span>
                  ))}
                </div>

                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(ann.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-3">
                {ann.title}
              </h3>

              {/* Markdown Content */}
              <div className="mb-4 bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <RichTextRenderer content={ann.content} />
              </div>

              {/* Attachments & Reference Links */}
              {ann.attachments && ann.attachments.length > 0 && (
                <div className="mb-4 p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                  <div className="text-[11px] font-black text-purple-900 dark:text-purple-200 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      Referans Dokümanlar & Ek Bağlantılar ({ann.attachments.length}):
                    </span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                      Tıklayarak İncele
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ann.attachments.map(att => {
                      const isDrive = att.url.includes('drive.google.com');
                      const isMeb = att.url.includes('eba.gov.tr') || att.url.includes('meb.gov.tr');
                      const isPdf = att.url.toLowerCase().endsWith('.pdf') || att.type === 'pdf';
                      const isSchool = att.url.includes('meb.k12.tr');

                      return (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200/90 dark:border-purple-800/80 hover:border-purple-500 hover:shadow-xs text-xs font-bold text-slate-800 dark:text-slate-200 transition group"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <div className={`p-1.5 rounded-lg shrink-0 ${
                              isDrive ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' :
                              isMeb ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400' :
                              isPdf ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                              isSchool ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                              'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
                            }`}>
                              {isDrive ? <HardDrive className="w-3.5 h-3.5" /> :
                               isMeb ? <Globe className="w-3.5 h-3.5" /> :
                               isPdf ? <FileText className="w-3.5 h-3.5" /> :
                               isSchool ? <School className="w-3.5 h-3.5" /> :
                               <Link2 className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition text-[11px] sm:text-xs">
                                {att.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate font-mono">
                                {att.url.replace(/^https?:\/\//, '')}
                              </div>
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-purple-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {ann.authorName} ({ann.authorRole === 'admin' ? 'Okul İdaresi' : 'Öğretmen'})
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  {ann.viewsCount || 150}+ Okundu
                </span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
