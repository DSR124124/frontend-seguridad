import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DialogState, CellError } from '../models';

@Injectable()
export class FileUploadDialogStateService {
  private stateSubject = new BehaviorSubject<DialogState>({
    canConfirm: false,
    tableData: [],
    errors: []
  });

  state$ = this.stateSubject.asObservable();

  private confirmCallback: (() => void) | null = null;
  private cancelCallback: (() => void) | null = null;

  updateState(state: Partial<DialogState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...state
    });
  }

  get currentState(): DialogState {
    return this.stateSubject.value;
  }

  setCallbacks(onConfirm: () => void, onCancel: () => void): void {
    this.confirmCallback = onConfirm;
    this.cancelCallback = onCancel;
  }

  confirm(): void {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
  }

  cancel(): void {
    if (this.cancelCallback) {
      this.cancelCallback();
    }
  }

  reset(): void {
    this.stateSubject.next({
      canConfirm: false,
      tableData: [],
      errors: []
    });
    this.confirmCallback = null;
    this.cancelCallback = null;
  }
}
