import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getLoyaltyConfig, stampLoyalty } from '../lib/api';
import { Loader2, CheckCircle, XCircle, Stamp } from 'lucide-react';

export const StampPage: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const [config, setConfig] = useState<{
    totalStamps: number;
    reward: string;
    rewardDescription?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [stamping, setStamping] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    message: string;
    stampsCollected?: number;
    totalStamps?: number;
    canRedeem?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!appId) return;
    (async () => {
      try {
        const c = await getLoyaltyConfig(appId);
        setConfig(c);
      } catch {
        setConfig(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [appId]);

  const handleStamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId || !email || !pin) return;
    setStamping(true);
    setResult(null);
    try {
      const res = await stampLoyalty(appId, { appUserEmail: email, pin });
      setResult({
        type: 'success',
        message: res.canRedeem
          ? `Tarjeta completa (${res.stampsCollected}/${res.totalStamps}). El cliente puede canjear su recompensa.`
          : `Sello registrado (${res.stampsCollected}/${res.totalStamps})`,
        stampsCollected: res.stampsCollected,
        totalStamps: res.totalStamps,
        canRedeem: res.canRedeem,
      });
      setEmail('');
    } catch (err: any) {
      setResult({
        type: 'error',
        message: err.message || 'Error al sellar',
      });
    } finally {
      setStamping(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <XCircle size={48} className="mx-auto text-red-400 mb-3" />
          <h1 className="text-lg font-bold text-gray-800">Tarjeta no configurada</h1>
          <p className="text-sm text-gray-500 mt-1">Esta app no tiene una tarjeta de lealtad configurada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Stamp size={32} className="text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Sellar tarjeta</h1>
          <p className="text-sm text-gray-500 mt-1">Recompensa: {config.reward}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleStamp} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email del cliente</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="cliente@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN del negocio</label>
            <input
              type="password"
              required
              minLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Ingresa tu PIN"
            />
          </div>

          <button
            type="submit"
            disabled={stamping || !email || !pin}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {stamping ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Sellando...
              </>
            ) : (
              <>
                <Stamp size={18} />
                Sellar
              </>
            )}
          </button>

          {/* Result feedback */}
          {result && (
            <div
              className={`flex items-start gap-3 p-4 rounded-xl ${
                result.type === 'success'
                  ? result.canRedeem
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {result.type === 'success' ? (
                <CheckCircle size={20} className={result.canRedeem ? 'text-amber-500 mt-0.5' : 'text-green-500 mt-0.5'} />
              ) : (
                <XCircle size={20} className="text-red-500 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  result.type === 'success'
                    ? result.canRedeem ? 'text-amber-800' : 'text-green-800'
                    : 'text-red-800'
                }`}>
                  {result.message}
                </p>
                {result.type === 'success' && result.stampsCollected != null && (
                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: result.totalStamps! }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                          i < result.stampsCollected!
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </form>

        <p className="text-center text-[10px] text-gray-400 mt-4">
          Página de sellado para uso exclusivo del negocio
        </p>
      </div>
    </div>
  );
};
