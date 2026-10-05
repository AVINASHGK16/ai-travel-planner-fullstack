import fs from 'fs';
import path from 'path';

const distDir = path.resolve('frontend', 'dist', 'assets');
const files = fs.readdirSync(distDir);
const mainBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js'));

console.log('Main bundle file:', mainBundle);
const fullPath = path.join(distDir, mainBundle);
const content = fs.readFileSync(fullPath, 'utf-8');
const stat = fs.statSync(fullPath);

console.log(`Bundle Size: ${(stat.size / 1024).toFixed(2)} KB (${stat.size} bytes)`);

// Check for common large libraries in this bundle
const libraries = [
  { name: 'leaflet', pattern: /leaflet|L\.map|L\.tileLayer|L\.marker/i },
  { name: 'react-leaflet', pattern: /react-leaflet|MapContainer|TileLayer|Marker/i },
  { name: 'jspdf', pattern: /jspdf|jsPDF/i },
  { name: 'html2canvas', pattern: /html2canvas/i },
  { name: 'dompurify', pattern: /DOMPurify|purify\.es/i },
  { name: 'framer-motion', pattern: /framer-motion|AnimatePresence|motion\./i },
  { name: 'lucide-react', pattern: /lucide-react|createLucideIcon/i },
  { name: 'react / react-dom', pattern: /react-dom|createRoot|hydrateRoot/i },
  { name: 'react-router / react-router-dom', pattern: /react-router|BrowserRouter|useNavigate/i },
  { name: 'RoadTripDetails', pattern: /RoadTripDetails/i },
  { name: 'TravelOptions', pattern: /TravelOptions/i },
  { name: 'TripOverview', pattern: /TripOverview/i },
  { name: 'MapModal / FullMap', pattern: /MapModal|MapErrorBoundary/i },
  { name: 'ChatAssistant', pattern: /ChatAssistant/i },
  { name: 'AuthModal', pattern: /AuthModal/i },
  { name: 'SettingsPanel', pattern: /SettingsPanel/i },
  { name: 'HeroSearch', pattern: /HeroSearch/i },
  { name: 'AppShell / Header / Sidebar', pattern: /AppShell|AppHeader|AppSidebar/i }
];

console.log('\n--- Library / Component Signatures in Main Bundle ---');
for (const lib of libraries) {
  const match = content.match(lib.pattern);
  console.log(`  ${lib.name.padEnd(35)}: ${match ? 'FOUND' : 'NOT FOUND'}`);
}

// Estimate character counts of major libraries / sections
console.log('\n--- Estimating Symbol Footprints ---');
const tests = [
  'createLucideIcon',
  'motion',
  'leaflet',
  'react-dom',
  'react-router',
  'ChatAssistant',
  'SettingsPanel',
  'AuthModal',
  'HeroSearch'
];

tests.forEach(term => {
  const count = (content.match(new RegExp(term, 'g')) || []).length;
  console.log(`  Occurrences of "${term}": ${count}`);
});
