import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api-base-url.token';

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlyArray<string | number | boolean>;

type QueryScalar = string | number | boolean;

@Injectable({
  providedIn: 'root'
})
export class BaseApiService {
  protected readonly http = inject(HttpClient);
  protected readonly apiBaseUrl = inject(API_BASE_URL);

  protected get<T>(path: string): Observable<T> {
    return this.http.get<T>(this.buildUrl(path));
  }

  protected getBlob(path: string): Observable<Blob> {
    return this.http.get(this.buildUrl(path), {
      responseType: 'blob'
    });
  }

  protected getWithQuery<T, TQuery extends object = object>(
    path: string,
    query: TQuery
  ): Observable<T> {
    return this.http.get<T>(this.buildUrl(path), {
      params: this.buildParams(query)
    });
  }

  protected getBlobWithQuery<TQuery extends object = object>(
    path: string,
    query: TQuery
  ): Observable<Blob> {
    return this.http.get(this.buildUrl(path), {
      params: this.buildParams(query),
      responseType: 'blob'
    });
  }

  protected post<TResponse, TRequest>(path: string, body: TRequest): Observable<TResponse> {
    return this.http.post<TResponse>(this.buildUrl(path), body);
  }

  protected put<TResponse, TRequest>(path: string, body: TRequest): Observable<TResponse> {
    return this.http.put<TResponse>(this.buildUrl(path), body);
  }

  protected patch<TResponse, TRequest>(path: string, body: TRequest): Observable<TResponse> {
    return this.http.patch<TResponse>(this.buildUrl(path), body);
  }

  protected delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(path));
  }

  protected deleteWithBody<TResponse, TRequest>(
    path: string,
    body: TRequest
  ): Observable<TResponse> {
    return this.http.request<TResponse>('DELETE', this.buildUrl(path), {
      body
    });
  }

  protected buildUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const trimmedBaseUrl = this.apiBaseUrl.replace(/\/+$/, '');
    let trimmedPath = path.replace(/^\/+/, '');

    if (trimmedBaseUrl.toLocaleLowerCase('en-US').endsWith('/api')) {
      trimmedPath = trimmedPath.replace(/^api(?:\/|$)/i, '');
    }

    if (!trimmedPath) {
      return trimmedBaseUrl;
    }

    return `${trimmedBaseUrl}/${trimmedPath}`;
  }

  protected buildParams(query: object): HttpParams {
    let params = new HttpParams();

    for (const [key, rawValue] of Object.entries(query as Record<string, QueryValue>)) {
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        continue;
      }

      if (this.isQueryArray(rawValue)) {
        for (const item of rawValue) {
          params = params.append(key, String(item));
        }

        continue;
      }

      if (this.isQueryScalar(rawValue)) {
        params = params.set(key, String(rawValue));
      }
    }

    return params;
  }

  private isQueryArray(value: QueryValue): value is ReadonlyArray<QueryScalar> {
    return Array.isArray(value);
  }

  private isQueryScalar(value: QueryValue): value is QueryScalar {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }
}
