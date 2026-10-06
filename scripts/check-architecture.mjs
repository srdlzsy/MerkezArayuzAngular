import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const root = process.cwd();
const failures = [];

const legacyLineBudgets = [
  [
    'src/app/docs/tasks/integration/axata-senkronizasyonu/list/axata-senkronizasyonu-list.component.ts',
    5460,
  ],
  ['src/app/docs/tasks/edocuments/fatura-islemleri/list/fatura-islemleri-list.component.ts', 3690],
  [
    'src/app/docs/tasks/corrections/mikro-evrak-duzenleme/list/mikro-evrak-duzenleme-list.component.ts',
    2700,
  ],
];

for (const [file, maximum] of legacyLineBudgets) {
  const count = read(file).split(/\r?\n/).length;

  if (count > maximum) {
    failures.push(`${file}: ${count} lines exceeds the temporary ${maximum}-line budget.`);
  }
}

const legacyBudgetFiles = new Set(legacyLineBudgets.map(([file]) => join(root, file)));
const taskFiles = walk(join(root, 'src/app/docs/tasks'));
const taskTypeScriptFiles = taskFiles.filter((file) => extname(file) === '.ts');
const componentTypeScriptFiles = taskTypeScriptFiles.filter((file) => file.endsWith('.component.ts'));
const componentStyleFiles = taskFiles.filter((file) => file.endsWith('.component.scss'));

for (const file of componentTypeScriptFiles) {
  if (!legacyBudgetFiles.has(file)) {
    assertMaximumLines(file, 2100, 'component TypeScript');
  }
}

for (const file of componentStyleFiles) {
  assertMaximumLines(file, 1750, 'component stylesheet');
}

assertMaximumOccurrences('src/styles.scss', '!important', 0);
assertMaximumOccurrences('src/styles/_operational-shell.scss', '!important', 0);
assertMaximumOccurrences('src/styles/_task-dialog-overrides.scss', '!important', 0);
assertMaximumPatternOccurrences(
  walk(join(root, 'src/app')).filter(
    (file) => extname(file) === '.ts' && !file.endsWith('.spec.ts'),
  ),
  /\bany\b/g,
  0,
  'explicit any types in production application code',
);
assertMaximumPatternOccurrences(
  walk(join(root, 'src')).filter((file) => extname(file) === '.scss'),
  /font-size\s*:\s*0\.(?:[0-6]\d*)rem/g,
  478,
  'font sizes below 0.7rem',
);
assertForbiddenText(
  'src/styles.scss',
  '\n.docs-task-dialog-panel .subtitle,',
  'Dialog subtitles must stay visible by default; compact hiding requires the opt-in class.',
);

const criticalBehaviorSpecs = [
  'src/app/core/auth/guards/auth.guards.spec.ts',
  'src/app/core/auth/services/auth.service.spec.ts',
  'src/app/core/api/module-services/critical-create-api.spec.ts',
  'src/app/docs/tasks/core/critical-create-components.spec.ts',
  'src/app/docs/tasks/core/api-detail-page/kalemli-task-detail.base.spec.ts',
  'src/app/docs/tasks/core/api-list-page/api-task-list-page.base.spec.ts',
  'src/app/docs/tasks/core/api-list-table/api-list-table.component.spec.ts',
  'src/app/docs/tasks/core/document-print/document-print.service.spec.ts',
  'src/app/docs/tasks/core/document-print/in-place-print.service.spec.ts',
  'src/app/docs/tasks/core/safe-create-retry.helpers.spec.ts',
  'src/app/docs/tasks/core/task-dialog.config.spec.ts',
  'src/app/docs/tasks/cash-register/etiket-belgeleri/list/etiket-belgeleri-list.component.spec.ts',
];

for (const file of criticalBehaviorSpecs) {
  if (!existsSync(join(root, file))) {
    failures.push(`${file}: required critical behavior spec is missing.`);
  }
}

for (const file of taskTypeScriptFiles) {
  const content = readAbsolute(file);

  if (!content.includes("templateUrl: '../../../core/api-list-page/api-list-page.template.html'")) {
    continue;
  }

  const staleLocalTemplate = file.replace(/\.ts$/, '.html');

  if (existsSync(staleLocalTemplate)) {
    failures.push(
      `${staleLocalTemplate}: unused local template exists beside a shared-template list page.`,
    );
  }
}

const directPrintCount = taskTypeScriptFiles.reduce(
  (total, file) => total + countOccurrences(readAbsolute(file), 'window.print('),
  0,
);

if (directPrintCount > 0) {
  failures.push(
    `Direct window.print() usage increased to ${directPrintCount}; use a document-print service instead.`,
  );
}

if (failures.length) {
  console.error('Architecture checks failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Architecture checks passed.');
}

function assertMaximumOccurrences(file, search, maximum) {
  const count = countOccurrences(read(file), search);

  if (count > maximum) {
    failures.push(`${file}: ${count} occurrences of ${search}; maximum is ${maximum}.`);
  }
}

function assertMaximumLines(file, maximum, label) {
  const count = readAbsolute(file).split(/\r?\n/).length;

  if (count > maximum) {
    failures.push(`${file}: ${count} lines exceeds the ${maximum}-line ${label} budget.`);
  }
}

function assertMaximumPatternOccurrences(files, pattern, maximum, label) {
  const count = files.reduce(
    (total, file) => total + (readAbsolute(file).match(pattern) ?? []).length,
    0,
  );

  if (count > maximum) {
    failures.push(`${label}: ${count} occurrences; maximum is ${maximum}.`);
  }
}

function assertForbiddenText(file, search, message) {
  if (read(file).includes(search)) {
    failures.push(`${file}: ${message}`);
  }
}

function countOccurrences(content, search) {
  return content.split(search).length - 1;
}

function read(file) {
  return readAbsolute(join(root, file));
}

function readAbsolute(file) {
  return readFileSync(file, 'utf8');
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
