import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useAppConfigStore } from '../../../../store/useAppConfigStore';
import { testSmtpConfig } from '../../../../lib/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const SmtpTab: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);
  const config = useAppConfigStore((s) => s.config);
  const updateSection = useAppConfigStore((s) => s.updateSection);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    connectionOk: boolean;
    emailSent: boolean;
    error?: string;
  } | null>(null);

  const smtp = config?.smtp ?? {
    host: '',
    port: 587,
    secure: false,
    username: '',
    fromEmail: '',
    fromName: '',
    hasPassword: false,
    password: '',
  };

  const update = (partial: Partial<typeof smtp>) => {
    updateSection('smtp', { ...smtp, ...partial });
  };

  const handleTest = async () => {
    if (!appId || !token) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testSmtpConfig(
        appId,
        {
          host: smtp.host,
          port: smtp.port,
          secure: smtp.secure,
          username: smtp.username,
          password: smtp.password ?? '',
          fromEmail: smtp.fromEmail,
          fromName: smtp.fromName,
        },
        token,
      );
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ connectionOk: false, emailSent: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Configuración de Email (SMTP)</h4>
        <p className="text-[12px] text-gray-500">
          Necesario para que módulos como Contacto envíen notificaciones por email cuando un usuario rellena un formulario.
        </p>
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4">
        {/* Host */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[12px] font-medium text-gray-700 mb-1 block">Servidor SMTP</label>
          <input
            type="text"
            value={smtp.host}
            onChange={(e) => update({ host: e.target.value })}
            placeholder="smtp.gmail.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
        </div>

        {/* Port */}
        <div>
          <label className="text-[12px] font-medium text-gray-700 mb-1 block">Puerto</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={smtp.port}
              onChange={(e) => update({ port: parseInt(e.target.value) || 587 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            />
            <div className="flex gap-1 shrink-0">
              {[587, 465, 25].map((p) => (
                <button
                  key={p}
                  onClick={() => update({ port: p, secure: p === 465 })}
                  className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                    smtp.port === p
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Secure toggle */}
        <div className="col-span-2 flex items-center justify-between py-2 border-t border-b border-gray-100">
          <div>
            <span className="text-[12px] font-medium text-gray-700">Conexión segura (SSL/TLS)</span>
            <p className="text-[10px] text-gray-400">Activar para puerto 465, desactivar para 587 con STARTTLS</p>
          </div>
          <button
            onClick={() => update({ secure: !smtp.secure })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              smtp.secure ? 'bg-indigo-500' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              smtp.secure ? 'left-[22px]' : 'left-0.5'
            }`} />
          </button>
        </div>

        {/* Username */}
        <div>
          <label className="text-[12px] font-medium text-gray-700 mb-1 block">Usuario</label>
          <input
            type="text"
            value={smtp.username}
            onChange={(e) => update({ username: e.target.value })}
            placeholder="tu@email.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
        </div>

        {/* Password */}
        <div>
          <label className="text-[12px] font-medium text-gray-700 mb-1 block">Contraseña</label>
          <input
            type="password"
            value={smtp.password ?? ''}
            onChange={(e) => update({ password: e.target.value })}
            placeholder={smtp.hasPassword ? '••••••••' : 'Contraseña SMTP'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
          {smtp.hasPassword && !smtp.password && (
            <p className="text-[10px] text-gray-400 mt-1">Ya hay una contraseña guardada. Deja vacío para mantenerla.</p>
          )}
        </div>

        {/* From Email */}
        <div>
          <label className="text-[12px] font-medium text-gray-700 mb-1 block">Email remitente</label>
          <input
            type="email"
            value={smtp.fromEmail}
            onChange={(e) => update({ fromEmail: e.target.value })}
            placeholder="noreply@tuapp.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
        </div>

        {/* From Name */}
        <div>
          <label className="text-[12px] font-medium text-gray-700 mb-1 block">Nombre remitente</label>
          <input
            type="text"
            value={smtp.fromName}
            onChange={(e) => update({ fromName: e.target.value })}
            placeholder="Mi App"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Test button */}
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={handleTest}
          disabled={testing || !smtp.host}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white text-[13px] font-medium rounded-lg transition-colors"
        >
          {testing ? <Loader2 size={14} className="animate-spin" /> : null}
          {testing ? 'Probando...' : 'Probar conexión'}
        </button>

        {/* Test results */}
        {testResult && (
          <div className="mt-3 space-y-2">
            <div className={`flex items-center gap-2 text-[12px] ${testResult.connectionOk ? 'text-green-700' : 'text-red-700'}`}>
              {testResult.connectionOk ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {testResult.connectionOk ? 'Conexión al servidor SMTP correcta' : 'Error al conectar con el servidor SMTP'}
            </div>
            {testResult.connectionOk && (
              <div className={`flex items-center gap-2 text-[12px] ${testResult.emailSent ? 'text-green-700' : 'text-amber-700'}`}>
                {testResult.emailSent ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {testResult.emailSent ? 'Email de prueba enviado correctamente' : 'Conexión OK, pero error al enviar email'}
              </div>
            )}
            {testResult.error && (
              <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded">{testResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-[12px] text-blue-800">
          <strong>Gmail:</strong> Usa smtp.gmail.com, puerto 587, y genera una "Contraseña de aplicación" en la configuración de seguridad de Google.
          No uses tu contraseña normal de Gmail.
        </p>
      </div>
    </div>
  );
};
