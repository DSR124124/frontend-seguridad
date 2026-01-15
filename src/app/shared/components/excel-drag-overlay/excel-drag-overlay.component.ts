import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { ExcelDragDropService } from '../../services/excel-drag-drop.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { PrimeNGModules } from '../../../prime-ng/prime-ng';

@Component({
  selector: 'app-excel-drag-overlay',
  standalone: true,
  templateUrl: './excel-drag-overlay.component.html',
  styleUrls: ['./excel-drag-overlay.component.css'],
  imports: [
    ...PrimeNGModules,
    ReactiveFormsModule,
    CommonModule
  ],
})
export class ExcelDragOverlayComponent implements OnInit, OnDestroy {
  @Input() title: string = 'Arrastra tus archivos Excel/CSV aquí';
  @Input() description: string = 'Suelta los archivos para procesarlos automáticamente';
  @Input() supportedFormats: string = 'Formatos soportados: .xlsx, .xls, .csv';
  @Input() icon: string = 'pi pi-upload';

  isDragOver: boolean = false;
  private dragOverSubscription?: Subscription;

  constructor(private excelDragDropService: ExcelDragDropService) {}

  ngOnInit(): void {
    this.dragOverSubscription = this.excelDragDropService.isDragOver$.subscribe(
      (isDragOver) => {
        this.isDragOver = isDragOver;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.dragOverSubscription) {
      this.dragOverSubscription.unsubscribe();
    }
  }

  onDragOver(e: DragEvent): void {
    this.excelDragDropService.handleElementDragOver(e);
  }

  onDragLeave(e: DragEvent): void {
    const element = e.currentTarget as HTMLElement;
    this.excelDragDropService.handleElementDragLeave(e, element);
  }

  onDrop(e: DragEvent): void {
    this.excelDragDropService.handleElementDrop(e);
  }

  closeOverlay(): void {
    this.excelDragDropService.closeOverlay();
  }
}
