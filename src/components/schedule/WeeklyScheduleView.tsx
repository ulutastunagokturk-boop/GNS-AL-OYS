import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { WeeklyScheduleSlot, DayOfWeek, ClassPeriodInfo, ScheduleDutyInfo } from '../../types';
import { dataService } from '../../services/dataService';
import { 
  CLASS_PERIODS, 
  DAYS_CONFIG, 
  SUBJECT_THEMES, 
  DEFAULT_DUTY_ROSTER,
  getCurrentClassStatus,
  CurrentClassStatus
} from '../../services/scheduleData';
import { ScheduleSlotModal } from './ScheduleSlotModal';
import { SchedulePrintModal } from './SchedulePrintModal';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Printer, 
  FileDown,
  Sparkles, 
  Filter, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  Plus, 
  Edit3, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Bell, 
  ShieldCheck, 
  StickyNote,
  Search,
  School,
  ArrowRight,
  TrendingUp,
  Copy,
  RotateCcw,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface WeeklyScheduleViewProps {
  initialClass?: string;
  initialTeacher?: string;
}

export const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({
  initialClass,
  initialTeacher
}) => {
  const { currentUser } = useAuth();

  // Mode & Filter States
  const [viewType, setViewType] = useState<'grid' | 'agenda' | 'duty' | 'bell'>('grid');
  const [filterMode, setFilterMode] = useState<'class' | 'teacher'>('class');
  const [selectedClass, setSelectedClass] = useState<string>('10-A');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedSlot, setSelectedSlot] = useState<WeeklyScheduleSlot | null>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneSourceClass, setCloneSourceClass] = useState('10-A');
  const [cloneTargetClass, setCloneTargetClass] = useState('10-B');
  const [isActionSuccess, setIsActionSuccess] = useState<string | null>(null);

  // Schedules state
  const [allSchedules, setAllSchedules] = useState<WeeklyScheduleSlot[]>(() => dataService.getSchedules());

  const refreshSchedules = () => {
    setAllSchedules([...dataService.getSchedules()]);
  };

  // Live Time Status State
  const [liveStatus, setLiveStatus] = useState<CurrentClassStatus>(() => 
    getCurrentClassStatus(dataService.getSchedules(), '10-A')
  );

  // Available Data
  const classes = dataService.getClasses();
  const teachers = dataService.getTeachers();
  const isAdminOrTeacher = currentUser?.role === 'admin' || currentUser?.role === 'teacher';

  // Initialize role defaults
  useEffect(() => {
    if (currentUser?.role === 'student' && currentUser.classGrade) {
      setSelectedClass(currentUser.classGrade);
      setFilterMode('class');
    } else if (currentUser?.role === 'teacher') {
      setSelectedTeacher(currentUser.displayName);
      setFilterMode('teacher');
    } else if (initialClass) {
      setSelectedClass(initialClass);
    } else if (initialTeacher) {
      setSelectedTeacher(initialTeacher);
      setFilterMode('teacher');
    }
  }, [currentUser, initialClass, initialTeacher]);

  // Update live status every 15 seconds
  useEffect(() => {
    const updateLive = () => {
      const targetClass = filterMode === 'class' ? selectedClass : '10-A';
      setLiveStatus(getCurrentClassStatus(allSchedules, targetClass));
    };

    updateLive();
    const interval = setInterval(updateLive, 15000);
    return () => clearInterval(interval);
  }, [selectedClass, filterMode, allSchedules]);

  // Set today as active day on initial load
  useEffect(() => {
    const today = new Date().getDay();
    const dayMap: Record<number, DayOfWeek> = {
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday'
    };
    if (dayMap[today]) {
      setSelectedDay(dayMap[today]);
    }
  }, []);

  // Filter slots
  const filteredSlots = allSchedules.filter(slot => {
    // Mode Filter
    if (filterMode === 'class') {
      if ((slot.className || '').toLowerCase() !== (selectedClass || '').toLowerCase()) return false;
    } else if (filterMode === 'teacher') {
      if (!selectedTeacher) return true;
      if (!(slot.teacherName || '').toLowerCase().includes((selectedTeacher || '').toLowerCase())) return false;
    }

    // Subject Filter
    if (subjectFilter !== 'all' && slot.subject !== subjectFilter) {
      return false;
    }

    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (slot.subject || '').toLowerCase().includes(q) ||
        (slot.teacherName || '').toLowerCase().includes(q) ||
        (slot.classroom || '').toLowerCase().includes(q) ||
        Boolean(slot.topic && slot.topic.toLowerCase().includes(q))
      );
    }

    return true;
  });

  // Calculate distinct subjects for filter chips
  const distinctSubjects = Array.from(new Set(allSchedules.map(s => s.subject)));

  // Calculate teacher/student stats
  const totalHoursWeekly = filteredSlots.length;
  const uniqueClassrooms = Array.from(new Set(filteredSlots.map(s => s.classroom)));

  // Handle slot click
  const handleSlotClick = (slot: WeeklyScheduleSlot) => {
    setSelectedSlot(slot);
    setIsSlotModalOpen(true);
  };

  // Handle new slot creation click
  const handleAddNewSlot = (day?: DayOfWeek, period?: number) => {
    const defaultPeriod = period || 1;
    const periodInfo = CLASS_PERIODS.find(p => p.period === defaultPeriod);
    const newDraftSlot: WeeklyScheduleSlot = {
      id: `new-draft-${Date.now()}`,
      className: filterMode === 'class' ? selectedClass : '10-A',
      day: day || selectedDay || 'monday',
      period: defaultPeriod,
      startTime: periodInfo?.startTime || '08:50',
      endTime: periodInfo?.endTime || '09:30',
      subject: 'Matematik',
      teacherName: currentUser?.role === 'teacher' ? currentUser.displayName : (teachers[0]?.displayName || 'Ders Öğretmeni'),
      classroom: 'Derslik 101',
      topic: '',
      notes: '',
      updatedAt: new Date().toISOString()
    };
    setSelectedSlot(newDraftSlot);
    setIsSlotModalOpen(true);
  };

  // Handle cloning schedule from one class to another
  const handleExecuteClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cloneSourceClass === cloneTargetClass) {
      alert('Kaynak ve hedef sınıf aynı olamaz.');
      return;
    }

    const sourceSlots = allSchedules.filter(s => (s.className || '').toLowerCase() === (cloneSourceClass || '').toLowerCase());
    if (sourceSlots.length === 0) {
      alert(`${cloneSourceClass} şubesinde henüz kayıtlı ders bulunmuyor.`);
      return;
    }

    if (!window.confirm(`${cloneSourceClass} şubesinin ${sourceSlots.length} saatlik ders programını ${cloneTargetClass} şubesine kopyalamak istediğinize emin misiniz? (${cloneTargetClass} şubesindeki mevcut çakışan saatler güncellenecektir.)`)) {
      return;
    }

    // Delete existing target slots then add cloned slots
    const targetSlots = allSchedules.filter(s => (s.className || '').toLowerCase() === (cloneTargetClass || '').toLowerCase());
    for (const ts of targetSlots) {
      await dataService.deleteScheduleSlot(ts.id, currentUser?.displayName || 'Yönetici');
    }

    for (const ss of sourceSlots) {
      const cloned: WeeklyScheduleSlot = {
        ...ss,
        id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        className: cloneTargetClass,
        updatedAt: new Date().toISOString()
      };
      await dataService.addScheduleSlot(cloned, currentUser?.displayName || 'Yönetici');
    }

    refreshSchedules();
    setSelectedClass(cloneTargetClass);
    setIsCloneModalOpen(false);
    setIsActionSuccess(`${cloneSourceClass} programı ${cloneTargetClass} şubesine başarıyla aktarıldı.`);
    setTimeout(() => setIsActionSuccess(null), 4000);
  };

  // Handle resetting schedule to MEB default
  const handleResetToMEBDefault = async () => {
    if (!window.confirm('Tüm şubelerin ders programını MEB standart haftalık dağılımına sıfırlamak istediğinize emin misiniz?')) {
      return;
    }

    localStorage.removeItem('gnsial_weekly_schedule_v2');
    localStorage.removeItem('gnsial_weekly_schedule');
    dataService.resetSchedulesToDefault();
    refreshSchedules();
    setIsActionSuccess('Ders programı başarıyla MEB standart şablonuna sıfırlandı.');
    setTimeout(() => setIsActionSuccess(null), 4000);
  };

  const currentDayConfig = DAYS_CONFIG.find(d => d.key === selectedDay) || DAYS_CONFIG[0];

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-950/20">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-indigo-500/20 backdrop-blur-sm border border-indigo-400/30 text-indigo-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                2026 - 2027 Eğitim-Öğretim Yılı
              </span>
              <span className="text-xs text-indigo-200">
                Gaziemir Nevvar Salih İşgören Anadolu Lisesi
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Haftalık Ders Programı & Çizelge
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/80 max-w-2xl leading-relaxed">
              Tüm şubelerin ve öğretmenlerin 40 saatlik MEB ders dağılımı, zil vakitleri, nöbetçi öğretmen çizelgesi ve anlık ders takip durumunu inceleyebilir veya düzenleyebilirsiniz.
            </p>
          </div>

          {/* Quick Action Buttons in Banner */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isAdminOrTeacher && (
              <button
                onClick={() => handleAddNewSlot()}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Yeni Ders Ekle
              </button>
            )}

            {currentUser?.role === 'admin' && (
              <>
                <button
                  onClick={() => setIsCloneModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
                  title="Programı Başka Şubeye Kopyala"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-300" />
                  Program Kopyala
                </button>

                <button
                  onClick={handleResetToMEBDefault}
                  className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
                  title="MEB Standart Şablonuna Sıfırla"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                  Varsayılana Sıfırla
                </button>
              </>
            )}

            <button
              id="download-schedule-pdf-banner-btn"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95"
              title="Okul idaresi saatleriyle haftalık ders programını PDF olarak indir"
            >
              <FileDown className="w-4 h-4" />
              PDF Olarak İndir
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-indigo-300" />
              Resmi Çıktı / Yazdır
            </button>
          </div>
        </div>

        {/* Decorative blur balls */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl"></div>
        <div className="absolute right-1/3 -top-10 w-40 h-40 rounded-full bg-blue-500/15 blur-xl"></div>
      </div>

      {/* Success Notification Alert */}
      {isActionSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold text-emerald-800 dark:text-emerald-200 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{isActionSuccess}</span>
          </div>
          <button onClick={() => setIsActionSuccess(null)} className="text-emerald-600 hover:underline">
            Kapat
          </button>
        </div>
      )}

      {/* Live School Status Card (Zil & Şu Anki Ders Takip Kartı) */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl border border-slate-700/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              liveStatus.isSchoolHours 
                ? (liveStatus.isBreakNow ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 animate-pulse')
                : 'bg-slate-700 text-slate-300'
            }`}>
              <Bell className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                  {liveStatus.dayLabel} • CANLI DURUM
                </span>
                {liveStatus.isSchoolHours && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                {liveStatus.statusText}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {liveStatus.subStatusText}
              </p>
            </div>
          </div>

          {liveStatus.isSchoolHours && (
            <div className="sm:text-right shrink-0 bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-2xl">
              <span className="text-[11px] text-slate-400 block font-medium">
                {liveStatus.isBreakNow ? 'Teneffüs Kalan Süre' : 'Ders Bitimine Kalan'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
                {liveStatus.minutesRemainingInCurrent} dk
              </span>
              <div className="w-36 bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div 
                  className="bg-indigo-400 h-full transition-all duration-500"
                  style={{ width: `${liveStatus.progressPercent}%` }}
                ></div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Control Bar: View Type Tabs & Selectors */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Top Control Line: Views & Modes */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Main View Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setViewType('grid')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                viewType === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Haftalık Tablo (Grid)
            </button>

            <button
              onClick={() => setViewType('agenda')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                viewType === 'agenda'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Günlük Akış (Ajanda)
            </button>

            <button
              onClick={() => setViewType('bell')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                viewType === 'bell'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Zil Vakitleri
            </button>

            <button
              onClick={() => setViewType('duty')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                viewType === 'duty'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Nöbet Çizelgesi
            </button>
          </div>

          {/* Filter Type Toggle & Select Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Mode switch: Class vs Teacher */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setFilterMode('class')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterMode === 'class'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Sınıf Programı
              </button>
              <button
                onClick={() => setFilterMode('teacher')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterMode === 'teacher'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Öğretmen Programı
              </button>
            </div>

            {/* Target Select */}
            {filterMode === 'class' ? (
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {classes.length > 0 ? (
                  classes.map(cls => (
                    <option key={cls.id} value={cls.name}>{cls.name} Şubesi</option>
                  ))
                ) : (
                  ['9-A', '10-A', '10-B', '11-A', '11-B', '12-A'].map(cls => (
                    <option key={cls} value={cls}>{cls} Şubesi</option>
                  ))
                )}
              </select>
            ) : (
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">Tüm Öğretmenler</option>
                {teachers.length > 0 ? (
                  teachers.map(t => (
                    <option key={t.uid} value={t.displayName}>{t.displayName} ({t.branch || 'Öğretmen'})</option>
                  ))
                ) : (
                  <option disabled value="">Henüz kayıtlı öğretmen bulunmamaktadır</option>
                )}
              </select>
            )}

            {/* Download PDF Button in control bar */}
            <button
              id="download-schedule-pdf-toolbar-btn"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Okul idaresi saatleriyle haftalık ders programını PDF olarak indir veya yazdır"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>PDF İndir</span>
            </button>

            {/* Quick Add Button in control bar */}
            {isAdminOrTeacher && (
              <button
                onClick={() => handleAddNewSlot()}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ders Ekle</span>
              </button>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ders, öğretmen veya konu ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-56"
              />
            </div>

          </div>

        </div>

        {/* Subject Category Chips Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1 shrink-0">
            Branş Filtresi:
          </span>
          
          <button
            onClick={() => setSubjectFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              subjectFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Tüm Dersler ({filteredSlots.length})
          </button>

          {distinctSubjects.map(sub => (
            <button
              key={sub}
              onClick={() => setSubjectFilter(sub)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                subjectFilter === sub
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

      </div>

      {/* VIEW 1: WEEKLY GRID TABLE (Haftalık Matris) */}
      {viewType === 'grid' && (
        <div className="space-y-4">
          
          {/* Main Timetable Matrix */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 sm:p-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28 sm:w-32">
                      Ders Saati
                    </th>
                    {DAYS_CONFIG.map(day => (
                      <th key={day.key} className="p-3 sm:p-4 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider min-w-[170px]">
                        <div className="flex items-center justify-between">
                          <span>{day.label}</span>
                          <span className="text-[10px] font-normal text-slate-400">
                            8 Ders
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {CLASS_PERIODS.map(period => (
                    <React.Fragment key={period.period}>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                        
                        {/* Period & Bell Time Column */}
                        <td className="p-3 sm:p-4 align-top bg-slate-50/40 dark:bg-slate-800/30 border-r border-slate-100 dark:border-slate-800">
                          <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                            {period.label}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {period.startTime} - {period.endTime}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {period.breakLabel}
                          </div>
                        </td>

                        {/* 5 Days Columns for this period */}
                        {DAYS_CONFIG.map(day => {
                          const slot = filteredSlots.find(s => s.day === day.key && s.period === period.period);
                          const personalNote = currentUser && slot ? dataService.getPersonalSlotNote(currentUser.uid, slot.id) : '';
                          const theme = slot ? (SUBJECT_THEMES[slot.subject] || {
                            bg: 'bg-indigo-50 dark:bg-indigo-950/40',
                            text: 'text-indigo-900 dark:text-indigo-100',
                            border: 'border-indigo-200 dark:border-indigo-800/60',
                            badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
                            dot: 'bg-indigo-500'
                          }) : null;

                          return (
                            <td key={day.key} className="p-2 sm:p-2.5 align-top">
                              {slot ? (
                                <div
                                  onClick={() => handleSlotClick(slot)}
                                  className={`p-3 rounded-2xl border transition-all duration-200 hover:shadow-md cursor-pointer group space-y-1.5 relative ${theme?.bg} ${theme?.border}`}
                                >
                                  {/* Subject Title & Dot */}
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`text-xs font-black truncate ${theme?.text}`}>
                                      {slot.subject}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {personalNote && (
                                        <StickyNote className="w-3 h-3 text-amber-500" />
                                      )}
                                      {isAdminOrTeacher && (
                                        <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                                      )}
                                    </div>
                                  </div>

                                  {/* Teacher */}
                                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 truncate">
                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{slot.teacherName}</span>
                                  </div>

                                  {/* Classroom & Class Name */}
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 border-t border-slate-200/50 dark:border-slate-700/50">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                      {slot.classroom}
                                    </span>
                                    {filterMode === 'teacher' && (
                                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                                        {slot.className}
                                      </span>
                                    )}
                                  </div>

                                  {/* Topic Preview if exists */}
                                  {slot.topic && (
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate italic">
                                      📖 {slot.topic}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div 
                                  onClick={() => isAdminOrTeacher && handleAddNewSlot(day.key, period.period)}
                                  className={`h-20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-[11px] text-slate-400 transition group ${
                                    isAdminOrTeacher 
                                      ? 'hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 cursor-pointer' 
                                      : ''
                                  }`}
                                >
                                  {isAdminOrTeacher ? (
                                    <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1 font-semibold">
                                      <Plus className="w-3.5 h-3.5" />
                                      Ders Ekle
                                    </span>
                                  ) : (
                                    <span>{filterMode === 'teacher' ? 'Boş Ders' : '—'}</span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                      </tr>

                      {/* Lunch Break Row after 5th period */}
                      {period.isLunchAfter && (
                        <tr className="bg-amber-50/60 dark:bg-amber-950/20 border-y border-amber-200/60 dark:border-amber-900/40">
                          <td colSpan={6} className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                              <span>🍽️</span>
                              <span>12:50 - 13:30 ÖĞLE ARASI DİNLENME VE YEMEK TATİLİ (40 DAKİKA)</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Summary Footbar */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Toplam Haftalık Ders: {filteredSlots.length} Saat
              </span>
              <span>•</span>
              <span>Farklı Derslik: {uniqueClassrooms.length} Adet</span>
              <span>•</span>
              <span>Ders Süresi: 40 Dakika</span>
            </div>

            <div className="flex items-center gap-2 text-slate-500">
              <Info className="w-3.5 h-3.5" />
              <span>
                {isAdminOrTeacher ? 'Ders kartlarına tıklayarak düzenleyebilir veya boş saatlere tıklayarak ders ekleyebilirsiniz.' : 'Ders kartına tıklayarak ayrıntıları ve kişisel notlarınızı görebilirsiniz.'}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: DAILY AGENDA (Günlük Akış & Odaklanmış Görünüm) */}
      {viewType === 'agenda' && (
        <div className="space-y-6">
          
          {/* Day Selector Pills */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto p-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            {DAYS_CONFIG.map(day => {
              const count = filteredSlots.filter(s => s.day === day.key).length;
              return (
                <button
                  key={day.key}
                  onClick={() => setSelectedDay(day.key)}
                  className={`flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                    selectedDay === day.key
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{day.label}</span>
                  <span className={`text-[10px] font-normal ${selectedDay === day.key ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {count} Ders
                  </span>
                </button>
              );
            })}
          </div>

          {/* Agenda Timeline List for Selected Day */}
          <div className="space-y-3">
            {CLASS_PERIODS.map(period => {
              const slot = filteredSlots.find(s => s.day === selectedDay && s.period === period.period);
              const personalNote = currentUser && slot ? dataService.getPersonalSlotNote(currentUser.uid, slot.id) : '';
              const theme = slot ? (SUBJECT_THEMES[slot.subject] || {
                bg: 'bg-indigo-50 dark:bg-indigo-950/40',
                text: 'text-indigo-900 dark:text-indigo-100',
                border: 'border-indigo-200 dark:border-indigo-800/60',
                badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
                dot: 'bg-indigo-500'
              }) : null;

              return (
                <React.Fragment key={period.period}>
                  <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                    slot 
                      ? `${theme?.bg} ${theme?.border} hover:shadow-md cursor-pointer`
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (slot) {
                      handleSlotClick(slot);
                    } else if (isAdminOrTeacher) {
                      handleAddNewSlot(selectedDay, period.period);
                    }
                  }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Period Time Box */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/60 dark:border-slate-700 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-slate-400">DERS</span>
                          <span className="text-base font-black text-slate-900 dark:text-white leading-none">{period.period}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {period.startTime} - {period.endTime}
                            </span>
                            <span className="text-[11px] text-slate-400">({period.breakLabel})</span>
                          </div>

                          {slot ? (
                            <h3 className={`text-base sm:text-lg font-black mt-0.5 ${theme?.text}`}>
                              {slot.subject}
                            </h3>
                          ) : (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm font-semibold text-slate-400">
                                {filterMode === 'teacher' ? 'Boş Ders / Serbest Çalışma' : 'Ders Tanımlanmamış'}
                              </span>
                              {isAdminOrTeacher && (
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                                  + Yeni Ders Planla
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Slot Meta Details */}
                      {slot && (
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold bg-white/60 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            {slot.teacherName}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold bg-white/60 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            {slot.classroom}
                          </div>

                          {filterMode === 'teacher' && (
                            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-3 py-1.5 rounded-xl">
                              {slot.className}
                            </div>
                          )}

                          {isAdminOrTeacher && (
                            <div className="p-1.5 text-slate-400 hover:text-indigo-600">
                              <Edit3 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      )}

                    </div>

                    {/* Topic or Personal Note Snippet */}
                    {slot && (slot.topic || personalNote) && (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                        {slot.topic && (
                          <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Konu: <strong>{slot.topic}</strong></span>
                          </div>
                        )}
                        {personalNote && (
                          <div className="text-amber-700 dark:text-amber-300 flex items-center gap-1.5 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg">
                            <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                            <span>Kişisel Notum: {personalNote}</span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Lunch break in agenda view */}
                  {period.isLunchAfter && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl text-center text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center justify-center gap-2">
                      <span>🍽️ 11:40 - 12:30 ÖĞLE ARASI TENEFFÜSÜ (50 DAKİKA)</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

        </div>
      )}

      {/* VIEW 3: BELL TIMES (Zil Vakitleri Çizelgesi) */}
      {viewType === 'bell' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Gaziemir Nevvar Salih İşgören Anadolu Lisesi Zil & Ders Saatleri
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Dersler 40 dakika, teneffüsler 10 dakika (7. ders sonrası 5 dk), öğle arası 40 dakikadır (12:50 - 13:30). Giriş: 08:50, Çıkış: 15:45.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CLASS_PERIODS.map(period => (
              <div key={period.period} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                    {period.period}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {period.label}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {period.startTime} - {period.endTime} (40 dk)
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
                    {period.breakLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Öğrencilerin ilk ders başlamadan en geç 08:45'te okul bahçesinde ve dersliklerinde hazır olmaları gerekmektedir.</span>
          </div>
        </div>
      )}

      {/* VIEW 4: TEACHER DUTY ROSTER (Haftalık Nöbet Çizelgesi) */}
      {viewType === 'duty' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Haftalık Öğretmen Nöbet Çizelgesi
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Öğretmenlerin kat ve bahçe nöbet görev dağılımı.
            </p>
          </div>

          {DEFAULT_DUTY_ROSTER.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEFAULT_DUTY_ROSTER.map(duty => {
                const dayObj = DAYS_CONFIG.find(d => d.key === duty.day);
                return (
                  <div key={duty.day} className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/80 px-2.5 py-1 rounded-lg">
                        {dayObj?.label}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {duty.shift}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                        Nöbetçi Öğretmen
                      </span>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {duty.teacherName}
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                        Nöbet Yeri / Görev Alanı
                      </span>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        {duty.location}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center rounded-3xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/80">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Tanımlı Nöbet Çizelgesi Bulunmuyor</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Haftalık öğretmen nöbet görev dağılımı okul yönetimi tarafından belirlendiğinde burada listelenecektir.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Detail & Edit Modal */}
      <ScheduleSlotModal
        slot={selectedSlot}
        isOpen={isSlotModalOpen}
        onClose={() => {
          setIsSlotModalOpen(false);
          refreshSchedules();
        }}
        currentUser={currentUser}
        onSave={() => refreshSchedules()}
        onDelete={() => refreshSchedules()}
      />

      {/* Printable Schedule Modal */}
      <SchedulePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Haftalık Ders Programı"
        subtitle="2026 - 2027 Eğitim Öğretim Yılı"
        slots={filteredSlots}
        targetName={filterMode === 'class' ? `${selectedClass} Sınıfı` : (selectedTeacher || 'Öğretmen Programı')}
      />

      {/* Schedule Clone Modal for Admin */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Şube Programını Kopyala</h3>
                  <p className="text-xs text-slate-500">Mevcut bir şubenin tüm ders planını başka bir şubeye aktarın.</p>
                </div>
              </div>
              <button onClick={() => setIsCloneModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteClone} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Kaynak Şube (Kopyalanacak)</label>
                <select
                  value={cloneSourceClass}
                  onChange={(e) => setCloneSourceClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                >
                  {['9-A', '10-A', '10-B', '11-A', '11-B', '12-A'].map(cls => (
                    <option key={cls} value={cls}>{cls} Şubesi</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center text-slate-400">
                <ArrowRight className="w-5 h-5 rotate-90 sm:rotate-0" />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Hedef Şube (Aktarılacak)</label>
                <select
                  value={cloneTargetClass}
                  onChange={(e) => setCloneTargetClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-indigo-600 dark:text-indigo-400"
                >
                  {['9-A', '10-A', '10-B', '11-A', '11-B', '12-A'].map(cls => (
                    <option key={cls} value={cls}>{cls} Şubesi</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Hedef şubedeki mevcut haftalık program temizlenerek kaynak şubenin tüm dersleri kopyalanacaktır.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  Kopyalamayı Başlat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
