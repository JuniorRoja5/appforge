import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useBuilderStore } from '../../store/useBuilderStore';
import { useAppConfigStore } from '../../store/useAppConfigStore';
import { getBuilds, type AppBuild, type AppInfo } from '../../lib/api';
import {
  computeActivationSteps,
  countCompleted,
  STEP_COUNT,
  STEP_LABELS,
  type ActivationSteps,
} from '../../lib/activation-checklist';

/**
 * G3-A — Superficie B (refuerzo): badge pequeño en el TopBar del builder.
 *
 * Footprint mínimo (zero layout impact) — pill compacta con progreso N/4 +
 * ring de progreso. Click → popover con los 4 pasos y sus checks. Cuando
 * 4/4, la pill se vuelve verde con check definitivo (sin desaparecer — el
 * usuario merece el feedback positivo persistente).
 *
 * Reactividad:
 * - designTokens viene del store del builder → Step 1 se actualiza en vivo
 *   cuando el usuario cambia el color primario en el theme editor.
 * - appConfig.icon?.url viene del store de appConfig → Step 2 se actualiza
 *   en vivo cuando el usuario sube el logo.
 * - pwaEnabled/pwaLastDeployedAt vienen como props desde BuilderLayout
 *   (cargados con el getApp inicial, no cambian en sesión normal).
 * - builds requiere fetch propio. Re-fetch cuando buildsRefreshKey cambia
 *   — el BuilderLayout incrementa esa key al cerrar el BuildPanel.
 *
 * El "Ver mi app" / banner final NO vive aquí — vive en la card del
 * Dashboard (Superficie A). El badge es solo recordatorio in-context.
 */
interface Props {
  appId: string;
  token: string;
  pwaEnabled: AppInfo['pwaEnabled'];
  pwaLastDeployedAt: AppInfo['pwaLastDeployedAt'];
  /**
   * Cambia cuando hay que re-fetch builds. BuilderLayout lo incrementa
   * tras cerrar el BuildPanel (donde el usuario pudo disparar un build
   * nuevo). useEffect del badge dispara el fetch.
   */
  buildsRefreshKey: number;
}

export const ActivationBadge: React.FC<Props> = ({
  appId,
  token,
  pwaEnabled,
  pwaLastDeployedAt,
  buildsRefreshKey,
}) => {
  const designTokens = useBuilderStore((s) => s.designTokens);
  const appConfig = useAppConfigStore((s) => s.config);
  const [builds, setBuilds] = useState<AppBuild[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch de builds en mount + cuando buildsRefreshKey cambia. Si falla,
  // dejamos builds=[] silencioso — el Step 4 quedará en pending pero el
  // badge sigue siendo útil para los otros 3 steps.
  useEffect(() => {
    let cancelled = false;
    getBuilds(appId, token)
      .then((data) => {
        if (!cancelled) setBuilds(data);
      })
      .catch(() => {
        // Silencioso — el badge no debe romper el builder si /builds falla
      });
    return () => {
      cancelled = true;
    };
  }, [appId, token, buildsRefreshKey]);

  // Click outside cierra el popover
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [popoverOpen]);

  const steps: ActivationSteps = computeActivationSteps(
    {
      designTokens,
      appConfig: appConfig as AppInfo['appConfig'],
      pwaEnabled,
      pwaLastDeployedAt,
    },
    builds,
  );
  const completed = countCompleted(steps);
  const allDone = completed === STEP_COUNT;

  const togglePopover = useCallback(() => setPopoverOpen((v) => !v), []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={togglePopover}
        title={allDone ? 'Tu app está lista' : `Setup ${completed}/${STEP_COUNT}`}
        className={[
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
          allDone
            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
            : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100',
        ].join(' ')}
      >
        {allDone ? (
          <Check className="w-3.5 h-3.5 text-green-600" />
        ) : (
          <ProgressRing completed={completed} total={STEP_COUNT} />
        )}
        <span>{allDone ? 'Lista' : `${completed}/${STEP_COUNT}`}</span>
      </button>

      {popoverOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[13px] font-semibold text-gray-900">
              {allDone ? '🎉 Tu app está lista' : `Pasos para lanzar tu app`}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {completed} de {STEP_COUNT} completados
            </p>
          </div>
          <ul className="py-1">
            {(Object.keys(STEP_LABELS) as Array<keyof ActivationSteps>).map(
              (key) => {
                const done = steps[key];
                return (
                  <li
                    key={key}
                    className="flex items-center gap-2.5 px-4 py-2 text-[12px]"
                  >
                    <span
                      className={[
                        'w-4 h-4 rounded-full flex items-center justify-center shrink-0',
                        done
                          ? 'bg-green-500'
                          : 'border-2 border-gray-300 bg-white',
                      ].join(' ')}
                    >
                      {done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className={done ? 'text-gray-500 line-through' : 'text-gray-700'}>
                      {STEP_LABELS[key]}
                    </span>
                  </li>
                );
              },
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * SVG ring de progreso pequeño. Usa var(--primary) para el arco activo
 * → el rediseño que cambie el token lo adapta automáticamente.
 */
const ProgressRing: React.FC<{ completed: number; total: number }> = ({
  completed,
  total,
}) => {
  const size = 14;
  const stroke = 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - completed / total);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgb(229 231 235)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-primary, #4F46E5)"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
    </svg>
  );
};
