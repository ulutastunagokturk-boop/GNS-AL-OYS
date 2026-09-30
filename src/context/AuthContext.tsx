import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { INITIAL_TEACHERS, INITIAL_ADMIN } from '../services/seedData';
import { generateUniqueStudentPassword } from '../utils/passwordGenerator';
import confetti from 'canvas-confetti';

interface AuthContextType {
  currentUser: UserProfile | null;
  role: UserRole | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  loginWithPhone: (phone: string, pass?: string, rememberMe?: boolean) => Promise<UserProfile>;
  loginWithEmail: (email: string, pass?: string, rememberMe?: boolean) => Promise<UserProfile>;
  loginWithSchoolNumber: (schoolNumber: string, pass?: string, rememberMe?: boolean) => Promise<UserProfile>;
  loginWithPhoneOrEmail: (identifier: string, pass?: string, rememberMe?: boolean) => Promise<UserProfile>;
  loginStaff: (identifier: string, pass: string, rememberMe?: boolean) => Promise<UserProfile>;
  loginParent: (identifier: string, pass?: string, rememberMe?: boolean) => Promise<UserProfile>;
  registerStudent: (data: {
    schoolNumber: string;
    displayName: string;
    phone: string;
    classGrade: string;
    email?: string;
    password?: string;
  }, rememberMe?: boolean) => Promise<UserProfile>;
  registerTeacher: (data: {
    displayName: string;
    phone: string;
    branch: string;
    email?: string;
  }, rememberMe?: boolean) => Promise<UserProfile>;
  logout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'okul_portal_current_user_v5';
const THEME_STORAGE_KEY = 'okul_portal_theme';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Apply dark mode class to HTML element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [darkMode]);

  // Load saved user session on mount: checks localStorage (if rememberMe was chosen) or sessionStorage (if rememberMe was unchecked)
  useEffect(() => {
    try {
      // Clean up any old legacy key from prior versions to ensure the user always sees the login screen initially
      localStorage.removeItem('okul_portal_current_user');
      localStorage.removeItem('okul_portal_current_user_v2');
      localStorage.removeItem('okul_portal_current_user_v3');
      localStorage.removeItem('okul_portal_current_user_v4');
      sessionStorage.removeItem('okul_portal_current_user');
      sessionStorage.removeItem('okul_portal_current_user_v2');
      sessionStorage.removeItem('okul_portal_current_user_v3');
      sessionStorage.removeItem('okul_portal_current_user_v4');

      let savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!savedUser) {
        savedUser = sessionStorage.getItem(AUTH_STORAGE_KEY);
      }

      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const parsedEmail = (parsed.email || '').toLowerCase().trim();
        if (parsedEmail === 'ulutastunagokturk@gmail.com' || parsed.uid === 'admin-owner-ulutas') {
          // Explicitly wiped
          localStorage.removeItem(AUTH_STORAGE_KEY);
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
          setCurrentUser(null);
          return;
        }

        const live = dataService.getUserById(parsed.uid) || dataService.getUsers().find(u => u.email?.toLowerCase() === parsedEmail);
        if (live && live.status !== 'deactivated') {
          setCurrentUser(live);
        } else {
          // Check Firestore before discarding session
          dataService.findAndSyncUserFromFirestore({ email: parsed.email, schoolNumber: parsed.schoolNumber }).then(found => {
            if (found && found.status !== 'deactivated' && (found.email || '').toLowerCase().trim() !== 'ulutastunagokturk@gmail.com') {
              setCurrentUser(found);
            } else {
              localStorage.removeItem(AUTH_STORAGE_KEY);
              sessionStorage.removeItem(AUTH_STORAGE_KEY);
              setCurrentUser(null);
            }
          }).catch(() => {
            setCurrentUser(null);
          });
        }
      } else {
        // No saved session -> remains logged out so the user lands on the login page!
        setCurrentUser(null);
      }
    } catch (e) {
      console.log('Session load note:', e);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveUserSession = (user: UserProfile | null, rememberMe: boolean = false) => {
    setCurrentUser(user);
    if (user) {
      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const loginWithPhone = async (phone: string, _pass?: string, rememberMe: boolean = false): Promise<UserProfile> => {
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits) {
      throw new Error('Lütfen geçerli bir telefon numarası giriniz.');
    }
    let user = dataService.getUserByPhone(cleanDigits);
    if (!user) {
      user = (await dataService.findAndSyncUserFromFirestore({ phone: cleanDigits })) || undefined;
    }
    if (!user) {
      throw new Error(`'${phone}' numarasıyla kayıtlı kullanıcı bulunamadı. Lütfen bilgilerinizi kontrol ediniz.`);
    }
    if (user.status === 'deactivated') {
      throw new Error('Hesabınız okul yönetimi tarafından askıya alınmıştır.');
    }
    saveUserSession(user, rememberMe);
    return user;
  };

  const loginStaff = async (identifier: string, pass: string, rememberMe: boolean = false): Promise<UserProfile> => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      throw new Error('Lütfen telefon numaranızı veya kurumsal e-posta adresinizi giriniz.');
    }
    const cleanPass = pass?.trim();
    if (!cleanPass) {
      throw new Error('Lütfen öğretmen / idareci giriş şifrenizi giriniz.');
    }

    // 0. Root Master Admin verification for tlogixtr@gmail.com
    const isRootAdminEmail = cleanId.toLowerCase() === 'tlogixtr@gmail.com' || cleanId.toLowerCase() === 'admin-tlogix' || cleanId.replace(/\s+/g, '') === '05559990000';
    if (isRootAdminEmail) {
      if (cleanPass === 'Gnsial2026!Admin' || cleanPass === 'admin123') {
        let adminUser = dataService.getUsers().find(u => u.uid === INITIAL_ADMIN.uid || u.email?.toLowerCase() === 'tlogixtr@gmail.com');
        if (!adminUser) {
          adminUser = { ...INITIAL_ADMIN, password: 'Gnsial2026!Admin' };
          dataService.addUserProfile(adminUser);
        } else {
          adminUser.password = 'Gnsial2026!Admin';
          adminUser.role = 'admin';
          adminUser.status = 'active';
        }
        saveUserSession(adminUser, rememberMe);
        return adminUser;
      } else {
        throw new Error('Girdiğiniz şifre hatalıdır. Lütfen yönetici şifrenizi kontrol ediniz.');
      }
    }

    const staffRoles: UserRole[] = ['teacher', 'admin'];

    // 1. Try server-side Supabase verification first
    try {
      const res = await fetch('/api/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password: cleanPass })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        await dataService.syncFromSupabaseDatabase(true);
        saveUserSession(data.user, rememberMe);
        return data.user;
      } else if (data && data.message) {
        throw new Error(data.message);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Network') && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }

    // 2. Query Supabase synchronized state
    await dataService.syncFromSupabaseDatabase(true);
    let user: UserProfile | undefined = dataService.getUserByPhoneOrEmail(cleanId, staffRoles);
    if (!user) {
      try {
        user = (await dataService.findAndSyncUserFromFirestore({ identifier: cleanId, allowedRoles: staffRoles })) || undefined;
      } catch {}
    }

    if (!user) {
      throw new Error(`'${identifier}' bilgisiyle eşleşen bir öğretmen veya idareci hesabı bulunamadı. Lütfen bilgilerinizi kontrol ediniz.`);
    }

    if (user.role !== 'teacher' && user.role !== 'admin') {
      throw new Error('Bu giriş alanı yalnızca öğretmen ve okul idarecileri içindir. Lütfen öğrenci veya veli sekmesini kullanınız.');
    }

    if (user.status === 'deactivated') {
      throw new Error('Hesabınız okul yönetimi tarafından askıya alınmıştır.');
    }

    // Verify Password
    const isAdminUser = user.role === 'admin';
    const isRootAdmin = (user.email || '').toLowerCase() === 'tlogixtr@gmail.com' || user.uid === 'admin-tlogix';

    if (user.password) {
      const isMatch = user.password === cleanPass || (isRootAdmin && cleanPass === 'Gnsial2026!Admin');
      if (!isMatch) {
        throw new Error('Girdiğiniz şifre hatalıdır. Lütfen okul idaresi tarafından tanımlanan şifrenizi kontrol edip tekrar deneyiniz.');
      }
    } else {
      const isMasterAdminMatch = isRootAdmin && (cleanPass === 'Gnsial2026!Admin' || cleanPass === 'admin123');
      const isInitialAdminMatch = isAdminUser && (cleanPass === 'Gnsial2026!Admin' || cleanPass === 'admin123');

      if (isMasterAdminMatch || isInitialAdminMatch) {
        await dataService.updateUserProfile(user.uid, { password: cleanPass });
        user.password = cleanPass;
      } else {
        throw new Error('Girdiğiniz şifre hatalıdır. Lütfen okul idaresi tarafından size tanımlanan güvenli şifreyi giriniz.');
      }
    }

    saveUserSession(user, rememberMe);
    return user;
  };

  const loginWithPhoneOrEmail = async (identifier: string, pass?: string, rememberMe: boolean = false): Promise<UserProfile> => {
    const clean = identifier.trim();
    if (!clean) {
      throw new Error('Lütfen telefon numaranızı veya e-posta adresinizi giriniz.');
    }
    if (!pass || !pass.trim()) {
      throw new Error('Lütfen giriş şifrenizi giriniz.');
    }

    await dataService.syncFromSupabaseDatabase(true);
    const user = dataService.getUserByPhoneOrEmail(clean);
    if (user && user.role === 'parent') {
      return loginParent(clean, pass, rememberMe);
    }

    return loginStaff(clean, pass, rememberMe);
  };

  const loginWithEmail = async (email: string, pass?: string, rememberMe: boolean = false): Promise<UserProfile> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Lütfen e-posta adresinizi giriniz.');
    }
    if (!pass || !pass.trim()) {
      throw new Error('Lütfen giriş şifrenizi giriniz.');
    }

    await dataService.syncFromSupabaseDatabase(true);
    const user = dataService.getUsers().find(u => u.email?.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.');
    }
    if (user.role === 'parent') {
      return loginParent(cleanEmail, pass, rememberMe);
    } else if (user.role === 'student') {
      return loginWithSchoolNumber(user.schoolNumber || cleanEmail, pass, rememberMe);
    } else {
      return loginStaff(cleanEmail, pass, rememberMe);
    }
  };

  const loginWithSchoolNumber = async (schoolNumber: string, pass?: string, rememberMe: boolean = false): Promise<UserProfile> => {
    const cleanNo = schoolNumber.trim();
    if (!cleanNo) {
      throw new Error('Lütfen okul numaranızı giriniz.');
    }

    const cleanPass = pass?.trim();
    if (!cleanPass) {
      throw new Error('Lütfen okul idareniz tarafından verilen öğrenci şifrenizi giriniz.');
    }

    // Try server-side Supabase verification first
    try {
      const res = await fetch('/api/auth/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolNumber: cleanNo, password: cleanPass })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        await dataService.syncFromSupabaseDatabase(true);
        saveUserSession(data.user, rememberMe);
        return data.user;
      } else if (data && data.message) {
        throw new Error(data.message);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Network') && !err.message.includes('Failed to fetch')) {
        throw err;
      }
    }

    // Attempt real-time Supabase sync
    await dataService.syncFromSupabaseDatabase(true);
    let user: UserProfile | undefined = dataService.getUserBySchoolNumber(cleanNo);
    if (!user) {
      try {
        user = (await dataService.findAndSyncUserFromFirestore({ schoolNumber: cleanNo })) || undefined;
      } catch {}
    }

    if (!user) {
      throw new Error(`'${cleanNo}' numaralı öğrenci kaydı bulunamadı. Öğrenci hesapları okul yönetimi tarafından tanımlanmaktadır. Lütfen okul idaresi ile iletişime geçiniz.`);
    }
    if (user.status === 'deactivated') {
      throw new Error('Hesabınız okul yönetimi tarafından askıya alınmıştır.');
    }

    // Check student password strictly
    if (!user.password || user.password !== cleanPass) {
      throw new Error('Girdiğiniz öğrenci şifresi hatalıdır. Lütfen okul idarenizden aldığınız şifreyi kontrol edip tekrar deneyiniz.');
    }

    saveUserSession(user, rememberMe);
    return user;
  };

  const loginParent = async (identifier: string, pass?: string, rememberMe: boolean = false): Promise<UserProfile> => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      throw new Error('Lütfen öğrenci okul numarasını, veli telefonunu veya e-posta adresini giriniz.');
    }
    const cleanPass = pass?.trim();
    if (!cleanPass) {
      throw new Error('Lütfen veli giriş şifrenizi giriniz.');
    }

    // 1. DIRECT SUPABASE DATABASE AUTHENTICATION via Backend API
    try {
      const res = await fetch('/api/auth/parent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password: cleanPass })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        // Keep in-memory dataService in sync with Supabase
        await dataService.syncFromSupabaseDatabase(true);
        saveUserSession(data.user, rememberMe);
        return data.user;
      } else if (data && data.message) {
        // Strict error from Supabase database (e.g. wrong password or account not found)
        throw new Error(data.message);
      }
    } catch (err: any) {
      // If error message was provided from API, propagate it directly (do not bypass!)
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Network') && !err.message.includes('Failed to fetch')) {
        throw err;
      }
      console.warn('[Parent Login API note]:', err?.message);
    }

    // 2. Strict Offline/Fallback Verification directly against synchronized Supabase state
    await dataService.syncFromSupabaseDatabase(true);
    const cleanDigits = cleanId.replace(/\D/g, '');
    const allUsers = dataService.getUsers();

    // Find parent by phone, email, or linked student number
    let parentUser = allUsers.find(u => 
      u.role === 'parent' && (
        (cleanDigits && cleanDigits.length >= 7 && u.phone && (u.phone.replace(/\D/g, '') === cleanDigits || u.phone.replace(/\D/g, '').endsWith(cleanDigits))) ||
        (u.email && u.email.toLowerCase() === cleanId.toLowerCase()) ||
        (Array.isArray(u.studentNumbers) && u.studentNumbers.includes(cleanId))
      )
    );

    // If cleanId is a student school number, find linked student
    if (!parentUser) {
      const student = allUsers.find(u => 
        u.role === 'student' && (
          (u.schoolNumber && u.schoolNumber.trim() === cleanId) ||
          (cleanDigits && u.schoolNumber && u.schoolNumber.trim() === cleanDigits)
        )
      );

      if (student) {
        parentUser = allUsers.find(u => 
          u.role === 'parent' && (
            (student.parentId && u.uid === student.parentId) ||
            (Array.isArray(u.studentIds) && u.studentIds.includes(student.uid)) ||
            (Array.isArray(u.studentNumbers) && (
              u.studentNumbers.includes(student.schoolNumber || cleanId) || 
              u.studentNumbers.includes(cleanId)
            ))
          )
        );
      }
    }

    if (!parentUser) {
      throw new Error(`'${identifier}' bilgisine ait kayıtlı bir veli hesabı okul veritabanında bulunamadı. Lütfen okul idareniz ile iletişime geçiniz.`);
    }

    if (parentUser.status === 'deactivated') {
      throw new Error('Veli hesabınız okul yönetimi tarafından dondurulmuştur.');
    }

    // STRICT PASSWORD VERIFICATION: Random passwords MUST NOT PASS
    const storedPassword = (parentUser.password || '').trim();
    if (!storedPassword) {
      throw new Error('Veli hesabınıza henüz bir şifre tanımlanmamıştır. Lütfen okul idareniz ile iletişime geçiniz.');
    }

    if (cleanPass !== storedPassword) {
      throw new Error('Girdiğiniz veli şifresi hatalıdır. Lütfen okul idarenizden aldığınız veli şifresini kontrol edip tekrar deneyiniz.');
    }

    saveUserSession(parentUser, rememberMe);
    return parentUser;
  };

  const registerStudent = async (data: {
    schoolNumber: string;
    displayName: string;
    phone: string;
    classGrade: string;
    email?: string;
    password?: string;
  }, rememberMe: boolean = false): Promise<UserProfile> => {
    const cleanSchoolNo = data.schoolNumber.trim();
    if (!cleanSchoolNo) {
      throw new Error('Okul numarası zorunludur.');
    }
    const cleanPhone = data.phone.trim();
    if (!cleanPhone) {
      throw new Error('Telefon numarası zorunludur.');
    }

    const autoEmail = data.email?.trim() || `${cleanSchoolNo}@gnsial.k12.tr`;

    const newStudent: UserProfile = {
      uid: `student-${cleanSchoolNo}-${Date.now()}`,
      email: autoEmail.toLowerCase(),
      displayName: data.displayName.trim(),
      role: 'student',
      schoolNumber: cleanSchoolNo,
      password: data.password?.trim() || generateUniqueStudentPassword({ schoolNumber: cleanSchoolNo }),
      classGrade: data.classGrade,
      phone: cleanPhone,
      status: 'active',
      totalXp: 100,
      level: 1,
      createdAt: new Date().toISOString()
    };

    const saved = await dataService.registerUser(newStudent);
    saveUserSession(saved, rememberMe);
    return saved;
  };

  const registerTeacher = async (data: {
    displayName: string;
    phone: string;
    branch: string;
    email?: string;
  }, rememberMe: boolean = false): Promise<UserProfile> => {
    const cleanPhone = data.phone.trim();
    if (!cleanPhone) {
      throw new Error('Telefon numarası zorunludur.');
    }

    const slug = data.displayName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const autoEmail = data.email?.trim() || `${slug || 'ogretmen'}-${Date.now().toString().slice(-4)}@gnsial.k12.tr`;

    const newTeacher: UserProfile = {
      uid: `teacher-${Date.now()}`,
      email: autoEmail.toLowerCase(),
      displayName: data.displayName.trim(),
      role: 'teacher',
      branch: data.branch.trim(),
      phone: cleanPhone,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const saved = await dataService.registerUser(newTeacher);
    saveUserSession(saved, rememberMe);
    return saved;
  };

  const logout = () => {
    saveUserSession(null);
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        isLoggedIn: !!currentUser,
        isLoading,
        loginWithPhone,
        loginWithEmail,
        loginWithSchoolNumber,
        loginWithPhoneOrEmail,
        loginStaff,
        loginParent,
        registerStudent,
        registerTeacher,
        logout,
        darkMode,
        toggleDarkMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
