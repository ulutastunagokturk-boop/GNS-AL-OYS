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
  KeyRound
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { dataService } from '../../services/dataService';
import { ExcelStudentRow, ExcelImportSummary } from '../../types';

interface ExcelStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ExcelStudentImportModal: React.FC<ExcelStudentImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [parsedRows, setParsedRows] = useState<ExcelStudentRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ExcelImportSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Generate and download a sample Excel template (.xlsx)
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Ad Soyad': 'Ahmet Yılmaz',
        'Okul No': '1042',
        'Sinif Sube': '9-A',
        'Ogrenci Sifresi': 'Gnsial1042!',
        'Veli Adi Soyadi': 'Mehmet Yılmaz',
        'Veli Telefonu': '05551234567',
        'Veli Eposta': 'mehmet.yilmaz@gmail.com',
        'Veli Sifresi': 'veli1042'
      },
      {
        'Ad Soyad': 'Zeynep Kaya',
        'Okul No': '1043',
        'Sinif Sube': '9-B',
        'Ogrenci Sifresi': '',
        'Veli Adi Soyadi': 'Ayşe Kaya',
        'Veli Telefonu': '05559876543',
        'Veli Eposta': 'ayse.kaya@gmail.com',
        'Veli Sifresi': ''
      },
      {
        'Ad Soyad': 'Emre Demir',
        'Okul No': '1044',
        'Sinif Sube': '10-A',
        'Ogrenci Sifresi': '',
        'Veli Adi Soyadi': 'Ali Demir',
        'Veli Telefonu': '05321112233',
        'Veli Eposta': '',
        'Veli Sifresi': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 22 }, // Ad Soyad
      { wch: 12 }, // Okul No
      { wch: 14 }, // Sınıf Şube
      { wch: 18 }, // Öğrenci Şifresi
      { wch: 22 }, // Veli Adı Soyadı
      { wch: 16 }, // Veli Telefonu
      { wch: 24 }, // Veli E-posta
      { wch: 16 }  // Veli Şifresi
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ogrenci_Listesi');
    XLSX.writeFile(workbook, 'GNSIAL_Toplu_Ogrenci_Sablonu.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setIsProcessingFile(true);
    setErrorMsg(null);
    setFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('Yüklenen Excel dosyasında hiç veri bulunamadı.');
        }

        // Map columns dynamically by matching keywords
        const normalizedRows: ExcelStudentRow[] = rawRows.map((r, idx) => {
          const keys = Object.keys(r);
          
          // Match helper
          const findVal = (keywords: string[]) => {
            for (const key of keys) {
              const lowerKey = key.trim().toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
              if (keywords.some(kw => lowerKey.includes(kw))) {
                return String(r[key]).trim();
              }
            }
            return '';
          };

          const name = findVal(['adsoyad', 'ogrenciadi', 'adisoyadi', 'ad', 'isim']);
          const schoolNumber = findVal(['okulno', 'ogrencino', 'numara', 'no']);
          const classGrade = findVal(['sinifsube', 'sinif', 'sube', 'grade']);
          const password = findVal(['ogrencisifre', 'sifre', 'parola']);
          const parentName = findVal(['veliadi', 'velisoyadi', 'veli', 'annebaba']);
          const parentPhone = findVal(['velitelefon', 'velitel', 'telefon', 'tel']);
          const parentEmail = findVal(['velieposta', 'velimail', 'eposta', 'email']);
          const parentPassword = findVal(['velisifre', 'veliparola']);

          let validationError: string | undefined = undefined;
          if (!name) validationError = 'Öğrenci Adı Soyadı eksik.';
          else if (!schoolNumber) validationError = 'Okul No eksik.';
          else if (!classGrade) validationError = 'Sınıf/Şube (Örn: 9-A) eksik.';

          return {
            name,
            schoolNumber,
            classGrade: classGrade.toUpperCase(),
            password: password || undefined,
            parentName: parentName || undefined,
            parentPhone: parentPhone || undefined,
            parentEmail: parentEmail || undefined,
            parentPassword: parentPassword || undefined,
            validationError
          };
        });

        // Check for duplicates in uploaded sheet
        const schoolNumberCount: Record<string, number> = {};
        normalizedRows.forEach(r => {
          if (r.schoolNumber) {
            schoolNumberCount[r.schoolNumber] = (schoolNumberCount[r.schoolNumber] || 0) + 1;
          }
        });

        normalizedRows.forEach(r => {
          if (r.schoolNumber && schoolNumberCount[r.schoolNumber] > 1) {
            r.validationError = `Mükerrer Okul No: '${r.schoolNumber}' tabloda birden çok kez geçiyor.`;
          }
        });

        setParsedRows(normalizedRows);
      } catch (err: any) {
        setErrorMsg(err.message || 'Excel dosyası okunurken hata oluştu.');
        setParsedRows([]);
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Dosya okunamadı. Lütfen geçerli bir .xlsx veya .csv dosyası yükleyin.');
      setIsProcessingFile(false);
    };

    reader.readAsBinaryString(file);
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

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => !r.validationError);
    if (validRows.length === 0) {
      setErrorMsg('İçe aktarılacak geçerli öğrenci kaydı bulunamadı.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);

    try {
      const summary = await dataService.bulkImportStudentsFromExcel(validRows);
      setImportSummary(summary);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Öğrenciler kaydedilirken hata oluştu.');
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter(r => !r.validationError).length;
  const invalidCount = parsedRows.filter(r => !!r.validationError).length;
  const withParentCount = parsedRows.filter(r => !r.validationError && (r.parentName || r.parentPhone)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full p-6 sm:p-8 relative max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Excel ile Toplu Öğrenci & Veli Ekleme
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Öğrenci ve veli kayıtlarını Excel tablosu (.xlsx) yükleyerek tek seferde oluşturun.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5">
          {/* Action Row: Download Template & Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                Standart Excel Şablonu
              </span>
              <p className="text-[11px] text-slate-500">
                Sütun başlıklarının ve örnek verilerin bulunduğu hazır Excel dosyasını indirin.
              </p>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Örnek Excel Şablonu İndir (.xlsx)</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          {!parsedRows.length && !importSummary && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl p-8 text-center transition cursor-pointer bg-slate-50/50 dark:bg-slate-800/20 hover:bg-emerald-50/20"
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                Excel veya CSV Dosyanızı Buraya Sürükleyin
              </p>
              <p className="text-xs text-slate-400 mt-1">
                veya bilgisayarınızdan seçmek için tıklayın (.xlsx, .xls, .csv)
              </p>
              {isProcessingFile && (
                <div className="flex items-center justify-center gap-2 mt-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Excel tablosu analiz ediliyor...</span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Summary Banner */}
          {importSummary && (
            <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base">Toplu İçe Aktarma Başarıyla Tamamlandı!</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Öğrenci ve veli hesapları Firestore veritabanına ve yerel depoya anında senkronize edildi.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/80">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Eklenen Öğrenci</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{importSummary.importedStudents}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/80">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Oluşturulan Veli</span>
                  <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{importSummary.createdParents}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/80">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Hatalı / Atlanan</span>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400">{importSummary.skippedOrErrors}</p>
                </div>
              </div>
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && !importSummary && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Önizleme: <strong>{fileName}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    {validCount} Geçerli
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                      {invalidCount} Hatalı
                    </span>
                  )}
                  {withParentCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                      {withParentCount} Veli Tanımlı
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    setParsedRows([]);
                    setFileName('');
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer self-start"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Dosyayı Değiştir</span>
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Öğrenci Adı Soyadı</th>
                      <th className="py-2.5 px-3">Okul No</th>
                      <th className="py-2.5 px-3">Sınıf/Şube</th>
                      <th className="py-2.5 px-3">Veli Adı & Telefon</th>
                      <th className="py-2.5 px-3">Öğrenci Şifresi</th>
                      <th className="py-2.5 px-3 text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.validationError ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}>
                        <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {row.name || <span className="text-rose-500 italic">Eksik</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {row.schoolNumber || <span className="text-rose-500 italic">Eksik</span>}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                          {row.classGrade || <span className="text-rose-500 italic">Eksik</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {row.parentName ? (
                            <div>
                              <span>{row.parentName}</span>
                              {row.parentPhone && <span className="text-[10px] text-slate-400 block">{row.parentPhone}</span>}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Veli girilmedi</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {row.password ? row.password : <span className="text-emerald-600 font-semibold">Otomatik Üretilecek</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {row.validationError ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" title={row.validationError}>
                              {row.validationError}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Hazır
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {importSummary ? 'Kapat' : 'İptal'}
          </button>

          {parsedRows.length > 0 && !importSummary && (
            <button
              onClick={handleExecuteImport}
              disabled={isImporting || validCount === 0}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>İçe Aktarılıyor...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{validCount} Öğrenciyi Sisteme Aktar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
