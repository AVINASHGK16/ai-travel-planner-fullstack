import fs from 'fs';
import path from 'path';

const distDir = path.resolve('frontend', 'dist', 'assets');
const files = fs.readdirSync(distDir);
const main = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
const content = fs.readFileSync(path.join(distDir, main), 'utf-8');

const checks = [
  'react-dom',
  'react-router',
  'lucide',
  'framer-motion',
  'leaflet',
  'jspdf',
  'AuthModal',
  'SettingsPanel',
  'SettingsForm',
  'AppHeader',
  'AppSidebar',
  'HelpModal',
  'PreferencesContext',
  'AuthContext',
  'apiClient',
  'storage',
  'currency'
];

for (const chk of checks) {
  const count = (content.match(new RegExp(chk, 'gi')) || []).length;
  console.log(`  ${chk.padEnd(20)}: ${count} occurrences`);
}
