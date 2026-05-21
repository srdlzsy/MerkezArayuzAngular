declare module 'rxjs' {
  export type Observable<T = any> = any;
  export type OperatorFunction<T = any, R = any> = any;

  export const of: (...args: any[]) => Observable;
  export const timer: (...args: any[]) => Observable<number>;
  export const throwError: (...args: any[]) => Observable<never>;
  export const firstValueFrom: (...args: any[]) => Promise<any>;
  export class BehaviorSubject<T = any> {
    constructor(value: T);
    next(value: T): void;
    asObservable(): Observable<T>;
    readonly value: T;
  }

  export const map: any;
  export const switchMap: any;
  export const catchError: any;
  export const delay: any;
  export const finalize: any;
  export const takeWhile: any;
  export const filter: any;
  export const startWith: any;
  export const shareReplay: any;
}

declare module 'rxjs/operators' {
  export const map: any;
  export const tap: any;
  export const catchError: any;
  export const switchMap: any;
  export const finalize: any;
  export const takeWhile: any;
  export const filter: any;
}
