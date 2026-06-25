import React from 'react';
import { Outlet } from 'react-router-dom';
import { Stamp, ShoppingBag, Calendar, Bell } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      {/* Keyframes locales del visual del builder. Aislados en este layout
          (solo la ruta /auth los carga). prefers-reduced-motion los apaga. */}
      <style>{`
        @keyframes auth-window-enter {
          0%   { opacity: 0; transform: translateY(8px); filter: blur(6px); }
          100% { opacity: 1; transform: translateY(0);  filter: blur(0); }
        }
        @keyframes auth-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes auth-pulse {
          0%, 100% { box-shadow: inset 0 0 0 1px rgba(99,102,241,0.45), 0 0 0 0 rgba(99,102,241,0); }
          50%      { box-shadow: inset 0 0 0 1px rgba(99,102,241,0.75), 0 0 0 4px rgba(99,102,241,0.18); }
        }
        @keyframes auth-stampin {
          0%   { transform: scale(0.55); opacity: 0; }
          30%  { transform: scale(1);    opacity: 1; }
          80%  { transform: scale(1);    opacity: 1; }
          100% { transform: scale(0.55); opacity: 0; }
        }
        .auth-window { animation: auth-window-enter 700ms ease-out both, auth-float 6s ease-in-out infinite 700ms; }
        .auth-active { animation: auth-pulse 2.4s ease-in-out infinite; }
        .auth-stamp-fill { animation: auth-stampin 3.2s ease-in-out infinite; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .auth-window, .auth-active, .auth-stamp-fill { animation: none !important; }
        }
      `}</style>

      {/* Left side: Premium Branding (Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-gray-950 flex-col justify-between p-12 relative">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[100px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen" />
          {/* Subtle dotted grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,1) 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}
          />
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-5 leading-tight">
            Diseña, construye y<br />
            escala con <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">CreaTuApp</span>.
          </h1>
          <p className="text-gray-400 max-w-md text-lg leading-relaxed">
            El constructor visual para creadores y agencias. Arrastra, suelta y publica — sin escribir una línea de código.
          </p>
        </div>

        {/* Builder visual reconstruido: paleta + lienzo de teléfono. Decorativo
            (aria-hidden), no interactivo — el form de auth vive a la derecha. */}
        <div className="relative z-10 w-full max-w-md" aria-hidden="true">
          <div
            className="auth-window rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #151519, #0c0c0f)' }}
          >
            {/* Title bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="ml-2 text-[11px] tracking-wide text-zinc-500">CreaTuApp · Builder</span>
            </div>

            <div className="flex">
              {/* Paleta */}
              <div className="w-[42%] border-r border-white/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2.5">
                  Módulos disponibles
                </div>
                <ul className="space-y-1.5">
                  <PaletteItem icon={<Stamp className="w-3.5 h-3.5" />} label="Tarjeta de Lealtad" active />
                  <PaletteItem icon={<ShoppingBag className="w-3.5 h-3.5" />} label="Catálogo" />
                  <PaletteItem icon={<Calendar className="w-3.5 h-3.5" />} label="Reservar Cita" />
                  <PaletteItem icon={<Bell className="w-3.5 h-3.5" />} label="Push Notifications" />
                </ul>
              </div>

              {/* Lienzo: mini teléfono mostrando una app de cafetería con tarjeta de lealtad */}
              <div className="w-[58%] p-4 flex items-center justify-center">
                <div
                  className="w-[152px] rounded-[18px] border border-white/10 overflow-hidden shadow-xl"
                  style={{ background: '#0a0a0b' }}
                >
                  {/* Header de la app — el único punto que se tinta con var(--primary) */}
                  <div className="px-3 py-2.5 text-white" style={{ background: 'var(--primary)' }}>
                    <div className="text-[11px] font-semibold leading-tight">Café Aurora</div>
                    <div className="text-[9px] text-white/75 leading-tight">Miembro</div>
                  </div>

                  {/* Body */}
                  <div className="px-2.5 py-2.5 space-y-2">
                    {/* Loyalty card */}
                    <div
                      className="rounded-lg border border-white/10 p-2"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="text-[8px] text-zinc-400 uppercase tracking-wide mb-1.5">
                        Tarjeta de lealtad
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {/* 3 fijos + 1 anima en bucle (3→4) + 6 vacíos */}
                        <StampDot filled />
                        <StampDot filled />
                        <StampDot filled />
                        <StampDot animatedFill />
                        <StampDot />
                        <StampDot />
                        <StampDot />
                        <StampDot />
                        <StampDot />
                        <StampDot />
                      </div>
                    </div>

                    <PhoneRow label="Pide y paga" />
                    <PhoneRow label="Ofertas para miembros" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative bg-gray-50/30">
        <div className="w-full max-w-[420px]">
          {/* Mobile Branding (hidden on lg) — mismas reglas que el TopBar */}
          <div className="lg:hidden text-center mb-10 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white font-bold text-xl shadow-lg ring-1 ring-primary/20 mb-5">
              CT
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              CreaTuApp <span className="text-gray-400 font-normal">Builder</span>
            </h1>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
};

// --- Subcomponentes locales del visual (decorativos, no se exportan) ---

const PaletteItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean }> = ({ icon, label, active }) => (
  <li
    className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${active ? 'auth-active' : ''}`}
    style={{
      background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
    }}
  >
    <span
      className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
      style={{
        background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
        color: active ? 'var(--primary)' : '#a1a1aa',
      }}
    >
      {icon}
    </span>
    <span className={`text-[11px] truncate ${active ? 'text-white font-medium' : 'text-zinc-400'}`}>
      {label}
    </span>
  </li>
);

const StampDot: React.FC<{ filled?: boolean; animatedFill?: boolean }> = ({ filled, animatedFill }) => {
  if (animatedFill) {
    return (
      <span className="relative inline-block w-3.5 h-3.5">
        <span className="absolute inset-0 rounded-full" style={{ border: '1px solid #52525b' }} />
        <span className="auth-stamp-fill absolute inset-0 rounded-full" style={{ background: 'var(--primary)' }} />
      </span>
    );
  }
  return (
    <span
      className="w-3.5 h-3.5 rounded-full"
      style={{
        background: filled ? 'var(--primary)' : 'transparent',
        border: filled ? 'none' : '1px solid #52525b',
      }}
    />
  );
};

const PhoneRow: React.FC<{ label: string }> = ({ label }) => (
  <div
    className="flex items-center gap-2 rounded-md px-2 py-1.5"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
  >
    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--primary)' }} />
    <span className="text-[10px] text-zinc-300">{label}</span>
  </div>
);
