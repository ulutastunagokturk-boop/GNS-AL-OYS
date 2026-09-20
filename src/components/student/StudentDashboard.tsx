import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { StudentHomeworks } from './StudentHomeworks';
import { StudentGrades } from './StudentGrades';
import { StudentAttendance } from './StudentAttendance';
import { StudentAnnouncements } from './StudentAnnouncements';
import { WeeklyScheduleView } from '../schedule/WeeklyScheduleView';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  UserCheck, 
  Megaphone, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Calendar
} from 'lucide-react';

interface StudentDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: 'schedule' | 'homeworks' | 'grades' | 'attendance' | 'announcements') => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  activeTab: controlledTab,
  onTabChange
}) => {
  const { currentUser } = useAuth();
  const [internalTab, setInternalTab] = useState<'schedule' | 'homeworks' | 'grades' | 'attendance' | 'announcements'>('homeworks');
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = dataService.subscribe(() => setTick(t => t + 1));
    return unsub;
  }, []);

  const activeTab = (controlledTab as any) || internalTab;
  const setActiveTab = (tab: 'schedule' | 'homeworks' | 'grades' | 'attendance' | 'announcements') => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  if (!currentUser) return null;

  const homeworks = dataService.getHomeworksForStudent(currentUser.classGrade, currentUser.uid);
  const submissions = dataService.getSubmissionsForStudent(currentUser.uid);
  const grades = dataService.getGradesForStudent(currentUser.uid);
  const attendanceRecords = dataService.getAttendanceForStudent(currentUser.uid);
  const announcements = dataService.getAnnouncementsForStudent(currentUser.classGrade);

  // Metrics
  const pendingHomeworkCount = homeworks.filter(hw => {
    const sub = submissions.find(s => s.homeworkId === hw.id);
    return !sub || sub.status === 'pending' || sub.status === 'not_completed';
  }).length;

  const totalScore = grades.reduce((acc, g) => acc + g.score, 0);
  const overallAvg = grades.length > 0 ? (totalScore / grades.length).toFixed(1) : '-';

  const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
  const remainingAbsentQuota = Math.max(0, 10 - absentDays);

  return (
    <div className="space-y-6">

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 text-emerald-300">
                Öğrenci Bilgi Sistemi (ÖBS)
              </span>
              <span className="text-xs text-emerald-200">
                Sınıf: {currentUser.classGrade} • Okul No: #{currentUser.schoolNumber}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Merhaba, {currentUser.displayName} 👋
            </h1>
            <p className="text-sm text-emerald-100/80 mt-1 max-w-xl">
              Ödevlerinizi teslim edebilir, sınav ve deneme notlarınızı inceleyebilir, devamsızlık durumunuzu takip edebilirsiniz.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/15 text-center min-w-[100px]">
              <span className="text-[11px] text-emerald-200 font-medium block">Bekleyen Ödev</span>
              <span className="text-xl sm:text-2xl font-black text-amber-300">{pendingHomeworkCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/15 text-center min-w-[100px]">
              <span className="text-[11px] text-emerald-200 font-medium block">Not Ortalaması</span>
              <span className="text-xl sm:text-2xl font-black text-white">{overallAvg}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/15 text-center min-w-[100px]">
              <span className="text-[11px] text-emerald-200 font-medium block">Kalan İzin Hakkı</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300">{remainingAbsentQuota} Gün</span>
            </div>
          </div>
        </div>

        {/* Decorative highlights */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl"></div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        <button
          id="student-tab-schedule"
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'schedule'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Ders Saatleri
        </button>

        <button
          id="student-tab-homeworks"
          onClick={() => setActiveTab('homeworks')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'homeworks'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Ödevlerim ({homeworks.length})
        </button>

        <button
          id="student-tab-grades"
          onClick={() => setActiveTab('grades')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'grades'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Sınav & Deneme Notlarım ({grades.length})
        </button>

        <button
          id="student-tab-attendance"
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'attendance'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Devamsızlık Durumum ({absentDays} Gün)
        </button>

        <button
          id="student-tab-announcements"
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'announcements'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Okul Duyuruları ({announcements.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'schedule' && <WeeklyScheduleView />}
      {activeTab === 'homeworks' && <StudentHomeworks />}
      {activeTab === 'grades' && <StudentGrades />}
      {activeTab === 'attendance' && <StudentAttendance />}
      {activeTab === 'announcements' && <StudentAnnouncements />}

    </div>
  );
};
