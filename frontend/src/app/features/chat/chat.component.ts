import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChatStreamService } from '../../core/services/chat-stream.service';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    MarkdownModule
  ],
  template: `
    <div class="chat-container">
      <div class="main-panel">
        <mat-card class="chat-card">
          <mat-card-header>
            <mat-card-title>Ask Questions</mat-card-title>
            <mat-card-subtitle>Query your uploaded documents using Gemini AI</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content class="chat-content" #chatScroll>
            
            <!-- Welcome / Empty State -->
            <div class="empty-state" *ngIf="!hasAskedQuestion()">
              <mat-icon class="empty-icon">smart_toy</mat-icon>
              <h3>How can I help you today?</h3>
              <p>Type a question below to search across your uploaded documents.</p>
            </div>

            <!-- Chat History -->
            <div *ngIf="hasAskedQuestion()">
              <div class="message user-message">
                <div class="message-bubble">{{ currentQuestion() }}</div>
              </div>

              <div class="message ai-message">
                <div class="message-bubble ai-bubble">
                  <markdown *ngIf="chatStream.message()" [data]="chatStream.message()"></markdown>
                  <div class="loading-indicator" *ngIf="chatStream.isStreaming() && !chatStream.message()">
                    <mat-spinner diameter="20"></mat-spinner>
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>

              <div class="error-message" *ngIf="chatStream.error()">
                <mat-icon color="warn">error</mat-icon>
                <span>{{ chatStream.error() }}</span>
              </div>
            </div>

          </mat-card-content>

          <mat-card-actions class="chat-actions">
            <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
              <input 
                matInput 
                placeholder="Ask a question..." 
                [(ngModel)]="questionInput"
                (keydown.enter)="askQuestion()"
                [disabled]="chatStream.isStreaming()">
              <button 
                mat-icon-button 
                matSuffix 
                color="primary" 
                (click)="askQuestion()" 
                [disabled]="!questionInput.trim() || chatStream.isStreaming()">
                <mat-icon>send</mat-icon>
              </button>
            </mat-form-field>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Citations Side Panel -->
      <div class="side-panel" *ngIf="chatStream.citations().length > 0">
        <mat-card class="citations-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>library_books</mat-icon>
            <mat-card-title>Sources</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item *ngFor="let citation of chatStream.citations()">
                <mat-icon matListItemIcon>picture_as_pdf</mat-icon>
                <div matListItemTitle>{{ citation.filename }}</div>
                <div matListItemLine>Page {{ citation.page }}</div>
              </mat-list-item>
            </mat-list>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      gap: 20px;
      padding: 20px;
      height: calc(100vh - 100px);
      max-width: 1200px;
      margin: 0 auto;
    }
    .main-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .side-panel {
      width: 300px;
      display: flex;
      flex-direction: column;
    }
    .chat-card, .citations-card {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .chat-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f9f9f9;
      border-top: 1px solid #eee;
      border-bottom: 1px solid #eee;
    }
    .chat-actions {
      padding: 16px;
    }
    .full-width {
      width: 100%;
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      text-align: center;
    }
    .empty-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .message {
      display: flex;
      margin-bottom: 16px;
    }
    .user-message {
      justify-content: flex-end;
    }
    .ai-message {
      justify-content: flex-start;
    }
    .message-bubble {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 12px;
      background: #3f51b5;
      color: white;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .ai-bubble {
      background: white;
      color: #333;
      border: 1px solid #e0e0e0;
      border-bottom-left-radius: 4px;
    }
    .user-message .message-bubble {
      border-bottom-right-radius: 4px;
    }
    
    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #666;
    }
    
    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      margin-top: 8px;
      padding: 8px;
      background: #ffebee;
      border-radius: 4px;
    }
  `]
})
export class ChatComponent implements AfterViewChecked {
  public chatStream = inject(ChatStreamService);
  
  @ViewChild('chatScroll') private scrollContainer!: ElementRef;

  questionInput = '';
  currentQuestion = signal<string>('');
  hasAskedQuestion = signal<boolean>(false);

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  askQuestion() {
    const q = this.questionInput.trim();
    if (!q) return;

    this.hasAskedQuestion.set(true);
    this.currentQuestion.set(q);
    this.questionInput = '';
    
    this.chatStream.streamAnswer(q);
  }
}
