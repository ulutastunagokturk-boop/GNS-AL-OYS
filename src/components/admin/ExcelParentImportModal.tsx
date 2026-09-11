import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Users, 
  Sparkles, 
  ArrowRight, 
  RefreshCw,
  Trash2,
  FileCheck,
  ShieldCheck,
  KeyRound,
  UserCheck,
  Phone,
  Mail,
  GraduationCap,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { dataService } from '../../services/dataService';
import { ExcelParentRow, ExcelParentImportSummary, UserProfile } from '../../types';

interface ExcelParentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ExcelParentImportModal: React.FC<ExcelParentImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [parsedRows, setParsedRows] = useState<ExcelParentRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ExcelParentImportSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const existingStudents = dataService.getStudents();

  // Generate and download a sample Excel template (.xlsx)
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Veli Adi Soyadi': 'Mehmet Yılmaz',
        'Veli Telefonu': '05551234567',
        'Veli E-Posta': 'mehmet.yilmaz@gmail.com',
        'Veli Sifresi': 'veli1042',
        'Ogrenci Okul No': '1042',
        'Ogrenci Adi Soyadi': 'Ahmet Yılmaz',
        'Yakinlik': 'Baba',
        'Notlar': 'Sınıf veli temsilcisi'
      },
      {
        'Veli Adi Soyadi': 'Ayşe Kaya',
        'Veli Telefonu': '05559876543',
        'Veli E-Posta': 'ayse.kaya@gmail.com',
        'Veli Sifresi': '',
        'Ogrenci Okul No': '1043, 1044',
        'Ogrenci Adi Soyadi': 'Zeynep Kaya, Emre Kaya',
        'Yakinlik': 'Anne',
        'Notlar': 'İki öğrenci velisi (Kardeş)'
      },
      {
        'Veli Adi Soyadi': 'Ali Demir',
        'Veli Telefonu': '05321112233',
        'Veli E-Posta': 'ali.demir@hotmail.com',
        'Veli Sifresi': '',
        'Ogrenci Okul No': '1045',
        'Ogrenci Adi Soyadi': 'Can Demir',
        'Yakinlik': 'Vasi',
        'Notlar': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 22 }, // Veli Adı Soyadı
      { wch: 18 }, // Veli Telefonu
      { wch: 26 }, // Veli E-Posta
      { wch: 16 }, // Veli Şifresi
      { wch: 20 }, // Öğrenci Okul No
      { wch: 24 }, // Öğrenci Adı Soyadı
      { wch: 14 }, // Yakınlık
      { wch: 25 }  // Notlar
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Veli_Listesi');
    XLSX.writeFile(workbook, 'GNSIAL_Toplu_Veli_Sablonu.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Universal reader supporting all Excel formats: .xlsx, .xls, .csv, .ods, .tsv, .txt
  const processSelectedFile = async (file: File) => {
    setIsProcessingFile(true);
    setErrorMsg(null);
    setFileName(file.name);
    setImportSummary(null);

    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      
      // Read with SheetJS - type: 'array' handles all formats and Turkish characters
      const workbook = XLSX.read(data, { 
        type: 'array',
        codepage: 65001 // UTF-8
      });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Yüklenen tabloda herhangi bir çalışma sayfası (sayfa) bulunamadı.');
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert sheet to JSON array
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        throw new Error('Yüklenen tabloda işlenecek veri satırı bulunamadı.');
      }

      // Map columns dynamically by matching Turkish and English keywords
      const normalizedRows: ExcelParentRow[] = rawRows.map((r) => {
        const keys = Object.keys(r);
        
        // Flexible key matcher
        const findVal = (keywords: string[]) => {
          for (const key of keys) {
            const cleanKey = key.trim().toLowerCase()
              .replace(/[\s_\-\.\/\(\)]/g, '')
              .replace(/ı/g, 'i')
              .replace(/ğ/g, 'g')
              .replace(/ü/g, 'u')
              .replace(/ş/g, 's')
              .replace(/ö/g, 'o')
              .replace(/ç/g, 'c');

            if (keywords.some(kw => cleanKey.includes(kw))) {
              const val = r[key];
              if (val !== undefined && val !== null) {
                return String(val).trim();
              }
            }
          }
          return '';
        };

        const parentName = findVal(['veliadisoyadi', 'veliadi', 'veliismi', 'veli', 'annebaba', 'adsoyad', 'isim', 'ad', 'parentname', 'parent']);
        const parentPhone = findVal(['velitelefonu', 'velitelefon', 'velitel', 'telefon', 'tel', 'phone', 'gsm', 'cep', 'contact']);
        const parentEmail = findVal(['velieposta', 'velie-posta', 'velimail', 'eposta', 'e-posta', 'email', 'mail']);
        const parentPassword = findVal(['velisifresi', 'velisifre', 'veliparola', 'sifre', 'parola', 'password']);
        const studentNumbers = findVal(['ogrenciokulno', 'ogrencino', 'okulno', 'ogrencino1', 'numara', 'ogrencilerno', 'studentno', 'no']);
        const studentName = findVal(['ogrenciadisoyadi', 'ogrenciadi', 'ogrenciismi', 'ogrenci', 'cocuk', 'studentname']);
        const relationship = findVal(['yakinlik', 'derece', 'iliski', 'annebaba', 'vasi']);
        const notes = findVal(['notlar', 'not', 'aciklama', 'notes', 'bilgi']);

        // Check matching students in the system
        const parsedNos = studentNumbers
          ? studentNumbers.split(/[,;\/\s]+/).map(s => s.trim().replace(/^#/, '')).filter(Boolean)
          : [];

        const matchedStudentDetails: {
          uid: string;
          displayName: string;
          schoolNumber: string;
          classGrade?: string;
        }[] = [];

        for (const no of parsedNos) {
          const match = existingStudents.find(s => s.schoolNumber === no);
          if (match && !matchedStudentDetails.some(m => m.uid === match.uid)) {
            matchedStudentDetails.push({
              uid: match.uid,
              displayName: match.displayName,
              schoolNumber: match.schoolNumber || no,
              classGrade: match.classGrade
            });
          }
        }

        // Try matching by student name if no school number was provided or matched
        if (matchedStudentDetails.length === 0 && studentName) {
          const lowerStName = studentName.toLowerCase();
          const matchByName = existingStudents.filter(s => 
            s.displayName.toLowerCase().includes(lowerStName) || lowerStName.includes(s.displayName.toLowerCase())
          );
          matchByName.forEach(m => {
            if (!matchedStudentDetails.some(item => item.uid === m.uid)) {
              matchedStudentDetails.push({
                uid: m.uid,
                displayName: m.displayName,
                schoolNumber: m.schoolNumber || '',
                classGrade: m.classGrade
              });
            }
          });
        }

        let validationError: string | undefined = undefined;
        if (!parentName && !parentPhone && !parentEmail) {
          validationError = 'Veli adı, telefonu veya e-postası boş olamaz.';
        } else if (!parentName) {
          validationError = 'Veli Adı Soyadı eksik.';
        } else if (!parentPhone && !parentEmail) {
          validationError = 'Giriş için Veli Telefonu veya E-Postası zorunludur.';
        }

        return {
          parentName,
          parentPhone,
          parentEmail: parentEmail || undefined,
          parentPassword: parentPassword || undefined,
          studentNumbers: studentNumbers || undefined,
          studentName: studentName || undefined,
          relationship: relationship || undefined,
          notes: notes || undefined,
          validationError,
          matchedStudentDetails
        };
      });

      // Check for phone duplicate within this sheet
      const phoneCounts: Record<string, number> = {};
      normalizedRows.forEach(r => {
        const cleanDig = r.parentPhone ? r.parentPhone.replace(/\D/g, '') : '';
        if (cleanDig && cleanDig.length >= 7) {
          phoneCounts[cleanDig] = (phoneCounts[cleanDig] || 0) + 1;
        }
      });

      normalizedRows.forEach(r => {
        const cleanDig = r.parentPhone ? r.parentPhone.replace(/\D/g, '') : '';
        if (cleanDig && phoneCounts[cleanDig] > 1 && !r.validationError) {
          r.validationError = `Mükerrer Telefon: '${r.parentPhone}' tabloda birden çok satırda geçiyor.`;
        }
      });

      setParsedRows(normalizedRows);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Tablo dosyası okunurken hata oluştu. Lütfen dosya biçimini kontrol edin.');
      setParsedRows([]);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleRemoveRow = (index: number) => {
    setParsedRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName('');
    setImportSummary(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Perform bulk import
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => !r.validationError);
    if (validRows.length === 0) {
      setErrorMsg('İçe aktarılacak geçerli veli kaydı bulunamadı.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);

    try {
      const summary = await dataService.bulkImportParentsFromExcel(validRows, 'Yönetici (Admin)');
      setImportSummary(summary);

      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Toplu veli kaydı yapılırken hata oluştu.');
    } finally {
      setIsImporting(false);
    }
  };

  const totalValid = parsedRows.filter(r => !r.validationError).length;
  const totalErrors = parsedRows.filter(r => !!r.validationError).length;
  const totalMatchedStudents = parsedRows.reduce((acc, curr) => acc + (curr.matchedStudentDetails?.length || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Excel ile Toplu Veli Hesabı Tanımlama
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                  Tüm Formatlar Desteklenir
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                .xlsx, .xls, .csv, .ods, .tsv tablolarını yükleyerek veli hesaplarını otomatik açın ve öğrencilerle bağlayın
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Action Success Card */}
          {importSummary && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-base text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Toplu Veli İçe Aktarma İşlemi Başarıyla Tamamlandı!</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
                <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {importSummary.createdParents}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Yeni Veli Hesabı
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {importSummary.updatedParents}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Güncellenen Veli
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                    {importSummary.linkedStudentsCount}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Öğrenci Bağlantısı
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="text-2xl font-black text-slate-600 dark:text-slate-400">
                    {importSummary.totalRows}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Toplam İşlenen
                  </div>
                </div>
              </div>

              <p className="text-xs text-emerald-700 dark:text-emerald-300 pt-1">
                Veliler sisteme kaydedildi ve şifreleri tanımlandı. Veliler cep telefonu veya e-posta adresleriyle portala giriş yapabilirler. Veriler yerel hafızaya kaydedilip Supabase bulut veritabanına otomatik senkronize edildi.
              </p>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  Tamam, Listeye Dön
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Step 1: Template Download & Help Banner */}
          {!importSummary && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Hazır Excel Şablonu ile Kolayca Yükleyin</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                  Tablonuzda <span className="font-semibold text-slate-700 dark:text-slate-300">Veli Adı, Telefonu, Öğrenci Okul No</span> sütunları bulunması yeterlidir. Sistem sütun başlıklarını otomatik tanır.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-300 hover:text-emerald-600 text-xs font-bold transition flex items-center gap-2 shadow-xs shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Örnek Veli Şablonu (.xlsx) İndir
              </button>
            </div>
          )}

          {/* Step 2: Drag and Drop Upload Zone */}
          {!importSummary && parsedRows.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, .ods, .tsv, .txt, .xlsm"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Tablo dosyasını buraya sürükleyin veya seçmek için tıklayın
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-3">
                Desteklenen formatlar: <span className="font-bold text-emerald-600 dark:text-emerald-400">.xlsx, .xls, .csv, .ods, .tsv, .txt</span>
              </p>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                Dosya Seç
              </span>
            </div>
          )}

          {/* Loading state during parsing */}
          {isProcessingFile && (
            <div className="py-8 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Excel tablosu okunuyor ve öğrencilerle eşleştiriliyor...
              </p>
            </div>
          )}

          {/* Step 3: Parsed Rows Preview Grid */}
          {!importSummary && parsedRows.length > 0 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {fileName}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        {totalValid} Geçerli Kayıt
                      </span>
                      {totalErrors > 0 && (
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          • {totalErrors} Hatalı / Uyarılı
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-slate-500">
                        • {totalMatchedStudents} Eşleşen Öğrenci
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    Farklı Dosya Seç
                  </button>
                  <button
                    onClick={handleExecuteImport}
                    disabled={isImporting || totalValid === 0}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {totalValid} Veliyi İçe Aktar ve Hesapları Aç
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Table of Parsed Parents */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-4 w-10 text-center">#</th>
                        <th className="py-3 px-4">Veli Adı Soyadı</th>
                        <th className="py-3 px-4">Telefon</th>
                        <th className="py-3 px-4">E-Posta</th>
                        <th className="py-3 px-4">Şifre</th>
                        <th className="py-3 px-4">Bağlı Öğrenci(ler)</th>
                        <th className="py-3 px-4">Durum</th>
                        <th className="py-3 px-4 w-12 text-center">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedRows.map((row, idx) => {
                        const cleanDigits = (row.parentPhone || '').replace(/\D/g, '');
                        const defaultPass = `veli${cleanDigits.slice(-4) || '1234'}`;
                        const displayPass = row.parentPassword || defaultPass;

                        return (
                          <tr 
                            key={idx}
                            className={`transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                              row.validationError 
                                ? 'bg-rose-50/40 dark:bg-rose-950/20' 
                                : ''
                            }`}
                          >
                            <td className="py-3 px-4 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>

                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {row.parentName || <span className="text-rose-500 italic">Eksik</span>}
                              {row.relationship && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {row.relationship}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                              {row.parentPhone ? (
                                <span className="font-mono">{row.parentPhone}</span>
                              ) : (
                                <span className="text-slate-400 italic">Belirtilmedi</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                              {row.parentEmail || (
                                <span className="text-slate-400 italic">
                                  {cleanDigits ? `veli.${cleanDigits.slice(-7)}@...` : 'Otomatik'}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {displayPass}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              {row.matchedStudentDetails && row.matchedStudentDetails.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.matchedStudentDetails.map((st, sIdx) => (
                                    <span 
                                      key={sIdx}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                    >
                                      <GraduationCap className="w-3 h-3" />
                                      {st.displayName} ({st.classGrade ? `${st.classGrade}, ` : ''}#{st.schoolNumber})
                                    </span>
                                  ))}
                                </div>
                              ) : row.studentNumbers ? (
                                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                                  No: #{row.studentNumbers} (Öğrenci bulunamadı)
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Öğrenci belirtilmedi
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {row.validationError ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  {row.validationError}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  Hazır
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleRemoveRow(idx)}
                                title="Satırı kaldır"
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0 && (
              <span>Toplam <strong className="text-slate-900 dark:text-white">{parsedRows.length}</strong> veli satırı okundu.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Kapat
            </button>
            
            {parsedRows.length > 0 && !importSummary && (
              <button
                onClick={handleExecuteImport}
                disabled={isImporting || totalValid === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    İçe Aktarılıyor...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {totalValid} Veliyi Kaydet
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
