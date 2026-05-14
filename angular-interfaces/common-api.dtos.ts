export interface IProblemDetailsApiDto {
  status: number;
  title: string;
  detail?: string | null;
  instance?: string | null;
  [key: string]: unknown;
}

export interface IFurpaServiceInfoApiDto {
  service: string;
  architecture: string;
  authDatabase: string;
  businessDatabase: string;
  swagger: string;
  status: string;
}

export interface IModuleActionScaffoldResponseApiDto {
  moduleCode: string;
  moduleName: string;
  menuCode: string;
  menuName: string;
  actionCode: string;
  actionName: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  permissionCode: string;
  route: string;
  resourceId?: string | null;
  isImplemented: boolean;
  message: string;
}

export type IFurpaEDespatchDocumentType = 1 | 2 | 3 | 4;

export type IOfflineOperationStatusApiDto = 'Processing' | 'Completed' | 'Failed';

export interface IOfflineOperationResponseApiDto<T = unknown> {
  clientRequestId: string;
  operationCode: string;
  status: IOfflineOperationStatusApiDto | string;
  createdAtUtc: string | null;
  completedAtUtc: string | null;
  errorMessage: string | null;
  result: T | null;
}
