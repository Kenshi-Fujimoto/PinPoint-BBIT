import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  X, 
  MapPin, 
  Navigation, 
  Check, 
  Search, 
  Building2,
  Sparkles,
  ExternalLink,
  Layers,
  Info,
  Compass,
  Map as MapIcon,
  ListFilter,
  Satellite
} from 'lucide-react';
import { 
  CAMPUS_LANDMARKS,
  BBIT_CAMPUS_PLACES,
  BBIT_CAMPUS_BOUNDS,
  BBIT_MAP_CENTER, 
  BBIT_MAP_ZOOM,
  isInsideCampus,
  clampToCampus
} from '../types';

// Custom Pin for Map Picker
const pickerPinIcon = L.divIcon({
  className: 'custom-picker-pin',
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; width: 44px; height: 50px; cursor: grab;">
      <div style="width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(135deg, #0A84FF, #0071E3); border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0, 113, 227, 0.9); color: white; font-weight: bold; font-size: 16px;">
        📍
      </div>
      <div style="width: 4px; height: 10px; background: #0071E3; border-radius: 2px;"></div>
      <div style="width: 8px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%;"></div>
    </div>
  `,
  iconSize: [44, 50],
  iconAnchor: [22, 46],
});

// Minimal Building Dot on Picker Map
function createPickerBuildingDot(color = '#0071E3') {
  return L.divIcon({
    className: 'picker-building-dot',
    html: `
      <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; border: 1.5px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.6); cursor: pointer; transition: transform 0.15s ease;"></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

// Major prominent landmarks to show labels for by default
const MAJOR_LANDMARK_IDS = new Set([
  'main-gate-xaji',
  'central-library-zbik',
  'administrative-block-3zmf',
  'academic-building-a-cidk',
  'central-computing-center-sg65',
  'ac-auditorium-ala7',
  'bbit-public-school-pbhs',
  'boys-hostel-53lc',
  'girls-hostel-c11e',
  'hostel-mess-pht0',
  'college-canteen-hl9x',
  'cricket-ground-4ciy',
  'swimming-pool-dppq'
]);

// Automatically triggers Leaflet container recalculation on mount & tab switch
function MapResizeFix({ activeTab }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    const t3 = setTimeout(() => map.invalidateSize(), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [map, activeTab]);
  return null;
}

// Event listener for user clicking anywhere on map with strict campus bounding
function LocationPickerEvents({ onPick }) {
  useMapEvents({
    click(e) {
      const [clampedLat, clampedLng] = clampToCampus(e.latlng.lat, e.latlng.lng);
      onPick(Number(clampedLat.toFixed(6)), Number(clampedLng.toFixed(6)));
    },
  });
  return null;
}

function FlyToCoords({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 18.5, { duration: 1 });
    }
  }, [coords, map]);
  return null;
}

export default function MapLocationPickerModal({
  isOpen,
  onClose,
  onConfirmLocation,
  initialLat = 22.458900,
  initialLng = 88.169500,
  initialName = 'BBIT Campus'
}) {
  const [initialClampedLat, initialClampedLng] = clampToCampus(initialLat || 22.458900, initialLng || 88.169500);
  
  const [selectedLat, setSelectedLat] = useState(initialClampedLat);
  const [selectedLng, setSelectedLng] = useState(initialClampedLng);
  const [locationName, setLocationName] = useState(initialName || 'BBIT Campus');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPlaces, setShowPlaces] = useState(true);
  const [mapLayerType, setMapLayerType] = useState('satellite'); // 'satellite' or 'streets'
  const [mobileView, setMobileView] = useState('map'); // 'map' or 'places'
  const [flyTarget, setFlyTarget] = useState(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      const [cLat, cLng] = clampToCampus(initialLat || 22.458900, initialLng || 88.169500);
      setSelectedLat(cLat);
      setSelectedLng(cLng);
      const name = initialName || 'BBIT Campus';
      setLocationName(name);
      setFlyTarget([cLat, cLng]);
      setMobileView('map');
    }
  }, [isOpen, initialLat, initialLng, initialName]);

  const categoriesList = [
    { id: 'all', label: 'All' },
    { id: 'academic', label: 'Departments & Labs' },
    { id: 'hostel', label: 'Hostels' },
    { id: 'canteen', label: 'Canteens' },
    { id: 'sports', label: 'Sports' },
  ];

  const filteredPlaces = useMemo(() => {
    return BBIT_CAMPUS_PLACES.filter(p => {
      const matchCat = selectedCategory === 'all' || 
        (selectedCategory === 'canteen' && (p.category === 'canteen' || p.category === 'mess' || p.category === 'tea' || p.category === 'food')) ||
        (selectedCategory === 'sports' && (p.category === 'sports' || p.category === 'gym' || p.category === 'green')) ||
        p.category === selectedCategory;

      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        p.categoryLabel.toLowerCase().includes(q) ||
        (p.details && p.details.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchTerm]);

  if (!isOpen) return null;

  // Handle clicking anywhere on map, snapping to nearest of 50 places if within 70 meters
  const handleMapClick = (rawLat, rawLng) => {
    const lat = Number(rawLat.toFixed(6));
    const lng = Number(rawLng.toFixed(6));
    setSelectedLat(lat);
    setSelectedLng(lng);

    let closest = null;
    let minDistance = Infinity;

    BBIT_CAMPUS_PLACES.forEach(b => {
      const d = Math.hypot(b.lat - lat, b.lng - lng);
      if (d < minDistance) {
        minDistance = d;
        closest = b;
      }
    });

    if (closest && minDistance < 0.00075) {
      setLocationName(closest.name);
    } else {
      setLocationName(`Selected Spot (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
    }
  };

  const handleSelectPlace = (place) => {
    setSelectedLat(place.lat);
    setSelectedLng(place.lng);
    setLocationName(place.name);
    setFlyTarget([place.lat, place.lng]);
    setMobileView('map');
  };

  const handleAutoGPS = () => {
    setIsGpsLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = Number(position.coords.latitude.toFixed(6));
          const userLng = Number(position.coords.longitude.toFixed(6));
          setSelectedLat(userLat);
          setSelectedLng(userLng);
          
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
          } else {
            setLocationName(`Live GPS Location (${userLat.toFixed(4)}°N, ${userLng.toFixed(4)}°E)`);
          }
          
          setFlyTarget([userLat, userLng]);
          setIsGpsLoading(false);
        },
        (err) => {
          console.warn('GPS error:', err);
          setIsGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setIsGpsLoading(false);
    }
  };

  const handleConfirm = () => {
    onConfirmLocation({
      name: locationName.trim() || 'Custom Selected Location',
      lat: Number(selectedLat),
      lng: Number(selectedLng),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-stone-900 w-full max-w-5xl rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col h-[92vh] max-h-[850px] my-auto">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0 bg-white dark:bg-stone-900 z-10">
          <div className="min-w-0 pr-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                📍
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white truncate">
                  Pinpoint Campus Location
                </h2>
                <p className="text-[11px] text-stone-400 hidden sm:block truncate">
                  Tap anywhere on the satellite canvas or choose from 50 campus locations
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Mobile View Toggle */}
            <div className="flex md:hidden bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setMobileView('map')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                  mobileView === 'map'
                    ? 'bg-indigo-600 text-white shadow-subtle'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                <MapIcon className="w-3 h-3" />
                <span>Map</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileView('places')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                  mobileView === 'places'
                    ? 'bg-indigo-600 text-white shadow-subtle'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                <ListFilter className="w-3 h-3" />
                <span>Places</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative">
          
          {/* Left Column: Quick Building Search & Filter */}
          <div className={`w-full md:w-80 p-3.5 sm:p-4 border-r border-stone-100 dark:border-stone-800 flex-col space-y-3 bg-stone-50/50 dark:bg-stone-900/50 ${
            mobileView === 'places' ? 'flex flex-1 overflow-y-auto' : 'hidden md:flex overflow-y-auto'
          }`}>
            
            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search building, lab, hostel..."
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Category Quick Chips */}
            <div className="flex items-center gap-1 flex-wrap shrink-0">
              {categoriesList.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-subtle'
                      : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Places List */}
            <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1 sticky top-0 bg-stone-50/90 dark:bg-stone-900/90 py-1 z-10 backdrop-blur-xs">
                <span>Campus Places</span>
                <span className="bg-stone-200 dark:bg-stone-800 px-1.5 py-0.2 rounded">{filteredPlaces.length}</span>
              </div>

              {filteredPlaces.map((b) => {
                const isSelected = selectedLat === b.lat && selectedLng === b.lng;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectPlace(b)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-start space-x-2 border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-subtle'
                        : 'bg-white dark:bg-stone-800/90 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 shadow-xs" style={{ background: b.color || '#0071E3' }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{b.name}</div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-stone-400'}`}>
                        {b.categoryLabel}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Right Column: Satellite/Street Map Canvas */}
          <div className={`flex-1 flex-col relative bg-stone-950 min-h-0 ${
            mobileView === 'map' ? 'flex' : 'hidden md:flex'
          }`}>
            
            <div className="flex-1 relative w-full h-full min-h-[300px]">
              <MapContainer
                center={[selectedLat, selectedLng]}
                zoom={18}
                minZoom={13}
                maxZoom={19}
                scrollWheelZoom={true}
                className="w-full h-full absolute inset-0 z-0"
                style={{ width: '100%', height: '100%', minHeight: '100%' }}
              >
                <MapResizeFix activeTab={mobileView} />
                <FlyToCoords coords={flyTarget} />
                <LocationPickerEvents onPick={handleMapClick} />

                {/* Base Tile Layer: Satellite vs Street */}
                {mapLayerType === 'satellite' ? (
                  <>
                    <TileLayer
                      attribution='&copy; Esri World Imagery'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      maxZoom={19}
                    />
                    <TileLayer
                      attribution='&copy; CartoDB'
                      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
                      maxZoom={19}
                    />
                  </>
                ) : (
                  <TileLayer
                    attribution='&copy; OpenStreetMap & CartoDB'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    maxZoom={19}
                  />
                )}

                {/* Point markers and labels only; no rectangular area overlays. */}
                {showPlaces && filteredPlaces.map((place) => {
                  const isMajor = MAJOR_LANDMARK_IDS.has(place.id);

                  return (
                    <Marker
                      key={place.id}
                      position={[place.lat, place.lng]}
                      icon={createPickerBuildingDot(place.color)}
                      eventHandlers={{
                        click: () => handleSelectPlace(place),
                      }}
                    >
                      <Tooltip
                        permanent={isMajor}
                        direction="top"
                        offset={[0, -8]}
                        className="custom-clean-map-tooltip"
                      >
                        <span className="font-sans font-bold text-[11px] text-white">
                          {place.name}
                        </span>
                      </Tooltip>
                    </Marker>
                  );
                })}

                {/* Selected Pinpoint Marker */}
                <Marker
                  position={[selectedLat, selectedLng]}
                  icon={pickerPinIcon}
                />

              </MapContainer>

              {/* Floating Instructions Banner */}
              <div className="absolute top-3 left-3 bg-stone-950/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs flex items-center space-x-2 shadow-modal pointer-events-none z-[1000] border border-white/10 max-w-[70vw] sm:max-w-none">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate text-[11px]">Tap map to drop pin or click building dot</span>
              </div>

              {/* Top Controls Toolbar */}
              <div className="absolute top-3 right-3 flex items-center space-x-1.5 z-[1000]">
                {/* GPS Auto Detect */}
                <button
                  type="button"
                  onClick={handleAutoGPS}
                  disabled={isGpsLoading}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/90 dark:bg-stone-900/90 text-stone-800 dark:text-white border border-stone-200 dark:border-stone-700 shadow-modal hover:bg-white flex items-center space-x-1 transition-all"
                  title="Snap to your GPS"
                >
                  <Navigation className={`w-3.5 h-3.5 text-indigo-500 ${isGpsLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Auto GPS</span>
                </button>

                {/* Satellite / Street Switcher */}
                <button
                  type="button"
                  onClick={() => setMapLayerType(mapLayerType === 'satellite' ? 'streets' : 'satellite')}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/90 dark:bg-stone-900/90 text-stone-800 dark:text-white border border-stone-200 dark:border-stone-700 shadow-modal hover:bg-white flex items-center space-x-1 transition-all"
                >
                  <Satellite className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">{mapLayerType === 'satellite' ? 'Satellite' : 'Street'}</span>
                </button>

                {/* Campus Point Markers Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPlaces(!showPlaces)}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold shadow-modal border transition-all flex items-center space-x-1 ${
                    showPlaces
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-white/90 dark:bg-stone-900/90 text-stone-800 dark:text-white border-stone-200 dark:border-stone-700'
                  }`}
                  title="Toggle campus place markers"
                  aria-pressed={showPlaces}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">50 Places</span>
                </button>
              </div>

              {/* Mobile Coordinate Chip */}
              <div className="absolute bottom-3 left-3 bg-stone-950/80 backdrop-blur-md text-stone-300 px-2.5 py-1 rounded-lg text-[10px] font-mono z-[1000] border border-white/10">
                {selectedLat.toFixed(5)}° N, {selectedLng.toFixed(5)}° E
              </div>

            </div>

          </div>

        </div>

        {/* Bottom Confirmation Bar */}
        <div className="p-3 sm:p-4 bg-stone-50 dark:bg-stone-800/95 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 z-10">
          <div className="w-full sm:w-auto flex-1 min-w-0">
            <div className="flex items-center space-x-1.5 mb-1">
              <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
              <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 truncate">
                Selected Spot / Campus Location:
              </label>
            </div>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. Main Gate, Central Library, Cricket Ground"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl font-bold hover:bg-stone-300 text-xs transition-all flex-1 sm:flex-initial"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold shadow-subtle flex items-center justify-center space-x-1.5 text-xs transition-all flex-1 sm:flex-initial"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
