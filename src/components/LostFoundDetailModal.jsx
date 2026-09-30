import React, { useState, useMemo } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  Sparkles, 
  HeartHandshake, 
  Send, 
  Lock, 
  Award, 
  CheckCircle2, 
  User, 
  Mail, 
  ArrowRight,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LOST_FOUND_CATEGORIES } from '../types';
import { findMatchesForPost } from '../services/matchingEngine';
import Icon from './Icon';

export default function LostFoundDetailModal({ 
  item, 
  allItems, 
  onClose, 
  onMarkReunited, 
  onAddComment, 
  onSelectItem, 
  currentUser,
  onRequireAuth
}) {
  const [commentText, setCommentText] = useState('');
  const [claimAnswer, setClaimAnswer] = useState('');
  const [claimContact, setClaimContact] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const smartMatches = useMemo(() => {
    if (!item) return [];
    return findMatchesForPost(item, allItems, 45);
  }, [item, allItems]);

  if (!item) return null;

  const currentCategory = LOST_FOUND_CATEGORIES.find(c => c.id === item.category) || {
    label: item.category,
    icon: 'Package',
  };

  const isLost = item.type === 'lost';
  const isReunited = item.status === 'reunited';

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!currentUser) {
      if (typeof onRequireAuth === 'function') {
        onRequireAuth('Sign in with Google to leave sighting tips.');
      }
      return;
    }
    if (!commentText.trim()) return;

    const newComment = {
      id: `lfc-${Date.now()}`,
      author: currentUser.displayName || 'BBIT Member',
      avatar: currentUser.photoURL || '',
      authorId: currentUser.uid,
      text: commentText.trim(),
      timestamp: new Date().toISOString(),
    };

    onAddComment(item.id, newComment);
    setCommentText('');
  };

  const handleClaimSubmit = (e) => {
    e.preventDefault();
    if (!currentUser) {
      if (typeof onRequireAuth === 'function') {
        onRequireAuth('Sign in with Google to submit an ownership claim.');
      }
      return;
    }
    setClaimSubmitted(true);
    setIsClaiming(false);

    const claimNote = {
      id: `lfc-${Date.now()}`,
      author: `Claim by ${currentUser.displayName || 'Claimant'}`,
      avatar: currentUser.photoURL || '',
      authorId: currentUser.uid,
      text: `🔐 Ownership Verification Answer: "${claimAnswer.trim()}". Contact: ${claimContact.trim() || currentUser.email || 'No contact provided'}`,
      timestamp: new Date().toISOString(),
      isClaim: true,
    };

    onAddComment(item.id, claimNote);
  };

  const triggerReunitedCelebration = () => {
    if (!currentUser) {
      if (typeof onRequireAuth === 'function') {
        onRequireAuth('Sign in with Google to mark items as reunited.');
      }
      return;
    }
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#6366F1', '#38BDF8', '#F59E0B']
    });
    onMarkReunited(item.id);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-3xl border border-stone-200 dark:border-stone-800 shadow-modal overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isReunited ? (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                Reunited 🎉
              </span>
            ) : isLost ? (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-pink-50 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-800/60">
                LOST ITEM
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                FOUND ITEM
              </span>
            )}

            <span className="text-xs font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg">
              {currentCategory.label}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleShare}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-all flex items-center space-x-1"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white leading-snug">
              {item.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
              <span className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>Posted by {item.posterName}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>{new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </span>
              <span className="flex items-center space-x-1 text-stone-700 dark:text-stone-300 font-medium">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{item.locationName}</span>
              </span>
            </div>
          </div>

          {/* Media & Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {item.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 aspect-video md:aspect-square max-h-60">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {item.color && (
                    <span className="px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
                      Color: <strong>{item.color}</strong>
                    </span>
                  )}
                  {item.brand && (
                    <span className="px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
                      Brand: <strong>{item.brand}</strong>
                    </span>
                  )}
                  {item.reward && (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
                      Reward: {item.reward}
                    </span>
                  )}
                </div>

                <div className="bg-stone-50 dark:bg-stone-800/80 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-700/80">
                  <h4 className="font-bold text-stone-700 dark:text-stone-300 mb-1">Details & Markings</h4>
                  <p className="text-stone-600 dark:text-stone-400 leading-relaxed">{item.description}</p>
                </div>

                {item.posterContact && (
                  <div className="text-stone-500 dark:text-stone-400">
                    Contact: <strong className="text-stone-800 dark:text-stone-200">{item.posterContact}</strong>
                  </div>
                )}
              </div>

              {/* Actions */}
              {!isReunited && (
                <div className="flex gap-2 pt-2">
                  {!isLost && (
                    <button
                      onClick={() => {
                        if (!currentUser && typeof onRequireAuth === 'function') {
                          onRequireAuth('Sign in with Google to submit an ownership claim.');
                        } else {
                          setIsClaiming(!isClaiming);
                        }
                      }}
                      className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-1"
                    >
                      <HeartHandshake className="w-3.5 h-3.5" />
                      <span>Claim Item</span>
                    </button>
                  )}
                  <button
                    onClick={triggerReunitedCelebration}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-1 shadow-subtle"
                  >
                    <span>Mark Reunited 🎉</span>
                  </button>
                </div>
              )}

              {claimSubmitted && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-center font-bold">
                  Claim verification details sent to poster!
                </div>
              )}
            </div>
          </div>

          {/* Claim Box */}
          {isClaiming && !isReunited && (
            <form onSubmit={handleClaimSubmit} className="p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2.5">
              <h4 className="font-bold text-stone-900 dark:text-white">Verify Ownership</h4>
              {item.secretQuestion ? (
                <div>
                  <label className="block text-stone-600 dark:text-stone-300 mb-1">
                    Question: <em>"{item.secretQuestion}"</em>
                  </label>
                  <input
                    type="text"
                    required
                    value={claimAnswer}
                    onChange={(e) => setClaimAnswer(e.target.value)}
                    placeholder="Enter answer..."
                    className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={claimAnswer}
                  onChange={(e) => setClaimAnswer(e.target.value)}
                  placeholder="Describe unique marks or proof of ownership..."
                  className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl"
                />
              )}

              <input
                type="text"
                required
                value={claimContact}
                onChange={(e) => setClaimContact(e.target.value)}
                placeholder="Your email or phone number..."
                className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClaiming(false)}
                  className="px-3 py-1.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl font-bold"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          )}

          {/* Smart Match Suggestions Drawer */}
          {smartMatches.length > 0 && !isReunited && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
              <div className="flex items-center space-x-1.5 font-bold text-indigo-950 dark:text-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Smart Match Suggestions ({smartMatches.length})</span>
              </div>

              <div className="space-y-2">
                {smartMatches.map((m, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-stone-900 dark:text-white">{m.matchedItem.title}</span>
                      <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                        {m.reasons.join(' • ')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                        {m.score}%
                      </span>
                      <button
                        onClick={() => onSelectItem(m.matchedItem)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sighting Tips / Comments */}
          <div className="space-y-2 pt-2">
            <h4 className="font-bold text-stone-800 dark:text-white">Sighting Tips ({item.comments?.length || 0})</h4>

            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {item.comments && item.comments.length > 0 ? (
                item.comments.map(c => (
                  <div key={c.id} className="p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200/70 dark:border-stone-700">
                    <span className="font-bold text-stone-800 dark:text-stone-200">{c.author}: </span>
                    <span className="text-stone-600 dark:text-stone-400">{c.text}</span>
                  </div>
                ))
              ) : (
                <div className="text-stone-400 py-2">No sighting tips yet.</div>
              )}
            </div>

            {!currentUser ? (
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2 text-stone-600 dark:text-stone-300">
                  <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Sign in with Google to leave sighting tips or remarks.</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRequireAuth?.('Sign in with Google to leave sighting tips.')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-subtle shrink-0"
                >
                  Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave a sighting tip..."
                  className="flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold"
                >
                  Send
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
