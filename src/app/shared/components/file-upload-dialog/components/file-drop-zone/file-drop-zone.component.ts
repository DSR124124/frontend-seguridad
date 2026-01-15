import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FileDropResult } from '../../models';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-file-drop-zone',
    standalone: true,
    templateUrl: './file-drop-zone.component.html',
    styleUrls: ['./file-drop-zone.component.css'],
    imports: [
        ...PrimeNGModules,
        ReactiveFormsModule,
        CommonModule
    ]
})
export class FileDropZoneComponent {
    @Input() allowedExtensions: string[] = ['.xlsx', '.xls'];
    @Input() maxFileSizeMB: number = 5;
    @Input() acceptedMimeTypes: string = '.xlsx,.xls';
    @Input() disabled: boolean = false;
    @Input() showTemplateDownload: boolean = true;

    @Output() fileSelected = new EventEmitter<FileDropResult>();
    @Output() fileCleared = new EventEmitter<void>();
    @Output() templateDownload = new EventEmitter<void>();

    isDragging = false;
    selectedFile: File | null = null;
    errorMessage: string | null = null;

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        if (!this.disabled) {
            this.isDragging = true;
        }
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();

        const relatedTarget = event.relatedTarget as HTMLElement;
        const currentTarget = event.currentTarget as HTMLElement;

        if (!currentTarget.contains(relatedTarget)) {
            this.isDragging = false;
        }
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;

        if (this.disabled) return;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.processFile(files[0]);
        }
    }

    onFileInputChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.processFile(input.files[0]);
            input.value = '';
        }
    }

    private processFile(file: File): void {
        this.errorMessage = null;

        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!this.allowedExtensions.includes(extension)) {
            this.errorMessage = `Formato no válido. Use: ${this.allowedExtensions.join(', ')}`;
            this.fileSelected.emit({
                file,
                isValid: false,
                errorMessage: this.errorMessage
            });
            return;
        }

        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > this.maxFileSizeMB) {
            this.errorMessage = `El archivo excede el tamaño máximo de ${this.maxFileSizeMB}MB`;
            this.fileSelected.emit({
                file,
                isValid: false,
                errorMessage: this.errorMessage
            });
            return;
        }

        this.selectedFile = file;
        this.fileSelected.emit({
            file,
            isValid: true
        });
    }

    clearFile(): void {
        this.selectedFile = null;
        this.errorMessage = null;
        this.fileCleared.emit();
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    onTemplateDownload(): void {
        this.templateDownload.emit();
    }
}
