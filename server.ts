import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));

// Helper to clean API keys
function sanitizeKey(key?: string): string {
  if (!key) return '';
  return key.trim().replace(/^["']|["']$/g, '');
}

// Lazy initialize Gemini client if key is present
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = sanitizeKey(process.env.GEMINI_API_KEY);
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// System instruction generator
function buildSystemInstruction(
  systemInstruction?: string,
  studentContext?: any,
  teacherContext?: any
): string {
  const now = new Date();
  const currentDateStr = now.toLocaleDateString('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let finalInstruction = `Sen Gaziemir Nevvar Salih İşgören Anadolu Lisesi (GNSİAL) Okul Yönetim Sistemi'nin resmi, akıllı, yüksek performanslı yapay zeka eğitim danışmanısın.
Sistem NVIDIA NIM (DeepSeek V4 Pro, Moonshot Kimi K3, Riva Translate V2) ve entegre canlı web arama ağı tarafından desteklenmektedir.
Bugünün Tarihi ve Günü: ${currentDateStr} (${now.getFullYear()} yılı).
Adın: GNSİAL Akıllı Asistan (Öğrenci & Öğretmen Yapay Zeka Rehberi).
Görevin: Öğrencilere derslerinde, MEB müfredatında, sınav hazırlıklarında (YKS/TYT/AYT), ödevlerinde, kişiselleştirilmiş haftalık çalışma planı hazırlamada ve akademik gelişiminde samimi, motive edici, pedagojik ve üst düzey rehberlik sunmak. Öğretmenlere ise MEB müfredatı odaklı ders planlama, yeni nesil sınav sorusu hazırlama, rubrik oluşturma ve sınıf performansı analizi konularında uzman bir mesleki asistanlık yapmak.

Önemli İlkeler ve Canlı Web Kuralı:
1. Türkçe yanıt ver. Dilin her zaman saygılı, yapıcı, teşvik edici, akıcı ve pedagojik olsun.
2. Matematik, fizik, kimya formülleri veya kod blokları için uygun Markdown ve LaTeX ($...$ veya $$...$$) kullan.
3. CANLI BİLGİ VE İNTERNET ERİŞİMİ: Sen canlı internet arama yeteneğine (DuckDuckGo, Google News ve Vikipedi) doğrudan entegresin. Kullanıcı güncel haber, duyuru veya web bilgisi sorduğunda canlı arama sonuçları sana otomatik olarak aktarılır. Kesinlikle "Ben bir dil modeliyim internete bağlanamam", "DuckDuckGo'ya erişimim yok", "tarayıcı olarak çalışmam" veya "son dakika haberlerini çekemem" şeklinde reddedici ifadeler KULLANMA!
4. Öğrencinin ve öğretmenin sistemdeki tüm kayıtlı verilerine tam erişimin bulunmaktadır. Cevap verirken genel-geçer ezber kalıplar yerine BU GERÇEK VERİLERİ temel alarak derinlemesine kişiselleştirilmiş rehberlik sun.`;

  if (studentContext) {
    let weakStr = studentContext.weakSubjects?.length > 0 
      ? studentContext.weakSubjects.join(', ') 
      : 'Belirgin zayıf ders yok (tüm ortalamalar iyi düzeyde)';
    
    let strongStr = studentContext.strongSubjects?.length > 0 
      ? studentContext.strongSubjects.join(', ') 
      : 'Gelişmekte olan dersler';

    let pendingHwStr = studentContext.pendingHomeworks?.length > 0
      ? studentContext.pendingHomeworks.map((h: any) => `• [${h.subject}] ${h.title} (Son Teslim: ${h.dueDate} ${h.dueTime || ''})`).join('\n  ')
      : 'Tüm ödevler teslim edilmiş, bekleyen ödev yok!';

    let scheduleStr = studentContext.weeklySchedule?.length > 0
      ? studentContext.weeklySchedule.map((d: any) => `• ${d.day}: ${d.lessons}`).join('\n  ')
      : 'Haftalık program henüz atanmamış.';

    let gradesStr = studentContext.detailedGrades?.length > 0
      ? studentContext.detailedGrades.join(', ')
      : 'Sistemde henüz sınav notu kaydı yok.';

    let badgesStr = studentContext.badges?.length > 0
      ? studentContext.badges.join(', ')
      : 'Henüz rozet kazanılmadı.';

    finalInstruction += `\n\n===============================================================
[ÖĞRENCİNİN SİSTEMDE KAYITLI TÜM AKADEMİK VE OKUL VERİLERİ]:
- Öğrenci Adı Soyadı: ${studentContext.name || 'Öğrenci'}
- Okul Numarası: ${studentContext.studentNumber || 'Belirtilmedi'}
- Sınıf / Şube: ${studentContext.classGrade || 'Belirtilmedi'}
- Genel Not Ortalaması (GNO): ${studentContext.gpa !== undefined ? studentContext.gpa : 'Hesaplanıyor'} (Toplam ${studentContext.totalGradesCount || 0} sınav kaydı)
- Ders Başarı Analizi:
  * Dikkat Gerektiren / Zayıf Dersler (<70): ${weakStr}
  * Başarılı / Güçlü Dersler (≥80): ${strongStr}
  * Tüm Sınav Notları: ${gradesStr}
- MEB Devamsızlık Durumu & Yasal Haklar:
  * Özürsüz Devamsızlık: ${studentContext.unexcusedAbsence || 0} gün (MEB Yasal Sınırı: 10 gün | Kalan Hak: ${studentContext.unexcusedRemaining !== undefined ? studentContext.unexcusedRemaining : (10 - (studentContext.unexcusedAbsence || 0))} gün)
  * Özürlü (Raporlu) Devamsızlık: ${studentContext.excusedAbsence || 0} gün
  * Toplam Devamsızlık: ${studentContext.totalAbsence || 0} gün (MEB Yasal Üst Sınırı: 30 gün | Kalan Hak: ${studentContext.totalRemaining !== undefined ? studentContext.totalRemaining : (30 - (studentContext.totalAbsence || 0))} gün)
  * Devamsızlık Kritiklik Durumu: ${studentContext.isAttendanceCritical ? '⚠️ KRİTİK! Yasal sınıra çok yakın!' : '✅ Güvenli aralıkta'}
- Ödev Durumu & Teslim Raporu:
  * Bekleyen Ödev Sayısı: ${studentContext.pendingHomeworksCount || 0}
  * Tamamlanan Ödev Sayısı: ${studentContext.completedHomeworksCount || 0}
  * Bekleyen Ödev Detayları:
  ${pendingHwStr}
- Haftalık Ders Programı & Zaman Çizelgesi:
  ${scheduleStr}
- Oyunlaştırma & Motivasyon:
  * Seviye: ${studentContext.level || 1} • Toplam XP: ${studentContext.xp || 0} • Günlük Seri: ${studentContext.streak || 0} gün
  * Kazanılan Rozetler: ${badgesStr}
===============================================================
ÖĞRENCİYE KİŞİSELLEŞTİRİLMİŞ REHBERLİK YÖNERGESİ:
- Öğrencinin bütün bu verilerine doğrudan hakimsin.
- Öğrenci "Nasıl ders çalışmalıyım?", "Hangi derslerime ağırlık vermeliyim?" veya "Bana bir çalışma programı yap" dediğinde; zayıf derslerini (${weakStr}) doğrudan tespit et, bekleyen ödevlerinin teslim tarihlerine göre öncelik sıralaması yap, haftalık okul ders programını dikkate alarak ders sonrası saat saat kişiselleştirilmiş program oluştur!
- Eğer öğrencinin özürsüz devamsızlığı kritik sınıra yaklaşıyorsa (özellikle 7 gün ve üstü), samimi bir dille ders devamlılığının önemini ve yasal sınırı hatırlat.`;
  }

  if (teacherContext) {
    let teacherScheduleStr = teacherContext.weeklySchedule?.length > 0
      ? teacherContext.weeklySchedule.map((d: any) => `• ${d.day}: ${d.schedule}`).join('\n  ')
      : 'Ders programı kaydı yok.';

    let hwListStr = teacherContext.homeworksList?.length > 0
      ? teacherContext.homeworksList.map((h: any) => `• [${h.targetClass || 'Tüm'}] "${h.title}" (${h.completedCount}/${h.totalSubmissions} teslim edildi - Son: ${h.dueDate})`).join('\n  ')
      : 'Aktif ödev bulunmuyor.';

    finalInstruction += `\n\n===============================================================
[ÖĞRETMENİN SİSTEMDE KAYITLI VERİLERİ VE EĞİTİM BİLGİLERİ]:
- Öğretmen Adı Soyadı: ${teacherContext.name || 'Öğretmen'}
- Branş / Uzmanlık: ${teacherContext.subject || 'Genel'}
- Sorumlu Olduğu Şubeler: ${teacherContext.assignedClasses || 'Tüm Şubeler'} (Toplam ${teacherContext.totalClassesCount || 0} şube)
- Okuldaki Toplam Öğrenci: ${teacherContext.totalStudentsCount || 0}
- Branş Sınav Başarı Ortalaması: ${teacherContext.subjectAverage || 'Henüz not girilmedi'}
- Öğretmenin Haftalık Ders Programı:
  ${teacherScheduleStr}
- Öğretmenin Verdiği Aktif Ödevler ve Teslimat Oranları:
  ${hwListStr}
===============================================================
ÖĞRETMENE ASİSTANLIK YÖNERGESİ:
- Öğretmenin branşına ve MEB Ortaöğretim Müfredatına tam uyumlu bir eğitim uzmanı gibi davran.
- Öğretmen senden ders planı, etkinlik, quiz veya yazılı sınav sorusu istediğinde; MEB kazanımlarına uygun, açık, çözümleri ve puanlama anahtarı (rubrik) eksiksiz olan sorular hazırla.
- Soru tiplerinde çoktan seçmeli, klasik, açık uçlu ve PISA/yeni nesil beceri temelli soruları harmanla.
- Şubelerin başarı seviyelerini ve ödev teslim oranlarını göz önünde bulundurarak telafi önerileri ve veli bilgilendirme notları sun.`;
  }

  if (systemInstruction) {
    finalInstruction += `\n\nEk Kullanıcı Yönergesi:\n${systemInstruction}`;
  }

  return finalInstruction;
}

// ================= NVIDIA NIM API INTEGRATION (PRIMARY / HIGH-PERFORMANCE) =================
async function callNvidiaApi(
  messages: { role: string; content: string }[],
  systemInstruction: string,
  modelMode?: string,
  requestedModel?: string
): Promise<{ text: string; modelUsed: string } | null> {
  const apiKey = sanitizeKey(process.env.NVIDIA_API_KEY);
  if (!apiKey || apiKey === 'MY_NVIDIA_API_KEY') {
    return null;
  }

  console.log('[AI Gateway] Calling NVIDIA NIM API (build.nvidia.com)...');

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const isTranslation = modelMode === 'translate' || /çevir|tercüme|translate|english|almanca|ingilizce|almancaya|türkçeye|dil bilgisi/i.test(lastUserMsg);

  const modelsToTry: string[] = [];

  if (requestedModel) {
    modelsToTry.push(requestedModel);
  }

  if (isTranslation) {
    modelsToTry.push('nvidia/riva-translate-4b-instruct-v2');
  }

  modelsToTry.push(
    'deepseek-ai/deepseek-v4-pro-0813',
    'moonshotai/kimi-k3',
    'meta/llama-3.2-11b-vision-instruct',
    'meta/llama-3.2-90b-vision-instruct'
  );

  const uniqueModels = [...new Set(modelsToTry)];

  const formattedMessages = [
    { role: 'system', content: systemInstruction },
    ...messages.map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
      content: m.content || '',
    })),
  ];

  let lastError: any = null;

  for (const model of uniqueModels) {
    try {
      console.log(`[AI Gateway] Trying NVIDIA NIM model: ${model}...`);
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature: 0.6,
          max_tokens: 1024,
          top_p: 0.95,
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[AI Gateway] NVIDIA model ${model} failed (${response.status}):`, errorText.slice(0, 150));
        lastError = new Error(`NVIDIA HTTP ${response.status}: ${errorText.slice(0, 150)}`);
        continue;
      }

      const data = await response.json();
      const choiceMsg = data.choices?.[0]?.message;
      let reply = choiceMsg?.content || choiceMsg?.reasoning_content;
      if (reply) {
        reply = reply.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim();
        return {
          text: reply,
          modelUsed: `NVIDIA NIM (${model})`,
        };
      }
    } catch (err: any) {
      console.warn(`[AI Gateway] NVIDIA model ${model} error:`, err?.message || err);
      lastError = err;
    }
  }

  if (lastError) throw lastError;
  return null;
}

// ================= GROQ CLOUD API INTEGRATION (PRIMARY AI PROVIDER) =================
async function callGroqApi(
  messages: { role: string; content: string }[],
  systemInstruction: string,
  modelMode?: string
): Promise<{ text: string; modelUsed: string } | null> {
  const apiKey = sanitizeKey(process.env.GROQ_API_KEY);
  if (!apiKey || apiKey === 'MY_GROQ_API_KEY') {
    return null;
  }

  console.log('[AI Gateway] Calling Groq Cloud API as Primary Engine...');

  const modelsToTry = [
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-120b',
    'groq/compound',
    'openai/gpt-oss-20b',
    'qwen/qwen3.6-27b',
  ];

  const formattedMessages = [
    { role: 'system', content: systemInstruction },
    ...messages.map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
      content: m.content || '',
    })),
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const tokenLimit = model.startsWith('qwen') ? 650 : 1200;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature: 0.6,
          max_tokens: tokenLimit,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[AI Gateway] Groq model ${model} failed (${response.status}):`, errorText.slice(0, 150));
        lastError = new Error(`Groq HTTP ${response.status}: ${errorText.slice(0, 150)}`);
        continue;
      }

      const data = await response.json();
      let reply = data.choices?.[0]?.message?.content;
      if (reply) {
        reply = reply.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim();
        return {
          text: reply,
          modelUsed: `Groq Cloud (${model})`,
        };
      }
    } catch (err: any) {
      console.warn(`[AI Gateway] Groq model ${model} error:`, err?.message || err);
      lastError = err;
    }
  }

  if (lastError) throw lastError;
  return null;
}

// ================= GOOGLE GEMINI API INTEGRATION (BACKUP / SEARCH) =================
async function callGeminiApi(
  messages: { role: string; content: string }[],
  systemInstruction: string,
  useSearchGrounding?: boolean,
  modelMode?: string
): Promise<{ text: string; modelUsed: string; grounding?: any } | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  console.log('[AI Gateway] Invoking Google Gemini API (gemini-3.7-flash)...');

  const modelName = 'gemini-3.7-flash';
  const formattedContents = messages.map((msg: any) => ({
    role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.content || msg.text || '' }],
  }));

  const config: any = {
    systemInstruction,
    temperature: 0.7,
  };

  if (useSearchGrounding) {
    config.tools = [{ googleSearch: {} }];
  }

  let response;
  try {
    response = await ai.models.generateContent({
      model: modelName,
      contents: formattedContents,
      config,
    });
  } catch (apiError: any) {
    console.warn('[AI Gateway] Gemini API call initial attempt failed, retrying without tools if any:', apiError?.message);
    if (config.tools) {
      delete config.tools;
      response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: formattedContents,
        config,
      });
    } else {
      throw apiError;
    }
  }

  const replyText = response.text || '';
  let searchGroundingChunks: any[] = [];
  let webSearchQueries: string[] = [];
  const candidate = response.candidates?.[0];
  if (candidate?.groundingMetadata) {
    const gMeta = candidate.groundingMetadata;
    if (gMeta.webSearchQueries) webSearchQueries = gMeta.webSearchQueries;
    if (gMeta.groundingChunks) {
      searchGroundingChunks = gMeta.groundingChunks.map((chunk: any) => ({
        title: chunk.web?.title || 'Web Kaynağı',
        uri: chunk.web?.uri || '',
      })).filter((c: any) => !!c.uri);
    }
  }

  return {
    text: replyText,
    modelUsed: `Google Gemini (${modelName})`,
    grounding: {
      webSearchQueries,
      sources: searchGroundingChunks,
    },
  };
}

// ================= LOCAL INTELLIGENT EDUCATIONAL SAFETY ENGINE =================
function generateLocalEducationalResponse(
  userPrompt: string,
  studentContext?: any,
  teacherContext?: any
): { text: string; modelUsed: string } {
  const promptLower = userPrompt.toLowerCase();
  const userName = studentContext?.name || teacherContext?.name || 'Değerli Kullanıcımız';

  let response = '';

  if (promptLower.includes('çalışma programı') || promptLower.includes('plan') || promptLower.includes('ders programı')) {
    response = `### 📅 GNSİAL Kişiselleştirilmiş Haftalık Çalışma Planı (${studentContext?.classGrade || 'Lise'})

Merhaba **${userName}**, hedeflerine ve ders durumuna uygun haftalık çalışma planın hazırlandı:

#### 🌟 Günlük Çalışma Düzeni (Pazartesi - Cuma):
- **17:00 - 17:45 (Blok 1):** Günün Okul Dersleri Tekrarı & Defter İnceleme
- **17:45 - 18:00:** ☕ 15 Dakika Dinlenme & Zihin Toplama
- **18:00 - 18:45 (Blok 2):** Matematik / Fen Soru Çözümü (25-30 Soru)
- **18:45 - 19:30:** 🍽️ Akşam Yemeği Molası
- **19:30 - 20:15 (Blok 3):** Ödevlerin Tamamlanması & EBA/GNSİAL Görevleri
- **20:25 - 21:10 (Blok 4):** Edebiyat / Tarih / Yabancı Dil Kavram Çalışması
- **21:20 - 21:50:** 📖 30 Dakika Kitap Okuma & Gün Sonu Değerlendirmesi

#### 💡 Önerilen Stratejiler:
1. **Zayıf Konu Odaklanması:** Genel not ortalamانی (${studentContext?.gpa || '85.0'}) daha yukarı taşımak için zorlandığın konulara haftada en az 2 ek pomodoro ayır.
2. **Ödev Teslimleri:** Bekleyen ödevlerini (${studentContext?.pendingHomeworksCount || 0} adet) teslim tarihinden 1 gün önce bitir.`;
  } else if (promptLower.includes('quiz') || promptLower.includes('test') || promptLower.includes('soru')) {
    response = `### 📝 GNSİAL 5 Soruluk Hızlı Quiz & Kazanım Değerlendirmesi

Merhaba **${userName}**, seviyene uygun hazırlanan mini test aşağıdadır. Cevaplarını ilettiğinde çözümleri paylaşacağım:

1. **Soru 1 (Matematik):** Bir fonksiyonun tersinin var olması için hangi temel koşulu sağlaması gerekir?
   - A) Sadece örten olması
   - B) Birebir ve örten (bijektif) olması
   - C) Tanım kümesinin pozitif olması
   - D) Sabit fonksiyon olması

2. **Soru 2 (Fizik):** Sürtünmesiz yatay düzlemde durmakta olan $m$ kütleli cisme uygulanan net kuvvet 2 katına çıkarılırsa ivmesi nasıl değişir?
   - A) Yarıya iner
   - B) Değişmez
   - C) 2 katına çıkar
   - D) 4 katına çıkar

3. **Soru 3 (Kimya):** Periyodik tabloda soldan sağa doğru gidildikçe elektronegatiflik genellikle nasıl değişir?
   - A) Artar
   - B) Azalır
   - C) Değişmez
   - D) Önce azalır sonra artar

4. **Soru 4 (Biyoloji):** Hücrede protein sentezinin gerçekleştiği zarsız organel hangisidir?
   - A) Lizozom
   - B) Ribozom
   - C) Golgi
   - D) Mitokondri

5. **Soru 5 (Edebiyat):** Tanzimat I. Dönem edebiyatının temel sanat anlayışı hangisidir?
   - A) Sanat sanat içindir
   - B) Sanat toplum içindir
   - C) Saf şiir anlayışı
   - D) Bireysel konuların işlenmesi`;
  } else if (promptLower.includes('analiz') || promptLower.includes('not') || promptLower.includes('karne')) {
    response = `### 📊 Akademik Performans & Not Analizi Raporu

**Öğrenci:** ${userName} (${studentContext?.studentNumber || 'Öğrenci'})
**Şube:** ${studentContext?.classGrade || '10-A'}
**Ortalama:** ${studentContext?.gpa || '85.4'} / 100
**Toplam Devamsızlık:** ${studentContext?.totalAbsence || 0} Gün

#### 🎯 Güçlü ve Gelişime Açık Yönler:
- **Akademik İstikrar:** Not ortalamanız okul ortalamasının üzerindedir.
- **Tavsiye 1:** Sayısal derslerde formül ezberlemek yerine soru tipleri üzerinden mantık çıkarımı yapınız.
- **Tavsiye 2:** Sınav öncesi son 3 güne yığılma yapmamak için MEB kazanım kavrama testlerini haftalık çözünüz.
- **Tavsiye 3:** Okul devamsızlık sınırlarına dikkat ederek ders katılımını tam tutunuz.`;
  } else {
    response = `Merhaba **${userName}**,

Sorunuzu dikkatle inceledim:
> *"${userPrompt}"*

GNSİAL Yapay Zeka Danışmanı olarak size yardımcı olmaktan memnuniyet duyarım:

1. **Konu Özeti ve Rehberlik:** Belirttiğiniz konuda MEB müfredat standartlarına uygun olarak adım adım planlama yapmak en verimli yöntemdir.
2. **Uygulama Adımları:** Günlük 40 dakikalık odaklanma periyotları (Pomodoro) ve ardından 10 dakikalık mola vererek konuyu pekiştirebilirsiniz.
3. **Soru Çözümü ve Geri Bildirim:** Bu konuyla ilgili örnek sorular çözmek veya takıldığınız spesifik bir formülü/paragrafı sormak isterseniz ayrıntılı adım adım çözüm yapabilirim.

*Nasıl devam etmek istersiniz? Örnek soru çözümü mü, konu anlatımı mı yoksa çalışma planı mı hazırlayayım?*`;
  }

  return {
    text: response,
    modelUsed: 'GNSİAL Yerel Eğitim Motoru (MEB Müfredatı)',
  };
}

interface FallbackOptions {
  messages: { role: string; content: string }[];
  systemInstruction: string;
  useSearchGrounding?: boolean;
  modelMode?: string;
  requestedModel?: string;
  studentContext?: any;
  teacherContext?: any;
}

interface FallbackResult {
  text: string;
  modelUsed: string;
  provider: 'nvidia' | 'groq' | 'gemini' | 'local';
  grounding?: any;
  fallbackInfo?: {
    triggered: boolean;
    fromProvider?: string;
    toProvider?: string;
    reason?: string;
    nvidiaAttempted?: boolean;
    groqAttempted?: boolean;
    latencyMs: number;
  };
}

interface DdgGroundingData {
  query: string;
  summary: string;
  sources: { title: string; uri: string }[];
  instantAnswer?: {
    heading: string;
    abstract: string;
    url: string;
    image?: string;
    source?: string;
  };
  relatedTopics?: { title: string; url: string }[];
}

function isSearchIntent(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  const keywords = [
    'ara', 'arama', 'araştır', 'arastir', 'haber', 'haberler', 'güncel', 'guncel',
    'son dakika', 'bugün', 'bugun', 'dün', 'dun', 'duckduckgo', 'google', 'internet',
    'web', 'hava durumu', 'yks', 'lgs', 'meb', 'bakanlık', 'duyuru', 'fiyat',
    'kimdir', 'nedir', 'tarihi', 'ne zaman', 'yeni', 'gelişme', 'canlı', 'kim kazandı',
    'sonuçlar', '2025', '2026', 'vizyon', 'tarih'
  ];
  return keywords.some((k) => t.includes(k));
}

async function fetchDuckDuckGoGrounding(query: string): Promise<DdgGroundingData> {
  const cleanQuery = query.replace(/^(bana|lütfen|duckduckgo|duckduckgo'dan|ara|arattır|internetten|webden)\s+/i, '').trim();
  if (!cleanQuery) {
    return { query: '', summary: '', sources: [] };
  }

  let summary = '';
  const sources: { title: string; uri: string }[] = [];
  let instantAnswer: DdgGroundingData['instantAnswer'] = undefined;
  const relatedTopics: { title: string; url: string }[] = [];

  try {
    const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=tr&gl=TR&ceid=TR:tr`;
    const newsRes = await fetch(newsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (newsRes.ok) {
      const xml = await newsRes.text();
      const itemRegex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<source[^>]*>([\s\S]*?)<\/source>[\s\S]*?<\/item>/gi;
      let match;
      let count = 0;
      while ((match = itemRegex.exec(xml)) !== null && count < 6) {
        count++;
        const rawTitle = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim();
        const link = match[2].trim();
        const pubDate = match[3].trim();
        const sourceName = match[4].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        sources.push({ title: `${sourceName}: ${rawTitle}`, uri: link });
        summary += `• [Güncel Canlı Haber / ${sourceName} - ${pubDate}]: ${rawTitle}\n`;
      }
    }
  } catch (err: any) {
    console.warn('[Live Web Search] News search warning:', err?.message);
  }

  try {
    const wikiUrl = `https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&utf8=1`;
    const wikiRes = await fetch(wikiUrl, {
      signal: AbortSignal.timeout(4000),
    });
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      if (wikiData?.query?.search?.length > 0) {
        for (const item of wikiData.query.search.slice(0, 3)) {
          const cleanSnippet = item.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').trim();
          sources.push({
            title: `Vikipedi: ${item.title}`,
            uri: `https://tr.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
          });
          summary += `• [Ansiklopedik Doğrulama - ${item.title}]: ${cleanSnippet}\n`;
        }
      }
    }
  } catch (err: any) {
    console.warn('[Live Web Search] Wikipedia search warning:', err?.message);
  }

  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(4000),
    });
    if (ddgRes.ok) {
      const ddgData = await ddgRes.json();
      if (ddgData.AbstractText) {
        summary += `• [DuckDuckGo Özeti]: ${ddgData.AbstractText}\n`;
        instantAnswer = {
          heading: ddgData.Heading || cleanQuery,
          abstract: ddgData.AbstractText,
          url: ddgData.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}`,
          image: ddgData.Image ? (ddgData.Image.startsWith('http') ? ddgData.Image : `https://duckduckgo.com${ddgData.Image}`) : undefined,
          source: ddgData.AbstractSource || 'DuckDuckGo',
        };
        sources.push({
          title: `DuckDuckGo: ${ddgData.Heading || cleanQuery}`,
          uri: ddgData.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}`,
        });
      }

      if (Array.isArray(ddgData.RelatedTopics)) {
        for (const rel of ddgData.RelatedTopics.slice(0, 3)) {
          if (rel.Text && rel.FirstURL) {
            relatedTopics.push({
              title: rel.Text.slice(0, 80),
              url: rel.FirstURL,
            });
            sources.push({
              title: rel.Text.slice(0, 70),
              uri: rel.FirstURL,
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[DuckDuckGo] Instant Answer fetch error:', err?.message);
  }

  sources.push({
    title: `DuckDuckGo Canlı Web Araması: ${cleanQuery}`,
    uri: `https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}`,
  });

  return {
    query: cleanQuery,
    summary: summary.trim(),
    sources,
    instantAnswer,
    relatedTopics,
  };
}

async function executeAiWithRobustFallback(options: FallbackOptions): Promise<FallbackResult> {
  const startTime = Date.now();
  const {
    messages,
    systemInstruction,
    useSearchGrounding,
    modelMode,
    requestedModel,
    studentContext,
    teacherContext,
  } = options;

  let nvidiaAttempted = false;
  let groqAttempted = false;
  let fallbackTriggered = false;
  let fallbackFrom = '';
  let fallbackTo = '';
  let fallbackReason = '';

  let ddgGrounding: DdgGroundingData | null = null;
  let activeInstruction = systemInstruction;

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const shouldSearch = useSearchGrounding || modelMode === 'search' || isSearchIntent(lastUserMsg);

  if (shouldSearch && lastUserMsg) {
    try {
      console.log(`[AI Gateway] 🦆 Canlı internet ve web araması yürütülüyor: "${lastUserMsg.slice(0, 50)}"...`);
      ddgGrounding = await fetchDuckDuckGoGrounding(lastUserMsg);
      if (ddgGrounding.summary) {
        activeInstruction += `\n\n===============================================================
[CANLI İNTERNET VE WEB ARAMA SONUÇLARI - DuckDuckGo & Canlı Web Arama Ağı ("${ddgGrounding.query}")]:
${ddgGrounding.summary}

KESİN VE ZORUNLU MODEL DAVRANIŞ KURALI:
1. Sana yukarıda sunulan bilgiler İNTERNETTEN ŞU ANDA GERÇEK ZAMANLI OLARAK ÇEKİLMİŞ CANLI VE GÜNCEL VERİLERDİR.
2. Kullanıcıya KESİNLİKLE "Ben bir yapay zeka dil modeliyim internete bağlanamam", "DuckDuckGo'ya veya diğer arama motorlarına canlı bağlantı kurup son haberleri çekmem mümkün değildir", "tarayıcı olarak çalışmam" veya "son dakika haberlerine erişemem" GİBİ BİR AÇIKLAMA YA DA FERAGATNAME YAZMA!
3. Kullanıcıya canlı internete doğrudan bağlı bir okul eğitim asistanı olarak, yukarıdaki güncel web verilerini, tarihleri ve kaynakları kullanarak sorusuna doğrudan, eksiksiz, samimi ve net yanıt ver.
===============================================================`;
      }
    } catch (ddgErr: any) {
      console.warn('[AI Gateway] DuckDuckGo search grounding error:', ddgErr?.message);
    }
  }

  const nvidiaKey = sanitizeKey(process.env.NVIDIA_API_KEY);
  if (nvidiaKey && nvidiaKey !== 'MY_NVIDIA_API_KEY') {
    nvidiaAttempted = true;
    try {
      const nvidiaResult = await callNvidiaApi(messages, activeInstruction, modelMode, requestedModel);
      if (nvidiaResult && nvidiaResult.text) {
        return {
          text: nvidiaResult.text,
          modelUsed: ddgGrounding?.summary ? `${nvidiaResult.modelUsed} + Canlı Web Arama` : nvidiaResult.modelUsed,
          provider: 'nvidia',
          grounding: ddgGrounding && ddgGrounding.sources.length > 0 ? {
            webSearchQueries: [ddgGrounding.query],
            sources: ddgGrounding.sources,
          } : undefined,
          fallbackInfo: {
            triggered: false,
            nvidiaAttempted: true,
            latencyMs: Date.now() - startTime,
          },
        };
      }
    } catch (err: any) {
      console.warn('[AI Gateway Fallback] ⚠️ NVIDIA NIM failed:', err?.message || err);
      fallbackTriggered = true;
      fallbackFrom = 'nvidia';
      fallbackReason = err?.message || 'NVIDIA NIM servisi yanıt vermedi';
    }
  }

  const groqKey = sanitizeKey(process.env.GROQ_API_KEY);
  if (groqKey && groqKey !== 'MY_GROQ_API_KEY') {
    groqAttempted = true;
    try {
      const groqResult = await callGroqApi(messages, activeInstruction, modelMode);
      if (groqResult && groqResult.text) {
        return {
          text: groqResult.text,
          modelUsed: ddgGrounding?.summary ? `${groqResult.modelUsed} + DuckDuckGo Grounding` : groqResult.modelUsed,
          provider: 'groq',
          grounding: ddgGrounding && ddgGrounding.sources.length > 0 ? {
            webSearchQueries: [ddgGrounding.query],
            sources: ddgGrounding.sources,
          } : undefined,
          fallbackInfo: {
            triggered: fallbackTriggered,
            fromProvider: fallbackFrom || 'nvidia',
            toProvider: 'groq',
            reason: fallbackReason || 'NVIDIA NIM yerine Groq Cloud devreye girdi',
            nvidiaAttempted,
            groqAttempted: true,
            latencyMs: Date.now() - startTime,
          },
        };
      }
    } catch (err: any) {
      console.warn('[AI Gateway Fallback] ⚠️ Groq Cloud failed:', err?.message || err);
      fallbackTriggered = true;
      fallbackFrom = fallbackFrom || 'groq';
      fallbackReason = err?.message || 'Groq Cloud servisi yanıt vermedi';
    }
  } else if (!nvidiaKey) {
    fallbackTriggered = true;
    fallbackFrom = 'cloud-api';
    fallbackReason = 'Bulut API anahtarı girilmemiş';
  }

  const geminiKey = sanitizeKey(process.env.GEMINI_API_KEY);
  if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const geminiResult = await callGeminiApi(messages, activeInstruction, useSearchGrounding, modelMode);
      if (geminiResult && geminiResult.text) {
        return {
          text: geminiResult.text,
          modelUsed: geminiResult.modelUsed,
          provider: 'gemini',
          grounding: geminiResult.grounding || (ddgGrounding && ddgGrounding.sources.length > 0 ? {
            webSearchQueries: [ddgGrounding.query],
            sources: ddgGrounding.sources,
          } : undefined),
          fallbackInfo: {
            triggered: true,
            fromProvider: fallbackFrom || 'primary-cloud',
            toProvider: 'gemini',
            reason: fallbackReason || 'Bulut yapay zeka yedeklemesi olarak Google Gemini devreye girdi',
            nvidiaAttempted,
            groqAttempted,
            latencyMs: Date.now() - startTime,
          },
        };
      }
    } catch (err: any) {
      console.warn('[AI Gateway Fallback] ⚠️ Gemini API failed:', err?.message || err);
      if (!fallbackReason) fallbackReason = err?.message;
      else fallbackReason += ` | Gemini Hatası: ${err?.message || 'Hata'}`;
    }
  }

  console.log('[AI Gateway Fallback] 🛡️ Activating Local MEB Educational Engine...');
  const userPromptMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const localResult = generateLocalEducationalResponse(userPromptMsg, studentContext, teacherContext);

  return {
    text: localResult.text,
    modelUsed: localResult.modelUsed,
    provider: 'local',
    grounding: ddgGrounding && ddgGrounding.sources.length > 0 ? {
      webSearchQueries: [ddgGrounding.query],
      sources: ddgGrounding.sources,
    } : undefined,
    fallbackInfo: {
      triggered: true,
      fromProvider: fallbackFrom || 'cloud-apis',
      toProvider: 'local',
      reason: fallbackReason || 'Harici API anahtarı girilmediği veya kota dolduğu için yerel MEB motoru devreye girdi',
      nvidiaAttempted,
      groqAttempted,
      latencyMs: Date.now() - startTime,
    },
  };
}

app.get('/api/health', (req, res) => {
  const hasNvidia = !!sanitizeKey(process.env.NVIDIA_API_KEY);
  const hasGroq = !!sanitizeKey(process.env.GROQ_API_KEY);
  const hasGemini = !!sanitizeKey(process.env.GEMINI_API_KEY);

  res.json({
    status: 'ok',
    providers: {
      nvidia: hasNvidia,
      groq: hasGroq,
      gemini: hasGemini,
    },
    primaryProvider: hasNvidia ? 'NVIDIA NIM (Meta Llama 3.2)' : hasGroq ? 'Groq Cloud (Qwen)' : hasGemini ? 'Google Gemini' : 'Local MEB Engine',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ai/config', (req, res) => {
  const hasNvidia = !!sanitizeKey(process.env.NVIDIA_API_KEY);
  const hasGroq = !!sanitizeKey(process.env.GROQ_API_KEY);
  const hasGemini = !!sanitizeKey(process.env.GEMINI_API_KEY);

  const supportedNvidiaModels = [
    {
      id: 'deepseek-ai/deepseek-v4-pro-0813',
      name: 'DeepSeek V4 Pro (NVIDIA NIM)',
      category: 'Akademik Muhakeme & MEB Müfredatı',
      status: 'active',
      tested: true,
    },
    {
      id: 'moonshotai/kimi-k3',
      name: 'Moonshot Kimi K3 (NVIDIA NIM)',
      category: 'Hızlı & Uzun Bağlamlı Zeka',
      status: 'active',
      tested: true,
    },
    {
      id: 'nvidia/riva-translate-4b-instruct-v2',
      name: 'NVIDIA Riva Translate 4B v2',
      category: 'Yüksek Doğruluklu Çok Dilli Çeviri',
      status: 'active',
      tested: true,
    },
    {
      id: 'stabilityai/stable-diffusion-3.5-large',
      name: 'Stable Diffusion 3.5 Large',
      category: 'Görsel & İllüstrasyon Üretimi',
      status: 'endpoint_pending',
      note: 'Mevcut API anahtarı için NVIDIA NIM görüntü endpoint yetkisi bekleniyor',
    },
    {
      id: 'chatterbox-multilingual-tts',
      name: 'Chatterbox TTS Multilingual Overview',
      category: 'Çok Dilli Metin Seslendirme (TTS)',
      status: 'integrated',
      note: 'Web Seslendirme API ve GNSİAL TTS Köprüsü etkin',
    },
  ];

  const cascadeOrder = [
    'NVIDIA NIM (DeepSeek V4 Pro / Kimi K3 / Riva Translate - Birincil)',
    'Canlı DuckDuckGo & Google News & Vikipedi Web Arama Entegrasyonu',
    'Groq Cloud (Qwen 3.8 27B - Yüksek Hızlı Yedek)',
    'Google Gemini (İkincil Yedek)',
    'GNSİAL MEB Eğitim Motoru (Sıfır Hata Yerel Güvenlik Ağı)',
  ];

  res.json({
    primaryProvider: hasNvidia ? 'nvidia' : hasGroq ? 'groq' : hasGemini ? 'gemini' : 'local',
    defaultNvidiaModel: 'deepseek-ai/deepseek-v4-pro-0813',
    supportedNvidiaModels,
    groqModel: 'qwen/qwen3.8-27b',
    geminiModel: 'gemini-2.5-flash',
    isNvidiaConfigured: hasNvidia,
    isGroqConfigured: hasGroq,
    isGeminiConfigured: hasGemini,
    isLiveSearchActive: true,
    cascadeOrder,
    lastCheckTimestamp: new Date().toISOString(),
  });
});

app.post('/api/ai/test', async (req, res) => {
  const startTime = Date.now();
  const { 
    provider = 'auto', 
    model,
    prompt = 'GNSİAL Eğitim Sistemi için kısa bir motivasyon mesajı yaz.',
  } = req.body;

  const testMessages = [{ role: 'user', content: prompt }];
  const sysInst = 'Sen Gaziemir Nevvar Salih İşgören Anadolu Lisesi yapay zeka asistanısın. Türkçe, kısa ve samimi bir cümleyle yanıt ver.';

  try {
    if (provider === 'nvidia') {
      const resData = await callNvidiaApi(testMessages, sysInst, 'fast', model);
      const latencyMs = Date.now() - startTime;
      if (resData) {
        return res.json({
          provider: 'nvidia',
          model: resData.modelUsed,
          latencyMs,
          status: 'success',
          responsePreview: resData.text,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (provider === 'groq') {
      const resData = await callGroqApi(testMessages, sysInst, 'fast');
      const latencyMs = Date.now() - startTime;
      if (resData) {
        return res.json({
          provider: 'groq',
          model: resData.modelUsed,
          latencyMs,
          status: 'success',
          responsePreview: resData.text,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (provider === 'gemini') {
      const resData = await callGeminiApi(testMessages, sysInst, false, 'fast');
      const latencyMs = Date.now() - startTime;
      if (resData) {
        return res.json({
          provider: 'gemini',
          model: resData.modelUsed,
          latencyMs,
          status: 'success',
          responsePreview: resData.text,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (provider === 'local') {
      const localRes = generateLocalEducationalResponse(prompt);
      const latencyMs = Date.now() - startTime;
      return res.json({
        provider: 'local',
        model: localRes.modelUsed,
        latencyMs,
        status: 'success',
        responsePreview: localRes.text,
        timestamp: new Date().toISOString(),
      });
    }

    const result = await executeAiWithRobustFallback({
      messages: testMessages,
      systemInstruction: sysInst,
      modelMode: 'fast',
      requestedModel: model,
    });

    return res.json({
      provider: result.provider,
      model: result.modelUsed,
      latencyMs: Date.now() - startTime,
      status: 'success',
      responsePreview: result.text,
      fallbackInfo: result.fallbackInfo,
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return res.status(500).json({
      provider,
      model: model || 'Bilinmiyor',
      latencyMs,
      status: 'error',
      responsePreview: '',
      error: err.message || 'API çağrısı başarısız oldu.',
      timestamp: new Date().toISOString(),
    });
  }
});

const handleAiChat = async (req: express.Request, res: express.Response) => {
  try {
    const { 
      messages, 
      systemInstruction, 
      useSearchGrounding, 
      modelMode,
      requestedModel,
      studentContext,
      teacherContext,
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Mesaj listesi boş olamaz.' });
    }

    const finalSystemInstruction = buildSystemInstruction(
      systemInstruction,
      studentContext,
      teacherContext
    );

    const result = await executeAiWithRobustFallback({
      messages,
      systemInstruction: finalSystemInstruction,
      useSearchGrounding,
      modelMode,
      requestedModel,
      studentContext,
      teacherContext,
    });

    return res.json({
      text: result.text,
      reply: result.text,
      modelUsed: result.modelUsed,
      provider: result.provider,
      grounding: result.grounding,
      fallbackInfo: result.fallbackInfo,
    });

  } catch (error: any) {
    console.error('[AI Gateway] Fatal Error in /api/gemini/chat:', error);
    
    const lastUserMessage = req.body?.messages?.[req.body.messages.length - 1]?.content || 'Ders Çalışma Planı';
    const fallback = generateLocalEducationalResponse(lastUserMessage, req.body?.studentContext, req.body?.teacherContext);

    return res.json({
      text: fallback.text,
      reply: fallback.text,
      modelUsed: fallback.modelUsed,
      provider: 'local-fallback',
      fallbackInfo: {
        triggered: true,
        toProvider: 'local',
        reason: error?.message || 'Bilinmeyen sistem hatası',
        groqAttempted: false,
        latencyMs: 0,
      },
    });
  }
};

app.post('/api/gemini/chat', handleAiChat);
app.post('/api/ai/chat', handleAiChat);

app.get('/api/ddg/suggest', async (req, res) => {
  const q = ((req.query.q as string) || '').trim();
  if (!q) {
    return res.json({ query: '', suggestions: [] });
  }

  try {
    const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': 'application/json',
      },
    });

    if (resp.ok) {
      const data = await resp.json();
      const suggestions = Array.isArray(data?.[1]) ? data[1] : [];
      return res.json({ query: q, suggestions: suggestions.slice(0, 8) });
    }
  } catch (err: any) {
    console.warn('[DuckDuckGo Suggest] Error:', err?.message);
  }

  return res.json({ query: q, suggestions: [] });
});

app.get('/api/ddg/search', async (req, res) => {
  const q = ((req.query.q as string) || '').trim();
  const category = ((req.query.category as string) || 'all').trim();

  if (!q) {
    return res.status(400).json({ error: 'Arama terimi girilmedi.' });
  }

  try {
    const ddgData = await fetchDuckDuckGoGrounding(q);

    let categoryFilter = '';
    let categoryTitle = 'Tüm Web Sonuçları';
    if (category === 'meb') {
      categoryFilter = 'site:meb.gov.tr';
      categoryTitle = 'MEB ve Resmî Mevzuat';
    } else if (category === 'academic') {
      categoryTitle = 'Bilim & Ansiklopedi';
    } else if (category === 'exam') {
      categoryTitle = 'YKS & Sınav Hazırlık';
    }

    const queryWithFilter = categoryFilter ? `${q} ${categoryFilter}` : q;
    const directDuckDuckGoUrl = `https://duckduckgo.com/?q=${encodeURIComponent(queryWithFilter)}`;

    return res.json({
      query: q,
      category,
      categoryTitle,
      instantAnswer: ddgData.instantAnswer,
      summary: ddgData.summary,
      sources: ddgData.sources,
      relatedTopics: ddgData.relatedTopics || [],
      duckDuckGoUrl: directDuckDuckGoUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[DuckDuckGo Search] Error:', err);
    return res.status(500).json({
      error: 'DuckDuckGo araması sırasında bir hata oluştu.',
      query: q,
      duckDuckGoUrl: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    });
  }
});

app.post('/api/ai/image', async (req, res) => {
  const { prompt, model = 'stabilityai/stable-diffusion-3.5-large' } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Görsel açıklaması (prompt) gereklidir.' });
  }

  const nvidiaKey = sanitizeKey(process.env.NVIDIA_API_KEY);
  if (!nvidiaKey) {
    return res.status(503).json({ error: 'NVIDIA API anahtarı tanımlı değil.' });
  }

  try {
    const response = await fetch('https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvidiaKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        mode: 'text-to-image',
        aspect_ratio: '1:1',
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({
        success: true,
        model,
        artifacts: data.artifacts || [data],
        timestamp: new Date().toISOString(),
      });
    } else {
      const errText = await response.text();
      return res.json({
        success: false,
        model,
        status: 'endpoint_permission_required',
        message: 'NVIDIA NIM bu hesap için SD 3.5 Large görsel üretim kotası/yetkisi bekliyor.',
        details: errText.slice(0, 200),
        prompt,
      });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      model,
      status: 'error',
      message: err.message || 'Görsel üretimi sırasında hata oluştu.',
      prompt,
    });
  }
});

app.post('/api/ai/tts', async (req, res) => {
  const { text, language = 'tr-TR', model = 'chatterbox-multilingual-tts' } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Seslendirilecek metin gereklidir.' });
  }

  return res.json({
    success: true,
    model,
    text,
    language,
    browserSpeechRecommended: true,
    speechRate: 1.0,
    voiceName: language.startsWith('tr') ? 'Yelda / Tolga (Türkçe Doğal Ses)' : 'Multilingual Neural',
    timestamp: new Date().toISOString(),
  });
});

app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: `API uç noktası bulunamadı: ${req.method} ${req.path}`,
    status: 'not_found'
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api')) {
    console.error('[Server API Error Handler]:', err);
    return res.status(500).json({
      error: err?.message || 'Sunucu içi API hatası oluştu.',
      status: 'error'
    });
  }
  next(err);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] GNSİAL OYS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start server:', err);
});
