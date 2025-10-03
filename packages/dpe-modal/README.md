# DPE Modal Package

A reusable React component for displaying DPE (Diagnostic de Performance Énergétique) details in a modal with multiple tabs.

## Features

- **5-Tab Interface**: Infos, Workflow, Actions, Details, and Logs
- **Infos Tab**: Displays DPE information and quota status with edit functionality
- **API Integration**: Fetches quota status from configurable endpoints
- **Edit Modal**: Allows editing of quota status values
- **Responsive Design**: Built with Ant Design components

## Usage

```tsx
import { DpeModal } from '@acme/dpe-modal';

const MyComponent = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDpeItem, setSelectedDpeItem] = useState(null);

  return (
    <DpeModal
      visible={modalVisible}
      onClose={() => setModalVisible(false)}
      dpeItem={selectedDpeItem}
    />
  );
};
```

## Environment Variables

The component uses the following environment variables:

- `VITE_API_BASE_DEV`: Base URL for API calls (default: "https://api-dev.etiquettedpe.fr")
- `VITE_INFOS_OBJECT`: JSON configuration for endpoints (default: '{"quota_status":{"endpoint":"/backoffice/dpe_quota"}}')

## Types

```tsx
interface DpeItem {
  id: string;
  dpe: string | null;
  address: string;
  handicap: number;
  note: number;
  msg_file_id: string;
  last_modified: string;
}

interface DpeModalProps {
  visible: boolean;
  onClose: () => void;
  dpeItem: DpeItem | null;
}
```
