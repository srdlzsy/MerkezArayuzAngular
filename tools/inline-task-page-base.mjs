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

const taskFiles = walk(root).filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('extends TaskPageBase<'));

const ensureOnInitImport = (content) =>
  content.replace(/import\s*\{([^}]+)\}\s*from '@angular\/core';/, (_, imports) => {
    const parts = imports
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!parts.includes('OnInit')) {
      const injectIndex = parts.indexOf('inject');
      if (injectIndex >= 0) {
        parts.splice(injectIndex, 0, 'OnInit');
      } else {
        parts.push('OnInit');
      }
    }

    return `import { ${parts.join(', ')} } from '@angular/core';`;
  });

const ensureFinalizeImport = (content) => {
  if (content.includes("import { finalize } from 'rxjs';")) {
    return content;
  }

  return content.replace(/import\s*\{[^}]+\}\s*from '@angular\/forms';\s*/, (match) => `${match}\nimport { finalize } from 'rxjs';\n`);
};

for (const filePath of taskFiles) {
  const original = fs.readFileSync(filePath, 'utf8');
  const classMatch = original.match(
    /export class (\w+)\s+extends TaskPageBase<\s*([^,\n]+),\s*([^,\n]+),\s*([^,\n]+),[\s\S]*?>\s*\{([\s\S]*)\n\}\s*$/
  );

  if (!classMatch) {
    throw new Error(`Could not parse class in ${filePath}`);
  }

  const [, className, listType, detailType, createType, classBody] = classMatch;

  let updated = original.replace(/^.*TaskPageBase.*\r?\n/m, '');
  updated = ensureOnInitImport(updated);
  updated = ensureFinalizeImport(updated);

  const trimmedBody = classBody.trim();
  const newClass = `export class ${className} implements OnInit {\n  protected readonly pageSizeOptions = [10, 20, 50];\n\n  protected startDate = this.toInputDate(new Date());\n  protected endDate = this.toInputDate(new Date());\n  protected readonly maxDate = this.toInputDate(new Date());\n\n  protected items: ${listType}[] = [];\n  protected selectedDetail: ${detailType} | null = null;\n\n  protected isLoading = false;\n  protected isDetailLoading = false;\n  protected isCreateSubmitting = false;\n\n  protected isCreateDialogOpen = false;\n  protected isDetailDialogOpen = false;\n\n  protected errorMessage = '';\n  protected detailErrorMessage = '';\n  protected createErrorMessage = '';\n\n  protected currentPage = 1;\n  protected pageSize = 10;\n  protected createForm: ${createType} = this.createEmptyCreateModel();\n\n  protected readonly createDescription =\n    'Bu ekranin yeni kayit formu ozel olarak kurulacak. Simdilik liste ve detay akisi hazir.';\n  protected readonly createSaveEnabled = false;\n\n${trimmedBody}\n\n  ngOnInit(): void {\n    this.loadItems();\n  }\n\n  protected get totalPages(): number {\n    return Math.max(1, Math.ceil(this.items.length / this.pageSize));\n  }\n\n  protected get pagedItems(): ${listType}[] {\n    const startIndex = (this.currentPage - 1) * this.pageSize;\n    return this.items.slice(startIndex, startIndex + this.pageSize);\n  }\n\n  protected get rangeLabel(): string {\n    if (!this.items.length) {\n      return '0 - 0 / 0';\n    }\n\n    const start = (this.currentPage - 1) * this.pageSize + 1;\n    const end = Math.min(this.currentPage * this.pageSize, this.items.length);\n    return \`\${start} - \${end} / \${this.items.length}\`;\n  }\n\n  protected onStartDateChange(value: string): void {\n    this.startDate = value;\n\n    if (this.startDate > this.endDate) {\n      this.endDate = this.startDate;\n    }\n\n    this.loadItems();\n  }\n\n  protected onEndDateChange(value: string): void {\n    this.endDate = value;\n\n    if (this.endDate < this.startDate) {\n      this.startDate = this.endDate;\n    }\n\n    this.loadItems();\n  }\n\n  protected onPageSizeChange(pageSize: string): void {\n    this.pageSize = Number(pageSize);\n    this.currentPage = 1;\n  }\n\n  protected goToPreviousPage(): void {\n    if (this.currentPage > 1) {\n      this.currentPage -= 1;\n    }\n  }\n\n  protected goToNextPage(): void {\n    if (this.currentPage < this.totalPages) {\n      this.currentPage += 1;\n    }\n  }\n\n  protected openCreateDialog(): void {\n    this.createForm = this.createEmptyCreateModel();\n    this.createErrorMessage = '';\n    this.isCreateDialogOpen = true;\n  }\n\n  protected closeCreateDialog(): void {\n    this.isCreateDialogOpen = false;\n    this.createErrorMessage = '';\n  }\n\n  protected openDetailDialog(item: ${listType}): void {\n    this.isDetailDialogOpen = true;\n    this.isDetailLoading = true;\n    this.detailErrorMessage = '';\n    this.selectedDetail = null;\n\n    this.taskService\n      .detail<${detailType}>(this.taskSlug, ...this.getDetailSegments(item))\n      .pipe(finalize(() => (this.isDetailLoading = false)))\n      .subscribe({\n        next: (response) => {\n          this.selectedDetail = response;\n        },\n        error: () => {\n          this.detailErrorMessage = 'Detay bilgisi alinamadi.';\n        }\n      });\n  }\n\n  protected closeDetailDialog(): void {\n    this.isDetailDialogOpen = false;\n    this.selectedDetail = null;\n    this.detailErrorMessage = '';\n  }\n\n  protected submitCreate(): void {\n    if (!this.createSaveEnabled) {\n      this.createErrorMessage = 'Bu ekranin yeni kayit formu sonraki adimda ozel olarak kurulacak.';\n      return;\n    }\n\n    this.isCreateSubmitting = true;\n\n    this.taskService\n      .create(this.taskSlug, this.createForm)\n      .pipe(finalize(() => (this.isCreateSubmitting = false)))\n      .subscribe({\n        next: () => {\n          this.closeCreateDialog();\n          this.loadItems();\n        },\n        error: () => {\n          this.createErrorMessage = 'Kayit olusturulamadi.';\n        }\n      });\n  }\n\n  protected resolveValue(item: unknown | null, key: string, fallbackKey?: string): unknown {\n    if (!item) {\n      return '-';\n    }\n\n    const dictionary = item as Record<string, unknown>;\n    const value = dictionary[key];\n\n    if (value !== undefined && value !== null && value !== '') {\n      return value;\n    }\n\n    if (fallbackKey) {\n      return dictionary[fallbackKey] ?? '-';\n    }\n\n    return '-';\n  }\n\n  protected formatValue(value: unknown, format: 'text' | 'date' | 'number' = 'text'): string {\n    if (value === null || value === undefined || value === '') {\n      return '-';\n    }\n\n    if (format === 'date') {\n      const parsedDate = new Date(String(value));\n      if (Number.isNaN(parsedDate.getTime())) {\n        return String(value);\n      }\n\n      return parsedDate.toLocaleDateString('tr-TR');\n    }\n\n    return String(value);\n  }\n\n  protected getColumnClass(align?: 'left' | 'center' | 'right'): string {\n    if (align === 'center') {\n      return 'text-center';\n    }\n\n    if (align === 'right') {\n      return 'text-right';\n    }\n\n    return '';\n  }\n\n  protected getDetailLines(): Record<string, unknown>[] {\n    if (!this.selectedDetail) {\n      return [];\n    }\n\n    const lines = (this.selectedDetail as Record<string, unknown>)['kalemler'];\n    return Array.isArray(lines) ? (lines as Record<string, unknown>[]) : [];\n  }\n\n  protected getLineQuantity(line: Record<string, unknown>): number {\n    const quantity =\n      line['siparisMiktari'] ??\n      line['onerilenSiparisMiktari'] ??\n      line['sevkMiktari'] ??\n      line['malKabulMiktari'] ??\n      line['sevkMalKabulFarkMiktari'] ??\n      line['virmanMiktari'] ??\n      0;\n\n    return Number(quantity);\n  }\n\n  protected getDetailStatus(): string {\n    if (!this.selectedDetail) {\n      return '';\n    }\n\n    return String((this.selectedDetail as Record<string, unknown>)['durumu'] ?? '');\n  }\n\n  private loadItems(): void {\n    this.isLoading = true;\n    this.errorMessage = '';\n\n    this.taskService\n      .list<${listType}[]>(this.taskSlug, \`\${this.startDate}_\${this.endDate}\`)\n      .pipe(finalize(() => (this.isLoading = false)))\n      .subscribe({\n        next: (response) => {\n          this.items = response ?? [];\n          this.currentPage = 1;\n        },\n        error: () => {\n          this.items = [];\n          this.currentPage = 1;\n          this.errorMessage = 'Liste alinamadi.';\n        }\n      });\n  }\n\n  private toInputDate(date: Date): string {\n    return date.toISOString().slice(0, 10);\n  }\n}`;

  updated = updated.replace(
    /export class \w+\s+extends TaskPageBase<[\s\S]*?\n\}\s*$/,
    newClass
  );

  fs.writeFileSync(filePath, updated);
}

console.log(`Inlined TaskPageBase in ${taskFiles.length} files.`);
