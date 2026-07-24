import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  HomeWarehousePrioritiesDto,
  HomeWarehousePrioritiesHttpRequest
} from '@interfaces';

import { BaseApiService } from '../base-api.service';

@Injectable({
  providedIn: 'root'
})
export class HomeService extends BaseApiService {
  getWarehousePriorities(
    request: HomeWarehousePrioritiesHttpRequest
  ): Observable<HomeWarehousePrioritiesDto> {
    return this.getWithQuery<HomeWarehousePrioritiesDto, HomeWarehousePrioritiesHttpRequest>(
      'home/depo-oncelikleri',
      request
    );
  }
}
