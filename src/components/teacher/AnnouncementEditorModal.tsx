import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Announcement, AnnouncementPriority, TargetAudience, Attachment } from '../../types';
import { RichTextRenderer } from '../common/RichTextRenderer';
import {
  Megaphone,
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  AlertCircle,
  Table,
  Link,
  Link2,
  Pin,
  Sparkles,
  Eye,
  Edit3,
  Columns,
  CheckCircle2,
  Paperclip,
  Plus,
  Trash2,
  Tag,
  Info,
  Calendar,
  Layers,
  School,
  Globe,
  FileText,
  ExternalLink,
  HardDrive,
  FolderOpen,
  Cloud
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AnnouncementEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcementToEdit?: Announcement | null;
  onSaved?: (ann: Announcement) => void;
}

const PRESET_TEMPLATES = [
  {
    id: 'exam_schedule',
    title: '📝 1. Dönem Ortak Yazılı Sınav Takvimi',
    icon: Calendar,
    data: {
      title: '2026-2027 Eğitim Öğretim Yılı 1. Dönem Ortak Sınav Takvimi',
      priority: 'important' as AnnouncementPriority,
      tags: ['Sınav', 'Ortak Sınav', 'Duyuru'],
      content: `# 1. Dönem Ortak Sınav Programı ve Uygulama Esasları

Değerli öğrencilerimiz ve saygıdeğer velilerimiz,

Milli Eğitim Bakanlığı ortak sınav takvimi ve okul zümre başkanları kurulu kararı doğrultusunda **1. Dönem Ortak Yazılı Sınavları** aşağıdaki takvime göre gerçekleştirilecektir:

## 📅 Sınav Takvimi

| Tarih | Ders Adı | Sınav Saati | Açıklama |
| :--- | :--- | :--- | :--- |
| **Pazartesi** | Türk Dili ve Edebiyatı | 2. Ders (09:40) | Tüm Kademeler |
| **Salı** | Matematik | 3. Ders (10:30) | Tüm Kademeler |
| **Çarşamba** | Fizik / Tarih | 2. Ders (09:40) | Alan Bazlı |
| **Perşembe** | Kimya / Coğrafya | 3. Ders (10:30) | Alan Bazlı |
| **Cuma** | Biyoloji / Felsefe | 2. Ders (09:40) | Tüm Kademeler |

### ⚠️ Sınav Kuralları ve Önemli Hatırlatmalar:
- [ ] Sınav saatinden en az **10 dakika önce** belirlenen sınav salonunda hazır bulununuz.
- [ ] Optik form ve cevap kağıtlarının doldurulması için yanınızda **kurşun kalem ve silgi** bulundurunuz.
- [ ] Sınav esnasında cep telefonu ve akıllı saatlerin kapalı konumda öğretmen masasında bulunması zorunludur.

> **Önemli Not:** Sağlık raporu nedeniyle sınava katılamayan öğrencilerin raporlarını **5 iş günü** içerisinde okul idaresine teslim etmesi gerekmektedir. Mazeret sınavları sınav haftasını takip eden pazartesi günü başlayacaktır.

Tüm öğrencilerimize başarılar dileriz.`
    }
  },
  {
    id: 'parent_meeting',
    title: '👨‍👩‍👧 Veli Toplantısı & Gelişim Görüşmesi',
    icon: School,
    data: {
      title: '1. Dönem Genel Veli Bilgilendirme ve Değerlendirme Toplantısı',
      priority: 'important' as AnnouncementPriority,
      tags: ['Veli', 'Toplantı', 'Görüşme'],
      content: `# 1. Dönem Veli - Öğretmen Bilgilendirme Toplantısı

Sayın Velimiz,

Öğrencimizin akademik gelişimi, ders içi katılımı, ödev takibi ve sosyal uyumunu değerlendirmek üzere okulumuzda **Veli - Öğretmen Görüşme Toplantısı** düzenlenecektir.

## 📍 Toplantı Bilgileri
- **Tarih:** Bu Cumartesi
- **Saat Aralığı:** 10:00 - 13:30
- **Yer:** Okul Ana Binası ve Sınıf Derslikleri

### Gündem Maddeleri:
1. Öğrencinin ders başarı grafiği ve yazılı sınav sonuçlarının değerlendirilmesi.
2. Devamsızlık ve ders içi katılım durumu.
3. Rehberlik ve psikolojik danışmanlık hizmetleri bilgilendirmesi.
4. YKS & Lise hazırlık / kariyer planlama süreçleri.

> Katılımınız öğrencilerimizin akademik motivasyonu açısından büyük önem taşımaktadır. Görüşmeler bireysel olarak branş öğretmenlerimizin dersliklerinde yapılacaktır.`
    }
  },
  {
    id: 'homework_project',
    title: '📚 Haftalık Proje & Ödev Teslimi',
    icon: Layers,
    data: {
      title: 'Dönem Sonu Performans ve Proje Ödevleri Teslim Hatırlatması',
      priority: 'normal' as AnnouncementPriority,
      tags: ['Ödev', 'Proje', 'Performans'],
      content: `# Proje ve Performans Çalışmaları Teslim Duyurusu

Sevgili öğrencilerimiz,

Dönem başında seçmiş olduğunuz derslerin **proje ve araştırma görevlerinin** son teslim tarihi yaklaşmaktadır.

## 📌 Teslim Esasları:
- [ ] Proje raporlarının dijital kopyası sistem üzerinden yüklenmelidir.
- [ ] Fiziksel maket, sunum dosyası veya afiş çalışmaları ilgili branş öğretmenine bizzat teslim edilecektir.
- [ ] Kaynakça kurallarına (APA formatı) dikkat edilmeli ve intihalden kaçınılmalıdır.

### Değerlendirme Kriterleri:
- **Bilimsel Doğruluk ve İçerik Zenginliği:** 40 Puan
- **Özgünlük ve Yaratıcılık:** 30 Puan
- **Düzen, Zamanında Teslim ve Sunum:** 30 Puan

Başarılar ve verimli çalışmalar dileriz!`
    }
  },
  {
    id: 'trip_activity',
    title: '🚌 Okul Gezisi & Sosyal Etkinlik',
    icon: Sparkles,
    data: {
      title: 'İzmir Arkeoloji Müzesi ve Efes Antik Kenti Kültür Gezisi',
      priority: 'normal' as AnnouncementPriority,
      tags: ['Gezi', 'Kültür', 'Etkinlik'],
      content: `# Kültür ve Tarih Kulübü - Müze & Antik Kent Gezisi

Sevgili öğrencilerimiz ve velilerimiz,

Tarih ve Kültür Kulübümüzün rehberliğinde düzenlenecek olan günübirlik **Efes Antik Kenti ve Müze Ziyareti** için kayıtlar başlamıştır.

## 🏛️ Gezi Programı
- **Hareket Yeri & Saati:** Okul Ön Bahçesi - 08:30
- **Dönüş Saati:** 17:30
- **Rehberlik:** Tarih Zümresi ve Alan Uzmanı Rehberler

### Gerekli Evraklar ve Yanınızda Bulunması Gerekenler:
1. İmzalı Veli İzin Muvafakatnamesi (Okul idaresinden temin edilebilir).
2. Müzekart veya Öğrenci Kimlik Kartı.
3. Rahat yürüyüş ayakkabısı ve şapka.

> **Kontenjan Sınırlıdır:** Başvurular okul rehberlik servisine yapılacaktır.`
    }
  }
];

export const AnnouncementEditorModal: React.FC<AnnouncementEditorModalProps> = ({
  isOpen,
  onClose,
  announcementToEdit,
  onSaved
}) => {
  const { currentUser } = useAuth();
  const classes = dataService.getClasses();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('all');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attachments & Resource Links
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachName, setAttachName] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [attachType, setAttachType] = useState<'link' | 'pdf' | 'doc' | 'image' | 'archive'>('link');
  const [attachCategory, setAttachCategory] = useState<'general' | 'drive' | 'meb' | 'pdf' | 'school'>('general');
  const [showAttachForm, setShowAttachForm] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize data on open / edit
  useEffect(() => {
    if (announcementToEdit) {
      setTitle(announcementToEdit.title || '');
      setContent(announcementToEdit.content || '');
      setPriority(announcementToEdit.priority || 'normal');
      setTargetAudience(announcementToEdit.targetAudience || 'all');
      
      if (announcementToEdit.targetClasses && announcementToEdit.targetClasses.length > 0) {
        setSelectedClasses(announcementToEdit.targetClasses);
      } else if (announcementToEdit.targetClass) {
        setSelectedClasses([announcementToEdit.targetClass]);
      } else if (classes.length > 0) {
        setSelectedClasses([classes[0].name]);
      }

      setPinned(!!announcementToEdit.pinned);
      setTags(announcementToEdit.tags || []);
      setAttachments(announcementToEdit.attachments || []);
    } else {
      setTitle('');
      setContent('');
      setPriority('normal');
      setTargetAudience('all');
      setSelectedClasses(classes.length > 0 ? [classes[0].name] : []);
      setPinned(false);
      setTags(['Duyuru']);
      setAttachments([]);
      setViewMode('edit');
      setAttachName('');
      setAttachUrl('');
      setAttachCategory('general');
      setShowAttachForm(false);
    }
  }, [announcementToEdit, isOpen, classes]);

  if (!isOpen) return null;

  // Insert markdown helper at cursor position
  const insertFormatting = (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || defaultPlaceholder;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 10);
  };

  const handleApplyTemplate = (tpl: typeof PRESET_TEMPLATES[0]) => {
    setTitle(tpl.data.title);
    setContent(tpl.data.content);
    setPriority(tpl.data.priority);
    setTags(tpl.data.tags);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().replace(/,/g, '');
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleToggleClass = (className: string) => {
    if (selectedClasses.includes(className)) {
      setSelectedClasses(selectedClasses.filter(c => c !== className));
    } else {
      setSelectedClasses([...selectedClasses, className]);
    }
  };

  const handleSelectAllGrade = (grade: number) => {
    const gradeClasses = classes.filter(c => c.gradeLevel === grade).map(c => c.name);
    const allSelected = gradeClasses.every(c => selectedClasses.includes(c));
    if (allSelected) {
      setSelectedClasses(selectedClasses.filter(c => !gradeClasses.includes(c)));
    } else {
      const merged = Array.from(new Set([...selectedClasses, ...gradeClasses]));
      setSelectedClasses(merged);
    }
  };

  const handleAddAttachment = (customName?: string, customUrl?: string, customType?: 'link' | 'pdf' | 'doc' | 'image' | 'archive') => {
    const rawUrl = (customUrl || attachUrl).trim();
    if (!rawUrl) return;

    // Ensure valid URL prefix
    const formattedUrl = (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
      ? rawUrl
      : `https://${rawUrl}`;

    let autoName = (customName || attachName).trim();
    if (!autoName) {
      if (formattedUrl.includes('drive.google.com')) autoName = 'Google Drive Doküman Klasörü';
      else if (formattedUrl.includes('ogmmateryal.eba.gov.tr') || formattedUrl.includes('eba.gov.tr')) autoName = 'MEB / EBA Eğitim Materyali';
      else if (formattedUrl.includes('meb.gov.tr')) autoName = 'MEB Resmi Dokümanı / Kılavuzu';
      else if (formattedUrl.toLowerCase().endsWith('.pdf')) autoName = 'Ders / Sınav PDF Dokümanı';
      else {
        try {
          const parsed = new URL(formattedUrl);
          autoName = `${parsed.hostname} Referans Kaynağı`;
        } catch {
          autoName = 'Harici Kaynak Bağlantısı';
        }
      }
    }

    let detectedType: 'link' | 'pdf' | 'doc' | 'image' | 'archive' = customType || attachType;
    if (formattedUrl.toLowerCase().endsWith('.pdf')) detectedType = 'pdf';
    else if (formattedUrl.toLowerCase().endsWith('.docx') || formattedUrl.toLowerCase().endsWith('.doc')) detectedType = 'doc';
    else if (formattedUrl.toLowerCase().endsWith('.zip') || formattedUrl.toLowerCase().endsWith('.rar')) detectedType = 'archive';

    const newAtt: Attachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: autoName,
      url: formattedUrl,
      type: detectedType,
      uploadedAt: new Date().toISOString()
    };

    setAttachments(prev => [...prev, newAtt]);
    setAttachName('');
    setAttachUrl('');
    setAttachCategory('general');
  };

  const handleApplyResourcePreset = (presetType: 'drive' | 'meb' | 'pdf' | 'school') => {
    if (presetType === 'drive') {
      setAttachName('Google Drive - Ders Materyalleri Klasörü');
      setAttachUrl('https://drive.google.com/');
      setAttachCategory('drive');
      setAttachType('link');
    } else if (presetType === 'meb') {
      setAttachName('MEB / EBA - OGM Materyal Soru & Ders Kaynakları');
      setAttachUrl('https://ogmmateryal.eba.gov.tr/');
      setAttachCategory('meb');
      setAttachType('link');
    } else if (presetType === 'pdf') {
      setAttachName('Ders Notları & Çalışma Fasikülü (PDF)');
      setAttachUrl('https://example.com/calisma-fasikulu.pdf');
      setAttachCategory('pdf');
      setAttachType('pdf');
    } else if (presetType === 'school') {
      setAttachName('Okul Resmi Web Portalı & Duyuru Linki');
      setAttachUrl('https://okul.meb.k12.tr/');
      setAttachCategory('school');
      setAttachType('link');
    }
    setShowAttachForm(true);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !currentUser) return;

    if (targetAudience === 'class' && selectedClasses.length === 0) {
      alert('Lütfen duyurunun yayınlanacağı en az bir sınıf veya şube seçiniz.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (announcementToEdit) {
        await dataService.updateAnnouncement(announcementToEdit.id, {
          title: title.trim(),
          content: content.trim(),
          priority,
          targetAudience,
          targetClass: targetAudience === 'class' ? (selectedClasses[0] || undefined) : undefined,
          targetClasses: targetAudience === 'class' ? selectedClasses : undefined,
          pinned,
          tags,
          attachments
        });
        if (onSaved) {
          onSaved({
            ...announcementToEdit,
            title: title.trim(),
            content: content.trim(),
            priority,
            targetAudience,
            targetClass: targetAudience === 'class' ? (selectedClasses[0] || undefined) : undefined,
            targetClasses: targetAudience === 'class' ? selectedClasses : undefined,
            pinned,
            tags,
            attachments
          });
        }
      } else {
        const newAnn: Announcement = {
          id: `ann-${Date.now()}`,
          title: title.trim(),
          content: content.trim(),
          authorName: currentUser.displayName,
          authorRole: currentUser.role,
          authorId: currentUser.uid,
          targetAudience,
          targetClass: targetAudience === 'class' ? (selectedClasses[0] || undefined) : undefined,
          targetClasses: targetAudience === 'class' ? selectedClasses : undefined,
          priority,
          pinned,
          tags,
          attachments,
          createdAt: new Date().toISOString(),
          viewsCount: 1
        };
        await dataService.addAnnouncement(newAnn);
        try {
          confetti({ particleCount: 50, spread: 70 });
        } catch (e) {}
        if (onSaved) {
          onSaved(newAnn);
        }
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert('Duyuru kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/30">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                {announcementToEdit ? 'Duyuruyu Düzenle' : 'Zengin Metinli Duyuru Oluşturucu'}
                {pinned && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <Pin className="w-3 h-3 fill-current" /> Başa Tutturuldu
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tüm okul veya seçili şubeler için zengin formatlı duyurular hazırlayın.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="hidden sm:flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'edit' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Düzenle
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'split' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <Columns className="w-3.5 h-3.5" /> Yan Yana
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'preview' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Canlı Önizleme
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Quick Preset Templates */}
          {!announcementToEdit && (
            <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 p-3.5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Hızlı Duyuru Şablonları:
                </span>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                  Tıkla ve otomatik doldur
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_TEMPLATES.map(tpl => {
                  const Icon = tpl.icon;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-purple-200/80 dark:border-purple-800/80 hover:border-purple-400 dark:hover:border-purple-600 text-left transition shadow-2xs group cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate">
                        <Icon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="truncate">{tpl.title.split(' ')[1] || tpl.title}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{tpl.data.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title and Pin Option */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                Duyuru Başlığı <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setPinned(!pinned)}
                className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-xl transition cursor-pointer ${
                  pinned
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${pinned ? 'fill-current' : ''}`} />
                {pinned ? 'Başa Tutturuldu' : 'En Başa Sabitle'}
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="Örn: 2026-2027 Eğitim Öğretim Yılı 1. Dönem Ortak Sınav Takvimi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition"
            />
          </div>

          {/* Target Audience & Priority Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            
            {/* Target Audience */}
            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-2">
                Yayınlanacak Hedef Kitle <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'all', label: '🌐 Tüm Okul (Herkes)' },
                  { id: 'students', label: '🎓 Tüm Öğrenciler' },
                  { id: 'teachers', label: '👨‍🏫 Öğretmenler Odası' },
                  { id: 'class', label: '🏫 Şube / Sınıf Bazlı' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTargetAudience(item.id as TargetAudience)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold text-left transition border cursor-pointer ${
                      targetAudience === item.id
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Level */}
            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-2">
                Öncelik Seviyesi & Vurgu
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: 'Genel', desc: 'Standart bilgi', color: 'slate' },
                  { id: 'important', label: 'Önemli', desc: 'Sarı rozet', color: 'amber' },
                  { id: 'urgent', label: 'Acil / Kritik', desc: 'Kırmızı rozet', color: 'rose' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPriority(item.id as AnnouncementPriority)}
                    className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                      priority === item.id
                        ? item.id === 'urgent'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : item.id === 'important'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <p className="text-xs font-black">{item.label}</p>
                    <p className={`text-[10px] ${priority === item.id ? 'text-white/80' : 'text-slate-400'}`}>
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Class Selector (When targetAudience === 'class') */}
          {targetAudience === 'class' && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/60 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <School className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Hedef Sınıfları & Şubeleri Seçin:
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Duyuruyu tek bir şubeye veya birden fazla sınıfa aynı anda gönderebilirsiniz.
                  </p>
                </div>

                {/* Grade Quick Selectors */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">Tümünü Seç:</span>
                  {[9, 10, 11, 12].map(grade => {
                    const gradeClasses = classes.filter(c => c.gradeLevel === grade).map(c => c.name);
                    if (gradeClasses.length === 0) return null;
                    const allSelected = gradeClasses.every(c => selectedClasses.includes(c));
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => handleSelectAllGrade(grade)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition cursor-pointer ${
                          allSelected
                            ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {grade}. Sınıflar
                      </button>
                    );
                  })}
                </div>
              </div>

              {classes.length === 0 ? (
                <div className="p-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-500">
                  Henüz kayıtlı sınıf bulunmuyor. İdare panelinden sınıf ekleyebilirsiniz.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {classes.map(c => {
                    const isSelected = selectedClasses.includes(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleClass(c.name)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between border transition cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span>{c.name}</span>
                        {isSelected ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-slate-400 shrink-0"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Seçilen Şubeler: {selectedClasses.length > 0 ? selectedClasses.join(', ') : 'Henüz şube seçilmedi'}
              </div>
            </div>
          )}

          {/* Rich Text Editor Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                Duyuru Metni & İçerik <span className="text-rose-500">*</span>
              </label>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{wordCount} Kelime</span>
                <span>•</span>
                <span>{charCount} Karakter</span>
              </div>
            </div>

            {/* Rich Text Formatting Toolbar */}
            <div className="flex items-center gap-1 flex-wrap p-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              
              {/* Text Styles */}
              <div className="flex items-center gap-0.5 pr-1 border-r border-slate-300 dark:border-slate-700">
                <button
                  type="button"
                  title="Kalın (Bold)"
                  onClick={() => insertFormatting('**', '**', 'Kalın Metin')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="İtalik"
                  onClick={() => insertFormatting('*', '*', 'İtalik Metin')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Altı Çizili"
                  onClick={() => insertFormatting('<u>', '</u>', 'Altı Çizili Metin')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Underline className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Üstü Çizili"
                  onClick={() => insertFormatting('~~', '~~', 'Üstü Çizili Metin')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Strikethrough className="w-4 h-4" />
                </button>
              </div>

              {/* Headings */}
              <div className="flex items-center gap-0.5 pr-1 border-r border-slate-300 dark:border-slate-700">
                <button
                  type="button"
                  title="Başlık 1 (H1)"
                  onClick={() => insertFormatting('\n# ', '\n', 'Ana Başlık')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Heading1 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Başlık 2 (H2)"
                  onClick={() => insertFormatting('\n## ', '\n', 'Alt Başlık')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Başlık 3 (H3)"
                  onClick={() => insertFormatting('\n### ', '\n', 'Küçük Başlık')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Heading3 className="w-4 h-4" />
                </button>
              </div>

              {/* Lists & Blocks */}
              <div className="flex items-center gap-0.5 pr-1 border-r border-slate-300 dark:border-slate-700">
                <button
                  type="button"
                  title="Madde İşaretli Liste"
                  onClick={() => insertFormatting('\n- ', '', 'Madde metni')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Numaralı Liste"
                  onClick={() => insertFormatting('\n1. ', '', 'Birinci madde')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Görev / Onay Kutusu Listesi"
                  onClick={() => insertFormatting('\n- [ ] ', '', 'Yapılacak görev')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <ListChecks className="w-4 h-4" />
                </button>
              </div>

              {/* Quotes, Tables & Callouts */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  title="Alıntı / Önemli Vurgu Bloğu"
                  onClick={() => insertFormatting('\n> **Önemli Not:** ', '\n', 'Duyuru için kritik vurgu ve açıklama...')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Quote className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Tablo Ekle"
                  onClick={() => insertFormatting('\n| Başlık 1 | Başlık 2 | Açıklama |\n| :--- | :--- | :--- |\n| Veri 1 | Veri 2 | Not 1 |\n| Veri 3 | Veri 4 | Not 2 |\n')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Table className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Bağlantı / Link Ekle"
                  onClick={() => insertFormatting('[', '](https://...)', 'Bağlantı Başlığı')}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Link className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Editor & Preview Area */}
            <div className="grid grid-cols-1 gap-4">
              {viewMode === 'edit' && (
                <textarea
                  ref={textareaRef}
                  required
                  rows={8}
                  placeholder="Duyurunuzun detaylarını yazınız. Yukarıdaki biçimlendirme araçlarını (Kalın, İtalik, Listeler, Tablo, Alıntı vb.) kullanabilirsiniz..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-sans leading-relaxed focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
                />
              )}

              {viewMode === 'split' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <textarea
                    ref={textareaRef}
                    required
                    rows={10}
                    placeholder="Markdown / Zengin metin düzenleyici..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono leading-relaxed focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/20 dark:bg-purple-950/10 overflow-y-auto max-h-72">
                    <div className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 mb-2">
                      Canlı Çıktı Önizlemesi:
                    </div>
                    {content.trim() ? (
                      <RichTextRenderer content={content} />
                    ) : (
                      <p className="text-xs text-slate-400 italic">Yazdıkça önizleme burada görünecektir...</p>
                    )}
                  </div>
                </div>
              )}

              {viewMode === 'preview' && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 min-h-48 overflow-y-auto max-h-80">
                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">
                    {title || 'Duyuru Başlığı'}
                  </h3>
                  {content.trim() ? (
                    <RichTextRenderer content={content} />
                  ) : (
                    <p className="text-xs text-slate-400 italic">Henüz duyuru metni girilmedi.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tags & Resources / Attachments Section */}
          <div className="space-y-4">
            
            {/* Dedicated Dosya / Bağlantı Linki (Okul & Harici Doküman Kaynakları) */}
            <div className="bg-slate-50/90 dark:bg-slate-800/60 p-4 sm:p-5 rounded-3xl border border-purple-200/80 dark:border-purple-900/50 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-purple-600 text-white shadow-xs">
                      <Link2 className="w-4 h-4" />
                    </span>
                    Dosya / Bağlantı Linki (Okul Kaynakları & Harici Dokümanlar)
                    {attachments.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        {attachments.length} Ek Bağlantı
                      </span>
                    )}
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Öğretmenler okul kaynakları, Google Drive, MEB/EBA eğitim portalları veya harici PDF/belgelere doğrudan bağlantı referansı verebilir.
                  </p>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">Hızlı Kaynak:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyResourcePreset('drive')}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    title="Google Drive Klasörü / Dokümanı Bağla"
                  >
                    <HardDrive className="w-3 h-3 text-blue-500" /> Drive
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyResourcePreset('meb')}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-rose-400 hover:text-rose-600 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    title="MEB / EBA / OGM Materyal Kaynağı Bağla"
                  >
                    <Globe className="w-3 h-3 text-rose-500" /> MEB / EBA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyResourcePreset('pdf')}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    title="PDF Çalışma Notu veya Sınav Dokümanı"
                  >
                    <FileText className="w-3 h-3 text-amber-500" /> PDF Belgesi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyResourcePreset('school')}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-purple-400 hover:text-purple-600 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    title="Okul Resmi Web Portalı"
                  >
                    <School className="w-3 h-3 text-purple-500" /> Okul Portalı
                  </button>
                </div>
              </div>

              {/* Direct Add Input Bar */}
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-6">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Dosya / Bağlantı Linki (URL) *
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://drive.google.com/... veya https://ogmmateryal.eba.gov.tr/..."
                        value={attachUrl}
                        onChange={(e) => setAttachUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddAttachment();
                          }
                        }}
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      />
                      <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Doküman / Kaynak Başlığı
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: 10-A Sınav Çalışma Fasikülü"
                      value={attachName}
                      onChange={(e) => setAttachName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAttachment();
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleAddAttachment()}
                      disabled={!attachUrl.trim()}
                      className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Link Ekle</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Added Reference Links List */}
              {attachments.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                    Duyuruya Eklenmiş Referans Dokümanlar ({attachments.length}):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map((att) => {
                      const isDrive = att.url.includes('drive.google.com');
                      const isMeb = att.url.includes('eba.gov.tr') || att.url.includes('meb.gov.tr');
                      const isPdf = att.url.toLowerCase().endsWith('.pdf') || att.type === 'pdf';

                      return (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 px-3 bg-white dark:bg-slate-900 rounded-2xl text-xs border border-purple-100 dark:border-purple-900/60 shadow-2xs hover:border-purple-300 transition group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              isDrive ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400' :
                              isMeb ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400' :
                              isPdf ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400' :
                              'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400'
                            }`}>
                              {isDrive ? <HardDrive className="w-4 h-4" /> :
                               isMeb ? <Globe className="w-4 h-4" /> :
                               isPdf ? <FileText className="w-4 h-4" /> :
                               <Link className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white truncate text-xs">
                                {att.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate font-mono">
                                {att.url}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition"
                              title="Bağlantıyı Yeni Sekmede Test Et"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(att.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                              title="Bağlantıyı Kaldır"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Tags Input Section */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-purple-600" />
                Duyuru Etiketleri (Konu Başlıkları)
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Etiket yazıp Enter'a basınız (örn: Sınav, Proje, MEB, Duyuru)..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-purple-900 p-0.5 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500">
              Yayınlayan: <strong className="text-slate-800 dark:text-slate-200">{currentUser?.displayName}</strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{announcementToEdit ? 'Değişiklikleri Kaydet' : 'Duyuruyu Yayınla'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
