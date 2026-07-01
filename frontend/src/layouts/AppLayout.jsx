import { useState } from 'react';
import PropTypes from 'prop-types';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/Navbar';

function AppLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.2),_transparent_35%),linear-gradient(135deg,_#060816_0%,_#0f172a_100%)] p-3 text-slate-100 sm:p-4 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-7xl flex-col gap-4 lg:flex-row">
        <div className={`fixed inset-y-0 left-0 z-20 w-[84%] max-w-[280px] p-3 transition-transform duration-300 lg:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar title="LifeOS AI" onNavigate={() => setMobileMenuOpen(false)} />
        </div>

        <button
          type="button"
          className="fixed right-4 top-4 z-30 rounded-full border border-white/10 bg-slate-900/90 p-3 text-white lg:hidden"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>

        <div className="hidden w-[280px] shrink-0 lg:block">
          <Sidebar title="LifeOS AI" />
        </div>

        <div className="flex flex-col flex-1 rounded-[32px] border border-white/10 bg-slate-900/70 shadow-[0_20px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl overflow-hidden">
          <TopNavbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}

AppLayout.propTypes = {
  children: PropTypes.node,
};

export default AppLayout;
