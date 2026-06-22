import React, { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { X } from 'lucide-react';

// Promise-returning dialog utilities for the runtime.
//
// Why: window.confirm/window.prompt/window.alert are non-functional in
// Capacitor Android WebView — Capacitor suppresses the synchronous web
// dialogs and the call returns false/null/undefined immediately without
// showing UI. Use these instead.
//
// Each function mounts a bottom-sheet <div> on document.body, renders a
// modal via React.createRoot, and resolves the Promise when the user
// interacts. The backdrop, the Escape key, and the X button all map to
// cancel/close.

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * Si true, el botón confirm usa buttonStyle('danger') con
   * var(--color-feedback-error) — token semántico, NO --color-primary.
   * Convención mobile (iOS HIG, Material Design) para acciones
   * destructivas/irreversibles: rojo visual contra el clic accidental
   * por inercia. Default false (primary).
   */
  destructive?: boolean;
}

interface PromptOptions {
  title?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}

interface AlertOptions {
  title?: string;
  okLabel?: string;
}

// ── Modal shell shared by all three dialog kinds ─────────────────

interface ModalShellProps {
  title?: string;
  onCancel: () => void;
  children: React.ReactNode;
}

const ModalShell: React.FC<ModalShellProps> = ({ title, onCancel, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-surface-card, #fff)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <h4 className="text-base font-bold" style={{ color: 'var(--color-text-primary, #1f2937)' }}>
            {title ?? ''}
          </h4>
          <button onClick={onCancel} aria-label="Cerrar" style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const buttonStyle = (variant: 'primary' | 'secondary' | 'danger'): React.CSSProperties => {
  if (variant === 'primary') {
    return {
      backgroundColor: 'var(--color-primary, #4F46E5)',
      color: 'var(--color-text-on-primary, #fff)',
      borderRadius: 'var(--radius-button, 12px)',
    };
  }
  if (variant === 'danger') {
    return {
      backgroundColor: 'var(--color-feedback-error, #ef4444)',
      color: '#fff',
      borderRadius: 'var(--radius-button, 12px)',
    };
  }
  return {
    backgroundColor: 'var(--color-surface-variant, #f3f4f6)',
    color: 'var(--color-text-primary, #1f2937)',
    borderRadius: 'var(--radius-button, 12px)',
  };
};

// ── Dialog kinds ─────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string;
  options: ConfirmOptions;
  onResolve: (value: boolean) => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ message, options, onResolve }) => {
  const resolvedRef = useRef(false);
  const settle = (value: boolean) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResolve(value);
  };

  return (
    <ModalShell title={options.title ?? 'Confirmar'} onCancel={() => settle(false)}>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary, #6b7280)' }}>{message}</p>
      <div className="flex gap-2">
        <button
          onClick={() => settle(false)}
          className="flex-1 py-2.5 text-sm font-semibold"
          style={buttonStyle('secondary')}
        >
          {options.cancelLabel ?? 'Cancelar'}
        </button>
        <button
          onClick={() => settle(true)}
          className="flex-1 py-2.5 text-sm font-semibold"
          style={buttonStyle(options.destructive ? 'danger' : 'primary')}
        >
          {options.confirmLabel ?? 'OK'}
        </button>
      </div>
    </ModalShell>
  );
};

interface PromptDialogProps {
  message: string;
  options: PromptOptions;
  onResolve: (value: string | null) => void;
}

const PromptDialog: React.FC<PromptDialogProps> = ({ message, options, onResolve }) => {
  const resolvedRef = useRef(false);
  const [value, setValue] = useState(options.defaultValue ?? '');
  const settle = (v: string | null) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResolve(v);
  };

  const trimmed = value.trim();
  const canSubmit = !options.required || trimmed.length > 0;

  return (
    <ModalShell title={options.title ?? 'Introducir valor'} onCancel={() => settle(null)}>
      <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary, #6b7280)' }}>{message}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={options.placeholder ?? ''}
        autoFocus
        className="w-full p-3 text-sm mb-3"
        style={{
          border: '1px solid var(--color-divider, #e5e7eb)',
          borderRadius: 'var(--radius-button, 12px)',
          color: 'var(--color-text-primary, #1f2937)',
          backgroundColor: 'var(--color-surface-page, #fff)',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canSubmit) settle(trimmed);
        }}
      />
      <div className="flex gap-2">
        <button
          onClick={() => settle(null)}
          className="flex-1 py-2.5 text-sm font-semibold"
          style={buttonStyle('secondary')}
        >
          Cancelar
        </button>
        <button
          onClick={() => settle(trimmed)}
          disabled={!canSubmit}
          className="flex-1 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={buttonStyle('primary')}
        >
          OK
        </button>
      </div>
    </ModalShell>
  );
};

interface AlertDialogProps {
  message: string;
  options: AlertOptions;
  onResolve: () => void;
}

const AlertDialog: React.FC<AlertDialogProps> = ({ message, options, onResolve }) => {
  const resolvedRef = useRef(false);
  const settle = () => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResolve();
  };

  return (
    <ModalShell title={options.title ?? 'Aviso'} onCancel={settle}>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-primary, #1f2937)' }}>{message}</p>
      <button
        onClick={settle}
        className="w-full py-2.5 text-sm font-semibold"
        style={buttonStyle('primary')}
      >
        {options.okLabel ?? 'OK'}
      </button>
    </ModalShell>
  );
};

// ── Mount helpers ────────────────────────────────────────────────

function mount<T>(render: (resolve: (value: T) => void) => React.ReactElement): Promise<T> {
  return new Promise<T>((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root: Root = createRoot(container);
    const cleanup = () => {
      // Defer unmount one tick so React finishes the current commit before
      // we tear down its root — avoids "synchronously unmounting during
      // render" warnings when settle() is triggered from an event handler.
      setTimeout(() => {
        root.unmount();
        container.remove();
      }, 0);
    };
    const settle = (value: T) => {
      cleanup();
      resolve(value);
    };
    root.render(render(settle));
  });
}

// ── Public API ───────────────────────────────────────────────────

export function showConfirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  return mount<boolean>((resolve) => (
    <ConfirmDialog message={message} options={options} onResolve={resolve} />
  ));
}

export function showPrompt(message: string, options: PromptOptions = {}): Promise<string | null> {
  return mount<string | null>((resolve) => (
    <PromptDialog message={message} options={options} onResolve={resolve} />
  ));
}

export function showAlert(message: string, options: AlertOptions = {}): Promise<void> {
  return mount<void>((resolve) => (
    <AlertDialog message={message} options={options} onResolve={resolve} />
  ));
}
