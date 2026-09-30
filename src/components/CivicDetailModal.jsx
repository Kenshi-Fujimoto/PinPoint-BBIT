import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Flame, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  Send, 
  Check, 
  Calendar,
  User,
  Share2,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CIVIC_CATEGORIES, CIVIC_STATUSES } from '../types';
import Icon from './Icon';

export default function CivicDetailModal({ 
  issue, 
  onClose, 
  onUpvote, 
  onRateSeverity, 
  onVerifyIssue,
  onAddComment,
  onUpdateStatus,
  currentUser,
  onRequireAuth
}) {
  const [commentText, setCommentText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!issue) return null;

  const isUserUpvoted = currentUser ? issue.upvotedBy?.includes(currentUser.uid) : Boolean(issue.userUpvoted);
  const upvoteTotal = issue.upvotedBy ? issue.upvotedBy.length : (issue.urgencyUpvotes || 0);

  const currentCategory = CIVIC_CATEGORIES.find(c => c.id === issue.category) || {
    label: issue.category,
    icon: 'AlertCircle',
    emoji: '⚠️'
  };

  const currentStatusInfo = CIVIC_STATUSES.find(s => s.id === issue.status) || CIVIC_STATUSES[0];

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!currentUser) {
      if (typeof onRequireAuth === 'function') {
        onRequireAuth('Sign in with Google to post community remarks.');
      }
      return;
    }
    if (!commentText.trim()) return;

    const newComment = {
      id: `c-${Date.now()}`,
      author: currentUser.displayName || 'BBIT Member',
      avatar: currentUser.photoURL || '',
      authorId: currentUser.uid,
      text: commentText.trim(),
      timestamp: new Date().toISOString(),
      upvotes: 0,
    };

    onAddComment(issue.id, newComment);
    setCommentText('');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const statusSteps = ['reported', 'acknowledged', 'in_progress', 'resolved'];
  const currentStepIndex = statusSteps.indexOf(issue.status);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-3xl border border-stone-200 dark:border-stone-800 shadow-modal overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center space-x-1 ${currentCategory.tagClass}`}>
              <span>{currentCategory.emoji}</span>
              <span>{issue.customCategory || currentCategory.label}</span>
            </span>

            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${currentStatusInfo.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${currentStatusInfo.dotColor}`} />
              <span>{currentStatusInfo.label}</span>
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Title and Metadata */}
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2 leading-snug">
              {issue.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
              <span className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>{issue.reporterName || 'BBIT Member'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>{new Date(issue.reportedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </span>
              <span className="flex items-center space-x-1 text-stone-700 dark:text-stone-300 font-medium">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{issue.location?.name}</span>
              </span>
            </div>
          </div>

          {/* Photo & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {issue.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 aspect-video md:aspect-square max-h-60">
                <img src={issue.imageUrl} alt={issue.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex flex-col justify-between space-y-3">
              <div className="bg-stone-50 dark:bg-stone-800/80 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-700/80">
                <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Issue Details</h4>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  {issue.description}
                </p>
              </div>

              {/* Urgency & Rating Box (Unique User Upvotes) */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-white block">Community Priority</span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">1 vote per verified Google user</span>
                  </div>

                  <button
                    onClick={() => {
                      if (!currentUser && typeof onRequireAuth === 'function') {
                        onRequireAuth('Sign in with Google to cast your unique verified upvote on this hazard.');
                      } else {
                        onUpvote(issue.id);
                      }
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isUserUpvoted
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-glow-amber scale-105'
                        : 'bg-white dark:bg-stone-800 hover:bg-stone-100 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${isUserUpvoted ? 'fill-current' : 'text-orange-500'}`} />
                    <span>{upvoteTotal} {isUserUpvoted ? 'Upvoted ✓' : 'Upvotes'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-200/50 dark:border-amber-800/40 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-stone-500 dark:text-stone-400 font-medium">Severity:</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map(lvl => (
                        <button
                          key={lvl}
                          onClick={() => {
                            if (!currentUser && typeof onRequireAuth === 'function') {
                              onRequireAuth('Sign in with Google to rate hazard severity.');
                            } else {
                              onRateSeverity(issue.id, lvl);
                            }
                          }}
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                            lvl <= (issue.severity || 3)
                              ? 'bg-orange-500 text-white shadow-subtle'
                              : 'bg-stone-200 dark:bg-stone-800 text-stone-500 hover:bg-stone-300'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!currentUser && typeof onRequireAuth === 'function') {
                        onRequireAuth('Sign in with Google to verify this hazard sighting.');
                      } else {
                        onVerifyIssue(issue.id);
                      }
                    }}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>I Sighted This ({issue.verifiedCount || 1})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Stage Resolution Pipeline Stepper */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 space-y-3">
            <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              Resolution Pipeline Status
            </h4>
            
            <div className="grid grid-cols-4 gap-2">
              {CIVIC_STATUSES.map((st, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div 
                    key={st.id} 
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-subtle font-bold'
                        : isPassed
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-stone-100/70 dark:bg-stone-800/40 text-stone-400 border-transparent'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold tracking-tight">Step {idx + 1}</div>
                    <div className="text-xs font-semibold truncate mt-0.5">{st.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Status History Timeline */}
            {issue.statusHistory && issue.statusHistory.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-200/60 dark:border-stone-700 space-y-1.5 text-xs">
                {issue.statusHistory.map((h, i) => (
                  <div key={i} className="flex items-start space-x-2 text-stone-500 dark:text-stone-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-stone-700 dark:text-stone-300 capitalize">{h.status}:</span>{' '}
                      <span>{h.note}</span>{' '}
                      <span className="text-[10px] text-stone-400">({new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments & Community Discussion */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span>Community Remarks & Updates ({issue.comments?.length || 0})</span>
            </h4>

            {/* Comment Form */}
            {!currentUser ? (
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2 text-stone-600 dark:text-stone-300">
                  <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Sign in with Google to post remarks and updates on this hazard.</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRequireAuth?.('Sign in with Google to post community remarks.')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full text-xs transition-all shadow-subtle shrink-0"
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
                  placeholder={`Comment as ${currentUser.displayName}...`}
                  className="flex-1 px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold transition-all shadow-subtle flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </form>
            )}

            {/* Comment Feed */}
            <div className="space-y-2">
              {issue.comments && issue.comments.length > 0 ? (
                issue.comments.map((comment) => (
                  <div 
                    key={comment.id} 
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200/80 dark:border-stone-700/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {comment.avatar ? (
                          <img src={comment.avatar} alt={comment.author} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                            {comment.author?.[0] || 'U'}
                          </div>
                        )}
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                          {comment.author}
                        </span>
                        {comment.isOfficial && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            OFFICIAL
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {new Date(comment.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 pl-7 leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400 italic py-1">No community remarks yet. Be the first to leave an update!</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
