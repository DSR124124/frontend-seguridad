import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, HostListener } from '@angular/core';
import { Table } from 'primeng/table';
import { FilterService } from 'primeng/api';
import { TableColumn, TableConfig, FilterType, ColumnType } from './interfaces/table-column.interface';
import { customDateFilter, formatDateForComparison } from '../../../core/helpers/date.helper';
import { PrimeNGModules } from '../../../prime-ng/prime-ng';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'shared-data-table',
  standalone: true,
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css'],
  imports: [
    ...PrimeNGModules,
    ReactiveFormsModule,
    CommonModule
  ],
  // changeDetection: ChangeDetectionStrategy.OnPush // Comentado para mejor rendimiento con filtros dinámicos
})
export class DataTableComponent implements OnInit, OnChanges {
  @Input() config!: TableConfig;
  @Input() selectedItems: any[] = [];
  @Output() rowClick = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();

  @ViewChild('dt') table!: Table;
  @ViewChild('searchInput') searchInput?: HTMLInputElement;

  // Estado de filtros
  filtrosVisibles: boolean = false;
  filtroGlobalValue: string = '';
  filtros: { [key: string]: any } = {};

  // Selección
  selectAll: boolean = false;

  // Estado móvil
  isMobile: boolean = false;
  expandedRows: Set<number> = new Set();

  // Cache para las celdas del footer
  footerCellsCache: any[] = [];

  // Referencias a tipos para usar en template
  FilterType = FilterType;
  ColumnType = ColumnType;

  constructor(private filterService: FilterService) {}

  ngOnInit(): void {
    this.registerCustomDateFilter();
    this.updateIsMobile();
    this.initializeFilters();
    this.setupSelection();
    this.updateFooterCells();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      this.updateFooterCells();
    }
  }

  /**
   * Configura la selección inicial
   */
  private setupSelection(): void {
    if (this.config.selection && this.selectedItems.length > 0) {
      this.updateSelectAllState();
    }
  }

  /**
   * Maneja el cambio de selección
   */
  onSelectionChange(): void {
    this.updateSelectAllState();
    this.selectionChange.emit(this.selectedItems);
  }

  /**
   * Actualiza el estado de "seleccionar todo"
   */
  updateSelectAllState(): void {
    if (!this.config.selection || !this.table) {
      return;
    }
    const filteredData = this.table.filteredValue || this.config.data;
    if (!filteredData || filteredData.length === 0) {
      this.selectAll = false;
      return;
    }
    const dataKey = this.config.dataKey;
    let selectedCount = 0;

    if (dataKey) {
      // Filtrar items nulos y obtener las claves de los items seleccionados válidos
      const validSelectedItems = this.selectedItems.filter(item => item != null && item[dataKey] != null);
      const selectedKeys = new Set(validSelectedItems.map(item => item[dataKey]));
      // Contar solo los items válidos que están seleccionados
      selectedCount = filteredData.filter(item =>
        item != null && item[dataKey] != null && selectedKeys.has(item[dataKey])
      ).length;
    } else {
      // Sin dataKey, comparar por referencia directa
      selectedCount = filteredData.filter(item =>
        item != null && this.selectedItems.includes(item)
      ).length;
    }

    this.selectAll = selectedCount === filteredData.length;
  }

  /**
   * Maneja el toggle de "seleccionar todo"
   */
  toggleSelectAll(): void {
    if (!this.config.selection || !this.table) {
      return;
    }
    const filteredData = this.table.filteredValue || this.config.data;
    if (!filteredData || filteredData.length === 0) {
      return;
    }

    // Filtrar solo items válidos (no null)
    const validFilteredData = filteredData.filter(item => item != null);

    if (this.selectAll) {
      // Deseleccionar todas las visibles
      const dataKey = this.config.dataKey;
      if (dataKey) {
        const visibleKeys = new Set(validFilteredData.map(item => item[dataKey]).filter(key => key != null));
        this.selectedItems = this.selectedItems.filter(item =>
          item != null && item[dataKey] != null && !visibleKeys.has(item[dataKey])
        );
      } else {
        this.selectedItems = this.selectedItems.filter(item => item != null && !validFilteredData.includes(item));
      }
    } else {
      // Seleccionar todas las visibles
      const dataKey = this.config.dataKey;
      if (dataKey) {
        const validSelectedItems = this.selectedItems.filter(item => item != null && item[dataKey] != null);
        const selectedKeys = new Set(validSelectedItems.map(item => item[dataKey]));
        const newSelections = validFilteredData.filter(item =>
          item != null && item[dataKey] != null && !selectedKeys.has(item[dataKey])
        );
        this.selectedItems = [...this.selectedItems, ...newSelections];
      } else {
        const newSelections = validFilteredData.filter(item =>
          item != null && !this.selectedItems.includes(item)
        );
        this.selectedItems = [...this.selectedItems, ...newSelections];
      }
    }

    this.onSelectionChange();
  }

  /**
   * Verifica si el estado es indeterminado (algunos seleccionados pero no todos)
   */
  isIndeterminate(): boolean {
    if (!this.config.selection || !this.table) {
      return false;
    }
    const filteredData = this.table.filteredValue || this.config.data;
    if (filteredData.length === 0 || !filteredData) {
      return false;
    }
    const dataKey = this.config.dataKey;
    let selectedCount = 0;

    if (dataKey) {
      // Filtrar items nulos antes de mapear
      const validSelectedItems = this.selectedItems.filter(item => item != null);
      const selectedKeys = new Set(validSelectedItems.map(item => item && item[dataKey] != null ? item[dataKey] : null).filter(key => key != null));
      selectedCount = filteredData.filter(item => item != null && item[dataKey] != null && selectedKeys.has(item[dataKey])).length;
    } else {
      selectedCount = filteredData.filter(item => item != null && this.selectedItems.includes(item)).length;
    }

    return selectedCount > 0 && selectedCount < filteredData.length;
  }

  /**
   * Registra el filtro personalizado para fechas
   */
  private registerCustomDateFilter(): void {
    this.filterService.register('customDateFilter', customDateFilter);
  }

  /**
   * Inicializa los filtros según las columnas
   */
  private initializeFilters(): void {
    this.config.columns.forEach(col => {
      if (col.filterType && col.filterType !== FilterType.NONE) {
        this.filtros[col.field] = col.filterType === FilterType.DATE ? null : '';
      }
    });
  }

  /**
   * Aplica filtro global
   */
  applyGlobalFilter(event: Event, table?: Table): void {
    const target = event.target as HTMLInputElement;
    const tableInstance = table || this.table;
    if (tableInstance) {
      this.filtroGlobalValue = target.value;
      // Solo aplicar filtro automático si no está en modo manual
      if (!this.config.manualFiltering) {
        tableInstance.filterGlobal(target.value, 'contains');
      }
    }
  }

  /**
   * Limpia todos los filtros
   */
  clear(table?: Table, searchInput?: HTMLInputElement): void {
    const tableInstance = table || this.table;
    if (tableInstance) {
      tableInstance.clear();
      tableInstance.filterGlobal('', 'contains');
      this.filtroGlobalValue = '';
      this.filtros = {};
      this.initializeFilters();
      if (searchInput) {
        searchInput.value = '';
      }
    }
  }

  /**
   * Alterna visibilidad de filtros
   */
  toggleFiltros(): void {
    this.filtrosVisibles = !this.filtrosVisibles;
  }

  /**
   * Aplica filtro de texto
   */
  applyTextFilter(value: string, field: string, table: Table): void {
    this.filtros[field] = value;
    // Solo aplicar filtro automático si no está en modo manual
    if (!this.config.manualFiltering) {
      table.filter(value, field, 'contains');
    }
  }

  /**
   * Aplica filtro de número
   */
  applyNumberFilter(value: string, field: string, table: Table): void {
    this.filtros[field] = value;
    // Solo aplicar filtro automático si no está en modo manual
    if (!this.config.manualFiltering) {
      table.filter(value, field, 'equals');
    }
  }

  /**
   * Aplica filtro de dropdown
   */
  applyDropdownFilter(value: any, field: string, table: Table): void {
    this.filtros[field] = value;
    // Solo aplicar filtro automático si no está en modo manual
    if (!this.config.manualFiltering) {
      table.filter(value, field, 'equals');
    }
  }

  /**
   * Aplica filtro de fecha (soporta rangos)
   */
  onDatePickerSelect(selectedDate: Date | Date[], field: string, table: Table): void {
    // Verificar si es un rango de fechas (array)
    if (Array.isArray(selectedDate) && selectedDate.length === 2 && selectedDate[0] && selectedDate[1]) {
      // Guardar el rango completo en filtros
      this.filtros[field] = selectedDate;
      // Solo aplicar filtro automático si no está en modo manual
      if (!this.config.manualFiltering) {
        // Aplicar filtro con el primer valor del rango por ahora
        const formattedDate = formatDateForComparison(selectedDate[0]);
        table.filter(formattedDate, field, 'customDateFilter');
      }
    } else if (selectedDate && !Array.isArray(selectedDate)) {
      // Fecha simple
      this.filtros[field] = selectedDate;
      // Solo aplicar filtro automático si no está en modo manual
      if (!this.config.manualFiltering) {
        const formattedDate = formatDateForComparison(selectedDate);
        table.filter(formattedDate, field, 'customDateFilter');
      }
    } else {
      // No hay fecha seleccionada
      this.filtros[field] = null;
      // Solo aplicar filtro automático si no está en modo manual
      if (!this.config.manualFiltering) {
        table.filter('', field, 'contains');
      }
    }
  }

  /**
   * Maneja la selección de rango de fechas
   * Solo guarda cuando ambas fechas están seleccionadas
   */
  onDateRangeSelect(selectedDate: Date | Date[], field: string, table: Table): void {
    // Solo procesar si es un array con ambas fechas seleccionadas
    if (Array.isArray(selectedDate)) {
      // Verificar que ambas fechas estén definidas
      if (selectedDate.length === 2 && selectedDate[0] && selectedDate[1]) {
        // Guardar el rango completo en filtros
        this.filtros[field] = [selectedDate[0], selectedDate[1]];
        // En modo manual, no aplicar filtro automáticamente
        if (!this.config.manualFiltering) {
          const formattedDate = formatDateForComparison(selectedDate[0]);
          table.filter(formattedDate, field, 'customDateFilter');
        }
      } else if (selectedDate.length === 1 && selectedDate[0]) {
        // Solo la primera fecha seleccionada, guardar temporalmente
        this.filtros[field] = [selectedDate[0]];
      }
    }
  }

  /**
   * Maneja el borrado del rango de fechas
   */
  onDateRangeClear(field: string, table: Table): void {
    this.filtros[field] = null;
    if (!this.config.manualFiltering) {
      table.filter('', field, 'contains');
    }
  }

  /**
   * Obtiene el label de un valor (para dropdowns)
   */
  getLabel(column: TableColumn, value: any): string {
    if (column.getLabel) {
      return column.getLabel(value);
    }
    if (column.dropdownOptions) {
      const option = column.dropdownOptions.find(opt => opt.value === value);
      return option ? option.label : value;
    }
    return value;
  }

  /**
   * Maneja el clic en una fila
   */
  onRowClick(row: any, index: number, event?: Event): void {
    if (this.isMobile) {
      // En móvil, solo expandir/contraer, no emitir evento ni seleccionar
      // No usar preventDefault() porque bloquea la expansión
      if (event) {
        event.stopPropagation();
      }
      this.toggleRowExpansion(index);
    } else {
      // En desktop, emitir evento normalmente
      // Permitir rowClick incluso si hay selección habilitada
      this.rowClick.emit(row);
    }
  }

  /**
   * Maneja el clic en una celda específica
   */
  onCellClick(row: any, column: TableColumn, event: Event): void {
    event.stopPropagation();
    // Si la columna está marcada como clickeable, emitir el evento
    if (column.clickable) {
      this.rowClick.emit(row);
    }
  }

  /**
   * Maneja el clic en la celda del checkbox para prevenir que se expanda la fila en móvil
   */
  onCheckboxCellClick(event: Event): void {
    // Detener la propagación para que no se expanda la fila en móvil
    event.stopPropagation();
  }

  /**
   * Verifica si una fila puede ser seleccionada
   */
  isRowSelectable(row: any): boolean {
    if (!this.config.selection) {
      return false;
    }
    if (this.config.isRowSelectable) {
      return this.config.isRowSelectable(row);
    }
    return true;
  }

  /**
   * Obtiene las clases CSS para una fila
   */
  getRowClass(row: any): string {
    if (this.config.getRowClass) {
      return this.config.getRowClass(row);
    }
    return '';
  }

  /**
   * Toggle de expansión de fila para móvil
   * Solo permite una fila expandida a la vez (comportamiento de acordeón)
   */
  toggleRowExpansion(rowIndex: number): void {
    if (this.expandedRows.has(rowIndex)) {
      // Si la fila ya está expandida, cerrarla
      this.expandedRows.delete(rowIndex);
    } else {
      // Si se va a expandir una nueva fila, cerrar todas las demás primero
      this.expandedRows.clear();
      // Luego expandir la nueva fila
      this.expandedRows.add(rowIndex);
    }
  }

  /**
   * Verifica si una fila está expandida
   */
  isRowExpanded(rowIndex: number): boolean {
    return this.expandedRows.has(rowIndex);
  }

  /**
   * Obtiene las columnas visibles en móvil
   */
  getMobileVisibleColumns(): TableColumn[] {
    return this.config.columns.filter(col => col.mobileVisible !== false && !col.isAction);
  }

  /**
   * Obtiene las columnas ocultas en móvil
   */
  getMobileHiddenColumns(): TableColumn[] {
    return this.config.columns.filter(col => col.mobileVisible === false && !col.isAction);
  }

  /**
   * Obtiene el número de columnas visibles en móvil (para colspan)
   */
  getMobileVisibleColumnsCount(): number {
    // Contar columnas visibles (mobileVisible !== false o es acción)
    const visibleColumns = this.config.columns.filter(col => col.mobileVisible !== false || col.isAction).length;
    // Si hay selección habilitada, agregar 1 para la columna de checkbox
    return this.config.selection ? visibleColumns + 1 : visibleColumns;
  }

  /**
   * Obtiene el valor formateado de una celda
   */
  getCellValue(column: TableColumn, row: any): any {
    const value = this.getNestedValue(row, column.field);

    if (column.type === ColumnType.NUMBER && value != null) {
      try {
        // Convertir string a número si es necesario
        const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value);
        if (isNaN(numValue)) {
          return value || '-';
        }

        if (column.numberFormat) {
          const formatParts = column.numberFormat.split('.');
          if (formatParts.length > 1) {
            const fractionPart = formatParts[1].split('-');
            const minDigits = parseInt(fractionPart[0] || '0', 10);
            const maxDigits = parseInt(fractionPart[1] || fractionPart[0] || '0', 10);
            const locale = column.numberLocale || 'es-ES';
            return new Intl.NumberFormat(locale, {
              minimumFractionDigits: minDigits,
              maximumFractionDigits: maxDigits
            }).format(numValue);
          }
        }
        return numValue;
      } catch {
        return value || '-';
      }
    }

    if (column.type === ColumnType.NUMBER && value == null) {
      return '-';
    }

    if (column.type === ColumnType.DATE && value) {
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return '-';
        }
        return column.dateFormat ? this.formatDate(date, column.dateFormat) : date.toLocaleDateString('es-ES');
      } catch {
        return '-';
      }
    }

    if (column.type === ColumnType.DATE && !value) {
      return '-';
    }

    if (column.type === ColumnType.DROPDOWN && value != null) {
      return this.getLabel(column, value);
    }

    return value ?? '-';
  }

  /**
   * Actualiza el cache de las celdas del footer
   */
  private updateFooterCells(): void {
    if (!this.config || !this.config.onFooter) {
      this.footerCellsCache = [];
      return;
    }
    try {
      const footerData = this.config.onFooter();
      this.footerCellsCache = footerData?.cells || [];
    } catch (error) {
      console.error('Error al obtener datos del footer:', error);
      this.footerCellsCache = [];
    }
  }

  /**
   * Obtiene las celdas del footer (desde cache)
   */
  getFooterCells(): any[] {
    return this.footerCellsCache;
  }

  /**
   * Verifica si el footer debe mostrarse
   */
  get shouldShowFooter(): boolean {
    return !!(this.config?.onFooter &&
              this.config?.data &&
              this.config.data.length > 0 &&
              this.footerCellsCache.length > 0);
  }

  /**
   * Obtiene un valor anidado de un objeto
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Formatea una fecha según el formato especificado
   */
  private formatDate(date: Date, format: string): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return format
      .replace('dd', day)
      .replace('MM', month)
      .replace('yyyy', year.toString())
      .replace('HH', hours)
      .replace('mm', minutes);
  }

  /**
   * Maneja la exportación
   */
  exportData(): void {
    if (this.config.onExport) {
      const dataToExport = this.table?.filteredValue || this.config.data;
      this.config.onExport(dataToExport);
    }
  }

  /**
   * Maneja el clic en agregar
   */
  handleAdd(): void {
    if (this.config.onAdd) {
      this.config.onAdd();
    }
  }

  /**
   * Maneja el clic en una acción
   */
  handleAction(action: any, row: any, index: number, event: Event): void {
    event.stopPropagation();
    if (!action.disabled || !action.disabled(row)) {
      action.action(row, index);
    }
  }

  /**
   * Verifica si una acción está deshabilitada
   */
  isActionDisabled(action: any, row: any): boolean {
    return action.disabled ? action.disabled(row) : false;
  }

  /**
   * Actualiza el estado móvil
   */
  @HostListener('window:resize')
  onResize(): void {
    this.updateIsMobile();
  }

  private updateIsMobile(): void {
    try {
      this.isMobile = window.innerWidth <= 1024;
    } catch {
      this.isMobile = false;
    }
  }

  /**
   * Obtiene los campos para el filtro global
   */
  getGlobalFilterFields(): string[] {
    if (this.config.globalFilterFields) {
      return this.config.globalFilterFields;
    }
    return this.config.columns
      .filter(col => col.globalFilter !== false && col.type !== ColumnType.CUSTOM)
      .map(col => col.field);
  }

  /**
   * Obtiene las clases CSS para una columna
   */
  getColumnClasses(col: TableColumn): string {
    const classes: string[] = [];
    if (col.mobileVisible === false) {
      classes.push('col-hide-mobile');
    }
    if (col.mobileOnly === true) {
      classes.push('col-only-mobile');
    }
    if (col.cssClass) {
      classes.push(col.cssClass);
    }
    return classes.join(' ');
  }

  /**
   * Obtiene los estilos inline para una columna (anchos)
   */
  getColumnStyles(col: TableColumn): { [key: string]: string } {
    const styles: { [key: string]: string } = {};
    if (col.width) {
      styles['width'] = col.width;
    }
    if (col.minWidth) {
      styles['min-width'] = col.minWidth;
    }
    if (col.maxWidth) {
      styles['max-width'] = col.maxWidth;
    }
    return styles;
  }

  /**
   * Obtiene los estilos para la columna de checkbox
   */
  getCheckboxColumnStyles(): { [key: string]: string } {
    if (this.isMobile) {
      return {
        'width': '1px',
        'min-width': '1px',
        'max-width': '1px',
        'padding': '0.25rem',
        'box-sizing': 'border-box'
      };
    }
    return {
      'width': '1.5rem',
      'min-width': '1.5rem',
      'max-width': '1.5rem',
      'padding': '0.5rem',
      'box-sizing': 'border-box'
    };
  }

  /**
   * Obtiene la severidad del botón (compatible con PrimeNG)
   */
  getActionSeverity(action: any): 'success' | 'info' | 'danger' | 'secondary' | 'help' | 'contrast' | null {
    const severity = action.severity || 'info';
    // Mapear 'warning' a 'help' para compatibilidad con PrimeNG
    if (severity === 'warning') {
      return 'help';
    }
    // Asegurar que solo retornamos valores válidos
    const validSeverities: ('success' | 'info' | 'danger' | 'secondary' | 'help' | 'contrast')[] =
      ['success', 'info', 'danger', 'secondary', 'help', 'contrast'];
    return validSeverities.includes(severity) ? severity : 'info';
  }
}

