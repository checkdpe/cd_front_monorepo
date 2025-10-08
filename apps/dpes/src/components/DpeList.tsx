import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Button, Space, message, Tag } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { fetchDpeList } from '../services/dpeApi';
import { DpeItem, DpeListParams, DpeListResponse, DpeColumn } from '../types/dpe';
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
    from: 'all',
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

  // Parse time threshold configuration from environment
  const getTimeThresholds = () => {
    try {
      const thresholdConfig = import.meta.env.VITE_TIME_THRESHOLD;
      if (thresholdConfig) {
        return JSON.parse(thresholdConfig);
      }
    } catch (error) {
      console.warn('Failed to parse VITE_TIME_THRESHOLD:', error);
    }
    return { red: 5000, yellow: 3000 }; // fallback defaults
  };

  // Get background color for time cell based on threshold
  const getTimeBackgroundColor = (time: number) => {
    if (time == null) return '';
    
    const thresholds = getTimeThresholds();
    
    if (time >= thresholds.red) {
      return '#ff4d4f'; // red background
    } else if (time >= thresholds.yellow) {
      return '#faad14'; // yellow background
    }
    
    return ''; // no background color (default)
  };

  // Generate columns dynamically from table_columns response
  const generateColumns = (tableColumns: DpeColumn[]) => {
    if (!tableColumns || !Array.isArray(tableColumns)) {
      return [];
    }

    return tableColumns.map((column) => {
      const columnConfig: any = {
        title: column.label,
        dataIndex: column.key,
        key: column.key,
        sorter: column.sortable,
      };

      // Add width based on column type
      if (column.key === 'id') {
        columnConfig.width = 120;
      } else if (column.key === 'dpe') {
        columnConfig.width = 80;
      } else if (column.key === 'handicap') {
        columnConfig.width = 100;
      } else if (column.key === 'note') {
        columnConfig.width = 80;
      } else if (column.key === 'last_modified') {
        columnConfig.width = 180;
      } else if (column.key === 'time') {
        columnConfig.width = 120;
      } else if (column.key === 'address') {
        columnConfig.ellipsis = true;
      }

      // Add sorting functionality if sortable
      if (column.sortable) {
        columnConfig.onHeaderCell = () => ({
          onClick: () => {
            const newOrder = filters.sort_col === column.key && filters.sort_order === 'asc' ? 'desc' : 'asc';
            handleSortChange(column.key, newOrder);
          },
        });
      }

      // Add custom rendering based on column type
      if (column.key === 'dpe') {
        columnConfig.render = (dpe: string | null) => (
          dpe ? <Tag color={getDpeColor(dpe)}>{dpe}</Tag> : <Tag>N/A</Tag>
        );
      } else if (column.key === 'handicap') {
        columnConfig.render = (handicap: number) => handicap?.toLocaleString() || 'N/A';
      } else if (column.key === 'note') {
        columnConfig.render = (note: number) => note?.toFixed(2) || 'N/A';
      } else if (column.key === 'last_modified') {
        columnConfig.render = (date: string) => date ? new Date(date).toLocaleString() : 'N/A';
      } else if (column.key === 'time') {
        columnConfig.render = (time: number) => {
          const backgroundColor = getTimeBackgroundColor(time);
          return (
            <span 
              style={{ 
                backgroundColor,
                padding: '4px 8px',
                borderRadius: '4px',
                color: backgroundColor ? '#fff' : 'inherit',
                fontWeight: backgroundColor ? 'bold' : 'normal'
              }}
            >
              {time?.toFixed(2) || 'N/A'}
            </span>
          );
        };
      }

      return columnConfig;
    });
  };

  // Generate columns from response data
  const columns = generateColumns(responseData?.table_columns || []);

  // Get dynamic title based on selected dropdown value
  const getDynamicTitle = () => {
    switch (filters.from) {
      case 'control':
        return 'Orders';
      case 'all':
        return 'All';
      default:
        return responseData?.title || 'DPE List';
    }
  };

  return (
    <Card 
      title={getDynamicTitle()}
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
            <Option value="control">Orders</Option>
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
          style: { 
            cursor: 'pointer',
            // Show light blue background for rows where purchase is true
            backgroundColor: record.purchase ? '#e6f7ff' : undefined,
          },
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
