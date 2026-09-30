import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { AttendanceRecord, AttendanceStatus, UserProfile } from '../../types';
import { 
  UserCheck, 
  Check, 
  X, 
  AlertCircle, 
  Clock, 
  Calendar as CalendarIcon, 
  Save, 
  Users, 
  Sparkles, 
  FileText,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell,
  CheckCheck,
  RotateCcw,
  Tag,
  Layers,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';

const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const DAY_NAMES_TR = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

const QUICK_REASONS = [
  'Sağlık Raporu Teslim Edildi',
  'Aile İzni / Mazeretli',
  'Haber Verilmedi',
  'Geç Geldi (Trafik / Servis)',
  'Okul İçi Etkinlik / Temsil'
];

export const TeacherAttendance: React.FC = () => {
  const { currentUser } = useAuth();
  const classes = dataService.getClasses();

  // Mode: 'roster' (Sınıf Listesi) or 'student_picker' (Öğrenci & Takvim Seçerek Ekle)
  const [activeMode, setActiveMode] = useState<'roster' | 'student_picker'>('roster');

  // Common date state (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Roster Mode state
  const [selectedClass, setSelectedClass] = useState<string>(classes[0]?.name || '');
  const [searchFilter, setSearchFilter] = useState('');
  const [attendanceState, setAttendanceState] = useState<{ [studentId: string]: AttendanceStatus }>({});
  const [notesState, setNotesState] = useState<{ [studentId: string]: string }>({});
  const [isSaved, setIsSaved] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dedicated Student-Picker Mode state
  const [pickerClassFilter, setPickerClassFilter] = useState<string>('all');
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [selectedStudentUids, setSelectedStudentUids] = useState<string[]>([]);
  const [pickerStatus, setPickerStatus] = useState<AttendanceStatus>('absent');
  const [pickerPeriod, setPickerPeriod] = useState<string>('Tam Gün');
  const [pickerNotes, setPickerNotes] = useState<string>('');
  const [notifyParent, setNotifyParent] = useState<boolean>(true);
  const [isSubmittingPicker, setIsSubmittingPicker] = useState<boolean>(false);

  // Interactive Calendar state for picker
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date());

  // Sync selectedClass if classes change
  useEffect(() => {
    if ((!selectedClass || !classes.some(c => c.name === selectedClass)) && classes.length > 0) {
      setSelectedClass(classes[0].name);
    }
  }, [classes, selectedClass]);

  const students = selectedClass ? dataService.getStudentsByClass(selectedClass) : [];
  const allStudents = dataService.getStudents();

  // Load attendance records for roster mode
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
  }, [selectedClass, selectedDate, students.length]);

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

  // Save Roster Attendance
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

    await dataService.saveBatchAttendance(recordsToSave, currentUser.displayName);
    setIsSaved(true);
    setSuccessMessage(`${selectedClass} sınıfının ${selectedDate} tarihli yoklama listesi kaydedildi ve velilere bildirim iletildi!`);

    try {
      confetti({ particleCount: 35, spread: 50 });
    } catch (e) {}

    setTimeout(() => {
      setIsSaved(false);
      setSuccessMessage(null);
    }, 4000);
  };

  // Student Picker - Toggle individual student
  const toggleStudentSelection = (uid: string) => {
    setSelectedStudentUids(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // Filtered students for picker
  const filteredPickerStudents = useMemo(() => {
    return allStudents.filter(st => {
      if (pickerClassFilter !== 'all' && st.classGrade !== pickerClassFilter) {
        return false;
      }
      if (pickerSearch.trim()) {
        const query = pickerSearch.toLowerCase().trim();
        const matchesName = st.displayName.toLowerCase().includes(query);
        const matchesNo = (st.schoolNumber || '').includes(query);
        const matchesClass = (st.classGrade || '').toLowerCase().includes(query);
        if (!matchesName && !matchesNo && !matchesClass) return false;
      }
      return true;
    });
  }, [allStudents, pickerClassFilter, pickerSearch]);

  const selectAllFiltered = () => {
    const ids = filteredPickerStudents.map(s => s.uid);
    setSelectedStudentUids(prev => Array.from(new Set([...prev, ...ids])));
  };

  const clearSelection = () => {
    setSelectedStudentUids([]);
  };

  // Save Student-Picker Attendance
  const handleSavePickerAttendance = async () => {
    if (selectedStudentUids.length === 0) {
      alert('Lütfen en az bir öğrenci seçiniz.');
      return;
    }
    if (!currentUser) return;

    setIsSubmittingPicker(true);
    try {
      const recordsToSave: AttendanceRecord[] = selectedStudentUids.map(uid => {
        const student = allStudents.find(s => s.uid === uid);
        return {
          id: `att-${selectedDate}-${uid}`,
          date: selectedDate,
          studentId: uid,
          studentName: student?.displayName || 'Öğrenci',
          studentNumber: student?.schoolNumber || '',
          studentClass: student?.classGrade || 'Genel',
          status: pickerStatus,
          period: pickerPeriod,
          notes: pickerNotes.trim(),
          teacherId: currentUser.uid,
          updatedAt: new Date().toISOString()
        };
      });

      await dataService.saveBatchAttendance(recordsToSave, currentUser.displayName);

      setIsSaved(true);
      const count = selectedStudentUids.length;
      const statusText = pickerStatus === 'absent' 
        ? 'Devamsız' 
        : pickerStatus === 'excused' 
        ? 'Raporlu / İzinli' 
        : pickerStatus === 'late' 
        ? 'Geç Kaldı' 
        : 'Geldi';

      setSuccessMessage(`✓ Seçili ${count} öğrenci için ${selectedDate} tarihli "${statusText}" kaydı başarıyla işlendi ve Veli Bildirim Merkezi'ne anlık bildirim iletildi!`);

      try {
        confetti({ particleCount: 50, spread: 70 });
      } catch (e) {}

      // Reset picker selection
      setSelectedStudentUids([]);
      setPickerNotes('');

      setTimeout(() => {
        setIsSaved(false);
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      alert(err.message || 'Devamsızlık kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmittingPicker(false);
    }
  };

  // Interactive Calendar Generation
  const calendarDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // In JS: Sunday is 0, Monday is 1... adjust so Monday is 0
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] = [];

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const dateStr = curDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      });
    }

    // Next month padding to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      });
    }

    return days;
  }, [calendarViewDate, selectedDate, todayStr]);

  const changeCalendarMonth = (offset: number) => {
    setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const jumpToToday = () => {
    const now = new Date();
    setCalendarViewDate(now);
    setSelectedDate(todayStr);
  };

  // Selected date formatted in Turkish
  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long'
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Counts for Roster mode
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
      
      {/* Top Header & Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
              <UserCheck className="w-3.5 h-3.5" />
              <span>MEB E-Yoklama & Devamsızlık Modülü</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Devamsızlık Takibi & Veli Bildirimi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sınıf bazlı toplu yoklama alın veya öğrencileri seçerek takvimden tarih belirleyip devamsızlık kaydedin.
            </p>
          </div>

          {/* Mode Switch Buttons */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveMode('roster')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeMode === 'roster'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Sınıf Yoklama Listesi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('student_picker')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeMode === 'student_picker'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Öğrenci & Takvim Seçerek Ekle</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                Yeni
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {isSaved && successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setIsSaved(false)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold underline"
          >
            Kapat
          </button>
        </div>
      )}

      {/* ================= MODE 1: DEDICATED STUDENT & CALENDAR PICKER ================= */}
      {activeMode === 'student_picker' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Interactive Calendar & Absence Form (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Interactive Calendar Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {MONTH_NAMES_TR[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
                    </h3>
                    <p className="text-[11px] text-slate-400">Devamsızlık Tarihini Seçin</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => changeCalendarMonth(-1)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                    title="Önceki Ay"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={jumpToToday}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition"
                  >
                    Bugün
                  </button>
                  <button
                    type="button"
                    onClick={() => changeCalendarMonth(1)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                    title="Sonraki Ay"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
                {DAY_NAMES_TR.map(d => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-xs">
                {calendarDays.map((d, idx) => {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedDate(d.dateStr)}
                      className={`h-9 w-full rounded-xl flex items-center justify-center font-bold text-xs transition cursor-pointer relative ${
                        d.isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                          : d.isToday
                          ? 'border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                          : d.isCurrentMonth
                          ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{d.dayNumber}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Date Summary Banner */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Seçili Tarih:</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 font-mono">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {formattedSelectedDate}
                </span>
              </div>
            </div>

            {/* Absence Details & Status Form Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                Devamsızlık Türü ve Detayları
              </h3>

              {/* Status Selector Grid */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPickerStatus('absent')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                    pickerStatus === 'absent'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-rose-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Devamsız</span>
                    <X className="w-4 h-4 text-rose-500" />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Gelmedi (Özürsüz)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPickerStatus('excused')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                    pickerStatus === 'excused'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Raporlu / İzinli</span>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Mazeretli / Belgeli</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPickerStatus('late')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                    pickerStatus === 'late'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Geç Kaldı</span>
                    <Clock className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Derse geç giriş</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPickerStatus('present')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                    pickerStatus === 'present'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Mevcut (Geldi)</span>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Devamsızlığı Kaldır</span>
                </button>
              </div>

              {/* Period / Ders Saati */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ders Süresi / Dilim
                </label>
                <select
                  value={pickerPeriod}
                  onChange={(e) => setPickerPeriod(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Tam Gün">Tam Gün (Tüm Dersler)</option>
                  <option value="Öğleden Önce (Yarım Gün)">Öğleden Önce (Yarım Gün)</option>
                  <option value="Öğleden Sonra (Yarım Gün)">Öğleden Sonra (Yarım Gün)</option>
                  <option value="1. Ders">1. Ders Saati</option>
                  <option value="2. Ders">2. Ders Saati</option>
                  <option value="3. Ders">3. Ders Saati</option>
                  <option value="4. Ders">4. Ders Saati</option>
                  <option value="5. Ders">5. Ders Saati</option>
                  <option value="6. Ders">6. Ders Saati</option>
                  <option value="7. Ders">7. Ders Saati</option>
                  <option value="8. Ders">8. Ders Saati</option>
                </select>
              </div>

              {/* Notes & Quick Reason Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Açıklama / Mazeret Notu
                </label>
                <input
                  type="text"
                  placeholder="Örn: 2 günlük sağlık ocağı raporu teslim edildi..."
                  value={pickerNotes}
                  onChange={(e) => setPickerNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {QUICK_REASONS.map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setPickerNotes(reason)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold transition"
                    >
                      + {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parent Notification Toggle */}
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                      Veli Bildirim Merkezi'ne Gönder
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Öğrenci velisinin paneline anlık bildirim iletilir
                    </span>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={notifyParent}
                  onChange={(e) => setNotifyParent(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="button"
                id="btn-submit-picker-attendance"
                disabled={selectedStudentUids.length === 0 || isSubmittingPicker}
                onClick={handleSavePickerAttendance}
                className={`w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                  selectedStudentUids.length === 0
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 active:scale-[0.99]'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {selectedStudentUids.length === 0
                    ? 'Lütfen Sağdan Öğrenci Seçiniz'
                    : `Seçili ${selectedStudentUids.length} Öğrenciye Devamsızlığı Kaydet ve Bildir`}
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Multi-Student Selector (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Öğrenci Seçimi ({filteredPickerStudents.length} Kayıt)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Devamsızlık girmek istediğiniz öğrencileri işaretleyin.
                </p>
              </div>

              {/* Selected Count Badge */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black ${
                  selectedStudentUids.length > 0 
                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {selectedStudentUids.length} Öğrenci Seçildi
                </span>
              </div>
            </div>

            {/* Filter Bar: Class & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2">
              <div className="sm:col-span-5">
                <select
                  value={pickerClassFilter}
                  onChange={(e) => setPickerClassFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="all">Tüm Sınıflar & Şubeler</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.branch || 'Genel'})</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-7 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Öğrenci Adı veya Okul No ile ara..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Select Actions */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Listelenen Tümünü Seç ({filteredPickerStudents.length})
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs font-bold text-slate-500 hover:text-rose-500 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Seçimi Temizle
                </button>
              </div>
            </div>

            {/* Selected Student Pill Tags */}
            {selectedStudentUids.length > 0 && (
              <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  İşlem Yapılacak Öğrenciler ({selectedStudentUids.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {selectedStudentUids.map(uid => {
                    const st = allStudents.find(s => s.uid === uid);
                    if (!st) return null;
                    return (
                      <span
                        key={uid}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-indigo-200 dark:border-indigo-800 shadow-2xs"
                      >
                        <span>{st.displayName} (#{st.schoolNumber || '-'})</span>
                        <button
                          type="button"
                          onClick={() => toggleStudentSelection(uid)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 ml-0.5"
                          title="Seçimi kaldır"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Students List Table / Cards */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[460px] overflow-y-auto">
              {filteredPickerStudents.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Arama kriterlerinize uygun öğrenci bulunamadı.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPickerStudents.map(st => {
                    const isSelected = selectedStudentUids.includes(st.uid);

                    return (
                      <div
                        key={st.uid}
                        onClick={() => toggleStudentSelection(st.uid)}
                        className={`p-3 sm:px-4 flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Controlled by row click
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                          />
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                            {st.displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {st.displayName}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                #{st.schoolNumber || '-'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              Sınıf: <strong className="text-slate-600 dark:text-slate-300">{st.classGrade || 'Genel'}</strong>
                              {st.parentName && ` • Veli: ${st.parentName}`}
                            </span>
                          </div>
                        </div>

                        <div>
                          {isSelected ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white flex items-center gap-1 shadow-2xs">
                              <Check className="w-3.5 h-3.5" />
                              Seçildi
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 border border-dashed border-slate-200 dark:border-slate-700">
                              Seç
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ================= MODE 2: CLASS ROSTER ATTENDANCE (TOPLU E-YOKLAMA) ================= */}
      {activeMode === 'roster' && (
        <div className="space-y-6">
          
          {/* Controls Bar: Date and Class */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Yoklama Tarihi
                </label>
                <div className="relative">
                  <CalendarIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Sınıf / Şube Seçimi
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full py-2.5 px-3 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
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

              <div className="sm:col-span-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAll('present')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Check className="w-4 h-4" />
                  Tümünü Geldi Yap
                </button>

                <button
                  type="button"
                  id="save-attendance-btn"
                  onClick={handleSaveAttendance}
                  className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Yoklamayı Kaydet
                </button>
              </div>
            </div>
          </div>

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
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                  {selectedClass} Yoklama Listesi ({filteredStudents.length} Öğrenci) &bull; <span className="font-mono text-indigo-600 dark:text-indigo-400">{selectedDate}</span>
                </span>
              </div>

              <div className="relative w-full sm:w-64">
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
                    <th className="py-3.5 px-4 text-center">Devamsızlık Durumu (1-Tıkla Değiştir)</th>
                    <th className="py-3.5 px-4">Açıklama / Mazeret Notu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredStudents.map((st) => {
                    const curStatus = attendanceState[st.uid] || 'present';

                    return (
                      <tr key={st.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 font-mono">
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
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
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
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
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
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                curStatus === 'excused'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                              }`}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              Raporlu
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(st.uid, 'late')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
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
                            placeholder="Mazeret veya rapor notu..."
                            value={notesState[st.uid] || ''}
                            onChange={(e) => setNotesState(prev => ({ ...prev, [st.uid]: e.target.value }))}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
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
                type="button"
                onClick={handleSaveAttendance}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 transition shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Yoklamayı Kaydet ve Bildir
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
