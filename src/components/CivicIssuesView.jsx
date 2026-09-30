import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  MapPin, 
  Clock, 
  Flame, 
  ArrowUpDown, 
  CheckCircle2, 
  Filter,
  Sparkles, 
  AlertTriangle, 
  Layers, 
  UserCheck,
  Lock
} from 'lucide-react';
import { CIVIC_CATEGORIES, CIVIC_STATUSES } from '../types';
import Icon from './Icon';

export default function CivicIssuesView({ 
  issues, 
  onSelectIssue, 
  onUpvoteIssue, 
  onOpenReportModal,
  currentUser,
  onRequireAuth
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('urgency'); // 'urgency', 'newest', 'severity'
  const [onlyMyReports, setOnlyMyReports] = useState(false);

  // Filter and Sort Logic with Multi-Factor Urgency Ranking
  const filteredIssues = useMemo(() => {
    return issues
      .filter((issue) => {
        // Search query match
        const matchesSearch = 
          issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (issue.location?.name && issue.location.name.toLowerCase().includes(searchQuery.toLowerCase()));

        // Category filter
        const matchesCategory = selectedCategory === 'all' || issue.category === selectedCategory;

        // Status filter
        const matchesStatus = selectedStatus === 'all' || issue.status === selectedStatus;

        // My reports filter
        const matchesMyReports = !onlyMyReports || (currentUser && (issue.reporterId === currentUser.uid || issue.upvotedBy?.includes(currentUser.uid)));

        return matchesSearch && matchesCategory && matchesStatus && matchesMyReports;
      })
      .sort((a, b) => {
        const upvotesA = a.upvotedBy ? a.upvotedBy.length : (a.urgencyUpvotes || 0);
        const upvotesB = b.upvotedBy ? b.upvotedBy.length : (b.urgencyUpvotes || 0);

        if (sortBy === 'urgency') {
          // Weighted urgency: Upvotes * 3 + Severity * 2
          const scoreA = (upvotesA * 3) + ((a.severity || 3) * 2);
          const scoreB = (upvotesB * 3) + ((b.severity || 3) * 2);
          return scoreB - scoreA;
        }
        if (sortBy === 'severity') {
          return (b.severity || 3) - (a.severity || 3);
        }
        if (sortBy === 'newest') {
          return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
        }
        return 0;
      });
  }, [issues, searchQuery, selectedCategory, selectedStatus, sortBy, onlyMyReports, currentUser]);

  const getCategoryInfo = (catId) => {
    return CIVIC_CATEGORIES.find(c => c.id === catId) || {
      label: catId,
      icon: 'AlertCircle',
      emoji: '⚠️',
      tagClass: 'bg-stone-100 text-stone-700 border-stone-200'
    };
  };

  const getStatusInfo = (statusId) => {
    return CIVIC_STATUSES.find(s => s.id === statusId) || CIVIC_STATUSES[0];
  };

  // Quick stats
  const totalOpen = issues.filter(i => i.status !== 'resolved').length;
  const totalResolved = issues.filter(i => i.status === 'resolved').length;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-pink-950/40 border border-indigo-200/60 dark:border-indigo-800/40 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/80 dark:bg-stone-800/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold shadow-subtle">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>BBIT Civic Watch</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
              Campus Infrastructure & Hazards
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-xl leading-relaxed">
              Report campus potholes, lighting blackouts, water leaks, and safety hazards with strict campus geotagging and verified community upvotes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!currentUser && typeof onRequireAuth === 'function') {
                  onRequireAuth('Sign in with Google to report campus infrastructure hazards.');
                } else {
                  onOpenReportModal();
                }
              }}
              title={!currentUser ? "Sign in required to report hazards" : "Report New Campus Hazard"}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-glow-indigo active:scale-95 flex items-center space-x-2"
            >
              {!currentUser ? <Lock className="w-4 h-4 text-indigo-200" /> : <Plus className="w-4 h-4" />}
              <span>Report New Hazard</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-indigo-100/80 dark:border-indigo-900/40 text-xs">
          <div className="inline-flex items-center space-x-2 bg-white/70 dark:bg-stone-900/70 px-3.5 py-2 rounded-2xl border border-stone-200/60 dark:border-stone-800">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-stone-500 dark:text-stone-400 font-medium">Active Hazards:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{totalOpen} Open</span>
          </div>
          <div className="inline-flex items-center space-x-2 bg-white/70 dark:bg-stone-900/70 px-3.5 py-2 rounded-2xl border border-stone-200/60 dark:border-stone-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-stone-500 dark:text-stone-400 font-medium">Repaired & Resolved:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalResolved} Fixed</span>
          </div>
        </div>

        {/* Guest View-Only Banner */}
        {!currentUser && (
          <div className="mt-4 pt-3 border-t border-indigo-100/60 dark:border-indigo-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60 dark:bg-stone-900/60 p-3 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/40 text-xs">
            <div className="flex items-center space-x-2 text-stone-700 dark:text-stone-300">
              <span className="text-sm">👀</span>
              <span className="font-medium">
                <strong>Public View-Only Mode:</strong> Browse all verified campus hazard reports. Sign in to submit a report or upvote.
              </span>
            </div>
            <button
              onClick={() => onRequireAuth?.('Sign in with Google to report or upvote civic hazards.')}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-subtle text-xs shrink-0 self-start sm:self-center"
            >
              Sign In with Google
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-4 sm:p-5 border border-stone-200/80 dark:border-stone-800 shadow-card dark:shadow-card-dark space-y-4">
        
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by hazard, building, or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs font-semibold text-stone-700 dark:text-stone-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-stone-900 dark:text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="urgency" className="dark:bg-stone-900">Highest Urgency</option>
                <option value="severity" className="dark:bg-stone-900">Severity (1-5)</option>
                <option value="newest" className="dark:bg-stone-900">Newest First</option>
              </select>
            </div>

            {/* My Reports Filter Toggle */}
            {currentUser && (
              <button
                type="button"
                onClick={() => setOnlyMyReports(!onlyMyReports)}
                className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                  onlyMyReports
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-subtle'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>My Reports</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-subtle'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
            }`}
          >
            All Hazards ({issues.length})
          </button>
          
          {CIVIC_CATEGORIES.map((cat) => {
            const count = issues.filter(i => i.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 shrink-0 border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-subtle'
                    : 'bg-stone-50 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Issues Grid */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 text-center border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto text-xl">
            🔍
          </div>
          <h3 className="font-bold text-base text-stone-900 dark:text-white">No hazards found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try adjusting your search terms or filters, or submit a new report.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredIssues.map((issue) => {
            const status = getStatusInfo(issue.status);
            const category = getCategoryInfo(issue.category);
            
            // Multi-user unique upvote calculation
            const isUserUpvoted = currentUser ? issue.upvotedBy?.includes(currentUser.uid) : Boolean(issue.userUpvoted);
            const upvoteTotal = issue.upvotedBy ? issue.upvotedBy.length : (issue.urgencyUpvotes || 0);

            return (
              <div
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                className="group bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 hover:border-indigo-400 dark:hover:border-indigo-600 p-4 sm:p-5 shadow-card dark:shadow-card-dark hover:shadow-card-hover transition-all flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Top Bar: Category Pill & Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border flex items-center space-x-1 ${category.tagClass}`}>
                        <span>{category.emoji}</span>
                        <span>{issue.customCategory || category.label}</span>
                      </span>

                      <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${status.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                        <span>{status.label}</span>
                      </span>
                    </div>

                    {/* Upvote Urgency Action Button (Unique User Upvote) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpvoteIssue(issue.id);
                      }}
                      className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all ${
                        isUserUpvoted
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-glow-amber scale-105'
                          : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60'
                      }`}
                      title={isUserUpvoted ? "You upvoted this hazard (Click to remove)" : "Upvote to boost priority for facility staff"}
                    >
                      <Flame className={`w-3.5 h-3.5 ${isUserUpvoted ? 'fill-current text-white animate-bounce-subtle' : 'text-orange-500'}`} />
                      <span>{upvoteTotal}</span>
                    </button>
                  </div>

                  {/* Title & Media */}
                  <div className="flex gap-3.5">
                    {issue.imageUrl && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0 border border-stone-200 dark:border-stone-800 max-w-[80px] max-h-[80px]">
                        <img
                          src={issue.imageUrl}
                          alt={issue.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {issue.title}
                      </h3>
                      <p className="text-stone-500 dark:text-stone-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                        {issue.description}
                      </p>
                    </div>
                  </div>

                  {/* Location Landmark */}
                  <div className="mt-3 flex items-center space-x-1.5 text-xs text-stone-600 dark:text-stone-400">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate font-medium">{issue.location?.name}</span>
                  </div>
                </div>

                {/* Card Footer: Reporter, Severity & Verification Count */}
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(issue.reportedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    <span>•</span>
                    <span className="text-stone-600 dark:text-stone-400 font-medium">
                      {issue.reporterName || 'BBIT Member'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      Sev {issue.severity || 3}/5
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{issue.verifiedCount || 1} verified</span>
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
