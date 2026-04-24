import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export const PaymentCancelPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md mx-auto space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Pago cancelado
        </h1>
        <p className="text-sm text-gray-500">
          El proceso de pago ha sido cancelado. No se ha realizado ningún cargo. Puedes intentarlo de nuevo cuando quieras.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/pricing"
            className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Ver planes
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-6 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
