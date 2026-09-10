export const ETIKET_BASIM_PRINT_STYLES = `
  @page {
    size: 57.9mm 38.9mm;
    margin: 0;
  }

  .print-label,
  .print-label-content {
    width: 57.9mm;
    height: 38.9mm;
    box-sizing: border-box;
  }

  @media print {
    html,
    body {
      width: 57.9mm !important;
      min-width: 57.9mm !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      overflow: visible !important;
    }

    body * {
      visibility: hidden !important;
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
    }

    .etiket-basim-print-root {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: auto !important;
      width: 57.9mm !important;
      min-width: 57.9mm !important;
      margin: 0 !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      visibility: visible !important;
      gap: 0 !important;
      pointer-events: auto !important;
    }

    .etiket-basim-print-root,
    .etiket-basim-print-root * {
      visibility: visible !important;
    }

    .print-label {
      width: 57.9mm !important;
      height: 38.9mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      break-after: page !important;
      page-break-after: always !important;
    }

    .print-label-content {
      width: 57.9mm !important;
      height: 38.9mm !important;
      box-sizing: border-box !important;
      transform: none !important;
      transform-origin: initial !important;
      writing-mode: horizontal-tb !important;
    }

    .print-label:last-child {
      break-after: auto !important;
      page-break-after: auto !important;
    }
  }
`;
