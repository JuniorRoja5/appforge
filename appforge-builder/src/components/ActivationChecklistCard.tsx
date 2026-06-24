import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, X, Sparkles } from 'lucide-react';
import { getBuilds, type AppInfo, type AppBuild } from '../lib/api';
import {
  computeActivationSteps,
  countCompleted,
  STEP_COUNT,
  STEP_LABELS,
  checklistDismissKey,
  checklistCollapsedKey,
  type ActivationSteps,
} from '../lib/activation-checklist';

/**
 * G3-A — Superficie A (principal): card de "Primeros pasos" en el
 * Dashboard, encima del grid de apps. Aplica el patrón de Shopify/
 * HubSpot — el checklist captura al usuario entre sesiones, donde
 * decide si vuelve, no cuando ya está editando.
 *
 * Selección de app target (cuando hay múltiples apps):
 *   1. Filtrar las dismissed por el usuario (banner "🎉" cerrado con X).
 *   2. Ordenar por updatedAt desc (la app más reciente que está
 *      construyendo activamente).
 *   3. Tomar la primera. Si ninguna queda → no renderizar nada.
 *
 * Sin lógica de desempate para updatedAt idéntico — caso teórico, no
 * se da en la práctica (el usuario edita una app a la vez).
 *
 * Render según estado:
 *   - < 4/4: card con barra de progreso + 4 filas (check / círculo).
 *     Colapsable via chevron (localStorage por-tenant).
 *     Auto-colapso si daysSinceCreation > 7 && completedSteps < 4.
 *   - 4/4: card se reemplaza por banner verde "🎉 Tu app está lista"
 *     con botón "Ver mi app" (link al pwaUrl). Botón "X" para
 *     descartar el banner (localStorage por-appId, persistente).
 *
 * Persistencia: SOLO el flag de colapso (por-tenant) y dismiss del
 * banner final (por-appId). Los pasos individuales NO persisten — se
 * calculan en vivo del backend en cada render.
 */
interface Props {
  apps: AppInfo[];
  tenantId: string;
  token: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const ActivationChecklistCard: React.FC<Props> = ({ apps, tenantId, token }) => {
  const navigate = useNavigate();

  // Selección de app target. Re-calcula cuando cambian apps (delete,
  // create, etc.). Si está dismissed la primera, el filter la salta;
  // la siguiente más reciente toma el relevo automáticamente.
  const targetApp = useMemo<AppInfo | null>(() => {
    if (apps.length === 0) return null;
    const elegible = apps
      .filter((a) => {
        try {
          return localStorage.getItem(checklistDismissKey(a.id)) === null;
        } catch {
          return true; // localStorage bloqueado/incógnito → mostrar
        }
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return elegible[0] ?? null;
  }, [apps]);

  // Builds de la app target. Re-fetch cuando cambia el id de la app
  // target (caso: usuario borra la app actual, otra toma el relevo).
  const [builds, setBuilds] = useState<AppBuild[]>([]);
  useEffect(() => {
    if (!targetApp) {
      setBuilds([]);
      return;
    }
    let cancelled = false;
    getBuilds(targetApp.id, token)
      .then((data) => {
        if (!cancelled) setBuilds(data);
      })
      .catch(() => {
        // Silencioso — si falla, builds=[] y Step 4 queda en pending;
        // el resto del checklist sigue siendo útil.
      });
    return () => {
      cancelled = true;
    };
  }, [targetApp?.id, token]);

  // Colapso por-tenant. Inicial: localStorage flag || auto-colapso por
  // edad > 7 días con incompleto. El usuario puede des-colapsar con
  // click — eso persiste el "false" en localStorage.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (!targetApp) return false;
    try {
      const stored = localStorage.getItem(checklistCollapsedKey(tenantId));
      if (stored !== null) return stored === '1';
    } catch {
      // ignore
    }
    const daysSinceCreation = (Date.now() - new Date(targetApp.createdAt).getTime()) / SEVEN_DAYS_MS;
    return daysSinceCreation > 1; // SEVEN_DAYS_MS ya es 7 días → >1 = >7 días
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(checklistCollapsedKey(tenantId), next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleDismissBanner = () => {
    if (!targetApp) return;
    try {
      localStorage.setItem(checklistDismissKey(targetApp.id), '1');
    } catch {
      // ignore
    }
    // Forzar re-render: cambiamos el targetApp recalculando. Como el
    // localStorage no triggers re-render, dispatchamos un storage event
    // sintético leyendo desde el padre. Workaround: setState dummy.
    setDismissedTick((t) => t + 1);
  };
  const [, setDismissedTick] = useState(0);

  if (!targetApp) return null;

  const steps: ActivationSteps = computeActivationSteps(targetApp, builds);
  const completed = countCompleted(steps);
  const allDone = completed === STEP_COUNT;
  const progressPct = Math.round((completed / STEP_COUNT) * 100);

  // ─── Banner final cuando 4/4 ───
  if (allDone) {
    return (
      <div className="mb-6 p-5 bg-green-50 rounded-xl border border-green-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
        <button
          onClick={handleDismissBanner}
          aria-label="Descartar"
          className="absolute top-3 right-3 text-green-700/60 hover:text-green-700 transition-colors"
        >
          <X size={16} />
        </button>
        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-green-900">
              🎉 Tu app está lista — {targetApp.name}
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              Completaste los {STEP_COUNT} pasos. Compártela con tus usuarios.
            </p>
          </div>
        </div>
        {targetApp.pwaUrl && (
          <a
            href={targetApp.pwaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
          >
            Ver mi app
          </a>
        )}
      </div>
    );
  }

  // ─── Card con checklist en progreso ───
  return (
    <div className="mb-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              Primeros pasos — {targetApp.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {completed} de {STEP_COUNT} completados · ten tu app lista para compartir
            </p>
          </div>
          {/* Barra de progreso compacta */}
          <div className="hidden sm:block w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <span className="text-gray-400 shrink-0">
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </span>
      </button>

      {!collapsed && (
        <ul className="border-t border-gray-100 py-2">
          {(Object.keys(STEP_LABELS) as Array<keyof ActivationSteps>).map((key) => {
            const done = steps[key];
            return (
              <li
                key={key}
                className="flex items-center gap-3 px-5 py-2.5 text-sm"
              >
                <span
                  className={[
                    'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                    done ? 'bg-green-500' : 'border-2 border-gray-300 bg-white',
                  ].join(' ')}
                >
                  {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </span>
                <span className={done ? 'text-gray-400 line-through' : 'text-gray-700'}>
                  {STEP_LABELS[key]}
                </span>
                {!done && (
                  <button
                    onClick={() => navigate(`/apps/${targetApp.id}/edit`)}
                    className="ml-auto text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    Ir
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
