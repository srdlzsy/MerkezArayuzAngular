import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const srcAppDir = path.join(rootDir, 'src', 'app');
const featuresDir = path.join(srcAppDir, 'features');

const dynamicTaskFeatureMap = new Map([
  ['ariza-bildirim-page', 'issue'],
  ['depolara-iadeten-sevkler-page', 'returns'],
  ['firmalara-iadeten-sevkler-page', 'returns'],
  ['deger-farki-giris-faturalari-page', 'receiving'],
  ['depo-dagitim-mal-kabul-fisleri-page', 'receiving'],
  ['gider-pusulasi-giris-fisleri-page', 'receiving'],
  ['halden-alis-giris-faturalari-page', 'receiving'],
  ['perakende-giris-faturalari-page', 'receiving'],
  ['toptan-giris-faturalari-page', 'receiving'],
  ['deger-farki-cikis-faturalari-page', 'shipment'],
  ['depo-dagitim-sevk-fisleri-page', 'shipment'],
  ['perakende-cikis-faturalari-page', 'shipment'],
  ['perakende-cikis-irsaliyeleri-page', 'shipment'],
  ['toptan-cikis-faturalari-page', 'shipment'],
  ['toptan-cikis-irsaliyeleri-page', 'shipment'],
  ['alinan-otomatik-depo-siparisleri-page', 'orders'],
  ['alinan-otomatik-siparisler-page', 'orders'],
  ['alinan-siparisler-page', 'orders'],
  ['fire-depo-cikis-fisleri-page', 'stock-output'],
  ['sarf-depo-cikis-fisleri-page', 'stock-output'],
  ['sayim-depo-cikis-fisleri-page', 'stock-output'],
  ['stok-devir-depo-cikis-fisleri-page', 'stock-output'],
  ['uretim-depo-cikis-fisleri-page', 'stock-output'],
  ['sayim-depo-giris-fisleri-page', 'stock-input'],
  ['stok-devir-depo-giris-fisleri-page', 'stock-input'],
  ['uretim-depo-giris-fisleri-page', 'stock-input'],
  ['stok-virman-cikis-fisleri-page', 'stock-transfer'],
  ['stok-virman-giris-fisleri-page', 'stock-transfer'],
  ['sayim-sonuclari-page', 'inventory']
]);

const movedFileMap = new Map();
const movedTsFiles = [];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeImportPath(value) {
  return value.split(path.sep).join('/');
}

function toImportSpecifier(fromFile, toFile) {
  const relativePath = path.relative(path.dirname(fromFile), toFile);
  const normalized = normalizeImportPath(relativePath);
  const withoutExtension = normalized.replace(/\.(ts|js|mjs|cjs)$/, '');
  return withoutExtension.startsWith('.') ? withoutExtension : `./${withoutExtension}`;
}

function tryResolveFile(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.js')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function moveFile(oldFile, newFile) {
  ensureDir(path.dirname(newFile));
  fs.renameSync(oldFile, newFile);
  movedFileMap.set(path.resolve(oldFile), path.resolve(newFile));
  if (newFile.endsWith('.ts')) {
    movedTsFiles.push({
      oldFile: path.resolve(oldFile),
      newFile: path.resolve(newFile)
    });
  }
}

function moveDirectoryContents(oldDir, newDir) {
  if (!fs.existsSync(oldDir)) {
    return;
  }

  ensureDir(newDir);
  for (const entry of fs.readdirSync(oldDir, { withFileTypes: true })) {
    const oldPath = path.join(oldDir, entry.name);
    const newPath = path.join(newDir, entry.name);
    if (entry.isDirectory()) {
      moveDirectoryContents(oldPath, newPath);
      if (fs.existsSync(oldPath) && fs.readdirSync(oldPath).length === 0) {
        fs.rmdirSync(oldPath);
      }
      continue;
    }

    moveFile(oldPath, newPath);
  }
}

function getPageDirectories() {
  const featureNames = fs.readdirSync(featuresDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const pageDirs = [];

  for (const featureEntry of featureNames) {
    const pagesDir = path.join(featuresDir, featureEntry.name, 'pages');
    if (!fs.existsSync(pagesDir)) {
      continue;
    }

    for (const pageEntry of fs.readdirSync(pagesDir, { withFileTypes: true })) {
      if (pageEntry.isDirectory() && pageEntry.name.endsWith('-page')) {
        pageDirs.push({
          sourceFeature: featureEntry.name,
          oldDir: path.join(pagesDir, pageEntry.name),
          pageDirName: pageEntry.name
        });
      }
    }
  }

  return pageDirs;
}

function resolveTargetFeature(sourceFeature, pageDirName) {
  if (sourceFeature !== 'dynamic-tasks') {
    return sourceFeature;
  }

  return dynamicTaskFeatureMap.get(pageDirName) ?? sourceFeature;
}

function relocatePageDirectory(pageDir) {
  const targetFeature = resolveTargetFeature(pageDir.sourceFeature, pageDir.pageDirName);
  const taskName = pageDir.pageDirName.replace(/-page$/, '');
  const taskRoot = path.join(featuresDir, targetFeature, 'tasks', taskName);
  const listDir = path.join(taskRoot, 'list');
  const createDir = path.join(taskRoot, 'create');
  const detailDir = path.join(taskRoot, 'detail');
  const dataAccessDir = path.join(taskRoot, 'data-access');

  ensureDir(listDir);

  for (const entry of fs.readdirSync(pageDir.oldDir, { withFileTypes: true })) {
    const oldPath = path.join(pageDir.oldDir, entry.name);

    if (entry.isFile()) {
      moveFile(oldPath, path.join(listDir, entry.name));
      continue;
    }

    if (entry.name === 'components') {
      const createDialogDir = path.join(oldPath, 'create-dialog');
      const detailDialogDir = path.join(oldPath, 'detail-dialog');
      const listComponentDir = path.join(oldPath, 'list');

      if (fs.existsSync(createDialogDir)) {
        moveDirectoryContents(createDialogDir, createDir);
      }

      if (fs.existsSync(detailDialogDir)) {
        moveDirectoryContents(detailDialogDir, detailDir);
      }

      if (fs.existsSync(listComponentDir)) {
        moveDirectoryContents(listComponentDir, path.join(listDir, 'components', 'list'));
      }

      continue;
    }

    if (entry.name === 'data-access') {
      moveDirectoryContents(oldPath, dataAccessDir);
      continue;
    }

    moveDirectoryContents(oldPath, path.join(taskRoot, entry.name));
  }
}

function cleanupEmptyDirectories(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      cleanupEmptyDirectories(path.join(directory, entry.name));
    }
  }

  if (fs.readdirSync(directory).length === 0) {
    fs.rmdirSync(directory);
  }
}

function rewriteRelativeSpecifiers(filePath, oldFilePath = null) {
  const originalContent = fs.readFileSync(filePath, 'utf8');
  let updatedContent = originalContent;

  updatedContent = updatedContent.replace(
    /((?:import|export)\s+(?:[^'"]*?\s+from\s+)?|import\()\s*(['"])(\.[^'"]+)\2/g,
    (fullMatch, prefix, quote, specifier) => {
      const baseFile = oldFilePath ?? filePath;
      const oldResolved = tryResolveFile(path.resolve(path.dirname(baseFile), specifier));
      if (!oldResolved) {
        return fullMatch;
      }

      const mappedTarget = movedFileMap.get(path.resolve(oldResolved));
      if (!mappedTarget) {
        return fullMatch;
      }

      const nextSpecifier = toImportSpecifier(filePath, mappedTarget);
      return `${prefix}${quote}${nextSpecifier}${quote}`;
    }
  );

  if (updatedContent !== originalContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
  }
}

for (const pageDir of getPageDirectories()) {
  relocatePageDirectory(pageDir);
}

for (const { oldFile, newFile } of movedTsFiles) {
  rewriteRelativeSpecifiers(newFile, oldFile);
}

const staticTsFiles = [
  path.join(srcAppDir, 'app.routes.ts'),
  path.join(srcAppDir, 'app.config.ts'),
  path.join(srcAppDir, 'app.ts')
];

for (const filePath of staticTsFiles) {
  if (fs.existsSync(filePath)) {
    rewriteRelativeSpecifiers(filePath);
  }
}

for (const featureEntry of fs.readdirSync(featuresDir, { withFileTypes: true })) {
  if (featureEntry.isDirectory()) {
    cleanupEmptyDirectories(path.join(featuresDir, featureEntry.name, 'pages'));
  }
}

