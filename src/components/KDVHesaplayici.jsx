import React, { useState, useMemo } from 'react';

const KDVHesaplayici = () => {
    // State'ler
    const [tutar, setTutar] = useState('');
    const [kdvOrani, setKdvOrani] = useState(20); // Varsayılan %20 KDV

    // Hesaplama Mantığı (useMemo ile performansı artırıyoruz)
    const { kdvTutari, brutTutar } = useMemo(() => {
        const netTutar = parseFloat(tutar) || 0;
        const oran = parseFloat(kdvOrani) / 100;

        if (netTutar <= 0 || oran <= 0) {
            return { kdvTutari: 0, brutTutar: 0 };
        }

        const calculatedKdvTutari = netTutar * oran;
        const calculatedBrutTutar = netTutar + calculatedKdvTutari;

        return {
            kdvTutari: calculatedKdvTutari.toFixed(2),
            brutTutar: calculatedBrutTutar.toFixed(2)
        };
    }, [tutar, kdvOrani]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-100 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">KDV Hesaplama Aracı</h2>
            
            <div className="space-y-4">
                {/* Net Tutar Girişi */}
                <div>
                    <label htmlFor="netTutar" className="block text-sm font-medium text-gray-700">Net Tutar (KDV Hariç):</label>
                    <input
                        id="netTutar"
                        type="number"
                        placeholder="Örn: 1000"
                        value={tutar}
                        onChange={(e) => setTutar(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                
                {/* KDV Oranı Seçimi */}
                <div>
                    <label htmlFor="kdvOrani" className="block text-sm font-medium text-gray-700">KDV Oranı (%):</label>
                    <select
                        id="kdvOrani"
                        value={kdvOrani}
                        onChange={(e) => setKdvOrani(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="1">1</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                    </select>
                </div>
            </div>

            {/* Sonuç Alanı */}
            <div className="mt-8 pt-4 border-t border-gray-200 space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-semibold text-gray-700">KDV Tutarı:</span>
                    <span className="text-xl font-bold text-blue-600">{kdvTutari} TL</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-semibold text-gray-700">Brüt Tutar (KDV Dahil):</span>
                    <span className="text-xl font-bold text-green-600">{brutTutar} TL</span>
                </div>
            </div>
        </div>
    );
};

export default KDVHesaplayici;