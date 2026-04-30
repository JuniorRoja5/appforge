import React, { useState, useEffect, useCallback } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  Bell, Send, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Clock, Smartphone,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  getPushNotifications,
  sendPushNotification,
  getPushDeviceCount,
  type PushNotificationItem,
} from '../../lib/api';
import { ImageInputField } from '../../components/shared/ImageInputField';

// --- Zod schema ---
const PushNotificationConfigSchema = z.object({
  enabled: z.boolean(),
  autoRequestPermission: z.boolean(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type PushNotificationConfig = z.infer<typeof PushNotificationConfigSchema>;

// --- Preview Component ---
const MOCK_NOTIFICATIONS = [
  { title: 'Oferta especial', body: '¡20% de descuento solo por hoy!', time: 'Hace 2h' },
  { title: 'Nuevo contenido', body: 'Descubre las novedades de esta semana', time: 'Hace 1d' },
  { title: 'Recordatorio', body: 'No te pierdas nuestro evento este viernes', time: 'Hace 3d' },
];

const PreviewComponent: React.FC<{ data: PushNotificationConfig; isSelected: boolean }> = ({
  data,
  isSelected,
}) => {
  const token = useAuthStore((s) => s.token);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const [count, list] = await Promise.all([
          getPushDeviceCount(data.appId!, token),
          getPushNotifications(data.appId!, token),
        ]);
        if (!cancelled) {
          setDeviceCount(count);
          setNotifications(list.slice(0, 3));
        }
      } catch {
        // fallback to mock
      }
    })();
    return () => { cancelled = true; };
  }, [data.appId, data._refreshKey, token]);

  const hasRealData = notifications.length > 0;
  const displayItems = hasRealData
    ? notifications.map((n) => ({
        title: n.title,
        body: n.body,
        time: n.sentAt
          ? new Date(n.sentAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
          : 'Borrador',
        status: n.status,
      }))
    : MOCK_NOTIFICATIONS.map((m) => ({ ...m, status: 'SENT' as const }));

  return (
    <div className={`h-full flex flex-col ${isSelected ? 'ring-2 ring-indigo-400 ring-inset rounded-lg' : ''}`}>
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-2" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #6366f1), var(--af-color-secondary, #9333ea))' }}>
        <Bell size={16} className="text-white" />
        <span className="text-white text-xs font-semibold">Notificaciones Push</span>
        {deviceCount !== null && (
          <span className="ml-auto flex items-center gap-1 text-white/80 text-[10px]">
            <Smartphone size={10} />
            {deviceCount}
          </span>
        )}
      </div>

      {/* Notification list */}
      <div className="flex-1 divide-y divide-gray-100">
        {displayItems.map((item, i) => (
          <div key={i} className="px-3 py-2 flex items-start gap-2">
            <div className="shrink-0 mt-0.5">
              {item.status === 'SENT' ? (
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--af-color-primary, #6366f1) 15%, white)' }}>
                  <Bell size={12} style={{ color: 'var(--af-color-primary, #6366f1)' }} />
                </div>
              ) : item.status === 'FAILED' ? (
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle size={12} className="text-red-600" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Clock size={12} className="text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-800 truncate">{item.title}</p>
              <p className="text-[10px] text-gray-500 truncate">{item.body}</p>
            </div>
            <span className="text-[9px] text-gray-400 shrink-0">{item.time}</span>
          </div>
        ))}
      </div>

      {!hasRealData && (
        <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-100">
          <p className="text-[9px] text-amber-600 text-center">
            Vista previa — guarda la app para enviar notificaciones reales
          </p>
        </div>
      )}
    </div>
  );
};

// --- Runtime Component (placeholder — real logic is in Capacitor runtime) ---
const RuntimeComponent: React.FC<{ data: PushNotificationConfig }> = () => (
  <div className="p-4 text-center text-gray-400 text-sm">
    <Bell size={24} className="mx-auto mb-2 text-gray-300" />
    Notificaciones push activadas
  </div>
);

// --- Settings Panel ---
const SettingsPanel: React.FC<{
  data: PushNotificationConfig;
  onChange: (data: PushNotificationConfig) => void;
}> = ({ data, onChange }) => {
  const token = useAuthStore((s) => s.token);
  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(true);

  // Send form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!data.appId || !token) return;
    try {
      setLoading(true);
      const [list, count] = await Promise.all([
        getPushNotifications(data.appId, token),
        getPushDeviceCount(data.appId, token),
      ]);
      setNotifications(list);
      setDeviceCount(count);
    } catch (err) {
      console.error('Error loading push data:', err);
    } finally {
      setLoading(false);
    }
  }, [data.appId, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshPreview = () => {
    onChange({ ...data, _refreshKey: (data._refreshKey ?? 0) + 1 });
  };

  const handleSend = async () => {
    if (!data.appId || !token || !title.trim() || !body.trim()) return;
    setSending(true);
    setSendMsg(null);
    try {
      await sendPushNotification(
        data.appId,
        { title: title.trim(), body: body.trim(), imageUrl: imageUrl || undefined },
        token,
      );
      setSendMsg({ type: 'success', text: 'Notificación enviada correctamente' });
      setTitle('');
      setBody('');
      setImageUrl('');
      await loadData();
      refreshPreview();
    } catch (err: any) {
      setSendMsg({
        type: 'error',
        text: err.message || 'Error al enviar notificación',
      });
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
            <CheckCircle size={10} /> Enviada
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">
            <XCircle size={10} /> Fallida
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">
            <Clock size={10} /> Borrador
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Config section */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-700">Configuración</span>
          {configOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>

        {configOpen && (
          <div className="p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.enabled}
                onChange={(e) => onChange({ ...data, enabled: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-700">Habilitado</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.autoRequestPermission}
                onChange={(e) => onChange({ ...data, autoRequestPermission: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-700">Solicitar permiso al abrir la app</span>
            </label>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
              <p className="text-[10px] text-blue-700 leading-relaxed">
                Las notificaciones push se configuran automáticamente. Los dispositivos
                se suscriben al topic de tu app sin configuración adicional.
              </p>
            </div>

            {deviceCount !== null && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Smartphone size={14} className="text-gray-400" />
                <span><strong>{deviceCount}</strong> dispositivo{deviceCount !== 1 ? 's' : ''} registrado{deviceCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content management section */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setContentOpen(!contentOpen)}
          className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-700">Enviar Notificaciones</span>
          {contentOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>

        {contentOpen && (
          <div className="p-3 space-y-3">
            {!data.appId ? (
              <div className="text-center py-4">
                <Bell size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs text-gray-400">Guarda la app primero para enviar notificaciones</p>
              </div>
            ) : (
              <>
                {/* Send form */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Título</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Título de la notificación"
                      maxLength={100}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Mensaje</label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Cuerpo de la notificación"
                      maxLength={500}
                      rows={3}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    />
                  </div>

                  {/* Image upload */}
                  <ImageInputField
                    value={imageUrl}
                    onChange={setImageUrl}
                    accentColor="indigo"
                    shape="square"
                    previewSize="md"
                    label="Imagen (opcional)"
                    urlPlaceholder="URL de imagen (opcional)"
                    maxSizeMB={10}
                    onError={(msg) => setSendMsg({ type: 'error', text: msg })}
                  />

                  {sendMsg && (
                    <div
                      className={`text-[10px] px-2 py-1.5 rounded-lg ${
                        sendMsg.type === 'success'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {sendMsg.text}
                    </div>
                  )}

                  <button
                    onClick={handleSend}
                    disabled={sending || !title.trim() || !body.trim()}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {sending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    {sending ? 'Enviando...' : 'Enviar notificación'}
                  </button>
                </div>

                {/* History */}
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Historial</p>

                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={16} className="animate-spin text-gray-300" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="text-[10px] text-gray-400 text-center py-3">
                      Aún no has enviado notificaciones
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-2 bg-gray-50 rounded-lg border border-gray-100"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-[11px] font-semibold text-gray-800 truncate flex-1">
                              {n.title}
                            </p>
                            {statusBadge(n.status)}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-400">
                            {n.sentAt && (
                              <span>
                                {new Date(n.sentAt).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                            {n.status === 'SENT' && (
                              <span className="text-emerald-600">
                                {n.successCount} enviada{n.successCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {n.status === 'FAILED' && n.errorMessage && (
                              <span className="text-red-500 truncate">{n.errorMessage}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {notifications.length > 0 && (
                    <p className="text-[10px] text-gray-400 text-center mt-1.5">
                      {notifications.length} notificaci{notifications.length !== 1 ? 'ones' : 'ón'} en total
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Module Definition ---
export const PushNotificationModule: ModuleDefinition<PushNotificationConfig> = {
  id: 'push_notification',
  name: 'Push Notifications',
  description: 'Envía notificaciones push a los usuarios de tu app',
  icon: <Bell size={20} />,
  schema: PushNotificationConfigSchema,
  defaultConfig: {
    enabled: true,
    autoRequestPermission: true,
    appId: undefined,
    _refreshKey: 0,
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
