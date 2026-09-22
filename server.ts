import express from 'express';
import path from 'path';
import fs from 'fs';
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

function isValidJwt(key?: string): boolean {
  if (!key) return false;
  const parts = key.split('.');
  return parts.length === 3 && key.startsWith('eyJ');
}

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
  
  // Prefer serviceKey ONLY if it is a valid JWT; otherwise fallback to anonKey
  const key = (serviceKey && isValidJwt(serviceKey)) ? serviceKey : (anonKey || serviceKey);
  const isServiceRole = !!serviceKey && isValidJwt(serviceKey);

  if (!url || !key) {
    return { 
      client: null, 
      url: url || '', 
      hasUrl: !!url, 
      hasKey: !!key, 
      isServiceRole 
    };
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: { 'x-application': 'gnsial-school-os-primary' }
        }
      });
    } catch (e) {
      console.error('[Supabase Init Error]:', e);
      return { client: null, url, hasUrl: true, hasKey: true, isServiceRole };
    }
  }

  return { 
    client: supabaseClient, 
    url, 
    hasUrl: true, 
    hasKey: true, 
    isServiceRole 
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
    announcements: 0,
    students: 0,
    parents: 0,
    parentRelations: 0
  };

  try {
    const [p, c, asgn, sub, grd, att, ann, std, prt, psr] = await Promise.all([
      client.from('profiles').select('*', { count: 'exact', head: true }),
      client.from('classes').select('*', { count: 'exact', head: true }),
      client.from('assignments').select('*', { count: 'exact', head: true }),
      client.from('assignment_submissions').select('*', { count: 'exact', head: true }),
      client.from('grades').select('*', { count: 'exact', head: true }),
      client.from('attendance_records').select('*', { count: 'exact', head: true }),
      client.from('announcements').select('*', { count: 'exact', head: true }),
      Promise.resolve(client.from('students').select('*', { count: 'exact', head: true })).catch(() => ({ count: null })),
      Promise.resolve(client.from('parents').select('*', { count: 'exact', head: true })).catch(() => ({ count: null })),
      Promise.resolve(client.from('parent_student_relations').select('*', { count: 'exact', head: true })).catch(() => ({ count: null }))
    ]);

    if (p.count !== null) counts.profiles = p.count;
    if (c.count !== null) counts.classes = c.count;
    if (asgn.count !== null) counts.assignments = asgn.count;
    if (sub.count !== null) counts.submissions = sub.count;
    if (grd.count !== null) counts.grades = grd.count;
    if (att.count !== null) counts.attendance = att.count;
    if (ann.count !== null) counts.announcements = ann.count;
    if (std && (std as any).count !== null) counts.students = (std as any).count;
    if (prt && (prt as any).count !== null) counts.parents = (prt as any).count;
    if (psr && (psr as any).count !== null) counts.parentRelations = (psr as any).count;
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
    students: 0,
    parents: 0,
    parentRelations: 0,
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

    // 4b. Sync students table
    if (Array.isArray(store.users) && store.users.length > 0) {
      const studentUsers = store.users.filter((u: any) => u.role === 'student');
      for (const st of studentUsers) {
        const studentUuid = toValidUuid(st.uid);
        let targetClassUuid: string | null = null;
        if (st.classGrade) {
          targetClassUuid = classIdMap.get(st.classGrade.toUpperCase()) || null;
        }
        try {
          const { error: stdErr } = await client.from('students').upsert({
            id: studentUuid,
            user_id: studentUuid,
            full_name: st.displayName || 'Öğrenci',
            school_number: st.schoolNumber || null,
            class_id: targetClassUuid
          });
          if (!stdErr) stats.students++;
        } catch {}
      }
    }

    // 4c. Sync parents table and parent_student_relations
    if (Array.isArray(store.users) && store.users.length > 0) {
      const parentUsers = store.users.filter((u: any) => u.role === 'parent');
      for (const p of parentUsers) {
        const parentUuid = toValidUuid(p.uid);
        try {
          const { error: prtErr } = await client.from('parents').upsert({
            id: parentUuid,
            user_id: parentUuid,
            full_name: p.displayName || 'Veli',
            phone: p.phone || null,
            email: p.email || null,
            relationship: p.relationship || 'Veli'
          });
          if (!prtErr) stats.parents++;

          // Link students in parent_student_relations
          const matchedStudents = store.users.filter((s: any) => 
            s.role === 'student' && (
              (p.studentIds && p.studentIds.includes(s.uid)) ||
              (p.studentNumbers && s.schoolNumber && p.studentNumbers.includes(s.schoolNumber)) ||
              (s.parentId && s.parentId === p.uid) ||
              (p.phone && s.parentPhone && s.parentPhone.replace(/\D/g, '') === p.phone.replace(/\D/g, ''))
            )
          );

          for (const child of matchedStudents) {
            const childUuid = toValidUuid(child.uid);
            try {
              const { error: relErr } = await client.from('parent_student_relations').upsert({
                parent_id: parentUuid,
                student_id: childUuid,
                relationship: p.relationship || 'Veli',
                is_primary: true
              }, { onConflict: 'parent_id,student_id' });
              if (!relErr) stats.parentRelations++;
            } catch {}
          }
        } catch {}
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

        try {
          await client.from('profiles').upsert({
            id: teacherUuid,
            email: hw.teacherEmail || `${(hw.teacherName || 'ogretmen').toLowerCase().replace(/\s+/g, '.')}@gnsial.meb.k12.tr`,
            full_name: hw.teacherName || 'Öğretmen',
            role: 'teacher'
          }, { onConflict: 'id' });
        } catch {}

        const classUuid = hw.targetClass && hw.targetClass !== 'Tüm Okul' 
          ? (classIdMap.get(hw.targetClass.toUpperCase()) || null)
          : null;

        const { error: hwErr } = await client.from('assignments').upsert({
          id: hwUuid,
          title: hw.title || 'Ödev',
          subject: hw.subject || 'Genel',
          description: hw.description || `${hw.subject || 'Ders'} ödevi`,
          class_id: classUuid,
          target_class: hw.targetClass || 'Tüm Okul',
          target_classes: hw.targetClasses || null,
          target_type: hw.targetType || 'class',
          target_student_ids: hw.targetStudentIds ? hw.targetStudentIds.map(toValidUuid) : null,
          teacher_id: teacherUuid,
          due_date: hw.dueDate ? new Date(hw.dueDate).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString(),
          due_time: hw.dueTime || '23:59',
          max_score: hw.maxScore || 100,
          xp_reward: hw.xpReward || 50,
          attachments: hw.attachments || [],
          rubric: hw.rubric || [],
          created_at: hw.createdAt || new Date().toISOString()
        }, { onConflict: 'id' });

        if (!hwErr) stats.assignments++;
        else stats.errors.push(`Assignment (${hw.title}): ${hwErr.message}`);
      }
    }

    // 7. Sync assignment submissions
    if (Array.isArray(store.submissions) && store.submissions.length > 0) {
      for (const sub of store.submissions) {
        const subUuid = toValidUuid(sub.id);
        const hwUuid = toValidUuid(sub.homeworkId);
        const stUuid = toValidUuid(sub.studentId);
        const dbStatus = sub.status === 'completed' ? 'completed' : 'pending';

        try {
          await client.from('profiles').upsert({
            id: stUuid,
            email: `${sub.schoolNumber || sub.studentId || 'ogrenci'}@gnsial.meb.k12.tr`,
            full_name: sub.studentName || 'Öğrenci',
            role: 'student'
          }, { onConflict: 'id' });
        } catch {}

        const { error: subErr } = await client.from('assignment_submissions').upsert({
          id: subUuid,
          assignment_id: hwUuid,
          student_id: stUuid,
          status: dbStatus,
          submitted_at: sub.submittedAt || null,
          notes: sub.teacherFeedback || sub.studentNote || sub.notes || null
        }, { onConflict: 'id' });

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

// ================= LIVE DATABASE REALTIME SSE, DISK PERSISTENCE & IN-MEMORY CACHE =================
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'school_database.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

function loadPersistedState(): any | null {
  try {
    ensureDataDir();
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        console.log('[Server DB] Disk veritabanı başarıyla yüklendi:', {
          users: parsed?.users?.length || 0,
          classes: parsed?.classes?.length || 0,
          announcements: parsed?.announcements?.length || 0,
          homeworks: parsed?.homeworks?.length || 0
        });
        return parsed;
      }
    }
  } catch (e) {
    console.error('[Server DB] Diskten okuma hatası:', e);
  }
  return null;
}

function savePersistedState(state: any) {
  try {
    ensureDataDir();
    if (state) {
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    }
  } catch (e) {
    console.error('[Server DB] Diske yazma hatası:', e);
  }
}

let inMemoryLatestState: any = loadPersistedState();
const sseClients = new Set<express.Response>();

function broadcastStateUpdate(state: any, senderClientId?: string) {
  if (!state) return;
  const payload = JSON.stringify({
    type: 'state_updated',
    timestamp: new Date().toISOString(),
    lastUpdated: state.lastUpdated || Date.now(),
    senderClientId: senderClientId || null,
    state
  });
  for (const clientRes of Array.from(sseClients)) {
    try {
      clientRes.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(clientRes);
    }
  }
}

// Server-Sent Events (SSE) Endpoint for Instant Multi-Device Reactivity
app.get('/api/database/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Periodic SSE Keep-Alive Heartbeat
setInterval(() => {
  for (const clientRes of Array.from(sseClients)) {
    try {
      clientRes.write(': heartbeat\n\n');
    } catch {
      sseClients.delete(clientRes);
    }
  }
}, 20000);

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
  const { syncType = 'auto', stats = {}, snapshot, senderClientId } = req.body;
  const { client } = getSupabaseInfo();

  const nowIso = new Date().toISOString();

  // Instant in-memory cache update & SSE broadcast to all other open devices
  if (snapshot) {
    inMemoryLatestState = snapshot;
    broadcastStateUpdate(snapshot, senderClientId);
  }

  if (!client) {
    return res.json({
      success: true,
      configured: false,
      timestamp: nowIso,
      stats,
      message: 'Supabase ortam değişkenleri henüz yapılandırılmamış, yerel bellek güncellendi.'
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

    // Also attempt relational sync silently
    let tableSyncStats = null;
    try {
      tableSyncStats = await syncAllToSupabaseRelationalTables(client, snapshot || {});
    } catch {}

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
      message: `Tüm okul verileri Supabase veritabanına başarıyla kaydedildi!`
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
  // If we already have the latest state in memory, return it instantly!
  if (inMemoryLatestState) {
    return res.json({
      success: true,
      configured: true,
      timestamp: inMemoryLatestState.timestamp || new Date().toISOString(),
      state: inMemoryLatestState
    });
  }

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
    if (state) {
      inMemoryLatestState = state;
    }

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

  if (store) {
    inMemoryLatestState = store;
    broadcastStateUpdate(store);
  }

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

app.post('/api/database/save', async (req, res) => {
  const { store, senderClientId } = req.body;
  const { client } = getSupabaseInfo();

  // Instant in-memory cache update, disk persistence & SSE broadcast to all other open devices
  if (store) {
    inMemoryLatestState = store;
    savePersistedState(store);
    broadcastStateUpdate(store, senderClientId);
  }

  if (!client) {
    return res.json({ success: true, configured: false, message: 'Sunucu yerel veritabanına kaydedildi, Supabase yapılandırılmamış' });
  }

  const nowIso = new Date().toISOString();
  try {
    const stats = {
      totalUsers: store?.users?.length || 0,
      totalClasses: store?.classes?.length || 0,
      totalHomeworks: store?.homeworks?.length || 0,
      totalAnnouncements: store?.announcements?.length || 0,
      totalGrades: store?.grades?.length || 0,
      totalAttendance: store?.attendance?.length || 0,
      totalSchedules: store?.schedules?.length || 0
    };

    const { data, error } = await client.from('school_backups').insert({
      backup_type: 'primary_sync',
      stats,
      payload: store || {},
      created_at: nowIso
    }).select('id, created_at').single();

    if (error) {
      console.warn('[Supabase Primary Save Warning]:', error.message);
    }

    // Also attempt relational sync silently
    try {
      await syncAllToSupabaseRelationalTables(client, store || {});
    } catch {}

    inMemoryLastBackup = {
      id: data?.id,
      timestamp: data?.created_at || nowIso,
      backup_type: 'primary_sync',
      stats
    };

    return res.json({
      success: true,
      configured: true,
      id: data?.id,
      timestamp: data?.created_at || nowIso,
      message: 'Supabase birincil veritabanına başarıyla kaydedildi'
    });
  } catch (err: any) {
    console.error('[Supabase Save Error]:', err);
    return res.status(500).json({
      success: false,
      configured: true,
      message: err?.message || 'Kayıt sırasında hata oluştu'
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

// ================= HOMEWORK / ASSIGNMENT API ENDPOINTS =================
app.get('/api/homeworks', async (req, res) => {
  const { classGrade, teacherId, studentId } = req.query as Record<string, string>;
  const { client } = getSupabaseInfo();

  if (!inMemoryLatestState || !Array.isArray(inMemoryLatestState.homeworks) || inMemoryLatestState.homeworks.length === 0) {
    if (client) {
      try {
        const { data: backup } = await client
          .from('school_backups')
          .select('payload')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (backup?.payload?.homeworks && Array.isArray(backup.payload.homeworks) && backup.payload.homeworks.length > 0) {
          if (!inMemoryLatestState) inMemoryLatestState = backup.payload;
          else inMemoryLatestState.homeworks = backup.payload.homeworks;
        }
      } catch {}

      // If still empty, query relational assignments table directly
      if (!inMemoryLatestState?.homeworks || inMemoryLatestState.homeworks.length === 0) {
        try {
          const { data: dbAssignments } = await client
            .from('assignments')
            .select('*')
            .order('created_at', { ascending: false });

          if (dbAssignments && dbAssignments.length > 0) {
            const mappedHw = dbAssignments.map((a: any) => ({
              id: a.id,
              title: a.title,
              subject: a.subject || 'Ders',
              description: a.description || '',
              targetClass: a.target_class || 'Tüm Okul',
              targetClasses: a.target_classes || null,
              targetType: a.target_type || 'class',
              targetStudentIds: a.target_student_ids || null,
              teacherId: a.teacher_id,
              dueDate: a.due_date ? a.due_date.split('T')[0] : '',
              dueTime: a.due_time || '23:59',
              maxScore: a.max_score || 100,
              xpReward: a.xp_reward || 50,
              attachments: a.attachments || [],
              rubric: a.rubric || [],
              createdAt: a.created_at
            }));

            if (!inMemoryLatestState) {
              inMemoryLatestState = { users: [], classes: [], homeworks: [], submissions: [], grades: [], attendance: [], announcements: [] };
            }
            inMemoryLatestState.homeworks = mappedHw;
          }
        } catch {}
      }
    }
  }

  let homeworks: any[] = inMemoryLatestState?.homeworks || [];

  if (teacherId) {
    homeworks = homeworks.filter(h => h.teacherId === teacherId);
  }
  if (classGrade) {
    const clean = classGrade.trim().toUpperCase();
    homeworks = homeworks.filter(h => 
      h.targetClass === 'Tüm Okul' ||
      (h.targetClass && h.targetClass.toUpperCase() === clean) ||
      (h.targetClasses && h.targetClasses.some((tc: string) => tc === 'Tüm Okul' || tc.trim().toUpperCase() === clean)) ||
      (h.targetClass && h.targetClass.split(',').some((tc: string) => tc.trim().toUpperCase() === clean))
    );
  }
  if (studentId) {
    homeworks = homeworks.filter(h => 
      !h.targetType || h.targetType === 'class' || 
      (h.targetStudentIds && h.targetStudentIds.includes(studentId))
    );
  }

  res.json({ success: true, homeworks });
});

app.post('/api/homeworks', async (req, res) => {
  const newHw = req.body;
  if (!newHw || !newHw.title) {
    return res.status(400).json({ success: false, message: 'Ödev başlığı zorunludur' });
  }

  const hwId = newHw.id || `hw-${Date.now()}`;
  const record = {
    ...newHw,
    id: hwId,
    createdAt: newHw.createdAt || new Date().toISOString()
  };

  if (!inMemoryLatestState) {
    inMemoryLatestState = { users: [], classes: [], homeworks: [], submissions: [], grades: [], attendance: [], announcements: [] };
  }
  if (!Array.isArray(inMemoryLatestState.homeworks)) inMemoryLatestState.homeworks = [];

  const existingIdx = inMemoryLatestState.homeworks.findIndex((h: any) => h.id === hwId);
  if (existingIdx >= 0) {
    inMemoryLatestState.homeworks[existingIdx] = record;
  } else {
    inMemoryLatestState.homeworks.unshift(record);
  }

  // Sync with Supabase assignments table if client available
  const { client } = getSupabaseInfo();
  if (client) {
    try {
      const hwUuid = toValidUuid(record.id);
      const teacherUuid = record.teacherId ? toValidUuid(record.teacherId) : toValidUuid('admin-root-tlogix');

      try {
        await client.from('profiles').upsert({
          id: teacherUuid,
          email: record.teacherEmail || `${(record.teacherName || 'ogretmen').toLowerCase().replace(/\s+/g, '.')}@gnsial.meb.k12.tr`,
          full_name: record.teacherName || 'Öğretmen',
          role: 'teacher'
        }, { onConflict: 'id' });
      } catch {}

      await client.from('assignments').upsert({
        id: hwUuid,
        title: record.title,
        subject: record.subject || 'Genel',
        description: record.description || `${record.subject || 'Ders'} ödevi`,
        target_class: record.targetClass || 'Tüm Okul',
        target_classes: record.targetClasses || null,
        target_type: record.targetType || 'class',
        target_student_ids: record.targetStudentIds ? record.targetStudentIds.map(toValidUuid) : null,
        teacher_id: teacherUuid,
        due_date: record.dueDate ? new Date(record.dueDate).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString(),
        due_time: record.dueTime || '23:59',
        max_score: record.maxScore || 100,
        xp_reward: record.xpReward || 50,
        attachments: record.attachments || [],
        rubric: record.rubric || [],
        created_at: record.createdAt || new Date().toISOString()
      }, { onConflict: 'id' });

      // Persist state snapshot to school_backups
      await client.from('school_backups').insert({
        backup_type: 'homework_create',
        stats: {
          totalHomeworks: inMemoryLatestState.homeworks.length,
          totalUsers: inMemoryLatestState.users?.length || 0
        },
        payload: inMemoryLatestState,
        created_at: new Date().toISOString()
      });
    } catch (e: any) {
      console.warn('[Supabase Homework Create Warn]:', e.message);
    }
  }

  savePersistedState(inMemoryLatestState);
  broadcastStateUpdate(inMemoryLatestState);
  res.json({ success: true, homework: record });
});

app.put('/api/homeworks/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (!inMemoryLatestState || !Array.isArray(inMemoryLatestState.homeworks)) {
    return res.status(404).json({ success: false, message: 'Ödev bulunamadı' });
  }

  const idx = inMemoryLatestState.homeworks.findIndex((h: any) => h.id === id);
  if (idx < 0) {
    return res.status(404).json({ success: false, message: 'Ödev bulunamadı' });
  }

  const updatedHw = { ...inMemoryLatestState.homeworks[idx], ...updates, updatedAt: new Date().toISOString() };
  inMemoryLatestState.homeworks[idx] = updatedHw;

  // Supabase update
  const { client } = getSupabaseInfo();
  if (client) {
    try {
      const hwUuid = toValidUuid(id);
      await client.from('assignments').update({
        title: updatedHw.title,
        subject: updatedHw.subject,
        description: updatedHw.description,
        target_class: updatedHw.targetClass,
        target_classes: updatedHw.targetClasses || null,
        target_type: updatedHw.targetType,
        target_student_ids: updatedHw.targetStudentIds ? updatedHw.targetStudentIds.map(toValidUuid) : null,
        due_date: updatedHw.dueDate ? new Date(updatedHw.dueDate).toISOString() : null,
        due_time: updatedHw.dueTime,
        max_score: updatedHw.maxScore,
        xp_reward: updatedHw.xpReward,
        attachments: updatedHw.attachments || [],
        rubric: updatedHw.rubric || [],
        updated_at: new Date().toISOString()
      }).eq('id', hwUuid);

      await client.from('school_backups').insert({
        backup_type: 'homework_update',
        stats: { totalHomeworks: inMemoryLatestState.homeworks.length },
        payload: inMemoryLatestState,
        created_at: new Date().toISOString()
      });
    } catch (e: any) {
      console.warn('[Supabase Homework Update Warn]:', e.message);
    }
  }

  savePersistedState(inMemoryLatestState);
  broadcastStateUpdate(inMemoryLatestState);
  res.json({ success: true, homework: updatedHw });
});

app.delete('/api/homeworks/:id', async (req, res) => {
  const { id } = req.params;
  if (inMemoryLatestState && Array.isArray(inMemoryLatestState.homeworks)) {
    inMemoryLatestState.homeworks = inMemoryLatestState.homeworks.filter((h: any) => h.id !== id);
    if (Array.isArray(inMemoryLatestState.submissions)) {
      inMemoryLatestState.submissions = inMemoryLatestState.submissions.filter((s: any) => s.homeworkId !== id);
    }
  }

  const { client } = getSupabaseInfo();
  if (client) {
    try {
      const hwUuid = toValidUuid(id);
      await client.from('assignment_submissions').delete().eq('assignment_id', hwUuid);
      await client.from('assignments').delete().eq('id', hwUuid);

      if (inMemoryLatestState) {
        await client.from('school_backups').insert({
          backup_type: 'homework_delete',
          stats: { totalHomeworks: inMemoryLatestState.homeworks?.length || 0 },
          payload: inMemoryLatestState,
          created_at: new Date().toISOString()
        });
      }
    } catch {}
  }

  if (inMemoryLatestState) {
    savePersistedState(inMemoryLatestState);
    broadcastStateUpdate(inMemoryLatestState);
  }
  res.json({ success: true, message: 'Ödev silindi' });
});

app.get('/api/homeworks/:id/submissions', async (req, res) => {
  const { id } = req.params;
  const store = inMemoryLatestState;
  const submissions = (store?.submissions || []).filter((s: any) => s.homeworkId === id);
  res.json({ success: true, submissions });
});

app.post('/api/homeworks/:id/submissions/status', async (req, res) => {
  const { id } = req.params;
  const { submissionId, studentId, status, score, feedback, rubricScores, teacherName } = req.body;

  if (!inMemoryLatestState) {
    inMemoryLatestState = { users: [], classes: [], homeworks: [], submissions: [], grades: [], attendance: [], announcements: [] };
  }
  if (!Array.isArray(inMemoryLatestState.submissions)) inMemoryLatestState.submissions = [];

  let sub = inMemoryLatestState.submissions.find((s: any) => 
    (submissionId && s.id === submissionId) || (s.homeworkId === id && s.studentId === studentId)
  );

  const nowIso = new Date().toISOString();
  if (sub) {
    sub.status = status;
    if (score !== undefined) sub.score = score;
    if (feedback !== undefined) sub.feedback = feedback;
    if (rubricScores !== undefined) sub.rubricScores = rubricScores;
    if (teacherName) sub.gradedByTeacher = teacherName;
    sub.gradedAt = nowIso;
  } else {
    sub = {
      id: submissionId || `sub-${id}-${studentId || Date.now()}`,
      homeworkId: id,
      studentId: studentId || '',
      status: status || 'pending',
      score,
      feedback,
      rubricScores,
      gradedByTeacher: teacherName,
      gradedAt: nowIso
    };
    inMemoryLatestState.submissions.push(sub);
  }

  // Supabase update
  const { client } = getSupabaseInfo();
  if (client && sub.studentId) {
    try {
      await client.from('assignment_submissions').upsert({
        id: toValidUuid(sub.id),
        assignment_id: toValidUuid(id),
        student_id: toValidUuid(sub.studentId),
        status: sub.status === 'completed' ? 'completed' : 'pending',
        score: sub.score !== undefined ? sub.score : null,
        feedback: sub.feedback || null,
        rubric_scores: sub.rubricScores || [],
        updated_at: nowIso
      }, { onConflict: 'id' });

      await client.from('school_backups').insert({
        backup_type: 'submission_status',
        stats: { totalSubmissions: inMemoryLatestState.submissions.length },
        payload: inMemoryLatestState,
        created_at: nowIso
      });
    } catch {}
  }

  savePersistedState(inMemoryLatestState);
  broadcastStateUpdate(inMemoryLatestState);
  res.json({ success: true, submission: sub });
});

app.post('/api/homeworks/:id/submit', async (req, res) => {
  const { id } = req.params;
  const { studentId, studentNote, attachments, studentName, schoolNumber, classGrade } = req.body;

  if (!inMemoryLatestState) {
    inMemoryLatestState = { users: [], classes: [], homeworks: [], submissions: [], grades: [], attendance: [], announcements: [] };
  }
  if (!Array.isArray(inMemoryLatestState.submissions)) inMemoryLatestState.submissions = [];

  let sub = inMemoryLatestState.submissions.find((s: any) => s.homeworkId === id && s.studentId === studentId);
  const nowIso = new Date().toISOString();

  if (sub) {
    sub.status = 'completed';
    sub.submittedAt = nowIso;
    sub.studentNote = studentNote || sub.studentNote;
    if (attachments && attachments.length > 0) {
      sub.attachments = [...(sub.attachments || []), ...attachments];
    }
  } else {
    sub = {
      id: `sub-${id}-${studentId}`,
      homeworkId: id,
      studentId,
      studentName: studentName || 'Öğrenci',
      schoolNumber: schoolNumber || '',
      classGrade: classGrade || '',
      status: 'completed',
      submittedAt: nowIso,
      studentNote,
      attachments: attachments || []
    };
    inMemoryLatestState.submissions.push(sub);
  }

  // Supabase update
  const { client } = getSupabaseInfo();
  if (client && studentId) {
    try {
      await client.from('assignment_submissions').upsert({
        id: toValidUuid(sub.id),
        assignment_id: toValidUuid(id),
        student_id: toValidUuid(studentId),
        status: 'completed',
        submitted_at: nowIso,
        student_note: studentNote || null,
        attachments: sub.attachments || [],
        updated_at: nowIso
      }, { onConflict: 'id' });

      await client.from('school_backups').insert({
        backup_type: 'submission_submit',
        stats: { totalSubmissions: inMemoryLatestState.submissions.length },
        payload: inMemoryLatestState,
        created_at: nowIso
      });
    } catch {}
  }

  savePersistedState(inMemoryLatestState);
  broadcastStateUpdate(inMemoryLatestState);
  res.json({ success: true, submission: sub });
});

// ================= DUYURULAR (ANNOUNCEMENTS) ENDPOINTS =================
app.get('/api/announcements', async (req, res) => {
  const store = inMemoryLatestState;
  const announcements = store?.announcements || [];
  res.json({ success: true, announcements });
});

app.post('/api/announcements', async (req, res) => {
  const record = req.body;
  if (!record || !record.id) {
    return res.status(400).json({ success: false, message: 'Geçersiz duyuru verisi' });
  }

  if (!inMemoryLatestState) {
    inMemoryLatestState = { users: [], classes: [], homeworks: [], submissions: [], grades: [], attendance: [], announcements: [] };
  }
  if (!Array.isArray(inMemoryLatestState.announcements)) {
    inMemoryLatestState.announcements = [];
  }

  const existingIdx = inMemoryLatestState.announcements.findIndex((a: any) => a.id === record.id);
  if (existingIdx >= 0) {
    inMemoryLatestState.announcements[existingIdx] = {
      ...inMemoryLatestState.announcements[existingIdx],
      ...record,
      updatedAt: new Date().toISOString()
    };
  } else {
    inMemoryLatestState.announcements.unshift({
      ...record,
      createdAt: record.createdAt || new Date().toISOString()
    });
  }

  // Supabase update if client available
  const { client } = getSupabaseInfo();
  if (client) {
    try {
      await client.from('school_backups').insert({
        backup_type: 'announcement_save',
        stats: { totalAnnouncements: inMemoryLatestState.announcements.length },
        payload: inMemoryLatestState,
        created_at: new Date().toISOString()
      });
    } catch (e: any) {
      console.warn('[Supabase Announcement Save Warn]:', e.message);
    }
  }

  savePersistedState(inMemoryLatestState);
  broadcastStateUpdate(inMemoryLatestState);
  res.json({ success: true, announcement: record });
});

app.delete('/api/announcements/:id', async (req, res) => {
  const { id } = req.params;
  if (inMemoryLatestState && Array.isArray(inMemoryLatestState.announcements)) {
    inMemoryLatestState.announcements = inMemoryLatestState.announcements.filter((a: any) => a.id !== id);
  }

  const { client } = getSupabaseInfo();
  if (client && inMemoryLatestState) {
    try {
      await client.from('school_backups').insert({
        backup_type: 'announcement_delete',
        stats: { totalAnnouncements: inMemoryLatestState.announcements?.length || 0 },
        payload: inMemoryLatestState,
        created_at: new Date().toISOString()
      });
    } catch {}
  }

  if (inMemoryLatestState) {
    savePersistedState(inMemoryLatestState);
    broadcastStateUpdate(inMemoryLatestState);
  }
  res.json({ success: true, message: 'Duyuru silindi' });
});

app.post('/api/announcements/:id/pin', async (req, res) => {
  const { id } = req.params;
  if (inMemoryLatestState && Array.isArray(inMemoryLatestState.announcements)) {
    const ann = inMemoryLatestState.announcements.find((a: any) => a.id === id);
    if (ann) {
      ann.pinned = !ann.pinned;
      ann.updatedAt = new Date().toISOString();
      savePersistedState(inMemoryLatestState);
      broadcastStateUpdate(inMemoryLatestState);
      return res.json({ success: true, pinned: ann.pinned });
    }
  }
  res.status(404).json({ success: false, message: 'Duyuru bulunamadı' });
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
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true' ? undefined : false,
      },
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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] GNSİAL OYS Server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${PORT} is already in use.`);
    } else {
      console.error('[Server Error]:', err);
    }
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start server:', err);
});
