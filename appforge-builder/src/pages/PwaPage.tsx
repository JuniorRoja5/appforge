import React from 'react';
import { PwaContent } from '../features/pwa/PwaContent';

export const PwaPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">PWA</h1>
        <p className="text-sm text-gray-500 mt-0.5">URL pública, código QR y herramientas para compartir.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200/60 p-6">
        <PwaContent />
      </div>
    </div>
  );
};
