import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Power, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import {
  getDiscountCoupons,
  createDiscountCoupon,
  updateDiscountCoupon,
  deleteDiscountCoupon,
  generateCouponCode,
  getCouponRedemptions,
  resetCouponRedemptions,
  type DiscountCoupon,
  type CouponRedemptionItem,
} from '../lib/api';
import {
  getCouponStatus,
  STATUS_STYLES,
  formatDiscount,
  formatDate,
  type CouponStatus,
} from '../lib/coupon-helpers';
import { DataAdminShell } from '../components/admin/DataAdminShell';
import { WorkflowInbox } from '../components/admin/WorkflowInbox';
import { FormModal } from '../components/admin/FormModal';
import { useConfirm } from '../components/admin/ConfirmDialog';
import type { RowAction, StatusOption } from '../components/admin/types';

type FilterValue = 'ALL' | CouponStatus;

const STATUS_OPTIONS: StatusOption<FilterValue>[] = [
  { value: 'ALL',      label: 'Todas' },
  { value: 'active',   label: 'Activos' },
  { value: 'expired',  label: 'Expirados' },
  { value: 'depleted', label: 'Agotados' },
  { value: 'inactive', label: 'Inactivos' },
];

interface CouponFormData {
  title: string;
  description: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: string;
  conditions: string;
  maxUses: string;
  validFrom: string;
  validUntil: string;
}

// Payloads tipados desde la firma real de lib/api, no cast — evita arrastrar
// la deuda del módulo viejo que castea para enmascarar discountValue (string
// en DiscountCoupon, number en el payload). Aquí la conversión es explícita
// (parseFloat) y los tipos cuadran solos.
type CouponCreatePayload = Parameters<typeof createDiscountCoupon>[1];
type CouponUpdatePayload = Parameters<typeof updateDiscountCoupon>[2];

const emptyForm = (): CouponFormData => ({
  title: '',
  description: '',
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  conditions: '',
  maxUses: '',
  validFrom: '',
  validUntil: '',
});

// imageUrl NO entra al form (TECH_DEBT #13 lo registra: el módulo viejo
// lo cargaba al state pero nunca exponía UI para editarlo). El update del
// backend hace merge (verificado en service.ts:87-114), así que omitirlo
// preserva el imageUrl existente del cupón. Si se quiere editar, abre #13.
const toFormData = (c: DiscountCoupon): CouponFormData => ({
  title: c.title,
  description: c.description ?? '',
  code: c.code,
  discountType: c.discountType,
  discountValue: parseFloat(c.discountValue).toString(),
  conditions: c.conditions ?? '',
  maxUses: c.maxUses?.toString() ?? '',
  validFrom: c.validFrom ? c.validFrom.slice(0, 10) : '',
  validUntil: c.validUntil ? c.validUntil.slice(0, 10) : '',
});

const isFormValid = (form: CouponFormData): boolean =>
  form.title.trim() !== '' &&
  form.code.trim() !== '' &&
  form.discountValue !== '' &&
  parseFloat(form.discountValue) > 0;

const buildCreatePayload = (form: CouponFormData): CouponCreatePayload => {
  const p: CouponCreatePayload = {
    title: form.title.trim(),
    code: form.code.trim(),
    discountType: form.discountType,
    discountValue: parseFloat(form.discountValue),
  };
  if (form.description.trim()) p.description = form.description.trim();
  if (form.conditions.trim()) p.conditions = form.conditions.trim();
  if (form.maxUses) p.maxUses = parseInt(form.maxUses, 10);
  if (form.validFrom) p.validFrom = form.validFrom;
  if (form.validUntil) p.validUntil = form.validUntil;
  return p;
};

const buildUpdatePayload = (form: CouponFormData): CouponUpdatePayload => {
  const p: CouponUpdatePayload = {
    title: form.title.trim(),
    code: form.code.trim(),
    discountType: form.discountType,
    discountValue: parseFloat(form.discountValue),
  };
  if (form.description.trim()) p.description = form.description.trim();
  if (form.conditions.trim()) p.conditions = form.conditions.trim();
  if (form.maxUses) p.maxUses = parseInt(form.maxUses, 10);
  if (form.validFrom) p.validFrom = form.validFrom;
  if (form.validUntil) p.validUntil = form.validUntil;
  return p;
};

// Tres ramas del render por redemption: appUser presente (nombre+email),
// solo deviceId (anónimo identificable), ninguno (anónimo fallback).
// Cubre tanto el caso de canjes públicos como el de appUser borrado tras
// canjear (relación con onDelete: SetNull en CouponRedemption.appUserId).
const renderRedemptionWho = (r: CouponRedemptionItem): string => {
  if (r.appUser?.email) {
    const name = [r.appUser.firstName, r.appUser.lastName].filter(Boolean).join(' ');
    return name ? `${name} (${r.appUser.email})` : r.appUser.email;
  }
  if (r.deviceId) {
    return `Anónimo (${r.deviceId.slice(0, 8)}…)`;
  }
  return 'Anónimo';
};

// Toggle activar/desactivar partido en dos RowAction con isAvailable
// excluyentes — RowAction no soporta label/confirm como función de item.
// Activar es benigno (sin confirm); desactivar saca el cupón de
// circulación y merece confirmación.
const buildRowActions = (
  appId: string,
  token: string,
  refetch: () => Promise<void>,
  openEdit: (c: DiscountCoupon) => void,
): RowAction<DiscountCoupon>[] => [
  {
    id: 'activate',
    label: 'Activar cupón',
    icon: <Power size={16} />,
    variant: 'success',
    isAvailable: (c) => !c.isActive,
    onClick: async (c) => {
      await updateDiscountCoupon(appId, c.id, { isActive: true }, token);
      await refetch();
    },
  },
  {
    id: 'deactivate',
    label: 'Desactivar cupón',
    icon: <Power size={16} />,
    variant: 'warning',
    isAvailable: (c) => c.isActive,
    confirm: {
      title: '¿Desactivar este cupón?',
      description:
        'El cupón dejará de poder canjearse hasta que lo reactives. El historial de canjes y los datos se conservan.',
      confirmLabel: 'Desactivar',
      cancelLabel: 'Mantener activo',
      variant: 'primary',
    },
    onClick: async (c) => {
      await updateDiscountCoupon(appId, c.id, { isActive: false }, token);
      await refetch();
    },
  },
  {
    id: 'edit',
    label: 'Editar cupón',
    icon: <Pencil size={16} />,
    variant: 'primary',
    // RowAction.onClick está tipado como (item: T) => Promise<void>. Abrir
    // un modal es síncrono y devuelve void, así que se marca async para
    // satisfacer el contrato sin cambiar comportamiento. Patrón cubierto
    // como deuda futura: RowAction.onClick debería aceptar
    // void | Promise<void> (mismo enfoque que FormModal.onSave).
    onClick: async (c) => { openEdit(c); },
  },
  {
    id: 'delete',
    label: 'Eliminar cupón',
    icon: <Trash2 size={16} />,
    variant: 'destructive',
    confirm: {
      title: '¿Eliminar este cupón?',
      description:
        'El cupón se eliminará permanentemente. Si tiene canjes registrados también se borrarán (cascada de BD en CouponRedemption). Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Mantener',
      variant: 'destructive',
    },
    onClick: async (c) => {
      await deleteDiscountCoupon(appId, c.id, token);
      await refetch();
    },
  },
];

const CouponForm: FC<{
  form: CouponFormData;
  onChange: (form: CouponFormData) => void;
  onGenCode: () => void;
  generatingCode: boolean;
  currency: string;
}> = ({ form, onChange, onGenCode, generatingCode, currency }) => {
  const update = <K extends keyof CouponFormData>(key: K, value: CouponFormData[K]) =>
    onChange({ ...form, [key]: value });

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Ej: Muestra este código en caja para canjear tu descuento"
          className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Código *</label>
        <div className="flex gap-2 items-stretch">
          <input
            type="text"
            value={form.code}
            onChange={(e) => update('code', e.target.value.toUpperCase())}
            className="flex-1 text-sm border border-gray-300 rounded px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <button
            type="button"
            onClick={onGenCode}
            disabled={generatingCode}
            className="flex items-center gap-1 text-xs text-primary hover:bg-primary/5 px-3 py-2 border border-gray-300 rounded disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={12} className={generatingCode ? 'animate-spin' : ''} />
            Generar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
          <select
            value={form.discountType}
            onChange={(e) =>
              update('discountType', e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT')
            }
            className="w-full text-sm border border-gray-300 rounded px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="PERCENTAGE">Porcentaje (%)</option>
            <option value="FIXED_AMOUNT">Monto fijo ({currency})</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Valor *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.discountValue}
            onChange={(e) => update('discountValue', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Máx. usos</label>
          <input
            type="number"
            min="0"
            value={form.maxUses}
            onChange={(e) => update('maxUses', e.target.value)}
            placeholder="∞"
            className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Condiciones</label>
        <input
          type="text"
          value={form.conditions}
          onChange={(e) => update('conditions', e.target.value)}
          placeholder="Opcional"
          className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Válido desde</label>
          <input
            type="date"
            value={form.validFrom}
            onChange={(e) => update('validFrom', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Válido hasta</label>
          <input
            type="date"
            value={form.validUntil}
            onChange={(e) => update('validUntil', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
};

// useConfirm vive dentro de CouponRow porque el reset destructivo NO es un
// RowAction (vive en el acordeón, no en la barra de acciones de fila).
// Cada fila monta su propio dialog state local — solo uno está visible a
// la vez (el de la fila ejecutando el confirm).
const CouponRow: FC<{
  coupon: DiscountCoupon;
  appId: string;
  token: string;
  actions: ReactNode;
  onAfterReset: () => Promise<void>;
}> = ({ coupon, appId, token, actions, onAfterReset }) => {
  const [open, setOpen] = useState(false);
  const [redemptions, setRedemptions] = useState<CouponRedemptionItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const status = getCouponStatus(coupon);
  const style = STATUS_STYLES[status];

  const handleToggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && redemptions === null) {
      setLoading(true);
      setRowError(null);
      try {
        const r = await getCouponRedemptions(appId, coupon.id, token);
        setRedemptions(r);
      } catch (err) {
        setRowError(
          err instanceof Error ? err.message : 'No se pudieron cargar los canjes.',
        );
      } finally {
        setLoading(false);
      }
    }
  }, [open, redemptions, appId, coupon.id, token]);

  const handleReset = useCallback(async () => {
    const ok = await confirm({
      title: '¿Resetear los canjes de este cupón?',
      description:
        'Se borrarán permanentemente todas las filas del historial de canjes (quién canjeó, cuándo, desde qué dispositivo). El contador volverá a cero. Esta acción no se puede deshacer.',
      confirmLabel: 'Resetear canjes',
      cancelLabel: 'Mantener historial',
      variant: 'destructive',
    });
    if (!ok) return;
    setResetting(true);
    setRowError(null);
    try {
      await resetCouponRedemptions(appId, coupon.id, token);
      setRedemptions([]);
      await onAfterReset();
    } catch (err) {
      setRowError(
        err instanceof Error ? err.message : 'No se pudo resetear el historial.',
      );
    } finally {
      setResetting(false);
    }
  }, [appId, coupon.id, token, confirm, onAfterReset]);

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center gap-3">
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>
        <h3 className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">
          {coupon.title}
        </h3>
        {actions}
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="font-mono bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-gray-800">
          {coupon.code}
        </span>
        <span className="font-bold text-primary">{formatDiscount(coupon, '€')}</span>
        <span>
          Canjeado {coupon.currentUses}
          {coupon.maxUses ? `/${coupon.maxUses}` : ''} veces
        </span>
      </div>

      <div className="pt-1 border-t border-gray-100">
        <button
          type="button"
          onClick={handleToggle}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Historial de canjes
        </button>

        {open && (
          <div className="mt-2 space-y-2">
            {loading ? (
              <p className="text-xs text-gray-400 text-center py-3">Cargando…</p>
            ) : rowError ? (
              <p className="text-xs text-red-500 text-center py-3">{rowError}</p>
            ) : redemptions === null || redemptions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">Sin canjes</p>
            ) : (
              <>
                <ul className="space-y-1">
                  {redemptions.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-xs"
                    >
                      <span className="text-gray-700 truncate">
                        {renderRedemptionWho(r)}
                      </span>
                      <span className="text-gray-400 shrink-0 ml-2">
                        {formatDate(r.redeemedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
                {coupon.currentUses > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={resetting}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 pt-1 transition-colors"
                  >
                    <RefreshCw
                      size={12}
                      className={resetting ? 'animate-spin' : ''}
                    />
                    Resetear canjes
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {dialog}
    </div>
  );
};

export const CouponsAdminPage: FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);

  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterValue>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  const fetchCoupons = useCallback(async () => {
    if (!appId || !token) return;
    setError(null);
    try {
      const data = await getDiscountCoupons(appId, token);
      setCoupons(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar los cupones.',
      );
    }
  }, [appId, token]);

  // Carga inicial: bloquea el Shell solo la primera vez (gate #2).
  useEffect(() => {
    if (!appId || !token) return;
    setInitialLoading(true);
    fetchCoupons().finally(() => setInitialLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, token]);

  // Filtro client-side: el backend no acepta ?status, y getCouponStatus se
  // calcula localmente. Cambiar pill no dispara fetch, solo filtra el array
  // ya cargado — más simple que el refetching de BookingsPage.
  const filteredCoupons = useMemo(
    () =>
      statusFilter === 'ALL'
        ? coupons
        : coupons.filter((c) => getCouponStatus(c) === statusFilter),
    [coupons, statusFilter],
  );

  const openNew = useCallback(() => {
    setEditingId(null);
    setFormData(emptyForm());
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((c: DiscountCoupon) => {
    setEditingId(c.id);
    setFormData(toFormData(c));
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm());
  }, []);

  const handleGenCode = useCallback(async () => {
    if (!appId || !token) return;
    setGeneratingCode(true);
    try {
      const { code } = await generateCouponCode(appId, token);
      setFormData((prev) => ({ ...prev, code }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo generar el código.',
      );
    } finally {
      setGeneratingCode(false);
    }
  }, [appId, token]);

  const handleSave = useCallback(async () => {
    if (!appId || !token) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateDiscountCoupon(
          appId,
          editingId,
          buildUpdatePayload(formData),
          token,
        );
      } else {
        await createDiscountCoupon(appId, buildCreatePayload(formData), token);
      }
      closeModal();
      await fetchCoupons();
    } catch (err) {
      // Modal queda abierto — FormModal no autocierra, el caller decide.
      setError(err instanceof Error ? err.message : 'Error al guardar el cupón.');
    } finally {
      setSaving(false);
    }
  }, [appId, token, editingId, formData, closeModal, fetchCoupons]);

  const rowActions = useMemo(
    () =>
      appId && token ? buildRowActions(appId, token, fetchCoupons, openEdit) : [],
    [appId, token, fetchCoupons, openEdit],
  );

  // Hooks todos arriba. El short-circuit por falta de appId/token sale
  // DESPUÉS para respetar rules-of-hooks (TECH_DEBT #54).
  if (!appId || !token) return null;

  return (
    <DataAdminShell
      title="Cupones"
      description="Gestiona los cupones de descuento de tu app: crea, edita, activa/desactiva y revisa el historial de canjes."
      backHref={`/apps/${appId}/edit`}
      loading={initialLoading}
      error={error}
    >
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1.5 bg-primary hover:opacity-90 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
        >
          <Plus size={16} /> Nuevo cupón
        </button>
      </div>

      <WorkflowInbox<DiscountCoupon, FilterValue>
        items={filteredCoupons}
        getItemId={(c) => c.id}
        statusOptions={STATUS_OPTIONS}
        currentStatus={statusFilter}
        onStatusChange={setStatusFilter}
        renderRow={(c, actions) => (
          <CouponRow
            coupon={c}
            appId={appId}
            token={token}
            actions={actions}
            onAfterReset={fetchCoupons}
          />
        )}
        rowActions={rowActions}
        emptyMessage="Aún no hay cupones. Crea el primero con el botón de arriba."
        onActionError={(err) => {
          setError(
            err instanceof Error ? err.message : 'Error al procesar la acción.',
          );
        }}
      />

      <FormModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar cupón' : 'Nuevo cupón'}
        onSave={handleSave}
        saving={saving}
        saveLabel={editingId ? 'Guardar' : 'Crear cupón'}
        disableSave={!isFormValid(formData)}
      >
        <CouponForm
          form={formData}
          onChange={setFormData}
          onGenCode={handleGenCode}
          generatingCode={generatingCode}
          currency="€"
        />
      </FormModal>
    </DataAdminShell>
  );
};
