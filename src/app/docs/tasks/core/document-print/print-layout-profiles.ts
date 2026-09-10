import { ETIKET_BASIM_PRINT_STYLES } from '../../cash-register/etiket-basim/list/etiket-basim-print.styles';

export interface PrintLayoutProfile {
  id: string;
  name: string;
  stylesheet?: string;
  styles?: string;
  pageSize: string;
  pageSelector: string;
  pageWidthMm: number;
  pageHeightMm: number;
  itemSelector: string;
  itemsPerPage: number;
}

export const PRINT_LAYOUT_PROFILES: readonly PrintLayoutProfile[] = [
  {
    id: 'a5-quad-price',
    name: 'A5 Dortlu Fiyat Etiketi',
    stylesheet: '/assets/a5-quad-price-print.css',
    pageSize: 'A5 landscape',
    pageSelector: '.a5-quad-page',
    pageWidthMm: 209,
    pageHeightMm: 146,
    itemSelector: '.quad-label-card',
    itemsPerPage: 4
  },
  {
    id: 'manav-kunye-a5',
    name: 'Manav Kunye A4 Ikili',
    stylesheet: '/assets/manav-kunye-a5.css',
    pageSize: 'A4 portrait',
    pageSelector: '.manav-a4-sheet',
    pageWidthMm: 198,
    pageHeightMm: 285,
    itemSelector: '.manav-a5-page',
    itemsPerPage: 2
  },
  {
    id: 'kunye-a4-quad',
    name: 'Kunye A4 Dortlu',
    stylesheet: '/assets/tagLabel.css',
    pageSize: 'A4 portrait',
    pageSelector: '.print-sheet',
    pageWidthMm: 198,
    pageHeightMm: 285,
    itemSelector: '.label-wrapper',
    itemsPerPage: 4
  },
  {
    id: 'argox-roll-label',
    name: 'Argox Rulo Etiketi',
    styles: ETIKET_BASIM_PRINT_STYLES,
    pageSize: '57.9mm 38.9mm',
    pageSelector: '.print-label',
    pageWidthMm: 57.9,
    pageHeightMm: 38.9,
    itemSelector: '.print-label-content',
    itemsPerPage: 1
  }
];
