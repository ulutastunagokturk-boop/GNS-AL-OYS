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
        if (parsedEmail === 'ulutastunagokturk@gmail.com' || parsed.uid === 'admin-owner-ulutas' || parsed.role !== 'admin') {
          // Explicitly wiped
          localStorage.removeItem(AUTH_STORAGE_KEY);
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
          setCurrentUser(null);
          return;
        }

        const live = dataService.getUserById(parsed.uid) || dataService.getUsers().find(u => u.email?.toLowerCase() === parsedEmail);
        if (live && live.role === 'admin') {
          setCurrentUser(live);
        } else {
          // Check Firestore before discarding session
          dataService.findAndSyncUserFromFirestore({ email: parsed.email, schoolNumber: parsed.schoolNumber }).then(found => {
            if (found && found.role === 'admin' && (found.email || '').toLowerCase().trim() !== 'ulutastunagokturk@gmail.com') {
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

  const loginWithPhoneOrEmail = async (identifier: string, _pass?: string, rememberMe: boolean = false): Promise<UserProfile> => {
    const clean = identifier.trim();
    if (!clean) {
      throw new Error('Lütfen telefon numaranızı veya e-posta adresinizi giriniz.');
    }
    // Attempt real-time Firestore sync first for multi-device sync
    let user: UserProfile | undefined;
    try {
      user = (await dataService.findAndSyncUserFromFirestore({ identifier: clean })) || undefined;
    } catch {}
    if (!user) {
      user = dataService.getUserByPhoneOrEmail(clean);
    }
    if (!user) {
      throw new Error(`'${identifier}' bilgisiyle eşleşen bir kullanıcı hesabı bulunamadı. Lütfen okul idaresi ile iletişime geçiniz.`);
    }
    if (user.status === 'deactivated') {
      throw new Error('Hesabınız okul yönetimi tarafından askıya alınmıştır.');
    }
    saveUserSession(user, rememberMe);
    return user;
  };

  const loginWithEmail = async (email: string, _pass?: string, rememberMe: boolean = false): Promise<UserProfile> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Lütfen e-posta adresinizi giriniz.');
    }
    let user: UserProfile | undefined;
    try {
      user = (await dataService.findAndSyncUserFromFirestore({ email: cleanEmail })) || undefined;
    } catch {}
    if (!user) {
      user = dataService.getUsers().find(u => u.email?.toLowerCase() === cleanEmail);
    }
    if (!user) {
      throw new Error('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.');
    }
    if (user.status === 'deactivated') {
      throw new Error('Hesabınız okul yönetimi tarafından askıya alınmıştır.');
    }
    saveUserSession(user, rememberMe);
    return user;
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

    // Attempt real-time Firestore sync first for multi-device sync
    let user: UserProfile | undefined;
    try {
      user = (await dataService.findAndSyncUserFromFirestore({ schoolNumber: cleanNo })) || undefined;
    } catch {}
    if (!user) {
      user = dataService.getUserBySchoolNumber(cleanNo);
    }

    if (!user) {
      throw new Error(`'${cleanNo}' numaralı öğrenci kaydı bulunamadı. Öğrenci hesapları okul yönetimi tarafından tanımlanmaktadır. Lütfen okul idaresi ile iletişime geçiniz.`);
    }
    if (user.status === 'deactivated') {
      throw new Error('Hesabınız okul yönetimi tarafından askıya alınmıştır.');
    }

    // Check student password
    if (user.password) {
      if (user.password !== cleanPass) {
        throw new Error('Girdiğiniz öğrenci şifresi hatalıdır. Lütfen okul idarenizden aldığınız şifreyi kontrol edip tekrar deneyiniz.');
      }
    } else {
      // If legacy student account without password, assign entered password
      await dataService.updateUserProfile(user.uid, { password: cleanPass });
      user.password = cleanPass;
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

    const cleanDigits = cleanId.replace(/\D/g, '');

    let parentUser: UserProfile | undefined = undefined;

    // 1. Try finding parent by direct phone or email
    const allUsers = dataService.getUsers();
    parentUser = allUsers.find(u => 
      u.role === 'parent' && (
        (cleanDigits && u.phone && (u.phone.replace(/\D/g, '') === cleanDigits || u.phone.replace(/\D/g, '').endsWith(cleanDigits))) ||
        (u.email && u.email.toLowerCase() === cleanId.toLowerCase())
      )
    );

    // 2. If not found and input looks like a student school number, look up student
    if (!parentUser) {
      let student = dataService.getUserBySchoolNumber(cleanId);
      if (!student) {
        try {
          student = (await dataService.findAndSyncUserFromFirestore({ schoolNumber: cleanId })) || undefined;
        } catch {}
      }

      if (student) {
        // Find existing parent linked to this student
        parentUser = allUsers.find(u => 
          u.role === 'parent' && (
            (u.studentIds && u.studentIds.includes(student!.uid)) ||
            (u.studentNumbers && u.studentNumbers.includes(student!.schoolNumber || cleanId)) ||
            (student!.parentId && u.uid === student!.parentId)
          )
        );

        // If no separate parent account exists yet, automatically create one linked to this student
        if (!parentUser) {
          const autoParent: UserProfile = {
            uid: `parent-${cleanId}-${Date.now()}`,
            displayName: student.parentName || `${student.displayName} Velisi`,
            email: `veli.${cleanId}@gnsial.meb.k12.tr`,
            phone: student.parentPhone || '',
            role: 'parent',
            password: cleanPass,
            status: 'active',
            studentIds: [student.uid],
            studentNumbers: [cleanId],
            createdAt: new Date().toISOString()
          };
          await dataService.addUserProfile(autoParent);
          await dataService.updateUserProfile(student.uid, {
            parentId: autoParent.uid,
            parentName: autoParent.displayName
          });
          parentUser = autoParent;
        }
      }
    }

    if (!parentUser) {
      throw new Error(`'${identifier}' bilgisine ait veli veya öğrenci kaydı bulunamadı. Lütfen okul idareniz ile iletişime geçiniz.`);
    }

    if (parentUser.status === 'deactivated') {
      throw new Error('Veli hesabınız okul yönetimi tarafından dondurulmuştur.');
    }

    // Verify parent password
    if (parentUser.password) {
      if (parentUser.password !== cleanPass) {
        throw new Error('Girdiğiniz veli şifresi hatalıdır. Lütfen şifrenizi kontrol edip tekrar deneyiniz.');
      }
    } else {
      await dataService.updateUserProfile(parentUser.uid, { password: cleanPass });
      parentUser.password = cleanPass;
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
