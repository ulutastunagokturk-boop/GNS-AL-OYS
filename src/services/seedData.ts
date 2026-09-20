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

export const INITIAL_CLASSES: SchoolClass[] = [
  { id: 'class-9-d', name: '9-D', gradeLevel: 9, branch: 'D', section: 'D', academicYear: '2026-2027', studentCount: 22 },
  { id: 'class-9-a', name: '9-A', gradeLevel: 9, branch: 'A', section: 'A', academicYear: '2026-2027', studentCount: 24 },
  { id: 'class-9-b', name: '9-B', gradeLevel: 9, branch: 'B', section: 'B', academicYear: '2026-2027', studentCount: 24 },
  { id: 'class-10-a', name: '10-A', gradeLevel: 10, branch: 'A', section: 'A', academicYear: '2026-2027', studentCount: 25 },
  { id: 'class-10-b', name: '10-B', gradeLevel: 10, branch: 'B', section: 'B', academicYear: '2026-2027', studentCount: 25 },
  { id: 'class-11-a', name: '11-A', gradeLevel: 11, branch: 'A', section: 'A', academicYear: '2026-2027', studentCount: 23 },
  { id: 'class-11-b', name: '11-B', gradeLevel: 11, branch: 'B', section: 'B', academicYear: '2026-2027', studentCount: 23 },
  { id: 'class-12-a', name: '12-A', gradeLevel: 12, branch: 'A', section: 'A', academicYear: '2026-2027', studentCount: 26 },
  { id: 'class-12-b', name: '12-B', gradeLevel: 12, branch: 'B', section: 'B', academicYear: '2026-2027', studentCount: 26 }
];

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

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-exam-schedule',
    title: '2026-2027 Eğitim Öğretim Yılı 1. Dönem Ortak Sınav Takvimi',
    content: `# 1. Dönem Ortak Sınav Takvimi ve Uygulama Esasları\n\nDeğerli öğretmenlerimiz, sevgili öğrencilerimiz ve saygıdeğer velilerimiz,\n\n1. Dönem ortak yazılı sınavlarımız MEB takvimi ve zümre başkanları kurulu kararı doğrultusunda belirtilen tarihlerde dersliklerde uygulanacaktır. Tüm öğrencilerimize başarılar dileriz.\n\n- Sınav saatinden en az 10 dakika önce belirlenen sınav salonunda hazır bulunulmalıdır.\n- Optik formlar ve cevap kağıtları için kurşun kalem ve silgi bulundurulmalıdır.\n- Sınav süresince cep telefonu vb. dijital cihazlar öğretmen masasında kapalı tutulmalıdır.`,
    authorId: 'admin-tlogix',
    authorName: 'Okul Yönetimi',
    authorRole: 'admin',
    targetAudience: 'all',
    priority: 'important',
    pinned: true,
    tags: ['Sınav', 'Duyuru', '1. Dönem'],
    createdAt: '2026-09-18T08:00:00.000Z'
  },
  {
    id: 'ann-project-fair',
    title: 'TÜBİTAK 4006 Bilim Fuarı ve Robotik Kulübü Proje Başvuruları',
    content: `# TÜBİTAK 4006 Bilim Fuarı Başvuruları Başladı!\n\nOkulumuz Bilim ve Teknoloji Kulübü bünyesinde yürütülecek TÜBİTAK 4006 Bilim Fuarı projeleri için öğrenci ve proje grubu başvuruları açılmıştır. Katılmak isteyen öğrencilerimiz danışman öğretmenleri ile iletişime geçebilir.`,
    authorId: 'admin-tlogix',
    authorName: 'Bilişim & Fen Zümresi',
    authorRole: 'teacher',
    targetAudience: 'students',
    priority: 'normal',
    pinned: false,
    tags: ['TÜBİTAK', 'Bilim', 'Proje'],
    createdAt: '2026-09-19T09:30:00.000Z'
  },
  {
    id: 'ann-9d-orientation',
    title: '9-D Sınıfı Akademik Değerlendirme ve Ders Materyalleri Bilgilendirmesi',
    content: `# 9-D Şubesi Sayın Öğrenci ve Velilerimiz,\n\nDers içi başarı değerlendirmeleri, haftalık ödev takipleri ve sınav hazırlık fasikülleri sisteme yüklenmiştir. Öğrencilerimizin ödevler ve sınavlar sekmesini düzenli kontrol etmeleri önemle rica olunur.`,
    authorId: 'admin-tlogix',
    authorName: '9-D Sınıf Rehber Öğretmeni',
    authorRole: 'teacher',
    targetAudience: 'class',
    targetClass: '9-D',
    targetClasses: ['9-D', '9/D'],
    priority: 'important',
    pinned: true,
    tags: ['9-D', 'Rehberlik', 'Dersler'],
    createdAt: '2026-09-20T10:00:00.000Z'
  }
];

export const INITIAL_HOMEWORKS: Homework[] = [
  {
    id: 'hw-math-equations',
    title: '1. Dereceden Denklem ve Eşitsizlikler Çalışma Fasikülü',
    subject: 'Matematik',
    description: '1. Dereceden bir ve iki bilinmeyenli denklemler ve eşitsizlikler ünitesindeki beceri temelli alıştırma soruları çözülüp sisteme yüklenecektir.',
    teacherId: 'admin-tlogix',
    teacherName: 'Matematik Zümresi',
    targetType: 'class',
    targetClass: '9-D',
    targetClasses: ['9-D', '9/D'],
    dueDate: '2026-09-26',
    dueTime: '23:59',
    maxScore: 100,
    xpReward: 50,
    createdAt: '2026-09-20T08:00:00.000Z'
  },
  {
    id: 'hw-literature-story',
    title: 'Dede Korkut Hikayeleri Tahlili ve Metin İnceleme Raporu',
    subject: 'Türk Dili ve Edebiyatı',
    description: 'Dede Korkut destanlarından seçilen bir hikayenin olay örgüsü, motifleri ve dil özellikleri incelenerek 1-2 sayfalık tahlil raporu hazırlanacaktır.',
    teacherId: 'admin-tlogix',
    teacherName: 'Edebiyat Zümresi',
    targetType: 'class',
    targetClass: 'Tüm Okul',
    dueDate: '2026-09-28',
    dueTime: '23:59',
    maxScore: 100,
    xpReward: 60,
    createdAt: '2026-09-19T10:00:00.000Z'
  },
  {
    id: 'hw-physics-force',
    title: 'Hareket ve Kuvvet Konu Sonu Değerlendirme Testi',
    subject: 'Fizik',
    description: 'Hız-zaman grafikleri ve doğrusal hareket formüllerini kapsayan değerlendirme soruları çözülmelidir.',
    teacherId: 'admin-tlogix',
    teacherName: 'Fizik Zümresi',
    targetType: 'class',
    targetClass: '9-D',
    targetClasses: ['9-D', '9/D'],
    dueDate: '2026-09-27',
    dueTime: '23:59',
    maxScore: 100,
    xpReward: 50,
    createdAt: '2026-09-20T09:00:00.000Z'
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [];

export const INITIAL_MESSAGES: ChatMessage[] = [];
