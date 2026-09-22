import * as XLSX from 'xlsx';

/**
 * Türkçe karakterleri düzgün şekilde küçültür (İ -> i, I -> ı vb.)
 */
export function toTurkishLower(str: string): string {
  if (!str) return '';
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/Ğ/g, 'ğ')
    .replace(/Ü/g, 'ü')
    .replace(/Ş/g, 'ş')
    .replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç')
    .toLowerCase();
}

/**
 * Türkçe karakterleri düzgün şekilde büyütür (i -> İ, ı -> I vb.)
 */
export function toTurkishUpper(str: string): string {
  if (!str) return '';
  return str
    .replace(/i/g, 'İ')
    .replace(/ı/g, 'I')
    .replace(/ğ/g, 'Ğ')
    .replace(/ü/g, 'Ü')
    .replace(/ş/g, 'Ş')
    .replace(/ö/g, 'Ö')
    .replace(/ç/g, 'Ç')
    .toUpperCase();
}

/**
 * Karakter eşleşmesi için anahtar kelimeleri normalize eder (tüm boşluk, noktalama ve Türkçe harfleri sadeleştirir)
 */
export function normalizeColumnKey(key: string): string {
  if (!key) return '';
  return toTurkishLower(key)
    .replace(/[\s_\-\.\/\(\)\[\]:,;*#\\"'`]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/**
 * Bozuk Türkçe karakter kodlamalarını (Mojibake: Windows-1254, ISO-8859-9, UTF-8 çift kodlama vb.) otomatik onarır.
 */
export function fixTurkishMojibake(text: string): string {
  if (!text || typeof text !== 'string') return text || '';

  let res = text;

  // 1. Çift kodlanmış (Double UTF-8 / Mojibake) durumlar
  res = res
    .replace(/ÃƒÂ§/g, 'ç')
    .replace(/Ãƒâ€¡/g, 'Ç')
    .replace(/ÃƒÂ‡/g, 'Ç')
    .replace(/ÃƒÂ¶/g, 'ö')
    .replace(/Ãƒâ€“/g, 'Ö')
    .replace(/ÃƒÂ–/g, 'Ö')
    .replace(/ÃƒÂ¼/g, 'ü')
    .replace(/ÃƒÅ“/g, 'Ü')
    .replace(/ÃƒÂœ/g, 'Ü')
    .replace(/Ã„ÂŸ/g, 'ğ')
    .replace(/Ã„Å¾/g, 'Ğ')
    .replace(/Ã„Âž/g, 'Ğ')
    .replace(/Ã…ÂŸ/g, 'ş')
    .replace(/Ã…Å¾/g, 'Ş')
    .replace(/Ã…Âž/g, 'Ş')
    .replace(/Ã„Â±/g, 'ı')
    .replace(/Ã„Â°/g, 'İ');

  // 2. Standart UTF-8 karakterlerin Latin-1 / Windows-1252 olarak açılması
  res = res
    // Küçük harfler
    .replace(/Ã§/g, 'ç')
    .replace(/Ã¶/g, 'ö')
    .replace(/Ã¼/g, 'ü')
    .replace(/ÄŸ/g, 'ğ')
    .replace(/ÅŸ/g, 'ş')
    .replace(/Ä±/g, 'ı')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã®/g, 'î')
    .replace(/Ã»/g, 'û')
    // Büyük harfler
    .replace(/Ã‡/g, 'Ç')
    .replace(/Ã–/g, 'Ö')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Äž/g, 'Ğ')
    .replace(/Åž/g, 'Ş')
    .replace(/Ä°/g, 'İ')
    .replace(/Ã‚/g, 'Â')
    .replace(/ÃŽ/g, 'Î')
    .replace(/Ã›/g, 'Û')
    // Windows-1254 (Türkçe ANSI) ISO-8859-1 olarak açıldığında:
    .replace(/ý/g, 'ı')
    .replace(/Ý/g, 'İ')
    .replace(/þ/g, 'ş')
    .replace(/Þ/g, 'Ş')
    .replace(/ð/g, 'ğ')
    .replace(/Ð/g, 'Ğ')
    // Bozuk tırnak ve semboller
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€“/g, '-')
    .replace(/â€”/g, '—')
    .replace(/\u00A0/g, ' '); // non-breaking space

  return res.trim();
}

/**
 * Sınıf şube ismini Türkçeye uygun standardize eder:
 * "9/A", "9 a", "9-a", "10-İ", "11/C", "12-Ç" -> "9-A", "10-İ", "11-C", "12-Ç"
 */
export function normalizeTurkishClassName(rawClass: string): string {
  if (!rawClass) return '';
  const trimmed = fixTurkishMojibake(rawClass).trim();
  
  if (toTurkishLower(trimmed).includes('tum okul') || toTurkishLower(trimmed).includes('tüm okul')) {
    return 'Tüm Okul';
  }

  // Regex ile 9-A, 10/B, 11 C, 12-Ç vb. ayrıştır
  const match = trimmed.match(/^(\d{1,2}|HAZIRLIK|Hazırlık)[\s\/\-\._]*([A-Za-zÇĞİÖŞÜçğıöşü]+)$/i);
  if (match) {
    const grade = match[1];
    const branch = toTurkishUpper(match[2]);
    return `${grade}-${branch}`;
  }

  return toTurkishUpper(trimmed);
}

/**
 * İki bayt kontrolü ile dosyanın gerçek bir ZIP/XLSX dosyası olup olmadığını anlar.
 */
function isZipFile(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/**
 * Dosyanın HTML veya XML tabanlı olup olmadığını anlar (e-Okul sık sık HTML dosyalarını .xls uzantısıyla indirir)
 */
function isHtmlOrXml(bytes: Uint8Array): boolean {
  // İlk 200 baytı string olarak tara
  const headLength = Math.min(bytes.length, 500);
  let text = '';
  for (let i = 0; i < headLength; i++) {
    text += String.fromCharCode(bytes[i]);
  }
  const lower = text.toLowerCase();
  return (
    lower.includes('<html') ||
    lower.includes('<table') ||
    lower.includes('<!doctype') ||
    lower.includes('<?xml') ||
    lower.includes('<workbook')
  );
}

/**
 * Tablodan gerçek başlık satırını (header row) akıllıca tespit eder.
 * e-Okul ve MEBBİS gibi sistemler tablonun başına 3-5 satır okul adı, tarih gibi bilgiler ekler.
 */
function findHeaderRowIndex(matrix: any[][]): number {
  if (!matrix || matrix.length === 0) return 0;

  const headerKeywords = [
    'ad', 'isim', 'soyad', 'ogrenci', 'no', 'numara', 'okulno', 
    'sinif', 'sube', 'veli', 'telefon', 'tel', 'sifre', 'tc', 'kimlik', 'parola'
  ];

  let bestIndex = 0;
  let maxScore = 0;

  const scanLimit = Math.min(matrix.length, 15);
  for (let r = 0; r < scanLimit; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    for (const cell of row) {
      if (cell === undefined || cell === null) continue;
      const str = normalizeColumnKey(String(cell));
      if (headerKeywords.some(kw => str.includes(kw))) {
        score++;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestIndex = r;
    }
  }

  // En az 2 anahtar kelime eşleştiyse o satırı başlık kabul et
  return maxScore >= 2 ? bestIndex : 0;
}

/**
 * Matrisi başlık satırından itibaren nesne dizisine dönüştürür.
 */
function matrixToJson(matrix: any[][], headerIndex: number): Record<string, any>[] {
  if (!matrix || matrix.length <= headerIndex) return [];

  const rawHeaders = matrix[headerIndex] || [];
  const headers: string[] = rawHeaders.map((h: any, i: number) => {
    const text = h !== undefined && h !== null ? fixTurkishMojibake(String(h)).trim() : '';
    return text || `Kolon_${i + 1}`;
  });

  const result: Record<string, any>[] = [];
  for (let r = headerIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;

    // Tamamen boş satırları atla
    const hasValue = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
    if (!hasValue) continue;

    const obj: Record<string, any> = {};
    headers.forEach((headerName, colIdx) => {
      let val = row[colIdx];
      if (typeof val === 'string') {
        val = fixTurkishMojibake(val).trim();
      }
      obj[headerName] = val !== undefined && val !== null ? val : '';
    });

    result.push(obj);
  }

  return result;
}

/**
 * Tüm Excel (.xlsx, .xls), CSV, TSV veya e-Okul HTML tablolarını Türkçe karakterleri
 * (UTF-8, UTF-8 with BOM, Windows-1254/ANSI, ISO-8859-9) bozmadan okuyan evrensel ayrıştırıcı.
 */
export async function readExcelWithTurkishSupport(file: File): Promise<any[]> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const fileName = file.name.toLowerCase();

  let rawRows: any[] = [];

  // 1. Durum: e-Okul HTML tablosu veya XML Spreadsheet (.xls olarak indirilmiş olabilir)
  if (isHtmlOrXml(bytes)) {
    let decodedHtml = '';

    // Önce UTF-8 dene
    try {
      decodedHtml = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {}

    // Türkçe karakter kontrolleri (Mojibake varsa Windows-1254 / CP1254 dene)
    if (!decodedHtml || decodedHtml.includes('\uFFFD') || /Ã§|Ã¶|Ã¼|ÄŸ|ÅŸ|Ä±|Ã‡|Ã–|Ãœ|Äž|Åž|Ä°|ý|þ|ð/.test(decodedHtml)) {
      try {
        const trText = new TextDecoder('windows-1254', { fatal: false }).decode(bytes);
        if (trText && !trText.includes('\uFFFD')) {
          decodedHtml = trText;
        }
      } catch {}
    }

    decodedHtml = fixTurkishMojibake(decodedHtml);

    try {
      const workbook = XLSX.read(decodedHtml, { type: 'string', raw: true });
      if (workbook.SheetNames && workbook.SheetNames.length > 0) {
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
        const headerIdx = findHeaderRowIndex(matrix);
        rawRows = matrixToJson(matrix, headerIdx);
      }
    } catch (e) {
      console.warn('[readExcelWithTurkishSupport] HTML/XML parse note:', e);
    }
  }

  // 2. Durum: CSV, TXT veya TSV dosyaları
  if ((!rawRows || rawRows.length === 0) && (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv'))) {
    let text = '';
    
    // Önce UTF-8 dene
    try {
      text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {}

    // Mojibake kontrolü -> Windows-1254 dene
    if (!text || text.includes('\uFFFD') || /Ã§|Ã¶|Ã¼|ÄŸ|ÅŸ|Ä±|Ã‡|Ã–|Ãœ|Äž|Åž|Ä°|ý|þ|ð/.test(text)) {
      try {
        const trText = new TextDecoder('windows-1254', { fatal: false }).decode(bytes);
        if (trText && !trText.includes('\uFFFD')) {
          text = trText;
        }
      } catch {}
    }

    text = fixTurkishMojibake(text);

    try {
      const workbook = XLSX.read(text, { type: 'string', raw: true });
      if (workbook.SheetNames && workbook.SheetNames.length > 0) {
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
        const headerIdx = findHeaderRowIndex(matrix);
        rawRows = matrixToJson(matrix, headerIdx);
      }
    } catch (e) {
      console.warn('[readExcelWithTurkishSupport] CSV parse note:', e);
    }
  }

  // 3. Durum: Standart XLSX veya gerçek ikili XLS dosyası
  if (!rawRows || rawRows.length === 0) {
    try {
      const workbook = XLSX.read(bytes, {
        type: 'array',
        codepage: 65001 // UTF-8
      });

      if (workbook.SheetNames && workbook.SheetNames.length > 0) {
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
        const headerIdx = findHeaderRowIndex(matrix);
        rawRows = matrixToJson(matrix, headerIdx);
      }
    } catch (e) {
      // Codepage 1254 (Windows-1254 Türkçe) ile tekrar dene
      try {
        const fallbackWorkbook = XLSX.read(bytes, {
          type: 'array',
          codepage: 1254
        });
        if (fallbackWorkbook.SheetNames && fallbackWorkbook.SheetNames.length > 0) {
          const sheet = fallbackWorkbook.Sheets[fallbackWorkbook.SheetNames[0]];
          const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
          const headerIdx = findHeaderRowIndex(matrix);
          rawRows = matrixToJson(matrix, headerIdx);
        }
      } catch (err) {
        throw new Error('Excel dosyası okunamadı. Lütfen geçerli bir .xlsx, .xls veya .csv dosyası yükleyin.');
      }
    }
  }

  if (!rawRows || rawRows.length === 0) {
    throw new Error('Yüklenen tabloda işlenecek veri satırı bulunamadı.');
  }

  // Bütün satırlardaki tüm anahtar ve değerleri Türkçe onarımından geçir
  const cleanedRows = rawRows.map(row => {
    const cleanObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      const cleanKey = fixTurkishMojibake(k).trim();
      let cleanVal = v;
      if (typeof v === 'string') {
        cleanVal = fixTurkishMojibake(v).trim();
      }
      cleanObj[cleanKey] = cleanVal;
    }
    return cleanObj;
  });

  return cleanedRows;
}

/**
 * Satır nesnesinden anahtar kelime eşleşmesine göre hücre değerini çeker.
 */
export function findRowValue(row: Record<string, any>, keywords: string[]): string {
  const keys = Object.keys(row);
  for (const key of keys) {
    const normalized = normalizeColumnKey(key);
    if (keywords.some(kw => normalized.includes(kw))) {
      const val = row[key];
      if (val !== undefined && val !== null) {
        return fixTurkishMojibake(String(val)).trim();
      }
    }
  }
  return '';
}
