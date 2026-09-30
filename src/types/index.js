import bbitPlaces from '../data/bbitPlaces.json';

export const CIVIC_CATEGORIES = [
  { 
    id: 'pothole', 
    label: 'Pothole & Road Hazard', 
    icon: 'AlertTriangle', 
    tagClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/60',
    accentColor: '#F97316',
    emoji: '🕳️'
  },
  { 
    id: 'streetlight', 
    label: 'Lighting & Streetlight', 
    icon: 'Lightbulb', 
    tagClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
    accentColor: '#F59E0B',
    emoji: '💡'
  },
  { 
    id: 'water_leak', 
    label: 'Water Leak & Drainage', 
    icon: 'Droplets', 
    tagClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60',
    accentColor: '#0EA5E9',
    emoji: '💧'
  },
  { 
    id: 'garbage', 
    label: 'Waste & Sanitation', 
    icon: 'Trash2', 
    tagClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
    accentColor: '#F43F5E',
    emoji: '🗑️'
  },
  { 
    id: 'broken_infra', 
    label: 'Broken Infrastructure', 
    icon: 'Wrench', 
    tagClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60',
    accentColor: '#A855F7',
    emoji: '🔧'
  },
  { 
    id: 'wifi_deadzone', 
    label: 'WiFi & Connectivity', 
    icon: 'WifiOff', 
    tagClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60',
    accentColor: '#6366F1',
    emoji: '📶'
  },
  { 
    id: 'electrical', 
    label: 'Electrical & Safety', 
    icon: 'Zap', 
    tagClass: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border-yellow-200/80 dark:border-yellow-800/60',
    accentColor: '#EAB308',
    emoji: '⚡'
  },
  { 
    id: 'hvac', 
    label: 'HVAC & Climate', 
    icon: 'Wind', 
    tagClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
    accentColor: '#10B981',
    emoji: '🍃'
  },
  { 
    id: 'other', 
    label: 'Other / Custom Hazard', 
    icon: 'AlertCircle', 
    tagClass: 'bg-stone-100 dark:bg-stone-800/90 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700',
    accentColor: '#78716C',
    emoji: '⚠️'
  },
];

export const CIVIC_STATUSES = [
  {
    id: 'reported',
    label: 'Reported',
    dotColor: 'bg-purple-500',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
    description: 'Awaiting review'
  },
  {
    id: 'acknowledged',
    label: 'Acknowledged',
    dotColor: 'bg-blue-500',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    description: 'Assigned to team'
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    dotColor: 'bg-amber-500',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    description: 'Work underway'
  },
  {
    id: 'resolved',
    label: 'Resolved',
    dotColor: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    description: 'Fixed & verified'
  },
];

export const LOST_FOUND_CATEGORIES = [
  { id: 'electronics', label: 'Electronics', icon: 'Laptop', color: 'indigo' },
  { id: 'keys_cards', label: 'Keys, IDs & Cards', icon: 'CreditCard', color: 'amber' },
  { id: 'bottles_mugs', label: 'Bottles & Tumblers', icon: 'Coffee', color: 'sky' },
  { id: 'clothing', label: 'Clothing & Bags', icon: 'Shirt', color: 'rose' },
  { id: 'stationery', label: 'Books & Notes', icon: 'BookOpen', color: 'emerald' },
  { id: 'other', label: 'Other Items', icon: 'Package', color: 'purple' },
];

export const BBIT_MAP_CENTER = [22.4602, 88.1684];
export const BBIT_MAP_ZOOM = 17;
export const BBIT_WEBSITE_URL = 'https://www.bbit.edu.in';

// Official BBIT (Budge Budge Institute of Technology) Boundary Box for strict clamping
export const BBIT_CAMPUS_BOUNDS = [
  [22.4580, 88.1645], // South-West corner
  [22.4630, 88.1700], // North-East corner
];

export function isInsideCampus(lat, lng) {
  return lat >= 22.4580 && lat <= 22.4630 && lng >= 88.1645 && lng <= 88.1700;
}

export function clampToCampus(lat, lng) {
  const clampedLat = Math.max(22.4580, Math.min(22.4630, lat));
  const clampedLng = Math.max(88.1645, Math.min(88.1700, lng));
  return [clampedLat, clampedLng];
}

// 50 Curated Campus Places of Budge Budge Institute of Technology
export const BBIT_CAMPUS_PLACES = bbitPlaces;

// Grouped Landmarks List
export const CAMPUS_LANDMARKS = bbitPlaces.map(p => ({
  id: p.id,
  name: p.name,
  lat: p.lat,
  lng: p.lng,
  category: p.category,
  area: p.categoryLabel,
  color: p.color,
  polygon: p.polygon,
}));
