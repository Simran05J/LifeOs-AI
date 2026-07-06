/**
 * Sidebar — Left navigation and AI workspace panel for LifeOS AI.
 *
 * Rebuilt Sidebar hierarchy (per user request):
 *   1. User Profile Header Card (connected to Firestore User Document, Auth fallback)
 *   2. Settings Button
 *   3. New Chat Button (directly below settings, no divider)
 *   4. Recent Search History (scrollable, flexible height, takes remaining vertical space)
 *   5. Divider (only divider at the bottom)
 *   6. Upgrade to Pro card (pinned to bottom)
 *   7. Footer (attribution metadata, pinned below Upgrade card, never scrolls)
 */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Settings } from 'lucide-react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, syncUserProfile } from '../services/authService';
import ChatHistoryPanel from './dashboard/ChatHistoryPanel';
import NewChatButton from './dashboard/NewChatButton';
import UpgradeCard from './dashboard/UpgradeCard';
import SidebarFooter from './dashboard/SidebarFooter';

function Sidebar({
  loadingChats = false,
  onSettingsOpen,
  onNavigate,
  /* Chat history props — populated from page state */
  conversations,
  activeConvId,
  onNewChat,
  onSelectConv,
  onRenameConv,
  onDeleteConv,
}) {
  // Authentication & Firestore profile state
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [syncError, setSyncError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const performSync = async (user) => {
    setSyncError(false);
    try {
      // Create or update profile in Firestore as a secondary, non-blocking step
      await syncUserProfile(user);

      // Fetch the updated Firestore document
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        setProfile(userDoc.data());
      }
    } catch (err) {
      console.error('Non-blocking user profile sync/load failed:', err);
      setSyncError(true);

      // Fallback: try loading the existing document anyway
      try {
        const db = getFirestore();
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        }
      } catch (innerErr) {
        console.error('Failed to load existing profile on fallback:', innerErr);
      }
    } finally {
      setLoadingProfile(false);
      setRetrying(false);
    }
  };

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        setLoadingProfile(true);
        performSync(user);
      } else {
        setProfile(null);
        setLoadingProfile(false);
        setSyncError(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleRetry = async () => {
    if (!currentUser) return;
    setRetrying(true);
    await performSync(currentUser);
  };

  // Compute profile fields with robust fallbacks
  const displayName = profile?.displayName || currentUser?.displayName || profile?.email || currentUser?.email || 'LifeOS User';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const photoUrl = profile?.photoURL || currentUser?.photoURL || null;
  const workspaceName = profile?.workspaceName || (displayName !== 'LifeOS User' ? `${displayName}'s Workspace` : 'Active Workspace');
  const subscription = profile?.subscription || 'Free';
  const role = profile?.role || null;

  return (
    <aside
      className="flex flex-1 flex-col h-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80 p-4 px-3.5 shadow-[0_20px_70px_rgba(15,23,42,0.45)] backdrop-blur-xl"
      aria-label="Workspace sidebar"
    >
      {/* ── 1. User Profile Header Card (Firestore / Skeleton Loading) ── */}
      {loadingProfile && currentUser && !syncError ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shrink-0 animate-pulse select-none">
          <div className="h-10 w-10 rounded-2xl bg-slate-800/80" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-slate-800/80" />
            <div className="h-3 w-1/2 rounded bg-slate-800/80" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shrink-0 select-none">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={displayName}
              className="h-10 w-10 rounded-2xl object-cover border border-violet-500/30 shadow-lg"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-sm font-bold text-white shadow-lg shadow-violet-500/20">
              {avatarLetter}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-sm font-bold text-white tracking-wide truncate" title={displayName}>
                {displayName}
              </h2>
              {subscription && (
                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                  subscription === 'Pro' || subscription === 'Premium'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    : 'bg-white/10 text-slate-400'
                }`}>
                  {subscription}
                </span>
              )}
            </div>
            
            {syncError ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] text-rose-400 font-semibold uppercase tracking-wider">Sync failed</span>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={retrying}
                  className="text-[9px] text-violet-400 font-bold hover:underline hover:text-violet-300 transition-all"
                >
                  {retrying ? 'Retrying…' : 'Retry'}
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 font-medium truncate" title={workspaceName}>
                {workspaceName}
              </p>
            )}

            {role && role !== 'user' && (
              <p className="text-[9px] text-violet-400 font-bold uppercase tracking-wider mt-0.5">{role}</p>
            )}
          </div>
        </div>
      )}

      {/* ── 2. Settings Button ── */}
      <div className="mt-2.5 shrink-0">
        <button
          type="button"
          onClick={onSettingsOpen}
          className="flex w-full items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5 text-left text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-violet-500/30 select-none"
        >
          <Settings size={15} className="text-slate-500" />
          <span>Settings</span>
        </button>
      </div>

      {/* ── 3. New Chat Button (Directly below settings, no divider) ── */}
      <div className="mt-2.5 shrink-0">
        <NewChatButton onClick={onNewChat} />
      </div>

      {/* ── 4. Recent Search History (flex-1 scrollable, takes remaining vertical space) ── */}
      <div className="flex-1 min-h-0 flex flex-col mt-3.5">
        <ChatHistoryPanel
          loading={loadingChats}
          conversations={conversations}
          activeId={activeConvId}
          onSelect={(id) => {
            onSelectConv?.(id);
            onNavigate?.(); // close mobile drawer
          }}
          onRename={onRenameConv}
          onDelete={onDeleteConv}
        />
      </div>

      {/* Divider */}
      <hr className="border-white/5 my-3 shrink-0" />

      {/* ── 5. Upgrade to Pro Card (Pinned to bottom) ── */}
      <div className="shrink-0">
        <UpgradeCard />
      </div>

      {/* ── 6. Sticky Footer (Pinned below Upgrade card, no extra divider) ── */}
      <div className="shrink-0 mt-2.5">
        <SidebarFooter />
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  loadingChats: PropTypes.bool,
  onSettingsOpen: PropTypes.func.isRequired,
  onNavigate: PropTypes.func,
  conversations: PropTypes.array,
  activeConvId: PropTypes.string,
  onNewChat: PropTypes.func,
  onSelectConv: PropTypes.func,
  onRenameConv: PropTypes.func,
  onDeleteConv: PropTypes.func,
};

export default Sidebar;
