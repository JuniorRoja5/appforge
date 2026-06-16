import { useCallback, useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import type { ConfirmConfig } from './types';

interface ConfirmDialogProps {
  open: boolean;
  config: ConfirmConfig;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  open,
  config,
  onConfirm,
  onCancel,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  const variant = config.variant ?? 'primary';
  const confirmCls =
    variant === 'destructive'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-primary hover:opacity-90';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
        <h2
          id="confirm-dialog-title"
          className="text-base font-semibold text-gray-900"
        >
          {config.title}
        </h2>
        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
          {config.description}
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            {config.cancelLabel ?? 'Cancelar'}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors ${confirmCls}`}
          >
            {config.confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

type ConfirmState =
  | { kind: 'idle' }
  | {
      kind: 'open';
      config: ConfirmConfig;
      resolve: (value: boolean) => void;
    };

export interface UseConfirmReturn {
  confirm: (config: ConfirmConfig) => Promise<boolean>;
  dialog: ReactNode;
}

export function useConfirm(): UseConfirmReturn {
  const [state, setState] = useState<ConfirmState>({ kind: 'idle' });

  const confirm = useCallback((config: ConfirmConfig) => {
    return new Promise<boolean>((resolve) => {
      setState({ kind: 'open', config, resolve });
    });
  }, []);

  const onConfirm = useCallback(() => {
    setState((s) => {
      if (s.kind !== 'open') return s;
      s.resolve(true);
      return { kind: 'idle' };
    });
  }, []);

  const onCancel = useCallback(() => {
    setState((s) => {
      if (s.kind !== 'open') return s;
      s.resolve(false);
      return { kind: 'idle' };
    });
  }, []);

  const dialog =
    state.kind === 'open' ? (
      <ConfirmDialog
        open
        config={state.config}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    ) : null;

  return { confirm, dialog };
}
