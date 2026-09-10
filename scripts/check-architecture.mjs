import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const root = process.cwd();
const failures = [];

const lineBudgets = [
  [
    'src/app/docs/tasks/integration/axata-senkronizasyonu/list/axata-senkronizasyonu-list.component.ts',
    5500,
  ],
  ['src/app/docs/tasks/edocuments/fatura-islemleri/list/fatura-islemleri-list.component.ts', 3800],
  [
    'src/app/docs/tasks/corrections/mikro-evrak-duzenleme/list/mikro-evrak-duzenleme-list.component.ts',
    2700,
  ],
];

for (const [file, maximum] of lineBudgets) {
  const count = read(file).split(/\r?\n/).length;

  if (count > maximum) {
    failures.push(`${file}: ${count} lines exceeds the temporary ${maximum}-line budget.`);
  }
}

assertMaximumOccurrences('src/styles.scss', '!important', 105);
assertMaximumOccurrences('src/styles/_operational-shell.scss', '!important', 0);

const taskTypeScriptFiles = walk(join(root, 'src/app/docs/tasks')).filter(
  (file) => extname(file) === '.ts',
);

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
