import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDirectory);
const outputConfig = join(projectRoot, 'dist', 'angularv20', 'browser', 'web.config');
const internetConfig = join(scriptDirectory, 'iis', 'web.internet.config');

if (!existsSync(outputConfig)) {
  throw new Error(`Build web.config dosyasi bulunamadi: ${outputConfig}`);
}

copyFileSync(internetConfig, outputConfig);
console.log('Internet IIS profili uygulandi: ayni-origin /api reverse proxy etkin.');
