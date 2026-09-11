import React, { useState } from 'react';
import { 
  KeyRound, 
  RefreshCw, 
  Copy, 
  Check, 
  Printer, 
  Search, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  GraduationCap, 
  X, 
  Sparkles, 
  Lock,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../../types';
import { dataService } from '../../services/dataService';
import { 
  generateUniqueStudentPassword, 
  generatePasswordBatch, 
  PasswordStyle, 
  calculatePasswordStrength 
} from '../../utils/passwordGenerator';

interface StudentPasswordToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserDisplayName: string;
}

export const StudentPasswordToolModal: React.FC<StudentPasswordToolModalProps> = ({
  isOpen,
  onClose,
  currentUserDisplayName
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'generator'>('students');

  // Generator Sandbox State
  const [genStyle, setGenStyle] = useState<PasswordStyle>('school');
  const [genCount, setGenCount] = useState<number>(5);
  const [genPrefix, setGenPrefix] = useState<string>('Gns');
  const [generatedList, setGeneratedList] = useState<string[]>(() => 
    generatePasswordBatch(5, 'school')
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Students Credential State
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [visiblePasswordUid, setVisiblePasswordUid] = useState<string | null>(null);
  const [copiedStudentUid, setCopiedStudentUid] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const users = dataService.getUsers();
  const students = users.filter(u => u.role === 'student');
  const classes = dataService.getClasses();

  // Filtered students
  const filteredStudents = students.filter(s => {
    const q = (studentSearch || '').toLowerCase();
    const matchesSearch = 
      (s.displayName || '').toLowerCase().includes(q) ||
      (s.schoolNumber && s.schoolNumber.includes(studentSearch)) ||
      (s.classGrade && s.classGrade.toLowerCase().includes(q));

    const matchesClass = selectedClass === 'all' || s.classGrade === selectedClass;
    return matchesSearch && matchesClass;
  });

  // Handle Generator Click
  const handleRegenerateBatch = () => {
    const results: string[] = [];
    for (let i = 0; i < genCount; i++) {
      results.push(generateUniqueStudentPassword({ style: genStyle, customPrefix: genPrefix }));
    }
    setGeneratedList(results);
    setCopiedAll(false);
  };

  const handleCopySingle = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAllGenerated = () => {
    navigator.clipboard.writeText(generatedList.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Handle Reset/Reassign Password for an existing Student
  const handleReassignStudentPassword = async (student: UserProfile) => {
    const newPass = generateUniqueStudentPassword({ 
      style: 'school', 
      schoolNumber: student.schoolNumber 
    });
    await dataService.resetUserPassword(student.uid, newPass, currentUserDisplayName);
    setActionMessage(`✓ ${student.displayName} (#${student.schoolNumber}) için yeni eşsiz şifre (${newPass}) tanımlandı.`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleCopyStudentCredentials = (student: UserProfile) => {
    const text = `Öğrenci: ${student.displayName}\nOkul No: ${student.schoolNumber || '-'}\nSınıf: ${student.classGrade || '-'}\nGiriş Şifresi: ${student.password || 'Gns2026!'}`;
    navigator.clipboard.writeText(text);
    setCopiedStudentUid(student.uid);
    setTimeout(() => setCopiedStudentUid(null), 2000);
  };

  // Batch ensure missing passwords
  const handleBatchEnsurePasswords = async () => {
    const result = await dataService.batchEnsureStudentPasswords(currentUserDisplayName);
    if (result.updatedCount > 0) {
      setActionMessage(`✓ ${result.updatedCount} adet öğrenciye yeni eşsiz şifre atandı ve kaydedildi.`);
    } else {
      setActionMessage(`Tüm kayıtlı öğrencilerin sistemde geçerli birer şifresi bulunmaktadır.`);
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Copy as CSV / Excel table
  const handleCopyAsExcel = () => {
    const header = "Okul No\tAd Soyad\tSınıf\tGiriş Şifresi\tE-Posta\n";
    const rows = filteredStudents.map(s => 
      `${s.schoolNumber || '-'}\t${s.displayName}\t${s.classGrade || '-'}\t${s.password || '-'}\t${s.email}`
    ).join('\n');
    navigator.clipboard.writeText(header + rows);
    setActionMessage(`✓ ${filteredStudents.length} öğrencinin bilgileri Excel/Tablo formatında kopyalandı.`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  // Print Student Login Slips
  const handlePrintSlips = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Yazdırma penceresi açılamadı. Lütfen tarayıcı açılır pencere (popup) engelini kaldırınız.');
      return;
    }

    const cardsHtml = filteredStudents.map(s => `
      <div style="border: 2px dashed #94a3b8; border-radius: 12px; padding: 14px; page-break-inside: avoid; font-family: sans-serif; background: #fafafa;">
        <div style="font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px;">
          Gaziemir Nevvar Salih İşgören Anadolu Lisesi — Öğrenci Giriş Kartı
        </div>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="color: #64748b; padding: 3px 0; width: 35%;">Öğrenci Adı:</td>
            <td style="font-weight: bold; color: #0f172a;">${s.displayName}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 3px 0;">Okul Numarası:</td>
            <td style="font-weight: bold; font-family: monospace; font-size: 14px; color: #4338ca;">#${s.schoolNumber || '-'}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 3px 0;">Sınıf / Şube:</td>
            <td style="font-weight: 600; color: #0f172a;">${s.classGrade || '-'}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 3px 0;">Giriş Şifresi:</td>
            <td style="font-weight: bold; font-family: monospace; font-size: 15px; color: #b45309; background: #fef3c7; padding: 2px 6px; border-radius: 4px; display: inline-block;">
              ${s.password || '-'}
            </td>
          </tr>
        </table>
        <div style="font-size: 10px; color: #64748b; margin-top: 8px; border-top: 1px dotted #cbd5e1; padding-top: 4px;">
          * Portala giriş yaparken Okul Numaranızı ve yukarıdaki şifreyi giriniz. Şifrenizi kimseyle paylaşmayınız.
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Öğrenci Giriş Bilgi Kartları - GNSİAL</title>
          <style>
            @media print {
              body { margin: 0; padding: 10mm; }
              @page { size: A4; margin: 10mm; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
            h2 { text-align: center; margin-bottom: 20px; font-size: 18px; color: #1e293b; }
          </style>
        </head>
        <body>
          <h2>Gaziemir Nevvar Salih İşgören Anadolu Lisesi<br><span style="font-size: 13px; font-weight: normal; color: #64748b;">Öğrenci Portal Giriş ve Şifre Kartları Dağıtım Listesi (${filteredStudents.length} Öğrenci)</span></h2>
          <div class="grid">
            ${cardsHtml}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-5 sm:p-7 relative max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 shrink-0">
          <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Öğrenci Şifre Üretici & Giriş Kartları Aracı</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-300/40">
                İdare Özel
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Öğrencilere eşsiz güvenli şifreler üretin, mevcut şifreleri listeleyin ve dağıtım için giriş kartları yazdırın.
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {actionMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/70 rounded-2xl mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'students'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-500" />
            <span>Kayıtlı Öğrenci Şifreleri ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Eşsiz Şifre Üreteci (Sandbox)</span>
          </button>
        </div>

        {/* TAB 1: REGISTERED STUDENTS & CREDENTIALS SHEET */}
        {activeTab === 'students' && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-3">
            
            {/* Action Bar & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Öğrenci adı veya okul no ara..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="all">Tüm Şubeler</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchEnsurePasswords}
                  className="py-1.5 px-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Şifresi eksik olan öğrencilere hemen eşsiz şifre atar"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Şifreleri Tamamla</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAsExcel}
                  className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Excel veya Google E-Tablolar için panoya kopyala"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel'e Kopyala</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintSlips}
                  className="py-1.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="Öğrencilere dağıtılacak giriş kartlarını yazdır"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Giriş Kartları Yazdır</span>
                </button>
              </div>
            </div>

            {/* Students List Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {studentSearch || selectedClass !== 'all' ? 'Arama kriterine uygun öğrenci bulunamadı.' : 'Henüz sisteme kayıtlı öğrenci bulunmuyor.'}
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3.5">Okul No</th>
                      <th className="py-2.5 px-3.5">Öğrenci Adı</th>
                      <th className="py-2.5 px-3.5">Sınıf</th>
                      <th className="py-2.5 px-3.5">Giriş Şifresi</th>
                      <th className="py-2.5 px-3.5 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudents.map(student => {
                      const isPasswordVisible = visiblePasswordUid === student.uid;
                      const hasCopied = copiedStudentUid === student.uid;

                      return (
                        <tr key={student.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            #{student.schoolNumber || '-'}
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-800 dark:text-slate-200">
                            {student.displayName}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              {student.classGrade || 'Atanmadı'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                                {isPasswordVisible ? (student.password || 'Gns2026!') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setVisiblePasswordUid(isPasswordVisible ? null : student.uid)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                                title={isPasswordVisible ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                              >
                                {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyStudentCredentials(student)}
                                className="py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="Öğrencinin giriş bilgilerini kopyala"
                              >
                                {hasCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{hasCopied ? 'Kopyalandı' : 'Kopyala'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleReassignStudentPassword(student)}
                                className="py-1 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                title="Öğrenciye yeni eşsiz bir şifre üret ve kaydet"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Yeni Şifre Üret</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <span>Toplam: <strong>{filteredStudents.length}</strong> öğrenci listeleniyor.</span>
              <span>💡 Öğrenciler giriş ekranında okul numarası ve şifrelerini birlikte yazmalıdır.</span>
            </div>
          </div>
        )}

        {/* TAB 2: GENERATOR SANDBOX */}
        {activeTab === 'generator' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Eşsiz Şifre Üretim Ayarları</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Şifre Stili / Formatı
                  </label>
                  <select
                    value={genStyle}
                    onChange={(e) => setGenStyle(e.target.value as PasswordStyle)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="school">Okul Formatı (Örn: Gns-4821#k)</option>
                    <option value="memorable">Akılda Kalıcı Kelime (Örn: Atlas-491!)</option>
                    <option value="strong">Güçlü Karma (Örn: jK9*mR2#4)</option>
                    <option value="pin">6 Haneli Güvenli PIN (Örn: 739201)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ön Ek (Prefix)
                  </label>
                  <input
                    type="text"
                    value={genPrefix}
                    onChange={(e) => setGenPrefix(e.target.value)}
                    placeholder="Örn: Gns veya 2026"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Üretilecek Miktar
                  </label>
                  <select
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={1}>1 Adet Şifre</option>
                    <option value={5}>5 Adet Şifre</option>
                    <option value={10}>10 Adet Şifre</option>
                    <option value={20}>20 Adet Şifre</option>
                    <option value={50}>50 Adet Şifre (Sınıf Listesi İçin)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRegenerateBatch}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-600/20 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Yeniden Eşsiz Şifreler Üret</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAllGenerated}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
                >
                  {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAll ? 'Tüm Şifreler Kopyalandı!' : 'Tümünü Panoya Kopyala'}</span>
                </button>
              </div>
            </div>

            {/* Generated Results List */}
            <div className="space-y-2">
              <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Üretilen Eşsiz Şifreler ({generatedList.length} Adet)</span>
                <span className="text-[11px] text-slate-400">Her biri birbirinden bağımsız ve eşsizdir</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {generatedList.map((pass, idx) => {
                  const strength = calculatePasswordStrength(pass);
                  const isCopied = copiedIndex === idx;

                  return (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="text-[11px] font-mono text-slate-400">#{idx + 1}</span>
                        <span className="font-mono text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-wider truncate">
                          {pass}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${strength.color} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700`}>
                          {strength.label}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopySingle(pass, idx)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Şifreyi Kopyala"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
