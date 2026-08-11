import { generateClientRequestId } from '../../../core/api/furpa-merkez-api.utils';

export interface ClientRequestPayload {
  clientRequestId?: string;
}

export class SafeCreateRetryDraft<TRequest extends ClientRequestPayload> {
  private clientRequestId = '';
  private payloadSnapshot = '';

  withClientRequestId(request: Omit<TRequest, 'clientRequestId'>): TRequest {
    const nextPayloadSnapshot = JSON.stringify(request);

    if (!this.clientRequestId || this.payloadSnapshot !== nextPayloadSnapshot) {
      this.clientRequestId = generateClientRequestId();
      this.payloadSnapshot = nextPayloadSnapshot;
    }

    return {
      ...request,
      clientRequestId: this.clientRequestId
    } as TRequest;
  }

  reset(): void {
    this.clientRequestId = '';
    this.payloadSnapshot = '';
  }
}
