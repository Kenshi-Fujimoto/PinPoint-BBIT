import React from 'react';
import { X, ShieldCheck, Sparkles, HeartHandshake, Lock, Eye } from 'lucide-react';
import PinPointLogo from './PinPointLogo';

export default function AuthModal({ isOpen, onClose, onSignInWithGoogle, promptReason = '', isOfflineDemo = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 shadow-modal overflow-hidden p-6 relative text-center">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-modal flex items-center justify-center mx-auto mb-4 border border-stone-200/60 dark:border-stone-700">
          <PinPointLogo className="w-full h-full" />
        </div>

        <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-1.5">
          Sign In with Google
        </h3>
        
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed px-2">
          {promptReason || 'Unauthenticated visitors can view all items. Sign in to submit reports, upload photos, claim items, or vote.'}
        </p>

        {/* Offline / Demo Mode Notice */}
        {isOfflineDemo && (
          <div className="mb-4 flex items-start space-x-2 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-left text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
            <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
            <span>
              <strong>Offline demo mode:</strong> Firebase keys aren&apos;t configured, so
              &ldquo;Continue with Google&rdquo; signs you in locally as the{' '}
              <strong>BBIT Scholar</strong> demo profile. It is labelled{' '}
              <strong>Demo</strong> in the navbar and stays on this device.
            </span>
          </div>
        )}

        {/* View-Only vs Member Feature Cards */}
        <div className="mb-5 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-2xl border border-stone-200/80 dark:border-stone-700/70 text-left space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-stone-600 dark:text-stone-300">
            <Eye className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span><strong>Guests:</strong> Browse hazard watch & lost/found listings</span>
          </div>
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span><strong>Signed-in Users:</strong> Post hazards, upload photos, claim & vote</span>
          </div>
        </div>

        {/* Google Sign-in Button */}
        <button
          type="button"
          onClick={async () => {
            await onSignInWithGoogle();
            onClose();
          }}
          className="w-full py-3 px-4 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 border border-stone-300 dark:border-stone-700 rounded-2xl text-stone-800 dark:text-white text-sm font-bold flex items-center justify-center space-x-3 shadow-card hover:shadow-card-hover transition-all active:scale-[0.98]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          <span>Continue with Google</span>
        </button>

        <div className="mt-5 pt-3.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-center space-x-2 text-[11px] text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>BBIT Community Portal</span>
        </div>

      </div>
    </div>
  );
}
