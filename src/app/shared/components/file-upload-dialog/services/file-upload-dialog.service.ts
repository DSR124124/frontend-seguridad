import { Injectable } from '@angular/core';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable, Subject } from 'rxjs';
import { FileUploadDialogComponent } from '../file-upload-dialog.component';
import { FileUploadDialogFooterComponent } from '../components/dialog-footer/dialog-footer.component';
import { FileUploadConfig, FileUploadResult, FileUploadDialogOptions } from '../models';

/**
 * Servicio para abrir el diálogo de carga de archivos.
 *
 * Este servicio centraliza toda la lógica de apertura del diálogo,
 * siguiendo los principios SOLID:
 * - Single Responsibility: Solo se encarga de abrir el diálogo
 * - Open/Closed: Extensible sin modificar código existente
 * - Dependency Inversion: Depende de abstracciones (interfaces)
 *
 * @example
 * ```typescript
 * // En tu componente
 * constructor(private fileUploadService: FileUploadDialogService) {}
 *
 * openDialog(): void {
 *   const config: FileUploadConfig = {
 *     columns: [...],
 *     title: 'Cargar Datos'
 *   };
 *
 *   this.fileUploadService.open(config).subscribe(result => {
 *     if (result) {
 *       console.log('Datos:', result.data);
 *     }
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class FileUploadDialogService {
  private dialogRef: DynamicDialogRef | null = null;

  constructor(private dialogService: DialogService) { }

  /**
   * Abre el diálogo de carga de archivos con la configuración especificada.
   *
   * @param config Configuración de columnas y opciones del diálogo
   * @param options Opciones adicionales de visualización (opcional)
   * @returns Observable que emite el resultado cuando se cierra el diálogo
   */
  open(
    config: FileUploadConfig,
    options?: FileUploadDialogOptions
  ): Observable<FileUploadResult | null> {
    const result$ = new Subject<FileUploadResult | null>();

    const defaultOptions: FileUploadDialogOptions = {
      width: '90vw',
      height: '80vh',
      maximizable: true,
      closable: true,
      baseZIndex: 10000
    };

    const mergedOptions = { ...defaultOptions, ...options };

    this.dialogRef = this.dialogService.open(FileUploadDialogComponent, {
      header: config.title || 'Cargar Datos',
      width: mergedOptions.width,
      height: mergedOptions.height,
      maximizable: mergedOptions.maximizable,
      modal: true,
      baseZIndex: mergedOptions.baseZIndex,
      closable: mergedOptions.closable,
      contentStyle: { overflow: 'auto' },
      data: {
        config: config
      },
      templates: {
        footer: FileUploadDialogFooterComponent
      }
    });

    this.dialogRef.onClose.subscribe((dialogResult: FileUploadResult | null) => {
      result$.next(dialogResult);
      result$.complete();
      this.dialogRef = null;
    });

    return result$.asObservable();
  }

  /**
   * Cierra el diálogo actual si está abierto.
   */
  close(): void {
    if (this.dialogRef) {
      this.dialogRef.close(null);
      this.dialogRef = null;
    }
  }

  /**
   * Verifica si hay un diálogo abierto.
   */
  isOpen(): boolean {
    return this.dialogRef !== null;
  }
}
