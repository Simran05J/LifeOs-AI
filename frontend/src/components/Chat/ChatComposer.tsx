import type { FormEvent } from 'react';
import AttachmentButton from './AttachmentButton';
import VoiceButton from './VoiceButton';
import SendButton from './SendButton';

interface ChatComposerProps {
  inputVal: string;
  setInputVal: (val: string) => void;
  onSubmit: (e: FormEvent) => void;
  isLoading: boolean;
  onVoiceToggle?: () => void;
  onAttach?: () => void;
}

export default function ChatComposer({
  inputVal,
  setInputVal,
  onSubmit,
  isLoading,
  onVoiceToggle,
  onAttach,
}: ChatComposerProps) {
  return (
    <div className="shrink-0 pt-3 border-t border-white/5 bg-slate-900/10">
      <div className="max-w-2xl lg:max-w-3xl mx-auto w-full px-1">
        <form
          onSubmit={onSubmit}
          className="relative flex items-center rounded-full bg-slate-950/80 border border-white/10 px-3 py-2 focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all duration-200"
        >
          <AttachmentButton onAttach={onAttach} />

          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={isLoading ? 'Thinking…' : 'Message LifeOS AI…'}
            disabled={isLoading}
            className="flex-1 bg-transparent px-3 text-sm text-white placeholder-slate-500 outline-none border-none py-1.5 disabled:opacity-50"
          />

          <VoiceButton onVoiceToggle={onVoiceToggle} />
          
          <SendButton disabled={isLoading || !inputVal.trim()} />
        </form>
        <p className="text-[10px] text-center text-slate-600 mt-2 select-none">
          LifeOS AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
}
