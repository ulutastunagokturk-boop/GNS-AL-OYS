import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { TeacherHomeworks } from './TeacherHomeworks';
import { TeacherGrades } from './TeacherGrades';
import { TeacherAttendance } from './TeacherAttendance';
import { TeacherAnnouncements } from './TeacherAnnouncements';
import { WeeklyScheduleView } from '../schedule/WeeklyScheduleView';
import { 
  BookOpen, 
  Award, 
  UserCheck, 
  Megaphone, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles
} from 'lucide-react';

interface TeacherDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: 'schedule' | 'homeworks' | 'grades' | 'attendance' | 'announcements' | 'students') => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  activeTab: controlledTab,
  onTabChange
}) => {
  const { currentUser } = useAuth();
  const [internalTab, setInternalTab] = useState<'schedule' | 'homeworks' | 'grades' | 'attendance' | 'announcements' | 'students'>('homeworks');

  const activeTab = (controlledTab as any) || internalTab;
  const setActiveTab = (tab: 'schedule' | 'homeworks' | 'grades' | 'attendance' | 'announcements' | 'students') => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const students = dataService.getStudents();
  const homeworks = dataService.getHomeworks();
  const classes = dataService.getClasses();
  const announcements = dataService.getAnnouncements();

  // Quick stats
  const totalHomeworks = homeworks.length;
  const myClasses = classes.slice(0, 4);

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Welcome Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-900/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase bg-white/20 backdrop-blur-sm border border-white/20">
                Öğretmen Yönetim Paneli
              </span>
              <span className="text-xs text-indigo-200">
                {currentUser?.branch} Branşı
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hoş Geldiniz, {currentUser?.displayName}
            </h1>
            <p className="text-sm text-indigo-200 mt-1 max-w-xl">
              Ödev takibi yapabilir, sınav ve deneme notlarını girebilir, günlük devamsızlık durumunu kaydedebilir ve duyurular yayınlayabilirsiniz.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/15 text-center min-w-[100px]">
              <span className="text-[11px] text-indigo-200 font-medium block">Aktif Öğrenci</span>
              <span className="text-xl sm:text-2xl font-black">{students.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/15 text-center min-w-[100px]">
              <span className="text-[11px] text-indigo-200 font-medium block">Aktif Ödev</span>
              <span className="text-xl sm:text-2xl font-black">{totalHomeworks}</span>
            </div>
          </div>
        </div>

        {/* Subtle decorative circles */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl"></div>
        <div className="absolute right-1/3 -top-10 w-40 h-40 rounded-full bg-indigo-500/15 blur-xl"></div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        <button
          id="teacher-tab-schedule"
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'schedule'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Ders Saatleri
        </button>

        <button
          id="teacher-tab-homeworks"
          onClick={() => setActiveTab('homeworks')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'homeworks'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Ödev Yönetimi & Takip Raporu
        </button>

        <button
          id="teacher-tab-grades"
          onClick={() => setActiveTab('grades')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'grades'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Sınav & Deneme Notu Girişi
        </button>

        <button
          id="teacher-tab-attendance"
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'attendance'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Devamsızlık Takibi (Yoklama)
        </button>

        <button
          id="teacher-tab-announcements"
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'announcements'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Okul Duyuruları ({announcements.length})
        </button>

        <button
          id="teacher-tab-students"
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'students'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Öğrenci Listesi ({students.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'schedule' && <WeeklyScheduleView />}
      {activeTab === 'homeworks' && <TeacherHomeworks />}
      {activeTab === 'grades' && <TeacherGrades />}
      {activeTab === 'attendance' && <TeacherAttendance />}
      {activeTab === 'announcements' && <TeacherAnnouncements />}
      {activeTab === 'students' && <TeacherStudentList />}

    </div>
  );
};

// SUB-COMPONENT: Quick Student Roster Search
const TeacherStudentList: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState('10-A');
  const [search, setSearch] = useState('');
  const classes = dataService.getClasses();
  const students = dataService.getStudentsByClass(selectedClass);

  const filtered = students.filter(s => 
    s.displayName.toLowerCase().includes(search.toLowerCase()) || 
    (s.schoolNumber && s.schoolNumber.includes(search))
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {selectedClass} Sınıfı Öğrenci Listesi
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Öğrenci numaraları, iletişim ve şube bilgileri
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {classes.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Öğrenci veya No ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="py-2 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4 w-24">Okul No</th>
              <th className="py-3 px-4">Ad Soyad</th>
              <th className="py-3 px-4">Sınıf</th>
              <th className="py-3 px-4">E-Posta</th>
              <th className="py-3 px-4">Telefon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filtered.map(st => (
              <tr key={st.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">#{st.schoolNumber}</td>
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{st.displayName}</td>
                <td className="py-3 px-4">{st.classGrade}</td>
                <td className="py-3 px-4 text-slate-500">{st.email}</td>
                <td className="py-3 px-4 text-slate-500">{st.phone || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
