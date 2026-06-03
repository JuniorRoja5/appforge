import React from 'react';
import { BillingContent } from '../features/billing/BillingContent';

export const BillingPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Facturación</h1>
        <p className="text-sm text-gray-500 mt-0.5">Plan actual, consumo del mes y descarga de facturas.</p>
      </div>
      <BillingContent />
    </div>
  );
};
