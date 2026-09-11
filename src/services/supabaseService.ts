import { LocalCacheStore } from './dataService';
import { 
  SupabaseBackupStatus, 
  SupabaseSyncResponse, 
  SupabaseBackupRecord, 
  SupabaseBackupStats 
} from '../types';

const BACKUP_STATUS_KEY = 'gnsial_supabase_backup_status';
const DEFAULT_TABLE_NAME = 'school_backups';

const SETUP_SQL = `-- Supabase SQL Editor içerisinde çalıştırılacak yedekleme tablosu şeması:
CREATE TABLE IF NOT EXISTS public.school_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    backup_type TEXT NOT NULL DEFAULT 'auto',
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- RLS (Row Level Security) ve indeksler
ALTER TABLE public.school_backups ENABLE ROW LEVEL SECURITY;

-- Okul idaresi veya anon istemcilerin yedek yazabilmesi için erişim kuralı:
CREATE POLICY "Allow school backup operations" ON public.school_backups
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_school_backups_created_at ON public.school_backups(created_at DESC);
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

      // Hassas/aşırı büyük olabilecek token verilerini filtreleyip temiz snapshot oluştur
      const cleanSnapshot = {
        users: store.users || [],
        classes: store.classes || [],
        schedules: store.schedules || [],
        homeworks: store.homeworks || [],
        announcements: store.announcements || [],
        grades: store.grades || [],
        attendance: store.attendance || [],
        roleAssignments: store.roleAssignments || [],
        systemLogs: (store.systemLogs || []).slice(0, 100), // Son 100 log
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

  public getSetupSql(): string {
    return SETUP_SQL;
  }
}

export const supabaseBackupService = new SupabaseBackupManager();
