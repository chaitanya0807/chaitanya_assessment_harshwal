import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  template: `
    <div class="upload-container">
      <mat-card class="upload-card">
        <mat-card-header>
          <mat-card-title>Upload Document</mat-card-title>
          <mat-card-subtitle>Upload a PDF document to query against.</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div 
            class="drop-zone" 
            [class.drag-over]="isDragOver()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            (click)="fileInput.click()">
            
            <mat-icon class="upload-icon">cloud_upload</mat-icon>
            
            <ng-container *ngIf="!selectedFile()">
              <p>Drag and drop a PDF file here</p>
              <p class="secondary-text">or click to browse</p>
            </ng-container>

            <ng-container *ngIf="selectedFile()">
              <p class="file-name">{{ selectedFile()?.name }}</p>
              <p class="secondary-text">{{ formatSize(selectedFile()?.size || 0) }}</p>
            </ng-container>

            <input 
              #fileInput 
              type="file" 
              accept=".pdf,application/pdf" 
              style="display: none" 
              (change)="onFileSelected($event)">
          </div>

          <div class="progress-container" *ngIf="isUploading()">
            <p>Processing and indexing document...</p>
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          </div>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button (click)="clearSelection()" [disabled]="isUploading() || !selectedFile()">Clear</button>
          <button mat-flat-button color="primary" (click)="upload()" [disabled]="!selectedFile() || isUploading()">
            Upload & Process
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .upload-container {
      display: flex;
      justify-content: center;
      padding: 40px 20px;
    }
    .upload-card {
      max-width: 600px;
      width: 100%;
    }
    .drop-zone {
      margin: 20px 0;
      padding: 40px 20px;
      border: 2px dashed #ccc;
      border-radius: 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #fafafa;
    }
    .drop-zone:hover, .drag-over {
      border-color: #3f51b5;
      background: #f0f4ff;
    }
    .upload-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: #757575;
      margin-bottom: 16px;
    }
    .file-name {
      font-weight: 500;
      font-size: 16px;
      color: #333;
      margin-bottom: 4px;
    }
    .secondary-text {
      color: #666;
      font-size: 14px;
      margin: 0;
    }
    .progress-container {
      margin-top: 20px;
      text-align: center;
      p { margin-bottom: 10px; color: #555; }
    }
  `]
})
export class UploadComponent {
  private apiService = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  selectedFile = signal<File | null>(null);
  isDragOver = signal<boolean>(false);
  isUploading = signal<boolean>(false);

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      this.snackBar.open('Only PDF files are allowed.', 'Close', { duration: 3000 });
      return;
    }
    
    const maxSizeBytes = 25 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.snackBar.open('File exceeds the 25MB limit.', 'Close', { duration: 3000 });
      return;
    }

    this.selectedFile.set(file);
  }

  clearSelection() {
    this.selectedFile.set(null);
  }

  upload() {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);

    this.apiService.uploadDocument(file).subscribe({
      next: (response) => {
        this.isUploading.set(false);
        this.snackBar.open('Document successfully uploaded and indexed!', 'Ask Questions', { duration: 5000 })
          .onAction().subscribe(() => {
            this.router.navigate(['/chat']);
          });
        this.clearSelection();
      },
      error: (err) => {
        this.isUploading.set(false);
        this.snackBar.open(err.error?.error || 'Failed to upload document.', 'Close', { duration: 5000 });
      }
    });
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
