import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Badge, StudentBadge, LeaderboardEntry, UserProfile } from '../../types';
import { 
  Award, 
  Trophy, 
  Sparkles, 
  Flame, 
  Star, 
  CheckCircle2, 
  Lock, 
  Plus, 
  TrendingUp, 
  Medal, 
  Users, 
  UserCheck, 
  Zap, 
  ShieldCheck,
  Search,
  Filter,
  X
} from 'lucide-react';

export const AchievementsView: React.FC = () => {
  const { currentUser } = useAuth();
  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin';

  const [activeSubTab, setActiveSubTab] = useState<'my_badges' | 'leaderboard' | 'award_badge'>(
    isTeacherOrAdmin ? 'award_badge' : 'my_badges'
  );
  
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [studentBadges, setStudentBadges] = useState<StudentBadge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('Tüm Okul');
  const [classes, setClasses] = useState<string[]>([]);
  
  // Teacher Award Modal State
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>('badge-on-time');
  const [awardReason, setAwardReason] = useState<string>('');
  const [customPoints, setCustomPoints] = useState<number>(50);
  const [awardSuccessMsg, setAwardSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    const badges = dataService.getBadges();
    setAllBadges(badges);

    const sBadges = currentUser?.role === 'student' 
      ? dataService.getStudentBadges(currentUser.uid)
      : dataService.getStudentBadges();
    setStudentBadges(sBadges);

    const lb = dataService.getLeaderboard(selectedClass);
    setLeaderboard(lb);

    const clsList = ['Tüm Okul', ...dataService.getClasses().map(c => c.name)];
    setClasses(clsList);
  };

  useEffect(() => {
    loadData();
    const unsub = dataService.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, [currentUser, selectedClass]);

  const students = dataService.getStudents();
  const currentStudent = currentUser?.role === 'student' ? currentUser : undefined;
  
  const userXp = currentStudent?.totalXp || 100;
  const userLevel = currentStudent?.level || Math.min(10, Math.floor(userXp / 150) + 1);
  const nextLevelXp = userLevel * 150;
  const currentLevelBaseXp = (userLevel - 1) * 150;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((userXp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp)) * 100)));

  const handleAwardBadgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || !selectedBadgeId || !currentUser) return;

    const awarded = await dataService.awardBadgeToStudent(
      targetStudentId,
      selectedBadgeId,
      currentUser.displayName,
      awardReason.trim() || undefined
    );

    if (awarded) {
      setAwardSuccessMsg(`${awarded.studentName} öğrencisine "${awarded.badge.name}" rozeti başarıyla verildi!`);
      setAwardReason('');
      setIsAwardModalOpen(false);
      setTimeout(() => setAwardSuccessMsg(null), 4000);
    } else {
      alert('Bu öğrenci zaten bu rozete sahip veya rozet verilemedi.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Gamification Status */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-indigo-200 backdrop-blur-xs border border-white/10">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              GNSİAL Başarı ve Rozet Sistemi
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {currentUser?.role === 'student' 
                ? `Tebrikler, ${currentUser.displayName}! 🌟` 
                : 'Öğrenci Başarı ve Gamification Yönetimi'}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed">
              {currentUser?.role === 'student'
                ? 'Ödevleri zamanında teslim ederek, sınav başarısı göstererek ve devamsızlık yapmayarak puan ve sanal rozetler kazanın.'
                : 'Öğrencilerin akademik ve sosyal başarılarını takdir edin, rozetler ve deneyim puanları (XP) vererek motivasyonlarını artırın.'}
            </p>
          </div>

          {/* Student XP Card or Teacher Quick Award Button */}
          {currentUser?.role === 'student' ? (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 w-full md:w-72 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-200">Seviye {userLevel} Öğrenci</span>
                <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-amber-300" />
                  {userXp} XP
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-indigo-200">
                <span>{userXp - currentLevelBaseXp} / {nextLevelXp - currentLevelBaseXp} XP</span>
                <span>Seviye {userLevel + 1}'e %{progressPercent}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAwardModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-400/20 transition transform active:scale-95 shrink-0"
            >
              <Award className="w-4 h-4" />
              Öğrenciye Rozet Ver
            </button>
          )}
        </div>
      </div>

      {awardSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {awardSuccessMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          {currentUser?.role === 'student' && (
            <button
              onClick={() => setActiveSubTab('my_badges')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'my_badges'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4" />
              Kazanılan Rozetler ({studentBadges.length})
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'leaderboard'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Okul & Şube Sıralaması (Liderlik)
          </button>

          {isTeacherOrAdmin && (
            <button
              onClick={() => setActiveSubTab('award_badge')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'award_badge'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4" />
              Rozet Tanımları & Verilenler ({dataService.getStudentBadges().length})
            </button>
          )}
        </div>

        {/* Filter by class for leaderboard */}
        {activeSubTab === 'leaderboard' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Şube:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {classes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* CONTENT: My Badges (Student View) */}
      {activeSubTab === 'my_badges' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allBadges.map(badge => {
              const earnedRecord = studentBadges.find(sb => sb.badgeId === badge.id);
              const isEarned = !!earnedRecord;

              return (
                <div
                  key={badge.id}
                  className={`p-5 rounded-3xl border transition-all duration-200 relative overflow-hidden ${
                    isEarned
                      ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/60 shadow-sm'
                      : 'bg-slate-50/70 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                      isEarned ? 'bg-indigo-50 dark:bg-indigo-950/60' : 'bg-slate-200 dark:bg-slate-800 grayscale'
                    }`}>
                      {badge.icon}
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        isEarned 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {isEarned ? '✓ Kazanıldı' : <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Kilitli</span>}
                      </span>
                      <span className="text-[10px] font-bold text-amber-500 mt-1">
                        +{badge.points} XP
                      </span>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {badge.name}
                  </h3>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {badge.description}
                  </p>

                  {isEarned && earnedRecord && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Veren:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{earnedRecord.awardedBy}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Tarih:</span>
                        <span>{new Date(earnedRecord.awardedAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                      {earnedRecord.reason && (
                        <p className="italic text-indigo-600 dark:text-indigo-400 pt-1">
                          "{earnedRecord.reason}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* CONTENT: Leaderboard Tab */}
      {activeSubTab === 'leaderboard' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-500" />
                Öğrenci Başarı Sıralaması ({selectedClass})
              </h3>
              <p className="text-xs text-slate-500">
                Ödev teslimleri, sınav notları ve kazanılan rozetlere göre güncellenen canlı sıralama.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">Sıra</th>
                  <th className="py-3.5 px-4">Öğrenci Adı</th>
                  <th className="py-3.5 px-4">Şube & No</th>
                  <th className="py-3.5 px-4 text-center">Seviye</th>
                  <th className="py-3.5 px-4 text-center">Rozet Sayısı</th>
                  <th className="py-3.5 px-4 text-center">Tamamlanan Ödev</th>
                  <th className="py-3.5 px-4 text-right">Toplam XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {leaderboard.map((entry) => {
                  const isMe = currentUser?.uid === entry.studentId;

                  return (
                    <tr 
                      key={entry.studentId}
                      className={`transition ${
                        isMe 
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 font-bold' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        {entry.rank === 1 && <span className="text-lg">🥇</span>}
                        {entry.rank === 2 && <span className="text-lg">🥈</span>}
                        {entry.rank === 3 && <span className="text-lg">🥉</span>}
                        {entry.rank > 3 && (
                          <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 inline-flex items-center justify-center font-bold text-[11px]">
                            {entry.rank}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                            {entry.studentName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {entry.studentName} {isMe && <span className="text-indigo-600 text-[10px]">(Siz)</span>}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {entry.studentClass} • #{entry.studentNumber}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900">
                          Seviye {entry.level}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {entry.badgeCount} 🏆
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-400">
                        {entry.completedHomeworkCount} Ödev
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-amber-500 text-sm">
                          {entry.totalXp} XP
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* CONTENT: Teacher Award & All Badges Directory */}
      {activeSubTab === 'award_badge' && isTeacherOrAdmin && (
        <div className="space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Sistemde Tanımlı Rozetler</h3>
              <p className="text-xs text-slate-500">Öğrencilere verilebilecek standart başarı rozetleri ve kazanım şartları.</p>
            </div>
            <button
              onClick={() => setIsAwardModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Rozet Takdim Et
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allBadges.map(badge => (
              <div 
                key={badge.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-2xl">
                      {badge.icon}
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                      +{badge.points} XP
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{badge.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{badge.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Kategori: <strong>{badge.category}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setSelectedBadgeId(badge.id);
                      setIsAwardModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Öğrenciye Ver →
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* AWARD BADGE MODAL */}
      {isAwardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Öğrenciye Rozet & XP Takdim Et</h3>
              </div>
              <button onClick={() => setIsAwardModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAwardBadgeSubmit} className="space-y-4 text-xs">
              
              {/* Select Student */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Öğrenci Seçin</label>
                <select
                  required
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Öğrenci Listesinden Seçin --</option>
                  {students.map(st => (
                    <option key={st.uid} value={st.uid}>
                      {st.displayName} ({st.classGrade} - No: {st.schoolNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Badge */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Verilecek Rozet</label>
                <select
                  value={selectedBadgeId}
                  onChange={(e) => setSelectedBadgeId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {allBadges.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.icon} {b.name} (+{b.points} XP) - {b.category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Award Reason / Teacher Note */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Takdim Gerekçesi / Tebrik Notu</label>
                <textarea
                  rows={2}
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  placeholder="Örn: 1. Dönem Matematik sınavında gösterdiği üstün başarı ve derse aktif katılımı için."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAwardModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={!targetStudentId}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold shadow-sm"
                >
                  Rozeti Takdim Et
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
