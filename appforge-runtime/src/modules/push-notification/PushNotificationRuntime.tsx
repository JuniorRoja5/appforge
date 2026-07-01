import React from 'react';
import { registerRuntimeModule } from '../registry';
// Phase 3c — Outer/Inner wrapper. Inner byte-identical to 6e1290a.
// This module is a minimal placeholder — real push flow runs at the
// system level via FCM topics (Plano 1). Outer gate still valuable
// as diagnostic red for future schema drift.
import { PushNotificationConfigSchema } from '../../lib/shared/module-schemas/push_notification.schema';
import { validateConfig } from '../../lib/module-validation';
import { InvalidConfigPlaceholder } from '../../components/InvalidConfigPlaceholder';
import { isPreviewMode } from '../../lib/manifest';

const PushNotificationRuntimeInner: React.FC<{
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

const PushNotificationRuntime: React.FC<{
  data: Record<string, unknown>;
  apiUrl: string;
  appId: string;
}> = (props) => {
  const cfg = validateConfig(PushNotificationConfigSchema, props.data, 'push_notification');
  if (!cfg.ok && isPreviewMode()) {
    return <InvalidConfigPlaceholder moduleId="push_notification" error={cfg.error!} />;
  }
  return <PushNotificationRuntimeInner {...props} />;
};

registerRuntimeModule({
  id: 'push_notification',
  Component: PushNotificationRuntime,
});
