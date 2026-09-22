import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService, normalizeClassName, isAllSchool } from '../../services/dataService';
import { Announcement, AnnouncementPriority, TargetAudience, SchoolClass, UserProfile } from '../../types';
import { AnnouncementEditorModal } from './AnnouncementEditorModal';
import { AnnouncementViewersModal } from './AnnouncementViewersModal';
import { RichTextRenderer } from '../common/RichTextRenderer';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Clock, 
  Eye, 
  AlertTriangle, 
  Bell, 
  CheckCircle2, 
  Search, 
  Filter, 
  Pin, 
  Edit3, 
  School, 
  Users, 
  GraduationCap, 
  Paperclip, 
  Tag, 
  ExternalLink,
  Sparkles,
  Share2,
  Bookmark,
  UserCheck,
  UserX,
  BarChart3,
  TrendingUp,
  Globe,
  HardDrive,
  FileText,
  Link2
} from 'lucide-react';

export const TeacherAnnouncements: React.FC = () => {
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => dataService.getAnnouncements());
  const [classes, setClasses] = useState<SchoolClass[]>(() => dataService.getClasses());
  const [allStudents, setAllStudents] = useState<UserProfile[]>(() => dataService.getStudents());

  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; title: string } | null>(null);

  // Viewers details modal
  const [selectedViewersAnnouncement, setSelectedViewersAnnouncement] = useState<Announcement | null>(null);
  const [isViewersModalOpen, setIsViewersModalOpen] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Subscribe to real-time data changes
  useEffect(() => {
    dataService.syncAnnouncementsFromCloud().then(list => {
      setAnnouncements([...list]);
      setClasses([...dataService.getClasses()]);
      setAllStudents([...dataService.getStudents()]);
    });

    const refresh = () => {
      setAnnouncements([...dataService.getAnnouncements()]);
      setClasses([...dataService.getClasses()]);
      setAllStudents([...dataService.getStudents()]);
    };
    refresh();
    const unsub = dataService.subscribe(refresh);
    return unsub;
  }, []);

  const handleOpenCreateModal = () => {
    setEditingAnnouncement(null);
    setIsEditorModalOpen(true);
  };

  const handleOpenEditModal = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setIsEditorModalOpen(true);
  };

  const handleOpenViewersModal = (ann: Announcement) => {
    setSelectedViewersAnnouncement(ann);
    setIsViewersModalOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteConfirmTarget({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    const { id, title } = deleteConfirmTarget;
    await dataService.deleteAnnouncement(id);
    setActionSuccess(`"${title}" duyurusu başarıyla silindi.`);
    setDeleteConfirmTarget(null);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleTogglePin = async (id: string) => {
    await dataService.togglePinAnnouncement(id);
  };

  // Helper to calculate target student count for an announcement
  const getTargetStudentCount = (ann: Announcement) => {
    if (ann.targetAudience === 'all' || ann.targetAudience === 'students') {
      return allStudents.length;
    }
    if (ann.targetAudience === 'class') {
      if (isAllSchool(ann.targetClass) || (ann.targetClasses && ann.targetClasses.some(c => isAllSchool(c)))) {
        return allStudents.length;
      }
      if (ann.targetClasses && ann.targetClasses.length > 0) {
        const normClasses = ann.targetClasses.map(c => normalizeClassName(c));
        return allStudents.filter(s => s.classGrade && normClasses.includes(normalizeClassName(s.classGrade))).length;
      }
      if (ann.targetClass) {
        const parts = ann.targetClass.split(',').map(c => normalizeClassName(c.trim()));
        return allStudents.filter(s => s.classGrade && parts.includes(normalizeClassName(s.classGrade))).length;
      }
    }
    return 0;
  };

  // Filter logic
  const filtered = announcements.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = 
      (a.title || '').toLowerCase().includes(q) || 
      (a.content || '').toLowerCase().includes(q) ||
      (a.authorName || '').toLowerCase().includes(q) ||
      (a.tags && a.tags.some(t => (t || '').toLowerCase().includes(q)));

    const matchAudience = 
      audienceFilter === 'all' || 
      a.targetAudience === audienceFilter;

    const matchPriority = 
      priorityFilter === 'all' || 
      a.priority === priorityFilter;

    const cleanFilter = normalizeClassName(selectedClassFilter);
    const matchClass = 
      selectedClassFilter === 'all' || 
      a.targetAudience === 'all' ||
      a.targetAudience === 'students' ||
      (a.targetAudience === 'class' && (
        isAllSchool(a.targetClass) ||
        (a.targetClasses && a.targetClasses.some(c => isAllSchool(c) || normalizeClassName(c) === cleanFilter)) ||
        (a.targetClass && a.targetClass.split(',').some(c => isAllSchool(c) || normalizeClassName(c.trim()) === cleanFilter))
      ));

    return matchSearch && matchAudience && matchPriority && matchClass;
  });

  // Calculate cumulative stats
  const totalStudentViews = announcements.reduce((acc, a) => acc + (a.viewedByStudents?.length || 0), 0);
  const myAnnouncements = announcements.filter(a => a.authorId === currentUser?.uid);
  const myTotalStudentViews = myAnnouncements.reduce((acc, a) => acc + (a.viewedByStudents?.length || 0), 0);

  const getPriorityBadge = (p: AnnouncementPriority) => {
    switch (p) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> ACİL & KRİTİK
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
            Genel Duyuru
          </span>
        );
    }
  };

  const getAudienceLabel = (ann: Announcement) => {
    if (ann.targetAudience === 'all') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <School className="w-3.5 h-3.5" /> Tüm Okul
        </span>
      );
    }
    if (ann.targetAudience === 'students') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <GraduationCap className="w-3.5 h-3.5" /> Tüm Öğrenciler
        </span>
      );
    }
    if (ann.targetAudience === 'teachers') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Users className="w-3.5 h-3.5" /> Öğretmenler Odası
        </span>
      );
    }
    
    // Class / Branch specific
    const classList = ann.targetClasses && ann.targetClasses.length > 0 
      ? ann.targetClasses.join(', ')
      : (ann.targetClass || 'Belirli Şube');

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
        <School className="w-3.5 h-3.5" /> {classList} Şubesi
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Toast alert */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="p-1 hover:bg-emerald-600 rounded-lg">
            ✕
          </button>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-purple-950/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-extrabold text-purple-200 mb-2 border border-white/10">
              <Megaphone className="w-3.5 h-3.5 text-purple-400" />
              <span>Duyuru ve Bilgilendirme Merkezi</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Okul & Şube Duyuruları
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/80 mt-1 max-w-xl leading-relaxed">
              Zengin metin düzenleyici ile okul veya seçtiğiniz özel şubeler için anlık duyurular yayınlayın. Öğrencilerin duyuruyu anlık görüntüleme sayılarını ve kimlerin okuduğunu takip edin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="create-rich-announcement-btn"
              onClick={handleOpenCreateModal}
              className="py-3 px-5 rounded-2xl bg-white hover:bg-purple-50 text-purple-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-black/20 hover:scale-[1.02] transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-purple-600" />
              Zengin Duyuru Oluştur
            </button>
          </div>
        </div>

        {/* Decorative circle */}
        <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Analytics & Viewing Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400">Yayınlanan Duyurular</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {announcements.length} <span className="text-xs font-semibold text-slate-400">Adet</span>
            </div>
            <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold mt-0.5">
              {myAnnouncements.length} Tanesi Tarafınızdan
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-purple-200 dark:border-purple-900/60 shadow-xs flex items-center gap-4 bg-gradient-to-br from-purple-50/30 to-indigo-50/20 dark:from-purple-950/20 dark:to-indigo-950/10">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-purple-900 dark:text-purple-300">Öğrenci Görüntüleme Sayacı</div>
            <div className="text-2xl font-black text-purple-950 dark:text-purple-100 mt-0.5">
              {totalStudentViews} <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Tekil Okuma</span>
            </div>
            <div className="text-[11px] text-purple-700 dark:text-purple-300 font-bold mt-0.5">
              Sizin Duyurularınızda: <strong>{myTotalStudentViews}</strong> Öğrenci
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400">Hedef Kitle & Şube Takibi</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {classes.length} <span className="text-xs font-semibold text-slate-400">Aktif Şube</span>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
              Toplam {allStudents.length} Kayıtlı Öğrenci
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Başlık, içerik, etiket veya yazar adı ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Audience Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Tüm Duyurular' },
              { id: 'class', label: 'Şube Bazlı' },
              { id: 'students', label: 'Öğrenciler' },
              { id: 'teachers', label: 'Öğretmenler' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAudienceFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  audienceFilter === tab.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-Filters: Priority & Class Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">Öncelik:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none"
            >
              <option value="all">Tüm Öncelikler</option>
              <option value="urgent">Yalnızca Acil / Kritik</option>
              <option value="important">Yalnızca Önemli</option>
              <option value="normal">Normal / Genel</option>
            </select>
          </div>

          {classes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Sınıf Filtresi:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none"
              >
                <option value="all">Tüm Sınıflar</option>
                {classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name} Şubesi</option>
                ))}
              </select>
            </div>
          )}

          <div className="ml-auto text-slate-400 font-semibold text-[11px]">
            Toplam {filtered.length} duyuru listeleniyor
          </div>
        </div>
      </div>

      {/* Announcements Stream */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Megaphone className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
              Filtreye Uygun Duyuru Bulunamadı
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Arama kriterlerinizi değiştirebilir veya zengin metin düzenleyicisi ile yeni bir okul/şube duyurusu yayınlayabilirsiniz.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="py-2.5 px-5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 mx-auto shadow-md shadow-purple-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              İlk Duyuruyu Yayınla
            </button>
          </div>
        ) : (
          filtered.map(ann => {
            const isAuthor = currentUser?.uid === ann.authorId || currentUser?.role === 'admin' || currentUser?.role === 'teacher';
            const studentViewersCount = ann.viewedByStudents?.length || 0;
            const targetCount = getTargetStudentCount(ann);
            const reachPercentage = targetCount > 0 
              ? Math.min(100, Math.round((studentViewersCount / targetCount) * 100))
              : null;

            return (
              <div 
                key={ann.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border transition p-6 shadow-xs hover:border-purple-300 dark:hover:border-purple-800/80 ${
                  ann.pinned
                    ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/10 shadow-md shadow-amber-500/5'
                    : ann.priority === 'urgent'
                    ? 'border-rose-300 dark:border-rose-900/60 shadow-md shadow-rose-500/5'
                    : ann.priority === 'important'
                    ? 'border-amber-300 dark:border-amber-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Announcement Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ann.pinned && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs">
                        <Pin className="w-3.5 h-3.5 fill-current" /> Başa Tutturuldu
                      </span>
                    )}
                    {getPriorityBadge(ann.priority)}
                    {getAudienceLabel(ann)}

                    {/* Student View Counter Pill in header */}
                    <button
                      onClick={() => handleOpenViewersModal(ann)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/80 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 transition cursor-pointer group shadow-2xs"
                      title="Duyuruyu görüntüleyen öğrencileri detaylı incele"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition" />
                      <span>{studentViewersCount} Öğrenci Görüntüledi</span>
                      {reachPercentage !== null && (
                        <span className="text-[10px] bg-purple-200/70 dark:bg-purple-900/90 text-purple-800 dark:text-purple-200 px-1.5 py-0.5 rounded-full font-bold">
                          %{reachPercentage}
                        </span>
                      )}
                    </button>
                    
                    {/* Tags */}
                    {ann.tags && ann.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        #{t}
                      </span>
                    ))}
                  </div>

                  {/* Actions & Date */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(ann.createdAt).toLocaleDateString('tr-TR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>

                    {/* Pin / Edit / Delete */}
                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                      <button
                        onClick={() => handleTogglePin(ann.id)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          ann.pinned 
                            ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/60' 
                            : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={ann.pinned ? 'Baştan Kaldır' : 'Başa Tuttur'}
                      >
                        <Pin className={`w-4 h-4 ${ann.pinned ? 'fill-current' : ''}`} />
                      </button>

                      {isAuthor && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(ann)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Duyuruyu Düzenle"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(ann.id, ann.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Duyuruyu Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-3">
                  {ann.title}
                </h3>

                {/* Rich Content Renderer */}
                <div className="mb-4 bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  <RichTextRenderer content={ann.content} />
                </div>

                {/* Attachments & Reference Links list */}
                {ann.attachments && ann.attachments.length > 0 && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                    <div className="text-[11px] font-black text-purple-900 dark:text-purple-200 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        Referans Dokümanlar & Ek Bağlantılar ({ann.attachments.length}):
                      </span>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                        Tıklayarak Kaynağı Aç
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

                {/* Card Footer Info with Interactive Counter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Yayınlayan: <strong>{ann.authorName}</strong> ({ann.authorRole === 'admin' ? 'Okul Müdürü' : 'Öğretmen'})
                  </span>

                  <div className="flex items-center gap-3">
                    {/* Interactive Student View Button */}
                    <button
                      onClick={() => handleOpenViewersModal(ann)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/70 dark:hover:bg-purple-900/80 border border-purple-200 dark:border-purple-800/80 text-purple-700 dark:text-purple-300 font-bold text-xs transition cursor-pointer group"
                      title="Görüntüleyen öğrencileri listele"
                    >
                      <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition shrink-0" />
                      <span>
                        <strong>{studentViewersCount}</strong> Öğrenci Görüntüledi
                      </span>
                      <span className="text-[11px] text-purple-500 dark:text-purple-400 font-semibold underline decoration-dotted underline-offset-2">
                        (Listeyi İncele)
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Editor Modal */}
      <AnnouncementEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        announcementToEdit={editingAnnouncement}
        onSaved={() => {
          setActionSuccess(editingAnnouncement ? '✓ Duyuru başarıyla güncellendi.' : '✓ Yeni duyuru başarıyla yayınlandı.');
          setTimeout(() => setActionSuccess(null), 3500);
        }}
      />

      {/* Viewers Modal */}
      <AnnouncementViewersModal
        isOpen={isViewersModalOpen}
        onClose={() => setIsViewersModalOpen(false)}
        announcement={selectedViewersAnnouncement}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Duyuruyu Sil</h4>
                <p className="text-xs text-slate-500">Bu işlem geri alınamaz.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              <strong>"{deleteConfirmTarget.title}"</strong> başlıklı duyuruyu silmek istediğinize emin misiniz?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-xs"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

