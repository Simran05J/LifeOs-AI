import { ArrowUp } from 'lucide-react';

interface SendButtonProps {
  disabled: boolean;
}

export default function SendButton({ disabled }: SendButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label="Send message"
      className="grid h-8 w-8 place-items-center rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-all duration-150 disabled:bg-slate-800 disabled:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      <ArrowUp size={16} />
    </button>
  );
}
