import { createAppAssetSignature, extractAppAssetSignature } from './app-update.helpers';

describe('app update helpers', () => {
  it('creates a stable signature from hashed application assets', () => {
    const signature = createAppAssetSignature([
      'styles-STYLE123.css',
      'https://cdn.example.com/vendor.css',
      'https://sube.example.com/furpa/main-MAIN123.js?cache=1',
      '/furpa/polyfills-POLY123.js'
    ]);

    expect(signature).toBe(
      'main-MAIN123.js|polyfills-POLY123.js|styles-STYLE123.css'
    );
  });

  it('extracts the deployed application signature from index html', () => {
    const signature = extractAppAssetSignature(`
      <link rel="stylesheet" href="styles-NEWSTYLE.css">
      <script src="polyfills-NEWPOLY.js"></script>
      <script type="module" src="main-NEWMAIN.js"></script>
    `);

    expect(signature).toBe(
      'main-NEWMAIN.js|polyfills-NEWPOLY.js|styles-NEWSTYLE.css'
    );
  });

  it('ignores unversioned third-party assets', () => {
    expect(extractAppAssetSignature(`
      <link rel="stylesheet" href="assets/theme.css">
      <script src="main.js"></script>
    `)).toBe('');
  });
});
