import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Image as ImageIcon, 
  X, 
  Link as LinkIcon, 
  RefreshCw,
  Sparkles,
  Lock
} from 'lucide-react';
import { uploadToEdgeStore, useEdgeStore } from '../services/edgestore';

export default function EdgeStoreUploader({ 
  onUploadSuccess, 
  onUploadComplete, 
  onChange,
  currentImageUrl = '', 
  initialUrl = '',
  value = '',
  category = '',
  samplePresets = [],
  currentUser = null,
  onRequireAuth
}) {
  // Support all common prop naming conventions for seamless compatibility
  const notifyParent = (url) => {
    if (typeof onUploadSuccess === 'function') onUploadSuccess(url);
    if (typeof onUploadComplete === 'function') onUploadComplete(url);
    if (typeof onChange === 'function') onChange(url);
  };

  const incomingUrl = currentImageUrl || initialUrl || value || '';
  const [previewUrl, setPreviewUrl] = useState(incomingUrl);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [pastedUrl, setPastedUrl] = useState('');
  const fileInputRef = useRef(null);

  // Safely grab edgestore context if available inside EdgeStoreProvider
  let edgestore = null;
  try {
    const edgeStoreCtx = useEdgeStore();
    edgestore = edgeStoreCtx?.edgestore;
  } catch (e) {
    // EdgeStoreProvider might not be in ancestor hierarchy
  }

  // Keep previewUrl in sync if parent resets or updates value
  useEffect(() => {
    setPreviewUrl(incomingUrl);
  }, [incomingUrl]);

  const processFile = async (selected) => {
    if (!selected) return;

    if (!currentUser) {
      setError('Sign in with Google is required to upload images.');
      if (typeof onRequireAuth === 'function') {
        onRequireAuth('Sign in with Google to upload images.');
      }
      return;
    }

    if (!selected.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WebP, GIF).');
      return;
    }
    if (selected.size > 15 * 1024 * 1024) {
      setError('Image file size must be under 15MB.');
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(15);

    try {
      const res = await uploadToEdgeStore(selected, (p) => setProgress(p), edgestore);
      setPreviewUrl(res.url);
      notifyParent(res.url);
      setIsUploading(false);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed. You can paste an image link directly instead.');
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    processFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!currentUser) {
      if (typeof onRequireAuth === 'function') {
        onRequireAuth('Sign in with Google to upload images.');
      }
      setError('Sign in with Google is required to upload images.');
      return;
    }
    const selected = e.dataTransfer.files?.[0];
    processFile(selected);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (currentUser) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemove = () => {
    setPreviewUrl('');
    setProgress(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    notifyParent('');
  };

  const handleApplyPastedUrl = (e) => {
    e.preventDefault();
    if (!currentUser) {
      if (typeof onRequireAuth === 'function') {
        onRequireAuth('Sign in with Google to attach photos.');
      }
      setError('Sign in with Google is required to attach images.');
      return;
    }
    if (!pastedUrl.trim()) return;
    const url = pastedUrl.trim();
    setPreviewUrl(url);
    notifyParent(url);
    setPastedUrl('');
    setShowUrlInput(false);
    setError(null);
  };

  const handleSelectPreset = (url) => {
    if (!currentUser) {
      if (typeof onRequireAuth === 'function') {
        onRequireAuth('Sign in with Google to attach photos.');
      }
      setError('Sign in with Google is required to attach images.');
      return;
    }
    setPreviewUrl(url);
    notifyParent(url);
    setError(null);
  };

  return (
    <div className="space-y-2">
      {previewUrl ? (
        /* Image Preview Box */
        <div className="relative rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 aspect-video max-h-52 group">
          <img 
            src={previewUrl} 
            alt="Uploaded attachment" 
            className="w-full h-full object-cover" 
            onError={() => setError('Could not load image from this URL. Please upload a file or check the link.')}
          />
          
          <div className="absolute inset-0 bg-stone-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-stone-900/90 text-stone-800 dark:text-stone-200 text-xs font-bold shadow-subtle hover:bg-white flex items-center space-x-1 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Change Image</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-1.5 rounded-xl bg-rose-600/90 text-white text-xs font-bold shadow-subtle hover:bg-rose-600 flex items-center space-x-1 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>

          <div className="absolute top-2.5 right-2.5">
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-full bg-stone-900/75 text-white hover:bg-stone-950 transition-all shadow-subtle"
              title="Remove photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1 border border-stone-200/60 dark:border-stone-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Image Ready & Attached</span>
          </div>
        </div>
      ) : (
        /* Empty Upload Zone */
        <div className="space-y-2">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => {
              if (!currentUser) {
                if (typeof onRequireAuth === 'function') {
                  onRequireAuth('Sign in with Google to upload images.');
                }
                setError('Sign in with Google is required to upload images.');
                return;
              }
              fileInputRef.current?.click();
            }}
            className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all ${
              !currentUser
                ? 'border-amber-300 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70'
                : isDragOver
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                : 'border-stone-200 dark:border-stone-700 hover:border-indigo-500/60 bg-stone-50/60 dark:bg-stone-800/40 hover:bg-stone-50 dark:hover:bg-stone-800/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/*"
              onChange={handleFileChange}
              disabled={isUploading || !currentUser}
              className="hidden"
            />

            {isUploading ? (
              <div className="flex flex-col items-center space-y-2 py-2">
                <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  Processing & Uploading Image ({progress}%)...
                </span>
                <div className="w-40 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : !currentUser ? (
              <div className="flex flex-col items-center text-center space-y-1.5 py-1">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/60 shadow-subtle">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                    Sign in with Google to upload photos
                  </span>
                  <span className="text-[11px] text-stone-400 mt-0.5 block">
                    Visitors have view-only access • Click to authenticate
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-1.5 py-1">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60 shadow-subtle">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                    Click to browse or drag & drop photo here
                  </span>
                  <span className="text-[11px] text-stone-400 mt-0.5 block">
                    Supports JPG, PNG, WebP from your phone or laptop
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Alternate Option: Paste Image URL or Use Demo Presets */}
          <div className="flex items-center justify-between pt-0.5 text-xs">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUrlInput((prev) => !prev);
              }}
              className="text-stone-500 dark:text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-semibold flex items-center space-x-1"
            >
              <LinkIcon className="w-3 h-3" />
              <span>{showUrlInput ? 'Hide URL input' : 'Or paste direct image URL'}</span>
            </button>

            {samplePresets && samplePresets.length > 0 && (
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-stone-400 font-medium">Quick presets:</span>
                {samplePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    className="px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-400 text-[10px] font-semibold transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Paste Image URL Input Box */}
          {showUrlInput && (
            <div className="flex gap-2 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 animate-fade-in">
              <input
                type="url"
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... or any photo link"
                className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleApplyPastedUrl}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shrink-0 shadow-subtle"
              >
                Apply URL
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-1.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800/60">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

