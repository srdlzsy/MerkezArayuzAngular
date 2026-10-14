export type LabelPriceChangeStatus =
  | 'initial'
  | 'increased'
  | 'decreased'
  | 'unchanged'
  | 'unavailable';

interface LabelPriceValues {
  readonly oldPrice: unknown;
  readonly price: unknown;
}

export function resolveLabelPriceChangeStatus(
  product: LabelPriceValues
): LabelPriceChangeStatus {
  const oldPrice = normalizeLabelPrice(product.oldPrice);
  const price = normalizeLabelPrice(product.price);

  if (oldPrice === null || price === null) {
    return 'unavailable';
  }

  const oldPriceInCents = Math.round(oldPrice * 100);
  const priceInCents = Math.round(price * 100);

  if (oldPriceInCents <= 0 && priceInCents > 0) {
    return 'initial';
  }

  if (oldPriceInCents < priceInCents) {
    return 'increased';
  }

  if (oldPriceInCents > priceInCents) {
    return 'decreased';
  }

  return 'unchanged';
}

export function getLabelPriceDifference(product: LabelPriceValues): number | null {
  const status = resolveLabelPriceChangeStatus(product);

  if (status === 'initial' || status === 'unavailable') {
    return null;
  }

  const oldPrice = normalizeLabelPrice(product.oldPrice);
  const price = normalizeLabelPrice(product.price);

  if (oldPrice === null || price === null) {
    return null;
  }

  return (Math.round(price * 100) - Math.round(oldPrice * 100)) / 100;
}

export function normalizeLabelPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const price = Number(value);
  return Number.isFinite(price) ? price : null;
}
