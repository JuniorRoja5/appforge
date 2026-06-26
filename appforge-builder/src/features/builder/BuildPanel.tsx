import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  X, Smartphone, Download, RefreshCw, CheckCircle2, XCircle,
  Clock, Loader2, AlertTriangle,
  Shield, Key, Apple, Package, Globe, Copy, ExternalLink,
} from 'lucide-react';
import {
  requestBuild, getBuilds, getBuild, downloadBuildArtifact,
  getKeystoreInfo, downloadKeystore, getSubscription, getApp,
  type AppBuild, type KeystoreInfo, type SubscriptionInfo, type AppInfo,
} from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type BuildType = 'debug' | 'release' | 'aab' | 'ios-export' | 'pwa';

const BUILD_TYPES: { value: BuildType; label: string; description: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { value: 'debug', label: 'Versión de prueba', description: 'Para probarla en tu móvil antes de publicarla', icon: Smartphone },
  { value: 'release', label: 'App nativa para Android', description: 'Archivo .apk para instalar directamente, sin pasar por la tienda', icon: Shield },
  { value: 'aab', label: 'App para Google Play', description: 'Lista para subirla a la tienda de Google', icon: Package },
  { value: 'ios-export', label: 'App para iPhone', description: 'Necesitarás un Mac y una cuenta de desarrollador de Apple', icon: Apple },
  { value: 'pwa', label: 'App web (PWA)', description: 'Tus clientes la abren en el navegador, sin instalar nada', icon: Globe },
];

type LockReason = 'plan' | 'debug-required' | 'legal-required' | null;

/**
 * Determina por qué un tipo de build queda bloqueado para el cliente (o null
 * si está libre). Cuatro dimensiones se evalúan en este orden:
 *
 * 1. PWA nunca se bloquea — es la oferta del plan FREE, accesible siempre.
 * 2. Sin plan que permita builds nativos → 'plan' (FREE: todo bloqueado salvo PWA).
 * 3. Con plan pero sin DEBUG previo completado → 'debug-required' para RELEASE/
 *    AAB/IOS_EXPORT (DEBUG sí está disponible porque es la puerta para el resto).
 * 4. Builds de tienda Play (RELEASE/AAB) sin privacidad+términos configurados
 *    → 'legal-required'. El backend ya impone la guarda dura (build.service →
 *    requiresLegalDocs); este check es UX espejo para avisar antes de clicar
 *    y no después de esperar al error del backend.
 *
 * Las dimensiones PWA y 'plan' espejan `subscription.service.canBuild()`: si
 * cambias la política de PWA o de plan aquí, cambia también canBuild — UI y
 * enforcement deben moverse juntos.
 *
 * La dimensión 'debug-required' es solo-frontend (UX para guiar al usuario):
 * el backend NO la verifica — encola un RELEASE sin DEBUG previo si hay
 * cuota. Si lees este helper y vas a canBuild buscando el gate de
 * debug-required, no lo encontrarás, y eso NO es un bug del backend. Vive
 * solo aquí. No "arregles" canBuild añadiéndolo sin decisión explícita.
 *
 * La dimensión 'legal-required' SÍ se espeja en el backend: la decisión
 * canónica vive en build-type-traits.requiresLegalDocs (RELEASE + AAB).
 * Aquí replicamos la misma lista para no encolar un build que el backend
 * va a rechazar. Si cambia la política, cambia ambos sitios.
 */
function getLockReason(
  buildType: BuildType,
  canBuild: boolean,
  hasCompletedDebug: boolean,
  hasLegalDocs: boolean,
): LockReason {
  if (buildType === 'pwa') return null;
  if (!canBuild) return 'plan';
  if (buildType !== 'debug' && !hasCompletedDebug) return 'debug-required';
  if ((buildType === 'release' || buildType === 'aab') && !hasLegalDocs) return 'legal-required';
  return null;
}

/**
 * "Configurado" = URL externa O contenido inline (mismo criterio que
 * resolvePrivacyUrl en runtime y que la guarda backend en
 * build.service:requestBuild). Si el cliente puede tener un enlace
 * externo o redactar el contenido inline, ambos son válidos.
 */
function hasLegalDocsConfigured(appConfig: Record<string, any> | null | undefined): boolean {
  if (!appConfig) return false;
  const privacy = appConfig.privacy as { url?: string; content?: string } | undefined;
  const terms   = appConfig.terms   as { url?: string; content?: string } | undefined;
  const hasPrivacy = !!(privacy?.url?.trim() || privacy?.content?.trim());
  const hasTerms   = !!(terms?.url?.trim()   || terms?.content?.trim());
  return hasPrivacy && hasTerms;
}

const BUILD_TYPE_LABELS: Record<string, string> = {
  debug: 'DEBUG',
  release: 'RELEASE',
  aab: 'AAB',
  'ios-export': 'XCODE',
  pwa: 'PWA',
};

const STATUS_CONFIG: Record<string, { label: string; detail: string; color: string; icon: React.FC<{ size?: number; className?: string }> }> = {
  QUEUED: { label: 'En cola', detail: 'Tu build será procesado en breve...', color: 'text-gray-600 bg-gray-100', icon: Clock },
  PREPARING: { label: 'Preparando', detail: 'Configurando entorno de compilación...', color: 'text-primary bg-primary/10', icon: Loader2 },
  BUILDING: { label: 'Construyendo', detail: 'Compilando tu aplicación...', color: 'text-primary bg-primary/10', icon: Loader2 },
  SIGNING: { label: 'Firmando', detail: 'Firmando el paquete con tu keystore...', color: 'text-primary bg-primary/10', icon: Loader2 },
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
  const [selectedType, setSelectedType] = useState<BuildType>('debug');
  const [keystoreInfo, setKeystoreInfo] = useState<KeystoreInfo | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
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

  // appInfo se usa solo para leer appConfig.privacy/terms y avisar antes
  // de un build RELEASE/AAB que el backend rechazaría por falta de docs
  // legales. La verdad última vive en el backend (build.service →
  // requiresLegalDocs); este loader es UX espejo.
  const loadAppInfo = useCallback(async () => {
    if (!appId || !token) return;
    try {
      const info = await getApp(appId, token);
      setAppInfo(info);
    } catch {
      // Ignore
    }
  }, [appId, token]);

  useEffect(() => {
    if (isOpen) {
      loadBuilds();
      loadKeystoreInfo();
      loadSubscription();
      loadAppInfo();
    }
  }, [isOpen, loadBuilds, loadKeystoreInfo, loadSubscription, loadAppInfo]);

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
  const hasLegalDocs = hasLegalDocsConfigured(appInfo?.appConfig);

  const canBuild = subscriptionInfo?.subscription.plan.canBuild ?? true;
  const buildsUsed = subscriptionInfo?.usage.buildsThisMonth ?? 0;
  const buildsLimit = subscriptionInfo?.subscription.plan.maxBuildsPerMonth ?? 999;

  const mainLockReason = getLockReason(selectedType, canBuild, hasCompletedDebug, hasLegalDocs);
  const isMainLocked = mainLockReason !== null;

  // Preselect PWA para planes que no permiten builds nativos. Coherente con
  // "PWA es el anzuelo": un FREE entra al panel y ve el botón habilitado, no
  // uno bloqueado con upsell. Debe ir en useEffect (no en el initial de
  // useState) porque `subscriptionInfo` llega asincrónicamente y el default
  // 'debug' está intacto en ese momento.
  //
  // El guard `selectedType === 'debug'` evita pisar una selección manual:
  // - FREE no puede clicar 'debug' (queda bloqueado), así que si sigue en
  //   'debug' es que el usuario no ha tocado nada → seguro preseleccionar.
  // - Si el usuario ya clicó 'pwa' u otro (en plan de pago), no hacemos nada.
  useEffect(() => {
    if (!subscriptionInfo) return;
    if (!canBuild && selectedType === 'debug') {
      setSelectedType('pwa');
    }
  }, [subscriptionInfo, canBuild, selectedType]);

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
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone size={18} className="text-primary" />
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
          {subscriptionInfo && canBuild && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl text-[12px]">
              <span className="font-semibold text-gray-700">
                Plan {subscriptionInfo.subscription.plan.name}
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">
                Entregas: {buildsUsed}/{buildsLimit} este mes
              </span>
            </div>
          )}

          {subscriptionInfo && !canBuild && (
            <div className="flex items-start gap-2.5 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[12px] text-amber-800 leading-relaxed">
                Tu plan {subscriptionInfo.subscription.plan.name} permite publicar tu app web. Para generar tu app nativa, mejora tu plan.
              </div>
            </div>
          )}

          {/* Aviso legal — espejo UX del gate dura del backend
              (build.service → requiresLegalDocs). Solo se muestra cuando
              el usuario ha seleccionado un tipo de tienda Y falta privacy
              o terms: no queremos ruido para alguien que está probando
              con DEBUG. */}
          {(selectedType === 'release' || selectedType === 'aab') && appInfo && !hasLegalDocs && (
            <div className="flex items-start gap-2.5 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[12px] text-amber-800 leading-relaxed">
                <p className="font-semibold mb-0.5">Faltan datos legales para publicar en tiendas</p>
                <p>
                  Google Play exige política de privacidad y términos accesibles desde dentro
                  de tu app. Configúralos en las pestañas <strong>Privacidad</strong> y{' '}
                  <strong>Términos</strong> antes de generar una versión para tienda.
                </p>
              </div>
            </div>
          )}

          {/* Build type selector */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {BUILD_TYPES.map((bt) => {
              const BtIcon = bt.icon;
              const lockReason = getLockReason(bt.value, canBuild, hasCompletedDebug, hasLegalDocs);
              const isLocked = lockReason !== null;
              const lockedTitle = lockReason === 'plan'
                ? 'Mejora tu plan para desbloquear esta opción'
                : lockReason === 'debug-required'
                  ? 'Necesitas generar primero una versión de prueba'
                  : lockReason === 'legal-required'
                    ? 'Configura privacidad y términos antes de publicar en tiendas'
                    : undefined;
              const lockedDescription = lockReason === 'plan'
                ? 'Disponible al mejorar tu plan'
                : lockReason === 'debug-required'
                  ? 'Genera primero una versión de prueba'
                  : 'Falta privacidad o términos';
              return (
                <button
                  key={bt.value}
                  onClick={() => { if (!isLocked) { setSelectedType(bt.value); setShowKeystoreWarning(false); } }}
                  disabled={isLocked}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    isLocked
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : selectedType === bt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  title={lockedTitle}
                >
                  <BtIcon size={18} className={isLocked ? 'text-gray-300' : selectedType === bt.value ? 'text-primary' : 'text-gray-400'} />
                  <div>
                    <p className={`text-[13px] font-semibold ${isLocked ? 'text-gray-400' : selectedType === bt.value ? 'text-primary' : 'text-gray-700'}`}>
                      {bt.label}
                      {isLocked && <span className="ml-1.5 text-[9px] font-normal text-gray-400 align-middle">🔒</span>}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {isLocked ? lockedDescription : bt.description}
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
                disabled={requesting || isBuilding || isMainLocked}
                className="w-full py-3.5 bg-primary hover:opacity-90 disabled:bg-gray-300 text-white text-[14px] font-bold rounded-xl shadow-lg transition-all disabled:shadow-none flex items-center justify-center gap-2"
              >
                {requesting ? (
                  <><Loader2 size={16} className="animate-spin" /> Solicitando...</>
                ) : isBuilding ? (
                  <><Loader2 size={16} className="animate-spin" /> Build en progreso...</>
                ) : mainLockReason === 'plan' ? (
                  <>Mejora tu plan para generar tu app nativa</>
                ) : mainLockReason === 'debug-required' ? (
                  <>Genera primero una versión de prueba</>
                ) : mainLockReason === 'legal-required' ? (
                  <>Configura privacidad y términos para publicar</>
                ) : (
                  <>
                    {BUILD_TYPES.find((bt) => bt.value === selectedType)?.icon &&
                      React.createElement(BUILD_TYPES.find((bt) => bt.value === selectedType)!.icon, { size: 16 })}
                    {' '}Generar {BUILD_TYPES.find((bt) => bt.value === selectedType)?.label}
                  </>
                )}
              </button>
            )}

            {isBuilding && activeBuildStatus && (
              <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-[12px] font-semibold text-primary">
                  {STATUS_CONFIG[activeBuildStatus]?.detail}
                </p>
                <p className="text-[11px] text-primary mt-1">
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
                                className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:opacity-90 text-white text-[11px] font-semibold rounded-lg transition-colors"
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
                              className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:opacity-90 disabled:bg-gray-300 text-white text-[11px] font-semibold rounded-lg transition-colors"
                            >
                              <RefreshCw size={12} /> Reintentar
                            </button>
                          )}

                          {/* Expand button removed (TECH_DEBT #46): the
                              expanded view rendered build.logOutput verbatim,
                              leaking VPS paths and tooling internals. Backend
                              now stores logOutput as null; frontend stops
                              offering the expand affordance entirely. */}
                        </div>
                      </div>

                      {/* Error message — hardcoded generic (TECH_DEBT #46).
                          We deliberately ignore build.errorMessage here so
                          that old failed builds in the DB (with raw
                          error.message stored before the backend
                          sanitization landed) also render the generic
                          string. The raw error is in pm2 logs for support. */}
                      {build.status === 'FAILED' && (
                        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                          <p className="text-[11px] text-red-700">
                            No se pudo completar el build. Reintenta en unos minutos. Si el problema persiste, contacta con soporte.
                          </p>
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
