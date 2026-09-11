import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { 
  UserProfile, 
  Announcement, 
  Homework, 
  HomeworkSubmission, 
  GradeRecord, 
  AttendanceRecord, 
  NotificationItem, 
  SchoolClass, 
  HomeworkStatus, 
  AttendanceStatus, 
  Badge, 
  StudentBadge, 
  LeaderboardEntry, 
  Conversation, 
  ChatMessage, 
  SystemAuditLog, 
  UserRole, 
  UserStatus, 
  Attachment, 
  RoleAssignment, 
  AnnouncementViewer,
  WeeklyScheduleSlot,
  DayOfWeek,
  ExcelStudentRow,
  ExcelImportSummary
} from '../types';
import { 
  INITIAL_CLASSES, 
  INITIAL_TEACHERS, 
  INITIAL_ADMIN, 
  generateStudentCohort, 
  INITIAL_ANNOUNCEMENTS, 
  INITIAL_HOMEWORKS, 
  PREDEFINED_BADGES, 
  INITIAL_CONVERSATIONS, 
  INITIAL_MESSAGES 
} from './seedData';
import { generateDefaultSchedule } from './scheduleData';
import { generateUniqueStudentPassword } from '../utils/passwordGenerator';
import { supabaseBackupService } from './supabaseService';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
    }
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

/**
 * Strips all undefined fields recursively so Firestore setDoc/updateDoc never fails
 * with 'Unsupported field value: undefined'.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as any;
  }
  return data;
}

const CACHE_STORAGE_KEY = 'gnisal_oys_manual_classes_v11';

export interface LocalCacheStore {
  users: UserProfile[];
  roleAssignments: RoleAssignment[];
  announcements: Announcement[];
  homeworks: Homework[];
  submissions: HomeworkSubmission[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  classes: SchoolClass[];
  notifications: NotificationItem[];
  badges: Badge[];
  studentBadges: StudentBadge[];
  conversations: Conversation[];
  messages: ChatMessage[];
  systemLogs: SystemAuditLog[];
  schedules: WeeklyScheduleSlot[];
  scheduleNotes: Record<string, string>; // key: `${userId}_${slotIdOrKey}` -> note text
  lastUpdated: number;
}

class DataService {
  private cache: LocalCacheStore;
  private listeners: Map<string, () => void> = new Map();
  private subscribers: Set<() => void> = new Set();
  public isOnline: boolean = true;
  public isInitialized: boolean = false;

  constructor() {
    this.cache = this.loadInitialCache();
    this.initData();
  }

  private loadInitialCache(): LocalCacheStore {
    try {
      const saved = localStorage.getItem(CACHE_STORAGE_KEY);
      if (saved) {
        const parsed: LocalCacheStore = JSON.parse(saved);
        // Purge any test or legacy mock accounts
        parsed.users = (parsed.users || []).filter(u => {
          const uid = (u.uid || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          const name = (u.displayName || '').toLowerCase();
          if (
            uid === 'test-user' || 
            uid === 'sync-test-device-check' || 
            uid === 'user-1788116379466-295' || 
            uid === 'user-1788848295245-674' || 
            uid.includes('sync-test') || 
            email.includes('test-device') || 
            email === '123@123' || 
            email === '123@gnsial.k12.tr' || 
            name === 'test' || 
            name === '123' || 
            name === 'cihaz eşitleme testi'
          ) {
            return false;
          }
          return (
            u.email !== 'yonetim@okul.k12.tr' && 
            u.email !== 'canan.ozkan@okul.k12.tr' &&
            u.email !== 'ahmet.yilmaz@okul.k12.tr'
          );
        });

        // Purge any mock generated schedule slots from cache
        parsed.schedules = (parsed.schedules || []).filter(s => 
          !s.id.startsWith('slot-10A-') &&
          !s.id.startsWith('slot-9A-') &&
          !s.id.startsWith('slot-10B-') &&
          !s.id.startsWith('slot-11A-') &&
          !s.id.startsWith('slot-11B-') &&
          !s.id.startsWith('slot-12A-')
        );

        if (!parsed.users.some(u => u.email?.toLowerCase() === INITIAL_ADMIN.email.toLowerCase())) {
          parsed.users.unshift(INITIAL_ADMIN);
        }
        if (!parsed.users.some(u => u.email?.toLowerCase() === 'ulutastunagokturk@gmail.com')) {
          parsed.users.push({
            uid: 'admin-owner-ulutas',
            email: 'ulutastunagokturk@gmail.com',
            displayName: 'Tuna Göktürk Ulutaş (Yönetici)',
            role: 'admin',
            phone: '0555 000 0001',
            status: 'active',
            isOnline: true,
            createdAt: new Date().toISOString()
          });
        }
        // Ensure all students have a unique password defined
        let cacheUpdated = false;
        parsed.users = parsed.users.map(u => {
          if (u.role === 'student' && !u.password) {
            cacheUpdated = true;
            return {
              ...u,
              password: generateUniqueStudentPassword({ schoolNumber: u.schoolNumber })
            };
          }
          return u;
        });
        if (cacheUpdated) {
          try {
            localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(parsed));
          } catch {}
        }
        if (!parsed.schedules) {
          parsed.schedules = [];
        }
        if (!parsed.scheduleNotes) {
          parsed.scheduleNotes = {};
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }

    // Pure Clean Initial State with both Root Admins
    const ownerAdmin: UserProfile = {
      uid: 'admin-owner-ulutas',
      email: 'ulutastunagokturk@gmail.com',
      displayName: 'Tuna Göktürk Ulutaş (Yönetici)',
      role: 'admin',
      phone: '0555 000 0001',
      status: 'active',
      isOnline: true,
      createdAt: new Date().toISOString()
    };
    const allUsers = [INITIAL_ADMIN, ownerAdmin];
    
    const initialRoleAssignments: RoleAssignment[] = [
      {
        id: 'assign-admin-1',
        userEmail: INITIAL_ADMIN.email,
        userName: INITIAL_ADMIN.displayName,
        assignedRole: 'admin',
        assignedBy: 'Sistem Kurucusu / Kök Yetkili',
        assignedAt: new Date().toISOString(),
        status: 'active',
        notes: 'Ana Yönetici (Root Admin) tam yetkili sistem yöneticisi',
        permissions: [
          'Tam Sistem ve Veritabanı Erişimi',
          'Yeni Yönetici (Admin) ve Öğretmen Atama',
          'Tüm Not, Sınav ve Devamsızlık Yönetimi',
          'Öğrenci ve Sınıf Kayıt İşlemleri',
          'Firestore Güvenlik & Sistem Logları'
        ]
      },
      {
        id: 'assign-admin-owner',
        userEmail: ownerAdmin.email,
        userName: ownerAdmin.displayName,
        assignedRole: 'admin',
        assignedBy: 'Sistem Kurucusu / Kök Yetkili',
        assignedAt: new Date().toISOString(),
        status: 'active',
        notes: 'Okul Müdürü & Sistem Yöneticisi',
        permissions: [
          'Tam Sistem ve Veritabanı Erişimi',
          'Yeni Yönetici (Admin) ve Öğretmen Atama',
          'Tüm Not, Sınav ve Devamsızlık Yönetimi',
          'Öğrenci ve Sınıf Kayıt İşlemleri',
          'Firestore Güvenlik & Sistem Logları'
        ]
      }
    ];

    const systemLogs: SystemAuditLog[] = [
      {
        id: 'log-1',
        action: 'Sistem Başlatıldı',
        actorName: 'Tlogix Okul Yönetimi (Root Admin)',
        actorRole: 'admin',
        target: 'GNSİAL OYS',
        details: 'Portal temiz sıfır durumunda başlatıldı. Tüm kontrol yöneticilere aktarıldı.',
        timestamp: new Date().toISOString()
      }
    ];

    const initialStore: LocalCacheStore = {
      users: allUsers,
      roleAssignments: initialRoleAssignments,
      announcements: [],
      homeworks: [],
      submissions: [],
      grades: [],
      attendance: [],
      classes: INITIAL_CLASSES,
      notifications: [],
      badges: PREDEFINED_BADGES,
      studentBadges: [],
      conversations: [],
      messages: [],
      systemLogs: systemLogs,
      schedules: [],
      scheduleNotes: {},
      lastUpdated: Date.now()
    };

    this.saveCache(initialStore);
    return initialStore;
  }

  private saveCache(store: LocalCacheStore) {
    this.cache = store;
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('LocalStorage limit reached or disabled', e);
    }
    this.notifySubscribers();

    // Supabase İkincil Bulut Yedeklemesi (Arka Plan Asenkron Çalışan)
    try {
      supabaseBackupService.scheduleAutoBackup(store);
    } catch (err) {
      console.warn('[DataService] Failed to schedule auto backup to Supabase:', err);
    }
  }

  public async triggerSupabaseBackup(type: 'auto' | 'manual' = 'manual') {
    return supabaseBackupService.triggerBackup(this.cache, type);
  }

  public async triggerSupabaseTableSync() {
    return supabaseBackupService.syncAllToDatabase(this.cache);
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    this.subscribers.forEach(cb => {
      try { cb(); } catch (err) { console.error(err); }
    });
  }

  private async initData() {
    try {
      // 1. First sync from live Supabase PostgreSQL database tables and backups
      await this.syncFromSupabaseDatabase();

      // 2. Setup Firestore listeners & sync
      this.setupFirestoreListeners();
      await this.syncUsersFromFirestore();
      await this.seedInitialAdminIfMissing();
      await this.seedInitialClassesAndSchedulesIfMissing();

      // 3. Ensure live relational database has current classes and users
      await this.seedSupabaseIfEmpty();

      this.isInitialized = true;
      this.setupLiveSyncPolling();
    } catch (err) {
      console.log('Running in local-first cached mode with Firebase fallback', err);
    }
  }

  /**
   * Supabase PostgreSQL veritabanından tüm güncel okul verilerini çeker
   */
  public async syncFromSupabaseDatabase(silent: boolean = false): Promise<boolean> {
    try {
      const { success, state } = await supabaseBackupService.fetchDatabaseState();
      if (success && state && typeof state === 'object') {
        let changed = false;

        if (Array.isArray(state.users) && state.users.length > 0) {
          const userMap = new Map<string, UserProfile>();
          // Preserve local root admin
          userMap.set(INITIAL_ADMIN.uid, INITIAL_ADMIN);
          // Put existing cache users
          this.cache.users.forEach(u => userMap.set(u.uid, u));
          // Overwrite with live database users
          state.users.forEach(u => userMap.set(u.uid, u));
          this.cache.users = Array.from(userMap.values());
          changed = true;
        }

        if (Array.isArray(state.classes) && state.classes.length > 0) {
          const classMap = new Map<string, SchoolClass>();
          this.cache.classes.forEach(c => classMap.set(c.id, c));
          state.classes.forEach(c => classMap.set(c.id, c));
          this.cache.classes = Array.from(classMap.values());
          changed = true;
        }

        if (Array.isArray(state.announcements) && state.announcements.length > 0) {
          const annMap = new Map<string, Announcement>();
          this.cache.announcements.forEach(a => annMap.set(a.id, a));
          state.announcements.forEach(a => annMap.set(a.id, a));
          this.cache.announcements = Array.from(annMap.values());
          changed = true;
        }

        if (Array.isArray(state.homeworks) && state.homeworks.length > 0) {
          const hwMap = new Map<string, Homework>();
          this.cache.homeworks.forEach(h => hwMap.set(h.id, h));
          state.homeworks.forEach(h => hwMap.set(h.id, h));
          this.cache.homeworks = Array.from(hwMap.values());
          changed = true;
        }

        if (Array.isArray(state.submissions) && state.submissions.length > 0) {
          const subMap = new Map<string, HomeworkSubmission>();
          this.cache.submissions.forEach(s => subMap.set(s.id, s));
          state.submissions.forEach(s => subMap.set(s.id, s));
          this.cache.submissions = Array.from(subMap.values());
          changed = true;
        }

        if (Array.isArray(state.grades) && state.grades.length > 0) {
          const grdMap = new Map<string, GradeRecord>();
          this.cache.grades.forEach(g => grdMap.set(g.id, g));
          state.grades.forEach(g => grdMap.set(g.id, g));
          this.cache.grades = Array.from(grdMap.values());
          changed = true;
        }

        if (Array.isArray(state.attendance) && state.attendance.length > 0) {
          const attMap = new Map<string, AttendanceRecord>();
          this.cache.attendance.forEach(a => attMap.set(a.id, a));
          state.attendance.forEach(a => attMap.set(a.id, a));
          this.cache.attendance = Array.from(attMap.values());
          changed = true;
        }

        if (Array.isArray(state.schedules) && state.schedules.length > 0) {
          this.cache.schedules = state.schedules;
          changed = true;
        }

        if (Array.isArray(state.roleAssignments) && state.roleAssignments.length > 0) {
          this.cache.roleAssignments = state.roleAssignments;
          changed = true;
        }

        if (changed) {
          try {
            localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(this.cache));
          } catch {}
          this.notifySubscribers();
          if (!silent) {
            console.log('[DataService] Canlı Supabase veritabanından veriler başarıyla yüklendi!');
          }
        }
        return true;
      }
    } catch (e) {
      if (!silent) console.warn('[DataService] syncFromSupabaseDatabase note:', e);
    }
    return false;
  }

  private async seedSupabaseIfEmpty() {
    try {
      const status = await supabaseBackupService.getStatus();
      const hasNoRecords = !status.tableCounts || (status.tableCounts.profiles === 0 && status.tableCounts.classes === 0);
      if (hasNoRecords && status.configured) {
        console.log('[DataService] Supabase tabloları henüz boş, ilk veri yüklemesi yapılıyor...');
        await supabaseBackupService.syncAllToDatabase(this.cache);
      }
    } catch (e) {
      console.warn('[DataService] seedSupabaseIfEmpty note:', e);
    }
  }

  private liveSyncTimer: any = null;
  private setupLiveSyncPolling() {
    if (this.liveSyncTimer) return;
    this.liveSyncTimer = setInterval(() => {
      this.syncFromSupabaseDatabase(true);
    }, 15000);

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.syncFromSupabaseDatabase(true);
      });
    }
  }

  /**
   * Ensures initial classes exist in Firestore.
   */
  private async seedInitialClassesAndSchedulesIfMissing() {
    try {
      const classesSnap = await getDocs(collection(db, 'classes'));
      if (classesSnap.empty) {
        for (const c of INITIAL_CLASSES) {
          await setDoc(doc(db, 'classes', c.id), sanitizeForFirestore(c));
        }
      }
    } catch (e) {
      console.log('[Firestore] seedInitialClasses note:', e);
    }
  }

  /**
   * Complete multi-device cloud synchronization utility.
   */
  public async forceSyncAllWithFirestore(): Promise<{
    success: boolean;
    syncedUsersCount: number;
    syncedClassesCount: number;
    syncedSchedulesCount: number;
    message: string;
    error?: string;
  }> {
    try {
      // 1. Push any local users missing in Firestore
      for (const u of this.cache.users) {
        try {
          const uDocRef = doc(db, 'users', u.uid);
          const snap = await getDoc(uDocRef);
          if (!snap.exists()) {
            await setDoc(uDocRef, sanitizeForFirestore(u));
          }
        } catch {}
      }

      // 2. Fetch all users from Firestore and merge
      await this.syncUsersFromFirestore();

      // 3. Seed classes & schedules if missing in Firestore
      await this.seedInitialClassesAndSchedulesIfMissing();

      // 4. Also push any local role assignments missing
      for (const ra of (this.cache.roleAssignments || [])) {
        try {
          const raRef = doc(db, 'role_assignments', ra.id);
          const rSnap = await getDoc(raRef);
          if (!rSnap.exists()) {
            await setDoc(raRef, sanitizeForFirestore(ra));
          }
        } catch {}
      }

      // 5. Query latest classes
      const cSnap = await getDocs(collection(db, 'classes'));
      if (!cSnap.empty) {
        const clsList: SchoolClass[] = [];
        cSnap.forEach(d => {
          const raw = d.data() as any;
          clsList.push({
            id: d.id,
            name: raw.name || '',
            gradeLevel: raw.gradeLevel || 9,
            branch: raw.branch || raw.section || (raw.name ? raw.name.split('-')[1] : 'A') || 'A',
            advisorTeacher: raw.advisorTeacher || '',
            capacity: raw.capacity || 30
          });
        });
        this.cache.classes = clsList;
      }

      // 6. Query latest schedules
      const sSnap = await getDocs(collection(db, 'schedules'));
      if (!sSnap.empty) {
        const schedList: WeeklyScheduleSlot[] = [];
        sSnap.forEach(d => schedList.push({ id: d.id, ...(d.data() as WeeklyScheduleSlot) }));
        this.cache.schedules = schedList;
      }

      this.saveCache(this.cache);
      this.notifySubscribers();

      return {
        success: true,
        syncedUsersCount: this.cache.users.length,
        syncedClassesCount: this.cache.classes.length,
        syncedSchedulesCount: this.cache.schedules.length,
        message: `Bulut veritabanı ile tam eşitleme tamamlandı! ${this.cache.users.length} kullanıcı, ${this.cache.classes.length} sınıf ve ${this.cache.schedules.length} program hazır.`
      };
    } catch (e: any) {
      return {
        success: false,
        syncedUsersCount: this.cache.users.length,
        syncedClassesCount: this.cache.classes.length,
        syncedSchedulesCount: this.cache.schedules.length,
        message: 'Eşitleme hatası: ' + (e.message || String(e)),
        error: e.message || String(e)
      };
    }
  }

  /**
   * Ensures INITIAL_ADMIN and owner admin exist in Firestore.
   */
  private async seedInitialAdminIfMissing() {
    try {
      const adminDocRef = doc(db, 'users', INITIAL_ADMIN.uid);
      const adminSnap = await getDoc(adminDocRef);
      if (!adminSnap.exists()) {
        await setDoc(adminDocRef, sanitizeForFirestore(INITIAL_ADMIN));
        console.log('[Firestore] Seeded INITIAL_ADMIN to Firestore');
      }

      const ownerAdmin: UserProfile = {
        uid: 'admin-owner-ulutas',
        email: 'ulutastunagokturk@gmail.com',
        displayName: 'Tuna Göktürk Ulutaş (Yönetici)',
        role: 'admin',
        phone: '0555 000 0001',
        status: 'active',
        isOnline: true,
        createdAt: new Date().toISOString()
      };
      const ownerDocRef = doc(db, 'users', ownerAdmin.uid);
      const ownerSnap = await getDoc(ownerDocRef);
      if (!ownerSnap.exists()) {
        await setDoc(ownerDocRef, sanitizeForFirestore(ownerAdmin));
      }

      // Also ensure any non-test users currently in local cache are synced to Firestore if missing
      for (const u of this.cache.users) {
        if (
          u.uid === 'test-user' || 
          u.uid === 'sync-test-device-check' || 
          u.uid === 'user-1788116379466-295' || 
          u.uid === 'user-1788848295245-674' || 
          u.displayName === 'test' || 
          u.displayName === '123' ||
          u.email?.includes('test-device')
        ) {
          continue;
        }
        try {
          const userDocRef = doc(db, 'users', u.uid);
          const uSnap = await getDoc(userDocRef);
          if (!uSnap.exists()) {
            await setDoc(userDocRef, sanitizeForFirestore(u));
          }
        } catch {}
      }
    } catch (err) {
      console.log('[Firestore] seedInitialAdmin note:', err);
    }
  }

  /**
   * Diagnostic test to check live Firestore latency and document health.
   */
  public async testFirestoreConnection(): Promise<{ success: boolean; latencyMs: number; userCount: number; message: string; error?: string }> {
    const start = performance.now();
    try {
      const snap = await getDocs(collection(db, 'users'));
      const latency = Math.round(performance.now() - start);
      return {
        success: true,
        latencyMs: latency,
        userCount: snap.size,
        message: `Firestore veritabanı aktif ve bağlı. (${snap.size} kullanıcı kaydı doğrulandı)`
      };
    } catch (e: any) {
      return {
        success: false,
        latencyMs: Math.round(performance.now() - start),
        userCount: 0,
        message: 'Firestore bağlantı hatası: ' + (e.message || String(e)),
        error: e.message || String(e)
      };
    }
  }

  public async syncUsersFromFirestore(): Promise<UserProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        const remoteUsers: UserProfile[] = [];
        snap.forEach(docSnap => {
          remoteUsers.push({ ...(docSnap.data() as UserProfile), uid: docSnap.id });
        });

        const mergedMap = new Map<string, UserProfile>();
        mergedMap.set(INITIAL_ADMIN.uid, INITIAL_ADMIN);
        this.cache.users.forEach(u => mergedMap.set(u.uid, u));
        remoteUsers.forEach(u => mergedMap.set(u.uid, u));

        this.cache.users = Array.from(mergedMap.values());
        this.saveCache(this.cache);
        this.notifySubscribers();
        return this.cache.users;
      }
    } catch (err) {
      console.warn('Could not sync users from Firestore on startup:', err);
    }
    return this.cache.users;
  }

  public async findAndSyncUserFromFirestore(criteria: {
    schoolNumber?: string;
    email?: string;
    phone?: string;
    identifier?: string;
  }): Promise<UserProfile | null> {
    try {
      const usersRef = collection(db, 'users');
      let found: UserProfile | null = null;

      // Query Firestore directly
      const allSnap = await getDocs(usersRef);
      if (!allSnap.empty) {
        const remoteUsers: UserProfile[] = [];
        allSnap.forEach(d => {
          const u = { ...(d.data() as UserProfile), uid: d.id };
          remoteUsers.push(u);

          if (!found) {
            const targetSchool = criteria.schoolNumber?.trim();
            const targetEmail = criteria.email?.trim().toLowerCase();
            const targetPhone = criteria.phone?.replace(/\D/g, '');

            if (targetSchool && (u.schoolNumber === targetSchool || (u.role === 'student' && u.email?.includes(targetSchool)))) {
              found = u;
            } else if (targetEmail && u.email?.toLowerCase() === targetEmail) {
              found = u;
            } else if (targetPhone && u.phone) {
              const uClean = u.phone.replace(/\D/g, '');
              if (uClean === targetPhone || uClean.endsWith(targetPhone) || targetPhone.endsWith(uClean)) {
                found = u;
              }
            } else if (criteria.identifier) {
              const raw = criteria.identifier.trim().toLowerCase();
              const dig = raw.replace(/\D/g, '');
              const uCleanPhone = u.phone ? u.phone.replace(/\D/g, '') : '';
              if (
                u.email?.toLowerCase() === raw ||
                u.schoolNumber === raw ||
                (dig.length >= 7 && (uCleanPhone === dig || uCleanPhone.endsWith(dig) || dig.endsWith(uCleanPhone))) ||
                (dig && u.schoolNumber === dig) ||
                u.displayName?.toLowerCase() === raw
              ) {
                found = u;
              }
            }
          }
        });

        // Merge all remote users into cache
        const mergedMap = new Map<string, UserProfile>();
        mergedMap.set(INITIAL_ADMIN.uid, INITIAL_ADMIN);
        this.cache.users.forEach(u => mergedMap.set(u.uid, u));
        remoteUsers.forEach(u => mergedMap.set(u.uid, u));
        this.cache.users = Array.from(mergedMap.values());
        this.saveCache(this.cache);
        this.notifySubscribers();
      }

      return found;
    } catch (e) {
      console.warn('Error querying user directly from Firestore:', e);
      return null;
    }
  }

  private setupFirestoreListeners() {
    try {
      // Listen to users from Firestore in real-time
      const usersQuery = collection(db, 'users');
      const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
        if (!snapshot.empty) {
          const remoteUsers: UserProfile[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as UserProfile;
            remoteUsers.push({ ...data, uid: docSnap.id });
          });

          const mergedMap = new Map<string, UserProfile>();
          mergedMap.set(INITIAL_ADMIN.uid, INITIAL_ADMIN);
          this.cache.users.forEach(u => mergedMap.set(u.uid, u));
          remoteUsers.forEach(u => mergedMap.set(u.uid, u));

          this.cache.users = Array.from(mergedMap.values());
          this.saveCache(this.cache);
          this.notifySubscribers();
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'users');
      });
      this.listeners.set('users', unsubUsers);

      // Listen to role_assignments from Firestore
      const roleAssignQuery = query(collection(db, 'role_assignments'), orderBy('assignedAt', 'desc'));
      const unsubRoleAssign = onSnapshot(roleAssignQuery, (snapshot) => {
        if (!snapshot.empty) {
          const list: RoleAssignment[] = [];
          snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() } as RoleAssignment));
          this.cache.roleAssignments = list;
          this.saveCache(this.cache);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'role_assignments');
      });
      this.listeners.set('role_assignments', unsubRoleAssign);

      // Listen to announcements
      const annQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const unsubAnn = onSnapshot(annQuery, (snapshot) => {
        if (!snapshot.empty) {
          const list: Announcement[] = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Announcement));
          this.cache.announcements = list;
          this.saveCache(this.cache);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'announcements'));
      this.listeners.set('announcements', unsubAnn);

      // Listen to homeworks
      const hwQuery = query(collection(db, 'homeworks'), orderBy('createdAt', 'desc'));
      const unsubHw = onSnapshot(hwQuery, (snapshot) => {
        if (!snapshot.empty) {
          const list: Homework[] = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Homework));
          this.cache.homeworks = list;
          this.saveCache(this.cache);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'homeworks'));
      this.listeners.set('homeworks', unsubHw);

      // Listen to classes
      const classesQuery = query(collection(db, 'classes'), orderBy('name', 'asc'));
      const unsubClasses = onSnapshot(classesQuery, (snapshot) => {
        if (!snapshot.empty) {
          const list: SchoolClass[] = [];
          snapshot.forEach(doc => {
            const raw = doc.data() as any;
            list.push({
              id: doc.id,
              name: raw.name || '',
              gradeLevel: raw.gradeLevel || 9,
              branch: raw.branch || raw.section || (raw.name ? raw.name.split('-')[1] : 'A') || 'A',
              advisorTeacher: raw.advisorTeacher || '',
              capacity: raw.capacity || 30
            });
          });
          this.cache.classes = list;
          this.saveCache(this.cache);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'classes'));
      this.listeners.set('classes', unsubClasses);

      // Listen to schedules
      const schedQuery = collection(db, 'schedules');
      const unsubSched = onSnapshot(schedQuery, (snapshot) => {
        if (!snapshot.empty) {
          const list: WeeklyScheduleSlot[] = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as WeeklyScheduleSlot));
          this.cache.schedules = list;
          this.saveCache(this.cache);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'schedules'));
      this.listeners.set('schedules', unsubSched);

      // Listen to grades
      const gradesQuery = query(collection(db, 'grades'), orderBy('examDate', 'desc'));
      const unsubGrades = onSnapshot(gradesQuery, (snapshot) => {
        if (!snapshot.empty) {
          const list: GradeRecord[] = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as GradeRecord));
          this.cache.grades = list;
          this.saveCache(this.cache);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'grades'));
      this.listeners.set('grades', unsubGrades);

      // Listen to attendance
      const attQuery = query(collection(db, 'attendance'), orderBy('date', 'desc'));
      const unsubAtt = onSnapshot(attQuery, (snapshot) => {
        if (!snapshot.empty) {
          const list: AttendanceRecord[] = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as AttendanceRecord));
          this.cache.attendance = list;
          this.saveCache(this.cache);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'attendance'));
      this.listeners.set('attendance', unsubAtt);

      // Listen to chat_messages
      const msgQuery = query(collection(db, 'chat_messages'), orderBy('timestamp', 'asc'));
      const unsubMsg = onSnapshot(msgQuery, (snapshot) => {
        if (!snapshot.empty) {
          const list: ChatMessage[] = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as ChatMessage));
          this.cache.messages = list;
          this.saveCache(this.cache);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'chat_messages'));
      this.listeners.set('chat_messages', unsubMsg);
    } catch (e) {
      console.log('Realtime listener setup note:', e);
    }
  }

  // ================= USERS & AUTH =================
  public getUsers(): UserProfile[] {
    return this.cache.users;
  }

  public getStudents(): UserProfile[] {
    return this.cache.users.filter(u => u.role === 'student' && u.status !== 'deactivated');
  }

  public getTeachers(): UserProfile[] {
    return this.cache.users.filter(u => u.role === 'teacher' && u.status !== 'deactivated');
  }

  public getStudentsByClass(className: string): UserProfile[] {
    return this.cache.users.filter(u => u.role === 'student' && u.classGrade === className && u.status !== 'deactivated');
  }

  public getUserById(uid: string): UserProfile | undefined {
    return this.cache.users.find(u => u.uid === uid);
  }

  public getUserBySchoolNumber(schoolNo: string): UserProfile | undefined {
    const cleanNo = schoolNo.trim();
    return this.cache.users.find(u => 
      (u.schoolNumber && u.schoolNumber.trim() === cleanNo) || 
      (u.role === 'student' && u.email?.includes(cleanNo))
    );
  }

  public getUserByPhone(phone: string): UserProfile | undefined {
    const clean = phone.replace(/\D/g, '');
    if (!clean) return undefined;
    return this.cache.users.find(u => {
      if (!u.phone) return false;
      const uClean = u.phone.replace(/\D/g, '');
      return uClean === clean || uClean.endsWith(clean) || clean.endsWith(uClean);
    });
  }

  public getUserByPhoneOrEmail(identifier: string): UserProfile | undefined {
    const trimmed = identifier.trim();
    const cleanDigits = trimmed.replace(/\D/g, '');
    
    // If it looks like a phone number (mostly digits or starts with 0/+/5)
    if (cleanDigits.length >= 7) {
      const byPhone = this.getUserByPhone(cleanDigits);
      if (byPhone) return byPhone;
    }
    
    // If it matches a school number
    if (cleanDigits) {
      const bySchool = this.getUserBySchoolNumber(cleanDigits);
      if (bySchool) return bySchool;
    }

    // Otherwise or as fallback, check email, username, or exact school number
    const lower = trimmed.toLowerCase();
    return this.cache.users.find(u => 
      (u.email && u.email.toLowerCase() === lower) || 
      (u.phone && u.phone.replace(/\D/g, '') === cleanDigits) ||
      (u.schoolNumber && u.schoolNumber.trim() === trimmed) ||
      (u.displayName && u.displayName.toLowerCase() === lower)
    );
  }

  public async registerUser(profile: UserProfile): Promise<UserProfile> {
    const cleanPhone = profile.phone ? profile.phone.replace(/\D/g, '') : '';
    
    const exists = this.cache.users.some(u => {
      const uPhone = u.phone ? u.phone.replace(/\D/g, '') : '';
      return (
        (profile.schoolNumber && u.schoolNumber === profile.schoolNumber) || 
        (cleanPhone && uPhone && (uPhone === cleanPhone || uPhone.endsWith(cleanPhone) || cleanPhone.endsWith(uPhone))) ||
        (profile.email && u.email && u.email.toLowerCase() === profile.email.toLowerCase())
      );
    });

    if (exists) {
      throw new Error(profile.role === 'student' 
        ? 'Bu okul numarası veya telefon numarası ile zaten kayıtlı bir kullanıcı var.' 
        : 'Bu telefon numarası ile zaten kayıtlı bir kullanıcı var.');
    }

    const fullProfile: UserProfile = {
      ...profile,
      password: profile.password?.trim() || (profile.role === 'student' ? generateUniqueStudentPassword({ schoolNumber: profile.schoolNumber }) : undefined),
      status: profile.status || 'active',
      isOnline: true,
      totalXp: profile.totalXp || 100,
      level: profile.level || 1,
      createdAt: profile.createdAt || new Date().toISOString()
    };

    const updatedUsers = [fullProfile, ...this.cache.users];
    this.saveCache({ ...this.cache, users: updatedUsers });

    this.logSystemAction(
      'Kullanıcı Kaydedildi',
      fullProfile.displayName,
      fullProfile.role,
      fullProfile.email,
      `Yeni ${fullProfile.role === 'student' ? 'Öğrenci (' + fullProfile.classGrade + ')' : fullProfile.role === 'teacher' ? 'Öğretmen (' + fullProfile.branch + ')' : 'Yönetici'} kaydı oluşturuldu.`
    );

    try {
      await setDoc(doc(db, 'users', fullProfile.uid), sanitizeForFirestore(fullProfile));
    } catch (err) {
      console.log('Firebase sync background write:', err);
    }

    return fullProfile;
  }

  public async addUserProfile(profile: UserProfile): Promise<UserProfile> {
    const fullProfile: UserProfile = {
      ...profile,
      status: profile.status || 'active',
      isOnline: false,
      totalXp: profile.totalXp || 100,
      level: profile.level || 1,
      createdAt: profile.createdAt || new Date().toISOString()
    };

    const updatedUsers = [fullProfile, ...this.cache.users.filter(u => u.uid !== fullProfile.uid)];
    this.saveCache({ ...this.cache, users: updatedUsers });

    this.logSystemAction(
      'Yönetici Tarafından Kullanıcı Eklendi',
      fullProfile.displayName,
      fullProfile.role,
      fullProfile.email,
      `${fullProfile.role === 'student' ? 'Öğrenci' : fullProfile.role === 'teacher' ? 'Öğretmen' : 'Yönetici'} kaydı admin tarafından manuel olarak tanımlandı.`
    );

    try {
      await setDoc(doc(db, 'users', fullProfile.uid), sanitizeForFirestore(fullProfile));
    } catch (err) {
      console.log('Firebase sync background write:', err);
    }

    return fullProfile;
  }

  public async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    const updatedUsers = this.cache.users.map(u => u.uid === uid ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u);
    this.saveCache({ ...this.cache, users: updatedUsers });

    try {
      await setDoc(doc(db, 'users', uid), sanitizeForFirestore({ ...updates, updatedAt: new Date().toISOString() }), { merge: true });
    } catch (e) {
      console.log('Firestore user update note:', e);
    }
  }

  public getRoleAssignments(): RoleAssignment[] {
    return this.cache.roleAssignments || [];
  }

  /**
   * Retrieves all student profiles associated with a parent user.
   */
  public getStudentsForParent(parent: UserProfile): UserProfile[] {
    if (!parent || parent.role !== 'parent') return [];
    const allStudents = this.cache.users.filter(u => u.role === 'student');
    return allStudents.filter(s => {
      if (parent.studentIds && parent.studentIds.includes(s.uid)) return true;
      if (parent.studentNumbers && s.schoolNumber && parent.studentNumbers.includes(s.schoolNumber)) return true;
      if (s.parentId && s.parentId === parent.uid) return true;
      if (parent.phone && s.parentPhone && s.parentPhone.replace(/\D/g, '') === parent.phone.replace(/\D/g, '')) return true;
      return false;
    });
  }

  /**
   * Bulk imports student list and creates/links parent accounts from Excel data.
   */
  public async bulkImportStudentsFromExcel(rows: ExcelStudentRow[]): Promise<ExcelImportSummary> {
    let importedStudents = 0;
    let createdParents = 0;
    let skippedOrErrors = 0;
    const errors: { row: number; reason: string }[] = [];

    const updatedUsers = [...this.cache.users];
    const updatedClasses = [...this.cache.classes];
    const affectedUids: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIdx = i + 1;
      const cleanName = row.name?.trim();
      const cleanSchoolNo = row.schoolNumber ? String(row.schoolNumber).trim() : '';
      const cleanClass = row.classGrade ? String(row.classGrade).trim().toUpperCase() : '';

      if (!cleanName || !cleanSchoolNo || !cleanClass) {
        skippedOrErrors++;
        errors.push({ row: rowIdx, reason: 'Ad Soyad, Okul No veya Sınıf/Şube bilgisi eksik.' });
        continue;
      }

      // Ensure class exists
      const existingClass = updatedClasses.find(c => c.name.toUpperCase() === cleanClass);
      if (!existingClass) {
        const newClassId = `class-${cleanClass.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
        const newClassObj: SchoolClass = {
          id: newClassId,
          name: cleanClass,
          gradeLevel: parseInt(cleanClass.split('-')[0]) || 9,
          branch: cleanClass.includes('-') ? cleanClass.split('-')[1] : cleanClass,
          capacity: 34,
          advisorTeacher: 'Atanmadı'
        };
        updatedClasses.push(newClassObj);
      }

      // Check if student exists
      const existingStudentIdx = updatedUsers.findIndex(u => 
        u.role === 'student' && u.schoolNumber === cleanSchoolNo
      );

      const studentUid = existingStudentIdx >= 0 
        ? updatedUsers[existingStudentIdx].uid 
        : `student-${cleanSchoolNo}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      const studentPass = row.password?.trim() || 
        (existingStudentIdx >= 0 && updatedUsers[existingStudentIdx].password 
          ? updatedUsers[existingStudentIdx].password 
          : generateUniqueStudentPassword({ schoolNumber: cleanSchoolNo }));

      // Parent handling
      let parentUid: string | undefined = undefined;
      const cleanParentName = row.parentName?.trim();
      const cleanParentPhone = row.parentPhone?.trim();
      const cleanParentEmail = row.parentEmail?.trim().toLowerCase();
      const cleanParentPass = row.parentPassword?.trim() || `veli${cleanSchoolNo}`;

      if (cleanParentName || cleanParentPhone || cleanParentEmail) {
        // Search if parent already exists (by phone or email)
        const existingParentIdx = updatedUsers.findIndex(u => 
          u.role === 'parent' && (
            (cleanParentPhone && u.phone && u.phone.replace(/\D/g, '') === cleanParentPhone.replace(/\D/g, '')) ||
            (cleanParentEmail && u.email && u.email.toLowerCase() === cleanParentEmail)
          )
        );

        if (existingParentIdx >= 0) {
          const existingParent = updatedUsers[existingParentIdx];
          const newStudentIds = Array.from(new Set([...(existingParent.studentIds || []), studentUid]));
          const newStudentNumbers = Array.from(new Set([...(existingParent.studentNumbers || []), cleanSchoolNo]));
          updatedUsers[existingParentIdx] = {
            ...existingParent,
            studentIds: newStudentIds,
            studentNumbers: newStudentNumbers,
            updatedAt: new Date().toISOString()
          };
          parentUid = existingParent.uid;
          affectedUids.push(parentUid);
        } else {
          parentUid = `parent-${cleanSchoolNo}-${Date.now()}`;
          const newParent: UserProfile = {
            uid: parentUid,
            displayName: cleanParentName || `${cleanName} Velisi`,
            email: cleanParentEmail || `veli.${cleanSchoolNo}@gnsial.meb.k12.tr`,
            phone: cleanParentPhone || '',
            role: 'parent',
            password: cleanParentPass,
            status: 'active',
            studentIds: [studentUid],
            studentNumbers: [cleanSchoolNo],
            createdAt: new Date().toISOString()
          };
          updatedUsers.push(newParent);
          affectedUids.push(parentUid);
          createdParents++;
        }
      }

      const studentProfile: UserProfile = {
        uid: studentUid,
        displayName: cleanName,
        schoolNumber: cleanSchoolNo,
        classGrade: cleanClass,
        role: 'student',
        email: `ogrenci.${cleanSchoolNo}@gnsial.meb.k12.tr`,
        password: studentPass,
        status: 'active',
        parentId: parentUid,
        parentName: cleanParentName || (parentUid ? `${cleanName} Velisi` : undefined),
        parentPhone: cleanParentPhone,
        totalXp: existingStudentIdx >= 0 ? (updatedUsers[existingStudentIdx].totalXp || 100) : 100,
        level: existingStudentIdx >= 0 ? (updatedUsers[existingStudentIdx].level || 1) : 1,
        createdAt: existingStudentIdx >= 0 ? updatedUsers[existingStudentIdx].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (existingStudentIdx >= 0) {
        updatedUsers[existingStudentIdx] = { ...updatedUsers[existingStudentIdx], ...studentProfile };
      } else {
        updatedUsers.push(studentProfile);
      }
      affectedUids.push(studentUid);
      importedStudents++;
    }

    // Save locally
    this.cache.users = updatedUsers;
    this.cache.classes = updatedClasses;
    this.saveCache(this.cache);

    this.logSystemAction(
      'Excel Toplu Öğrenci İçe Aktarma',
      'Sistem Yöneticisi',
      'admin',
      'all-students',
      `Excel dosyasından ${importedStudents} öğrenci ve ${createdParents} veli hesabı başarıyla kaydedildi.`
    );

    // Sync affected users to Firestore in batches
    try {
      const batch = writeBatch(db);
      const uniqueAffected = Array.from(new Set(affectedUids));
      for (const uid of uniqueAffected) {
        const u = updatedUsers.find(x => x.uid === uid);
        if (u) {
          batch.set(doc(db, 'users', uid), sanitizeForFirestore(u), { merge: true });
        }
      }
      await batch.commit();
    } catch (e) {
      console.log('Batch firestore sync note:', e);
    }

    // Dual-write to Supabase asynchronously
    this.triggerSupabaseBackup('auto').catch(() => {});

    return {
      totalRows: rows.length,
      importedStudents,
      createdParents,
      skippedOrErrors,
      errors
    };
  }

  public async assignUserRole(data: {
    userEmail: string;
    userName: string;
    assignedRole: UserRole;
    classGrade?: string;
    branch?: string;
    schoolNumber?: string;
    password?: string;
    phone?: string;
    notes?: string;
    assignedBy: string;
    permissions?: string[];
  }): Promise<{ user: UserProfile; assignment: RoleAssignment }> {
    const trimmedEmail = data.userEmail.trim().toLowerCase();
    const existingUser = this.cache.users.find(u => 
      (u.email && u.email.toLowerCase() === trimmedEmail) || 
      (data.schoolNumber && u.schoolNumber === data.schoolNumber)
    );

    const determinedPassword = data.password?.trim() || 
      (data.assignedRole === 'student' ? (existingUser?.password || generateUniqueStudentPassword({ schoolNumber: data.schoolNumber })) : existingUser?.password);

    let targetUser: UserProfile;
    if (existingUser) {
      targetUser = {
        ...existingUser,
        displayName: data.userName.trim() || existingUser.displayName,
        role: data.assignedRole,
        classGrade: data.assignedRole === 'student' ? (data.classGrade || existingUser.classGrade) : undefined,
        branch: data.assignedRole === 'teacher' ? (data.branch || existingUser.branch) : undefined,
        schoolNumber: data.assignedRole === 'student' ? (data.schoolNumber || existingUser.schoolNumber) : undefined,
        password: determinedPassword,
        phone: data.phone?.trim() || existingUser.phone,
        status: 'active',
        updatedAt: new Date().toISOString()
      };
      this.cache.users = this.cache.users.map(u => u.uid === targetUser.uid ? targetUser : u);
    } else {
      const newUid = `user-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      targetUser = {
        uid: newUid,
        email: data.userEmail.trim(),
        displayName: data.userName.trim(),
        role: data.assignedRole,
        classGrade: data.assignedRole === 'student' ? data.classGrade : undefined,
        branch: data.assignedRole === 'teacher' ? data.branch : undefined,
        schoolNumber: data.assignedRole === 'student' ? (data.schoolNumber || `${Math.floor(1000 + Math.random() * 9000)}`) : undefined,
        password: determinedPassword,
        phone: data.phone?.trim(),
        status: 'active',
        totalXp: data.assignedRole === 'student' ? 100 : undefined,
        level: data.assignedRole === 'student' ? 1 : undefined,
        createdAt: new Date().toISOString()
      };
      this.cache.users = [targetUser, ...this.cache.users];
    }

    const assignmentId = `assign-${Date.now()}`;
    const newAssignment: RoleAssignment = {
      id: assignmentId,
      userEmail: targetUser.email,
      userName: targetUser.displayName,
      assignedRole: data.assignedRole,
      classGrade: targetUser.classGrade,
      branch: targetUser.branch,
      schoolNumber: targetUser.schoolNumber,
      assignedBy: data.assignedBy,
      assignedAt: new Date().toISOString(),
      status: 'active',
      notes: data.notes || `Yönetici (${data.assignedBy}) tarafından ${data.assignedRole === 'teacher' ? 'Öğretmen' : data.assignedRole === 'student' ? 'Öğrenci' : 'Yönetici'} rolü atandı.`,
      permissions: data.permissions
    };

    const currentAssignments = (this.cache.roleAssignments || []).filter(a => (a.userEmail && targetUser.email) ? a.userEmail.toLowerCase() !== targetUser.email.toLowerCase() : true);
    this.cache.roleAssignments = [newAssignment, ...currentAssignments];
    this.saveCache(this.cache);

    this.logSystemAction(
      'Kullanıcı Rolü & Yetkisi Atandı (Firestore)',
      data.assignedBy,
      'admin',
      targetUser.displayName,
      `${targetUser.displayName} (${targetUser.email}) için '${data.assignedRole.toUpperCase()}' rolü ve yetkilendirmesi tanımlandı ve Firestore veritabanına kaydedildi.`
    );

    // Persist to Firestore
    try {
      await setDoc(doc(db, 'users', targetUser.uid), sanitizeForFirestore(targetUser));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${targetUser.uid}`);
    }

    try {
      await setDoc(doc(db, 'role_assignments', assignmentId), sanitizeForFirestore(newAssignment));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `role_assignments/${assignmentId}`);
    }

    return { user: targetUser, assignment: newAssignment };
  }

  public async revokeRoleAssignment(assignmentId: string, adminName: string): Promise<void> {
    const assignment = (this.cache.roleAssignments || []).find(a => a.id === assignmentId);
    if (!assignment) return;

    const updatedAssignment: RoleAssignment = {
      ...assignment,
      status: 'revoked'
    };

    this.cache.roleAssignments = this.cache.roleAssignments.map(a => a.id === assignmentId ? updatedAssignment : a);
    this.saveCache(this.cache);

    this.logSystemAction(
      'Rol Yetkisi İptal Edildi',
      adminName,
      'admin',
      assignment.userName,
      `${assignment.userName} kullanıcısının ${assignment.assignedRole} rol ataması iptal edildi.`
    );

    try {
      await updateDoc(doc(db, 'role_assignments', assignmentId), { status: 'revoked' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `role_assignments/${assignmentId}`);
    }
  }

  public async changeUserRole(uid: string, newRole: UserRole, adminName: string): Promise<void> {
    const user = this.getUserById(uid);
    if (!user) return;

    await this.assignUserRole({
      userEmail: user.email,
      userName: user.displayName,
      assignedRole: newRole,
      classGrade: user.classGrade,
      branch: user.branch,
      schoolNumber: user.schoolNumber,
      phone: user.phone,
      assignedBy: adminName,
      notes: `Rol açılır menüden ${user.role} -> ${newRole} olarak güncellendi.`
    });
  }

  public async toggleUserStatus(uid: string, newStatus: UserStatus, adminName: string): Promise<void> {
    const user = this.getUserById(uid);
    if (!user) return;

    await this.updateUserProfile(uid, { status: newStatus });
    this.logSystemAction(
      'Hesap Durumu Değiştirildi',
      adminName,
      'admin',
      user.displayName,
      `Hesap durumu '${newStatus === 'active' ? 'Aktif' : 'Pasife Alındı (Donduruldu)'}' olarak ayarlandı.`
    );
  }

  public async resetUserPassword(uid: string, newPassword: string, adminName: string): Promise<string> {
    const user = this.getUserById(uid);
    if (!user) throw new Error('Kullanıcı bulunamadı.');
    const cleanPassword = newPassword.trim();
    if (!cleanPassword) throw new Error('Şifre boş olamaz.');

    await this.updateUserProfile(uid, { password: cleanPassword });
    this.logSystemAction(
      'Öğrenci / Kullanıcı Şifresi Güncellendi',
      adminName,
      'admin',
      user.displayName,
      `${user.displayName} (${user.role === 'student' ? 'No: #' + user.schoolNumber : user.email}) kullanıcısına yeni giriş şifresi tanımlandı.`
    );
    return cleanPassword;
  }

  public async batchEnsureStudentPasswords(adminName: string): Promise<{ updatedCount: number; students: UserProfile[] }> {
    const students = this.cache.users.filter(u => u.role === 'student');
    let updatedCount = 0;
    const updatedUsers = this.cache.users.map(u => {
      if (u.role === 'student' && !u.password) {
        updatedCount++;
        return {
          ...u,
          password: generateUniqueStudentPassword({ schoolNumber: u.schoolNumber }),
          updatedAt: new Date().toISOString()
        };
      }
      return u;
    });

    if (updatedCount > 0) {
      this.saveCache({ ...this.cache, users: updatedUsers });
      this.logSystemAction(
        'Toplu Öğrenci Şifresi Tanımlandı',
        adminName,
        'admin',
        `${updatedCount} Öğrenci`,
        `${updatedCount} adet öğrenci için otomatik eşsiz giriş şifresi üretilip kaydedildi.`
      );
    }

    const currentStudents = this.cache.users.filter(u => u.role === 'student');
    return { updatedCount, students: currentStudents };
  }

  public async deleteUser(uid: string, adminName: string): Promise<void> {
    const user = this.getUserById(uid);
    const updatedUsers = this.cache.users.filter(u => u.uid !== uid);
    this.saveCache({ ...this.cache, users: updatedUsers });

    if (user) {
      this.logSystemAction(
        'Kullanıcı Silindi',
        adminName,
        'admin',
        user.displayName,
        `${user.displayName} (${user.email}) hesabı ve yetkileri kalıcı olarak silindi.`
      );
    }

    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      console.log(e);
    }
  }

  public setUserOnlineStatus(userId: string, isOnline: boolean): void {
    const user = this.getUserById(userId);
    if (user) {
      this.updateUserProfile(userId, {
        isOnline,
        lastSeen: new Date().toISOString()
      });
    }
  }

  // ================= CLASSES =================
  public getClasses(): SchoolClass[] {
    return this.cache.classes;
  }

  public getClassById(id: string): SchoolClass | undefined {
    return this.cache.classes.find(c => c.id === id);
  }

  public getClassByName(name: string): SchoolClass | undefined {
    if (!name) return undefined;
    const clean = name.toLowerCase();
    return this.cache.classes.find(c => (c.name || '').toLowerCase() === clean);
  }

  public async addClass(newClass: SchoolClass, adminName: string = 'Okul Yönetimi'): Promise<SchoolClass> {
    // Check if class with same name already exists
    const cleanName = (newClass.name || '').trim().toLowerCase();
    const existingIndex = this.cache.classes.findIndex(c => (c.name || '').trim().toLowerCase() === cleanName);
    let updated: SchoolClass[];
    
    if (existingIndex >= 0) {
      updated = this.cache.classes.map((c, i) => i === existingIndex ? newClass : c);
    } else {
      updated = [...this.cache.classes, newClass];
    }
    
    this.saveCache({ ...this.cache, classes: updated });

    this.logSystemAction(
      'Sınıf / Şube Eklendi',
      adminName,
      'admin',
      newClass.name,
      `${newClass.name} şubesi oluşturuldu. Rehber Öğretmen: ${newClass.advisorTeacher || 'Atanmadı'}, Kontenjan: ${newClass.capacity || 34}`
    );

    try {
      await setDoc(doc(db, 'classes', newClass.id), sanitizeForFirestore(newClass));
    } catch (e) {
      console.log('Firebase add class write error:', e);
    }

    return newClass;
  }

  public async updateClass(classId: string, updates: Partial<SchoolClass>, adminName: string = 'Okul Yönetimi'): Promise<void> {
    const existing = this.cache.classes.find(c => c.id === classId);
    if (!existing) return;

    const updatedClass = { ...existing, ...updates };
    const updated = this.cache.classes.map(c => c.id === classId ? updatedClass : c);
    this.saveCache({ ...this.cache, classes: updated });

    this.logSystemAction(
      'Sınıf Bilgileri Güncellendi',
      adminName,
      'admin',
      updatedClass.name,
      `${updatedClass.name} sınıfının bilgileri ve rehber öğretmen ataması güncellendi.`
    );

    try {
      await updateDoc(doc(db, 'classes', classId), updates as any);
    } catch (e) {
      console.log('Firebase update class error:', e);
    }
  }

  public async deleteClass(classId: string, adminName: string = 'Okul Yönetimi'): Promise<void> {
    const targetClass = this.cache.classes.find(c => c.id === classId);
    const updated = this.cache.classes.filter(c => c.id !== classId);
    this.saveCache({ ...this.cache, classes: updated });

    if (targetClass) {
      this.logSystemAction(
        'Sınıf / Şube Silindi',
        adminName,
        'admin',
        targetClass.name,
        `${targetClass.name} sınıfı sistemden ve veritabanından kalıcı olarak silindi.`
      );
    }

    try {
      await deleteDoc(doc(db, 'classes', classId));
    } catch (e) {
      console.log('Firebase delete class error:', e);
    }
  }

  // ================= HOMEWORKS & SUBMISSIONS =================
  public getHomeworks(): Homework[] {
    return this.cache.homeworks;
  }

  public getHomeworksForStudent(studentClass?: string): Homework[] {
    if (!studentClass) return this.cache.homeworks;
    return this.cache.homeworks.filter(hw => 
      hw.targetClass === studentClass || hw.targetClass === 'Tüm Okul'
    );
  }

  public getHomeworksForTeacher(teacherId: string): Homework[] {
    return this.cache.homeworks.filter(hw => hw.teacherId === teacherId);
  }

  public async addHomework(homework: Homework): Promise<Homework> {
    const updatedHomeworks = [homework, ...this.cache.homeworks];
    
    // Automatically generate pending submission records for all students in that class
    const targetStudents = homework.targetClass === 'Tüm Okul' 
      ? this.getStudents() 
      : this.getStudentsByClass(homework.targetClass);

    const newSubmissions: HomeworkSubmission[] = targetStudents.map(st => ({
      id: `sub-${homework.id}-${st.uid}`,
      homeworkId: homework.id,
      studentId: st.uid,
      studentName: st.displayName,
      studentNumber: st.schoolNumber || '',
      studentClass: st.classGrade || homework.targetClass,
      status: 'pending',
      updatedAt: new Date().toISOString()
    }));

    const updatedSubmissions = [...newSubmissions, ...this.cache.submissions];

    // Create a broadcast notification
    const notification: NotificationItem = {
      id: `notif-hw-${Date.now()}`,
      userId: homework.targetClass === 'Tüm Okul' ? 'all' : homework.targetClass,
      title: `Yeni Ödev: ${homework.subject}`,
      message: `${homework.teacherName} tarafından "${homework.title}" ödevi verildi. Son Teslim: ${homework.dueDate}${homework.dueTime ? ' ' + homework.dueTime : ''}`,
      type: 'homework',
      read: false,
      createdAt: new Date().toISOString(),
      linkTab: 'homeworks',
      actorName: homework.teacherName,
      actorRole: 'teacher'
    };

    this.saveCache({
      ...this.cache,
      homeworks: updatedHomeworks,
      submissions: updatedSubmissions,
      notifications: [notification, ...this.cache.notifications]
    });

    this.logSystemAction(
      'Ödev Oluşturuldu',
      homework.teacherName,
      'teacher',
      homework.targetClass,
      `"${homework.title}" (${homework.subject}) ödevi yayınlandı.`
    );

    try {
      await setDoc(doc(db, 'homeworks', homework.id), sanitizeForFirestore(homework));
    } catch (e) {
      console.log('Firebase add homework sync:', e);
    }

    return homework;
  }

  public async deleteHomework(homeworkId: string): Promise<void> {
    const updatedHomeworks = this.cache.homeworks.filter(h => h.id !== homeworkId);
    const updatedSubmissions = this.cache.submissions.filter(s => s.homeworkId !== homeworkId);
    this.saveCache({ ...this.cache, homeworks: updatedHomeworks, submissions: updatedSubmissions });

    try {
      await deleteDoc(doc(db, 'homeworks', homeworkId));
    } catch (e) {
      console.log(e);
    }
  }

  public getSubmissionsForHomework(homeworkId: string): HomeworkSubmission[] {
    const homework = this.cache.homeworks.find(h => h.id === homeworkId);
    const existing = this.cache.submissions.filter(s => s.homeworkId === homeworkId);
    
    if (homework) {
      const targetStudents = homework.targetClass === 'Tüm Okul' 
        ? this.getStudents() 
        : this.getStudentsByClass(homework.targetClass);

      targetStudents.forEach(st => {
        if (!existing.some(s => s.studentId === st.uid)) {
          const freshSub: HomeworkSubmission = {
            id: `sub-${homeworkId}-${st.uid}`,
            homeworkId: homeworkId,
            studentId: st.uid,
            studentName: st.displayName,
            studentNumber: st.schoolNumber || '',
            studentClass: st.classGrade || homework.targetClass,
            status: 'pending',
            updatedAt: new Date().toISOString()
          };
          existing.push(freshSub);
          this.cache.submissions.push(freshSub);
        }
      });
    }

    return existing.sort((a, b) => (Number(a.studentNumber) || 0) - (Number(b.studentNumber) || 0));
  }

  public getSubmissionsForStudent(studentId: string): HomeworkSubmission[] {
    return this.cache.submissions.filter(s => s.studentId === studentId);
  }

  // 1-Click Ödev Durumu Güncelleme & Değerlendirme with Real-time Student Notification and Achievement Triggers
  public async updateSubmissionStatus(
    homeworkId: string, 
    studentId: string, 
    status: HomeworkStatus, 
    score?: number,
    feedback?: string,
    rubricScores?: Record<string, number>,
    teacherName: string = 'Öğretmen'
  ): Promise<void> {
    const subIndex = this.cache.submissions.findIndex(s => s.homeworkId === homeworkId && s.studentId === studentId);
    let updatedSubs = [...this.cache.submissions];
    const hw = this.cache.homeworks.find(h => h.id === homeworkId);

    const isCompleted = status === 'completed';

    if (subIndex >= 0) {
      updatedSubs[subIndex] = {
        ...updatedSubs[subIndex],
        status,
        score: score !== undefined ? score : updatedSubs[subIndex].score,
        teacherFeedback: feedback !== undefined ? feedback : updatedSubs[subIndex].teacherFeedback,
        rubricScores: rubricScores || updatedSubs[subIndex].rubricScores,
        submittedAt: isCompleted ? (updatedSubs[subIndex].submittedAt || new Date().toISOString()) : updatedSubs[subIndex].submittedAt,
        updatedAt: new Date().toISOString()
      };
    } else {
      const student = this.getUserById(studentId);
      if (student) {
        updatedSubs.push({
          id: `sub-${homeworkId}-${studentId}`,
          homeworkId,
          studentId,
          studentName: student.displayName,
          studentNumber: student.schoolNumber || '',
          studentClass: student.classGrade || '',
          status,
          score,
          teacherFeedback: feedback,
          rubricScores,
          submittedAt: isCompleted ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // REAL-TIME IN-APP NOTIFICATION TO THE STUDENT
    const statusLabels: Record<HomeworkStatus, string> = {
      completed: 'Yapıldı (Onaylandı) ✅',
      not_completed: 'Yapılmadı ❌',
      excused: 'Raporlu / İzinli 📋',
      pending: 'Bekliyor ⏳'
    };

    const notifMessage = hw
      ? `${teacherName} "${hw.title}" ödev durumunuzu '${statusLabels[status]}' olarak güncelledi.${score !== undefined ? ` Puan: ${score}/${hw.maxScore}` : ''}`
      : `${teacherName} ödev durumunuzu '${statusLabels[status]}' olarak güncelledi.`;

    const notif: NotificationItem = {
      id: `notif-sub-${Date.now()}-${studentId}`,
      userId: studentId,
      title: `Ödev Durumu Güncellendi: ${hw ? hw.subject : 'Ödev'}`,
      message: notifMessage,
      type: 'homework',
      read: false,
      createdAt: new Date().toISOString(),
      linkTab: 'homeworks',
      actorName: teacherName,
      actorRole: 'teacher'
    };

    this.saveCache({ 
      ...this.cache, 
      submissions: updatedSubs,
      notifications: [notif, ...this.cache.notifications]
    });

    // Auto Gamification & Badge Trigger on Homework Completion!
    if (isCompleted) {
      const xpToAdd = hw?.xpReward || 50;
      await this.awardXpToStudent(studentId, xpToAdd, `${hw?.title || 'Ödev'} tamamlama ödülü`);

      // Check if eligible for 'badge-on-time'
      const existingBadge = this.cache.studentBadges.find(sb => sb.studentId === studentId && sb.badgeId === 'badge-on-time');
      if (!existingBadge) {
        await this.awardBadgeToStudent(studentId, 'badge-on-time', teacherName, `${hw?.title || 'Ödev'} zamanında teslim edildi.`);
      }

      // Check for 'badge-homework-champion' (if completed 5+ homeworks)
      const studentCompletedCount = updatedSubs.filter(s => s.studentId === studentId && s.status === 'completed').length;
      if (studentCompletedCount >= 5) {
        const champBadge = this.cache.studentBadges.find(sb => sb.studentId === studentId && sb.badgeId === 'badge-homework-champion');
        if (!champBadge) {
          await this.awardBadgeToStudent(studentId, 'badge-homework-champion', 'Sistem', '5 ödevi başarıyla tamamlama başarısı');
        }
      }
    }

    try {
      await setDoc(doc(db, 'homework_submissions', `sub-${homeworkId}-${studentId}`), sanitizeForFirestore({
        homeworkId,
        studentId,
        status,
        score: score || null,
        teacherFeedback: feedback || null,
        rubricScores: rubricScores || null,
        updatedAt: new Date().toISOString()
      }), { merge: true });
    } catch (e) {
      console.log('Firebase submission update:', e);
    }
  }

  // Student self-submission
  public async submitHomework(homeworkId: string, studentId: string, note?: string, attachments?: Attachment[]): Promise<void> {
    const existing = this.cache.submissions.find(s => s.homeworkId === homeworkId && s.studentId === studentId);
    if (existing) {
      existing.attachments = attachments || existing.attachments;
      existing.submissionNote = note || existing.submissionNote;
    }
    return this.updateSubmissionStatus(homeworkId, studentId, 'completed', undefined, note, undefined, 'Öğrenci');
  }

  // ================= GRADES (SINAV VE DENEME NOTLARI) =================
  public getGrades(): GradeRecord[] {
    return this.cache.grades;
  }

  public getGradesForStudent(studentId: string): GradeRecord[] {
    return this.cache.grades
      .filter(g => g.studentId === studentId)
      .sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
  }

  public getGradesByClassAndSubject(className: string, subject?: string, examType?: string): GradeRecord[] {
    return this.cache.grades.filter(g => {
      const matchClass = g.studentClass === className;
      const matchSubj = !subject || g.subject === subject;
      const matchType = !examType || g.examType === examType;
      return matchClass && matchSubj && matchType;
    });
  }

  public async saveGrade(grade: GradeRecord): Promise<GradeRecord> {
    const existingIndex = this.cache.grades.findIndex(g => 
      g.studentId === grade.studentId && 
      g.subject === grade.subject && 
      g.examType === grade.examType
    );

    let updatedGrades = [...this.cache.grades];
    if (existingIndex >= 0) {
      updatedGrades[existingIndex] = grade;
    } else {
      updatedGrades = [grade, ...updatedGrades];
    }

    // Send real-time notification to the student with teacher name
    const notif: NotificationItem = {
      id: `notif-grade-${Date.now()}-${grade.studentId}`,
      userId: grade.studentId,
      title: `Yeni Sınav Notu: ${grade.subject}`,
      message: `${grade.teacherName} (Öğretmen) tarafından ${grade.examType} notunuz girildi: ${grade.score} / ${grade.maxScore}`,
      type: 'grade',
      read: false,
      createdAt: new Date().toISOString(),
      linkTab: 'grades',
      actorName: grade.teacherName,
      actorRole: 'teacher'
    };

    this.saveCache({
      ...this.cache,
      grades: updatedGrades,
      notifications: [notif, ...this.cache.notifications]
    });

    // Gamification check: If score >= 90, award 'Yıldız Öğrenci' badge & XP
    if (grade.score >= 90) {
      await this.awardXpToStudent(grade.studentId, 100, `${grade.subject} ${grade.examType} yüksek başarı ödülü (Not: ${grade.score})`);
      const hasStar = this.cache.studentBadges.find(sb => sb.studentId === grade.studentId && sb.badgeId === 'badge-high-achiever');
      if (!hasStar) {
        await this.awardBadgeToStudent(grade.studentId, 'badge-high-achiever', grade.teacherName, `${grade.subject} sınavından ${grade.score} puan.`);
      }
    }

    try {
      await setDoc(doc(db, 'grades', grade.id), sanitizeForFirestore(grade));
    } catch (e) {
      console.log('Firebase save grade error:', e);
    }

    return grade;
  }

  public async saveBatchGrades(gradesList: GradeRecord[]): Promise<void> {
    for (const g of gradesList) {
      await this.saveGrade(g);
    }
  }

  // ================= ATTENDANCE (DEVAMSIZLIK TAKİBİ) =================
  public getAttendance(): AttendanceRecord[] {
    return this.cache.attendance;
  }

  public getAttendanceForStudent(studentId: string): AttendanceRecord[] {
    return this.cache.attendance
      .filter(a => a.studentId === studentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getAttendanceByClassAndDate(className: string, date: string): AttendanceRecord[] {
    return this.cache.attendance.filter(a => a.studentClass === className && a.date === date);
  }

  public async saveAttendance(record: AttendanceRecord): Promise<void> {
    const existingIndex = this.cache.attendance.findIndex(a => 
      a.studentId === record.studentId && a.date === record.date
    );

    let updated = [...this.cache.attendance];
    if (existingIndex >= 0) {
      updated[existingIndex] = record;
    } else {
      updated = [record, ...updated];
    }

    this.saveCache({ ...this.cache, attendance: updated });

    try {
      await setDoc(doc(db, 'attendance', record.id), sanitizeForFirestore(record));
    } catch (e) {
      console.log('Firebase attendance write:', e);
    }
  }

  public async saveBatchAttendance(records: AttendanceRecord[]): Promise<void> {
    let updated = [...this.cache.attendance];
    records.forEach(rec => {
      const idx = updated.findIndex(a => a.studentId === rec.studentId && a.date === rec.date);
      if (idx >= 0) {
        updated[idx] = rec;
      } else {
        updated.unshift(rec);
      }
    });

    this.saveCache({ ...this.cache, attendance: updated });
  }

  // ================= ANNOUNCEMENTS =================
  public getAnnouncements(): Announcement[] {
    return this.cache.announcements.sort((a, b) => {
      // Pinned items first, then by date descending
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  public async addAnnouncement(announcement: Announcement): Promise<Announcement> {
    const updated = [announcement, ...this.cache.announcements];
    
    const notif: NotificationItem = {
      id: `notif-ann-${Date.now()}`,
      userId: announcement.targetAudience === 'class' ? (announcement.targetClass || 'all') : announcement.targetAudience,
      title: `Yeni Duyuru: ${announcement.title}`,
      message: announcement.content.slice(0, 90) + '...',
      type: 'announcement',
      read: false,
      createdAt: new Date().toISOString(),
      linkTab: 'announcements',
      actorName: announcement.authorName,
      actorRole: announcement.authorRole
    };

    this.saveCache({
      ...this.cache,
      announcements: updated,
      notifications: [notif, ...this.cache.notifications]
    });

    this.logSystemAction(
      'Duyuru Yayınlandı',
      announcement.authorName,
      announcement.authorRole,
      announcement.targetAudience === 'class' ? `Sınıf: ${announcement.targetClass || (announcement.targetClasses?.join(', '))}` : announcement.targetAudience,
      `"${announcement.title}" başlıklı ${announcement.priority.toUpperCase()} öncelikli duyuru yayınlandı.`
    );

    try {
      await setDoc(doc(db, 'announcements', announcement.id), sanitizeForFirestore(announcement));
    } catch (e) {
      console.log('Firebase announcement write:', e);
    }

    return announcement;
  }

  public async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<void> {
    const existing = this.cache.announcements.find(a => a.id === id);
    if (!existing) return;

    const updatedAnn = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const updated = this.cache.announcements.map(a => a.id === id ? updatedAnn : a);
    this.saveCache({ ...this.cache, announcements: updated });

    try {
      await updateDoc(doc(db, 'announcements', id), updates as any);
    } catch (e) {
      console.log('Firebase update announcement error:', e);
    }
  }

  public async togglePinAnnouncement(id: string): Promise<void> {
    const existing = this.cache.announcements.find(a => a.id === id);
    if (!existing) return;

    const newPinned = !existing.pinned;
    const updated = this.cache.announcements.map(a => a.id === id ? { ...a, pinned: newPinned } : a);
    this.saveCache({ ...this.cache, announcements: updated });

    try {
      await updateDoc(doc(db, 'announcements', id), { pinned: newPinned });
    } catch (e) {
      console.log('Firebase pin announcement error:', e);
    }
  }

  public async deleteAnnouncement(id: string): Promise<void> {
    const updated = this.cache.announcements.filter(a => a.id !== id);
    this.saveCache({ ...this.cache, announcements: updated });
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (e) {
      console.log(e);
    }
  }

  public async recordAnnouncementStudentView(
    announcementId: string,
    student: { uid: string; displayName: string; schoolNumber?: string; classGrade?: string }
  ): Promise<void> {
    const announcement = this.cache.announcements.find(a => a.id === announcementId);
    if (!announcement) return;

    const existingViewers = announcement.viewedByStudents || [];
    const alreadyViewed = existingViewers.some(v => v.studentId === student.uid);

    if (alreadyViewed) return;

    const newViewer: AnnouncementViewer = {
      studentId: student.uid,
      studentName: student.displayName,
      schoolNumber: student.schoolNumber,
      classGrade: student.classGrade,
      viewedAt: new Date().toISOString()
    };

    const updatedViewers = [...existingViewers, newViewer];
    const newViewsCount = (announcement.viewsCount || 0) + 1;

    const updatedAnn: Announcement = {
      ...announcement,
      viewedByStudents: updatedViewers,
      viewsCount: newViewsCount
    };

    const updatedAnnouncements = this.cache.announcements.map(a =>
      a.id === announcementId ? updatedAnn : a
    );

    this.saveCache({ ...this.cache, announcements: updatedAnnouncements });

    try {
      await updateDoc(doc(db, 'announcements', announcementId), {
        viewedByStudents: updatedViewers,
        viewsCount: newViewsCount
      });
    } catch (e) {
      console.log('Firebase record view error:', e);
    }
  }

  // ================= BADGES & ACHIEVEMENT SYSTEM =================
  public getBadges(): Badge[] {
    return this.cache.badges;
  }

  public getStudentBadges(studentId?: string): StudentBadge[] {
    if (studentId) {
      return this.cache.studentBadges.filter(sb => sb.studentId === studentId);
    }
    return this.cache.studentBadges;
  }

  public async awardBadgeToStudent(
    studentId: string, 
    badgeId: string, 
    awardedBy: string, 
    reason?: string
  ): Promise<StudentBadge | null> {
    const student = this.getUserById(studentId);
    const badge = this.cache.badges.find(b => b.id === badgeId);
    if (!student || !badge) return null;

    // Check if already awarded
    const alreadyHas = this.cache.studentBadges.some(sb => sb.studentId === studentId && sb.badgeId === badgeId);
    if (alreadyHas) return null;

    const newStudentBadge: StudentBadge = {
      id: `sbadge-${Date.now()}-${studentId}`,
      studentId: student.uid,
      studentName: student.displayName,
      studentClass: student.classGrade,
      badgeId: badge.id,
      badge: badge,
      awardedAt: new Date().toISOString(),
      awardedBy: awardedBy,
      reason: reason || `${badge.name} başarısı`
    };

    const updatedBadges = [newStudentBadge, ...this.cache.studentBadges];

    // Notification to student
    const notif: NotificationItem = {
      id: `notif-badge-${Date.now()}-${studentId}`,
      userId: studentId,
      title: `Tebrikler! Yeni Rozet: ${badge.name} 🏆`,
      message: `${awardedBy} tarafından "${badge.name}" rozeti verildi (+${badge.points} XP). ${reason || ''}`,
      type: 'badge',
      read: false,
      createdAt: new Date().toISOString(),
      linkTab: 'achievements',
      actorName: awardedBy
    };

    // Update student XP & level
    const currentXp = student.totalXp || 100;
    const newXp = currentXp + badge.points;
    const newLevel = Math.min(10, Math.floor(newXp / 150) + 1);

    const updatedUsers = this.cache.users.map(u => 
      u.uid === studentId ? { ...u, totalXp: newXp, level: newLevel } : u
    );

    this.saveCache({
      ...this.cache,
      users: updatedUsers,
      studentBadges: updatedBadges,
      notifications: [notif, ...this.cache.notifications]
    });

    try {
      await setDoc(doc(db, 'student_badges', newStudentBadge.id), sanitizeForFirestore(newStudentBadge));
      await updateDoc(doc(db, 'users', studentId), sanitizeForFirestore({ totalXp: newXp, level: newLevel }));
    } catch (e) {
      console.log('Firebase badge award sync:', e);
    }

    return newStudentBadge;
  }

  public async awardXpToStudent(studentId: string, xpAmount: number, reason?: string): Promise<void> {
    const student = this.getUserById(studentId);
    if (!student) return;

    const currentXp = student.totalXp || 100;
    const newXp = currentXp + xpAmount;
    const newLevel = Math.min(10, Math.floor(newXp / 150) + 1);

    const updatedUsers = this.cache.users.map(u => 
      u.uid === studentId ? { ...u, totalXp: newXp, level: newLevel } : u
    );

    this.saveCache({ ...this.cache, users: updatedUsers });

    try {
      await updateDoc(doc(db, 'users', studentId), { totalXp: newXp, level: newLevel });
    } catch (e) {
      console.log('Firebase XP update:', e);
    }
  }

  public getLeaderboard(targetClass?: string): LeaderboardEntry[] {
    let students = this.getStudents();
    if (targetClass && targetClass !== 'Tüm Okul') {
      students = students.filter(s => s.classGrade === targetClass);
    }

    const leaderboard: LeaderboardEntry[] = students.map(st => {
      const badges = this.cache.studentBadges.filter(sb => sb.studentId === st.uid);
      const completedHw = this.cache.submissions.filter(s => s.studentId === st.uid && s.status === 'completed').length;
      const xp = st.totalXp || 100;
      const lvl = st.level || Math.min(10, Math.floor(xp / 150) + 1);

      return {
        rank: 0,
        studentId: st.uid,
        studentName: st.displayName,
        studentNumber: st.schoolNumber || '',
        studentClass: st.classGrade || '',
        totalXp: xp,
        level: lvl,
        badgeCount: badges.length,
        completedHomeworkCount: completedHw
      };
    });

    leaderboard.sort((a, b) => b.totalXp - a.totalXp);
    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return leaderboard;
  }

  // ================= REAL-TIME CHAT SYSTEM =================
  public getConversations(userId: string): Conversation[] {
    const user = this.getUserById(userId);
    const userRole = user?.role;
    const userClass = user?.classGrade;

    return this.cache.conversations
      .filter(conv => {
        if (conv.participants.includes(userId)) return true;
        if (conv.type === 'group' && conv.targetClass && conv.targetClass === userClass) return true;
        if (conv.type === 'group' && conv.id === 'conv-teachers-lounge' && (userRole === 'teacher' || userRole === 'admin')) return true;
        return false;
      })
      .map(conv => {
        // Enriched participant details
        const details = conv.participants.map(pId => {
          const u = this.getUserById(pId);
          return {
            uid: pId,
            displayName: u ? u.displayName : 'Kullanıcı',
            role: u ? u.role : 'student' as UserRole,
            schoolNumber: u?.schoolNumber,
            classGrade: u?.classGrade,
            branch: u?.branch,
            isOnline: u?.isOnline ?? false
          };
        });

        return {
          ...conv,
          participantDetails: details
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getMessages(conversationId: string): ChatMessage[] {
    return this.cache.messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public async sendMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString()
    };

    const updatedMessages = [...this.cache.messages, newMsg];
    
    // Update conversation's lastMessage and updatedAt
    const updatedConversations = this.cache.conversations.map(conv => {
      if (conv.id === msg.conversationId) {
        return {
          ...conv,
          lastMessage: {
            text: msg.text,
            senderName: msg.senderName,
            createdAt: newMsg.createdAt
          },
          updatedAt: newMsg.createdAt
        };
      }
      return conv;
    });

    this.saveCache({
      ...this.cache,
      messages: updatedMessages,
      conversations: updatedConversations
    });

    try {
      await setDoc(doc(db, 'chat_messages', newMsg.id), sanitizeForFirestore(newMsg));
      await updateDoc(doc(db, 'conversations', msg.conversationId), sanitizeForFirestore({
        lastMessage: {
          text: msg.text,
          senderName: msg.senderName,
          createdAt: newMsg.createdAt
        },
        updatedAt: newMsg.createdAt
      }));
    } catch (e) {
      console.log('Firebase chat message error:', e);
    }

    return newMsg;
  }

  public async createDirectConversation(currentUserId: string, targetUserId: string): Promise<Conversation> {
    const existing = this.cache.conversations.find(c => 
      c.type === 'direct' && 
      c.participants.includes(currentUserId) && 
      c.participants.includes(targetUserId)
    );

    if (existing) return existing;

    const user1 = this.getUserById(currentUserId);
    const user2 = this.getUserById(targetUserId);

    const newConv: Conversation = {
      id: `conv-dm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'direct',
      name: `${user1?.displayName || 'Kullanıcı'} & ${user2?.displayName || 'Kullanıcı'}`,
      participants: [currentUserId, targetUserId],
      updatedAt: new Date().toISOString()
    };

    const updated = [newConv, ...this.cache.conversations];
    this.saveCache({ ...this.cache, conversations: updated });

    try {
      await setDoc(doc(db, 'conversations', newConv.id), sanitizeForFirestore(newConv));
    } catch (e) {
      console.log('Firebase new conversation write:', e);
    }

    return newConv;
  }

  public async createGroupConversation(
    name: string, 
    description: string, 
    participants: string[], 
    targetClass?: string
  ): Promise<Conversation> {
    const newConv: Conversation = {
      id: `conv-group-${Date.now()}`,
      type: 'group',
      name: name,
      description: description,
      targetClass: targetClass,
      participants: participants,
      updatedAt: new Date().toISOString()
    };

    const updated = [newConv, ...this.cache.conversations];
    this.saveCache({ ...this.cache, conversations: updated });

    try {
      await setDoc(doc(db, 'conversations', newConv.id), sanitizeForFirestore(newConv));
    } catch (e) {
      console.log(e);
    }

    return newConv;
  }

  // ================= SYSTEM STATS & AUDIT LOGS =================
  public getSystemStats() {
    const users = this.cache.users;
    const students = users.filter(u => u.role === 'student' && u.status !== 'deactivated');
    const teachers = users.filter(u => u.role === 'teacher' && u.status !== 'deactivated');
    const admins = users.filter(u => u.role === 'admin' && u.status !== 'deactivated');
    const totalHomeworks = this.cache.homeworks.length;
    const totalSubmissions = this.cache.submissions.length;
    const completedSubs = this.cache.submissions.filter(s => s.status === 'completed').length;
    const hwCompletionRate = totalSubmissions > 0 ? Math.round((completedSubs / totalSubmissions) * 100) : 0;
    
    const attendances = this.cache.attendance;
    const presentCount = attendances.filter(a => a.status === 'present').length;
    const attendanceRate = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 94;

    const grades = this.cache.grades;
    const totalScore = grades.reduce((acc, g) => acc + g.score, 0);
    const avgExamScore = grades.length > 0 ? Math.round(totalScore / grades.length) : 78;

    const totalBadges = this.cache.studentBadges.length;

    return {
      totalUsers: users.length,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalAdmins: admins.length,
      totalClasses: this.cache.classes.length,
      totalHomeworks,
      totalSubmissions,
      hwCompletionRate,
      attendanceRate,
      avgExamScore,
      totalBadgesAwarded: totalBadges,
      totalAnnouncements: this.cache.announcements.length,
      totalMessages: this.cache.messages.length
    };
  }

  public getSystemLogs(): SystemAuditLog[] {
    return this.cache.systemLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public logSystemAction(
    action: string, 
    actorName: string, 
    actorRole: UserRole, 
    target?: string, 
    details?: string
  ): void {
    const log: SystemAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      action,
      actorName,
      actorRole,
      target,
      details,
      timestamp: new Date().toISOString()
    };

    const updatedLogs = [log, ...this.cache.systemLogs].slice(0, 100);
    this.saveCache({ ...this.cache, systemLogs: updatedLogs });

    try {
      setDoc(doc(db, 'system_logs', log.id), sanitizeForFirestore(log));
    } catch (e) {
      console.log(e);
    }
  }

  // ================= NOTIFICATIONS =================
  public getNotificationsForUser(userId: string, userClass?: string): NotificationItem[] {
    return this.cache.notifications
      .filter(n => 
        n.userId === 'all' || 
        n.userId === userId || 
        (userClass && n.userId === userClass)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public markNotificationAsRead(id: string): void {
    const updated = this.cache.notifications.map(n => n.id === id ? { ...n, read: true } : n);
    this.saveCache({ ...this.cache, notifications: updated });
  }

  public markAllNotificationsAsRead(userId: string): void {
    const updated = this.cache.notifications.map(n => 
      (n.userId === 'all' || n.userId === userId) ? { ...n, read: true } : n
    );
    this.saveCache({ ...this.cache, notifications: updated });
  }

  // ================= WEEKLY SCHEDULES =================
  public getSchedules(): WeeklyScheduleSlot[] {
    return this.cache.schedules || [];
  }

  public getSchedulesForClass(className: string): WeeklyScheduleSlot[] {
    if (!className) return [];
    const target = className.trim().toLowerCase();
    return (this.cache.schedules || []).filter(
      s => (s.className || '').trim().toLowerCase() === target
    );
  }

  public getSchedulesForTeacher(teacherNameOrId: string): WeeklyScheduleSlot[] {
    if (!teacherNameOrId) return [];
    const query = teacherNameOrId.trim().toLowerCase();
    return (this.cache.schedules || []).filter(
      s => (s.teacherId && s.teacherId.toLowerCase() === query) ||
           (s.teacherName && s.teacherName.toLowerCase().includes(query))
    );
  }

  public getScheduleSlotById(id: string): WeeklyScheduleSlot | undefined {
    return (this.cache.schedules || []).find(s => s.id === id);
  }

  public async addScheduleSlot(slot: WeeklyScheduleSlot, authorName: string = 'Yönetim'): Promise<WeeklyScheduleSlot> {
    const newSlot: WeeklyScheduleSlot = {
      ...slot,
      id: slot.id || `slot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      updatedAt: new Date().toISOString()
    };

    // If slot exists at same class, day, and period, replace it
    const newClassClean = (newSlot.className || '').toLowerCase();
    const existingIdx = (this.cache.schedules || []).findIndex(
      s => (s.className || '').toLowerCase() === newClassClean &&
           s.day === newSlot.day &&
           s.period === newSlot.period
    );

    let updated: WeeklyScheduleSlot[];
    if (existingIdx >= 0) {
      updated = this.cache.schedules.map((s, idx) => idx === existingIdx ? newSlot : s);
    } else {
      updated = [...(this.cache.schedules || []), newSlot];
    }

    this.saveCache({ ...this.cache, schedules: updated });

    this.logSystemAction(
      'Ders Programı Güncellendi',
      authorName,
      'admin',
      `${newSlot.className} - ${newSlot.subject}`,
      `${newSlot.className} sınıfı için ${newSlot.day} ${newSlot.period}. ders (${newSlot.subject}) tanımlandı.`
    );

    try {
      await setDoc(doc(db, 'schedules', newSlot.id), sanitizeForFirestore(newSlot));
    } catch (e) {
      console.log(e);
    }

    return newSlot;
  }

  public async updateScheduleSlot(id: string, updates: Partial<WeeklyScheduleSlot>, authorName: string = 'Öğretmen / Yönetici'): Promise<void> {
    const existing = (this.cache.schedules || []).find(s => s.id === id);
    if (!existing) return;

    const updatedSlot = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const updated = this.cache.schedules.map(s => s.id === id ? updatedSlot : s);
    this.saveCache({ ...this.cache, schedules: updated });

    this.logSystemAction(
      'Ders Saati Düzenlendi',
      authorName,
      'teacher',
      `${existing.className} - ${updatedSlot.subject}`,
      `${existing.className} ${existing.day} ${existing.period}. ders güncellendi: ${updatedSlot.subject} (${updatedSlot.teacherName}).`
    );

    try {
      await updateDoc(doc(db, 'schedules', id), updatedSlot as any);
    } catch (e) {
      console.log(e);
    }
  }

  public async deleteScheduleSlot(id: string, authorName: string = 'Yönetici'): Promise<void> {
    const existing = (this.cache.schedules || []).find(s => s.id === id);
    const updated = (this.cache.schedules || []).filter(s => s.id !== id);
    this.saveCache({ ...this.cache, schedules: updated });

    if (existing) {
      this.logSystemAction(
        'Ders Programı Saati Silindi',
        authorName,
        'admin',
        `${existing.className} - ${existing.subject}`,
        `${existing.className} sınıfının ${existing.day} ${existing.period}. ders kaydı silindi.`
      );
    }

    try {
      await deleteDoc(doc(db, 'schedules', id));
    } catch (e) {
      console.log(e);
    }
  }

  public resetSchedulesToDefault(): void {
    const defaultSchedules = generateDefaultSchedule();
    this.saveCache({ ...this.cache, schedules: defaultSchedules });
  }

  // Personal user notes for a class slot (e.g. reminders, homework prep, materials)
  public savePersonalSlotNote(userId: string, slotKey: string, note: string): void {
    const key = `${userId}_${slotKey}`;
    const notes = { ...this.cache.scheduleNotes, [key]: note };
    this.saveCache({ ...this.cache, scheduleNotes: notes });
  }

  public getPersonalSlotNote(userId: string, slotKey: string): string {
    const key = `${userId}_${slotKey}`;
    return (this.cache.scheduleNotes && this.cache.scheduleNotes[key]) || '';
  }

  public getAllPersonalNotesForUser(userId: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!this.cache.scheduleNotes) return result;
    const prefix = `${userId}_`;
    Object.entries(this.cache.scheduleNotes).forEach(([k, v]) => {
      if (k.startsWith(prefix)) {
        result[k.substring(prefix.length)] = v;
      }
    });
    return result;
  }

  // ================= RESET PORTAL DATA =================
  public resetToFullDemoData(): void {
    localStorage.removeItem(CACHE_STORAGE_KEY);
    this.cache = this.loadInitialCache();
    this.notifySubscribers();
  }

  public resetPortalData(): void {
    localStorage.removeItem(CACHE_STORAGE_KEY);
    this.cache = this.loadInitialCache();
    this.notifySubscribers();
  }
}

export const dataService = new DataService();
