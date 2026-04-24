import React, { useState, useEffect, useCallback } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  Mail, Plus, Trash2, Save, X, Pencil,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown,
  Eye, EyeOff, Phone, Type, AlignLeft, Upload, List,
} from 'lucide-react';
import {
  getContactSubmissions,
  deleteContactSubmission,
  type ContactSubmission,
} from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';

// --- Zod schemas ---

const FieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'email', 'phone', 'textarea', 'file', 'select']),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

type FormField = z.infer<typeof FieldSchema>;

const ContactConfigSchema = z.object({
  formTitle: z.string(),
  submitButtonText: z.string(),
  successMessage: z.string(),
  fields: z.array(FieldSchema),
  enableHoneypot: z.boolean(),
  enableCaptcha: z.boolean(),
  titleColor: z.string(),
  labelColor: z.string(),
  placeholderColor: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

type ContactConfig = z.infer<typeof ContactConfigSchema>;

// --- Iconos por tipo de campo ---
const fieldTypeIcons: Record<FormField['type'], React.ReactNode> = {
  text: <Type size={14} />,
  email: <Mail size={14} />,
  phone: <Phone size={14} />,
  textarea: <AlignLeft size={14} />,
  file: <Upload size={14} />,
  select: <List size={14} />,
};

const fieldTypeLabels: Record<FormField['type'], string> = {
  text: 'Texto',
  email: 'Email',
  phone: 'Teléfono',
  textarea: 'Área de texto',
  file: 'Archivo',
  select: 'Selección',
};

// ========================
// PreviewComponent
// ========================
const PreviewComponent: React.FC<{ data: ContactConfig; isSelected: boolean }> = ({ data }) => {
  const placeholderCss = `
    .contact-preview-fields input::placeholder,
    .contact-preview-fields textarea::placeholder,
    .contact-preview-fields select option[value=""] {
      color: ${data.placeholderColor || '#9ca3af'} !important;
      opacity: 1;
    }
  `;
  return (
    <div className="p-4 space-y-3">
      <style>{placeholderCss}</style>
      {/* Header */}
      <h2 className="text-lg font-bold text-center" style={{ color: data.titleColor || '#1f2937' }}>{data.formTitle}</h2>

      {/* Form fields */}
      <div className="space-y-3 contact-preview-fields">
        {data.fields.map((field) => (
          <div key={field.id}>
            <label className="block text-xs font-medium mb-1" style={{ color: data.labelColor || '#374151' }}>
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white resize-none"
                placeholder={field.placeholder}
                rows={3}
                readOnly
              />
            ) : field.type === 'select' ? (
              <select
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                disabled
              >
                <option value="">{field.placeholder || 'Seleccionar...'}</option>
                {(field.options ?? []).map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'file' ? (
              <div className="w-full px-2 py-3 border border-dashed border-gray-300 rounded text-xs text-gray-400 text-center bg-gray-50">
                <Upload size={16} className="mx-auto mb-1 text-gray-300" />
                Adjuntar archivo
              </div>
            ) : (
              <input
                type={field.type === 'phone' ? 'tel' : field.type}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                placeholder={field.placeholder}
                readOnly
              />
            )}
          </div>
        ))}
      </div>

      {/* Submit button */}
      <button
        className="w-full py-2 text-white rounded-lg text-sm font-medium"
        style={{ backgroundColor: 'var(--af-color-primary, #9333ea)', borderRadius: 'var(--af-radius-button, 8px)' }}
        disabled
      >
        {data.submitButtonText}
      </button>

      {/* Anti-spam indicators */}
      {(data.enableHoneypot || data.enableCaptcha) && (
        <div className="flex items-center gap-2 justify-center">
          {data.enableCaptcha && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              🛡️ Captcha
            </span>
          )}
          {data.enableHoneypot && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              🍯 Honeypot
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ========================
// RuntimeComponent
// ========================
const RuntimeComponent: React.FC<{ data: ContactConfig }> = () => (
  <div className="p-6 text-center text-gray-500 text-sm">
    <Mail className="mx-auto mb-2 text-gray-400" size={32} />
    <p>Este formulario será funcional en la app Capacitor.</p>
  </div>
);

// ========================
// FieldEditor (formulario inline para agregar/editar campo)
// ========================
const FieldEditor: React.FC<{
  initial?: FormField;
  onSave: (field: FormField) => void;
  onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
  const [type, setType] = useState<FormField['type']>(initial?.type ?? 'text');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [placeholder, setPlaceholder] = useState(initial?.placeholder ?? '');
  const [required, setRequired] = useState(initial?.required ?? false);
  const [optionsText, setOptionsText] = useState((initial?.options ?? []).join('\n'));

  const handleSave = () => {
    if (!label.trim()) return;
    onSave({
      id: initial?.id ?? Date.now().toString(),
      type,
      label: label.trim(),
      placeholder: placeholder.trim() || undefined,
      required,
      options: type === 'select' ? optionsText.split('\n').map(o => o.trim()).filter(Boolean) : undefined,
    });
  };

  return (
    <div className="border border-purple-200 rounded-lg p-3 bg-purple-50 space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de campo</label>
        <select
          value={type}
          onChange={e => setType(e.target.value as FormField['type'])}
          className="w-full px-2 py-1 border rounded text-xs"
        >
          {(Object.keys(fieldTypeLabels) as FormField['type'][]).map(t => (
            <option key={t} value={t}>{fieldTypeLabels[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Etiqueta</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="w-full px-2 py-1 border rounded text-xs"
          placeholder="Ej: Nombre completo"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Placeholder</label>
        <input
          type="text"
          value={placeholder}
          onChange={e => setPlaceholder(e.target.value)}
          className="w-full px-2 py-1 border rounded text-xs"
          placeholder="Ej: Escribe tu nombre..."
        />
      </div>
      {type === 'select' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Opciones (una por línea)
          </label>
          <textarea
            value={optionsText}
            onChange={e => setOptionsText(e.target.value)}
            className="w-full px-2 py-1 border rounded text-xs resize-none"
            rows={3}
            placeholder={'Opción 1\nOpción 2\nOpción 3'}
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={required}
            onChange={e => setRequired(e.target.checked)}
          />
          Obligatorio
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
        >
          <Save size={12} /> {initial ? 'Actualizar' : 'Agregar'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
        >
          <X size={12} /> Cancelar
        </button>
      </div>
    </div>
  );
};

// ========================
// SettingsPanel
// ========================
const SettingsPanel: React.FC<{ data: ContactConfig; onChange: (data: ContactConfig) => void }> = ({
  data,
  onChange,
}) => {
  // --- Sección colapsable ---
  const [openSection, setOpenSection] = useState<'config' | 'fields' | 'colors' | 'submissions'>('fields');

  // --- Field editor state ---
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [showAddField, setShowAddField] = useState(false);

  // --- Submissions state ---
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshPreview = useCallback(
    (updated: Partial<ContactConfig>) => {
      onChange({ ...data, ...updated, _refreshKey: (data._refreshKey ?? 0) + 1 });
    },
    [data, onChange],
  );

  // --- Cargar submissions ---
  const loadSubmissions = useCallback(async () => {
    if (!data.appId) return;
    if (!token) {
      setAuthError('Error de autenticación');
      return;
    }
    setLoadingSubs(true);
    setAuthError(null);
    try {
      const subs = await getContactSubmissions(data.appId, token);
      setSubmissions(subs);
    } catch (err) {
      console.error('Error loading submissions', err);
    } finally {
      setLoadingSubs(false);
    }
  }, [data.appId, token]);

  useEffect(() => {
    if (data.appId && openSection === 'submissions') {
      loadSubmissions();
    }
  }, [data.appId, openSection, loadSubmissions]);

  // --- Field management ---
  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= data.fields.length) return;
    const updated = [...data.fields];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    refreshPreview({ fields: updated });
  };

  const deleteField = (id: string) => {
    refreshPreview({ fields: data.fields.filter(f => f.id !== id) });
  };

  const saveField = (field: FormField) => {
    const exists = data.fields.find(f => f.id === field.id);
    if (exists) {
      refreshPreview({ fields: data.fields.map(f => (f.id === field.id ? field : f)) });
    } else {
      refreshPreview({ fields: [...data.fields, field] });
    }
    setEditingFieldId(null);
    setShowAddField(false);
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!data.appId || !token) return;
    try {
      await deleteContactSubmission(data.appId, id, token);
      setSubmissions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting submission', err);
    }
  };

  // --- Section toggle helper ---
  const SectionHeader: React.FC<{
    id: 'config' | 'fields' | 'colors' | 'submissions';
    title: string;
    count?: number;
  }> = ({ id, title, count }) => (
    <button
      onClick={() => setOpenSection(openSection === id ? id : id)}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        openSection === id
          ? 'bg-purple-100 text-purple-800'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <span>
        {title}
        {count !== undefined && (
          <span className="ml-1.5 text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </span>
      {openSection === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* ====== SECCIÓN 1: Configuración general ====== */}
      <SectionHeader id="config" title="Configuración general" />
      {openSection === 'config' && (
        <div className="space-y-3 px-1">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Título del formulario</label>
            <input
              type="text"
              value={data.formTitle}
              onChange={e => onChange({ ...data, formTitle: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Texto del botón</label>
            <input
              type="text"
              value={data.submitButtonText}
              onChange={e => onChange({ ...data, submitButtonText: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mensaje de éxito</label>
            <input
              type="text"
              value={data.successMessage}
              onChange={e => onChange({ ...data, successMessage: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">Anti-spam: Honeypot</label>
            <button
              onClick={() => onChange({ ...data, enableHoneypot: !data.enableHoneypot })}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                data.enableHoneypot ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  data.enableHoneypot ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">Anti-spam: Captcha</label>
            <button
              onClick={() => onChange({ ...data, enableCaptcha: !data.enableCaptcha })}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                data.enableCaptcha ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  data.enableCaptcha ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* ====== SECCIÓN 2: Campos del formulario ====== */}
      <SectionHeader id="fields" title="Campos del formulario" count={data.fields.length} />
      {openSection === 'fields' && (
        <div className="space-y-2 px-1">
          {data.fields.map((field, idx) => (
            <div key={field.id}>
              {editingFieldId === field.id ? (
                <FieldEditor
                  initial={field}
                  onSave={saveField}
                  onCancel={() => setEditingFieldId(null)}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-lg bg-white hover:bg-gray-50">
                  <span className="text-purple-600">{fieldTypeIcons[field.type]}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-800 truncate block">
                      {field.label}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {fieldTypeLabels[field.type]}
                      {field.required && ' • Obligatorio'}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => moveField(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Subir"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => moveField(idx, 1)}
                      disabled={idx === data.fields.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Bajar"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      onClick={() => setEditingFieldId(field.id)}
                      className="p-1 text-blue-500 hover:text-blue-700"
                      title="Editar"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => deleteField(field.id)}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {showAddField ? (
            <FieldEditor
              onSave={saveField}
              onCancel={() => setShowAddField(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddField(true)}
              className="w-full flex items-center justify-center gap-1 py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-lg text-xs hover:bg-purple-50"
            >
              <Plus size={14} /> Agregar campo
            </button>
          )}
        </div>
      )}

      {/* ====== SECCIÓN 3: Colores ====== */}
      <SectionHeader id="colors" title="Colores" />
      {openSection === 'colors' && (
        <div className="space-y-3 px-1">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Color del título</label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={data.titleColor || '#1f2937'}
                onChange={(e) => onChange({ ...data, titleColor: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs uppercase"
                value={data.titleColor || '#1f2937'}
                onChange={(e) => onChange({ ...data, titleColor: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Color de las etiquetas</label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={data.labelColor || '#374151'}
                onChange={(e) => onChange({ ...data, labelColor: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs uppercase"
                value={data.labelColor || '#374151'}
                onChange={(e) => onChange({ ...data, labelColor: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Color del placeholder</label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={data.placeholderColor || '#9ca3af'}
                onChange={(e) => onChange({ ...data, placeholderColor: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs uppercase"
                value={data.placeholderColor || '#9ca3af'}
                onChange={(e) => onChange({ ...data, placeholderColor: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* ====== SECCIÓN 4: Submissions ====== */}
      <SectionHeader id="submissions" title="Mensajes recibidos" count={submissions.length} />
      {openSection === 'submissions' && (
        <div className="space-y-2 px-1">
          {!data.appId ? (
            <div className="text-center py-4 text-xs text-gray-500 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="font-medium text-yellow-700">Guarda la app primero</p>
              <p className="mt-1">Los mensajes se habilitarán después de guardar.</p>
            </div>
          ) : loadingSubs ? (
            <div className="text-center py-4 text-xs text-gray-400">Cargando...</div>
          ) : authError ? (
            <div className="text-center py-4 text-xs text-red-500">{authError}</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-400">
              No hay mensajes todavía.
            </div>
          ) : (
            submissions.map(sub => (
              <div key={sub.id} className="border rounded-lg bg-white overflow-hidden">
                <div
                  className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedSubId(expandedSubId === sub.id ? null : sub.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-400">
                      {new Date(sub.createdAt).toLocaleString('es-ES')}
                    </div>
                    <div className="text-xs text-gray-700 truncate">
                      {Object.entries(sub.data as Record<string, unknown>)
                        .slice(0, 2)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(' | ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteSubmission(sub.id);
                      }}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                    {expandedSubId === sub.id ? (
                      <EyeOff size={14} className="text-gray-400" />
                    ) : (
                      <Eye size={14} className="text-gray-400" />
                    )}
                  </div>
                </div>
                {expandedSubId === sub.id && (
                  <div className="border-t px-3 py-2 bg-gray-50 space-y-1">
                    {Object.entries(sub.data as Record<string, unknown>).map(([key, val]) => (
                      <div key={key} className="text-xs">
                        <span className="font-medium text-gray-600">{key}:</span>{' '}
                        <span className="text-gray-800">{String(val)}</span>
                      </div>
                    ))}
                    {sub.fileUrls.length > 0 && (
                      <div className="text-xs mt-1">
                        <span className="font-medium text-gray-600">Archivos:</span>
                        {sub.fileUrls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-purple-600 underline"
                          >
                            Archivo {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {data.appId && !loadingSubs && (
            <button
              onClick={loadSubmissions}
              className="w-full py-1.5 text-xs text-purple-600 hover:bg-purple-50 rounded"
            >
              Recargar mensajes
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ========================
// Module Definition
// ========================
export const ContactModule: ModuleDefinition<ContactConfig> = {
  id: 'contact',
  name: 'Contacto',
  icon: <Mail size={20} />,
  description: 'Formulario de contacto configurable con anti-spam',
  schema: ContactConfigSchema,
  defaultConfig: {
    formTitle: 'Contáctanos',
    submitButtonText: 'Enviar',
    successMessage: '¡Mensaje enviado con éxito!',
    fields: [
      { id: '1', type: 'text', label: 'Nombre', placeholder: 'Tu nombre', required: true },
      { id: '2', type: 'email', label: 'Email', placeholder: 'tu@email.com', required: true },
      { id: '3', type: 'textarea', label: 'Mensaje', placeholder: 'Escribe tu mensaje...', required: true },
    ],
    enableHoneypot: true,
    enableCaptcha: true,
    titleColor: '#1f2937',
    labelColor: '#374151',
    placeholderColor: '#9ca3af',
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
