import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  BookOpen, 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  ShieldCheck, 
  Menu,
  School,
  LogIn,
  UserPlus,
  Users
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { NotificationItem } from '../types';

interface NavbarProps {
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
  onToggleMobileSidebar?: () => void;
  currentSectionTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenAuthModal,
  onToggleMobileSidebar,
  currentSectionTitle
}) => {
  const { currentUser, logout, darkMode, toggleDarkMode } = useAuth();
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const notifications = currentUser 
    ? dataService.getNotificationsForUser(currentUser.uid, currentUser.classGrade)
    : [];
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    if (currentUser) {
      dataService.markAllNotificationsAsRead(currentUser.uid);
    }
  };

  const getRoleBadge = () => {
    if (!currentUser) return null;
    switch (currentUser.role) {
      case 'teacher':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 shadow-xs">
            <BookOpen className="w-3.5 h-3.5" />
            Öğretmen ({currentUser.branch || 'Eğitmen'})
          </span>
        );
      case 'student':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shadow-xs">
            <GraduationCap className="w-3.5 h-3.5" />
            Öğrenci {currentUser.classGrade && `(${currentUser.classGrade})`} - No: {currentUser.schoolNumber}
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            Okul Yönetimi
          </span>
        );
      case 'parent':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 shadow-xs">
            <Users className="w-3.5 h-3.5" />
            Veli Portalı {currentUser.studentNumbers?.length ? `(${currentUser.studentNumbers.length} Öğrenci)` : ''}
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left section: Hamburger for mobile + Brand / Section breadcrumb */}
          <div className="flex items-center gap-3">
            {currentUser && onToggleMobileSidebar && (
              <button
                onClick={onToggleMobileSidebar}
                className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition cursor-pointer"
                aria-label="Menüyü Aç"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {!currentUser ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">
                      GNSİAL OYS
                    </span>
                    <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-200 dark:border-indigo-800">
                      Resmi Okul Portalı
                    </span>
                  </div>
                  <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400">
                    Gaziemir Nevvar Salih İşgören Anadolu Lisesi
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 hidden sm:inline">
                  {currentUser.role === 'teacher' ? 'Öğretmen Portalı' : currentUser.role === 'student' ? 'Öğrenci Portalı' : currentUser.role === 'parent' ? 'Veli Portalı' : 'Yönetim Portalı'}
                </span>
                {currentSectionTitle && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {currentSectionTitle}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Center Info / Role Badge */}
          <div className="hidden xl:flex items-center gap-2">
            {getRoleBadge()}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Dark/Light Mode Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title={darkMode ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç'}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notification Bell (if logged in) */}
            {currentUser && (
              <div className="relative">
                <button
                  id="notifications-toggle-btn"
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative cursor-pointer"
                  title="Bildirimler"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifMenu && (
                  <div 
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Bildirimler</h4>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {unreadCount} yeni
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Tümünü Okundu İşaretle
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Henüz bir bildiriminiz bulunmuyor.
                        </div>
                      ) : (
                        notifications.map((n: NotificationItem) => (
                          <div 
                            key={n.id} 
                            className={`p-3.5 text-xs transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                              !n.read ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-slate-900 dark:text-white text-xs">{n.title}</p>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Şimdi'}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1 leading-snug">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If logged in: User Profile avatar / logout. If not: Login/Register buttons */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                    {currentUser.displayName.charAt(0)}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {currentUser.displayName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {currentUser.role === 'teacher' 
                        ? `${currentUser.branch || 'Öğretmen'}`
                        : currentUser.role === 'student'
                        ? `${currentUser.classGrade || 'Öğrenci'} #${currentUser.schoolNumber || ''}`
                        : 'Yönetici'}
                    </p>
                  </div>
                </div>

                <button
                  id="navbar-logout-btn"
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                  title="Oturumu Kapat"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="navbar-login-button"
                  onClick={() => onOpenAuthModal?.('login')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                  Giriş Yap
                </button>
                <button
                  id="navbar-register-button"
                  onClick={() => onOpenAuthModal?.('register')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Kayıt Ol
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </header>
  );
};
