import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { listPlans, updatePlan, listTenants } from '../lib/api';
import type { SubscriptionPlan, PlanType } from '../lib/api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Check, X, Pencil } from 'lucide-react';

export const PlansPage: React.FC = () => {
  const token = useAuthStore((s) => s.token)!;
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ planType: PlanType; field: string; value: string } | null>(null);
  const [confirmData, setConfirmData] = useState<{
    planType: PlanType;
    field: string;
    oldValue: number;
    newValue: number;
    tenantsCount: number;
    planName: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listPlans(token)
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const startEdit = (planType: PlanType, field: string, currentValue: string | number | boolean) => {
    setEditing({ planType, field, value: String(currentValue) });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    const plan = plans.find((p) => p.planType === editing.planType);
    if (!plan) return;

    const { field, value } = editing;

    // Parse value based on field type
    let parsedValue: string | number | boolean;
    if (field === 'name') {
      parsedValue = value;
    } else if (field === 'canBuild' || field === 'isWhiteLabel') {
      parsedValue = value === 'true';
    } else {
      parsedValue = Number(value);
      if (isNaN(parsedValue as number)) return;
    }

    // Check if reducing a numeric limit
    const numericLimitFields = ['maxApps', 'maxBuildsPerMonth', 'storageGb'];
    if (numericLimitFields.includes(field)) {
      const oldValue = plan[field as keyof SubscriptionPlan] as number;
      const newValue = parsedValue as number;
      if (newValue < oldValue) {
        // Count tenants with this plan
        try {
          const res = await listTenants(token, { planType: plan.planType, limit: 1 });
          setConfirmData({
            planType: plan.planType,
            field,
            oldValue,
            newValue,
            tenantsCount: res.total,
            planName: plan.name,
          });
          return; // Wait for confirmation
        } catch {
          // proceed without confirmation
        }
      }
    }

    await doSave(editing.planType, field, parsedValue);
  };

  const doSave = async (planType: PlanType, field: string, value: string | number | boolean) => {
    setSaving(true);
    try {
      const updated = await updatePlan(token, planType, { [field]: value });
      setPlans((prev) => prev.map((p) => (p.planType === planType ? updated : p)));
      setEditing(null);
      setConfirmData(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al guardar plan');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = () => {
    if (!confirmData) return;
    doSave(confirmData.planType, confirmData.field, confirmData.newValue);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  const editableFields: Array<{
    key: keyof SubscriptionPlan;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'currency';
  }> = [
    { key: 'name', label: 'Nombre', type: 'text' },
    { key: 'maxApps', label: 'Max Apps', type: 'number' },
    { key: 'maxBuildsPerMonth', label: 'Max Builds/mes', type: 'number' },
    { key: 'storageGb', label: 'Storage (GB)', type: 'number' },
    { key: 'priceMonthly', label: 'Precio/mes ($)', type: 'currency' },
    { key: 'canBuild', label: 'Puede compilar', type: 'boolean' },
    { key: 'isWhiteLabel', label: 'White Label', type: 'boolean' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Planes</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.planType} className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-red-600">
              <h3 className="text-white font-bold text-lg">{plan.name}</h3>
              <p className="text-white/70 text-xs uppercase tracking-wider">{plan.planType}</p>
            </div>

            <div className="p-5 space-y-3">
              {editableFields.map(({ key, label, type }) => {
                const isEditing = editing?.planType === plan.planType && editing?.field === key;
                const rawValue = plan[key];

                return (
                  <div key={key} className="flex items-center justify-between group">
                    <span className="text-xs text-gray-500">{label}</span>
                    {isEditing ? (
                      <div className="flex items-center space-x-1">
                        {type === 'boolean' ? (
                          <select
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                          >
                            <option value="true">Sí</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <input
                            type={type === 'text' ? 'text' : 'number'}
                            step={type === 'currency' ? '0.01' : '1'}
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        )}
                        <button onClick={saveEdit} disabled={saving} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium text-gray-900">
                          {type === 'boolean'
                            ? rawValue ? 'Sí' : 'No'
                            : type === 'currency'
                              ? `$${rawValue}`
                              : String(rawValue)}
                        </span>
                        <button
                          onClick={() => startEdit(plan.planType, key, rawValue as string | number | boolean)}
                          className="p-1 text-gray-300 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmData !== null}
        title="Reducción de límite"
        message={
          confirmData
            ? `Hay ${confirmData.tenantsCount} tenant(s) con plan "${confirmData.planName}".\n\nReducir ${confirmData.field} de ${confirmData.oldValue} a ${confirmData.newValue} puede dejar clientes en estado inconsistente.\n\n¿Continuar?`
            : ''
        }
        confirmLabel="Reducir límite"
        variant="warning"
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmData(null); setEditing(null); }}
        loading={saving}
      />
    </div>
  );
};
