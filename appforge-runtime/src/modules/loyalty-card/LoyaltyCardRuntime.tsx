import React, { useState, useEffect } from 'react';
import { Star, Coffee, Heart, Check, Gift } from 'lucide-react';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { getMyLoyaltyCard, redeemLoyalty } from '../../lib/api';
import { isAuthenticated, onAuthChange } from '../../lib/auth';
import { registerRuntimeModule } from '../registry';

const STAMP_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  star: Star, coffee: Coffee, heart: Heart, check: Check, gift: Gift,
};

const LoyaltyCardRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const title = (data.title as string) ?? 'Tarjeta de Lealtad';
  const description = (data.description as string) ?? '';
  const totalStamps = (data.totalStamps as number) ?? 10;
  const reward = (data.reward as string) ?? 'Recompensa';
  const rewardDescription = (data.rewardDescription as string) ?? '';
  const cardColor = (data.cardColor as string) ?? 'var(--color-primary, #4F46E5)';
  const stampIcon = (data.stampIcon as string) ?? 'star';
  const logoUrl = (data.logoUrl as string) ?? '';
  const termsText = (data.termsText as string) ?? '';

  const [authed, setAuthed] = useState(isAuthenticated());
  const [currentStamps, setCurrentStamps] = useState(0);
  const [canRedeem, setCanRedeem] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState('');

  const StampIcon = STAMP_ICONS[stampIcon] ?? Star;

  useEffect(() => {
    return onAuthChange((u) => setAuthed(u !== null));
  }, []);

  useEffect(() => {
    if (!authed) {
      setCurrentStamps(0);
      setCanRedeem(false);
      return;
    }
    getMyLoyaltyCard()
      .then((card) => {
        setCurrentStamps(card.currentStamps);
        setCanRedeem(card.canRedeem);
      })
      .catch(() => {});
  }, [authed]);

  const handleRedeem = async () => {
    setRedeeming(true);
    try {
      const result = await redeemLoyalty();
      setRedeemMsg(result.message);
      setCurrentStamps(0);
      setCanRedeem(false);
    } catch {
      setRedeemMsg('Error al canjear. Inténtalo de nuevo.');
    }
    setRedeeming(false);
    setTimeout(() => setRedeemMsg(''), 4000);
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>

      {/* Card */}
      <div className="relative overflow-hidden p-5" style={{ borderRadius: 'var(--radius-card, 16px)', backgroundColor: cardColor }}>
        {logoUrl && (
          <img src={resolveAssetUrl(logoUrl)} alt="" className="w-10 h-10 object-contain rounded-lg mb-3 p-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        )}

        <p className="text-white/80 text-sm mb-4">{description || `Acumula ${totalStamps} sellos y obtén: ${reward}`}</p>

        {/* Stamps grid */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(totalStamps, 5)}, 1fr)` }}>
          {Array.from({ length: totalStamps }, (_, i) => {
            const isFilled = i < currentStamps;
            return (
              <div
                key={i}
                className="flex items-center justify-center aspect-square rounded-xl"
                style={{
                  backgroundColor: isFilled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                  border: '2px dashed rgba(255,255,255,0.3)',
                }}
              >
                {isFilled && <StampIcon size={20} className="text-white" />}
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-white/70 text-xs">{currentStamps}/{totalStamps} sellos</span>
          <span className="text-white text-xs font-semibold">{reward}</span>
        </div>
      </div>

      {/* Not authenticated message */}
      {!authed && (
        <p className="text-xs text-center mt-3" style={{ color: 'var(--color-text-secondary)' }}>
          Inicia sesión para acumular sellos.
        </p>
      )}

      {/* Redeem button */}
      {authed && canRedeem && (
        <button
          onClick={handleRedeem}
          disabled={redeeming}
          className="w-full mt-3 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-feedback-success, #22c55e)', color: '#fff', borderRadius: 'var(--radius-button)' }}
        >
          {redeeming ? 'Canjeando...' : 'Canjear recompensa'}
        </button>
      )}

      {/* Redeem feedback */}
      {redeemMsg && (
        <p className="text-xs text-center mt-2 font-medium" style={{ color: 'var(--color-feedback-success, #22c55e)' }}>
          {redeemMsg}
        </p>
      )}

      {/* Reward description */}
      {rewardDescription && (
        <p className="text-xs text-center mt-3 px-2" style={{ color: 'var(--color-text-primary)' }}>
          {rewardDescription}
        </p>
      )}

      {/* Explanation text */}
      {authed && !rewardDescription && (
        <p className="text-xs text-center mt-3 px-2" style={{ color: 'var(--color-text-secondary)' }}>
          Muestra esta pantalla en el negocio para que sellen tu progreso. Necesitas {totalStamps} sellos para obtener: {reward}.
        </p>
      )}

      {termsText && (
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-secondary)' }}>{termsText}</p>
      )}
    </div>
  );
};

registerRuntimeModule({ id: 'loyalty_card', Component: LoyaltyCardRuntime });
