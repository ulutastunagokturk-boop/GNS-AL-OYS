import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { UserProfile, SchoolClass, RoleAssignment, UserRole } from '../../types';
import { WeeklyScheduleView } from '../schedule/WeeklyScheduleView';
import { SupabaseBackupManagerView } from './SupabaseBackupManagerView';
import { 
  ShieldCheck, 
  Users, 
  BookOpen, 
  GraduationCap, 
  School, 
  RefreshCw, 
  Search, 
  Edit, 
  Check, 
  Layers, 
  BarChart3, 
  UserPlus, 
  Database,
  CheckCircle2,
  Sparkles,
  X,
  UserX,
  UserCheck,
  Plus,
  Trash2,
  KeyRound,
  Shield,
  Clock,
  FileText,
  AlertCircle,
  Cpu,
  Calendar,
  Copy,
  Sliders,
  Zap,
  Eye,
  EyeOff,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudentPasswordToolModal } from './StudentPasswordToolModal';
import { ExcelStudentImportModal } from './ExcelStudentImportModal';
import { generateUniqueStudentPassword, PasswordStyle } from '../../utils/passwordGenerator';

export type AdminTab = 'overview' | 'users' | 'roles' | 'classes' | 'schedule' | 'backup';

interface AdminDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: AdminTab) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  activeTab: controlledTab,
  onTabChange
}) => {
  const { currentUser } = useAuth();
  const [internalTab, setInternalTab] = useState<AdminTab>('overview');

  const activeTab = (controlledTab as any) || internalTab;
  const setActiveTab = (tab: AdminTab) => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  
  // User search and filter
  const [searchUser, setSearchUser] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Dedicated Student Password Tool Modal State
  const [isPasswordToolOpen, setIsPasswordToolOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [visibleTablePasswordUid, setVisibleTablePasswordUid] = useState<string | null>(null);
  const [copiedTablePasswordUid, setCopiedTablePasswordUid] = useState<string | null>(null);

  // Class Management State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classNameInput, setClassNameInput] = useState('');
  const [classGradeLevelInput, setClassGradeLevelInput] = useState<number>(9);
  const [classBranchDescInput, setClassBranchDescInput] = useState('A');
  const [classAdvisorInput, setClassAdvisorInput] = useState('');
  const [classCapacityInput, setClassCapacityInput] = useState<number>(34);
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [classGradeFilter, setClassGradeFilter] = useState<string>('all');
  const [classActionSuccess, setClassActionSuccess] = useState<string | null>(null);
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);

  // Role Assignment & New User Form State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserRole, setNewUserRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [newUserAdminTitle, setNewUserAdminTitle] = useState('Müdür');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserSchoolNumber, setNewUserSchoolNumber] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUserPasswordCopied, setNewUserPasswordCopied] = useState(false);
  const [newUserClass, setNewUserClass] = useState('');
  const [newUserBranch, setNewUserBranch] = useState('Matematik');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserNotes, setNewUserNotes] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'Ders Takibi',
    'Ödev Teslimi',
    'Rozet & Puan Kazanımı'
  ]);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [addUserSuccess, setAddUserSuccess] = useState<string | null>(null);

  const users = dataService.getUsers();
  const roleAssignments = dataService.getRoleAssignments();
  const classes = dataService.getClasses();
  const homeworks = dataService.getHomeworks();
  const announcements = dataService.getAnnouncements();
  const grades = dataService.getGrades();
  const attendance = dataService.getAttendance();

  const students = users.filter(u => u.role === 'student');
  const teachers = users.filter(u => u.role === 'teacher');
  const admins = users.filter(u => u.role === 'admin');

  const rolePermissionTemplates: Record<string, string[]> = {
    student: ['Ders Takibi', 'Ödev Teslimi', 'Rozet & Puan Kazanımı', 'Duyuru Görüntüleme', 'Öğretmenle İletişim'],
    teacher: ['Ödev Oluşturma & Puanlama', 'Sınav Notu Girişi', 'Yoklama Alma', 'Duyuru Yayınlama', 'Sınıf Takibi', 'Birebir Mesajlaşma'],
    admin: [
      'Tam Sistem ve Firestore Veritabanı Erişimi',
      'Yeni Yönetici (Admin) ve Öğretmen Atama Yetkisi',
      'Tüm Sınav, Not ve Devamsızlık Yönetimi',
      'Öğrenci Kayıt ve Şube Yapılandırması',
      'Kullanıcı Hesaplarını Askıya Alma / Silme',
      'Sistem Logları & Güvenlik Denetimi'
    ]
  };

  const handleRoleSelect = (role: 'student' | 'teacher' | 'admin') => {
    setNewUserRole(role);
    setSelectedPermissions(rolePermissionTemplates[role] || []);
    if (role === 'student' && !newUserPassword) {
      setNewUserPassword(generateUniqueStudentPassword({ style: 'school', schoolNumber: newUserSchoolNumber || undefined }));
    }
  };

  const handleGenerateNewUserPassword = (style: PasswordStyle = 'school') => {
    const freshPass = generateUniqueStudentPassword({ 
      style, 
      schoolNumber: newUserSchoolNumber.trim() || undefined 
    });
    setNewUserPassword(freshPass);
    setNewUserPasswordCopied(false);
  };

  const handleCopyNewUserPassword = () => {
    if (!newUserPassword) return;
    navigator.clipboard.writeText(newUserPassword);
    setNewUserPasswordCopied(true);
    setTimeout(() => setNewUserPasswordCopied(false), 2000);
  };

  const handleCopyTablePassword = (uid: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTablePasswordUid(uid);
    setTimeout(() => setCopiedTablePasswordUid(null), 2000);
  };

  const handleReassignStudentPasswordInTable = async (student: UserProfile) => {
    const newPass = generateUniqueStudentPassword({ 
      style: 'school', 
      schoolNumber: student.schoolNumber 
    });
    const adminName = currentUser?.displayName || 'Sistem Yöneticisi';
    await dataService.resetUserPassword(student.uid, newPass, adminName);
    setAddUserSuccess(`✓ "${student.displayName}" için yeni eşsiz şifre (${newPass}) tanımlandı.`);
    setTimeout(() => setAddUserSuccess(null), 3500);
  };

  const togglePermission = (perm: string) => {
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  // Open Class Modals
  const handleOpenAddClassModal = () => {
    setEditingClassId(null);
    setClassNameInput('');
    setClassGradeLevelInput(9);
    setClassBranchDescInput('A');
    setClassAdvisorInput('');
    setClassCapacityInput(34);
    setIsClassModalOpen(true);
  };

  const handleOpenEditClassModal = (c: SchoolClass) => {
    setEditingClassId(c.id);
    setClassNameInput(c.name);
    setClassGradeLevelInput(c.gradeLevel);
    setClassBranchDescInput(c.branch);
    setClassAdvisorInput(c.advisorTeacher || '');
    setClassCapacityInput(c.capacity || 34);
    setIsClassModalOpen(true);
  };

  const handleSaveClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = classNameInput.trim();
    if (!trimmedName) return;

    setIsSubmittingClass(true);
    const adminName = currentUser?.displayName || 'Sistem Yöneticisi';

    try {
      if (editingClassId) {
        await dataService.updateClass(editingClassId, {
          name: trimmedName,
          gradeLevel: Number(classGradeLevelInput) || 9,
          branch: classBranchDescInput.trim() || 'A',
          advisorTeacher: classAdvisorInput.trim() || undefined,
          capacity: Number(classCapacityInput) || 34
        }, adminName);
        setClassActionSuccess(`✓ "${trimmedName}" sınıfı bilgileri başarıyla güncellendi.`);
      } else {
        const newClassId = `class-${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
        await dataService.addClass({
          id: newClassId,
          name: trimmedName,
          gradeLevel: Number(classGradeLevelInput) || 9,
          branch: classBranchDescInput.trim() || 'A',
          advisorTeacher: classAdvisorInput.trim() || undefined,
          capacity: Number(classCapacityInput) || 34
        }, adminName);
        setClassActionSuccess(`✓ "${trimmedName}" sınıfı / şubesi başarıyla oluşturuldu.`);
        try {
          confetti({ particleCount: 45, spread: 60 });
        } catch (e) {}
      }

      setIsClassModalOpen(false);
      setTimeout(() => setClassActionSuccess(null), 3500);
    } catch (err) {
      console.error(err);
      alert('Sınıf kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmittingClass(false);
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    const studentsInClass = dataService.getStudentsByClass(className);
    const confirmMsg = studentsInClass.length > 0
      ? `"${className}" sınıfında ${studentsInClass.length} kayıtlı öğrenci bulunmaktadır. Sınıfı silmek istediğinize emin misiniz?`
      : `"${className}" şubesini sistemden silmek istediğinize emin misiniz?`;

    if (window.confirm(confirmMsg)) {
      const adminName = currentUser?.displayName || 'Sistem Yöneticisi';
      await dataService.deleteClass(classId, adminName);
      setClassActionSuccess(`"${className}" sınıfı başarıyla silindi.`);
      setTimeout(() => setClassActionSuccess(null), 3000);
    }
  };

  const handleQuickCreateStandardClasses = async () => {
    if (window.confirm('9-A, 10-A, 11-A ve 12-A şubelerinden oluşan standart lise sınıf yapısını eklemek istiyor musunuz?')) {
      const adminName = currentUser?.displayName || 'Sistem Yöneticisi';
      const starterClasses: SchoolClass[] = [
        { id: `class-9a-${Date.now()}`, name: '9-A', gradeLevel: 9, branch: 'A (Temel Lise)', capacity: 34 },
        { id: `class-10a-${Date.now() + 1}`, name: '10-A', gradeLevel: 10, branch: 'A (Genel)', capacity: 34 },
        { id: `class-11a-${Date.now() + 2}`, name: '11-A', gradeLevel: 11, branch: 'A (Sayısal & MF)', capacity: 34 },
        { id: `class-12a-${Date.now() + 3}`, name: '12-A', gradeLevel: 12, branch: 'A (YKS Hazırlık)', capacity: 34 }
      ];

      for (const c of starterClasses) {
        await dataService.addClass(c, adminName);
      }

      setClassActionSuccess('✓ Standart 9-A, 10-A, 11-A, 12-A şubeleri başarıyla eklendi.');
      try {
        confetti({ particleCount: 50, spread: 70 });
      } catch (e) {}
      setTimeout(() => setClassActionSuccess(null), 3500);
    }
  };

  const filteredClasses = classes.filter(c => {
    const matchSearch = (c.name || '').toLowerCase().includes(classSearchQuery.toLowerCase()) ||
                         (c.branch || '').toLowerCase().includes(classSearchQuery.toLowerCase()) ||
                         ((c.advisorTeacher || '').toLowerCase().includes(classSearchQuery.toLowerCase()));
    const matchGrade = classGradeFilter === 'all' || String(c.gradeLevel) === classGradeFilter;
    return matchSearch && matchGrade;
  });

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'teacher' | 'student') => {
    const userToChange = dataService.getUserById(userId);
    if (userToChange?.email?.toLowerCase() === 'tlogixtr@gmail.com') {
      alert('Kök Yönetici (Root Admin) hesabı rolü değiştirilemez.');
      return;
    }

    const adminName = currentUser?.displayName || 'Sistem Yöneticisi';
    await dataService.changeUserRole(userId, newRole, adminName);
    setAddUserSuccess(
      newRole === 'admin' 
        ? `✓ "${userToChange?.displayName || 'Kullanıcı'}" başarıyla yeni Yönetici (Admin) olarak atandı!` 
        : `Kullanıcı rolü "${newRole.toUpperCase()}" olarak güncellendi ve Firestore'a senkronize edildi.`
    );
    setTimeout(() => setAddUserSuccess(null), 3500);
  };

  const handleToggleUserStatus = async (userId: string, currentStatus?: 'active' | 'deactivated') => {
    const userToToggle = dataService.getUserById(userId);
    if (userToToggle?.email?.toLowerCase() === 'tlogixtr@gmail.com') {
      alert('Kök Yönetici (Root Admin) hesabı askıya alınamaz.');
      return;
    }

    const nextStatus = currentStatus === 'deactivated' ? 'active' : 'deactivated';
    const adminName = currentUser?.displayName || 'Sistem Yöneticisi';
    await dataService.toggleUserStatus(userId, nextStatus, adminName);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const userToDelete = dataService.getUserById(userId);
    if (userToDelete?.email?.toLowerCase() === 'tlogixtr@gmail.com') {
      alert('Kök Yönetici (Root Admin) hesabı sistemden silinemez.');
      return;
    }

    if (window.confirm(`"${userName}" adlı kullanıcıyı sistemden kalıcı olarak silmek istediğinize emin misiniz?`)) {
      const adminName = currentUser?.displayName || 'Sistem Yöneticisi';
      await dataService.deleteUser(userId, adminName);
      setAddUserSuccess(`"${userName}" kullanıcısı başarıyla silindi.`);
      setTimeout(() => setAddUserSuccess(null), 3000);
    }
  };

  const handleRevokeAssignment = async (assignmentId: string, userName: string) => {
    if (window.confirm(`"${userName}" için tanımlanan bu rol yetkisini iptal etmek istediğinize emin misiniz?`)) {
      const adminName = currentUser?.displayName || 'Sistem Yöneticisi';
      await dataService.revokeRoleAssignment(assignmentId, adminName);
      setAddUserSuccess(`"${userName}" rol ataması başarıyla iptal edildi.`);
      setTimeout(() => setAddUserSuccess(null), 3000);
    }
  };

  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    
    const assignedSchoolNo = newUserRole === 'student' ? (newUserSchoolNumber.trim() || `${Math.floor(1000 + Math.random() * 9000)}`) : undefined;
    const finalEmail = newUserEmail.trim() || (newUserRole === 'student' && assignedSchoolNo ? `${assignedSchoolNo}@gnsial.k12.tr` : `${newUserName.toLowerCase().replace(/\s+/g, '.')}@gnsial.k12.tr`);

    setIsSubmittingRole(true);
    try {
      const adminName = currentUser?.displayName || 'Sistem Yöneticisi';
      const finalStudentPassword = newUserRole === 'student' 
        ? (newUserPassword.trim() || generateUniqueStudentPassword({ style: 'school', schoolNumber: assignedSchoolNo }))
        : (newUserPassword.trim() || undefined);

      const result = await dataService.assignUserRole({
        userName: newUserName.trim(),
        userEmail: finalEmail,
        assignedRole: newUserRole,
        classGrade: newUserRole === 'student' ? newUserClass : undefined,
        branch: newUserRole === 'teacher' ? newUserBranch : (newUserRole === 'admin' ? newUserAdminTitle : undefined),
        schoolNumber: assignedSchoolNo,
        phone: newUserPhone.trim() || undefined,
        notes: newUserNotes.trim() || (newUserRole === 'admin' ? `${newUserAdminTitle} idari görev yetkilendirmesi` : undefined),
        assignedBy: adminName,
        permissions: selectedPermissions,
        password: finalStudentPassword
      });

      setAddUserSuccess(
        newUserRole === 'admin'
          ? `✓ "${result.user.displayName}" başarıyla yeni Yönetici (Admin - ${newUserAdminTitle}) olarak atandı ve yetkilendirildi!`
          : newUserRole === 'student'
          ? `✓ Öğrenci "${result.user.displayName}" (#${result.user.schoolNumber}) oluşturuldu. Giriş Şifresi: "${result.user.password}"`
          : `✓ "${result.user.displayName}" için Öğretmen rolü başarıyla tanımlandı ve Firestore veritabanına kaydedildi!`
      );
      
      setIsAddUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserSchoolNumber('');
      setNewUserPassword('');
      setNewUserPhone('');
      setNewUserNotes('');
      
      try {
        confetti({ particleCount: 50, spread: 70 });
      } catch (err) {}
      
      setTimeout(() => setAddUserSuccess(null), 4500);
    } catch (err) {
      console.error(err);
      alert('Rol ataması yapılırken bir hata oluştu.');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = (u.displayName || '').toLowerCase().includes(searchUser.toLowerCase()) || 
                        (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
                        (u.schoolNumber && u.schoolNumber.includes(searchUser));
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchClass = classFilter === 'all' || u.classGrade === classFilter;
    return matchSearch && matchRole && matchClass;
  });

  return (
    <div className="space-y-6">

      {/* Toast Alerts */}
      {classActionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{classActionSuccess}</span>
          </div>
          <button onClick={() => setClassActionSuccess(null)} className="p-1 hover:bg-emerald-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-950/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 text-purple-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Okul Yönetim & Sistem Paneli (Admin)
              </span>
              <span className="text-xs text-purple-200">
                Firestore Entegre Yetkilendirme
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Sistem ve Rol Yönetimi
            </h1>
            <p className="text-sm text-purple-200 mt-1 max-w-xl">
              Öğrenci, öğretmen ve yöneticiler için kullanıcı rolleri tanımlayabilir, izinleri yapılandırabilir ve Firestore veritabanına kalıcı olarak kaydedebilirsiniz.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              id="admin-open-admin-assignment-btn"
              onClick={() => {
                handleRoleSelect('admin');
                setIsAddUserModalOpen(true);
              }}
              className="py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Yeni Yönetici (Admin) Ata</span>
            </button>

            <button
              id="admin-open-role-assignment-btn"
              onClick={() => {
                handleRoleSelect('student');
                setIsAddUserModalOpen(true);
              }}
              className="py-3 px-5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-purple-900/40 transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Yeni Rol / Yetki Tanımla</span>
            </button>
          </div>
        </div>
      </div>

      {addUserSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{addUserSuccess}</span>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Okul İstatistikleri
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Kullanıcılar ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'roles'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Firestore Rol Atamaları ({roleAssignments.length})
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition ${
            activeTab === 'classes'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <School className="w-4 h-4" />
          Sınıf & Şube Yapısı ({classes.length})
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Ders Programı Düzenleme & Çizelge
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          Supabase Bulut Yedekleme
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-emerald-500" />
                Toplam Öğrenci
              </span>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{students.length}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">{classes.length} Aktif Şubede</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-500" />
                Öğretmen Kadrosu
              </span>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{teachers.length}</p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-semibold">Farklı Branşlarda</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-500" />
                Yönetici Kadrosu
              </span>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{admins.length}</p>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-semibold">Tam Sistem Yetkili</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-500" />
                Tanımlı Rol Kaydı
              </span>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{roleAssignments.length}</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">Firestore Senkron</p>
            </div>
          </div>

          {/* Quick Role Assignment Callout Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/30">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Yeni Kullanıcılar İçin Rol Tanımlama & Yetkilendirme
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-xl">
                  Öğretmen, öğrenci veya idareci ekleyerek sistem erişim seviyelerini belirleyin. Tüm roller doğrudan Firestore <code className="font-bold">users</code> ve <code className="font-bold">role_assignments</code> koleksiyonlarında saklanır.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                handleRoleSelect('teacher');
                setIsAddUserModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shrink-0 transition"
            >
              <Plus className="w-4 h-4" />
              Rol Ata & Kaydet
            </button>
          </div>

          {/* Supabase Dual-Cloud Backup Callout */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-slate-900 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-white">
                    Supabase PostgreSQL İkincil Yedekleme
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Asenkron Çift Yazma
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Firestore ile eşzamanlı olarak okul kayıtları PostgreSQL veritabanına otomatik aktarılır.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('backup')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0 transition cursor-pointer"
            >
              <span>Yedekleme Merkezini Aç</span>
            </button>
          </div>

          {/* Quick Bulk Import Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950/30 via-slate-900/60 to-slate-900 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm text-white">
                    Excel ile Toplu Öğrenci & Veli Kayıt Sistemi
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    Hızlı İçe Aktarma
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  e-Okul veya Excel (.xlsx, .xls, .csv) listelerini tek tıkla yükleyin. Sınıflar, öğrenciler ve veli erişimleri anında oluşturulur.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExcelImportOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel Tablosu Yükle</span>
            </button>
          </div>

          {/* Classes distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Şube Dağılımı ve Doluluk Oranları
                </h3>
                <p className="text-xs text-slate-500">Mevcut sınıfların öğrenci sayıları ve danışman öğretmenleri.</p>
              </div>
              <button
                onClick={() => setActiveTab('schedule')}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 transition flex items-center gap-1.5 self-start cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Haftalık Programı Düzenle</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {classes.map(c => {
                const count = dataService.getStudentsByClass(c.name).length;
                const percent = Math.round((count / (c.capacity || 30)) * 100);

                return (
                  <div key={c.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">{c.name}</span>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{count} Öğrenci</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div style={{ width: `${Math.min(100, percent)}%` }} className="h-full bg-indigo-600 rounded-full"></div>
                    </div>
                    <p className="text-[10px] text-slate-500">Danışman: {c.advisorTeacher || 'Atanmadı'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ROLES TAB (FIRESTORE ROLE ASSIGNMENTS DIRECTORY) */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-purple-600" />
                  Firestore Kullanıcı Rol & Yetki Atamaları ({roleAssignments.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Yöneticiler tarafından Firestore veritabanına kaydedilen tüm aktif rol atamaları ve izin tanımları.
                </p>
              </div>

              <button
                onClick={() => {
                  handleRoleSelect('teacher');
                  setIsAddUserModalOpen(true);
                }}
                className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Rol Tanımla</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Kullanıcı</th>
                    <th className="py-3 px-4">Atanan Rol</th>
                    <th className="py-3 px-4">Sınıf / Branş / No</th>
                    <th className="py-3 px-4">Atayan Yönetici</th>
                    <th className="py-3 px-4">Tarih</th>
                    <th className="py-3 px-4">Durum</th>
                    <th className="py-3 px-4 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {roleAssignments.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{a.userName}</div>
                        <div className="text-[11px] text-slate-500">{a.userEmail}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                          a.assignedRole === 'admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : a.assignedRole === 'teacher'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {a.assignedRole === 'admin' ? 'Yönetici' : a.assignedRole === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {a.branch && (
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {a.branch} Branşı
                          </span>
                        )}
                        {a.classGrade && (
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {a.classGrade} Şubesi {a.schoolNumber ? `(#${a.schoolNumber})` : ''}
                          </span>
                        )}
                        {!a.branch && !a.classGrade && (
                          <span className="text-slate-400">İdari Birim</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {a.assignedBy}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {new Date(a.assignedAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          a.status === 'revoked'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'revoked' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          {a.status === 'revoked' ? 'İptal Edildi' : 'Aktif'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {a.status !== 'revoked' ? (
                          <button
                            onClick={() => handleRevokeAssignment(a.id, a.userName)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition border border-rose-200 dark:border-rose-900/50 cursor-pointer"
                            title="Rol Atamasını İptal Et"
                          >
                            İptal Et
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pasif</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* USERS MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Kullanıcı ve Rol Yönetimi ({users.length} Kayıt)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rolleri doğrudan değiştirebilir, hesap durumlarını yönetebilir ve yeni yetkilendirme atamaları yapabilirsiniz.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="admin-password-tool-btn"
                onClick={() => setIsPasswordToolOpen(true)}
                className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Öğrenciler için eşsiz şifreler üretin, listeleri yönetin ve giriş kartları yazdırın"
              >
                <KeyRound className="w-4 h-4" />
                <span>🔑 Şifre Üretici & Kartlar</span>
              </button>

              <button
                id="admin-excel-import-btn"
                onClick={() => setIsExcelImportOpen(true)}
                className="py-2 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Excel (.xlsx, .xls) veya CSV dosyasından toplu öğrenci ve veli ekleyin"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>📊 Excel ile Toplu Öğrenci Ekle</span>
              </button>

              <button
                id="admin-add-student-btn"
                onClick={() => {
                  handleRoleSelect('student');
                  setIsAddUserModalOpen(true);
                }}
                className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>+ Yeni Öğrenci Tanımla</span>
              </button>

              <button
                id="admin-add-user-btn"
                onClick={() => {
                  handleRoleSelect('teacher');
                  setIsAddUserModalOpen(true);
                }}
                className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Öğretmen / Yönetici Ekle</span>
              </button>

              <div className="relative w-40 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="İsim, No veya e-posta..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="all">Tüm Roller</option>
                <option value="student">Yalnızca Öğrenciler</option>
                <option value="teacher">Yalnızca Öğretmenler</option>
                <option value="admin">Yöneticiler</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Okul No / ID</th>
                  <th className="py-3 px-4">Ad Soyad</th>
                  <th className="py-3 px-4">E-Posta</th>
                  <th className="py-3 px-4">Sınıf / Branş</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4">Giriş Şifresi</th>
                  <th className="py-3 px-4">Firestore Rolü</th>
                  <th className="py-3 px-4 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredUsers.map(u => {
                  const isRootAdmin = (u.email || '').toLowerCase() === 'tlogixtr@gmail.com';
                  return (
                    <tr key={u.uid} className={`transition ${u.status === 'deactivated' ? 'opacity-50 bg-rose-50/20 dark:bg-rose-950/10' : isRootAdmin ? 'bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40 dark:hover:bg-amber-950/20' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {u.schoolNumber ? `#${u.schoolNumber}` : 'ID: ' + u.uid.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{u.displayName}</span>
                          {isRootAdmin && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              Kök Admin
                            </span>
                          )}
                          {!isRootAdmin && u.role === 'admin' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-700 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              Yönetici
                            </span>
                          )}
                          {u.status === 'deactivated' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">Askıda</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {u.email}
                      </td>
                      <td className="py-3 px-4">
                        {isRootAdmin ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                            Sistem Kurucusu & Yönetici
                          </span>
                        ) : u.role === 'student' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {u.classGrade || 'Atanmadı'}
                          </span>
                        ) : u.role === 'teacher' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {u.branch || 'Genel Branş'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            {u.branch || 'Okul Yönetimi'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.status === 'deactivated'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'deactivated' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          {u.status === 'deactivated' ? 'Pasif' : 'Aktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.role === 'student' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                              {visibleTablePasswordUid === u.uid ? (u.password || 'Gns2026!') : '••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setVisibleTablePasswordUid(visibleTablePasswordUid === u.uid ? null : u.uid)}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                              title={visibleTablePasswordUid === u.uid ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                            >
                              {visibleTablePasswordUid === u.uid ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyTablePassword(u.uid, u.password || 'Gns2026!')}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                              title="Şifreyi Kopyala"
                            >
                              {copiedTablePasswordUid === u.uid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReassignStudentPasswordInTable(u)}
                              className="p-1 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 transition cursor-pointer"
                              title="Yeni Eşsiz Şifre Ata"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono italic">SMS / E-Posta</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isRootAdmin ? (
                          <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700 flex items-center gap-1 w-fit">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                            Kök Yönetici
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.uid, e.target.value as any)}
                            className="py-1 px-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                            title="Rolü değiştir ve Firestore'a yaz"
                          >
                            <option value="student">Öğrenci</option>
                            <option value="teacher">Öğretmen</option>
                            <option value="admin">Yönetici (Admin)</option>
                          </select>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isRootAdmin ? (
                          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1" title="Kök Yönetici hesabı silinemez ve askıya alınamaz">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                            Sistem Sahibi
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleToggleUserStatus(u.uid, u.status)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                                u.status === 'deactivated'
                                  ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                  : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                              }`}
                              title={u.status === 'deactivated' ? 'Hesabı Yeniden Aktif Et' : 'Hesabı Askıya Al / Dondur'}
                            >
                              {u.status === 'deactivated' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.uid, u.displayName)}
                              className="p-1.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                              title="Kullanıcıyı Sistemden Kalıcı Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLASSES TAB */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <School className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Sınıf & Şube Yönetimi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Okul kademelerini ve şubelerini manuel olarak oluşturun, rehber öğretmenlerini atayın ve kontenjanlarını belirleyin.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddClassModal}
                className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-purple-600/30 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Yeni Sınıf / Şube Ekle
              </button>
            </div>
          </div>

          {/* Search & Grade Filter Toolbar */}
          {classes.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Sınıf adı, alan veya rehber öğretmen..."
                  value={classSearchQuery}
                  onChange={(e) => setClassSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <span className="text-xs text-slate-500 font-bold hidden sm:inline">Kademe:</span>
                {['all', '9', '10', '11', '12'].map(grade => (
                  <button
                    key={grade}
                    onClick={() => setClassGradeFilter(grade)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      classGradeFilter === grade
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {grade === 'all' ? 'Tüm Kademeler' : `${grade}. Sınıflar`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {classes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-4 border border-purple-200 dark:border-purple-800/60 shadow-inner">
                <School className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">
                Henüz Tanımlı Sınıf Bulunmuyor
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 max-w-md mx-auto">
                Tüm sınıflar manuel olarak eklenecek şekilde sıfırlandı. Okulunuzun şube ve kademe yapısına göre yeni sınıfları oluşturmaya başlayabilirsiniz.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleOpenAddClassModal}
                  className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  İlk Sınıfı / Şubeyi Manuel Ekle
                </button>
                
                <button
                  onClick={handleQuickCreateStandardClasses}
                  className="w-full sm:w-auto py-3 px-5 rounded-2xl border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Standart Şubeleri Ekle (9-A, 10-A, 11-A, 12-A)
                </button>
              </div>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 text-xs">
              Arama kriterlerine uygun sınıf bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {filteredClasses.map(c => {
                const studentsInClass = dataService.getStudentsByClass(c.name);
                return (
                  <div key={c.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-purple-300 dark:hover:border-purple-800 transition flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-slate-900 dark:text-white">{c.name}</span>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {c.gradeLevel}. Sınıf
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {studentsInClass.length} / {c.capacity || 34} Öğrenci
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 mb-4 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl">
                        <p className="flex items-center justify-between">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Şube / Alan:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{c.branch || 'Genel'}</span>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Rehber Öğretmen:</span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">{c.advisorTeacher || 'Atanmadı'}</span>
                        </p>
                        <p className="flex items-center justify-between">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Derslik:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">Derslik {c.name}</span>
                        </p>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Kayıtlı Öğrenciler ({studentsInClass.length}):
                          </p>
                        </div>
                        
                        {studentsInClass.length === 0 ? (
                          <div className="p-3 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl text-[11px] text-slate-400">
                            Bu sınıfa henüz öğrenci kaydedilmedi.
                          </div>
                        ) : (
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {studentsInClass.slice(0, 8).map(st => (
                              <div key={st.uid} className="text-xs flex items-center justify-between text-slate-600 dark:text-slate-300 py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                                <span className="font-medium">{st.displayName}</span>
                                <span className="text-[10px] font-mono text-slate-400">#{st.schoolNumber || '-'}</span>
                              </div>
                            ))}
                            {studentsInClass.length > 8 && (
                              <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold pt-1 text-center">
                                + {studentsInClass.length - 8} diğer öğrenci
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenEditClassModal(c)}
                        className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Düzenle
                      </button>

                      <button
                        onClick={() => handleDeleteClass(c.id, c.name)}
                        className="py-1.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                        title="Sınıfı Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SCHEDULE MANAGEMENT TAB */}
      {activeTab === 'schedule' && (
        <div className="space-y-4 animate-in fade-in">
          <WeeklyScheduleView />
        </div>
      )}

      {/* SUPABASE CLOUD BACKUP TAB */}
      {activeTab === 'backup' && (
        <div className="space-y-4 animate-in fade-in">
          <SupabaseBackupManagerView />
        </div>
      )}

      {/* ADD / EDIT CLASS MODAL */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsClassModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/30">
                <School className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {editingClassId ? 'Sınıf Bilgilerini Düzenle' : 'Yeni Sınıf / Şube Ekle'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingClassId ? 'Şube detaylarını ve danışman öğretmeni güncelleyin.' : 'Manuel sınıf kaydı oluşturun ve okul yapısına ekleyin.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveClassSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sınıf / Şube Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 9-A, 10-B, 11-C, 12-D, Hazırlık-A"
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sınıf Kademesi
                  </label>
                  <select
                    value={classGradeLevelInput}
                    onChange={(e) => setClassGradeLevelInput(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={9}>9. Sınıf</option>
                    <option value={10}>10. Sınıf</option>
                    <option value={11}>11. Sınıf</option>
                    <option value={12}>12. Sınıf</option>
                    <option value={0}>Hazırlık / Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kontenjan / Kapasite
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={classCapacityInput}
                    onChange={(e) => setClassCapacityInput(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Şube / Alan Açıklaması
                </label>
                <input
                  type="text"
                  placeholder="Örn: A (Fen / Sayısal), B (Eşit Ağırlık), C (Yabancı Dil)"
                  value={classBranchDescInput}
                  onChange={(e) => setClassBranchDescInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rehber / Sınıf Danışman Öğretmeni (Opsiyonel)
                </label>
                {teachers.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={classAdvisorInput}
                      onChange={(e) => setClassAdvisorInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- Öğretmen Seçin (Atanmadı) --</option>
                      {teachers.map(t => (
                        <option key={t.uid} value={t.displayName}>
                          {t.displayName} ({t.branch || 'Genel'})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Veya farklı bir öğretmen adı yazın..."
                      value={classAdvisorInput}
                      onChange={(e) => setClassAdvisorInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Örn: Ahmet Yılmaz"
                    value={classAdvisorInput}
                    onChange={(e) => setClassAdvisorInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmittingClass}
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClass}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/30 flex items-center gap-2 transition cursor-pointer"
                >
                  {isSubmittingClass ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingClassId ? 'Değişiklikleri Kaydet' : 'Sınıfı Oluştur & Kaydet'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE ASSIGNMENT & NEW USER MODAL (FIRESTORE INTEGRATED) */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddUserModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/30">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Kullanıcı Rolü & Yetki Tanımla
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kullanıcıya rol atayın, izinlerini özelleştirin ve Firestore veritabanına kaydedin.
                </p>
              </div>
            </div>

            <form onSubmit={handleAssignRoleSubmit} className="space-y-4 text-xs">
              {/* Role Selection Tabs */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Atanacak Rol Seviyesi (Role Level)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('student')}
                    className={`py-3 px-3 rounded-xl border text-center font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                      newUserRole === 'student'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span>Öğrenci</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelect('teacher')}
                    className={`py-3 px-3 rounded-xl border text-center font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                      newUserRole === 'teacher'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>Öğretmen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelect('admin')}
                    className={`py-3 px-3 rounded-xl border text-center font-bold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                      newUserRole === 'admin'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>Yönetici</span>
                  </button>
                </div>
              </div>

              {/* User Identity Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ad Soyad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Caner Korkmaz"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Telefon Numarası {newUserRole === 'student' ? '(Giriş İçin)' : '(Opsiyonel)'}
                  </label>
                  <input
                    type="tel"
                    placeholder="Örn: 0555 123 4567"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    E-Posta Adresi {newUserRole === 'student' ? '(Opsiyonel)' : '*'}
                  </label>
                  <input
                    type="email"
                    required={newUserRole !== 'student'}
                    placeholder={newUserRole === 'student' ? 'Boş bırakılırsa otomatik atanır' : 'Örn: caner.korkmaz@gnsial.k12.tr'}
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Conditional inputs for student / teacher / admin */}
              {newUserRole === 'admin' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black text-xs">Yönetici (Admin) Yetkilendirme Protokolü</p>
                      <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5 leading-relaxed">
                        Atanan kullanıcı tam sistem yetkisine sahip olacak; okul veritabanını, yeni yönetici atamalarını, öğretmenleri ve tüm öğrenci kayıtlarını yönetebilecektir.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      İdari Görev / Yönetici Ünvanı
                    </label>
                    <select
                      value={newUserAdminTitle}
                      onChange={(e) => setNewUserAdminTitle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Müdür">Müdür (Okul Müdürü)</option>
                      <option value="Müdür Yardımcısı">Müdür Yardımcısı</option>
                      <option value="Bilişim ve Sistem Yöneticisi">Bilişim ve Sistem Yöneticisi</option>
                      <option value="İdari İşler & Öğrenci İşleri">İdari İşler & Öğrenci İşleri Sorumlusu</option>
                      <option value="Zümre Başkanı / Akademik Koordinatör">Zümre Başkanı / Akademik Koordinatör</option>
                      <option value="Özel Yetkili Yönetici">Özel Yetkili Yönetici</option>
                    </select>
                  </div>
                </div>
              )}

              {newUserRole === 'student' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Okul Numarası</label>
                      <input
                        type="text"
                        placeholder="Örn: 1045 (Boş bırakılırsa otomatik atanır)"
                        value={newUserSchoolNumber}
                        onChange={(e) => setNewUserSchoolNumber(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Şube / Sınıf</label>
                      {classes.length > 0 ? (
                        <select
                          value={newUserClass}
                          onChange={(e) => setNewUserClass(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">-- Şube Seçin --</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.name}>{c.name} ({c.branch || 'Genel'})</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Örn: 9-A (Manuel Sınıf)"
                          value={newUserClass}
                          onChange={(e) => setNewUserClass(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      )}
                    </div>
                  </div>

                  {/* Öğrenci Giriş Şifresi Tanımlama & Eşsiz Şifre Üretici */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                        <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Öğrenci Giriş Şifresi Tanımla</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold">
                        Girişte Okul No + Şifre Zorunludur
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showNewUserPassword ? 'text' : 'password'}
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="Öğrenci şifresi (Örn: Gns-4821#k)"
                          required
                          className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                          title={showNewUserPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                        >
                          {showNewUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGenerateNewUserPassword('school')}
                        className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
                        title="Her tıklamada eşsiz tahmin edilemez yeni bir şifre üretir"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Eşsiz Şifre Üret</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyNewUserPassword}
                        className="px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
                        title="Şifreyi Kopyala"
                      >
                        {newUserPasswordCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{newUserPasswordCopied ? 'Kopyalandı' : 'Kopyala'}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Hızlı Format:</span>
                      <button
                        type="button"
                        onClick={() => handleGenerateNewUserPassword('school')}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold hover:border-amber-400 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      >
                        Okul Formatı
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenerateNewUserPassword('memorable')}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold hover:border-amber-400 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      >
                        Kelime & Sayı
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenerateNewUserPassword('pin')}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold hover:border-amber-400 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      >
                        6 Haneli PIN
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {newUserRole === 'teacher' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Öğretmen Branşı</label>
                  <select
                    value={newUserBranch}
                    onChange={(e) => setNewUserBranch(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Matematik">Matematik</option>
                    <option value="Fizik">Fizik</option>
                    <option value="Kimya">Kimya</option>
                    <option value="Biyoloji">Biyoloji</option>
                    <option value="Türk Dili ve Edebiyatı">Türk Dili ve Edebiyatı</option>
                    <option value="Tarih">Tarih</option>
                    <option value="Coğrafya">Coğrafya</option>
                    <option value="İngilizce">İngilizce</option>
                    <option value="Bilişim Teknolojileri">Bilişim Teknolojileri</option>
                    <option value="Beden Eğitimi">Beden Eğitimi</option>
                    <option value="Felsefe">Felsefe</option>
                    <option value="Müzik / Görsel Sanatlar">Müzik / Görsel Sanatlar</option>
                  </select>
                </div>
              )}

              {/* Permissions Checklist */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Rol Yetki ve İzin Paketleri (Permissions)
                </label>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {rolePermissionTemplates[newUserRole]?.map(perm => (
                      <label key={perm} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm)}
                          onChange={() => togglePermission(perm)}
                          className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                        />
                        <span>{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Role Notes / Justification */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Atama Notu / Açıklama (Opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder="Örn: 2026-2027 Güz Dönemi Matematik Zümresi İdari Ataması"
                  value={newUserNotes}
                  onChange={(e) => setNewUserNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Firestore Indicator */}
              <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-2 text-indigo-800 dark:text-indigo-200 text-[11px]">
                <Database className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Bu işlem kullanıcının rolünü ve yetki kaydını Firestore <code className="font-mono font-bold">users</code> ve <code className="font-mono font-bold">role_assignments</code> koleksiyonlarına anında işler.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmittingRole}
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRole}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/30 flex items-center gap-2 transition cursor-pointer"
                >
                  {isSubmittingRole ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Firestore'a Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Rolü Tanımla & Firestore'a Ata</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Password Management & Batch Generator Modal */}
      <StudentPasswordToolModal
        isOpen={isPasswordToolOpen}
        onClose={() => setIsPasswordToolOpen(false)}
        currentUserDisplayName={currentUser?.displayName || 'Sistem Yöneticisi'}
      />

      {/* Bulk Student Import from Excel Modal */}
      <ExcelStudentImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
      />

    </div>
  );
};
