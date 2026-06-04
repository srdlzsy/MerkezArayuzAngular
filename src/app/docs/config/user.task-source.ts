import type { DocsTaskSource } from './docs-task-source.helpers';
import {
  multiRouteTask,
  route
} from './docs-task-source.helpers';

export const USER_TASK_SOURCE = {
  kullanicilar: multiRouteTask(
    {
      id: 'kullanicilar',
      title: 'Kullanicilar',
      subtitle: 'Kullanici listeleme, detay, guncelleme ve rol atama akisi yeni auth/users API modeliyle ilerler.',
      baseRouteOrFile: '/api/auth/register | /api/users',
      highlights: ['Kullanici', 'Yonetim', 'Rol atama', 'Update endpointi aktif'],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'UsersController',
          description: 'Kullanici listeleme, detay ve guncelleme endpointleri.',
          endpoints: [
            {
              method: 'POST',
              path: '/api/auth/register',
              description: 'Yeni kullanici ekler',
              payload: 'RegisterUserRequest'
            },
            {
              method: 'GET',
              path: '/api/users',
              description: 'Tum kullanicilari listeler'
            },
            {
              method: 'GET',
              path: '/api/users/{id}',
              description: 'Secilen kullanicinin detayini getirir'
            },
            {
              method: 'PUT',
              path: '/api/users/{id}',
              description: 'Kullaniciyi gunceller',
              payload: 'UpdateUserBody'
            },
            {
              method: 'POST',
              path: '/api/users/{id}/roles',
              description: 'Kullaniciya rol atar'
            }
          ]
        }
      ]
    },
    [
      route(
        'docs/api/kullanicilar/detay',
        () =>
          import('../tasks/user/kullanici/detail/kullanici-detail.component').then(
            (m) => m.KullaniciDetailComponent
          ),
        {
          data: { title: 'Kullanici Detay ve Rol Atama' }
        }
      ),
      route(
        'docs/api/kullanicilar/ekle',
        () =>
          import('../tasks/user/kullanici/create/kullanici-create.component').then(
            (m) => m.KullaniciCreateComponent
          ),
        {
          data: { title: 'Kullanici Ekle' }
        }
      ),
      route(
        'docs/api/kullanicilar',
        () =>
          import('../tasks/user/kullanici/list/kullanici-list.component').then(
            (m) => m.KullaniciListComponent
          ),
        {
          isPrimary: true
        }
      )
    ],
    ['kullanici']
  ),
  roller: multiRouteTask(
    {
      id: 'roller',
      title: 'Roller',
      subtitle: 'Rol listesi, metadata guncelleme ve permission atama akisi roles API modeliyle calisir.',
      baseRouteOrFile: '/api/roles | /api/roles/{id}/permissions',
      highlights: ['Rol yonetimi', 'Create', 'Update', 'Permission atama'],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'RolesController',
          description: 'Rol listeleme ve role permission atama endpointleri.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/roles',
              description: 'Tum rolleri listeler'
            },
            {
              method: 'POST',
              path: '/api/roles',
              description: 'Yeni rol olusturur',
              payload: 'SaveRoleBody'
            },
            {
              method: 'PUT',
              path: '/api/roles/{id}',
              description: 'Rolu gunceller',
              payload: 'SaveRoleBody'
            },
            {
              method: 'POST',
              path: '/api/roles/{id}/permissions',
              description: 'Role permission atar'
            }
          ]
        }
      ]
    },
    [
      route(
        'docs/api/roller/detay',
        () =>
          import('../tasks/user/kullanici/detail/kullanici-detail.component').then(
            (m) => m.KullaniciDetailComponent
          ),
        {
          data: { title: 'Rol Detay ve Permission Atama' }
        }
      ),
      route(
        'docs/api/roller/ekle',
        () =>
          import('../tasks/user/kullanici/create/kullanici-create.component').then(
            (m) => m.KullaniciCreateComponent
          ),
        {
          data: { title: 'Rol Olustur' }
        }
      ),
      route(
        'docs/api/roller',
        () =>
          import('../tasks/user/kullanici/list/kullanici-list.component').then(
            (m) => m.KullaniciListComponent
          ),
        {
          isPrimary: true
        }
      )
    ]
  ),
  yetkiler: multiRouteTask(
    {
      id: 'yetkiler',
      title: 'Yetkiler',
      subtitle: 'Permission listesi, katalog gorunumu ve metadata guncelleme akisi permissions API modeliyle calisir.',
      baseRouteOrFile: '/api/permissions | /api/permissions/catalog',
      highlights: ['Permission katalogu', 'Create', 'Update', 'Module > menu > action'],
      listTitle: 'Endpointler',
      items: [
        {
          name: 'PermissionsController',
          description: 'Permission katalogu ve permission listeleme endpointleri.',
          endpoints: [
            {
              method: 'GET',
              path: '/api/permissions/catalog',
              description: 'Tum module-menu-action agacini getirir'
            },
            {
              method: 'GET',
              path: '/api/permissions',
              description: 'Permission listesini getirir'
            },
            {
              method: 'POST',
              path: '/api/permissions',
              description: 'Yeni permission olusturur',
              payload: 'SavePermissionBody'
            },
            {
              method: 'PUT',
              path: '/api/permissions/{id}',
              description: 'Permission kaydini gunceller',
              payload: 'SavePermissionBody'
            }
          ]
        }
      ]
    },
    [
      route(
        'docs/api/yetkiler/detay',
        () =>
          import('../tasks/user/kullanici/detail/kullanici-detail.component').then(
            (m) => m.KullaniciDetailComponent
          ),
        {
          data: { title: 'Permission Detay ve Katalog' }
        }
      ),
      route(
        'docs/api/yetkiler/ekle',
        () =>
          import('../tasks/user/kullanici/create/kullanici-create.component').then(
            (m) => m.KullaniciCreateComponent
          ),
        {
          data: { title: 'Permission Olustur' }
        }
      ),
      route(
        'docs/api/yetkiler',
        () =>
          import('../tasks/user/kullanici/list/kullanici-list.component').then(
            (m) => m.KullaniciListComponent
          ),
        {
          isPrimary: true
        }
      )
    ]
  )
} as const satisfies Record<string, DocsTaskSource>;
