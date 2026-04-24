import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { googleLogin } from '../lib/api';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Error al registrar');
      }

      const data = await response.json();
      setAuth(data.access_token, data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:border border-gray-100 p-8 sm:p-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Crear cuenta</h2>
        <p className="text-sm text-gray-500 mt-2">Únete a cientos de creadores y agencias de primer nivel hoy mismo.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50/50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start">
          <svg className="w-5 h-5 mr-3 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
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

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            placeholder="Repite tu contraseña"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 mt-2 bg-[#0A0A0A] hover:bg-black text-white text-sm font-semibold rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed group"
        >
          {loading ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
             <>
               <span>Crear cuenta</span>
               <svg className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </>
          )}
        </button>
      </form>

      {/* Google login */}
      {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">o</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (credentialResponse: CredentialResponse) => {
                if (!credentialResponse.credential) return;
                setError('');
                setLoading(true);
                try {
                  const response = await googleLogin(credentialResponse.credential);
                  setAuth(response.access_token, response.user);
                  navigate('/dashboard', { replace: true });
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Error con Google login');
                } finally {
                  setLoading(false);
                }
              }}
              onError={() => setError('Error al registrar con Google')}
              text="signup_with"
              shape="pill"
              width={320}
            />
          </div>
        </>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
};
