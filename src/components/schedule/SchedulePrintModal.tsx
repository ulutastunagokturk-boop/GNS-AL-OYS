import React from 'react';
import { CLASS_PERIODS } from '../../services/scheduleData';
import { X, FileDown, CheckCircle2, Clock, Info } from 'lucide-react';

interface SchedulePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export const SchedulePrintModal: React.FC<SchedulePrintModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-xs animate-fade-in overflow-y-auto print-modal-container">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 print-sheet">
        
        {/* Modal Header & Quick Action Bar (Hidden in Print) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Ders ve Zil Saatleri Çizelgesi • PDF & Resmi Çıktı
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                08:50 - 15:45 okul idaresi resmi ders saatleri • A4 formatına tam uyumlu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="print-schedule-action-btn"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95"
            >
              <FileDown className="w-4 h-4" />
              <span>PDF Olarak İndir / Yazdır</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Guidance Banner (Hidden in Print) */}
        <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>İpucu:</strong> Açılan yazdırma penceresinde <strong>Hedef (Destination)</strong> kısmından <strong>"PDF Olarak Kaydet" (Save as PDF)</strong> seçerek belgenizi doğrudan indirebilirsiniz. Sayfa kenar boşlukları ve yazı stilleri otomatik olarak optimize edilmiştir.
          </span>
        </div>

        {/* Printable Official Paper Canvas Area */}
        <div className="p-6 sm:p-8 bg-white text-slate-950 space-y-5 print:p-4 print:space-y-4">
          
          {/* Official Document Header */}
          <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
            <div className="text-[11px] font-black tracking-widest text-slate-700 uppercase">
              T.C. MİLLÎ EĞİTİM BAKANLIĞI • İZMİR VALİLİĞİ • GAZİEMİR İLÇE MİLLÎ EĞİTİM MÜDÜRLÜĞÜ
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase leading-snug">
              GAZİEMİR NEVVAR SALİH İŞGÖREN ANADOLU LİSESİ MÜDÜRLÜĞÜ
            </h1>
            <div className="text-xs font-extrabold text-slate-800 tracking-wide uppercase">
              2026 - 2027 EĞİTİM VE ÖĞRETİM YILI GÜNLÜK DERS VE ZİL SAATLERİ ÇİZELGESİ
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="px-3.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wide">
                GÜNLÜK 8 DERS SAATİ
              </span>
              <span className="px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-800">
                ⏰ Ders Başlangıç: 08:50 • Çıkış: 15:45
              </span>
              <span className="px-3 py-1 bg-amber-100 border border-amber-300 rounded-lg text-xs font-bold text-amber-900">
                🍽️ Öğle Arası: 12:50 - 13:30 (40 Dakika)
              </span>
            </div>
          </div>

          {/* Bell Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-700 text-center text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-950">
                  <th className="border border-slate-700 p-2 text-xs font-black w-24">Ders Sırası</th>
                  <th className="border border-slate-700 p-2 text-xs font-black w-28">Giriş Saati</th>
                  <th className="border border-slate-700 p-2 text-xs font-black w-28">Çıkış Saati</th>
                  <th className="border border-slate-700 p-2 text-xs font-black w-28">Ders Süresi</th>
                  <th className="border border-slate-700 p-2 text-xs font-black w-36">Teneffüs Süresi</th>
                  <th className="border border-slate-700 p-2 text-xs font-black">Açıklama / Durum</th>
                </tr>
              </thead>
              <tbody>
                {CLASS_PERIODS.map((period) => (
                  <React.Fragment key={period.period}>
                    <tr className="hover:bg-slate-50 transition break-inside-avoid">
                      <td className="border border-slate-700 p-2.5 font-black text-slate-950 bg-slate-50">
                        {period.label}
                      </td>
                      <td className="border border-slate-700 p-2.5 font-extrabold text-sm text-indigo-950">
                        {period.startTime}
                      </td>
                      <td className="border border-slate-700 p-2.5 font-extrabold text-sm text-indigo-950">
                        {period.endTime}
                      </td>
                      <td className="border border-slate-700 p-2.5 font-bold text-slate-800">
                        40 Dakika
                      </td>
                      <td className="border border-slate-700 p-2.5 font-bold text-slate-800">
                        {period.breakLabel}
                      </td>
                      <td className="border border-slate-700 p-2.5 text-left font-medium text-slate-700 text-[11px]">
                        {period.period === 1 && 'Giriş zili 08:50. Öğrencilerin 08:45\'te hazır bulunması esastır.'}
                        {period.period === 2 && '2. Ders saati ve yoklama kontrolü.'}
                        {period.period === 3 && '3. Ders saati.'}
                        {period.period === 4 && '4. Ders saati.'}
                        {period.period === 5 && 'Sabah bloğunun son dersi. Ders bitiminde öğle arasına geçilir.'}
                        {period.period === 6 && 'Öğleden sonra 1. dersi (Giriş: 13:30).'}
                        {period.period === 7 && '7. Ders saati (Ders bitimi 5 dk kısa teneffüs uygulanır).'}
                        {period.period === 8 && 'Günün son dersi. 15:45 itibarıyla genel okul çıkışı gerçekleşir.'}
                      </td>
                    </tr>

                    {/* Lunch Break Row after 5th period */}
                    {period.isLunchAfter && (
                      <tr className="bg-amber-100/90 text-amber-950 border border-slate-700 break-inside-avoid font-black">
                        <td colSpan={6} className="border border-slate-700 py-2 px-3 text-center text-xs tracking-wider uppercase">
                          🍽️ 12:50 - 13:30 ÖĞLE ARASI DİNLENME VE YEMEK TATİLİ (40 DAKİKA)
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Administrative Rules & Guidelines */}
          <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 text-[11px] space-y-1.5 break-inside-avoid">
            <div className="font-black text-slate-900 flex items-center gap-1.5 uppercase">
              <Info className="w-3.5 h-3.5 text-slate-700 print:hidden" />
              <span>Okul İdaresi Uygulama Esasları & Önemli Hatırlatmalar:</span>
            </div>
            <ul className="list-disc list-inside text-[10.5px] text-slate-700 space-y-1">
              <li>Dersler 40 dakika, teneffüsler 10 dakika (7. ders sonrası 5 dakika), öğle arası 40 dakikadır (12:50 - 13:30).</li>
              <li>Sabah okul giriş saati 08:50, çıkış saati 15:45'tir. Öğrencilerin ilk ders başlamadan en geç 08:45'te sınıflarında hazır bulunması zorunludur.</li>
              <li>Geç gelen öğrencilerin idareden geç kağıdı alarak derse girmeleri esastır.</li>
              <li>Nöbetçi öğretmenler sabah 08:30'da görev yerlerinde hazır bulunur ve 16:00'da nöbet görevini tamamlar.</li>
              <li>Haftalık sınıf bazlı ders programları okul idaresi tarafından hazırlandığında ayrıca duyurulacaktır.</li>
            </ul>
          </div>

          {/* Document Footer & Signatures */}
          <div className="pt-4 border-t-2 border-slate-800 flex items-end justify-between text-xs text-slate-800 break-inside-avoid">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500">
                Düzenleme Tarihi: {new Date().toLocaleDateString('tr-TR')} • Gaziemir Nevvar Salih İşgören Anadolu Lisesi
              </p>
              <p className="text-[9px] text-slate-400">
                MEB Ortaöğretim Kurumları Yönetmeliği uyarınca tanzim edilmiştir.
              </p>
            </div>

            <div className="flex items-end gap-12">
              <div className="text-center min-w-[150px] space-y-1">
                <div className="font-bold text-slate-800 text-[11px]">Düzenleyen</div>
                <div className="text-[10px] text-slate-600">Müdür Yardımcısı</div>
                <div className="font-bold text-slate-950 pt-8 text-xs">İmza</div>
              </div>

              <div className="text-center min-w-[170px] space-y-1">
                <div className="font-black text-slate-950 text-xs">UYGUNDUR</div>
                <div className="text-[10px] text-slate-600">{new Date().toLocaleDateString('tr-TR')}</div>
                <div className="font-black text-slate-950 pt-6 text-xs">Okul Müdürü</div>
                <div className="text-[10px] text-slate-700">Mühür - İmza</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
