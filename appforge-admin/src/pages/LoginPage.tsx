import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { login, forgotPassword, resetPassword } from '../lib/api';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  // Forgot password state — two-step modal: request token → submit token+new password
  type ForgotStep = 'request' | 'reset' | null;
  const [forgotStep, setForgotStep] = useState<ForgotStep>(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [forgotNewPwd, setForgotNewPwd] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const closeForgot = () => {
    setForgotStep(null);
    setForgotEmail('');
    setForgotToken('');
    setForgotNewPwd('');
    setForgotConfirm('');
    setForgotMsg(null);
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const res = await forgotPassword(forgotEmail);
      setForgotMsg({ type: 'success', text: res.message });
      setForgotStep('reset');
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: err?.message ?? 'Error al solicitar reset' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotNewPwd !== forgotConfirm) {
      setForgotMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    if (forgotNewPwd.length < 8) {
      setForgotMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      await resetPassword(forgotEmail, forgotToken.trim(), forgotNewPwd);
      setForgotMsg({ type: 'success', text: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
      setTimeout(() => closeForgot(), 1500);
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: err?.message ?? 'Error al restablecer contraseña' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);

      if (res.user.role !== 'SUPER_ADMIN') {
        setError('Solo los administradores pueden acceder a este panel.');
        setLoading(false);
        return;
      }

      setAuth(res.access_token, res.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left Column: Branding & Splash */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[55%] relative flex-col justify-between p-12 overflow-hidden bg-[#111111]">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 -left-[10%] w-[120%] h-[100%] bg-gradient-to-br from-orange-600/30 via-red-900/10 to-transparent blur-3xl opacity-50 transform -rotate-12"></div>
          <div className="absolute -bottom-[20%] right-0 w-[80%] h-[80%] bg-gradient-to-t from-red-600/20 to-transparent blur-3xl opacity-40"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        </div>

        {/* Top Logo */}
        <div className="relative z-10 flex items-center space-x-3 select-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-extrabold text-white text-lg shadow-[0_0_20px_rgba(249,115,22,0.4)] ring-1 ring-white/10">
            AF
          </div>
          <span className="text-xl font-bold tracking-tight text-white">AppForge <span className="font-mormal text-white/50">Admin</span></span>
        </div>

        {/* Center Content */}
        <div className="relative z-10 max-w-lg mt-12">
          <h2 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
            Gestión Centralizada y Operaciones Escalables.
          </h2>
          <p className="text-lg text-gray-400 font-medium leading-relaxed">
            El centro de control maestro para administrar inquilinos, recursos, y la orquestación de compilaciones nativas de SystemApp.
          </p>
        </div>

        {/* Bottom Elements */}
        <div className="relative z-10 flex items-center space-x-4 border-t border-white/10 pt-8 mt-12 w-fit">
          <div className="text-sm">
            <p className="text-white font-semibold">Infraestructura Crítica</p>
            <p className="text-gray-500">Acceso restingido Nivel 1</p>
          </div>
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="w-full lg:w-[50%] xl:w-[45%] flex items-center justify-center p-6 sm:p-12 relativce bg-[#FAFAFA]">
        <div className="w-full max-w-[400px]">
          {/* Mobile Logo only visible on sm/md */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-10 select-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-extrabold text-white text-lg shadow-md">
              AF
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">AppForge <span className="font-normal text-gray-400">Admin</span></span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Acceso Operativo</h1>
            <p className="text-[15px] font-medium text-gray-500 mt-2">Ingresa tus credenciales de super administrador</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
               <div className="p-4 bg-red-50/50 border border-red-200/60 rounded-xl text-sm text-red-700 font-medium flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
                 <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 <span>{error}</span>
               </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Email Administrativo</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={loading}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                  placeholder="admin@appforge.com"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 flex justify-between">
                  <span>Código de Acceso (Password)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  readOnly={loading}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-[15px] font-bold text-white bg-[#0A0A0A] hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.2)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Verificando...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Acceder al Sistema</span>
                  <svg className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </div>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setForgotStep('request')}
              className="text-[13px] text-gray-500 hover:text-orange-600 underline-offset-2 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">Plataforma interna. Acceso logueado y monitorizado.</p>
          </div>
        </div>
      </div>

      {/* Forgot password modal */}
      {forgotStep !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeForgot}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">
              {forgotStep === 'request' ? 'Recuperar contraseña' : 'Introduce el código'}
            </h3>

            {forgotMsg && (
              <div className={`p-3 rounded-lg text-sm ${forgotMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {forgotMsg.text}
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Introduce tu email y te enviaremos un código de 6 caracteres para restablecer la contraseña.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={closeForgot} disabled={forgotLoading} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50">Cancelar</button>
                  <button type="submit" disabled={forgotLoading || !forgotEmail} className="px-4 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-50">
                    {forgotLoading ? 'Enviando...' : 'Enviar código'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotReset} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Introduce el código que recibiste por email y tu nueva contraseña.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <input
                    type="text"
                    value={forgotToken}
                    onChange={(e) => setForgotToken(e.target.value)}
                    required
                    autoComplete="one-time-code"
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                  <input
                    type="password"
                    value={forgotNewPwd}
                    onChange={(e) => setForgotNewPwd(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Mínimo 8 caracteres.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={forgotConfirm}
                    onChange={(e) => setForgotConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={closeForgot} disabled={forgotLoading} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50">Cancelar</button>
                  <button type="submit" disabled={forgotLoading || !forgotToken || !forgotNewPwd || !forgotConfirm} className="px-4 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-50">
                    {forgotLoading ? 'Restableciendo...' : 'Restablecer contraseña'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
