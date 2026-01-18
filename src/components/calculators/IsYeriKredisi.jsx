import { useState, useMemo } from 'react';

// İş Yeri Kredisi Hesaplama Aracı (React Bileşeni)
export default function IsYeriKredisi() {
  const [mode, setMode] = useState('tutar');
  const [krediAmaci, setKrediAmaci] = useState('kullanim');

  // İş Yeri kredisi için varsayılan değerler
  const [krediTutari, setKrediTutari] = useState(500000);
  const [aylikTaksit, setAylikTaksit] = useState(10000);
  const [vade, setVade] = useState(60);
  const [faizOrani, setFaizOrani] = useState(3.59);

  // İş Yeri Kredisi Vergi Oranları
  const BSMV_ORANI_YUZDE = 5;
  const KKDF_ORANI_KULLANIM_YUZDE = 0;
  const KKDF_ORANI_YATIRIM_YUZDE = 15;

  const bsmv = BSMV_ORANI_YUZDE / 100;
  const kkdf = krediAmaci === 'yatirim' ? (KKDF_ORANI_YATIRIM_YUZDE / 100) : (KKDF_ORANI_KULLANIM_YUZDE / 100);
  const aylikFaiz = faizOrani / 100;

  // Anüite Hesaplamaları (Mantık aynı kaldı)
  const { taksit, cekilebilir, toplamOdeme, toplamFaiz, efektifFaizYillik, odemePlani } = useMemo(() => {
    let taksit = 0;
    let cekilebilir = krediTutari;

    // Anüite formülü
    if (mode === 'taksit') {
      const R = aylikFaiz;
      const N = vade;
      const P = aylikTaksit;
      if (R === 0) {
        cekilebilir = P * N;
      } else {
        const M = Math.pow(1 + R, N);
        // Konut Kredisi bileşenindeki formülü kullanıyoruz (Math.pow(1 + aylikFaiz, vade) - 1) / (aylikFaiz * Math.pow(1 + aylikFaiz, vade))
        cekilebilir = P * (M - 1) / (R * M); 
      }
      taksit = aylikTaksit;
    } else {
      const R = aylikFaiz;
      const N = vade;
      if (R === 0) {
        taksit = krediTutari / N;
      } else {
        // Konut Kredisi bileşenindeki formülü kullanıyoruz (krediTutari * aylikFaiz * Math.pow(1 + aylikFaiz, vade)) / (Math.pow(1 + aylikFaiz, vade) - 1)
        const M = Math.pow(1 + R, N);
        taksit = (krediTutari * R * M) / (M - 1);
      }
      cekilebilir = krediTutari;
    }

    taksit = isNaN(taksit) || !isFinite(taksit) ? 0 : taksit;
    cekilebilir = isNaN(cekilebilir) || !isFinite(cekilebilir) ? 0 : cekilebilir;

    const toplamOdeme = taksit * vade;
    const toplamFaizVergisiz = toplamOdeme - cekilebilir;
    
    // İş Yeri Kredisinde Vergi hesaplamasını tekrar dahil ediyoruz:
    const efektifAylikVergiOrani = (aylikFaiz * (kkdf + bsmv));
    const efektifFaizYillik = (aylikFaiz + efektifAylikVergiOrani) * 12 * 100;

    const odemePlani = [];
    let kalanAnapara = cekilebilir;
    const baslangic = new Date();

    let toplamFaizVergiDahil = 0;

    for (let i = 1; i <= vade; i++) {
      const faizTutar = kalanAnapara * aylikFaiz;
      const kkdfTutar = faizTutar * kkdf;
      const bsmvTutar = faizTutar * bsmv;

      // İş Yeri Kredisindeki Anapara hesaplama mantığını koruyoruz:
      let anaparaOdeme = taksit - faizTutar; // Burası basitleştirilmiş bir anapara ödemesidir, vergiler taksitin içinde kabul edilir.
      
      // Son taksitte kalan anaparayı temizle
      if (i === vade) {
        anaparaOdeme = kalanAnapara;
      } else if (kalanAnapara < 0.01) {
        anaparaOdeme = 0;
      }

      anaparaOdeme = Math.max(0, anaparaOdeme);
      
      // İş Yeri Kredisinde Taksit: Anapara + Faiz + KKDF + BSMV 
      // Not: Bu kısım Konut Kredisinden farklıdır, taksit tutarı faiz ve vergiler dahil sabitlenir.
      const gercekTaksit = anaparaOdeme + faizTutar + kkdfTutar + bsmvTutar;
      
      kalanAnapara -= anaparaOdeme;
      toplamFaizVergiDahil += faizTutar + kkdfTutar + bsmvTutar;

      const tarih = new Date(baslangic);
      tarih.setMonth(tarih.getMonth() + i);

      odemePlani.push({
        no: i,
        tarih: tarih.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'),
        taksit: gercekTaksit.toFixed(2), // Gerçek Taksit (Vergiler dahil)
        anapara: anaparaOdeme.toFixed(2),
        faiz: faizTutar.toFixed(2),
        kkdf: kkdfTutar.toFixed(2),
        bsmv: bsmvTutar.toFixed(2),
        kalan: Math.max(0, kalanAnapara).toFixed(2)
      });
    }

    return {
      taksit: odemePlani.length > 0 ? parseFloat(odemePlani[0].taksit) : taksit,
      cekilebilir,
      toplamOdeme: odemePlani.reduce((sum, item) => sum + parseFloat(item.taksit), 0),
      toplamFaiz: toplamFaizVergiDahil,
      efektifFaizYillik,
      odemePlani
    };
  }, [mode, krediTutari, aylikTaksit, vade, faizOrani, kkdf, bsmv]);


  // Para birimi formatlama fonksiyonu
  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercentage = (rate) => {
    return (rate || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  };


  const displayLimit = 120;

  return (
    <div className="min-h-screen bg-gray-50 py-8 font-['Inter']">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-extrabold text-green-800 text-center mb-10 border-b-4 border-green-200 pb-3">
          <span className="text-5xl mr-2">🏢</span> İş Yeri Kredisi Hesaplama Aracı
        </h1>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* SOL TARAF - HESAPLAMA & SONUÇLAR */}
          <div className="lg:col-span-2 space-y-8">

            {/* Mod Butonları (Stil Konut Kredisinden Alındı) */}
            <div className="flex flex-wrap justify-center gap-4 bg-white p-4 rounded-3xl shadow-lg border border-gray-100">
              <button
                onClick={() => setMode('tutar')}
                className={`px-6 py-3 rounded-full text-lg font-bold transition-all transform hover:scale-105 focus:outline-none focus:ring-4 ${
                  mode === 'tutar'
                    ? 'bg-green-600 text-white shadow-xl shadow-green-300' // Aktif: Green
                    : 'bg-white text-green-600 border-2 border-green-400 hover:bg-green-50' // Pasif: Green border/text
                }`}
              >
                Kredi Tutarına Göre (₺)
              </button>
              <button
                onClick={() => setMode('taksit')}
                className={`px-6 py-3 rounded-full text-lg font-bold transition-all transform hover:scale-105 focus:outline-none focus:ring-4 ${
                  mode === 'taksit'
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-300' // Aktif: Indigo
                    : 'bg-white text-indigo-600 border-2 border-indigo-400 hover:bg-indigo-50' // Pasif: Indigo border/text
                }`}
              >
                Aylık Taksite Göre (₺)
              </button>
            </div>

            {/* Kredi Amacı Butonları (İş Yeri Kredisine Özel) - Stil Konut Kredisinden Uyarlandı */}
            <div className="flex flex-wrap justify-center gap-4 bg-white p-4 rounded-3xl shadow-lg border border-gray-100">
              <button
                onClick={() => setKrediAmaci('kullanim')}
                className={`px-6 py-3 rounded-full text-md font-semibold transition-all transform hover:scale-105 focus:outline-none focus:ring-4 ${
                  krediAmaci === 'kullanim'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-300' // Aktif: Blue
                    : 'bg-white text-blue-700 border-2 border-blue-500 hover:bg-blue-50' // Pasif: Blue border/text
                }`}
              >
                Kullanım Amaçlı (KKDF: %0)
              </button>
              <button
                onClick={() => setKrediAmaci('yatirim')}
                className={`px-6 py-3 rounded-full text-md font-semibold transition-all transform hover:scale-105 focus:outline-none focus:ring-4 ${
                  krediAmaci === 'yatirim'
                    ? 'bg-red-700 text-white shadow-lg shadow-red-300' // Aktif: Red
                    : 'bg-white text-red-700 border-2 border-red-500 hover:bg-red-50' // Pasif: Red border/text
                }`}
              >
                Yatırım Amaçlı (KKDF: %15)
              </button>
            </div>


            {/* Inputlar (Stil Konut Kredisinden Alındı) */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Kredi Detayları</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* 1. Kredi Tutarı / Aylık Taksit Inputu */}
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    {mode === 'tutar' ? 'Kredi Tutarı (₺)' : 'Aylık Taksit (₺)'}
                  </label>
                  <input
                    type="number"
                    value={mode === 'tutar' ? krediTutari : aylikTaksit}
                    onChange={(e) => {
                      const value = +e.target.value;
                      mode === 'tutar' ? setKrediTutari(value || 0) : setAylikTaksit(value || 0);
                    }}
                    min="0"
                    className={`w-full px-5 py-4 text-2xl font-extrabold rounded-xl focus:outline-none transition-colors ${
                      mode === 'tutar'
                        ? 'text-green-700 bg-green-50 border-2 border-green-300 focus:ring-4 focus:ring-green-200' // Stili Kopyalandı
                        : 'text-indigo-700 bg-indigo-50 border-2 border-indigo-300 focus:ring-4 focus:ring-indigo-200' // Stili Kopyalandı
                    }`}
                    placeholder={mode === 'tutar' ? "500000" : "10000"}
                  />
                </div>

                {/* 2. Vade Inputu */}
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Vade (Ay - Max 120)</label>
                  <input
                    type="number"
                    value={vade}
                    onChange={(e) => setVade(Math.max(1, Math.min(120, +e.target.value || 1)))} // Max 120 ay (İş Yeri Kredisine uygun)
                    min="1"
                    max="120"
                    className="w-full px-5 py-4 text-2xl font-extrabold text-gray-800 bg-gray-100 rounded-xl border-2 border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-colors"
                    placeholder="60"
                  />
                </div>

                {/* 3. Faiz Oranı Inputu */}
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Aylık Faiz Oranı (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={faizOrani}
                    onChange={(e) => setFaizOrani(+e.target.value || 0)}
                    min="0"
                    className="w-full px-5 py-4 text-2xl font-extrabold text-red-700 bg-red-50 rounded-xl border-2 border-red-300 focus:outline-none focus:ring-4 focus:ring-red-200 transition-colors"
                    placeholder="3.59"
                  />
                </div>
              </div>
            </div>

            {/* Sonuçlar (Stil Konut Kredisinden Alındı) */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
              <h2 className="text-3xl font-bold text-center text-blue-700 mb-8">Hesaplama Özeti</h2>
              <div className="grid md:grid-cols-2 gap-6 text-lg">
                <ResultCard
                  title="Kredi Tutarı"
                  value={`₺${formatCurrency(cekilebilir)}`}
                  color="green" // Konut Kredisi rengi
                  description={mode === 'taksit' ? "Çekebileceğiniz Maksimum Tutar" : "Talep Ettiğiniz Tutar"}
                />
                <ResultCard
                  title="Aylık Taksit"
                  value={`₺${formatCurrency(taksit)}`}
                  color="indigo" // Konut Kredisi rengi
                  description={mode === 'taksit' ? "Girdiğiniz Taksit Tutarı" : "Hesaplanan Aylık Ödeme"}
                />
                <ResultCard
                  title="Toplam Geri Ödeme"
                  value={`₺${formatCurrency(toplamOdeme)}`}
                  color="blue"
                  description="Kredi sonunda geri ödenecek anapara + faiz + vergi"
                />
                <ResultCard
                  title="Toplam Faiz + Vergi Maliyeti"
                  value={`₺${formatCurrency(toplamFaiz)}`}
                  color="red"
                  description="Ödenecek Toplam Faiz + KKDF + BSMV Tutarı"
                />
                <ResultCard
                  title="Aylık Faiz Oranı"
                  value={`%${formatPercentage(faizOrani)}`}
                  color="purple"
                  description="Vergisiz, Anapara Üzerinden Hesaplanan Oran"
                />
                <ResultCard
                  title="Yıllık Maliyet Oranı"
                  value={`%${formatPercentage(efektifFaizYillik)}`}
                  color="pink"
                  description={`Vergi ve KKDF dahil Yıllık Toplam Maliyet Oranı (KKDF: %${kkdf * 100})`}
                />
              </div>
              <div className="mt-6 p-4 bg-gray-100 rounded-xl text-sm text-gray-600">
                <p className="font-semibold">KKDF: %{kkdf * 100} | BSMV: %{bsmv * 100}</p>
                <p>BSMV oranı her durumda %5'tir. KKDF oranı, kullanım amaçlı kredilerde %0, yatırım amaçlı kredilerde %15'tir. Sonuçlar tahmini olup, bankadan bankaya dosya masrafı ve sigorta eklemeleriyle değişebilir.</p>
              </div>
            </div>

            {/* Ödeme Planı Tablosu (Stil Konut Kredisinden Alındı) */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white p-6 text-center">
                <h3 className="text-2xl font-extrabold">Aylık Ödeme Planı ({vade} Taksit)</h3>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-green-800 text-white sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-left">NO</th>
                      <th className="px-3 py-3 text-left">TARİH</th>
                      <th className="px-3 py-3 text-right">TAKSİT</th>
                      <th className="px-3 py-3 text-right">ANAPARA</th>
                      <th className="px-3 py-3 text-right">FAİZ</th>
                      <th className="px-3 py-3 text-right">KKDF ({kkdf * 100}%)</th>
                      <th className="px-3 py-3 text-right">BSMV (5%)</th>
                      <th className="px-3 py-3 text-right">KALAN ANAPARA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {odemePlani.slice(0, displayLimit).map((row) => (
                      <tr key={row.no} className="hover:bg-green-50 transition-colors">
                        <td className="px-3 py-3 font-medium text-gray-700">{row.no}</td>
                        <td className="px-3 py-3 text-gray-600">{row.tarih}</td>
                        <td className="px-3 py-3 text-right font-semibold text-green-700">₺{formatCurrency(parseFloat(row.taksit))}</td>
                        <td className="px-3 py-3 text-right text-gray-800">{formatCurrency(parseFloat(row.anapara))}</td>
                        <td className="px-3 py-3 text-right text-red-600">{formatCurrency(parseFloat(row.faiz))}</td>
                        <td className="px-3 py-3 text-right text-orange-600">{formatCurrency(parseFloat(row.kkdf))}</td>
                        <td className="px-3 py-3 text-right text-pink-600">{formatCurrency(parseFloat(row.bsmv))}</td>
                        <td className="px-3 py-3 text-right font-bold text-gray-900">₺{formatCurrency(parseFloat(row.kalan))}</td>
                      </tr>
                    ))}
                    {vade > displayLimit && (
                      <tr className="bg-gray-100">
                        <td colSpan="8" className="p-4 text-center text-gray-600 font-semibold">
                          ... Geri Kalan {vade - displayLimit} Taksit ...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SAĞ TARAF - YAN MENÜ & REKLAM ALANLARI (Stil Konut Kredisinden Alındı) */}
          <div className="space-y-8">
            {/* İlgili Hesaplamalar */}
            <div className="bg-blue-700 text-white rounded-2xl shadow-xl p-6 border-b-4 border-blue-900">
              <h3 className="text-xl font-bold mb-4 border-b border-blue-500 pb-2">İlgili Hesaplamalar</h3>
              <ul className="space-y-3 text-lg">
                {['İhtiyaç Kredisi Hesaplama', 'Taşıt Kredisi Hesaplama', 'Konut Kredisi Hesaplama', 'Kredi Kartı Borç Hesaplama', 'Erken Kapatma Cezası'].map((link, index) => (
                  <li key={index} className="border-b border-blue-600 last:border-b-0 pb-1">
                    <a href="#" className="flex items-center hover:underline hover:text-blue-200 transition-colors">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M12.9 6.879l1.414-1.414L18 8.485l-3.686 3.686-1.414-1.414L14.586 9H3v-2h11.586l-1.686-1.686z" /></svg>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Reklam Alanı 1 */}
            <div className="bg-gray-100 border-2 border-dashed border-gray-400 rounded-2xl h-64 flex items-center justify-center text-gray-600 font-semibold text-center p-4 shadow-inner">
              <p>BURAYA SPONSORLU VEYA REKLAM ALANI EKLENECEKTİR</p>
            </div>

            {/* Reklam Alanı 2 */}
            <div className="bg-gray-100 border-2 border-dashed border-gray-400 rounded-2xl h-96 flex items-center justify-center text-gray-600 font-semibold text-center p-4 shadow-inner">
              <p>BURAYA SPONSORLU VEYA REKLAM ALANI EKLENECEKTİR</p>
            </div>
          </div>
        </div>
        
        {/* --- SEO UYUMLU İÇERİK (FAQPage) - İŞ YERİ KREDİSİ --- */}
        <div
            className="mt-20 px-4 py-10 bg-white rounded-3xl shadow-2xl border border-gray-200"
            itemScope
            itemType="https://schema.org/FAQPage"
        >
            <h2 className="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-4">
                <span className="text-green-600 mr-2">❓</span> İş Yeri Kredisi Hakkında Sıkça Sorulan Sorular
            </h2>
            

[Image of a commercial real estate building]

            <div className="space-y-6 text-gray-700 leading-relaxed">

                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">İş yeri kredisi nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            İş yerlerinin **yatırım** veya **kullanım amaçlı** olarak satın alınabilmesi için bankalar tarafından gerçek veya tüzel kişilere sağlanan, teminat olarak genellikle satın alınan gayrimenkulün ipotek edildiği finansmandır.
                        </p>
                    </div>
                </div>

                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">İş yeri kredilerinde vade en fazla kaç aydır?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            Mevcut kanunlar çerçevesinde, iş yeri kredilerinde bankalar tarafından kullandırılan en uzun vade süresi **120 aydır** (10 yıl).
                        </p>
                    </div>
                </div>

                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">Yatırım amaçlı iş yeri kredisinde KKDF oranı nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            **Yatırım amaçlı** işyeri kredilerinde faiz tutarı üzerinden **%15 oranında KKDF (Kaynak Kullanımı Destekleme Fonu)** uygulanır. **Kullanım amaçlı** olanlar ise KKDF'den tamamen **muaf** tutulmaktadır.
                        </p>
                    </div>
                </div>

                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">BSMV oranı nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            İş yeri kredilerinde, kullanım amacından bağımsız olarak faiz tutarı üzerinden **%5 oranında BSMV (Banka Sigorta Muameleleri Vergisi)** uygulanır.
                        </p>
                    </div>
                </div>
                
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">İş yeri kredisinde ekspertiz değeri ne kadar önemlidir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                           Bankalar, iş yeri kredilerinde de konut kredilerinde olduğu gibi genellikle eksper (değerleme uzmanı) raporundaki tutarın **en fazla %75'i** kadar kredi kullandırırlar. Bu oran, bankadan bankaya ve kredi amacına göre değişebilir.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

// Sonuç kartı için küçük bir yardımcı bileşen (stil amaçlı)
const ResultCard = ({ title, value, color, description }) => (
  <div className={`bg-white p-4 rounded-xl shadow-md border-l-4 border-${color}-500 transition-shadow hover:shadow-lg`}>
    <h3 className="text-md font-semibold text-gray-500 mb-1">{title}</h3>
    <p className={`text-3xl font-extrabold text-${color}-700`}>{value}</p>
    <p className="text-xs text-gray-400 mt-1 truncate">{description}</p>
  </div>
);