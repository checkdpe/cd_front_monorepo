import { DpeListResponse, DpeListParams } from '../types/dpe';
import { authorizedFetch } from '../auth';

// Function to get current API base URL based on environment preference
export const getApiBaseUrl = (): string => {
  const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
  if (useDevEnvironment) {
    return import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
  } else {
    return import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr';
  }
};

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

export const fetchDpeList = async (params: DpeListParams = {}): Promise<DpeListResponse> => {
  const API_BASE_URL = `${getApiBaseUrl()}/backoffice`;
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
  
  const response = await authorizedFetch(url, {
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
  const apiBaseUrl = getApiBaseUrl();
  const apiLogsSuffix = import.meta.env.VITE_API_LOGS_SUFFIX || 'backoffice/get_redis_all_logs';
  
  const url = `${apiBaseUrl}/${apiLogsSuffix}`;
  
  const searchParams = new URLSearchParams();
  searchParams.append('ref_ademe', refAdeme);
  
  // Add env parameter based on which API base URL is being used
  const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
  const envParam = useDevEnvironment ? "dev" : "stg";
  searchParams.append('env', envParam);
  
  const fullUrl = `${url}?${searchParams.toString()}`;
  
  const response = await authorizedFetch(fullUrl, {
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
