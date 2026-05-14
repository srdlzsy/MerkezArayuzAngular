export interface DocsTaskItem {
  id: string;
  label: string;
  route?: string;
  summary: string;
  pageId?: string;
  pageType?: 'api' | 'interface';
  children?: DocsTaskItem[];
}

export interface DocsMenuSection {
  id: string;
  label: string;
  summary: string;
  children: DocsTaskItem[];
}

export interface DocsEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  payload?: string;
}

export interface DocsContentPage {
  id: string;
  title: string;
  subtitle: string;
  baseRouteOrFile: string;
  highlights: string[];
  listTitle: string;
  items: {
    name: string;
    description: string;
    endpoints?: DocsEndpoint[];
  }[];
  codeSample?: string;
}
