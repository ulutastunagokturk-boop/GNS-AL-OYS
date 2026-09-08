import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { AttendanceRecord } from '../../types';
import { 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Calendar, 
  ShieldAlert,
  Info
} from 'lucide-react';

export const StudentAttendance: React.FC = () => {
  const { currentUser } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  if (!currentUser) return null;

  const records = dataService.getAttendanceForStudent(currentUser.uid);

  // MEB Attendance Rules:
  // Özürsüz Devamsızlık Sınırı: 10 Gün
  // Toplam Devamsızlık Sınırı (Özürlü + Özürsüz): 30 Gün
  const absentDays = records.filter(r => r.status === 'absent').length;
  const excusedDays = records.filter(r => r.status === 'excused').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const presentDays = records.filter(r => r.status === 'present').length;

  const totalDays = records.length;
  const maxUnexcusedDays = 10;
  const remainingUnexcused = Math.max(0, maxUnexcusedDays - absentDays);

  const filteredRecords = records.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-500" />
              Devamsızlık Durumum & Yoklama Geçmişi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Okul No: <strong>#{currentUser.schoolNumber}</strong> • Sınıf: <strong>{currentUser.classGrade}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="absent">Sadece Gelmediğim Günler</option>
              <option value="excused">Raporlu / İzinli Günler</option>
              <option value="late">Geç Kaldığım Günler</option>
              <option value="present">Mevcut / Geldiğim Günler</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Metrics & Quota Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Unexcused quota */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-500" />
              Özürsüz Devamsızlık
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              Sınır: 10 Gün
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400">{absentDays}</span>
            <span className="text-xs text-slate-400 font-semibold">gün kullanıldı</span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div 
              style={{ width: `${Math.min(100, (absentDays / 10) * 100)}%` }} 
              className={`h-full transition-all duration-500 ${
                absentDays >= 8 ? 'bg-rose-600' : absentDays >= 5 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            ></div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Kalan özürsüz devamsızlık hakkınız: <strong>{remainingUnexcused} Gün</strong>
          </p>
        </div>

        {/* Excused / Leave */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Özürlü / Raporlu İzin
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Sınır: 20 Gün
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-black text-amber-500">{excusedDays}</span>
            <span className="text-xs text-slate-400 font-semibold">gün onaylı rapor</span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div 
              style={{ width: `${Math.min(100, (excusedDays / 20) * 100)}%` }} 
              className="h-full bg-amber-500 transition-all duration-500"
            ></div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Sağlık raporları ve veli izin dilekçeleri dahildir.
          </p>
        </div>

        {/* Present Days */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Okul Katılımı (Mevcut)
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Düzenli
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{presentDays}</span>
            <span className="text-xs text-slate-400 font-semibold">gün okulda bulunuldu</span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div 
              style={{ width: `${totalDays > 0 ? (presentDays / totalDays) * 100 : 100}%` }} 
              className="h-full bg-emerald-500 transition-all duration-500"
            ></div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Geç Kalınan Ders Sayısı: <strong>{lateCount}</strong>
          </p>
        </div>

      </div>

      {/* Detailed Attendance Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-500" />
            Tarih Bazlı Devamsızlık Çizelgesi
          </span>
          <span className="text-xs text-slate-500">
            Toplam {filteredRecords.length} Kayıt
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4">Dönem / Periyot</th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4">Açıklama / Belge Durumu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredRecords.map(rec => (
                <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {new Date(rec.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {rec.period || 'Tam Gün'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {rec.status === 'present' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Geldi (Mevcut)
                      </span>
                    )}
                    {rec.status === 'absent' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        <XCircle className="w-3 h-3 text-rose-600" /> Gelmedi (Özürsüz)
                      </span>
                    )}
                    {rec.status === 'excused' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <AlertCircle className="w-3 h-3 text-amber-600" /> Raporlu / İzinli
                      </span>
                    )}
                    {rec.status === 'late' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        <Clock className="w-3 h-3 text-blue-600" /> Geç Kaldı
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {rec.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
