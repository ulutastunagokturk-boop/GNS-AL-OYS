import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/auth/AuthModal';
import { LoginPage } from './components/auth/LoginPage';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AchievementsView } from './components/achievements/AchievementsView';
import { WeeklyScheduleView } from './components/schedule/WeeklyScheduleView';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  UserCheck, 
  Megaphone, 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  Users, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  School,
  BarChart3,
  Calendar,
  Layers,
  Lock,
  MessageSquare,
  Trophy
} from 'lucide-react';

const MainContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('homeworks');

  // Reset default active tab on role switch
  useEffect(() => {
    if (currentUser?.role === 'teacher') {
      setActiveTab('homeworks');
    } else if (currentUser?.role === 'student') {
      setActiveTab('homeworks');
    } else if (currentUser?.role === 'admin') {
      setActiveTab('overview');
    }
  }, [currentUser?.role]);

  // Section title calculation
  const getSectionTitle = () => {
    if (!currentUser) {
      if (activeTab === 'schedule') return 'Haftalık Ders Programı & Çizelge';
      return undefined;
    }
    if (currentUser.role === 'teacher') {
      switch (activeTab) {
        case 'schedule': return 'Haftalık Ders Programı & Nöbet Çizelgesi';
        case 'homeworks': return 'Ödev Yönetimi & Takip Raporu';
        case 'grades': return 'Sınav & Deneme Notu Girişi';
        case 'attendance': return 'E-Yoklama & Devamsızlık Takibi';
        case 'announcements': return 'Okul ve Sınıf Duyuruları';
        case 'students': return 'Öğrenci & Şube Listesi';
        case 'achievements': return 'Öğrenci Başarı & Rozet Sistemi';
        default: return 'Öğretmen Paneli';
      }
    }
    if (currentUser.role === 'student') {
      switch (activeTab) {
        case 'schedule': return 'Haftalık Ders Programı & Zil Çizelgesi';
        case 'homeworks': return 'Ödevlerim & Teslim Modülü';
        case 'grades': return 'Sınav & Deneme Notlarım';
        case 'attendance': return 'Devamsızlık Durumum & Yoklama';
        case 'announcements': return 'Okul Duyuruları Panosu';
        case 'achievements': return 'Başarılarım & Rozetler';
        default: return 'Öğrenci Paneli';
      }
    }
    if (currentUser.role === 'admin') {
      switch (activeTab) {
        case 'schedule': return 'Haftalık Ders Programı Dağılımı & Çizelge';
        case 'overview': return 'Okul İstatistikleri & Özet';
        case 'homeworks': return 'Ödev Yönetimi & Takip (Yönetici Paneli)';
        case 'grades': return 'Sınav & Deneme Notu Girişi (Yönetici Paneli)';
        case 'announcements': return 'Okul ve Sınıf Duyuru Yönetimi (Yönetici Paneli)';
        case 'users': return 'Kullanıcı & Rol Yönetimi';
        case 'parents': return 'Veli Yönetimi & Excel Toplu Aktarım';
        case 'roles': return 'Firestore Rol & Yetki Atamaları';
        case 'classes': return 'Sınıf & Şube Yapısı';
        case 'backup': return 'Supabase PostgreSQL Yedekleme & RLS Güvenliği';
        case 'system': return 'Geliştirici & Sistem Ayarları';
        case 'achievements': return 'Öğrenci Başarı & Gamification';
        default: return 'Yönetim Paneli';
      }
    }
    return undefined;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Sidebar (when logged in) */}
      {currentUser && (
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenAuthModal={(mode) => setAuthModalMode(mode)}
        />
      )}

      {/* Main Container Wrapper (Offset for sidebar on desktop if logged in) */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${currentUser ? 'lg:pl-72' : ''}`}>
        
        {/* Top Navbar */}
        <Navbar 
          onOpenAuthModal={(mode) => setAuthModalMode(mode)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          currentSectionTitle={getSectionTitle()}
        />

        {/* Dynamic Page Viewport */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {currentUser ? (
            <div>
              {activeTab === 'achievements' && <AchievementsView />}
              {activeTab !== 'achievements' && (
                <>
                  {currentUser.role === 'teacher' && (
                    activeTab === 'schedule' ? (
                      <WeeklyScheduleView />
                    ) : (
                      <TeacherDashboard 
                        activeTab={activeTab} 
                        onTabChange={(tab) => setActiveTab(tab)} 
                      />
                    )
                  )}
                  {currentUser.role === 'student' && (
                    activeTab === 'schedule' ? (
                      <WeeklyScheduleView />
                    ) : (
                      <StudentDashboard 
                        activeTab={activeTab} 
                        onTabChange={(tab) => setActiveTab(tab)} 
                      />
                    )
                  )}
                  {currentUser.role === 'parent' && (
                    <ParentDashboard 
                      activeTab={activeTab} 
                      onTabChange={(tab) => setActiveTab(tab)} 
                    />
                  )}
                  {currentUser.role === 'admin' && (
                    ['homeworks', 'grades', 'announcements', 'attendance', 'students'].includes(activeTab) ? (
                      <TeacherDashboard 
                        activeTab={activeTab} 
                        onTabChange={(tab) => setActiveTab(tab)} 
                      />
                    ) : (
                      <AdminDashboard 
                        activeTab={activeTab} 
                        onTabChange={(tab) => setActiveTab(tab)} 
                      />
                    )
                  )}
                </>
              )}
            </div>
          ) : (
            /* Not logged in: Default directly to the Full Login & Register Portal Screen */
            activeTab === 'schedule' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab('portal-home')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    ← Giriş Sayfasına Dön
                  </button>
                  <button
                    onClick={() => setAuthModalMode('login')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
                  >
                    Giriş Yap
                  </button>
                </div>
                <WeeklyScheduleView />
              </div>
            ) : (
              <LoginPage 
                onViewSchedule={() => setActiveTab('schedule')} 
              />
            )
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-6 px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                G
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                GNSİAL Okul Yönetim Sistemi
              </span>
              <span>• Gaziemir Nevvar Salih İşgören Anadolu Lisesi</span>
            </div>

            <div className="flex items-center gap-4">
              <span>Rol Tabanlı Yetkilendirme (RBAC)</span>
              <span>•</span>
              <span>Firebase Cloud Veritabanı</span>
            </div>
          </div>
        </footer>

      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalMode !== null}
        onClose={() => setAuthModalMode(null)}
      />

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
