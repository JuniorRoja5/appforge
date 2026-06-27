import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTenantStore } from '../store/useTenantStore';
import { createSupportTicket } from '../lib/api';

/**
 * Escenarios del desplegable de soporte.
 *
 * ⚠️ Must match `SUPPORT_SCENARIOS` in:
 *    appforge-backend/src/support/dto/create-support-ticket.dto.ts
 *
 * Si esta lista cambia aquí, REPLICAR en el DTO del backend o el endpoint
 * devolverá 400 al enviar (el desplegable mandaría un valor que el @IsIn
 * del validator rechaza). Decisión "duplicar vs copy-shared.mjs" tomada
 * en el plan: para 7 strings, dos fuentes documentadas son más simples.
 */
const SUPPORT_SCENARIOS = [
  'Problema al generar mi app (build falla, AAB rechazado)',
  'Mi app no funciona como esperaba (módulo, runtime)',
  'Pregunta sobre cómo usar la plataforma',
  'Problema con mi cuenta o facturación',
  'Sugerencia o mejora',
  'Problema legal (privacidad, términos, Play Store)',
  'Otro',
] as const;

type Status = 'idle' | 'sending' | 'sent' | 'error';

export const SupportPage: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const brandName = useTenantStore((s) => s.brandName);

  // Pre-relleno desde el store de auth + tenant. Memoized para que un
  // re-render no resetee el form si el usuario ya empezó a editar
  // (el initial state de useState solo lee la primera vez).
  const defaults = useMemo(() => {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return {
      name: fullName || user?.email?.split('@')[0] || '',
      email: user?.email ?? '',
      company: user?.company ?? brandName ?? '',
    };
  }, [user, brandName]);

  const [scenario, setScenario] = useState<string>(SUPPORT_SCENARIOS[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState(defaults.name);
  const [email, setEmail] = useState(defaults.email);
  const [company, setCompany] = useState(defaults.company);

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const messageMax = 5000;
  const subjectMax = 200;

  const resetForm = () => {
    setScenario(SUPPORT_SCENARIOS[0]);
    setSubject('');
    setMessage('');
    setName(defaults.name);
    setEmail(defaults.email);
    setCompany(defaults.company);
  };

  const canSubmit =
    !!token
    && status !== 'sending'
    && subject.trim().length > 0
    && message.trim().length > 0
    && name.trim().length > 0
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !token) return;

    setStatus('sending');
    setErrorMsg('');

    try {
      await createSupportTicket(
        {
          scenario,
          subject: subject.trim(),
          message: message.trim(),
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
        },
        token,
      );
      setStatus('sent');
      // Reset campos del mensaje, NO los de identidad (el usuario probablemente
      // quiera enviar otro mensaje desde la misma cuenta).
      setSubject('');
      setMessage('');
      setScenario(SUPPORT_SCENARIOS[0]);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'No pudimos enviar tu mensaje. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Soporte</h1>
        <p className="text-gray-600 text-sm">
          Cuéntanos qué necesitas y te responderemos al email que indiques. Los datos de tu cuenta ya
          están pre-rellenados, pero puedes modificarlos si prefieres que contactemos a otra dirección.
        </p>
      </header>

      {status === 'sent' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <div className="text-sm text-green-800">
            <p className="font-semibold mb-0.5">Mensaje recibido</p>
            <p>
              Hemos recibido tu mensaje. Te responderemos a <strong>{email}</strong> en cuanto podamos.
              Puedes cerrar esta pestaña o enviar otro mensaje.
            </p>
            <button
              type="button"
              onClick={() => { setStatus('idle'); resetForm(); }}
              className="mt-3 text-xs font-semibold text-green-700 underline hover:text-green-900"
            >
              Enviar otro mensaje
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
            <p className="font-semibold mb-0.5">No pudimos enviar tu mensaje</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Escenario */}
        <div>
          <label htmlFor="scenario" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Tipo de consulta
          </label>
          <select
            id="scenario"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            disabled={status === 'sending'}
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
          >
            {SUPPORT_SCENARIOS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Asunto */}
        <div>
          <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Asunto
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, subjectMax))}
            disabled={status === 'sending'}
            placeholder="Un resumen breve de tu consulta"
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
            maxLength={subjectMax}
            required
          />
        </div>

        {/* Mensaje */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="message" className="block text-sm font-semibold text-gray-700">
              Mensaje
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
            rows={6}
            placeholder="Describe lo que está pasando. Si tienes capturas o enlaces, pégalos aquí."
            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y disabled:opacity-60"
            maxLength={messageMax}
            required
          />
        </div>

        {/* Sección datos pre-rellenados */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Tus datos de contacto
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Auto-rellenados desde tu cuenta — puedes modificarlos si prefieres que te respondamos a
            otra dirección.
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
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-sm hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {status === 'sending' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Enviar mensaje
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
