import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));

// Helper to clean API keys
function sanitizeKey(key?: string): string {
  if (!key) return '';
  return key.trim().replace(/^["']|["']$/g, '').replace(/[\r\n\t\s]+/g, '');
}

// In-memory cache for tracking last backup metadata
let inMemoryLastBackup: any = null;
let supabaseClient: SupabaseClient | null = null;

function getSupabaseInfo(): { 
  client: SupabaseClient | null; 
  url: string; 
  hasUrl: boolean; 
  hasKey: boolean; 
  isServiceRole: boolean 
} {
  let url = sanitizeKey(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  if (url) {
    url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  }
  const serviceKey = sanitizeKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonKey = sanitizeKey(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const key = serviceKey || anonKey;

  if (!url || !key) {
    return { 
      client: null, 
      url: url || '', 
      hasUrl: !!url, 
      hasKey: !!key, 
      isServiceRole: !!serviceKey 
    };
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: { 'x-application': 'gnsial-school-os-backup' }
        }
      });
    } catch (e) {
      console.error('[Supabase Init Error]:', e);
      return { client: null, url, hasUrl: true, hasKey: true, isServiceRole: !!serviceKey };
    }
  }

  return { 
    client: supabaseClient, 
    url, 
    hasUrl: true, 
    hasKey: true, 
    isServiceRole: !!serviceKey 
  };
}

function toValidUuid(str?: string): string {
  if (!str) return crypto.randomUUID();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str.toLowerCase();
  const hex = crypto.createHash('md5').update(String(str)).digest('hex');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-4${hex.substring(13, 16)}-a${hex.substring(17, 20)}-${hex.substring(20, 32)}`;
}

async function getLiveSupabaseTableCounts(client: SupabaseClient) {
  const counts = {
    profiles: 0,
    classes: 0,
    assignments: 0,
    submissions: 0,
    grades: 0,
    attendance: 0,
    announcements: 0
  };

  try {
    const [p, c, asgn, sub, grd, att, ann] = await Promise.all([
      client.from('profiles').select('*', { count: 'exact', head: true }),
      client.from('classes').select('*', { count: 'exact', head: true }),
      client.from('assignments').select('*', { count: 'exact', head: true }),
      client.from('assignment_submissions').select('*', { count: 'exact', head: true }),
      client.from('grades').select('*', { count: 'exact', head: true }),
      client.from('attendance_records').select('*', { count: 'exact', head: true }),
      client.from('announcements').select('*', { count: 'exact', head: true })
    ]);

    if (p.count !== null) counts.profiles = p.count;
    if (c.count !== null) counts.classes = c.count;
    if (asgn.count !== null) counts.assignments = asgn.count;
    if (sub.count !== null) counts.submissions = sub.count;
    if (grd.count !== null) counts.grades = grd.count;
    if (att.count !== null) counts.attendance = att.count;
    if (ann.count !== null) counts.announcements = ann.count;
  } catch (err) {
    console.warn('[Supabase Table Counts Probe]:', err);
  }

  return counts;
}

async function syncAllToSupabaseRelationalTables(client: SupabaseClient, store: any) {
  const stats = {
    profiles: 0,
    classes: 0,
    assignments: 0,
    submissions: 0,
    grades: 0,
    attendance: 0,
    announcements: 0,
    errors: [] as string[]
  };

  if (!store || typeof store !== 'object') return stats;

  try {
    // 1. Ensure default grade types exist
    const defaultGradeTypes = ['exam', 'quiz', 'project', 'test'];
    const { data: existingGradeTypes } = await client.from('grade_types').select('id, name');
    const gradeTypeMap = new Map<string, string>();
    if (existingGradeTypes) {
      existingGradeTypes.forEach((gt: any) => gradeTypeMap.set(gt.name, gt.id));
    }
    for (const gName of defaultGradeTypes) {
      if (!gradeTypeMap.has(gName)) {
        const { data: insertedGt } = await client.from('grade_types').insert({ name: gName }).select('id, name').single();
        if (insertedGt) gradeTypeMap.set(insertedGt.name, insertedGt.id);
      }
    }

    // 2. Ensure default root teacher profile exists for foreign key references
    const defaultTeacherUuid = toValidUuid('admin-root-tlogix');
    await client.from('profiles').upsert({
      id: defaultTeacherUuid,
      email: 'admin@gnisial.k12.tr',
      full_name: 'GNSİAL Okul Yönetimi',
      role: 'teacher'
    });

    // 3. Sync classes first (needed by profiles.class_id, assignments.class_id, attendance.class_id)
    const classIdMap = new Map<string, string>(); // original id/name -> UUID
    if (Array.isArray(store.classes) && store.classes.length > 0) {
      for (const c of store.classes) {
        const classUuid = toValidUuid(c.id || c.name);
        classIdMap.set(c.id, classUuid);
        if (c.name) classIdMap.set(c.name.toUpperCase(), classUuid);

        // Find teacher UUID if advisorTeacher matches a teacher
        let teacherUuid = defaultTeacherUuid;
        if (Array.isArray(store.users)) {
          const matchingTeacher = store.users.find((u: any) => 
            u.role === 'teacher' && (u.displayName === c.advisorTeacher || u.uid === c.advisorTeacherId)
          );
          if (matchingTeacher) {
            teacherUuid = toValidUuid(matchingTeacher.uid);
            await client.from('profiles').upsert({
              id: teacherUuid,
              email: matchingTeacher.email || `${matchingTeacher.uid}@gnisial.k12.tr`,
              full_name: matchingTeacher.displayName || 'Öğretmen',
              role: 'teacher'
            });
          }
        }

        const { error: cErr } = await client.from('classes').upsert({
          id: classUuid,
          name: c.name || 'Bilinmeyen Sınıf',
          grade_level: String(c.gradeLevel || (c.name ? parseInt(c.name) : 10) || 10),
          teacher_id: teacherUuid
        });
        if (!cErr) stats.classes++;
        else stats.errors.push(`Class (${c.name}): ${cErr.message}`);
      }
    }

    // 4. Sync profiles (users: students, teachers, admins)
    if (Array.isArray(store.users) && store.users.length > 0) {
      for (const u of store.users) {
        const userUuid = toValidUuid(u.uid);
        // Supabase profiles_role_check allows 'student' and 'teacher'.
        const dbRole = u.role === 'student' ? 'student' : 'teacher';

        let targetClassUuid: string | null = null;
        if (u.classGrade) {
          targetClassUuid = classIdMap.get(u.classGrade.toUpperCase()) || null;
        }

        const { error: pErr } = await client.from('profiles').upsert({
          id: userUuid,
          email: u.email || `${u.schoolNumber || u.uid}@gnisial.k12.tr`,
          full_name: u.displayName || 'Kullanıcı',
          role: dbRole,
          phone: u.phone || null,
          class_id: targetClassUuid
        });
        if (!pErr) stats.profiles++;
        else stats.errors.push(`Profile (${u.displayName}): ${pErr.message}`);
      }
    }

    // 5. Sync announcements
    if (Array.isArray(store.announcements) && store.announcements.length > 0) {
      for (const a of store.announcements) {
        const annUuid = toValidUuid(a.id);
        const authorUuid = a.authorId ? toValidUuid(a.authorId) : defaultTeacherUuid;
        const dbPriority = (a.priority === 'urgent' || a.priority === 'high') ? 'urgent' : 'normal';

        const { error: aErr } = await client.from('announcements').upsert({
          id: annUuid,
          title: a.title || 'Duyuru',
          content: a.content || '',
          teacher_id: authorUuid,
          priority: dbPriority,
          published_at: a.createdAt || new Date().toISOString()
        });
        if (!aErr) stats.announcements++;
        else stats.errors.push(`Announcement (${a.title}): ${aErr.message}`);
      }
    }

    // 6. Sync assignments (homeworks)
    if (Array.isArray(store.homeworks) && store.homeworks.length > 0) {
      for (const hw of store.homeworks) {
        const hwUuid = toValidUuid(hw.id);
        const teacherUuid = hw.teacherId ? toValidUuid(hw.teacherId) : defaultTeacherUuid;
        const classUuid = hw.targetClass 
          ? (classIdMap.get(hw.targetClass.toUpperCase()) || (classIdMap.size > 0 ? classIdMap.values().next().value : null))
          : (classIdMap.size > 0 ? classIdMap.values().next().value : null);

        if (classUuid) {
          const { error: hwErr } = await client.from('assignments').upsert({
            id: hwUuid,
            title: hw.title || 'Ödev',
            description: hw.description || `${hw.subject || 'Ders'} ödevi`,
            class_id: classUuid,
            teacher_id: teacherUuid,
            due_date: hw.dueDate ? new Date(hw.dueDate).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString()
          });
          if (!hwErr) stats.assignments++;
          else stats.errors.push(`Assignment (${hw.title}): ${hwErr.message}`);
        }
      }
    }

    // 7. Sync assignment submissions
    if (Array.isArray(store.submissions) && store.submissions.length > 0) {
      for (const sub of store.submissions) {
        const subUuid = toValidUuid(sub.id);
        const hwUuid = toValidUuid(sub.homeworkId);
        const stUuid = toValidUuid(sub.studentId);
        const dbStatus = sub.status === 'completed' ? 'completed' : 'pending';

        const { error: subErr } = await client.from('assignment_submissions').upsert({
          id: subUuid,
          assignment_id: hwUuid,
          student_id: stUuid,
          status: dbStatus,
          submitted_at: sub.submittedAt || null,
          notes: sub.teacherFeedback || sub.notes || null
        });
        if (!subErr) stats.submissions++;
        else stats.errors.push(`Submission (${sub.id}): ${subErr.message}`);
      }
    }

    // 8. Sync grades
    if (Array.isArray(store.grades) && store.grades.length > 0) {
      const defaultExamTypeId = gradeTypeMap.get('exam') || (gradeTypeMap.size > 0 ? gradeTypeMap.values().next().value : null);
      for (const g of store.grades) {
        const gradeUuid = toValidUuid(g.id);
        const stUuid = toValidUuid(g.studentId);
        const teacherUuid = g.teacherId ? toValidUuid(g.teacherId) : defaultTeacherUuid;

        let typeId = defaultExamTypeId;
        if (g.type === 'quiz' && gradeTypeMap.has('quiz')) typeId = gradeTypeMap.get('quiz');
        else if ((g.type === 'project' || g.type === 'odev') && gradeTypeMap.has('project')) typeId = gradeTypeMap.get('project');
        else if ((g.type === 'sozlu' || g.type === 'test') && gradeTypeMap.has('test')) typeId = gradeTypeMap.get('test');

        if (typeId) {
          const { error: gErr } = await client.from('grades').upsert({
            id: gradeUuid,
            student_id: stUuid,
            teacher_id: teacherUuid,
            grade_type_id: typeId,
            score: typeof g.score === 'number' ? g.score : (parseFloat(g.score) || 0),
            max_score: g.maxScore || 100,
            subject: g.subject || 'Genel',
            comments: g.teacherComment || g.comments || null,
            recorded_date: g.date ? new Date(g.date).toISOString() : new Date().toISOString()
          });
          if (!gErr) stats.grades++;
          else stats.errors.push(`Grade (${g.subject}): ${gErr.message}`);
        }
      }
    }

    // 9. Sync attendance records
    if (Array.isArray(store.attendance) && store.attendance.length > 0) {
      for (const att of store.attendance) {
        const attUuid = toValidUuid(att.id);
        const stUuid = toValidUuid(att.studentId);
        const teacherUuid = att.teacherId ? toValidUuid(att.teacherId) : defaultTeacherUuid;
        const classUuid = att.classGrade ? (classIdMap.get(att.classGrade.toUpperCase()) || null) : null;

        let dbStatus = 'present';
        if (att.status === 'absent' || att.status === 'ozursuz' || att.status === 'gelmedi') dbStatus = 'absent';
        else if (att.status === 'excused' || att.status === 'ozurlu' || att.status === 'izinli') dbStatus = 'excused';

        if (classUuid) {
          const { error: attErr } = await client.from('attendance_records').upsert({
            id: attUuid,
            student_id: stUuid,
            teacher_id: teacherUuid,
            class_id: classUuid,
            attendance_date: att.date || new Date().toISOString().split('T')[0],
            status: dbStatus,
            notes: att.notes || null
          });
          if (!attErr) stats.attendance++;
          else stats.errors.push(`Attendance (${att.id}): ${attErr.message}`);
        }
      }
    }
  } catch (err: any) {
    stats.errors.push(`Sync Exception: ${err?.message || String(err)}`);
  }

  return stats;
}

// ================= SUPABASE BACKUP API ENDPOINTS =================
app.get('/api/backup/supabase/status', async (req, res) => {
  const { client, url, hasUrl, hasKey, isServiceRole } = getSupabaseInfo();
  const configured = !!client;

  let maskedUrl = '';
  if (url) {
    try {
      const u = new URL(url);
      maskedUrl = `${u.protocol}//${u.hostname.substring(0, 6)}...${u.hostname.slice(-8)}`;
    } catch {
      maskedUrl = url.substring(0, 10) + '...';
    }
  }

  let totalBackupsCount = 0;
  let lastBackupAt = inMemoryLastBackup?.timestamp || null;
  let tableCounts = {
    profiles: 0,
    classes: 0,
    assignments: 0,
    submissions: 0,
    grades: 0,
    attendance: 0,
    announcements: 0
  };

  if (client) {
    try {
      const { count, error } = await client
        .from('school_backups')
        .select('*', { count: 'exact', head: true });
      if (!error && count !== null) {
        totalBackupsCount = count;
      }
      if (!lastBackupAt) {
        const { data } = await client
          .from('school_backups')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1);
        if (data && data[0]?.created_at) {
          lastBackupAt = data[0].created_at;
        }
      }
      tableCounts = await getLiveSupabaseTableCounts(client);
    } catch {
      // ignore table or network error for status probe
    }
  }

  res.json({
    configured,
    status: configured ? 'connected' : 'not_configured',
    url: maskedUrl,
    maskedUrl,
    hasServiceRoleKey: isServiceRole,
    hasAnonKey: hasKey && !isServiceRole,
    lastBackupAt,
    lastBackupType: inMemoryLastBackup?.backup_type || 'auto',
    totalBackupsCount,
    tableCounts,
    tableName: 'school_backups',
    setupSql: `-- Supabase SQL Editor içerisinde çalıştırılacak yedekleme tablosu şeması:
CREATE TABLE IF NOT EXISTS public.school_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    backup_type TEXT NOT NULL DEFAULT 'auto',
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.school_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow school backup operations" ON public.school_backups
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_school_backups_created_at ON public.school_backups(created_at DESC);`
  });
});

app.post('/api/backup/supabase/sync', async (req, res) => {
  const { syncType = 'auto', stats = {}, snapshot } = req.body;
  const { client } = getSupabaseInfo();

  const nowIso = new Date().toISOString();

  if (!client) {
    return res.json({
      success: false,
      configured: false,
      timestamp: nowIso,
      stats,
      message: 'Supabase ortam değişkenleri (SUPABASE_URL ve SUPABASE_ANON_KEY / SERVICE_ROLE_KEY) henüz yapılandırılmamış. Lütfen .env veya Settings üzerinden tanımlayınız.'
    });
  }

  try {
    const insertPayload = {
      backup_type: syncType,
      stats: stats,
      payload: snapshot || {},
      created_at: nowIso
    };

    const { data, error } = await client
      .from('school_backups')
      .insert(insertPayload)
      .select('id, created_at')
      .single();

    if (error && error.code !== '42P01') {
      console.warn('[Supabase Sync Warning]:', error.message);
    }

    // Also write snapshot directly into individual relational tables
    const tableSyncStats = await syncAllToSupabaseRelationalTables(client, snapshot || {});

    const tableCounts = await getLiveSupabaseTableCounts(client);

    inMemoryLastBackup = {
      id: data?.id,
      timestamp: data?.created_at || nowIso,
      backup_type: syncType,
      stats
    };

    return res.json({
      success: true,
      configured: true,
      backupId: data?.id,
      timestamp: data?.created_at || nowIso,
      stats,
      tableCounts,
      relationalSync: tableSyncStats,
      message: `Tüm okul verileri ve Supabase tabloları (${tableCounts.profiles} profil, ${tableCounts.classes} sınıf, ${tableCounts.assignments} ödev, ${tableCounts.grades} not, ${tableCounts.attendance} yoklama) başarıyla güncellendi!`
    });
  } catch (err: any) {
    console.error('[Supabase Sync Error]:', err);
    return res.status(500).json({
      success: false,
      configured: true,
      timestamp: nowIso,
      message: `Yedekleme sırasında sunucu hatası: ${err?.message || 'Bilinmeyen hata'}`
    });
  }
});

// ================= LIVE DATABASE STATE RETRIEVAL & COMPLETE SYNC =================
app.get('/api/database/state', async (req, res) => {
  const { client } = getSupabaseInfo();
  if (!client) {
    return res.json({ success: false, configured: false, state: null });
  }

  try {
    // 1. Get latest snapshot from school_backups
    const { data: latestBackup } = await client
      .from('school_backups')
      .select('payload, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const tableCounts = await getLiveSupabaseTableCounts(client);

    let state = latestBackup?.payload || null;

    return res.json({
      success: true,
      configured: true,
      timestamp: latestBackup?.created_at || new Date().toISOString(),
      state,
      tableCounts
    });
  } catch (err: any) {
    console.warn('[Database State API Error]:', err?.message);
    return res.json({
      success: false,
      configured: true,
      error: err?.message,
      state: null
    });
  }
});

app.post('/api/database/sync-all', async (req, res) => {
  const { store } = req.body;
  const { client } = getSupabaseInfo();

  if (!client) {
    return res.json({ success: false, configured: false, message: 'Supabase yapılandırılmamış' });
  }

  try {
    const tableSyncStats = await syncAllToSupabaseRelationalTables(client, store || {});
    
    // Also save snapshot into school_backups
    await client.from('school_backups').insert({
      backup_type: 'table_sync',
      stats: {
        totalUsers: store.users?.length || 0,
        totalClasses: store.classes?.length || 0,
        totalHomeworks: store.homeworks?.length || 0,
        totalGrades: store.grades?.length || 0,
        totalAttendance: store.attendance?.length || 0
      },
      payload: store || {},
      created_at: new Date().toISOString()
    });

    const tableCounts = await getLiveSupabaseTableCounts(client);

    return res.json({
      success: true,
      configured: true,
      tableCounts,
      relationalSync: tableSyncStats,
      message: `Supabase tablolarına başarıyla yazıldı: ${tableCounts.profiles} profil, ${tableCounts.classes} sınıf, ${tableCounts.assignments} ödev, ${tableCounts.grades} not kaydı!`
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      configured: true,
      message: err?.message || 'Eşitleme hatası'
    });
  }
});

app.post('/api/backup/supabase/test', async (req, res) => {
  const { client } = getSupabaseInfo();
  if (!client) {
    return res.json({
      success: false,
      configured: false,
      message: 'Supabase URL veya API Anahtarı eksik. Lütfen ortam değişkenlerini kontrol edin.'
    });
  }

  try {
    const { data, error } = await client
      .from('school_backups')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          success: true,
          tableExists: false,
          message: 'Supabase projesine başarıyla bağlanıldı! Ancak "school_backups" tablosu henüz açılmamış. Yönetici Panelindeki SQL kodunu çalıştırabilirsiniz.'
        });
      }
      return res.json({
        success: false,
        message: `Supabase yanıt verdi fakat hata döndü: ${error.message}`
      });
    }

    return res.json({
      success: true,
      tableExists: true,
      message: 'Supabase PostgreSQL veritabanı bağlantısı ve "school_backups" tablosu tamamen hazır ve erişilebilir durumda!'
    });
  } catch (err: any) {
    return res.json({
      success: false,
      message: `Bağlantı denemesi başarısız: ${err?.message || 'Bilinmeyen hata'}`
    });
  }
});

app.get('/api/backup/supabase/history', async (req, res) => {
  const { client } = getSupabaseInfo();
  if (!client) {
    return res.json({ backups: inMemoryLastBackup ? [inMemoryLastBackup] : [] });
  }

  try {
    const { data, error } = await client
      .from('school_backups')
      .select('id, backup_type, stats, created_at')
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) {
      return res.json({ backups: inMemoryLastBackup ? [inMemoryLastBackup] : [] });
    }

    return res.json({ backups: data || [] });
  } catch {
    return res.json({ backups: inMemoryLastBackup ? [inMemoryLastBackup] : [] });
  }
});

app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: `API uç noktası bulunamadı: ${req.method} ${req.path}`,
    status: 'not_found'
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api')) {
    console.error('[Server API Error Handler]:', err);
    return res.status(500).json({
      error: err?.message || 'Sunucu içi API hatası oluştu.',
      status: 'error'
    });
  }
  next(err);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] GNSİAL OYS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start server:', err);
});
