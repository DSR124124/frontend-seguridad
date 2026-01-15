import {
    Component,
    EventEmitter,
    Input,
    Output,
    OnInit,
    OnDestroy
} from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
    ColumnConfig,
    ColumnDataType,
    CellError,
    TableRow,
    TableChangeEvent
} from '../../models';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-editable-data-table',
    standalone: true,
    templateUrl: './editable-data-table.component.html',
    styleUrls: ['./editable-data-table.component.css'],
    imports: [
        ...PrimeNGModules,
        ReactiveFormsModule,
        CommonModule
    ]
})
export class EditableDataTableComponent implements OnInit, OnDestroy {
    @Input() columns: ColumnConfig[] = [];
    @Input() data: TableRow[] = [];
    @Input() minRows: number = 1;
    @Input() maxRows: number = 1000;
    @Input() editable: boolean = true;
    @Input() showRowNumbers: boolean = true;
    @Input() showActions: boolean = true;
    @Input() emptyMessage: string = 'No hay datos. Haz clic en "Agregar fila" para comenzar.';
    @Input() fileName: string | null = null;

    @Output() dataChange = new EventEmitter<TableChangeEvent>();
    @Output() clearFile = new EventEmitter<void>();
    @Output() rowAdded = new EventEmitter<number>();
    @Output() rowRemoved = new EventEmitter<number>();

    tableCols: any[] = [];
    errors: CellError[] = [];

    private validationSubject = new Subject<{ rowIndex: number; col: ColumnConfig }>();

    ColumnDataType = ColumnDataType;

    ngOnInit(): void {
        this.setupTableColumns();
        this.validationSubject.pipe(debounceTime(400)).subscribe(({ rowIndex, col }) => {
            this.validateCell(rowIndex, col);
        });
    }

    ngOnDestroy(): void {
        this.validationSubject.complete();
    }

    private setupTableColumns(): void {
        this.tableCols = this.columns.map(col => ({
            field: col.key,
            header: col.header,
            width: col.width || 150,
            dataType: col.dataType,
            required: col.required,
            description: col.description
        }));
    }

    addRow(): void {
        if (this.data.length >= this.maxRows) return;

        const newRow: TableRow = {};
        this.columns.forEach(col => {
            newRow[col.key] = col.defaultValue !== undefined ? col.defaultValue : null;
        });
        this.data.push(newRow);
        this.rowAdded.emit(this.data.length - 1);
        this.emitChange();
    }

    removeRow(rowIndex: number): void {
        this.data.splice(rowIndex, 1);
        this.errors = this.errors
            .filter(e => e.row !== rowIndex)
            .map(e => ({
                ...e,
                row: e.row > rowIndex ? e.row - 1 : e.row
            }));
        this.rowRemoved.emit(rowIndex);
        this.emitChange();
    }

    onCellChange(rowIndex: number, col: ColumnConfig): void {
        this.validationSubject.next({ rowIndex, col });
    }

    onCellBlur(rowIndex: number, col: ColumnConfig): void {
        this.validateCell(rowIndex, col);
    }

    onKeyDown(event: any, rowIndex: number, colIndex: number): void {
        // PrimeNG components wrap the original event
        const keyEvent = event.originalEvent || event;

        if (keyEvent.key === 'Enter' || keyEvent.key === 'Tab') {
            const isLastRow = rowIndex === this.data.length - 1;
            const isLastCol = colIndex === this.columns.length - 1;

            if (isLastRow && isLastCol && keyEvent.key === 'Tab' && !keyEvent.shiftKey) {
                keyEvent.preventDefault();
                if (this.data.length < this.maxRows) {
                    this.addRow();
                    setTimeout(() => {
                        const firstInput = document.querySelector(
                            `[data-row="${rowIndex + 1}"][data-col="0"]`
                        ) as HTMLElement;
                        firstInput?.focus();
                    }, 50);
                }
            }
        }
    }

    private validateCell(rowIndex: number, col: ColumnConfig): void {
        const row = this.data[rowIndex];
        if (!row) return;

        const value = row[col.key];
        let errorMessage: string | null = null;

        if (col.required && (value === null || value === undefined || value === '')) {
            errorMessage = col.errorMessage || `${col.header} es requerido`;
        }

        if (!errorMessage && value !== null && value !== undefined && value !== '') {
            switch (col.dataType) {
                case ColumnDataType.NUMBER:
                    if (isNaN(Number(value))) {
                        errorMessage = `${col.header} debe ser un número`;
                    }
                    break;
                case ColumnDataType.EMAIL:
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(String(value))) {
                        errorMessage = `${col.header} no es un email válido`;
                    }
                    break;
                case ColumnDataType.DATE:
                    if (!(value instanceof Date) && isNaN(Date.parse(value))) {
                        errorMessage = `${col.header} no es una fecha válida`;
                    }
                    break;
                case ColumnDataType.PHONE:
                    const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
                    if (!phoneRegex.test(String(value))) {
                        errorMessage = `${col.header} no es un teléfono válido`;
                    }
                    break;
            }
        }

        if (!errorMessage && col.validator && value) {
            if (!col.validator(value)) {
                errorMessage = col.errorMessage || `${col.header} no es válido`;
            }
        }

        this.updateCellError(rowIndex, col.key, errorMessage);
        this.updateRowErrorState(rowIndex);
        this.emitChange();
    }

    private updateCellError(rowIndex: number, columnKey: string, errorMessage: string | null): void {
        this.errors = this.errors.filter(e => !(e.row === rowIndex && e.column === columnKey));

        if (errorMessage) {
            this.errors.push({ row: rowIndex, column: columnKey, message: errorMessage });
        }

        const row = this.data[rowIndex];
        if (row) {
            if (!row._errors) row._errors = {};
            if (errorMessage) {
                row._errors[columnKey] = errorMessage;
            } else {
                delete row._errors[columnKey];
            }
        }
    }

    private updateRowErrorState(rowIndex: number): void {
        const row = this.data[rowIndex];
        if (row) {
            row._hasError = this.errors.some(e => e.row === rowIndex);
        }
    }

    hasError(rowIndex: number, columnKey: string): boolean {
        return this.errors.some(e => e.row === rowIndex && e.column === columnKey);
    }

    getError(rowIndex: number, columnKey: string): string | null {
        const error = this.errors.find(e => e.row === rowIndex && e.column === columnKey);
        return error?.message || null;
    }

    validateAll(): boolean {
        this.errors = [];
        this.data.forEach((row, rowIndex) => {
            this.columns.forEach(col => {
                this.validateCell(rowIndex, col);
            });
        });
        return this.errors.length === 0;
    }

    private emitChange(): void {
        this.dataChange.emit({
            data: this.data,
            errors: this.errors,
            isValid: this.errors.length === 0
        });
    }

    getInputType(dataType: ColumnDataType): string {
        switch (dataType) {
            case ColumnDataType.NUMBER: return 'number';
            case ColumnDataType.EMAIL: return 'email';
            case ColumnDataType.DATE: return 'date';
            case ColumnDataType.PHONE: return 'tel';
            default: return 'text';
        }
    }

    trackByIndex(index: number): number {
        return index;
    }

    onClearFile(): void {
        this.clearFile.emit();
    }
}
