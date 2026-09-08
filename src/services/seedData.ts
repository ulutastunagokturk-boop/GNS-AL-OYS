import { 
  UserProfile, 
  Announcement, 
  Homework, 
  HomeworkSubmission, 
  GradeRecord, 
  AttendanceRecord,
  SchoolClass,
  Badge,
  StudentBadge,
  Conversation,
  ChatMessage
} from '../types';

export const INITIAL_CLASSES: SchoolClass[] = [];

export const INITIAL_TEACHERS: UserProfile[] = [];

export const INITIAL_ADMIN: UserProfile = {
  uid: 'admin-tlogix',
  email: 'tlogixtr@gmail.com',
  displayName: 'Tlogix Okul Yönetimi',
  role: 'admin',
  phone: '0555 999 0000',
  status: 'active',
  isOnline: true,
  createdAt: new Date().toISOString()
};

// ================= PREDEFINED BADGES =================
export const PREDEFINED_BADGES: Badge[] = [
  {
    id: 'badge-on-time',
    name: 'Zamanında Teslim',
    description: 'Verilen bir ödevi son teslim tarihinden önce eksiksiz tamamladı.',
    icon: 'ClockCheck',
    points: 50,
    category: 'homework',
    rarity: 'common'
  },
  {
    id: 'badge-high-achiever',
    name: 'Yıldız Öğrenci',
    description: 'Bir sınav veya denemeden 90 ve üzeri üstün başarı puanı aldı.',
    icon: 'Award',
    points: 100,
    category: 'grade',
    rarity: 'rare'
  },
  {
    id: 'badge-perfect-attendance',
    name: 'Tam Devamlılık',
    description: 'Dönem boyunca 0 devamsızlık ile derslere düzenli katılım gösterdi.',
    icon: 'ShieldCheck',
    points: 75,
    category: 'attendance',
    rarity: 'rare'
  },
  {
    id: 'badge-homework-champion',
    name: 'Ödev Şampiyonu',
    description: 'Üst üste 5 veya daha fazla ödevi başarıyla teslim etti.',
    icon: 'Flame',
    points: 120,
    category: 'homework',
    rarity: 'epic'
  },
  {
    id: 'badge-math-whiz',
    name: 'Matematik Dehası',
    description: 'Matematik ödevlerinde ve sorularında yüksek analitik başarı gösterdi.',
    icon: 'Brain',
    points: 150,
    category: 'special',
    rarity: 'epic'
  },
  {
    id: 'badge-project-master',
    name: 'Proje Mimarı',
    description: 'Laboratuvar veya dönem projesini özgün ve detaylı hazırladı.',
    icon: 'Sparkles',
    points: 130,
    category: 'special',
    rarity: 'rare'
  },
  {
    id: 'badge-class-leader',
    name: 'Sınıf Lideri',
    description: 'Sınıf genel başarı sıralamasında ilk 3 dereceye girdi.',
    icon: 'Crown',
    points: 200,
    category: 'social',
    rarity: 'legendary'
  },
  {
    id: 'badge-active-participant',
    name: 'Ders İçi Katılım',
    description: 'Öğretmen tarafından ders içi soru çözümü ve tartışmalarda aktif bulundu.',
    icon: 'ThumbsUp',
    points: 60,
    category: 'social',
    rarity: 'common'
  }
];

export function generateStudentCohort(): UserProfile[] {
  return [];
}

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

export const INITIAL_HOMEWORKS: Homework[] = [];

export const INITIAL_CONVERSATIONS: Conversation[] = [];

export const INITIAL_MESSAGES: ChatMessage[] = [];
