import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface Citation {
  filename: string;
  page: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatStreamService {
  private eventSource: EventSource | null = null;
  
  // State Signals
  public message = signal<string>('');
  public citations = signal<Citation[]>([]);
  public isStreaming = signal<boolean>(false);
  public error = signal<string | null>(null);

  // Reconnection state
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private currentQuestion: string = '';

  /**
   * Initiates the SSE stream for a given question.
   */
  public streamAnswer(question: string): void {
    this.currentQuestion = question;
    this.reconnectAttempts = 0;
    this.connect();
  }

  private connect(): void {
    this.close(); // Clean up any existing connection

    this.isStreaming.set(true);
    if (this.reconnectAttempts === 0) {
      this.message.set('');
      this.citations.set([]);
      this.error.set(null);
    }

    const encodedQuestion = encodeURIComponent(this.currentQuestion);
    // Since we don't have a dedicated resuming endpoint, a raw reconnect restarts the stream.
    // In a full production app with a cursor, we would pass the last received token index.
    this.eventSource = new EventSource(`${environment.apiUrl}/ask/stream?question=${encodedQuestion}`);

    this.eventSource.addEventListener('token', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.text) {
          this.message.update(current => current + data.text);
        }
      } catch (e) {
        console.error('Failed to parse token event', e);
      }
    });

    this.eventSource.addEventListener('citations', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        this.citations.set(data);
      } catch (e) {
        console.error('Failed to parse citations event', e);
      }
    });

    this.eventSource.addEventListener('complete', () => {
      this.isStreaming.set(false);
      this.reconnectAttempts = 0; // Reset on clean completion
      this.close();
    });

    this.eventSource.onerror = (error: Event) => {
      this.handleError(error);
    };
  }

  private handleError(errorEvent: Event): void {
    this.close();

    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      const backoffDelay = Math.pow(2, this.reconnectAttempts) * 1000;
      
      this.error.set(`Connection lost. Reconnecting in ${backoffDelay / 1000}s... (Attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
      
      setTimeout(() => {
        if (this.currentQuestion) {
          this.error.set(null);
          this.connect();
        }
      }, backoffDelay);
    } else {
      this.isStreaming.set(false);
      this.error.set('Stream failed. Maximum reconnection attempts reached.');
    }
  }

  /**
   * Forces the stream to close cleanly.
   */
  public close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Cancels the active stream manually.
   */
  public cancel(): void {
    this.close();
    this.isStreaming.set(false);
    this.currentQuestion = '';
  }
}
