import { ClassPeriodInfo, DayOfWeek, WeeklyScheduleSlot, ScheduleDutyInfo } from '../types';

export const CLASS_PERIODS: ClassPeriodInfo[] = [
  {
    period: 1,
    label: '1. Ders',
    startTime: '08:50',
    endTime: '09:30',
    breakDurationMin: 10,
    breakLabel: '10 dk Teneffüs'
  },
  {
    period: 2,
    label: '2. Ders',
    startTime: '09:40',
    endTime: '10:20',
    breakDurationMin: 10,
    breakLabel: '10 dk Teneffüs'
  },
  {
    period: 3,
    label: '3. Ders',
    startTime: '10:30',
    endTime: '11:10',
    breakDurationMin: 10,
    breakLabel: '10 dk Teneffüs'
  },
  {
    period: 4,
    label: '4. Ders',
    startTime: '11:20',
    endTime: '12:00',
    breakDurationMin: 10,
    breakLabel: '10 dk Teneffüs'
  },
  {
    period: 5,
    label: '5. Ders',
    startTime: '12:10',
    endTime: '12:50',
    breakDurationMin: 40,
    breakLabel: '40 dk Öğle Arası',
    isLunchAfter: true
  },
  {
    period: 6,
    label: '6. Ders',
    startTime: '13:30',
    endTime: '14:10',
    breakDurationMin: 10,
    breakLabel: '10 dk Teneffüs'
  },
  {
    period: 7,
    label: '7. Ders',
    startTime: '14:20',
    endTime: '15:00',
    breakDurationMin: 5,
    breakLabel: '5 dk Teneffüs'
  },
  {
    period: 8,
    label: '8. Ders',
    startTime: '15:05',
    endTime: '15:45',
    breakDurationMin: 0,
    breakLabel: 'Ders Çıkışı'
  }
];

export const DAYS_CONFIG: { key: DayOfWeek; label: string; shortLabel: string }[] = [
  { key: 'monday', label: 'Pazartesi', shortLabel: 'Pzt' },
  { key: 'tuesday', label: 'Salı', shortLabel: 'Sal' },
  { key: 'wednesday', label: 'Çarşamba', shortLabel: 'Çar' },
  { key: 'thursday', label: 'Perşembe', shortLabel: 'Per' },
  { key: 'friday', label: 'Cuma', shortLabel: 'Cum' }
];

export const SUBJECT_THEMES: Record<string, { bg: string; text: string; border: string; badge: string; dot: string }> = {
  'Matematik': {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-900 dark:text-blue-100',
    border: 'border-blue-200 dark:border-blue-800/60',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
    dot: 'bg-blue-500'
  },
  'Fizik': {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-900 dark:text-cyan-100',
    border: 'border-cyan-200 dark:border-cyan-800/60',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200',
    dot: 'bg-cyan-500'
  },
  'Kimya': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-900 dark:text-emerald-100',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    dot: 'bg-emerald-500'
  },
  'Biyoloji': {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-900 dark:text-teal-100',
    border: 'border-teal-200 dark:border-teal-800/60',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
    dot: 'bg-teal-500'
  },
  'Türk Dili ve Edebiyatı': {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-900 dark:text-amber-100',
    border: 'border-amber-200 dark:border-amber-800/60',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    dot: 'bg-amber-500'
  },
  'Tarih': {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-900 dark:text-rose-100',
    border: 'border-rose-200 dark:border-rose-800/60',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
    dot: 'bg-rose-500'
  },
  'Coğrafya': {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-900 dark:text-orange-100',
    border: 'border-orange-200 dark:border-orange-800/60',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
    dot: 'bg-orange-500'
  },
  'İngilizce': {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-900 dark:text-purple-100',
    border: 'border-purple-200 dark:border-purple-800/60',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
    dot: 'bg-purple-500'
  },
  'Almanca': {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-900 dark:text-indigo-100',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
    dot: 'bg-indigo-500'
  },
  'Beden Eğitimi': {
    bg: 'bg-lime-50 dark:bg-lime-950/40',
    text: 'text-lime-900 dark:text-lime-100',
    border: 'border-lime-200 dark:border-lime-800/60',
    badge: 'bg-lime-100 text-lime-800 dark:bg-lime-900/60 dark:text-lime-200',
    dot: 'bg-lime-500'
  },
  'Felsefe': {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-900 dark:text-violet-100',
    border: 'border-violet-200 dark:border-violet-800/60',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200',
    dot: 'bg-violet-500'
  },
  'Görsel Sanatlar': {
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    text: 'text-pink-900 dark:text-pink-100',
    border: 'border-pink-200 dark:border-pink-800/60',
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-200',
    dot: 'bg-pink-500'
  },
  'Müzik': {
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    text: 'text-fuchsia-900 dark:text-fuchsia-100',
    border: 'border-fuchsia-200 dark:border-fuchsia-800/60',
    badge: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/60 dark:text-fuchsia-200',
    dot: 'bg-fuchsia-500'
  },
  'Din Kültürü': {
    bg: 'bg-slate-100 dark:bg-slate-800/50',
    text: 'text-slate-900 dark:text-slate-100',
    border: 'border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    dot: 'bg-slate-500'
  },
  'Rehberlik': {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-900 dark:text-sky-100',
    border: 'border-sky-200 dark:border-sky-800/60',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
    dot: 'bg-sky-500'
  }
};

export const DEFAULT_DUTY_ROSTER: ScheduleDutyInfo[] = [];

// Clean initial state (schedules are added and managed dynamically via admin/teacher portals)
export function generateDefaultSchedule(): WeeklyScheduleSlot[] {
  return [];
}

// Live Time helper to detect current period
export interface CurrentClassStatus {
  isSchoolHours: boolean;
  isWeekend: boolean;
  currentDay: DayOfWeek | null;
  dayLabel: string;
  currentPeriod: ClassPeriodInfo | null;
  currentSlot: WeeklyScheduleSlot | null;
  nextPeriod: ClassPeriodInfo | null;
  nextSlot: WeeklyScheduleSlot | null;
  statusText: string;
  subStatusText: string;
  minutesRemainingInCurrent: number;
  progressPercent: number;
  isBreakNow: boolean;
}

export function getCurrentClassStatus(slots: WeeklyScheduleSlot[], targetClassName: string): CurrentClassStatus {
  const now = new Date();
  const jsDay = now.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const dayMap: Record<number, DayOfWeek> = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday'
  };

  const dayLabelMap: Record<DayOfWeek, string> = {
    monday: 'Pazartesi',
    tuesday: 'Salı',
    wednesday: 'Çarşamba',
    thursday: 'Perşembe',
    friday: 'Cuma'
  };

  if (jsDay === 0 || jsDay === 6) {
    return {
      isSchoolHours: false,
      isWeekend: true,
      currentDay: null,
      dayLabel: jsDay === 6 ? 'Cumartesi' : 'Pazar',
      currentPeriod: null,
      currentSlot: null,
      nextPeriod: null,
      nextSlot: null,
      statusText: 'Hafta Sonu Tatili',
      subStatusText: 'İyi dinlenmeler! Pazartesi günü dersler saat 08:50\'de başlıyor.',
      minutesRemainingInCurrent: 0,
      progressPercent: 0,
      isBreakNow: false
    };
  }

  const todayKey = dayMap[jsDay];
  const dayLabel = dayLabelMap[todayKey];
  const todaySlots = slots.filter(s => s.day === todayKey && s.className.toLowerCase() === targetClassName.toLowerCase());

  // School start: 08:50 (530 min), School end: 15:45 (945 min)
  const schoolStartMinutes = 8 * 60 + 50;
  const schoolEndMinutes = 15 * 60 + 45;

  if (currentMinutes < schoolStartMinutes) {
    const minUntilStart = schoolStartMinutes - currentMinutes;
    const firstPeriod = CLASS_PERIODS[0];
    const firstSlot = todaySlots.find(s => s.period === 1) || null;
    return {
      isSchoolHours: false,
      isWeekend: false,
      currentDay: todayKey,
      dayLabel,
      currentPeriod: null,
      currentSlot: null,
      nextPeriod: firstPeriod,
      nextSlot: firstSlot,
      statusText: 'Dersler Henüz Başlamadı',
      subStatusText: `1. Ders (${firstSlot ? firstSlot.subject : 'Başlangıç'}) ${minUntilStart} dakika sonra (08:50) başlayacak.`,
      minutesRemainingInCurrent: minUntilStart,
      progressPercent: 0,
      isBreakNow: false
    };
  }

  if (currentMinutes >= schoolEndMinutes) {
    return {
      isSchoolHours: false,
      isWeekend: false,
      currentDay: todayKey,
      dayLabel,
      currentPeriod: null,
      currentSlot: null,
      nextPeriod: null,
      nextSlot: null,
      statusText: 'Bugünkü Dersler Tamamlandı',
      subStatusText: 'Okul çıkış saati tamamlandı. Günlük tekrar ve ödevlerini gözden geçirebilirsin.',
      minutesRemainingInCurrent: 0,
      progressPercent: 100,
      isBreakNow: false
    };
  }

  // Check which period or break we are in
  for (let i = 0; i < CLASS_PERIODS.length; i++) {
    const p = CLASS_PERIODS[i];
    const [startH, startM] = p.startTime.split(':').map(Number);
    const [endH, endM] = p.endTime.split(':').map(Number);
    const pStartMin = startH * 60 + startM;
    const pEndMin = endH * 60 + endM;

    // Inside this active lesson period
    if (currentMinutes >= pStartMin && currentMinutes < pEndMin) {
      const slot = todaySlots.find(s => s.period === p.period) || null;
      const nextP = CLASS_PERIODS[i + 1] || null;
      const nextS = nextP ? todaySlots.find(s => s.period === nextP.period) || null : null;
      const remainingMin = pEndMin - currentMinutes;
      const totalPeriodDuration = pEndMin - pStartMin;
      const elapsed = currentMinutes - pStartMin;
      const progress = Math.round((elapsed / totalPeriodDuration) * 100);

      return {
        isSchoolHours: true,
        isWeekend: false,
        currentDay: todayKey,
        dayLabel,
        currentPeriod: p,
        currentSlot: slot,
        nextPeriod: nextP,
        nextSlot: nextS,
        statusText: `Şu Anda ${p.label} Devam Ediyor`,
        subStatusText: slot ? `${slot.subject} (${slot.classroom} • ${slot.teacherName}) • Bitime ${remainingMin} dk kaldı.` : `${p.label} devam ediyor • ${remainingMin} dk kaldı.`,
        minutesRemainingInCurrent: remainingMin,
        progressPercent: progress,
        isBreakNow: false
      };
    }

    // Inside break after this period
    if (i < CLASS_PERIODS.length - 1) {
      const nextP = CLASS_PERIODS[i + 1];
      const [nextH, nextM] = nextP.startTime.split(':').map(Number);
      const nextPStartMin = nextH * 60 + nextM;

      if (currentMinutes >= pEndMin && currentMinutes < nextPStartMin) {
        const nextS = todaySlots.find(s => s.period === nextP.period) || null;
        const breakRemaining = nextPStartMin - currentMinutes;
        const breakTotal = nextPStartMin - pEndMin;
        const breakElapsed = currentMinutes - pEndMin;
        const progress = Math.round((breakElapsed / breakTotal) * 100);
        const isLunch = p.isLunchAfter;

        return {
          isSchoolHours: true,
          isWeekend: false,
          currentDay: todayKey,
          dayLabel,
          currentPeriod: null,
          currentSlot: null,
          nextPeriod: nextP,
          nextSlot: nextS,
          statusText: isLunch ? 'Öğle Arası Teneffüsü' : `${p.period}. Ders Sonrası Teneffüs`,
          subStatusText: nextS ? `Sıradaki: ${nextP.label} (${nextS.subject}) • ${breakRemaining} dakika sonra başlayacak.` : `${nextP.label} ${breakRemaining} dk sonra başlıyor.`,
          minutesRemainingInCurrent: breakRemaining,
          progressPercent: progress,
          isBreakNow: true
        };
      }
    }
  }

  return {
    isSchoolHours: true,
    isWeekend: false,
    currentDay: todayKey,
    dayLabel,
    currentPeriod: null,
    currentSlot: null,
    nextPeriod: null,
    nextSlot: null,
    statusText: 'Ders Programı',
    subStatusText: 'Haftalık program aktif.',
    minutesRemainingInCurrent: 0,
    progressPercent: 50,
    isBreakNow: false
  };
}
