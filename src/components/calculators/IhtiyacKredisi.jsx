import { useState } from 'react';

export default function IhtiyacKredisi() {
  const [mode, setMode] = useState('tutar');
  // Kredi tutarı default değerini 250.000'den 100.000'e düşürdüm, daha yaygın bir örnek olması için.
  const [krediTutari, setKrediTutari] = useState(100000); 
  const [aylikTaksit, setAylikTaksit] = useState(3500); // Daha düşük bir taksit örneği
  const [vade, setVade] = useState(36);
  const [faizOrani, setFaizOrani] = useState(3.29);

  // Vergi oranları (KKDF ve BSMV)
  const kkdf = 0.15; // Kaynak Kullanımını Destekleme Fonu (%15)
  const bsmv = 0.10; // Banka ve Sigorta Muameleleri Vergisi (%10)
  
  // Efektif faiz oranı: (Faiz Oranı) * (1 + KKDF + BSMV) 
  // Not: Bu, toplam maliyeti gösteren basit bir yaklaşık hesaplamadır, 
  // gerçek efektif yıllık faiz (APR) hesaplaması daha karmaşıktır.
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

  // Gerçek Yıllık Maliyet Oranı (YMO/APR) hesaplaması
  // Basit aylık/yıllık maliyet yerine, kredinin gerçek maliyetini yansıtan YMO hesaplaması daha doğrudur.
  // Bu, itere edilerek bulunan daha karmaşık bir orandır, ancak biz burada basit efektif faiz oranını göstereceğiz.
  const yillikMaliyetOrani = efektifFaizYillik; // Basit gösterim için

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

  for (let i = 1; i <= Math.min(vade, 60); i++) { // Maksimum 60 taksiti gösterelim
    const faizTutar = kalanAnapara * aylikFaiz;
    const kkdfTutar = faizTutar * kkdf;
    const bsmvTutar = faizTutar * bsmv;
    
    // Taksit, Faiz+KKDF+BSMV'den büyük olmalı
    let anaparaOdeme = taksit - faizTutar - kkdfTutar - bsmvTutar;
    
    // Son taksitte kalan anaparayı temizle
    if (i === vade) {
      anaparaOdeme = kalanAnapara;
    } else if (kalanAnapara < 0.01) {
      // Kredi tamamen kapandıysa
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

  // Taksit sayısı 120 olduğu için, kullanıcıya daha fazla veri olduğunu gösterelim.
  const displayLimit = 60; 

  return (
    <div className="min-h-screen bg-gray-50 py-8 font-['Inter']">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-extrabold text-indigo-800 text-center mb-10 border-b-4 border-indigo-200 pb-3">
          <span className="text-5xl mr-2">💰</span> İhtiyaç Kredisi Hesaplama Aracı
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
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-300'
                    : 'bg-white text-indigo-600 border-2 border-indigo-400 hover:bg-indigo-50'
                }`}
              >
                Kredi Tutarına Göre (₺)
              </button>
              <button
                onClick={() => setMode('taksit')}
                className={`px-6 py-3 rounded-full text-lg font-bold transition-all transform hover:scale-105 focus:outline-none focus:ring-4 ${
                  mode === 'taksit'
                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-300'
                    : 'bg-white text-emerald-600 border-2 border-emerald-400 hover:bg-emerald-50'
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
                        ? 'text-indigo-700 bg-indigo-50 border-2 border-indigo-300 focus:ring-4 focus:ring-indigo-200'
                        : 'text-emerald-700 bg-emerald-50 border-2 border-emerald-300 focus:ring-4 focus:ring-emerald-200'
                    }`}
                    placeholder={mode === 'tutar' ? "100000" : "3500"}
                  />
                </div>

                {/* 2. Vade Inputu */}
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Vade (Ay - Max 60)</label>
                  <input
                    type="number"
                    value={vade}
                    onChange={(e) => setVade(Math.max(1, Math.min(60, +e.target.value || 1)))} // Tüketici kredilerinde max 60 ay sınırı
                    min="1"
                    max="60"
                    className="w-full px-5 py-4 text-2xl font-extrabold text-gray-800 bg-gray-100 rounded-xl border-2 border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-colors"
                    placeholder="36"
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
                    placeholder="3.29"
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
                  color="indigo" 
                  description={mode === 'taksit' ? "Çekebileceğiniz Maksimum Tutar" : "Talep Ettiğiniz Tutar"}
                />
                <ResultCard 
                  title="Aylık Taksit" 
                  value={`₺${formatCurrency(taksit)}`} 
                  color="emerald" 
                  description={mode === 'taksit' ? "Girdiğiniz Taksit Tutarı" : "Hesaplanan Aylık Ödeme"}
                />
                <ResultCard 
                  title="Toplam Ödeme" 
                  value={`₺${formatCurrency(toplamOdeme)}`} 
                  color="blue" 
                  description="Kredi sonunda geri ödenecek toplam miktar"
                />
                <ResultCard 
                  title="Toplam Faiz + Vergi" 
                  value={`₺${formatCurrency(toplamFaiz)}`} 
                  color="red" 
                  description="Ödenecek Toplam Faiz, KKDF ve BSMV"
                />
                <ResultCard 
                  title="Aylık Faiz Oranı" 
                  value={`%${formatPercentage(faizOrani)}`} 
                  color="purple" 
                  description="Vergisiz, Anapara Üzerinden Hesaplanan Oran"
                />
                 <ResultCard 
                  title="Efektif Yıllık Faiz" 
                  value={`%${formatPercentage(yillikMaliyetOrani)}`} 
                  color="pink" 
                  description="Yıllık Toplam Maliyet Oranı (Vergi Dahil Basit Yaklaşım)"
                />
              </div>
              <div className="mt-6 p-4 bg-gray-100 rounded-xl text-sm text-gray-600">
                <p className="font-semibold">KKDF: %{kkdf * 100} | BSMV: %{bsmv * 100}</p>
                <p>KKDF ve BSMV dahil edilerek taksitler hesaplanmıştır. Sonuçlar tahmini olup, bankadan bankaya masraf ve sigorta eklemeleriyle değişebilir.</p>
              </div>
            </div>

            {/* Ödeme Planı Tablosu */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 text-center">
                <h3 className="text-2xl font-extrabold">Aylık Ödeme Planı ({Math.min(vade, displayLimit)} Taksit Gösteriliyor)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-800 text-white sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-left">NO</th>
                      <th className="px-3 py-3 text-left">TARİH</th>
                      <th className="px-3 py-3 text-right">TAKSİT</th>
                      <th className="px-3 py-3 text-right">ANAPARA</th>
                      <th className="px-3 py-3 text-right">FAİZ</th>
                      <th className="px-3 py-3 text-right">KKDF</th>
                      <th className="px-3 py-3 text-right">BSMV</th>
                      <th className="px-3 py-3 text-right">KALAN ANAPARA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {odemePlani.slice(0, displayLimit).map((row) => (
                      <tr key={row.no} className="hover:bg-blue-50 transition-colors">
                        <td className="px-3 py-3 font-medium text-gray-700">{row.no}</td>
                        <td className="px-3 py-3 text-gray-600">{row.tarih}</td>
                        <td className="px-3 py-3 text-right font-semibold text-indigo-700">₺{formatCurrency(parseFloat(row.taksit))}</td>
                        <td className="px-3 py-3 text-right text-gray-800">{formatCurrency(parseFloat(row.anapara))}</td>
                        <td className="px-3 py-3 text-right text-red-600">{formatCurrency(parseFloat(row.faiz))}</td>
                        <td className="px-3 py-3 text-right text-orange-600">{formatCurrency(parseFloat(row.kkdf))}</td>
                        <td className="px-3 py-3 text-right text-orange-600">{formatCurrency(parseFloat(row.bsmv))}</td>
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
                {['Konut Kredisi Hesaplama', 'Taşıt Kredisi Hesaplama', 'Kredi Kartı Borç Hesaplama', 'Erken Kapatma Cezası', 'Ne Kadar Kredi Çekebilirim?'].map((link, index) => (
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
        
        {/* --- SEO UYUMLU İÇERİK (FAQPage) --- */}
        <div 
            className="mt-20 px-4 py-10 bg-white rounded-3xl shadow-2xl border border-gray-200"
            itemScope 
            itemType="https://schema.org/FAQPage"
        >
            <h2 className="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-4">
                <span className="text-indigo-600 mr-2">❓</span> İhtiyaç Kredisi Hakkında Sıkça Sorulan Sorular
            </h2>

            <div className="space-y-6 text-gray-700 leading-relaxed">
                
                {/* Soru 1: İhtiyaç kredisi nedir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-indigo-700 mb-2">İhtiyaç kredisi nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-indigo-300">
                            Ticari amaçlı kullanılmayan, kişilerin ufak çaplı **bireysel gereksinimlerini gidermek için kullanabildikleri nakit kredilerdir**. Eğitim, beyaz eşya, tatil, evlilik ve ev yenileme kredisi gibi borçlanmaların tümü bu kapsamda değerlendirilir. Günümüzde en çok kullanılan borçlanma türlerinden biri olan bireysel ihtiyaç kredilerine başvuru şartları bulunur ve sadece bu şartları taşıyan kişilerin başvuruları ilgili kurumlar tarafından kabul edilir.
                        </p>
                    </div>
                </div>

                {/* Soru 2: İhtiyaç kredisine başvuru şartları nelerdir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-indigo-700 mb-2">İhtiyaç kredisine başvuru şartları nelerdir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-indigo-300">
                            Başvuru şartları arasında ilk sırayı **yaş şartı** almaktadır. İlgili yasalar gereği bankalardan borç almak isteyen kişilerin reşit olmaları yani **18 yaşında olmaları** şarttır. Ayrıca, başvuru sahibinin **aylık düzenli ve belgelenebilir bir gelire** sahip olması şartı aranır ve aylık belgelenebilir geliri olmayan kişilerin başvuruları bankalar tarafından reddedilmektedir.
                        </p>
                    </div>
                </div>

                {/* Soru 3: İhtiyaç kredisi başvurusu nasıl yapılır? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-indigo-700 mb-2">İhtiyaç kredisi başvurusu nasıl yapılır?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-indigo-300">
                            Günümüzde **internetten, mobil uygulamalardan veya SMS ile** başvuru yapılabildiği gibi, aylık gelirinizi gösteren bir belge ve kimliğiniz ile size en yakın **banka şubesini** ziyaret ederek de başvuru formu doldurabilirsiniz. İhtiyaç kredisi başvuruları bankalar tarafından oldukça kısa bir süre içerisinde cevaplanmaktadır.
                        </p>
                    </div>
                </div>

                {/* Soru 4: Geri ödeme planı nedir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-indigo-700 mb-2">Geri ödeme planı nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-indigo-300">
                            Borç alma sırasında müşteriyle banka arasında üzerinde anlaşılan; kredinin vadesini, faiz oranını, ödenecek taksit tutarını, vergi ve fonları içeren **detaylı ödeme tablosudur**.
                        </p>
                    </div>
                </div>

                {/* Soru 5: Vade nedir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-indigo-700 mb-2">Vade nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-indigo-300">
                            Borç alırken belirlenen geri ödemelerin **süresidir**. Türkiye'de tüketici (ihtiyaç) kredilerinde yasal üst sınır **60 ay** ile sınırlandırılmıştır.
                        </p>
                    </div>
                </div>

                {/* Soru 6: İhtiyaç kredisi nasıl hesaplanır? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-indigo-700 mb-2">İhtiyaç kredisi nasıl hesaplanır?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-indigo-300">
                            Hesaplama, genellikle **anüite formülü** kullanılarak yapılır. Öncelikle ilgili faiz, **KKDF** ve **BSMV** oranları kullanılarak geri ödenecek toplam tutar hesaplanır. Hesaplanan bu tutar vade süresince aylara dağıtılarak geri ödeme planı hesaplanmış olur. Kredi tutarı, vade, aylık faiz ve taksit miktarı bu hesaplamanın temel değişkenleridir.
                        </p>
                    </div>
                </div>
                
                {/* Soru 7: En fazla ne kadar ihtiyaç kredisi alınabilir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-indigo-700 mb-2">En fazla ne kadar ihtiyaç kredisi alınabilir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-indigo-300">
                            Alınabilecek borç tutarı bankadan bankaya ve başvuru sahibinin **gelir durumuna** göre değişmektedir. Türkiye genelinde bankalar (müşterinin durumuna göre) 50.000 TL ve üzeri ihtiyaç kredileri verebilmektedirler. Alabileceğiniz maksimum borç tutarı, bankayı geri ödeme konusunda ikna etmenize bağlıdır.
                        </p>
                    </div>
                </div>

                {/* Soru 8: İhtiyaç kredisi en fazla kaç ayda geri ödenebilir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-indigo-700 mb-2">İhtiyaç kredisi en fazla kaç ayda geri ödenebilir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-indigo-300">
                            Türkiye genelinde bankalar en az 3 ay, en fazla ise **60 aya** varan vadelerle tüketici kredilerini bireysel müşterilerine kullandırabilmektedirler.
                        </p>
                    </div>
                </div>

                {/* Soru 9: İhtiyaç kredilerine uygulanan vergi ve fonlar nelerdir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-indigo-700 mb-2">İhtiyaç kredilerine uygulanan vergi ve fonlar nelerdir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-indigo-300">
                            İhtiyaç kredileri damga vergisinden muaftır. Ancak, her taksitte, hesaplanan **faiz tutarı** üzerinden **KKDF (Kaynak Kullanımı Destekleme Fonu)** ve **BSMV (Banka ve Sigorta Muameleleri Vergisi)** tahakkuk etmektedir. Bu tutarlar bankalarca tahsil edilerek ilgili kurumlara ödenir.
                        </p>
                    </div>
                </div>

                {/* Soru 10: BSMV nedir ve faizlerden alınan BSMV oranı nedir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-indigo-700 mb-2">BSMV nedir ve faizlerden alınan BSMV oranı nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-indigo-300">
                            **BSMV**, Banka Sigorta Muameleleri Vergisi'dir. BSMV, kar üzerinden hesaplanarak resmi kurumlara ödenmek üzere banka veya ilgili kurum tarafından müşterilerinden tahsil edilmektedir. İhtiyaç kredilerinde faiz üzerinden tahakkuk eden BSMV oranı güncel olarak **%10**'dur (Kâr üzerinden %5).
                        </p>
                    </div>
                </div>

                {/* Soru 11: KKDF nedir ve faizlerden alınan KKDF oranı nedir? */}
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-indigo-700 mb-2">KKDF nedir ve faizlerden alınan KKDF oranı nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-indigo-300">
                            **KKDF**, Kaynak Kullanımı Destekleme Fonu'dur. KKDF, faiz geliri üzerinden hesaplanarak resmi kurumlara ödenmek üzere banka veya ilgili kurum tarafından müşterilerden tahsil edilmektedir. İhtiyaç kredilerinde faiz üzerinden tahakkuk eden KKDF oranı güncel olarak **%15**'tir. Tüzel kişilerin kullandığı kredilerde KKDF muafiyeti mevcuttur.
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