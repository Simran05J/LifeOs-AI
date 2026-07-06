import { formatTime12HourFromDate } from './voiceService';

interface SpeakOptions {
  title: string;
  message: string;
  triggerTime: Date;
}

/**
 * VoiceAnnouncementService manages a queue of speech utterances.
 * Ensures sequential playback without overlap.
 */
class VoiceAnnouncementService {
  private queue: SpeakOptions[] = [];
  private isSpeaking: boolean = false;
  private voicesLoaded: boolean = false;
  private watchdogInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    // Unlock autoplay restrictions on first user interaction
    const unlockSpeech = () => {
      console.log('[VoiceAnnouncementService][Stage 8] User interaction detected, unlocking SpeechSynthesis...');
      const silentUtterance = new SpeechSynthesisUtterance('');
      silentUtterance.volume = 0;
      window.speechSynthesis.speak(silentUtterance);
      
      // Remove listeners once unlocked
      document.removeEventListener('click', unlockSpeech);
      document.removeEventListener('keydown', unlockSpeech);
      document.removeEventListener('touchstart', unlockSpeech);
    };
    
    document.addEventListener('click', unlockSpeech);
    document.addEventListener('keydown', unlockSpeech);
    document.addEventListener('touchstart', unlockSpeech);

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      this.voicesLoaded = true;
      this.logAvailableVoices(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        const loadedVoices = window.speechSynthesis.getVoices();
        if (loadedVoices.length > 0 && !this.voicesLoaded) {
          console.log('[VoiceAnnouncementService][Stage 7] Voices loaded via onvoiceschanged.');
          this.voicesLoaded = true;
          this.logAvailableVoices(loadedVoices);
          this.processQueue(); // process if anything was queued while waiting
        }
      };
    }
  }

  private logAvailableVoices(voices: SpeechSynthesisVoice[]) {
    console.log(`[VoiceAnnouncementService][Stage 7] Available voices: ${voices.length}`);
    const engVoices = voices.filter(v => v.lang.startsWith('en'));
    engVoices.forEach(v => {
      console.log(`  - ${v.name} (${v.lang}) [default: ${v.default}]`);
    });
  }

  private get synth(): SpeechSynthesis | null {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis;
    }
    return null;
  }

  public announce(options: SpeakOptions): void {
    console.log('[VoiceAnnouncementService] Enqueue called for:', options.title);
    
    const synth = this.synth;
    if (!synth) {
      console.warn('[VoiceAnnouncementService] SpeechSynthesis is not supported.');
      return;
    }

    this.queue.push(options);
    console.log(`[VoiceAnnouncementService] Queue length is now ${this.queue.length}`);
    this.processQueue();
  }

  private processQueue(): void {
    if (this.isSpeaking) {
      console.log(`[VoiceAnnouncementService][Stage 3] Currently speaking (isSpeaking=true), deferring next item.`);
      return;
    }
    
    if (this.queue.length === 0) {
      return;
    }

    if (!this.voicesLoaded) {
      console.log(`[VoiceAnnouncementService][Stage 3] Voices not yet loaded, waiting (queue length: ${this.queue.length})...`);
      return;
    }

    const synth = this.synth;
    if (!synth) return;

    this.isSpeaking = true;
    const options = this.queue.shift()!;
    console.log(`[VoiceAnnouncementService][Stage 3] Popped from queue. Remaining: ${this.queue.length}. Text being spoken: "${options.message}"`);
    
    const formattedTime = formatTime12HourFromDate(options.triggerTime);
    const text = `Hey Simran, it's ${formattedTime}. ${options.message}`;

    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = synth.getVoices();
    const engVoice = voices.find(
      (v) => v.lang.startsWith('en-US') || v.lang.startsWith('en-GB') || v.lang.startsWith('en')
    );
    if (engVoice) {
      utterance.voice = engVoice;
      console.log(`[VoiceAnnouncementService][Stage 6] Selected voice: ${engVoice.name} (${engVoice.lang})`);
    } else {
      console.log('[VoiceAnnouncementService][Stage 6] No English voice found, using default.');
    }

    utterance.onstart = () => {
      console.log('[VoiceAnnouncementService][Stage 5] Speech Started');
      // Start watchdog: Chrome pauses speechSynthesis silently after ~15s idle.
      // Calling resume() every 10s keeps it awake.
      if (!this.watchdogInterval) {
        this.watchdogInterval = setInterval(() => {
          if (this.synth && this.isSpeaking) {
            this.synth.pause();
            this.synth.resume();
          }
        }, 10000);
      }
    };

    utterance.onend = () => {
      console.log('[VoiceAnnouncementService][Stage 5] Speech Finished');
      this.isSpeaking = false;
      if (this.watchdogInterval) {
        clearInterval(this.watchdogInterval);
        this.watchdogInterval = null;
      }
      this.processQueue();
    };

    utterance.onerror = (e) => {
      console.error(`[VoiceAnnouncementService][Stage 5] Speech Error`);
      console.error(`[VoiceAnnouncementService][Stage 6] Error Details: type=${e.error}, browser=${navigator.userAgent}, utterance text="${text}"`);
      if (engVoice) {
        console.error(`[VoiceAnnouncementService][Stage 6] Voice name used: ${engVoice.name}`);
      }
      this.isSpeaking = false;
      if (this.watchdogInterval) {
        clearInterval(this.watchdogInterval);
        this.watchdogInterval = null;
      }
      this.processQueue();
    };

    console.log(`[VoiceAnnouncementService][Stage 4] Calling speechSynthesis.speak with text: "${text}"`);
    
    try {
      synth.speak(utterance);
    } catch (err) {
      console.error('[VoiceAnnouncementService][Stage 6] Exception calling speak():', err);
      this.isSpeaking = false;
      this.processQueue();
    }
  }

  /**
   * Stops all ongoing speech and clears the queue.
   */
  public clearAndStop(): void {
    this.queue = [];
    const synth = this.synth;
    if (synth) {
      synth.cancel();
    }
    this.isSpeaking = false;
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }
}

export const voiceAnnouncementService = new VoiceAnnouncementService();
