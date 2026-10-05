import fs from 'fs';
import path from 'path';

const distDir = path.resolve('frontend', 'dist', 'assets');
const files = fs.readdirSync(distDir);
const mainBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
const content = fs.readFileSync(path.join(distDir, mainBundle), 'utf-8');

// Search for distinctive strings
const queries = [
  'L.Map',
  'L.tileLayer',
  'L.marker',
  'MapContainer',
  'RoadTripDetails',
  'TripOverview',
  'QuickStartSuggestions',
  'TripConfigurationCard',
  'PlannerHeader',
  'HeroSearch',
  'lucide',
  'framer-motion',
  'jspdf',
  'PDFDocument',
  'OpenStreetMap',
  'osm.org',
  'leaflet.css'
];

console.log('Query matches in index-*.js:');
for (const q of queries) {
  const count = (content.match(new RegExp(q, 'g')) || []).length;
  console.log(`  "${q.padEnd(25)}": ${count} matches`);
}
