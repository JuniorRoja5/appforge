import React from 'react';
import { registerRuntimeModule } from '../registry';

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
