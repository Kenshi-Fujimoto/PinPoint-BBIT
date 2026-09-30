/**
 * Marker factory for the campus map surfaces.
 * Kept dependency-free (Leaflet divIcons only) so it can be reused by the
 * main map, the location picker and the report modals.
 */
import L from 'leaflet';

/* ------------------------------------------------------------ campus places */

export function createPlaceDot(color = '#0071E3', isMajor = false) {
  const size = isMajor ? 13 : 9;
  const box = size + 9;
  return L.divIcon({
    className: 'campus-place-dot',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${box}px;height:${box}px;">
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};
          border:2px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,0.65);"></div>
      </div>`,
    iconSize: [box, box],
    iconAnchor: [box / 2, box / 2],
    popupAnchor: [0, -box / 2],
  });
}

export function createFlagPin(color = '#0071E3', label = '') {
  return L.divIcon({
    className: 'campus-flag-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;">
        <div style="width:24px;height:24px;border-radius:8px;background:${color};border:2px solid #fff;
          box-shadow:0 3px 10px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-size:12px;">${label}</div>
        <div style="width:3px;height:9px;background:${color};"></div>
        <div style="width:7px;height:3px;border-radius:50%;background:rgba(0,0,0,0.35);"></div>
      </div>`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -34],
  });
}

/* ------------------------------------------------------------- civic issues */

export function createCivicIcon(category, isResolved, urgency, clusterCount = 1, clusterIndex = 0) {
  const isUrgent = urgency >= 30;
  const bg = isResolved
    ? 'linear-gradient(135deg, #34C759, #2DAE4E)'
    : isUrgent
      ? 'linear-gradient(135deg, #FF9500, #E08200)'
      : 'linear-gradient(135deg, #FFB340, #B86800)';
  const shadow = isResolved ? 'rgba(52,199,89,0.7)' : isUrgent ? 'rgba(249,115,22,0.75)' : 'rgba(245,158,11,0.6)';
  const emoji = category === 'pothole' ? '🕳️'
    : category === 'streetlight' ? '💡'
      : category === 'water_leak' ? '💧'
        : category === 'garbage' ? '🗑️'
          : category === 'wifi_deadzone' ? '📶'
            : category === 'electrical' ? '⚡'
              : '⚠️';

  return L.divIcon({
    className: 'pinpoint-marker',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:38px;height:38px;">
        ${isUrgent && !isResolved
          ? '<div style="position:absolute;inset:-4px;border-radius:12px;background:rgba(249,115,22,0.45);animation:pulse 2s cubic-bezier(0.4,0,0.6,1) infinite;"></div>'
          : ''}
        <div style="width:32px;height:32px;border-radius:10px;background:${bg};border:2px solid #FFFFFF;display:flex;
          align-items:center;justify-content:center;box-shadow:0 4px 14px ${shadow};font-size:15px;position:relative;">
          ${emoji}
          ${clusterCount > 1
            ? `<span style="position:absolute;top:-6px;right:-6px;background:#0058B8;color:#fff;border:1.5px solid #fff;
                font-size:9px;font-weight:800;border-radius:9999px;width:16px;height:16px;display:flex;align-items:center;
                justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.6);">${clusterIndex + 1}</span>`
            : ''}
        </div>
      </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
}

/* -------------------------------------------------------------- lost & found */

export function createLostFoundIcon(type, isReunited, clusterCount = 1, clusterIndex = 0) {
  const isLost = type === 'lost';
  const bg = isReunited
    ? 'linear-gradient(135deg, #34C759, #2DAE4E)'
    : isLost
      ? 'linear-gradient(135deg, #FF2D55, #E02549)'
      : 'linear-gradient(135deg, #32ADE6, #0091D5)';
  const shadow = isReunited ? 'rgba(52,199,89,0.6)' : isLost ? 'rgba(236,72,153,0.6)' : 'rgba(14,165,233,0.6)';
  const emoji = isReunited ? '🎉' : isLost ? '🔍' : '📦';

  return L.divIcon({
    className: 'pinpoint-marker',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;">
        <div style="width:30px;height:30px;border-radius:10px;background:${bg};border:2px solid #FFFFFF;display:flex;
          align-items:center;justify-content:center;box-shadow:0 4px 14px ${shadow};font-size:14px;position:relative;">
          ${emoji}
          ${clusterCount > 1
            ? `<span style="position:absolute;top:-6px;right:-6px;background:#0058B8;color:#fff;border:1.5px solid #fff;
                font-size:9px;font-weight:800;border-radius:9999px;width:16px;height:16px;display:flex;align-items:center;
                justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.6);">${clusterIndex + 1}</span>`
            : ''}
        </div>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

/* ------------------------------------------------------------------ live GPS */

export const liveGpsIcon = () => L.divIcon({
  className: 'live-user-gps-pin',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;">
      <div style="position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(59,130,246,0.4);
        animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #FFFFFF;
        box-shadow:0 0 10px rgba(37,99,235,0.8);"></div>
    </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

/* ---------------------------------------------------- picker / selection pin */

export const pickerPinIcon = L.divIcon({
  className: 'custom-picker-pin',
  html: `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;width:44px;height:50px;">
      <div style="width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#0A84FF,#0071E3);
        border:2.5px solid #FFFFFF;display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 16px rgba(0,113,227,0.9);color:white;font-size:16px;">📍</div>
      <div style="width:4px;height:10px;background:#0071E3;border-radius:2px;"></div>
      <div style="width:8px;height:4px;background:rgba(0,0,0,0.3);border-radius:50%;"></div>
    </div>`,
  iconSize: [44, 50],
  iconAnchor: [22, 46],
  popupAnchor: [0, -44],
});

/* --------------------------------------------------- cluster dispersion logic */

/**
 * Spreads markers that share (or nearly share) a coordinate into a tidy radial
 * fan so stacked reports stay individually clickable.
 */
export function computeDispersedPositions(civicList, lostFoundList) {
  const allItems = [];
  (civicList || []).forEach((c) => {
    if (c.location?.lat && c.location?.lng) {
      allItems.push({ id: c.id, lat: Number(c.location.lat), lng: Number(c.location.lng) });
    }
  });
  (lostFoundList || []).forEach((lf) => {
    if (lf.location?.lat && lf.location?.lng) {
      allItems.push({ id: lf.id, lat: Number(lf.location.lat), lng: Number(lf.location.lng) });
    }
  });

  const clusters = [];
  allItems.forEach((item) => {
    const match = clusters.find((cl) => Math.abs(cl.lat - item.lat) < 0.00012 && Math.abs(cl.lng - item.lng) < 0.00012);
    if (match) match.items.push(item);
    else clusters.push({ lat: item.lat, lng: item.lng, items: [item] });
  });

  const positionMap = new Map();
  clusters.forEach((cl) => {
    if (cl.items.length === 1) {
      positionMap.set(cl.items[0].id, { lat: cl.lat, lng: cl.lng, clusterCount: 1, clusterIndex: 0 });
      return;
    }
    const radius = 0.00014;
    cl.items.forEach((item, idx) => {
      const angle = (2 * Math.PI * idx) / cl.items.length - Math.PI / 2;
      positionMap.set(item.id, {
        lat: item.lat + Math.sin(angle) * radius,
        lng: item.lng + Math.cos(angle) * radius * 1.08,
        clusterCount: cl.items.length,
        clusterIndex: idx,
      });
    });
  });

  return positionMap;
}
