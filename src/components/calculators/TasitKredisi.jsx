import { useState, useMemo } from 'react';

// Taşıt Kredisi Hesaplama Aracı (React Bileşeni - Sadeleştirilmiş Versiyon)
export default function TasitKredisiSade() {
  // Görseldeki gibi sadece checkbox ile yönetiliyor. false: Kredi Tutarı, true: Aylık Taksit
  const [isTaksitMode, setIsTaksitMode] = useState(false); 

  // Taşıt kredisi için varsayılan değerler
  const [krediTutari, setKrediTutari] = useState(35000);
  const [aylikTaksit, setAylikTaksit] = useState(1500); // Taksit modu için varsayılan
  const [vade, setVade] = useState(24);                  
  const [faizOrani, setFaizOrani] = useState(0.99);       

  // Taşıt Kredisi Vergi Oranları (En yaygın bireysel kullanıma sabitlendi)
  const BSMV_ORANI_YUZDE = 5;
  const KKDF_ORANI_YUZDE = 15; 

  const bsmv = BSMV_ORANI_YUZDE / 100;
  const kkdf = KKDF_ORANI_YUZDE / 100; // KKDF %15'e sabitlendi
  const aylikFaiz = faizOrani / 100;

  // Anüite Hesaplamaları
  const { taksit, cekilebilir, toplamOdeme, toplamFaiz, efektifFaizYillik, odemePlani } = useMemo(() => {
    let taksit = 0;
    let cekilebilir = krediTutari;
    const maxVade = 48; // Taşıt Kredisinde max 48 ay

    const gecerliVade = Math.max(1, Math.min(vade, maxVade)); // Vadeyi kısıtla ve minimum 1 yap

    // Anüite formülü
    if (isTaksitMode) {
      // Taksit Modu: Çekilebilecek Kredi Tutarını Hesapla
      const R = aylikFaiz;
      const N = gecerliVade;
      const P = aylikTaksit;
      if (R === 0) {
        cekilebilir = P * N;
      } else {
        const M = Math.pow(1 + R, N);
        // Kredi tutarını (çekilebilir anaparayı) hesaplama
        cekilebilir = P * (M - 1) / (R * M); 
      }
      taksit = aylikTaksit;
    } else {
      // Tutar Modu: Aylık Taksit Tutarı Hesapla
      const R = aylikFaiz;
      const N = gecerliVade;
      if (R === 0) {
        taksit = krediTutari / N;
      } else {
        // Taksit tutarını hesaplama
        const M = Math.pow(1 + R, N);
        taksit = (krediTutari * R * M) / (M - 1);
      }
      cekilebilir = krediTutari;
    }

    taksit = isNaN(taksit) || !isFinite(taksit) ? 0 : taksit;
    cekilebilir = isNaN(cekilebilir) || !isFinite(cekilebilir) ? 0 : cekilebilir;

    // Efektif Yıllık Maliyet Oranı hesaplama
    const efektifAylikVergiOrani = (aylikFaiz * (kkdf + bsmv));
    const efektifFaizYillik = (aylikFaiz + efektifAylikVergiOrani) * 12 * 100;

    const odemePlani = [];
    let kalanAnapara = cekilebilir;
    const baslangic = new Date();
    let toplamFaizVergiDahil = 0;

    // Ödeme Planı Hesaplaması
    for (let i = 1; i <= gecerliVade; i++) {
      const faizTutar = kalanAnapara * aylikFaiz;
      const kkdfTutar = faizTutar * kkdf;
      const bsmvTutar = faizTutar * bsmv;
      
      let anaparaOdeme = taksit - faizTutar; 
      
      // Son taksitte kalan anaparayı tam temizle
      if (i === gecerliVade) {
        anaparaOdeme = kalanAnapara;
      } 
      
      anaparaOdeme = Math.max(0, anaparaOdeme);
      
      kalanAnapara -= anaparaOdeme;
      
      // Kalan anaparanın hassasiyet sorununu gidermek için
      if (i === gecerliVade && kalanAnapara < 0.01 && kalanAnapara > -0.01) {
          anaparaOdeme += kalanAnapara; // Kalan küsuratı anaparaya ekle
          kalanAnapara = 0;
      } else if (kalanAnapara < 0.01) {
         kalanAnapara = 0;
      }

      const sonGercekTaksit = anaparaOdeme + faizTutar + kkdfTutar + bsmvTutar;

      toplamFaizVergiDahil += faizTutar + kkdfTutar + bsmvTutar;

      const tarih = new Date(baslangic);
      tarih.setMonth(tarih.getMonth() + i);

      odemePlani.push({
        no: i,
        tarih: tarih.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'),
        taksit: sonGercekTaksit.toFixed(2), 
        anapara: anaparaOdeme.toFixed(2),
        faiz: faizTutar.toFixed(2),
        kkdf: kkdfTutar.toFixed(2),
        bsmv: bsmvTutar.toFixed(2),
        kalan: Math.max(0, kalanAnapara).toFixed(2)
      });
    }

    const toplamOdemeHesaplanan = odemePlani.reduce((sum, item) => sum + parseFloat(item.taksit), 0);

    return {
      taksit: odemePlani.length > 0 ? parseFloat(odemePlani[0].taksit) : taksit,
      cekilebilir,
      toplamOdeme: toplamOdemeHesaplanan,
      toplamFaiz: toplamFaizVergiDahil,
      efektifFaizYillik,
      odemePlani
    };
  }, [isTaksitMode, krediTutari, aylikTaksit, vade, faizOrani]);


  // Para birimi formatlama fonksiyonu
  const formatCurrency = (amount) => {
    return (isNaN(amount) || !isFinite(amount) ? 0 : amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercentage = (rate) => {
    return (isNaN(rate) || !isFinite(rate) ? 0 : rate).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  };

  const resetCalculator = () => {
    setKrediTutari(35000);
    setAylikTaksit(1500);
    setVade(24);
    setFaizOrani(0.99);
    setIsTaksitMode(false);
  };

  const displayLimit = 48; // Taşıt kredisi max vadesi

  return (
    <div className="min-h-screen bg-gray-50 py-8 font-['Inter']">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-extrabold text-blue-800 text-center mb-10 border-b-4 border-blue-200 pb-3">
          <span className="text-5xl mr-2">🚗</span> Taşıt Kredisi Hesaplama Aracı
        </h1>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* SOL TARAF - HESAPLAMA & SONUÇLAR */}
          <div className="lg:col-span-2 space-y-8">

            {/* Hesaplama Formu (Görseldeki Gibi Sade) */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">Hesaplama Formu</h2>
              <p className="text-red-500 text-sm mb-4">* Doldurulması zorunlu alanlar.</p>

              {/* Taksit Modu Checkbox'ı */}
              <div className="mb-6 flex items-center">
                <input
                  id="taksit-mode"
                  type="checkbox"
                  checked={isTaksitMode}
                  onChange={(e) => setIsTaksitMode(e.target.checked)}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="taksit-mode" className="ml-3 text-gray-700 font-semibold">
                  Aylık taksit tutarı girerek hesaplama yapmak için bu kutucuğu işaretleyiniz
                </label>
              </div>

              <div className="space-y-6">
                
                {/* Kredi Tutarı Inputu */}
                <div className="flex items-center">
                  <label className="w-1/3 text-gray-700 font-semibold">* Kredi Tutarı (₺):</label>
                  <input
                    type="number"
                    value={krediTutari}
                    onChange={(e) => setKrediTutari(+e.target.value || 0)}
                    min="0"
                    className={`w-1/3 px-3 py-2 border rounded-md text-lg focus:outline-none ${isTaksitMode ? 'bg-gray-200 text-gray-500' : 'border-blue-300 focus:border-blue-500'}`}
                    placeholder="Örn. 35000"
                    disabled={isTaksitMode}
                  />
                  <span className="ml-3 text-gray-500">Örn. 35000</span>
                </div>

                {/* Aylık Taksit Inputu (Sadece Taksit Modu Aktifse Görünür) */}
                {isTaksitMode && (
                  <div className="flex items-center">
                    <label className="w-1/3 text-gray-700 font-semibold">* Aylık Taksit (₺):</label>
                    <input
                      type="number"
                      value={aylikTaksit}
                      onChange={(e) => setAylikTaksit(+e.target.value || 0)}
                      min="0"
                      className="w-1/3 px-3 py-2 border border-purple-300 rounded-md text-lg focus:outline-none focus:border-purple-500"
                      placeholder="Örn. 1500"
                    />
                    <span className="ml-3 text-gray-500">Örn. 1500</span>
                  </div>
                )}


                {/* Vade Inputu */}
                <div className="flex items-center">
                  <label className="w-1/3 text-gray-700 font-semibold">* Vade (Ay):</label>
                  <input
                    type="number"
                    value={vade}
                    onChange={(e) => setVade(Math.max(1, Math.min(48, +e.target.value || 1)))} 
                    min="1"
                    max="48"
                    className="w-1/3 px-3 py-2 border border-gray-300 rounded-md text-lg focus:outline-none focus:border-gray-500"
                    placeholder="Örn. 24"
                  />
                  <span className="ml-3 text-gray-500">Örn. 24</span>
                </div>

                {/* Faiz Oranı Inputu */}
                <div className="flex items-center">
                  <label className="w-1/3 text-gray-700 font-semibold">* Aylık Faiz Oranı (%):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={faizOrani}
                    onChange={(e) => setFaizOrani(+e.target.value || 0)}
                    min="0"
                    className="w-1/3 px-3 py-2 border border-red-300 rounded-md text-lg focus:outline-none focus:border-red-500"
                    placeholder="Örn. 0.99"
                  />
                  <span className="ml-3 text-gray-500">Örn. 0.99</span>
                </div>

              </div>
              
              <div className="flex justify-start mt-8 gap-4">
                <button 
                  onClick={() => {/* Hesaplama zaten useMemo içinde tetikleniyor */}} 
                  className="px-8 py-3 bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:bg-blue-600 transition-colors transform hover:scale-105"
                >
                  Hesapla
                </button>
                <button 
                  onClick={resetCalculator}
                  className="px-8 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg shadow-md hover:bg-gray-300 transition-colors"
                >
                  Sıfırla
                </button>
              </div>

              {/* Paylaş / Siteye Ekle Butonları (Görseldeki gibi alt sağda konumlandırıldı) */}
              <div className="flex justify-end mt-4 gap-4 text-blue-500">
                <a href="#" className="flex items-center font-semibold hover:text-blue-700 transition-colors">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.88 12.83 9 12.316 9 11.802c0-.494-.123-.966-.337-1.404a3 3 0 11.942-1.956 4 4 0 00-1.884 1.258c-.378.378-.518.775-.59 1.144L8 15a4 4 0 00-4 4v1m12 0h-4M10 20v-4m3 0H9m1.5-11.5L14 11m-2-1L10 13m1.5 0L14 11m-2-1L10 13m1.5-1.5z"/></svg>
                  Paylaş
                </a>
                <a href="#" className="flex items-center font-semibold hover:text-blue-700 transition-colors">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 8l-4 4 4 4"/></svg>
                  Siteye Ekle
                </a>
              </div>

            </div>

            {/* Sonuçlar (Stil Korundu) */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
              <h2 className="text-3xl font-bold text-center text-blue-700 mb-8">Hesaplama Özeti</h2>
              <div className="grid md:grid-cols-2 gap-6 text-lg">
                <ResultCard
                  title="Kredi Tutarı"
                  value={`₺${formatCurrency(cekilebilir)}`}
                  color="blue" 
                  description={isTaksitMode ? "Çekebileceğiniz Maksimum Tutar" : "Talep Ettiğiniz Tutar"}
                />
                <ResultCard
                  title="Aylık Taksit"
                  value={`₺${formatCurrency(taksit)}`}
                  color="purple" 
                  description={isTaksitMode ? "Girdiğiniz Taksit Tutarı" : "Hesaplanan Aylık Ödeme"}
                />
                <ResultCard
                  title="Toplam Geri Ödeme"
                  value={`₺${formatCurrency(toplamOdeme)}`}
                  color="green"
                  description="Kredi sonunda geri ödenecek anapara + faiz + vergi"
                />
                <ResultCard
                  title="Toplam Faiz + Vergi Maliyeti"
                  value={`₺${formatCurrency(toplamFaiz)}`}
                  color="red"
                  description="Ödenecek Toplam Faiz + KKDF (%15) + BSMV (%5) Tutarı"
                />
                <ResultCard
                  title="Aylık Faiz Oranı"
                  value={`%${formatPercentage(faizOrani)}`}
                  color="indigo"
                  description="Vergisiz, Anapara Üzerinden Hesaplanan Oran"
                />
                <ResultCard
                  title="Yıllık Maliyet Oranı"
                  value={`%${formatPercentage(efektifFaizYillik)}`}
                  color="pink"
                  description={`KKDF (%${KKDF_ORANI_YUZDE}) ve BSMV (%${BSMV_ORANI_YUZDE}) dahil Yıllık Toplam Maliyet Oranı`}
                />
              </div>
              <div className="mt-6 p-4 bg-gray-100 rounded-xl text-sm text-gray-600">
                <p className="font-semibold">KKDF: %{KKDF_ORANI_YUZDE} | BSMV: %{BSMV_ORANI_YUZDE}</p>
                <p>Bu hesaplama, KKDF'nin %15 olduğu bireysel kullanım senaryosuna göre yapılmıştır. Ticari kullanımlar için KKDF %0 olabilir. Sonuçlar tahmini olup, bankadan bankaya dosya masrafı ve sigorta eklemeleriyle değişebilir.</p>
              </div>
            </div>

            {/* Ödeme Planı Tablosu (Stil Korundu) */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 text-center">
                <h3 className="text-2xl font-extrabold">Aylık Ödeme Planı ({vade} Taksit)</h3>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-blue-800 text-white sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-left">NO</th>
                      <th className="px-3 py-3 text-left">TARİH</th>
                      <th className="px-3 py-3 text-right">TAKSİT</th>
                      <th className="px-3 py-3 text-right">ANAPARA</th>
                      <th className="px-3 py-3 text-right">FAİZ</th>
                      <th className="px-3 py-3 text-right">KKDF ({KKDF_ORANI_YUZDE}%)</th>
                      <th className="px-3 py-3 text-right">BSMV (5%)</th>
                      <th className="px-3 py-3 text-right">KALAN ANAPARA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {odemePlani.slice(0, displayLimit).map((row) => (
                      <tr key={row.no} className="hover:bg-blue-50 transition-colors">
                        <td className="px-3 py-3 font-medium text-gray-700">{row.no}</td>
                        <td className="px-3 py-3 text-gray-600">{row.tarih}</td>
                        <td className="px-3 py-3 text-right font-semibold text-blue-700">₺{formatCurrency(parseFloat(row.taksit))}</td>
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

          {/* SAĞ TARAF - YAN MENÜ & REKLAM ALANLARI (Stil Korundu) */}
          <div className="space-y-8">
            {/* İlgili Hesaplamalar */}
            <div className="bg-green-700 text-white rounded-2xl shadow-xl p-6 border-b-4 border-green-900">
              <h3 className="text-xl font-bold mb-4 border-b border-green-500 pb-2">İlgili Hesaplamalar</h3>
              <ul className="space-y-3 text-lg">
                {['İhtiyaç Kredisi Hesaplama', 'Konut Kredisi Hesaplama', 'İş Yeri Kredisi Hesaplama', 'Kredi Kartı Borç Hesaplama', 'Erken Kapatma Cezası'].map((link, index) => (
                  <li key={index} className="border-b border-green-600 last:border-b-0 pb-1">
                    <a href="#" className="flex items-center hover:underline hover:text-green-200 transition-colors">
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
        
        {/* --- SEO UYUMLU İÇERİK (FAQPage) - TAŞIT KREDİSİ --- (Metinler korundu) */}
        <div
            className="mt-20 px-4 py-10 bg-white rounded-3xl shadow-2xl border border-gray-200"
            itemScope
            itemType="https://schema.org/FAQPage"
        >
            <h2 className="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-4">
                <span className="text-blue-600 mr-2">❓</span> Taşıt Kredisi Hakkında Sıkça Sorulan Sorular
            </h2>
            


            <div className="space-y-6 text-gray-700 leading-relaxed">

                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-blue-700 mb-2">Taşıt kredisi nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-blue-300">
                            **Bireysel ya da ticari amaçlı** olarak hem gerçek hem de tüzel kişilerin araç gereksinimlerini gidermek için kullanabildikleri finansal ürünlerdir. Hem **sıfır km hem de ikinci eller** için kredi kullanılabilmektedir. Günümüzde en çok kullanılan borçlanma türlerinden biridir. Başvuru şartları bulunur ve sadece bu şartları taşıyan kişilerin başvuruları ilgili kurumlar tarafından kabul edilir.
                        </p>
                    </div>
                </div>

                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-blue-700 mb-2">Araç kredisi başvurusu nasıl yapılır?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-blue-300">
                            Günümüzde **internetten ve SMS** ile başvuru yapılabildiği gibi **banka şubelerine** giderek de başvuru yapılabilmektedir. Her banka farklı başvuru süreçlerine sahiptir. Başvurular, ilgili kurumlar tarafından oldukça kısa bir süre içerisinde cevaplanmaktadır.
                        </p>
                    </div>
                </div>

                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-blue-700 mb-2">İkinci el araçlar için kredi almak mümkün mü?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-blue-300">
                            Çoğunlukla **5 yaşa kadar** olan araçlar kredilendirilmekte ve kefil talep edilmektedir.
                        </p>
                    </div>
                </div>
                
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-blue-700 mb-2">En fazla ne kadar kredi alınabilir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-blue-300">
                           Türkiye genelinde bankalar **0 kilometre taşıtlarda KDV ve ÖTV dahil fiyatın %80'ine** varan krediler vermektedirler. Kredilendirme oranı, araç değeri **50 bin lira ve altı olursa yüzde 70** ile sınırlandırılmakta, değerin 50 bin lirayı aşması durumunda, 50 bin liraya kadar olan kısım için yüzde 70, üstündeki kısım için **yüzde 50** ile sınırlandırılmaktadır. Ancak alabileceğiniz borç tutarı bankadan bankaya ve başvuru sahibine göre değişebilmektedir.
                        </p>
                    </div>
                </div>
                
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-blue-700 mb-2">En fazla kaç ayda geri ödenebilir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-blue-300">
                            Türkiye genelinde bankalar en az 3 ay, en fazla ise **48 aya** varan vadelerle araç kredilerini tüketicilere kullandırabilmektedirler.
                        </p>
                    </div>
                </div>
                
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-blue-700 mb-2">Taşıt kredilerine uygulanan vergi ve fonlar nelerdir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-blue-300">
                            Damga vergisinden muaftır ancak her taksitte, faiz üzerinden **KKDF** ve **BSMV** tahakkuk etmektedir. Satın alındıktan sonra vergi levhası ve işletme defter aktifine kaydedilmesi durumunda KKDF kesintisi uygulanmamaktadır (Ticari kullanım).
                        </p>
                    </div>
                </div>

                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-blue-700 mb-2">BSMV nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-blue-300">
                            **Banka Sigorta Muameleleri Vergisi**'dir. Faize uygulanır. Araç kredilerinde faiz üzerinden **%5 oranında BSMV** tahakkuk etmektedir.
                        </p>
                    </div>
                </div>

                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-blue-700 mb-2">KKDF nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-blue-300">
                            **Kaynak Kullanımı Destekleme Fonu**'dur. Faize uygulanır. **Bireysel** kullanım için faiz üzerinden **%15** oranında KKDF tahakkuk etmekteyken, şirketler gibi **tüzel** kişiliklerin alacağı ticari araçlarda (%0 seçeneği) **%0**'dır.
                        </p>
                    </div>
                </div>
                
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <h3 itemProp="name" className="text-xl font-bold text-blue-700 mb-2">Geri ödeme planı nedir?</h3>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                        <p itemProp="text" className="pl-4 border-l-4 border-blue-300">
                            Kullanım sırasında müşteriyle banka arasında üzerinde anlaşılan; **vadeyi, faiz oranını, ödenecek taksit tutarını, vergi ve fonları** içeren ödeme tablosudur.
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