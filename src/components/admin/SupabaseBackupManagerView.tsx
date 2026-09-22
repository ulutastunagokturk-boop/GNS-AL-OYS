import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Copy, 
  Check, 
  ShieldCheck, 
  ExternalLink,
  Layers,
  ArrowUpRight,
  HardDriveDownload,
  Activity
} from 'lucide-react';
import { supabaseBackupService } from '../../services/supabaseService';
import { dataService } from '../../services/dataService';
import { SupabaseBackupStatus, SupabaseBackupRecord } from '../../types';

export const SupabaseBackupManagerView: React.FC = () => {
  const [status, setStatus] = useState<SupabaseBackupStatus | null>(null);
  const [recentBackups, setRecentBackups] = useState<SupabaseBackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  // Google Cloud Firestore Live States
  const [firestoreStats, setFirestoreStats] = useState<{
    users: number;
    classes: number;
    announcements: number;
    homeworks: number;
    grades: number;
    attendance: number;
    schedules: number;
  } | null>(null);
  const [isFirestoreSyncing, setIsFirestoreSyncing] = useState(false);
  const [isFirestorePulling, setIsFirestorePulling] = useState(false);
  const [isFirestoreTesting, setIsFirestoreTesting] = useState(false);
  const [firestoreTestResult, setFirestoreTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs: number;
  } | null>(null);

  const loadStatusAndHistory = async () => {
    setIsLoading(true);
    try {
      const [currentStatus, history, fStats] = await Promise.all([
        supabaseBackupService.getStatus(),
        supabaseBackupService.getRecentBackups(),
        dataService.getFirestoreStats()
      ]);
      setStatus(currentStatus);
      setRecentBackups(history);
      setFirestoreStats(fStats);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatusAndHistory();
    // Test initial connection
    dataService.testFirestoreConnection().then(res => setFirestoreTestResult(res)).catch(() => {});

    const unsubscribe = supabaseBackupService.subscribe(() => {
      setIsSyncing(supabaseBackupService.getIsSyncing());
    });
    return () => unsubscribe();
  }, []);

  const handleFirestoreSyncAll = async () => {
    setIsFirestoreSyncing(true);
    setActionFeedback(null);
    try {
      const result = await dataService.forceSyncAllWithFirestore();
      if (result.success) {
        setActionFeedback({
          type: 'success',
          message: result.message
        });
        const updatedStats = await dataService.getFirestoreStats();
        setFirestoreStats(updatedStats);
      } else {
        setActionFeedback({
          type: 'error',
          message: result.message || 'Firestore eşitleme hatası.'
        });
      }
    } catch (e: any) {
      setActionFeedback({
        type: 'error',
        message: 'Bulut eşitleme hatası: ' + (e?.message || String(e))
      });
    } finally {
      setIsFirestoreSyncing(false);
    }
  };

  const handleFirestorePullAll = async () => {
    setIsFirestorePulling(true);
    setActionFeedback(null);
    try {
      const result = await dataService.pullAllFromFirestore();
      if (result.success) {
        setActionFeedback({
          type: 'success',
          message: result.message
        });
        const updatedStats = await dataService.getFirestoreStats();
        setFirestoreStats(updatedStats);
      } else {
        setActionFeedback({
          type: 'error',
          message: result.message || 'Buluttan veri çekme hatası.'
        });
      }
    } catch (e: any) {
      setActionFeedback({
        type: 'error',
        message: 'Veri çekme hatası: ' + (e?.message || String(e))
      });
    } finally {
      setIsFirestorePulling(false);
    }
  };

  const handleFirestoreTestPing = async () => {
    setIsFirestoreTesting(true);
    setFirestoreTestResult(null);
    try {
      const res = await dataService.testFirestoreConnection();
      setFirestoreTestResult(res);
      const updatedStats = await dataService.getFirestoreStats();
      setFirestoreStats(updatedStats);
    } catch (e: any) {
      setFirestoreTestResult({
        success: false,
        message: 'Bağlantı hatası: ' + (e?.message || String(e)),
        latencyMs: 0
      });
    } finally {
      setIsFirestoreTesting(false);
    }
  };

  const [isTableSyncing, setIsTableSyncing] = useState(false);

  const handleTableSyncAll = async () => {
    setIsTableSyncing(true);
    setActionFeedback(null);
    try {
      const res = await dataService.triggerSupabaseTableSync();
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: res.message || 'Tüm okul verileri doğrudan Supabase ilişkisel tablolarına başarıyla yazıldı!'
        });
        await loadStatusAndHistory();
      } else {
        setActionFeedback({
          type: 'error',
          message: res.message || 'Supabase tablolarına yazma başarısız oldu.'
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Eşitleme sırasında hata oluştu.'
      });
    } finally {
      setIsTableSyncing(false);
    }
  };

  const handlePullFromSupabase = async () => {
    setIsTableSyncing(true);
    setActionFeedback(null);
    try {
      const ok = await dataService.syncFromSupabaseDatabase();
      if (ok) {
        setActionFeedback({
          type: 'success',
          message: 'Supabase PostgreSQL veritabanından en güncel veriler başarıyla çekilerek arayüze yüklendi!'
        });
        await loadStatusAndHistory();
      } else {
        setActionFeedback({
          type: 'error',
          message: 'Supabase veritabanından veri alınamadı veya veritabanı henüz boş.'
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Veri çekme sırasında hata oluştu.'
      });
    } finally {
      setIsTableSyncing(false);
    }
  };

  const handleManualBackup = async () => {
    setIsSyncing(true);
    setActionFeedback(null);
    try {
      const result = await dataService.triggerSupabaseBackup('manual');
      if (result.success) {
        setActionFeedback({
          type: 'success',
          message: result.message || 'Veritabanı anlık görüntüsü başarıyla Supabase PostgreSQL deposuna aktarıldı!'
        });
        await loadStatusAndHistory();
      } else {
        setActionFeedback({
          type: 'error',
          message: result.message || 'Yedekleme tamamlanamadı.'
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Yedekleme sırasında beklenmeyen bir hata oluştu.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await supabaseBackupService.testConnection();
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Bağlantı hatası.',
        latencyMs: 0
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopySql = () => {
    if (status?.setupSql) {
      navigator.clipboard.writeText(status.setupSql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const formatDateTime = (isoStr?: string | null) => {
    if (!isoStr) return 'Henüz yedek alınmadı';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* GOOGLE CLOUD FIRESTORE PRIMARY CLOUD CARD */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/70 rounded-3xl p-6 sm:p-7 border border-blue-500/30 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold tracking-wide">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>Google Cloud Firestore</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Canlı Bulut Senkronizasyonu Aktif</span>
              </span>
              {firestoreTestResult?.latencyMs !== undefined && firestoreTestResult.latencyMs > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {firestoreTestResult.latencyMs} ms
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Google Cloud Firestore Canlı Veri Yönetimi
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Kullanıcılar, sınıflar, duyurular, ödevler ve notlar Google Cloud Firestore sunucularında kalıcı olarak saklanır. Değişiklikler anlık olarak diğer cihazlara iletilir.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleFirestoreTestPing}
              disabled={isFirestoreTesting}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Google Cloud Firestore bağlantısını test eder ve yanıt süresini ölçer"
            >
              <Activity className={`w-4 h-4 text-emerald-400 ${isFirestoreTesting ? 'animate-spin' : ''}`} />
              <span>{isFirestoreTesting ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}</span>
            </button>

            <button
              onClick={handleFirestorePullAll}
              disabled={isFirestorePulling || isFirestoreSyncing}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Google Cloud Firestore'daki tüm verileri çekerek yerel arayüzü günceller"
            >
              <HardDriveDownload className={`w-4 h-4 text-indigo-400 ${isFirestorePulling ? 'animate-bounce' : ''}`} />
              <span>{isFirestorePulling ? 'İndiriliyor...' : 'Buluttan Verileri Çek'}</span>
            </button>

            <button
              onClick={handleFirestoreSyncAll}
              disabled={isFirestoreSyncing || isFirestorePulling}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Tüm kullanıcı, sınıf, duyuru, ödev, not ve ders programlarını Firestore'a aktarır"
            >
              <RefreshCw className={`w-4 h-4 ${isFirestoreSyncing ? 'animate-spin' : ''}`} />
              <span>{isFirestoreSyncing ? 'Buluta Aktarılıyor...' : 'Tümünü Firestore\'a Yükle'}</span>
            </button>
          </div>
        </div>

        {/* Firestore Stats Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kullanıcılar</span>
            <span className="text-lg font-black text-white">{firestoreStats?.users ?? '-'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sınıflar</span>
            <span className="text-lg font-black text-white">{firestoreStats?.classes ?? '-'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duyurular</span>
            <span className="text-lg font-black text-white">{firestoreStats?.announcements ?? '-'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ödevler</span>
            <span className="text-lg font-black text-white">{firestoreStats?.homeworks ?? '-'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Notlar</span>
            <span className="text-lg font-black text-white">{firestoreStats?.grades ?? '-'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Yoklama</span>
            <span className="text-lg font-black text-white">{firestoreStats?.attendance ?? '-'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Program Slotu</span>
            <span className="text-lg font-black text-white">{firestoreStats?.schedules ?? '-'}</span>
          </div>
        </div>

        {/* Firestore Ping Result */}
        {firestoreTestResult && (
          <div className={`mt-3 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
            firestoreTestResult.success 
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20' 
              : 'bg-rose-950/40 text-rose-300 border border-rose-500/20'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{firestoreTestResult.message}</span>
            </div>
            {firestoreTestResult.latencyMs > 0 && (
              <span className="font-mono text-[11px] opacity-75">{firestoreTestResult.latencyMs} ms</span>
            )}
          </div>
        )}
      </div>

      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 rounded-3xl p-6 border border-emerald-500/20 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>İkincil Bağımsız Bulut Yedekleme (PostgreSQL)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Supabase Otomatik Bulut Yedekleme
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Sistemdeki tüm öğrenci kayıtları, ders programları, şubeler, notlar ve ödevler Firebase Firestore’a yazılırken; aynı anda arka planda Supabase PostgreSQL bulut veritabanına asenkron olarak yedeklenir.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handlePullFromSupabase}
              disabled={isTableSyncing || isSyncing}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Supabase PostgreSQL tablolarındaki güncel verileri yerel ekrana yükler"
            >
              <HardDriveDownload className={`w-4 h-4 text-indigo-400 ${isTableSyncing ? 'animate-bounce' : ''}`} />
              <span>{isTableSyncing ? 'Yükleniyor...' : 'Veritabanından Çek'}</span>
            </button>

            <button
              onClick={handleTableSyncAll}
              disabled={isTableSyncing || isSyncing}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Tüm verileri Supabase profiles, classes, assignments, grades tablolarına doğrudan yazar"
            >
              <Database className={`w-4 h-4 ${isTableSyncing ? 'animate-spin' : ''}`} />
              <span>{isTableSyncing ? 'Tablolara Yazılıyor...' : 'Tablolara Yaz & Eşitle'}</span>
            </button>

            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 text-emerald-400 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}</span>
            </button>

            <button
              onClick={handleManualBackup}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Yedekleniyor...' : 'Şimdi Yedekle'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Feedback alert */}
      {actionFeedback && (
        <div className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button 
            onClick={() => setActionFeedback(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Test Result Alert */}
      {testResult && (
        <div className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 ${
          testResult.success
            ? 'bg-slate-900 border-emerald-500/30 text-emerald-300'
            : 'bg-slate-900 border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{testResult.message}</p>
              {testResult.latencyMs > 0 && (
                <p className="text-xs opacity-75 mt-0.5">Yanıt Süresi (Latency): {testResult.latencyMs} ms</p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setTestResult(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer text-white"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-500" />
              Entegrasyon Durumu
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${
              status?.configured ? 'bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse' : 'bg-amber-500 ring-4 ring-amber-500/20'
            }`} />
          </div>
          <p className="text-base font-black text-slate-900 dark:text-white">
            {status?.configured ? 'Bağlantı Hazır (Aktif)' : 'Anahtarlar Bekleniyor'}
          </p>
          <p className="text-xs text-slate-400">
            {status?.configured ? (status.maskedUrl || 'Supabase Endpoint Aktif') : 'SUPABASE_URL & ANON_KEY tanımlanmalı'}
          </p>
        </div>

        {/* Last Sync */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-500" />
            Son Yedekleme Zamanı
          </span>
          <p className="text-sm font-black text-slate-900 dark:text-white">
            {formatDateTime(status?.lastBackupAt)}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800">
              {status?.lastBackupType === 'manual' ? 'Manuel' : 'Otomatik Asenkron'}
            </span>
            <span>arka plan sync</span>
          </div>
        </div>

        {/* Auto Sync State */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Otomatik Çift Yazma
          </span>
          <p className="text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span>Devrede</span>
            <span className="text-xs font-normal text-slate-400">(Debounced 8s)</span>
          </p>
          <p className="text-xs text-slate-400">
            Firestore her güncellendiğinde sıfır gecikmeyle Supabase’e aktarılır.
          </p>
        </div>

        {/* Total Backups */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-500" />
            Kayıtlı Yedek Havuzu
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {status?.totalBackupsCount || recentBackups.length || 0}
          </p>
          <p className="text-xs text-slate-400">
            PostgreSQL snapshot versiyonu
          </p>
        </div>
      </div>

      {/* Supabase Relational Database Tables Status */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Supabase İlişkisel Veritabanı Tabloları (Canlı Veriler)
              </h3>
              <p className="text-xs text-slate-500">
                Veriler doğrudan Supabase PostgreSQL tablolarında saklanır ve cihazlar arasında canlı olarak okunur.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTableSyncAll}
              disabled={isTableSyncing}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTableSyncing ? 'animate-spin' : ''}`} />
              <span>{isTableSyncing ? 'Eşitleniyor...' : 'Tüm Tabloları Eşitle'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              name: 'profiles',
              label: 'Kullanıcılar',
              desc: 'Tüm Hesaplar',
              count: status?.tableCounts?.profiles ?? 0,
              badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            },
            {
              name: 'parents',
              label: 'Veliler',
              desc: 'Veli Hesapları',
              count: status?.tableCounts?.parents ?? 0,
              badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            },
            {
              name: 'students',
              label: 'Öğrenciler',
              desc: 'Öğrenci Kayıtları',
              count: status?.tableCounts?.students ?? 0,
              badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            },
            {
              name: 'parent_student_relations',
              label: 'Veli-Öğrenci Bağı',
              desc: 'RLS Yetki İlişkisi',
              count: status?.tableCounts?.parentRelations ?? 0,
              badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
            },
            {
              name: 'classes',
              label: 'Sınıflar',
              desc: 'Şubeler & Düzeyler',
              count: status?.tableCounts?.classes ?? 0,
              badgeColor: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
            },
            {
              name: 'grades',
              label: 'Notlar (RLS)',
              desc: 'Veliye İzolasyonlu',
              count: status?.tableCounts?.grades ?? 0,
              badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            },
            {
              name: 'attendance_records',
              label: 'Yoklama (RLS)',
              desc: 'Veliye İzolasyonlu',
              count: status?.tableCounts?.attendance ?? 0,
              badgeColor: 'bg-teal-500/10 text-teal-500 border-teal-500/20'
            },
            {
              name: 'assignments',
              label: 'Ödevler',
              desc: 'Verilen Ödevler',
              count: status?.tableCounts?.assignments ?? 0,
              badgeColor: 'bg-sky-500/10 text-sky-500 border-sky-500/20'
            },
            {
              name: 'submissions',
              label: 'Teslimler',
              desc: 'Öğrenci Teslimi',
              count: status?.tableCounts?.submissions ?? 0,
              badgeColor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
            },
            {
              name: 'announcements',
              label: 'Duyurular',
              desc: 'Okul Bülteni',
              count: status?.tableCounts?.announcements ?? 0,
              badgeColor: 'bg-violet-500/10 text-violet-500 border-violet-500/20'
            }
          ].map(table => (
            <div 
              key={table.name} 
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                  {table.label}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${table.badgeColor}`}>
                  {table.count > 0 ? 'Aktif' : 'Boş'}
                </span>
              </div>
              <div>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {table.count}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  table: {table.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row Level Security (RLS) Veli-Öğrenci Güvenlik Mimarisi */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Veli - Öğrenci Row Level Security (RLS) Güvenlik Kuralları
              </h3>
              <p className="text-xs text-slate-500">
                Veritabanı düzeyinde izolasyon: Veliler yalnızca kendi çocuklarının not ve devamsızlık kayıtlarına erişebilir.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              RLS Aktif & Denetimli
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>1. Veli - Öğrenci Eşleşmesi</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <code className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-bold">parent_student_relations</code> tablosu üzerinden her veli yalnızca kendi çocuğunun ID'si veya okul numarasıyla eşleştirilir.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span>2. Notlar İzolasyonu (grades)</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              RLS Policy sayesinde veli SELECT sorgusu çalıştırdığında PostgreSQL sunucusu yalnızca <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">student_id IN (çocukları)</code> şartını sağlayan not satırlarını döndürür.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <span>3. Devamsızlık İzolasyonu (attendance)</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Veli başka öğrencilerin devamsızlık ve izin durumlarını göremez. Yalnızca kendi çocuğunun tarih ve özür durum kayıtlarına erişir.
            </p>
          </div>
        </div>
      </div>

      {/* SQL Setup Drawer & Quick Guide */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Supabase PostgreSQL Tablo Şeması (school_backups)
              </h3>
              <p className="text-xs text-slate-500">
                Supabase panelinizde bir kez SQL Editor üzerinden bu tabloyu oluşturmanız yeterlidir.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSqlGuide(!showSqlGuide)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              {showSqlGuide ? 'Şemayı Gizle' : 'SQL Kodunu Görüntüle'}
            </button>
            <button
              onClick={handleCopySql}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>SQL'i Kopyala</span>
                </>
              )}
            </button>
          </div>
        </div>

        {showSqlGuide && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 overflow-x-auto text-xs font-mono text-emerald-400">
              <pre>{status?.setupSql || supabaseBackupService.getSetupSql()}</pre>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Supabase Dashboard &gt; <strong>SQL Editor</strong> sekmesini açıp kodu yapıştırın ve <strong>Run</strong> butonuna basın.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Backup Logs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDriveDownload className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Son Alınan Supabase Yedekleri
            </h3>
          </div>
          <button
            onClick={loadStatusAndHistory}
            disabled={isLoading}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>

        {recentBackups.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Tarih / Saat</th>
                  <th className="py-3 px-3">Yedekleme Türü</th>
                  <th className="py-3 px-3">Kullanıcı</th>
                  <th className="py-3 px-3">Şube / Sınıf</th>
                  <th className="py-3 px-3">Ders Programı</th>
                  <th className="py-3 px-3">Ödev & Not</th>
                  <th className="py-3 px-3 text-right">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {recentBackups.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.backup_type === 'manual' 
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' 
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {item.backup_type === 'manual' ? 'Manuel' : 'Otomatik'}
                      </span>
                    </td>
                    <td className="py-3 px-3">{item.stats?.totalUsers ?? '-'}</td>
                    <td className="py-3 px-3">{item.stats?.totalClasses ?? '-'}</td>
                    <td className="py-3 px-3">{item.stats?.totalSchedules ?? '-'}</td>
                    <td className="py-3 px-3">
                      {(item.stats?.totalHomeworks ?? 0) + (item.stats?.totalGrades ?? 0)} kayıt
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Güvende
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400">
            <Database className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Henüz Supabase Yedek Geçmişi Bulunmuyor
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Yukarıdaki <strong>"Şimdi Manuel Yedekle"</strong> butonuna tıklayarak ilk anlık görüntüyü hemen oluşturabilir veya sistemde veri oluşturdukça otomatik yedeğin akmasını izleyebilirsiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
