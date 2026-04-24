import React from 'react';
import { useAppConfigStore } from '../../../../store/useAppConfigStore';
import { useBuilderStore } from '../../../../store/useBuilderStore';
import { Wand2 } from 'lucide-react';

/** Maps moduleId → iOS permission keys that module requires */
const MODULE_IOS_PERMISSION_MAP: Record<string, string[]> = {
  photo_gallery: ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription', 'NSPhotoLibraryAddUsageDescription'],
  social_wall: ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription'],
  fan_wall: ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription'],
  contact: ['NSLocationWhenInUseUsageDescription'],
  events: ['NSCalendarsUsageDescription'],
  push_notification: [], // iOS handles push permissions at runtime, not in Info.plist
  loyalty_card: ['NSCameraUsageDescription'], // QR scanning
  discount_coupon: ['NSCameraUsageDescription'],
  user_profile: ['NSFaceIDUsageDescription'],
  booking: ['NSLocationWhenInUseUsageDescription'],
};

const IOS_PERMISSIONS = [
  {
    key: 'NSCameraUsageDescription',
    label: 'Cámara',
    defaultText: '#APP_NAME necesita acceder a tu cámara para tomar fotos y videos.',
  },
  {
    key: 'NSPhotoLibraryUsageDescription',
    label: 'Galería de fotos',
    defaultText: '#APP_NAME necesita acceder a tu galería para seleccionar imágenes.',
  },
  {
    key: 'NSPhotoLibraryAddUsageDescription',
    label: 'Guardar en galería',
    defaultText: '#APP_NAME necesita permiso para guardar imágenes en tu galería.',
  },
  {
    key: 'NSLocationWhenInUseUsageDescription',
    label: 'Ubicación (en uso)',
    defaultText: '#APP_NAME necesita tu ubicación para mostrarte contenido relevante cerca de ti.',
  },
  {
    key: 'NSLocationAlwaysAndWhenInUseUsageDescription',
    label: 'Ubicación (siempre)',
    defaultText: '#APP_NAME necesita acceder a tu ubicación en segundo plano para enviarte notificaciones basadas en tu proximidad.',
  },
  {
    key: 'NSMicrophoneUsageDescription',
    label: 'Micrófono',
    defaultText: '#APP_NAME necesita acceder a tu micrófono para grabar audio.',
  },
  {
    key: 'NSContactsUsageDescription',
    label: 'Contactos',
    defaultText: '#APP_NAME necesita acceder a tus contactos para facilitar el envío de invitaciones.',
  },
  {
    key: 'NSCalendarsUsageDescription',
    label: 'Calendarios',
    defaultText: '#APP_NAME necesita acceder a tu calendario para agregar eventos.',
  },
  {
    key: 'NSFaceIDUsageDescription',
    label: 'Face ID',
    defaultText: '#APP_NAME utiliza Face ID para autenticación segura.',
  },
  {
    key: 'NSBluetoothAlwaysUsageDescription',
    label: 'Bluetooth',
    defaultText: '#APP_NAME necesita acceder a Bluetooth para conectarse con dispositivos cercanos.',
  },
  {
    key: 'NSMotionUsageDescription',
    label: 'Sensores de movimiento',
    defaultText: '#APP_NAME necesita acceder a los sensores de movimiento para funcionalidades de actividad física.',
  },
];

/** Analyzes canvas modules and suggests iOS permissions with default texts */
const IosAutoDetectButton: React.FC<{
  permissions: Record<string, string>;
  onApply: (perms: Record<string, string>) => void;
}> = ({ permissions, onApply }) => {
  const elements = useBuilderStore((s) => s.elements);

  const handleAutoDetect = () => {
    const moduleIds = new Set(elements.map((el) => el.moduleId));
    const neededKeys = new Set<string>();

    for (const moduleId of moduleIds) {
      const keys = MODULE_IOS_PERMISSION_MAP[moduleId];
      if (keys) keys.forEach((k) => neededKeys.add(k));
    }

    // Fill default text for detected permissions that are currently empty
    const merged = { ...permissions };
    for (const key of neededKeys) {
      if (!merged[key]?.trim()) {
        const def = IOS_PERMISSIONS.find((p) => p.key === key);
        if (def) merged[key] = def.defaultText;
      }
    }

    onApply(merged);
  };

  const moduleIds = new Set(elements.map((el) => el.moduleId));
  const detectedCount = new Set(
    [...moduleIds].flatMap((id) => MODULE_IOS_PERMISSION_MAP[id] || [])
  ).size;

  return (
    <button
      onClick={handleAutoDetect}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-[12px] font-semibold rounded-lg shadow-sm transition-all"
    >
      <Wand2 size={14} />
      Auto-detectar permisos según módulos ({detectedCount} detectados)
    </button>
  );
};

export const IosPermissionsTab: React.FC = () => {
  const config = useAppConfigStore((s) => s.config);
  const updateSection = useAppConfigStore((s) => s.updateSection);

  const permissions: Record<string, string> = config?.iosPermissions ?? {};

  const updatePermission = (key: string, value: string) => {
    updateSection('iosPermissions', { ...permissions, [key]: value });
  };

  const resetToDefault = (key: string, defaultText: string) => {
    updatePermission(key, defaultText);
  };

  const fillAllDefaults = () => {
    const defaults: Record<string, string> = {};
    for (const perm of IOS_PERMISSIONS) {
      if (!permissions[perm.key]) {
        defaults[perm.key] = perm.defaultText;
      }
    }
    if (Object.keys(defaults).length > 0) {
      updateSection('iosPermissions', { ...permissions, ...defaults });
    }
  };

  const filledCount = IOS_PERMISSIONS.filter((p) => permissions[p.key]?.trim()).length;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Permisos iOS (NSDescriptions)</h4>
        <p className="text-[12px] text-gray-500">
          Apple requiere textos descriptivos que expliquen al usuario por qué tu app necesita cada permiso.
          Estos textos aparecen en el diálogo del sistema cuando se solicita acceso.
        </p>
      </div>

      {/* Auto-detect from modules */}
      <IosAutoDetectButton permissions={permissions} onApply={(perms) => updateSection('iosPermissions', perms)} />

      {/* Variable hint + fill all */}
      <div className="flex items-center justify-between">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 flex-1 mr-3">
          <p className="text-[11px] text-indigo-700">
            Usa <code className="bg-indigo-100 px-1 rounded font-mono text-[10px]">#APP_NAME</code> como variable — se reemplazará automáticamente por el nombre de tu app al compilar.
          </p>
        </div>
        <button
          onClick={fillAllDefaults}
          className="shrink-0 px-3 py-2 text-[11px] font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          Rellenar vacíos
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${(filledCount / IOS_PERMISSIONS.length) * 100}%` }}
          />
        </div>
        <span className="text-[11px] text-gray-500 shrink-0">
          {filledCount}/{IOS_PERMISSIONS.length} configurados
        </span>
      </div>

      {/* Permissions list */}
      <div className="space-y-4">
        {IOS_PERMISSIONS.map((perm) => (
          <div key={perm.key} className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[12px] font-semibold text-gray-800">{perm.label}</span>
                <span className="text-[10px] text-gray-400 font-mono ml-2">{perm.key}</span>
              </div>
              {permissions[perm.key] !== perm.defaultText && (
                <button
                  onClick={() => resetToDefault(perm.key, perm.defaultText)}
                  className="text-[10px] text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  Restaurar
                </button>
              )}
            </div>
            <textarea
              value={permissions[perm.key] ?? ''}
              onChange={(e) => updatePermission(perm.key, e.target.value)}
              placeholder={perm.defaultText}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            />
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-[12px] text-amber-800">
          <strong>Nota:</strong> Solo se incluirán en el build los permisos que tengan texto configurado.
          Deja vacíos los permisos que tu app no necesite.
        </p>
      </div>
    </div>
  );
};
