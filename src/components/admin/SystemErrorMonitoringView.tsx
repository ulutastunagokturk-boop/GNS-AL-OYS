import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Terminal, 
  RefreshCw, 
  Trash2, 
  Download, 
  Search, 
  CheckCircle, 
  Clock, 
  Database, 
  BookOpen, 
  ShieldAlert, 
  WifiOff, 
  ChevronDown, 
  ChevronUp, 
  Layers,
  Bug,
  Activity,
  User,
  ExternalLink
} from 'lucide-react';
import { errorMonitoringService } from '../../services/errorMonitoringService';
import { SystemErrorLog, ErrorCategory, ErrorSeverity } from '../../types';

export const SystemErrorMonitoringView: React.FC = () => {
  const [logs, setLogs] = useState<SystemErrorLog[]>(() => errorMonitoringService.getLogs());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterResolved, setFilterResolved] = useState<'all' | 'open' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const reloadLogs = () => {
    setLogs(errorMonitoringService.getLogs());
  };

  useEffect(() => {
    reloadLogs();
    const unsub = errorMonitoringService.subscribe(reloadLogs);
    // Initial fetch from backend
    errorMonitoringService.syncFromServer().then(reloadLogs).catch(() => {});
    return unsub;
  }, []);

  const showNotification = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await errorMonitoringService.syncFromServer();
      reloadLogs();
      showNotification('Hata logları sunucu ve yerel depolamadan başarıyla senkronize edildi.');
    } catch {
      showNotification('Sunucu log senkronizasyonunda geçici bağlantı sorunu.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Tüm hata loglarını silmek istediğinize emin misiniz?')) {
      await errorMonitoringService.clearLogs();
      reloadLogs();
      showNotification('Tüm hata kayıtları temizlendi.');
    }
  };

  const handleTriggerTest = () => {
    const testLog = errorMonitoringService.triggerTestError();
    reloadLogs();
    setExpandedLogId(testLog.id);
    showNotification('Test hatası oluşturuldu ve sunucuya iletildi.');
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(errorMonitoringService.exportLogsAsJson());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `gnsial_hata_loglari_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('Hata logları JSON olarak dışa aktarıldı.');
  };

  const handleResolve = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    errorMonitoringService.resolveLog(id);
    reloadLogs();
  };

  const filteredLogs = logs.filter(log => {
    if (filterCategory !== 'all' && log.category !== filterCategory) return false;
    if (filterSeverity !== 'all' && log.severity !== filterSeverity) return false;
    if (filterResolved === 'open' && log.resolved) return false;
    if (filterResolved === 'resolved' && !log.resolved) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchSrc = (log.source || '').toLowerCase().includes(q);
      const matchUser = (log.userId || '').toLowerCase().includes(q);
      const matchPath = (log.path || '').toLowerCase().includes(q);
      return matchMsg || matchSrc || matchUser || matchPath;
    }
    return true;
  });

  // Calculate statistics
  const totalCount = logs.length;
  const homeworkDbCount = logs.filter(l => l.category === 'homework' || l.category === 'database').length;
  const criticalCount = logs.filter(l => l.severity === 'error' && !l.resolved).length;
  const openCount = logs.filter(l => !l.resolved).length;

  const getCategoryBadge = (category: ErrorCategory) => {
    switch (category) {
      case 'homework':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <BookOpen className="w-3 h-3" /> Ödev Teslim
          </span>
        );
      case 'database':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
            <Database className="w-3 h-3" /> Veritabanı / Supabase
          </span>
        );
      case 'network':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300">
            <WifiOff className="w-3 h-3" /> Ağ / API
          </span>
        );
      case 'auth':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            <ShieldAlert className="w-3 h-3" /> Kimlik Doğrulama
          </span>
        );
      case 'runtime':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            <Bug className="w-3 h-3" /> Çalışma Zamanı
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'error':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 uppercase tracking-wider">
            KRİTİK
          </span>
        );
      case 'warn':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 uppercase tracking-wider">
            UYARI
          </span>
        );
      case 'info':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 uppercase tracking-wider">
            BİLGİ
          </span>
        );
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Feedback */}
      {statusNotification && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{statusNotification}</span>
          </div>
          <button 
            onClick={() => setStatusNotification(null)}
            className="text-xs text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-100 font-bold"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
              <Terminal className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Sistem Hata İzleme & Teşhis Paneli
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Konsol hataları, ödev teslim modülündeki veritabanı yazma istisnaları ve unhandled promise rejection olayları otomatik yakalanıp burada listelenir.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleTriggerTest}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Ödev teslim hatası teşhisi için örnek hata kaydı oluşturur"
          >
            <Bug className="w-3.5 h-3.5" />
            Test Hatası Gönder
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Yenile
          </button>

          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            JSON İndir
          </button>

          <button
            onClick={handleClear}
            disabled={logs.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/40 shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Temizle
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Toplam Log</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {totalCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sistem geneli kaydedilen</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <span>Kritik Hatalar</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5">
            {criticalCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Açık / çözülmemiş hata</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <span>Ödev & Veritabanı</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">
            {homeworkDbCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Supabase / Firestore / Teslim</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <span>İnceleme Bekleyen</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
            {openCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Aktif incelenmesi gereken</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Hata mesajı, kaynak dosya, öğrenci kimliği veya yol ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Tüm Kategoriler</option>
            <option value="homework">Ödev Teslim</option>
            <option value="database">Veritabanı / Supabase</option>
            <option value="network">Ağ / API</option>
            <option value="auth">Kimlik Doğrulama</option>
            <option value="runtime">Çalışma Zamanı</option>
          </select>

          {/* Severity */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Tüm Önem Dereceleri</option>
            <option value="error">Yalnızca Hatalar (Error)</option>
            <option value="warn">Yalnızca Uyarılar (Warn)</option>
            <option value="info">Bilgilendirmeler (Info)</option>
          </select>

          {/* Status */}
          <select
            value={filterResolved}
            onChange={(e) => setFilterResolved(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="open">Açık / Çözülmemiş</option>
            <option value="resolved">İncelendi / Çözüldü</option>
          </select>
        </div>
      </div>

      {/* Error Logs List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Herhangi Bir Hata Kaydı Bulunmuyor
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Sistem sağlıklı çalışıyor. Ödev teslim veya veritabanı işlemlerinde oluşabilecek yeni istisnalar burada anında görüntülenecektir.
            </p>
            <button
              onClick={handleTriggerTest}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Test Hata Kaydı Oluştur
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLogs.map(log => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div 
                  key={log.id} 
                  className={`p-4 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                    log.resolved ? 'opacity-60 bg-slate-50/30 dark:bg-slate-900/30' : ''
                  }`}
                >
                  <div 
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getSeverityBadge(log.severity)}
                        {getCategoryBadge(log.category)}
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(log.timestamp)}
                        </span>
                        {log.resolved && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle className="w-2.5 h-2.5" /> İncelendi
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-900 dark:text-white break-words">
                        {log.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {log.source && (
                          <span className="flex items-center gap-1 truncate max-w-md">
                            <Terminal className="w-3 h-3 text-slate-400" />
                            <span className="font-mono text-[10px]">{log.source}</span>
                          </span>
                        )}
                        {log.userId && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Kullanıcı: {log.userId} {log.userRole ? `(${log.userRole})` : ''}</span>
                          </span>
                        )}
                        {log.path && (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                            <span>Sayfa: {log.path}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                      {!log.resolved && (
                        <button
                          onClick={(e) => handleResolve(log.id, e)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                        >
                          İncelendi Yap
                        </button>
                      )}
                      <button 
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title={isExpanded ? 'Detayları Gizle' : 'Detayları Göster'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details Section */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs animate-in fade-in">
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                            İlişkili Parametreler & Meta Veriler:
                          </p>
                          <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}

                      {log.stack && (
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Hata Yığın İzi (Stack Trace):
                          </p>
                          <pre className="p-3 rounded-xl bg-slate-900 text-rose-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                            {log.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
