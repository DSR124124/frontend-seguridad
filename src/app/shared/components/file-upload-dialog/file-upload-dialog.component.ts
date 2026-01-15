import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Carousel } from 'primeng/carousel';
import * as ExcelJS from 'exceljs';
import {
  FileUploadConfig,
  ColumnDataType,
  CellError,
  FileUploadResult,
  FileDropResult,
  TableRow,
  TableChangeEvent
} from './models';
import { FileUploadDialogStateService } from './services/file-upload-dialog-state.service';

interface CarouselItem {
  id: 'file' | 'manual';
  label: string;
  icon: string;
}

@Component({
  selector: 'app-file-upload-dialog',
  standalone: false,
  templateUrl: './file-upload-dialog.component.html',
  styleUrls: ['./file-upload-dialog.component.css']
})
export class FileUploadDialogComponent implements OnInit, OnDestroy {
  @ViewChild('carousel') carousel!: Carousel;

  config!: FileUploadConfig;

  // Carousel
  carouselItems: CarouselItem[] = [
    { id: 'file', label: 'Cargar Archivo', icon: 'pi-upload' },
    { id: 'manual', label: 'Ingreso Manual', icon: 'pi-pencil' }
  ];
  activeIndex = 0;

  // Datos
  tableData: TableRow[] = [];
  fileData: TableRow[] = [];  // Datos del modo archivo
  manualData: TableRow[] = [];  // Datos del modo manual
  errors: CellError[] = [];

  // Estado
  isLoading = false;
  selectedFile: File | null = null;

  constructor(
    public ref: DynamicDialogRef,
    public dialogConfig: DynamicDialogConfig,
    private stateService: FileUploadDialogStateService
  ) { }

  ngOnInit(): void {
    this.config = this.dialogConfig.data?.config || this.getDefaultConfig();

    // Configurar callbacks para el footer
    this.stateService.setCallbacks(
      () => this.onConfirm(),
      () => this.onCancel()
    );

    // Actualizar estado inicial
    this.updateDialogState();
  }

  ngOnDestroy(): void {
    this.stateService.reset();
  }

  private updateDialogState(): void {
    this.stateService.updateState({
      tableData: this.tableData,
      errors: this.errors,
      canConfirm: this.tableData.length > 0 && this.errors.length === 0
    });
  }

  private getDefaultConfig(): FileUploadConfig {
    return {
      columns: [],
      title: 'Cargar Datos',
      allowManualEntry: true,
      allowFileUpload: true,
      maxRows: 1000,
      minRows: 1,
      allowedExtensions: ['.xlsx', '.xls'],
      maxFileSizeMB: 5,
      showTemplateDownload: true,
      templateFileName: 'plantilla.xlsx'
    };
  }

  // === CAROUSEL NAVIGATION ===
  navigateToSlide(index: number): void {
    // Guardar datos del modo actual
    if (this.activeIndex === 0) {
      this.fileData = [...this.tableData];
    } else {
      this.manualData = [...this.tableData];
    }

    this.activeIndex = index;

    // Cargar datos del nuevo modo
    if (index === 0) {
      this.tableData = [...this.fileData];
    } else {
      this.tableData = [...this.manualData];
    }

    this.updateDialogState();

    if (this.carousel) {
      (this.carousel as any)._page = index;
      this.carousel.step(-1, index);
    }
  }

  onCarouselPageChange(event: any): void {
    this.activeIndex = event.page;
  }

  // === FILE HANDLING ===
  async onFileSelected(result: FileDropResult): Promise<void> {
    if (!result.isValid) {
      return;
    }

    this.selectedFile = result.file;
    this.isLoading = true;

    try {
      await this.parseExcelFile(result.file);
      this.updateDialogState();
    } catch (error) {
      console.error('Error parsing file:', error);
      this.showError('Error al leer el archivo. Verifique que sea un archivo Excel válido.');
      this.tableData = [];
      this.updateDialogState();
    } finally {
      this.isLoading = false;
    }
  }

  onFileCleared(): void {
    this.selectedFile = null;
    this.tableData = [];
    this.fileData = [];
    this.errors = [];
    this.updateDialogState();
  }

  private async parseExcelFile(file: File): Promise<void> {
    const fileName = file.name.toLowerCase();

    // Si hay un parser de backend configurado y el archivo es .xls, usarlo
    if (this.config.backendParser && fileName.endsWith('.xls')) {
      const data = await this.config.backendParser(file);
      this.mapBackendDataToTable(data);
      return;
    }

    // Procesar con ExcelJS (solo .xlsx)
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No se encontró ninguna hoja en el archivo');
    }

    this.tableData = [];
    const columnMap = new Map<number, string>();

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // Primera fila: cabeceras
        row.eachCell((cell, colNumber) => {
          // Limpiar el valor de la cabecera: eliminar espacios, símbolos especiales y normalizar
          let headerValue = cell.value?.toString() || '';
          headerValue = headerValue
            .trim()
            .replace(/[\u25BC\u25B2\u2193\u2191▼▲↓↑]/g, '') // Eliminar flechas/símbolos de filtro
            .trim(); // Trim nuevamente después de eliminar símbolos

          const colConfig = this.config.columns.find(
            c => c.header.toLowerCase().trim() === headerValue.toLowerCase()
          );
          if (colConfig) {
            columnMap.set(colNumber, colConfig.key);
          }
        });
      } else {
        // Filas de datos
        const rowData: TableRow = {};
        row.eachCell((cell, colNumber) => {
          const key = columnMap.get(colNumber);
          if (key) {
            rowData[key] = this.parseCellValue(cell.value);
          }
        });

        if (Object.keys(rowData).length > 0) {
          // Agregar valores por defecto para columnas faltantes
          this.config.columns.forEach(col => {
            if (!(col.key in rowData)) {
              rowData[col.key] = col.defaultValue !== undefined ? col.defaultValue : null;
            }
          });
          this.tableData.push(rowData);
        }
      }
    });
  }

  private parseCellValue(value: any): any {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && 'result' in value) return value.result;
    return value;
  }

  /**
   * Mapea datos recibidos del backend a la estructura de la tabla
   */
  private mapBackendDataToTable(backendData: any[]): void {
    this.tableData = [];

    backendData.forEach(item => {
      const rowData: TableRow = {};

      // Mapear cada columna de la configuración
      this.config.columns.forEach(col => {
        // Buscar el valor en el objeto del backend (case-insensitive)
        const backendKey = Object.keys(item).find(
          key => key.toLowerCase() === col.header.toLowerCase() ||
                 key.toLowerCase() === col.key.toLowerCase()
        );

        if (backendKey) {
          rowData[col.key] = item[backendKey];
        } else {
          rowData[col.key] = col.defaultValue !== undefined ? col.defaultValue : null;
        }
      });

      if (Object.keys(rowData).length > 0) {
        this.tableData.push(rowData);
      }
    });
  }

  // === TABLE EVENTS ===
  onTableDataChange(event: TableChangeEvent): void {
    this.tableData = event.data;
    this.errors = event.errors;
    this.updateDialogState();
  }

  // === TEMPLATE DOWNLOAD ===
  async downloadTemplate(): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Datos');

    // Cabeceras
    const headers = this.config.columns.map(col => col.header);
    worksheet.addRow(headers);

    // Estilizar cabeceras
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Configurar anchos y comentarios
    this.config.columns.forEach((col, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = (col.width || 150) / 7;

      if (col.description) {
        const cell = headerRow.getCell(index + 1);
        cell.note = {
          texts: [{ text: col.description }],
          margins: { insetmode: 'auto', inset: [0.13, 0.13, 0.13, 0.13] }
        };
      }
    });

    // Fila de ejemplo
    const exampleRow = this.config.columns.map(col => {
      if (col.allowedValues?.length) return col.allowedValues[0];
      switch (col.dataType) {
        case ColumnDataType.TEXT: return 'Texto de ejemplo';
        case ColumnDataType.NUMBER:
          // Si es la columna color, mostrar decimal, sino entero o según la columna
          return col.key === 'color' ? 1.5 : (col.key === 'cotizacion' ? 100000 : 123.45);
        case ColumnDataType.DATE: return new Date();
        case ColumnDataType.BOOLEAN: return 'Sí';
        case ColumnDataType.EMAIL: return 'ejemplo@email.com';
        case ColumnDataType.PHONE: return '+52 123 456 7890';
        default: return '';
      }
    });

    worksheet.addRow(exampleRow);
    const exampleRowObj = worksheet.getRow(2);
    exampleRowObj.font = { italic: true, color: { argb: 'FF808080' } };

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.config.templateFileName || 'plantilla.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // === ACTIONS ===
  onConfirm(): void {
    // Guardar datos del modo actual antes de confirmar
    if (this.activeIndex === 0) {
      this.fileData = [...this.tableData];
    } else {
      this.manualData = [...this.tableData];
    }

    if (this.errors.length > 0) {
      this.showError(`Se encontraron ${this.errors.length} errores. Por favor corrija los datos.`);
      return;
    }

    if (this.config.minRows && this.tableData.length < this.config.minRows) {
      this.showError(`Se requieren al menos ${this.config.minRows} filas de datos.`);
      return;
    }

    if (this.config.maxRows && this.tableData.length > this.config.maxRows) {
      this.showError(`No se permiten más de ${this.config.maxRows} filas de datos.`);
      return;
    }

    // Limpiar datos auxiliares
    const cleanData = this.tableData.map(row => {
      const { _hasError, _errors, ...cleanRow } = row;
      return cleanRow;
    });

    const result: FileUploadResult = {
      data: cleanData,
      hasErrors: false,
      errors: []
    };

    this.ref.close(result);
  }

  onCancel(): void {
    this.ref.close(null);
  }

  private showError(message: string): void {
    console.error(message);
    // TODO: Integrar con MessageService
  }
}
