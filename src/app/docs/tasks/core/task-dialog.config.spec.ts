import { Dialog, DialogConfig } from '@angular/cdk/dialog';

import { openDocsTaskDialog } from './task-dialog.config';

class TestDialogComponent {}

describe('openDocsTaskDialog', () => {
  function createDialogSpy() {
    const open = jasmine.createSpy('open').and.returnValue({ closed: true });
    return {
      dialog: { open } as unknown as Dialog,
      open
    };
  }

  it('uses the readable dialog density by default', () => {
    const { dialog, open } = createDialogSpy();

    openDocsTaskDialog(dialog, TestDialogComponent, { data: { id: 7 } });

    const config = open.calls.mostRecent().args[1] as DialogConfig;
    expect(config.panelClass).toBe('docs-task-dialog-panel');
    expect(config.disableClose).toBeTrue();
    expect(config.data).toEqual({ id: 7 });
    expect(config).not.toEqual(jasmine.objectContaining({ density: jasmine.anything() }));
  });

  it('adds compact density without dropping custom panel classes', () => {
    const { dialog, open } = createDialogSpy();

    openDocsTaskDialog(dialog, TestDialogComponent, {
      density: 'compact',
      panelClass: ['feature-dialog', 'wide-dialog'],
      disableClose: false
    });

    const config = open.calls.mostRecent().args[1] as DialogConfig;
    expect(config.panelClass).toEqual([
      'docs-task-dialog-panel',
      'docs-task-dialog-compact',
      'feature-dialog',
      'wide-dialog'
    ]);
    expect(config.disableClose).toBeFalse();
  });
});
