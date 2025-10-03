import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Button, Space, message, Tag } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { fetchDpeList } from '../services/dpeApi';
import { DpeItem, DpeListParams, DpeListResponse } from '../types/dpe';
import { DpeModal } from '@acme/dpe-modal';

const { Search } = Input;
const { Option } = Select;

export const DpeList: React.FC = () => {
  const [data, setData] = useState<DpeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState<DpeListResponse | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState<DpeListParams>({
    q: 'all',
    from: 'control',
    s: '',
    sort_col: 'last_modified',
    sort_order: 'desc',
    version: '1.0',
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDpeItem, setSelectedDpeItem] = useState<DpeItem | null>(null);

  const loadData = async (params: DpeListParams = {}) => {
    setLoading(true);
    try {
      const requestParams = {
        ...filters,
        ...params,
        start: ((params.current || pagination.current) - 1) * (params.pageSize || pagination.pageSize),
        limit: params.pageSize || pagination.pageSize,
      };

      const response = await fetchDpeList(requestParams);
      
      setResponseData(response);
      setData(response.table_values || []);
      setPagination(prev => ({
        ...prev,
        current: params.current || prev.current,
        pageSize: params.pageSize || prev.pageSize,
        total: response.meta?.total_count || 0,
      }));
    } catch (error) {
      message.error('Failed to load DPE list');
      console.error('Error loading DPE list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTableChange = (paginationInfo: any) => {
    loadData({
      current: paginationInfo.current,
      pageSize: paginationInfo.pageSize,
    });
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, s: value }));
    loadData({ s: value, current: 1 });
  };

  const handleSortChange = (sortCol: string, sortOrder: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sort_col: sortCol, sort_order: sortOrder }));
    loadData({ sort_col: sortCol, sort_order: sortOrder, current: 1 });
  };

  const handleRefresh = () => {
    loadData({ current: 1 });
  };

  const handleRowClick = (record: DpeItem) => {
    setSelectedDpeItem(record);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedDpeItem(null);
  };

  const getDpeColor = (dpe: string | null) => {
    if (!dpe) return 'default';
    const colors: { [key: string]: string } = {
      'A': 'green',
      'B': 'lime',
      'C': 'yellow',
      'D': 'orange',
      'E': 'red',
      'F': 'volcano',
      'G': 'magenta',
    };
    return colors[dpe] || 'default';
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      sorter: true,
      onHeaderCell: () => ({
        onClick: () => {
          const newOrder = filters.sort_col === 'id' && filters.sort_order === 'asc' ? 'desc' : 'asc';
          handleSortChange('id', newOrder);
        },
      }),
    },
    {
      title: 'DPE',
      dataIndex: 'dpe',
      key: 'dpe',
      width: 80,
      sorter: true,
      onHeaderCell: () => ({
        onClick: () => {
          const newOrder = filters.sort_col === 'dpe' && filters.sort_order === 'asc' ? 'desc' : 'asc';
          handleSortChange('dpe', newOrder);
        },
      }),
      render: (dpe: string | null) => (
        dpe ? <Tag color={getDpeColor(dpe)}>{dpe}</Tag> : <Tag>N/A</Tag>
      ),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      sorter: true,
      onHeaderCell: () => ({
        onClick: () => {
          const newOrder = filters.sort_col === 'address' && filters.sort_order === 'asc' ? 'desc' : 'asc';
          handleSortChange('address', newOrder);
        },
      }),
    },
    {
      title: 'Handicap',
      dataIndex: 'handicap',
      key: 'handicap',
      width: 100,
      sorter: true,
      onHeaderCell: () => ({
        onClick: () => {
          const newOrder = filters.sort_col === 'handicap' && filters.sort_order === 'asc' ? 'desc' : 'asc';
          handleSortChange('handicap', newOrder);
        },
      }),
      render: (handicap: number) => handicap?.toLocaleString() || 'N/A',
    },
    {
      title: 'Note',
      dataIndex: 'note',
      key: 'note',
      width: 80,
      sorter: true,
      onHeaderCell: () => ({
        onClick: () => {
          const newOrder = filters.sort_col === 'note' && filters.sort_order === 'asc' ? 'desc' : 'asc';
          handleSortChange('note', newOrder);
        },
      }),
      render: (note: number) => note?.toFixed(2) || 'N/A',
    },
    {
      title: 'Last Modified',
      dataIndex: 'last_modified',
      key: 'last_modified',
      width: 180,
      sorter: true,
      onHeaderCell: () => ({
        onClick: () => {
          const newOrder = filters.sort_col === 'last_modified' && filters.sort_order === 'asc' ? 'desc' : 'asc';
          handleSortChange('last_modified', newOrder);
        },
      }),
      render: (date: string) => date ? new Date(date).toLocaleString() : 'N/A',
    },
  ];

  return (
    <Card 
      title={responseData?.title || 'DPE List'}
      extra={responseData?.subtitle && (
        <div style={{ fontSize: '14px', color: '#666' }}>
          {responseData.subtitle}
        </div>
      )}
    >
      {responseData?.detailed_text && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
          {responseData.detailed_text}
        </div>
      )}
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Search
            placeholder="Search DPEs..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          <Select
            value={filters.from}
            onChange={(value) => {
              setFilters(prev => ({ ...prev, from: value }));
              loadData({ from: value, current: 1 });
            }}
            style={{ width: 120 }}
          >
            <Option value="control">Control</Option>
            <Option value="all">All</Option>
          </Select>
        </Space>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={handleRefresh}
          loading={loading}
        >
          Refresh
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} of ${total} items`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={handleTableChange}
        scroll={{ x: 800 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
      />
      
      <DpeModal
        visible={modalVisible}
        onClose={handleModalClose}
        dpeItem={selectedDpeItem}
      />
    </Card>
  );
};
