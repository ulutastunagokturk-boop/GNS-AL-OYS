export type PasswordStyle = 'school' | 'memorable' | 'strong' | 'pin';

const MEMORABLE_WORDS = [
  'Atlas', 'Pusula', 'Yildiz', 'Ufuk', 'Kaya', 
  'Demir', 'Cinar', 'Baris', 'Ates', 'Mavi', 
  'Gunes', 'Kartal', 'Sahin', 'Kivilcim', 'Deniz',
  'Zafer', 'Bilge', 'Kuzey', 'Ege', 'Doruk'
];

const UNAMBIGUOUS_LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const UNAMBIGUOUS_NUMBERS = '23456789';
const SYMBOLS = ['!', '*', '#', '$', '%', '&'];

/**
 * Generates a unique, high-quality password for students or users.
 */
export function generateUniqueStudentPassword(options?: {
  style?: PasswordStyle;
  schoolNumber?: string;
  customPrefix?: string;
}): string {
  const style = options?.style || 'school';

  switch (style) {
    case 'school': {
      // Format: Gns-[4 digits]#[1-2 letters] e.g. Gns-7392#k or Gns26-8491!
      const prefix = options?.customPrefix?.trim() || 'Gns';
      const randDigits = Math.floor(1000 + Math.random() * 9000).toString();
      const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const randChar = UNAMBIGUOUS_LETTERS[Math.floor(Math.random() * UNAMBIGUOUS_LETTERS.length)];
      return `${prefix}-${randDigits}${symbol}${randChar}`;
    }

    case 'memorable': {
      // Format: Word-[3-4 digits]! e.g. Atlas-482! or Pusula-729#
      const word = MEMORABLE_WORDS[Math.floor(Math.random() * MEMORABLE_WORDS.length)];
      const randDigits = Math.floor(100 + Math.random() * 900).toString();
      const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      return `${word}-${randDigits}${symbol}`;
    }

    case 'pin': {
      // Format: 6-digit numeric PIN e.g. 748291
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      return pin;
    }

    case 'strong':
    default: {
      // Format: 10 chars strong mixed without ambiguous characters
      let result = '';
      const allChars = UNAMBIGUOUS_LETTERS + UNAMBIGUOUS_NUMBERS;
      for (let i = 0; i < 8; i++) {
        result += allChars[Math.floor(Math.random() * allChars.length)];
      }
      const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const extraNum = UNAMBIGUOUS_NUMBERS[Math.floor(Math.random() * UNAMBIGUOUS_NUMBERS.length)];
      return `${result}${symbol}${extraNum}`;
    }
  }
}

/**
 * Generates an array of unique passwords of the given count.
 */
export function generatePasswordBatch(count: number, style: PasswordStyle = 'school'): string[] {
  const set = new Set<string>();
  let attempts = 0;
  while (set.size < count && attempts < count * 10) {
    attempts++;
    set.add(generateUniqueStudentPassword({ style }));
  }
  return Array.from(set);
}

/**
 * Evaluates password strength and returns a score, color, and label.
 */
export function calculatePasswordStrength(password: string): {
  score: number; // 0 to 4
  label: string;
  color: string;
  bgClass: string;
} {
  if (!password || password.length === 0) {
    return { score: 0, label: 'Girilmedi', color: 'text-slate-400', bgClass: 'bg-slate-200' };
  }

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[a-zA-Z]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) score++;

  if (score <= 2) {
    return { score: 1, label: 'Zayıf', color: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-500' };
  } else if (score === 3 || score === 4) {
    return { score: 2, label: 'Orta', color: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-500' };
  } else {
    return { score: 3, label: 'Güçlü & Güvenli', color: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-500' };
  }
}
