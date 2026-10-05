import fs from 'fs';
import path from 'path';

const pkgs = [
  'jspdf',
  'html2canvas',
  'leaflet',
  'react-leaflet',
  'dompurify',
  'framer-motion',
  'lucide-react',
  'react',
  'react-dom',
  'react-router-dom'
];

console.log('--- Direct Dependency Size Breakdown in node_modules ---');
for (const pkg of pkgs) {
  const pkgDir = path.resolve('frontend', 'node_modules', pkg);
  if (!fs.existsSync(pkgDir)) {
    console.log(`  ${pkg.padEnd(20)}: Not found`);
    continue;
  }
  
  let totalSize = 0;
  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fp = path.join(dir, f);
      const s = fs.statSync(fp);
      if (s.isDirectory()) walk(fp);
      else if (f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.cjs')) {
        totalSize += s.size;
      }
    }
  }
  
  const distDir = path.join(pkgDir, 'dist');
  if (fs.existsSync(distDir)) {
    let distSize = 0;
    const files = fs.readdirSync(distDir);
    for (const f of files) {
      const fp = path.join(distDir, f);
      const s = fs.statSync(fp);
      if (!s.isDirectory() && (f.endsWith('.js') || f.endsWith('.mjs'))) {
        distSize += s.size;
      }
    }
    console.log(`  ${pkg.padEnd(20)}: dist ~${(distSize / 1024).toFixed(1)} KB`);
  } else {
    walk(pkgDir);
    console.log(`  ${pkg.padEnd(20)}: JS ~${(totalSize / 1024).toFixed(1)} KB`);
  }
}
