import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useAppModulesStore } from '../store/useAppModulesStore';
import { useTenantStore } from '../store/useTenantStore';

const navItems = [
  {
    to: '/dashboard',
    label: 'Mis Apps',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: '/pricing',
    label: 'Planes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    to: '/billing',
    label: 'Facturación',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/support',
    label: 'Soporte',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 0v4m0 16v-4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M6.76 17.24l-2.83 2.83m0-14.14l2.83 2.83m10.38 8.49l-2.83-2.83" />
      </svg>
    ),
  },
];

interface AppNavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

interface AppNavDataItem extends AppNavItem {
  /**
   * moduleId canónico (no la ruta) del módulo del que depende esta entrada.
   * IMPORTANTE: este string DEBE coincidir con el `id` declarado en la
   * ModuleDefinition del módulo correspondiente, no con el segmento de URL.
   * Ej: la entrada "Pedidos" depende de 'catalog' (porque pedidos no existe
   * sin catálogo). "Reservas" depende de 'booking' (singular, sin 's').
   * Filtrar por el string equivocado = la entrada nunca aparece en la barra
   * de los apps que sí usan el módulo. Bug silencioso. Verificar contra
   * appforge-builder/src/modules/*.module.tsx (`id:` en el export) al añadir
   * una nueva.
   */
  moduleId: string;
}

// Entradas siempre visibles cuando hay appId — no dependen de módulos.
const getAppNavAlways = (appId: string): AppNavItem[] => [
  {
    to: `/apps/${appId}/edit`,
    label: 'Editor',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    to: `/apps/${appId}/settings`,
    label: 'Configuración',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: `/apps/${appId}/analytics`,
    label: 'Analíticas',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: `/apps/${appId}/users`,
    label: 'Usuarios',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    to: `/apps/${appId}/pwa`,
    label: 'PWA',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a14.95 14.95 0 014.5 9 14.95 14.95 0 01-4.5 9M12 3a14.95 14.95 0 00-4.5 9 14.95 14.95 0 004.5 9z" />
      </svg>
    ),
  },
];

// Entradas condicionales por módulo — solo visibles si el app tiene el
// moduleId correspondiente en su schema. Ver comentario de AppNavDataItem
// sobre el riesgo silencioso de filtrar por el string equivocado.
const getAppNavData = (appId: string): AppNavDataItem[] => [
  {
    to: `/apps/${appId}/orders`,
    label: 'Pedidos',
    moduleId: 'catalog',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    to: `/apps/${appId}/coupons`,
    label: 'Cupones',
    moduleId: 'discount_coupon',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    to: `/apps/${appId}/loyalty`,
    label: 'Lealtad',
    moduleId: 'loyalty_card',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    to: `/apps/${appId}/push`,
    label: 'Notificaciones',
    moduleId: 'push_notification',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    to: `/apps/${appId}/contact`,
    label: 'Mensajes',
    moduleId: 'contact',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: `/apps/${appId}/social`,
    label: 'Muro',
    moduleId: 'social_wall',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
  },
  {
    to: `/apps/${appId}/fan-wall`,
    label: 'Fan wall',
    moduleId: 'fan_wall',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: `/apps/${appId}/bookings`,
    label: 'Reservas',
    moduleId: 'booking',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

export const SideNav: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  // Selector individual → solo re-renderiza si moduleIds cambia.
  const moduleIds = useAppModulesStore((s) => s.moduleIds);
  // White-label: entrada "Marca" visible solo si el plan lo incluye.
  // Escondida para no-resellers (no gastar pixel ni cognición en mostrar
  // opciones que no se pueden usar). Ver feedback_ui_copy_audience.md.
  const isWhiteLabel = useTenantStore((s) => s.isWhiteLabel);

  const dataItems =
    appId && moduleIds
      ? getAppNavData(appId).filter((item) => moduleIds.includes(item.moduleId))
      : [];

  return (
    <nav className="w-[220px] bg-gray-50 border-r border-gray-200/60 flex flex-col h-full p-4 space-y-1 shrink-0">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} className={linkClass}>
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}

      {isWhiteLabel && (
        <NavLink to="/branding" className={linkClass}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <span>Marca</span>
        </NavLink>
      )}

      {appId && (
        <>
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">App</p>
          </div>
          {/* Entradas inmediatas — no esperan al store de moduleIds */}
          {getAppNavAlways(appId).map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
          {/* Entradas de datos — solo cuando moduleIds está cargado y el app
              tiene el módulo correspondiente. Si moduleIds es null (no
              cargado o fallo), dataItems es [] y no se renderiza nada. */}
          {dataItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </>
      )}
    </nav>
  );
};
