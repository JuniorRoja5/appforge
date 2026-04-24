import React, { useState, useEffect, useRef } from 'react';
import { Clock, Check, Calendar } from 'lucide-react';
import { getAvailableSlots, createBooking } from '../../lib/api';
import { registerRuntimeModule } from '../registry';

interface BookingField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea';
  label: string;
  required: boolean;
}

const DEFAULT_FIELDS: BookingField[] = [
  { id: '1', type: 'text', label: 'Nombre completo', required: true },
  { id: '2', type: 'email', label: 'Email', required: true },
  { id: '3', type: 'phone', label: 'Teléfono', required: true },
  { id: '4', type: 'textarea', label: 'Notas adicionales', required: false },
];

function normalizeFields(raw: unknown): BookingField[] {
  if (!Array.isArray(raw)) return DEFAULT_FIELDS;
  return raw.map((f: any) => ({
    id: f.id ?? f.name ?? String(Math.random()),
    type: f.type === 'tel' ? 'phone' : (f.type ?? 'text'),
    label: f.label ?? '',
    required: f.required ?? false,
  }));
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday-based
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

const BookingRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const title = (data.title as string) ?? 'Reservar Cita';
  const description = (data.description as string) ?? '';
  const timeSlots = (data.timeSlots as string[]) ?? [];
  const slotDuration = (data.slotDuration as number) ?? 30;
  const submitButtonText = (data.submitButtonText as string) ?? 'Confirmar Reserva';
  const fields = normalizeFields(data.fields ?? data.formFields);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [selectedSlot, setSelectedSlot] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'select' | 'form' | 'sending' | 'success' | 'error'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  // Determine available days for the calendar (next 30 days, skip weekends)
  const availableDays = new Set<string>();
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      availableDays.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  }

  // Load available slots when date changes
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    setSelectedSlot('');
    getAvailableSlots(selectedDate)
      .then((slots) => {
        // Slots returned by API are the AVAILABLE ones. Everything in timeSlots not in slots is booked.
        setAvailableSlots(slots);
        const booked = new Set(timeSlots.filter((s) => !slots.includes(s)));
        setBookedSlots(booked);
      })
      .catch(() => {
        // If API fails, show all configured timeSlots as available
        setAvailableSlots(timeSlots);
        setBookedSlots(new Set());
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  // Scroll to form when slot selected
  useEffect(() => {
    if (status === 'form') {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [status]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await createBooking({ date: selectedDate, timeSlot: selectedSlot, duration: slotDuration, formData });
      setStatus('success');
    } catch (err: any) {
      setError(err?.message || 'Error al reservar. Intenta otro horario.');
      setStatus('error');
    }
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (availableDays.has(dateStr)) {
      setSelectedDate(dateStr);
      setStatus('select');
    }
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };

  // ── Success view ──
  if (status === 'success') {
    return (
      <div className="text-center p-8" style={{ borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-surface-card)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--color-feedback-success, #22c55e)20' }}>
          <Check size={28} style={{ color: 'var(--color-feedback-success, #22c55e)' }} />
        </div>
        <h4 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Reserva confirmada</h4>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{selectedDate} a las {selectedSlot}</p>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          Tu reserva ha sido recibida. El negocio se pondrá en contacto contigo para confirmar.
        </p>
        <button onClick={() => { setStatus('select'); setSelectedSlot(''); setSelectedDate(''); setFormData({}); }} className="mt-4 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
          Nueva reserva
        </button>
      </div>
    );
  }

  const calDays = getCalendarDays(calYear, calMonth);
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  // Determine which slots to show: configured timeSlots, or fallback from API
  const slotsToShow = timeSlots.length > 0 ? timeSlots : availableSlots;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      </div>
      {description && (
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
      )}

      {/* Mini Calendar */}
      <div className="mb-4 p-3" style={{ borderRadius: 'var(--radius-card, 12px)', backgroundColor: 'var(--color-surface-card)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={prevMonth} className="p-1 rounded" style={{ color: 'var(--color-text-secondary)' }}>&lt;</button>
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{monthNames[calMonth]} {calYear}</span>
          <button onClick={nextMonth} className="p-1 rounded" style={{ color: 'var(--color-text-secondary)' }}>&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayHeaders.map((d) => (
            <span key={d} className="text-[9px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{d}</span>
          ))}
          {calDays.map((day, i) => {
            if (day === null) return <span key={`e-${i}`} />;
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isAvailable = availableDays.has(dateStr);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            return (
              <button
                key={`d-${day}`}
                onClick={() => handleDateClick(day)}
                disabled={!isAvailable}
                className="w-7 h-7 rounded-full text-[10px] font-medium flex items-center justify-center mx-auto"
                style={{
                  backgroundColor: isSelected ? 'var(--color-primary)' : isToday ? 'var(--color-primary)' : isAvailable ? 'var(--color-primary, #9333ea)1A' : 'transparent',
                  color: isSelected || isToday ? 'var(--color-text-on-primary, #fff)' : isAvailable ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  opacity: isAvailable ? 1 : 0.4,
                  cursor: isAvailable ? 'pointer' : 'default',
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="mb-4">
          <div className="flex items-center gap-1 mb-2">
            <Clock size={12} style={{ color: 'var(--color-text-secondary)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Horarios — {slotDuration} min
            </span>
          </div>
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="animate-pulse h-10 rounded-lg" style={{ backgroundColor: 'var(--color-surface-variant)' }} />)}
            </div>
          ) : slotsToShow.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>No hay horarios disponibles para esta fecha.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {slotsToShow.map((slot) => {
                  const isBooked = bookedSlots.has(slot);
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => { if (!isBooked) { setSelectedSlot(slot); setStatus('form'); } }}
                      disabled={isBooked}
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-[10px] font-medium transition-colors"
                      style={{
                        backgroundColor: isBooked ? 'var(--color-feedback-error, #ef4444)10' : isSelected ? 'var(--color-primary)' : 'var(--color-surface-card)',
                        color: isBooked ? 'var(--color-feedback-error, #ef4444)' : isSelected ? 'var(--color-text-on-primary)' : 'var(--color-text-primary)',
                        border: isBooked ? 'none' : '1px solid var(--color-divider)',
                        textDecoration: isBooked ? 'line-through' : 'none',
                        opacity: isBooked ? 0.5 : 1,
                        cursor: isBooked ? 'default' : 'pointer',
                        borderRadius: 'var(--radius-button, 8px)',
                      }}
                    >
                      <Clock size={10} /> {slot}
                    </button>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                  <span className="text-[9px]" style={{ color: 'var(--color-text-secondary)' }}>Disponible</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-feedback-error, #ef4444)' }} />
                  <span className="text-[9px]" style={{ color: 'var(--color-text-secondary)' }}>Ocupado</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!selectedDate && (
        <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>Selecciona una fecha en el calendario</p>
      )}

      {/* Form */}
      {(status === 'form' || status === 'sending' || status === 'error') && (
        <div ref={formRef}>
          <form onSubmit={handleBook} className="space-y-3 mt-2">
            <div className="flex items-center gap-2 p-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-primary, #9333ea)15', color: 'var(--color-primary)' }}>
              <Clock size={14} /> {selectedSlot} — {selectedDate}
              <button type="button" onClick={() => setStatus('select')} className="ml-auto text-xs underline">Cambiar</button>
            </div>

            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>Datos del cliente</p>

            {fields.map((field) => (
              <div key={field.id}>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {field.label}
                  {field.required && <span style={{ color: 'var(--color-feedback-error, #ef4444)' }}> *</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.id] ?? ''}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    required={field.required}
                    rows={2}
                    placeholder={field.label}
                    className="w-full px-3 py-2.5 text-sm border rounded-lg resize-none"
                    style={{ borderColor: 'var(--color-divider)', borderRadius: 'var(--radius-input)' }}
                  />
                ) : (
                  <input
                    type={field.type === 'phone' ? 'tel' : field.type}
                    value={formData[field.id] ?? ''}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    required={field.required}
                    placeholder={field.label}
                    className="w-full px-3 py-2.5 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-divider)', borderRadius: 'var(--radius-input)' }}
                  />
                )}
              </div>
            ))}

            {status === 'error' && <p className="text-xs" style={{ color: 'var(--color-feedback-error)' }}>{error}</p>}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full py-3 text-sm font-semibold rounded-xl disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-on-primary)', borderRadius: 'var(--radius-button)' }}
            >
              {status === 'sending' ? 'Reservando...' : submitButtonText}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

registerRuntimeModule({ id: 'booking', Component: BookingRuntime });