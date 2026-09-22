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
  ExcelImportSummary,
  ExcelParentRow,
  ExcelParentImportSummary
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
import { fixTurkishMojibake, normalizeTurkishClassName } from '../utils/excelTurkishUtils';
import { errorMonitoringService } from './errorMonitoringService';

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

/**
 * Normalizes class names across formats: '9/D', '9-D', '9 d', '9D', '9d' -> '9-D'
 */
export function normalizeClassName(className?: string): string {
  if (!className) return '';
  const trimmed = className.trim();
  const match = trimmed.match(/^(\d{1,2})\s*[\-_/]?\s*([a-zA-ZçğıöşüÇĞİÖŞÜ])$/);
  if (match) {
    return `${match[1]}-${match[2].toLocaleUpperCase('tr-TR')}`;
  }
  return trimmed.toLocaleUpperCase('tr-TR').replace(/[\/\\]/g, '-').replace(/\s+/g, '-');
}

/**
 * Checks if a class target string represents 'All School' (Tüm Okul)
 */
export function isAllSchool(str?: string): boolean {
  if (!str) return false;
  const s = str.trim().toLowerCase().replace(/[\s\-_/]/g, '');
  return s === 'tumokul' || s === 'tümokul' || s === 'all' || s === 'herkes' || s === 'tum' || s === 'tüm' || s.includes('tumokul') || s.includes('tümokul') || s.includes('herkes');
}

const CACHE_STORAGE_KEY = 'gnisal_oys_v13_clean_slate';

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
        // Keep accounts while ensuring deleted account remains excluded
        parsed.users = (parsed.users || []).filter(u => {
          const uid = (u.uid || '').toLowerCase();
          const email = (u.email || '').toLowerCase().trim();
          if (
            email === 'ulutastunagokturk@gmail.com' ||
            uid === 'admin-owner-ulutas'
          ) {
            return false;
          }
          return true;
        });

        // Purge mock generated schedule slots from cache
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

        parsed.roleAssignments = (parsed.roleAssignments || []).filter(ra => {
          const em = (ra.userEmail || '').toLowerCase().trim();
          return em !== 'ulutastunagokturk@gmail.com' && ra.id !== 'assign-admin-owner';
        });

        try {
          localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(parsed));
        } catch {}

        if (!parsed.announcements || parsed.announcements.length === 0) {
          parsed.announcements = [...INITIAL_ANNOUNCEMENTS];
        }
        if (!parsed.homeworks || parsed.homeworks.length === 0) {
          parsed.homeworks = [...INITIAL_HOMEWORKS];
        }
        if (!parsed.classes || parsed.classes.length === 0) {
          parsed.classes = [...INITIAL_CLASSES];
        }
        if (!parsed.submissions) {
          parsed.submissions = [];
        }
        if (INITIAL_TEACHERS.length > 0 && !parsed.users.some(u => u.uid === INITIAL_TEACHERS[0].uid || u.email?.toLowerCase() === INITIAL_TEACHERS[0].email.toLowerCase())) {
          parsed.users.push(INITIAL_TEACHERS[0]);
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

    // Pure Clean Initial State with INITIAL_ADMIN and INITIAL_TEACHERS
    const allUsers = [INITIAL_ADMIN, ...INITIAL_TEACHERS];
    
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
      announcements: INITIAL_ANNOUNCEMENTS,
      homeworks: INITIAL_HOMEWORKS,
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

    this.saveCache(initialStore, false);
    return initialStore;
  }

  private clientId: string = typeof window !== 'undefined' 
    ? (sessionStorage.getItem('gnsial_client_id') || (() => {
        const id = 'client-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
        sessionStorage.setItem('gnsial_client_id', id);
        return id;
      })())
    : 'srv-' + Date.now();
  private sseEventSource: EventSource | null = null;

  private saveCache(store: LocalCacheStore, syncToServer: boolean = true) {
    store.lastUpdated = Date.now();
    this.cache = store;
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('LocalStorage limit reached or disabled', e);
    }
    this.notifySubscribers();

    if (syncToServer) {
      // Supabase Birincil Bulut Veritabanına anlık yaz ve tüm diğer açık cihazlara SSE ile yay
      supabaseBackupService.saveDatabaseState(store, this.clientId).catch(err => {
        console.warn('[DataService] Immediate save error, fallback to debounced backup:', err);
        supabaseBackupService.scheduleAutoBackup(store, 1500);
      });
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

  private setupRealtimeSync() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this.sseEventSource) {
      try { this.sseEventSource.close(); } catch {}
    }

    try {
      this.sseEventSource = new EventSource('/api/database/events');

      this.sseEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'state_updated' && data.state) {
            // Ignore updates that originated from this exact browser tab
            if (data.senderClientId && data.senderClientId === this.clientId) {
              return;
            }
            this.applyRemoteState(data.state);
          }
        } catch {
          // ignore heartbeat / comments
        }
      };

      this.sseEventSource.onerror = () => {
        // EventSource automatically handles reconnection
      };
    } catch (err) {
      console.warn('[DataService Realtime Sync Setup Error]:', err);
    }
  }

  /**
   * Sunucudan veya diğer cihazlardan gelen güncel veritabanı durumunu yerel belleğe uygular
   */
  public applyRemoteState(state: any) {
    if (!state || typeof state !== 'object') return;

    let changed = false;

    // Ödevler (Homeworks): Sunucudaki tam listeyi doğrudan uygula
    if (Array.isArray(state.homeworks)) {
      if (state.homeworks.length > 0) {
        this.cache.homeworks = state.homeworks;
        changed = true;
      } else if (!this.cache.homeworks || this.cache.homeworks.length === 0) {
        this.cache.homeworks = [...INITIAL_HOMEWORKS];
        changed = true;
      }
    }

    // Ödev Teslimleri (Submissions):
    if (Array.isArray(state.submissions)) {
      if (state.submissions.length > 0 || !this.cache.submissions) {
        this.cache.submissions = state.submissions;
        changed = true;
      }
    }

    // Duyurular (Announcements):
    if (Array.isArray(state.announcements)) {
      if (state.announcements.length > 0) {
        this.cache.announcements = state.announcements;
        changed = true;
      } else if (!this.cache.announcements || this.cache.announcements.length === 0) {
        this.cache.announcements = [...INITIAL_ANNOUNCEMENTS];
        changed = true;
      }
    }

    // Notlar (Grades):
    if (Array.isArray(state.grades)) {
      this.cache.grades = state.grades;
      changed = true;
    }

    // Yoklama (Attendance):
    if (Array.isArray(state.attendance)) {
      this.cache.attendance = state.attendance;
      changed = true;
    }

    // Sınıflar (Classes):
    if (Array.isArray(state.classes) && state.classes.length > 0) {
      this.cache.classes = state.classes;
      changed = true;
    }

    // Ders Programları (Schedules):
    if (Array.isArray(state.schedules) && state.schedules.length > 0) {
      this.cache.schedules = state.schedules;
      changed = true;
    }

    if (state.scheduleNotes && typeof state.scheduleNotes === 'object') {
      this.cache.scheduleNotes = state.scheduleNotes;
      changed = true;
    }

    // Bildirimler (Notifications):
    if (Array.isArray(state.notifications)) {
      this.cache.notifications = state.notifications;
      changed = true;
    }

    // Rozetler & Başarımlar:
    if (Array.isArray(state.studentBadges)) {
      this.cache.studentBadges = state.studentBadges;
      changed = true;
    }

    // Rol Atamaları:
    if (Array.isArray(state.roleAssignments)) {
      this.cache.roleAssignments = state.roleAssignments.filter((ra: any) => 
        ra.assignedRole === 'admin' && 
        (ra.userEmail || '').toLowerCase().trim() !== 'ulutastunagokturk@gmail.com' &&
        ra.id !== 'assign-admin-owner'
      );
      changed = true;
    }

    // Kullanıcılar (Users):
    if (Array.isArray(state.users) && state.users.length > 0) {
      const userMap = new Map<string, UserProfile>();
      userMap.set(INITIAL_ADMIN.uid, INITIAL_ADMIN);
      state.users
        .filter((u: UserProfile) => (u.email || '').toLowerCase().trim() !== 'ulutastunagokturk@gmail.com' && u.uid !== 'admin-owner-ulutas')
        .forEach((u: UserProfile) => userMap.set(u.uid, u));
      this.cache.users = Array.from(userMap.values());
      changed = true;
    }

    if (state.lastUpdated) {
      this.cache.lastUpdated = state.lastUpdated;
    }

    if (changed) {
      try {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(this.cache));
      } catch {}
      this.notifySubscribers();
    }
  }

  private async initData() {
    try {
      // 1. First sync from live Supabase PostgreSQL database tables and backups (Primary)
      const synced = await this.syncFromSupabaseDatabase();

      // 2. Ensure default starter data exists if cache was empty and not synced
      if (!synced) {
        this.ensureStarterDataIfEmpty();
      }

      // 3. Setup real-time multi-device SSE listener
      this.setupRealtimeSync();

      // 4. Setup Firestore listeners & sync
      this.setupFirestoreListeners();
      await this.syncUsersFromFirestore();
      await this.seedInitialAdminIfMissing();
      await this.seedAllInitialDataIfMissingInFirestore();
      await this.syncHomeworksFromCloud();

      // 5. Ensure live relational database has current classes and users
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
        this.applyRemoteState(state);
        if (!silent) {
          console.log('[DataService] Canlı Supabase veritabanından veriler başarıyla eşitlendi!');
        }
        return true;
      }
    } catch (e) {
      if (!silent) console.warn('[DataService] syncFromSupabaseDatabase note:', e);
    }
    return false;
  }

  /**
   * Hem Supabase hem Firestore üzerinden tüm ödevleri ve teslimatları buluttan çeker, yerel önbellek ile harmanlar.
   */
  public async syncHomeworksFromCloud(): Promise<Homework[]> {
    let remoteHomeworks: Homework[] = [];

    // 1. Fetch from Supabase API (/api/homeworks)
    try {
      const res = await fetch('/api/homeworks');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.homeworks) && json.homeworks.length > 0) {
          remoteHomeworks = json.homeworks;
        }
      }
    } catch (e) {
      console.warn('[DataService] /api/homeworks sync note:', e);
    }

    // 2. Fetch from Cloud Firestore (/homeworks)
    try {
      const hwSnap = await getDocs(collection(db, 'homeworks'));
      if (!hwSnap.empty) {
        const firestoreList: Homework[] = [];
        hwSnap.forEach(d => {
          firestoreList.push({ id: d.id, ...d.data() } as Homework);
        });
        const map = new Map<string, Homework>();
        remoteHomeworks.forEach(h => map.set(h.id, h));
        firestoreList.forEach(h => map.set(h.id, h));
        remoteHomeworks = Array.from(map.values());
      }
    } catch (e) {
      console.warn('[DataService] Firestore homeworks sync note:', e);
    }

    // 3. Merge into local cache
    if (remoteHomeworks.length > 0) {
      const map = new Map<string, Homework>();
      (this.cache.homeworks || []).forEach(h => map.set(h.id, h));
      remoteHomeworks.forEach(h => map.set(h.id, h));
      this.cache.homeworks = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      this.saveCache(this.cache, false);
      this.notifySubscribers();
    }

    // 4. Fetch submissions from Server API (/api/submissions) and Firestore
    let remoteSubmissions: HomeworkSubmission[] = [];
    try {
      const subRes = await fetch('/api/submissions');
      if (subRes.ok) {
        const subJson = await subRes.json();
        if (subJson.success && Array.isArray(subJson.submissions) && subJson.submissions.length > 0) {
          remoteSubmissions = subJson.submissions;
        }
      }
    } catch (e) {
      console.warn('[DataService] /api/submissions sync note:', e);
    }

    try {
      const subSnap = await getDocs(collection(db, 'homework_submissions'));
      if (!subSnap.empty) {
        const firestoreSubs: HomeworkSubmission[] = [];
        subSnap.forEach(d => firestoreSubs.push({ id: d.id, ...d.data() } as HomeworkSubmission));
        const subMap = new Map<string, HomeworkSubmission>();
        remoteSubmissions.forEach(s => subMap.set(s.id, s));
        firestoreSubs.forEach(s => subMap.set(s.id, s));
        remoteSubmissions = Array.from(subMap.values());
      }
    } catch {}

    if (remoteSubmissions.length > 0) {
      const subMap = new Map<string, HomeworkSubmission>();
      (this.cache.submissions || []).forEach(s => subMap.set(s.id, s));
      remoteSubmissions.forEach(s => subMap.set(s.id, s));
      this.cache.submissions = Array.from(subMap.values());
      this.saveCache(this.cache, false);
      this.notifySubscribers();
    }

    return this.cache.homeworks;
  }

  /**
   * Buluttan gelen ödev listesini yerel önbellekle birleştirir.
   */
  public mergeHomeworksFromCloud(cloudHomeworks: Homework[]): void {
    if (!Array.isArray(cloudHomeworks) || cloudHomeworks.length === 0) return;
    const map = new Map<string, Homework>();
    (this.cache.homeworks || []).forEach(h => map.set(h.id, h));
    cloudHomeworks.forEach(h => map.set(h.id, h));
    this.cache.homeworks = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    this.saveCache(this.cache, false);
    this.notifySubscribers();
  }

  /**
   * Hem sunucu API (/api/announcements) hem Firestore üzerinden duyuruları çeker ve yerel önbellekle birleştirir.
   */
  public async syncAnnouncementsFromCloud(): Promise<Announcement[]> {
    let remoteAnnouncements: Announcement[] = [];

    // 1. Fetch from Server API (/api/announcements)
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.announcements) && json.announcements.length > 0) {
          remoteAnnouncements = json.announcements;
        }
      }
    } catch (e) {
      console.warn('[DataService] /api/announcements sync note:', e);
    }

    // 2. Fetch from Cloud Firestore (/announcements)
    try {
      const annSnap = await getDocs(collection(db, 'announcements'));
      if (!annSnap.empty) {
        const firestoreList: Announcement[] = [];
        annSnap.forEach(d => {
          firestoreList.push({ id: d.id, ...d.data() } as Announcement);
        });
        const map = new Map<string, Announcement>();
        remoteAnnouncements.forEach(a => map.set(a.id, a));
        firestoreList.forEach(a => map.set(a.id, a));
        remoteAnnouncements = Array.from(map.values());
      }
    } catch (e) {
      console.warn('[DataService] Firestore announcements sync note:', e);
    }

    // 3. Merge into local cache
    if (remoteAnnouncements.length > 0) {
      const map = new Map<string, Announcement>();
      (this.cache.announcements || []).forEach(a => map.set(a.id, a));
      remoteAnnouncements.forEach(a => map.set(a.id, a));
      this.cache.announcements = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      this.saveCache(this.cache, false);
      this.notifySubscribers();
    }

    return this.cache.announcements;
  }

  private ensureStarterDataIfEmpty() {
    let changed = false;

    // 1. Classes: ensure 9-D and initial classes exist
    if (!this.cache.classes || this.cache.classes.length === 0) {
      this.cache.classes = [...INITIAL_CLASSES];
      changed = true;
    } else {
      const has9D = this.cache.classes.some(c => normalizeClassName(c.name) === '9D');
      if (!has9D) {
        this.cache.classes.unshift({
          id: 'class-9-d',
          name: '9-D',
          gradeLevel: 9,
          branch: 'D',
          section: 'D',
          academicYear: '2026-2027',
          studentCount: 22
        });
        changed = true;
      }
    }

    // 2. Announcements
    if ((!this.cache.announcements || this.cache.announcements.length === 0) && INITIAL_ANNOUNCEMENTS.length > 0) {
      this.cache.announcements = [...INITIAL_ANNOUNCEMENTS];
      changed = true;
    }

    // 3. Homeworks
    if ((!this.cache.homeworks || this.cache.homeworks.length === 0) && INITIAL_HOMEWORKS.length > 0) {
      this.cache.homeworks = [...INITIAL_HOMEWORKS];
      changed = true;
    }

    // 4. Grades
    if (!this.cache.grades || this.cache.grades.length === 0) {
      const students = this.getStudents();
      if (students.length > 0) {
        const seedGrades: GradeRecord[] = [];
        const subjects = ['Matematik', 'Türk Dili ve Edebiyatı', 'Fizik'];
        students.forEach((st, idx) => {
          subjects.forEach((subj, subIdx) => {
            const baseScore = 75 + ((idx * 7 + subIdx * 11) % 23);
            seedGrades.push({
              id: `grade-${st.uid}-${subj}-Yazili1`,
              studentId: st.uid,
              studentName: st.displayName,
              studentNumber: st.schoolNumber || '',
              studentClass: st.classGrade || '9-D',
              subject: subj,
              examType: 'Yazılı 1',
              score: baseScore,
              maxScore: 100,
              examDate: '2026-09-18',
              teacherId: 'admin-tlogix',
              teacherName: 'Zümre Öğretmeni',
              notes: '1. Dönem 1. Yazılı Sınav Değerlendirmesi',
              createdAt: '2026-09-18T10:00:00.000Z'
            });
          });
        });
        this.cache.grades = seedGrades;
        changed = true;
      }
    }

    if (changed) {
      this.saveCache(this.cache);
    }
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
    }, 8000);

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.syncFromSupabaseDatabase(true);
      });
    }
  }

  /**
   * Ensures initial classes, announcements, and homeworks exist in Firestore.
   */
  private async seedAllInitialDataIfMissingInFirestore() {
    try {
      // 1. Ensure all initial classes exist
      for (const c of INITIAL_CLASSES) {
        try {
          const docRef = doc(db, 'classes', c.id);
          const snap = await getDoc(docRef);
          if (!snap.exists()) {
            await setDoc(docRef, sanitizeForFirestore(c));
          }
        } catch {}
      }

      // 2. Ensure initial announcements exist
      const annSnap = await getDocs(collection(db, 'announcements'));
      if (annSnap.empty) {
        for (const a of INITIAL_ANNOUNCEMENTS) {
          try {
            await setDoc(doc(db, 'announcements', a.id), sanitizeForFirestore(a));
          } catch {}
        }
      }

      // 3. Ensure initial homeworks exist
      const hwSnap = await getDocs(collection(db, 'homeworks'));
      if (hwSnap.empty) {
        for (const h of INITIAL_HOMEWORKS) {
          try {
            await setDoc(doc(db, 'homeworks', h.id), sanitizeForFirestore(h));
          } catch {}
        }
      }
    } catch (e) {
      console.log('[Firestore] seedAllInitialData note:', e);
    }
  }

  /**
   * Tests Firestore connectivity and measures roundtrip latency.
   */
  public async testFirestoreConnection(): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
      const pingId = `ping-${Date.now()}`;
      const pingRef = doc(db, '_health', pingId);
      await setDoc(pingRef, { ping: true, timestamp: new Date().toISOString() });
      const snap = await getDoc(pingRef);
      await deleteDoc(pingRef);
      const latencyMs = Date.now() - start;
      if (snap.exists()) {
        return {
          success: true,
          message: `Google Cloud Firestore bağlantısı aktif ve çalışıyor (${latencyMs}ms)`,
          latencyMs
        };
      }
      return {
        success: false,
        message: 'Bağlantı testi doğrulanamadı',
        latencyMs
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Firestore bağlantı hatası: ${err?.message || String(err)}`,
        latencyMs: Date.now() - start
      };
    }
  }

  /**
   * Returns live counts of documents currently stored in Google Cloud Firestore.
   */
  public async getFirestoreStats(): Promise<{
    users: number;
    classes: number;
    announcements: number;
    homeworks: number;
    grades: number;
    attendance: number;
    schedules: number;
  }> {
    try {
      const [uSnap, cSnap, aSnap, hSnap, gSnap, attSnap, sSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'announcements')),
        getDocs(collection(db, 'homeworks')),
        getDocs(collection(db, 'grades')),
        getDocs(collection(db, 'attendance')),
        getDocs(collection(db, 'schedules'))
      ]);
      return {
        users: uSnap.size,
        classes: cSnap.size,
        announcements: aSnap.size,
        homeworks: hSnap.size,
        grades: gSnap.size,
        attendance: attSnap.size,
        schedules: sSnap.size
      };
    } catch (e) {
      console.warn('Could not fetch Firestore stats:', e);
      return {
        users: this.cache.users.length,
        classes: this.cache.classes.length,
        announcements: this.cache.announcements.length,
        homeworks: this.cache.homeworks.length,
        grades: this.cache.grades.length,
        attendance: this.cache.attendance.length,
        schedules: this.cache.schedules.length
      };
    }
  }

  /**
   * Complete multi-device cloud synchronization utility.
   * Uploads all users, classes, announcements, homeworks, submissions, grades, attendance, and schedules to Google Cloud Firestore.
   */
  public async forceSyncAllWithFirestore(): Promise<{
    success: boolean;
    syncedUsersCount: number;
    syncedClassesCount: number;
    syncedAnnouncementsCount: number;
    syncedHomeworksCount: number;
    syncedGradesCount: number;
    syncedAttendanceCount: number;
    syncedSchedulesCount: number;
    message: string;
    error?: string;
  }> {
    try {
      // 1. Users
      for (const u of this.cache.users) {
        try {
          await setDoc(doc(db, 'users', u.uid), sanitizeForFirestore(u), { merge: true });
        } catch {}
      }

      // 2. Classes (Ensure all initial + cache classes are pushed)
      for (const c of this.cache.classes) {
        try {
          await setDoc(doc(db, 'classes', c.id), sanitizeForFirestore(c), { merge: true });
        } catch {}
      }

      // 3. Announcements
      for (const a of this.cache.announcements) {
        try {
          await setDoc(doc(db, 'announcements', a.id), sanitizeForFirestore(a), { merge: true });
        } catch {}
      }

      // 4. Homeworks
      for (const h of this.cache.homeworks) {
        try {
          await setDoc(doc(db, 'homeworks', h.id), sanitizeForFirestore(h), { merge: true });
        } catch {}
      }

      // 5. Submissions
      for (const s of (this.cache.submissions || [])) {
        try {
          await setDoc(doc(db, 'homework_submissions', s.id), sanitizeForFirestore(s), { merge: true });
        } catch {}
      }

      // 6. Grades
      for (const g of (this.cache.grades || [])) {
        try {
          await setDoc(doc(db, 'grades', g.id), sanitizeForFirestore(g), { merge: true });
        } catch {}
      }

      // 7. Attendance
      for (const att of (this.cache.attendance || [])) {
        try {
          await setDoc(doc(db, 'attendance', att.id), sanitizeForFirestore(att), { merge: true });
        } catch {}
      }

      // 8. Schedules
      for (const sc of (this.cache.schedules || [])) {
        try {
          await setDoc(doc(db, 'schedules', sc.id), sanitizeForFirestore(sc), { merge: true });
        } catch {}
      }

      // 9. Role assignments
      for (const ra of (this.cache.roleAssignments || [])) {
        try {
          await setDoc(doc(db, 'role_assignments', ra.id), sanitizeForFirestore(ra), { merge: true });
        } catch {}
      }

      // 10. Badges
      for (const b of (this.cache.badges || [])) {
        try {
          await setDoc(doc(db, 'badges', b.id), sanitizeForFirestore(b), { merge: true });
        } catch {}
      }

      // Seed any missing defaults
      await this.seedAllInitialDataIfMissingInFirestore();

      this.saveCache(this.cache, false);
      this.notifySubscribers();

      return {
        success: true,
        syncedUsersCount: this.cache.users.length,
        syncedClassesCount: this.cache.classes.length,
        syncedAnnouncementsCount: this.cache.announcements.length,
        syncedHomeworksCount: this.cache.homeworks.length,
        syncedGradesCount: this.cache.grades.length,
        syncedAttendanceCount: this.cache.attendance.length,
        syncedSchedulesCount: this.cache.schedules.length,
        message: `Google Cloud Firestore bulutuna tüm veriler başarıyla aktarıldı: ${this.cache.users.length} kullanıcı, ${this.cache.classes.length} sınıf, ${this.cache.announcements.length} duyuru, ${this.cache.homeworks.length} ödev.`
      };
    } catch (e: any) {
      return {
        success: false,
        syncedUsersCount: this.cache.users.length,
        syncedClassesCount: this.cache.classes.length,
        syncedAnnouncementsCount: this.cache.announcements.length,
        syncedHomeworksCount: this.cache.homeworks.length,
        syncedGradesCount: this.cache.grades.length,
        syncedAttendanceCount: this.cache.attendance.length,
        syncedSchedulesCount: this.cache.schedules.length,
        message: 'Bulut eşitleme hatası: ' + (e.message || String(e)),
        error: e.message || String(e)
      };
    }
  }

  /**
   * Fetches all records from Google Cloud Firestore and updates local state.
   */
  public async pullAllFromFirestore(): Promise<{
    success: boolean;
    syncedUsersCount: number;
    syncedClassesCount: number;
    syncedAnnouncementsCount: number;
    syncedHomeworksCount: number;
    message: string;
  }> {
    try {
      const [uSnap, cSnap, aSnap, hSnap, subSnap, gSnap, attSnap, sSnap, raSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'announcements')),
        getDocs(collection(db, 'homeworks')),
        getDocs(collection(db, 'homework_submissions')),
        getDocs(collection(db, 'grades')),
        getDocs(collection(db, 'attendance')),
        getDocs(collection(db, 'schedules')),
        getDocs(collection(db, 'role_assignments'))
      ]);

      if (!uSnap.empty) {
        const remoteUsers: UserProfile[] = [];
        uSnap.forEach(d => remoteUsers.push({ ...(d.data() as UserProfile), uid: d.id }));
        const map = new Map<string, UserProfile>();
        this.cache.users.forEach(u => map.set(u.uid, u));
        remoteUsers.forEach(u => map.set(u.uid, u));
        this.cache.users = Array.from(map.values());
      }

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
        const map = new Map<string, SchoolClass>();
        INITIAL_CLASSES.forEach(c => map.set(c.id, c));
        this.cache.classes.forEach(c => map.set(c.id, c));
        clsList.forEach(c => map.set(c.id, c));
        this.cache.classes = Array.from(map.values());
      }

      if (!aSnap.empty) {
        const list: Announcement[] = [];
        aSnap.forEach(d => list.push({ id: d.id, ...(d.data() as Announcement) }));
        this.cache.announcements = list;
      }

      if (!hSnap.empty) {
        const list: Homework[] = [];
        hSnap.forEach(d => list.push({ id: d.id, ...(d.data() as Homework) }));
        this.cache.homeworks = list;
      }

      if (!subSnap.empty) {
        const list: HomeworkSubmission[] = [];
        subSnap.forEach(d => list.push({ id: d.id, ...(d.data() as HomeworkSubmission) }));
        this.cache.submissions = list;
      }

      if (!gSnap.empty) {
        const list: GradeRecord[] = [];
        gSnap.forEach(d => list.push({ id: d.id, ...(d.data() as GradeRecord) }));
        this.cache.grades = list;
      }

      if (!attSnap.empty) {
        const list: AttendanceRecord[] = [];
        attSnap.forEach(d => list.push({ id: d.id, ...(d.data() as AttendanceRecord) }));
        this.cache.attendance = list;
      }

      if (!sSnap.empty) {
        const list: WeeklyScheduleSlot[] = [];
        sSnap.forEach(d => list.push({ id: d.id, ...(d.data() as WeeklyScheduleSlot) }));
        this.cache.schedules = list;
      }

      if (!raSnap.empty) {
        const list: RoleAssignment[] = [];
        raSnap.forEach(d => list.push({ id: d.id, ...(d.data() as RoleAssignment) }));
        this.cache.roleAssignments = list;
      }

      this.saveCache(this.cache, false);
      this.notifySubscribers();

      return {
        success: true,
        syncedUsersCount: this.cache.users.length,
        syncedClassesCount: this.cache.classes.length,
        syncedAnnouncementsCount: this.cache.announcements.length,
        syncedHomeworksCount: this.cache.homeworks.length,
        message: 'Google Cloud Firestore’dan tüm veriler güncel olarak çekildi ve arayüze yüklendi!'
      };
    } catch (err: any) {
      return {
        success: false,
        syncedUsersCount: 0,
        syncedClassesCount: 0,
        syncedAnnouncementsCount: 0,
        syncedHomeworksCount: 0,
        message: 'Veri çekme hatası: ' + (err?.message || String(err))
      };
    }
  }

  /**
   * Ensures INITIAL_ADMIN exists in Firestore and removes any rogue non-admin or ulutas accounts.
   */
  private async seedInitialAdminIfMissing() {
    try {
      const adminDocRef = doc(db, 'users', INITIAL_ADMIN.uid);
      const adminSnap = await getDoc(adminDocRef);
      if (!adminSnap.exists()) {
        await setDoc(adminDocRef, sanitizeForFirestore(INITIAL_ADMIN));
        console.log('[Firestore] Seeded INITIAL_ADMIN to Firestore');
      }

      // Proactively purge ulutastunagokturk@gmail.com from Firestore if exists
      try {
        const ownerDocRef = doc(db, 'users', 'admin-owner-ulutas');
        const ownerSnap = await getDoc(ownerDocRef);
        if (ownerSnap.exists()) {
          await deleteDoc(ownerDocRef);
        }
      } catch {}

      // Keep valid users in cache, excluding deleted user
      this.cache.users = this.cache.users.filter(u => 
        (u.email || '').toLowerCase().trim() !== 'ulutastunagokturk@gmail.com' &&
        u.uid !== 'admin-owner-ulutas'
      );
      if (!this.cache.users.some(u => u.uid === INITIAL_ADMIN.uid)) {
        this.cache.users.unshift(INITIAL_ADMIN);
      }
      this.saveCache(this.cache);
    } catch (err) {
      console.log('[Firestore] seedInitialAdmin note:', err);
    }
  }

  public async syncUsersFromFirestore(): Promise<UserProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        const remoteUsers: UserProfile[] = [];
        for (const docSnap of snap.docs) {
          const u = { ...(docSnap.data() as UserProfile), uid: docSnap.id };
          const em = (u.email || '').toLowerCase().trim();
          const isUlutas = em === 'ulutastunagokturk@gmail.com' || docSnap.id === 'admin-owner-ulutas';

          if (isUlutas) {
            deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
          } else {
            remoteUsers.push(u);
          }
        }

        const mergedMap = new Map<string, UserProfile>();
        mergedMap.set(INITIAL_ADMIN.uid, INITIAL_ADMIN);
        this.cache.users
          .filter(u => (u.email || '').toLowerCase().trim() !== 'ulutastunagokturk@gmail.com' && u.uid !== 'admin-owner-ulutas')
          .forEach(u => mergedMap.set(u.uid, u));
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
    allowedRoles?: UserRole[];
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
            // Strict role guard: Never match accounts outside allowedRoles
            if (criteria.allowedRoles && criteria.allowedRoles.length > 0 && !criteria.allowedRoles.includes(u.role)) {
              return;
            }

            const targetSchool = criteria.schoolNumber?.trim();
            const targetEmail = criteria.email?.trim().toLowerCase();
            const targetPhone = criteria.phone?.replace(/\D/g, '');

            if (targetSchool && u.role === 'student' && u.schoolNumber === targetSchool) {
              found = u;
            } else if (targetEmail && u.email?.toLowerCase() === targetEmail) {
              found = u;
            } else if (targetPhone && u.phone) {
              const uClean = u.phone.replace(/\D/g, '');
              if (
                uClean === targetPhone ||
                (targetPhone.length === 10 && uClean === '0' + targetPhone) ||
                (targetPhone.length === 11 && targetPhone.startsWith('0') && uClean === targetPhone.slice(1))
              ) {
                found = u;
              }
            } else if (criteria.identifier) {
              const raw = criteria.identifier.trim().toLowerCase();
              const dig = raw.replace(/\D/g, '');
              const uCleanPhone = u.phone ? u.phone.replace(/\D/g, '') : '';

              if (u.email?.toLowerCase() === raw) {
                found = u;
              } else if (
                dig.length >= 10 &&
                (uCleanPhone === dig ||
                  (dig.length === 10 && uCleanPhone === '0' + dig) ||
                  (dig.length === 11 && dig.startsWith('0') && uCleanPhone === dig.slice(1)))
              ) {
                found = u;
              } else if (
                dig &&
                (!criteria.allowedRoles || criteria.allowedRoles.includes('student')) &&
                u.role === 'student' &&
                u.schoolNumber === dig
              ) {
                found = u;
              } else if (u.displayName?.toLowerCase() === raw) {
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
          this.saveCache(this.cache, false);
          this.notifySubscribers();
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'role_assignments');
      });
      this.listeners.set('role_assignments', unsubRoleAssign);

      // Listen to announcements
      const unsubAnn = onSnapshot(collection(db, 'announcements'), (snapshot) => {
        if (!snapshot.empty) {
          const list: Announcement[] = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Announcement));
          const map = new Map<string, Announcement>();
          this.cache.announcements.forEach(a => map.set(a.id, a));
          list.forEach(a => map.set(a.id, a));
          this.cache.announcements = Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          this.saveCache(this.cache, false);
          this.notifySubscribers();
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'announcements'));
      this.listeners.set('announcements', unsubAnn);

      // Listen to homeworks
      const unsubHw = onSnapshot(collection(db, 'homeworks'), (snapshot) => {
        if (!snapshot.empty) {
          const list: Homework[] = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Homework));
          const map = new Map<string, Homework>();
          this.cache.homeworks.forEach(h => map.set(h.id, h));
          list.forEach(h => map.set(h.id, h));
          this.cache.homeworks = Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          this.saveCache(this.cache, false);
          this.notifySubscribers();
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'homeworks'));
      this.listeners.set('homeworks', unsubHw);

      // Listen to homework submissions
      const unsubSubmissions = onSnapshot(collection(db, 'homework_submissions'), (snapshot) => {
        if (!snapshot.empty) {
          const list: HomeworkSubmission[] = [];
          snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() } as HomeworkSubmission));
          const map = new Map<string, HomeworkSubmission>();
          this.cache.submissions.forEach(s => map.set(s.id, s));
          list.forEach(s => map.set(s.id, s));
          this.cache.submissions = Array.from(map.values());
          this.saveCache(this.cache, false);
          this.notifySubscribers();
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'homework_submissions'));
      this.listeners.set('homework_submissions', unsubSubmissions);

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
          const map = new Map<string, SchoolClass>();
          INITIAL_CLASSES.forEach(c => map.set(c.id, c));
          this.cache.classes.forEach(c => map.set(c.id, c));
          list.forEach(c => map.set(c.id, c));
          this.cache.classes = Array.from(map.values());
          this.saveCache(this.cache, false);
          this.notifySubscribers();
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
          this.saveCache(this.cache, false);
          this.notifySubscribers();
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
          this.saveCache(this.cache, false);
          this.notifySubscribers();
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
          this.saveCache(this.cache, false);
          this.notifySubscribers();
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'attendance'));
      this.listeners.set('attendance', unsubAtt);
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
    const targetNorm = normalizeClassName(className);
    return this.cache.users.filter(u => 
      u.role === 'student' && 
      u.status !== 'deactivated' &&
      (u.classGrade === className || normalizeClassName(u.classGrade) === targetNorm)
    );
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

  public getUserByPhoneOrEmail(identifier: string, allowedRoles?: UserRole[]): UserProfile | undefined {
    const trimmed = identifier.trim();
    if (!trimmed) return undefined;
    const cleanDigits = trimmed.replace(/\D/g, '');
    const lower = trimmed.toLowerCase();

    const candidateUsers = allowedRoles && allowedRoles.length > 0
      ? this.cache.users.filter(u => allowedRoles.includes(u.role))
      : this.cache.users;

    // 1. Direct email match
    if (lower.includes('@')) {
      const byEmail = candidateUsers.find(u => u.email?.toLowerCase() === lower);
      if (byEmail) return byEmail;
    }

    // 2. Exact phone match (standard 10 or 11 digits)
    if (cleanDigits.length >= 10) {
      const byPhone = candidateUsers.find(u => {
        if (!u.phone) return false;
        const uPhoneDigits = u.phone.replace(/\D/g, '');
        return (
          uPhoneDigits === cleanDigits ||
          (cleanDigits.length === 10 && uPhoneDigits === '0' + cleanDigits) ||
          (cleanDigits.length === 11 && cleanDigits.startsWith('0') && uPhoneDigits === cleanDigits.slice(1))
        );
      });
      if (byPhone) return byPhone;
    }

    // 3. School number match (STRICTLY for students only!)
    if (cleanDigits && (!allowedRoles || allowedRoles.includes('student'))) {
      const bySchool = candidateUsers.find(u => u.role === 'student' && u.schoolNumber?.trim() === cleanDigits);
      if (bySchool) return bySchool;
    }

    // 4. Exact email or exact displayName match
    return candidateUsers.find(u => 
      (u.email && u.email.toLowerCase() === lower) || 
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
      const cleanName = fixTurkishMojibake(row.name?.trim() || '');
      const cleanSchoolNo = row.schoolNumber ? String(row.schoolNumber).replace(/^#/, '').trim() : '';
      const cleanClass = normalizeTurkishClassName(row.classGrade ? String(row.classGrade).trim() : '');

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

  /**
   * Retrieves all parent accounts
   */
  public getParents(): UserProfile[] {
    return this.cache.users.filter(u => u.role === 'parent');
  }

  /**
   * Bulk imports parent list from any Excel spreadsheet (.xlsx, .xls, .csv, .ods, .tsv)
   * Links parent accounts to one or more students using student school numbers or names.
   */
  public async bulkImportParentsFromExcel(
    rows: ExcelParentRow[], 
    adminName: string = 'Sistem Yöneticisi'
  ): Promise<ExcelParentImportSummary> {
    let createdParents = 0;
    let updatedParents = 0;
    let linkedStudentsCount = 0;
    let skippedOrErrors = 0;
    const errors: { row: number; reason: string }[] = [];

    const updatedUsers = [...this.cache.users];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIdx = i + 1;
      const cleanParentName = fixTurkishMojibake(row.parentName?.trim() || '');
      const cleanPhone = row.parentPhone ? String(row.parentPhone).trim().replace(/\s+/g, '') : '';
      const cleanEmail = row.parentEmail ? String(row.parentEmail).trim().toLowerCase() : '';
      const rawStudentNos = row.studentNumbers ? String(row.studentNumbers).trim() : '';
      const rawStudentName = fixTurkishMojibake(row.studentName?.trim() || '');

      if (!cleanParentName && !cleanPhone && !cleanEmail) {
        skippedOrErrors++;
        errors.push({ row: rowIdx, reason: 'Veli adı, telefonu veya e-postası belirtilmemiş.' });
        continue;
      }

      // Parse student school numbers (comma, semicolon, slash or space separated: e.g. "1042, 1045" or "1042")
      const parsedNos = rawStudentNos
        ? rawStudentNos.split(/[,;\/\s]+/).map(s => s.trim().replace(/^#/, '')).filter(Boolean)
        : [];

      // Find matching students
      const matchedStudents: UserProfile[] = [];
      for (const no of parsedNos) {
        const found = updatedUsers.find(u => u.role === 'student' && u.schoolNumber === no);
        if (found && !matchedStudents.some(m => m.uid === found.uid)) {
          matchedStudents.push(found);
        }
      }

      // If no school number matched or provided, try matching by student name
      if (matchedStudents.length === 0 && rawStudentName) {
        const lowerStudentName = rawStudentName.toLowerCase();
        const foundByName = updatedUsers.filter(u => 
          u.role === 'student' && 
          (u.displayName.toLowerCase().includes(lowerStudentName) || lowerStudentName.includes(u.displayName.toLowerCase()))
        );
        foundByName.forEach(f => {
          if (!matchedStudents.some(m => m.uid === f.uid)) {
            matchedStudents.push(f);
          }
        });
      }

      // Determine parent password
      const cleanDigits = cleanPhone.replace(/\D/g, '');
      const lastDigits = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : (parsedNos[0] || '1234');
      const defaultPassword = `veli${lastDigits}`;
      const parentPass = row.parentPassword?.trim() || defaultPassword;

      // Check if parent already exists (by phone digits or email)
      const existingParentIdx = updatedUsers.findIndex(u =>
        u.role === 'parent' && (
          (cleanDigits && cleanDigits.length >= 7 && u.phone && u.phone.replace(/\D/g, '') === cleanDigits) ||
          (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
        )
      );

      let targetParentUid = '';
      const newStudentIds = matchedStudents.map(s => s.uid);
      const newStudentNumbers = Array.from(new Set([
        ...matchedStudents.map(s => s.schoolNumber || '').filter(Boolean),
        ...parsedNos
      ]));

      if (existingParentIdx >= 0) {
        const existingParent = updatedUsers[existingParentIdx];
        const mergedStudentIds = Array.from(new Set([...(existingParent.studentIds || []), ...newStudentIds]));
        const mergedStudentNumbers = Array.from(new Set([...(existingParent.studentNumbers || []), ...newStudentNumbers]));

        updatedUsers[existingParentIdx] = {
          ...existingParent,
          displayName: cleanParentName || existingParent.displayName,
          phone: cleanPhone || existingParent.phone,
          email: cleanEmail || existingParent.email,
          password: row.parentPassword?.trim() || existingParent.password || parentPass,
          studentIds: mergedStudentIds,
          studentNumbers: mergedStudentNumbers,
          updatedAt: new Date().toISOString()
        };
        targetParentUid = existingParent.uid;
        updatedParents++;
      } else {
        targetParentUid = `parent-${cleanDigits || Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const autoEmail = cleanEmail || (cleanDigits ? `veli.${cleanDigits.slice(-7)}@gnsial.meb.k12.tr` : `veli.${targetParentUid}@gnsial.meb.k12.tr`);
        
        const newParent: UserProfile = {
          uid: targetParentUid,
          displayName: cleanParentName || 'Öğrenci Velisi',
          email: autoEmail,
          phone: cleanPhone || '',
          role: 'parent',
          password: parentPass,
          status: 'active',
          studentIds: newStudentIds,
          studentNumbers: newStudentNumbers,
          createdAt: new Date().toISOString()
        };
        updatedUsers.push(newParent);
        createdParents++;
      }

      // Link matched students to this parent
      for (const st of matchedStudents) {
        const stIdx = updatedUsers.findIndex(u => u.uid === st.uid);
        if (stIdx >= 0) {
          updatedUsers[stIdx] = {
            ...updatedUsers[stIdx],
            parentId: targetParentUid,
            parentName: cleanParentName || (existingParentIdx >= 0 ? updatedUsers[existingParentIdx].displayName : 'Veli'),
            parentPhone: cleanPhone || (existingParentIdx >= 0 ? updatedUsers[existingParentIdx].phone : ''),
            updatedAt: new Date().toISOString()
          };
          linkedStudentsCount++;
        }
      }
    }

    this.cache.users = updatedUsers;

    // Create or update role assignments for parent accounts
    const updatedRoleAssignments = [...this.cache.roleAssignments];
    for (const p of updatedUsers.filter(u => u.role === 'parent')) {
      const existingAssignIdx = updatedRoleAssignments.findIndex(ra => ra.userEmail?.toLowerCase() === p.email?.toLowerCase());
      const roleAssign: RoleAssignment = {
        id: existingAssignIdx >= 0 ? updatedRoleAssignments[existingAssignIdx].id : `assign-parent-${p.uid}`,
        userEmail: p.email,
        userName: p.displayName,
        assignedRole: 'parent',
        assignedBy: adminName,
        assignedAt: new Date().toISOString(),
        status: 'active',
        notes: `Excel ile toplu tanımlandı. Bağlı öğrenci no: ${(p.studentNumbers || []).join(', ') || 'Belirtilmedi'}`,
        permissions: [
          'Öğrenci Not ve Karne Takibi',
          'Günlük Devamsızlık ve İzin Bilgisi',
          'Okul & Sınıf Duyuruları',
          'Öğretmen & Rehberlik İletişim Bilgileri'
        ]
      };
      if (existingAssignIdx >= 0) {
        updatedRoleAssignments[existingAssignIdx] = roleAssign;
      } else {
        updatedRoleAssignments.push(roleAssign);
      }
      setDoc(doc(db, 'role_assignments', roleAssign.id), sanitizeForFirestore(roleAssign), { merge: true }).catch(() => {});
      setDoc(doc(db, 'users', p.uid), sanitizeForFirestore(p), { merge: true }).catch(() => {});
    }

    // Persist updated students to Firestore
    for (const st of updatedUsers.filter(u => u.role === 'student' && u.parentId)) {
      setDoc(doc(db, 'users', st.uid), sanitizeForFirestore(st), { merge: true }).catch(() => {});
    }

    this.cache.roleAssignments = updatedRoleAssignments;
    this.saveCache(this.cache);
    this.notifySubscribers();

    this.logSystemAction(
      'Excel ile Toplu Veli Hesabı Oluşturuldu',
      adminName,
      'admin',
      'Toplu Veli İçe Aktarma',
      `${rows.length} satırlık Excel dosyasından ${createdParents} yeni veli hesabı açıldı, ${updatedParents} veli güncellendi, ${linkedStudentsCount} öğrenci ile bağlandı.`
    );

    // Sync to Supabase & Firestore
    this.triggerSupabaseBackup('auto').catch(() => {});
    this.triggerSupabaseTableSync().catch(() => {});

    return {
      totalRows: rows.length,
      createdParents,
      updatedParents,
      linkedStudentsCount,
      skippedOrErrors,
      errors
    };
  }

  /**
   * Manually creates or updates a single parent account and links students
   */
  public async createParentAccount(data: {
    displayName?: string;
    parentName?: string;
    phone?: string;
    parentPhone?: string;
    email?: string;
    parentEmail?: string;
    password?: string;
    parentPassword?: string;
    studentNumbers?: string[];
    studentIds?: string[];
    assignedBy?: string;
    createdBy?: string;
    notes?: string;
    permissions?: string[];
    relationship?: string;
  }): Promise<{ parent: UserProfile; linkedStudents: UserProfile[]; linkedStudentsCount: number }> {
    const rawPhone = data.phone || data.parentPhone || '';
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const cleanEmail = (data.email || data.parentEmail || '').trim().toLowerCase();
    const cleanName = (data.displayName || data.parentName || 'Öğrenci Velisi').trim();
    const cleanPassword = (data.password || data.parentPassword || '').trim() || `veli${cleanDigits.slice(-4) || '1234'}`;

    // Find if parent exists
    const existingIndex = this.cache.users.findIndex(u =>
      u.role === 'parent' && (
        (cleanDigits && cleanDigits.length >= 7 && u.phone && u.phone.replace(/\D/g, '') === cleanDigits) ||
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
      )
    );

    let parentUid: string;
    let targetParent: UserProfile;

    const reqStudentIds = data.studentIds || [];
    const reqStudentNos = data.studentNumbers || [];

    const matchedStudents = this.cache.users.filter(u =>
      u.role === 'student' && (
        reqStudentIds.includes(u.uid) ||
        (u.schoolNumber && reqStudentNos.includes(u.schoolNumber))
      )
    );

    const finalStudentIds = Array.from(new Set([...matchedStudents.map(s => s.uid), ...reqStudentIds]));
    const finalStudentNumbers = Array.from(new Set([...matchedStudents.map(s => s.schoolNumber || '').filter(Boolean), ...reqStudentNos]));

    if (existingIndex >= 0) {
      const existing = this.cache.users[existingIndex];
      parentUid = existing.uid;
      targetParent = {
        ...existing,
        displayName: cleanName || existing.displayName,
        phone: data.phone.trim() || existing.phone,
        email: cleanEmail || existing.email,
        password: cleanPassword || existing.password,
        relationship: data.relationship || existing.relationship || 'Veli',
        studentIds: Array.from(new Set([...(existing.studentIds || []), ...finalStudentIds])),
        studentNumbers: Array.from(new Set([...(existing.studentNumbers || []), ...finalStudentNumbers])),
        status: 'active',
        updatedAt: new Date().toISOString()
      };
      this.cache.users[existingIndex] = targetParent;
    } else {
      parentUid = `parent-${cleanDigits || Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const autoEmail = cleanEmail || (cleanDigits ? `veli.${cleanDigits.slice(-7)}@gnsial.meb.k12.tr` : `veli.${Date.now()}@gnsial.meb.k12.tr`);
      targetParent = {
        uid: parentUid,
        displayName: cleanName,
        phone: rawPhone.trim(),
        email: autoEmail,
        role: 'parent',
        password: cleanPassword,
        relationship: data.relationship || 'Veli',
        status: 'active',
        studentIds: finalStudentIds,
        studentNumbers: finalStudentNumbers,
        createdAt: new Date().toISOString()
      };
      this.cache.users = [targetParent, ...this.cache.users];
    }

    // Update students to link to this parent
    this.cache.users = this.cache.users.map(u => {
      if (u.role === 'student' && (finalStudentIds.includes(u.uid) || (u.schoolNumber && finalStudentNumbers.includes(u.schoolNumber)))) {
        return {
          ...u,
          parentId: parentUid,
          parentName: targetParent.displayName,
          parentPhone: targetParent.phone,
          updatedAt: new Date().toISOString()
        };
      }
      return u;
    });

    // Create role assignment
    const newAssignment: RoleAssignment = {
      id: `assign-${Date.now()}`,
      userEmail: targetParent.email,
      userName: targetParent.displayName,
      assignedRole: 'parent',
      studentNumbers: finalStudentNumbers,
      assignedBy: data.assignedBy,
      assignedAt: new Date().toISOString(),
      status: 'active',
      notes: data.notes || `Yönetici (${data.assignedBy}) tarafından Veli hesabı oluşturuldu ve öğrenci(ler) ile eşleştirildi.`,
      permissions: data.permissions || [
        'Öğrenci Not ve Karne Takibi',
        'Günlük Devamsızlık ve İzin Bilgisi',
        'Ödev, Proje ve Teslim Durumu',
        'Okul & Sınıf Duyuruları',
        'Öğretmenle Doğrudan İletişim / Mesajlaşma'
      ]
    };

    this.cache.roleAssignments = [
      newAssignment,
      ...(this.cache.roleAssignments || []).filter(a => a.userEmail?.toLowerCase() !== targetParent.email.toLowerCase())
    ];

    this.saveCache(this.cache);
    this.notifySubscribers();

    this.logSystemAction(
      'Veli Hesabı Tanımlandı & Yetkilendirildi',
      data.assignedBy,
      'admin',
      targetParent.displayName,
      `${targetParent.displayName} (${targetParent.phone}) için Veli hesabı açıldı. Bağlı Öğrenciler: ${finalStudentNumbers.join(', ') || 'Yok'}.`
    );

    // Sync to Supabase
    this.triggerSupabaseBackup('auto').catch(() => {});

    // Save to Firestore
    try {
      await setDoc(doc(db, 'users', targetParent.uid), sanitizeForFirestore(targetParent));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${targetParent.uid}`);
    }

    return {
      parent: targetParent,
      linkedStudents: matchedStudents,
      linkedStudentsCount: matchedStudents.length
    };
  }

  /**
   * Links an existing student to an existing parent account
   */
  public async linkStudentToParent(parentUid: string, studentNumberOrUid: string, adminName: string): Promise<boolean> {
    const parent = this.cache.users.find(u => u.uid === parentUid);
    if (!parent) return false;

    const student = this.cache.users.find(u => 
      u.role === 'student' && (u.uid === studentNumberOrUid || u.schoolNumber === studentNumberOrUid)
    );
    if (!student) return false;

    const studentNos = Array.from(new Set([...(parent.studentNumbers || []), student.schoolNumber || ''])).filter(Boolean);
    const studentIds = Array.from(new Set([...(parent.studentIds || []), student.uid]));

    this.cache.users = this.cache.users.map(u => {
      if (u.uid === parent.uid) {
        return {
          ...u,
          studentNumbers: studentNos,
          studentIds: studentIds,
          updatedAt: new Date().toISOString()
        };
      }
      if (u.uid === student.uid) {
        return {
          ...u,
          parentId: parent.uid,
          parentName: parent.displayName,
          parentPhone: parent.phone,
          updatedAt: new Date().toISOString()
        };
      }
      return u;
    });

    this.saveCache(this.cache);
    this.notifySubscribers();

    this.logSystemAction(
      'Veli-Öğrenci Eşleştirmesi Yapıldı',
      adminName,
      'admin',
      'Veli Eşleştirme',
      `"${parent.displayName}" velisi, #${student.schoolNumber} "${student.displayName}" isimli öğrenci ile eşleştirildi.`
    );

    this.triggerSupabaseBackup('auto').catch(() => {});
    return true;
  }

  /**
   * Unlinks a student from a parent account
   */
  public async unlinkStudentFromParent(parentUid: string, studentNumberOrUid: string, adminName: string): Promise<boolean> {
    const parent = this.cache.users.find(u => u.uid === parentUid);
    if (!parent) return false;

    const student = this.cache.users.find(u => 
      u.role === 'student' && (u.uid === studentNumberOrUid || u.schoolNumber === studentNumberOrUid)
    );

    const studentNos = (parent.studentNumbers || []).filter(n => n !== studentNumberOrUid && (student ? n !== student.schoolNumber : true));
    const studentIds = (parent.studentIds || []).filter(id => id !== studentNumberOrUid && (student ? id !== student.uid : true));

    this.cache.users = this.cache.users.map(u => {
      if (u.uid === parent.uid) {
        return {
          ...u,
          studentNumbers: studentNos,
          studentIds: studentIds,
          updatedAt: new Date().toISOString()
        };
      }
      if (student && u.uid === student.uid && u.parentId === parent.uid) {
        return {
          ...u,
          parentId: undefined,
          parentName: undefined,
          parentPhone: undefined,
          updatedAt: new Date().toISOString()
        };
      }
      return u;
    });

    this.saveCache(this.cache);
    this.notifySubscribers();

    this.logSystemAction(
      'Veli-Öğrenci Eşleştirmesi Kaldırıldı',
      adminName,
      'admin',
      'Veli Eşleştirme',
      `"${parent.displayName}" velisinden öğrenci (#${studentNumberOrUid}) eşleştirmesi kaldırıldı.`
    );

    this.triggerSupabaseBackup('auto').catch(() => {});
    return true;
  }

  public async assignUserRole(data: {
    userEmail: string;
    userName: string;
    assignedRole: UserRole;
    classGrade?: string;
    branch?: string;
    schoolNumber?: string;
    studentNumbers?: string[];
    studentIds?: string[];
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
      existingUser?.password ||
      (data.assignedRole === 'student' ? generateUniqueStudentPassword({ schoolNumber: data.schoolNumber }) :
       data.assignedRole === 'teacher' ? `Gns-${Math.floor(1000 + Math.random() * 9000)}!Tch` :
       data.assignedRole === 'admin' ? `Gns-${Math.floor(1000 + Math.random() * 9000)}!Adm` :
       `veli${Math.floor(1000 + Math.random() * 9000)}`);

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
        studentIds: data.assignedRole === 'parent' ? (data.studentIds || existingUser.studentIds) : existingUser.studentIds,
        studentNumbers: data.assignedRole === 'parent' ? (data.studentNumbers || existingUser.studentNumbers) : existingUser.studentNumbers,
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
        studentIds: data.assignedRole === 'parent' ? (data.studentIds || []) : undefined,
        studentNumbers: data.assignedRole === 'parent' ? (data.studentNumbers || []) : undefined,
        password: determinedPassword,
        phone: data.phone?.trim(),
        status: 'active',
        totalXp: data.assignedRole === 'student' ? 100 : undefined,
        level: data.assignedRole === 'student' ? 1 : undefined,
        createdAt: new Date().toISOString()
      };
      this.cache.users = [targetUser, ...this.cache.users];
    }

    if (data.assignedRole === 'parent' && (targetUser.studentIds?.length || targetUser.studentNumbers?.length)) {
      const sIds = targetUser.studentIds || [];
      const sNos = targetUser.studentNumbers || [];
      this.cache.users = this.cache.users.map(u => {
        if (u.role === 'student' && (sIds.includes(u.uid) || (u.schoolNumber && sNos.includes(u.schoolNumber)))) {
          return {
            ...u,
            parentId: targetUser.uid,
            parentName: targetUser.displayName,
            parentPhone: targetUser.phone,
            updatedAt: new Date().toISOString()
          };
        }
        return u;
      });
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
    const list = [...this.cache.classes];
    // Guarantee that any class present in active students (such as '9-D', '9/D') is always represented
    const studentClasses = new Set<string>();
    this.cache.users.forEach(u => {
      if (u.role === 'student' && u.classGrade && u.status !== 'deactivated') {
        studentClasses.add(u.classGrade);
      }
    });

    studentClasses.forEach(stCls => {
      const norm = normalizeClassName(stCls);
      const exists = list.some(c => normalizeClassName(c.name) === norm);
      if (!exists) {
        const gradeMatch = stCls.match(/(\d+)/);
        const secMatch = stCls.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/g);
        const gradeLevel = gradeMatch ? parseInt(gradeMatch[1], 10) : 9;
        const section = secMatch && secMatch.length > 0 ? secMatch[secMatch.length - 1].toUpperCase() : 'D';
        const displayName = `${gradeLevel}-${section}`;
        list.push({
          id: `class-${norm.toLowerCase()}`,
          name: displayName,
          gradeLevel,
          branch: section,
          section,
          academicYear: '2026-2027',
          studentCount: this.getStudentsByClass(stCls).length
        });
      }
    });

    return list.sort((a, b) => {
      if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel;
      return a.name.localeCompare(b.name);
    });
  }

  public getClassById(id: string): SchoolClass | undefined {
    return this.getClasses().find(c => c.id === id);
  }

  public getClassByName(name: string): SchoolClass | undefined {
    if (!name) return undefined;
    const targetNorm = normalizeClassName(name);
    return this.getClasses().find(c => normalizeClassName(c.name) === targetNorm || (c.name || '').toLowerCase() === name.toLowerCase());
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
      await setDoc(doc(db, 'classes', classId), sanitizeForFirestore(updatedClass), { merge: true });
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

  public getHomeworksForStudent(studentClass?: string, studentId?: string): Homework[] {
    const student = studentId ? this.getUserById(studentId) : undefined;
    const effectiveClass = studentClass || student?.classGrade || '';
    const cleanNorm = normalizeClassName(effectiveClass);

    return this.cache.homeworks.filter(hw => {
      // 1. If assigned specifically to selected students
      if (hw.targetType === 'student' || (hw.targetStudentIds && hw.targetStudentIds.length > 0)) {
        if (!studentId) return false;
        return hw.targetStudentIds?.includes(studentId);
      }

      // 2. All School target (always visible to all students)
      if (isAllSchool(hw.targetClass)) return true;
      if (hw.targetClasses && hw.targetClasses.some(c => isAllSchool(c))) return true;

      // 3. If student has a classGrade, check matching classes
      if (cleanNorm) {
        if (hw.targetClasses && hw.targetClasses.some(c => isAllSchool(c) || normalizeClassName(c) === cleanNorm)) {
          return true;
        }
        if (hw.targetClass) {
          const parts = hw.targetClass.split(',').map(c => c.trim());
          if (parts.some(p => isAllSchool(p) || normalizeClassName(p) === cleanNorm)) {
            return true;
          }
        }
      }

      return false;
    });
  }

  public getHomeworksForTeacher(teacherId: string): Homework[] {
    return this.cache.homeworks.filter(hw => hw.teacherId === teacherId);
  }

  public async addHomework(homework: Homework): Promise<Homework> {
    const updatedHomeworks = [homework, ...this.cache.homeworks];
    
    // Determine target students
    let targetStudents: UserProfile[] = [];
    const allStudents = this.getStudents();
    if (homework.targetType === 'student' && homework.targetStudentIds && homework.targetStudentIds.length > 0) {
      targetStudents = allStudents.filter(st => homework.targetStudentIds?.includes(st.uid));
    } else if (isAllSchool(homework.targetClass) || (homework.targetClasses && homework.targetClasses.some(tc => isAllSchool(tc)))) {
      targetStudents = allStudents;
    } else if (homework.targetClasses && homework.targetClasses.length > 0) {
      const normTargets = homework.targetClasses.map(tc => normalizeClassName(tc));
      targetStudents = allStudents.filter(st => 
        st.classGrade && normTargets.includes(normalizeClassName(st.classGrade))
      );
    } else if (homework.targetClass) {
      const parts = homework.targetClass.split(',').map(c => normalizeClassName(c.trim()));
      targetStudents = allStudents.filter(st => 
        st.classGrade && parts.includes(normalizeClassName(st.classGrade))
      );
    } else {
      targetStudents = allStudents;
    }

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

  public async updateHomework(homeworkId: string, updates: Partial<Homework>): Promise<Homework | null> {
    const existingIndex = this.cache.homeworks.findIndex(h => h.id === homeworkId);
    if (existingIndex < 0) return null;

    const existingHw = this.cache.homeworks[existingIndex];
    const updatedHw: Homework = {
      ...existingHw,
      ...updates
    };

    const updatedHomeworks = [...this.cache.homeworks];
    updatedHomeworks[existingIndex] = updatedHw;

    this.saveCache({
      ...this.cache,
      homeworks: updatedHomeworks
    });

    this.logSystemAction(
      'Ödev Güncellendi',
      updatedHw.teacherName,
      'teacher',
      updatedHw.targetClass,
      `"${updatedHw.title}" (${updatedHw.subject}) ödevi güncellendi.`
    );

    try {
      await setDoc(doc(db, 'homeworks', homeworkId), sanitizeForFirestore(updatedHw), { merge: true });
    } catch (e) {
      console.log('Firebase update homework sync:', e);
    }

    return updatedHw;
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

  public getHomeworkById(homeworkId: string): Homework | undefined {
    return this.cache.homeworks.find(h => h.id === homeworkId);
  }

  public getSubmissions(): HomeworkSubmission[] {
    return [...this.cache.submissions];
  }

  public getSubmissionsForHomework(homeworkId: string): HomeworkSubmission[] {
    const homework = this.cache.homeworks.find(h => h.id === homeworkId);
    const existing = this.cache.submissions.filter(s => s.homeworkId === homeworkId);
    
    if (homework) {
      let targetStudents: UserProfile[] = [];
      const allStudents = this.getStudents();
      if (homework.targetType === 'student' && homework.targetStudentIds && homework.targetStudentIds.length > 0) {
        targetStudents = allStudents.filter(st => homework.targetStudentIds?.includes(st.uid));
      } else if (isAllSchool(homework.targetClass) || (homework.targetClasses && homework.targetClasses.some(tc => isAllSchool(tc)))) {
        targetStudents = allStudents;
      } else if (homework.targetClasses && homework.targetClasses.length > 0) {
        const normTargets = homework.targetClasses.map(tc => normalizeClassName(tc));
        targetStudents = allStudents.filter(st => 
          st.classGrade && normTargets.includes(normalizeClassName(st.classGrade))
        );
      } else if (homework.targetClass) {
        const parts = homework.targetClass.split(',').map(c => normalizeClassName(c.trim()));
        targetStudents = allStudents.filter(st =>
          st.classGrade && parts.includes(normalizeClassName(st.classGrade))
        );
      } else {
        targetStudents = allStudents;
      }

      let cacheChanged = false;
      targetStudents.forEach(st => {
        if (!existing.some(s => s.studentId === st.uid)) {
          const freshSub: HomeworkSubmission = {
            id: `sub-${homeworkId}-${st.uid}`,
            homeworkId: homeworkId,
            studentId: st.uid,
            studentName: st.displayName,
            studentNumber: st.schoolNumber || '',
            studentClass: st.classGrade || homework.targetClass || '',
            status: 'pending',
            updatedAt: new Date().toISOString()
          };
          existing.push(freshSub);
          this.cache.submissions.push(freshSub);
          cacheChanged = true;
        }
      });
      if (cacheChanged) {
        this.saveCache(this.cache, false);
      }
    }

    return existing.sort((a, b) => (Number(a.studentNumber) || 0) - (Number(b.studentNumber) || 0));
  }

  public getSubmissionsForStudent(studentId: string): HomeworkSubmission[] {
    const student = this.getUserById(studentId);
    if (!student) return this.cache.submissions.filter(s => s.studentId === studentId);

    const applicableHomeworks = this.getHomeworksForStudent(student.classGrade, studentId);
    let cacheChanged = false;

    applicableHomeworks.forEach(hw => {
      const exists = this.cache.submissions.some(s => s.homeworkId === hw.id && s.studentId === studentId);
      if (!exists) {
        const freshSub: HomeworkSubmission = {
          id: `sub-${hw.id}-${studentId}`,
          homeworkId: hw.id,
          studentId: studentId,
          studentName: student.displayName,
          studentNumber: student.schoolNumber || '',
          studentClass: student.classGrade || hw.targetClass || '',
          status: 'pending',
          updatedAt: new Date().toISOString()
        };
        this.cache.submissions.push(freshSub);
        cacheChanged = true;
      }
    });

    if (cacheChanged) {
      this.saveCache(this.cache, false);
    }

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
    const subIndex = this.cache.submissions.findIndex(s => s.homeworkId === homeworkId && s.studentId === studentId);
    let updatedSubs = [...this.cache.submissions];
    const hw = this.cache.homeworks.find(h => h.id === homeworkId);
    const nowIso = new Date().toISOString();

    if (subIndex >= 0) {
      updatedSubs[subIndex] = {
        ...updatedSubs[subIndex],
        status: 'completed',
        submissionNote: note !== undefined ? note : updatedSubs[subIndex].submissionNote,
        attachments: attachments !== undefined ? attachments : updatedSubs[subIndex].attachments,
        submittedAt: updatedSubs[subIndex].submittedAt || nowIso,
        updatedAt: nowIso
      };
    } else {
      const student = this.getUserById(studentId);
      updatedSubs.push({
        id: `sub-${homeworkId}-${studentId}`,
        homeworkId,
        studentId,
        studentName: student?.displayName || 'Öğrenci',
        studentNumber: student?.schoolNumber || '',
        studentClass: student?.classGrade || hw?.targetClass || '',
        status: 'completed',
        submissionNote: note,
        attachments: attachments || [],
        submittedAt: nowIso,
        updatedAt: nowIso
      });
    }

    // Auto Gamification & Badge Trigger on Homework Completion
    const xpToAdd = hw?.xpReward || 50;
    await this.awardXpToStudent(studentId, xpToAdd, `${hw?.title || 'Ödev'} tamamlama ödülü`);

    const existingBadge = this.cache.studentBadges.find(sb => sb.studentId === studentId && sb.badgeId === 'badge-on-time');
    if (!existingBadge) {
      await this.awardBadgeToStudent(studentId, 'badge-on-time', 'Sistem', `${hw?.title || 'Ödev'} zamanında teslim edildi.`);
    }

    const studentCompletedCount = updatedSubs.filter(s => s.studentId === studentId && s.status === 'completed').length;
    if (studentCompletedCount >= 5) {
      const champBadge = this.cache.studentBadges.find(sb => sb.studentId === studentId && sb.badgeId === 'badge-homework-champion');
      if (!champBadge) {
        await this.awardBadgeToStudent(studentId, 'badge-homework-champion', 'Sistem', '5 ödevi başarıyla tamamlama başarısı');
      }
    }

    this.saveCache({ 
      ...this.cache, 
      submissions: updatedSubs
    });

    try {
      // Ensure attachments don't exceed Firestore 1MB limits
      const sanitizedAttachments = attachments ? attachments.map(a => ({
        id: a.id || `att-${Date.now()}`,
        name: a.name || 'Belge',
        size: a.size || 'Belirtilmedi',
        type: a.type || 'file',
        url: typeof a.url === 'string' && a.url.length > 500000 ? '#' : (a.url || '#'),
        uploadedAt: a.uploadedAt || nowIso
      })) : [];

      await setDoc(doc(db, 'homework_submissions', `sub-${homeworkId}-${studentId}`), sanitizeForFirestore({
        homeworkId,
        studentId,
        status: 'completed',
        submissionNote: note || null,
        attachments: sanitizedAttachments,
        submittedAt: nowIso,
        updatedAt: nowIso
      }), { merge: true });
    } catch (e: any) {
      console.warn('[DataService] Firestore ödev teslim hatası:', e);
      errorMonitoringService.captureLog({
        message: `Firestore ödev teslim yazma hatası: ${e?.message || e}`,
        category: 'database',
        severity: 'warn',
        source: 'dataService.submitHomework',
        metadata: { homeworkId, studentId }
      });
    }
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
    const targetNorm = normalizeClassName(className);
    return this.cache.grades.filter(g => {
      const matchClass = g.studentClass === className || normalizeClassName(g.studentClass) === targetNorm;
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
    if (!gradesList || gradesList.length === 0) return;

    let updatedGrades = [...this.cache.grades];
    const newNotifs: NotificationItem[] = [];

    for (const grade of gradesList) {
      const existingIndex = updatedGrades.findIndex(g => 
        g.studentId === grade.studentId && 
        g.subject === grade.subject && 
        g.examType === grade.examType
      );

      if (existingIndex >= 0) {
        updatedGrades[existingIndex] = grade;
      } else {
        updatedGrades = [grade, ...updatedGrades];
      }

      newNotifs.push({
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
      });
    }

    this.saveCache({
      ...this.cache,
      grades: updatedGrades,
      notifications: [...newNotifs, ...this.cache.notifications]
    });

    // Mirror to Firebase backup in background
    gradesList.forEach(g => {
      setDoc(doc(db, 'grades', g.id), sanitizeForFirestore(g)).catch(e => {
        console.log('Firebase backup save grade note:', e);
      });
    });
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

  public getAnnouncementsForStudent(studentClass?: string): Announcement[] {
    const all = this.getAnnouncements();
    const cleanNorm = normalizeClassName(studentClass);
    return all.filter(a => {
      // Teachers only announcements are never shown to students/parents
      if (a.targetAudience === 'teachers') return false;
      if (a.targetAudience === 'all' || a.targetAudience === 'students' || !a.targetAudience) return true;
      if (a.targetAudience === 'class') {
        if (isAllSchool(a.targetClass)) return true;
        if (a.targetClasses && a.targetClasses.some(c => isAllSchool(c))) return true;
        if (!cleanNorm) return false;
        if (a.targetClasses && a.targetClasses.some(c => isAllSchool(c) || normalizeClassName(c) === cleanNorm)) return true;
        if (a.targetClass) {
          const parts = a.targetClass.split(',').map(c => c.trim());
          if (parts.some(p => isAllSchool(p) || normalizeClassName(p) === cleanNorm)) return true;
        }
      }
      return false;
    });
  }

  public getAnnouncementsForParent(childrenClasses: string[]): Announcement[] {
    const all = this.getAnnouncements();
    const normalizedClasses = (childrenClasses || []).map(c => normalizeClassName(c)).filter(Boolean);
    return all.filter(a => {
      // Teachers only announcements are never shown to students/parents
      if (a.targetAudience === 'teachers') return false;
      if (a.targetAudience === 'all' || a.targetAudience === 'students' || !a.targetAudience) return true;
      if (a.targetAudience === 'class') {
        if (isAllSchool(a.targetClass)) return true;
        if (a.targetClasses && a.targetClasses.some(c => isAllSchool(c))) return true;
        if (normalizedClasses.length === 0) return false;
        if (a.targetClasses && a.targetClasses.some(c => isAllSchool(c) || normalizedClasses.includes(normalizeClassName(c)))) return true;
        if (a.targetClass) {
          const parts = a.targetClass.split(',').map(c => c.trim());
          if (parts.some(p => isAllSchool(p) || normalizedClasses.includes(normalizeClassName(p)))) return true;
        }
      }
      return false;
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
      await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcement)
      });
    } catch (e) {
      console.warn('[DataService] Server announcement add note:', e);
    }

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
      await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAnn)
      });
    } catch (e) {
      console.warn('[DataService] Server announcement update note:', e);
    }

    try {
      await setDoc(doc(db, 'announcements', id), sanitizeForFirestore(updatedAnn), { merge: true });
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
      await fetch(`/api/announcements/${id}/pin`, { method: 'POST' });
    } catch (e) {
      console.warn('[DataService] Server pin announcement note:', e);
    }

    try {
      await setDoc(doc(db, 'announcements', id), { pinned: newPinned }, { merge: true });
    } catch (e) {
      console.log('Firebase pin announcement error:', e);
    }
  }

  public async deleteAnnouncement(id: string): Promise<void> {
    const updated = this.cache.announcements.filter(a => a.id !== id);
    this.saveCache({ ...this.cache, announcements: updated });

    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[DataService] Server delete announcement note:', e);
    }

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
