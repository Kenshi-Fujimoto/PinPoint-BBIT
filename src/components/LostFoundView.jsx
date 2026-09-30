import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  Clock,
  Sparkles,
  HeartHandshake,
  Award,
  Plus,
  ArrowRight,
  Lock
} from 'lucide-react';
import { LOST_FOUND_CATEGORIES } from '../types';
import { findMatchesForPost } from '../services/matchingEngine';
import Icon from './Icon';

export default function LostFoundView({
  items,
  onSelectItem,
  onOpenCreateModal,
  currentUser,
  onRequireAuth
}) {
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyPosts, setOnlyMyPosts] = useState(false);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (onlyMyPosts && currentUser) {
      result = result.filter(item => item.posterId === currentUser.uid);
    }

    if (selectedType === 'lost') {
      result = result.filter(item => item.type === 'lost' && item.status !== 'reunited');
    } else if (selectedType === 'found') {
      result = result.filter(item => item.type === 'found' && item.status !== 'reunited');
    } else if (selectedType === 'reunited') {
      result = result.filter(item => item.status === 'reunited');
    }

    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.locationName?.toLowerCase().includes(q) ||
          item.color?.toLowerCase().includes(q) ||
          item.brand?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [items, selectedType, selectedCategory, searchQuery, onlyMyPosts, currentUser]);

  const systemMatches = useMemo(() => {
    const matchesFound = [];
    const lostItems = items.filter(i => i.type === 'lost' && i.status !== 'reunited');

    for (const lost of lostItems) {
      const candidates = findMatchesForPost(lost, items, 45);
      if (candidates.length > 0) {
        matchesFound.push({
          lostItem: lost,
          foundItem: candidates[0].matchedItem,
          score: candidates[0].score,
          reasons: candidates[0].reasons,
        });
      }
    }
    return matchesFound;
  }, [items]);

  const getCategoryInfo = (catId) => {
    return LOST_FOUND_CATEGORIES.find(c => c.id === catId) || { label: catId, icon: 'Package' };
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
              Campus Lost & Found Hub
            </h1>
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>AI Match Engine Active</span>
            </span>
          </div>
          <p className="text-stone-500 dark:text-stone-400 text-xs sm:text-sm mt-0.5">
            Auto-suggests matches between lost and found items at BBIT.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => {
              if (!currentUser && typeof onRequireAuth === 'function') {
                onRequireAuth('Sign in with Google to report a lost belonging.');
              } else {
                onOpenCreateModal('lost');
              }
            }}
            title={!currentUser ? "Sign in required to post lost items" : "Report Lost Belonging"}
            className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-subtle"
          >
            {!currentUser ? <Lock className="w-3.5 h-3.5 text-pink-200" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Lost an item</span>
          </button>
          <button
            onClick={() => {
              if (!currentUser && typeof onRequireAuth === 'function') {
                onRequireAuth('Sign in with Google to report a found belonging.');
              } else {
                onOpenCreateModal('found');
              }
            }}
            title={!currentUser ? "Sign in required to post found items" : "Report Found Belonging"}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-subtle"
          >
            {!currentUser ? <Lock className="w-3.5 h-3.5 text-sky-200" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Found an item</span>
          </button>
        </div>
      </div>

      {/* Guest View-Only Banner */}
      {!currentUser && (
        <div className="bg-sky-500/10 dark:bg-sky-500/15 border border-sky-300/60 dark:border-sky-700/60 rounded-2xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-sky-900 dark:text-sky-200">
            <span className="text-sm">👀</span>
            <span className="font-medium">
              <strong>Public View-Only Mode:</strong> Browse all lost & found belongings on campus. Sign in with Google to post items, claim belongings, or leave tips.
            </span>
          </div>
          <button
            onClick={() => onRequireAuth?.('Sign in with Google to post or claim belongings.')}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-all shadow-subtle shrink-0 self-start sm:self-center"
          >
            Sign In with Google
          </button>
        </div>
      )}

      {/* Smart Match Suggestion Alert */}
      {systemMatches.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40 border border-indigo-200 dark:border-indigo-800/60 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-card">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-glow-indigo">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-indigo-950 dark:text-indigo-200 block text-sm">
                {systemMatches.length} High-Confidence Match Suggested!
              </span>
              <span className="text-indigo-800 dark:text-indigo-300">
                "{systemMatches[0].lostItem.title}" correlates with "{systemMatches[0].foundItem.title}" ({systemMatches[0].score}% Match)
              </span>
            </div>
          </div>

          <button
            onClick={() => onSelectItem(systemMatches[0].lostItem)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center space-x-1 shrink-0 self-start sm:self-center shadow-subtle"
          >
            <span>Review Match</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-card dark:shadow-card-dark space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by item name, color, brand, or location..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100/50 dark:hover:bg-stone-800 focus:bg-white dark:focus:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-stone-400"
            />
          </div>

          {/* Segmented Controller & My Posts */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl text-xs font-medium border border-stone-200/60 dark:border-stone-700">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1 rounded-lg transition-all ${selectedType === 'all'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-subtle font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedType('lost')}
                className={`px-3 py-1 rounded-lg transition-all ${selectedType === 'lost'
                  ? 'bg-pink-600 text-white shadow-subtle font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
              >
                Lost
              </button>
              <button
                onClick={() => setSelectedType('found')}
                className={`px-3 py-1 rounded-lg transition-all ${selectedType === 'found'
                  ? 'bg-sky-600 text-white shadow-subtle font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
              >
                Found
              </button>
              <button
                onClick={() => setSelectedType('reunited')}
                className={`px-3 py-1 rounded-lg transition-all ${selectedType === 'reunited'
                  ? 'bg-emerald-600 text-white shadow-subtle font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
              >
                Reunited
              </button>
            </div>

            {currentUser && (
              <button
                type="button"
                onClick={() => setOnlyMyPosts(!onlyMyPosts)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  onlyMyPosts
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-subtle'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
                }`}
              >
                <span>My Posts</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap px-3 py-1 rounded-lg transition-all font-semibold ${selectedCategory === 'all'
              ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-subtle'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
          >
            All Categories
          </button>

          {LOST_FOUND_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 font-medium border ${isSelected
                  ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-subtle'
                  : 'bg-stone-50 dark:bg-stone-800/80 border-stone-200/80 dark:border-stone-700/80 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                  }`}
              >
                <Icon name={cat.icon} className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Items */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-12 text-center shadow-card">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">No items match your filter</p>
          <p className="text-xs text-stone-400 mt-1">Try switching between Lost and Found tabs</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const category = getCategoryInfo(item.category);
            const isLost = item.type === 'lost';
            const isReunited = item.status === 'reunited';

            const candidateMatches = findMatchesForPost(item, items, 45);
            const topMatch = candidateMatches[0];

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="group bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800 hover:border-pink-400 dark:hover:border-pink-600 p-4 shadow-card dark:shadow-card-dark hover:shadow-card-hover transition-all flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Photo Container */}
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 mb-3 border border-stone-200 dark:border-stone-800">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <Icon name={category.icon} className="w-8 h-8 opacity-40" />
                      </div>
                    )}

                    {/* Type Badge */}
                    <div className="absolute top-2 left-2">
                      {isReunited ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-subtle">
                          REUNITED 🎉
                        </span>
                      ) : isLost ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-pink-600 text-white shadow-subtle">
                          LOST ITEM
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-600 text-white shadow-subtle">
                          FOUND ITEM
                        </span>
                      )}
                    </div>

                    {/* Reward Badge */}
                    {item.reward && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-400 text-stone-900 shadow-subtle flex items-center space-x-1">
                        <Award className="w-3 h-3" />
                        <span>{item.reward}</span>
                      </div>
                    )}

                    {/* Match Tag */}
                    {topMatch && !isReunited && (
                      <div className="absolute bottom-2 inset-x-2 bg-stone-950/90 backdrop-blur-sm text-white px-2 py-1 rounded-xl text-[10px] font-bold text-center flex items-center justify-center space-x-1 shadow-subtle">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>✨ {topMatch.score}% Match Found</span>
                      </div>
                    )}
                  </div>

                  {/* Category & Attributes */}
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium mb-1">
                    {category.label} {item.color ? `• ${item.color}` : ''}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm text-stone-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-stone-500 dark:text-stone-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <div className="flex items-center space-x-1 truncate mr-2">
                    <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="truncate">{item.locationName}</span>
                  </div>

                  <div className="shrink-0 flex items-center space-x-1 text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>{timeAgo(item.timestamp)}</span>
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
