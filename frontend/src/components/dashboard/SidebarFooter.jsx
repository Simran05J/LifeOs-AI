/**
 * SidebarFooter — Professional attribution footer pinned to the bottom of the sidebar.
 *
 * Displays:
 *   - Developer credit: Code Crystal
 *   - App version: LifeOS AI v1.0
 *   - Copyright: © 2026 Code Crystal
 *   - Project context: Google × Kaggle AI Agents Capstone
 *
 * No props required — this is static attribution content.
 */
function SidebarFooter() {
  return (
    <footer
      className="border-t border-white/5 pt-1.5 select-none"
      aria-label="Application footer"
    >
      <div className="flex flex-col gap-0 px-1 text-[9px] leading-tight">
        <p className="font-semibold text-slate-400">Developed by Code Crystal</p>
        <div className="flex items-center justify-between text-slate-500 mt-0.5">
          <span>LifeOS AI v1.0</span>
          <span className="text-slate-600">© 2026</span>
        </div>
        <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-violet-500/50 mt-0.5">
          Google × Kaggle AI Agents Capstone
        </p>
      </div>
    </footer>
  );
}

export default SidebarFooter;
