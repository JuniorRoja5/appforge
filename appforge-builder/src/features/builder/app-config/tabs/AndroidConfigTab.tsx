import React, { useMemo } from 'react';
import { useAppConfigStore } from '../../../../store/useAppConfigStore';
import { useBuilderStore } from '../../../../store/useBuilderStore';
import { Wand2 } from 'lucide-react';

/** Maps moduleId → Android permissions that module requires */
const MODULE_PERMISSION_MAP: Record<string, string[]> = {
  photo_gallery: ['CAMERA', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO'],
  social_wall: ['CAMERA', 'READ_MEDIA_IMAGES'],
  fan_wall: ['CAMERA', 'READ_MEDIA_IMAGES'],
  contact: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
  booking: ['VIBRATE'],
  events: ['WRITE_CALENDAR', 'READ_CALENDAR'],
  push_notification: ['POST_NOTIFICATIONS', 'VIBRATE', 'RECEIVE_BOOT_COMPLETED'],
  loyalty_card: ['CAMERA'], // QR scanning
  catalog: ['VIBRATE'], // order notifications
  discount_coupon: ['CAMERA'], // QR scanning
  user_profile: ['USE_BIOMETRIC'],
};

// Common Android permissions with descriptions
const ANDROID_PERMISSIONS = [
  { key: 'INTERNET', label: 'Internet', description: 'Acceso a la red (siempre requerido)', alwaysOn: true },
  { key: 'ACCESS_NETWORK_STATE', label: 'Estado de red', description: 'Verificar conectividad', alwaysOn: true },
  { key: 'CAMERA', label: 'Cámara', description: 'Tomar fotos y grabar video' },
  { key: 'RECORD_AUDIO', label: 'Micrófono', description: 'Grabar audio y mensajes de voz' },
  { key: 'ACCESS_FINE_LOCATION', label: 'Ubicación precisa (GPS)', description: 'Para funciones basadas en ubicación' },
  { key: 'ACCESS_COARSE_LOCATION', label: 'Ubicación aproximada', description: 'Ubicación basada en red' },
  { key: 'VIBRATE', label: 'Vibración', description: 'Para notificaciones con vibración' },
  { key: 'RECEIVE_BOOT_COMPLETED', label: 'Arranque del sistema', description: 'Iniciar servicios al encender el dispositivo' },
  { key: 'READ_MEDIA_IMAGES', label: 'Leer imágenes', description: 'Acceder a imágenes del dispositivo (Android 13+)' },
  { key: 'READ_MEDIA_VIDEO', label: 'Leer videos', description: 'Acceder a videos del dispositivo (Android 13+)' },
  { key: 'POST_NOTIFICATIONS', label: 'Notificaciones', description: 'Enviar notificaciones push (Android 13+)' },
  { key: 'USE_BIOMETRIC', label: 'Biometría', description: 'Autenticación con huella/cara' },
  { key: 'READ_CONTACTS', label: 'Leer contactos', description: 'Para funciones de invitación y compartir' },
  { key: 'WRITE_CALENDAR', label: 'Escribir calendario', description: 'Agregar eventos al calendario del usuario' },
  { key: 'READ_CALENDAR', label: 'Leer calendario', description: 'Ver eventos del calendario' },
];

const PACKAGE_NAME_REGEX = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,6}$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

/** Analyzes canvas modules and suggests permissions */
const AutoDetectPermissionsButton: React.FC<{
  currentPermissions: Record<string, boolean>;
  onApply: (perms: Record<string, boolean>) => void;
}> = ({ currentPermissions, onApply }) => {
  const elements = useBuilderStore((s) => s.elements);

  const handleAutoDetect = () => {
    const moduleIds = new Set(elements.map((el) => el.moduleId));
    const needed = new Set<string>();

    // Always-on permissions
    needed.add('INTERNET');
    needed.add('ACCESS_NETWORK_STATE');

    // Add permissions based on configured modules
    for (const moduleId of moduleIds) {
      const perms = MODULE_PERMISSION_MAP[moduleId];
      if (perms) perms.forEach((p) => needed.add(p));
    }

    // Merge: keep existing enabled permissions + add detected ones
    const merged: Record<string, boolean> = { ...currentPermissions };
    for (const key of needed) {
      merged[key] = true;
    }

    onApply(merged);
  };

  const moduleIds = new Set(elements.map((el) => el.moduleId));
  const detectedCount = new Set(
    [...moduleIds].flatMap((id) => MODULE_PERMISSION_MAP[id] || [])
  ).size;

  return (
    <button
      onClick={handleAutoDetect}
      className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-[12px] font-semibold rounded-lg shadow-sm transition-all"
    >
      <Wand2 size={14} />
      Auto-detectar permisos según módulos ({detectedCount} detectados)
    </button>
  );
};

export const AndroidConfigTab: React.FC = () => {
  const config = useAppConfigStore((s) => s.config);
  const updateSection = useAppConfigStore((s) => s.updateSection);

  const androidConfig = config?.androidConfig ?? {
    packageName: '',
    versionName: '1.0.0',
    versionCode: 1,
  };

  const androidPermissions: Record<string, boolean> = config?.androidPermissions ?? {
    INTERNET: true,
    ACCESS_NETWORK_STATE: true,
  };

  const updateAndroidConfig = (patch: Partial<typeof androidConfig>) => {
    updateSection('androidConfig', { ...androidConfig, ...patch });
  };

  const togglePermission = (key: string) => {
    const perm = ANDROID_PERMISSIONS.find((p) => p.key === key);
    if (perm?.alwaysOn) return;
    updateSection('androidPermissions', {
      ...androidPermissions,
      [key]: !androidPermissions[key],
    });
  };

  const packageNameValid = useMemo(
    () => !androidConfig.packageName || PACKAGE_NAME_REGEX.test(androidConfig.packageName),
    [androidConfig.packageName],
  );

  const versionNameValid = useMemo(
    () => !androidConfig.versionName || SEMVER_REGEX.test(androidConfig.versionName),
    [androidConfig.versionName],
  );

  const enabledCount = ANDROID_PERMISSIONS.filter((p) => androidPermissions[p.key]).length;

  return (
    <div className="space-y-8">
      {/* ─── App Identity ─── */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Identidad de la App Android</h4>
        <p className="text-[12px] text-gray-500 mb-4">
          Configuración necesaria para generar el APK/AAB. El nombre de paquete es permanente una vez publicado.
        </p>

        <div className="space-y-4">
          {/* Package Name */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-1">
              Nombre de paquete (Package Name)
            </label>
            <input
              type="text"
              value={androidConfig.packageName}
              onChange={(e) => updateAndroidConfig({ packageName: e.target.value.toLowerCase() })}
              placeholder="com.empresa.miapp"
              className={`w-full border rounded-lg px-3 py-2.5 text-[13px] font-mono focus:outline-none focus:ring-2 transition-colors ${
                packageNameValid
                  ? 'border-gray-300 focus:ring-indigo-200 focus:border-indigo-400'
                  : 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50'
              }`}
            />
            {!packageNameValid && (
              <p className="text-[11px] text-red-600 mt-1">
                Formato inválido. Usa notación de dominio inverso: com.empresa.app (solo minúsculas, números y guiones bajos)
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-1">
              Ejemplo: com.miempresa.miapp — Identifica tu app de forma única en Google Play.
            </p>
          </div>

          {/* Version fields side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">
                Versión (versionName)
              </label>
              <input
                type="text"
                value={androidConfig.versionName}
                onChange={(e) => updateAndroidConfig({ versionName: e.target.value })}
                placeholder="1.0.0"
                className={`w-full border rounded-lg px-3 py-2.5 text-[13px] font-mono focus:outline-none focus:ring-2 transition-colors ${
                  versionNameValid
                    ? 'border-gray-300 focus:ring-indigo-200 focus:border-indigo-400'
                    : 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50'
                }`}
              />
              {!versionNameValid && (
                <p className="text-[11px] text-red-600 mt-1">Formato: X.Y.Z (ej: 1.0.0)</p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">Visible para el usuario en Google Play</p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">
                Código de versión (versionCode)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={androidConfig.versionCode}
                  onChange={(e) => updateAndroidConfig({ versionCode: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Número interno. Se auto-incrementa en builds release/AAB exitosos.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Android Permissions ─── */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Permisos Android</h4>
        <p className="text-[12px] text-gray-500 mb-3">
          Selecciona los permisos que necesita tu app. Solo se incluirán los permisos marcados en el AndroidManifest.xml.
        </p>

        {/* Auto-detect button */}
        <AutoDetectPermissionsButton
          currentPermissions={androidPermissions}
          onApply={(perms) => updateSection('androidPermissions', perms)}
        />

        {/* Progress */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${(enabledCount / ANDROID_PERMISSIONS.length) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-500 shrink-0">
            {enabledCount}/{ANDROID_PERMISSIONS.length} activados
          </span>
        </div>

        <div className="space-y-1.5">
          {ANDROID_PERMISSIONS.map((perm) => {
            const enabled = perm.alwaysOn || !!androidPermissions[perm.key];
            return (
              <label
                key={perm.key}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                  enabled
                    ? 'bg-indigo-50/50 border-indigo-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                } ${perm.alwaysOn ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => togglePermission(perm.key)}
                  disabled={perm.alwaysOn}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-gray-800">{perm.label}</span>
                    {perm.alwaysOn && (
                      <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                        Requerido
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500">{perm.description}</span>
                </div>
                <span className="text-[9px] text-gray-400 font-mono shrink-0">{perm.key}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ─── Info box ─── */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-[12px] text-blue-800">
          <strong>Nota:</strong> El nombre de paquete no puede cambiar una vez que publiques tu app en Google Play.
          Elige uno que represente tu marca. Los permisos se pueden ajustar en futuras versiones.
        </p>
      </div>
    </div>
  );
};
