import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { getSmtpConfig, updateSmtpConfig, testSmtp, getFcmConfig, updateFcmConfig, testFcm } from '../lib/api';
import type { SmtpConfig, FcmConfig } from '../lib/api';
import { Mail, CheckCircle, XCircle, Loader2, Bell, Upload } from 'lucide-react';

const emptySmtp: SmtpConfig = {
  host: '',
  port: 587,
  secure: false,
  username: '',
  password: '',
  fromEmail: '',
  fromName: '',
};

export const SettingsPage: React.FC = () => {
  const token = useAuthStore((s) => s.token)!;
  const [form, setForm] = useState<SmtpConfig>(emptySmtp);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // FCM state
  const [fcmConfig, setFcmConfig] = useState<FcmConfig | null>(null);
  const [fcmSaving, setFcmSaving] = useState(false);
  const [fcmTesting, setFcmTesting] = useState(false);
  const [fcmMsg, setFcmMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saFile, setSaFile] = useState<string | null>(null);
  const [gsFile, setGsFile] = useState<string | null>(null);
  const [saFileName, setSaFileName] = useState('');
  const [gsFileName, setGsFileName] = useState('');

  useEffect(() => {
    Promise.all([
      getSmtpConfig(token).catch(() => null),
      getFcmConfig(token).catch(() => null),
    ]).then(([smtpConfig, fcm]) => {
      if (smtpConfig) {
        setForm({ ...smtpConfig, password: '' });
      }
      setFcmConfig(fcm);
    }).finally(() => setLoading(false));
  }, [token]);

  const handleChange = (field: keyof SmtpConfig, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    setTestResult(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const data: SmtpConfig = { ...form };
      if (!data.password) {
        delete data.password; // Keep existing password if not changed
      }
      await updateSmtpConfig(token, data);
      setSaveSuccess(true);
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al guardar configuración SMTP');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testSmtp(token);
      if (result.connectionOk && result.emailSent) {
        setTestResult({ ok: true, message: 'Conexión exitosa y email de prueba enviado.' });
      } else {
        setTestResult({ ok: false, message: result.error || 'Error de conexión.' });
      }
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Error al probar conexión.' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">Configuración</h1>

      {/* SMTP Config */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center space-x-2">
          <Mail className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-gray-900">SMTP de plataforma</h2>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input
                type="text"
                value={form.host}
                onChange={(e) => handleChange('host', e.target.value)}
                placeholder="smtp.example.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => handleChange('port', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="smtp-secure"
              checked={form.secure}
              onChange={(e) => handleChange('secure', e.target.checked)}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="smtp-secure" className="text-sm text-gray-700">
              Conexión segura (SSL/TLS)
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => handleChange('username', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={form.password ?? ''}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email remitente</label>
              <input
                type="email"
                value={form.fromEmail}
                onChange={(e) => handleChange('fromEmail', e.target.value)}
                placeholder="noreply@appforge.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre remitente</label>
              <input
                type="text"
                value={form.fromName}
                onChange={(e) => handleChange('fromName', e.target.value)}
                placeholder="AppForge"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Feedback */}
          {saveSuccess && (
            <div className="flex items-center space-x-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span>Configuración guardada correctamente.</span>
            </div>
          )}

          {testResult && (
            <div
              className={`flex items-center space-x-2 text-sm px-3 py-2 rounded-lg ${
                testResult.ok ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
              }`}
            >
              {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-medium hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              <span>{testing ? 'Probando...' : 'Probar conexión'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* FCM Push Notifications Config */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center space-x-2">
          <Bell className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-gray-900">FCM Push Notifications</h2>
          {fcmConfig?.configured && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              Configurado
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">
            Sube las credenciales de Firebase para habilitar push notifications en las apps generadas.
          </p>

          {fcmConfig?.configured && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">Project ID:</span>
              <span className="text-sm font-mono font-medium text-gray-900">{fcmConfig.projectId}</span>
            </div>
          )}

          {/* Service Account JSON upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Account JSON <span className="text-gray-400 font-normal">(Firebase Admin SDK)</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {saFileName || 'Seleccionar archivo .json'}
              </span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setSaFileName(file.name);
                  const reader = new FileReader();
                  reader.onload = (ev) => setSaFile(ev.target?.result as string);
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>

          {/* google-services.json upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              google-services.json <span className="text-gray-400 font-normal">(para builds Android)</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {gsFileName || 'Seleccionar archivo .json'}
              </span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setGsFileName(file.name);
                  const reader = new FileReader();
                  reader.onload = (ev) => setGsFile(ev.target?.result as string);
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>

          {/* Feedback */}
          {fcmMsg && (
            <div
              className={`flex items-center space-x-2 text-sm px-3 py-2 rounded-lg ${
                fcmMsg.type === 'success' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
              }`}
            >
              {fcmMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{fcmMsg.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={async () => {
                if (!saFile || !gsFile) {
                  setFcmMsg({ type: 'error', text: 'Debes seleccionar ambos archivos JSON.' });
                  return;
                }
                setFcmSaving(true);
                setFcmMsg(null);
                try {
                  const result = await updateFcmConfig(token, {
                    serviceAccountJson: saFile,
                    googleServicesJson: gsFile,
                  });
                  setFcmConfig(result);
                  setFcmMsg({ type: 'success', text: 'Configuración FCM guardada correctamente.' });
                  setSaFile(null);
                  setGsFile(null);
                  setSaFileName('');
                  setGsFileName('');
                } catch (err) {
                  setFcmMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar.' });
                } finally {
                  setFcmSaving(false);
                }
              }}
              disabled={fcmSaving || (!saFile && !gsFile)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-medium hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50"
            >
              {fcmSaving ? 'Guardando...' : 'Guardar configuración FCM'}
            </button>
            <button
              onClick={async () => {
                setFcmTesting(true);
                setFcmMsg(null);
                try {
                  const result = await testFcm(token);
                  if (result.ok) {
                    setFcmMsg({ type: 'success', text: 'Conexión con Firebase exitosa.' });
                  } else {
                    setFcmMsg({ type: 'error', text: result.error || 'Error de conexión.' });
                  }
                } catch (err) {
                  setFcmMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al probar.' });
                } finally {
                  setFcmTesting(false);
                }
              }}
              disabled={fcmTesting || !fcmConfig?.configured}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {fcmTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              <span>{fcmTesting ? 'Probando...' : 'Probar conexión'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
