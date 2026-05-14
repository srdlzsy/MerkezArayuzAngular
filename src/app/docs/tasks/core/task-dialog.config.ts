import { Dialog } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';

const DOCS_TASK_DIALOG_CONFIG = {
  width: '80vh',
  height: 'auto',
  maxWidth: '100vw',
  maxHeight: '100vh',
  autoFocus: false,
  restoreFocus: false,
  backdropClass: 'docs-task-dialog-backdrop',
  panelClass: 'docs-task-dialog-panel'
};

export interface DocsTaskDialogOptions<TData = unknown> {
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
  disableClose?: boolean;
  ariaLabel?: string;
  data?: TData;
  panelClass?: string | string[];
  backdropClass?: string | string[];
}

function mergeClasses(defaultValue: string | string[], overrideValue?: string | string[]) {
  if (!overrideValue) {
    return defaultValue;
  }

  const toArray = (value: string | string[]) => Array.isArray(value) ? value : [value];
  return [...toArray(defaultValue), ...toArray(overrideValue)];
}

export function openDocsTaskDialog<TComponent, TData = unknown>(
  dialog: Dialog,
  component: ComponentType<TComponent>,
  options: DocsTaskDialogOptions<TData> = {}
) {
  return dialog.open(component, {
    ...DOCS_TASK_DIALOG_CONFIG,
    ...options,
    panelClass: mergeClasses(DOCS_TASK_DIALOG_CONFIG.panelClass, options.panelClass),
    backdropClass: mergeClasses(DOCS_TASK_DIALOG_CONFIG.backdropClass, options.backdropClass),
    disableClose: options.disableClose ?? true

  });
}
