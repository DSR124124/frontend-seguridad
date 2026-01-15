/**
 * Tipos de datos soportados para las columnas
 */
export enum ColumnDataType {
    TEXT = 'text',
    NUMBER = 'number',
    DATE = 'date',
    BOOLEAN = 'boolean',
    EMAIL = 'email',
    PHONE = 'phone'
}

/**
 * Configuración de una columna
 */
export interface ColumnConfig {
    /** Clave única de la columna (se usa para mapear los datos) */
    key: string;

    /** Nombre que se muestra en la cabecera */
    header: string;

    /** Tipo de dato esperado */
    dataType: ColumnDataType;

    /** Si la columna es obligatoria */
    required?: boolean;

    /** Ancho de la columna en la tabla (en pixels) */
    width?: number;

    /** Descripción o ayuda para el usuario */
    description?: string;

    /** Validación personalizada */
    validator?: (value: any) => boolean;

    /** Mensaje de error personalizado */
    errorMessage?: string;

    /** Valores permitidos (para select/dropdown) */
    allowedValues?: any[];

    /** Valor por defecto */
    defaultValue?: any;
}

/**
 * Configuración completa del componente de carga de archivos
 */
export interface FileUploadConfig {
    /** Configuración de las columnas */
    columns: ColumnConfig[];

    /** Título del diálogo */
    title?: string;

    /** Permitir entrada manual */
    allowManualEntry?: boolean;

    /** Permitir carga de archivos */
    allowFileUpload?: boolean;

    /** Número máximo de filas permitidas */
    maxRows?: number;

    /** Número mínimo de filas requeridas */
    minRows?: number;

    /** Extensiones de archivo permitidas */
    allowedExtensions?: string[];

    /** Tamaño máximo del archivo en MB */
    maxFileSizeMB?: number;

    /** Mostrar botón de descarga de plantilla */
    showTemplateDownload?: boolean;

    /** Nombre del archivo de plantilla */
    templateFileName?: string;

    /** Función para procesar archivos en el backend (útil para archivos .xls que no soporta ExcelJS) */
    backendParser?: (file: File) => Promise<any[]>;
}

/**
 * Error de validación en una celda
 */
export interface CellError {
    row: number;
    column: string;
    message: string;
}

/**
 * Resultado del componente al cargar datos
 */
export interface FileUploadResult {
    /** Datos cargados */
    data: any[];

    /** Si hubo errores de validación */
    hasErrors: boolean;

    /** Lista de errores encontrados */
    errors: CellError[];
}

/**
 * Resultado de la selección de archivo en el drop zone
 */
export interface FileDropResult {
    file: File;
    isValid: boolean;
    errorMessage?: string;
}

/**
 * Fila de datos de la tabla editable
 */
export interface TableRow {
    [key: string]: any;
    _hasError?: boolean;
    _errors?: { [column: string]: string };
}

/**
 * Evento emitido cuando cambian los datos de la tabla
 */
export interface TableChangeEvent {
    data: TableRow[];
    errors: CellError[];
    isValid: boolean;
}

// ============================================
// Interfaces para los Servicios del Diálogo
// ============================================

/**
 * Estado interno del diálogo compartido entre componentes
 * Usado por FileUploadDialogStateService
 */
export interface DialogState {
    /** Si el botón de confirmar debe estar habilitado */
    canConfirm: boolean;
    /** Datos actuales de la tabla */
    tableData: any[];
    /** Errores de validación actuales */
    errors: CellError[];
}

/**
 * Opciones para personalizar el comportamiento del diálogo
 * Usado por FileUploadDialogService.open()
 */
export interface FileUploadDialogOptions {
    /** Ancho del diálogo (default: '90vw') */
    width?: string;
    /** Altura del diálogo (default: '80vh') */
    height?: string;
    /** Permitir maximizar (default: true) */
    maximizable?: boolean;
    /** Permitir cerrar con X (default: true) */
    closable?: boolean;
    /** Z-index base (default: 10000) */
    baseZIndex?: number;
}
