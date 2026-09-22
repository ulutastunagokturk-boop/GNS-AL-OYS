import { dataService, normalizeClassName, isAllSchool } from './dataService';
import { Homework, HomeworkSubmission, HomeworkStatus, Attachment } from '../types';
import { errorMonitoringService } from './errorMonitoringService';

export interface HomeworkFilterOptions {
  classGrade?: string;
  teacherId?: string;
  studentId?: string;
  status?: string;
}

/**
 * HomeworkService: GNSİAL Ödev Yönetim Servisi
 * Supabase ve Firestore entegrasyonlu, hem öğretmen hem öğrenci panelleri için
 * ödev oluşturma, listeleme, filtreleme, teslim ve değerlendirme işlemlerini yönetir.
 */
export class HomeworkService {
  private static instance: HomeworkService;

  public static getInstance(): HomeworkService {
    if (!HomeworkService.instance) {
      HomeworkService.instance = new HomeworkService();
    }
    return HomeworkService.instance;
  }

  /**
   * Tüm ödevleri veya filtrelenmiş listeyi getirir.
   */
  public getHomeworks(filter?: HomeworkFilterOptions): Homework[] {
    let list = dataService.getHomeworks();

    if (!filter) return list;

    if (filter.teacherId) {
      list = list.filter(h => h.teacherId === filter.teacherId);
    }

    if (filter.classGrade && filter.classGrade !== 'all') {
      const cleanFilter = normalizeClassName(filter.classGrade);
      list = list.filter(h => {
        if (isAllSchool(h.targetClass)) return true;
        if (h.targetClasses && h.targetClasses.some(tc => isAllSchool(tc) || normalizeClassName(tc) === cleanFilter)) return true;
        if (h.targetClass) {
          const parts = h.targetClass.split(',').map(tc => tc.trim());
          if (parts.some(tc => isAllSchool(tc) || normalizeClassName(tc) === cleanFilter)) return true;
        }
        return false;
      });
    }

    if (filter.studentId) {
      list = list.filter(h => {
        if (h.targetType === 'student') {
          return h.targetStudentIds && h.targetStudentIds.includes(filter.studentId!);
        }
        return true;
      });
    }

    return list;
  }

  /**
   * ID'ye göre tekil ödevi getirir.
   */
  public getHomeworkById(id: string): Homework | undefined {
    return dataService.getHomeworkById(id);
  }

  /**
   * Öğretmenin verdiği ödevleri listeler.
   */
  public getHomeworksForTeacher(teacherId: string): Homework[] {
    return dataService.getHomeworks().filter(h => h.teacherId === teacherId);
  }

  /**
   * Öğrenciye atanan ödevleri sınıf, çoklu şube ve özel atamalara göre listeler.
   */
  public getHomeworksForStudent(studentClass?: string, studentId?: string): Homework[] {
    return dataService.getHomeworksForStudent(studentClass, studentId);
  }

  /**
   * Yeni bir ödev oluşturur.
   * dataService ve Supabase veritabanına aktarır.
   */
  public async createHomework(homeworkData: Partial<Homework>): Promise<Homework> {
    const hwId = homeworkData.id || `hw-${Date.now()}`;
    const newHw: Homework = {
      id: hwId,
      title: homeworkData.title || 'Başlıksız Ödev',
      subject: homeworkData.subject || 'Genel',
      description: homeworkData.description || '',
      teacherId: homeworkData.teacherId || 'admin-root',
      teacherName: homeworkData.teacherName || 'Öğretmen',
      targetType: homeworkData.targetType || 'class',
      targetClass: homeworkData.targetClass || 'Tüm Okul',
      targetClasses: homeworkData.targetClasses,
      targetStudentIds: homeworkData.targetStudentIds,
      dueDate: homeworkData.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      dueTime: homeworkData.dueTime || '23:59',
      maxScore: Number(homeworkData.maxScore) || 100,
      xpReward: Number(homeworkData.xpReward) || 50,
      badgeRewardId: homeworkData.badgeRewardId,
      attachments: homeworkData.attachments || [],
      rubric: homeworkData.rubric || [],
      createdAt: new Date().toISOString()
    };

    // 1. Save to local dataService & Firestore
    const created = await dataService.addHomework(newHw);

    // 2. Sync to Supabase via server API
    try {
      const res = await fetch('/api/homeworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(created)
      });
      if (res.ok) {
        console.log('[HomeworkService] Ödev başarıyla buluta ve Supabase veritabanına aktarıldı:', created.title);
      }
    } catch (err) {
      console.warn('[HomeworkService] Supabase sync note:', err);
    }

    return created;
  }

  /**
   * Mevcut ödevi günceller.
   */
  public async updateHomework(id: string, updates: Partial<Homework>): Promise<Homework | null> {
    const updated = await dataService.updateHomework(id, updates);
    if (updated) {
      try {
        await fetch(`/api/homeworks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
      } catch (err) {
        console.warn('[HomeworkService] Supabase update note:', err);
      }
    }
    return updated;
  }

  /**
   * Ödevi ve ilişkili teslimleri siler.
   */
  public async deleteHomework(id: string): Promise<boolean> {
    await dataService.deleteHomework(id);
    try {
      await fetch(`/api/homeworks/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('[HomeworkService] Supabase delete note:', err);
    }
    return true;
  }

  /**
   * Buluttan (Supabase ve Firestore) ödevleri senkronize eder.
   */
  public async syncHomeworksFromCloud(): Promise<Homework[]> {
    return await dataService.syncHomeworksFromCloud();
  }

  /**
   * Belirli bir ödevin öğrenci teslimatlarını getirir.
   */
  public getSubmissionsForHomework(homeworkId: string): HomeworkSubmission[] {
    return dataService.getSubmissionsForHomework(homeworkId);
  }

  /**
   * Belirli bir öğrencinin tüm ödev teslimatlarını getirir.
   */
  public getSubmissionsForStudent(studentId: string): HomeworkSubmission[] {
    return dataService.getSubmissionsForStudent(studentId);
  }

  /**
   * Öğretmen tarafından ödev ID ve öğrenci ID'sine göre teslim durumunun, puanın veya geri bildirimin güncellenmesi.
   */
  public async updateStudentSubmissionStatus(
    homeworkId: string,
    studentId: string,
    status: HomeworkStatus,
    score?: number,
    feedback?: string,
    rubricScores?: Record<string, number>,
    teacherName: string = 'Öğretmen'
  ): Promise<void> {
    await dataService.updateSubmissionStatus(
      homeworkId,
      studentId,
      status,
      score,
      feedback,
      rubricScores,
      teacherName
    );

    // Sync to Supabase via server API
    try {
      await fetch(`/api/homeworks/${homeworkId}/submissions/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          status,
          score,
          feedback,
          rubricScores,
          teacherName
        })
      });
    } catch (err) {
      console.warn('[HomeworkService] Supabase status sync note:', err);
    }
  }

  /**
   * Öğretmen tarafından ödev teslim durumunun, puanın veya geri bildirimin güncellenmesi.
   */
  public async updateSubmissionStatus(
    submissionId: string, 
    status: HomeworkStatus, 
    details?: {
      score?: number;
      feedback?: string;
      rubricScores?: Record<string, number>;
      teacherName?: string;
      homeworkId?: string;
      studentId?: string;
    }
  ): Promise<HomeworkSubmission | null> {
    const allSubs = dataService.getSubmissions();
    const targetSub = allSubs.find(s => s.id === submissionId) || (details?.homeworkId && details?.studentId ? allSubs.find(s => s.homeworkId === details.homeworkId && s.studentId === details.studentId) : undefined);

    const hwId = details?.homeworkId || targetSub?.homeworkId;
    const studentId = details?.studentId || targetSub?.studentId;

    if (hwId && studentId) {
      await dataService.updateSubmissionStatus(
        hwId,
        studentId,
        status,
        details?.score,
        details?.feedback,
        details?.rubricScores,
        details?.teacherName || 'Öğretmen'
      );
    }

    // Sync to Supabase via server API
    try {
      if (hwId) {
        await fetch(`/api/homeworks/${hwId}/submissions/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId,
            studentId,
            status,
            score: details?.score,
            feedback: details?.feedback,
            rubricScores: details?.rubricScores,
            teacherName: details?.teacherName
          })
        });
      }
    } catch (err) {
      console.warn('[HomeworkService] Supabase status sync note:', err);
    }

    return targetSub ? { 
      ...targetSub, 
      status, 
      score: details?.score !== undefined ? details.score : targetSub.score, 
      teacherFeedback: details?.feedback !== undefined ? details.feedback : targetSub.teacherFeedback, 
      rubricScores: details?.rubricScores !== undefined ? details.rubricScores : targetSub.rubricScores 
    } : null;
  }

  /**
   * Öğrenci tarafından ödev teslim edilmesi.
   */
  public async submitHomework(
    homeworkId: string, 
    studentId: string, 
    data: {
      studentNote?: string;
      attachments?: Attachment[];
      studentName?: string;
      schoolNumber?: string;
      classGrade?: string;
    }
  ): Promise<void> {
    if (!studentId) {
      const authErr = new Error('Ödev teslim hatası: Öğrenci kimlik doğrulaması bulunamadı (studentId boş).');
      errorMonitoringService.captureLog({
        message: authErr.message,
        category: 'auth',
        severity: 'error',
        source: 'homeworkService.submitHomework',
        metadata: { homeworkId }
      });
      throw authErr;
    }

    if (!homeworkId) {
      const hwErr = new Error('Ödev teslim hatası: Ödev kimliği (homeworkId) bulunamadı.');
      errorMonitoringService.captureLog({
        message: hwErr.message,
        category: 'homework',
        severity: 'error',
        source: 'homeworkService.submitHomework',
        metadata: { studentId }
      });
      throw hwErr;
    }

    await dataService.submitHomework(
      homeworkId, 
      studentId, 
      data.studentNote || '', 
      data.attachments || []
    );

    // Sync to Supabase & Backend with error handling
    try {
      const res = await fetch(`/api/homeworks/${homeworkId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          studentNote: data.studentNote,
          attachments: data.attachments,
          studentName: data.studentName,
          schoolNumber: data.schoolNumber,
          classGrade: data.classGrade
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData.message || errorData.error || `HTTP ${res.status}`;
        console.error('[HomeworkService] Ödev sunucu teslim hatası:', errMsg);
        errorMonitoringService.captureLog({
          message: `Ödev tesliminde sunucu yazma hatası: ${errMsg}`,
          category: 'database',
          severity: 'error',
          source: 'homeworkService.submitHomework',
          metadata: { homeworkId, studentId, statusCode: res.status }
        });
      }
    } catch (err: any) {
      console.warn('[HomeworkService] Supabase submit note:', err);
      errorMonitoringService.captureLog({
        message: `Ödev tesliminde ağ bağlantısı hatası: ${err?.message || err}`,
        category: 'network',
        severity: 'warn',
        source: 'homeworkService.submitHomework',
        metadata: { homeworkId, studentId }
      });
    }
  }

  /**
   * Gerçek zamanlı değişiklikleri dinlemek için abone olur.
   */
  public subscribe(listener: () => void): () => void {
    return dataService.subscribe(listener);
  }
}

export const homeworkService = HomeworkService.getInstance();
