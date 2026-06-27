import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTenantStore } from '../store/useTenantStore';
import { createFeedback } from '../lib/api';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Estados de la cara animada por rating. Los colores espejan
 * RATING_META del backend (feedback.service.ts) para coherencia visual
 * entre el preview en pantalla y el email final.
 *
 * eye/mouth llevan SOLO valores que se animan vía CSS transition. La
 * transition global vive en el className `face-shape`, así una sola
 * declaración cubre todos los valores que muten en el estilo inline.
 *
 * Mouth shape se construye con borderTop + borderBottom + borderRadius
 * en lugar de SVG dinámico:
 *   - Frunce (1-2): borderTop visible + borderBottom transparente +
 *     borderRadius arriba → arco hacia arriba (cara triste).
 *   - Recta (3): borderBottom 0 + height 2px + background visible →
 *     línea horizontal.
 *   - Sonrisa (4-5): borderBottom visible + borderTop transparente +
 *     borderRadius abajo → arco hacia abajo (cara feliz).
 * Las tres formas comparten el mismo elemento; la transition spring
 * interpola entre ellas. Sin scaleY ni transforms — los radios y los
 * grosores de borde son interpolables, y el spring se ve fluido.
 */
type FaceState = {
  color: string;
  bg: string;
  text: string;
  eye: { width: number; height: number; borderRadius: string };
  mouth: {
    width: number;
    height: number;
    borderTopWidth: number;
    borderBottomWidth: number;
    borderRadius: string;
    background: 'transparent' | 'currentColor';
  };
};

const FACE_STATES: Record<number, FaceState> = {
  0: {
    color: '#9ca3af',
    bg: '#f3f4f6',
    text: 'Toca una estrella para empezar',
    eye:   { width: 14, height: 14, borderRadius: '50%' },
    mouth: { width: 30, height: 2, borderTopWidth: 0, borderBottomWidth: 0, borderRadius: '0', background: 'currentColor' },
  },
  1: {
    color: '#ef4444',
    bg:    '#fef2f2',
    text:  '¡Vaya, lo sentimos!',
    eye:   { width: 10, height: 10, borderRadius: '50%' },
    mouth: { width: 32, height: 18, borderTopWidth: 4, borderBottomWidth: 0, borderRadius: '50% 50% 0 0 / 100% 100% 0 0', background: 'transparent' },
  },
  2: {
    color: '#f97316',
    bg:    '#fff7ed',
    text:  '¿Qué podríamos mejorar?',
    eye:   { width: 14, height: 10, borderRadius: '50%' },
    mouth: { width: 30, height: 10, borderTopWidth: 3, borderBottomWidth: 0, borderRadius: '50% 50% 0 0 / 100% 100% 0 0', background: 'transparent' },
  },
  3: {
    color: '#eab308',
    bg:    '#fefce8',
    text:  '¡Gracias! ¿Algo más?',
    eye:   { width: 14, height: 4, borderRadius: '2px' },
    mouth: { width: 28, height: 2, borderTopWidth: 0, borderBottomWidth: 0, borderRadius: '0', background: 'currentColor' },
  },
  4: {
    color: '#22c55e',
    bg:    '#f0fdf4',
    text:  '¡Genial!',
    eye:   { width: 14, height: 12, borderRadius: '50%' },
    mouth: { width: 32, height: 12, borderTopWidth: 0, borderBottomWidth: 3, borderRadius: '0 0 50% 50% / 0 0 100% 100%', background: 'transparent' },
  },
  5: {
    color: '#6366f1',
    bg:    '#eef2ff',
    text:  '¡Eres increíble!',
    eye:   { width: 16, height: 16, borderRadius: '50%' },
    mouth: { width: 38, height: 20, borderTopWidth: 0, borderBottomWidth: 4, borderRadius: '0 0 50% 50% / 0 0 100% 100%', background: 'transparent' },
  },
};

// cubic-bezier spring — overshoot pequeño y settle suave, sin librería
// de motion. Aplicado a todos los estilos del face/eye/mouth.
const SPRING = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';

export const FeedbackPage: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const brandName = useTenantStore((s) => s.branding?.brandName ?? null);

  const defaults = useMemo(() => {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return {
      name: fullName || user?.email?.split('@')[0] || '',
      email: user?.email ?? '',
      company: user?.company ?? brandName ?? '',
    };
  }, [user, brandName]);

  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [name, setName] = useState(defaults.name);
  const [email, setEmail] = useState(defaults.email);
  const [company, setCompany] = useState(defaults.company);

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const messageMax = 2000;

  // El displayRating es lo que se muestra en la cara: prioriza hover
  // para que el usuario vea cómo cambia al pasar por encima, y cae al
  // rating real cuando no hay hover.
  const displayRating = hoverRating || rating;
  const state = FACE_STATES[displayRating] ?? FACE_STATES[0];

  const canSubmit =
    !!token
    && status !== 'sending'
    && rating >= 1
    && rating <= 5
    && name.trim().length > 0
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setMessage('');
    setName(defaults.name);
    setEmail(defaults.email);
    setCompany(defaults.company);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !token) return;

    setStatus('sending');
    setErrorMsg('');

    try {
      await createFeedback(
        {
          rating,
          message: message.trim() || undefined,
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
        },
        token,
      );
      setStatus('sent');
      // Reset rating + mensaje, mantiene identidad (mismo criterio que
      // soporte: facilitar un segundo envío sin reescribir nombre/email).
      setRating(0);
      setHoverRating(0);
      setMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'No pudimos enviar tu feedback. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Feedback</h1>
        <p className="text-gray-600 text-sm">
          Cuéntanos qué te parece la plataforma. Tu opinión nos ayuda a mejorar lo que ya funciona y
          a arreglar lo que no. Basta con una estrella; el comentario es opcional.
        </p>
      </header>

      {status === 'sent' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <div className="text-sm text-green-800">
            <p className="font-semibold mb-0.5">¡Gracias por tu feedback!</p>
            <p>
              Lo hemos recibido. Si necesitamos aclarar algo, te escribiremos a <strong>{email}</strong>.
              Puedes cerrar esta pestaña o enviar otra valoración.
            </p>
            <button
              type="button"
              onClick={() => { setStatus('idle'); resetForm(); }}
              className="mt-3 text-xs font-semibold text-green-700 underline hover:text-green-900"
            >
              Enviar otro feedback
            </button>
          </div>
        </div>
      )}

      {status === 'error' && errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M5 19h14a2 2 0 002-2L13.732 4a2 2 0 00-3.464 0L3 17a2 2 0 002 2z" />
          </svg>
          <div className="text-sm text-red-800">
            <p className="font-semibold mb-0.5">No pudimos enviar tu feedback</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cara + estrellas + texto contextual */}
        <div
          className="flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border border-gray-100"
          style={{ background: state.bg, transition: SPRING, color: state.color }}
        >
          {/* Cara CSS pura. Tamaño fijo del container, los rasgos
              (ojos + boca) se posicionan absolutamente y animan con
              el spring shared. Color = state.color (currentColor del
              container exterior). */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: '#fff',
              border: `3px solid ${state.color}`,
              position: 'relative',
              transition: SPRING,
              boxShadow: `0 4px 16px ${state.color}33`,
            }}
            aria-hidden="true"
          >
            {/* Ojo izquierdo */}
            <div
              style={{
                position: 'absolute',
                top: 32,
                left: 24,
                width: state.eye.width,
                height: state.eye.height,
                borderRadius: state.eye.borderRadius,
                background: state.color,
                transition: SPRING,
                transform: 'translate(-50%, -50%)',
              }}
            />
            {/* Ojo derecho */}
            <div
              style={{
                position: 'absolute',
                top: 32,
                right: 24,
                width: state.eye.width,
                height: state.eye.height,
                borderRadius: state.eye.borderRadius,
                background: state.color,
                transition: SPRING,
                transform: 'translate(50%, -50%)',
              }}
            />
            {/* Boca — un solo div con borderTop/borderBottom y radios
                asimétricos. Frunce (1-2) usa borderTop con radios arriba;
                sonrisa (4-5) usa borderBottom con radios abajo; recta (3)
                usa background sólido sin bordes. La transition interpola
                entre las tres formas. */}
            <div
              style={{
                position: 'absolute',
                bottom: 22,
                left: '50%',
                transform: 'translateX(-50%)',
                width: state.mouth.width,
                height: state.mouth.height,
                borderTop: state.mouth.borderTopWidth > 0
                  ? `${state.mouth.borderTopWidth}px solid ${state.color}`
                  : '0',
                borderBottom: state.mouth.borderBottomWidth > 0
                  ? `${state.mouth.borderBottomWidth}px solid ${state.color}`
                  : '0',
                borderRadius: state.mouth.borderRadius,
                background: state.mouth.background === 'currentColor' ? state.color : 'transparent',
                transition: SPRING,
              }}
            />
          </div>

          {/* Estrellas interactivas */}
          <div className="flex items-center gap-1 mt-2" role="group" aria-label="Valoración">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = n <= (hoverRating || rating);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  disabled={status === 'sending'}
                  aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
                  className="p-1 disabled:cursor-not-allowed"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                  }}
                >
                  <svg
                    width={36}
                    height={36}
                    viewBox="0 0 24 24"
                    fill={active ? state.color : 'transparent'}
                    stroke={active ? state.color : '#d1d5db'}
                    strokeWidth="1.5"
                    style={{ transition: SPRING, transform: active ? 'scale(1.1)' : 'scale(1)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </button>
              );
            })}
          </div>

          {/* Texto contextual */}
          <p
            className="text-base font-semibold"
            style={{ color: state.color, transition: SPRING }}
          >
            {state.text}
          </p>
        </div>

        {/* Mensaje opcional */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="message" className="block text-sm font-semibold text-gray-700">
              Comentario <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <span className="text-xs text-gray-400">
              {message.length} / {messageMax}
            </span>
          </div>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, messageMax))}
            disabled={status === 'sending'}
            rows={4}
            placeholder="¿Qué te gustó o qué crees que podríamos mejorar?"
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y disabled:opacity-60"
            maxLength={messageMax}
          />
        </div>

        {/* Identidad pre-rellenada — mismo patrón que SupportPage */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Tus datos de contacto
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Auto-rellenados desde tu cuenta. Si necesitamos aclarar algo, te escribiremos al email
            que indiques aquí.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-gray-600 mb-1">
                Nombre
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={status === 'sending'}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
                maxLength={100}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'sending'}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
                maxLength={320}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="company" className="block text-xs font-medium text-gray-600 mb-1">
                Empresa <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={status === 'sending'}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
                maxLength={200}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          {rating === 0 && (
            <p className="text-xs text-gray-500">
              Selecciona una valoración para poder enviar.
            </p>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="ml-auto px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-sm hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {status === 'sending' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>Enviar feedback</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
