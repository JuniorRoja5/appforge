import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, Stamp, Trophy } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import {
  getLoyaltyUsers,
  getLoyaltyRedemptions,
  getLoyaltyStats,
  type LoyaltyUserCardItem,
  type LoyaltyRedemptionItem,
} from '../lib/api';
import { formatDate } from '../lib/coupon-helpers';
import { DataAdminShell } from '../components/admin/DataAdminShell';
import { WorkflowInbox } from '../components/admin/WorkflowInbox';
import { StatCardCell } from '../components/admin/StatCardCell';

interface LoyaltyStats {
  activeUsers: number;
  stampsThisMonth: number;
  totalRedemptions: number;
}

const LoyaltyStatsCards: FC<{ stats: LoyaltyStats }> = ({ stats }) => (
  <div className="grid grid-cols-3 gap-3">
    <StatCardCell icon={<Users size={14} />} label="Usuarios" value={stats.activeUsers} />
    <StatCardCell icon={<Stamp size={14} />} label="Sellos este mes" value={stats.stampsThisMonth} />
    <StatCardCell icon={<Trophy size={14} />} label="Canjes" value={stats.totalRedemptions} />
  </div>
);

const LoyaltyUserRow: FC<{ user: LoyaltyUserCardItem }> = ({ user }) => {
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.email.split('@')[0];
  const initial = (user.firstName?.[0] ?? user.email[0] ?? '?').toUpperCase();
  return (
    <div className="p-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
      </div>
      <div className="text-sm font-bold text-gray-700 shrink-0">
        {user.currentStamps}/{user.totalStamps}
      </div>
      {user.canRedeem && (
        <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700 shrink-0">
          Puede canjear
        </span>
      )}
      <div className="text-xs text-gray-400 shrink-0 w-32 text-right">
        {user.lastStampAt
          ? `Último sello: ${formatDate(user.lastStampAt)}`
          : 'Sin sellos'}
      </div>
    </div>
  );
};

const RedemptionRow: FC<{ redemption: LoyaltyRedemptionItem }> = ({
  redemption,
}) => {
  const name =
    [redemption.appUser.firstName, redemption.appUser.lastName]
      .filter(Boolean)
      .join(' ') || redemption.appUser.email.split('@')[0];
  return (
    <div className="p-4 flex items-center gap-4">
      <Trophy size={16} className="text-emerald-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500 truncate">{redemption.appUser.email}</p>
      </div>
      <div className="text-xs text-gray-400 shrink-0">
        {formatDate(redemption.redeemedAt)}
      </div>
    </div>
  );
};

export const LoyaltyAdminPage: FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);

  // Estado inicial undefined (no null) para distinguir "no cargado todavía"
  // de "cargado y card no configurada en backend" (=== null tras 404).
  // Resuelve dos bordes en Gate 3:
  //   (1) parpadeo del empty state "configura primero la tarjeta" durante
  //       initialLoading porque los dos estarían en null momentáneamente;
  //   (2) un fetch que falla deja el estado en undefined (initial), no en
  //       null, así un fallo de red NO se disfraza de "card no configurada".
  const [users, setUsers] = useState<LoyaltyUserCardItem[] | null | undefined>(
    undefined,
  );
  const [redemptions, setRedemptions] = useState<
    LoyaltyRedemptionItem[] | null | undefined
  >(undefined);
  const [stats, setStats] = useState<LoyaltyStats | undefined>(undefined);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appId || !token) return;
    setInitialLoading(true);
    setError(null);

    const fetchUsers = async () => {
      try {
        const data = await getLoyaltyUsers(appId, token);
        setUsers(data); // array o null (404 → card no configurada)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los usuarios.',
        );
      }
    };

    const fetchRedemptions = async () => {
      try {
        const data = await getLoyaltyRedemptions(appId, token);
        setRedemptions(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el historial de canjes.',
        );
      }
    };

    const fetchStats = async () => {
      try {
        setStats(await getLoyaltyStats(appId, token));
      } catch (err) {
        // Stats secundarias: si fallan, las cards no se renderizan pero
        // users + redemptions siguen visibles. No silencioso del todo:
        // console.error deja rastro. Patrón calcado de OrdersAdminPage.
        // eslint-disable-next-line no-console
        console.error('[LoyaltyAdminPage] stats fetch failed:', err);
      }
    };

    Promise.all([fetchUsers(), fetchRedemptions(), fetchStats()]).finally(() =>
      setInitialLoading(false),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, token]);

  if (!appId || !token) return null;

  return (
    <DataAdminShell
      title="Lealtad"
      description="Gestiona los usuarios con tarjeta de lealtad y revisa el historial de canjes."
      backHref={`/apps/${appId}/edit`}
      loading={initialLoading}
      error={error}
      statsCards={stats && <LoyaltyStatsCards stats={stats} />}
    >
      {/* Tras initialLoading=false, el Shell pasa por aquí. Tres ramas
          internas, gateadas por !error para no pintar contenido parcial
          cuando el Shell ya muestra el banner del fallo:
            - Ambos === null  → card no configurada (404 simétrico backend).
            - Ambos arrays    → contenido real (incluso si están vacíos).
            - Cualquier otro  → null aquí, el banner del Shell habla solo. */}
      {!error && users === null && redemptions === null && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-700 mb-2">
            La tarjeta de lealtad aún no está configurada para esta app.
          </p>
          <Link
            to={`/apps/${appId}/edit`}
            className="text-sm text-primary font-medium hover:opacity-80"
          >
            Configurar tarjeta en el módulo →
          </Link>
        </div>
      )}

      {!error && Array.isArray(users) && Array.isArray(redemptions) && (
        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Usuarios con tarjeta ({users.length})
            </h2>
            <WorkflowInbox<LoyaltyUserCardItem>
              items={users}
              getItemId={(u) => u.appUserId}
              renderRow={(u) => <LoyaltyUserRow user={u} />}
              emptyMessage="Aún no hay usuarios con sellos en la tarjeta."
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Historial de canjes ({redemptions.length})
            </h2>
            <WorkflowInbox<LoyaltyRedemptionItem>
              items={redemptions}
              getItemId={(r) => r.id}
              renderRow={(r) => <RedemptionRow redemption={r} />}
              emptyMessage="Aún no se han canjeado recompensas."
            />
          </section>
        </div>
      )}
    </DataAdminShell>
  );
};
