import React, { useState, useEffect, useCallback } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  Calendar, Clock, Plus, Trash2,
  ChevronLeft, ChevronRight,
  User, Mail, Phone, FileText,
  CheckCircle, XCircle, Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  getBookings,
  getAvailableSlots,
  updateBookingStatus,
  deleteBooking,
  type BookingRecord,
} from '../../lib/api';

// --- Zod schemas ---

const BookingFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'email', 'phone', 'textarea']),
  label: z.string(),
  required: z.boolean(),
});

type BookingField = z.infer<typeof BookingFieldSchema>;

const BookingConfigSchema = z.object({
  title: z.string(),
  description: z.string(),
  timeSlots: z.array(z.string()),
  slotDuration: z.number(),
  fields: z.array(BookingFieldSchema),
  submitButtonText: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

type BookingConfig = z.infer<typeof BookingConfigSchema>;

// --- Field type icons ---
const fieldTypeIcons: Record<BookingField['type'], React.ReactNode> = {
  text: <User size={14} />,
  email: <Mail size={14} />,
  phone: <Phone size={14} />,
  textarea: <FileText size={14} />,
};

const fieldTypeLabels: Record<BookingField['type'], string> = {
  text: 'Texto',
  email: 'Email',
  phone: 'Teléfono',
  textarea: 'Área de texto',
};

// --- Calendar helper ---
function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- Status badge ---
const statusConfig: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: 'Confirmada', cls: 'bg-green-50 text-green-700 border-green-200' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-red-50 text-red-600 border-red-200' },
  COMPLETED: { label: 'Completada', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

// ========================
// PreviewComponent
// ========================
const PreviewComponent: React.FC<{ data: BookingConfig; isSelected: boolean }> = ({ data: rawData }) => {
  const data = { ...rawData, fields: rawData.fields ?? [], timeSlots: rawData.timeSlots ?? [] };
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const calendarDays = getCalendarDays(year, month);

  const [availableSlots, setAvailableSlots] = useState<string[] | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());

  // Load real data if appId exists
  useEffect(() => {
    if (!data.appId) {
      setAvailableSlots(null);
      return;
    }
    const todayStr = formatDate(now);
    getAvailableSlots(data.appId, todayStr)
      .then((slots) => {
        setAvailableSlots(slots);
        const booked = new Set(data.timeSlots.filter((s) => !slots.includes(s)));
        setBookedSlots(booked);
      })
      .catch(() => setAvailableSlots(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.appId, data._refreshKey]);

  // Mock available days for calendar
  const availableDays = new Set<number>();
  for (let d = today; d <= Math.min(today + 10, 31); d++) {
    const dayOfWeek = new Date(year, month, d).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) availableDays.add(d);
  }

  const slotsToShow = data.timeSlots ?? [];

  return (
    <div className="space-y-0 overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{
          background: `linear-gradient(135deg, var(--af-color-primary, #4F46E5), var(--af-color-primary, #4F46E5)dd)`,
        }}
      >
        <Calendar size={18} className="text-white" />
        <h2 className="text-sm font-bold text-white truncate">{data.title}</h2>
      </div>

      <div className="p-3 space-y-3">
        {data.description && (
          <p className="text-xs text-gray-500 leading-relaxed">{data.description}</p>
        )}

        {/* Mini calendar */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
            <button className="p-0.5 text-gray-400" disabled><ChevronLeft size={14} /></button>
            <span className="text-[11px] font-semibold text-gray-700">{MONTH_NAMES[month]} {year}</span>
            <button className="p-0.5 text-gray-400" disabled><ChevronRight size={14} /></button>
          </div>
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-[9px] font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-white p-1">
            {calendarDays.map((day, i) => {
              const isToday = day === today;
              const isAvailable = day !== null && availableDays.has(day);
              const isPast = day !== null && day < today;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-center w-7 h-7 text-[10px] rounded-full mx-auto
                    ${isToday ? 'text-white font-bold' : isAvailable ? 'font-medium' : isPast ? 'text-gray-300' : 'text-gray-400'}`}
                  style={
                    isToday
                      ? { backgroundColor: 'var(--af-color-primary, #4F46E5)' }
                      : isAvailable && !isToday
                        ? { backgroundColor: 'var(--af-color-primary, #4F46E5)1A', color: 'var(--af-color-primary, #4F46E5)' }
                        : undefined
                  }
                >
                  {day ?? ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <Clock size={12} className="text-gray-400" />
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              Horarios {data.appId ? '(hoy)' : 'disponibles'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {slotsToShow.map((slot) => {
              const isBooked = availableSlots !== null && bookedSlots.has(slot);
              return (
                <span
                  key={slot}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    isBooked
                      ? 'bg-red-50 text-red-400 border-red-200 line-through'
                      : availableSlots !== null
                        ? 'text-white border-transparent font-medium'
                        : 'text-gray-600 border-gray-200 bg-white'
                  }`}
                  style={
                    !isBooked && availableSlots !== null
                      ? { backgroundColor: 'var(--af-color-primary, #4F46E5)', borderColor: 'var(--af-color-primary, #4F46E5)' }
                      : undefined
                  }
                >
                  {slot}
                </span>
              );
            })}
          </div>
          {availableSlots !== null && (
            <div className="flex items-center gap-3 mt-2 text-[9px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--af-color-primary, #4F46E5)' }} /> Disponible
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-300" /> Ocupado
              </span>
            </div>
          )}
        </div>

        {/* Form fields preview */}
        <div className="space-y-2">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Datos del cliente
          </span>
          {(data.fields ?? []).map((field) => (
            <div key={field.id}>
              <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-[11px] bg-gray-50 resize-none placeholder-gray-300"
                  placeholder={field.label}
                  rows={2}
                  readOnly
                />
              ) : (
                <div className="flex items-center border border-gray-200 rounded-md bg-gray-50 overflow-hidden">
                  <span className="px-2 text-gray-300">{fieldTypeIcons[field.type]}</span>
                  <input
                    type={field.type === 'phone' ? 'tel' : field.type}
                    className="flex-1 px-1 py-1.5 text-[11px] bg-transparent placeholder-gray-300 outline-none"
                    placeholder={field.label}
                    readOnly
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit button */}
        <button
          className="w-full py-2.5 text-white text-xs font-semibold rounded-lg shadow-sm"
          style={{
            background: `linear-gradient(135deg, var(--af-color-primary, #4F46E5), var(--af-color-primary, #4F46E5)cc)`,
          }}
          disabled
        >
          {data.submitButtonText}
        </button>

        <p className="text-center text-[9px] text-gray-400 italic">
          Vista previa — la funcionalidad estará disponible en la app generada
        </p>
      </div>
    </div>
  );
};

// ========================
// RuntimeComponent
// ========================
const RuntimeComponent: React.FC<{ data: BookingConfig }> = () => (
  <div className="p-6 text-center text-gray-500 text-sm">
    <Calendar className="mx-auto mb-2 text-gray-400" size={32} />
    <p>Módulo de reservas — disponible en la app generada</p>
  </div>
);

// ========================
// SettingsPanel
// ========================
const SettingsPanel: React.FC<{ data: BookingConfig; onChange: (data: BookingConfig) => void }> = ({
  data: rawData,
  onChange,
}) => {
  const data = { ...rawData, fields: rawData.fields ?? [], timeSlots: rawData.timeSlots ?? [] };
  const token = useAuthStore((s) => s.token);
  const [newSlot, setNewSlot] = useState('');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [showAddField, setShowAddField] = useState(false);

  // New field form state
  const [newFieldType, setNewFieldType] = useState<BookingField['type']>('text');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Edit field form state
  const [editFieldType, setEditFieldType] = useState<BookingField['type']>('text');
  const [editFieldLabel, setEditFieldLabel] = useState('');
  const [editFieldRequired, setEditFieldRequired] = useState(false);

  // Section toggles
  const [showConfig, setShowConfig] = useState(true);
  const [showBookings, setShowBookings] = useState(true);

  // Bookings state
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const refreshPreview = useCallback(() => {
    onChange({ ...data, _refreshKey: (data._refreshKey ?? 0) + 1 });
  }, [data, onChange]);

  // Load bookings
  const loadBookings = useCallback(async () => {
    if (!data.appId || !token) return;
    setBookingsLoading(true);
    try {
      const filters: { date?: string; status?: string } = {};
      if (filterDate) filters.date = filterDate;
      if (filterStatus) filters.status = filterStatus;
      const result = await getBookings(data.appId, token, filters);
      setBookings(result);
    } catch {
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [data.appId, token, filterDate, filterStatus]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleStatusChange = async (bookingId: string, status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') => {
    if (!data.appId || !token) return;
    setActionLoading(bookingId);
    try {
      await updateBookingStatus(data.appId, bookingId, status, token);
      await loadBookings();
      refreshPreview();
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!data.appId || !token) return;
    setActionLoading(bookingId);
    try {
      await deleteBooking(data.appId, bookingId, token);
      await loadBookings();
      refreshPreview();
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  // Field editing
  const startEditField = (field: BookingField) => {
    setEditingFieldId(field.id);
    setEditFieldType(field.type);
    setEditFieldLabel(field.label);
    setEditFieldRequired(field.required);
  };

  const saveEditField = () => {
    if (!editingFieldId || !editFieldLabel.trim()) return;
    onChange({
      ...data,
      fields: data.fields.map((f) =>
        f.id === editingFieldId
          ? { ...f, type: editFieldType, label: editFieldLabel.trim(), required: editFieldRequired }
          : f,
      ),
    });
    setEditingFieldId(null);
  };

  const cancelEditField = () => setEditingFieldId(null);

  const addField = () => {
    if (!newFieldLabel.trim()) return;
    const newField: BookingField = {
      id: Date.now().toString(),
      type: newFieldType,
      label: newFieldLabel.trim(),
      required: newFieldRequired,
    };
    onChange({ ...data, fields: [...data.fields, newField] });
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setShowAddField(false);
  };

  const removeField = (id: string) => {
    onChange({ ...data, fields: data.fields.filter((f) => f.id !== id) });
  };

  const addTimeSlot = () => {
    const trimmed = newSlot.trim();
    if (!trimmed || !/^\d{2}:\d{2}$/.test(trimmed)) return;
    if (data.timeSlots.includes(trimmed)) return;
    const updated = [...data.timeSlots, trimmed].sort();
    onChange({ ...data, timeSlots: updated });
    setNewSlot('');
  };

  const removeTimeSlot = (slot: string) => {
    onChange({ ...data, timeSlots: data.timeSlots.filter((s) => s !== slot) });
  };

  const sectionHeaderCls = 'flex items-center justify-between cursor-pointer py-2 px-1 rounded-lg hover:bg-gray-50 transition-colors';
  const sectionTitleCls = 'text-xs font-bold text-gray-500 uppercase tracking-wider';

  return (
    <div className="space-y-4">
      {/* ─── Configuration Section ─── */}
      <div>
        <div className={sectionHeaderCls} onClick={() => setShowConfig(!showConfig)}>
          <h3 className={sectionTitleCls}>Configuración</h3>
          <ChevronRight size={14} className={`text-gray-400 transition-transform ${showConfig ? 'rotate-90' : ''}`} />
        </div>

        {showConfig && (
          <div className="space-y-4 mt-2">
            {/* General settings */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => onChange({ ...data, title: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={data.description}
                  onChange={(e) => onChange({ ...data, description: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Texto del botón</label>
                <input
                  type="text"
                  value={data.submitButtonText}
                  onChange={(e) => onChange({ ...data, submitButtonText: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Duración del turno (minutos)</label>
                <input
                  type="number"
                  value={data.slotDuration}
                  onChange={(e) => onChange({ ...data, slotDuration: Math.max(5, parseInt(e.target.value) || 5) })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  min={5}
                  step={5}
                />
              </div>
            </div>

            {/* Time slots */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Horarios disponibles</h4>
              <div className="flex flex-wrap gap-1.5">
                {data.timeSlots.map((slot) => (
                  <span key={slot} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs border border-purple-200">
                    <Clock size={10} />
                    {slot}
                    <button onClick={() => removeTimeSlot(slot)} className="text-purple-400 hover:text-red-500 ml-0.5">
                      <Trash2 size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="time" value={newSlot} onChange={(e) => setNewSlot(e.target.value)} className="flex-1 px-2 py-1.5 border rounded text-sm" />
                <button onClick={addTimeSlot} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">
                  <Plus size={12} /> Agregar
                </button>
              </div>
            </div>

            {/* Form fields */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Campos del formulario</h4>

              {(data.fields ?? []).map((field) => (
                <div key={field.id}>
                  {editingFieldId === field.id ? (
                    <div className="border border-purple-200 rounded-lg p-3 bg-purple-50 space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                        <select value={editFieldType} onChange={(e) => setEditFieldType(e.target.value as BookingField['type'])} className="w-full px-2 py-1 border rounded text-xs">
                          {(Object.keys(fieldTypeLabels) as BookingField['type'][]).map((t) => (
                            <option key={t} value={t}>{fieldTypeLabels[t]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Etiqueta</label>
                        <input type="text" value={editFieldLabel} onChange={(e) => setEditFieldLabel(e.target.value)} className="w-full px-2 py-1 border rounded text-xs" />
                      </div>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={editFieldRequired} onChange={(e) => setEditFieldRequired(e.target.checked)} />
                        Obligatorio
                      </label>
                      <div className="flex gap-2">
                        <button onClick={saveEditField} className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">Guardar</button>
                        <button onClick={cancelEditField} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 border rounded-lg bg-white hover:bg-gray-50">
                      <span className="text-purple-600">{fieldTypeIcons[field.type]}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-800 truncate block">{field.label}</span>
                        <span className="text-[10px] text-gray-400">{fieldTypeLabels[field.type]}{field.required && ' • Obligatorio'}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => startEditField(field)} className="p-1 text-blue-500 hover:text-blue-700" title="Editar">
                          <FileText size={12} />
                        </button>
                        <button onClick={() => removeField(field.id)} className="p-1 text-red-500 hover:text-red-700" title="Eliminar">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {showAddField ? (
                <div className="border border-purple-200 rounded-lg p-3 bg-purple-50 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de campo</label>
                    <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as BookingField['type'])} className="w-full px-2 py-1 border rounded text-xs">
                      {(Object.keys(fieldTypeLabels) as BookingField['type'][]).map((t) => (
                        <option key={t} value={t}>{fieldTypeLabels[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Etiqueta</label>
                    <input type="text" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} className="w-full px-2 py-1 border rounded text-xs" placeholder="Ej: Nombre completo" />
                  </div>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} />
                    Obligatorio
                  </label>
                  <div className="flex gap-2">
                    <button onClick={addField} className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">
                      <Plus size={12} /> Agregar
                    </button>
                    <button onClick={() => setShowAddField(false)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddField(true)} className="w-full flex items-center justify-center gap-1 py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-lg text-xs hover:bg-purple-50">
                  <Plus size={14} /> Agregar campo
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Bookings List Section ─── */}
      {data.appId && (
        <div>
          <div className={sectionHeaderCls} onClick={() => setShowBookings(!showBookings)}>
            <h3 className={sectionTitleCls}>Reservas ({bookings.length})</h3>
            <ChevronRight size={14} className={`text-gray-400 transition-transform ${showBookings ? 'rotate-90' : ''}`} />
          </div>

          {showBookings && (
            <div className="space-y-3 mt-2">
              {/* Filters */}
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="flex-1 px-2 py-1.5 border rounded text-xs"
                  placeholder="Filtrar por fecha"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2 py-1.5 border rounded text-xs"
                >
                  <option value="">Todos</option>
                  <option value="CONFIRMED">Confirmadas</option>
                  <option value="CANCELLED">Canceladas</option>
                  <option value="COMPLETED">Completadas</option>
                </select>
              </div>

              {/* Bookings list */}
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-purple-500" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400">No hay reservas{filterDate || filterStatus ? ' con estos filtros' : ''}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {bookings.map((booking) => {
                    const sc = statusConfig[booking.status] ?? statusConfig.CONFIRMED;
                    const isLoading = actionLoading === booking.id;
                    const formEntries = Object.entries(booking.formData || {}).slice(0, 3);

                    return (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
                        {/* Header row */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Calendar size={12} className="text-gray-400" />
                              <span className="text-xs font-semibold text-gray-800">
                                {new Date(booking.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-xs text-gray-500">·</span>
                              <Clock size={12} className="text-gray-400" />
                              <span className="text-xs font-medium text-gray-700">{booking.timeSlot}</span>
                            </div>
                            <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${sc.cls}`}>
                              {sc.label}
                            </span>
                          </div>
                          <span className="text-[9px] text-gray-400">{booking.duration} min</span>
                        </div>

                        {/* Form data summary */}
                        {formEntries.length > 0 && (
                          <div className="text-[10px] text-gray-500 space-y-0.5 pl-1">
                            {formEntries.map(([key, val]) => (
                              <div key={key} className="truncate">
                                <span className="font-medium text-gray-600">{key}:</span> {String(val)}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                          {isLoading ? (
                            <Loader2 size={14} className="animate-spin text-gray-400" />
                          ) : (
                            <>
                              {booking.status === 'CONFIRMED' && (
                                <>
                                  <button
                                    onClick={() => handleStatusChange(booking.id, 'COMPLETED')}
                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <CheckCircle size={12} /> Completar
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(booking.id, 'CANCELLED')}
                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <XCircle size={12} /> Cancelar
                                  </button>
                                </>
                              )}
                              {booking.status === 'CANCELLED' && (
                                <button
                                  onClick={() => handleStatusChange(booking.id, 'CONFIRMED')}
                                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-green-600 hover:bg-green-50 rounded transition-colors"
                                >
                                  <CheckCircle size={12} /> Reactivar
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(booking.id)}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-auto"
                              >
                                <Trash2 size={12} /> Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!data.appId && (
        <div className="text-center py-4 border border-dashed border-gray-200 rounded-lg">
          <Calendar size={20} className="mx-auto text-gray-300 mb-1.5" />
          <p className="text-[11px] text-gray-400">Guarda la app para gestionar reservas</p>
        </div>
      )}
    </div>
  );
};

// ========================
// Module Definition
// ========================
export const BookingModule: ModuleDefinition<BookingConfig> = {
  id: 'booking',
  name: 'Reservar Cita',
  icon: <Calendar size={20} />,
  description: 'Módulo de reserva de citas y turnos con calendario y formulario',
  schema: BookingConfigSchema,
  defaultConfig: {
    title: 'Reservar Cita',
    description: 'Selecciona fecha y hora para tu cita.',
    timeSlots: [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
    ],
    slotDuration: 30,
    fields: [
      { id: '1', type: 'text', label: 'Nombre completo', required: true },
      { id: '2', type: 'email', label: 'Email', required: true },
      { id: '3', type: 'phone', label: 'Teléfono', required: true },
      { id: '4', type: 'textarea', label: 'Notas adicionales', required: false },
    ],
    submitButtonText: 'Confirmar Reserva',
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
