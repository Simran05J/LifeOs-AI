/**
 * CommandBar.jsx — Docked AI command bar for the LifeOS dashboard.
 *
 * Provides:
 *   1. Always-visible input field for AI commands
 *   2. Voice recognition with listening animation
 *   3. Latest AI response bubble (auto-dismiss)
 */
import { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Send, Paperclip, X, Sparkles } from 'lucide-react';
import { speechRecognition } from '../../services/SpeechRecognitionService';
import { showToast } from '../ui/ToastManager';
import VoiceButton from './VoiceButton';

export default function CommandBar({
  onSendMessage,
  isLoading = false,
  latestResponse = null,
  onClearResponse = () => {},
}) {
  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef(null);

  // ── Voice Recognition ────────────────────────────────────────────────────
  const handleVoiceToggle = useCallback(() => {
    if (!speechRecognition.constructor.isSupported()) {
      showToast('Voice input not supported in this browser', 'error');
      return;
    }

    speechRecognition.toggle({
      onTranscript: (text, isFinal) => {
        setInputVal(text);
        if (isFinal && text.trim()) {
          // Send immediately when final
          const finalVal = text.trim();
          setInputVal('');
          setIsListening(false);
          onSendMessage(finalVal);
        }
      },
      onListeningChange: (listening) => {
        setIsListening(listening);
      },
      onError: (err) => {
        console.warn('[CommandBar] Voice error:', err);
        showToast('Voice recognition error. Try again.', 'error');
      },
    });
  }, [onSendMessage]); 

  // ── Send Message ─────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed || isLoading) return;

    // Stop listening if active
    if (isListening) {
      speechRecognition.stop();
      setIsListening(false);
    }

    setInputVal('');
    onSendMessage(trimmed);
  };

  return (
    <div className="shrink-0 relative z-30">
      {/* ── Latest Response Bubble ────────────────────────────────────────── */}
      {latestResponse && (
        <div className="absolute bottom-full left-0 right-0 mb-2 px-4 animate-fade-in">
          <div
            className={`max-w-xl mx-auto flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 shadow-lg backdrop-blur-md cursor-pointer transition-all duration-300 hover:scale-[1.01] ${
              latestResponse.hasActions
                ? 'border-emerald-500/20 bg-emerald-950/80'
                : 'border-white/10 bg-slate-900/90'
            }`}
            onClick={onClearResponse}
            role="status"
          >
            <Sparkles
              size={14}
              className={latestResponse.hasActions ? 'text-emerald-400 shrink-0' : 'text-violet-400 shrink-0'}
            />
            <p className="text-xs text-slate-300 flex-1 leading-relaxed truncate">
              {latestResponse.text}
            </p>
            <button
              type="button"
              className="text-slate-600 hover:text-white transition-colors shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onClearResponse();
              }}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── Command Input Bar ────────────────────────────────────────────── */}
      <div className="bg-slate-950/80 backdrop-blur-xl border-t border-b border-white/5 px-4 py-3 shadow-[0_-5px_30px_rgba(0,0,0,0.3)] relative z-20">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center rounded-full bg-slate-900 border border-white/10 px-3 py-2 focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all duration-200"
          >
            {/* Attachment */}
            <button
              type="button"
              className="p-2 text-slate-500 hover:text-violet-400 transition-colors duration-150 outline-none rounded-full hover:bg-white/5"
              aria-label="Attach file"
            >
              <Paperclip size={16} />
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={
                isLoading ? 'Thinking…' : isListening ? 'Listening…' : 'Message LifeOS AI…'
              }
              disabled={isLoading}
              className="flex-1 bg-transparent px-3 text-sm text-white placeholder-slate-500 outline-none border-none py-1.5 disabled:opacity-50"
              autoComplete="off"
            />

            {/* Voice */}
            <VoiceButton onVoiceToggle={handleVoiceToggle} isListening={isListening} />

            {/* Send */}
            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-95"
              aria-label="Send message"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </form>

          {/* Subtle branding */}
          <p className="text-[9px] text-center text-slate-600 mt-1.5 select-none">
            LifeOS AI · Voice-enabled
          </p>
        </div>
      </div>
    </div>
  );
}

CommandBar.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  latestResponse: PropTypes.object,
  onClearResponse: PropTypes.func,
};
