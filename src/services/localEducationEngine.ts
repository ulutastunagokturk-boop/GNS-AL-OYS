// Gaziemir Nevvar Salih İşgören Anadolu Lisesi (GNSİAL)
// Yerel Kapsamlı Eğitim Mantık Ağacı Motoru (Local Educational Logic-Tree Engine)

export interface LocalEducationResult {
  text: string;
  modelUsed: string;
  provider: string;
  category: string;
  matchedTopic?: string;
}

// Güvenli aritmetik ve matematik formül hesaplayıcı
function trySolveMathExpression(input: string): string | null {
  const clean = input.trim().toLowerCase();

  // Yüzde hesabı: örn: "80'in %20'si" veya "%15 of 200" veya "300'ün yüzde 25'i"
  const percentMatch1 = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:'in|'nin|'un|'nün|'ün)?\s*(?:yüzde|%)\s*(\d+(?:[.,]\d+)?)/i);
  const percentMatch2 = clean.match(/(?:yüzde|%)\s*(\d+(?:[.,]\d+)?)\s*(?:'si|'sı|'i|'ı)?\s*(\d+(?:[.,]\d+)?)/i);
  if (percentMatch1) {
    const total = parseFloat(percentMatch1[1].replace(',', '.'));
    const rate = parseFloat(percentMatch1[2].replace(',', '.'));
    const res = (total * rate) / 100;
    return `### 🧮 Yüzde Hesaplama Çözümü
- **İşlem:** ${total} sayısının %${rate}'i
- **Formül:** $\\text{Sonuç} = \\frac{${total} \\times ${rate}}{100}$
- **Hesaplama Adımı:** $\\frac{${total * rate}}{100}$
- **Sonuç:** **${Number(res.toFixed(4))}**`;
  }
  if (percentMatch2) {
    const rate = parseFloat(percentMatch2[1].replace(',', '.'));
    const total = parseFloat(percentMatch2[2].replace(',', '.'));
    const res = (total * rate) / 100;
    return `### 🧮 Yüzde Hesaplama Çözümü
- **İşlem:** ${total} sayısının %${rate}'i
- **Formül:** $\\text{Sonuç} = \\frac{${total} \\times ${rate}}{100}$
- **Sonuç:** **${Number(res.toFixed(4))}**`;
  }

  // Karekök hesabı: örn: "kök 144", "karekök 81", "sqrt 25"
  const sqrtMatch = clean.match(/(?:kök|karekök|sqrt)\s*\(?(\d+(?:[.,]\d+)?)\)?/i);
  if (sqrtMatch) {
    const num = parseFloat(sqrtMatch[1].replace(',', '.'));
    const res = Math.sqrt(num);
    return `### 📐 Karekök Hesaplama
- **İşlem:** $\\sqrt{${num}}$
- **Açıklama:** Karesi ${num} olan pozitif sayı bulunur.
- **Sonuç:** **${Number(res.toFixed(4))}** ${Number.isInteger(res) ? `($${res}^2 = ${num}$)` : ''}`;
  }

  // Üslü sayı hesabı: örn: "2^8", "3 üzeri 4", "5 üssü 3"
  const powMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:\^|üzeri|üssü)\s*(\d+(?:[.,]\d+)?)/i);
  if (powMatch) {
    const base = parseFloat(powMatch[1].replace(',', '.'));
    const exp = parseFloat(powMatch[2].replace(',', '.'));
    if (base <= 1000 && exp <= 20) {
      const res = Math.pow(base, exp);
      return `### 🔢 Üslü Sayı Hesaplama
- **İşlem:** $${base}^{${exp}}$
- **Açıklama:** Taban: ${base}, Kuvvet (Üs): ${exp}
- **Sonuç:** **${res.toLocaleString('tr-TR')}**`;
    }
  }

  // Hipotenüs / Pisagor: örn: "pisagor 3 4" veya "hipotenüs 6 8"
  const pythMatch = clean.match(/(?:pisagor|hipotenüs)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)/i);
  if (pythMatch) {
    const a = parseFloat(pythMatch[1].replace(',', '.'));
    const b = parseFloat(pythMatch[2].replace(',', '.'));
    const c = Math.sqrt(a * a + b * b);
    return `### 📐 Pisagor Bağıntısı & Hipotenüs Hesabı
- **Dik Kenarlar:** $a = ${a}$, $b = ${b}$
- **Teorem:** $c^2 = a^2 + b^2 \\implies c = \\sqrt{${a}^2 + ${b}^2}$
- **Adımlar:** $c = \\sqrt{${a * a} + ${b * b}} = \\sqrt{${a * a + b * b}}$
- **Hipotenüs ($c$):** **${Number(c.toFixed(4))}**`;
  }

  // Basit 2 terimli temel 4 işlem: örn: "125 * 4", "350 / 7", "48 + 59", "100 - 37"
  const arithMatch = clean.match(/^\s*(\d+(?:[.,]\d+)?)\s*([\+\-\*\/xX÷])\s*(\d+(?:[.,]\d+)?)\s*\=?\s*$/);
  if (arithMatch) {
    const n1 = parseFloat(arithMatch[1].replace(',', '.'));
    const op = arithMatch[2];
    const n2 = parseFloat(arithMatch[3].replace(',', '.'));
    let res = 0;
    let opSign = op;

    if (op === '+') {
      res = n1 + n2;
      opSign = '+';
    } else if (op === '-') {
      res = n1 - n2;
      opSign = '-';
    } else if (op === '*' || op === 'x' || op === 'X') {
      res = n1 * n2;
      opSign = '×';
    } else if (op === '/' || op === '÷') {
      if (n2 === 0) return '⚠️ **Matematiksel Tanımsızlık:** Bir sayı sıfıra (0) bölünemez!';
      res = n1 / n2;
      opSign = '÷';
    }

    return `### 🧮 Matematiksel İşlem Sonucu
- **İfade:** $${n1} ${opSign} ${n2}$
- **Sonuç:** **${Number(res.toFixed(4))}**`;
  }

  return null;
}

// Türkçe karakter normalize edici
function normTr(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

/**
 * GNSİAL Yerel Eğitim Mantık Ağacı
 * Çok katmanlı karar mekanizması ile öğrenci/öğretmen ihtiyaçlarına zengin ve didaktik yanıtlar üretir.
 */
export function getComprehensiveEducationalFallback(
  userPrompt: string,
  studentContext?: any,
  teacherContext?: any
): LocalEducationResult {
  const rawPrompt = userPrompt || '';
  const promptLower = rawPrompt.toLowerCase();
  const norm = normTr(rawPrompt);

  const userName = studentContext?.name || teacherContext?.name || 'Değerli Öğrencimiz';
  const userRole = teacherContext ? 'teacher' : 'student';
  const grade = studentContext?.classGrade || 'Lise';
  const gpa = studentContext?.gpa !== undefined ? studentContext.gpa : 85;
  const homeworksCount = studentContext?.pendingHomeworksCount || 0;
  const absence = studentContext?.totalAbsence || 0;

  // 1. ADIM: Doğrudan Matematiksel Aritmetik / Formül Çözücü
  const mathCalcResult = trySolveMathExpression(rawPrompt);
  if (mathCalcResult) {
    return {
      text: mathCalcResult,
      modelUsed: 'GNSİAL Akıllı Matematik Motoru',
      provider: 'local',
      category: 'math_calculator',
    };
  }

  // 2. ADIM: Öğretmen Odaklı Özel Mantık Ağacı
  if (userRole === 'teacher' || norm.includes('ders plani') || norm.includes('yazili hazirla') || norm.includes('rubrik') || norm.includes('veli toplantisi')) {
    if (norm.includes('ders plani') || norm.includes('kazanim') || norm.includes('etkinlik plan')) {
      return {
        category: 'teacher_lesson_plan',
        modelUsed: 'GNSİAL MEB Pedagojik Planlayıcı',
        provider: 'local',
        text: `### 📋 MEB Müfredatına Uygun Ders Planı Taslağı (${teacherContext?.subject || 'Genel Branş'})

Sayın Hocam **${userName}**, ders kazanımlarını en verimli şekilde aktarmak için hazırlanan pedagojik plan:

#### 1. Ders Bilgileri ve Kazanımlar
- **Ders / Seviye:** ${teacherContext?.subject || 'Branş Dersi'} (${teacherContext?.assignedClasses || 'Tüm Şubeler'})
- **Süre:** 40 Dakika (1 Ders Saati)
- **Hedef Kazanım:** Konunun temel ilkelerini kavrama, formül/kavram mantığını analiz etme ve yeni nesil soru kalıplarında uygulama.
- **Yöntem ve Teknikler:** Soru-cevap, problem çözme, görsel modelleme ve aktif öğrenci katılımı.

#### 2. Ders İşleniş Aşamaları (40 Dakika)
1. **Giriş ve Merak Uyandırma (0-8 dk):** Günlük hayattan dikkat çekici bir örnekle derse başlama; önceki dersin 2 dakikalık hızlı kazanım tekrarı.
2. **Kavramsal Geliştirme (8-22 dk):** Konunun teorik temeli, tahtada şematik gösterimler ve kritik püf noktalarının vurgulanması.
3. **Rehberli Uygulama (22-32 dk):** Birlikte 2 adet orta ve 1 adet üst düzey yeni nesil MEB kazanım sorusunun adım adım çözülmesi.
4. **Ölçme ve Özet (32-40 dk):** Hızlı tahta quizi (2 soru), ödevlendirme (${teacherContext?.activeHomeworksCount || 0} aktif ödev ile entegre) ve ders sonu özeti.

#### 💡 Ölçme ve Değerlendirme Önerisi:
Derste kavram yanılgısı yaşayan öğrencilere sistem üzerinden pekiştirme dokümanı iletmeniz önerilir.`
      };
    }

    if (norm.includes('yazili') || norm.includes('sinav hazirla') || norm.includes('yazili sorulari')) {
      return {
        category: 'teacher_exam_creator',
        modelUsed: 'GNSİAL Ölçme & Değerlendirme Modülü',
        provider: 'local',
        text: `### 📝 Yeni Nesil MEB Formatında Yazılı Sınav Taslağı (${teacherContext?.subject || 'Ders'})

Sayın Hocam **${userName}**, MEB ortak yazılı ve açık uçlu soru standartlarına göre yapılandırılmış sınav formatı:

#### 🎯 Sınav Düzeni ve Puan Dağılımı:
1. **Soru 1 (Temel Düzey - 10 Puan):** Tanım ve temel kavram eşleştirmesi.
2. **Soru 2 (Kavrama Düzeyi - 15 Puan):** Formülün veya kuralın doğrudan uygulanmasını gerektiren işlem sorusu.
3. **Soru 3-4 (Analiz & Problem Çözme - 2 x 20 Puan):** Gerçek hayat senaryolu yeni nesil açık uçlu problem.
4. **Soru 5 (Sentez & Yorum - 15 Puan):** Grafik okuma veya deney sonucu yorumlama.
5. **Soru 6 (Kritik Düşünme - 20 Puan):** Birden fazla kazanımı harmanlayan aşamalı senaryo sorusu.

#### 📋 Öğretmen Kontrol Notu:
- Soru kağıdında puan baremleri her sorunun yanında açıkça belirtilmelidir.
- Sınav sonrasında sistem üzerinden not girişi yaparak sınıf başarı ortalamasını takip edebilirsiniz.`
      };
    }

    if (norm.includes('rubrik') || norm.includes('olcek') || norm.includes('degerlendirme tablosu')) {
      return {
        category: 'teacher_rubric',
        modelUsed: 'GNSİAL Değerlendirme Kılavuzu',
        provider: 'local',
        text: `### 📊 4 Kademeli Analitik Değerlendirme Rubriği (${teacherContext?.subject || 'Performans Görevi'})

Sayın Hocam **${userName}**, öğrenci çalışmalarını objektif kriterlerle puanlamak için analitik rubrik tablosu:

| Değerlendirme Ölçütü | Başlangıç (1-2 Puan) | Gelişmekte (3-4 Puan) | Yeterli (5 Puan) | İleri Düzey (6 Puan) |
| :--- | :--- | :--- | :--- | :--- |
| **Kavramsal Doğruluk** | Kavramlar yanlış kullanılmış | Bazı kavram yanılgıları var | Temel kavramlar doğru | Derinlemesine ve eksiksiz |
| **İşlem ve Mantık Akışı** | Mantık hatası yüksek | Kısmi doğru adımlar | Adımlar sıralı ve doğru | Alternatif çözümler sunulmuş |
| **Sunum ve Düzen** | Düzensiz ve eksik | Kısmen okunaklı | Düzenli ve anlaşılır | Mükemmel görsel & akademik düzen |
| **Zamanlama ve Çaba** | Teslim gecikmiş | Az çaba harcanmış | Zamanında ve özenli | Erken teslim ve üstün özveri |`
      };
    }
  }

  // 3. ADIM: MEB DERSLERİ & BRANŞ MANTIK AĞACI (Öğrenci & Genel)

  // --- MATEMATİK & GEOMETRİ ---
  if (
    norm.includes('matematik') ||
    norm.includes('turev') ||
    norm.includes('integral') ||
    norm.includes('limit') ||
    norm.includes('trigonometri') ||
    norm.includes('fonksiyon') ||
    norm.includes('polinom') ||
    norm.includes('parabol') ||
    norm.includes('logaritma') ||
    norm.includes('geometri') ||
    norm.includes('ucgen') ||
    norm.includes('pisagor') ||
    norm.includes('kume') ||
    norm.includes('carpanlara') ||
    norm.includes('olasilik') ||
    norm.includes('dizi')
  ) {
    if (norm.includes('turev')) {
      return {
        category: 'math_calculus_derivative',
        matchedTopic: 'Türev ve Uygulamaları',
        modelUsed: 'GNSİAL MEB Matematik Motoru',
        provider: 'local',
        text: `### 📐 Matematik: Türev ve Uygulamaları (12. Sınıf & AYT)

Türev, bir fonksiyonun anlık değişim oranını ve grafiğe çizilen **teğetin eğimini** verir.

#### 🔑 Temel Türev Formülleri:
1. **Sabit Sayının Türevi:** $\\frac{d}{dx}(c) = 0$
2. **Kuvvet Kuralı:** $\\frac{d}{dx}(x^n) = n \\cdot x^{n-1}$
3. **Çarpımın Türevi:** $(f \\cdot g)' = f' \\cdot g + f \\cdot g'$
4. **Bölümün Türevi:** $\\left(\\frac{f}{g}\\right)' = \\frac{f' \\cdot g - f \\cdot g'}{g^2}$
5. **Zincir Kuralı (Bileşke Türevi):** $[f(g(x))]' = f'(g(x)) \\cdot g'(x)$

#### 🎯 Geometrik Yorum & Ekstremum:
- Bir $f(x)$ eğrisine $x = x_0$ noktasından çizilen teğetin eğimi $m = f'(x_0)$'dır.
- $f'(x) = 0$ olduğu noktalar (işaret değiştiriyorsa) **yerel maksimum veya yerel minimum** noktalarıdır.
- $f'(x) > 0$ ise fonksiyon artan, $f'(x) < 0$ ise azalandır.`
      };
    }

    if (norm.includes('integral')) {
      return {
        category: 'math_calculus_integral',
        matchedTopic: 'İntegral ve Alan Hesabı',
        modelUsed: 'GNSİAL MEB Matematik Motoru',
        provider: 'local',
        text: `### 📐 Matematik: İntegral ve Alan Hesabı (12. Sınıf & AYT)

İntegral, türevin ters işlemidir (ters türev) ve geometrik olarak eğrilerin altında kalan net alanı hesaplar.

#### 🔑 Temel İntegral Kuralları:
1. **Kuvvet Kuralı:** $\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)$
2. **Sabit Çarpan:** $\\int c \\cdot f(x) \\, dx = c \\int f(x) \\, dx$
3. **Toplamın İntegrali:** $\\int [f(x) \\pm g(x)] \\, dx = \\int f(x) \\, dx \\pm \\int g(x) \\, dx$
4. **Özel Fonksiyon:** $\\int \\frac{1}{x} \\, dx = \\ln|x| + C$ ve $\\int e^x \\, dx = e^x + C$

#### 🌟 Belirli İntegral ile Alan Hesabı:
$$Alan = \\int_a^b [f(x) - g(x)] \\, dx$$
- $x$ ekseninin üstünde kalan alan pozitif, altında kalan alan mutlak değerce hesaplanır.`
      };
    }

    if (norm.includes('trigonometri')) {
      return {
        category: 'math_trigonometry',
        matchedTopic: 'Trigonometri',
        modelUsed: 'GNSİAL MEB Matematik Motoru',
        provider: 'local',
        text: `### 📐 Matematik: Trigonometri Temel Özdeşlikler ve Formüller

Trigonometri birim çember ($x^2 + y^2 = 1$) üzerinde tanımlanır: $x = \\cos\\theta$, $y = \\sin\\theta$.

#### 🔑 Vazgeçilmez Özdeşlikler:
1. **Temel Eşitlik:** $\\sin^2(x) + \\cos^2(x) = 1$
2. **Tanjant & Kotanjant:** $\\tan(x) = \\frac{\\sin(x)}{\\cos(x)}$, $\\cot(x) = \\frac{\\cos(x)}{\\sin(x)} \\implies \\tan(x) \\cdot \\cot(x) = 1$
3. **Yarım Açı Formülleri:**
   - $\\sin(2x) = 2 \\sin(x) \\cos(x)$
   - $\\cos(2x) = \\cos^2(x) - \\sin^2(x) = 2\\cos^2(x) - 1 = 1 - 2\\sin^2(x)$
4. **Toplam - Fark Formülleri:**
   - $\\sin(a \\pm b) = \\sin(a)\\cos(b) \\pm \\cos(a)\\sin(b)$
   - $\\cos(a \\pm b) = \\cos(a)\\cos(b) \\mp \\sin(a)\\sin(b)$

#### 💡 Pratik İpucu:
90° ve 270° ile dönüşüm yaparken fonksiyon isim değiştirir (sin $\\leftrightarrow$ cos, tan $\\leftrightarrow$ cot). Bölge işaretine dikkat edilmelidir!`
      };
    }

    if (norm.includes('fonksiyon') || norm.includes('polinom') || norm.includes('parabol')) {
      return {
        category: 'math_algebra',
        matchedTopic: 'Fonksiyonlar, Polinomlar ve Parabol',
        modelUsed: 'GNSİAL MEB Matematik Motoru',
        provider: 'local',
        text: `### 📐 Matematik: Fonksiyonlar ve Parabol (10. & 11. Sınıf)

#### 1. Fonksiyonların Özellikleri:
- **Birebirlik:** Her farklı $x$ değeri farklı bir $y$ değerine gider ($f(x_1) = f(x_2) \\implies x_1 = x_2$).
- **Örtenlik:** Değer kümesinde boşta eleman kalmaz.
- **Ters Fonksiyon:** $f(x)$'in tersi $f^{-1}(x)$ olması için fonksiyonun **birebir ve örten (bijektif)** olması şarttır.
- Doğrusal fonksiyon tersi: $f(x) = ax + b \\implies f^{-1}(x) = \\frac{x - b}{a}$

#### 2. Parabol ($f(x) = ax^2 + bx + c$):
- **Tepe Noktası $T(r, k)$:**
  - $r = -\\frac{b}{2a}$ (Simetri ekseni: $x = r$)
  - $k = f(r) = \\frac{4ac - b^2}{4a}$
- **Diskriminant ($\\Delta = b^2 - 4ac$):**
  - $\\Delta > 0$: $x$ eksenini 2 farklı noktada keser.
  - $\\Delta = 0$: $x$ eksenine teğettir (çift katlı kök).
  - $\\Delta < 0$: $x$ eksenini kesmez (kök yoktur).`
      };
    }

    if (norm.includes('geometri') || norm.includes('ucgen') || norm.includes('pisagor')) {
      return {
        category: 'math_geometry',
        matchedTopic: 'Geometri & Üçgenler',
        modelUsed: 'GNSİAL Geometri Kılavuzu',
        provider: 'local',
        text: `### 📐 Geometri: Üçgenlerin Temel Kuralları ve Bağıntılar

#### 1. Özel Dik Üçgenler:
- **30° - 60° - 90°:** 30° karşısı $a$ ise, 60° karşısı $a\\sqrt{3}$, 90° karşısı $2a$'dır.
- **45° - 45° - 90°:** Dik kenarlar $a, a$ ise hipotenüs $a\\sqrt{2}$'dir.
- **Özel Kenarlı Üçgenler:** 3-4-5, 5-12-13, 8-15-17, 7-24-25 ve bunların katları.

#### 2. Öklid Bağıntıları (Dik açıdan dik inildiğinde):
- $h^2 = p \\cdot k$ (Yüksekliğin karesi = parçaların çarpımı)
- $b^2 = k \\cdot a$ ve $c^2 = p \\cdot a$
- $a \\cdot h = b \\cdot c$ (Alan eşitliğinden gelen pratik kural)

#### 3. Üçgende Alan Formülleri:
- $\\text{Alan} = \\frac{\\text{Taban} \\times \\text{Yükseklik}}{2} = \\frac{1}{2} a b \\sin(\\alpha)$`
      };
    }
  }

  // --- FİZİK ---
  if (
    norm.includes('fizik') ||
    norm.includes('kuvvet') ||
    norm.includes('newton') ||
    norm.includes('hareket') ||
    norm.includes('enerji') ||
    norm.includes('elektrik') ||
    norm.includes('ohm') ||
    norm.includes('manyetizma') ||
    norm.includes('optik') ||
    norm.includes('dalga') ||
    norm.includes('basinc') ||
    norm.includes('kaldirma kuvveti')
  ) {
    if (norm.includes('elektrik') || norm.includes('ohm') || norm.includes('volt') || norm.includes('direnc')) {
      return {
        category: 'physics_electricity',
        matchedTopic: 'Elektrik ve Devreler',
        modelUsed: 'GNSİAL Fizik Laboratuvarı',
        provider: 'local',
        text: `### ⚡ Fizik: Elektrik Akımı, Direnç ve Devre Analizi

#### 🔑 Temel Kanunlar:
1. **Ohm Yasası:** $V = I \\cdot R$
   - $V$: Potansiyel Fark (Volt)
   - $I$: Akım Şiddeti (Amper)
   - $R$: Direnç (Ohm, $\\Omega$)
2. **Elektriksel Güç ve Enerji:**
   - Güç: $P = V \\cdot I = I^2 \\cdot R = \\frac{V^2}{R}$ (Watt)
   - Enerji (İş): $W = P \\cdot t = V \\cdot I \\cdot t$ (Joule)

#### 🔌 Devre Bağlama Kuralları:
- **Seri Bağlama:** Akımlar eşittir ($I_1 = I_2$). Eşdeğer direnç $R_{eş} = R_1 + R_2$. Gerilimler toplanır ($V_{top} = V_1 + V_2$).
- **Paralel Bağlama:** Gerilimler eşittir ($V_1 = V_2$). Eşdeğer direnç $\\frac{1}{R_{eş}} = \\frac{1}{R_1} + \\frac{1}{R_2}$ (Pratik: $R_{eş} = \\frac{R_1 \\cdot R_2}{R_1 + R_2}$). Akımlar kollara ayrılır.`
      };
    }

    if (norm.includes('kuvvet') || norm.includes('newton') || norm.includes('hareket') || norm.includes('ivme')) {
      return {
        category: 'physics_mechanics',
        matchedTopic: 'Kuvvet, Newton Yasaları ve Hareket',
        modelUsed: 'GNSİAL Fizik Laboratuvarı',
        provider: 'local',
        text: `### 🚀 Fizik: Newton'ın Hareket Yasaları ve Dinamik

#### 🔑 3 Temel Newton Prensibi:
1. **Eylemsizlik Prensibi:** Bir cisme etki eden net kuvvet sıfır ise ($\\sum F = 0$), duran cisim durmaya devam eder; hareket eden cisim sabit hızla doğrusal hareket yapar.
2. **Temel Yasa (Dinamik):** $F_{net} = m \\cdot a$
   - Net kuvvet cisim kütlesi ile ivmesinin çarpımına eşittir. (Kuvvet 2 katına çıkarsa, ivme de 2 katına çıkar).
3. **Etki - Tepki Prensibi:** Her etkiye eşit büyüklükte ve zıt yönde bir tepki kuvveti vardır: $\\vec{F}_{etki} = -\\vec{F}_{tepki}$ (Farklı cisimlere uygulanırlar!).

#### ⚙️ Sürtünme Kuvveti ($f_s$):
- $f_s = k \\cdot N$ ($k$: sürtünme katsayısı, $N$: yüzeye dik tepki kuvveti).
- Statik sürtünme cisim harekete geçene kadardır, kinetik sürtünme hareket halindeyken etki eder.`
      };
    }

    return {
      category: 'physics_general',
      matchedTopic: 'Fizik Prensipleri & Enerji Korunumu',
      modelUsed: 'GNSİAL Fizik Laboratuvarı',
      provider: 'local',
      text: `### ⚛️ Fizik: İş, Güç ve Mekanik Enerji Korunumu

#### 🔑 Mekanik Formülleri:
1. **Yapılan İş ($W$):** $W = F \\cdot \\Delta x \\cdot \\cos(\\alpha)$ (Kuvvet ile yer değiştirme aynı doğrultuda olmalıdır).
2. **Kinetik Enerji ($E_k$):** $E_k = \\frac{1}{2} m v^2$ (Hız 2 katına çıkarsa kinetik enerji 4 katına çıkar!).
3. **Yerçekimi Potansiyel Enerjisi ($E_p$):** $E_p = m \\cdot g \\cdot h$
4. **Mekanik Enerjinin Korunumu:** Sürtünmesiz ortamda $E_{mekanik} = E_k + E_p = \\text{Sabit}$

Sorunla ilgili daha spesifik formül ya da soru örneği istersen detayları yazabilirsin!`
    };
  }

  // --- KİMYA ---
  if (
    norm.includes('kimya') ||
    norm.includes('periyodik') ||
    norm.includes('atom') ||
    norm.includes('mol') ||
    norm.includes('asit') ||
    norm.includes('baz') ||
    norm.includes('ph') ||
    norm.includes('organik') ||
    norm.includes('bag') ||
    norm.includes('kovalent') ||
    norm.includes('iyonik')
  ) {
    if (norm.includes('periyodik') || norm.includes('atom') || norm.includes('yaricap')) {
      return {
        category: 'chemistry_periodic_table',
        matchedTopic: 'Periyodik Tablo ve Periyodik Özellikler',
        modelUsed: 'GNSİAL Kimya Enstitüsü',
        provider: 'local',
        text: `### 🧪 Kimya: Periyodik Sistem ve Periyodik Özelliklerin Değişimi

Periyodik tabloda yatay sıralara **periyot** (7 periyot), düşey sütunlara **grup** (18 grup) denir.

#### 📈 Periyodik Özelliklerin Değişim Trendleri:
1. **Atom Yarıçapı (Hacmi):**
   - **Aynı grupta yukarıdan aşağıya:** Katman sayısı arttığı için **ARTAR**.
   - **Aynı periyotta soldan sağa:** Çekirdek yükü (proton sayısı) arttığı ve elektronları daha güçlü çektiği için **AZALIR**.
2. **İyonlaşma Enerjisi (İE):**
   - Gaz halindeki nötr bir atomdan bir elektron koparmak için gereken enerji.
   - Soldan sağa genellikle **ARTAR** (3 Aşağı - 5 Yukarı kuralı: $1A < 3A < 2A < 4A < 6A < 5A < 7A < 8A$).
   - Yukarıdan aşağıya çap büyüdüğü için **AZALIR**.
3. **Elektronegatiflik:** Bağ elektronlarına sahip çıkma eğilimidir. Tablonun en elektronegatif elementi **Flor (F)**'dur.`
      };
    }

    if (norm.includes('mol') || norm.includes('avogadro') || norm.includes('hesaplama')) {
      return {
        category: 'chemistry_mole',
        matchedTopic: 'Mol Kavramı ve Kimyasal Hesaplamalar',
        modelUsed: 'GNSİAL Kimya Enstitüsü',
        provider: 'local',
        text: `### 🧪 Kimya: Mol Kavramı ve Kimyasal Hesaplamalar

1 Mol = $6{,}022 \\times 10^{23}$ tane tanecik (Avogadro Sayısı, $N_A$).

#### 🔑 Temel Mol Dönüşüm Formülleri:
1. **Kütle - Mol İlişkisi:** $n = \\frac{m}{M_A}$ ($m$: kütle gram, $M_A$: mol kütlesi)
2. **Tanecik Sayısı - Mol İlişkisi:** $n = \\frac{N}{N_A}$ ($N$: verilen tanecik sayısı)
3. **Gaz Hacmi - Mol İlişkisi (Normal Şartlar Altında - NŞA):**
   - 1 mol ideal gaz NŞA'da (0 °C, 1 atm) **22,4 Litre** hacim kaplar: $n = \\frac{V}{22{,}4}$
   - Oda Koşullarında (25 °C, 1 atm): 1 mol gaz **24,5 Litre** kaplar.`
      };
    }

    return {
      category: 'chemistry_general',
      matchedTopic: 'Kimyasal Türler ve Asit-Baz Dengesi',
      modelUsed: 'GNSİAL Kimya Enstitüsü',
      provider: 'local',
      text: `### 🧪 Kimya: Kimyasal Türler Arası Etkileşimler ve pH Dengesi

#### 1. Güçlü Etkileşimler (Kimyasal Bağlar):
- **İyonik Bağ:** Metal ile ametal arasında elektron alışverişiyle oluşur (Elektrostatik çekim).
- **Kovalent Bağ:** Ametaller arasında elektron ortaklaşması ile oluşur (Polar veya Apolar).
- **Metalik Bağ:** Metal atomları arasında elektron denizi modeli ile kurulur.

#### 2. Asitler, Bazlar ve pH:
- $pH < 7$: Asidik ortam ($[H^+] > [OH^-]$)
- $pH = 7$: Nötr ortam (25 °C'de saf su)
- $pH > 7$: Bazik ortam ($[OH^-] > [H^+]$)
- $pH + pOH = 14$ (25 °C standart koşullarda)`
    };
  }

  // --- BİYOLOJİ ---
  if (
    norm.includes('biyoloji') ||
    norm.includes('hucre') ||
    norm.includes('organel') ||
    norm.includes('mitoz') ||
    norm.includes('mayoz') ||
    norm.includes('dna') ||
    norm.includes('genetik') ||
    norm.includes('mendel') ||
    norm.includes('fotosentez') ||
    norm.includes('solunum') ||
    norm.includes('dolasim') ||
    norm.includes('sinir')
  ) {
    if (norm.includes('hucre') || norm.includes('organel') || norm.includes('mitokondri')) {
      return {
        category: 'biology_cell',
        matchedTopic: 'Hücre Yapısı ve Organeller',
        modelUsed: 'GNSİAL Biyoloji Bilim Kurulu',
        provider: 'local',
        text: `### 🧬 Biyoloji: Hücre ve Organellerin Görevleri

Hücreler yapılarına göre ikiye ayrılır:
- **Prokaryot:** Çekirdek ve zarlı organelleri yoktur (Bakteriler ve Arkeler). Sadece ribozom bulunur.
- **Ökaryot:** Çekirdeği ve zarlı organelleri vardır (Bitki, hayvan, mantar, protista).

#### 🔬 Önemli Organeller ve Görevleri:
1. **Ribozom:** Zarsızdır, tüm canlılarda bulunur. Protein sentezini gerçekleştirir.
2. **Mitokondri:** Çift zarlıdır, kendine ait DNA, RNA ve ribozomu vardır. Oksijenli solunumla **ATP (enerji)** üretir.
3. **Kloroplast:** Bitkilerde fotosentez yaparak inorganik maddelerden organik besin ($C_6H_{12}O_6$) ve $O_2$ üretir.
4. **Endoplazmik Retikulum:** Hücre içi madde iletim kanallarıdır (Granüllü üzerinde ribozom taşır).
5. **Golgi Aygıtı:** Salgılama ve paketleme merkezidir.`
      };
    }

    if (norm.includes('mitoz') || norm.includes('mayoz') || norm.includes('bolunme')) {
      return {
        category: 'biology_division',
        matchedTopic: 'Mitoz ve Mayoz Hücre Bölünmeleri',
        modelUsed: 'GNSİAL Biyoloji Bilim Kurulu',
        provider: 'local',
        text: `### 🧬 Biyoloji: Mitoz ve Mayoz Bölünme Karşılaştırması

| Özellik | Mitoz Bölünme | Mayoz Bölünme |
| :--- | :--- | :--- |
| **Gerçekleştiği Hücre** | Vücut (Soma) hücrelerinde | Eşey ana hücrelerinde ($2n$) |
| **Oluşan Hücre Sayısı** | 2 yeni hücre oluşur | 4 yeni hücre (gamet) oluşur |
| **Kromozom Sayısı** | Değişmez ($2n \\rightarrow 2n$) | Yarıya iner ($2n \\rightarrow n$) |
| **Kalıtsal Çeşitlilik** | Çeşitlilik yoktur (Klon) | Krossing-over & Bağımsız dağılım ile çeşitlilik sağlanır |
| **Amacı** | Büyüme, onarım, eşeysiz üreme | Eşeyli üreme için üreme hücresi üretimi |`
      };
    }

    return {
      category: 'biology_general',
      matchedTopic: 'Genetik ve Hücresel Metabolizma',
      modelUsed: 'GNSİAL Biyoloji Bilim Kurulu',
      provider: 'local',
      text: `### 🧬 Biyoloji: Fotosentez, Solunum ve Mendel Genetiği

#### 1. Hücresel Solunum & Fotosentez Karşıtlığı:
- **Fotosentez:** $6CO_2 + 6H_2O + \\text{Işık} \\longrightarrow C_6H_{12}O_6 + 6O_2$ (Kloroplastta gerçekleşir).
- **Oksijenli Solunum:** $C_6H_{12}O_6 + 6O_2 \\longrightarrow 6CO_2 + 6H_2O + 30-32\\, \\text{ATP}$ (Mitokondride gerçekleşir).

#### 2. Mendel İlkeleri & Çaprazlama:
- **Ayrılma İlkesi:** Her bireyde bir karaktere ait iki alel bulunur; gamet oluşurken aleller ayrılır.
- **Monohibrit Çaprazlama ($Aa \\times Aa$):**
  - Genotip Oranı: $1 AA : 2 Aa : 1 aa$ ($1:2:1$)
  - Fenotip Oranı: 3 Baskın : 1 Çekinik ($3:1$)`
    };
  }

  // --- TÜRKÇE & EDEBİYAT ---
  if (
    norm.includes('edebiyat') ||
    norm.includes('turkce') ||
    norm.includes('ses olayi') ||
    norm.includes('unlu dusmesi') ||
    norm.includes('yazim kurallari') ||
    norm.includes('noktalama') ||
    norm.includes('fiilimsi') ||
    norm.includes('paragraf') ||
    norm.includes('tanzimat') ||
    norm.includes('cumhuriyet') ||
    norm.includes('divan') ||
    norm.includes('kafiye')
  ) {
    if (norm.includes('ses olayi') || norm.includes('unlu') || norm.includes('unsuz')) {
      return {
        category: 'turkish_grammar_phonetics',
        matchedTopic: 'Dil Bilgisi: Ses Olayları',
        modelUsed: 'GNSİAL Türk Dili ve Edebiyatı Zümresi',
        provider: 'local',
        text: `### 📚 Türkçe: Ses Olayları ve Örnekleri (TYT Türkçe)

1. **Ünlü Düşmesi:** İki heceli bazı kelimeler ünlüyle başlayan ek aldığında ikinci hecedeki dar ünlü düşer.
   - *Örnek:* akıl + ı $\\rightarrow$ aklı, burun + u $\\rightarrow$ burnu, sabır + et $\\rightarrow$ sabretmek.
2. **Ünsüz Benzeşmesi (Sertleşme):** Sert ünsüzle (f, s, t, k, ç, ş, h, p - FıSTıKÇı ŞaHaP) biten kelimeler c, d, g ile başlayan ek aldığında ekler ç, t, k'ye dönüşür.
   - *Örnek:* sınıf + da $\\rightarrow$ sınıfta, git- + di $\\rightarrow$ gitti, 1923 + de $\\rightarrow$ 1923'te.
3. **Ünsüz Yumuşaması:** p, ç, t, k ile biten kelimelere ünlüyle başlayan ek geldiğinde b, c, d, ğ'ye dönüşür.
   - *Örnek:* kitap + ı $\\rightarrow$ kitabı, ağaç + a $\\rightarrow$ ağaca, kalp + im $\\rightarrow$ kalbim.
4. **Ünlü Daralması:** -a, -e geniş ünlüleriyle biten fiiller "-yor" eki aldığında ı, i, u, ü dar ünlüye dönüşür.
   - *Örnek:* başla-yor $\\rightarrow$ başlıyor, bekle-yor $\\rightarrow$ bekliyor.`
      };
    }

    if (norm.includes('yazim') || norm.includes('de da') || norm.includes('ki') || norm.includes('noktalama')) {
      return {
        category: 'turkish_spelling',
        matchedTopic: 'Yazım Kuralları ve Noktalama',
        modelUsed: 'GNSİAL Türk Dili ve Edebiyatı Zümresi',
        provider: 'local',
        text: `### 📚 Türkçe: Kritik Yazım Kuralları (TDK & ÖSYM Standartları)

1. **"De / Da" Yazımı:**
   - **Bağlaç olan "de":** Ayrı yazılır, cümleden çıkarıldığında cümlenin anlamı bozulmaz (hafif daralabilir). *Örnek:* Sen **de** bizimle gel.
   - **Bulunma hal eki olan "-de":** Bitişik yazılır, cümleden çıkarıldığında anlam tamamen bozulur. *Örnek:* Kitabım okul**da** kaldı.
2. **"Ki" Yazımı:**
   - **Bağlaç olan "ki":** Ayrı yazılır (*Örnek:* Bilmem **ki**, öyle sanıyorum **ki*). (İstisna: SOMBAHÇEMİ formülü bitişik yazılır: Sanki, Oysaki, Mademki, Belki, Halbuki, Çünkü, Meğerki, İllaki).
   - **İlgi zamiri ve sıfat yapan "-ki":** Bitişik yazılır (*Örnek:* Evde**ki** hesap, senin**ki*).
3. **Büyük Harflerin Kullanımı:**
   - Kurum, kuruluş adlarına gelen ekler kesmeyle **ayrılmaz** (*Örnek:* Gaziemir Nevvar Salih İşgören Anadolu Lisesi**ne**).`
      };
    }

    return {
      category: 'turkish_literature_periods',
      matchedTopic: 'Türk Edebiyatı Dönemleri',
      modelUsed: 'GNSİAL Türk Dili ve Edebiyatı Zümresi',
      provider: 'local',
      text: `### 📚 Türk Dili ve Edebiyatı: Edebi Dönemler Özeti (AYT Edebiyat)

1. **Tanzimat Dönemi (1860 - 1896):**
   - Batılı anlamda ilk roman, tiyatro ve makale türleri girdi.
   - I. Dönem (Şinasi, Namık Kemal, Ziya Paşa): "Sanat toplum içindir", sade dil ideali. İlk edebi roman *İntibah* (Namık Kemal).
   - II. Dönem (Recaizade Mahmut Ekrem, Abdülhak Hamit Tarhan): "Sanat sanat içindir", ağır dil. İlk realist roman *Araba Sevdası*.
2. **Servet-i Fünun Dönemi (1896 - 1901):**
   - Tevfik Fikret (şiir), Halit Ziya Uşaklıgil (modern romanın babası - *Mai ve Siyah*, *Aşk-ı Memnu*).
   - Bireysel temalar, son derece ağır ve süslü dil, melankoli.
3. **Milli Edebiyat (1911 - 1923):**
   - *Genç Kalemler* dergisi (Ömer Seyfettin, Ziya Gökalp, Ali Canip Yöntem). "Yeni Lisan" hareketi ile dilde millileşme.`
    };
  }

  // --- TARİH & COĞRAFYA ---
  if (
    norm.includes('tarih') ||
    norm.includes('kurtulus savasi') ||
    norm.includes('ataturk') ||
    norm.includes('osmanli') ||
    norm.includes('lozan') ||
    norm.includes('cografya') ||
    norm.includes('iklim') ||
    norm.includes('izohips')
  ) {
    if (norm.includes('kurtulus') || norm.includes('ataturk') || norm.includes('kongre') || norm.includes('lozan')) {
      return {
        category: 'history_independence_war',
        matchedTopic: 'Kurtuluş Savaşı ve Atatürk İnkılapları',
        modelUsed: 'GNSİAL Sosyal Bilimler Kurulu',
        provider: 'local',
        text: `### 🇹🇷 Tarih: Kurtuluş Savaşı Hazırlık ve Cepheler Dönemi

#### 1. Milli Mücadele Hazırlık Dönemi:
- **Havza Genelgesi (1919):** Milli bilincin uyandırılması ve mitinglerle işgallerin protesto edilmesi istendi.
- **Amasya Genelgesi (1919):** Kurtuluş Savaşı'nın gerekçesi, amacı ve yöntemi ilk kez açıklandı: *"Milletin bağımsızlığını yine milletin azim ve kararı kurtaracaktır."*
- **Erzurum Kongresi:** Manda ve himaye ilk kez reddedildi; toplanış bakımından bölgesel, kararları bakımından milli bir kongredir.
- **Sivas Kongresi:** Tüm cemiyetler tek çatı altında (Anadolu ve Rumeli Müdafaa-i Hukuk) birleştirildi.

#### 2. Cepheler ve Antlaşmalar:
- **Doğu Cephesi:** Kazım Karabekir komutasında Ermenilere karşı savaşıldı $\\rightarrow$ **Gümrü Antlaşması** (TBMM'nin ilk diplomatik zaferi).
- **Güney Cephesi:** Kuva-yı Milliye ve halk direnişi $\\rightarrow$ **Ankara Antlaşması** ile Fransa çekildi.
- **Batı Cephesi:** Düzenli ordu kuruldu. I. İnönü, II. İnönü, Sakarya Meydan Muharebesi ve Büyük Taarruz $\\rightarrow$ **Mudanya Ateşkes** ve ardından **Lozan Barış Antlaşması**.`
      };
    }

    return {
      category: 'geography_climate',
      matchedTopic: 'Coğrafya: Türkiye İklimi ve Yer Şekilleri',
      modelUsed: 'GNSİAL Sosyal Bilimler Kurulu',
      provider: 'local',
      text: `### 🌍 Coğrafya: Türkiye'nin İklim Tipleri ve Özellikleri

1. **Akdeniz İklimi:**
   - Yazlar sıcak ve kurak, kışlar ılık ve yağışlıdır.
   - Doğal bitki örtüsü **maki**dir. Toprak tipi Terra Rossa (Kırmızı Akdeniz toprağı).
2. **Karadeniz İklimi:**
   - Her mevsim yağışlıdır, yıllık sıcaklık farkı en az olan iklimimizdir.
   - En fazla yağışı sonbaharda alır. Doğal bitki örtüsü geniş ve iğne yapraklı ormandır.
3. **Karasal İklim:**
   - Yazlar sıcak ve kurak, kışlar soğuk ve kar yağışlıdır. Sıcaklık farkı yüksektir.
   - En fazla yağışı ilkbaharda konveksiyonel (kırkikindi) olarak alır. Bitki örtüsü **bozkır (step)**dır.`
    };
  }

  // --- YKS / TYT-AYT STRATEJİLERİ & DENEME TAKİBİ ---
  if (
    norm.includes('yks') ||
    norm.includes('tyt') ||
    norm.includes('ayt') ||
    norm.includes('deneme') ||
    norm.includes('net artirma') ||
    norm.includes('sinav taktik') ||
    norm.includes('kaygi') ||
    norm.includes('turlama')
  ) {
    return {
      category: 'yks_exam_coaching',
      matchedTopic: 'YKS (TYT & AYT) Sınav Koçluğu',
      modelUsed: 'GNSİAL YKS Başarı ve Tercih Danışmanı',
      provider: 'local',
      text: `### 🎯 GNSİAL YKS (TYT & AYT) Sınav Stratejileri ve Net Artırma Rehberi

Sevgili **${userName}**, YKS hazırlığında derece ve yüksek başarı getiren altın kurallar:

#### ⏱️ 1. TYT Zaman Yönetimi ve "Turlama Tekniği":
- TYT 165 dakikadır (120 soru). Sorularda takılıp inatlaşmak sınavın en büyük tuzağıdır!
- **1. Tur:** Kolay ve tek hamlede çözebileceğin soruları hemen çöz, yanına işaret koyamadıklarına sembol (örn: "?") koyup geç.
- **2. Tur:** İşaretlediğin orta ve uzun paragraflı/işlemli sorulara dön.
- Türkçe paragraf çözerken her 10 soruda bir 10 saniye gözlerini kapatıp derin nefes alarak zihnini sıfırla.

#### 📈 2. AYT Netlerini Artırma Yöntemi:
- AYT bir **bilgi ve derinlik** sınavıdır. Formülleri sadece ezberleme, nereden geldiğini çıkar.
- Haftada en az 1 branş denemesi çöz ve mutlaka **"Hata Defteri"** tut: Yanlış yaptığın her sorunun kesilip doğrusunun öğrenilmesi netlerini 2 kat hızlı yükseltir.

#### 🧠 3. Sınav Kaygısı Kontrolü:
- Sınav anında kalp atışın hızlanırsa **4-7-8 Nefes Tekniği** uygula: 4 saniyede burnundan nefes al, 7 saniye tut, 8 saniyede yavaşça ağzından ver.`
    };
  }

  // --- HAFTALIK ÇALIŞMA PLANI & POMODORO ---
  if (
    norm.includes('calisma plani') ||
    norm.includes('ders plani') ||
    norm.includes('calisma programi') ||
    norm.includes('nasil calismaliyim') ||
    norm.includes('pomodoro') ||
    norm.includes('saatlik plan')
  ) {
    return {
      category: 'study_planner',
      matchedTopic: 'Kişiselleştirilmiş Çalışma Planı',
      modelUsed: 'GNSİAL Akademik Rehberlik Servisi',
      provider: 'local',
      text: `### 📅 GNSİAL Kişiselleştirilmiş Haftalık Ders Çalışma Planı

Merhaba **${userName}**, sistemdeki profil verilerine göre (${grade} seviyesi, Not Ortalaması: **${gpa} / 100**, Bekleyen Ödev: **${homeworksCount}** adet) optimize edilmiş program:

#### ⏰ Günlük İdeal Okul Sonrası Rutin:
- **16:45 - 17:15:** Eve varış, dinlenme ve hafif ara öğün
- **17:15 - 18:00 (Blok 1):** Günün okul derslerinin 45 dakikalık tekrarı ve eksik notların tamamlanması
- **18:00 - 18:15:** ☕ 15 Dakika Mola & Ekran Molası
- **18:15 - 19:15 (Blok 2):** Matematik / Fen Sayısal Soru Çözümü (Günde 30-40 Hedef Soru)
- **19:15 - 20:00:** 🍽️ Akşam Yemeği ve Aile Vakti
- **20:00 - 20:50 (Blok 3):** GNSİAL Portaldaki Aktif Ödevlerin Tamamlanması (${homeworksCount > 0 ? `${homeworksCount} adet ödevin var` : 'Ödevlerin güncel'})
- **21:00 - 21:45 (Blok 4):** Edebiyat, Tarih, Coğrafya veya Yabancı Dil Kavram Çalışması
- **21:45 - 22:15:** 📖 Kitap Okuma & Günlük Hedef Değerlendirmesi

#### 🍅 Pomodoro Kuralı:
Odaklanmakta zorlanıyorsan **25 dk Tam Odaklanma + 5 dk Mola** döngüsünü 4 kez tekrarla, ardından 30 dakikalık uzun mola ver.`
    };
  }

  // --- OKUL YÖNETMELİĞİ, DEVAMSIZLIK VE NOT KURALLARI ---
  if (
    norm.includes('devamsizlik') ||
    norm.includes('kac gun') ||
    norm.includes('takdir') ||
    norm.includes('tesekkur') ||
    norm.includes('sinif gecme') ||
    norm.includes('belge') ||
    norm.includes('okul kurallari') ||
    norm.includes('zil saat')
  ) {
    return {
      category: 'school_regulations',
      matchedTopic: 'MEB & GNSİAL Okul Yönetmeliği',
      modelUsed: 'GNSİAL Öğrenci İşleri & İdari Rehberlik',
      provider: 'local',
      text: `### 🏛️ MEB ve GNSİAL Devamsızlık, Not ve Belge Yönetmeliği

Sevgili **${userName}**, resmi Ortaöğretim Kurumları Yönetmeliği hükümleri:

#### 📌 1. Devamsızlık Sınırları:
- **Özürsüz Devamsızlık:** En fazla **10 gün** olabilir. 10 günü aştığında öğrenci başarısız (sınıf tekrarı) sayılır.
- **Toplam Devamsızlık (Özürlü + Özürsüz):** En fazla **30 gün** olabilir.
- Senin sistemde kayıtlı toplam devamsızlığın: **${absence} gün**. Lütfen devamsızlık hakkını tasarruflu kullan!

#### 🏆 2. Takdir ve Teşekkür Belgesi Şartları:
- **Teşekkür Belgesi:** Dönem sonu ağırlıklı not ortalaması **70,00 - 84,99** arasında olanlar.
- **Takdir Belgesi:** Dönem sonu ağırlıklı not ortalaması **85,00 ve üzeri** olanlar.
- *Kritik Kural:* Belge alabilmek için hiçbir dersten başarısız (50,00 altı) notunun olmaması ve özürsüz devamsızlığın 5 günü geçmemesi gerekir.
- Mevcut ortalaman: **${gpa} / 100** (${gpa >= 85 ? '🌟 Takdir seviyesinde' : gpa >= 70 ? '👍 Teşekkür seviyesinde' : 'Hedefe ulaşmak için biraz daha gayret'}).`
    };
  }

  // --- QUIZ & TEST TALEPLERİ ---
  if (
    norm.includes('quiz') ||
    norm.includes('test yap') ||
    norm.includes('soru sor') ||
    norm.includes('deneme sorusu') ||
    norm.includes('alistirma')
  ) {
    return {
      category: 'interactive_quiz',
      matchedTopic: 'Kazanım Değerlendirme Testi',
      modelUsed: 'GNSİAL Hızlı Quiz Modülü',
      provider: 'local',
      text: `### 📝 GNSİAL 5 Soruluk Çoktan Seçmeli Kazanım Quizi

Merhaba **${userName}**, MEB müfredatına uygun 5 soruluk testin hazır:

1. **Soru 1 (Matematik):** $f(x) = 3x - 6$ fonksiyonunun tersi $f^{-1}(x)$ aşağıdakilerden hangisidir?
   - A) $\\frac{x+6}{3}$
   - B) $\\frac{x-6}{3}$
   - C) $3x + 6$
   - D) $\\frac{x}{3} - 6$

2. **Soru 2 (Fizik):** Sürtünmesiz yatay düzlemdeki bir cisme uygulanan net kuvvet $F$'den $3F$'e çıkarılırsa cismin ivmesi nasıl değişir?
   - A) Değişmez  |  B) 3 katına çıkar  |  C) 9 katına çıkar  |  D) 3'te birine iner

3. **Soru 3 (Kimya):** Periyodik sistemde aynı periyotta soldan sağa doğru gidildikçe atom yarıçapı nasıl değişir?
   - A) Artar  |  B) Değişmez  |  C) Azalır  |  D) Önce artar sonra azalır

4. **Soru 4 (Biyoloji):** Hücrede oksijenli solunumla ATP enerjisi üreten çift zarlı organel hangisidir?
   - A) Ribozom  |  B) Mitokondri  |  C) Lizozom  |  D) Golgi

5. **Soru 5 (Türkçe):** "Sınıfta" kelimesindeki ses olayı aşağıdakilerden hangisidir?
   - A) Ünlü düşmesi  |  B) Ünsüz benzeşmesi (sertleşme)  |  C) Ünlü daralması  |  D) Kaynaşma

---
💡 **Cevaplarını bana yazabilirsin!** Kontrol edip çözümlerini detaylıca yapalım.`
    };
  }

  // --- SELAMLAMA & GENEL REHBERLİK ---
  return {
    category: 'general_conversational',
    matchedTopic: 'Genel Tanıtım ve Rehberlik',
    modelUsed: 'GNSİAL Akıllı Asistanı',
    provider: 'local',
    text: `Merhaba **${userName}**! 👋

Ben **Gaziemir Nevvar Salih İşgören Anadolu Lisesi Akıllı Eğitim Asistanı**'yım. Çevrimdışı/yedek yerel zeka motoru devrede olup sana aşağıdaki tüm başlıklarda anında yardımcı olabilirim:

#### 🌟 Neler Sorabilirsin?
1. 📐 **Matematik & Geometri:** Türev, integral, trigonometri, parabol, fonksiyonlar, Pisagor ve doğrudan işlem hesaplamaları (Örn: *80'in %25'i*, *kök 144*, *45 * 12*).
2. ⚡ **Fen Bilimleri:** Fizik formülleri ($F=ma$, Ohm yasası), Kimya periyodik tablo ve mol hesabı, Biyoloji organeller ve genetik.
3. 📚 **Türkçe & Edebiyat:** Ses olayları, yazım kuralları, edebi dönemler ve paragraf taktikleri.
4. 🎯 **YKS Hazırlık & Rehberlik:** TYT-AYT sınav stratejileri, turlama tekniği, kişisel haftalık çalışma planı.
5. 🏛️ **Okul Yönetmeliği:** Devamsızlık sınırları, takdir/teşekkür hesaplama ve GNSİAL kuralları.
6. 🦆 **DuckDuckGo Canlı Arama:** Yukarıdaki DuckDuckGo sekmesine geçerek MEB ve akademik kaynaklarda anında arama yapabilirsin.

Hangi ders veya konuda çalışmak istersin?`
  };
}
