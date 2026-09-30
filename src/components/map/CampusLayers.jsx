/**
 * Campus layer primitives
 * ---------------------------------------------------------------------------
 * Data-driven Leaflet layers for the surveyed BBIT campus: boundary, road
 * network, greens, water bodies, gates and the 50 curated places (real
 * footprints traced over Esri World Imagery).
 *
 * Two visual variants are supported:
 *   - "satellite": translucent overlays that sit on top of aerial imagery
 *   - "plan":      a clean vector master-plan rendering on a light ground plane
 */
import React, { Fragment, useState } from 'react';
import { Polygon, Polyline, Marker, Tooltip, Popup, Pane } from 'react-leaflet';
import L from 'leaflet';
import { Building2, Layers, MapPin, Ruler } from 'lucide-react';
import {
  CAMPUS_LAYOUT,
  ROAD_STYLE,
  LAYER_ZOOM,
  placeColor,
} from '../../lib/campusData';
import { formatArea, formatLatLng } from '../../lib/geo';

/* ------------------------------------------------------------------ themes */

export const MAP_THEMES = {
  satellite: {
    boundary: { color: '#FDE68A', weight: 2.4, opacity: 0.95, dashArray: '10 7', fill: false },
    boundaryHalo: { color: '#0F172A', weight: 5.5, opacity: 0.35, fill: false },
    green: { color: '#34D399', fillColor: '#10B981', weight: 1.2, fillOpacity: 0.22, opacity: 0.75 },
    greenLabel: 'text-emerald-50',
    water: { color: '#7DD3FC', fillColor: '#0EA5E9', weight: 1.4, fillOpacity: 0.34, opacity: 0.85 },
    buildingFill: 0.3,
    buildingWeight: 1.6,
    buildingLabel: 'text-white',
    roadLabel: 'text-amber-100',
    ground: '#0B1220',
  },
  plan: {
    boundary: { color: '#B45309', weight: 2.2, opacity: 0.9, dashArray: '9 6', fill: false },
    boundaryHalo: { color: '#FFFFFF', weight: 5, opacity: 0.65, fill: false },
    green: { color: '#15803D', fillColor: '#86EFAC', weight: 1.2, fillOpacity: 0.55, opacity: 0.8 },
    greenLabel: 'text-emerald-900',
    water: { color: '#0369A1', fillColor: '#7DD3FC', weight: 1.2, fillOpacity: 0.6, opacity: 0.9 },
    buildingFill: 0.72,
    buildingWeight: 1.4,
    buildingLabel: 'text-stone-900',
    roadLabel: 'text-stone-800',
    ground: '#F8FAFC',
  },
};

const tooltipClass = 'campus-map-label';

/* ---------------------------------------------------------------- boundary */

export function CampusBoundary({ theme, zoom, show = true }) {
  if (!show || zoom < LAYER_ZOOM.boundary) return null;
  const t = theme.boundary;
  const halo = theme.boundaryHalo;
  return (
    <Pane name="campus-boundary" style={{ zIndex: 340 }}>
      <Polyline positions={CAMPUS_LAYOUT.boundary} pathOptions={halo} interactive={false} />
      <Polyline positions={CAMPUS_LAYOUT.boundary} pathOptions={t} interactive={false} />
      {CAMPUS_LAYOUT.boundary.map((point, idx) => (
        <Marker
          key={`corner-${idx}`}
          position={point}
          interactive={false}
          icon={L.divIcon({
            className: 'campus-corner-dot',
            html: '<div style="width:7px;height:7px;border-radius:2px;background:#FDE68A;border:1.5px solid rgba(15,23,42,0.8);transform:rotate(45deg);"></div>',
            iconSize: [7, 7],
            iconAnchor: [3.5, 3.5],
          })}
        />
      ))}
    </Pane>
  );
}

/* -------------------------------------------------------- greens & water */

function AreaLayer({ items, pathOptionsFor, pane, zIndex, className, minZoom, zoom }) {
  if (zoom < minZoom) return null;
  return (
    <Pane name={pane} style={{ zIndex }}>
      {items.map((item) => (
        <Polygon
          key={item.id}
          positions={item.polygon}
          pathOptions={pathOptionsFor(item)}
        >
          {item.name && (
            <Tooltip permanent direction="center" className={className} opacity={1}>
              <span className="font-semibold text-[10px] tracking-wide uppercase">{item.name}</span>
            </Tooltip>
          )}
        </Polygon>
      ))}
    </Pane>
  );
}

export function CampusGreens({ theme, zoom, show = true }) {
  if (!show) return null;
  return (
    <AreaLayer
      items={CAMPUS_LAYOUT.greens}
      pane="campus-greens"
      zIndex={350}
      minZoom={LAYER_ZOOM.greens}
      zoom={zoom}
      className={`campus-map-label ${theme.greenLabel}`}
      pathOptionsFor={() => theme.green}
    />
  );
}

export function CampusWater({ theme, zoom, show = true }) {
  if (!show) return null;
  return (
    <AreaLayer
      items={CAMPUS_LAYOUT.water}
      pane="campus-water"
      zIndex={352}
      minZoom={LAYER_ZOOM.greens}
      zoom={zoom}
      className={`campus-map-label text-sky-50`}
      pathOptionsFor={() => theme.water}
    />
  );
}

/* ------------------------------------------------------------------ roads */

export function CampusRoads({ theme, zoom, variant, show = true }) {
  if (!show || zoom < LAYER_ZOOM.roads) return null;
  const labelVisible = zoom >= LAYER_ZOOM.roadNames;
  return (
    <Pane name="campus-roads" style={{ zIndex: 360 }}>
      {CAMPUS_LAYOUT.roads.map((road) => {
        const preset = ROAD_STYLE[road.kind] || ROAD_STYLE.service;
        const weight = variant === 'plan' ? preset.weightPlan : preset.weightSat;
        const color = variant === 'plan' ? preset.colorPlan : preset.colorSat;
        return (
          <Fragment key={road.id}>
            {preset.casing && (
              <Polyline
                positions={road.path}
                interactive={false}
                pathOptions={{
                  color: preset.casing,
                  weight: weight + 2.2,
                  opacity: 0.55,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}
            <Polyline
              positions={road.path}
              pathOptions={{
                color,
                weight,
                opacity: road.kind === 'footpath' ? 0.85 : 0.96,
                dashArray: preset.dash,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            >
              {road.name && labelVisible && (
                <Tooltip sticky direction="top" className={`campus-map-label ${theme.roadLabel}`}>
                  <span className="font-semibold text-[10px] tracking-wide">{road.name}</span>
                </Tooltip>
              )}
            </Polyline>
          </Fragment>
        );
      })}
    </Pane>
  );
}

/* ------------------------------------------------------------------ gates */

const gateIcon = (label, isMain) =>
  L.divIcon({
    className: 'campus-gate-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;transform:translateZ(0);">
        <div style="width:${isMain ? 26 : 20}px;height:${isMain ? 26 : 20}px;border-radius:8px;
          background:${isMain ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'linear-gradient(135deg,#64748B,#475569)'};
          border:2px solid #FFFFFF;display:flex;align-items:center;justify-content:center;font-size:${isMain ? 13 : 10}px;
          box-shadow:0 3px 12px rgba(0,0,0,0.55);">🚧</div>
        <span style="font:700 9px/1 ui-sans-serif,system-ui;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.95);white-space:nowrap;">${label}</span>
      </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

export function CampusGates({ theme, zoom, show = true }) {
  const [openId, setOpenId] = useState(null);
  if (!show || zoom < LAYER_ZOOM.gates) return null;
  return (
    <Pane name="campus-gates" style={{ zIndex: 420 }}>
      {CAMPUS_LAYOUT.gates.map((gate) => (
        <Marker
          key={gate.id}
          position={[gate.lat, gate.lng]}
          icon={gateIcon(gate.shortName || gate.name, gate.kind === 'main')}
          eventHandlers={{ click: () => setOpenId(gate.id) }}
        >
          {openId === gate.id && (
            <Popup closeButton={false} autoPan>
              <div className="p-3 max-w-[220px] bg-white dark:bg-stone-900 rounded-xl text-xs">
                <div className="font-bold text-stone-900 dark:text-white">{gate.name}</div>
                <div className="text-stone-500 dark:text-stone-400 mt-0.5">{gate.details}</div>
                <div className="mt-1.5 font-mono text-[10px] text-stone-400">{formatLatLng(gate.lat, gate.lng)}</div>
              </div>
            </Popup>
          )}
        </Marker>
      ))}
    </Pane>
  );
}

/* -------------------------------------------------------- place footprints */

/**
 * Draws the traced building/ground footprints for the curated places.
 * `mode` controls labelling: 'none' | 'major' | 'all'.
 */
export function PlaceFootprints({
  places,
  theme,
  variant,
  zoom,
  mode = 'major',
  onSelect,
  onUse,
  actionLabel,
  highlightId,
  interactive = true,
}) {
  const [hovered, setHovered] = useState(null);
  if (zoom < LAYER_ZOOM.buildings) return null;

  const showNameFor = (place) => {
    if (mode === 'all') return true;
    if (mode === 'none') return false;
    return Boolean(place.major) || zoom >= LAYER_ZOOM.buildingNames;
  };

  return (
    <Pane name="campus-places" style={{ zIndex: 400 }}>
      {places.map((place) => {
        const ring = place.polygon;
        if (!ring || ring.length < 3) return null;
        const color = placeColor(place);
        const isActive = highlightId === place.id || hovered === place.id;
        const pathOptions = {
          color,
          weight: isActive ? theme.buildingWeight + 1 : theme.buildingWeight,
          opacity: 0.95,
          fillColor: color,
          fillOpacity: isActive ? Math.min(0.75, theme.buildingFill + 0.25) : theme.buildingFill,
          lineJoin: 'round',
        };
        return (
          <Polygon
            key={place.id}
            positions={ring}
            pathOptions={pathOptions}
            eventHandlers={
              interactive
                ? {
                    mouseover: () => setHovered(place.id),
                    mouseout: () => setHovered(null),
                  }
                : undefined
            }
          >
            {showNameFor(place) && (
              <Tooltip
                permanent
                direction="center"
                className={`campus-map-label ${theme.buildingLabel}`}
                opacity={1}
              >
                <span className="font-bold text-[10px] leading-tight tracking-tight">{place.shortName || place.name}</span>
              </Tooltip>
            )}

            <Popup autoPan={false}>
              <div className="w-[248px] bg-white dark:bg-stone-900 rounded-2xl p-3.5 font-sans text-xs text-stone-900 dark:text-white space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] shrink-0"
                    style={{ background: `${color}22`, border: `1px solid ${color}66` }}
                  >
                    {place.iconEmoji || '🏢'}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold leading-snug truncate">{place.name}</div>
                    <div className="text-[10px] uppercase tracking-wide" style={{ color }}>
                      {place.categoryLabel}
                    </div>
                  </div>
                </div>

                {place.details && (
                  <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{place.details}</p>
                )}

                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-stone-500 dark:text-stone-400">
                  <span className="inline-flex items-center gap-1">
                    <Ruler className="w-3 h-3" /> {formatArea(place.areaM2)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Layers className="w-3 h-3" /> {place.levels ? `${place.levels} floors` : 'campus place'}
                  </span>
                  <span className="col-span-2 inline-flex items-center gap-1 font-mono">
                    <MapPin className="w-3 h-3" /> {formatLatLng(place.centroid[0], place.centroid[1])}
                  </span>
                </div>

                {(onUse || onSelect) && (
                  <div className="flex gap-1.5 pt-1">
                    {onUse && (
                      <button
                        type="button"
                        onClick={() => onUse(place)}
                        className="flex-1 py-1.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold hover:opacity-90 transition-all"
                      >
                        {actionLabel || 'Use this place'}
                      </button>
                    )}
                    {onSelect && (
                      <button
                        type="button"
                        onClick={() => onSelect(place)}
                        className="flex-1 py-1.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all inline-flex items-center justify-center gap-1"
                      >
                        <Building2 className="w-3 h-3" /> Details
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </Pane>
  );
}
