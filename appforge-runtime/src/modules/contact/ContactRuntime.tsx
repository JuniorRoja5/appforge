import React, { useState, useEffect, useRef } from 'react';
import { getCaptcha, submitContact, uploadAppUserImage } from '../../lib/api';
import { compressImage } from '../../lib/image-utils';
import { registerRuntimeModule } from '../registry';

interface ContactField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'file' | 'select';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

const DEFAULT_FIELDS: ContactField[] = [
  { id: '1', type: 'text', label: 'Nombre', placeholder: 'Tu nombre', required: true },
  { id: '2', type: 'email', label: 'Email', placeholder: 'tu@email.com', required: true },
  { id: '3', type: 'textarea', label: 'Mensaje', placeholder: 'Escribe tu mensaje...', required: true },
];

function normalizeFields(raw: unknown): ContactField[] {
  if (!Array.isArray(raw)) return DEFAULT_FIELDS;
  return raw.map((f: any) => ({
    id: f.id ?? f.name ?? String(Math.random()),
    type: f.type ?? 'text',
    label: f.label ?? '',
    placeholder: f.placeholder,
    required: f.required ?? false,
    options: f.options,
  }));
}

const ContactRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  // Read builder field names with fallbacks to old runtime names
  const title = (data.formTitle as string) ?? (data.title as string) ?? 'Contáctanos';
  const submitButtonText = (data.submitButtonText as string) ?? 'Enviar';
  const successMessage = (data.successMessage as string) ?? '¡Mensaje enviado con éxito!';
  const fields = normalizeFields(data.fields);
  const enableHoneypot = (data.enableHoneypot as boolean) ?? true;
  const enableCaptcha = (data.enableCaptcha as boolean) ?? true;
  const titleColor = (data.titleColor as string) ?? '';
  const labelColor = (data.labelColor as string) ?? '';
  const placeholderColor = (data.placeholderColor as string) ?? '';
  const titleAlignment = (data.titleAlignment as string) ?? 'left';

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [captchaToken, setCaptchaToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const honeypotRef = useRef('');

  // Load captcha token
  useEffect(() => {
    if (enableCaptcha) {
      getCaptcha().then((r) => setCaptchaToken(r.token)).catch(() => {});
    }
  }, [enableCaptcha]);

  // Inject placeholder color if custom
  const placeholderStyleId = 'contact-placeholder-style';
  useEffect(() => {
    if (!placeholderColor) return;
    let style = document.getElementById(placeholderStyleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = placeholderStyleId;
      document.head.appendChild(style);
    }
    style.textContent = `.contact-field::placeholder { color: ${placeholderColor} !important; }`;
    return () => { style?.remove(); };
  }, [placeholderColor]);

  const handleFileUpload = async (fieldId: string, file: File) => {
    setUploading((p) => ({ ...p, [fieldId]: true }));
    try {
      const compressed = await compressImage(file);
      const result = await uploadAppUserImage(compressed);
      setFileUrls((p) => ({ ...p, [fieldId]: result.url }));
      setFormData((p) => ({ ...p, [fieldId]: file.name }));
    } catch {
      setFormData((p) => ({ ...p, [fieldId]: 'Error al subir archivo' }));
    }
    setUploading((p) => ({ ...p, [fieldId]: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Check honeypot
    if (enableHoneypot && honeypotRef.current) return;

    setStatus('sending');
    try {
      // Merge file URLs into form data
      const submitData = { ...formData };
      for (const [fieldId, url] of Object.entries(fileUrls)) {
        submitData[fieldId] = url;
      }
      await submitContact({ captchaToken, data: submitData });
      setStatus('success');
      setFormData({});
      setFileUrls({});
      // Refresh captcha
      if (enableCaptcha) {
        getCaptcha().then((r) => setCaptchaToken(r.token)).catch(() => {});
      }
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center p-8" style={{ borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-surface-card)' }}>
        <div className="text-4xl mb-3">✓</div>
        <h4 className="font-semibold mb-1" style={{ color: 'var(--color-feedback-success)' }}>{successMessage}</h4>
        <button onClick={() => setStatus('idle')} className="mt-4 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>Enviar otro mensaje</button>
      </div>
    );
  }

  return (
    <div>
      <h3
        className="text-lg font-bold mb-3"
        style={{
          color: titleColor || 'var(--color-text-primary)',
          textAlign: titleAlignment as React.CSSProperties['textAlign'],
        }}
      >
        {title}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Honeypot */}
        {enableHoneypot && (
          <input
            type="text"
            name="website"
            style={{ display: 'none' }}
            tabIndex={-1}
            onChange={(e) => { honeypotRef.current = e.target.value; }}
          />
        )}

        {fields.map((field) => (
          <div key={field.id}>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: labelColor || 'var(--color-text-secondary)' }}
            >
              {field.label}
              {field.required && <span style={{ color: 'var(--color-feedback-error, #ef4444)' }}> *</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                value={formData[field.id] ?? ''}
                onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                required={field.required}
                rows={4}
                placeholder={field.placeholder ?? field.label}
                className="contact-field w-full px-3 py-2.5 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--color-divider)', borderRadius: 'var(--radius-input)' }}
              />
            ) : field.type === 'select' ? (
              <select
                value={formData[field.id] ?? ''}
                onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                required={field.required}
                className="contact-field w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--color-divider)', borderRadius: 'var(--radius-input)' }}
              >
                <option value="">{field.placeholder ?? 'Seleccionar...'}</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'file' ? (
              <div>
                <label
                  className="flex items-center gap-2 px-3 py-2.5 text-sm border rounded-lg cursor-pointer"
                  style={{
                    borderColor: 'var(--color-divider)',
                    borderRadius: 'var(--radius-input)',
                    color: formData[field.id] ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  <span>📎</span>
                  <span className="truncate">
                    {uploading[field.id] ? 'Subiendo...' : formData[field.id] || 'Adjuntar archivo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    disabled={uploading[field.id]}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(field.id, file);
                    }}
                  />
                </label>
              </div>
            ) : (
              <input
                type={field.type === 'phone' ? 'tel' : field.type}
                value={formData[field.id] ?? ''}
                onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                required={field.required}
                placeholder={field.placeholder ?? field.label}
                className="contact-field w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--color-divider)', borderRadius: 'var(--radius-input)' }}
              />
            )}
          </div>
        ))}

        {status === 'error' && <p className="text-xs" style={{ color: 'var(--color-feedback-error)' }}>{errorMsg}</p>}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full py-3 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)', borderRadius: 'var(--radius-button)' }}
        >
          {status === 'sending' ? 'Enviando...' : submitButtonText}
        </button>
      </form>
    </div>
  );
};

registerRuntimeModule({ id: 'contact', Component: ContactRuntime });