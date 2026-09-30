import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { UserProfile, GradeRecord, AttendanceRecord, Homework, HomeworkSubmission, Announcement, NotificationItem } from '../../types';
import { WeeklyScheduleView } from '../schedule/WeeklyScheduleView';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  UserCheck, 
  Megaphone, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Calendar,
  Heart,
  Users,
  Shield,
  FileText,
  AlertCircle,
  Phone,
  Mail,
  ChevronRight,
  TrendingUp,
  Paperclip,
  Download,
  ExternalLink,
  Bell,
  BellRing,
  CheckCheck,
  Search,
  Filter,
  Info
} from 'lucide-react';

interface ParentDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  activeTab: controlledTab,
  onTabChange
}) => {
  const { currentUser } = useAuth();
  const [internalTab, setInternalTab] = useState<'overview' | 'grades' | 'attendance' | 'homeworks' | 'schedule' | 'announcements' | 'notifications'>('overview');
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const activeTab = (controlledTab as any) || internalTab;
  const setActiveTab = (tab: 'overview' | 'grades' | 'attendance' | 'homeworks' | 'schedule' | 'announcements' | 'notifications') => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  if (!currentUser) return null;

  // Retrieve all students belonging to this parent
  const myChildren = dataService.getStudentsForParent(currentUser);

  // Set default selected child
  useEffect(() => {
    if (myChildren.length > 0 && (!selectedChildId || !myChildren.some(c => c.uid === selectedChildId))) {
      setSelectedChildId(myChildren[0].uid);
    }
  }, [myChildren, selectedChildId]);

  const activeChild = myChildren.find(c => c.uid === selectedChildId) || myChildren[0];

  // Real-time parent notifications (Duyuru & Devamsızlık)
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => 
    currentUser ? dataService.getNotificationsForParent(currentUser) : []
  );
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'announcement' | 'attendance' | 'unread'>('all');
  const [notificationSearch, setNotificationSearch] = useState<string>('');

  // Subscribe to real-time updates from dataService (SSE & Firestore)
  useEffect(() => {
    if (!currentUser) return;
    const handleUpdate = () => {
      setNotifications(dataService.getNotificationsForParent(currentUser));
    };
    handleUpdate();
    const unsubscribe = dataService.subscribe(handleUpdate);
    return () => unsubscribe();
  }, [currentUser]);

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  // Specific data for the active child
  const grades: GradeRecord[] = activeChild ? dataService.getGradesForStudent(activeChild.uid) : [];
  const attendanceRecords: AttendanceRecord[] = activeChild ? dataService.getAttendanceForStudent(activeChild.uid) : [];
  const homeworks: Homework[] = activeChild ? dataService.getHomeworksForStudent(activeChild.classGrade, activeChild.uid) : [];
  const submissions: HomeworkSubmission[] = activeChild ? dataService.getSubmissionsForStudent(activeChild.uid) : [];
  const announcements: Announcement[] = activeChild?.classGrade 
    ? dataService.getAnnouncementsForStudent(activeChild.classGrade) 
    : dataService.getAnnouncementsForParent(myChildren.map(c => c.classGrade).filter(Boolean) as string[]);

  // Academic calculations
  const gpa = grades.length > 0
    ? Math.round(grades.reduce((acc, g) => acc + (g.score || 0), 0) / grades.length)
    : null;

  const unexcusedAbsenceDays = attendanceRecords.filter(a => a.status === 'absent').length;
  const excusedAbsenceDays = attendanceRecords.filter(a => a.status === 'excused').length;
  const totalAbsenceDays = unexcusedAbsenceDays + excusedAbsenceDays;

  // MEB legal absence limit in Turkish High Schools: 10 days unexcused, 30 days total
  const remainingUnexcusedDays = Math.max(0, 10 - unexcusedAbsenceDays);

  // Homework stats
  const pendingHomeworks = homeworks.filter(hw => {
    const sub = submissions.find(s => s.homeworkId === hw.id);
    return !sub || sub.status === 'pending' || sub.status === 'not_completed';
  });

  const completedHomeworksCount = submissions.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Child Switcher Bar */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-7 border border-indigo-500/20 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wide">
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span>GNSİAL Veli Bilgilendirme Portalı</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Hoş Geldiniz, {currentUser.displayName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Öğrencinizin okul başarısı, notları, devamsızlık durumu ve ödevlerini buradan güvenle takip edebilirsiniz.
            </p>
          </div>

          {/* Children Selector if parent has multiple students */}
          {myChildren.length > 1 && (
            <div className="bg-slate-900/80 backdrop-blur-md p-2 rounded-2xl border border-slate-700/80 flex items-center gap-2 self-start md:self-center">
              <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Öğrenci:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {myChildren.map(child => (
                  <button
                    key={child.uid}
                    onClick={() => setSelectedChildId(child.uid)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeChild?.uid === child.uid
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{child.displayName}</span>
                    <span className="text-[10px] opacity-75">({child.classGrade || child.schoolNumber})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* If no child is associated yet */}
      {!activeChild ? (
        <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Henüz Hesabınıza İlişkilendirilmiş Öğrenci Bulunmuyor
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Okul idaremiz ile iletişime geçerek veli telefon numaranızı veya e-posta adresinizi öğrencinizin kaydına bağlatabilirsiniz.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Active Child Mini Identity Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg border border-indigo-200 dark:border-indigo-800">
                {activeChild.displayName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {activeChild.displayName}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    {activeChild.classGrade} Şubesi
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Okul No: <strong className="text-slate-700 dark:text-slate-300 font-mono">{activeChild.schoolNumber || 'Belirtilmedi'}</strong> &bull; Seviye: <strong>{activeChild.level || 1}</strong> &bull; Başarı XP: <strong>{activeChild.totalXp || 100}</strong>
                </p>
              </div>
            </div>

            {/* Quick Summary Pill Badges */}
            <div className="flex items-center gap-2 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 block font-semibold">Genel Ortalama</span>
                <span className="font-black text-slate-900 dark:text-white text-sm">
                  {gpa !== null ? `${gpa} / 100` : 'Not girilmedi'}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 block font-semibold">Özürsüz Devamsızlık</span>
                <span className={`font-black text-sm ${unexcusedAbsenceDays >= 8 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                  {unexcusedAbsenceDays} gün
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation Controls */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Öğrenci Özeti</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Bildirim Merkezi</span>
              {unreadNotifsCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse">
                  {unreadNotifsCount}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  {notifications.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('grades')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'grades'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Ders Notları & Sınavlar</span>
              {grades.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
                  {grades.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Devamsızlık Takibi</span>
              {totalAbsenceDays > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
                  {totalAbsenceDays} gün
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('homeworks')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'homeworks'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Ödev & Görevler</span>
              {pendingHomeworks.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-900 font-black">
                  {pendingHomeworks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Ders Saatleri</span>
            </button>

            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Okul Duyuruları</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Academic Standing */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    Genel Başarı Ortalaması
                  </span>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">
                    {gpa !== null ? `${gpa}` : '-'}
                    {gpa !== null && <span className="text-sm font-normal text-slate-400"> / 100</span>}
                  </p>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {gpa !== null ? (
                      gpa >= 85 ? '🌟 Takdir Belgesi Seviyesinde' :
                      gpa >= 70 ? '🎖️ Teşekkür Belgesi Seviyesinde' :
                      gpa >= 50 ? '✔️ Geçer Not Seviyesinde' :
                      '⚠️ Takviye Gerektiren Durum'
                    ) : 'Henüz sınav notu girilmedi'}
                  </p>
                </div>

                {/* Absence Warning Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-500" />
                    Devamsızlık Durumu
                  </span>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">
                    {totalAbsenceDays}
                    <span className="text-sm font-normal text-slate-400"> gün</span>
                  </p>
                  <p className={`text-xs font-semibold ${unexcusedAbsenceDays >= 8 ? 'text-rose-500' : 'text-slate-500'}`}>
                    Özürsüz: {unexcusedAbsenceDays} gün &bull; Kalan MEB Hakkı: <strong>{remainingUnexcusedDays} gün</strong>
                  </p>
                </div>

                {/* Homework Tracking */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    Ödev Takibi
                  </span>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">
                    {pendingHomeworks.length}
                    <span className="text-sm font-normal text-slate-400"> bekleyen</span>
                  </p>
                  <p className="text-xs text-slate-400 font-semibold">
                    Toplam {homeworks.length} ödevden {completedHomeworksCount} tanesi teslim edildi.
                  </p>
                </div>

                {/* Class Advisor */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Sınıf Rehberliği
                  </span>
                  <p className="text-base font-black text-slate-900 dark:text-white truncate">
                    {activeChild.classGrade} Şubesi
                  </p>
                  <p className="text-xs text-slate-400">
                    Sınıf Danışman Öğretmeni ve Okul Rehberlik Servisi aktif devrededir.
                  </p>
                </div>
              </div>

              {/* Recent Grades Snapshot */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      Son Sınav & Değerlendirme Notları
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('grades')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Tüm Notları Gör</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {grades.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {grades.slice(-6).map((g, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">{g.subject}</span>
                          <span className="text-[11px] text-slate-400">{g.examType}</span>
                        </div>
                        <span className={`text-xl font-black px-3 py-1 rounded-xl ${
                          g.score >= 85 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          g.score >= 70 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                          g.score >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {g.score}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    Henüz sisteme girilmiş bir sınav veya performans notu bulunmuyor.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GRADES */}
          {activeTab === 'grades' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {activeChild.displayName} &mdash; Tüm Ders Notları
                  </h3>
                  <p className="text-xs text-slate-500">
                    1. ve 2. dönem yazılı sınavları, proje ve performans puanları.
                  </p>
                </div>
                {gpa !== null && (
                  <div className="px-4 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-right">
                    <span className="text-[10px] uppercase font-bold block opacity-75">Genel Ortalama</span>
                    <span className="text-lg font-black">{gpa} / 100</span>
                  </div>
                )}
              </div>

              {grades.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-3">Ders Adı</th>
                        <th className="py-3 px-3">Sınav / Değerlendirme Türü</th>
                        <th className="py-3 px-3">Tarih</th>
                        <th className="py-3 px-3 text-right">Puan (100 Üzerinden)</th>
                        <th className="py-3 px-3 text-right">Başarı Durumu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {grades.map((g, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{g.subject}</td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{g.examType}</td>
                          <td className="py-3 px-3 text-slate-400">{g.examDate || '-'}</td>
                          <td className="py-3 px-3 text-right font-mono font-black text-sm text-slate-900 dark:text-white">
                            {g.score}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              g.score >= 85 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                              g.score >= 70 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                              g.score >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {g.score >= 85 ? 'Pekiyi' : g.score >= 70 ? 'İyi' : g.score >= 50 ? 'Geçer' : 'Kaldı'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  Bu öğrenci için henüz not kaydı girilmemiştir.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Devamsızlık Çizelgesi & MEB Yasal Limit Takibi
                </h3>
                <p className="text-xs text-slate-500">
                  MEB mevzuatına göre özürsüz 10 gün, toplamda 30 gün devamsızlık hakkı bulunmaktadır.
                </p>
              </div>

              {/* Limit warning pill */}
              <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                unexcusedAbsenceDays >= 8 
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200' 
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>
                    Öğrencinizin toplam <strong>{totalAbsenceDays} gün</strong> devamsızlığı bulunmaktadır 
                    (Özürsüz: <strong>{unexcusedAbsenceDays} gün</strong>, İzinli/Raporlu: <strong>{excusedAbsenceDays} gün</strong>).
                  </span>
                </div>
                <span className="font-black shrink-0">
                  Kalan Özürsüz Hak: {remainingUnexcusedDays} gün
                </span>
              </div>

              {attendanceRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-3">Tarih</th>
                        <th className="py-3 px-3">Şube</th>
                        <th className="py-3 px-3 text-right">Yoklama Durumu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {attendanceRecords.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{item.date}</td>
                          <td className="py-3 px-3 text-slate-500">{activeChild.classGrade}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              item.status === 'present' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                              item.status === 'excused' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                              item.status === 'late' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {item.status === 'present' ? 'Derste Var' :
                               item.status === 'excused' ? 'İzinli / Raporlu (Özürlü)' :
                               item.status === 'late' ? 'Geç Kaldı' :
                               'Gelmedi (Özürsüz)'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  Kayıtlı herhangi bir devamsızlık bulunmamaktadır (Tüm derslere tam katılım).
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HOMEWORKS */}
          {activeTab === 'homeworks' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Ödev ve Performans Görevleri Takibi
                </h3>
                <p className="text-xs text-slate-500">
                  {activeChild.classGrade} sınıfına atanmış tüm ödevler ve teslim durumları.
                </p>
              </div>

              {homeworks.length > 0 ? (
                <div className="space-y-3">
                  {homeworks.map(hw => {
                    const sub = submissions.find(s => s.homeworkId === hw.id);
                    const isSubmitted = sub && (sub.status === 'completed' || sub.status === 'pending');

                    return (
                      <div key={hw.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                              {hw.subject}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{hw.title}</h4>
                          </div>
                          <p className="text-xs text-slate-500">{hw.description}</p>
                          
                          {/* Attachments if any */}
                          {hw.attachments && hw.attachments.length > 0 && (
                            <div className="pt-1 flex flex-wrap gap-2">
                              {hw.attachments.map(att => (
                                <a
                                  key={att.id}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={att.name}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition border border-indigo-200/50 dark:border-indigo-800/50"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  <span className="font-semibold max-w-[180px] truncate">{att.name}</span>
                                  {att.size && <span className="text-[10px] text-indigo-400">({att.size})</span>}
                                </a>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                            <span>Öğretmen: <strong>{hw.teacherName}</strong></span>
                            <span>&bull;</span>
                            <span>Son Teslim: <strong>{hw.dueDate} {hw.dueTime || ''}</strong></span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {isSubmitted ? (
                            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Teslim Edildi {sub.score !== undefined && `(${sub.score} Puan)`}</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              <span>Bekliyor</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  Şu an için atanmış bekleyen bir ödev bulunmamaktadır.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: WEEKLY SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <WeeklyScheduleView initialClass={activeChild.classGrade} />
            </div>
          )}

          {/* TAB 6: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Okul & İdare Duyuruları
                </h3>
                <p className="text-xs text-slate-500">
                  Velilerimizi ve öğrencilerimizi ilgilendiren resmi duyurular.
                </p>
              </div>

              {announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map(item => (
                    <div key={item.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.priority === 'urgent' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                          item.priority === 'important' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {item.priority === 'urgent' ? 'Acil Duyuru' : item.priority === 'important' ? 'Önemli' : 'Genel Duyuru'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{item.content}</p>
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-400">
                        Yayınlayan: <strong>{item.authorName}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  Şu an için yayınlanmış duyuru bulunmuyor.
                </div>
              )}
            </div>
          )}

          {/* TAB 7: BİLDİRİM MERKEZİ (GERÇEK ZAMANLI DUYURU & DEVAMSIZLIK MERKEZİ) */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              
              {/* Header Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shadow-xs">
                      <BellRing className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg text-slate-900 dark:text-white">
                          Veli Bildirim Merkezi
                        </h3>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Canlı Akış
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Öğretmenlerinizden ve okul idaresinden gelen anlık duyurular ve devamsızlık bildirimleri.
                      </p>
                    </div>
                  </div>

                  {unreadNotifsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => dataService.markAllParentNotificationsAsRead(currentUser)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-center"
                    >
                      <CheckCheck className="w-4 h-4 text-emerald-600" />
                      <span>Tümünü Okundu İşaretle</span>
                    </button>
                  )}
                </div>

                {/* Metric Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 block">Toplam Bildirim</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
                      {notifications.length}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-rose-500 block">Okunmamış</span>
                    <span className={`text-xl font-black mt-0.5 block ${unreadNotifsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                      {unreadNotifsCount}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-amber-500 block flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> Devamsızlık
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
                      {notifications.filter(n => n.type === 'attendance').length}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-indigo-500 block flex items-center gap-1">
                      <Megaphone className="w-3.5 h-3.5" /> Duyurular
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
                      {notifications.filter(n => n.type === 'announcement').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setNotificationFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      notificationFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    Tümü ({notifications.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotificationFilter('attendance')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      notificationFilter === 'attendance'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Devamsızlık ({notifications.filter(n => n.type === 'attendance').length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotificationFilter('announcement')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      notificationFilter === 'announcement'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>Duyurular ({notifications.filter(n => n.type === 'announcement').length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotificationFilter('unread')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      notificationFilter === 'unread'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span>Okunmamış ({unreadNotifsCount})</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Bildirimlerde ara..."
                    value={notificationSearch}
                    onChange={(e) => setNotificationSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Notification Cards List */}
              {(() => {
                const list = notifications.filter(n => {
                  if (notificationFilter === 'announcement' && n.type !== 'announcement') return false;
                  if (notificationFilter === 'attendance' && n.type !== 'attendance') return false;
                  if (notificationFilter === 'unread' && n.read) return false;

                  if (notificationSearch.trim()) {
                    const q = notificationSearch.toLowerCase().trim();
                    const matchesTitle = (n.title || '').toLowerCase().includes(q);
                    const matchesMsg = (n.message || '').toLowerCase().includes(q);
                    const matchesActor = (n.actorName || '').toLowerCase().includes(q);
                    if (!matchesTitle && !matchesMsg && !matchesActor) return false;
                  }
                  return true;
                });

                if (list.length === 0) {
                  return (
                    <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        <Bell className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                          Filtreye Uygun Bildirim Bulunmuyor
                        </h4>
                        <p className="text-xs text-slate-400">
                          Öğretmenlerinizden veya okul idaresinden yeni bir duyuru ya da devamsızlık girildiğinde burada anında görüntülenecektir.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {list.map(notif => {
                      const isAttendance = notif.type === 'attendance';
                      const isAnnouncement = notif.type === 'announcement';

                      return (
                        <div
                          key={notif.id}
                          className={`p-5 rounded-3xl border transition shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                            !notif.read
                              ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/80 ring-1 ring-indigo-500/10'
                              : 'bg-white/80 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isAttendance
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            }`}>
                              {isAttendance ? (
                                <UserCheck className="w-5 h-5 text-amber-600" />
                              ) : (
                                <Megaphone className="w-5 h-5 text-indigo-600" />
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isAttendance
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                }`}>
                                  {isAttendance ? 'Devamsızlık Bildirimi' : 'Okul Duyurusu'}
                                </span>

                                {!notif.read && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                                    Yeni
                                  </span>
                                )}

                                <span className="text-[11px] text-slate-400 font-mono">
                                  {new Date(notif.createdAt).toLocaleDateString('tr-TR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>

                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                                {notif.title}
                              </h4>

                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                {notif.message}
                              </p>

                              <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                                <span>
                                  Gönderen / İlgili: <strong className="text-slate-700 dark:text-slate-300">{notif.actorName || (isAttendance ? 'Ders Öğretmeni' : 'Okul Yönetimi')}</strong>
                                </span>
                                {isAttendance && (
                                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                                    &bull; MEB E-Yoklama kaydı güncellendi
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                            {isAttendance ? (
                              <button
                                type="button"
                                onClick={() => {
                                  dataService.markNotificationAsRead(notif.id, currentUser.uid);
                                  setActiveTab('attendance');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-amber-200 dark:border-amber-800"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Devamsızlık Takvimine Git</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  dataService.markNotificationAsRead(notif.id, currentUser.uid);
                                  setActiveTab('announcements');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-indigo-200 dark:border-indigo-800"
                              >
                                <Megaphone className="w-3.5 h-3.5" />
                                <span>Duyuruları Aç</span>
                              </button>
                            )}

                            {!notif.read && (
                              <button
                                type="button"
                                onClick={() => dataService.markNotificationAsRead(notif.id, currentUser.uid)}
                                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium underline cursor-pointer"
                              >
                                Okundu İşaretle
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>
          )}
        </>
      )}
    </div>
  );
};
