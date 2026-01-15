/**
 * Tipo de dato de la columna
 */
export enum ColumnType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  DROPDOWN = 'dropdown',
  CUSTOM = 'custom'
}

/**
 * Tipo de filtro para la columna
 */
export enum FilterType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  DROPDOWN = 'dropdown',
  NONE = 'none'
}

/**
 * Configuración de una columna de la tabla
 */
export interface TableColumn {
  /** Campo del objeto de datos */
  field: string;
  /** Título de la columna */
  header: string;
  /** Tipo de dato */
  type: ColumnType;
  /** Tipo de filtro */
  filterType?: FilterType;
  /** Ancho de la columna (px o %) */
  width?: string;
  /** Ancho mínimo */
  minWidth?: string;
  /** Ancho máximo */
  maxWidth?: string;
  /** Si es ordenable */
  sortable?: boolean;
  /** Si es visible en móvil */
  mobileVisible?: boolean;
  /** Si solo se muestra en móvil */
  mobileOnly?: boolean;
  /** Alineación del texto */
  align?: 'left' | 'center' | 'right';
  /** Formato para números */
  numberFormat?: string;
  /** Locale para formateo de números (por defecto 'es-ES', usar 'en-US' para punto decimal) */
  numberLocale?: string;
  /** Formato para fechas */
  dateFormat?: string;
  /** Opciones para dropdown (si filterType es DROPDOWN) */
  dropdownOptions?: { label: string; value: any }[];
  /** Función para obtener el label de un valor (para dropdowns) */
  getLabel?: (value: any) => string;
  /** Si la columna es parte de las acciones */
  isAction?: boolean;
  /** Clase CSS personalizada */
  cssClass?: string;
  /** Si se muestra en el filtro global */
  globalFilter?: boolean;
  /** Si la columna es clickeable (en móvil, solo esta columna emitirá el evento rowClick) */
  clickable?: boolean;
}

/**
 * Configuración de acciones de la tabla
 */
export interface TableAction {
  /** Ícono del botón */
  icon: string;
  /** Label del botón */
  label?: string;
  /** Severidad del botón (success, info, warning, danger) */
  severity?: 'success' | 'info' | 'warning' | 'danger' | 'secondary';
  /** Tooltip */
  tooltip?: string;
  /** Si está deshabilitado */
  disabled?: (row: any) => boolean;
  /** Función a ejecutar al hacer clic */
  action: (row: any, index: number) => void;
  /** Si se muestra solo si hay permisos */
  permission?: boolean;
}

/**
 * Configuración de la tabla
 */
export interface TableConfig {
  /** Columnas de la tabla */
  columns: TableColumn[];
  /** Datos a mostrar */
  data: any[];
  /** Si muestra la búsqueda global */
  showGlobalSearch?: boolean;
  /** Placeholder de la búsqueda global */
  globalSearchPlaceholder?: string;
  /** Si muestra los filtros por columna */
  showColumnFilters?: boolean;
  /** Si muestra el botón de agregar */
  showAddButton?: boolean;
  /** Label del botón agregar */
  addButtonLabel?: string;
  /** Función al hacer clic en agregar */
  onAdd?: () => void;
  /** Si muestra el botón de exportar */
  showExportButton?: boolean;
  /** Label del botón exportar */
  exportButtonLabel?: string;
  /** Función para exportar */
  onExport?: (filteredData: any[]) => void;
  /** Acciones por fila */
  rowActions?: TableAction[];
  /** Si permite selección múltiple */
  selection?: boolean;
  /** Campo único para identificar filas */
  dataKey?: string;
  /** Si está cargando */
  loading?: boolean;
  /** Mensaje cuando no hay datos */
  emptyMessage?: string;
  /** Filas por página */
  rowsPerPage?: number;
  /** Opciones de filas por página */
  rowsPerPageOptions?: number[];
  /** Campos para el filtro global */
  globalFilterFields?: string[];
  /** Si muestra el reporte de página actual */
  showCurrentPageReport?: boolean;
  /** Template del reporte de página */
  currentPageReportTemplate?: string;
  /** Función para renderizar el footer de la tabla */
  onFooter?: () => any;
  /** Función opcional para determinar si una fila puede ser seleccionada */
  isRowSelectable?: (row: any) => boolean;
  /** Función opcional para obtener clases CSS dinámicas por fila */
  getRowClass?: (row: any) => string;
  /** Si el filtrado es manual (solo se aplica cuando el usuario presiona un botón) */
  manualFiltering?: boolean;
}

