import { Sparkles } from 'lucide-react';

interface TypingIndicatorProps {
  isLoading: boolean;
}

export default function TypingIndicator({ isLoading }: TypingIndicatorProps) {
  if (!isLoading) return null;

  return (
    <div className="flex gap-4 items-start animate-fade-in">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-sm border border-violet-500/20">
        <Sparkles size={14} />
      </div>
      <div className="flex flex-col">
        <div className="px-4 py-3.5 rounded-[20px] rounded-tl-sm bg-white/5 border border-white/5">
          <span className="flex gap-1.5 items-center">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
