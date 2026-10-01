import React, { useEffect, useState } from 'react';
import { AlertCircle, LoaderCircle, ShieldCheck, X, Eye } from 'lucide-react';
import PinPointLogo from './PinPointLogo';

function GoogleMark() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

export default function AuthModal({
  isOpen,
  onClose,
  onSignInWithGoogle,
  promptReason = '',
  isGoogleSignInConfigured = false,
}) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsSigningIn(false);
      setSignInError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (!isGoogleSignInConfigured || isSigningIn) return;

    setIsSigningIn(true);
    setSignInError('');

    try {
      const user = await onSignInWithGoogle();
      // The redirect fallback navigates away and returns null. Keep the dialog
      // open while navigation starts; close only after a successful popup sign-in.
      if (user) onClose();
    } catch (error) {
      setSignInError(error?.message || 'Google sign-in could not be completed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="presentation"
    >
      <div
        className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 shadow-modal overflow-hidden p-6 relative text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-sign-in-title"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign-in dialog"
          disabled={isSigningIn}
          className="absolute top-4 right-4 w-8 h-8 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-all disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-modal flex items-center justify-center mx-auto mb-4 border border-stone-200/60 dark:border-stone-700">
          <PinPointLogo className="w-full h-full" />
        </div>

        <h3 id="google-sign-in-title" className="text-xl font-bold text-stone-900 dark:text-white mb-1.5">
          Sign in with Google
        </h3>

        <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed px-2">
          {promptReason || 'Guests can browse all listings. Sign in with your Google account to submit reports, upload photos, claim items, or vote.'}
        </p>

        {/* View-only vs member feature cards */}
        <div className="mb-5 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-2xl border border-stone-200/80 dark:border-stone-700/70 text-left space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-stone-600 dark:text-stone-300">
            <Eye className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span><strong>Guests:</strong> Browse hazard watch & lost/found listings</span>
          </div>
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span><strong>Members:</strong> Post hazards, upload photos, claim & vote</span>
          </div>
        </div>

        {!isGoogleSignInConfigured && (
          <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Google sign-in is not configured for this deployment yet. Please ask a site administrator to complete the Firebase setup.</span>
            </div>
          </div>
        )}

        {signInError && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-left text-xs leading-relaxed text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{signInError}</span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={!isGoogleSignInConfigured || isSigningIn}
          className="w-full py-3 px-4 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 border border-stone-300 dark:border-stone-700 rounded-2xl text-stone-800 dark:text-white text-sm font-bold flex items-center justify-center space-x-3 shadow-card hover:shadow-card-hover transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
        >
          {isSigningIn ? <LoaderCircle className="w-5 h-5 animate-spin" aria-hidden="true" /> : <GoogleMark />}
          <span>{isSigningIn ? 'Opening Google…' : 'Continue with Google'}</span>
        </button>

        <div className="mt-5 pt-3.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-center space-x-2 text-[11px] text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>BBIT Community Portal</span>
        </div>
      </div>
    </div>
  );
}
