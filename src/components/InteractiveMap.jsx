/**
 * InteractiveMap — the BBIT campus map surface
 * ---------------------------------------------------------------------------
 * Renders the surveyed campus (boundary, road network, greens, water, gates
 * and 50 curated places with real footprints traced over satellite imagery)
 * in three switchable engines:
 *
 *   • Satellite — Esri World Imagery + vector campus overlay
 *   • Layout    — clean vector master-plan rendering (no imagery)
 *   • Website   — embedded www.bbit.edu.in for cross-checking
 */
import React, { useState, useMemo } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Tooltip, Polygon, Polyline, ScaleControl, useMap, useMapEvents, Pane,
} from 'react-leaflet';
import {
  MapPin, Flame, Navigation, ExternalLink, Layers, Satellite, Building2, AlertTriangle,
  HeartHandshake, Crosshair, Search, Compass, Palette, Info, Ruler, Locate,
} from 'lucide-react';
import {
  CAMPUS_LAYOUT, placesWithGeometry, placeCategories, searchPlaces, nearestPlace,
} from '../lib/campusData';
import {
  CampusBoundary, CampusGreens, CampusWater, CampusRoads, CampusGates, PlaceFootprints, MAP_THEMES,
  CampusParking, CampusTrees, CampusStructures,
} from './map/CampusLayers';
import { createCivicIcon, createLostFoundIcon, computeDispersedPositions, liveGpsIcon, createPlaceDot } from './map/mapIcons';
import { BBIT_MAP_CENTER, BBIT_MAP_ZOOM, BBIT_CAMPUS_BOUNDS, BBIT_WEBSITE_URL } from '../types';
import { formatArea, formatLatLng, pathLengthM } from '../lib/geo';

const ESRI_IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const CARTO_LABELS = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png';
const OSM_STREETS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/* --------------------------------------------------------------- map helpers */

function MapEvents({ onMove, onZoom, onPick }) {
  const map = useMapEvents({
    mousemove(e) {
      onMove(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
    },
    zoomend() {
      onZoom(map.getZoom());
    },
    moveend() {
      onZoom(map.getZoom());
    },
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapFlyTo({ target }) {
  const map = useMap();
  React.useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 18), { duration: 0.9 });
  }, [target, map]);
  return null;
}

function ResizeFix({ trigger }) {
  const map = useMap();
  React.useEffect(() => {
    map.invalidateSize();
    const timers = [120, 350, 700].map((ms) => setTimeout(() => map.invalidateSize(), ms));
    return () => timers.forEach(clearTimeout);
  }, [map, trigger]);
  return null;
}

/* --------------------------------------------------------------- sub-panels */

function StatPill({ icon: Icon, label, value, tone = 'stone' }) {
  const tones = {
    stone: 'text-stone-600 dark:text-stone-300',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
  };
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
      <Icon className={`w-3.5 h-3.5 ${tones[tone]}`} />
      <span className="text-stone-400 font-medium">{label}</span>
      <span className="text-stone-800 dark:text-stone-100">{value}</span>
    </div>
  );
}

function CategoryLegend({ categories, activeCategory, onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(activeCategory === cat.id ? 'all' : cat.id)}
          className={`group inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10.5px] font-semibold transition-all ${
            activeCategory === cat.id
              ? 'border-transparent text-white shadow-subtle'
              : 'border-stone-200/80 dark:border-stone-700/80 text-stone-600 dark:text-stone-300 hover:border-stone-300 bg-white/70 dark:bg-stone-800/60'
          }`}
          style={activeCategory === cat.id ? { background: cat.color } : undefined}
        >
          <span className="w-2 h-2 rounded-sm" style={{ background: activeCategory === cat.id ? '#fff' : cat.color }} />
          {cat.label}
          <span className={activeCategory === cat.id ? 'text-white/80' : 'text-stone-400'}>{cat.count}</span>
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- main export */

export default function InteractiveMap({
  civicIssues = [],
  lostFoundItems = [],
  onSelectCivicIssue,
  onSelectLostFound,
  isDark,
}) {
  const [mapEngine, setMapEngine] = useState('satellite'); // satellite | layout | website
  const [showCivic, setShowCivic] = useState(true);
  const [showLost, setShowLost] = useState(true);
  const [showFound, setShowFound] = useState(true);
  const [showPlaces, setShowPlaces] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [showGreens, setShowGreens] = useState(true);
  const [labelMode, setLabelMode] = useState('major'); // none | major | all
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentZoom, setCurrentZoom] = useState(BBIT_MAP_ZOOM);
  const [flyCoords, setFlyCoords] = useState(null);
  const [probe, setProbe] = useState(null);
  const [hoverCoords, setHoverCoords] = useState({ lat: '22.458900', lng: '88.169500' });
  const [userLocation, setUserLocation] = useState(null);
  const [isGpsLocating, setIsGpsLocating] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

  const theme = MAP_THEMES[mapEngine === 'layout' ? 'plan' : 'satellite'];
  const variant = mapEngine === 'layout' ? 'plan' : 'satellite';

  const categories = useMemo(() => placeCategories(), []);
  const visiblePlaces = useMemo(() => searchPlaces(searchTerm, selectedCategory), [searchTerm, selectedCategory]);
  const dispersedMap = useMemo(() => computeDispersedPositions(civicIssues, lostFoundItems), [civicIssues, lostFoundItems]);

  const activeCivicCount = civicIssues.length;
  const activeLostCount = lostFoundItems.filter((i) => i.type === 'lost').length;
  const activeFoundCount = lostFoundItems.filter((i) => i.type === 'found').length;

  const stats = useMemo(() => {
    const roadLength = CAMPUS_LAYOUT.roads.reduce((sum, r) => sum + pathLengthM(r.path), 0);
    const builtArea = placesWithGeometry.reduce((sum, p) => sum + (p.areaM2 || 0), 0);
    return {
      places: placesWithGeometry.length,
      roadKm: roadLength / 1000,
      builtArea,
      gates: CAMPUS_LAYOUT.gates.length,
    };
  }, []);

  const handleLocateMe = () => {
    setIsGpsLocating(true);
    if (!('geolocation' in navigator)) return setIsGpsLocating(false);
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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleMapPick = (lat, lng) => {
    const { place, distanceM } = nearestPlace(lat, lng);
    setProbe({ lat, lng, place, distanceM });
  };

  const jumpToPlace = (place) => {
    setFlyCoords([place.centroid[0], place.centroid[1]]);
    setProbe(null);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (visiblePlaces.length > 0) jumpToPlace(visiblePlaces[0]);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* ------------------------------------------------------------ header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 pt-2">
        <div>
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
              BBIT Campus Map
            </h1>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {stats.places} surveyed places
            </span>
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 px-2.5 py-0.5 rounded-full">
              Traced over Esri World Imagery
            </span>
          </div>
          <p className="text-stone-500 dark:text-stone-400 text-xs sm:text-sm mt-1">
            Real footprints, roads and greens of the Budge Budge Institute of Technology campus — with live civic
            hazards and lost-and-found pins on top.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl text-xs font-medium border border-stone-200/80 dark:border-stone-700">
            {[
              { id: 'satellite', label: 'Satellite', icon: Satellite, tone: 'text-sky-500' },
              { id: 'layout', label: 'Campus layout', icon: Palette, tone: 'text-emerald-500' },
              { id: 'website', label: 'bbit.edu.in', icon: Layers, tone: 'text-indigo-500' },
            ].map(({ id, label, icon: Icon, tone }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMapEngine(id)}
                className={`px-3 py-1.5 rounded-lg transition-all inline-flex items-center gap-1.5 ${
                  mapEngine === id
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-subtle font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tone}`} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <a
            href={BBIT_WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-all shadow-subtle"
            title="Open www.bbit.edu.in"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {mapEngine !== 'website' ? (
        <>
          {/* -------------------------------------------------- control deck */}
          <div className="bg-white dark:bg-stone-900 p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-card space-y-2.5">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowCivic(!showCivic)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all inline-flex items-center gap-1.5 ${
                    showCivic
                      ? 'bg-amber-500 text-white border-amber-600 shadow-glow-amber'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Civic hazards ({activeCivicCount})
                </button>

                <button
                  type="button"
                  onClick={() => setShowLost(!showLost)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all inline-flex items-center gap-1.5 ${
                    showLost
                      ? 'bg-pink-600 text-white border-pink-700'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  Lost ({activeLostCount})
                </button>

                <button
                  type="button"
                  onClick={() => setShowFound(!showFound)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all inline-flex items-center gap-1.5 ${
                    showFound
                      ? 'bg-sky-600 text-white border-sky-700'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  📦 Found ({activeFoundCount})
                </button>

                <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-1 hidden sm:block" />

                <button
                  type="button"
                  onClick={() => setShowPlaces(!showPlaces)}
                  className={`px-3 py-1.5 rounded-xl font-semibold border transition-all inline-flex items-center gap-1.5 ${
                    showPlaces
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-transparent font-bold'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  Campus places ({visiblePlaces.length})
                </button>

                <button
                  type="button"
                  onClick={() => setShowRoads(!showRoads)}
                  className={`px-3 py-1.5 rounded-xl font-semibold border transition-all inline-flex items-center gap-1.5 ${
                    showRoads
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <Ruler className="w-3.5 h-3.5" />
                  Roads ({CAMPUS_LAYOUT.roads.length})
                </button>

                <button
                  type="button"
                  onClick={() => setShowGreens(!showGreens)}
                  className={`px-3 py-1.5 rounded-xl font-semibold border transition-all inline-flex items-center gap-1.5 ${
                    showGreens
                      ? 'bg-lime-600 text-white border-lime-700'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  🌳 Greens
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {showPlaces && (
                  <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl text-[11px] font-semibold border border-stone-200 dark:border-stone-700">
                    <span className="text-stone-400 px-2">Labels</span>
                    {[
                      { id: 'major', label: 'Key' },
                      { id: 'none', label: 'Dots' },
                      { id: 'all', label: 'All' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setLabelMode(opt.id)}
                        className={`px-2 py-1 rounded-lg transition-all ${
                          labelMode === opt.id
                            ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-subtle font-bold'
                            : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSearchSubmit} className="relative min-w-[190px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search 50 campus places…"
                    className="w-full pl-8 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </form>

                <button
                  type="button"
                  onClick={() => setShowLegend(!showLegend)}
                  className={`p-1.5 rounded-xl border transition-all ${
                    showLegend
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-transparent'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-500 border-stone-200 dark:border-stone-700'
                  }`}
                  title="Toggle legend"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar text-xs border-t border-stone-100 dark:border-stone-800 pt-2">
              <CategoryLegend
                categories={categories}
                activeCategory={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </div>
          </div>

          {/* --------------------------------------------------------- the map */}
          <div className="w-full h-[640px] rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-card-dark relative">
            <MapContainer
              center={BBIT_MAP_CENTER}
              zoom={BBIT_MAP_ZOOM}
              minZoom={14}
              maxZoom={19}
              maxBounds={[[22.4500, 88.1560], [22.4690, 88.1820]]}
              maxBoundsViscosity={0.6}
              scrollWheelZoom
              className="w-full h-full"
            >
              {mapEngine === 'satellite' ? (
                <>
                  <TileLayer
                    attribution='Imagery &copy; <a href="https://www.esri.com/">Esri</a> · Maxar · Earthstar Geographics'
                    url={ESRI_IMAGERY}
                    maxZoom={19}
                  />
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a> · OpenStreetMap contributors'
                    url={CARTO_LABELS}
                    maxZoom={19}
                    opacity={0.85}
                  />
                </>
              ) : (
                <>
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url={OSM_STREETS}
                    maxZoom={19}
                    opacity={0.22}
                  />
                  <Polygon
                    positions={CAMPUS_LAYOUT.boundary}
                    pathOptions={{ color: 'transparent', fill: true, fillColor: '#F8FAFC', fillOpacity: 0.97, weight: 0 }}
                  />
                </>
              )}

              <ScaleControl position="bottomright" imperial={false} />
              <ResizeFix trigger={mapEngine} />
              <MapFlyTo target={flyCoords} />
              <MapEvents
                onMove={(lat, lng) => setHoverCoords({ lat, lng })}
                onZoom={setCurrentZoom}
                onPick={handleMapPick}
              />

              <CampusGreens theme={theme} zoom={currentZoom} show={showGreens} />
              <CampusWater theme={theme} zoom={currentZoom} show={showGreens} />
              <CampusTrees theme={theme} zoom={currentZoom} show={showGreens} />
              <CampusRoads theme={theme} zoom={currentZoom} variant={variant} show={showRoads} />
              <CampusParking theme={theme} zoom={currentZoom} show={showRoads} />
              <CampusStructures theme={theme} zoom={currentZoom} />
              <CampusBoundary theme={theme} zoom={currentZoom} />
              <CampusGates theme={theme} zoom={currentZoom} />

              {showPlaces && (
                <PlaceFootprints
                  places={visiblePlaces}
                  theme={theme}
                  variant={variant}
                  zoom={currentZoom}
                  mode={labelMode}
                  highlightId={probe?.place?.id}
                />
              )}

              {/* Place dots keep small features clickable above the footprints */}
              {showPlaces && currentZoom < 17 && visiblePlaces.map((place) => (
                <Marker
                  key={`dot-${place.id}`}
                  position={place.centroid}
                  icon={createPlaceDot(place.color, place.major)}
                  eventHandlers={{ click: () => jumpToPlace(place) }}
                >
                  <Tooltip direction="top" offset={[0, -6]} className="campus-map-label text-white">
                    <span className="font-bold text-[10.5px]">{place.name}</span>
                  </Tooltip>
                </Marker>
              ))}

              {/* Civic hazard pins */}
              {showCivic && civicIssues.map((issue) => {
                if (!issue.location?.lat || !issue.location?.lng) return null;
                const pos = dispersedMap.get(issue.id) || {
                  lat: Number(issue.location.lat), lng: Number(issue.location.lng), clusterCount: 1, clusterIndex: 0,
                };
                return (
                  <Marker
                    key={issue.id}
                    position={[pos.lat, pos.lng]}
                    icon={createCivicIcon(issue.category, issue.status === 'resolved', issue.urgencyUpvotes, pos.clusterCount, pos.clusterIndex)}
                  >
                    <Popup>
                      <div className="p-3.5 max-w-xs space-y-2 text-xs bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-2xl">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {issue.category?.replace('_', ' ')}
                          </span>
                          {pos.clusterCount > 1 ? (
                            <span className="font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              {pos.clusterIndex + 1} of {pos.clusterCount}
                            </span>
                          ) : (
                            <span className="font-semibold text-stone-500 dark:text-stone-400 capitalize">{issue.status}</span>
                          )}
                        </div>
                        <h4 className="font-bold leading-snug">{issue.title}</h4>
                        <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800">
                          <span className="font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                            <Flame className="w-3 h-3 fill-current" /> {issue.urgencyUpvotes} votes
                          </span>
                          <span className="truncate max-w-[140px]">📍 {issue.location?.name}</span>
                        </div>
                        {onSelectCivicIssue && (
                          <button
                            type="button"
                            onClick={() => onSelectCivicIssue(issue)}
                            className="w-full mt-1 py-1.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl font-bold hover:opacity-90 transition-all"
                          >
                            View issue details →
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Lost & found pins */}
              {lostFoundItems.map((item) => {
                if (!item.location?.lat || !item.location?.lng) return null;
                if (item.type === 'lost' && !showLost) return null;
                if (item.type === 'found' && !showFound) return null;
                const pos = dispersedMap.get(item.id) || {
                  lat: Number(item.location.lat), lng: Number(item.location.lng), clusterCount: 1, clusterIndex: 0,
                };
                return (
                  <Marker
                    key={item.id}
                    position={[pos.lat, pos.lng]}
                    icon={createLostFoundIcon(item.type, item.status === 'reunited', pos.clusterCount, pos.clusterIndex)}
                  >
                    <Popup>
                      <div className="p-3.5 max-w-xs space-y-2 text-xs bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-2xl">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold px-2 py-0.5 rounded ${
                            item.status === 'reunited'
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : item.type === 'lost'
                                ? 'bg-pink-50 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300'
                                : 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                          }`}
                          >
                            {item.status === 'reunited' ? 'REUNITED 🎉' : item.type.toUpperCase()}
                          </span>
                          <span className="capitalize text-stone-500 dark:text-stone-400">{item.category?.replace('_', ' ')}</span>
                        </div>
                        <h4 className="font-bold leading-snug">{item.title}</h4>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400">📍 {item.locationName}</div>
                        {onSelectLostFound && (
                          <button
                            type="button"
                            onClick={() => onSelectLostFound(item)}
                            className="w-full mt-1 py-1.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl font-bold hover:opacity-90 transition-all"
                          >
                            Inspect item →
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Live GPS */}
              {userLocation && (
                <Marker position={userLocation} icon={liveGpsIcon()}>
                  <Tooltip permanent direction="top" className="campus-map-label text-white">
                    <span className="font-bold text-[10.5px]">You are here</span>
                  </Tooltip>
                </Marker>
              )}

              {/* Probe — nearest surveyed place to a click */}
              {probe && (
                <Pane name="probe" style={{ zIndex: 650 }}>
                  <Marker
                    position={[probe.lat, probe.lng]}
                    icon={createPlaceDot('#111827', true)}
                  >
                    <Popup autoPan>
                      <div className="p-3 w-[220px] text-xs space-y-1.5">
                        <div className="font-bold text-stone-900 dark:text-white">Dropped pin</div>
                        <div className="font-mono text-[10px] text-stone-500">{formatLatLng(probe.lat, probe.lng)}</div>
                        {probe.place ? (
                          <div className="text-stone-600 dark:text-stone-300">
                            <span className="text-stone-400">Nearest place · </span>
                            <span className="font-semibold">{probe.place.name}</span>
                            <span className="text-stone-400"> · {Math.round(probe.distanceM)} m</span>
                          </div>
                        ) : (
                          <div className="text-stone-500">No surveyed place nearby.</div>
                        )}
                        {probe.place && (
                          <button
                            type="button"
                            onClick={() => jumpToPlace(probe.place)}
                            className="w-full py-1.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all"
                          >
                            Fly to {probe.place.shortName || probe.place.name}
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </Pane>
              )}
            </MapContainer>

            {/* floating controls */}
            <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isGpsLocating}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/90 dark:bg-stone-900/90 text-stone-800 dark:text-white border border-stone-200 dark:border-stone-700 shadow-modal hover:bg-white inline-flex items-center gap-1.5 transition-all"
              >
                <Navigation className={`w-3.5 h-3.5 text-blue-500 ${isGpsLocating ? 'animate-spin' : ''}`} />
                {isGpsLocating ? 'Locating…' : 'My live GPS'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setFlyCoords([BBIT_MAP_CENTER[0], BBIT_MAP_CENTER[1]]);
                  setProbe(null);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/90 dark:bg-stone-900/90 text-stone-800 dark:text-white border border-stone-200 dark:border-stone-700 shadow-modal hover:bg-white inline-flex items-center gap-1.5 transition-all"
              >
                <Locate className="w-3.5 h-3.5 text-emerald-500" />
                Recentre
              </button>
            </div>

            {/* live cursor HUD */}
            <div className="absolute bottom-3 left-3 bg-stone-950/85 backdrop-blur-md border border-stone-700/80 text-white px-3 py-1.5 rounded-xl text-[11px] font-mono flex items-center gap-2 shadow-card-dark pointer-events-none z-[1000]">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              <span>{hoverCoords.lat}° N, {hoverCoords.lng}° E</span>
              <span className="text-stone-500">· z{currentZoom.toFixed(1)}</span>
            </div>

            {/* legend */}
            {showLegend && (
              <div className="absolute bottom-3 right-3 z-[1000] max-w-[260px] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-700 rounded-2xl p-3 shadow-modal space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-800 dark:text-stone-100 inline-flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-500" /> Campus map legend
                  </span>
                  <button type="button" onClick={() => setShowLegend(false)} className="text-stone-400 hover:text-stone-700 text-[11px]">
                    hide
                  </button>
                </div>
                <ul className="space-y-1 text-[10.5px] text-stone-600 dark:text-stone-300">
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-0.5 rounded bg-amber-400" /> Campus boundary
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-1 rounded bg-white ring-1 ring-stone-400" /> Internal roads
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-0.5 rounded bg-emerald-400" /> Lawns & greens
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-indigo-500/40 ring-1 ring-indigo-500" /> Building footprint
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-amber-500" /> Civic hazard
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-pink-500" /> Lost item
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-sky-500" /> Found item
                  </li>
                </ul>
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-stone-100 dark:border-stone-800">
                  <StatPill icon={Building2} label="Built" value={formatArea(stats.builtArea)} tone="indigo" />
                  <StatPill icon={Ruler} label="Roads" value={`${stats.roadKm.toFixed(2)} km`} tone="emerald" />
                </div>
              </div>
            )}
          </div>

          {/* shortlist of search hits */}
          {searchTerm && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3 shadow-card">
              <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-2">
                {visiblePlaces.length} match{visiblePlaces.length === 1 ? '' : 'es'} for “{searchTerm}”
              </div>
              <div className="flex flex-wrap gap-1.5">
                {visiblePlaces.slice(0, 12).map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => jumpToPlace(place)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:border-indigo-400 hover:text-indigo-600 transition-all inline-flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-sm" style={{ background: place.color }} />
                    {place.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-[640px] rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-card-dark bg-stone-950 relative">
          <iframe src={BBIT_WEBSITE_URL} title="BBIT website" className="w-full h-full border-0" allow="geolocation" />
        </div>
      )}
    </div>
  );
}
