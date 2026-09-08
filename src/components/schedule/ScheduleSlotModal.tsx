import React, { useState, useEffect } from 'react';
import { WeeklyScheduleSlot, UserProfile, DayOfWeek } from '../../types';
import { CLASS_PERIODS, SUBJECT_THEMES, DAYS_CONFIG } from '../../services/scheduleData';
import { dataService } from '../../services/dataService';
import { 
  X, 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  Edit3, 
  Trash2, 
  Save, 
  Plus,
  CheckCircle2, 
  FileText, 
  StickyNote, 
  GraduationCap, 
  Calendar,
  School,
  Sparkles
} from 'lucide-react';

interface ScheduleSlotModalProps {
  slot: WeeklyScheduleSlot | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSave?: (updatedSlot: WeeklyScheduleSlot) => void;
  onDelete?: (slotId: string) => void;
}

const COMMON_SUBJECTS = [
  'Matematik',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Türk Dili ve Edebiyatı',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'Din Kültürü ve Ahlak Bilgisi',
  'İngilizce',
  'Almanca',
  'Beden Eğitimi',
  'Görsel Sanatlar / Müzik',
  'Bilişim Teknolojileri',
  'Rehberlik'
];

const COMMON_CLASSROOMS = [
  'Derslik 101',
  'Derslik 102',
  'Derslik 201',
  'Derslik 202',
  'Derslik 301',
  'Derslik 302',
  'Fizik Laboratuvarı',
  'Kimya & Biyoloji Lab',
  'Bilişim / Kodlama Lab',
  'Kapalı Spor Salonu',
  'Müzik Atölyesi',
  'Resim Atölyesi',
  'Konferans Salonu'
];

export const ScheduleSlotModal: React.FC<ScheduleSlotModalProps> = ({
  slot,
  isOpen,
  onClose,
  currentUser,
  onSave,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [className, setClassName] = useState('10-A');
  const [day, setDay] = useState<DayOfWeek>('monday');
  const [period, setPeriod] = useState<number>(1);
  const [subject, setSubject] = useState('Matematik');
  const [teacherName, setTeacherName] = useState('');
  const [classroom, setClassroom] = useState('Derslik 101');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const canEditSchedule = currentUser?.role === 'teacher' || currentUser?.role === 'admin';
  const isNewSlot = !slot?.id || slot.id.startsWith('new-draft-');

  const teachers = dataService.getTeachers();
  const classes = dataService.getClasses();

  useEffect(() => {
    if (slot) {
      setClassName(slot.className || '10-A');
      setDay(slot.day || 'monday');
      setPeriod(slot.period || 1);
      setSubject(slot.subject || 'Matematik');
      setTeacherName(slot.teacherName || '');
      setClassroom(slot.classroom || 'Derslik 101');
      setTopic(slot.topic || '');
      setNotes(slot.notes || '');
      setIsEditing(isNewSlot);
      setSaveSuccess(false);

      if (currentUser && slot.id && !isNewSlot) {
        const savedPersonal = dataService.getPersonalSlotNote(currentUser.uid, slot.id);
        setPersonalNote(savedPersonal);
      } else {
        setPersonalNote('');
      }
    }
  }, [slot, currentUser, isNewSlot]);

  if (!isOpen || !slot) return null;

  const dayObj = DAYS_CONFIG.find(d => d.key === (isEditing ? day : slot.day));
  const currentPeriod = isEditing ? period : slot.period;
  const periodInfo = CLASS_PERIODS.find(p => p.period === currentPeriod);
  const activeSubject = isEditing ? subject : slot.subject;
  const theme = SUBJECT_THEMES[activeSubject] || {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-900 dark:text-indigo-100',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
    dot: 'bg-indigo-500'
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      alert('Lütfen ders adını belirtiniz.');
      return;
    }

    const currentPeriodInfo = CLASS_PERIODS.find(p => p.period === period);
    const updated: WeeklyScheduleSlot = {
      id: isNewSlot ? `slot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` : slot.id,
      className: className.trim(),
      day: day,
      period: period,
      startTime: currentPeriodInfo?.startTime || '08:30',
      endTime: currentPeriodInfo?.endTime || '09:10',
      subject: subject.trim(),
      teacherName: teacherName.trim() || 'Ders Öğretmeni',
      classroom: classroom.trim() || 'Derslik 101',
      topic: topic.trim(),
      notes: notes.trim(),
      updatedAt: new Date().toISOString()
    };

    if (isNewSlot) {
      await dataService.addScheduleSlot(updated, currentUser?.displayName || 'Yönetici');
    } else {
      await dataService.updateScheduleSlot(slot.id, updated, currentUser?.displayName || 'Yönetici');
    }

    if (onSave) onSave(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleSavePersonalNote = () => {
    if (!currentUser || !slot || isNewSlot) return;
    dataService.savePersonalSlotNote(currentUser.uid, slot.id, personalNote.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDelete = async () => {
    if (!slot || isNewSlot) return;
    if (window.confirm(`${slot.className} ${dayObj?.label} ${slot.period}. ders kaydını programdan kaldırmak istediğinize emin misiniz?`)) {
      await dataService.deleteScheduleSlot(slot.id, currentUser?.displayName || 'Yönetici');
      if (onDelete) onDelete(slot.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className={`p-6 border-b border-slate-100 dark:border-slate-800/80 ${theme.bg}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide uppercase ${theme.badge}`}>
                  {isEditing ? className : slot.className} Şubesi
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {dayObj?.label} • {periodInfo?.label || `${currentPeriod}. Ders`}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${theme.dot}`}></span>
                {isNewSlot ? 'Yeni Ders Saati Tanımla' : (isEditing ? 'Ders Saatini Düzenle' : slot.subject)}
              </h2>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Ders programı başarıyla kaydedildi ve senkronize edildi!
            </div>
          )}

          {!isEditing && !isNewSlot ? (
            /* Detailed View Mode */
            <div className="space-y-5">
              
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Ders Saati
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {slot.startTime} - {slot.endTime}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    40 Dakika Blok Ders
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Derslik / Salon
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {slot.classroom || 'Belirtilmedi'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Ana Bina
                  </div>
                </div>
              </div>

              {/* Teacher Info */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                    {slot.teacherName.charAt(0)}
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                      Ders Öğretmeni
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {slot.teacherName}
                    </span>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg font-medium bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {slot.subject}
                </span>
              </div>

              {/* Lesson Topic & Description */}
              {slot.topic && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    İşlenen Güncel Konu & Kazanım:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {slot.topic}
                  </p>
                </div>
              )}

              {/* General Lesson Notes */}
              {slot.notes && (
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-900/50 space-y-1 text-xs">
                  <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Önemli Ders Notu / Hatırlatma:
                  </span>
                  <p className="text-amber-700 dark:text-amber-400">
                    {slot.notes}
                  </p>
                </div>
              )}

              {/* Student Personal Study Note / Reminder */}
              {currentUser && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                      Kişisel Ders Notum & Hatırlatıcılarım:
                    </label>
                    <span className="text-[10px] text-slate-400">Sadece siz görebilirsiniz</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={personalNote}
                      onChange={(e) => setPersonalNote(e.target.value)}
                      placeholder="Örn: Formül kağıdı getir, 3. soru ödevi kontrol edilecek..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={handleSavePersonalNote}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Kaydet
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {canEditSchedule ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Dersi Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Sil
                    </button>
                  </div>
                ) : <div />}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Kapat
                </button>
              </div>

            </div>
          ) : (
            /* Edit & Create Mode for Admin / Teacher */
            <form onSubmit={handleSaveSlot} className="space-y-4">
              
              {/* Target Class, Day & Period Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Şube / Sınıf *
                  </label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    {classes.length > 0 ? (
                      classes.map(c => (
                        <option key={c.id} value={c.name}>{c.name} Şubesi</option>
                      ))
                    ) : (
                      ['9-A', '10-A', '10-B', '11-A', '11-B', '12-A'].map(c => (
                        <option key={c} value={c}>{c} Şubesi</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Gün *
                  </label>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value as DayOfWeek)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    {DAYS_CONFIG.map(d => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Ders Saati *
                  </label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    {CLASS_PERIODS.map(p => (
                      <option key={p.period} value={p.period}>
                        {p.label} ({p.startTime} - {p.endTime})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ders / Branş Adı *
                </label>
                <div className="flex gap-2">
                  <select
                    value={COMMON_SUBJECTS.includes(subject) ? subject : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setSubject(e.target.value);
                      }
                    }}
                    className="flex-1 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="custom">-- Listeden Seçin veya Özel Girin --</option>
                    {COMMON_SUBJECTS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ders Adı"
                    className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Teacher & Classroom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Öğretmen Adı *
                  </label>
                  <div className="space-y-1.5">
                    {teachers.length > 0 && (
                      <select
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        <option value="">-- Kayıtlı Öğretmen Listesinden Seç --</option>
                        {teachers.map(t => (
                          <option key={t.uid} value={t.displayName}>{t.displayName} ({t.branch || 'Öğretmen'})</option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      required
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="Örn: Ahmet Yılmaz"
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Derslik / Salon *
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={COMMON_CLASSROOMS.includes(classroom) ? classroom : ''}
                      onChange={(e) => {
                        if (e.target.value) setClassroom(e.target.value);
                      }}
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      <option value="">-- Standart Salon Seç --</option>
                      {COMMON_CLASSROOMS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required
                      value={classroom}
                      onChange={(e) => setClassroom(e.target.value)}
                      placeholder="Örn: Derslik 101, Fizik Lab"
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Topic */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  İşlenecek Konu / Ünite (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Örn: Trigonometri & 2. Dereceden Denklemler Soru Çözümü"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ders Notu / Malzeme Uyarısı (İsteğe Bağlı)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Örn: Laboratuvar önlüğü getirilecek, test kitapları yanınızda olsun..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (isNewSlot) {
                      onClose();
                    } else {
                      setIsEditing(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isNewSlot ? 'Dersi Programa Ekle' : 'Değişiklikleri Kaydet'}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
