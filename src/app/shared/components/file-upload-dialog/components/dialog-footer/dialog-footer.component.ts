import { Component, OnInit, OnDestroy } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { FileUploadDialogStateService } from '../../services/file-upload-dialog-state.service';
import { Subscription } from 'rxjs';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload-dialog-footer',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    ReactiveFormsModule,
    CommonModule
  ],
  template: `
    <div class="dialog-footer-content">
      <p-button
        styleClass="btn-danger"
        label="Cancelar"
        icon="pi pi-times"
        [outlined]="true"
        (onClick)="onCancel()"
      ></p-button>

      <p-button
        styleClass="btn-secondary btn-v2"
        label="Confirmar"
        icon="pi pi-check"
        (onClick)="onConfirm()"
        [disabled]="!canConfirm"
      ></p-button>
    </div>
  `,
  styles: [`
    .dialog-footer-content {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      width: 100%;
    }
  `]
})
export class FileUploadDialogFooterComponent implements OnInit, OnDestroy {
  canConfirm = false;
  private subscription?: Subscription;

  constructor(
    private stateService: FileUploadDialogStateService
  ) { }

  ngOnInit(): void {
    this.subscription = this.stateService.state$.subscribe(state => {
      this.canConfirm = state.tableData.length > 0 && state.errors.length === 0;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onCancel(): void {
    this.stateService.cancel();
  }

  onConfirm(): void {
    this.stateService.confirm();
  }
}

