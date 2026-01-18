import { useState } from 'react';

/**
 * Türk Lirası para birimi formatlama
 */
const formatCurrency = (amount) => {
  return (amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Yüzde formatlama
 */
const formatPercentage = (rate) => {
  return (rate || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
};

// Kredi Hesaplama Mantığı (Anüite Formülü)
const calculateLoanDetails = (mode, krediTutari, aylikTaksit, vade, faizOrani) => {
  const aylikFaiz = faizOrani / 100; // Aylık Faizi ondalık olarak kullan
  const kkdf = 0.15; // Kaynak Kullanımını Destekleme Fonu (%15)
  const bsmv = 0.10; // Banka ve Sigorta Muameleleri Vergisi (%10)
  
  let taksit = 0;
  let cekilebilir = krediTutari;
  let hesaplananKrediTutari = krediTutari;

  if (mode === 'taksit') {
    // Aylık taksite göre çekilebilecek kredi tutarını hesapla
    if (aylikFaiz === 0) {
      cekilebilir = aylikTaksit * vade;
    } else {
      // P = T * [ (1 - (1 + i)^-n) / i ]
      const factor = (Math.pow(1 + aylikFaiz, vade) - 1) / (aylikFaiz * Math.pow(1 + aylikFaiz, vade));
      cekilebilir = aylikTaksit * factor;
    }
    hesaplananKrediTutari = cekilebilir;
    taksit = aylikTaksit;
  } else {
    // Kredi tutarına göre aylık taksiti hesapla (Annüite Formülü)
    // T = P * [ i * (1 + i)^n / ((1 + i)^n - 1) ]
    if (aylikFaiz === 0) {
      taksit = krediTutari / vade;
    } else {
      const numerator = aylikFaiz * Math.pow(1 + aylikFaiz, vade);
      const denominator = Math.pow(1 + aylikFaiz, vade) - 1;
      taksit = (krediTutari * numerator) / denominator;
    }
    cekilebilir = krediTutari;
    hesaplananKrediTutari = krediTutari;
  }

  // Yuvarlama işlemleri
  taksit = isNaN(taksit) || !isFinite(taksit) ? 0 : taksit;
  cekilebilir = isNaN(cekilebilir) || !isFinite(cekilebilir) ? 0 : cekilebilir;
  
  const toplamOdeme = taksit * vade;
  const toplamFaiz = toplamOdeme - cekilebilir;
  
  // Basit Efektif Yıllık Faiz Oranı (Vergiler dahil aylık faizin yıllık basit çarpımı)
  const efektifFaizYillik = aylikFaiz * 12 * (1 + kkdf + bsmv) * 100; 

  const odemePlani = [];
  let kalanAnapara = cekilebilir;
  const baslangic = new Date();

  // Ödeme Planı Hesaplaması (Vergi ve Fonlar)
  for (let i = 1; i <= vade; i++) { 
    const faizTutar = kalanAnapara * aylikFaiz;
    const kkdfTutar = faizTutar * kkdf;
    const bsmvTutar = faizTutar * bsmv;
    
    // Taksit Anapara + Faiz + KKDF + BSMV'den oluşur (faiz, kkdf, bsmv taksitin içinde olmalı)
    let anaparaOdeme = taksit - (faizTutar + kkdfTutar + bsmvTutar);
    
    // Son taksitte kalan anaparayı temizle
    if (i === vade || kalanAnapara - anaparaOdeme < 0.01) {
      anaparaOdeme = kalanAnapara;
      // Taksiti yeniden hesapla (son taksit)
      taksit = anaparaOdeme + faizTutar + kkdfTutar + bsmvTutar;
    } 

    anaparaOdeme = Math.max(0, anaparaOdeme);
    kalanAnapara -= anaparaOdeme;

    const tarih = new Date(baslangic);
    tarih.setMonth(tarih.getMonth() + i);

    odemePlani.push({
      no: i,
      tarih: tarih.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'),
      taksit: taksit,
      anapara: anaparaOdeme,
      faiz: faizTutar,
      kkdf: kkdfTutar,
      bsmv: bsmvTutar,
      kalan: Math.max(0, kalanAnapara)
    });
  }
  
  // Toplam Taksit, Toplam Ödeme ve Toplam Faiz değerlerini tablodan değil, formül sonuçlarından al.
  const finalToplamOdeme = odemePlani.reduce((sum, item) => sum + item.taksit, 0);
  const finalToplamFaiz = finalToplamOdeme - cekilebilir;
  
  return {
    hesaplananKrediTutari,
    taksit: taksit,
    toplamOdeme: finalToplamOdeme,
    toplamFaiz: finalToplamFaiz,
    aylikFaizOrani: faizOrani,
    yillikMaliyetOrani: efektifFaizYillik,
    odemePlani,
    kkdf,
    bsmv
  };
};

export default function IhtiyacKredisi() {
  const [mode, setMode] = useState('tutar');
  const [krediTutari, setKrediTutari] = useState(100000); 
  const [aylikTaksit, setAylikTaksit] = useState(3500); 
  const [vade, setVade] = useState(36);
  const [faizOrani, setFaizOrani] = useState(3.29);
  const [sonuclar, setSonuclar] = useState(null);
  
  // Başlangıçta default değerlerle hesaplamayı yap
  useState(() => {
    setSonuclar(calculateLoanDetails(mode, krediTutari, aylikTaksit, vade, faizOrani));
  }, []); 

  // Hesapla butonunun işlevi
  const handleCalculate = () => {
    // Vadeyi Tüketici Kredisi max 60 ay ile sınırla
    const finalVade = Math.max(1, Math.min(60, vade));
    setVade(finalVade);

    const results = calculateLoanDetails(mode, krediTutari, aylikTaksit, finalVade, faizOrani);
    setSonuclar(results);
  };
  
  // Sıfırla butonunun işlevi
  const handleReset = () => {
    setMode('tutar');
    setKrediTutari(100000);
    setAylikTaksit(3500);
    setVade(36);
    setFaizOrani(3.29);
    setSonuclar(null); // Sonuçları temizle
  };

  const currentInputValue = mode === 'tutar' ? krediTutari : aylikTaksit;
  const setCurrentInputValue = mode === 'tutar' ? setKrediTutari : setAylikTaksit;
  
  const displayLimit = 36; // Sadece ilk 36 taksiti gösterelim (Resimde bu kısım yok, ancak kodunuzda var)

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Resimdeki Hesaplama Aracı Kutusu */}
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <h2 style={{ fontSize: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>Kredi Hesaplama Aracı</h2>
        
        <p style={{ color: 'red', fontSize: '12px', marginBottom: '15px' }}>* Doldurulması zorunlu alanlar.</p>

        {/* Hesaplama Şekli */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Hesaplama Şekli:</label>
          <input 
            type="checkbox" 
            id="taksitMode"
            checked={mode === 'taksit'}
            onChange={() => setMode(mode === 'tutar' ? 'taksit' : 'tutar')}
            style={{ marginRight: '5px' }}
          />
          <label htmlFor="taksitMode" style={{ fontSize: '14px' }}>Aylık taksit tutarına göre hesaplama yapmak için bu kutucuğu işaretleyiniz</label>
        </div>

        {/* Türü */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: 'red' }}>* Türü:</label>
          <select style={{ width: '200px', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }} value="Bireysel İhtiyaç Kredisi" readOnly>
            <option>Bireysel İhtiyaç Kredisi</option>
            <option>Konut Kredisi</option>
            <option>Taşıt Kredisi</option>
          </select>
        </div>

        {/* Kredi Tutarı / Aylık Taksit Inputu */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: 'red' }}>
            * {mode === 'tutar' ? 'Kredi Tutarı:' : 'Aylık Taksit:'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="number"
              value={currentInputValue}
              onChange={(e) => setCurrentInputValue(+e.target.value || 0)}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '3px', width: '200px', marginRight: '5px' }}
              placeholder={mode === 'tutar' ? 'Örn. 100000' : 'Örn. 3500'}
            />
            <span style={{ fontSize: '14px', color: '#666' }}>{mode === 'tutar' ? 'TL (Örn. 100000)' : 'TL (Örn. 3500)'}</span>
          </div>
        </div>

        {/* Vade (Ay) */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: 'red' }}>* Vade (Ay):</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="number"
              value={vade}
              onChange={(e) => setVade(Math.max(1, Math.min(60, +e.target.value || 1)))}
              min="1"
              max="60"
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '3px', width: '100px', marginRight: '5px' }}
              placeholder="Örn. 36"
            />
            <span style={{ fontSize: '14px', color: '#666' }}>Örn. 36</span>
          </div>
        </div>

        {/* Aylık Faiz Oranı (%) */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: 'red' }}>* Aylık Faiz Oranı (%):</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="number"
              step="0.01"
              value={faizOrani}
              onChange={(e) => setFaizOrani(+e.target.value || 0)}
              min="0"
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '3px', width: '100px', marginRight: '5px' }}
              placeholder="Örn. 3.29"
            />
            <span style={{ fontSize: '14px', color: '#666' }}>Örn. 3.29</span>
          </div>
        </div>

        {/* Butonlar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleCalculate}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: 'white', 
              backgroundColor: '#4C8BF5', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer', 
              minWidth: '120px'
            }}
          >
            Hesapla
          </button>
          <button
            onClick={handleReset}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: '#333', 
              backgroundColor: '#e0e0e0', 
              border: '1px solid #ccc', 
              borderRadius: '5px', 
              cursor: 'pointer', 
              minWidth: '120px'
            }}
          >
            Sıfırla
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{ background: 'none', border: 'none', color: '#4C8BF5', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ marginRight: '5px' }}>🔗</span> Paylaş
            </button>
            <button style={{ background: 'none', border: 'none', color: '#4C8BF5', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ marginRight: '5px' }}>&lt;/&gt;</span> Siteye Ekle
            </button>
          </div>
        </div>
      </div>
      
      {/* --- Hesaplama Sonuçları ve Ödeme Planı --- */}
      {sonuclar && (
        <div style={{ marginTop: '30px', border: '1px solid #ddd', padding: '20px', borderRadius: '5px', backgroundColor: '#fff' }}>
          <h3 style={{ fontSize: '24px', color: '#0056b3', marginBottom: '20px', textAlign: 'center' }}>Hesaplama Özeti</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }}>
            <ResultDisplay title="Kredi Tutarı" value={`₺${formatCurrency(sonuclar.hesaplananKrediTutari)}`} />
            <ResultDisplay title="Aylık Taksit" value={`₺${formatCurrency(sonuclar.taksit)}`} highlight />
            <ResultDisplay title="Toplam Ödeme" value={`₺${formatCurrency(sonuclar.toplamOdeme)}`} />
            <ResultDisplay title="Toplam Faiz + Vergi" value={`₺${formatCurrency(sonuclar.toplamFaiz)}`} color="#a00" />
            <ResultDisplay title="Aylık Faiz Oranı" value={`%${formatPercentage(sonuclar.aylikFaizOrani)}`} />
            <ResultDisplay title="Efektif Yıllık Faiz" value={`%${formatPercentage(sonuclar.yillikMaliyetOrani)}`} color="#9370DB" />
          </div>
          
          <div style={{ fontSize: '12px', color: '#666', borderTop: '1px dashed #eee', paddingTop: '10px' }}>
            <p>KKDF: %{sonuclar.kkdf * 100} | BSMV: %{sonuclar.bsmv * 100}. Sonuçlar tahmini olup, bankadan bankaya masraf ve sigorta eklemeleriyle değişebilir.</p>
          </div>
          
          {/* Ödeme Planı Tablosu */}
          <h3 style={{ fontSize: '20px', marginTop: '30px', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            Geri Ödeme Planı ({sonuclar.odemePlani.length} Taksit)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0056b3', color: 'white' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>NO</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>TARİH</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>TAKSİT</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>ANAPARA</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>FAİZ</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>KKDF</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>BSMV</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>KALAN ANAPARA</th>
                </tr>
              </thead>
              <tbody>
                {sonuclar.odemePlani.slice(0, displayLimit).map((row) => (
                  <tr key={row.no} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px', textAlign: 'left' }}>{row.no}</td>
                    <td style={{ padding: '8px', textAlign: 'left' }}>{row.tarih}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>₺{formatCurrency(row.taksit)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(row.anapara)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#a00' }}>{formatCurrency(row.faiz)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(row.kkdf)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(row.bsmv)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>₺{formatCurrency(row.kalan)}</td>
                  </tr>
                ))}
                {sonuclar.odemePlani.length > displayLimit && (
                  <tr>
                    <td colSpan="8" style={{ padding: '8px', textAlign: 'center', backgroundColor: '#f0f0f0' }}>
                      ... Geri Kalan {sonuclar.odemePlani.length - displayLimit} Taksit ...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* --- SEO UYUMLU SIKÇA SORULAN SORULAR (FAQPage) --- */}
      <div 
        style={{ marginTop: '50px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#fff' }}
        itemScope 
        itemType="https://schema.org/FAQPage"
      >
        <h2 style={{ fontSize: '24px', color: '#333', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          İhtiyaç Kredisi Hesaplama Hakkında Bilmeniz Gerekenler
        </h2>

        {/* Soru 1: Kredi nedir? */}
        <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question" style={{ marginBottom: '15px' }}>
          <h3 itemProp="name" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0056b3' }}>Kredi nedir?</h3>
          <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
            <p itemProp="text" style={{ fontSize: '14px', paddingLeft: '10px', borderLeft: '3px solid #ccc' }}>
              Bankaların veya diğer kurumların, özvarlıklarının yanı sıra, topladıkları vadeli ve vadesiz Türk Lirası ya da döviz mevduat ile banka dışında temin ettikleri fonları, yasal sınırlar içinde ve banka içi mevzuatı çerçevesinde ihtiyaç sahiplerine **belirli bir süre sonra geri alınması kaydı ile borç olarak vermesi** ya da taahhütlerden doğacak borçlarının garanti edilmesi işlemidir.
            </p>
          </div>
        </div>

        {/* Soru 2: Geri ödeme planı nedir? */}
        <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question" style={{ marginBottom: '15px' }}>
          <h3 itemProp="name" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0056b3' }}>Geri ödeme planı nedir?</h3>
          <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
            <p itemProp="text" style={{ fontSize: '14px', paddingLeft: '10px', borderLeft: '3px solid #ccc' }}>
              Kullanım sırasında mutabık kalınan; **vadeyi**, **faiz oranını**, ödenecek **taksit tutarını**, **vergi ve fonları** içeren detaylı ödeme tablosudur.
            </p>
          </div>
        </div>

        {/* Soru 3: Kredi faizi nasıl hesaplanır? */}
        <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question" style={{ marginBottom: '15px' }}>
          <h3 itemProp="name" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0056b3' }}>Kredi faizi nasıl hesaplanır?</h3>
          <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
            <p itemProp="text" style={{ fontSize: '14px', paddingLeft: '10px', borderLeft: '3px solid #ccc' }}>
              Hesaplama genellikle **anüite formülü** kullanılarak yapılır. Öncelikle borç olarak alınacak tutarın ilgili vade süresince belirlenen oran ile faizi hesaplanır. Bu faizin aylara dağıtılmasıyla her taksitte ödenecek tutar elde edilmiş olur. Ödenen taksit tutarı içerisinden anapara, faiz, **KKDF** ve **BSMV** düşülür.
                          </p>
          </div>
        </div>

        {/* Soru 4: Faiz oranı girerek kredi hesaplama nasıl yapılır? */}
        <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question" style={{ marginBottom: '15px' }}>
          <h3 itemProp="name" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0056b3' }}>Faiz oranı girerek kredi hesaplama nasıl yapılır?</h3>
          <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
            <p itemProp="text" style={{ fontSize: '14px', paddingLeft: '10px', borderLeft: '3px solid #ccc' }}>
              Hesaplama aracımıza ilgili **borç tutarını**, **vadeyi** ve **kredi faiz oranını** girmeniz durumunda, girdiğiniz faiz oranına uygun şekilde hazırlanan ödeme tablosu (anüite formülü ile) hesaplama aracı tarafından oluşturulmaktadır.
            </p>
          </div>
        </div>

        {/* Soru 5: Vade nedir? */}
        <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question" style={{ marginBottom: '15px' }}>
          <h3 itemProp="name" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0056b3' }}>Vade nedir?</h3>
          <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
            <p itemProp="text" style={{ fontSize: '14px', paddingLeft: '10px', borderLeft: '3px solid #ccc' }}>
              Kredi kullanırken belirlenen geri ödemelerin **süresidir**. Türkiye'de tüketici (ihtiyaç) kredilerinde yasal üst sınır **60 ay** ile sınırlandırılmıştır.
            </p>
          </div>
        </div>

        {/* Soru 6: Tüketici kredilerine uygulanan vergi ve fonlar nelerdir? */}
        <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question" style={{ marginBottom: '15px' }}>
          <h3 itemProp="name" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0056b3' }}>Tüketici kredilerine uygulanan vergi ve fonlar nelerdir?</h3>
          <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
            <p itemProp="text" style={{ fontSize: '14px', paddingLeft: '10px', borderLeft: '3px solid #ccc' }}>
              Tüketici kredileri **damga vergisinden muaftır**. Ancak her taksitte, faiz üzerinden **KKDF (%15)** ve **BSMV (%10)** tahakkuk etmektedir. Bu tutarlar bankalarca ilgili kuruma ödenmek üzere tahsil edilmektedir. Konut ve ev tadilat kredilerinde KKDF muafiyeti vardır.
            </p>
          </div>
        </div>

        {/* Soru 7: BSMV nedir? */}
        <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question" style={{ marginBottom: '15px' }}>
          <h3 itemProp="name" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0056b3' }}>BSMV nedir?</h3>
          <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
            <p itemProp="text" style={{ fontSize: '14px', paddingLeft: '10px', borderLeft: '3px solid #ccc' }}>
              **Banka Sigorta Muameleleri Vergisi**'dir. Kâr üzerinden hesaplanarak resmi kurumlara ödenmek üzere banka veya ilgili kurum tarafından müşterilerinden tahsil edilmektedir. Güncel oranı faiz tutarı üzerinden **%10**'dur.
            </p>
          </div>
        </div>

        {/* Soru 8: KKDF nedir? */}
        <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question" style={{ marginBottom: '15px' }}>
          <h3 itemProp="name" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0056b3' }}>KKDF nedir?</h3>
          <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
            <p itemProp="text" style={{ fontSize: '14px', paddingLeft: '10px', borderLeft: '3px solid #ccc' }}>
              **Kaynak Kullanımı Destekleme Fonu**'dur. Faiz geliri üzerinden hesaplanarak devlete aktarılmak üzere banka veya ilgili kurum tarafından müşterilerden tahsil edilmektedir. Tüketici kredilerinde faiz tutarı üzerinden güncel oranı **%15**'tir.
            </p>
          </div>
        </div>

        {/* Soru 9: Bankaların tekliflerini karşılaştırabilir miyim? */}
        <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question" style={{ marginBottom: '15px' }}>
          <h3 itemProp="name" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0056b3' }}>Bankaların tekliflerini karşılaştırabilir miyim?</h3>
          <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
            <p itemProp="text" style={{ fontSize: '14px', paddingLeft: '10px', borderLeft: '3px solid #ccc' }}>
              Evet, çoğu kredi karşılaştırma aracı, faiz oranı girmeden, sisteme kayıtlı bankaların **güncel kredi tekliflerini** ve bu tekliflere uygun ödeme planlarını kolayca karşılaştırma imkanı sunar.
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
}

// Sonuçları minimal bir şekilde göstermek için yardımcı bileşen
const ResultDisplay = ({ title, value, highlight, color }) => (
  <div style={{ padding: '10px', border: '1px solid #eee', borderRadius: '3px', backgroundColor: highlight ? '#e6f7ff' : '#fff' }}>
    <p style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>{title}</p>
    <p style={{ fontSize: '18px', fontWeight: 'bold', color: color || (highlight ? '#0056b3' : '#333') }}>{value}</p>
  </div>
);