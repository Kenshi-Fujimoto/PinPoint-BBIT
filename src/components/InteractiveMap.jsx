import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  Flame, 
  Navigation, 
  ExternalLink,
  Layers,
  Satellite,
  Building2,
  AlertTriangle,
  HeartHandshake,
  Crosshair,
  Search,
  SlidersHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  BBIT_CAMPUS_PLACES, 
  BBIT_MAP_CENTER, 
  BBIT_MAP_ZOOM, 
  BBIT_WEBSITE_URL 
} from '../types';

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

// Map Mouse Inspector to display live Lat/Lng
function MapCoordinateInspector({ onMove, onZoomChange }) {
  const map = useMapEvents({
    mousemove(e) {
      onMove(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
    },
    zoomend() {
      onZoomChange(map.getZoom());
    }
  });
  return null;
}

// Minimal Clean Dot Marker for Places
function createMinimalDotIcon(color = '#0071E3', isMajor = false) {
  const size = isMajor ? 12 : 8;
  return L.divIcon({
    className: 'custom-dot-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: ${size + 8}px; height: ${size + 8}px; cursor: pointer;">
        <div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color}; border: 2px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.6); transition: transform 0.15s ease;"></div>
      </div>
    `,
    iconSize: [size + 8, size + 8],
    iconAnchor: [(size + 8) / 2, (size + 8) / 2],
    popupAnchor: [0, -((size + 8) / 2)],
  });
}

// Custom Satellite Civic & Lost Pins with Cluster Badge support
function createSatelliteCivicIcon(category, isResolved, urgency, clusterCount = 1, clusterIndex = 0) {
  const isUrgent = urgency >= 30;
  const bg = isResolved 
    ? 'linear-gradient(135deg, #34C759, #2DAE4E)' 
    : isUrgent 
    ? 'linear-gradient(135deg, #FF9500, #E08200)' 
    : 'linear-gradient(135deg, #FF9500, #B86800)';
  
  const shadowColor = isResolved ? 'rgba(16, 185, 129, 0.6)' : isUrgent ? 'rgba(249, 115, 22, 0.7)' : 'rgba(245, 158, 11, 0.6)';
  const emoji = category === 'pothole' ? '🕳️' : category === 'streetlight' ? '💡' : category === 'water_leak' ? '💧' : '⚠️';

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;">
        ${isUrgent && !isResolved ? `
          <div style="position: absolute; inset: -4px; border-radius: 12px; background: rgba(249, 115, 22, 0.5); animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
        ` : ''}
        <div style="width: 32px; height: 32px; border-radius: 10px; background: ${bg}; border: 2px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px ${shadowColor}; font-size: 15px; cursor: pointer; transform: translateZ(0); transition: transform 0.15s ease; position: relative;">
          ${emoji}
          ${clusterCount > 1 ? `
            <span style="position: absolute; top: -6px; right: -6px; background: #0058B8; color: #FFFFFF; border: 1.5px solid #FFFFFF; font-size: 9px; font-weight: 800; border-radius: 9999px; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">
              ${clusterIndex + 1}
            </span>
          ` : ''}
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
}

function createSatelliteLostFoundIcon(type, isReunited, clusterCount = 1, clusterIndex = 0) {
  const isLost = type === 'lost';
  const bg = isReunited 
    ? 'linear-gradient(135deg, #34C759, #2DAE4E)' 
    : isLost 
    ? 'linear-gradient(135deg, #FF2D55, #E02549)' 
    : 'linear-gradient(135deg, #32ADE6, #0091D5)';
  
  const shadowColor = isReunited ? 'rgba(16, 185, 129, 0.6)' : isLost ? 'rgba(236, 72, 153, 0.6)' : 'rgba(14, 165, 233, 0.6)';
  const emoji = isReunited ? '🎉' : isLost ? '🔍' : '📦';

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
        <div style="width: 30px; height: 30px; border-radius: 10px; background: ${bg}; border: 2px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px ${shadowColor}; font-size: 14px; cursor: pointer; position: relative;">
          ${emoji}
          ${clusterCount > 1 ? `
            <span style="position: absolute; top: -6px; right: -6px; background: #0058B8; color: #FFFFFF; border: 1.5px solid #FFFFFF; font-size: 9px; font-weight: 800; border-radius: 9999px; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">
              ${clusterIndex + 1}
            </span>
          ` : ''}
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

// Compute dispersed coordinate offsets so multiple pins at the exact same location are visibly distinct
function computeDispersedPositions(civicList, lostFoundList) {
  const allItems = [];
  (civicList || []).forEach(c => {
    if (c.location?.lat && c.location?.lng) {
      allItems.push({ id: c.id, lat: Number(c.location.lat), lng: Number(c.location.lng), raw: c, type: 'civic' });
    }
  });
  (lostFoundList || []).forEach(lf => {
    if (lf.location?.lat && lf.location?.lng) {
      allItems.push({ id: lf.id, lat: Number(lf.location.lat), lng: Number(lf.location.lng), raw: lf, type: 'lostfound' });
    }
  });

  const clusters = [];
  allItems.forEach(item => {
    const match = clusters.find(cl => {
      const dLat = Math.abs(cl.lat - item.lat);
      const dLng = Math.abs(cl.lng - item.lng);
      return dLat < 0.00012 && dLng < 0.00012; // within ~12m
    });

    if (match) {
      match.items.push(item);
    } else {
      clusters.push({ lat: item.lat, lng: item.lng, items: [item] });
    }
  });

  const positionMap = new Map();

  clusters.forEach(cl => {
    if (cl.items.length === 1) {
      const it = cl.items[0];
      positionMap.set(it.id, {
        lat: it.lat,
        lng: it.lng,
        clusterCount: 1,
        clusterIndex: 0,
      });
    } else {
      // Disperse multiple markers in a neat radial circle around center landmark (~14m radius)
      const radius = 0.00014;
      cl.items.forEach((it, idx) => {
        const angle = (2 * Math.PI * idx) / cl.items.length - Math.PI / 2;
        const latOffset = Math.sin(angle) * radius;
        const lngOffset = Math.cos(angle) * (radius * 1.08);
        positionMap.set(it.id, {
          lat: it.lat + latOffset,
          lng: it.lng + lngOffset,
          clusterCount: cl.items.length,
          clusterIndex: idx,
        });
      });
    }
  });

  return positionMap;
}

function MapFlyTo({ targetCoords }) {
  const map = useMap();
  React.useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, 18.5, { duration: 1.2 });
    }
  }, [targetCoords, map]);
  return null;
}

export default function InteractiveMap({ 
  civicIssues = [], 
  lostFoundItems = [], 
  onSelectCivicIssue, 
  onSelectLostFound,
  isDark 
}) {
  const [mapEngine, setMapEngine] = useState('pins'); // 'pins' or 'bbit_wiki'
  const [showCivic, setShowCivic] = useState(true);
  const [showLost, setShowLost] = useState(true);
  const [showFound, setShowFound] = useState(true);
  const [showPlaces, setShowPlaces] = useState(true);
  const [labelDensity, setLabelDensity] = useState('major'); // 'none', 'major', 'all'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentZoom, setCurrentZoom] = useState(17);
  const [flyCoords, setFlyCoords] = useState(null);
  const [hoverCoords, setHoverCoords] = useState({ lat: '22.458900', lng: '88.169500' });
  const [userLocation, setUserLocation] = useState(null);
  const [isGpsLocating, setIsGpsLocating] = useState(false);

  const handleLocateMe = () => {
    setIsGpsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          setUserLocation([lat, lng]);
          setFlyCoords([lat, lng]);
          setIsGpsLocating(false);
        },
        (err) => {
          console.warn('GPS locate error:', err);
          setIsGpsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setIsGpsLocating(false);
    }
  };

  const activeCivicCount = civicIssues.length;
  const activeLostCount = lostFoundItems.filter(i => i.type === 'lost').length;
  const activeFoundCount = lostFoundItems.filter(i => i.type === 'found').length;

  // Calculate radial dispersed positions for pins sharing identical or near-identical coordinates
  const dispersedMap = useMemo(() => {
    return computeDispersedPositions(civicIssues, lostFoundItems);
  }, [civicIssues, lostFoundItems]);

  // Categories list for chips
  const categoriesList = [
    { id: 'all', label: 'All Places' },
    { id: 'academic', label: 'Academic & Labs' },
    { id: 'hostel', label: 'Hostels' },
    { id: 'canteen', label: 'Canteens & Food' },
    { id: 'sports', label: 'Sports & Grounds' },
    { id: 'admin', label: 'Admin & Offices' },
    { id: 'landmark', label: 'Gates & Landmarks' },
  ];

  // Filter 50 surveyed places
  const filteredPlaces = useMemo(() => {
    return BBIT_CAMPUS_PLACES.filter(p => {
      const matchCat = selectedCategory === 'all' || 
        (selectedCategory === 'canteen' && (p.category === 'canteen' || p.category === 'mess' || p.category === 'tea' || p.category === 'food')) ||
        (selectedCategory === 'sports' && (p.category === 'sports' || p.category === 'gym' || p.category === 'green')) ||
        p.category === selectedCategory;

      const matchSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.categoryLabel.toLowerCase().includes(searchTerm.toLowerCase());

      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchTerm]);

  return (
    <div className="space-y-4 pb-16">
      
      {/* Top Header & Engine Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
              BBIT Live Campus Map
            </h1>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{filteredPlaces.length} Verified Spots</span>
            </span>
          </div>
          <p className="text-stone-500 dark:text-stone-400 text-xs sm:text-sm mt-0.5">
            Geotagged infrastructure hazards, potholes, and lost items over clean satellite aerial imagery.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl text-xs font-medium border border-stone-200/80 dark:border-stone-700">
            <button
              onClick={() => setMapEngine('pins')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                mapEngine === 'pins' 
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-subtle font-bold' 
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Satellite className="w-3.5 h-3.5 text-sky-500" />
              <span>Satellite Pins View</span>
            </button>

            <button
              onClick={() => setMapEngine('bbit_wiki')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                mapEngine === 'bbit_wiki' 
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-subtle font-bold' 
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span>www.bbit.edu.in</span>
            </button>
          </div>

          <a
            href={BBIT_WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-stone-700 transition-all shadow-subtle"
            title="Open www.bbit.edu.in in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {mapEngine === 'pins' ? (
        <>
          {/* Controls Bar: Issue Filters, Label Density, and Category Chips */}
          <div className="bg-white dark:bg-stone-900 p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-card space-y-2.5">
            
            {/* Top Row: Main Toggle Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
              
              {/* Primary Layers */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setShowCivic(!showCivic)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all flex items-center space-x-1.5 ${
                    showCivic 
                      ? 'bg-amber-500 text-white border-amber-600 shadow-glow-amber' 
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Civic Hazards ({activeCivicCount})</span>
                </button>

                <button
                  onClick={() => setShowLost(!showLost)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all flex items-center space-x-1.5 ${
                    showLost 
                      ? 'bg-pink-600 text-white border-pink-700 shadow-subtle' 
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Lost ({activeLostCount})</span>
                </button>

                <button
                  onClick={() => setShowFound(!showFound)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all flex items-center space-x-1.5 ${
                    showFound 
                      ? 'bg-sky-600 text-white border-sky-700 shadow-subtle' 
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <span>📦 Found ({activeFoundCount})</span>
                </button>

                <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-1 hidden sm:block" />

                {/* Places Layer Toggle */}
                <button
                  onClick={() => setShowPlaces(!showPlaces)}
                  className={`px-3 py-1.5 rounded-xl font-semibold border transition-all flex items-center space-x-1.5 ${
                    showPlaces
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-transparent shadow-subtle font-bold'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Campus Places ({filteredPlaces.length})</span>
                </button>
              </div>

              {/* Right Side: Label Density Control + Search */}
              <div className="flex items-center gap-2">
                {showPlaces && (
                  <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl text-[11px] font-semibold border border-stone-200 dark:border-stone-700">
                    <span className="text-stone-400 px-2">Labels:</span>
                    <button
                      onClick={() => setLabelDensity('major')}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        labelDensity === 'major'
                          ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-subtle font-bold'
                          : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
                      }`}
                      title="Only show labels for major landmarks to avoid clutter"
                    >
                      Major Only
                    </button>
                    <button
                      onClick={() => setLabelDensity('none')}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        labelDensity === 'none'
                          ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-subtle font-bold'
                          : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
                      }`}
                      title="Show clean dots only without text tags (hover to view)"
                    >
                      Clean Dots
                    </button>
                    <button
                      onClick={() => setLabelDensity('all')}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        labelDensity === 'all'
                          ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-subtle font-bold'
                          : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
                      }`}
                      title="Show text labels on all places"
                    >
                      All Labels
                    </button>
                  </div>
                )}

                {/* Place Search */}
                <div className="relative min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search places..."
                    className="w-full pl-8 pr-3 py-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

            </div>

            {/* Bottom Row: Category Filter Chips */}
            {showPlaces && (
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs border-t border-stone-100 dark:border-stone-800 pt-2">
                <span className="text-stone-400 font-bold text-[11px] shrink-0 mr-1">Filter:</span>
                {categoriesList.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all border ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-subtle font-bold'
                        : 'bg-stone-50 dark:bg-stone-800/70 text-stone-600 dark:text-stone-400 border-stone-200/80 dark:border-stone-700/80 hover:bg-stone-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* Leaflet Satellite Map Container */}
          <div className="w-full h-[620px] rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-card-dark relative">
            <MapContainer
              center={BBIT_MAP_CENTER}
              zoom={BBIT_MAP_ZOOM}
              maxZoom={19}
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              {/* Esri World Imagery - High-Resolution Aerial Satellite */}
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, BBIT'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              
              {/* CartoDB Road & Building Labels */}
              <TileLayer
                attribution='&copy; CartoDB & OpenStreetMap'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
                maxZoom={19}
              />

              <MapFlyTo targetCoords={flyCoords} />
              <MapCoordinateInspector 
                onMove={(lat, lng) => setHoverCoords({ lat, lng })}
                onZoomChange={(z) => setCurrentZoom(z)}
              />

              {/* Campus locations use point markers only to keep the imagery clear. */}
              {showPlaces && filteredPlaces.map((place) => {
                const isMajor = MAJOR_LANDMARK_IDS.has(place.id);
                const showPermanentLabel = labelDensity === 'all' || (labelDensity === 'major' && isMajor) || (currentZoom >= 19);

                return (
                  <Marker
                    key={place.id}
                    position={[place.lat, place.lng]}
                    icon={createMinimalDotIcon(place.color, isMajor)}
                  >
                    {/* Tooltip for clean label preview on hover / permanent on major */}
                    <Tooltip
                      permanent={showPermanentLabel}
                      direction="top"
                      offset={[0, -8]}
                      className="custom-clean-map-tooltip"
                    >
                      <span className="font-sans font-bold text-[11px] text-white tracking-wide">
                        {place.name}
                      </span>
                    </Tooltip>

                    <Popup>
                      <div className="p-3.5 text-stone-900 dark:text-white text-xs font-sans space-y-1.5 max-w-xs bg-white dark:bg-stone-900 rounded-2xl shadow-card">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[10px] uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                            {place.categoryLabel}
                          </span>
                          <span className="font-mono text-stone-400 text-[10px]">{place.id}</span>
                        </div>

                        <h4 className="font-bold text-sm leading-snug text-stone-900 dark:text-white">{place.name}</h4>
                        {place.details && (
                          <p className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed">{place.details}</p>
                        )}

                        <div className="pt-1 text-[11px] text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-stone-800">
                          📍 {place.lat.toFixed(6)}° N, {place.lng.toFixed(6)}° E
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* User Civic Hazard Pins */}
              {showCivic && civicIssues.map((issue) => {
                if (!issue.location?.lat || !issue.location?.lng) return null;
                const pos = dispersedMap.get(issue.id) || {
                  lat: Number(issue.location.lat),
                  lng: Number(issue.location.lng),
                  clusterCount: 1,
                  clusterIndex: 0
                };
                const icon = createSatelliteCivicIcon(
                  issue.category, 
                  issue.status === 'resolved', 
                  issue.urgencyUpvotes,
                  pos.clusterCount,
                  pos.clusterIndex
                );

                return (
                  <Marker
                    key={issue.id}
                    position={[pos.lat, pos.lng]}
                    icon={icon}
                  >
                    <Popup>
                      <div className="p-3.5 max-w-xs space-y-2 text-stone-900 font-sans text-xs bg-white dark:bg-stone-900 dark:text-white rounded-2xl shadow-card">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {issue.category.replace('_', ' ')}
                          </span>
                          {pos.clusterCount > 1 ? (
                            <span className="font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                              Report {pos.clusterIndex + 1} of {pos.clusterCount}
                            </span>
                          ) : (
                            <span className="font-semibold text-stone-500 dark:text-stone-400 capitalize">
                              {issue.status}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs leading-snug text-stone-900 dark:text-white">
                          {issue.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800">
                          <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-0.5">
                            <Flame className="w-3 h-3 fill-current" />
                            <span>{issue.urgencyUpvotes} Votes</span>
                          </span>
                          <span className="truncate max-w-[140px]">📍 {issue.location?.name}</span>
                        </div>

                        <button
                          onClick={() => onSelectCivicIssue(issue)}
                          className="w-full mt-1.5 py-1.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl font-bold text-center hover:opacity-90 transition-all shadow-subtle"
                        >
                          View Issue Details ➔
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* User Lost & Found Pins */}
              {lostFoundItems.map((item) => {
                if (!item.location?.lat || !item.location?.lng) return null;
                if (item.type === 'lost' && !showLost) return null;
                if (item.type === 'found' && !showFound) return null;

                const pos = dispersedMap.get(item.id) || {
                  lat: Number(item.location.lat),
                  lng: Number(item.location.lng),
                  clusterCount: 1,
                  clusterIndex: 0
                };
                const icon = createSatelliteLostFoundIcon(
                  item.type, 
                  item.status === 'reunited',
                  pos.clusterCount,
                  pos.clusterIndex
                );

                return (
                  <Marker
                    key={item.id}
                    position={[pos.lat, pos.lng]}
                    icon={icon}
                  >
                    <Popup>
                      <div className="p-3.5 max-w-xs space-y-2 text-stone-900 font-sans text-xs bg-white dark:bg-stone-900 dark:text-white rounded-2xl shadow-card">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold px-2 py-0.5 rounded ${
                            item.status === 'reunited' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            item.type === 'lost' ? 'bg-pink-50 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300' :
                            'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                          }`}>
                            {item.status === 'reunited' ? 'REUNITED 🎉' : item.type.toUpperCase()}
                          </span>
                          {pos.clusterCount > 1 ? (
                            <span className="font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                              Item {pos.clusterIndex + 1} of {pos.clusterCount}
                            </span>
                          ) : (
                            <span className="capitalize text-stone-500 dark:text-stone-400">{item.category}</span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs leading-snug text-stone-900 dark:text-white">
                          {item.title}
                        </h4>

                        <div className="text-[11px] text-stone-500 dark:text-stone-400">
                          📍 {item.locationName}
                        </div>

                        <button
                          onClick={() => onSelectLostFound(item)}
                          className="w-full mt-1.5 py-1.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl font-bold text-center hover:opacity-90 transition-all shadow-subtle"
                        >
                          Inspect Item ➔
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Live User GPS Location Pin */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={L.divIcon({
                    className: 'live-user-gps-pin',
                    html: `
                      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
                        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                        <div style="width: 16px; height: 16px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 0 10px rgba(37, 99, 235, 0.8);"></div>
                      </div>
                    `,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                  })}
                >
                  <Tooltip permanent direction="top" className="custom-clean-map-tooltip">
                    <span>📍 Your Live Location</span>
                  </Tooltip>
                </Marker>
              )}

            </MapContainer>

            {/* Floating Auto-Locate Button */}
            <div className="absolute top-3 right-3 z-[1000]">
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isGpsLocating}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/90 dark:bg-stone-900/90 text-stone-800 dark:text-white border border-stone-200 dark:border-stone-700 shadow-modal hover:bg-white flex items-center space-x-1.5 transition-all"
              >
                <Navigation className={`w-3.5 h-3.5 text-blue-500 ${isGpsLocating ? 'animate-spin' : ''}`} />
                <span>{isGpsLocating ? 'Locating...' : 'My Live GPS'}</span>
              </button>
            </div>

            {/* Live Cursor Coordinate HUD */}
            <div className="absolute bottom-3 left-3 bg-stone-950/85 backdrop-blur-md border border-stone-700/80 text-white px-3 py-1.5 rounded-xl text-[11px] font-mono flex items-center space-x-2 shadow-card-dark pointer-events-none z-[1000]">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              <span>{hoverCoords.lat}° N, {hoverCoords.lng}° E</span>
            </div>

          </div>
        </>
      ) : (
        /* www.bbit.edu.in Live Web Frame */
        <div className="w-full h-[640px] rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-card-dark bg-stone-950 relative">
          <iframe
            src={BBIT_WEBSITE_URL}
            title="BBIT Campus Map (www.bbit.edu.in)"
            className="w-full h-full border-0"
            allow="geolocation"
          />
        </div>
      )}

    </div>
  );
}
