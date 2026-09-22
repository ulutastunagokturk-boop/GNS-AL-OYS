export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';
export type UserStatus = 'active' | 'deactivated';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  schoolNumber?: string; // Zorunlu for students (Okul No)
  password?: string;     // Öğrenci & kullanıcı portal giriş şifresi
  classGrade?: string;   // e.g. "9-A", "10-B", "11-A", "12-B" (Öğrenciler için)
  branch?: string;       // e.g. "Matematik", "Fizik", "Türk Dili ve Edebiyatı" (Öğretmenler için)
  phone?: string;
  avatar?: string;
  status?: UserStatus;   // 'active' | 'deactivated'
  isOnline?: boolean;
  lastSeen?: string;
  totalXp?: number;      // Öğrenci Başarı Puanı
  level?: number;        // Öğrenci Seviyesi (1-10)
  currentStreak?: number;// Günlük giriş serisi
  studentIds?: string[]; // Velinin sorumlu olduğu öğrenci UID'leri (Sadece veliler için)
  studentNumbers?: string[]; // Velinin sorumlu olduğu öğrenci okul numaraları
  relationship?: string; // Anne, Baba, Vasi vb.
  parentId?: string;     // Öğrencinin veli kullanıcı ID'si
  parentName?: string;   // Veli Adı Soyadı
  parentPhone?: string;  // Veli Telefon Numarası
  createdAt: string;
  updatedAt?: string;
}

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';
export type TargetAudience = 'all' | 'students' | 'teachers' | 'class';

export interface AnnouncementViewer {
  studentId: string;
  studentName: string;
  schoolNumber?: string;
  classGrade?: string;
  viewedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: UserRole;
  authorId: string;
  targetAudience: TargetAudience;
  targetClass?: string;
  targetClasses?: string[];
  priority: AnnouncementPriority;
  tags?: string[];
  pinned?: boolean;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt?: string;
  viewsCount?: number;
  viewedByStudents?: AnnouncementViewer[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size?: string;
  type?: 'pdf' | 'doc' | 'image' | 'archive' | 'link';
  uploadedAt?: string;
}

export interface RubricItem {
  id: string;
  criterion?: string;
  title: string;
  maxPoints: number;
  description?: string;
}

export interface Homework {
  id: string;
  title: string;
  subject: string;
  description: string;
  teacherId: string;
  teacherName: string;
  targetType?: 'class' | 'student'; // Sınıf bazlı veya öğrenciye özel
  targetClass: string; // e.g. "10-A" or "Tüm Okul" (veya seçilen sınıflar)
  targetClasses?: string[]; // Çoklu şube seçimi: ['10-A', '10-B']
  targetStudentIds?: string[]; // Öğrenci seçerek ödev atama
  dueDate: string;     // YYYY-MM-DD
  dueTime?: string;    // HH:mm (e.g. "23:59")
  maxScore: number;
  attachments?: Attachment[];
  rubric?: RubricItem[];
  xpReward?: number;   // XP puan ödülü (varsayılan: 50)
  badgeRewardId?: string; // Tamamlandığında verilecek rozet
  createdAt: string;
}

export type HomeworkStatus = 'completed' | 'not_completed' | 'excused' | 'pending';

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  studentClass: string;
  status: HomeworkStatus; // Yapıldı, Yapılmadı, Raporlu, Bekliyor
  submissionNote?: string;
  submittedAt?: string;
  score?: number;
  rubricScores?: Record<string, number>; // criterionId -> point
  teacherFeedback?: string;
  attachments?: Attachment[];
  updatedAt: string;
}

export type ExamType = 'Yazılı 1' | 'Yazılı 2' | 'Sözlü' | 'Deneme Sınavı' | 'Proje Ödevi' | 'Performans';

export interface GradeRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  studentClass: string;
  subject: string;
  examType: ExamType;
  score: number;
  maxScore: number;
  examDate: string; // YYYY-MM-DD
  teacherId: string;
  teacherName: string;
  notes?: string;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late'; // Geldi, Gelmedi, Raporlu/İzinli, Geç

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  studentNumber: string;
  studentClass: string;
  status: AttendanceStatus;
  period: string; // 'Tam Gün' | '1. Ders' vb.
  notes?: string;
  teacherId: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // 'all' | target uid | class
  title: string;
  message: string;
  type: 'homework' | 'grade' | 'attendance' | 'announcement' | 'badge' | 'chat' | 'system';
  read: boolean;
  createdAt: string;
  linkTab?: string;
  actorName?: string;
  actorRole?: UserRole;
}

export interface SchoolClass {
  id: string;
  name: string;
  gradeLevel: number;
  branch: string;
  section?: string;
  academicYear?: string;
  studentCount?: number;
  advisorTeacher?: string;
  capacity?: number;
}

// ================= ACHIEVEMENT & BADGE SYSTEM =================
export type BadgeCategory = 'homework' | 'grade' | 'attendance' | 'special' | 'social';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // icon name or emoji identifier
  points: number; // XP
  category: BadgeCategory;
  rarity: BadgeRarity;
}

export interface StudentBadge {
  id: string;
  studentId: string;
  studentName: string;
  studentClass?: string;
  badgeId: string;
  badge: Badge;
  awardedAt: string;
  awardedBy: string; // 'Sistem' | Teacher Name
  reason?: string;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  studentNumber: string;
  studentClass: string;
  totalXp: number;
  level: number;
  badgeCount: number;
  completedHomeworkCount: number;
}

// ================= REAL-TIME CHAT SYSTEM =================
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar?: string;
  text: string;
  attachment?: Attachment;
  createdAt: string;
  readBy?: string[];
}

export interface ConversationParticipant {
  uid: string;
  displayName: string;
  role: UserRole;
  schoolNumber?: string;
  classGrade?: string;
  branch?: string;
  isOnline?: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string; // For group chats e.g. "10-A Sınıf Kanalı"
  description?: string;
  participants: string[]; // List of UIDs
  participantDetails?: ConversationParticipant[];
  targetClass?: string;
  lastMessage?: {
    text: string;
    senderName: string;
    createdAt: string;
  };
  unreadCount?: number;
  updatedAt: string;
}

// ================= AUDIT LOGS & SYSTEM STATS =================
export interface RoleAssignment {
  id: string;
  userEmail: string;
  userName: string;
  assignedRole: UserRole;
  classGrade?: string;
  branch?: string;
  schoolNumber?: string;
  studentNumbers?: string[]; // Veli rolü için ilişkilendirilen öğrenci numaraları
  assignedBy: string;
  assignedAt: string;
  status: 'active' | 'pending' | 'revoked';
  notes?: string;
  permissions?: string[];
}

export interface ExcelStudentRow {
  name: string;
  schoolNumber: string;
  classGrade: string;
  password?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentPassword?: string;
  notes?: string;
  validationError?: string;
}

export interface ExcelImportSummary {
  totalRows: number;
  importedStudents: number;
  createdParents: number;
  skippedOrErrors: number;
  errors: { row: number; reason: string }[];
}

export interface ExcelParentRow {
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  parentPassword?: string;
  studentNumbers?: string; // Single or comma-separated: e.g. "1042" or "1042, 1045"
  studentName?: string;
  relationship?: string; // 'Anne' | 'Baba' | 'Vasi'
  notes?: string;
  validationError?: string;
  matchedStudentDetails?: {
    uid: string;
    displayName: string;
    schoolNumber: string;
    classGrade?: string;
  }[];
}

export interface ExcelParentImportSummary {
  totalRows: number;
  createdParents: number;
  updatedParents: number;
  linkedStudentsCount: number;
  skippedOrErrors: number;
  errors: { row: number; reason: string }[];
}

export interface SystemAuditLog {
  id: string;
  action: string;
  actorName: string;
  actorRole: UserRole;
  target?: string;
  details?: string;
  timestamp: string;
}

// ================= WEEKLY SCHEDULE & TIMETABLE =================
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface ClassPeriodInfo {
  period: number; // 1 to 8
  label: string; // '1. Ders'
  startTime: string; // '08:50'
  endTime: string; // '09:30'
  breakDurationMin: number; // 10 or 40
  breakLabel: string; // '10 dk Teneffüs' or '40 dk Öğle Arası'
  isLunchAfter?: boolean;
}

export interface WeeklyScheduleSlot {
  id: string;
  className: string; // e.g. '10-A', '9-A', '11-B', '12-A'
  day: DayOfWeek; // 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
  period: number; // 1 to 8
  startTime: string;
  endTime: string;
  subject: string; // 'Matematik', 'Fizik', etc.
  teacherId?: string;
  teacherName: string;
  classroom: string; // 'Derslik 101', 'Fizik Lab', etc.
  color?: string; // hex or tailwind identifier
  notes?: string;
  zoomLink?: string;
  topic?: string; // e.g. 'Trigonometri - İkinci Dereceden Denklemler'
  updatedAt?: string;
}

export interface ScheduleDutyInfo {
  day: DayOfWeek;
  teacherName: string;
  location: string; // '1. Kat Koridoru', 'Bahçe & Teneffüs Alanı', 'Kantin Katı'
  shift: string; // 'Tam Gün (08:15 - 15:50)'
}

// ================= SUPABASE CLOUD BACKUP =================
export interface SupabaseBackupStats {
  totalUsers: number;
  totalClasses: number;
  totalSchedules: number;
  totalHomeworks: number;
  totalAnnouncements: number;
  totalGrades: number;
  totalAttendance: number;
}

export interface SupabaseBackupRecord {
  id: string;
  backup_type: 'auto' | 'manual' | 'daily';
  stats: SupabaseBackupStats;
  created_at: string;
  payload?: any;
}

export interface SupabaseTableCounts {
  profiles: number;
  classes: number;
  assignments: number;
  submissions: number;
  grades: number;
  attendance: number;
  announcements: number;
  students?: number;
  parents?: number;
  parentRelations?: number;
}

export interface SupabaseBackupStatus {
  configured: boolean;
  url?: string;
  maskedUrl?: string;
  hasServiceRoleKey?: boolean;
  hasAnonKey?: boolean;
  lastBackupAt?: string | null;
  lastBackupType?: 'auto' | 'manual';
  totalBackupsCount?: number;
  lastError?: string | null;
  status: 'connected' | 'not_configured' | 'error' | 'pending';
  tableName: string;
  setupSql: string;
  tableCounts?: SupabaseTableCounts;
}

export interface SupabaseSyncResponse {
  success: boolean;
  backupId?: string;
  timestamp: string;
  stats?: SupabaseBackupStats;
  tableCounts?: SupabaseTableCounts;
  message: string;
  configured: boolean;
  error?: string;
}

// ================= SYSTEM ERROR MONITORING =================
export type ErrorSeverity = 'error' | 'warn' | 'info';
export type ErrorCategory = 'homework' | 'database' | 'network' | 'auth' | 'runtime' | 'system';

export interface SystemErrorLog {
  id: string;
  timestamp: string; // ISO string
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  source?: string;
  stack?: string;
  userId?: string;
  userRole?: string;
  path?: string;
  resolved?: boolean;
  metadata?: Record<string, any>;
}


