/**
 * SpeechRecognitionService.ts — Browser Web Speech API wrapper for voice input.
 * Provides start/stop recognition with callbacks for transcripts, listening state, and errors.
 */

export interface SpeechRecognitionCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onListeningChange: (isListening: boolean) => void;
  onError?: (error: string) => void;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening: boolean = false;
  private callbacks: SpeechRecognitionCallbacks | null = null;

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  private initIfNeeded() {
    if (this.recognition) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[SpeechRecognition] SpeechRecognition API is not supported in this browser.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false; // Stop when the user stops speaking
    rec.interimResults = true; // Show results in progress
    rec.lang = 'en-US';

    rec.onstart = () => {
      console.log('[SpeechRecognition] Started listening');
      this.isListening = true;
      this.callbacks?.onListeningChange(true);
    };

    rec.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      const isFinal = !!finalTranscript;
      
      console.log(`[SpeechRecognition] Result: "${text}" (isFinal: ${isFinal})`);
      if (this.callbacks) {
        this.callbacks.onTranscript(text, isFinal);
      }
    };

    rec.onerror = (event: any) => {
      console.error('[SpeechRecognition] Error received:', event.error);
      this.isListening = false;
      this.callbacks?.onListeningChange(false);
      if (this.callbacks?.onError) {
        this.callbacks.onError(event.error);
      }
    };

    rec.onend = () => {
      console.log('[SpeechRecognition] Session ended');
      this.isListening = false;
      this.callbacks?.onListeningChange(false);
    };

    this.recognition = rec;
  }

  start(callbacks: SpeechRecognitionCallbacks): void {
    if (!SpeechRecognitionService.isSupported()) {
      callbacks.onError?.('Speech recognition is not supported in this browser.');
      return;
    }

    this.callbacks = callbacks;
    this.initIfNeeded();

    if (this.isListening) return;

    try {
      this.recognition.start();
    } catch (err: any) {
      console.error('[SpeechRecognition] Failed to start:', err);
      callbacks.onError?.(err.message || 'Failed to start');
    }
  }

  stop(): void {
    if (!this.recognition || !this.isListening) return;
    try {
      this.recognition.stop();
    } catch (err) {
      console.error('[SpeechRecognition] Failed to stop:', err);
    }
  }

  toggle(callbacks: SpeechRecognitionCallbacks): void {
    if (this.isListening) {
      this.stop();
    } else {
      this.start(callbacks);
    }
  }
}

// Export singleton
export const speechRecognition = new SpeechRecognitionService();
