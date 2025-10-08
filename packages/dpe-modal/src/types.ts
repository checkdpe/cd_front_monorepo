export interface DpeItem {
  id: string;
  dpe: string | null;
  address: string;
  handicap: number;
  note: number;
  msg_file_id: string;
  last_modified: string;
  time?: number;
  purchase?: boolean;
}

export interface DpeModalProps {
  visible: boolean;
  onClose: () => void;
  dpeItem: DpeItem | null;
}

export interface QuotaStatus {
  [key: string]: any;
}

export interface InfoItem {
  key: string;
  name: string;
  value: any;
}
