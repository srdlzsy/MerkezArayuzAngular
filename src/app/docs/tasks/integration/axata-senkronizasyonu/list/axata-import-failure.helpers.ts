export type AxataImportFailureTone = 'danger' | 'warning' | 'neutral';

export interface AxataImportFailureView {
  key: string;
  reference: string;
  state: string;
  message: string;
  guidance: string;
  tone: AxataImportFailureTone;
}

export function buildAxataImportFailureViews(value: unknown): AxataImportFailureView[] {
  const failures = readArray(value, 'failures');

  return failures.map((failure, index) => {
    const message =
      readText(failure, ['errorMessage', 'message', 'detail']) || 'Belge islenemedi.';
    const reference = buildFailureReference(failure);
    const normalizedMessage = normalize(message);

    if (normalizedMessage.includes('requested by user id is required')) {
      return createView(
        index,
        reference,
        'Sunucu kontrolu gerekli',
        message,
        'UI istegini degistirmeyin. Belge ve takip bilgisini destek ekibine iletip backend yayini kontrol edin.',
        'danger'
      );
    }

    if (
      normalizedMessage.includes('iptal') ||
      normalizedMessage.includes('zero-quantity') ||
      normalizedMessage.includes('sifir miktar')
    ) {
      return createView(
        index,
        reference,
        "Atlandi - AXATA'da iptal",
        message,
        'Mikro fisi veya otomatik tekrar gerekmiyor.',
        'neutral'
      );
    }

    if (normalizedMessage.includes('mikro depolar arasi siparis bulunamadi')) {
      return createView(
        index,
        reference,
        'Kaynak siparis bulunamadi',
        message,
        'Belge seri/sira, kaynak depo ve Mikro siparis kaydini kontrol edin; C01 create islemini zorlamayin.',
        'warning'
      );
    }

    if (normalizedMessage.includes('guvenli eslesmedi')) {
      return createView(
        index,
        reference,
        'Satir farki incelemesi gerekli',
        message,
        'Stok ve miktar satirlarini karsilastirin; otomatik import veya ACK uygulamayin.',
        'warning'
      );
    }

    return createView(
      index,
      reference,
      'Islenemedi',
      message,
      'Belge ayrintisini inceleyin. Sonuc kesinlesmeden yeni kayit veya ACK olusturmayin.',
      'danger'
    );
  });
}

function createView(
  index: number,
  reference: string,
  state: string,
  message: string,
  guidance: string,
  tone: AxataImportFailureTone
): AxataImportFailureView {
  return {
    key: `${reference}|${index}`,
    reference,
    state,
    message,
    guidance,
    tone
  };
}

function buildFailureReference(value: unknown): string {
  const sequenceNo = readText(value, ['axataSequenceNo', 'sequenceNo']);
  const deliveryNo = readText(value, ['axataDeliveryNo', 'deliveryNo']);
  const documentSerie = readText(value, ['documentSerie']);
  const documentOrderNo = readText(value, ['documentOrderNo']);
  const correlationId = readText(value, ['correlationId', 'traceId']);
  const parts = [
    sequenceNo ? `#${sequenceNo}` : '',
    deliveryNo,
    documentSerie || documentOrderNo ? `${documentSerie || '-'}.${documentOrderNo || '-'}` : '',
    correlationId ? `Takip: ${correlationId}` : ''
  ].filter(Boolean);

  return parts.join(' / ') || 'Referans yok';
}

function readArray(value: unknown, key: string): unknown[] {
  if (!isRecord(value)) {
    return [];
  }

  return Array.isArray(value[key]) ? value[key] : [];
}

function readText(value: unknown, keys: readonly string[]): string {
  if (!isRecord(value)) {
    return '';
  }

  for (const key of keys) {
    const candidate = value[key];

    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return `${candidate}`;
    }
  }

  return '';
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
