import React, { useState, useEffect } from 'react';
import { Download, Sparkles, X, Smartphone } from 'lucide-react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled || isDismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-3.5 sm:p-4 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-modal flex items-center justify-between gap-3 animate-fade-in">
      <div className="flex items-center space-x-3 min-w-0">
        <img 
          src="/icons/icon-192.png" 
          alt="PinPoint App Icon" 
          className="w-10 h-10 rounded-2xl shadow-subtle shrink-0 object-cover border border-stone-200/60 dark:border-stone-700" 
        />
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-stone-900 dark:text-white flex items-center space-x-1.5 truncate">
            <span>Install PinPoint</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-800/60">
              Offline Ready
            </span>
          </h4>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">Fast access on mobile & desktop with offline cache</p>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-subtle transition-all flex items-center space-x-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
