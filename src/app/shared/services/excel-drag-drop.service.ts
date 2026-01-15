import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import * as ExcelJS from 'exceljs';

export interface ExcelFileData {
  file: File;
  data: any[];
}

export interface ExcelDragDropConfig {
  acceptedExtensions?: string[];
  maxFileSize?: number;
  columnName?: string; // Nombre de la columna a extraer (opcional)
}

@Injectable({
  providedIn: 'root'
})
export class ExcelDragDropService {
  private dragCounter: number = 0;
  private isDragOverSubject = new Subject<boolean>();
  private filesDroppedSubject = new Subject<File[]>();
  private fileDataProcessedSubject = new Subject<ExcelFileData[]>();

  // Observables públicos
  public isDragOver$: Observable<boolean> = this.isDragOverSubject.asObservable();
  public filesDropped$: Observable<File[]> = this.filesDroppedSubject.asObservable();
  public fileDataProcessed$: Observable<ExcelFileData[]> = this.fileDataProcessedSubject.asObservable();

  private listenersAttached: boolean = false;
  private config: ExcelDragDropConfig = {
    acceptedExtensions: ['.xlsx', '.xls', '.csv'],
    maxFileSize: 10 * 1024 * 1024, // 10MB por defecto
  };

  /**
   * Configura el servicio con opciones personalizadas
   */
  configure(config: ExcelDragDropConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Inicializa los listeners globales de drag and drop
   */
  setupGlobalDragListeners(): void {
    if (this.listenersAttached) {
      return; // Ya están configurados
    }

    document.addEventListener('dragenter', this.onWindowDragEnter.bind(this));
    document.addEventListener('dragleave', this.onWindowDragLeave.bind(this));
    document.addEventListener('dragover', this.onWindowDragOver.bind(this));
    document.addEventListener('drop', this.onWindowDrop.bind(this));

    this.listenersAttached = true;
  }

  /**
   * Remueve los listeners globales de drag and drop
   */
  removeGlobalDragListeners(): void {
    if (!this.listenersAttached) {
      return;
    }

    document.removeEventListener('dragenter', this.onWindowDragEnter);
    document.removeEventListener('dragleave', this.onWindowDragLeave);
    document.removeEventListener('dragover', this.onWindowDragOver);
    document.removeEventListener('drop', this.onWindowDrop);

    this.listenersAttached = false;
    this.isDragOverSubject.next(false);
    this.dragCounter = 0;
  }

  /**
   * Valida si un archivo es válido según la configuración
   */
  validateFile(file: File): boolean {
    const extension = file.name.toLowerCase();
    const isValidExtension = this.config.acceptedExtensions?.some(ext =>
      extension.endsWith(ext.toLowerCase())
    ) || false;

    const isValidSize = !this.config.maxFileSize || file.size <= this.config.maxFileSize;

    return isValidExtension && isValidSize;
  }

  /**
   * Filtra y valida una lista de archivos
   */
  validateFiles(files: File[]): { valid: File[]; invalid: File[] } {
    const valid: File[] = [];
    const invalid: File[] = [];

    files.forEach(file => {
      if (this.validateFile(file)) {
        valid.push(file);
      } else {
        invalid.push(file);
      }
    });

    return { valid, invalid };
  }

  /**
   * Procesa archivos Excel/CSV y extrae los datos
   */
  async processExcelFiles(files: File[]): Promise<ExcelFileData[]> {
    const results: ExcelFileData[] = [];

    for (const file of files) {
      try {
        const data = await this.readFileData(file);
        results.push({ file, data });
      } catch (error) {
        console.error(`Error procesando archivo ${file.name}:`, error);
        // Continuar con el siguiente archivo aunque uno falle
      }
    }

    return results;
  }

  /**
   * Lee los datos de un archivo Excel o CSV
   */
  private async readFileData(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e: any) => {
        try {
          let jsonData: any[] = [];

          if (file.name.toLowerCase().endsWith('.csv')) {
            const csvText = e.target.result as string;
            jsonData = this.parseCSV(csvText);
          } else {
            const arrayBuffer = e.target.result as ArrayBuffer;
            jsonData = await this.readExcelWithExcelJS(arrayBuffer);
          }

          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => {
        reject(error);
      };

      if (file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file, 'UTF-8');
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  /**
   * Lee un archivo Excel usando ExcelJS y lo convierte a JSON
   */
  private async readExcelWithExcelJS(arrayBuffer: ArrayBuffer): Promise<any[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return [];
    }

    const jsonData: any[] = [];
    const headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // Primera fila son los headers
        row.eachCell((cell, colNumber) => {
          headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
        });
      } else {
        // Filas de datos
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1] || `Column${colNumber}`;
          rowData[header] = cell.value ?? '';
        });
        // Solo agregar si tiene al menos un valor
        if (Object.keys(rowData).length > 0) {
          // Asegurar que todas las columnas existan (con valor vacío si no tienen dato)
          headers.forEach(header => {
            if (!(header in rowData)) {
              rowData[header] = '';
            }
          });
          jsonData.push(rowData);
        }
      }
    });

    return jsonData;
  }

  /**
   * Extrae códigos de una columna específica en los datos
   */
  extractCodesFromColumn(data: any[], columnName: string): string[] {
    const codes: string[] = [];

    if (!data || data.length === 0) {
      return codes;
    }

    const primeraFila = data[0];
    const columnas = Object.keys(primeraFila);

    // Buscar la columna exacta
    let columnaEncontrada = columnas.find(col =>
      col.toLowerCase().trim() === columnName.toLowerCase().trim()
    );

    // Si no se encuentra exacta, buscar por similitud
    if (!columnaEncontrada) {
      columnaEncontrada = columnas.find(col =>
        col.toLowerCase().includes(columnName.toLowerCase()) ||
        columnName.toLowerCase().includes(col.toLowerCase())
      );
    }

    if (!columnaEncontrada) {
      return codes;
    }

    data.forEach((fila) => {
      const valorCelda = fila[columnaEncontrada!];
      if (valorCelda !== undefined && valorCelda !== null && valorCelda !== '') {
        const codigoStr = String(valorCelda).trim();
        if (/^[0-9]+$/.test(codigoStr)) {
          codes.push(codigoStr);
        }
      }
    });

    return codes;
  }

  /**
   * Parsea un archivo CSV a JSON
   */
  parseCSV(csvText: string): any[] {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];

    const headers = this.parseCSVLine(lines[0]);
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length > 0) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }

    return data;
  }

  /**
   * Parsea una línea CSV considerando comillas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    result.push(current.trim());
    return result;
  }

  // Handlers privados para eventos de drag
  private onWindowDragEnter(e: DragEvent): void {
    e.preventDefault();
    this.dragCounter++;

    if (this.hasFiles(e.dataTransfer)) {
      this.isDragOverSubject.next(true);
    }
  }

  private onWindowDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.dragCounter--;

    if (this.dragCounter <= 0) {
      this.isDragOverSubject.next(false);
      this.dragCounter = 0;
    }
  }

  private onWindowDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  private onWindowDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOverSubject.next(false);
    this.dragCounter = 0;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files);
      const { valid, invalid } = this.validateFiles(filesArray);

      if (valid.length > 0) {
        this.filesDroppedSubject.next(valid);
      }

      // Notificar si hay archivos inválidos (opcional, puede manejarse en el componente)
      if (invalid.length > 0 && valid.length === 0) {
        // Solo emitir error si no hay archivos válidos
        throw new Error(`Ningún archivo válido. Formatos aceptados: ${this.config.acceptedExtensions?.join(', ')}`);
      }
    }
  }

  private hasFiles(dataTransfer: DataTransfer | null): boolean {
    if (!dataTransfer) return false;
    return dataTransfer.types.includes('Files') || dataTransfer.types.includes('application/x-moz-file');
  }

  /**
   * Maneja eventos de drag en un elemento específico (para uso en componentes)
   */
  handleElementDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Maneja eventos de drag leave en un elemento específico
   */
  handleElementDragLeave(e: DragEvent, element: HTMLElement): void {
    e.preventDefault();
    e.stopPropagation();
    const rect = element.getBoundingClientRect();

    if (e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top || e.clientY > rect.bottom) {
      this.isDragOverSubject.next(false);
      this.dragCounter = 0;
    }
  }

  /**
   * Maneja eventos de drop en un elemento específico
   */
  handleElementDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();

    this.isDragOverSubject.next(false);
    this.dragCounter = 0;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files);
      const { valid } = this.validateFiles(filesArray);

      if (valid.length > 0) {
        this.filesDroppedSubject.next(valid);
      }
    }
  }

  /**
   * Cierra manualmente el overlay de drag and drop
   */
  closeOverlay(): void {
    this.isDragOverSubject.next(false);
    this.dragCounter = 0;
  }
}
