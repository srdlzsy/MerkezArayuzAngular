import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const labelConfig = read(
  'src/app/docs/tasks/cash-register/etiket-belgeleri/etiket-belgeleri.config.ts',
);
const configuredStylesheets = [...labelConfig.matchAll(/ozelCss:\s*['"]([^'"]+)['"]/g)].map(
  (match) => match[1],
);

for (const stylesheet of new Set(configuredStylesheets)) {
  const relativePath = stylesheet.replace(/^\//, 'src/');

  if (!existsSync(join(root, relativePath))) {
    failures.push(`${stylesheet}: configured print stylesheet does not exist.`);
    continue;
  }

  const css = read(relativePath);
  if (!/@page\s*\{[\s\S]*?size\s*:/i.test(css)) {
    failures.push(`${stylesheet}: print stylesheet has no @page size contract.`);
  }
}

const contracts = [
  {
    file: 'src/assets/a5-quad-price-print.css',
    checks: [
      ['A5 landscape page', /size:\s*A5 landscape/i],
      ['209mm page width', /\.a5-quad-page\s*\{[\s\S]*?width:\s*209mm/i],
      ['146mm page height', /\.a5-quad-page\s*\{[\s\S]*?height:\s*146mm/i],
      ['97mm card width', /\.quad-label-card\s*\{[\s\S]*?width:\s*97mm/i],
      ['66.5mm card height', /\.quad-label-card\s*\{[\s\S]*?height:\s*66\.5mm/i],
    ],
  },
  {
    file: 'src/assets/manav-kunye-a5.css',
    checks: [
      ['A4 portrait page', /size:\s*A4 portrait/i],
      ['198mm sheet width', /\.manav-a4-sheet\s*\{[\s\S]*?width:\s*198mm/i],
      ['285mm sheet height', /\.manav-a4-sheet\s*\{[\s\S]*?height:\s*285mm/i],
      ['190mm label width', /\.manav-a5-page\s*\{[\s\S]*?width:\s*190mm/i],
      ['133mm label height', /\.manav-a5-page\s*\{[\s\S]*?height:\s*133mm/i],
    ],
  },
  {
    file: 'src/assets/tagLabel.css',
    checks: [
      ['A4 portrait page', /size:\s*A4 portrait/i],
      ['198mm sheet width', /\.print-sheet\s*\{[\s\S]*?width:\s*198mm/i],
      ['285mm sheet height', /\.print-sheet\s*\{[\s\S]*?height:\s*285mm/i],
      ['90mm label width', /\.label-wrapper\s*\{[\s\S]*?width:\s*90mm/i],
      ['106mm label height', /\.label-wrapper\s*\{[\s\S]*?height:\s*106mm/i],
    ],
  },
  {
    file: 'src/app/docs/tasks/cash-register/etiket-basim/list/etiket-basim-print.styles.ts',
    checks: [
      ['57.9mm x 38.9mm page', /size:\s*57\.9mm 38\.9mm/i],
      ['57.9mm label width', /\.print-label[\s\S]*?width:\s*57\.9mm/i],
      ['38.9mm label height', /\.print-label[\s\S]*?height:\s*38\.9mm/i],
      ['unrotated roll flow', /transform:\s*none/i]
    ]
  },
  {
    file: 'src/app/docs/tasks/cash-register/etiket-belgeleri/a5-ikili-ayin-urunu-fiyat-etiketi/a5-ikili-ayin-urunu-fiyat-etiketi.scss',
    checks: [
      ['210mm page width', /\.a5-page\s*\{[\s\S]*?width:\s*210mm/i],
      ['148mm page height', /\.a5-page\s*\{[\s\S]*?height:\s*148mm/i],
      ['two 49.5% labels', /\.etiket\s*\{[\s\S]*?width:\s*49\.5%/i],
    ],
  },
];

for (const contract of contracts) {
  const content = read(contract.file);
  for (const [label, pattern] of contract.checks) {
    if (!pattern.test(content)) {
      failures.push(`${contract.file}: missing ${label} contract.`);
    }
  }
}

const taskFiles = walkTaskTypeScript();
const directPrintFiles = taskFiles.filter(
  (file) =>
    !file.includes('/core/document-print/') &&
    /\bwindow\.print\s*\(|\bprintWindow\.print\s*\(|\.contentWindow\?*\.print\s*\(/.test(
      read(file),
    ),
);

if (directPrintFiles.length) {
  failures.push(
    `Direct print calls must stay in document-print services: ${directPrintFiles.join(', ')}.`,
  );
}

if (failures.length) {
  console.error('Print layout checks failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Print layout checks passed (${configuredStylesheets.length} label mappings, ${contracts.length} physical contracts).`,
  );
}

function read(file) {
  return readFileSync(join(root, file), 'utf8');
}

function walkTaskTypeScript() {
  const start = join(root, 'src/app/docs/tasks');

  function walk(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? walk(path)
        : path.endsWith('.ts')
          ? [path.slice(root.length + 1).replaceAll('\\', '/')]
          : [];
    });
  }

  return walk(start);
}
