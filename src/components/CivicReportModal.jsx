import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Navigation, 
  Sparkles, 
  Flame, 
  AlertTriangle, 
  Compass, 
  CheckCircle2, 
  Building2,
  Lock
} from 'lucide-react';
import { 
  CIVIC_CATEGORIES, 
  CAMPUS_LANDMARKS, 
  BBIT_CAMPUS_PLACES, 
  isInsideCampus, 
  clampToCampus 
} from '../types';
import { findNearbyCivicDuplicates } from '../services/matchingEngine';
import Icon from './Icon';
import EdgeStoreUploader from './EdgeStoreUploader';
import MapLocationPickerModal from './MapLocationPickerModal';

const SAMPLE_PHOTOS = [
  { label: 'Pothole', url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80' },
  { label: 'Streetlight', url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80' },
  { label: 'Water Leak', url: 'https://images.unsplash.com/photo-1584467541268-b040f83be3fd?auto=format&fit=crop&w=800&q=80' },
];

export default function CivicReportModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  existingIssues,
  onUpvoteAndClose,
  currentUser,
  onRequireAuth
}) {
  const defaultPlace = { 
    name: 'Central Plaza', 
    lat: 22.4587, 
    lng: 88.1708 
  };
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('pothole');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [severity, setSeverity] = useState(3);
  const [locationName, setLocationName] = useState(defaultPlace.name);
  const [lat, setLat] = useState(defaultPlace.lat);
  const [lng, setLng] = useState(defaultPlace.lng);
  const [imageUrl, setImageUrl] = useState('');
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsNote, setGpsNote] = useState('');
  const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);
  const [nearbyDuplicates, setNearbyDuplicates] = useState([]);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  useEffect(() => {
    if (lat && lng) {
      const duplicates = findNearbyCivicDuplicates(lat, lng, category, existingIssues, 40);
      setNearbyDuplicates(duplicates);
      setIgnoreDuplicate(false);
    }
  }, [lat, lng, category, existingIssues]);

  if (!isOpen) return null;

  const handleLandmarkSelect = (landmarkName) => {
    setLocationName(landmarkName);
    const found = BBIT_CAMPUS_PLACES.find(l => l.name === landmarkName);
    if (found) {
      setLat(found.lat);
      setLng(found.lng);
      setGpsNote(`📍 Selected: ${found.name}`);
    }
  };

  const handleAutoGPS = () => {
    setIsGettingGps(true);
    setGpsNote('📡 Acquiring satellite GPS signal...');
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy || 10);

          setLat(Number(userLat.toFixed(6)));
          setLng(Number(userLng.toFixed(6)));

          // Check if near a known campus place within ~150 meters
          let closest = null;
          let minDistance = Infinity;
          BBIT_CAMPUS_PLACES.forEach(b => {
            const d = Math.hypot(b.lat - userLat, b.lng - userLng);
            if (d < minDistance) {
              minDistance = d;
              closest = b;
            }
          });

          if (closest && minDistance < 0.0015) {
            setLocationName(closest.name);
            setGpsNote(`📍 Live GPS locked: ${closest.name} (±${accuracy}m)`);
          } else {
            setLocationName(`Live Spot (${userLat.toFixed(4)}°N, ${userLng.toFixed(4)}°E)`);
            setGpsNote(`📍 Live GPS locked at ${userLat.toFixed(5)}°, ${userLng.toFixed(5)}° (±${accuracy}m)`);
          }
          setIsGettingGps(false);
        },
        (error) => {
          console.warn('GPS error:', error);
          setIsGettingGps(false);
          let msg = 'Could not access GPS.';
          if (error.code === 1) msg = 'Location permission was denied in browser settings.';
          else if (error.code === 2) msg = 'GPS position unavailable. Please check device location.';
          else if (error.code === 3) msg = 'GPS request timed out. Retrying or use map picker.';
          setGpsNote(`⚠️ ${msg}`);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 0 
        }
      );
    } else {
      setIsGettingGps(false);
      setGpsNote('⚠️ Geolocation is not supported by your browser.');
    }
  };

  const handleConfirmedLocationFromPicker = (loc) => {
    setLocationName(loc.name);
    setLat(loc.lat);
    setLng(loc.lng);
    setGpsNote('📍 Precision spot selected on map');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentUser) {
      if (typeof onRequireAuth === 'function') {
        onRequireAuth('Sign in with Google to report campus infrastructure hazards.');
      }
      return;
    }
    if (!title.trim()) return;

    const finalLat = Number(lat);
    const finalLng = Number(lng);

    const newIssue = {
      id: `civic-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'No additional details provided.',
      category,
      customCategory: category === 'other' ? (customCategoryName.trim() || 'Custom Hazard') : '',
      severity: Number(severity),
      status: 'reported',
      upvotedBy: [currentUser.uid],
      urgencyUpvotes: 1,
      userUpvoted: true,
      verifiedCount: 1,
      location: {
        name: locationName,
        lat: finalLat,
        lng: finalLng,
      },
      imageUrl: imageUrl.trim() || '',
      reporterId: currentUser.uid,
      reporterName: currentUser.displayName || 'BBIT Member',
      reporterAvatar: currentUser.photoURL || '',
      reporterEmail: currentUser.email || '',
      reporterRole: 'Verified Student / Staff',
      reportedAt: new Date().toISOString(),
      statusHistory: [
        {
          status: 'reported',
          timestamp: new Date().toISOString(),
          note: `Issue reported by ${currentUser.displayName || 'BBIT Member'} with campus-bound geotag`,
        }
      ],
      comments: []
    };

    onSubmit(newIssue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex justify-center p-3 sm:p-4 md:p-6 animate-fade-in">
      <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-3xl border border-stone-200 dark:border-stone-800 shadow-modal overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] my-auto">
        
        <div className="px-6 py-4 sm:py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0 bg-white dark:bg-stone-900 z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/60 font-bold">
              ⚠️
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">Report Campus Infrastructure Issue</h2>
              <p className="text-xs text-stone-400">Geotag hazards, potholes, or lighting across BBIT</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
            
            {!currentUser && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2.5 text-amber-900 dark:text-amber-200">
                  <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Sign In Required to Report</span>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300">
                      You are currently browsing as a guest. Authenticate with Google to post this hazard to the campus watch.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRequireAuth?.('Sign in with Google to submit reports.')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-subtle shrink-0"
                >
                  Sign In with Google
                </button>
              </div>
            )}

            {nearbyDuplicates.length > 0 && !ignoreDuplicate && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 space-y-2">
                <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Existing Hazard Reported Nearby!</span>
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  Another report already exists near this spot. You can upvote it to increase priority, or continue reporting your separate issue.
                </p>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {nearbyDuplicates.map(({ issue, distanceMeters, isSameCategory }) => (
                    <div key={issue.id} className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-2">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-1.5 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                            {distanceMeters}m away
                          </span>
                          {isSameCategory && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                              Same Hazard Type
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-xs text-stone-900 dark:text-white truncate">{issue.title}</p>
                        <p className="text-[11px] text-stone-400">📍 {issue.location?.name || 'Campus Spot'} · {issue.urgencyUpvotes || 1} Votes</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUpvoteAndClose(issue.id)}
                        className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm transition-all"
                      >
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>Upvote</span>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-amber-200/60 dark:border-amber-800/40 text-xs">
                  <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">Multiple reports in same location will all display as distinct pins.</span>
                  <button
                    type="button"
                    onClick={() => setIgnoreDuplicate(true)}
                    className="text-amber-800 dark:text-amber-300 hover:underline font-bold"
                  >
                    Report as distinct issue →
                  </button>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Issue Headline *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Streetlamp not working near the Central Computing Center pathway"
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
              />
            </div>

            {/* Category Pills */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Category
                </label>
                {category === 'other' && (
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    Custom hazard selected
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CIVIC_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2.5 rounded-xl text-left border transition-all flex items-center space-x-2 ${
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-bold shadow-subtle'
                          : 'bg-stone-50 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
                      }`}
                    >
                      <span className="text-base">{cat.emoji}</span>
                      <span className="text-xs truncate">{cat.label.split('&')[0]}</span>
                    </button>
                  );
                })}
              </div>

              {category === 'other' && (
                <div className="mt-2.5 animate-fade-in">
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                    Specify Custom Hazard Type (Optional)
                  </label>
                  <input
                    type="text"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="e.g. Stray Dogs / Animal Hazard, Fallen Tree, Chemical Leak..."
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-amber-300 dark:border-amber-700 text-stone-900 dark:text-white placeholder-stone-400 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                  />
                </div>
              )}
            </div>

            {/* Location Picker Section (Strict Campus Bounded) */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>Campus Location (Strictly Bound)</span>
                </label>

                {/* Pinpoint on Interactive Map Button */}
                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Pinpoint on Satellite Map ↗</span>
                </button>
              </div>

              {/* Active Selected Location Badge */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                  <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                    {locationName || 'BBIT Campus'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-stone-400 shrink-0">
                  {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Landmark Dropdown (All 50 Surveyed Places) */}
                <select
                  value={locationName}
                  onChange={(e) => handleLandmarkSelect(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {/* If custom or precision spot is selected, add it at the top */}
                  {!BBIT_CAMPUS_PLACES.some(l => l.name === locationName) && locationName && (
                    <option value={locationName}>📍 Custom Spot: {locationName}</option>
                  )}
                  <optgroup label="Popular Campus Landmarks">
                    {CAMPUS_LANDMARKS.slice(0, 15).map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="All 50 Surveyed Campus Places">
                    {BBIT_CAMPUS_PLACES.map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name} ({l.categoryLabel})
                      </option>
                    ))}
                  </optgroup>
                </select>

                {/* GPS Auto-Detect Button */}
                <button
                  type="button"
                  onClick={handleAutoGPS}
                  disabled={isGettingGps}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Navigation className={`w-3.5 h-3.5 text-amber-500 ${isGettingGps ? 'animate-spin' : ''}`} />
                  <span>{isGettingGps ? 'Fetching GPS...' : 'Use Auto-GPS Fallback'}</span>
                </button>
              </div>

              {gpsNote && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                  {gpsNote}
                </p>
              )}

              <div className="text-[11px] text-stone-400 flex items-center justify-between font-mono pt-1">
                <span>Coordinates: {Number(lat).toFixed(6)}° N, {Number(lng).toFixed(6)}° E</span>
                <span className="text-emerald-500 font-bold font-sans">✓ Inside BBIT Bounds</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Details & Hazard Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add specifics like depth, exact pole number, or timing of hazard..."
                className="w-full px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-white placeholder-stone-400 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-normal"
              />
            </div>

            {/* Photo Uploader (EdgeStore Cloud + Pre-sets) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                Attach Photo Proof
              </label>
              <EdgeStoreUploader
                onUploadSuccess={(url) => setImageUrl(url)}
                onUploadComplete={(url) => setImageUrl(url)}
                onChange={(url) => setImageUrl(url)}
                currentImageUrl={imageUrl}
                category={category}
                samplePresets={SAMPLE_PHOTOS}
                currentUser={currentUser}
                onRequireAuth={onRequireAuth}
              />
            </div>

            {/* Severity Slider */}
            <div className="pt-1">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Urgency Level
                </label>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  severity >= 4 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                  severity >= 3 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  Level {severity}/5 · {severity >= 4 ? 'Critical Hazard' : severity >= 3 ? 'Moderate' : 'Low'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="px-6 py-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/90 backdrop-blur-sm flex items-center justify-end space-x-2 shrink-0 z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-700 transition-all"
            >
              Cancel
            </button>
            <button
              type={currentUser ? "submit" : "button"}
              onClick={!currentUser ? () => onRequireAuth?.('Sign in with Google to report campus infrastructure hazards.') : undefined}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                !currentUser
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-subtle cursor-pointer'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-glow-amber'
              }`}
            >
              {!currentUser ? <Lock className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5 fill-current" />}
              <span>{!currentUser ? 'Sign In to Submit' : 'Submit Issue Report'}</span>
            </button>
          </div>

        </form>

      </div>

      {/* Satellite Map Location Positioner Modal */}
      <MapLocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onConfirmLocation={handleConfirmedLocationFromPicker}
        initialLat={lat}
        initialLng={lng}
        initialName={locationName}
      />

    </div>
  );
}
