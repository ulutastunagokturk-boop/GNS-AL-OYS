import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  UserCheck, 
  Megaphone, 
  Users, 
  ShieldCheck, 
  BarChart3, 
  School, 
  LogOut, 
  Sun, 
  Moon, 
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Layers,
  Calendar,
  Settings,
  MessageSquare,
  Trophy,
  Cpu,
  Database
} from 'lucide-react';
import { dataService } from '../services/dataService';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onOpenAuthModal
}) => {
  const { currentUser, role, logout, darkMode, toggleDarkMode } = useAuth();

  const homeworks = dataService.getHomeworks();
  const announcements = dataService.getAnnouncements();
  const users = dataService.getUsers();
  const students = dataService.getStudents();
  const classes = dataService.getClasses();

  // Navigation Items by Role
  const getNavItems = () => {
    if (!currentUser) {
      return [
        { id: 'portal-home', label: 'Portal Ana Sayfa', icon: School, badge: `${users.length} Kullanıcı` },
        { id: 'schedule', label: 'Haftalık Program', sublabel: 'Ders & Zil Saatleri', icon: Calendar, badge: '40 Saat' },
        { id: 'features', label: 'Sistem Özellikleri', icon: Sparkles }
      ];
    }

    if (currentUser.role === 'teacher') {
      return [
        { 
          id: 'schedule', 
          label: 'Haftalık Program', 
          sublabel: 'Ders & Nöbet Çizelgesi', 
          icon: Calendar, 
          badge: 'MEB',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
        },
        { 
          id: 'homeworks', 
          label: 'Ödev Yönetimi', 
          sublabel: 'Takip & Raporlama', 
          icon: BookOpen, 
          badge: `${homeworks.length}` 
        },
        { 
          id: 'grades', 
          label: 'Sınav & Deneme Notu', 
          sublabel: 'Not Girişi & Analiz', 
          icon: Award 
        },
        { 
          id: 'attendance', 
          label: 'Devamsızlık Takibi', 
          sublabel: 'E-Yoklama Modülü', 
          icon: UserCheck 
        },
        { 
          id: 'announcements', 
          label: 'Okul Duyuruları', 
          sublabel: 'Duyuru Yayınlama', 
          icon: Megaphone, 
          badge: `${announcements.length}` 
        },
        { 
          id: 'students', 
          label: 'Öğrenci Listesi', 
          sublabel: 'Şube & No Sorgu', 
          icon: Users, 
          badge: `${students.length}` 
        },
        { 
          id: 'chat', 
          label: 'Mesajlar & Sohbet', 
          sublabel: 'Öğrenci & Zümre', 
          icon: MessageSquare,
          badge: 'Canlı'
        },
        { 
          id: 'achievements', 
          label: 'Başarı & Rozet Sistemi', 
          sublabel: 'Öğrenci Gamification', 
          icon: Trophy,
          badge: 'XP'
        }
      ];
    }

    if (currentUser.role === 'student') {
      const studentHws = dataService.getHomeworksForStudent(currentUser.classGrade);
      const studentSubs = dataService.getSubmissionsForStudent(currentUser.uid);
      const pendingCount = studentHws.filter(hw => {
        const sub = studentSubs.find(s => s.homeworkId === hw.id);
        return !sub || sub.status === 'pending';
      }).length;

      const studentGrades = dataService.getGradesForStudent(currentUser.uid);

      return [
        { 
          id: 'schedule', 
          label: 'Haftalık Program', 
          sublabel: 'Ders & Zil Çizelgesi', 
          icon: Calendar, 
          badge: currentUser.classGrade || 'Program',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
        },
        { 
          id: 'homeworks', 
          label: 'Ödevlerim', 
          sublabel: 'Teslim & Durum', 
          icon: BookOpen, 
          badge: pendingCount > 0 ? `${pendingCount} Bekleyen` : '✓ Tamam',
          badgeColor: pendingCount > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        },
        { 
          id: 'grades', 
          label: 'Sınav Notlarım', 
          sublabel: 'Karne & Not Kartı', 
          icon: Award, 
          badge: `${studentGrades.length}` 
        },
        { 
          id: 'attendance', 
          label: 'Devamsızlık Durumu', 
          sublabel: 'İzin & Rapor Takibi', 
          icon: UserCheck 
        },
        { 
          id: 'announcements', 
          label: 'Okul Duyuruları', 
          sublabel: 'Güncel İlanlar', 
          icon: Megaphone, 
          badge: `${announcements.length}` 
        },
        { 
          id: 'chat', 
          label: 'Mesajlar & Sohbet', 
          sublabel: 'Öğretmen & Gruplar', 
          icon: MessageSquare,
          badge: 'Canlı'
        },
        { 
          id: 'achievements', 
          label: 'Başarı & Rozetlerim', 
          sublabel: `Seviye ${currentUser.level || 1} • Liderlik`, 
          icon: Trophy,
          badge: `${currentUser.totalXp || 100} XP`
        }
      ];
    }

    if (currentUser.role === 'parent') {
      const parentChildren = dataService.getStudentsForParent(currentUser);
      const childCount = parentChildren.length;
      return [
        {
          id: 'overview',
          label: 'Öğrenci Durum Özeti',
          sublabel: childCount > 1 ? `${childCount} Öğrenci Kayıtlı` : (parentChildren[0]?.displayName || 'Öğrenci'),
          icon: GraduationCap,
          badge: 'Veli'
        },
        {
          id: 'grades',
          label: 'Ders Notları & Sınavlar',
          sublabel: 'Yazılı & Performans',
          icon: Award
        },
        {
          id: 'attendance',
          label: 'Devamsızlık Takibi',
          sublabel: 'E-Yoklama Bilgileri',
          icon: UserCheck
        },
        {
          id: 'homeworks',
          label: 'Ödev & Görevler',
          sublabel: 'Öğretmen Takibi',
          icon: BookOpen
        },
        {
          id: 'schedule',
          label: 'Haftalık Ders Programı',
          sublabel: 'Ders Saatleri',
          icon: Calendar
        },
        {
          id: 'announcements',
          label: 'Okul Duyuruları',
          sublabel: 'İdare Bilgilendirme',
          icon: Megaphone,
          badge: `${announcements.length}`
        }
      ];
    }

    if (currentUser.role === 'admin') {
      return [
        { 
          id: 'schedule', 
          label: 'Haftalık Program', 
          sublabel: 'Ders Dağılım & Nöbet', 
          icon: Calendar, 
          badge: 'MEB',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
        },
        { 
          id: 'overview', 
          label: 'Okul İstatistikleri', 
          sublabel: 'Genel Özet & Grafikler', 
          icon: BarChart3 
        },
        { 
          id: 'users', 
          label: 'Kullanıcı Yönetimi', 
          sublabel: `${users.length} Kayıtlı Kullanıcı`, 
          icon: Users, 
          badge: `${users.length}` 
        },
        { 
          id: 'classes', 
          label: 'Sınıf & Şube Yapısı', 
          sublabel: `${classes.length} Aktif Şube`, 
          icon: School, 
          badge: `${classes.length}` 
        },
        { 
          id: 'backup', 
          label: 'Supabase Yedekleme', 
          sublabel: 'İkincil PostgreSQL Deposu', 
          icon: Database, 
          badge: 'Cloud',
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        },
        { 
          id: 'system', 
          label: 'Sistem & Yönetim Ayarları', 
          sublabel: 'Genel Yapılandırma', 
          icon: Cpu, 
          badge: 'Admin',
          badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
        },
        { 
          id: 'chat', 
          label: 'Okul Mesajlaşma', 
          sublabel: 'İletişim Hattı', 
          icon: MessageSquare 
        },
        { 
          id: 'achievements', 
          label: 'Başarı Sistemi', 
          sublabel: 'Rozetler & Sıralama', 
          icon: Trophy 
        }
      ];
    }

    return [];
  };

  const navItems = getNavItems();

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden animate-in fade-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight leading-tight block">
                Okul Portalı
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Yönetim & Bilgi Sistemi
              </span>
            </div>
          </div>

          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900">
            v2.4
          </span>
        </div>

        {/* Portal Info Pill */}
        <div className="px-4 pt-4 pb-2">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Aktif Portal Altyapısı
              </span>
              <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-100/60 dark:bg-indigo-950 px-1.5 py-0.2 rounded">
                {users.length} Kayıtlı
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Öğretmen, öğrenci ve okul idaresi senkronize çalışır.
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {currentUser ? `${currentUser.role === 'teacher' ? 'Öğretmen Modülleri' : currentUser.role === 'student' ? 'Öğrenci Menüsü' : 'Müdürlük Yönetimi'}` : 'Portal Gezintisi'}
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition group ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`} />
                  <div className="text-left truncate">
                    <span className="block truncate">{item.label}</span>
                    {item.sublabel && (
                      <span className={`text-[10px] font-normal block truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {item.sublabel}
                      </span>
                    )}
                  </div>
                </div>

                {item.badge && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                    isSelected 
                      ? 'bg-white/20 text-white' 
                      : (item as any).badgeColor || 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Card / Login Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {currentUser ? (
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                    {currentUser.displayName.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.displayName}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {currentUser.role === 'teacher' 
                        ? `${currentUser.branch || 'Branş'} Öğretmeni`
                        : currentUser.role === 'student'
                        ? `${currentUser.classGrade || 'Sınıf'} • No: ${currentUser.schoolNumber || '-'}`
                        : currentUser.role === 'parent'
                        ? 'Öğrenci Velisi'
                        : 'Okul Müdürü'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400">
                <span>Durum: <strong className="text-emerald-600 dark:text-emerald-400">Çevrimiçi</strong></span>
                <button
                  onClick={toggleDarkMode}
                  className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 font-semibold"
                >
                  {darkMode ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3" />}
                  {darkMode ? 'Aydınlık' : 'Karanlık'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => onOpenAuthModal?.('login')}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
              >
                Giriş Yap
              </button>
              <button
                onClick={() => onOpenAuthModal?.('register')}
                className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-1.5"
              >
                Kayıt Ol
              </button>
            </div>
          )}
        </div>

      </aside>
    </>
  );
};
