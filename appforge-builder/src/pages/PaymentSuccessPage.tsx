import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { getSubscription } from '../lib/api';

export const PaymentSuccessPage: React.FC = () => {
  const token = useAuthStore((s) => s.token)!;
  const [planName, setPlanName] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [webhookPending, setWebhookPending] = useState(false);

  useEffect(() => {
    // Poll subscription status — webhook may take a few seconds to arrive
    let attempts = 0;
    const maxAttempts = 10;

    const checkSubscription = async () => {
      try {
        const data = await getSubscription(token);
        const plan = data.subscription.plan;
        // If plan is not FREE, the webhook has been processed
        if (plan.planType !== 'FREE') {
          setPlanName(plan.name);
          setChecking(false);
          return;
        }
        // Still FREE — webhook hasn't arrived yet
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkSubscription, 2000);
        } else {
          setWebhookPending(true);
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    };

    checkSubscription();
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md mx-auto space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Pago completado
        </h1>

        {checking ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Activando tu plan...</span>
          </div>
        ) : webhookPending ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-yellow-700 bg-yellow-50 px-4 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>Tu pago se ha procesado. La activación del plan puede tardar unos momentos.</span>
            </div>
            <p className="text-xs text-gray-400">
              Si tu plan no se actualiza en unos minutos, contacta a soporte.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Tu suscripción al plan <strong>{planName}</strong> se ha activado correctamente.
          </p>
        )}

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Ir al dashboard
          </Link>
          <Link
            to="/account"
            className="inline-flex items-center px-6 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors"
          >
            Ver mi cuenta
          </Link>
        </div>
      </div>
    </div>
  );
};
