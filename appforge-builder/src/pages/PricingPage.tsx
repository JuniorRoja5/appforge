import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import {
  getSubscriptionPlans,
  getSubscription,
  createCheckoutSession,
  createPortalSession,
} from '../lib/api';
import type { SubscriptionPlan, SubscriptionInfo } from '../lib/api';
import { Check, X, Loader2 } from 'lucide-react';

const planOrder = ['FREE', 'STARTER', 'PRO', 'RESELLER_STARTER', 'RESELLER_PRO'];

function formatStorage(gb: number): string {
  return gb >= 1 ? `${gb} GB` : `${Math.round(gb * 1024)} MB`;
}

export const PricingPage: React.FC = () => {
  const token = useAuthStore((s) => s.token)!;
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getSubscriptionPlans(token),
      getSubscription(token).catch(() => null),
    ])
      .then(([p, s]) => {
        const sorted = [...p].sort(
          (a, b) => planOrder.indexOf(a.planType) - planOrder.indexOf(b.planType),
        );
        setPlans(sorted);
        setSubscription(s);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleCheckout = async (planType: string) => {
    setCheckingOut(planType);
    setError('');
    try {
      const { url } = await createCheckoutSession(planType, token);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar el checkout.');
      setCheckingOut(null);
    }
  };

  const handlePortal = async () => {
    try {
      const { url } = await createPortalSession(token);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al abrir portal de facturación.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const currentPlanType = subscription?.subscription?.plan?.planType;
  const cancelAtPeriodEnd = subscription?.subscription?.cancelAtPeriodEnd;
  const periodEnd = subscription?.subscription?.stripeCurrentPeriodEnd;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Planes y Precios
        </h1>
        <p className="text-[15px] text-gray-500 mt-2">
          Elige el plan que mejor se adapte a tu negocio
        </p>
      </div>

      {error && (
        <div className="max-w-lg mx-auto p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">
          {error}
        </div>
      )}

      {/* Cancel notice */}
      {cancelAtPeriodEnd && periodEnd && (
        <div className="max-w-lg mx-auto p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 text-center">
          Tu plan se cancelará el {new Date(periodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.
          Puedes reactivar desde el portal de facturación.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {plans.map((plan) => {
          const isCurrent = plan.planType === currentPlanType;
          const isPopular = plan.planType === 'PRO';
          const isFree = plan.planType === 'FREE';
          const isCheckingOut = checkingOut === plan.planType;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col bg-white rounded-2xl border-2 p-6 transition-shadow hover:shadow-lg ${
                isCurrent
                  ? 'border-indigo-500 shadow-md'
                  : isPopular
                    ? 'border-indigo-300'
                    : 'border-gray-200'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">
                    Tu plan actual
                  </span>
                </div>
              )}
              {isPopular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-0.5 text-xs font-semibold text-white">
                    Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                <div className="mt-2">
                  {plan.priceMonthly === 0 ? (
                    <span className="text-3xl font-extrabold text-gray-900">Gratis</span>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-gray-900">
                        {'$'}{plan.priceMonthly}
                      </span>
                      <span className="text-sm text-gray-500">/mes</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                <FeatureItem
                  label={`${plan.maxApps} app${plan.maxApps > 1 ? 's' : ''}`}
                  included
                />
                <FeatureItem
                  label={
                    plan.canBuild
                      ? `${plan.maxBuildsPerMonth} builds/mes`
                      : 'Sin builds'
                  }
                  included={plan.canBuild}
                />
                <FeatureItem
                  label={`${formatStorage(plan.storageGb)} almacenamiento`}
                  included
                />
                <FeatureItem
                  label="White-label"
                  included={plan.isWhiteLabel}
                />
              </ul>

              {isCurrent ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
                  >
                    Plan actual
                  </button>
                  {!isFree && (
                    <button
                      onClick={handlePortal}
                      className="w-full py-2 rounded-xl text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      Gestionar facturación
                    </button>
                  )}
                </div>
              ) : isFree ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Plan gratuito
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.planType)}
                  disabled={isCheckingOut || checkingOut !== null}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isPopular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isCheckingOut && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCheckingOut ? 'Redirigiendo...' : 'Suscribirse'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Usage section if subscribed */}
      {subscription && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-2xl mx-auto">
          <h3 className="text-[15px] font-bold text-gray-900 mb-4">Tu uso actual</h3>
          <div className="grid grid-cols-3 gap-6">
            <UsageStat
              label="Apps"
              current={subscription.usage.appsCount}
              max={subscription.subscription.plan.maxApps}
            />
            <UsageStat
              label="Builds/mes"
              current={subscription.usage.buildsThisMonth}
              max={subscription.subscription.plan.maxBuildsPerMonth}
            />
            <UsageStat
              label="Storage"
              current={formatBytes(subscription.usage.storageBytes)}
              max={`${formatStorage(subscription.subscription.plan.storageGb)}`}
              isText
            />
          </div>
        </div>
      )}
    </div>
  );
};

const FeatureItem: React.FC<{ label: string; included: boolean }> = ({ label, included }) => (
  <li className="flex items-center gap-2 text-sm">
    {included ? (
      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
    ) : (
      <X className="w-4 h-4 text-gray-300 shrink-0" />
    )}
    <span className={included ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
  </li>
);

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const UsageStat: React.FC<{
  label: string;
  current: number | string;
  max: number | string;
  isText?: boolean;
}> = ({ label, current, max, isText }) => {
  const pct = !isText ? Math.min(100, ((current as number) / (max as number)) * 100) : 0;

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">
        {current} <span className="text-gray-400 font-normal">/ {max}</span>
      </p>
      {!isText && (
        <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
};
