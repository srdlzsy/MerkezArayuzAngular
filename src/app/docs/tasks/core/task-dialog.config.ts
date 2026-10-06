import { Dialog } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';

const DOCS_TASK_DIALOG_CONFIG = {
  width: 'min(1080px, calc(100vw - 1.25rem))',
  height: 'var(--docs-task-dialog-height)',
  maxWidth: 'calc(100vw - 1.25rem)',
  maxHeight: 'var(--docs-task-dialog-max-height)',
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
  density?: 'comfortable' | 'compact';
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
  const { density = 'comfortable', ...dialogOptions } = options;
  const densityClass = density === 'compact' ? 'docs-task-dialog-compact' : undefined;

  return dialog.open(component, {
    ...DOCS_TASK_DIALOG_CONFIG,
    ...dialogOptions,
    panelClass: mergeClasses(
      DOCS_TASK_DIALOG_CONFIG.panelClass,
      densityClass
        ? mergeClasses(densityClass, options.panelClass)
        : options.panelClass
    ),
    backdropClass: mergeClasses(DOCS_TASK_DIALOG_CONFIG.backdropClass, options.backdropClass),
    disableClose: options.disableClose ?? true
  });
}
