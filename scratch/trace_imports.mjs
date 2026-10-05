import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('frontend', 'src');

function parseImports(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const importRegex = /import\s+(?:(?:(?:[^\s{},]+|\{[^}]*\})\s+from\s+)?['"]([^'"]+)['"]|['"]([^'"]+)['"])/g;
  const matches = [];
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    const importPath = m[1] || m[2];
    if (importPath && !importPath.endsWith('.css')) {
      matches.push(importPath);
    }
  }
  return matches;
}

function resolvePath(baseFile, importPath) {
  if (importPath.startsWith('.')) {
    const dir = path.dirname(baseFile);
    let resolved = path.resolve(dir, importPath);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      resolved = path.join(resolved, 'index.js');
    }
    const candidates = [
      resolved,
      resolved + '.js',
      resolved + '.jsx',
      resolved + '/index.js',
      resolved + '/index.jsx'
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && !fs.statSync(c).isDirectory()) {
        return c;
      }
    }
  }
  return importPath; // node_module
}

function buildTree(entryFile, visited = new Set(), depth = 0) {
  visited.add(entryFile);
  const imports = parseImports(entryFile);
  const result = { file: path.relative(srcDir, entryFile), depth, children: [], modules: [] };

  for (const imp of imports) {
    const resolved = resolvePath(entryFile, imp);
    if (resolved.startsWith(srcDir)) {
      if (!visited.has(resolved)) {
        result.children.push(buildTree(resolved, new Set(visited), depth + 1));
      } else {
        result.children.push({ file: path.relative(srcDir, resolved) + ' (circular/visited)', depth: depth + 1, children: [], modules: [] });
      }
    } else {
      result.modules.push(imp);
    }
  }
  return result;
}

const mainTree = buildTree(path.join(srcDir, 'main.jsx'));
console.log('--- Static Import Tree from main.jsx (Sync graph) ---');

function printTree(node, indent = '') {
  console.log(`${indent}📄 ${node.file}${node.modules.length ? ' [npm: ' + node.modules.join(', ') + ']' : ''}`);
  for (const child of node.children) {
    printTree(child, indent + '  ');
  }
}

printTree(mainTree);
