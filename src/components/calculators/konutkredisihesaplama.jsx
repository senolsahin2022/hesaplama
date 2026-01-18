import { useState } from 'react';

// Bu bileşen, önceki İhtiyaç Kredisi bileşeninin Konut Kredisi parametrelerine uyarlanmış varsayımsal bir versiyonudur.
export default function KonutKredisi() {
  const [mode, setMode] = useState('tutar');
  // Konut kredisi için daha yüksek default değerler ve daha uzun vade
  const [krediTutari, setKrediTutari] = useState(1000000); 
  const [aylikTaksit, setAylikTaksit] = useState(15000); 
  const [vade, setVade] = useState(120); // 10 yıl
  const [faizOrani, setFaizOrani] = useState(2.89);

  // Konut Kredilerinde mesken amaçlı kullanılan kredilerde KKDF ve BSMV: %0
  const kkdf = 0.00; // Kaynak Kullanımını Destekleme Fonu (%0)
  const bsmv = 0.00; // Banka ve Sigorta Muameleleri Vergisi (%0)
  
  // Efektif faiz oranı: (Faiz Oranı) * (1 + KKDF + BSMV) 
  const efektifFaizYillik = faizOrani * 12 * (1 + kkdf + bsmv); 
  const aylikFaiz = faizOrani / 100; // Aylık Faizi ondalık olarak kullanıyoruz

  let taksit = 0;
  let cekilebilir = krediTutari;
  let hesaplananKrediTutari = krediTutari;

  // Hesaplama mantığı (Anüite formülü)
  if (mode === 'taksit') {
    // Aylık taksite göre ne kadar kredi çekilebileceğini hesapla
    if (aylikFaiz === 0) {
      cekilebilir = aylikTaksit * vade;
    } else {
      cekilebilir = aylikTaksit * (Math.pow(1 + aylikFaiz, vade) - 1) / (aylikFaiz * Math.pow(1 + aylikFaiz, vade));
    }
    hesaplananKrediTutari = cekilebilir;
    taksit = aylikTaksit;
  } else {
    // Kredi tutarına göre aylık taksiti hesapla
    if (aylikFaiz === 0) {
      taksit = krediTutari / vade;
    } else {
      taksit = (krediTutari * aylikFaiz * Math.pow(1 + aylikFaiz, vade)) / (Math.pow(1 + aylikFaiz, vade) - 1);
    }
    cekilebilir = krediTutari;
    hesaplananKrediTutari = krediTutari;
  }

  // Yuvarlama işlemleri
  taksit = isNaN(taksit) || !isFinite(taksit) ? 0 : taksit;
  cekilebilir = isNaN(cekilebilir) || !isFinite(cekilebilir) ? 0 : cekilebilir;
  
  const toplamOdeme = taksit * vade;
  const toplamFaiz = toplamOdeme - cekilebilir;


  // Para birimi formatlama fonksiyonu
  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const formatPercentage = (rate) => {
    return (rate || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  };


  // Ödeme Planı Tablosu
  const odemePlani = [];
  let kalanAnapara = cekilebilir;
  const baslangic = new Date();
  const displayLimit = 120; // 10 yıllık taksiti gösterelim (300 aya kadar olabilir)

  for (let i = 1; i <= vade; i++) { 
    const faizTutar = kalanAnapara * aylikFaiz;
    const kkdfTutar = faizTutar * kkdf;
    const bsmvTutar = faizTutar * bsmv;
    
    // Taksit, Faiz+Vergilerden büyük olmalı.
    let anaparaOdeme = taksit - faizTutar - kkdfTutar - bsmvTutar;
    
    // Son taksitte kalan anaparayı temizle
    if (i === vade) {
      anaparaOdeme = kalanAnapara;
    } else if (kalanAnapara < 0.01) {
      anaparaOdeme = 0;
    }

    // Negatif Anapara ödemesini engelle
    anaparaOdeme = Math.max(0, anaparaOdeme);

    kalanAnapara -= anaparaOdeme;

    const tarih = new Date(baslangic);
    tarih.setMonth(tarih.getMonth() + i);

    odemePlani.push({
      no: i,
      tarih: tarih.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'),
      taksit: taksit.toFixed(2),
      anapara: anaparaOdeme.toFixed(2),
      faiz: faizTutar.toFixed(2),
      kkdf: kkdfTutar.toFixed(2),
      bsmv: bsmvTutar.toFixed(2),
      kalan: Math.max(0, kalanAnapara).toFixed(2)
    });
  }


  return (
    <div className="min-h-screen bg-gray-50 py-8 font-['Inter']">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-extrabold text-green-800 text-center mb-10 border-b-4 border-green-200 pb-3">
          <span className="text-5xl mr-2">🏠</span> Konut Kredisi Hesaplama Aracı
        </h1>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* SOL TARAF - HESAPLAMA & SONUÇLAR */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Mod Butonları */}
            <div className="flex flex-wrap justify-center gap-4 bg-white p-4 rounded-3xl shadow-lg border border-gray-100">
              <button
                onClick={() => setMode('tutar')}
                className={`px-6 py-3 rounded-full text-lg font-bold transition-all transform hover:scale-105 focus:outline-none focus:ring-4 ${
                  mode === 'tutar'
                    ? 'bg-green-600 text-white shadow-xl shadow-green-300'
                    : 'bg-white text-green-600 border-2 border-green-400 hover:bg-green-50'
                }`}
              >
                Kredi Tutarına Göre (₺)
              </button>
              <button
                onClick={() => setMode('taksit')}
                className={`px-6 py-3 rounded-full text-lg font-bold transition-all transform hover:scale-105 focus:outline-none focus:ring-4 ${
                  mode === 'taksit'
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-300'
                    : 'bg-white text-indigo-600 border-2 border-indigo-400 hover:bg-indigo-50'
                }`}
              >
                Aylık Taksite Göre (₺)
              </button>
            </div>

            {/* Inputlar */}
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
                        ? 'text-green-700 bg-green-50 border-2 border-green-300 focus:ring-4 focus:ring-green-200'
                        : 'text-indigo-700 bg-indigo-50 border-2 border-indigo-300 focus:ring-4 focus:ring-indigo-200'
                    }`}
                    placeholder={mode === 'tutar' ? "1000000" : "15000"}
                  />
                </div>

                {/* 2. Vade Inputu */}
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Vade (Ay - Max 300)</label>
                  <input
                    type="number"
                    value={vade}
                    onChange={(e) => setVade(Math.max(1, Math.min(300, +e.target.value || 1)))} // Konut kredilerinde max 300 ay sınırı
                    min="1"
                    max="300"
                    className="w-full px-5 py-4 text-2xl font-extrabold text-gray-800 bg-gray-100 rounded-xl border-2 border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-colors"
                    placeholder="120"
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
                    placeholder="2.89"
                  />
                </div>
              </div>
            </div>

            {/* Sonuçlar */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
              <h2 className="text-3xl font-bold text-center text-blue-700 mb-8">Hesaplama Özeti</h2>
              <div className="grid md:grid-cols-2 gap-6 text-lg">
                <ResultCard 
                  title="Kredi Tutarı" 
                  value={`₺${formatCurrency(hesaplananKrediTutari)}`} 
                  color="green" 
                  description={mode === 'taksit' ? "Çekebileceğiniz Maksimum Tutar" : "Talep Ettiğiniz Tutar"}
                />
                <ResultCard 
                  title="Aylık Taksit" 
                  value={`₺${formatCurrency(taksit)}`} 
                  color="indigo" 
                  description={mode === 'taksit' ? "Girdiğiniz Taksit Tutarı" : "Hesaplanan Aylık Ödeme"}
                />
                <ResultCard 
                  title="Toplam Ödeme" 
                  value={`₺${formatCurrency(toplamOdeme)}`} 
                  color="blue" 
                  description="Kredi sonunda geri ödenecek toplam miktar"
                />
                <ResultCard 
                  title="Toplam Faiz Maliyeti" 
                  value={`₺${formatCurrency(toplamFaiz)}`} 
                  color="red" 
                  description="Ödenecek Toplam Faiz Tutarı (Vergisiz)"
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
                  description="Yıllık Toplam Maliyet Oranı (Konut kredisinde vergi %0)"
                />
              </div>
              <div className="mt-6 p-4 bg-gray-100 rounded-xl text-sm text-gray-600">
                <p className="font-semibold">KKDF: %{kkdf * 100} | BSMV: %{bsmv * 100}</p>
                <p>Konut kredileri, mesken amaçlı kullanıldığında KKDF ve BSMV'den muaftır. Sonuçlar tahmini olup, bankadan bankaya dosya masrafı ve sigorta eklemeleriyle değişebilir.</p>
              </div>
            </div>

            {/* Ödeme Planı Tablosu */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white p-6 text-center">
                <h3 className="text-2xl font-extrabold">Aylık Ödeme Planı ({vade} Taksit)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-green-800 text-white sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-left">NO</th>
                      <th className="px-3 py-3 text-left">TARİH</th>
                      <th className="px-3 py-3 text-right">TAKSİT</th>
                      <th className="px-3 py-3 text-right">ANAPARA</th>
                      <th className="px-3 py-3 text-right">FAİZ</th>
                      <th className="px-3 py-3 text-right">KKDF (0)</th>
                      <th className="px-3 py-3 text-right">BSMV (0)</th>
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
                        <td className="px-3 py-3 text-right text-gray-400">{formatCurrency(parseFloat(row.kkdf))}</td>
                        <td className="px-3 py-3 text-right text-gray-400">{formatCurrency(parseFloat(row.bsmv))}</td>
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

          {/* SAĞ TARAF - YAN MENÜ & REKLAM ALANLARI */}
          <div className="space-y-8">
            {/* İlgili Hesaplamalar */}
            <div className="bg-blue-700 text-white rounded-2xl shadow-xl p-6 border-b-4 border-blue-900">
              <h3 className="text-xl font-bold mb-4 border-b border-blue-500 pb-2">İlgili Hesaplamalar</h3>
              <ul className="space-y-3 text-lg">
                {['İhtiyaç Kredisi Hesaplama', 'Taşıt Kredisi Hesaplama', 'Kredi Kartı Borç Hesaplama', 'Erken Kapatma Cezası', 'Ne Kadar Kredi Çekebilirim?'].map((link, index) => (
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
        
        {/* --- SEO UYUMLU İÇERİK (FAQPage) - KONUT KREDİSİ --- */}
        <div 
            className="mt-20 px-4 py-10 bg-white rounded-3xl shadow-2xl border border-gray-200"
            itemScope 
            itemType="https://schema.org/FAQPage"
        >
            <h2 className="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-4">
                <span className="text-green-600 mr-2">🏠</span> Konut Kredisi Hakkında Sıkça Sorulan Sorular
            </h2>

            <div className="space-y-6 text-gray-700 leading-relaxed">
                
                {/* Soru 1: Konut kredisi nedir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">Konut kredisi nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            Konut kredisi, bireylerin ev satın alma ihtiyaçlarını karşılamak için bankalar tarafından verilen, satın alınan **evin teminat altına alınması şartıyla** (ipotekli) kullandırılan uzun vadeli bir tüketici kredisidir.
                        </p>
                    </div>
                </div>

                {/* Soru 2: Mortgage nedir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">Mortgage nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            **Mortgage** (İpotekli Konut Finansmanı), bireylerin konut olarak kullanacakları bir meskeni satın almaları için ev üzerine ipotek koyularak kullandırılan ve bazı ülkelerde vergi avantajı sağlayan, uzun vadeli ve geniş kapsamlı bir finansman sistemidir. Konut kredisi, bu sistemin Türkiye'deki en yaygın uygulama şeklidir.
                        </p>
                    </div>
                </div>

                {/* Soru 3: Ev kredisi ile mortgage arasında nasıl bir fark var? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">Ev kredisi ile mortgage arasında nasıl bir fark var?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            Türkiye'de konut kredileri (ev kredisi), genel olarak mortgage sistemi kapsamına girer. Ancak, teknik farklılıklar olabilir. Mortgage sisteminde, konut kredilerinde uygulanan sabit faizin yanında **değişken faiz** oranları da uygulanabilir. Ayrıca ödemelerde herhangi bir aksama olduğunda müşterinin bir yıl boyunca bu aksamayı telafi etme hakkı bulunurken mortgage sisteminde o ana kadar yapılan ödemeler banka tarafından müşteriye geri ödenir ve konutu satışa çıkarma hakkına sahip olur.
                        </p>
                    </div>
                </div>

                {/* Soru 4: Konut kredisi başvuruları nasıl değerlendirilir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">Konut kredisi başvuruları nasıl değerlendirilir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            Bankalar başvuruları değerlendirirken genel olarak şu kriterlere bakarlar: **Kredi notu** (Findeks puanı), **finansal geçmişi**, **aylık net geliri** (gelir/taksit oranı), hane halkı geliri ve ilgili **taşınmazın eksper değeri** ve hukuki özellikleri. Kredi tutarı evin değerinin maksimum %80'i olabilir.
                        </p>
                    </div>
                </div>

                {/* Soru 5: Ev kredisi başvurusu nasıl yapılır? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">Ev kredisi başvurusu nasıl yapılır?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            Günümüzde internetten ve mobil şubelerden ön başvuru yapılabilmektedir. Kesin başvuru için banka şubelerine giderek, aylık **gelirinizi gösteren belge**, **kimlik** ve satın alınacak eve ait **tapu** (kat mülkiyeti veya kat irtifakı) belgeleri ile başvuru formu doldurulabilir. İlgili kurumlar tarafından başvurular oldukça kısa bir süre içerisinde cevaplanmaktadır.
                        </p>
                    </div>
                </div>

                {/* Soru 6: Geri ödeme planı nedir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">Geri ödeme planı nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            Kredi kullanım sırasında müşteriyle banka arasında üzerinde anlaşılan; kredinin vadesini, uygulanan faiz oranını, ödenecek aylık **taksit tutarını**, vergi ve fonları içeren detaylı ödeme tablosudur.
                        </p>
                    </div>
                </div>

                {/* Soru 7: Vade nedir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">Vade nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            Vade, alınan borcun geri ödemelerinin yapılacağı **toplam süredir**. Konut kredisinde bu süre genellikle yıl veya ay cinsinden ifade edilir.
                        </p>
                    </div>
                </div>

                {/* Soru 8: En fazla ne kadar konut kredisi alınabilir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">En fazla ne kadar konut kredisi alınabilir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            Alınabilecek kredi tutarı bankadan bankaya, başvuru sahibine (gelir durumuna) ve en önemlisi **ilgili taşınmazın ekspertiz değerine** göre değişebilmektedir. Yasal düzenlemeler gereği kredi tutarı, konutun ekspertiz değerinin **%80'ini** geçemez.
                        </p>
                    </div>
                </div>

                {/* Soru 9: Ev kredisinde en uzun vade kaç aydır? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">Ev kredisinde en uzun vade kaç aydır?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            Türkiye genelinde bankalar en az 3 ay, en fazla ise **300 aya** (25 yıla) varan vadelerle konut kredilerini tüketicilere kullandırabilmektedirler.
                        </p>
                    </div>
                </div>

                {/* Soru 10: Konut kredisi faizlerinden alınan KKDF ve BSMV oranları nedir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">Konut kredisi faizlerinden alınan KKDF ve BSMV oranları nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            Gerçek kişilerin **mesken amaçlı kullanacakları evler için** alacakları konut kredileri, **KKDF (Kaynak Kullanımı Destekleme Fonu)** ve **BSMV (Banka ve Sigorta Muameleleri Vergisi)**'nden tamamen **muaftır** (oranları %0'dır). Bu durum konut kredilerini bireysel ihtiyaç kredilerine göre vergi avantajlı hale getirir.
                        </p>
                    </div>
                </div>

                {/* Soru 11: Kredi yeniden yapılandırma (refinansman) nedir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-green-700 mb-2">Kredi yeniden yapılandırma (refinansman) nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-green-300">
                            Kredi yeniden yapılandırma veya **refinansman**, mevcut konut borcunun **vade, faiz oranı** gibi ana kriterlerinde değişiklik yapmak amacıyla, genellikle daha avantajlı şartlarda başka bir kredi ile **kapatılmasına** denir. Faiz oranları düştüğünde refinansman yapmak cazip hale gelir. Dilerseniz Refinansman Hesaplama aracıyla mevcut borcunuzu yeniden yapılandırmanın avantajlı olup olmadığını hemen öğrenebilirsiniz.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

// Sonuç kartı için küçük bir yardımcı bileşen
const ResultCard = ({ title, value, color, description }) => (
  <div className={`bg-white p-4 rounded-xl shadow-md border-l-4 border-${color}-500 transition-shadow hover:shadow-lg`}>
    <h3 className="text-md font-semibold text-gray-500 mb-1">{title}</h3>
    <p className={`text-3xl font-extrabold text-${color}-700`}>{value}</p>
    <p className="text-xs text-gray-400 mt-1 truncate">{description}</p>
  </div>
);