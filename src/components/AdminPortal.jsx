import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Wrench, 
  Sparkles, 
  RotateCcw, 
  Lock, 
  MapPin, 
  Check,
  Trash2,
  AlertTriangle,
  Search,
  Filter,
  ShieldAlert,
  HelpCircle,
  Eye,
  CheckSquare,
  Square,
  RefreshCw,
  Mail,
  User,
  ExternalLink,
  Undo2,
  Tag,
  FileText,
  AlertOctagon,
  Package,
  Layers,
  Inbox,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CIVIC_CATEGORIES, CIVIC_STATUSES, LOST_FOUND_CATEGORIES } from '../types';
import { evaluateSpamRisk, MODERATION_REASONS } from '../services/spamDetector';

export default function AdminPortal({ 
  civicIssues = [], 
  lostFoundItems = [], 
  onUpdateCivicStatus,
  onDeleteCivicIssue,
  onDeleteLostFoundItem,
  onRestoreCivicIssue,
  onRestoreLostFoundItem,
  deletedHistory = [],
  onResetData,
  onCloseAdminPortal,
  currentUser
}) {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState(false);

  // Active Main Tab: 'civic', 'lostfound', 'radar', 'trash'
  const [activeTab, setActiveTab] = useState('civic');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [onlySuspectsFilter, setOnlySuspectsFilter] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'urgency', 'risk'

  // Selection state for Bulk Actions
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal states
  const [deleteTarget, setDeleteTarget] = useState(null); // { item, type: 'civic'|'lostfound' }
  const [deleteReason, setDeleteReason] = useState('fake');
  const [deleteNotes, setDeleteNotes] = useState('');
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null); // { item, type }

  // Toast Notification state
  const [toast, setToast] = useState(null); // { message, undoItem, type }

  const showToast = (message, undoAction = null) => {
    setToast({ message, undoAction, id: Date.now() });
    setTimeout(() => {
      setToast(prev => (prev?.id ? null : prev));
    }, 6000);
  };

  // Evaluate Spam Risks for all entries
  const civicWithRisk = useMemo(() => {
    return civicIssues.map(issue => ({
      ...issue,
      spamRisk: evaluateSpamRisk(issue, 'civic')
    }));
  }, [civicIssues]);

  const lostFoundWithRisk = useMemo(() => {
    return lostFoundItems.map(item => ({
      ...item,
      spamRisk: evaluateSpamRisk(item, 'lostfound')
    }));
  }, [lostFoundItems]);

  // High-level statistics
  const unresolvedCivic = civicIssues.filter(i => i.status !== 'resolved');
  const resolvedCivic = civicIssues.filter(i => i.status === 'resolved');
  const inProgressCivic = civicIssues.filter(i => i.status === 'in_progress');
  const reunitedItems = lostFoundItems.filter(i => i.status === 'reunited');
  const openLostFound = lostFoundItems.filter(i => i.status !== 'reunited');

  const allSuspects = useMemo(() => {
    const suspectCivic = civicWithRisk.filter(i => i.spamRisk.isSuspect).map(i => ({ ...i, entryType: 'civic' }));
    const suspectLF = lostFoundWithRisk.filter(i => i.spamRisk.isSuspect).map(i => ({ ...i, entryType: 'lostfound' }));
    return [...suspectCivic, ...suspectLF].sort((a, b) => b.spamRisk.score - a.spamRisk.score);
  }, [civicWithRisk, lostFoundWithRisk]);

  const resolutionRate = civicIssues.length > 0 
    ? Math.round((resolvedCivic.length / civicIssues.length) * 100) 
    : 0;

  const reunionRate = lostFoundItems.length > 0
    ? Math.round((reunitedItems.length / lostFoundItems.length) * 100)
    : 0;

  // Filter and Sort Civic Issues
  const filteredCivic = useMemo(() => {
    return civicWithRisk.filter(issue => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = issue.title?.toLowerCase().includes(q);
        const matchDesc = issue.description?.toLowerCase().includes(q);
        const matchLoc = issue.location?.name?.toLowerCase().includes(q);
        const matchReporter = issue.reporterName?.toLowerCase().includes(q);
        const matchId = issue.id?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc && !matchReporter && !matchId) return false;
      }
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'active' && issue.status === 'resolved') return false;
        if (selectedStatusFilter !== 'active' && issue.status !== selectedStatusFilter) return false;
      }
      if (selectedCategoryFilter !== 'all' && issue.category !== selectedCategoryFilter) return false;
      if (onlySuspectsFilter && !issue.spamRisk.isSuspect) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'risk') return b.spamRisk.score - a.spamRisk.score;
      if (sortBy === 'urgency') return (b.urgencyUpvotes || 0) - (a.urgencyUpvotes || 0);
      return new Date(b.reportedAt || 0) - new Date(a.reportedAt || 0);
    });
  }, [civicWithRisk, searchQuery, selectedStatusFilter, selectedCategoryFilter, onlySuspectsFilter, sortBy]);

  // Filter and Sort Lost & Found Items
  const filteredLostFound = useMemo(() => {
    return lostFoundWithRisk.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchLoc = item.locationName?.toLowerCase().includes(q);
        const matchPoster = item.posterName?.toLowerCase().includes(q);
        const matchContact = item.posterContact?.toLowerCase().includes(q);
        const matchId = item.id?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc && !matchPoster && !matchContact && !matchId) return false;
      }
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'lost' && item.type !== 'lost') return false;
        if (selectedStatusFilter === 'found' && item.type !== 'found') return false;
        if (selectedStatusFilter === 'open' && item.status === 'reunited') return false;
        if (selectedStatusFilter === 'reunited' && item.status !== 'reunited') return false;
      }
      if (selectedCategoryFilter !== 'all' && item.category !== selectedCategoryFilter) return false;
      if (onlySuspectsFilter && !item.spamRisk.isSuspect) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'risk') return b.spamRisk.score - a.spamRisk.score;
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    });
  }, [lostFoundWithRisk, searchQuery, selectedStatusFilter, selectedCategoryFilter, onlySuspectsFilter, sortBy]);

  // Handlers
  const handleAdvanceCivicStatus = (issueId, nextStatus) => {
    if (nextStatus === 'resolved') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10B981', '#6366F1', '#F59E0B']
      });
    }
    const note = `Status advanced to ${nextStatus} by BBIT Facilities Dispatch`;
    onUpdateCivicStatus(issueId, nextStatus, note);
  };

  const handleOpenDeleteModal = (item, type) => {
    // Default reason to suspect reason if flagged
    const defaultReason = item.spamRisk?.score >= 50 ? 'scam' : item.spamRisk?.isSuspect ? 'spam' : 'fake';
    setDeleteReason(defaultReason);
    setDeleteNotes('');
    setDeleteTarget({ item, type });
  };

  const handleConfirmSingleDelete = () => {
    if (!deleteTarget) return;
    const { item, type } = deleteTarget;
    
    if (type === 'civic') {
      onDeleteCivicIssue(item.id, deleteReason, deleteNotes);
      showToast(`Deleted hazard report "${item.title.slice(0, 30)}..."`, () => {
        onRestoreCivicIssue(item);
      });
    } else {
      onDeleteLostFoundItem(item.id, deleteReason, deleteNotes);
      showToast(`Deleted lost & found post "${item.title.slice(0, 30)}..."`, () => {
        onRestoreLostFoundItem(item);
      });
    }

    // Unselect if was checked
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });

    setDeleteTarget(null);
  };

  // Bulk Selection Handlers
  const currentList = activeTab === 'civic' ? filteredCivic : activeTab === 'lostfound' ? filteredLostFound : allSuspects;

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllCurrent = () => {
    if (selectedIds.size === currentList.length && currentList.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentList.map(i => i.id)));
    }
  };

  const handleConfirmBulkDelete = () => {
    if (selectedIds.size === 0) return;
    
    const count = selectedIds.size;
    selectedIds.forEach(id => {
      // Find whether it's civic or lost & found
      const civicItem = civicIssues.find(i => i.id === id);
      if (civicItem) {
        onDeleteCivicIssue(id, deleteReason, deleteNotes);
      } else {
        const lfItem = lostFoundItems.find(i => i.id === id);
        if (lfItem) {
          onDeleteLostFoundItem(id, deleteReason, deleteNotes);
        }
      }
    });

    showToast(`Bulk deleted ${count} entries as ${deleteReason.toUpperCase()}`);
    setSelectedIds(new Set());
    setIsBulkDeleteModalOpen(false);
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (passcode.toLowerCase() === 'admin' || passcode === '1234' || passcode === '') {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  // AUTH GATE SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-stone-900 w-full max-w-md p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-modal text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-glow-indigo">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-white">BBIT Facilities Staff & Moderation Portal</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Enter staff authorization passcode to access hazard dispatch, verification, and anti-spam moderation</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode (default: admin)..."
              className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
            />

            {authError && (
              <p className="text-xs text-rose-600 font-medium">Incorrect passcode. Try "admin" or leave blank.</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCloseAdminPortal}
                className="flex-1 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                Back to Public App
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-subtle transition-colors"
              >
                Unlock Operations Workspace
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      
      {/* Top Staff Operations & Moderation Header */}
      <div className="bg-stone-950 text-white p-6 sm:p-7 rounded-3xl shadow-card-dark border border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center space-x-2 text-stone-400 text-xs mb-2 flex-wrap">
            <span className="flex items-center space-x-1 font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Campus Ops & Anti-Spam Command</span>
            </span>
            <span>•</span>
            <span className="text-stone-300">Staff Moderator Active</span>
            {currentUser && (
              <>
                <span>•</span>
                <span className="text-indigo-300 font-medium">Logged as {currentUser.displayName || currentUser.email}</span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Campus Dispatch & Content Moderation Hub
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Triage campus road hazards, verify lost & found claims, and moderate or purge fake, scam, or spam submissions with automated radar assistance.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap">
          <button
            onClick={onResetData}
            className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs font-semibold flex items-center space-x-1.5 transition-all"
            title="Clear all registered data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All Data</span>
          </button>

          <button
            onClick={onCloseAdminPortal}
            className="px-4 py-2 rounded-xl bg-white text-stone-900 text-xs font-bold hover:bg-stone-100 transition-all flex items-center space-x-1.5 shadow-subtle"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public App</span>
          </button>
        </div>
      </div>

      {/* High-Level Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Civic Resolution Card */}
        <div 
          onClick={() => { setActiveTab('civic'); setSelectedStatusFilter('all'); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'civic' 
              ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 shadow-md' 
              : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-medium">
            <span>Civic Hazards Queue</span>
            <Wrench className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
            {civicIssues.length}
            <span className="text-xs font-normal text-stone-400 ml-2">({unresolvedCivic.length} active)</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {resolutionRate}% resolved ({resolvedCivic.length} fixed)
          </div>
        </div>

        {/* Lost & Found Card */}
        <div 
          onClick={() => { setActiveTab('lostfound'); setSelectedStatusFilter('all'); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'lostfound' 
              ? 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800 shadow-md' 
              : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-medium">
            <span>Lost & Found Registry</span>
            <Package className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
            {lostFoundItems.length}
            <span className="text-xs font-normal text-stone-400 ml-2">({openLostFound.length} open)</span>
          </div>
          <div className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold mt-1">
            {reunionRate}% returned ({reunitedItems.length} reunited)
          </div>
        </div>

        {/* Spam & Scam Radar Card */}
        <div 
          onClick={() => { setActiveTab('radar'); setSelectedStatusFilter('all'); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'radar' 
              ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-400 dark:border-rose-800 shadow-md' 
              : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-medium">
            <span className="flex items-center gap-1 font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Spam & Scam Radar</span>
            </span>
            {allSuspects.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold animate-pulse">
                ACTION
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {allSuspects.length}
            <span className="text-xs font-normal text-stone-400 ml-2">flagged</span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            Heuristic detection on keywords, links & bounds
          </div>
        </div>

        {/* Moderation History & Trash Card */}
        <div 
          onClick={() => { setActiveTab('trash'); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'trash' 
              ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 shadow-md' 
              : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-medium">
            <span>Moderation Audit / Trash</span>
            <Trash2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
            {deletedHistory.length}
            <span className="text-xs font-normal text-stone-400 ml-2">purged</span>
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-1">
            Audit trail with instant Undo & Restore
          </div>
        </div>
      </div>

      {/* Main Moderation Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('civic'); setSelectedIds(new Set()); }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition-all whitespace-nowrap ${
            activeTab === 'civic'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-subtle'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Wrench className="w-4 h-4 text-indigo-500" />
          <span>Civic Hazards Queue</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] ${
            activeTab === 'civic' ? 'bg-indigo-600 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
          }`}>
            {civicIssues.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('lostfound'); setSelectedIds(new Set()); }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition-all whitespace-nowrap ${
            activeTab === 'lostfound'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-subtle'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Package className="w-4 h-4 text-sky-500" />
          <span>Lost & Found Registry</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] ${
            activeTab === 'lostfound' ? 'bg-sky-600 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
          }`}>
            {lostFoundItems.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('radar'); setSelectedIds(new Set()); }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition-all whitespace-nowrap ${
            activeTab === 'radar'
              ? 'bg-rose-600 text-white shadow-subtle'
              : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Spam & Scam Radar</span>
          {allSuspects.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-white text-rose-600 font-extrabold">
              {allSuspects.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('trash'); setSelectedIds(new Set()); }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition-all whitespace-nowrap ${
            activeTab === 'trash'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-subtle'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Trash2 className="w-4 h-4 text-purple-500" />
          <span>Audit Log & Trash</span>
          {deletedHistory.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
              {deletedHistory.length}
            </span>
          )}
        </button>
      </div>

      {/* Floating Action Bar when items are selected */}
      {selectedIds.size > 0 && (
        <div className="bg-stone-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between border border-stone-700 animate-slide-up">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 bg-indigo-600 rounded-lg text-xs font-bold">
              {selectedIds.size} Selected
            </span>
            <span className="text-xs text-stone-300 hidden sm:inline">
              Selected across current filtered queue
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => {
                setDeleteReason('spam');
                setDeleteNotes(`Bulk purged ${selectedIds.size} entries`);
                setIsBulkDeleteModalOpen(true);
              }}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-subtle"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* SEARCH, FILTER & SORT TOOLBAR (Shown for Civic, Lost&Found, and Radar tabs) */}
      {activeTab !== 'trash' && (
        <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-card space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'civic'
                    ? "Search hazards by title, reporter, road/location, or ID..."
                    : activeTab === 'lostfound'
                    ? "Search lost/found items by item name, poster, email, or place..."
                    : "Search spam & scam radar suspects..."
                }
                className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort & Quick Suspect Switch */}
            <div className="flex items-center space-x-2 shrink-0 flex-wrap">
              <button
                onClick={() => setOnlySuspectsFilter(prev => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all border ${
                  onlySuspectsFilter
                    ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                }`}
                title="Filter only suspicious or scam items"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Suspects Only</span>
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="risk">Sort: Highest Spam Risk</option>
                {activeTab === 'civic' && <option value="urgency">Sort: Most Upvotes</option>}
              </select>
            </div>

          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-stone-100 dark:border-stone-800 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-stone-400 mr-1 uppercase">Filter:</span>
              
              {activeTab === 'civic' && (
                <>
                  {['all', 'active', 'in_progress', 'resolved'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setSelectedStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        selectedStatusFilter === st
                          ? 'bg-indigo-600 text-white shadow-subtle'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                      }`}
                    >
                      {st === 'all' ? `All (${civicIssues.length})` :
                       st === 'active' ? `Active (${unresolvedCivic.length})` :
                       st === 'in_progress' ? `In Progress (${inProgressCivic.length})` :
                       `Resolved (${resolvedCivic.length})`}
                    </button>
                  ))}
                </>
              )}

              {activeTab === 'lostfound' && (
                <>
                  {['all', 'lost', 'found', 'open', 'reunited'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setSelectedStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        selectedStatusFilter === st
                          ? 'bg-sky-600 text-white shadow-subtle'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                      }`}
                    >
                      {st === 'all' ? `All (${lostFoundItems.length})` :
                       st === 'lost' ? `Lost (${lostFoundItems.filter(i => i.type === 'lost').length})` :
                       st === 'found' ? `Found (${lostFoundItems.filter(i => i.type === 'found').length})` :
                       st === 'open' ? `Open (${openLostFound.length})` :
                       `Reunited (${reunitedItems.length})`}
                    </button>
                  ))}
                </>
              )}

              {activeTab === 'radar' && (
                <span className="text-xs text-stone-500 font-medium">
                  Showing {allSuspects.length} high & medium risk entries detected by automated heuristic engine
                </span>
              )}
            </div>

            {/* Select All Checkbox */}
            {currentList.length > 0 && (
              <button
                onClick={handleSelectAllCurrent}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
              >
                {selectedIds.size === currentList.length && currentList.length > 0 ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Select All ({currentList.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: CIVIC HAZARDS QUEUE */}
      {activeTab === 'civic' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-card overflow-hidden">
          {filteredCivic.length === 0 ? (
            <div className="p-16 text-center space-y-2">
              <Inbox className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">No civic hazard reports found in this queue</p>
              <p className="text-xs text-stone-400">Try changing your search term or status filter</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredCivic.map((issue) => {
                const isSelected = selectedIds.has(issue.id);
                const isSuspect = issue.spamRisk.isSuspect;

                return (
                  <div 
                    key={issue.id} 
                    className={`p-4 sm:p-5 transition-colors space-y-3 ${
                      isSelected 
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/30' 
                        : isSuspect 
                        ? 'bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/50' 
                        : 'hover:bg-stone-50/70 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Checkbox + Thumbnail + Details */}
                      <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                        
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleSelect(issue.id)}
                          className="mt-1 text-stone-400 hover:text-indigo-600 transition-colors shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>

                        {/* Thumbnail Image */}
                        {issue.imageUrl ? (
                          <img 
                            src={issue.imageUrl} 
                            alt={issue.title} 
                            onClick={() => setPreviewTarget({ item: issue, type: 'civic' })}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-stone-200 dark:border-stone-700 shrink-0 cursor-pointer hover:opacity-90"
                          />
                        ) : (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-400 shrink-0">
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                        )}

                        {/* Details */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-[11px] font-mono font-bold text-stone-400">#{issue.id.slice(-4)}</span>
                            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                              {issue.category}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded capitalize ${
                              issue.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                              issue.status === 'in_progress' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                              issue.status === 'acknowledged' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            }`}>
                              {issue.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-bold flex items-center space-x-0.5">
                              <Flame className="w-3.5 h-3.5 fill-current" />
                              <span>{issue.urgencyUpvotes || 0} Votes</span>
                            </span>

                            {/* Spam Risk Badge */}
                            {isSuspect && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold border border-rose-300 dark:border-rose-800" title={issue.spamRisk.reasons.join(', ')}>
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                <span>Risk {issue.spamRisk.score}% ({issue.spamRisk.level})</span>
                              </span>
                            )}
                          </div>

                          <h3 
                            onClick={() => setPreviewTarget({ item: issue, type: 'civic' })}
                            className="text-sm font-bold text-stone-900 dark:text-white cursor-pointer hover:text-indigo-600 transition-colors line-clamp-1"
                          >
                            {issue.title}
                          </h3>

                          <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                            {issue.description}
                          </p>

                          <div className="flex items-center space-x-2 text-[11px] text-stone-500 dark:text-stone-400 flex-wrap">
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-rose-500" />
                              <span className="font-medium">{issue.location?.name || 'BBIT Campus'}</span>
                            </span>
                            <span>•</span>
                            <span>Reporter: <strong className="font-semibold text-stone-700 dark:text-stone-300">{issue.reporterName}</strong></span>
                            <span>•</span>
                            <span>{new Date(issue.reportedAt).toLocaleDateString()}</span>
                          </div>

                          {/* Triggered Reasons if Suspect */}
                          {isSuspect && issue.spamRisk.reasons.length > 0 && (
                            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center space-x-1 pt-0.5">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Flagged: {issue.spamRisk.reasons.join(' • ')}</span>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap lg:self-center">
                        
                        {/* Status Advancement Quick Buttons */}
                        {issue.status === 'reported' && (
                          <button
                            onClick={() => handleAdvanceCivicStatus(issue.id, 'acknowledged')}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold transition-all border border-blue-200 dark:border-blue-800"
                          >
                            Acknowledge
                          </button>
                        )}

                        {(issue.status === 'reported' || issue.status === 'acknowledged') && (
                          <button
                            onClick={() => handleAdvanceCivicStatus(issue.id, 'in_progress')}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-xs font-bold transition-all border border-amber-200 dark:border-amber-800"
                          >
                            Dispatch Crew
                          </button>
                        )}

                        {issue.status !== 'resolved' && (
                          <button
                            onClick={() => handleAdvanceCivicStatus(issue.id, 'resolved')}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center space-x-1 shadow-subtle"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Resolve</span>
                          </button>
                        )}

                        {issue.status === 'resolved' && (
                          <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            ✓ Repaired
                          </span>
                        )}

                        {/* View Preview */}
                        <button
                          onClick={() => setPreviewTarget({ item: issue, type: 'civic' })}
                          className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 transition-colors"
                          title="Inspect full report"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* DELETE / PURGE BUTTON (Key feature for fake/spam deletion) */}
                        <button
                          onClick={() => handleOpenDeleteModal(issue, 'civic')}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 text-xs font-bold transition-all border border-rose-200 dark:border-rose-800 flex items-center space-x-1 shadow-sm"
                          title="Delete fake, hoax, or spam hazard report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Fake / Spam</span>
                        </button>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOST & FOUND REGISTRY */}
      {activeTab === 'lostfound' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-card overflow-hidden">
          {filteredLostFound.length === 0 ? (
            <div className="p-16 text-center space-y-2">
              <Inbox className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">No lost & found entries found in this queue</p>
              <p className="text-xs text-stone-400">Try changing your search term or status filter</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredLostFound.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isSuspect = item.spamRisk.isSuspect;
                const isLost = item.type === 'lost';
                const isReunited = item.status === 'reunited';

                return (
                  <div 
                    key={item.id} 
                    className={`p-4 sm:p-5 transition-colors space-y-3 ${
                      isSelected 
                        ? 'bg-sky-50/60 dark:bg-sky-950/30' 
                        : isSuspect 
                        ? 'bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/50' 
                        : 'hover:bg-stone-50/70 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Checkbox + Image + Details */}
                      <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                        
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleSelect(item.id)}
                          className="mt-1 text-stone-400 hover:text-sky-600 transition-colors shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-sky-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>

                        {/* Thumbnail Image */}
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            onClick={() => setPreviewTarget({ item, type: 'lostfound' })}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-stone-200 dark:border-stone-700 shrink-0 cursor-pointer hover:opacity-90"
                          />
                        ) : (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-400 shrink-0">
                            <Package className="w-6 h-6" />
                          </div>
                        )}

                        {/* Details */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-[11px] font-mono font-bold text-stone-400">#{item.id.slice(-4)}</span>
                            
                            {/* Type Pill */}
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase ${
                              isLost ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            }`}>
                              {isLost ? '🔍 Lost Item' : '🎁 Found Item'}
                            </span>

                            <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded capitalize">
                              {item.category?.replace('_', ' ')}
                            </span>

                            {isReunited ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                ✓ Reunited
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                Open Post
                              </span>
                            )}

                            {/* Spam/Scam Warning Badge */}
                            {isSuspect && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold border border-rose-300 dark:border-rose-800" title={item.spamRisk.reasons.join(', ')}>
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                <span>Scam Risk {item.spamRisk.score}% ({item.spamRisk.level})</span>
                              </span>
                            )}
                          </div>

                          <h3 
                            onClick={() => setPreviewTarget({ item, type: 'lostfound' })}
                            className="text-sm font-bold text-stone-900 dark:text-white cursor-pointer hover:text-sky-600 transition-colors line-clamp-1"
                          >
                            {item.title}
                          </h3>

                          <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                            {item.description}
                          </p>

                          <div className="flex items-center space-x-2 text-[11px] text-stone-500 dark:text-stone-400 flex-wrap">
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-rose-500" />
                              <span className="font-medium">{item.locationName || 'BBIT Campus'}</span>
                            </span>
                            <span>•</span>
                            <span>Poster: <strong className="font-semibold text-stone-700 dark:text-stone-300">{item.posterName}</strong></span>
                            {item.posterContact && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">{item.posterContact}</span>
                              </>
                            )}
                            {item.reward && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 font-bold">Reward: {item.reward}</span>
                              </>
                            )}
                          </div>

                          {/* Triggered Reasons if Suspect */}
                          {isSuspect && item.spamRisk.reasons.length > 0 && (
                            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center space-x-1 pt-0.5">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Flagged: {item.spamRisk.reasons.join(' • ')}</span>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap lg:self-center">
                        
                        {/* View Preview */}
                        <button
                          onClick={() => setPreviewTarget({ item, type: 'lostfound' })}
                          className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 transition-colors"
                          title="Inspect full lost/found post"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* DELETE / PURGE BUTTON (Key feature for fake/spam deletion) */}
                        <button
                          onClick={() => handleOpenDeleteModal(item, 'lostfound')}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 text-xs font-bold transition-all border border-rose-200 dark:border-rose-800 flex items-center space-x-1 shadow-sm"
                          title="Delete scam, fraudulent claim, or spam post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Scam / Fake</span>
                        </button>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SPAM & SCAM RADAR */}
      {activeTab === 'radar' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-rose-950 via-stone-900 to-amber-950 text-white p-5 rounded-3xl border border-rose-800/60 shadow-card-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>Automated Heuristic Watch & Threat Detection</span>
              </div>
              <h2 className="text-lg font-bold text-white">Suspect Entries Queue ({allSuspects.length})</h2>
              <p className="text-xs text-stone-300">
                Scans keywords (crypto, telegram links, phishing numbers, financial incentives), GPS coordinates out of bounds, and suspicious text patterns.
              </p>
            </div>

            {allSuspects.length > 0 && (
              <button
                onClick={() => {
                  setSelectedIds(new Set(allSuspects.map(s => s.id)));
                  setDeleteReason('scam');
                  setDeleteNotes('Purged via Spam Radar Automated Threat Scanner');
                  setIsBulkDeleteModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-subtle shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Purge All {allSuspects.length} Suspects</span>
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-card overflow-hidden">
            {allSuspects.length === 0 ? (
              <div className="p-16 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-stone-900 dark:text-white">Clean & Healthy Feed</h3>
                <p className="text-xs text-stone-500">No high-risk spam, phishing, or hoax entries currently detected by the radar scanner.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {allSuspects.map((suspect) => {
                  const isCivic = suspect.entryType === 'civic';
                  const isSelected = selectedIds.has(suspect.id);

                  return (
                    <div 
                      key={suspect.id}
                      className={`p-4 sm:p-5 transition-colors space-y-3 ${
                        isSelected ? 'bg-rose-100/60 dark:bg-rose-950/40' : 'bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggleSelect(suspect.id)}
                            className="mt-1 text-stone-400 hover:text-rose-600 transition-colors shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-rose-600" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                                {isCivic ? '🚧 Civic Hazard' : '🔍 Lost & Found'}
                              </span>

                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-rose-600 text-white uppercase tracking-wider">
                                Risk Score: {suspect.spamRisk.score}% ({suspect.spamRisk.level})
                              </span>

                              {suspect.spamRisk.matchedKeywords?.length > 0 && (
                                <span className="text-[10px] font-mono font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                                  Matched: {suspect.spamRisk.matchedKeywords.join(', ')}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                              {suspect.title}
                            </h4>

                            <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                              {suspect.description}
                            </p>

                            <div className="bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800/70 text-xs text-rose-700 dark:text-rose-300 space-y-0.5">
                              <div className="font-bold flex items-center space-x-1">
                                <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                                <span>Threat Signals Triggered:</span>
                              </div>
                              <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                                {suspect.spamRisk.reasons.map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Quick Purge Action */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => setPreviewTarget({ item: suspect, type: isCivic ? 'civic' : 'lostfound' })}
                            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-semibold"
                            title="Inspect"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenDeleteModal(suspect, isCivic ? 'civic' : 'lostfound')}
                            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-subtle transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Purge Entry</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MODERATION AUDIT LOG & TRASH */}
      {activeTab === 'trash' && (
        <div className="space-y-4">
          <div className="bg-stone-900 text-white p-5 rounded-3xl border border-stone-800 shadow-card-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-purple-400" />
                <span>Moderation History & Session Trash ({deletedHistory.length})</span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                All purged fake, scam, or spam items in this session are tracked here. You can inspect the reasons or restore an item if deleted accidentally.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-card overflow-hidden">
            {deletedHistory.length === 0 ? (
              <div className="p-16 text-center space-y-2">
                <Inbox className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
                <p className="text-sm font-bold text-stone-700 dark:text-stone-300">No purged entries in this session</p>
                <p className="text-xs text-stone-400">Deleted fake or spam items will appear here with one-click restore capability.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {deletedHistory.map((record) => {
                  const reasonInfo = MODERATION_REASONS.find(r => r.id === record.reason) || MODERATION_REASONS[0];

                  return (
                    <div key={record.id} className="p-4 sm:p-5 hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors space-y-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-[11px] font-mono text-stone-400">#{record.originalId?.slice(-4)}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                              {record.itemType === 'civic' ? '🚧 Civic Hazard' : '🔍 Lost & Found'}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center space-x-1">
                              <span>{reasonInfo.emoji}</span>
                              <span>{reasonInfo.label}</span>
                            </span>
                            <span className="text-[11px] text-stone-400">
                              Purged: {new Date(record.deletedAt).toLocaleTimeString()} by {record.moderator}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-stone-900 dark:text-white line-through opacity-80">
                            {record.item.title}
                          </h4>
                          
                          {record.adminNotes && (
                            <p className="text-xs text-stone-500 dark:text-stone-400 italic">
                              Note: "{record.adminNotes}"
                            </p>
                          )}
                        </div>

                        {/* Restore Button */}
                        <div className="shrink-0">
                          <button
                            onClick={() => {
                              if (record.itemType === 'civic') {
                                onRestoreCivicIssue(record.item);
                              } else {
                                onRestoreLostFoundItem(record.item);
                              }
                              showToast(`Restored "${record.item.title.slice(0, 30)}..." to active queue`);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold transition-all border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1.5"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            <span>Undo / Restore</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOAST ALERT */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-modal border border-stone-700 flex items-center space-x-3 text-xs animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast.message}</span>
          {toast.undoAction && (
            <button
              onClick={() => {
                toast.undoAction();
                setToast(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors ml-2"
            >
              Undo
            </button>
          )}
          <button onClick={() => setToast(null)} className="text-stone-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 shadow-modal overflow-hidden animate-scale-up space-y-5 p-6">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">
                    Delete & Moderate Entry
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Permanently remove this submission from public campus view and databases.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDeleteTarget(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Item Preview Card */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 space-y-1">
              <div className="flex items-center space-x-2 text-[11px] text-stone-400">
                <span className="font-mono font-bold">#{deleteTarget.item.id?.slice(-4)}</span>
                <span>•</span>
                <span className="capitalize">{deleteTarget.type === 'civic' ? 'Civic Hazard' : 'Lost & Found'}</span>
              </div>
              <p className="text-sm font-bold text-stone-900 dark:text-white line-clamp-1">
                {deleteTarget.item.title}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                {deleteTarget.item.description}
              </p>
            </div>

            {/* Reason Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Select Moderation Reason:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {MODERATION_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-start space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      deleteReason === r.id
                        ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700'
                        : 'bg-white dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="moderation_reason"
                      value={r.id}
                      checked={deleteReason === r.id}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-stone-900 dark:text-white flex items-center space-x-1.5">
                        <span>{r.emoji}</span>
                        <span>{r.label}</span>
                      </div>
                      <p className="text-stone-500 dark:text-stone-400 text-[11px] mt-0.5">
                        {r.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Admin Note / Audit Remarks (Optional):
              </label>
              <input
                type="text"
                value={deleteNotes}
                onChange={(e) => setDeleteNotes(e.target.value)}
                placeholder="e.g. Contains suspicious external telegram contact link..."
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-subtle flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Permanent Delete</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 shadow-modal overflow-hidden animate-scale-up space-y-5 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  Bulk Delete {selectedIds.size} Entries
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  This will purge all {selectedIds.size} selected submissions at once.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Select Moderation Reason:
              </label>
              <select
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {MODERATION_REASONS.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.emoji} {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-subtle flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge {selectedIds.size} Items</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM DETAIL INSPECTION MODAL */}
      {previewTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 shadow-modal max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-scale-up">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono text-stone-400">#{previewTarget.item.id}</span>
                <h3 className="text-base font-bold text-stone-900 dark:text-white mt-0.5">
                  {previewTarget.item.title}
                </h3>
              </div>
              <button onClick={() => setPreviewTarget(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewTarget.item.imageUrl && (
              <img 
                src={previewTarget.item.imageUrl} 
                alt={previewTarget.item.title} 
                className="w-full h-48 object-cover rounded-2xl border border-stone-200 dark:border-stone-800"
              />
            )}

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-stone-700 dark:text-stone-300">Description:</span>
                <p className="text-stone-600 dark:text-stone-400 mt-1 whitespace-pre-wrap">
                  {previewTarget.item.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <div>
                  <span className="text-stone-400 font-medium">Location:</span>
                  <p className="font-bold text-stone-800 dark:text-stone-200">
                    {previewTarget.item.location?.name || previewTarget.item.locationName || 'BBIT Campus'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-400 font-medium">Author / Reporter:</span>
                  <p className="font-bold text-stone-800 dark:text-stone-200">
                    {previewTarget.item.reporterName || previewTarget.item.posterName || 'Unknown'}
                  </p>
                </div>
              </div>

              {previewTarget.item.posterContact && (
                <div>
                  <span className="text-stone-400 font-medium">Contact:</span>
                  <p className="font-mono text-indigo-600 dark:text-indigo-400">
                    {previewTarget.item.posterContact}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                onClick={() => setPreviewTarget(null)}
                className="flex-1 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = previewTarget;
                  setPreviewTarget(null);
                  handleOpenDeleteModal(target.item, target.type);
                }}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Entry</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
