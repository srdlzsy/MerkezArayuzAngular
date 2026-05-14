import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/app');

const walk = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
};

const files = walk(root).filter((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes('implements OnInit') && content.includes('protected getDetailLines(): Record<string, unknown>[]');
});

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes("import { finalize } from 'rxjs';")) {
    content = content.replace(/import\s+\{[^}]+\}\s+from '@angular\/core';\s*\n/, (match) => `${match}import { finalize } from 'rxjs';\n`);
  }

  content = content.replaceAll(
    '(this.selectedDetail as Record<string, unknown>)',
    '(this.selectedDetail as unknown as Record<string, unknown>)'
  );

  content = content.replace(/\nprotected readonly taskService = inject\(/g, '\n  protected readonly taskService = inject(');

  fs.writeFileSync(filePath, content);
}

console.log(`Fixed ${files.length} inlined task pages.`);
