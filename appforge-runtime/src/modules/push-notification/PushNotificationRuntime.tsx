import React from 'react';
import { registerRuntimeModule } from '../registry';
// Phase 3b (B3) — no inline sub-interfaces to dedupe here. Schema
// lives in appforge-shared/src/module-schemas/push_notification.schema.ts
// and will be imported in Phase 3c when safeParse + fallback UX
// arrives. This component is a minimal placeholder — the real push
// flow runs at the system level via FCM topics (Plano 1).

const PushNotificationRuntime: React.FC<{
  data: Record<string, unknown>;
  apiUrl: string;
  appId: string;
}> = () => {
  // Push notifications work at the system level via FCM topics.
  // This component is a minimal placeholder for the module registry.
  return (
    <div className="p-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
      <p className="text-sm">Notificaciones push activadas</p>
      <p className="text-xs mt-1" style={{ opacity: 0.6 }}>
        Recibirás notificaciones de esta app
      </p>
    </div>
  );
};

registerRuntimeModule({
  id: 'push_notification',
  Component: PushNotificationRuntime,
});
