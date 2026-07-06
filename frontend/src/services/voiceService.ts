/**
 * Helper to format a Date into localized 12-hour format (e.g., 5:11 PM) using the local timezone.
 */
export function formatTime12HourFromDate(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour becomes 12
  const minutesStr = String(minutes).padStart(2, '0');
  return `${hours}:${minutesStr} ${ampm}`;
}

interface SpeakOptions {
  title: string;
  message: string;
  triggerTime: Date;
}

/**
 * VoiceService — Wrapper around window.speechSynthesis
 * responsible for audio reminder callouts.
 */
export class VoiceService {
  private static get synth(): SpeechSynthesis | null {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis;
    }
    return null;
  }

  /**
   * Speaks the provided text or structured reminder options using browser SpeechSynthesis.
   */
  static speak(options: string | SpeakOptions): void {
    const synth = this.synth;
    if (!synth) {
      console.warn('[VoiceService] SpeechSynthesis is not supported in this browser.');
      return;
    }

    try {
      // Cancel any ongoing speech before starting a new one
      synth.cancel();

      let text = '';
      if (typeof options === 'string') {
        text = options;
      } else {
        const formattedTime = formatTime12HourFromDate(options.triggerTime);
        text = `Hey Simran, it's ${formattedTime}. ${options.message}`;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure comfortable rate and pitch parameters
      utterance.rate = 1.0;  // range: 0.1 to 10
      utterance.pitch = 1.0; // range: 0 to 2
      utterance.volume = 1.0; // range: 0 to 1

      // Select an English voice if available, otherwise default to system choice
      const voices = synth.getVoices();
      const engVoice = voices.find(
        (v) => v.lang.startsWith('en-US') || v.lang.startsWith('en-GB') || v.lang.startsWith('en')
      );
      if (engVoice) {
        utterance.voice = engVoice;
      }

      synth.speak(utterance);
      console.log(`[VoiceService] Speaking: "${text}"`);
    } catch (err) {
      console.error('[VoiceService] Failed to speak:', err);
    }
  }

  /**
   * Stops all ongoing and queued speech.
   */
  static stop(): void {
    const synth = this.synth;
    if (synth) {
      synth.cancel();
      console.log('[VoiceService] Stopped speech');
    }
  }

  /**
   * Pauses the speech.
   */
  static pause(): void {
    const synth = this.synth;
    if (synth) {
      synth.pause();
      console.log('[VoiceService] Paused speech');
    }
  }

  /**
   * Resumes the paused speech.
   */
  static resume(): void {
    const synth = this.synth;
    if (synth) {
      synth.resume();
      console.log('[VoiceService] Resumed speech');
    }
  }
}
