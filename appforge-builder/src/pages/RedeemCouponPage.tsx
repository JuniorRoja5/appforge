import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    getCouponMerchantPublicInfo,
    merchantRedeemCoupon,
    type CouponMerchantPublicInfo,
    type MerchantRedeemResult,
} from '../lib/api';
import { Loader2, CheckCircle, XCircle, Ticket, Tag } from 'lucide-react';

export const RedeemCouponPage: React.FC = () => {
    const { appId } = useParams<{ appId: string }>();
    const [info, setInfo] = useState<CouponMerchantPublicInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState('');
    const [pin, setPin] = useState('');
    const [email, setEmail] = useState('');
    const [validating, setValidating] = useState(false);
    const [result, setResult] = useState<
        | { type: 'success'; data: MerchantRedeemResult }
        | { type: 'error'; message: string }
        | null
    >(null);

    useEffect(() => {
        if (!appId) return;
        (async () => {
            try {
                const i = await getCouponMerchantPublicInfo(appId);
                setInfo(i);
            } catch {
                setInfo(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [appId]);

    const handleValidate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appId || !code || !pin) return;
        setValidating(true);
        setResult(null);
        try {
            const res = await merchantRedeemCoupon(appId, {
                code: code.trim(),
                pin,
                appUserEmail: email.trim() || undefined,
            });
            setResult({ type: 'success', data: res });
            setCode('');
            setEmail('');
            // El PIN no se borra para permitir múltiples canjes seguidos
        } catch (err: any) {
            setResult({ type: 'error', message: err.message || 'Error al validar' });
        } finally {
            setValidating(false);
        }
    };

    const formatDiscount = (
        type: 'PERCENTAGE' | 'FIXED_AMOUNT',
        value: string,
    ): string => {
        const v = parseFloat(value);
        return type === 'PERCENTAGE' ? `${v}% de descuento` : `${v.toFixed(2)} de descuento`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 size={32} className="animate-spin text-amber-500" />
            </div>
        );
    }

    if (!info) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center max-w-sm">
                    <XCircle size={48} className="mx-auto text-red-400 mb-3" />
                    <h1 className="text-lg font-bold text-gray-800">Página no disponible</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Este negocio no tiene un PIN de comerciante configurado para canjear cupones.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Ticket size={32} className="text-amber-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">Canjear cupón</h1>
                    <p className="text-sm text-gray-500 mt-1">{info.appName}</p>
                    {info.activeCoupons > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                            {info.activeCoupons} cupón{info.activeCoupons !== 1 ? 'es' : ''} activo{info.activeCoupons !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleValidate} className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Código del cupón
                        </label>
                        <input
                            type="text"
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="AFF-XXXXX"
                            autoCapitalize="characters"
                            autoComplete="off"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            PIN del negocio
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="Ingresa tu PIN"
                            autoComplete="off"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email del cliente <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="cliente@ejemplo.com"
                            autoComplete="off"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            Si se proporciona, se evita que el mismo cliente canjee el cupón dos veces (cuando el cupón tiene límite).
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={validating || !code || !pin}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                    >
                        {validating ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Validando...
                            </>
                        ) : (
                            <>
                                <Tag size={18} />
                                Validar y canjear
                            </>
                        )}
                    </button>

                    {/* Result feedback */}
                    {result && result.type === 'success' && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                            <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-green-800">
                                    {result.data.coupon.title}
                                </p>
                                <p className="text-sm text-green-700 mt-0.5">
                                    {formatDiscount(result.data.coupon.discountType, result.data.coupon.discountValue)}
                                </p>
                                <p className="text-xs text-green-600 mt-2">
                                    Canje #{result.data.coupon.currentUses}
                                    {result.data.coupon.maxUses ? ` de ${result.data.coupon.maxUses}` : ''}
                                </p>
                            </div>
                        </div>
                    )}

                    {result && result.type === 'error' && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                            <XCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium text-red-800">{result.message}</p>
                        </div>
                    )}
                </form>

                <p className="text-center text-[10px] text-gray-400 mt-4">
                    Página de canje para uso exclusivo del negocio
                </p>
            </div>
        </div>
    );
};