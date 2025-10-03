// Example usage of the DpeModal component
import React, { useState } from 'react';
import { Button } from 'antd';
import { DpeModal, DpeItem } from '@acme/dpe-modal';

const ExampleUsage: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDpeItem, setSelectedDpeItem] = useState<DpeItem | null>(null);

  // Example DPE item data
  const exampleDpeItem: DpeItem = {
    id: 'DPE-12345',
    dpe: 'C',
    address: '123 Example Street, Paris, France',
    handicap: 0,
    note: 8.5,
    msg_file_id: 'msg-123',
    last_modified: '2024-01-15T10:30:00Z'
  };

  const handleOpenModal = () => {
    setSelectedDpeItem(exampleDpeItem);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedDpeItem(null);
  };

  return (
    <div>
      <Button type="primary" onClick={handleOpenModal}>
        Open DPE Modal
      </Button>
      
      <DpeModal
        visible={modalVisible}
        onClose={handleCloseModal}
        dpeItem={selectedDpeItem}
      />
    </div>
  );
};

export default ExampleUsage;
