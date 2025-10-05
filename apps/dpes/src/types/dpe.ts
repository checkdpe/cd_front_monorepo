export interface DpeItem {
  id: string;
  dpe: string | null;
  address: string;
  handicap: number;
  note: number;
  msg_file_id: string;
  last_modified: string;
  time?: number;
}

export interface DpeColumn {
  key: string;
  label: string;
  sortable: boolean;
}

export interface DpeHash {
  hash: string;
  timestamp: number;
}

export interface DpeListResponse {
  title: string;
  subtitle: string;
  detailed_text: string;
  hashs: DpeHash[];
  table_values: DpeItem[];
  table_columns: DpeColumn[];
  meta: {
    total_count: number;
  };
}

export interface DpeListParams {
  q?: string;
  from?: string;
  start?: number;
  limit?: number;
  s?: string;
  sort_col?: string;
  sort_order?: 'asc' | 'desc';
  version?: string;
}
