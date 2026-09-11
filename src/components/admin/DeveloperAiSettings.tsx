import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import { dataService } from '../../services/dataService';
import { AiProviderConfig, AiDiagnosticTestResult } from '../../types';
import { 
  Zap, 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Server, 
  Key, 
  ExternalLink,
  Sparkles,
  Check,
  Copy,
  Activity,
  Cpu,
  Globe,
  Database,
  Wifi,
  HardDrive
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const DeveloperAiSettings: React.FC = () => {
  const [config, setConfig] = useState<AiProviderConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [testProvider, setTestProvider] = useState<'auto' | 'nvidia' | 'groq' | 'local'>('auto');
  const [testPrompt, setTestPrompt] = useState('GNSİAL öğrencileri için 1 cümlelik ders çalışma motivasyon sözü yaz.');
  const [testResult, setTestResult] = useState<AiDiagnosticTestResult | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Database diagnostic state
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; latencyMs: number; userCount: number; message: string; error?: string } | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [isSyncingDb, setIsSyncingDb] = useState(false);

  const handleForceSync = async () => {
    setIsSyncingDb(true);
    try {
      const res = await dataService.forceSyncAllWithFirestore();
      setDbTestResult({
        success: res.success,
        latencyMs: 0,
        userCount: res.syncedUsersCount,
        message: res.message,
        error: res.error
      });
      if (res.success) {
        try {
          confetti({ particleCount: 30, spread: 60 });
        } catch {}
      }
    } catch (e: any) {
      setDbTestResult({
        success: false,
        latencyMs: 0,
        userCount: 0,
        message: 'Eşitleme hatası: ' + (e.message || String(e))
      });
    } finally {
      setIsSyncingDb(false);
    }
  };

  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    try {
      const res = await dataService.testFirestoreConnection();
      setDbTestResult(res);
      if (res.success) {
        try {
          confetti({ particleCount: 25, spread: 50 });
        } catch {}
      }
    } catch (e: any) {
      setDbTestResult({
        success: false,
        latencyMs: 0,
        userCount: 0,
        message: 'Bağlantı testi başarısız: ' + (e.message || String(e))
      });
    } finally {
      setIsTestingDb(false);
    }
  };

  const fetchConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const cfg = await aiService.getProviderConfig();
      setConfig(cfg);
    } catch (e) {
      console.error('Config fetch failed:', e);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleRunDiagnostic = async () => {
    setIsRunningTest(true);
    setTestResult(null);
    try {
      const result = await aiService.runDiagnosticTest(
        testProvider, 
        testPrompt
      );
      setTestResult(result);
      if (result.status === 'success') {
        try {
          confetti({ particleCount: 35, spread: 60 });
        } catch {}
      }
    } catch (e: any) {
      setTestResult({
        provider: testProvider,
        model: 'Bilinmiyor',
        latencyMs: 0,
        status: 'error',
        responsePreview: '',
        error: e.message || 'Bağlantı testi başarısız oldu.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  const envSampleCode = `# NVIDIA NIM API (Birincil Bulut Zekası - build.nvidia.com)
NVIDIA_API_KEY=""

# Groq Cloud (Yüksek Hızlı Yedek Sağlayıcı - console.groq.com)
GROQ_API_KEY=""`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSampleCode);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Zap className="w-3.5 h-3.5" />
              <span>Geliştirici Ayarları & AI Gateway</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Groq Cloud AI Servis Yapılandırması (Qwen Serisi)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Uygulama harici yapay zeka sağlayıcısı olarak <strong>sadece Groq Cloud API</strong> üzerinden çalışır. Llama modelleri kullanılmaz; doğrudan yüksek performanslı <strong>Qwen (Qwen 3.8 27B / Qwen 3 32B)</strong> modelleri devrededir.
            </p>
          </div>

          <button
            onClick={fetchConfig}
            disabled={isLoadingConfig}
            className="py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer self-start md:self-center"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-300 ${isLoadingConfig ? 'animate-spin' : ''}`} />
            <span>Durumu Yenile</span>
          </button>
        </div>
      </div>

      {/* AI Service Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        
        {/* NVIDIA NIM Card */}
        <div className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 ${config?.isNvidiaConfigured ? 'border-emerald-500 shadow-md' : 'border-slate-200 dark:border-slate-800'} relative overflow-hidden flex flex-col justify-between`}>
          <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-bl-xl uppercase tracking-wider">
            {config?.isNvidiaConfigured ? 'Aktif Motor' : 'NVIDIA NIM'}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  NVIDIA NIM API
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Meta Llama 3.2 11B Vision</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Ana Model:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-[11px]">meta/llama-3.2-11b</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Yedek:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-[11px]">meta/llama-3.2-90b</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Anahtar Durumu:</span>
                {config?.isNvidiaConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" /> Tanımlı (Aktif)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    <AlertCircle className="w-3 h-3" /> .env Bekleniyor
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              NVIDIA NIM altyapısında yüksek doğruluk ve Türkçe pedagojik rehberlik sağlar.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <a
              href="https://build.nvidia.com"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              build.nvidia.com <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-400 font-mono text-[10px]">NVIDIA_API_KEY</span>
          </div>
        </div>

        {/* Groq Cloud Card (Backup Provider) */}
        <div className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 ${config?.isGroqConfigured && !config?.isNvidiaConfigured ? 'border-indigo-500 shadow-md' : 'border-slate-200 dark:border-slate-800'} relative overflow-hidden flex flex-col justify-between`}>
          <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-bl-xl uppercase tracking-wider">
            Yedek (Groq)
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  Groq Cloud API
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Qwen 3.8 27B Ultra-Hızlı LPU</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Ana Model:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-[11px]">qwen/qwen3.8-27b</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Yedek Modeller:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-[11px]">qwen/qwen3.6-27b / compound-mini</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Anahtar Durumu:</span>
                {config?.isGroqConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" /> Tanımlı (Aktif)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    <AlertCircle className="w-3 h-3" /> .env Bekleniyor
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Groq LPU donanımında saniyede 300+ token hızıyla anında yanıt verir. Llama modeli kesinlikle kullanılmaz.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
            >
              console.groq.com <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-400 font-mono text-[10px]">GROQ_API_KEY</span>
          </div>
        </div>

        {/* Live Web Search Grounding Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 px-3 py-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-black rounded-bl-xl uppercase tracking-wider">
            Canlı Arama
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Canlı Web Grounding
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">DuckDuckGo & Vikipedi</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Motor:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-[11px]">DuckDuckGo + Google RSS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Özellik:</span>
                <span className="font-bold text-sky-600 dark:text-sky-400 text-[11px]">Gerçek Zamanlı Veri</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Durum:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" /> 7/24 Aktif
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Güncel haberler, MEB kılavuzları ve anlık web aramalarında dil modeline doğrudan canlı web verisi aktarır.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-sky-600 dark:text-sky-400 font-bold">API Key Gerektirmez</span>
            <span className="text-slate-400 font-mono text-[10px]">Zero-Auth Web</span>
          </div>
        </div>

        {/* Local MEB Educational Engine */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-black rounded-bl-xl uppercase tracking-wider">
            Sıfır Kesinti Güvencesi
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  GNSİAL Yerel MEB Motoru
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Çevrimdışı Güvenlik Katmanı</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Müfredat:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-[11px]">MEB Lise Standartları</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Çalışma Modu:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">7/24 Kesintisiz</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Hata Koruması:</span>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Asla 500 hatası vermez</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              İnternet kesintisi veya harici API kotaları durumunda çalışma planları, soru çözümleri ve akademik analizleri yerel olarak üretir.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-bold">Offline Destek</span>
            <span className="text-slate-400 font-mono text-[10px]">Local Failover</span>
          </div>
        </div>

      </div>

      {/* Live Diagnostic Testing Sandbox */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Canlı Yapay Zeka Teşhis & Yanıt Süresi Testi
              </h3>
              <p className="text-xs text-slate-500">NVIDIA NIM, Groq Cloud ve Yerel MEB motorunu gerçek zamanlı test edin</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(['auto', 'nvidia', 'groq', 'local'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTestProvider(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  testProvider === p
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {p === 'auto' ? '⚡ Otomatik (Kademeli)' : p === 'nvidia' ? 'NVIDIA NIM' : p === 'groq' ? 'Groq Cloud' : 'Yerel Motor'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Test edilecek soru veya komutu yazın..."
              className="flex-1 p-3 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
            <button
              onClick={handleRunDiagnostic}
              disabled={isRunningTest || !testPrompt.trim()}
              className="py-3 px-6 rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition cursor-pointer shrink-0"
            >
              {isRunningTest ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Test Ediliyor...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Groq API'ı Test Et</span>
                </>
              )}
            </button>
          </div>

          {/* Diagnostic Result Output Box */}
          {testResult && (
            <div className={`p-4 rounded-2xl border ${
              testResult.status === 'success'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
            } space-y-2.5 animate-in fade-in`}>
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold">
                <div className="flex items-center gap-2">
                  {testResult.status === 'success' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> BAŞARILI
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> HATA
                    </span>
                  )}
                  <span className="text-slate-800 dark:text-white font-mono">{testResult.model}</span>
                </div>

                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-500" />
                    <span>Yanıt Süresi: <strong>{testResult.latencyMs} ms</strong></span>
                  </span>
                  <span>•</span>
                  <span>{new Date(testResult.timestamp).toLocaleTimeString('tr-TR')}</span>
                </div>
              </div>

              {/* Fallback Telemetry Banner if triggered */}
              {testResult.fallbackInfo?.triggered && (
                <div className="p-2.5 rounded-xl bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <strong>Otomatik Güvenlik Katmanı Devrede:</strong> {testResult.fallbackInfo.fromProvider?.toUpperCase() || 'GROQ'} yanıt vermediği veya anahtar bulunmadığı için{' '}
                    <strong className="text-indigo-700 dark:text-indigo-300 underline">{testResult.fallbackInfo.toProvider?.toUpperCase() || 'YEREL MOTOR'}</strong> yanıt üretti.
                    {testResult.fallbackInfo.reason && (
                      <span className="block text-[11px] text-amber-700 dark:text-amber-300/80 font-mono mt-0.5">
                        Gerekçe: {testResult.fallbackInfo.reason}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {testResult.responsePreview && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                  {testResult.responsePreview}
                </div>
              )}

              {testResult.error && (
                <div className="p-3 rounded-xl bg-rose-100/60 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 text-xs font-mono">
                  {testResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Environment Configuration Guide */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Ortam Değişkenleri (.env) Tanımlama Rehberi
              </h3>
              <p className="text-xs text-slate-500">Groq API anahtarınızı Settings &gt; Secrets veya .env dosyasından yönetebilirsiniz</p>
            </div>
          </div>

          <button
            onClick={handleCopyEnv}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            {copiedEnv ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Kopyala</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
          <pre>{envSampleCode}</pre>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-white block mb-1">Groq API Anahtarı Nasıl Alınır?</strong>
          <span><a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-semibold">console.groq.com</a> adresine gidip ücretsiz hesap oluşturarak saniyeler içinde API Key alabilirsiniz. Aldığınız anahtarı Settings sekmesinden veya .env dosyasına <code className="text-slate-800 dark:text-slate-200 font-mono font-bold">GROQ_API_KEY</code> olarak eklemeniz yeterlidir.</span>
        </div>
      </div>

      {/* Cloud Database Architecture & Status (Firebase Firestore) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                Bulut Veritabanı & Kalıcı Bellek
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-black border border-emerald-300 dark:border-emerald-800">
                  FIRESTORE AKTİF
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                GNSİAL sistemi Google Cloud Firestore kalıcı NoSQL veritabanı ve gerçek zamanlı (real-time) dinleyicilerle çalışır.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleForceSync}
              disabled={isSyncingDb}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSyncingDb ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Bulut Eşitleniyor...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tüm Verileri Buluta Eşitle (Senkronize Et)</span>
                </>
              )}
            </button>

            <button
              onClick={handleTestDatabase}
              disabled={isTestingDb}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isTestingDb ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Firestore Test Ediliyor...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Bağlantıyı Test Et</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Database Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-slate-400 font-medium block text-[11px] mb-1">Bulut Sağlayıcı</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-amber-500" />
              Google Cloud Firestore
            </span>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">studio-5738695585-af4f5</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-slate-400 font-medium block text-[11px] mb-1">Eşzamanlama Mimarisi</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-500" />
              Local-First + Realtime Sync
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">Anlık onSnapshot kanalları</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-slate-400 font-medium block text-[11px] mb-1">Koleksiyonlar</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Kullanıcılar, Sınıflar, Ödevler, Notlar
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">Tüm veriler kalıcı depolanır</span>
          </div>
        </div>

        {/* Database Diagnostic Result */}
        {dbTestResult && (
          <div className={`p-4 rounded-2xl border ${
            dbTestResult.success 
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' 
              : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
          } text-xs space-y-1.5 animate-in fade-in`}>
            <div className="flex items-center justify-between">
              <span className={`font-bold flex items-center gap-1.5 ${dbTestResult.success ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                {dbTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                {dbTestResult.message}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Gecikme: <strong>{dbTestResult.latencyMs} ms</strong>
              </span>
            </div>
            {dbTestResult.error && (
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 font-mono text-[11px]">
                {dbTestResult.error}
              </div>
            )}
          </div>
        )}

        {/* Note on Supabase / Cloud SQL */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
          <strong>Supabase / İlişkisel Veritabanı Bilgilendirmesi:</strong>
          <p className="mt-1 leading-relaxed text-[11px] text-amber-800 dark:text-amber-300">
            Platform ortamında ilişkisel SQL (Cloud SQL / Supabase) kullanımı için aktif bir faturalandırılmış Google Cloud projesi gerekmektedir (şu an ortamda <code>NO_VALID_PROJECT</code> durumundadır). Bu nedenle sistem, Google Cloud altyapısında hazır ve aktif olan <strong>Firebase Firestore</strong> veritabanı üzerinde çalışmaya devam etmektedir. Tüm veriler (öğrenciler, öğretmenler, şubeler, ödevler, notlar, sohbetler ve ders programları) Firestore üzerinde güvenli ve kalıcı olarak senkronize edilmektedir.
          </p>
        </div>
      </div>

    </div>
  );
};
