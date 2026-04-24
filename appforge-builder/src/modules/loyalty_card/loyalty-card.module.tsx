import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import type { ModuleDefinition } from '../base/module.interface';
import { uploadFile, setupLoyalty, getLoyaltyConfig, getLoyaltyStats } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Loader2, Users, Stamp, Trophy, ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';

/* ─── Schema ─── */

const stampIcons = ['star', 'coffee', 'heart', 'check', 'gift'] as const;

const LoyaltyCardSchema = z.object({
  title: z.string(),
  description: z.string(),
  totalStamps: z.number().min(4).max(20),
  reward: z.string(),
  rewardDescription: z.string(),
  cardColor: z.string(),
  stampIcon: z.enum(stampIcons),
  logoUrl: z.string(),
  termsText: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type LoyaltyCardConfig = z.infer<typeof LoyaltyCardSchema>;

const defaultConfig: LoyaltyCardConfig = {
  title: 'Mi Tarjeta de Lealtad',
  description: 'Acumula sellos y obtén tu recompensa',
  totalStamps: 10,
  reward: 'Café gratis',
  rewardDescription: 'Al completar todos los sellos, obtén tu recompensa totalmente gratis.',
  cardColor: '#4F46E5',
  stampIcon: 'coffee',
  logoUrl: '',
  termsText: 'Válido en todas nuestras sucursales. No acumulable con otras promociones.',
};

/* ─── Stamp Icon Renderer ─── */

const StampIconSvg: React.FC<{ icon: typeof stampIcons[number]; size?: number; className?: string; style?: React.CSSProperties }> = ({ icon, size = 20, className = '', style }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className, style };
  switch (icon) {
    case 'star':
      return <svg {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
    case 'coffee':
      return <svg {...props}><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><line x1="6" x2="6" y1="2" y2="4" /><line x1="10" x2="10" y1="2" y2="4" /><line x1="14" x2="14" y1="2" y2="4" /></svg>;
    case 'heart':
      return <svg {...props}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>;
    case 'check':
      return <svg {...props}><polyline points="20 6 9 17 4 12" /></svg>;
    case 'gift':
      return <svg {...props}><polyline points="20 12 20 22 4 22 4 12" /><rect width="20" height="5" x="2" y="7" /><line x1="12" x2="12" y1="22" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>;
  }
};

const stampIconLabels: Record<typeof stampIcons[number], string> = {
  star: 'Estrella',
  coffee: 'Café',
  heart: 'Corazón',
  check: 'Check',
  gift: 'Regalo',
};

/* ─── Helpers ─── */

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function contrastColor(hex: string) {
  try {
    const { r, g, b } = hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#1f2937' : '#ffffff';
  } catch {
    return '#ffffff';
  }
}

/* ─── PreviewComponent ─── */

const PreviewComponent: React.FC<{ data: LoyaltyCardConfig; isSelected: boolean }> = ({ data, isSelected }) => {
  const demoStamped = Math.min(Math.floor(data.totalStamps * 0.4), data.totalStamps);
  const fg = contrastColor(data.cardColor);
  const fgMuted = fg === '#ffffff' ? 'rgba(255,255,255,0.5)' : 'rgba(31,41,55,0.35)';

  return (
    <div className={`rounded-xl overflow-hidden ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Card */}
      <div
        className="p-5 relative"
        style={{ backgroundColor: data.cardColor }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {data.logoUrl ? (
            <img src={resolveAssetUrl(data.logoUrl)} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/20" />
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: fg === '#ffffff' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}>
              <StampIconSvg icon={data.stampIcon} size={22} style={{ color: fg } as React.CSSProperties} />
            </div>
          )}
          <div>
            <h3 className="font-bold text-sm leading-tight" style={{ color: fg }}>{data.title}</h3>
            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: fgMuted }}>{data.description}</p>
          </div>
        </div>

        {/* Stamps grid */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(data.totalStamps, 5)}, 1fr)` }}>
          {Array.from({ length: data.totalStamps }).map((_, i) => {
            const isStamped = i < demoStamped;
            const isReward = i === data.totalStamps - 1;
            return (
              <div
                key={i}
                className="aspect-square rounded-xl flex items-center justify-center transition-all"
                style={{
                  backgroundColor: isStamped
                    ? (fg === '#ffffff' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)')
                    : (fg === '#ffffff' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                  outline: isReward ? `2px solid ${fg === '#ffffff' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)'}` : undefined,
                  outlineOffset: isReward ? '-1px' : undefined,
                }}
              >
                {isStamped ? (
                  <StampIconSvg icon={data.stampIcon} size={18} style={{ color: fg } as React.CSSProperties} />
                ) : isReward ? (
                  <StampIconSvg icon="gift" size={18} style={{ color: fgMuted } as React.CSSProperties} />
                ) : (
                  <span className="text-[10px] font-medium" style={{ color: fgMuted }}>{i + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Reward text */}
        <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${fgMuted}` }}>
          <div className="flex items-center gap-1.5">
            <StampIconSvg icon="gift" size={14} style={{ color: fg } as React.CSSProperties} />
            <span className="text-xs font-semibold" style={{ color: fg }}>Recompensa: {data.reward}</span>
          </div>
          <p className="text-[10px] mt-1 leading-relaxed" style={{ color: fgMuted }}>{data.rewardDescription}</p>
        </div>
      </div>

      {/* Terms */}
      {data.termsText && (
        <div className="bg-gray-50 px-4 py-2.5">
          <p className="text-[9px] text-gray-400 leading-relaxed">{data.termsText}</p>
        </div>
      )}
    </div>
  );
};

/* ─── RuntimeComponent ─── */

const RuntimeComponent: React.FC<{ data: LoyaltyCardConfig }> = () => (
  <div className="p-6 text-center text-gray-500">
    <StampIconSvg icon="star" size={32} className="mx-auto mb-2 text-gray-300" />
    <p className="text-sm font-medium">Tarjeta de Lealtad</p>
    <p className="text-xs mt-1">El escaneo de sellos estará disponible en la app generada con Capacitor.</p>
  </div>
);

/* ─── SettingsPanel ─── */

const SettingsPanel: React.FC<{ data: LoyaltyCardConfig; onChange: (d: LoyaltyCardConfig) => void }> = ({ data, onChange }) => {
  const token = useAuthStore((s) => s.token);
  const [uploading, setUploading] = useState(false);
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [configExists, setConfigExists] = useState(false);
  const [stats, setStats] = useState<{ activeUsers: number; stampsThisMonth: number; totalRedemptions: number } | null>(null);
  const [businessOpen, setBusinessOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(false);

  const update = <K extends keyof LoyaltyCardConfig>(key: K, value: LoyaltyCardConfig[K]) => {
    onChange({ ...data, [key]: value });
  };

  // Load existing config + stats
  const loadData = useCallback(async () => {
    if (!data.appId || !token) return;
    try {
      const [config, s] = await Promise.all([
        getLoyaltyConfig(data.appId),
        getLoyaltyStats(data.appId, token),
      ]);
      if (config) setConfigExists(true);
      setStats(s);
    } catch { /* ignore */ }
  }, [data.appId, token]);

  useEffect(() => { loadData(); }, [loadData, data._refreshKey]);

  const handleSavePin = async () => {
    if (!data.appId || !token) {
      alert('Guarda la app primero para configurar el PIN.');
      return;
    }
    if (pin.length < 6) {
      alert('El PIN debe tener al menos 6 caracteres.');
      return;
    }
    setSaving(true);
    setSaveMsg('');
    try {
      await setupLoyalty(data.appId, {
        totalStamps: data.totalStamps,
        reward: data.reward,
        rewardDescription: data.rewardDescription,
        pin,
      }, token);
      setConfigExists(true);
      setSaveMsg('Configuración guardada correctamente');
      setPin('');
      onChange({ ...data, _refreshKey: Date.now() });
    } catch (err: any) {
      setSaveMsg(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar 2 MB.');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadFile(file, token);
      update('logoUrl', res.url);
    } catch {
      alert('Error al subir imagen.');
    } finally {
      setUploading(false);
    }
  };

  const stampPageUrl = data.appId ? `${window.location.origin}/stamp/${data.appId}` : '';

  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white';

  return (
    <div className="space-y-5">
      {/* Configuración del negocio (PIN) */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setBusinessOpen(!businessOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
          <span className="text-sm font-semibold text-gray-700">Configuración del negocio</span>
          {businessOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        {businessOpen && (
          <div className="p-4 space-y-3">
            <div>
              <label className={labelCls}>PIN del negocio (mín. 6 dígitos)</label>
              <input
                type="password"
                className={inputCls}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={configExists ? '••••••  (dejar vacío para no cambiar)' : 'Mínimo 6 dígitos'}
                pattern="[0-9a-zA-Z]{6,}"
              />
              <p className="text-[10px] text-gray-400 mt-1">Este PIN se usará en la página de sellado para verificar que es el negocio quien sella.</p>
            </div>
            <button
              onClick={handleSavePin}
              disabled={saving || (!pin && !configExists)}
              className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {configExists ? 'Actualizar configuración' : 'Guardar configuración'}
            </button>
            {saveMsg && (
              <p className={`text-xs text-center ${saveMsg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{saveMsg}</p>
            )}

            {/* Stamp page link */}
            {configExists && stampPageUrl && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <LinkIcon size={12} className="text-blue-500" />
                  <span className="text-xs font-semibold text-blue-700">Página de sellado</span>
                </div>
                <p className="text-[10px] text-blue-600 break-all font-mono">{stampPageUrl}</p>
                <div className="flex gap-3 mt-1.5">
                  <button
                    onClick={() => navigator.clipboard.writeText(stampPageUrl)}
                    className="text-[10px] text-blue-500 hover:text-blue-700 font-medium"
                  >
                    Copiar enlace
                  </button>
                  <a
                    href={stampPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-500 hover:text-blue-700 font-medium"
                  >
                    Abrir página ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setStatsOpen(!statsOpen)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
          <span className="text-sm font-semibold text-gray-700">Estadísticas</span>
          {statsOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        {statsOpen && (
          <div className="p-4">
            {!data.appId ? (
              <p className="text-xs text-gray-400 text-center py-4">Guarda la app para ver estadísticas</p>
            ) : !stats ? (
              <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Usuarios', value: stats.activeUsers, icon: Users },
                  { label: 'Sellos/mes', value: stats.stampsThisMonth, icon: Stamp },
                  { label: 'Canjes', value: stats.totalRedemptions, icon: Trophy },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <Icon size={14} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-bold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Información general */}
      <section>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Información general</h4>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Título</label>
            <input className={inputCls} value={data.title} onChange={(e) => update('title', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <input className={inputCls} value={data.description} onChange={(e) => update('description', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Texto de recompensa</label>
            <input className={inputCls} value={data.reward} onChange={(e) => update('reward', e.target.value)} placeholder="Ej: Café gratis" />
          </div>
          <div>
            <label className={labelCls}>Descripción de la recompensa</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={data.rewardDescription} onChange={(e) => update('rewardDescription', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Sellos */}
      <section>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Configuración de sellos</h4>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Número de sellos ({data.totalStamps})</label>
            <input
              type="range"
              min={4}
              max={20}
              value={data.totalStamps}
              onChange={(e) => update('totalStamps', Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>4</span>
              <span>20</span>
            </div>
          </div>

          <div>
            <label className={labelCls}>Icono del sello</label>
            <div className="grid grid-cols-5 gap-2">
              {stampIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => update('stampIcon', icon)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                    data.stampIcon === icon
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-100 hover:border-gray-200 text-gray-500'
                  }`}
                >
                  <StampIconSvg icon={icon} size={20} />
                  <span className="text-[9px] font-medium">{stampIconLabels[icon]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Apariencia */}
      <section>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Apariencia</h4>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Color de la tarjeta</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.cardColor}
                onChange={(e) => update('cardColor', e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                className={`${inputCls} flex-1 font-mono text-xs`}
                value={data.cardColor}
                onChange={(e) => {
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) update('cardColor', e.target.value);
                }}
                maxLength={7}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Logo del negocio</label>
            {data.logoUrl ? (
              <div className="flex items-center gap-3">
                <img src={resolveAssetUrl(data.logoUrl)} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                <div className="flex gap-2">
                  <label className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                    Cambiar
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  <button type="button" onClick={() => update('logoUrl', '')} className="text-xs text-red-500 hover:text-red-600 font-medium">
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <label className={`flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg py-4 cursor-pointer hover:border-gray-300 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="text-center">
                  <svg className="w-6 h-6 text-gray-300 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-xs text-gray-400">{uploading ? 'Subiendo...' : 'Subir logo (máx. 2 MB)'}</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            )}
          </div>
        </div>
      </section>

      {/* Términos */}
      <section>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Términos y condiciones</h4>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          value={data.termsText}
          onChange={(e) => update('termsText', e.target.value)}
          placeholder="Ej: Válido en todas nuestras sucursales..."
        />
      </section>
    </div>
  );
};

/* ─── Module Definition ─── */

export const LoyaltyCardModule: ModuleDefinition<LoyaltyCardConfig> = {
  id: 'loyalty_card',
  name: 'Tarjeta de Lealtad',
  icon: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  description: 'Tarjeta de sellos de lealtad para premiar clientes frecuentes',
  schema: LoyaltyCardSchema,
  defaultConfig,
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
