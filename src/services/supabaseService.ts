import { LocalCacheStore } from './dataService';
import { 
  SupabaseBackupStatus, 
  SupabaseSyncResponse, 
  SupabaseBackupRecord, 
  SupabaseBackupStats 
} from '../types';

const BACKUP_STATUS_KEY = 'gnsial_supabase_backup_status';
const DEFAULT_TABLE_NAME = 'school_backups';

const SETUP_SQL = `-- ==============================================================================
-- GNSİAL OYS: VERİTABANI İLİŞKİLERİ VE ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- Bu SQL kodunu Supabase Dashboard > SQL Editor sekmesinde çalıştırabilirsiniz.
-- ==============================================================================

-- 1. YEDEKLEME TABLOSU
CREATE TABLE IF NOT EXISTS public.school_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    backup_type TEXT NOT NULL DEFAULT 'auto',
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 2. VELİLER TABLOSU (parents)
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    relationship TEXT DEFAULT 'Veli',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ÖĞRENCİLER TABLOSU (students)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    full_name TEXT NOT NULL,
    school_number TEXT UNIQUE,
    class_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. VELİ - ÖĞRENCİ İLİŞKİ TABLOSU (parent_student_relations)
CREATE TABLE IF NOT EXISTS public.parent_student_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    relationship TEXT DEFAULT 'Veli',
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(parent_id, student_id)
);

-- 5. NOTLAR TABLOSU (grades)
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID,
    grade_type_id TEXT,
    subject TEXT NOT NULL,
    score NUMERIC NOT NULL,
    max_score NUMERIC DEFAULT 100,
    comments TEXT,
    recorded_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. DEVAMSIZLIK & YOKLAMA TABLOSU (attendance_records)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID,
    class_id UUID,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'late')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. ÖDEVLER TABLOSU (assignments)
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    class_id UUID,
    target_class TEXT,
    target_classes TEXT[],
    target_type TEXT DEFAULT 'class',
    target_student_ids UUID[],
    teacher_id UUID,
    due_date TIMESTAMPTZ,
    due_time TEXT DEFAULT '23:59',
    max_score NUMERIC DEFAULT 100,
    xp_reward NUMERIC DEFAULT 50,
    attachments JSONB DEFAULT '[]'::jsonb,
    rubric JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. ÖDEV TESLİMLERİ VE DURUM TABLOSU (assignment_submissions)
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'not_completed', 'excused')),
    score NUMERIC,
    feedback TEXT,
    submitted_at TIMESTAMPTZ,
    student_note TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    rubric_scores JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(assignment_id, student_id)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) AKTİFLEŞTİRME
-- ==============================================================================
ALTER TABLE public.school_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. VELİLER (parents) RLS POLİTİKALARI
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view their own profile" ON public.parents;
CREATE POLICY "Parents can view their own profile"
    ON public.parents FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = id);

-- ------------------------------------------------------------------------------
-- B. VELİ-ÖĞRENCİ İLİŞKİLERİ (parent_student_relations) RLS POLİTİKALARI
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own children relations" ON public.parent_student_relations;
CREATE POLICY "Parents can view own children relations"
    ON public.parent_student_relations FOR SELECT
    TO authenticated
    USING (
        parent_id IN (
            SELECT p.id FROM public.parents p WHERE p.user_id = auth.uid() OR p.id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- C. ÖĞRENCİLER (students) RLS POLİTİKALARI
-- Veli sadece kendi ilişkili çocuğunun öğrenci bilgilerini görebilir.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own linked children" ON public.students;
CREATE POLICY "Parents can view own linked children"
    ON public.students FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT psr.student_id 
            FROM public.parent_student_relations psr
            JOIN public.parents p ON p.id = psr.parent_id
            WHERE p.user_id = auth.uid() OR p.id = auth.uid()
        )
        OR user_id = auth.uid() -- Öğrenci kendi kartını görebilir
    );

-- ------------------------------------------------------------------------------
-- D. NOTLAR (grades) RLS POLİTİKALARI
-- Veli SADECE kendi çocuğunun sınav/proje notlarını görebilir!
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can ONLY view grades of their own children" ON public.grades;
CREATE POLICY "Parents can ONLY view grades of their own children"
    ON public.grades FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT psr.student_id 
            FROM public.parent_student_relations psr
            JOIN public.parents p ON p.id = psr.parent_id
            WHERE p.user_id = auth.uid() OR p.id = auth.uid()
        )
        OR student_id = auth.uid() -- Öğrenci kendi notunu görebilir
    );

-- ------------------------------------------------------------------------------
-- E. DEVAMSIZLIK & YOKLAMA (attendance_records) RLS POLİTİKALARI
-- Veli SADECE kendi çocuğunun devamsızlık ve izin kayıtlarını görebilir!
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can ONLY view attendance of their own children" ON public.attendance_records;
CREATE POLICY "Parents can ONLY view attendance of their own children"
    ON public.attendance_records FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT psr.student_id 
            FROM public.parent_student_relations psr
            JOIN public.parents p ON p.id = psr.parent_id
            WHERE p.user_id = auth.uid() OR p.id = auth.uid()
        )
        OR student_id = auth.uid() -- Öğrenci kendi devamsızlığını görebilir
    );

-- ------------------------------------------------------------------------------
-- F. YÖNETİCİ & ÖĞRETMEN TAM YETKİ POLİTİKALARI
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Teachers and Admins full access grades" ON public.grades;
CREATE POLICY "Teachers and Admins full access grades"
    ON public.grades FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id = auth.uid() OR email = auth.email()) 
            AND role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Teachers and Admins full access attendance" ON public.attendance_records;
CREATE POLICY "Teachers and Admins full access attendance"
    ON public.attendance_records FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id = auth.uid() OR email = auth.email()) 
            AND role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Allow school backup operations" ON public.school_backups;
CREATE POLICY "Allow school backup operations" ON public.school_backups
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- G. ÖDEVLER (assignments) VE TESLİMLER (assignment_submissions) RLS POLİTİKALARI
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Assignments viewable by authenticated users" ON public.assignments;
CREATE POLICY "Assignments viewable by authenticated users"
    ON public.assignments FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Staff manage assignments" ON public.assignments;
CREATE POLICY "Staff manage assignments"
    ON public.assignments FOR ALL
    TO authenticated
    USING (
        teacher_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id = auth.uid() OR email = auth.email()) 
            AND role IN ('teacher', 'admin')
        )
    )
    WITH CHECK (
        teacher_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (id = auth.uid() OR email = auth.email()) 
            AND role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Submissions viewable by student, parent and teacher" ON public.assignment_submissions;
CREATE POLICY "Submissions viewable by student, parent and teacher"
    ON public.assignment_submissions FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid() OR
        student_id IN (
            SELECT psr.student_id FROM public.parent_student_relations psr
            JOIN public.parents p ON p.id = psr.parent_id
            WHERE p.user_id = auth.uid() OR p.id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.id = assignment_id AND (
                a.teacher_id = auth.uid() OR 
                EXISTS (SELECT 1 FROM public.profiles WHERE (id = auth.uid() OR email = auth.email()) AND role IN ('teacher', 'admin'))
            )
        )
    );

DROP POLICY IF EXISTS "Students can submit assignments" ON public.assignment_submissions;
CREATE POLICY "Students can submit assignments"
    ON public.assignment_submissions FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their submissions" ON public.assignment_submissions;
CREATE POLICY "Users can update their submissions"
    ON public.assignment_submissions FOR UPDATE
    TO authenticated
    USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.id = assignment_id AND (
                a.teacher_id = auth.uid() OR 
                EXISTS (SELECT 1 FROM public.profiles WHERE (id = auth.uid() OR email = auth.email()) AND role IN ('teacher', 'admin'))
            )
        )
    );

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_parent_student_rel ON public.parent_student_relations(parent_id, student_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_hw ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_school_backups_created ON public.school_backups(created_at DESC);
`;

class SupabaseBackupManager {
  private autoBackupTimer: any = null;
  private isSyncing = false;
  private lastSyncTimestamp: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    try {
      const saved = localStorage.getItem(BACKUP_STATUS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.lastSyncTimestamp = parsed.lastBackupAt || null;
      }
    } catch {
      // Ignore storage errors
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach(cb => {
      try { cb(); } catch (e) { console.error(e); }
    });
  }

  public getLastSyncTimestamp(): string | null {
    return this.lastSyncTimestamp;
  }

  /**
   * Sunucu üzerinden Supabase entegrasyon yapılandırmasını kontrol eder.
   */
  public async getStatus(): Promise<SupabaseBackupStatus> {
    try {
      const res = await fetch('/api/backup/supabase/status');
      if (res.ok) {
        const data = await res.json();
        if (data.lastBackupAt) {
          this.lastSyncTimestamp = data.lastBackupAt;
        }
        localStorage.setItem(BACKUP_STATUS_KEY, JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.warn('[Supabase Backup] Status check error:', err);
    }

    // Fallback status
    return {
      configured: false,
      status: 'pending',
      tableName: DEFAULT_TABLE_NAME,
      setupSql: SETUP_SQL,
      lastBackupAt: this.lastSyncTimestamp,
      lastError: null
    };
  }

  /**
   * Supabase bağlantısını test eder
   */
  public async testConnection(): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const startTime = performance.now();
    try {
      const res = await fetch('/api/backup/supabase/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const latencyMs = Math.round(performance.now() - startTime);
      const data = await res.json();
      return {
        success: data.success ?? false,
        message: data.message || (data.success ? 'Supabase bağlantısı başarılı.' : 'Bağlantı kurulamadı.'),
        latencyMs
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        message: err?.message || 'Ağ veya sunucu hatası oluştu.',
        latencyMs
      };
    }
  }

  /**
   * Supabase'deki son yedek kayıtlarını listeler
   */
  public async getRecentBackups(): Promise<SupabaseBackupRecord[]> {
    try {
      const res = await fetch('/api/backup/supabase/history');
      if (res.ok) {
        const data = await res.json();
        return data.backups || [];
      }
    } catch (err) {
      console.warn('[Supabase Backup] History fetch failed:', err);
    }
    return [];
  }

  /**
   * Supabase PostgreSQL tablolarından ve en son anlık görüntüden okul verilerini çeker
   */
  public async fetchDatabaseState(): Promise<{
    success: boolean;
    configured: boolean;
    state: LocalCacheStore | null;
    tableCounts?: any;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/database/state');
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err: any) {
      console.warn('[Supabase Database State Fetch Failed]:', err);
    }
    return { success: false, configured: false, state: null };
  }

  /**
   * Tüm yerel verileri doğrudan Supabase ilişkisel tablolarına (profiles, classes, assignments, grades, attendance, announcements) yazar
   */
  public async syncAllToDatabase(store: LocalCacheStore): Promise<{
    success: boolean;
    configured: boolean;
    tableCounts?: any;
    relationalSync?: any;
    message: string;
  }> {
    try {
      const res = await fetch('/api/database/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.lastSyncTimestamp = new Date().toISOString();
          this.notify();
        }
        return data;
      }
    } catch (err: any) {
      console.warn('[Supabase Table Sync-All Error]:', err);
    }
    return {
      success: false,
      configured: false,
      message: 'Supabase tablolarına doğrudan yazma isteği başarısız oldu.'
    };
  }

  /**
   * Veritabanının tam anlık görüntüsünü (snapshot) Supabase'e yedekler
   */
  public async triggerBackup(
    store: LocalCacheStore, 
    syncType: 'auto' | 'manual' = 'manual'
  ): Promise<SupabaseSyncResponse> {
    if (this.isSyncing) {
      return {
        success: false,
        configured: true,
        timestamp: new Date().toISOString(),
        message: 'Şu anda başka bir yedekleme işlemi devam ediyor.'
      };
    }

    this.isSyncing = true;
    this.notify();

    try {
      const stats: SupabaseBackupStats = {
        totalUsers: store.users?.length || 0,
        totalClasses: store.classes?.length || 0,
        totalSchedules: store.schedules?.length || 0,
        totalHomeworks: store.homeworks?.length || 0,
        totalAnnouncements: store.announcements?.length || 0,
        totalGrades: store.grades?.length || 0,
        totalAttendance: store.attendance?.length || 0
      };

      // Tam ve eksiksiz snapshot oluştur
      const cleanSnapshot = {
        users: store.users || [],
        classes: store.classes || [],
        schedules: store.schedules || [],
        homeworks: store.homeworks || [],
        submissions: store.submissions || [],
        announcements: store.announcements || [],
        grades: store.grades || [],
        attendance: store.attendance || [],
        notifications: store.notifications || [],
        badges: store.badges || [],
        studentBadges: store.studentBadges || [],
        scheduleNotes: store.scheduleNotes || {},
        roleAssignments: store.roleAssignments || [],
        systemLogs: (store.systemLogs || []).slice(0, 100), // Son 100 log
        lastUpdated: store.lastUpdated || Date.now(),
        timestamp: new Date().toISOString()
      };

      const res = await fetch('/api/backup/supabase/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncType,
          stats,
          snapshot: cleanSnapshot
        })
      });

      const result: SupabaseSyncResponse = await res.json();

      if (result.success) {
        this.lastSyncTimestamp = result.timestamp || new Date().toISOString();
        try {
          const currentStatus = JSON.parse(localStorage.getItem(BACKUP_STATUS_KEY) || '{}');
          currentStatus.lastBackupAt = this.lastSyncTimestamp;
          currentStatus.lastBackupType = syncType;
          localStorage.setItem(BACKUP_STATUS_KEY, JSON.stringify(currentStatus));
        } catch {
          // ignore
        }
      }

      this.isSyncing = false;
      this.notify();
      return result;
    } catch (err: any) {
      this.isSyncing = false;
      this.notify();
      return {
        success: false,
        configured: false,
        timestamp: new Date().toISOString(),
        message: `Yedekleme isteği başarısız oldu: ${err?.message || 'Bilinmeyen hata'}`
      };
    }
  }

  /**
   * Veri değiştikçe arka planda otomatik yedekleme tetikler (Debounced)
   */
  public scheduleAutoBackup(store: LocalCacheStore, debounceMs: number = 2500) {
    if (this.autoBackupTimer) {
      clearTimeout(this.autoBackupTimer);
    }

    this.autoBackupTimer = setTimeout(() => {
      // Arka planda sessizce yedek al, hata olursa konsola yaz ama kullanıcıyı bölme
      this.triggerBackup(store, 'auto').catch(err => {
        console.warn('[Supabase Auto-Backup Background Worker]:', err);
      });
    }, debounceMs);
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Birincil veritabanına anlık durum kaydeder ve SSE üzerinden diğer cihazlara anında yayınlar
   */
  public async saveDatabaseState(store: LocalCacheStore, senderClientId?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/database/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, senderClientId })
      });
      if (res.ok) {
        const data = await res.json();
        return { success: data.success ?? true, message: data.message || 'Kaydedildi' };
      }
    } catch (err: any) {
      console.warn('[Supabase Save Request Failed]:', err);
    }
    return { success: false, message: 'İstek iletilemedi' };
  }

  public getSetupSql(): string {
    return SETUP_SQL;
  }
}

export const supabaseBackupService = new SupabaseBackupManager();
