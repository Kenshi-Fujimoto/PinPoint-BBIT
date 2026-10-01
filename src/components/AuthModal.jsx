import React, { useEffect, useState } from 'react';
import {
  X, ShieldCheck, HeartHandshake, Lock, Eye, AlertTriangle, Loader2,
  ExternalLink, RefreshCw, Copy, Check, WifiOff, ChevronDown,
} from 'lucide-react';
import PinPointLogo from './PinPointLogo';
import { explainAuthError, consumePendingAuthError, getFirebaseStatus } from '../services/firebase';

const GOOGLE_ICON = (
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
);

export default function AuthModal({
  isOpen,
  onClose,
  onSignInWithGoogle,
  onSignInWithRedirect,
  promptReason = '',
}) {
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null); // 'popup' | 'redirect' | null
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  // Re-read on every open so late runtime config is picked up.
  const [status, setStatus] = useState(() => getFirebaseStatus());

  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if (!isOpen) {
      setBusy(false);
      setMode(null);
      setError(null);
      setCopied(false);
      setShowDetails(false);
      return;
    }
    setStatus(getFirebaseStatus());
    // A redirect sign-in that failed on the previous page load reports here.
    const pending = consumePendingAuthError();
    if (pending) setError(explainAuthError(pending));
  }, [isOpen]);

  if (!isOpen) return null;

  const run = async (kind, fn) => {
    if (busy || typeof fn !== 'function') return;
    setBusy(true);
    setMode(kind);
    setError(null);
    try {
      const user = await fn();
      if (user) onClose();
    } catch (err) {
      setError(explainAuthError(err));
    } finally {
      setBusy(false);
      setMode(null);
    }
  };

  const retry = () => run('popup', onSignInWithGoogle);
  const useRedirect = () => run('redirect', onSignInWithRedirect);

  const copyDiagnostics = async () => {
    const lines = [
      `PinPoint sign-in diagnostics — ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `Embedded preview: ${isEmbedded ? 'yes' : 'no'}`,
      `Firebase configured: ${status.configured ? 'yes' : 'no'} (source: ${status.source || 'none'})`,
      `Firebase project: ${status.config?.projectId || '(none)'}`,
      ...(status.problems?.length ? [`Config problems: ${status.problems.join(' · ')}`] : []),
      ...(error ? [`Error code: ${error.code}`, `Error message: ${error.technical || error.message}`] : []),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.info(lines);
    }
  };

  const openInNewTab = () => window.open(window.location.href, '_blank', 'noopener,noreferrer');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 shadow-modal overflow-hidden p-6 relative text-center max-h-[92vh] overflow-y-auto">

        <button
          onClick={onClose}
          aria-label="Close sign-in dialog"
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

        {/* ── Firebase not configured: say so instead of failing mysteriously ── */}
        {!status.configured && (
          <div className="mb-5 text-left rounded-2xl border border-amber-300/70 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 p-3.5 space-y-2">
            <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-200">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold">Firebase is not configured in this build</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/80">
              Real Google sign-in needs your Firebase web app keys. Until then PinPoint runs in
              offline demo mode (data stays in this browser).
            </p>
            {status.missingEnvVars?.length > 0 && (
              <ul className="text-[11px] font-mono text-amber-900 dark:text-amber-200 bg-white/70 dark:bg-stone-900/60 rounded-xl p-2 space-y-0.5">
                {status.missingEnvVars.map((name) => (
                  <li key={name}>⚠ {name} — missing</li>
                ))}
              </ul>
            )}
            <ol className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/80 list-decimal list-inside space-y-0.5">
              <li>Copy <span className="font-mono">.env.example</span> to <span className="font-mono">.env</span> and paste the six values from Firebase Console → Project settings → Your apps.</li>
              <li>Save the file — Vite reloads it automatically; if not, restart <span className="font-mono">npm run dev</span>.</li>
              <li>Enable Google under Authentication → Sign-in method, and add this domain under Authentication → Settings → Authorized domains.</li>
            </ol>
          </div>
        )}

        {/* ── Embedded preview warning (blocked pop-ups / partitioned storage) ── */}
        {isEmbedded && !error && (
          <div className="mb-4 text-left rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 p-3 flex items-start space-x-2">
            <ExternalLink className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-200">
              You are viewing PinPoint inside an embedded preview. Google may block the sign-in
              window here — if it does, use{' '}
              <button onClick={openInNewTab} className="font-bold underline underline-offset-2">open in a new tab</button>
              {' '}or the redirect option.
            </p>
          </div>
        )}

        {/* ── Error / cancellation panel ── */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className={`mb-4 text-left rounded-2xl border p-3.5 space-y-2 ${
              error.isCancellation
                ? 'border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60'
                : 'border-rose-300/80 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/40'
            }`}
          >
            <div className="flex items-center space-x-2">
              {error.isCancellation
                ? <X className="w-4 h-4 text-stone-500 shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />}
              <span className={`text-xs font-bold ${error.isCancellation ? 'text-stone-700 dark:text-stone-200' : 'text-rose-700 dark:text-rose-300'}`}>
                {error.title}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">{error.message}</p>

            {error.hints?.length > 0 && (
              <ol className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300 list-decimal list-inside space-y-0.5">
                {error.hints.map((hint) => <li key={hint}>{hint}</li>)}
              </ol>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {error.suggestRedirect && typeof onSignInWithRedirect === 'function' && (
                <button
                  onClick={useRedirect}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold disabled:opacity-60"
                >
                  Sign in with redirect
                </button>
              )}
              <button
                onClick={retry}
                disabled={busy}
                className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 text-[11px] font-bold hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-60 inline-flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Try again</span>
              </button>
              {error.suggestNewTab && (
                <button
                  onClick={openInNewTab}
                  className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 text-[11px] font-bold hover:bg-stone-50 dark:hover:bg-stone-800 inline-flex items-center space-x-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open in new tab</span>
                </button>
              )}
              <button
                onClick={copyDiagnostics}
                className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 text-[11px] font-bold hover:bg-stone-50 dark:hover:bg-stone-800 inline-flex items-center space-x-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy details'}</span>
              </button>
            </div>

            <button
              onClick={() => setShowDetails((v) => !v)}
              className="text-[10px] uppercase tracking-wide text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 inline-flex items-center space-x-1"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              <span>Technical details</span>
            </button>
            {showDetails && (
              <pre className="text-[10px] whitespace-pre-wrap break-all bg-white/80 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 rounded-xl p-2 text-stone-500 dark:text-stone-400">
                {`code: ${error.code}\nmessage: ${error.technical || error.message}\nproject: ${status.config?.projectId || '(not configured)'}\nsource: ${status.source || 'none'}`}
              </pre>
            )}
          </div>
        )}

        {/* ── Guest vs member feature cards ── */}
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

        {/* ── Google sign-in button ── */}
        <button
          type="button"
          disabled={busy}
          onClick={retry}
          className="w-full py-3 px-4 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 border border-stone-300 dark:border-stone-700 rounded-2xl text-stone-800 dark:text-white text-sm font-bold flex items-center justify-center space-x-3 shadow-card hover:shadow-card-hover transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> : GOOGLE_ICON}
          <span>
            {busy
              ? (mode === 'redirect' ? 'Redirecting to Google…' : 'Opening Google…')
              : (!status.configured ? 'Continue in offline demo mode' : 'Continue with Google')}
          </span>
        </button>

        {status.configured && typeof onSignInWithRedirect === 'function' && !busy && (
          <button
            type="button"
            onClick={useRedirect}
            className="mt-2 w-full py-2 text-[11px] font-semibold text-stone-500 dark:text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Trouble signing in? Use redirect instead
          </button>
        )}

        <div className="mt-5 pt-3.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-center space-x-2 text-[11px] text-stone-400">
          <HeartHandshake className="w-3.5 h-3.5 text-indigo-400" />
          <span>BBIT Community Portal</span>
          {status.configured
            ? <span className="text-emerald-500">· Firebase connected</span>
            : <span className="text-amber-500">· Offline demo mode</span>}
        </div>

        {status.configured && status.warnings?.length > 0 && (
          <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
            ⚠ {status.warnings[0]}
          </p>
        )}

        {!status.configured && (
          <p className="mt-2 text-[10px] text-stone-400 flex items-center justify-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>Set VITE_FIREBASE_* in .env to enable real Google accounts</span>
          </p>
        )}

      </div>
    </div>
  );
}
