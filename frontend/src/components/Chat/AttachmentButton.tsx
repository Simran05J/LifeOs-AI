import { Paperclip } from 'lucide-react';

interface AttachmentButtonProps {
  onAttach?: () => void;
}

export default function AttachmentButton({ onAttach }: AttachmentButtonProps) {
  return (
    <button
      type="button"
      onClick={onAttach}
      aria-label="Attach files"
      className="p-2 text-slate-500 hover:text-slate-300 transition-colors duration-150 outline-none rounded-full hover:bg-white/5"
    >
      <Paperclip size={16} />
    </button>
  );
}
