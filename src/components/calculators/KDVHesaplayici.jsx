// src/components/calculators/KDVHesaplayici.jsx
import { useState } from 'react';

export default function KDVHesaplayici() {
  const [tutar, setTutar] = useState('');
  const [kdvOrani, setKdvOrani] = useState(20);
  const [tip, setTip] = useState('haric'); // haric veya dahil

  const hesapla = () => {
    const amount = parseFloat(tutar.replace(',', '.')) || 0;
    if (tip === 'haric') {
      const kdv = amount * (kdvOrani / 100);
      const toplam = amount + kdv;
      return { kdv, toplam };
    } else {
      const toplam = amount;
      const kdv = amount - (amount / (1 + kdvOrani / 100));
      const net = toplam - kdv;
      return { kdv, toplam, net };
    }
  };

  const result = tutar ? hesapla() : null;

  const format = (num) => num?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
      <h1 className="text-3xl font-bold text-center mb-8">KDV Hesaplayıcı</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">Tutar (₺)</label>
          <input
            type="text"
            value={tutar}
            onInput={(e) => setTutar(e.target.value)}
            placeholder="1000"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-4 focus:ring-primary/30 focus:outline-none text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">KDV Oranı (%)</label>
          <select
            value={kdvOrani}
            onChange={(e) => setKdvOrani(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-4 focus:ring-primary/30 focus:outline-none text-lg"
          >
            <option value={1}>%1</option>
            <option value={10}>%10</option>
            <option value={20}>%20</option>
          </select>
        </div>
      </div>

      <div className="flex justify-center gap-6 mb-8">
        <button
          onClick={() => setTip('haric')}
          className={`px-8 py-3 rounded-lg font-medium transition ${tip === 'haric' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          KDV Hariç
        </button>
        <button
          onClick={() => setTip('dahil')}
          className={`px-8 py-3 rounded-lg font-medium transition ${tip === 'dahil' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          KDV Dahil
        </button>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Net Tutar</p>
            <p className="text-2xl font-bold text-primary">₺ {format(tip === 'dahil' ? result.net : tutar)}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">KDV Tutarı</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">₺ {format(result.kdv)}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Tutar</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">₺ {format(tip === 'dahil' ? tutar : result.toplam)}</p>
          </div>
        </div>
      )}
    </div>
  );
}