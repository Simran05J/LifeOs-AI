/**
 * AppLayout — Viewport-locked layout shell for the LifeOS AI Workspace.
 *
 * Responsive breakpoints:
 *   xl (1280px+) : [Left Sidebar 280px] | [Center flex-1] | [Right 300px agent cards]
 *   lg (1024px+) : [Left Sidebar 260px] | [Center flex-1]  (right hidden)
 *   < lg         : Drawer sidebar | Center only
 *
 * Props:
 *   children      — React.ReactNode — center content (Chat + CommandBar)
 *   rightContent  — React.ReactNode — right column (agent widget cards)
 *   sidebarProps  — Object — props passed to the Sidebar component
 */
import { useState } from 'react';
import PropTypes from 'prop-types';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/Navbar/TopNavbar';
import SettingsModal from '../components/dashboard/SettingsModal';

function AppLayout({ children, rightContent = null, sidebarProps = {}, greetingMessage = null, unreadCount = 0, onBellClick }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar  = () => setSidebarOpen(true);

  const enrichedSidebarProps = {
    ...sidebarProps,
    onSettingsOpen: () => {
      setSettingsOpen(true);
      closeSidebar();
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.15),_transparent_35%),linear-gradient(135deg,_#060816_0%,_#0f172a_100%)] text-slate-100 font-sans">

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Sidebar Drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col p-3 transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile navigation drawer"
      >
        <Sidebar onNavigate={closeSidebar} {...enrichedSidebarProps} />
      </aside>

      {/* ── Main Three-Column Container ── */}
      <div className="flex h-full w-full gap-3 p-3 sm:p-4 lg:p-5">

        {/* ── Left Sidebar — Desktop only ── */}
        <div className="hidden lg:flex lg:flex-col w-[260px] xl:w-[280px] shrink-0 h-full">
          <Sidebar {...enrichedSidebarProps} />
        </div>

        {/* ── Center Panel (Chat Workspace) ── */}
        <div className="flex flex-col flex-1 min-w-0 rounded-[28px] border border-white/10 bg-slate-900/60 shadow-[0_20px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl overflow-hidden h-full">
          <TopNavbar onMenuToggle={openSidebar} greetingMessage={greetingMessage} unreadCount={unreadCount} onBellClick={onBellClick} />
          <main className="flex flex-1 flex-col overflow-hidden px-4 pb-4 pt-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 lg:pt-6">
            {children}
          </main>
        </div>

        {/* ── Right Column (Agent Cards) — visible xl+ ── */}
        {rightContent && (
          <div className="hidden xl:flex xl:flex-col w-[300px] 2xl:w-[320px] shrink-0 h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent gap-3">
            {rightContent}
          </div>
        )}

      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

AppLayout.propTypes = {
  children: PropTypes.node,
  rightContent: PropTypes.node,
  sidebarProps: PropTypes.object,
  greetingMessage: PropTypes.string,
  unreadCount: PropTypes.number,
  onBellClick: PropTypes.func,
};

export default AppLayout;
