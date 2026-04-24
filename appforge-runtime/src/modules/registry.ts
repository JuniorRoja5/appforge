import React from 'react';

export interface RuntimeModuleDefinition {
  id: string;
  Component: React.FC<{ data: Record<string, unknown>; apiUrl: string; appId: string }>;
}

const modules = new Map<string, RuntimeModuleDefinition>();

export function registerRuntimeModule(mod: RuntimeModuleDefinition): void {
  modules.set(mod.id, mod);
}

export function getModule(id: string): RuntimeModuleDefinition | undefined {
  return modules.get(id);
}
