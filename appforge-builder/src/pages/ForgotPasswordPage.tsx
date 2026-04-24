import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../lib/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:border border-gray-100 p-8 sm:p-10">
        <div className="mb-6 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Revisa tu email</h2>
          <p className="text-sm text-gray-500 mt-2">
            Si <strong>{email}</strong> tiene una cuenta, recibirás un código de 6 dígitos para restablecer tu contraseña.
          </p>
        </div>

        <button
          onClick={() => navigate('/reset-password', { state: { email } })}
          className="w-full py-3.5 bg-[#0A0A0A] hover:bg-black text-white text-sm font-semibold rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-all"
        >
          Tengo el código
        </button>

        <p className="mt-4 text-center text-xs text-gray-400">
          ¿No recibiste el email? Revisa tu carpeta de spam o{' '}
          <button onClick={() => setSent(false)} className="text-blue-600 hover:text-blue-700 font-medium">
            intenta de nuevo
          </button>
        </p>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:border border-gray-100 p-8 sm:p-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Recuperar contraseña</h2>
        <p className="text-sm text-gray-500 mt-2">Ingresa tu email y te enviaremos un código de recuperación.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50/50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start">
          <svg className="w-5 h-5 mr-3 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            placeholder="tu@email.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 mt-2 bg-[#0A0A0A] hover:bg-black text-white text-sm font-semibold rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Enviar código'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
};
