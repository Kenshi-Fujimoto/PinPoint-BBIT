import React, { useState, useRef, useEffect } from 'react';
import { 
  AlertCircle, 
  MapPin, 
  Plus, 
  ShieldCheck, 
  HeartHandshake, 
  Sun, 
  Moon,
  Sparkles,
  LogIn,
  LogOut,
  User,
  ChevronDown,
  Lock
} from 'lucide-react';
import PinPointLogo from './PinPointLogo';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenReportModal, 
  onOpenAdminPortal,
  civicCount,
  lostFoundCount,
  isDark,
  onToggleTheme,
  user,
  onSignIn,
  onSignOut
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer group" 
            onClick={() => setActiveTab('civic')}
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-subtle group-hover:scale-105 transition-transform flex items-center justify-center">
              <PinPointLogo className="w-full h-full" />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-base tracking-tight text-stone-900 dark:text-white">PinPoint</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200/50 dark:border-indigo-800/40">BBIT</span>
            </div>
          </div>

          {/* Center Tabs */}
          <nav className="hidden md:flex items-center space-x-1 p-1 bg-stone-100/90 dark:bg-stone-800/80 rounded-xl border border-stone-200/60 dark:border-stone-700 text-xs font-medium">
            <button
              onClick={() => setActiveTab('civic')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'civic'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-subtle font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <AlertCircle className={`w-3.5 h-3.5 ${activeTab === 'civic' ? 'text-amber-500' : 'text-stone-400'}`} />
              <span>Civic Issues</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {civicCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('lostfound')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'lostfound'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-subtle font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <HeartHandshake className={`w-3.5 h-3.5 ${activeTab === 'lostfound' ? 'text-pink-500' : 'text-stone-400'}`} />
              <span>Lost & Found</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-pink-100 dark:bg-pink-950 text-pink-800 dark:text-pink-300">
                {lostFoundCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'map'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-subtle font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 ${activeTab === 'map' ? 'text-emerald-500' : 'text-stone-400'}`} />
              <span>Satellite Map</span>
            </button>
          </nav>

          {/* Right Action Items: Theme, Google Auth, Create Action */}
          <div className="flex items-center space-x-2">
            
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-700 transition-all border border-stone-200 dark:border-stone-700"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Google Authentication Component */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-1 pl-2 pr-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition-all text-xs font-semibold text-stone-800 dark:text-stone-200"
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName} 
                      className="w-6 h-6 rounded-lg object-cover ring-1 ring-indigo-500/40"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                      {user.displayName?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="hidden sm:inline truncate max-w-[100px]">{user.displayName?.split(' ')[0]}</span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>

                {/* User Profile Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-modal py-2 z-50 animate-fade-in text-xs">
                    <div className="px-4 py-2.5 border-b border-stone-100 dark:border-stone-800">
                      <p className="font-bold text-stone-900 dark:text-white truncate">{user.displayName}</p>
                      <p className="text-[11px] text-stone-400 truncate">{user.email}</p>
                      {user.isDemo ? (
                        <span
                          className="inline-flex items-center space-x-1 mt-1.5 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px]"
                          title="Firebase keys are not configured — sign-in used the local offline demo profile"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Offline Demo Mode</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 mt-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Verified Account</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAdminPortal();
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center space-x-2 text-stone-700 dark:text-stone-300 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Facility Staff Operations</span>
                    </button>

                    <div className="border-t border-stone-100 dark:border-stone-800 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center space-x-2 transition-colors font-semibold"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold shadow-subtle transition-all active:scale-95"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Sign In</span>
              </button>
            )}

            {/* Main Create Action */}
            <button
              onClick={() => onOpenReportModal(activeTab === 'lostfound' ? 'lostfound' : 'civic')}
              title={!user ? "Sign in required to post or report" : (activeTab === 'lostfound' ? 'Post Lost or Found Item' : 'Report Civic Hazard')}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-glow-indigo active:scale-95"
            >
              {!user ? <Lock className="w-3.5 h-3.5 text-indigo-200" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{activeTab === 'lostfound' ? 'Post Item' : 'Report Issue'}</span>
            </button>
          </div>

        </div>

        {/* Mobile Tab Bar */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-stone-100 dark:border-stone-800 text-xs">
          <button
            onClick={() => setActiveTab('civic')}
            className={`px-2.5 py-1 rounded-lg font-medium ${
              activeTab === 'civic' ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold' : 'text-stone-500'
            }`}
          >
            Civic ({civicCount})
          </button>

          <button
            onClick={() => setActiveTab('lostfound')}
            className={`px-2.5 py-1 rounded-lg font-medium ${
              activeTab === 'lostfound' ? 'bg-pink-100 dark:bg-pink-950 text-pink-900 dark:text-pink-200 font-bold' : 'text-stone-500'
            }`}
          >
            Lost & Found ({lostFoundCount})
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`px-2.5 py-1 rounded-lg font-medium ${
              activeTab === 'map' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold' : 'text-stone-500'
            }`}
          >
            Satellite
          </button>

          <button
            onClick={onOpenAdminPortal}
            className="px-2 py-1 rounded-lg font-medium text-emerald-600 dark:text-emerald-400"
          >
            Staff ➔
          </button>
        </div>

      </div>
    </header>
  );
}
