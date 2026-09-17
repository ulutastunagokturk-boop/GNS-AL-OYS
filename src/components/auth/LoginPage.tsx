import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  School, 
  Phone, 
  Hash, 
  Lock, 
  LogIn, 
  AlertCircle, 
  GraduationCap, 
  BookOpen, 
  Calendar,
  Shield,
  Clock,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  Heart,
  Users
} from 'lucide-react';

interface LoginPageProps {
  onViewSchedule?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onViewSchedule }) => {
  const { 
    loginWithPhoneOrEmail, 
    loginWithSchoolNumber,
    loginParent
  } = useAuth();

  const [loginMethod, setLoginMethod] = useState<'student_number' | 'parent' | 'staff'>('student_number');

  // Remember me / Oturumu Açık Tut state (Default: false, togglable)
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('okul_portal_remember_me_pref');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  // Login inputs
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [schoolNumber, setSchoolNumber] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  // Parent inputs
  const [parentIdentifier, setParentIdentifier] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [showParentPassword, setShowParentPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setRememberMe(checked);
    try {
      localStorage.setItem('okul_portal_remember_me_pref', checked ? 'true' : 'false');
    } catch {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (loginMethod === 'student_number') {
        if (!schoolNumber.trim()) {
          throw new Error('Lütfen okul numaranızı giriniz.');
        }
        if (!studentPassword.trim()) {
          throw new Error('Lütfen okul idareniz tarafından belirlenen öğrenci şifrenizi giriniz.');
        }
        await loginWithSchoolNumber(schoolNumber, studentPassword, rememberMe);
      } else if (loginMethod === 'parent') {
        if (!parentIdentifier.trim()) {
          throw new Error('Lütfen öğrenci okul numaranızı veya veli telefon numaranızı giriniz.');
        }
        if (!parentPassword.trim()) {
          throw new Error('Lütfen veli şifrenizi giriniz.');
        }
        await loginParent(parentIdentifier, parentPassword, rememberMe);
      } else {
        if (!phoneOrEmail.trim()) {
          throw new Error('Lütfen telefon numaranızı veya kurumsal e-posta adresinizi giriniz.');
        }
        await loginWithPhoneOrEmail(phoneOrEmail, undefined, rememberMe);
      }
    } catch (err: any) {
      setError(err.message || 'Giriş yapılamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 sm:py-10 px-4 sm:px-6">
      
      {/* Top Welcome & Institution Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-xs">
          <School className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Gaziemir Nevvar Salih İşgören Anadolu Lisesi</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Okul Yönetim & Öğrenci Portalı
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Ders programı, ödevler, sınav notları, e-yoklama ve idari yönetim sistemine erişmek için giriş yapın.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left / Main Card: Unified Login Form Container */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          
          {/* Header Title */}
          <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <LogIn className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Sisteme Giriş Yap
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tüm hesaplar Okul Yönetimi (İdare) tarafından tanımlanmaktadır.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            
            {/* Error Notification */}
            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              {/* Method selector: Öğrenci No / Veli Girişi / Öğretmen & Yönetici */}
              <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-6">
                <button
                  id="btn-login-method-schoolno"
                  type="button"
                  onClick={() => { setLoginMethod('student_number'); setError(null); }}
                  className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition cursor-pointer ${
                    loginMethod === 'student_number'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">Öğrenci</span>
                </button>

                <button
                  id="btn-login-method-parent"
                  type="button"
                  onClick={() => { setLoginMethod('parent'); setError(null); }}
                  className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition cursor-pointer ${
                    loginMethod === 'parent'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
                  <span className="truncate">Veli Portalı</span>
                </button>

                <button
                  id="btn-login-method-staff"
                  type="button"
                  onClick={() => { setLoginMethod('staff'); setError(null); }}
                  className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition cursor-pointer ${
                    loginMethod === 'staff'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="truncate">Öğretmen</span>
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {loginMethod === 'student_number' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Öğrenci Okul Numarası <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Hash className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          id="login-schoolno-input"
                          type="text"
                          placeholder="Örn: 1042"
                          value={schoolNumber}
                          onChange={(e) => setSchoolNumber(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-2xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Öğrenci Giriş Şifresi <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          İdare Tanımlı
                        </span>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          id="login-student-password-input"
                          type={showStudentPassword ? 'text' : 'password'}
                          placeholder="Okul idaresinin tanımladığı şifre"
                          value={studentPassword}
                          onChange={(e) => setStudentPassword(e.target.value)}
                          required
                          className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-2xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowStudentPassword(!showStudentPassword)}
                          className="absolute right-3 top-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                          title={showStudentPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                        >
                          {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                        <span className="text-amber-500">ℹ️</span>
                        <span>Şifrenizi bilmiyorsanız veya unuttuysanız lütfen okul yönetimine başvurunuz.</span>
                      </p>
                    </div>
                  </div>
                ) : loginMethod === 'parent' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Öğrenci Okul No veya Veli Telefonu <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Users className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          id="login-parent-identifier-input"
                          type="text"
                          placeholder="Örn: 1042 veya 05551234567"
                          value={parentIdentifier}
                          onChange={(e) => setParentIdentifier(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-2xs font-mono"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Öğrencinizin okul numarasını veya okula kayıtlı telefon numaranızı girebilirsiniz.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Veli Giriş Şifresi <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-rose-500" />
                          Veli Güvenliği
                        </span>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          id="login-parent-password-input"
                          type={showParentPassword ? 'text' : 'password'}
                          placeholder="Okul tarafından verilen veli şifreniz"
                          value={parentPassword}
                          onChange={(e) => setParentPassword(e.target.value)}
                          required
                          className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-2xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowParentPassword(!showParentPassword)}
                          className="absolute right-3 top-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                          title={showParentPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                        >
                          {showParentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                        💡 Veliler yalnızca kendi çocuklarının ders notlarını, devamsızlıklarını ve ödevlerini görüntüleyebilir.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Telefon Numarası veya Kurumsal E-Posta <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        id="login-staff-input"
                        type="text"
                        placeholder="Telefon numarası veya e-posta giriniz"
                        value={phoneOrEmail}
                        onChange={(e) => setPhoneOrEmail(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-2xs"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Sisteme kayıtlı telefon numaranız veya e-posta adresiniz ile giriş yapabilirsiniz.
                    </p>
                  </div>
                )}

                {/* Remember Me / Oturumu Açık Tut Checkbox */}
                <div className="pt-1 pb-2 flex items-center justify-between">
                  <label 
                    htmlFor="remember-me-checkbox"
                    className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                  >
                    <input
                      id="remember-me-checkbox"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={handleRememberMeChange}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                    />
                    <span>Oturumu açık tut (Beni Hatırla)</span>
                  </label>

                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {rememberMe ? 'Kalıcı Oturum' : 'Oturum Sonu Çıkış'}
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  id="submit-login-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm sm:text-base shadow-md shadow-indigo-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  {isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                </button>
              </form>
            </div>

          </div>
        </div>

        {/* Right Card: Institutional Guidance & Public Schedule Link */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Institutional Information & Guide */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  Giriş & Yetkilendirme Rehberi
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  GNSİAL Resmi Okul Portalı
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white font-bold block">Yönetici (İdare) Girişi:</strong>
                  <span>Okul yöneticileri, yetkili telefon numarası veya kurumsal e-posta adresi ile <strong>Öğretmen & Yönetici</strong> sekmesinden giriş yapar. Sistem yönetici yetkisini otomatik tanıyarak Yönetim Paneli'ne yönlendirir.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white font-bold block">Öğretmen Girişi:</strong>
                  <span>Okul idaresi tarafından tanımlanmış öğretmenler telefon numarası veya kurumsal e-posta ile <strong>Öğretmen & Yönetici</strong> sekmesinden giriş yapar.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white font-bold block">Öğrenci Girişi:</strong>
                  <span>Öğrenciler, kendilerine verilen okul numarası ile <strong>Öğrenci Girişi</strong> sekmesinden oturum açabilir.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white font-bold block">Hesap Tanımlama & Yönetim:</strong>
                  <span>Tüm öğrenci, öğretmen ve idari personel hesapları kurum yöneticileri tarafından tanımlanır ve yetkilendirilir.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Public Schedule Quick Access Button */}
          {onViewSchedule && (
            <div className="p-5 rounded-3xl bg-linear-to-br from-indigo-500/10 via-purple-500/5 to-slate-100 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900/60 border border-indigo-200/80 dark:border-indigo-800/60 shadow-lg space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Günlük Ders & Zil Saatleri
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    08:50 - 15:45 ders saatleri ve teneffüs çizelgesini görüntüleyin
                  </p>
                </div>
              </div>

              <button
                id="btn-public-schedule"
                type="button"
                onClick={onViewSchedule}
                className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 text-xs font-bold border border-indigo-200 dark:border-indigo-700/60 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Ders Saatlerini Görüntüle</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Support / Contact info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-center space-y-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Yeni kullanıcı açma veya şifre işlemleri için okul yönetimiyle iletişime geçebilirsiniz.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
