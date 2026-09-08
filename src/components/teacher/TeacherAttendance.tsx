import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { AttendanceRecord, AttendanceStatus } from '../../types';
import { 
  UserCheck, 
  Check, 
  X, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Save, 
  Users, 
  Sparkles, 
  FileText,
  Search,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const TeacherAttendance: React.FC = () => {
  const { currentUser } = useAuth();
  const classes = dataService.getClasses();

  const [selectedClass, setSelectedClass] = useState<string>(classes[0]?.name || '');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchFilter, setSearchFilter] = useState('');
  const [attendanceState, setAttendanceState] = useState<{ [studentId: string]: AttendanceStatus }>({});
  const [notesState, setNotesState] = useState<{ [studentId: string]: string }>({});
  const [isSaved, setIsSaved] = useState(false);

  // Sync selectedClass if classes change
  useEffect(() => {
    if ((!selectedClass || !classes.some(c => c.name === selectedClass)) && classes.length > 0) {
      setSelectedClass(classes[0].name);
    }
  }, [classes, selectedClass]);

  const students = selectedClass ? dataService.getStudentsByClass(selectedClass) : [];

  // Load attendance records for selected class and date
  useEffect(() => {
    const records = dataService.getAttendanceByClassAndDate(selectedClass, selectedDate);
    const attMap: { [studentId: string]: AttendanceStatus } = {};
    const notesMap: { [studentId: string]: string } = {};

    records.forEach(r => {
      attMap[r.studentId] = r.status;
      if (r.notes) notesMap[r.studentId] = r.notes;
    });

    // Default unrecorded students to 'present' for convenient 1-click workflows
    students.forEach(st => {
      if (!attMap[st.uid]) {
        attMap[st.uid] = 'present';
      }
    });

    setAttendanceState(attMap);
    setNotesState(notesMap);
    setIsSaved(false);
  }, [selectedClass, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSetAll = (status: AttendanceStatus) => {
    const updated: { [studentId: string]: AttendanceStatus } = {};
    students.forEach(st => {
      updated[st.uid] = status;
    });
    setAttendanceState(updated);
  };

  const handleSaveAttendance = async () => {
    if (!currentUser) return;

    const recordsToSave: AttendanceRecord[] = students.map(st => ({
      id: `att-${selectedDate}-${st.uid}`,
      date: selectedDate,
      studentId: st.uid,
      studentName: st.displayName,
      studentNumber: st.schoolNumber || '',
      studentClass: selectedClass,
      status: attendanceState[st.uid] || 'present',
      period: 'Tam Gün',
      notes: notesState[st.uid] || '',
      teacherId: currentUser.uid,
      updatedAt: new Date().toISOString()
    }));

    await dataService.saveBatchAttendance(recordsToSave);
    setIsSaved(true);

    try {
      confetti({ particleCount: 35, spread: 50 });
    } catch (e) {}

    setTimeout(() => setIsSaved(false), 3500);
  };

  // Counts
  const totalStudents = students.length;
  const presentCount = students.filter(s => (attendanceState[s.uid] || 'present') === 'present').length;
  const absentCount = students.filter(s => attendanceState[s.uid] === 'absent').length;
  const excusedCount = students.filter(s => attendanceState[s.uid] === 'excused').length;
  const lateCount = students.filter(s => attendanceState[s.uid] === 'late').length;

  const filteredStudents = students.filter(s => 
    s.displayName.toLowerCase().includes(searchFilter.toLowerCase()) || 
    (s.schoolNumber && s.schoolNumber.includes(searchFilter))
  );

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-500" />
              Günlük & Tarih Bazlı Devamsızlık Takibi (E-Yoklama)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sınıf yoklamasını alın, devamsız veya raporlu öğrencileri tek tıkla işaretleyip kaydedin.
            </p>
          </div>

          <button
            id="save-attendance-btn"
            onClick={handleSaveAttendance}
            className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition"
          >
            <Save className="w-4 h-4" />
            Yoklamayı Kaydet
          </button>
        </div>

        {/* Date and Class Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Yoklama Tarihi
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Sınıf / Şube
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            >
              {classes.length === 0 ? (
                <option value="">Tanımlı sınıf bulunmuyor</option>
              ) : (
                classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.branch || 'Genel'})</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Hızlı Toplu İşlem
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSetAll('present')}
                className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition flex items-center justify-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Tümünü Geldi Yap
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            <strong>{selectedClass}</strong> sınıfının <strong>{selectedDate}</strong> tarihli yoklama listesi başarıyla kaydedildi!
          </span>
        </div>
      )}

      {/* Attendance Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Geldi (Mevcut)
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {presentCount} <span className="text-xs font-normal text-slate-400">/ {totalStudents}</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Gelmedi (Devamsız)
          </span>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {absentCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Raporlu / İzinli
          </span>
          <p className="text-2xl font-black text-amber-500 mt-1">
            {excusedCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Geç Kaldı
          </span>
          <p className="text-2xl font-black text-blue-500 mt-1">
            {lateCount}
          </p>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              {selectedClass} Yoklama Listesi ({filteredStudents.length} Öğrenci)
            </span>
          </div>

          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Öğrenci veya No ara..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-24">Okul No</th>
                <th className="py-3.5 px-4">Öğrenci Adı Soyadı</th>
                <th className="py-3.5 px-4 text-center">Devamsızlık Durumu (Tek Tıkla Değiştir)</th>
                <th className="py-3.5 px-4">Açıklama / İzin Belgesi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredStudents.map((st) => {
                const curStatus = attendanceState[st.uid] || 'present';

                return (
                  <tr key={st.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                      #{st.schoolNumber || '-'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {st.displayName}
                    </td>

                    {/* 1-Click Status Toggle Group */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.uid, 'present')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            curStatus === 'present'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Geldi
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.uid, 'absent')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            curStatus === 'absent'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          Gelmedi
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.uid, 'excused')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            curStatus === 'excused'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Raporlu / İzinli
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.uid, 'late')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            curStatus === 'late'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Geç
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Örn: Sağlık ocağı raporu getirildi..."
                        value={notesState[st.uid] || ''}
                        onChange={(e) => setNotesState(prev => ({ ...prev, [st.uid]: e.target.value }))}
                        className="w-full px-3 py-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {selectedDate} tarihi için {filteredStudents.length} öğrencinin yoklama durumu
          </span>
          <button
            onClick={handleSaveAttendance}
            className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Yoklamayı Kaydet
          </button>
        </div>

      </div>

    </div>
  );
};
