import { DpeListResponse, DpeListParams } from '../types/dpe';

export interface LogItem {
  id?: string;
  timestamp?: string;
  level?: string;
  message?: string;
  ref_ademe?: string;
  [key: string]: any;
}

export interface LogsResponse {
  logs: LogItem[];
  total?: number;
  [key: string]: any;
}

const API_BASE_URL = 'https://api-dev.etiquettedpe.fr/backoffice';

export const fetchDpeList = async (params: DpeListParams = {}): Promise<DpeListResponse> => {
  const searchParams = new URLSearchParams();
  
  // Set default parameters
  const defaultParams = {
    q: 'all',
    from: 'control',
    start: 0,
    limit: 20,
    s: '',
    sort_col: 'last_modified',
    sort_order: 'desc',
    version: '1.0',
    ...params
  };

  Object.entries(defaultParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const url = `${API_BASE_URL}/dpe_list?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,la;q=0.6',
      'cache-control': 'no-cache',
      'origin': window.location.origin,
      'pragma': 'no-cache',
      'referer': window.location.origin + '/',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': navigator.userAgent,
      'x-authorization': 'dperdition'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

export const fetchLogs = async (refAdeme: string): Promise<LogsResponse> => {
  const apiBaseDev = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
  const apiLogsSuffix = import.meta.env.VITE_API_LOGS_SUFFIX || 'backoffice/get_redis_all_logs';
  
  const url = `${apiBaseDev}/${apiLogsSuffix}`;
  
  const searchParams = new URLSearchParams();
  searchParams.append('ref_ademe', refAdeme);
  
  const fullUrl = `${url}?${searchParams.toString()}`;
  
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,la;q=0.6',
      'cache-control': 'no-cache',
      'origin': window.location.origin,
      'pragma': 'no-cache',
      'referer': window.location.origin + '/',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': navigator.userAgent,
      'x-authorization': 'dperdition'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};
