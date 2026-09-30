import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CivicIssuesView from './components/CivicIssuesView';
import CivicReportModal from './components/CivicReportModal';
import CivicDetailModal from './components/CivicDetailModal';
import LostFoundView from './components/LostFoundView';
import LostFoundModal from './components/LostFoundModal';
import LostFoundDetailModal from './components/LostFoundDetailModal';
import InteractiveMap from './components/InteractiveMap';
import AdminPortal from './components/AdminPortal';
import AuthModal from './components/AuthModal';
import PWAInstallBanner from './components/PWAInstallBanner';
import HeroSection from './components/HeroSection';
import { EdgeStoreProvider } from './services/edgestore';
import { 
  subscribeToCivicIssues, 
  subscribeToLostFound, 
  syncCivicIssue, 
  syncLostFoundItem,
  deleteCivicIssue,
  deleteLostFoundItem,
  subscribeToAuth,
  signInWithGoogle,
  signOutUser,
  isFirebaseConfigured
} from './services/firebase';
import { 
  getStoredCivicIssues, 
  saveCivicIssues, 
  getStoredLostFound, 
  saveLostFound,
  resetAllToDefault 
} from './services/storage';
import { ShieldCheck, Sun, Moon } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState('public'); // 'public' or 'admin'
  const [activeTab, setActiveTab] = useState('civic'); // 'civic', 'lostfound', 'map'
  const [civicIssues, setCivicIssues] = useState([]);
  const [lostFoundItems, setLostFoundItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState('');
  const [deletedItemsHistory, setDeletedItemsHistory] = useState([]);

  // Theme Management (Apple-style light theme by default, user-controlled toggle)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('pinpoint_appearance');
    return saved === 'dark'; // Default to Apple light theme
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pinpoint_appearance', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pinpoint_appearance', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // Modals state
  const [selectedCivicIssue, setSelectedCivicIssue] = useState(null);
  const [selectedLostFoundItem, setSelectedLostFoundItem] = useState(null);
  const [isCivicModalOpen, setIsCivicModalOpen] = useState(false);
  const [isLostFoundModalOpen, setIsLostFoundModalOpen] = useState(false);
  const [lostFoundModalType, setLostFoundModalType] = useState('lost');
  const [lostFoundModalCategory, setLostFoundModalCategory] = useState('bottles_mugs');

  // Real-time Auth State Subscription
  useEffect(() => {
    const unsubAuth = subscribeToAuth((user) => {
      setCurrentUser(user);
    });
    return () => {
      if (typeof unsubAuth === 'function') unsubAuth();
    };
  }, []);

  // Real-time Firestore & Local Persistence Subscriptions
  useEffect(() => {
    const unsubCivic = subscribeToCivicIssues((issues) => {
      setCivicIssues(issues);
    });

    const unsubLostFound = subscribeToLostFound((items) => {
      setLostFoundItems(items);
    });

    return () => {
      if (typeof unsubCivic === 'function') unsubCivic();
      if (typeof unsubLostFound === 'function') unsubLostFound();
    };
  }, []);

  const updateAndSaveCivicIssues = (newIssues) => {
    setCivicIssues(newIssues);
    saveCivicIssues(newIssues);
  };

  const updateAndSaveLostFound = (newItems) => {
    setLostFoundItems(newItems);
    saveLostFound(newItems);
  };

  // Google Authentication Trigger
  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
    } catch (err) {
      console.error('Sign-in failed:', err);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
  };

  // Unique User Multi-Upvote Civic Issue
  const handleUpvoteCivicIssue = async (issueId) => {
    // If not signed in, prompt Google Sign-In
    if (!currentUser) {
      setAuthPromptReason('Sign in with Google to cast your unique verified upvote on this hazard.');
      setIsAuthModalOpen(true);
      return;
    }

    const updated = civicIssues.map((issue) => {
      if (issue.id === issueId) {
        const currentUpvotedBy = Array.isArray(issue.upvotedBy) ? issue.upvotedBy : [];
        const isUpvoted = currentUpvotedBy.includes(currentUser.uid);
        
        let newUpvotedBy;
        if (isUpvoted) {
          // Toggle off (remove user's unique vote)
          newUpvotedBy = currentUpvotedBy.filter(uid => uid !== currentUser.uid);
        } else {
          // Toggle on (add user's unique vote)
          newUpvotedBy = [...currentUpvotedBy, currentUser.uid];
        }

        const modified = {
          ...issue,
          upvotedBy: newUpvotedBy,
          urgencyUpvotes: newUpvotedBy.length,
          userUpvoted: !isUpvoted,
        };
        syncCivicIssue(modified);
        return modified;
      }
      return issue;
    });

    updateAndSaveCivicIssues(updated);

    if (selectedCivicIssue?.id === issueId) {
      setSelectedCivicIssue(updated.find(i => i.id === issueId));
    }
  };

  // Rate Severity
  const handleRateSeverity = (issueId, severityLevel) => {
    if (!currentUser) {
      setAuthPromptReason('Sign in with Google to rate hazard severity.');
      setIsAuthModalOpen(true);
      return;
    }

    const updated = civicIssues.map((issue) => {
      if (issue.id === issueId) {
        const modified = { ...issue, severity: severityLevel };
        syncCivicIssue(modified);
        return modified;
      }
      return issue;
    });
    updateAndSaveCivicIssues(updated);

    if (selectedCivicIssue?.id === issueId) {
      setSelectedCivicIssue(updated.find(i => i.id === issueId));
    }
  };

  // Verify Issue
  const handleVerifyIssue = (issueId) => {
    if (!currentUser) {
      setAuthPromptReason('Sign in with Google to verify this hazard sighting.');
      setIsAuthModalOpen(true);
      return;
    }

    const updated = civicIssues.map((issue) => {
      if (issue.id === issueId) {
        const modified = { ...issue, verifiedCount: (issue.verifiedCount || 0) + 1 };
        syncCivicIssue(modified);
        return modified;
      }
      return issue;
    });
    updateAndSaveCivicIssues(updated);

    if (selectedCivicIssue?.id === issueId) {
      setSelectedCivicIssue(updated.find(i => i.id === issueId));
    }
  };

  // Add Comment to Civic Issue
  const handleAddCivicComment = (issueId, comment) => {
    if (!currentUser) {
      setAuthPromptReason('Sign in with Google to post community remarks.');
      setIsAuthModalOpen(true);
      return;
    }

    const updated = civicIssues.map((issue) => {
      if (issue.id === issueId) {
        const modified = {
          ...issue,
          comments: [...(issue.comments || []), comment],
        };
        syncCivicIssue(modified);
        return modified;
      }
      return issue;
    });
    updateAndSaveCivicIssues(updated);

    if (selectedCivicIssue?.id === issueId) {
      setSelectedCivicIssue(updated.find(i => i.id === issueId));
    }
  };

  // Update Status in Pipeline
  const handleUpdateCivicStatus = (issueId, newStatus, note) => {
    if (!currentUser) {
      setAuthPromptReason('Facility staff sign-in required to update issue status.');
      setIsAuthModalOpen(true);
      return;
    }

    const updated = civicIssues.map((issue) => {
      if (issue.id === issueId) {
        const historyEntry = {
          status: newStatus,
          timestamp: new Date().toISOString(),
          note: note || `Status updated to ${newStatus}`,
        };
        const modified = {
          ...issue,
          status: newStatus,
          statusHistory: [...(issue.statusHistory || []), historyEntry],
        };
        syncCivicIssue(modified);
        return modified;
      }
      return issue;
    });
    updateAndSaveCivicIssues(updated);

    if (selectedCivicIssue?.id === issueId) {
      setSelectedCivicIssue(updated.find(i => i.id === issueId));
    }
  };

  // Handle Duplicate Upvote and Close
  const handleUpvoteAndCloseDuplicate = (existingIssueId) => {
    handleUpvoteCivicIssue(existingIssueId);
    setIsCivicModalOpen(false);
  };

  // Create new civic issue
  const handleCreateCivicIssue = (newIssue) => {
    if (!currentUser) {
      setAuthPromptReason('Sign in with Google to report campus infrastructure hazards.');
      setIsAuthModalOpen(true);
      return;
    }

    const updated = [newIssue, ...civicIssues];
    updateAndSaveCivicIssues(updated);
    syncCivicIssue(newIssue);
  };

  // Create new lost & found item
  const handleCreateLostFoundItem = (newItem) => {
    if (!currentUser) {
      setAuthPromptReason('Sign in with Google to post lost or found items.');
      setIsAuthModalOpen(true);
      return;
    }

    const updated = [newItem, ...lostFoundItems];
    updateAndSaveLostFound(updated);
    syncLostFoundItem(newItem);
  };

  // Mark Lost & Found item as Reunited
  const handleMarkLostFoundReunited = (itemId) => {
    if (!currentUser) {
      setAuthPromptReason('Sign in with Google to mark items as reunited.');
      setIsAuthModalOpen(true);
      return;
    }

    const updated = lostFoundItems.map((item) => {
      if (item.id === itemId) {
        const modified = {
          ...item,
          status: 'reunited',
          reunitedDate: new Date().toISOString(),
        };
        syncLostFoundItem(modified);
        return modified;
      }
      return item;
    });
    updateAndSaveLostFound(updated);

    if (selectedLostFoundItem?.id === itemId) {
      setSelectedLostFoundItem(updated.find(i => i.id === itemId));
    }
  };

  // Add Comment to Lost & Found item
  const handleAddLostFoundComment = (itemId, comment) => {
    if (!currentUser) {
      setAuthPromptReason('Sign in with Google to leave sighting tips or claim remarks.');
      setIsAuthModalOpen(true);
      return;
    }

    const updated = lostFoundItems.map((item) => {
      if (item.id === itemId) {
        const modified = {
          ...item,
          comments: [...(item.comments || []), comment],
        };
        syncLostFoundItem(modified);
        return modified;
      }
      return item;
    });
    updateAndSaveLostFound(updated);

    if (selectedLostFoundItem?.id === itemId) {
      setSelectedLostFoundItem(updated.find(i => i.id === itemId));
    }
  };

  // Delete Civic Issue (Spam, Scam, Fake, or Duplicate)
  const handleDeleteCivicIssue = (issueId, reason = 'fake', adminNotes = '') => {
    const itemToDelete = civicIssues.find(i => i.id === issueId);
    if (!itemToDelete) return;

    const updated = civicIssues.filter(i => i.id !== issueId);
    updateAndSaveCivicIssues(updated);
    deleteCivicIssue(issueId);

    const historyRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      originalId: issueId,
      itemType: 'civic',
      item: itemToDelete,
      reason,
      adminNotes,
      deletedAt: new Date().toISOString(),
      moderator: currentUser?.displayName || 'Campus Facility Admin'
    };
    setDeletedItemsHistory(prev => [historyRecord, ...prev]);

    if (selectedCivicIssue?.id === issueId) {
      setSelectedCivicIssue(null);
    }
  };

  // Delete Lost & Found Item (Scam, Spam, Fake, or Phishing)
  const handleDeleteLostFoundItem = (itemId, reason = 'scam', adminNotes = '') => {
    const itemToDelete = lostFoundItems.find(i => i.id === itemId);
    if (!itemToDelete) return;

    const updated = lostFoundItems.filter(i => i.id !== itemId);
    updateAndSaveLostFound(updated);
    deleteLostFoundItem(itemId);

    const historyRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      originalId: itemId,
      itemType: 'lostfound',
      item: itemToDelete,
      reason,
      adminNotes,
      deletedAt: new Date().toISOString(),
      moderator: currentUser?.displayName || 'Campus Facility Admin'
    };
    setDeletedItemsHistory(prev => [historyRecord, ...prev]);

    if (selectedLostFoundItem?.id === itemId) {
      setSelectedLostFoundItem(null);
    }
  };

  // Restore Civic Issue from Trash
  const handleRestoreCivicIssue = (issue) => {
    const updated = [issue, ...civicIssues.filter(i => i.id !== issue.id)];
    updateAndSaveCivicIssues(updated);
    syncCivicIssue(issue);
    setDeletedItemsHistory(prev => prev.filter(r => r.originalId !== issue.id));
  };

  // Restore Lost & Found Item from Trash
  const handleRestoreLostFoundItem = (item) => {
    const updated = [item, ...lostFoundItems.filter(i => i.id !== item.id)];
    updateAndSaveLostFound(updated);
    syncLostFoundItem(item);
    setDeletedItemsHistory(prev => prev.filter(r => r.originalId !== item.id));
  };

  // Clear all registered data
  const handleResetData = () => {
    if (window.confirm('Remove ALL registered reports, hazards, and lost & found items? This cannot be undone.')) {
      const reset = resetAllToDefault();
      setCivicIssues(reset.civicIssues);
      setLostFoundItems(reset.lostFound);
      reset.civicIssues.forEach(syncCivicIssue);
      reset.lostFound.forEach(syncLostFoundItem);
    }
  };

  const handleOpenReportModal = (type) => {
    if (!currentUser) {
      setAuthPromptReason(
        type === 'civic'
          ? 'Sign in with Google to report campus infrastructure hazards and issues.'
          : 'Sign in with Google to post lost or found belongings.'
      );
      setIsAuthModalOpen(true);
      return;
    }

    if (type === 'civic') {
      setIsCivicModalOpen(true);
    } else {
      setLostFoundModalType('lost');
      setLostFoundModalCategory('bottles_mugs');
      setIsLostFoundModalOpen(true);
    }
  };

  const triggerAuthPrompt = (reason) => {
    setAuthPromptReason(reason || 'Sign in with Google to access this feature.');
    setIsAuthModalOpen(true);
  };

  return (
    <EdgeStoreProvider>
      <div className="min-h-screen bg-stone-50 dark:bg-[#000000] text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
        
        {/* PUBLIC VIEW */}
        {viewMode === 'public' && (
          <>
            {/* Navbar with Theme Toggle & Google Auth */}
            <Navbar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenReportModal={handleOpenReportModal}
              onOpenAdminPortal={() => setViewMode('admin')}
              civicCount={civicIssues.length}
              lostFoundCount={lostFoundItems.length}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              user={currentUser}
              onSignIn={() => {
                setAuthPromptReason('');
                setIsAuthModalOpen(true);
              }}
              onSignOut={handleGoogleSignOut}
            />

            {/* Hero — WebGL shader background */}
            <HeroSection
              onNavigate={(tab) => setActiveTab(tab)}
              onReport={() => handleOpenReportModal('civic')}
              civicCount={civicIssues.length}
              lostFoundCount={lostFoundItems.length}
            />

            {/* Main App Container */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
              
              {/* Civic Issues View */}
              {activeTab === 'civic' && (
                <CivicIssuesView
                  issues={civicIssues}
                  onSelectIssue={(issue) => setSelectedCivicIssue(issue)}
                  onUpvoteIssue={handleUpvoteCivicIssue}
                  onOpenReportModal={() => handleOpenReportModal('civic')}
                  currentUser={currentUser}
                  onRequireAuth={(reason) => triggerAuthPrompt(reason || 'Sign in with Google to report or upvote civic hazards.')}
                />
              )}

              {/* Lost & Found View */}
              {activeTab === 'lostfound' && (
                <LostFoundView
                  items={lostFoundItems}
                  onSelectItem={(item) => setSelectedLostFoundItem(item)}
                  onOpenCreateModal={(type, category = 'bottles_mugs') => {
                    if (!currentUser) {
                      triggerAuthPrompt('Sign in with Google to post lost or found items.');
                      return;
                    }
                    setLostFoundModalType(type);
                    setLostFoundModalCategory(category);
                    setIsLostFoundModalOpen(true);
                  }}
                  currentUser={currentUser}
                  onRequireAuth={(reason) => triggerAuthPrompt(reason || 'Sign in with Google to post lost or found items.')}
                />
              )}

              {/* Aerial Satellite Campus Map */}
              {activeTab === 'map' && (
                <InteractiveMap
                  civicIssues={civicIssues}
                  lostFoundItems={lostFoundItems}
                  onSelectCivicIssue={(issue) => setSelectedCivicIssue(issue)}
                  onSelectLostFound={(item) => setSelectedLostFoundItem(item)}
                  isDark={isDark}
                />
              )}

            </main>

            {/* Footer */}
            <footer className="mt-auto border-t border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 py-6 px-4 text-xs text-stone-500 dark:text-stone-400">
              <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-stone-900 dark:text-white">PinPoint</span>
                  <span>•</span>
                  <span>BBIT Community Portal</span>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleTheme}
                    className="hover:text-stone-900 dark:hover:text-white font-medium flex items-center space-x-1"
                  >
                    {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                    <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>

                  <span>•</span>

                  <button
                    onClick={() => setViewMode('admin')}
                    className="hover:text-stone-900 dark:hover:text-white font-medium flex items-center space-x-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Facility Staff Portal</span>
                  </button>
                  
                  <span>•</span>
                  <span>MIT License</span>
                </div>
              </div>
            </footer>
          </>
        )}

        {/* DEDICATED SEPARATE STAFF OPERATIONS PORTAL */}
        {viewMode === 'admin' && (
          <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
            <AdminPortal
              civicIssues={civicIssues}
              lostFoundItems={lostFoundItems}
              onUpdateCivicStatus={handleUpdateCivicStatus}
              onDeleteCivicIssue={handleDeleteCivicIssue}
              onDeleteLostFoundItem={handleDeleteLostFoundItem}
              onRestoreCivicIssue={handleRestoreCivicIssue}
              onRestoreLostFoundItem={handleRestoreLostFoundItem}
              deletedHistory={deletedItemsHistory}
              onResetData={handleResetData}
              onCloseAdminPortal={() => setViewMode('public')}
              currentUser={currentUser}
            />
          </div>
        )}

        {/* MODALS */}

        {/* Civic Issue Report Modal */}
        <CivicReportModal
          isOpen={isCivicModalOpen}
          onClose={() => setIsCivicModalOpen(false)}
          onSubmit={handleCreateCivicIssue}
          existingIssues={civicIssues}
          onUpvoteAndClose={handleUpvoteAndCloseDuplicate}
          currentUser={currentUser}
          onRequireAuth={triggerAuthPrompt}
        />

        {/* Civic Issue Detail Modal */}
        {selectedCivicIssue && (
          <CivicDetailModal
            issue={selectedCivicIssue}
            onClose={() => setSelectedCivicIssue(null)}
            onUpvote={handleUpvoteCivicIssue}
            onRateSeverity={handleRateSeverity}
            onVerifyIssue={handleVerifyIssue}
            onAddComment={handleAddCivicComment}
            onUpdateStatus={handleUpdateCivicStatus}
            currentUser={currentUser}
            onRequireAuth={triggerAuthPrompt}
          />
        )}

        {/* Lost & Found Post Modal */}
        <LostFoundModal
          isOpen={isLostFoundModalOpen}
          onClose={() => setIsLostFoundModalOpen(false)}
          onSubmit={handleCreateLostFoundItem}
          initialType={lostFoundModalType}
          initialCategory={lostFoundModalCategory}
          existingItems={lostFoundItems}
          currentUser={currentUser}
          onRequireAuth={triggerAuthPrompt}
        />

        {/* Lost & Found Detail Modal */}
        {selectedLostFoundItem && (
          <LostFoundDetailModal
            item={selectedLostFoundItem}
            allItems={lostFoundItems}
            onClose={() => setSelectedLostFoundItem(null)}
            onMarkReunited={handleMarkLostFoundReunited}
            onAddComment={handleAddLostFoundComment}
            onSelectItem={(item) => setSelectedLostFoundItem(item)}
            currentUser={currentUser}
            onRequireAuth={triggerAuthPrompt}
          />
        )}

        {/* Google Authentication Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSignInWithGoogle={handleGoogleSignIn}
          promptReason={authPromptReason}
        />

        {/* PWA Install Prompt Banner */}
        <PWAInstallBanner />

      </div>
    </EdgeStoreProvider>
  );
}
