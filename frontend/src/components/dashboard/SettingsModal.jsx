/**
 * SettingsModal — Full-featured Settings dashboard dialog for LifeOS AI.
 *
 * Implements sections:
 *   - Profile info (displayName, email, workspaceName, subscription tier)
 *   - Preferences (language dropdown, notification toggle, voice toggle)
 *   - About info (app credits and metadata)
 *   - Logout action (triggers signOut and redirects to /login)
 */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { X, LogOut, Check, Globe, Bell, Mic, Info, User } from 'lucide-react';
import { getFirebaseAuth, signOut } from '../../services/authService';

function SettingsModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  // Component states
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Field states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [subscription, setSubscription] = useState('Free');
  const [language, setLanguage] = useState('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        setLoading(true);
        try {
          const db = getFirestore();
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const data = userDoc.data();
            setDisplayName(data.displayName || user.displayName || '');
            setEmail(data.email || user.email || '');
            setPhotoURL(data.photoURL || user.photoURL || '');
            setWorkspaceName(data.workspaceName || `${data.displayName}'s Workspace`);
            setSubscription(data.subscription || 'Free');
            setLanguage(data.preferences?.language || 'en');
            setNotificationsEnabled(data.preferences?.notifications !== false);
            setVoiceEnabled(data.preferences?.voice === true);
          } else {
            // Fallback defaults from auth state
            setDisplayName(user.displayName || '');
            setEmail(user.email || '');
            setPhotoURL(user.photoURL || '');
            setWorkspaceName(`${user.displayName || 'LifeOS'}'s Workspace`);
            setSubscription('Free');
            setLanguage('en');
            setNotificationsEnabled(true);
            setVoiceEnabled(false);
          }
        } catch (err) {
          console.error('Failed to load user settings profile:', err);
          // Graceful fallback to auth state
          setDisplayName(user.displayName || '');
          setEmail(user.email || '');
          setPhotoURL(user.photoURL || '');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        workspaceName: workspaceName.trim(),
        'preferences.language': language,
        'preferences.notifications': notificationsEnabled,
        'preferences.voice': voiceEnabled,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Error: Failed to save changes to Firestore. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        await signOut();
        onClose();
        // Redirect to login page and overwrite history stack
        navigate('/login', { replace: true });
      } catch (err) {
        console.error('Logout error:', err);
        alert('An error occurred during logout. Please refresh and try again.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-[32px] border border-white/10 bg-slate-950/95 shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <h2 className="text-lg font-bold text-white tracking-wide">Workspace Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          {loading ? (
            /* Skeleton Loading State */
            <div className="space-y-6 animate-pulse">
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl">
                <div className="h-12 w-12 rounded-2xl bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-slate-800" />
                  <div className="h-3 w-1/4 rounded bg-slate-800" />
                </div>
              </div>
              <div className="h-32 bg-white/5 rounded-2xl" />
              <div className="h-32 bg-white/5 rounded-2xl" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Profile Card Summary */}
              <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-2xl">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={displayName}
                    className="h-12 w-12 rounded-2xl object-cover border border-violet-500/30 shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-base font-bold text-white shadow-lg shadow-violet-500/20">
                    {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-white">{displayName || 'LifeOS User'}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[180px] sm:max-w-xs">{email}</span>
                    <span className="shrink-0 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 shadow-md shadow-amber-500/10">
                      {subscription}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Fields Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-widest pb-1 border-b border-white/5">
                  <User size={13} />
                  <span>Profile Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Display Name Input */}
                  <div className="space-y-1.5">
                    <label htmlFor="displayNameInput" className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      Display Name
                    </label>
                    <input
                      id="displayNameInput"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      placeholder="Your Name"
                      className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all duration-200"
                    />
                  </div>

                  {/* Workspace Name Input */}
                  <div className="space-y-1.5">
                    <label htmlFor="workspaceNameInput" className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      Workspace Name
                    </label>
                    <input
                      id="workspaceNameInput"
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      required
                      placeholder="My Workspace"
                      className="w-full rounded-xl bg-slate-900 border border-white/10 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-widest pb-1 border-b border-white/5">
                  <Globe size={13} />
                  <span>System Preferences</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Language Selection */}
                  <div className="space-y-1.5">
                    <label htmlFor="languageSelect" className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      Language
                    </label>
                    <select
                      id="languageSelect"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all duration-200"
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Español (ES)</option>
                      <option value="fr">Français (FR)</option>
                      <option value="de">Deutsch (DE)</option>
                      <option value="hi">हिन्दी (IN)</option>
                      <option value="ja">日本語 (JP)</option>
                    </select>
                  </div>

                  {/* Toggle preferences container */}
                  <div className="flex flex-col justify-center gap-4 pt-4 sm:pt-0">
                    {/* Notification Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Bell size={15} className="text-slate-400" />
                        <label htmlFor="notificationToggle" className="text-xs font-semibold text-slate-300">
                          Enable Notifications
                        </label>
                      </div>
                      <input
                        id="notificationToggle"
                        type="checkbox"
                        checked={notificationsEnabled}
                        onChange={(e) => setNotificationsEnabled(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-white/10 bg-slate-900 text-violet-600 focus:ring-violet-500/50 transition-all"
                      />
                    </div>

                    {/* Voice Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Mic size={15} className="text-slate-400" />
                        <label htmlFor="voiceToggle" className="text-xs font-semibold text-slate-300">
                          Enable Voice Output
                        </label>
                      </div>
                      <input
                        id="voiceToggle"
                        type="checkbox"
                        checked={voiceEnabled}
                        onChange={(e) => setVoiceEnabled(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-white/10 bg-slate-900 text-violet-600 focus:ring-violet-500/50 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-widest pb-1 border-b border-white/5">
                  <Info size={13} />
                  <span>About Application</span>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs text-slate-400 space-y-1.5 leading-relaxed">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-300">Application Name:</span>
                    <span>LifeOS AI</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-300">System Version:</span>
                    <span>1.0.0 (Release)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-300">Project Track:</span>
                    <span>Google × Kaggle AI Agents Capstone</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-300">Engineering Team:</span>
                    <span className="text-violet-400 font-bold">Developed by Code Crystal</span>
                  </div>
                </div>
              </div>

              {/* Save & Feedback Action Bar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {saveSuccess && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 animate-fade-in">
                    <Check size={14} />
                    <span>Preferences saved!</span>
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-xs font-semibold text-white hover:from-violet-500 hover:to-indigo-500 active:scale-95 transition-all duration-200 disabled:opacity-50 shadow-md shadow-violet-600/10"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions (Logout) */}
        <div className="px-6 py-4 bg-slate-900/50 border-t border-white/5 flex justify-between items-center shrink-0">
          <span className="text-[10px] text-slate-500 font-medium">© 2026 Code Crystal</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-red-950/30 border border-red-500/20 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/60 hover:text-red-300 transition-all duration-200"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

SettingsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SettingsModal;
