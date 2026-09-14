import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { UserProfile, GradeRecord, AttendanceRecord, Homework, HomeworkSubmission, Announcement } from '../../types';
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
  ExternalLink
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
  const [internalTab, setInternalTab] = useState<'overview' | 'grades' | 'attendance' | 'homeworks' | 'schedule' | 'announcements'>('overview');
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const activeTab = (controlledTab as any) || internalTab;
  const setActiveTab = (tab: 'overview' | 'grades' | 'attendance' | 'homeworks' | 'schedule' | 'announcements') => {
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
              <Calendar className="w-4 h-4" />
              <span>Haftalık Ders Programı</span>
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
        </>
      )}
    </div>
  );
};
