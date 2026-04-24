import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  X, Smartphone, Download, RefreshCw, CheckCircle2, XCircle,
  Clock, Loader2, AlertTriangle, ChevronDown, ChevronRight,
  Shield, Key, Apple, Package, Globe, Copy, ExternalLink,
} from 'lucide-react';
import {
  requestBuild, getBuilds, getBuild, downloadBuildArtifact,
  getKeystoreInfo, downloadKeystore, getSubscription,
  type AppBuild, type KeystoreInfo, type SubscriptionInfo,
} from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type BuildType = 'debug' | 'release' | 'aab' | 'ios-export' | 'pwa';

const BUILD_TYPES: { value: BuildType; label: string; description: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { value: 'debug', label: 'Debug APK', description: 'Para pruebas (sin firmar)', icon: Smartphone },
  { value: 'release', label: 'Release APK', description: 'APK firmado para distribución directa', icon: Shield },
  { value: 'aab', label: 'AAB Play Store', description: 'Bundle firmado para Google Play', icon: Package },
  { value: 'ios-export', label: 'Proyecto Xcode', description: 'Descarga ZIP para compilar en macOS', icon: Apple },
  { value: 'pwa', label: 'Progressive Web App', description: 'App web instalable sin descargar', icon: Globe },
];

const BUILD_TYPE_LABELS: Record<string, string> = {
  debug: 'DEBUG',
  release: 'RELEASE',
  aab: 'AAB',
  'ios-export': 'XCODE',
  pwa: 'PWA',
};

const STATUS_CONFIG: Record<string, { label: string; detail: string; color: string; icon: React.FC<{ size?: number; className?: string }> }> = {
  QUEUED: { label: 'En cola', detail: 'Tu build será procesado en breve...', color: 'text-gray-600 bg-gray-100', icon: Clock },
  PREPARING: { label: 'Preparando', detail: 'Configurando entorno de compilación...', color: 'text-blue-600 bg-blue-100', icon: Loader2 },
  BUILDING: { label: 'Construyendo', detail: 'Compilando tu aplicación...', color: 'text-indigo-600 bg-indigo-100', icon: Loader2 },
  SIGNING: { label: 'Firmando', detail: 'Firmando el paquete con tu keystore...', color: 'text-purple-600 bg-purple-100', icon: Loader2 },
  COMPLETED: { label: 'Completado', detail: 'Build listo para descargar', color: 'text-green-700 bg-green-100', icon: CheckCircle2 },
  FAILED: { label: 'Error', detail: 'La construcción falló', color: 'text-red-700 bg-red-100', icon: XCircle },
};

export const BuildPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);

  const [builds, setBuilds] = useState<AppBuild[]>([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<BuildType>('debug');
  const [keystoreInfo, setKeystoreInfo] = useState<KeystoreInfo | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [showKeystoreWarning, setShowKeystoreWarning] = useState(false);

  const loadBuilds = useCallback(async () => {
    if (!appId || !token) return;
    setLoading(true);
    try {
      const data = await getBuilds(appId, token);
      setBuilds(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [appId, token]);

  const loadKeystoreInfo = useCallback(async () => {
    if (!appId || !token) return;
    try {
      const info = await getKeystoreInfo(appId, token);
      setKeystoreInfo(info);
    } catch {
      // Ignore
    }
  }, [appId, token]);

  const loadSubscription = useCallback(async () => {
    if (!token) return;
    try {
      const info = await getSubscription(token);
      setSubscriptionInfo(info);
    } catch {
      // Ignore
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      loadBuilds();
      loadKeystoreInfo();
      loadSubscription();
    }
  }, [isOpen, loadBuilds, loadKeystoreInfo, loadSubscription]);

  // Poll active builds
  useEffect(() => {
    const activeBuild = builds.find((b) =>
      ['QUEUED', 'PREPARING', 'BUILDING', 'SIGNING'].includes(b.status),
    );
    if (!activeBuild || !appId || !token) return;

    const interval = setInterval(async () => {
      try {
        const updated = await getBuild(appId, activeBuild.id, token);
        setBuilds((prev) =>
          prev.map((b) => (b.id === updated.id ? updated : b)),
        );
        if (['COMPLETED', 'FAILED'].includes(updated.status)) {
          clearInterval(interval);
          loadBuilds();
          loadKeystoreInfo(); // Refresh keystore info after build
        }
      } catch {
        // Ignore
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [builds, appId, token, loadBuilds, loadKeystoreInfo]);

  const handleBuild = async () => {
    if (!appId || !token) return;

    // Show keystore warning for first release/aab build
    if ((selectedType === 'release' || selectedType === 'aab') && !keystoreInfo?.hasKeystore && !showKeystoreWarning) {
      setShowKeystoreWarning(true);
      return;
    }

    setError('');
    setRequesting(true);
    setShowKeystoreWarning(false);
    try {
      const build = await requestBuild(appId, token, selectedType);
      setBuilds((prev) => [build, ...prev]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al solicitar build');
    } finally {
      setRequesting(false);
    }
  };

  const isBuilding = builds.some((b) =>
    ['QUEUED', 'PREPARING', 'BUILDING', 'SIGNING'].includes(b.status),
  );
  const activeBuildStatus = builds.find((b) =>
    ['QUEUED', 'PREPARING', 'BUILDING', 'SIGNING'].includes(b.status),
  )?.status;

  const hasCompletedDebug = builds.some((b) => b.buildType.toLowerCase() === 'debug' && b.status === 'COMPLETED');

  const canBuild = subscriptionInfo?.subscription.plan.canBuild ?? true;
  const buildsUsed = subscriptionInfo?.usage.buildsThisMonth ?? 0;
  const buildsLimit = subscriptionInfo?.subscription.plan.maxBuildsPerMonth ?? 999;

  const handleDownload = (buildId: string) => {
    if (!appId || !token) return;
    downloadBuildArtifact(appId, buildId, token);
  };

  const handleKeystoreDownload = () => {
    if (!appId || !token) return;
    downloadKeystore(appId, token);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-[700px] max-w-[95vw] h-[600px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Smartphone size={18} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[15px] text-gray-900">Generar App</h3>
              <p className="text-[11px] text-gray-500">Construye tu aplicación nativa</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Subscription info bar */}
          {subscriptionInfo && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl text-[12px]">
              <span className="font-semibold text-gray-700">
                Plan {subscriptionInfo.subscription.plan.name}
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">
                Builds: {buildsUsed}/{buildsLimit} este mes
              </span>
              {!canBuild && (
                <span className="ml-auto text-amber-600 font-semibold">
                  Tu plan no incluye builds
                </span>
              )}
            </div>
          )}

          {/* Build type selector */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {BUILD_TYPES.map((bt) => {
              const BtIcon = bt.icon;
              const isLocked = bt.value !== 'debug' && !hasCompletedDebug;
              return (
                <button
                  key={bt.value}
                  onClick={() => { if (!isLocked) { setSelectedType(bt.value); setShowKeystoreWarning(false); } }}
                  disabled={isLocked}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    isLocked
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : selectedType === bt.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  title={isLocked ? 'Genera primero un Debug APK para habilitar esta opción' : undefined}
                >
                  <BtIcon size={18} className={isLocked ? 'text-gray-300' : selectedType === bt.value ? 'text-indigo-600' : 'text-gray-400'} />
                  <div>
                    <p className={`text-[13px] font-semibold ${isLocked ? 'text-gray-400' : selectedType === bt.value ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {bt.label}
                      {isLocked && <span className="ml-1.5 text-[9px] font-normal text-gray-400 align-middle">🔒</span>}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {isLocked ? 'Primero genera un Debug APK' : bt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Keystore warning for first release/aab */}
          {showKeystoreWarning && (
            <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-amber-800">
                    Se generará un keystore para tu app
                  </p>
                  <p className="text-[12px] text-amber-700 mt-1">
                    Tu keystore es <strong>permanente e irrecuperable</strong>. Sin él no podrás actualizar tu app en Google Play Store.
                    Después del build, descárgalo y guárdalo en un lugar seguro.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleBuild}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-bold rounded-lg transition-colors"
                    >
                      Entendido, continuar con el build
                    </button>
                    <button
                      onClick={() => setShowKeystoreWarning(false)}
                      className="px-4 py-2 text-amber-700 hover:bg-amber-100 text-[12px] font-semibold rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Keystore info section */}
          {keystoreInfo?.hasKeystore && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-green-600" />
                <div>
                  <p className="text-[12px] font-semibold text-green-800">Keystore configurado</p>
                  {keystoreInfo.createdAt && (
                    <p className="text-[10px] text-green-600">
                      Creado: {new Date(keystoreInfo.createdAt).toLocaleDateString('es')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleKeystoreDownload}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold rounded-lg transition-colors"
              >
                <Download size={12} /> Descargar Keystore
              </button>
            </div>
          )}

          {/* Build button + error */}
          <div className="mb-6">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-3">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-red-700">{error}</p>
              </div>
            )}

            {!showKeystoreWarning && (
              <button
                onClick={handleBuild}
                disabled={requesting || isBuilding || !canBuild}
                className="w-full py-3.5 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-300 disabled:to-gray-400 text-white text-[14px] font-bold rounded-xl shadow-lg transition-all disabled:shadow-none flex items-center justify-center gap-2"
              >
                {requesting ? (
                  <><Loader2 size={16} className="animate-spin" /> Solicitando...</>
                ) : isBuilding ? (
                  <><Loader2 size={16} className="animate-spin" /> Build en progreso...</>
                ) : !canBuild ? (
                  <>Tu plan no incluye builds</>
                ) : (
                  <>
                    {BUILD_TYPES.find((bt) => bt.value === selectedType)?.icon &&
                      React.createElement(BUILD_TYPES.find((bt) => bt.value === selectedType)!.icon, { size: 16 })}
                    {' '}Construir {BUILD_TYPES.find((bt) => bt.value === selectedType)?.label}
                  </>
                )}
              </button>
            )}

            {isBuilding && activeBuildStatus && (
              <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <p className="text-[12px] font-semibold text-indigo-800">
                  {STATUS_CONFIG[activeBuildStatus]?.detail}
                </p>
                <p className="text-[11px] text-indigo-600 mt-1">
                  ⏱ Tiempo estimado: 3-7 minutos. Puedes cerrar esta ventana — te enviaremos un email cuando esté listo.
                </p>
              </div>
            )}

            {!isBuilding && (
              <p className="text-[11px] text-gray-400 mt-2 text-center">
                {selectedType === 'ios-export'
                  ? 'Genera un proyecto Xcode listo para compilar en macOS.'
                  : 'Tiempo estimado: 3-7 min. Puedes cerrar esta ventana durante la construcción.'}
              </p>
            )}
          </div>

          {/* Build history */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Historial de builds</h4>
              <button
                onClick={loadBuilds}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {builds.length === 0 ? (
              <div className="text-center py-10">
                <Smartphone size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No hay builds aún</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Selecciona un tipo de build y haz clic en construir
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {builds.map((build) => {
                  const config = STATUS_CONFIG[build.status] ?? STATUS_CONFIG.QUEUED;
                  const StatusIcon = config.icon;
                  const isActive = ['QUEUED', 'PREPARING', 'BUILDING', 'SIGNING'].includes(build.status);
                  const isExpanded = expandedLog === build.id;
                  const typeLabel = BUILD_TYPE_LABELS[build.buildType] ?? build.buildType.toUpperCase();

                  return (
                    <div
                      key={build.id}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <StatusIcon
                          size={18}
                          className={`shrink-0 ${isActive ? 'animate-spin' : ''} ${config.color.split(' ')[0]}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${config.color}`}>
                              {config.label}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              typeLabel === 'AAB' ? 'bg-purple-100 text-purple-700' :
                              typeLabel === 'RELEASE' ? 'bg-blue-100 text-blue-700' :
                              typeLabel === 'XCODE' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {typeLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {new Date(build.createdAt).toLocaleString('es')}
                            {build.artifactSize && ` — ${(build.artifactSize / 1024 / 1024).toFixed(1)} MB`}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {build.status === 'COMPLETED' && build.artifactUrl && build.buildType.toLowerCase() !== 'pwa' && (
                            <button
                              onClick={() => handleDownload(build.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold rounded-lg transition-colors"
                            >
                              <Download size={12} /> Descargar
                            </button>
                          )}
                          {build.status === 'COMPLETED' && build.buildType.toLowerCase() === 'pwa' && build.artifactUrl && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { navigator.clipboard.writeText(build.artifactUrl!); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-lg transition-colors"
                              >
                                <Copy size={12} /> Copiar URL
                              </button>
                              <a
                                href={build.artifactUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold rounded-lg transition-colors"
                              >
                                <ExternalLink size={12} /> Abrir
                              </a>
                            </div>
                          )}

                          {build.status === 'FAILED' && (
                            <button
                              onClick={async () => {
                                if (!appId || !token || requesting || isBuilding) return;
                                setRequesting(true);
                                setError('');
                                try {
                                  const newBuild = await requestBuild(appId, token, build.buildType as BuildType);
                                  setBuilds((prev) => [newBuild, ...prev]);
                                } catch (err: unknown) {
                                  setError(err instanceof Error ? err.message : 'Error al reintentar build');
                                } finally {
                                  setRequesting(false);
                                }
                              }}
                              disabled={requesting || isBuilding}
                              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-[11px] font-semibold rounded-lg transition-colors"
                            >
                              <RefreshCw size={12} /> Reintentar
                            </button>
                          )}

                          {(build.logOutput || build.errorMessage) && (
                            <button
                              onClick={() => setExpandedLog(isExpanded ? null : build.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Error message */}
                      {build.status === 'FAILED' && build.errorMessage && (
                        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                          <p className="text-[11px] text-red-700 font-mono">{build.errorMessage}</p>
                        </div>
                      )}

                      {/* Expanded log */}
                      {isExpanded && build.logOutput && (
                        <div className="px-4 py-3 bg-gray-900 border-t border-gray-200">
                          <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {build.logOutput}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
