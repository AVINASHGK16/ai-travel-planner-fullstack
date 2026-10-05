import fs from 'fs';
import path from 'path';

const distDir = path.resolve('frontend', 'dist', 'assets');
const files = fs.readdirSync(distDir);
const mainBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
const content = fs.readFileSync(path.join(distDir, mainBundle), 'utf-8');

console.log(`Total bundle character length: ${content.length}`);

// Let's identify the start and end indices of the major libraries inside the bundle
const signatures = [
  { name: 'React + Scheduler + React-DOM', start: 'react', needle: 'react.production.min' },
  { name: 'Leaflet', start: 'leaflet', needle: 'Leaflet 1.9.4' },
  { name: 'jsPDF', start: 'jspdf', needle: 'jsPDF 4.2' },
  { name: 'html2canvas', start: 'html2canvas', needle: 'html2canvas' },
  { name: 'DOMPurify', start: 'dompurify', needle: 'DOMPurify' },
  { name: 'react-router', start: 'react-router', needle: 'react-router' }
];

for (const sig of signatures) {
  const idx = content.indexOf(sig.needle);
  console.log(`  ${sig.name.padEnd(30)}: needle "${sig.needle}" found at index ${idx}`);
}

// Check other files in dist/assets
console.log('\n--- All files in dist/assets ---');
for (const f of files) {
  const stat = fs.statSync(path.join(distDir, f));
  console.log(`  ${f.padEnd(40)}: ${(stat.size / 1024).toFixed(2)} KB`);
}
