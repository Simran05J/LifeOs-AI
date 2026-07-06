import { Mic, MicOff } from 'lucide-react';

interface VoiceButtonProps {
  onVoiceToggle?: () => void;
  isListening?: boolean;
}

export default function VoiceButton({ onVoiceToggle, isListening = false }: VoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onVoiceToggle}
      aria-label={isListening ? 'Stop listening' : 'Voice typing'}
      className={`relative p-2 transition-all duration-300 outline-none rounded-full mr-1 ${
        isListening
          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          : 'text-slate-500 hover:text-violet-400 hover:bg-white/5'
      }`}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping opacity-75" />
      )}
      {isListening ? <MicOff size={16} className="relative z-10" /> : <Mic size={16} className="relative z-10" />}
    </button>
  );
}
