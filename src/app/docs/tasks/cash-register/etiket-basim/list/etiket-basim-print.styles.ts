export const ETIKET_BASIM_PRINT_STYLES = `
  @page {
    size: 60mm 40mm;
    margin: 0;
  }

  @media print {
    html,
    body {
      width: 60mm !important;
      min-width: 60mm !important;
      max-width: 60mm !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body.etiket-basim-printing > :not(.etiket-basim-print-root) {
      display: none !important;
    }

    .app-sidebar,
    .topbar,
    .topbar-mobile,
    .sidebar-backdrop,
    .etiket-basim-screen {
      display: none !important;
    }

    .content-wrapper {
      padding: 0 !important;
      margin: 0 !important;
    }

    .etiket-basim-print-root {
      position: static !important;
      inset: auto !important;
      width: 60mm !important;
      min-width: 60mm !important;
      max-width: 60mm !important;
      margin: 0 !important;
      padding: 0 !important;
      display: block !important;
      visibility: visible !important;
      pointer-events: auto !important;
      background: #fff !important;
    }

    .etiket-basim-print-root * {
      visibility: visible !important;
    }

    .print-label {
      width: 60mm !important;
      height: 40mm !important;
      margin: 0 !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      break-after: page !important;
      page-break-after: always !important;
    }

    .print-label:last-child {
      break-after: auto !important;
      page-break-after: auto !important;
    }

    .print-label-content {
      width: 56mm !important;
      height: 36.5mm !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      border: 0 !important;
      transform: none !important;
      transform-origin: initial !important;
      writing-mode: horizontal-tb !important;
    }
  }
`;
