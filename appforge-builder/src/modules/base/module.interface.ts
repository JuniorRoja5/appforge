import React from 'react';
import { z } from 'zod';

export interface ModuleDefinition<T = any> {
  id: string; // e.g. 'loyalty_card'
  name: string; // e.g. 'Tarjeta de Lealtad'
  icon: React.ReactNode; // e.g. <CreditCard />
  description: string;
  schema: z.ZodType<T>; // for validation
  defaultConfig: T;
  PreviewComponent: React.FC<{ data: T; isSelected: boolean }>; // Canvas rendering
  RuntimeComponent: React.FC<{ data: T }>; // Actual output app rendering
  SettingsPanel: React.FC<{ data: T; onChange: (data: T) => void }>; // Right sidebar form
}
