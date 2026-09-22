import { SystemErrorLog, ErrorSeverity, ErrorCategory } from '../types';

const ERROR_LOGS_KEY = 'gnsial_system_error_logs_v1';
const MAX_LOGS = 150;

class ErrorMonitoringService {
  private logs: SystemErrorLog[] = [];
  private listeners: Set<() => void> = new Set();
  private isInitialized: boolean = false;
  private originalConsoleError: ((...args: any[]) => void) | null = null;

  constructor() {
    this.logs = this.loadLogsFromStorage();
  }

  public init(getCurrentUser?: () => { uid?: string; role?: string } | null) {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Intercept Global Window Errors
    window.addEventListener('error', (event) => {
      // Ignore benign Vite HMR errors per environment constraints
      if (event.message && event.message.includes('[vite] failed to connect to websocket')) {
        return;
      }

      const user = getCurrentUser ? getCurrentUser() : null;
      this.captureLog({
        message: event.message || 'Bilinmeyen Pencere Hatası (Window Error)',
        category: this.detectCategory(event.message, event.filename),
        severity: 'error',
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : 'window.onerror',
        stack: event.error?.stack || undefined,
        userId: user?.uid,
        userRole: user?.role,
        path: window.location.pathname
      });
    });

    // 2. Intercept Unhandled Promise Rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      let msg = 'İşlenmemiş Promise Reddi (Unhandled Rejection)';
      let stack: string | undefined;

      if (typeof reason === 'string') {
        msg = reason;
      } else if (reason instanceof Error) {
        msg = reason.message;
        stack = reason.stack;
      } else if (reason && typeof reason === 'object') {
        msg = reason.message || JSON.stringify(reason);
      }

      if (msg.includes('[vite]') || msg.includes('websocket')) {
        return;
      }

      const user = getCurrentUser ? getCurrentUser() : null;
      this.captureLog({
        message: msg,
        category: this.detectCategory(msg),
        severity: 'error',
        source: 'unhandledrejection',
        stack,
        userId: user?.uid,
        userRole: user?.role,
        path: window.location.pathname
      });
    });

    // 3. Intercept console.error to catch silent DB and API errors
    if (!this.originalConsoleError && window.console && window.console.error) {
      this.originalConsoleError = window.console.error.bind(window.console);
      window.console.error = (...args: any[]) => {
        // Always invoke the real console.error first
        if (this.originalConsoleError) {
          this.originalConsoleError(...args);
        }

        try {
          const firstArg = args[0];
          const rawMessage = args.map(a => {
            if (typeof a === 'string') return a;
            if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack || ''}`;
            try { return JSON.stringify(a); } catch { return String(a); }
          }).join(' ');

          // Skip benign websocket error messages
          if (rawMessage.includes('[vite]') || rawMessage.includes('websocket')) {
            return;
          }

          const user = getCurrentUser ? getCurrentUser() : null;
          const stack = firstArg instanceof Error ? firstArg.stack : new Error().stack;

          this.captureLog({
            message: rawMessage.substring(0, 500) || 'Konsol Hatası',
            category: this.detectCategory(rawMessage),
            severity: 'error',
            source: 'console.error',
            stack: stack ? stack.split('\n').slice(2, 8).join('\n') : undefined,
            userId: user?.uid,
            userRole: user?.role,
            path: typeof window !== 'undefined' ? window.location.pathname : '/'
          });
        } catch {}
      };
    }

    // Pull any existing logs stored on server
    this.syncFromServer().catch(() => {});
  }

  private detectCategory(message?: string, source?: string): ErrorCategory {
    const text = `${message || ''} ${source || ''}`.toLowerCase();
    if (text.includes('homework') || text.includes('odev') || text.includes('submission') || text.includes('assignment')) {
      return 'homework';
    }
    if (text.includes('firestore') || text.includes('supabase') || text.includes('database') || text.includes('sql') || text.includes('setdoc') || text.includes('relation')) {
      return 'database';
    }
    if (text.includes('fetch') || text.includes('network') || text.includes('http') || text.includes('timeout') || text.includes('connection')) {
      return 'network';
    }
    if (text.includes('auth') || text.includes('permission') || text.includes('unauthorized') || text.includes('token') || text.includes('rls')) {
      return 'auth';
    }
    return 'runtime';
  }

  public captureLog(data: Omit<SystemErrorLog, 'id' | 'timestamp' | 'resolved'>): SystemErrorLog {
    const nowIso = new Date().toISOString();
    const newLog: SystemErrorLog = {
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: nowIso,
      resolved: false,
      ...data
    };

    // Deduplicate identical messages occurring within 2 seconds
    const recentDuplicate = this.logs[0];
    if (recentDuplicate && recentDuplicate.message === newLog.message && 
        (Date.now() - new Date(recentDuplicate.timestamp).getTime()) < 2000) {
      return recentDuplicate;
    }

    this.logs.unshift(newLog);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    this.saveLogsToStorage();
    this.notify();

    // Asynchronously dispatch to server API
    this.sendToServer(newLog);

    return newLog;
  }

  public logCustomError(message: string, category: ErrorCategory = 'system', metadata?: Record<string, any>) {
    return this.captureLog({
      message,
      category,
      severity: 'error',
      source: 'custom_logger',
      metadata
    });
  }

  public logWarning(message: string, category: ErrorCategory = 'system', metadata?: Record<string, any>) {
    return this.captureLog({
      message,
      category,
      severity: 'warn',
      source: 'warning_logger',
      metadata
    });
  }

  public triggerTestError(): SystemErrorLog {
    return this.captureLog({
      message: 'Test Hatası: Sistem Hata İzleme modülü başarıyla canlı konsol ve API loglarını yakalıyor.',
      category: 'homework',
      severity: 'warn',
      source: 'Sistem Test Butonu (Admin Diagnostics)',
      metadata: {
        testTimestamp: new Date().toISOString(),
        testBrowser: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
      }
    });
  }

  private async sendToServer(log: SystemErrorLog) {
    try {
      await fetch('/api/system-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
    } catch {
      // Fire-and-forget: ignore fetch errors so reporting never creates infinite recursion
    }
  }

  public async syncFromServer(): Promise<void> {
    try {
      const res = await fetch('/api/system-logs');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs) && data.logs.length > 0) {
          const merged = [...data.logs];
          for (const local of this.logs) {
            if (!merged.some(m => m.id === local.id)) {
              merged.push(local);
            }
          }
          merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          this.logs = merged.slice(0, MAX_LOGS);
          this.saveLogsToStorage();
          this.notify();
        }
      }
    } catch {}
  }

  public getLogs(): SystemErrorLog[] {
    return [...this.logs];
  }

  public resolveLog(id: string) {
    this.logs = this.logs.map(l => l.id === id ? { ...l, resolved: true } : l);
    this.saveLogsToStorage();
    this.notify();
  }

  public async clearLogs(): Promise<void> {
    this.logs = [];
    this.saveLogsToStorage();
    this.notify();
    try {
      await fetch('/api/system-logs', { method: 'DELETE' });
    } catch {}
  }

  public exportLogsAsJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => {
      try { cb(); } catch {}
    });
  }

  private loadLogsFromStorage(): SystemErrorLog[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const saved = localStorage.getItem(ERROR_LOGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  private saveLogsToStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(ERROR_LOGS_KEY, JSON.stringify(this.logs));
    } catch {}
  }
}

export const errorMonitoringService = new ErrorMonitoringService();
