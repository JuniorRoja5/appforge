import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { resetPassword } from '../lib/api';

export const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromState = (location.state as { email?: string })?.email || '';

  const [email, setEmail] = useState(emailFromState);
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:border border-gray-100 p-8 sm:p-10">
        <div className="mb-6 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Contraseña actualizada</h2>
          <p className="text-sm text-gray-500 mt-2">Tu contraseña ha sido restablecida correctamente.</p>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full py-3.5 bg-[#0A0A0A] hover:bg-black text-white text-sm font-semibold rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-all"
        >
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:border border-gray-100 p-8 sm:p-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Restablecer contraseña</h2>
        <p className="text-sm text-gray-500 mt-2">Ingresa el código de 6 dígitos que recibiste y tu nueva contraseña.</p>
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
        {!emailFromState && (
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
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Código de recuperación</label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            inputMode="numeric"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg font-bold tracking-[0.3em] text-gray-900 placeholder:text-gray-400 placeholder:tracking-normal placeholder:text-sm placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            placeholder="000000"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nueva contraseña</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar contraseña</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            placeholder="Repite la contraseña"
          />
        </div>

        <button
          type="submit"
          disabled={loading || token.length < 6}
          className="w-full py-3.5 mt-2 bg-[#0A0A0A] hover:bg-black text-white text-sm font-semibold rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Restablecer contraseña'
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
