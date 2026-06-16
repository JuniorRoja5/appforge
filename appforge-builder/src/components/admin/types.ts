import type { ReactNode } from 'react';

export type RowActionVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'destructive';

export interface ConfirmConfig {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'destructive';
}

export interface RowAction<T> {
  id: string;
  label: string;
  icon: ReactNode;
  variant?: RowActionVariant;
  isAvailable?: (item: T) => boolean;
  confirm?: ConfirmConfig;
  onClick: (item: T) => Promise<void>;
}

export interface StatusOption<S extends string = string> {
  value: S;
  label: string;
}

export type WorkflowInboxPagination =
  | { kind: 'none' }
  | {
      kind: 'page';
      page: number;
      totalPages: number;
      onPage: (page: number) => void;
    };
