/**
 * Initial Seed Data for BBIT (Budge Budge Institute of Technology) Civic Watch and Lost & Found
 * Coordinates curated around the BBIT campus at Nischintapur, Budge Budge, Kolkata - 700137.
 */

export const INITIAL_CIVIC_ISSUES = [
  {
    id: 'civic-101',
    title: 'Deep pothole on pathway between Central Plaza and Central Library',
    description: 'A 6-inch deep pothole near the Central Plaza curve where students cycle and walk. Prone to water accumulation and hazardous after sunset.',
    category: 'pothole',
    status: 'in_progress',
    upvotedBy: Array.from({ length: 42 }, (_, i) => `user-uid-seed-${100 + i}`),
    urgencyUpvotes: 42,
    severity: 4,
    location: {
      lat: 22.4585,
      lng: 88.1711,
      name: 'Central Plaza',
    },
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    reporterId: 'user-uid-seed-sourav',
    reporterName: 'Sourav Mondal',
    reporterRole: 'BBIT Student',
    reportedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    verifiedCount: 28,
    statusHistory: [
      { status: 'reported', timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), note: 'Issue submitted with photo and GPS location' },
      { status: 'acknowledged', timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), note: 'Inspected by Campus Facility Maintenance Team' },
      { status: 'in_progress', timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), note: 'Asphalt repair crew scheduled' },
    ],
    comments: [
      {
        id: 'c-1',
        author: 'Pritam Das',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        text: 'Nearly slipped on cycle here during evening lab commute. Glad it is being addressed.',
        timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      },
      {
        id: 'c-2',
        author: 'BBIT Estate Office',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        text: 'Road repair batch will complete patchwork this afternoon.',
        timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        isOfficial: true,
      }
    ]
  },
  {
    id: 'civic-102',
    title: 'Non-functional streetlamp behind Central Computing Center',
    description: 'The perimeter lamp near the Central Computing Center is out, making the corner pitch dark after 7:00 PM.',
    category: 'streetlight',
    status: 'acknowledged',
    upvotedBy: Array.from({ length: 29 }, (_, i) => `user-uid-seed-${200 + i}`),
    urgencyUpvotes: 29,
    severity: 5,
    location: {
      lat: 22.4592,
      lng: 88.1689,
      name: 'Central Computing Center',
    },
    imageUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
    reporterId: 'user-uid-seed-ananya',
    reporterName: 'Ananya Sen',
    reporterRole: 'M.Tech Student',
    reportedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    verifiedCount: 19,
    statusHistory: [
      { status: 'reported', timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), note: 'Submitted via PinPoint' },
      { status: 'acknowledged', timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(), note: 'Assigned to Electrical Unit' },
    ],
    comments: []
  },
  {
    id: 'civic-103',
    title: 'Water pipe leak near Cricket Ground stands',
    description: 'Overground drainage tap leaking continuously on the pavement near the Cricket Ground stands.',
    category: 'water_leak',
    status: 'resolved',
    upvotedBy: Array.from({ length: 56 }, (_, i) => `user-uid-seed-${300 + i}`),
    urgencyUpvotes: 56,
    severity: 4,
    location: {
      lat: 22.4570,
      lng: 88.1670,
      name: 'Cricket Ground',
    },
    imageUrl: 'https://images.unsplash.com/photo-1584467541268-b040f83be3fd?auto=format&fit=crop&w=800&q=80',
    reporterId: 'user-uid-seed-rahul',
    reporterName: 'Rahul Roy',
    reporterRole: 'Hostel Resident',
    reportedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    verifiedCount: 44,
    statusHistory: [
      { status: 'reported', timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), note: 'Leak reported' },
      { status: 'resolved', timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(), note: 'Valve replaced by plumbing staff' },
    ],
    comments: []
  },
  {
    id: 'civic-104',
    title: 'WiFi dead zone near Administrative Block corridor',
    description: 'No campus Wi-Fi signal in the corridor near the Administrative Block during office hours.',
    category: 'wifi_deadzone',
    status: 'reported',
    upvotedBy: Array.from({ length: 18 }, (_, i) => `user-uid-seed-${400 + i}`),
    urgencyUpvotes: 18,
    severity: 3,
    location: {
      lat: 22.4583,
      lng: 88.1716,
      name: 'Administrative Block',
    },
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80',
    reporterId: 'user-uid-seed-debjit',
    reporterName: 'Debjit Bose',
    reporterRole: 'B.Tech Student',
    reportedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    verifiedCount: 12,
    statusHistory: [
      { status: 'reported', timestamp: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), note: 'Reported by Debjit Bose' },
    ],
    comments: []
  }
];

export const INITIAL_LOST_FOUND = [
  {
    id: 'lf-201',
    type: 'lost',
    title: 'Navy Blue HydroFlask (with Cat & Code Stickers)',
    description: 'Lost my 32oz dark navy insulated water bottle with stickers on a reading desk on the 3rd floor of the Central Library.',
    category: 'bottles_mugs',
    color: 'Navy Blue',
    brand: 'HydroFlask',
    status: 'open',
    locationName: 'Central Library',
    location: {
      lat: 22.4583,
      lng: 88.1713,
    },
    timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    posterId: 'user-uid-seed-maya',
    posterName: 'Maya Krishnan',
    posterContact: 'maya.k@bbit.edu.in',
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
    reward: 'Free Canteen Coffee ☕',
    comments: []
  },
  {
    id: 'lf-202',
    type: 'found',
    title: 'Dark Blue Metal Flask Bottle with Stickers',
    description: 'Found a navy metal flask bottle on table #14 in the Central Library. Kept safely at the front helpdesk.',
    category: 'bottles_mugs',
    color: 'Navy Blue',
    brand: 'HydroFlask',
    status: 'open',
    locationName: 'Central Library Front Desk',
    location: {
      lat: 22.4583,
      lng: 88.1713,
    },
    timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    posterId: 'user-uid-seed-libstaff',
    posterName: 'Library Staff',
    posterContact: 'library@bbit.edu.in',
    imageUrl: 'https://images.unsplash.com/photo-1544003484-3cd181d17917?auto=format&fit=crop&w=800&q=80',
    secretQuestion: 'What specific cat sticker is on the back?',
    comments: []
  },
  {
    id: 'lf-203',
    type: 'lost',
    title: 'Space Gray MacBook Air M2 in Felt Sleeve',
    description: 'Left laptop on the benches near the Gymnasium.',
    category: 'electronics',
    color: 'Space Gray',
    brand: 'Apple',
    status: 'open',
    locationName: 'Gymnasium',
    location: {
      lat: 22.4578,
      lng: 88.1688,
    },
    timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    posterId: 'user-uid-seed-rohan',
    posterName: 'Rohan Gupta',
    posterContact: 'rohan.g@bbit.edu.in',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    comments: []
  },
  {
    id: 'lf-204',
    type: 'found',
    title: 'BBIT Student ID Card & Key Fob',
    description: 'Found student ID card near the Main Gate security booth on a blue lanyard.',
    category: 'keys_cards',
    color: 'Blue Lanyard',
    brand: 'BBIT ID',
    status: 'reunited',
    locationName: 'Main Gate',
    location: {
      lat: 22.4575,
      lng: 88.1721,
    },
    timestamp: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    posterId: 'user-uid-seed-secstaff',
    posterName: 'Security Gate Staff',
    posterContact: 'security@bbit.edu.in',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
    reunitedDate: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    comments: []
  }
];
