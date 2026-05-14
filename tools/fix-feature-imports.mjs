import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const srcAppDir = path.join(rootDir, 'src', 'app');

function getAllFiles(dirPath, predicate = () => true) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(entryPath, predicate));
      continue;
    }

    if (predicate(entryPath)) {
      results.push(entryPath);
    }
  }

  return results;
}

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

function toImportSpecifier(fromFile, toFile) {
  const relativePath = normalizePath(path.relative(path.dirname(fromFile), toFile));
  const withoutExtension = relativePath.replace(/\.(ts|js|mjs|cjs)$/, '');
  return withoutExtension.startsWith('.') ? withoutExtension : `./${withoutExtension}`;
}

function resolveImport(fromFile, specifier) {
  const rawBase = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    rawBase,
    `${rawBase}.ts`,
    `${rawBase}.js`,
    `${rawBase}.mjs`,
    `${rawBase}.cjs`,
    path.join(rawBase, 'index.ts'),
    path.join(rawBase, 'index.js')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function extractTaskRoot(filePath) {
  const segments = filePath.split(path.sep);
  const tasksIndex = segments.lastIndexOf('tasks');
  if (tasksIndex < 0) {
    return null;
  }

  return path.join(...segments.slice(0, tasksIndex + 2));
}

const allTsFiles = getAllFiles(srcAppDir, (filePath) => filePath.endsWith('.ts'));

const tsIndex = new Map();
for (const filePath of allTsFiles) {
  const basename = path.basename(filePath, '.ts');
  const list = tsIndex.get(basename) ?? [];
  list.push(filePath);
  tsIndex.set(basename, list);
}

function convertAlias(specifier) {
  const coreMatch = specifier.match(/^(?:\.\.\/)+core\/(.+)$/);
  if (coreMatch) {
    return `@core/${coreMatch[1]}`;
  }

  return specifier;
}

function resolveByBasename(fromFile, specifier) {
  const importName = path.basename(specifier);
  const matches = tsIndex.get(importName) ?? [];
  if (matches.length === 1) {
    return matches[0];
  }

  const taskRoot = extractTaskRoot(fromFile);
  if (taskRoot) {
    const taskMatches = matches.filter((filePath) => filePath.startsWith(taskRoot + path.sep));
    if (taskMatches.length === 1) {
      return taskMatches[0];
    }
  }

  return null;
}

function replaceSpecifiers(filePath) {
  const originalContent = fs.readFileSync(filePath, 'utf8');
  let updatedContent = originalContent;

  updatedContent = updatedContent.replace(
    /((?:import|export)\s+(?:[^'"]*?\s+from\s+)?|import\()\s*(['"])([^'"]+)\2/g,
    (fullMatch, prefix, quote, specifier) => {
      const aliasedSpecifier = convertAlias(specifier);
      if (aliasedSpecifier !== specifier) {
        return `${prefix}${quote}${aliasedSpecifier}${quote}`;
      }

      if (!specifier.startsWith('.')) {
        return fullMatch;
      }

      if (resolveImport(filePath, specifier)) {
        return fullMatch;
      }

      const targetFile = resolveByBasename(filePath, specifier);
      if (!targetFile) {
        return fullMatch;
      }

      return `${prefix}${quote}${toImportSpecifier(filePath, targetFile)}${quote}`;
    }
  );

  if (updatedContent !== originalContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
  }
}

for (const filePath of allTsFiles) {
  replaceSpecifiers(filePath);
}
