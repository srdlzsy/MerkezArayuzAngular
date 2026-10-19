export const CENTRAL_WAREHOUSE_NO = 50;

const PACKAGE_MULTIPLE_TOLERANCE = 0.000001;

export interface PackageQuantityViolation {
  quantity: number;
  packageFactor: number;
  lowerQuantity: number | null;
  upperQuantity: number;
}

export function getPackageQuantityViolation(
  quantity: number,
  packageFactor: number,
): PackageQuantityViolation | null {
  const normalizedPackageFactor = Math.abs(packageFactor);

  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(normalizedPackageFactor) ||
    quantity <= 0 ||
    normalizedPackageFactor <= 1
  ) {
    return null;
  }

  const packageCount = quantity / normalizedPackageFactor;
  if (Math.abs(packageCount - Math.round(packageCount)) <= PACKAGE_MULTIPLE_TOLERANCE) {
    return null;
  }

  const lowerQuantity = Math.floor(packageCount) * normalizedPackageFactor;

  return {
    quantity,
    packageFactor: normalizedPackageFactor,
    lowerQuantity: lowerQuantity > PACKAGE_MULTIPLE_TOLERANCE ? lowerQuantity : null,
    upperQuantity: Math.ceil(packageCount) * normalizedPackageFactor,
  };
}

export function buildPackageQuantityMessage(
  violation: PackageQuantityViolation,
  unitName = 'birim',
): string {
  const validQuantities = violation.lowerQuantity
    ? `${formatQuantity(violation.lowerQuantity)} veya ${formatQuantity(violation.upperQuantity)}`
    : formatQuantity(violation.upperQuantity);

  return `Koli ici ${formatQuantity(violation.packageFactor)} ${unitName}. ${formatQuantity(violation.quantity)} yerine ${validQuantities} girin.`;
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 6 }).format(value);
}
