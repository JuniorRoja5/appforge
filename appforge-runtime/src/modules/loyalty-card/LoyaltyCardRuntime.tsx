import React, { useState, useEffect } from 'react';
import { Star, Coffee, Heart, Check, Gift, X } from 'lucide-react';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { getMyLoyaltyCard, redeemLoyalty, stampLoyalty } from '../../lib/api';
import { isAuthenticated, onAuthChange, getCurrentUser } from '../../lib/auth';
import { registerRuntimeModule } from '../registry';
import { useBackButton } from '../../lib/use-back-button';
import { ModuleHeader } from '../../components/ModuleHeader';
// Phase 3c — Outer/Inner wrapper. Inner byte-identical to 6e1290a.
import { LoyaltyCardConfigSchema } from '../../lib/shared/module-schemas/loyalty_card.schema';
import { validateConfig } from '../../lib/module-validation';
import { InvalidConfigPlaceholder } from '../../components/InvalidConfigPlaceholder';
import { isPreviewMode } from '../../lib/manifest';

const STAMP_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  star: Star, coffee: Coffee, heart: Heart, check: Check, gift: Gift,
};

const LoyaltyCardRuntimeInner: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
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
  const [cardError, setCardError] = useState('');

  const [showStampModal, setShowStampModal] = useState(false);
  const [pin, setPin] = useState('');
  const [stamping, setStamping] = useState(false);
  const [stampError, setStampError] = useState('');

  const StampIcon = STAMP_ICONS[stampIcon] ?? Star;

  useEffect(() => {
    return onAuthChange((u) => setAuthed(u !== null));
  }, []);

  const refreshCard = () => {
    getMyLoyaltyCard()
      .then((card) => {
        setCurrentStamps(card.stampsCollected);
        setCanRedeem(card.canRedeem);
        setCardError('');
      })
      .catch((err) => {
        // Surface the error in-place instead of throwing. The RuntimeErrorBoundary
        // would catch a throw and replace the whole card with its fallback — too
        // disruptive for a transient network failure. A small inline message
        // gives the user a Reintentar without losing the rest of the UI.
        // eslint-disable-next-line no-console
        console.warn('[loyalty] my-card failed:', err);
        setCardError(err?.message || 'No se pudieron cargar tus sellos.');
      });
  };

  useEffect(() => {
    if (!authed) {
      setCurrentStamps(0);
      setCanRedeem(false);
      return;
    }
    refreshCard();
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

  const openStampModal = () => {
    setPin('');
    setStampError('');
    setShowStampModal(true);
  };
  const closeStampModal = () => {
    setShowStampModal(false);
    setStampError('');
    setPin('');
  };

  // Hardware back button closes the PIN modal when it's open.
  useBackButton(closeStampModal, showStampModal);

  const submitStamp = async () => {
    const email = getCurrentUser()?.email;
    if (!email) {
      setStampError('Tu sesión ha caducado. Vuelve a iniciar sesión.');
      return;
    }
    if (pin.trim().length < 6) {
      setStampError('El PIN debe tener al menos 6 caracteres.');
      return;
    }
    setStamping(true);
    setStampError('');
    try {
      await stampLoyalty(email, pin.trim());
      // Backend response shape isn't relied on — refetch authoritative state.
      refreshCard();
      closeStampModal();
    } catch (err: any) {
      const msg = err?.message ?? 'No se pudo añadir el sello. Inténtalo de nuevo.';
      // The backend rate-limits via Redis; bcrypt comparison failure surfaces as 400.
      // Surface the server message verbatim when present — it's the most informative.
      setStampError(msg);
    }
    setStamping(false);
  };

  return (
    <div>
      <ModuleHeader title={title} icon={Star} />

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

      {/* Card fetch error — shown inline so the rest of the UI stays usable. */}
      {authed && cardError && (
        <p className="text-xs text-center mt-3" style={{ color: 'var(--color-feedback-error, #ef4444)' }}>
          {cardError}{' '}
          <button
            onClick={refreshCard}
            className="underline font-medium"
            style={{ color: 'var(--color-feedback-error, #ef4444)' }}
          >
            Reintentar
          </button>
        </p>
      )}

      {/* Stamp request button */}
      {authed && !canRedeem && (
        <button
          onClick={openStampModal}
          className="w-full mt-3 py-2.5 text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary, #fff)', borderRadius: 'var(--radius-button, 12px)' }}
        >
          Solicitar sello en el negocio
        </button>
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
      {authed && !rewardDescription && !canRedeem && (
        <p className="text-xs text-center mt-3 px-2" style={{ color: 'var(--color-text-secondary)' }}>
          Pulsa "Solicitar sello" y pide al comerciante que introduzca el PIN del negocio. Necesitas {totalStamps} sellos para obtener: {reward}.
        </p>
      )}

      {termsText && (
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-secondary)' }}>{termsText}</p>
      )}

      {/* Stamp request modal (bottom sheet) */}
      {showStampModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={closeStampModal}
        >
          <div
            className="w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'var(--color-surface-card, #fff)', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
          >
            <div className="flex items-start justify-between mb-3">
              <h4 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Sello en el negocio
              </h4>
              <button onClick={closeStampModal} aria-label="Cerrar" style={{ color: 'var(--color-text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Muestra esta pantalla al comerciante. Pídele que introduzca el PIN del negocio para añadir un sello a tu tarjeta.
            </p>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN del comerciante"
              autoFocus
              className="w-full p-3 text-lg text-center mb-3"
              style={{
                border: '1px solid var(--color-divider, #e5e7eb)',
                borderRadius: 'var(--radius-button, 12px)',
                color: 'var(--color-text-primary)',
                backgroundColor: 'var(--color-surface-page, #fff)',
              }}
            />
            {stampError && (
              <p className="text-xs mb-3" style={{ color: 'var(--color-feedback-error, #ef4444)' }}>{stampError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={closeStampModal}
                className="flex-1 py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--color-surface-variant, #f3f4f6)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius-button, 12px)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={submitStamp}
                disabled={stamping || pin.length < 6}
                className="flex-1 py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-text-on-primary, #fff)',
                  borderRadius: 'var(--radius-button, 12px)',
                }}
              >
                {stamping ? 'Validando…' : 'Validar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LoyaltyCardRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const cfg = validateConfig(LoyaltyCardConfigSchema, data, 'loyalty_card');
  if (!cfg.ok && isPreviewMode()) {
    return <InvalidConfigPlaceholder moduleId="loyalty_card" error={cfg.error!} />;
  }
  return <LoyaltyCardRuntimeInner data={data} />;
};

registerRuntimeModule({ id: 'loyalty_card', Component: LoyaltyCardRuntime });
