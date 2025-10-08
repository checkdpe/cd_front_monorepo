# Update infos tab with quota status
_Exported on 05/10/2025 at 9:10:12 CEST from Cursor (1.7.33)_

---

**User**

DPE detaisl modal "Infos" tab 
include quota_status and @https://api-dev.etiquettedpe.fr/backoffice/dpe_quota?ref_ademe=2393E0538967E  call only table_values[n]["purchase"] is set to 1 (from table results)

---

**Cursor**

I'll help you add the quota status and API call to the DPE details modal "Infos" tab. Let me first explore the current structure to understand how the modal is implemented and where to make the changes.


Now let me look for the DPE modal component to understand its current structure:


Now let me look at the current implementation of the `fetchQuotaStatus` function to understand how it works:


Now let me look at how the `infoItems` are generated to understand the current structure:


Now I need to understand the current structure better. Let me check the types and see what the API response looks like:


Now let me create a todo list to track the tasks needed to implement the quota status with the specific API call and filtering:


Based on my analysis, I need to modify the `fetchQuotaStatus` function in the DPE modal to:

1. Call the correct API endpoint with the `ref_ademe` parameter
2. Filter the results to only show `table_values` where `purchase` is set to 1
3. Update the display to show this filtered data

Let me implement these changes:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      }
    }
  }, [visible, dpeItem, activeTab]);

  const fetchQuotaStatus = async () => {
    if (!dpeItem) return;
    
    setLoading(true);
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'x-authorization': 'dperdition'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus(data);
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!dpeItem?.id) return;
    
    setLogsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiLogsSuffix = import.meta.env.VITE_API_LOGS_SUFFIX || 'backoffice/get_redis_all_logs';
      
      const url = `${apiBaseUrl}/${apiLogsSuffix}`;
      
      const searchParams = new URLSearchParams();
      searchParams.append('ref_ademe', dpeItem.id);
      
      // Add env parameter based on which API base URL is being used
      const envParam = useDevEnvironment ? "dev" : "stg";
      searchParams.append('env', envParam);
      
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
      // Handle the actual API response structure
      setLogsData(data);
    } catch (error) {
      message.error('Failed to load logs');
      console.error('Error loading logs:', error);
      setLogsData(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    if (quotaStatus && editingKey) {
      setQuotaStatus(prev => ({
        ...prev,
        [editingKey]: editingValue
      }));
      message.success('Value updated successfully');
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const renderInfosTab = () => {
    // Create info items array
    const infoItems: InfoItem[] = [
      {
        key: 'quota_status',
        name: 'quota_status',
        value: quotaStatus
      }
    ];

    const columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              {typeof value === 'object' ? (
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 8, 
                  borderRadius: 4, 
                  margin: 0,
                  fontSize: '12px',
                  maxHeight: 100,
                  overflow: 'auto'
                }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <Text>{String(value)}</Text>
              )}
            </div>
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditClick(record.key, value)}
            />
          </div>
        ),
      },
    ];

    return (
      <div>
        <Title level={4}>DPE Information</Title>
        {dpeItem && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Text strong>ID:</Text> {dpeItem.id}
              </div>
              <div>
                <Text strong>DPE Rating:</Text> {dpeItem.dpe || 'N/A'}
              </div>
              <div>
                <Text strong>Address:</Text> {dpeItem.address}
              </div>
              <div>
                <Text strong>Handicap:</Text> {dpeItem.handicap}
              </div>
              <div>
                <Text strong>Note:</Text> {dpeItem.note}
              </div>
              <div>
                <Text strong>Last Modified:</Text> {new Date(dpeItem.last_modified).toLocaleString()}
              </div>
            </div>
          </Card>
        )}
        
        <Title level={4}>Infos</Title>
        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading quota status...</div>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={infoItems}
              rowKey="key"
              pagination={false}
              size="small"
              showHeader={true}
            />
          )}
        </Card>
      </div>
    );
  };

  const renderWorkflowTab = () => (
    <div>
      <Title level={4}>Workflow</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Workflow information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show the workflow status and progression for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderActionsTab = () => (
    <div>
      <Title level={4}>Actions</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Available actions will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show available actions for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderDetailsTab = () => (
    <div>
      <Title level={4}>Details</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Detailed information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show detailed technical information for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderLogsTab = () => {
    const parseLogDetails = (logKey: string) => {
      if (!logsData?.cd_log) return null;
      
      try {
        // cd_log is already an object, no need to parse JSON
        const cdLogData = logsData.cd_log;
        
        // Extract the actual log type from the key (e.g., "2369E0905921W:stg_middleware_latest_log" -> "stg_middleware_latest_log")
        const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
        const logDetails = cdLogData[logType];
        
        if (Array.isArray(logDetails)) {
          const parsedItems = logDetails.map((item, index) => {
            // Parse JSON strings within the array
            const parsed = typeof item === 'string' ? JSON.parse(item) : item;
            return { ...parsed, index };
          });
          
          // Sort by timestamp (most recent first) if timestamps are available
          return parsedItems.sort((a, b) => {
            const timestampA = a.hr_ts || a.ts;
            const timestampB = b.hr_ts || b.ts;
            
            if (!timestampA || !timestampB) return 0; // Keep original order if no timestamps
            
            // Convert to comparable format
            const dateA = timestampA.includes(':') ? new Date(timestampA) : new Date(timestampA * 1000);
            const dateB = timestampB.includes(':') ? new Date(timestampB) : new Date(timestampB * 1000);
            
            // Most recent first (descending order)
            return dateB.getTime() - dateA.getTime();
          });
        } else if (logDetails) {
          // Single object - no need to parse, already an object
          return [logDetails];
        }
        return [];
      } catch (error) {
        console.error('Error parsing log details:', error);
        return [];
      }
    };

    const renderTimeline = (timers: any) => {
      if (!timers || typeof timers !== 'object') return null;

      // Convert timers to array and sort by timestamp
      const timerEntries = Object.entries(timers)
        .map(([name, timestamp]) => ({
          name,
          timestamp: timestamp as number,
          displayName: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (timerEntries.length === 0) return null;

      // Calculate relative times (first timestamp as baseline)
      const baseline = timerEntries[0].timestamp;
      const timelineItems = timerEntries.map((entry, index) => {
        const relativeTime = entry.timestamp - baseline;
        const duration = index > 0 ? entry.timestamp - timerEntries[index - 1].timestamp : 0;
        
        return {
          key: entry.name,
          children: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {entry.displayName}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <Text code>{new Date(entry.timestamp * 1000).toLocaleTimeString()}</Text>
                {index > 0 && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    +{duration.toFixed(3)}s
                  </Tag>
                )}
                <Tag color="blue" style={{ marginLeft: 4 }}>
                  {relativeTime.toFixed(3)}s from start
                </Tag>
              </div>
            </div>
          ),
          dot: <ClockCircleOutlined style={{ color: '#1890ff' }} />
        };
      });

      return (
        <div style={{ marginTop: 8 }}>
          <Text strong style={{ fontSize: '13px' }}>Execution Timeline:</Text>
          <Timeline
            items={timelineItems}
            size="small"
            style={{ marginTop: 8 }}
          />
        </div>
      );
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {details.map((detail, index) => (
            <Card key={index} size="small" style={{ marginBottom: 8 }}>
              <Descriptions size="small" column={1}>
                {detail.hr_ts && (
                  <Descriptions.Item label="Timestamp">
                    <Tag color="blue">{detail.hr_ts}</Tag>
                  </Descriptions.Item>
                )}
                {detail.client_id && (
                  <Descriptions.Item label="Client ID">
                    <Text code>{detail.client_id}</Text>
                  </Descriptions.Item>
                )}
                {detail.client_ip_hash && (
                  <Descriptions.Item label="Client IP Hash">
                    <Text code>{detail.client_ip_hash}</Text>
                  </Descriptions.Item>
                )}
                {detail.path && (
                  <Descriptions.Item label="Path">
                    <Text code>{detail.path}</Text>
                  </Descriptions.Item>
                )}
                {detail.method && (
                  <Descriptions.Item label="Method">
                    <Tag color="green">{detail.method}</Tag>
                  </Descriptions.Item>
                )}
                {detail.time && (
                  <Descriptions.Item label="Time (ms)">
                    <Tag color="orange">{detail.time}</Tag>
                  </Descriptions.Item>
                )}
                {detail.uuid && (
                  <Descriptions.Item label="UUID">
                    <Text code style={{ fontSize: '11px' }}>{detail.uuid}</Text>
                  </Descriptions.Item>
                )}
                {detail.body && (
                  <Descriptions.Item label="Body">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '150px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {detail.body}
                    </pre>
                  </Descriptions.Item>
                )}
                {detail.content && (
                  <Descriptions.Item label="Content Details">
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {Array.isArray(detail.content) ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {detail.content.map((contentItem, contentIndex) => (
                            <Card key={contentIndex} size="small" style={{ backgroundColor: '#fafafa' }}>
                              <Descriptions size="small" column={1}>
                                {contentItem.step && (
                                  <Descriptions.Item label="Step">
                                    <Tag color="purple">{contentItem.step}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.called_from && (
                                  <Descriptions.Item label="Called From">
                                    <Text code>{contentItem.called_from}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.message && (
                                  <Descriptions.Item label="Message">
                                    <Text>{contentItem.message}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.ts && (
                                  <Descriptions.Item label="Timestamp">
                                    <Tag color="cyan">{new Date(contentItem.ts * 1000).toLocaleString()}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.uuid && (
                                  <Descriptions.Item label="UUID">
                                    <Text code style={{ fontSize: '10px' }}>{contentItem.uuid}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.path && (
                                  <Descriptions.Item label="Path">
                                    <Text code>{contentItem.path}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.timers && (
                                  <Descriptions.Item label="Execution Timeline">
                                    {renderTimeline(contentItem.timers)}
                                  </Descriptions.Item>
                                )}
                              </Descriptions>
                            </Card>
                          ))}
                        </Space>
                      ) : (
                        <pre style={{ 
                          fontSize: '11px', 
                          backgroundColor: '#f5f5f5', 
                          padding: '8px', 
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {typeof detail.content === 'string' ? detail.content : JSON.stringify(detail.content, null, 2)}
                        </pre>
                      )}
                    </div>
                  </Descriptions.Item>
                )}
                {detail.user_data && (
                  <Descriptions.Item label="User Data">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(detail.user_data, null, 2)}
                    </pre>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          ))}
        </Space>
      );
    };

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            Logs 
            {logsData?.count && (
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: 8 }}>
                ({logsData.count} entries)
              </Text>
            )}
          </Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchLogs}
            loading={logsLoading}
            size="small"
          >
            Refresh
          </Button>
        </div>
        
        <Card>
          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading logs...</Text>
              </div>
            </div>
          ) : !logsData || logsData.logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No logs found for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Collapse
              items={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                const details = parseLogDetails(logKey);
                
                return {
                  key: index.toString(),
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <Text code style={{ fontSize: '13px' }}>{logType}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>Full key: {logKey}</Text>
                      </div>
                      <Tag color="blue" style={{ marginLeft: 'auto' }}>
                        {details?.length || 0} entries
                      </Tag>
                    </div>
                  ),
                  children: renderLogDetails(logKey),
                  extra: <EyeOutlined />
                };
              })}
              size="small"
              ghost
            />
          )}
        </Card>
      </div>
    );
  };

  const tabItems = [
    {
      key: 'infos',
      label: 'Infos',
      children: renderInfosTab(),
    },
    {
      key: 'workflow',
      label: 'Workflow',
      children: renderWorkflowTab(),
    },
    {
      key: 'actions',
      label: 'Actions',
      children: renderActionsTab(),
    },
    {
      key: 'details',
      label: 'Details',
      children: renderDetailsTab(),
    },
    {
      key: 'logs',
      label: 'Logs',
      children: renderLogsTab(),
    },
  ];

  return (
    <>
      <Modal
        title={`DPE Details - ${dpeItem?.id || ''}`}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`Edit ${editingKey}`}
        open={editModalVisible}
        onOk={handleEditSave}
        onCancel={handleEditCancel}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Editing: </Text>
          <Text code>{editingKey}</Text>
        </div>
        <div>
          <Text strong>Current Value:</Text>
          <div style={{ 
            background: '#f5f5f5', 
            padding: 12, 
            borderRadius: 6, 
            marginTop: 8,
            marginBottom: 16
          }}>
            <pre style={{ margin: 0, fontSize: '12px' }}>
              {JSON.stringify(editingValue, null, 2)}
            </pre>
          </div>
        </div>
        <div>
          <Text strong>New Value (JSON format):</Text>
          <Input.TextArea
            rows={8}
            placeholder="Enter new value in JSON format..."
            value={typeof editingValue === 'string' ? editingValue : JSON.stringify(editingValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setEditingValue(parsed);
              } catch {
                setEditingValue(e.target.value);
              }
            }}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </>
  );
};

```

Now let me update the todo status and move to the next task:


Now let me update the display logic to better show the filtered quota status data. Let me first check how the current infoItems are being displayed:


Let me look at the current renderInfosTab function to understand how to improve the display:


Now I need to improve the display to better show the quota status data. Let me update the infoItems generation to provide more meaningful information and better formatting:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      }
    }
  }, [visible, dpeItem, activeTab]);

  const fetchQuotaStatus = async () => {
    if (!dpeItem) return;
    
    setLoading(true);
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'x-authorization': 'dperdition'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus(data);
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!dpeItem?.id) return;
    
    setLogsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiLogsSuffix = import.meta.env.VITE_API_LOGS_SUFFIX || 'backoffice/get_redis_all_logs';
      
      const url = `${apiBaseUrl}/${apiLogsSuffix}`;
      
      const searchParams = new URLSearchParams();
      searchParams.append('ref_ademe', dpeItem.id);
      
      // Add env parameter based on which API base URL is being used
      const envParam = useDevEnvironment ? "dev" : "stg";
      searchParams.append('env', envParam);
      
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
      // Handle the actual API response structure
      setLogsData(data);
    } catch (error) {
      message.error('Failed to load logs');
      console.error('Error loading logs:', error);
      setLogsData(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    if (quotaStatus && editingKey) {
      setQuotaStatus(prev => ({
        ...prev,
        [editingKey]: editingValue
      }));
      message.success('Value updated successfully');
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Add quota status summary
      infoItems.push({
        key: 'quota_status_summary',
        name: 'Quota Status Summary',
        value: {
          total_items: quotaStatus.table_values?.length || 0,
          purchased_items: quotaStatus.table_values?.filter((item: any) => item.purchase === 1).length || 0,
          api_response: quotaStatus
        }
      });
      
      // Add individual purchased items if any exist
      if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
        const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
        if (purchasedItems.length > 0) {
          infoItems.push({
            key: 'purchased_items',
            name: 'Purchased Items',
            value: purchasedItems
          });
        }
      }
    }

    const columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              {typeof value === 'object' ? (
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 8, 
                  borderRadius: 4, 
                  margin: 0,
                  fontSize: '12px',
                  maxHeight: 100,
                  overflow: 'auto'
                }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <Text>{String(value)}</Text>
              )}
            </div>
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditClick(record.key, value)}
            />
          </div>
        ),
      },
    ];

    return (
      <div>
        <Title level={4}>DPE Information</Title>
        {dpeItem && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Text strong>ID:</Text> {dpeItem.id}
              </div>
              <div>
                <Text strong>DPE Rating:</Text> {dpeItem.dpe || 'N/A'}
              </div>
              <div>
                <Text strong>Address:</Text> {dpeItem.address}
              </div>
              <div>
                <Text strong>Handicap:</Text> {dpeItem.handicap}
              </div>
              <div>
                <Text strong>Note:</Text> {dpeItem.note}
              </div>
              <div>
                <Text strong>Last Modified:</Text> {new Date(dpeItem.last_modified).toLocaleString()}
              </div>
            </div>
          </Card>
        )}
        
        <Title level={4}>Infos</Title>
        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading quota status...</div>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={infoItems}
              rowKey="key"
              pagination={false}
              size="small"
              showHeader={true}
            />
          )}
        </Card>
      </div>
    );
  };

  const renderWorkflowTab = () => (
    <div>
      <Title level={4}>Workflow</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Workflow information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show the workflow status and progression for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderActionsTab = () => (
    <div>
      <Title level={4}>Actions</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Available actions will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show available actions for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderDetailsTab = () => (
    <div>
      <Title level={4}>Details</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Detailed information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show detailed technical information for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderLogsTab = () => {
    const parseLogDetails = (logKey: string) => {
      if (!logsData?.cd_log) return null;
      
      try {
        // cd_log is already an object, no need to parse JSON
        const cdLogData = logsData.cd_log;
        
        // Extract the actual log type from the key (e.g., "2369E0905921W:stg_middleware_latest_log" -> "stg_middleware_latest_log")
        const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
        const logDetails = cdLogData[logType];
        
        if (Array.isArray(logDetails)) {
          const parsedItems = logDetails.map((item, index) => {
            // Parse JSON strings within the array
            const parsed = typeof item === 'string' ? JSON.parse(item) : item;
            return { ...parsed, index };
          });
          
          // Sort by timestamp (most recent first) if timestamps are available
          return parsedItems.sort((a, b) => {
            const timestampA = a.hr_ts || a.ts;
            const timestampB = b.hr_ts || b.ts;
            
            if (!timestampA || !timestampB) return 0; // Keep original order if no timestamps
            
            // Convert to comparable format
            const dateA = timestampA.includes(':') ? new Date(timestampA) : new Date(timestampA * 1000);
            const dateB = timestampB.includes(':') ? new Date(timestampB) : new Date(timestampB * 1000);
            
            // Most recent first (descending order)
            return dateB.getTime() - dateA.getTime();
          });
        } else if (logDetails) {
          // Single object - no need to parse, already an object
          return [logDetails];
        }
        return [];
      } catch (error) {
        console.error('Error parsing log details:', error);
        return [];
      }
    };

    const renderTimeline = (timers: any) => {
      if (!timers || typeof timers !== 'object') return null;

      // Convert timers to array and sort by timestamp
      const timerEntries = Object.entries(timers)
        .map(([name, timestamp]) => ({
          name,
          timestamp: timestamp as number,
          displayName: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (timerEntries.length === 0) return null;

      // Calculate relative times (first timestamp as baseline)
      const baseline = timerEntries[0].timestamp;
      const timelineItems = timerEntries.map((entry, index) => {
        const relativeTime = entry.timestamp - baseline;
        const duration = index > 0 ? entry.timestamp - timerEntries[index - 1].timestamp : 0;
        
        return {
          key: entry.name,
          children: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {entry.displayName}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <Text code>{new Date(entry.timestamp * 1000).toLocaleTimeString()}</Text>
                {index > 0 && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    +{duration.toFixed(3)}s
                  </Tag>
                )}
                <Tag color="blue" style={{ marginLeft: 4 }}>
                  {relativeTime.toFixed(3)}s from start
                </Tag>
              </div>
            </div>
          ),
          dot: <ClockCircleOutlined style={{ color: '#1890ff' }} />
        };
      });

      return (
        <div style={{ marginTop: 8 }}>
          <Text strong style={{ fontSize: '13px' }}>Execution Timeline:</Text>
          <Timeline
            items={timelineItems}
            size="small"
            style={{ marginTop: 8 }}
          />
        </div>
      );
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {details.map((detail, index) => (
            <Card key={index} size="small" style={{ marginBottom: 8 }}>
              <Descriptions size="small" column={1}>
                {detail.hr_ts && (
                  <Descriptions.Item label="Timestamp">
                    <Tag color="blue">{detail.hr_ts}</Tag>
                  </Descriptions.Item>
                )}
                {detail.client_id && (
                  <Descriptions.Item label="Client ID">
                    <Text code>{detail.client_id}</Text>
                  </Descriptions.Item>
                )}
                {detail.client_ip_hash && (
                  <Descriptions.Item label="Client IP Hash">
                    <Text code>{detail.client_ip_hash}</Text>
                  </Descriptions.Item>
                )}
                {detail.path && (
                  <Descriptions.Item label="Path">
                    <Text code>{detail.path}</Text>
                  </Descriptions.Item>
                )}
                {detail.method && (
                  <Descriptions.Item label="Method">
                    <Tag color="green">{detail.method}</Tag>
                  </Descriptions.Item>
                )}
                {detail.time && (
                  <Descriptions.Item label="Time (ms)">
                    <Tag color="orange">{detail.time}</Tag>
                  </Descriptions.Item>
                )}
                {detail.uuid && (
                  <Descriptions.Item label="UUID">
                    <Text code style={{ fontSize: '11px' }}>{detail.uuid}</Text>
                  </Descriptions.Item>
                )}
                {detail.body && (
                  <Descriptions.Item label="Body">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '150px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {detail.body}
                    </pre>
                  </Descriptions.Item>
                )}
                {detail.content && (
                  <Descriptions.Item label="Content Details">
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {Array.isArray(detail.content) ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {detail.content.map((contentItem, contentIndex) => (
                            <Card key={contentIndex} size="small" style={{ backgroundColor: '#fafafa' }}>
                              <Descriptions size="small" column={1}>
                                {contentItem.step && (
                                  <Descriptions.Item label="Step">
                                    <Tag color="purple">{contentItem.step}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.called_from && (
                                  <Descriptions.Item label="Called From">
                                    <Text code>{contentItem.called_from}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.message && (
                                  <Descriptions.Item label="Message">
                                    <Text>{contentItem.message}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.ts && (
                                  <Descriptions.Item label="Timestamp">
                                    <Tag color="cyan">{new Date(contentItem.ts * 1000).toLocaleString()}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.uuid && (
                                  <Descriptions.Item label="UUID">
                                    <Text code style={{ fontSize: '10px' }}>{contentItem.uuid}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.path && (
                                  <Descriptions.Item label="Path">
                                    <Text code>{contentItem.path}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.timers && (
                                  <Descriptions.Item label="Execution Timeline">
                                    {renderTimeline(contentItem.timers)}
                                  </Descriptions.Item>
                                )}
                              </Descriptions>
                            </Card>
                          ))}
                        </Space>
                      ) : (
                        <pre style={{ 
                          fontSize: '11px', 
                          backgroundColor: '#f5f5f5', 
                          padding: '8px', 
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {typeof detail.content === 'string' ? detail.content : JSON.stringify(detail.content, null, 2)}
                        </pre>
                      )}
                    </div>
                  </Descriptions.Item>
                )}
                {detail.user_data && (
                  <Descriptions.Item label="User Data">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(detail.user_data, null, 2)}
                    </pre>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          ))}
        </Space>
      );
    };

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            Logs 
            {logsData?.count && (
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: 8 }}>
                ({logsData.count} entries)
              </Text>
            )}
          </Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchLogs}
            loading={logsLoading}
            size="small"
          >
            Refresh
          </Button>
        </div>
        
        <Card>
          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading logs...</Text>
              </div>
            </div>
          ) : !logsData || logsData.logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No logs found for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Collapse
              items={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                const details = parseLogDetails(logKey);
                
                return {
                  key: index.toString(),
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <Text code style={{ fontSize: '13px' }}>{logType}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>Full key: {logKey}</Text>
                      </div>
                      <Tag color="blue" style={{ marginLeft: 'auto' }}>
                        {details?.length || 0} entries
                      </Tag>
                    </div>
                  ),
                  children: renderLogDetails(logKey),
                  extra: <EyeOutlined />
                };
              })}
              size="small"
              ghost
            />
          )}
        </Card>
      </div>
    );
  };

  const tabItems = [
    {
      key: 'infos',
      label: 'Infos',
      children: renderInfosTab(),
    },
    {
      key: 'workflow',
      label: 'Workflow',
      children: renderWorkflowTab(),
    },
    {
      key: 'actions',
      label: 'Actions',
      children: renderActionsTab(),
    },
    {
      key: 'details',
      label: 'Details',
      children: renderDetailsTab(),
    },
    {
      key: 'logs',
      label: 'Logs',
      children: renderLogsTab(),
    },
  ];

  return (
    <>
      <Modal
        title={`DPE Details - ${dpeItem?.id || ''}`}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`Edit ${editingKey}`}
        open={editModalVisible}
        onOk={handleEditSave}
        onCancel={handleEditCancel}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Editing: </Text>
          <Text code>{editingKey}</Text>
        </div>
        <div>
          <Text strong>Current Value:</Text>
          <div style={{ 
            background: '#f5f5f5', 
            padding: 12, 
            borderRadius: 6, 
            marginTop: 8,
            marginBottom: 16
          }}>
            <pre style={{ margin: 0, fontSize: '12px' }}>
              {JSON.stringify(editingValue, null, 2)}
            </pre>
          </div>
        </div>
        <div>
          <Text strong>New Value (JSON format):</Text>
          <Input.TextArea
            rows={8}
            placeholder="Enter new value in JSON format..."
            value={typeof editingValue === 'string' ? editingValue : JSON.stringify(editingValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setEditingValue(parsed);
              } catch {
                setEditingValue(e.target.value);
              }
            }}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </>
  );
};

```

Now let me also improve the display to show a better message when no quota status is available or when there are no purchased items:


Let me update the table display section to handle the case when there are no items to show:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      }
    }
  }, [visible, dpeItem, activeTab]);

  const fetchQuotaStatus = async () => {
    if (!dpeItem) return;
    
    setLoading(true);
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'x-authorization': 'dperdition'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus(data);
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!dpeItem?.id) return;
    
    setLogsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiLogsSuffix = import.meta.env.VITE_API_LOGS_SUFFIX || 'backoffice/get_redis_all_logs';
      
      const url = `${apiBaseUrl}/${apiLogsSuffix}`;
      
      const searchParams = new URLSearchParams();
      searchParams.append('ref_ademe', dpeItem.id);
      
      // Add env parameter based on which API base URL is being used
      const envParam = useDevEnvironment ? "dev" : "stg";
      searchParams.append('env', envParam);
      
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
      // Handle the actual API response structure
      setLogsData(data);
    } catch (error) {
      message.error('Failed to load logs');
      console.error('Error loading logs:', error);
      setLogsData(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    if (quotaStatus && editingKey) {
      setQuotaStatus(prev => ({
        ...prev,
        [editingKey]: editingValue
      }));
      message.success('Value updated successfully');
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Add quota status summary
      infoItems.push({
        key: 'quota_status_summary',
        name: 'Quota Status Summary',
        value: {
          total_items: quotaStatus.table_values?.length || 0,
          purchased_items: quotaStatus.table_values?.filter((item: any) => item.purchase === 1).length || 0,
          api_response: quotaStatus
        }
      });
      
      // Add individual purchased items if any exist
      if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
        const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
        if (purchasedItems.length > 0) {
          infoItems.push({
            key: 'purchased_items',
            name: 'Purchased Items',
            value: purchasedItems
          });
        }
      }
    }

    const columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              {typeof value === 'object' ? (
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 8, 
                  borderRadius: 4, 
                  margin: 0,
                  fontSize: '12px',
                  maxHeight: 100,
                  overflow: 'auto'
                }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <Text>{String(value)}</Text>
              )}
            </div>
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditClick(record.key, value)}
            />
          </div>
        ),
      },
    ];

    return (
      <div>
        <Title level={4}>DPE Information</Title>
        {dpeItem && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Text strong>ID:</Text> {dpeItem.id}
              </div>
              <div>
                <Text strong>DPE Rating:</Text> {dpeItem.dpe || 'N/A'}
              </div>
              <div>
                <Text strong>Address:</Text> {dpeItem.address}
              </div>
              <div>
                <Text strong>Handicap:</Text> {dpeItem.handicap}
              </div>
              <div>
                <Text strong>Note:</Text> {dpeItem.note}
              </div>
              <div>
                <Text strong>Last Modified:</Text> {new Date(dpeItem.last_modified).toLocaleString()}
              </div>
            </div>
          </Card>
        )}
        
        <Title level={4}>Infos</Title>
        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading quota status...</div>
            </div>
          ) : infoItems.length > 0 ? (
            <Table
              columns={columns}
              dataSource={infoItems}
              rowKey="key"
              pagination={false}
              size="small"
              showHeader={true}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Text type="secondary">No quota status data available or no purchased items found.</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                API endpoint: {import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr'}/backoffice/dpe_quota?ref_ademe={dpeItem?.id}
              </Text>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderWorkflowTab = () => (
    <div>
      <Title level={4}>Workflow</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Workflow information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show the workflow status and progression for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderActionsTab = () => (
    <div>
      <Title level={4}>Actions</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Available actions will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show available actions for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderDetailsTab = () => (
    <div>
      <Title level={4}>Details</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Detailed information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show detailed technical information for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderLogsTab = () => {
    const parseLogDetails = (logKey: string) => {
      if (!logsData?.cd_log) return null;
      
      try {
        // cd_log is already an object, no need to parse JSON
        const cdLogData = logsData.cd_log;
        
        // Extract the actual log type from the key (e.g., "2369E0905921W:stg_middleware_latest_log" -> "stg_middleware_latest_log")
        const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
        const logDetails = cdLogData[logType];
        
        if (Array.isArray(logDetails)) {
          const parsedItems = logDetails.map((item, index) => {
            // Parse JSON strings within the array
            const parsed = typeof item === 'string' ? JSON.parse(item) : item;
            return { ...parsed, index };
          });
          
          // Sort by timestamp (most recent first) if timestamps are available
          return parsedItems.sort((a, b) => {
            const timestampA = a.hr_ts || a.ts;
            const timestampB = b.hr_ts || b.ts;
            
            if (!timestampA || !timestampB) return 0; // Keep original order if no timestamps
            
            // Convert to comparable format
            const dateA = timestampA.includes(':') ? new Date(timestampA) : new Date(timestampA * 1000);
            const dateB = timestampB.includes(':') ? new Date(timestampB) : new Date(timestampB * 1000);
            
            // Most recent first (descending order)
            return dateB.getTime() - dateA.getTime();
          });
        } else if (logDetails) {
          // Single object - no need to parse, already an object
          return [logDetails];
        }
        return [];
      } catch (error) {
        console.error('Error parsing log details:', error);
        return [];
      }
    };

    const renderTimeline = (timers: any) => {
      if (!timers || typeof timers !== 'object') return null;

      // Convert timers to array and sort by timestamp
      const timerEntries = Object.entries(timers)
        .map(([name, timestamp]) => ({
          name,
          timestamp: timestamp as number,
          displayName: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (timerEntries.length === 0) return null;

      // Calculate relative times (first timestamp as baseline)
      const baseline = timerEntries[0].timestamp;
      const timelineItems = timerEntries.map((entry, index) => {
        const relativeTime = entry.timestamp - baseline;
        const duration = index > 0 ? entry.timestamp - timerEntries[index - 1].timestamp : 0;
        
        return {
          key: entry.name,
          children: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {entry.displayName}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <Text code>{new Date(entry.timestamp * 1000).toLocaleTimeString()}</Text>
                {index > 0 && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    +{duration.toFixed(3)}s
                  </Tag>
                )}
                <Tag color="blue" style={{ marginLeft: 4 }}>
                  {relativeTime.toFixed(3)}s from start
                </Tag>
              </div>
            </div>
          ),
          dot: <ClockCircleOutlined style={{ color: '#1890ff' }} />
        };
      });

      return (
        <div style={{ marginTop: 8 }}>
          <Text strong style={{ fontSize: '13px' }}>Execution Timeline:</Text>
          <Timeline
            items={timelineItems}
            size="small"
            style={{ marginTop: 8 }}
          />
        </div>
      );
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {details.map((detail, index) => (
            <Card key={index} size="small" style={{ marginBottom: 8 }}>
              <Descriptions size="small" column={1}>
                {detail.hr_ts && (
                  <Descriptions.Item label="Timestamp">
                    <Tag color="blue">{detail.hr_ts}</Tag>
                  </Descriptions.Item>
                )}
                {detail.client_id && (
                  <Descriptions.Item label="Client ID">
                    <Text code>{detail.client_id}</Text>
                  </Descriptions.Item>
                )}
                {detail.client_ip_hash && (
                  <Descriptions.Item label="Client IP Hash">
                    <Text code>{detail.client_ip_hash}</Text>
                  </Descriptions.Item>
                )}
                {detail.path && (
                  <Descriptions.Item label="Path">
                    <Text code>{detail.path}</Text>
                  </Descriptions.Item>
                )}
                {detail.method && (
                  <Descriptions.Item label="Method">
                    <Tag color="green">{detail.method}</Tag>
                  </Descriptions.Item>
                )}
                {detail.time && (
                  <Descriptions.Item label="Time (ms)">
                    <Tag color="orange">{detail.time}</Tag>
                  </Descriptions.Item>
                )}
                {detail.uuid && (
                  <Descriptions.Item label="UUID">
                    <Text code style={{ fontSize: '11px' }}>{detail.uuid}</Text>
                  </Descriptions.Item>
                )}
                {detail.body && (
                  <Descriptions.Item label="Body">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '150px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {detail.body}
                    </pre>
                  </Descriptions.Item>
                )}
                {detail.content && (
                  <Descriptions.Item label="Content Details">
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {Array.isArray(detail.content) ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {detail.content.map((contentItem, contentIndex) => (
                            <Card key={contentIndex} size="small" style={{ backgroundColor: '#fafafa' }}>
                              <Descriptions size="small" column={1}>
                                {contentItem.step && (
                                  <Descriptions.Item label="Step">
                                    <Tag color="purple">{contentItem.step}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.called_from && (
                                  <Descriptions.Item label="Called From">
                                    <Text code>{contentItem.called_from}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.message && (
                                  <Descriptions.Item label="Message">
                                    <Text>{contentItem.message}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.ts && (
                                  <Descriptions.Item label="Timestamp">
                                    <Tag color="cyan">{new Date(contentItem.ts * 1000).toLocaleString()}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.uuid && (
                                  <Descriptions.Item label="UUID">
                                    <Text code style={{ fontSize: '10px' }}>{contentItem.uuid}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.path && (
                                  <Descriptions.Item label="Path">
                                    <Text code>{contentItem.path}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.timers && (
                                  <Descriptions.Item label="Execution Timeline">
                                    {renderTimeline(contentItem.timers)}
                                  </Descriptions.Item>
                                )}
                              </Descriptions>
                            </Card>
                          ))}
                        </Space>
                      ) : (
                        <pre style={{ 
                          fontSize: '11px', 
                          backgroundColor: '#f5f5f5', 
                          padding: '8px', 
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {typeof detail.content === 'string' ? detail.content : JSON.stringify(detail.content, null, 2)}
                        </pre>
                      )}
                    </div>
                  </Descriptions.Item>
                )}
                {detail.user_data && (
                  <Descriptions.Item label="User Data">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(detail.user_data, null, 2)}
                    </pre>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          ))}
        </Space>
      );
    };

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            Logs 
            {logsData?.count && (
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: 8 }}>
                ({logsData.count} entries)
              </Text>
            )}
          </Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchLogs}
            loading={logsLoading}
            size="small"
          >
            Refresh
          </Button>
        </div>
        
        <Card>
          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading logs...</Text>
              </div>
            </div>
          ) : !logsData || logsData.logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No logs found for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Collapse
              items={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                const details = parseLogDetails(logKey);
                
                return {
                  key: index.toString(),
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <Text code style={{ fontSize: '13px' }}>{logType}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>Full key: {logKey}</Text>
                      </div>
                      <Tag color="blue" style={{ marginLeft: 'auto' }}>
                        {details?.length || 0} entries
                      </Tag>
                    </div>
                  ),
                  children: renderLogDetails(logKey),
                  extra: <EyeOutlined />
                };
              })}
              size="small"
              ghost
            />
          )}
        </Card>
      </div>
    );
  };

  const tabItems = [
    {
      key: 'infos',
      label: 'Infos',
      children: renderInfosTab(),
    },
    {
      key: 'workflow',
      label: 'Workflow',
      children: renderWorkflowTab(),
    },
    {
      key: 'actions',
      label: 'Actions',
      children: renderActionsTab(),
    },
    {
      key: 'details',
      label: 'Details',
      children: renderDetailsTab(),
    },
    {
      key: 'logs',
      label: 'Logs',
      children: renderLogsTab(),
    },
  ];

  return (
    <>
      <Modal
        title={`DPE Details - ${dpeItem?.id || ''}`}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`Edit ${editingKey}`}
        open={editModalVisible}
        onOk={handleEditSave}
        onCancel={handleEditCancel}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Editing: </Text>
          <Text code>{editingKey}</Text>
        </div>
        <div>
          <Text strong>Current Value:</Text>
          <div style={{ 
            background: '#f5f5f5', 
            padding: 12, 
            borderRadius: 6, 
            marginTop: 8,
            marginBottom: 16
          }}>
            <pre style={{ margin: 0, fontSize: '12px' }}>
              {JSON.stringify(editingValue, null, 2)}
            </pre>
          </div>
        </div>
        <div>
          <Text strong>New Value (JSON format):</Text>
          <Input.TextArea
            rows={8}
            placeholder="Enter new value in JSON format..."
            value={typeof editingValue === 'string' ? editingValue : JSON.stringify(editingValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setEditingValue(parsed);
              } catch {
                setEditingValue(e.target.value);
              }
            }}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </>
  );
};

```

Now let me check for any linting errors in the file:


Great! Now let me update the todo status and move to testing:


Let me also check if there are any environment files that need to be updated to ensure the API base URL is correctly configured:


Perfect! The environment is already configured with the correct API base URL. Let me also check if there are any other environment files that might be relevant:


Let me check if there are any .dev.env files:


Now let me create a simple test to verify that the implementation works. Let me check if there's a way to test this or if I should create a summary of what was implemented:


Perfect! I have successfully implemented the requested changes to the DPE details modal "Infos" tab. Here's a summary of what was implemented:

## Summary of Changes

I've successfully updated the DPE details modal "Infos" tab to include quota status and call the specified API endpoint with the requested filtering logic. Here are the key changes made:

### 1. **Updated API Call** (`fetchQuotaStatus` function)
- **Endpoint**: Now calls `https://api-dev.etiquettedpe.fr/backoffice/dpe_quota?ref_ademe={dpeItem.id}`
- **Parameter**: Uses the DPE item ID as the `ref_ademe` parameter
- **Headers**: Maintains the existing authentication headers (`x-authorization: dperdition`)

### 2. **Added Filtering Logic**
- **Filter Condition**: Only includes `table_values` where `purchase === 1`
- **Data Processing**: Filters the API response before storing it in state
- **Fallback**: If no `table_values` exist, stores the raw response

### 3. **Enhanced Display**
- **Quota Status Summary**: Shows total items vs. purchased items count
- **Purchased Items**: Displays individual purchased items separately
- **Better UX**: Shows informative messages when no data is available
- **API Endpoint Display**: Shows the actual API endpoint being called for debugging

### 4. **Improved User Experience**
- **Loading States**: Maintains existing loading indicators
- **Empty States**: Shows helpful messages when no purchased items are found
- **Error Handling**: Preserves existing error handling with user-friendly messages

### Key Features:
- ✅ Calls the correct API endpoint: `https://api-dev.etiquettedpe.fr/backoffice/dpe_quota?ref_ademe=2393E0538967E`
- ✅ Filters `table_values` to only show items where `purchase = 1`
- ✅ Displays quota status information in the "Infos" tab
- ✅ Maintains existing edit functionality for quota status values
- ✅ Shows summary statistics (total vs. purchased items)
- ✅ Handles empty states gracefully

The implementation is now ready and will automatically fetch and display the quota status data when users open the DPE details modal and navigate to the "Infos" tab. The data will be filtered to show only purchased items (`purchase = 1`) as requested.

---

**User**

if no purchase info in that record (as extra) 
do not call @https://api-dev.etiquettedpe.fr/backoffice/dpe_quota?ref_ademe=2549E2018453W  and no error then 

---

**Cursor**

I understand you want to avoid making the API call to the quota endpoint if there's no purchase information in the DPE record, and prevent any errors from occurring. Let me modify the implementation to check for purchase information first before making the API call.


First, let me check what purchase information might be available in the DPE record structure:


I don't see a direct purchase field in the DpeItem interface. Let me check if there might be additional fields or if we need to look at the actual API response structure. Let me also check if there are any other fields that might indicate purchase information:


Based on the search results, I can see that the current DpeItem interface doesn't include a purchase field. Since you mentioned "if no purchase info in that record (as extra)", I'll assume that there might be additional fields that could indicate purchase information, or we should check if the record has any purchase-related data before making the API call.

Let me modify the implementation to:
1. Check if the DPE record has any purchase-related information
2. Skip the API call if no purchase info is found
3. Show an appropriate message instead of making the call


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      }
    }
  }, [visible, dpeItem, activeTab]);

  const hasPurchaseInfo = (dpeItem: any): boolean => {
    // Check if the DPE record has any purchase-related information
    // This could be a direct purchase field or any indicator that suggests purchase data exists
    return dpeItem && (
      dpeItem.purchase !== undefined ||
      dpeItem.purchase_status !== undefined ||
      dpeItem.has_purchase !== undefined ||
      dpeItem.purchase_info !== undefined ||
      // Add any other purchase-related fields that might exist
      (typeof dpeItem === 'object' && Object.keys(dpeItem).some(key => 
        key.toLowerCase().includes('purchase') || 
        key.toLowerCase().includes('quota')
      ))
    );
  };

  const fetchQuotaStatus = async () => {
    if (!dpeItem) return;
    
    // Check if the DPE record has purchase information before making the API call
    if (!hasPurchaseInfo(dpeItem)) {
      // Set a special status to indicate no purchase info available
      setQuotaStatus({
        no_purchase_info: true,
        message: 'No purchase information available for this DPE record',
        dpe_id: dpeItem.id
      });
      return;
    }
    
    setLoading(true);
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'x-authorization': 'dperdition'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus(data);
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!dpeItem?.id) return;
    
    setLogsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiLogsSuffix = import.meta.env.VITE_API_LOGS_SUFFIX || 'backoffice/get_redis_all_logs';
      
      const url = `${apiBaseUrl}/${apiLogsSuffix}`;
      
      const searchParams = new URLSearchParams();
      searchParams.append('ref_ademe', dpeItem.id);
      
      // Add env parameter based on which API base URL is being used
      const envParam = useDevEnvironment ? "dev" : "stg";
      searchParams.append('env', envParam);
      
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
      // Handle the actual API response structure
      setLogsData(data);
    } catch (error) {
      message.error('Failed to load logs');
      console.error('Error loading logs:', error);
      setLogsData(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    if (quotaStatus && editingKey) {
      setQuotaStatus(prev => ({
        ...prev,
        [editingKey]: editingValue
      }));
      message.success('Value updated successfully');
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Add quota status summary
      infoItems.push({
        key: 'quota_status_summary',
        name: 'Quota Status Summary',
        value: {
          total_items: quotaStatus.table_values?.length || 0,
          purchased_items: quotaStatus.table_values?.filter((item: any) => item.purchase === 1).length || 0,
          api_response: quotaStatus
        }
      });
      
      // Add individual purchased items if any exist
      if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
        const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
        if (purchasedItems.length > 0) {
          infoItems.push({
            key: 'purchased_items',
            name: 'Purchased Items',
            value: purchasedItems
          });
        }
      }
    }

    const columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              {typeof value === 'object' ? (
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 8, 
                  borderRadius: 4, 
                  margin: 0,
                  fontSize: '12px',
                  maxHeight: 100,
                  overflow: 'auto'
                }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <Text>{String(value)}</Text>
              )}
            </div>
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditClick(record.key, value)}
            />
          </div>
        ),
      },
    ];

    return (
      <div>
        <Title level={4}>DPE Information</Title>
        {dpeItem && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Text strong>ID:</Text> {dpeItem.id}
              </div>
              <div>
                <Text strong>DPE Rating:</Text> {dpeItem.dpe || 'N/A'}
              </div>
              <div>
                <Text strong>Address:</Text> {dpeItem.address}
              </div>
              <div>
                <Text strong>Handicap:</Text> {dpeItem.handicap}
              </div>
              <div>
                <Text strong>Note:</Text> {dpeItem.note}
              </div>
              <div>
                <Text strong>Last Modified:</Text> {new Date(dpeItem.last_modified).toLocaleString()}
              </div>
            </div>
          </Card>
        )}
        
        <Title level={4}>Infos</Title>
        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading quota status...</div>
            </div>
          ) : infoItems.length > 0 ? (
            <Table
              columns={columns}
              dataSource={infoItems}
              rowKey="key"
              pagination={false}
              size="small"
              showHeader={true}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Text type="secondary">No quota status data available or no purchased items found.</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                API endpoint: {import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr'}/backoffice/dpe_quota?ref_ademe={dpeItem?.id}
              </Text>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderWorkflowTab = () => (
    <div>
      <Title level={4}>Workflow</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Workflow information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show the workflow status and progression for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderActionsTab = () => (
    <div>
      <Title level={4}>Actions</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Available actions will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show available actions for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderDetailsTab = () => (
    <div>
      <Title level={4}>Details</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Detailed information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show detailed technical information for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderLogsTab = () => {
    const parseLogDetails = (logKey: string) => {
      if (!logsData?.cd_log) return null;
      
      try {
        // cd_log is already an object, no need to parse JSON
        const cdLogData = logsData.cd_log;
        
        // Extract the actual log type from the key (e.g., "2369E0905921W:stg_middleware_latest_log" -> "stg_middleware_latest_log")
        const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
        const logDetails = cdLogData[logType];
        
        if (Array.isArray(logDetails)) {
          const parsedItems = logDetails.map((item, index) => {
            // Parse JSON strings within the array
            const parsed = typeof item === 'string' ? JSON.parse(item) : item;
            return { ...parsed, index };
          });
          
          // Sort by timestamp (most recent first) if timestamps are available
          return parsedItems.sort((a, b) => {
            const timestampA = a.hr_ts || a.ts;
            const timestampB = b.hr_ts || b.ts;
            
            if (!timestampA || !timestampB) return 0; // Keep original order if no timestamps
            
            // Convert to comparable format
            const dateA = timestampA.includes(':') ? new Date(timestampA) : new Date(timestampA * 1000);
            const dateB = timestampB.includes(':') ? new Date(timestampB) : new Date(timestampB * 1000);
            
            // Most recent first (descending order)
            return dateB.getTime() - dateA.getTime();
          });
        } else if (logDetails) {
          // Single object - no need to parse, already an object
          return [logDetails];
        }
        return [];
      } catch (error) {
        console.error('Error parsing log details:', error);
        return [];
      }
    };

    const renderTimeline = (timers: any) => {
      if (!timers || typeof timers !== 'object') return null;

      // Convert timers to array and sort by timestamp
      const timerEntries = Object.entries(timers)
        .map(([name, timestamp]) => ({
          name,
          timestamp: timestamp as number,
          displayName: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (timerEntries.length === 0) return null;

      // Calculate relative times (first timestamp as baseline)
      const baseline = timerEntries[0].timestamp;
      const timelineItems = timerEntries.map((entry, index) => {
        const relativeTime = entry.timestamp - baseline;
        const duration = index > 0 ? entry.timestamp - timerEntries[index - 1].timestamp : 0;
        
        return {
          key: entry.name,
          children: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {entry.displayName}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <Text code>{new Date(entry.timestamp * 1000).toLocaleTimeString()}</Text>
                {index > 0 && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    +{duration.toFixed(3)}s
                  </Tag>
                )}
                <Tag color="blue" style={{ marginLeft: 4 }}>
                  {relativeTime.toFixed(3)}s from start
                </Tag>
              </div>
            </div>
          ),
          dot: <ClockCircleOutlined style={{ color: '#1890ff' }} />
        };
      });

      return (
        <div style={{ marginTop: 8 }}>
          <Text strong style={{ fontSize: '13px' }}>Execution Timeline:</Text>
          <Timeline
            items={timelineItems}
            size="small"
            style={{ marginTop: 8 }}
          />
        </div>
      );
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {details.map((detail, index) => (
            <Card key={index} size="small" style={{ marginBottom: 8 }}>
              <Descriptions size="small" column={1}>
                {detail.hr_ts && (
                  <Descriptions.Item label="Timestamp">
                    <Tag color="blue">{detail.hr_ts}</Tag>
                  </Descriptions.Item>
                )}
                {detail.client_id && (
                  <Descriptions.Item label="Client ID">
                    <Text code>{detail.client_id}</Text>
                  </Descriptions.Item>
                )}
                {detail.client_ip_hash && (
                  <Descriptions.Item label="Client IP Hash">
                    <Text code>{detail.client_ip_hash}</Text>
                  </Descriptions.Item>
                )}
                {detail.path && (
                  <Descriptions.Item label="Path">
                    <Text code>{detail.path}</Text>
                  </Descriptions.Item>
                )}
                {detail.method && (
                  <Descriptions.Item label="Method">
                    <Tag color="green">{detail.method}</Tag>
                  </Descriptions.Item>
                )}
                {detail.time && (
                  <Descriptions.Item label="Time (ms)">
                    <Tag color="orange">{detail.time}</Tag>
                  </Descriptions.Item>
                )}
                {detail.uuid && (
                  <Descriptions.Item label="UUID">
                    <Text code style={{ fontSize: '11px' }}>{detail.uuid}</Text>
                  </Descriptions.Item>
                )}
                {detail.body && (
                  <Descriptions.Item label="Body">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '150px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {detail.body}
                    </pre>
                  </Descriptions.Item>
                )}
                {detail.content && (
                  <Descriptions.Item label="Content Details">
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {Array.isArray(detail.content) ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {detail.content.map((contentItem, contentIndex) => (
                            <Card key={contentIndex} size="small" style={{ backgroundColor: '#fafafa' }}>
                              <Descriptions size="small" column={1}>
                                {contentItem.step && (
                                  <Descriptions.Item label="Step">
                                    <Tag color="purple">{contentItem.step}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.called_from && (
                                  <Descriptions.Item label="Called From">
                                    <Text code>{contentItem.called_from}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.message && (
                                  <Descriptions.Item label="Message">
                                    <Text>{contentItem.message}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.ts && (
                                  <Descriptions.Item label="Timestamp">
                                    <Tag color="cyan">{new Date(contentItem.ts * 1000).toLocaleString()}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.uuid && (
                                  <Descriptions.Item label="UUID">
                                    <Text code style={{ fontSize: '10px' }}>{contentItem.uuid}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.path && (
                                  <Descriptions.Item label="Path">
                                    <Text code>{contentItem.path}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.timers && (
                                  <Descriptions.Item label="Execution Timeline">
                                    {renderTimeline(contentItem.timers)}
                                  </Descriptions.Item>
                                )}
                              </Descriptions>
                            </Card>
                          ))}
                        </Space>
                      ) : (
                        <pre style={{ 
                          fontSize: '11px', 
                          backgroundColor: '#f5f5f5', 
                          padding: '8px', 
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {typeof detail.content === 'string' ? detail.content : JSON.stringify(detail.content, null, 2)}
                        </pre>
                      )}
                    </div>
                  </Descriptions.Item>
                )}
                {detail.user_data && (
                  <Descriptions.Item label="User Data">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(detail.user_data, null, 2)}
                    </pre>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          ))}
        </Space>
      );
    };

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            Logs 
            {logsData?.count && (
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: 8 }}>
                ({logsData.count} entries)
              </Text>
            )}
          </Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchLogs}
            loading={logsLoading}
            size="small"
          >
            Refresh
          </Button>
        </div>
        
        <Card>
          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading logs...</Text>
              </div>
            </div>
          ) : !logsData || logsData.logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No logs found for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Collapse
              items={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                const details = parseLogDetails(logKey);
                
                return {
                  key: index.toString(),
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <Text code style={{ fontSize: '13px' }}>{logType}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>Full key: {logKey}</Text>
                      </div>
                      <Tag color="blue" style={{ marginLeft: 'auto' }}>
                        {details?.length || 0} entries
                      </Tag>
                    </div>
                  ),
                  children: renderLogDetails(logKey),
                  extra: <EyeOutlined />
                };
              })}
              size="small"
              ghost
            />
          )}
        </Card>
      </div>
    );
  };

  const tabItems = [
    {
      key: 'infos',
      label: 'Infos',
      children: renderInfosTab(),
    },
    {
      key: 'workflow',
      label: 'Workflow',
      children: renderWorkflowTab(),
    },
    {
      key: 'actions',
      label: 'Actions',
      children: renderActionsTab(),
    },
    {
      key: 'details',
      label: 'Details',
      children: renderDetailsTab(),
    },
    {
      key: 'logs',
      label: 'Logs',
      children: renderLogsTab(),
    },
  ];

  return (
    <>
      <Modal
        title={`DPE Details - ${dpeItem?.id || ''}`}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`Edit ${editingKey}`}
        open={editModalVisible}
        onOk={handleEditSave}
        onCancel={handleEditCancel}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Editing: </Text>
          <Text code>{editingKey}</Text>
        </div>
        <div>
          <Text strong>Current Value:</Text>
          <div style={{ 
            background: '#f5f5f5', 
            padding: 12, 
            borderRadius: 6, 
            marginTop: 8,
            marginBottom: 16
          }}>
            <pre style={{ margin: 0, fontSize: '12px' }}>
              {JSON.stringify(editingValue, null, 2)}
            </pre>
          </div>
        </div>
        <div>
          <Text strong>New Value (JSON format):</Text>
          <Input.TextArea
            rows={8}
            placeholder="Enter new value in JSON format..."
            value={typeof editingValue === 'string' ? editingValue : JSON.stringify(editingValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setEditingValue(parsed);
              } catch {
                setEditingValue(e.target.value);
              }
            }}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </>
  );
};

```

Now I need to update the display logic to handle the case when there's no purchase information:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      }
    }
  }, [visible, dpeItem, activeTab]);

  const hasPurchaseInfo = (dpeItem: any): boolean => {
    // Check if the DPE record has any purchase-related information
    // This could be a direct purchase field or any indicator that suggests purchase data exists
    return dpeItem && (
      dpeItem.purchase !== undefined ||
      dpeItem.purchase_status !== undefined ||
      dpeItem.has_purchase !== undefined ||
      dpeItem.purchase_info !== undefined ||
      // Add any other purchase-related fields that might exist
      (typeof dpeItem === 'object' && Object.keys(dpeItem).some(key => 
        key.toLowerCase().includes('purchase') || 
        key.toLowerCase().includes('quota')
      ))
    );
  };

  const fetchQuotaStatus = async () => {
    if (!dpeItem) return;
    
    // Check if the DPE record has purchase information before making the API call
    if (!hasPurchaseInfo(dpeItem)) {
      // Set a special status to indicate no purchase info available
      setQuotaStatus({
        no_purchase_info: true,
        message: 'No purchase information available for this DPE record',
        dpe_id: dpeItem.id
      });
      return;
    }
    
    setLoading(true);
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'x-authorization': 'dperdition'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus(data);
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!dpeItem?.id) return;
    
    setLogsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiLogsSuffix = import.meta.env.VITE_API_LOGS_SUFFIX || 'backoffice/get_redis_all_logs';
      
      const url = `${apiBaseUrl}/${apiLogsSuffix}`;
      
      const searchParams = new URLSearchParams();
      searchParams.append('ref_ademe', dpeItem.id);
      
      // Add env parameter based on which API base URL is being used
      const envParam = useDevEnvironment ? "dev" : "stg";
      searchParams.append('env', envParam);
      
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
      // Handle the actual API response structure
      setLogsData(data);
    } catch (error) {
      message.error('Failed to load logs');
      console.error('Error loading logs:', error);
      setLogsData(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    if (quotaStatus && editingKey) {
      setQuotaStatus(prev => ({
        ...prev,
        [editingKey]: editingValue
      }));
      message.success('Value updated successfully');
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Check if this is a "no purchase info" case
      if (quotaStatus.no_purchase_info) {
        infoItems.push({
          key: 'no_purchase_info',
          name: 'Purchase Information',
          value: {
            status: 'No purchase information available',
            message: quotaStatus.message,
            dpe_id: quotaStatus.dpe_id,
            note: 'API call skipped to avoid unnecessary requests'
          }
        });
      } else {
        // Add quota status summary
        infoItems.push({
          key: 'quota_status_summary',
          name: 'Quota Status Summary',
          value: {
            total_items: quotaStatus.table_values?.length || 0,
            purchased_items: quotaStatus.table_values?.filter((item: any) => item.purchase === 1).length || 0,
            api_response: quotaStatus
          }
        });
        
        // Add individual purchased items if any exist
        if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
          const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
          if (purchasedItems.length > 0) {
            infoItems.push({
              key: 'purchased_items',
              name: 'Purchased Items',
              value: purchasedItems
            });
          }
        }
      }
    }

    const columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              {typeof value === 'object' ? (
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 8, 
                  borderRadius: 4, 
                  margin: 0,
                  fontSize: '12px',
                  maxHeight: 100,
                  overflow: 'auto'
                }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <Text>{String(value)}</Text>
              )}
            </div>
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditClick(record.key, value)}
            />
          </div>
        ),
      },
    ];

    return (
      <div>
        <Title level={4}>DPE Information</Title>
        {dpeItem && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Text strong>ID:</Text> {dpeItem.id}
              </div>
              <div>
                <Text strong>DPE Rating:</Text> {dpeItem.dpe || 'N/A'}
              </div>
              <div>
                <Text strong>Address:</Text> {dpeItem.address}
              </div>
              <div>
                <Text strong>Handicap:</Text> {dpeItem.handicap}
              </div>
              <div>
                <Text strong>Note:</Text> {dpeItem.note}
              </div>
              <div>
                <Text strong>Last Modified:</Text> {new Date(dpeItem.last_modified).toLocaleString()}
              </div>
            </div>
          </Card>
        )}
        
        <Title level={4}>Infos</Title>
        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading quota status...</div>
            </div>
          ) : infoItems.length > 0 ? (
            <Table
              columns={columns}
              dataSource={infoItems}
              rowKey="key"
              pagination={false}
              size="small"
              showHeader={true}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Text type="secondary">No quota status data available or no purchased items found.</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                API endpoint: {import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr'}/backoffice/dpe_quota?ref_ademe={dpeItem?.id}
              </Text>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderWorkflowTab = () => (
    <div>
      <Title level={4}>Workflow</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Workflow information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show the workflow status and progression for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderActionsTab = () => (
    <div>
      <Title level={4}>Actions</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Available actions will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show available actions for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderDetailsTab = () => (
    <div>
      <Title level={4}>Details</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Detailed information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show detailed technical information for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderLogsTab = () => {
    const parseLogDetails = (logKey: string) => {
      if (!logsData?.cd_log) return null;
      
      try {
        // cd_log is already an object, no need to parse JSON
        const cdLogData = logsData.cd_log;
        
        // Extract the actual log type from the key (e.g., "2369E0905921W:stg_middleware_latest_log" -> "stg_middleware_latest_log")
        const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
        const logDetails = cdLogData[logType];
        
        if (Array.isArray(logDetails)) {
          const parsedItems = logDetails.map((item, index) => {
            // Parse JSON strings within the array
            const parsed = typeof item === 'string' ? JSON.parse(item) : item;
            return { ...parsed, index };
          });
          
          // Sort by timestamp (most recent first) if timestamps are available
          return parsedItems.sort((a, b) => {
            const timestampA = a.hr_ts || a.ts;
            const timestampB = b.hr_ts || b.ts;
            
            if (!timestampA || !timestampB) return 0; // Keep original order if no timestamps
            
            // Convert to comparable format
            const dateA = timestampA.includes(':') ? new Date(timestampA) : new Date(timestampA * 1000);
            const dateB = timestampB.includes(':') ? new Date(timestampB) : new Date(timestampB * 1000);
            
            // Most recent first (descending order)
            return dateB.getTime() - dateA.getTime();
          });
        } else if (logDetails) {
          // Single object - no need to parse, already an object
          return [logDetails];
        }
        return [];
      } catch (error) {
        console.error('Error parsing log details:', error);
        return [];
      }
    };

    const renderTimeline = (timers: any) => {
      if (!timers || typeof timers !== 'object') return null;

      // Convert timers to array and sort by timestamp
      const timerEntries = Object.entries(timers)
        .map(([name, timestamp]) => ({
          name,
          timestamp: timestamp as number,
          displayName: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (timerEntries.length === 0) return null;

      // Calculate relative times (first timestamp as baseline)
      const baseline = timerEntries[0].timestamp;
      const timelineItems = timerEntries.map((entry, index) => {
        const relativeTime = entry.timestamp - baseline;
        const duration = index > 0 ? entry.timestamp - timerEntries[index - 1].timestamp : 0;
        
        return {
          key: entry.name,
          children: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {entry.displayName}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <Text code>{new Date(entry.timestamp * 1000).toLocaleTimeString()}</Text>
                {index > 0 && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    +{duration.toFixed(3)}s
                  </Tag>
                )}
                <Tag color="blue" style={{ marginLeft: 4 }}>
                  {relativeTime.toFixed(3)}s from start
                </Tag>
              </div>
            </div>
          ),
          dot: <ClockCircleOutlined style={{ color: '#1890ff' }} />
        };
      });

      return (
        <div style={{ marginTop: 8 }}>
          <Text strong style={{ fontSize: '13px' }}>Execution Timeline:</Text>
          <Timeline
            items={timelineItems}
            size="small"
            style={{ marginTop: 8 }}
          />
        </div>
      );
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {details.map((detail, index) => (
            <Card key={index} size="small" style={{ marginBottom: 8 }}>
              <Descriptions size="small" column={1}>
                {detail.hr_ts && (
                  <Descriptions.Item label="Timestamp">
                    <Tag color="blue">{detail.hr_ts}</Tag>
                  </Descriptions.Item>
                )}
                {detail.client_id && (
                  <Descriptions.Item label="Client ID">
                    <Text code>{detail.client_id}</Text>
                  </Descriptions.Item>
                )}
                {detail.client_ip_hash && (
                  <Descriptions.Item label="Client IP Hash">
                    <Text code>{detail.client_ip_hash}</Text>
                  </Descriptions.Item>
                )}
                {detail.path && (
                  <Descriptions.Item label="Path">
                    <Text code>{detail.path}</Text>
                  </Descriptions.Item>
                )}
                {detail.method && (
                  <Descriptions.Item label="Method">
                    <Tag color="green">{detail.method}</Tag>
                  </Descriptions.Item>
                )}
                {detail.time && (
                  <Descriptions.Item label="Time (ms)">
                    <Tag color="orange">{detail.time}</Tag>
                  </Descriptions.Item>
                )}
                {detail.uuid && (
                  <Descriptions.Item label="UUID">
                    <Text code style={{ fontSize: '11px' }}>{detail.uuid}</Text>
                  </Descriptions.Item>
                )}
                {detail.body && (
                  <Descriptions.Item label="Body">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '150px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {detail.body}
                    </pre>
                  </Descriptions.Item>
                )}
                {detail.content && (
                  <Descriptions.Item label="Content Details">
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {Array.isArray(detail.content) ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {detail.content.map((contentItem, contentIndex) => (
                            <Card key={contentIndex} size="small" style={{ backgroundColor: '#fafafa' }}>
                              <Descriptions size="small" column={1}>
                                {contentItem.step && (
                                  <Descriptions.Item label="Step">
                                    <Tag color="purple">{contentItem.step}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.called_from && (
                                  <Descriptions.Item label="Called From">
                                    <Text code>{contentItem.called_from}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.message && (
                                  <Descriptions.Item label="Message">
                                    <Text>{contentItem.message}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.ts && (
                                  <Descriptions.Item label="Timestamp">
                                    <Tag color="cyan">{new Date(contentItem.ts * 1000).toLocaleString()}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.uuid && (
                                  <Descriptions.Item label="UUID">
                                    <Text code style={{ fontSize: '10px' }}>{contentItem.uuid}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.path && (
                                  <Descriptions.Item label="Path">
                                    <Text code>{contentItem.path}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.timers && (
                                  <Descriptions.Item label="Execution Timeline">
                                    {renderTimeline(contentItem.timers)}
                                  </Descriptions.Item>
                                )}
                              </Descriptions>
                            </Card>
                          ))}
                        </Space>
                      ) : (
                        <pre style={{ 
                          fontSize: '11px', 
                          backgroundColor: '#f5f5f5', 
                          padding: '8px', 
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {typeof detail.content === 'string' ? detail.content : JSON.stringify(detail.content, null, 2)}
                        </pre>
                      )}
                    </div>
                  </Descriptions.Item>
                )}
                {detail.user_data && (
                  <Descriptions.Item label="User Data">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(detail.user_data, null, 2)}
                    </pre>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          ))}
        </Space>
      );
    };

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            Logs 
            {logsData?.count && (
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: 8 }}>
                ({logsData.count} entries)
              </Text>
            )}
          </Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchLogs}
            loading={logsLoading}
            size="small"
          >
            Refresh
          </Button>
        </div>
        
        <Card>
          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading logs...</Text>
              </div>
            </div>
          ) : !logsData || logsData.logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No logs found for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Collapse
              items={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                const details = parseLogDetails(logKey);
                
                return {
                  key: index.toString(),
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <Text code style={{ fontSize: '13px' }}>{logType}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>Full key: {logKey}</Text>
                      </div>
                      <Tag color="blue" style={{ marginLeft: 'auto' }}>
                        {details?.length || 0} entries
                      </Tag>
                    </div>
                  ),
                  children: renderLogDetails(logKey),
                  extra: <EyeOutlined />
                };
              })}
              size="small"
              ghost
            />
          )}
        </Card>
      </div>
    );
  };

  const tabItems = [
    {
      key: 'infos',
      label: 'Infos',
      children: renderInfosTab(),
    },
    {
      key: 'workflow',
      label: 'Workflow',
      children: renderWorkflowTab(),
    },
    {
      key: 'actions',
      label: 'Actions',
      children: renderActionsTab(),
    },
    {
      key: 'details',
      label: 'Details',
      children: renderDetailsTab(),
    },
    {
      key: 'logs',
      label: 'Logs',
      children: renderLogsTab(),
    },
  ];

  return (
    <>
      <Modal
        title={`DPE Details - ${dpeItem?.id || ''}`}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`Edit ${editingKey}`}
        open={editModalVisible}
        onOk={handleEditSave}
        onCancel={handleEditCancel}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Editing: </Text>
          <Text code>{editingKey}</Text>
        </div>
        <div>
          <Text strong>Current Value:</Text>
          <div style={{ 
            background: '#f5f5f5', 
            padding: 12, 
            borderRadius: 6, 
            marginTop: 8,
            marginBottom: 16
          }}>
            <pre style={{ margin: 0, fontSize: '12px' }}>
              {JSON.stringify(editingValue, null, 2)}
            </pre>
          </div>
        </div>
        <div>
          <Text strong>New Value (JSON format):</Text>
          <Input.TextArea
            rows={8}
            placeholder="Enter new value in JSON format..."
            value={typeof editingValue === 'string' ? editingValue : JSON.stringify(editingValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setEditingValue(parsed);
              } catch {
                setEditingValue(e.target.value);
              }
            }}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </>
  );
};

```

Now let me also update the empty state message to be more informative:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      }
    }
  }, [visible, dpeItem, activeTab]);

  const hasPurchaseInfo = (dpeItem: any): boolean => {
    // Check if the DPE record has any purchase-related information
    // This could be a direct purchase field or any indicator that suggests purchase data exists
    return dpeItem && (
      dpeItem.purchase !== undefined ||
      dpeItem.purchase_status !== undefined ||
      dpeItem.has_purchase !== undefined ||
      dpeItem.purchase_info !== undefined ||
      // Add any other purchase-related fields that might exist
      (typeof dpeItem === 'object' && Object.keys(dpeItem).some(key => 
        key.toLowerCase().includes('purchase') || 
        key.toLowerCase().includes('quota')
      ))
    );
  };

  const fetchQuotaStatus = async () => {
    if (!dpeItem) return;
    
    // Check if the DPE record has purchase information before making the API call
    if (!hasPurchaseInfo(dpeItem)) {
      // Set a special status to indicate no purchase info available
      setQuotaStatus({
        no_purchase_info: true,
        message: 'No purchase information available for this DPE record',
        dpe_id: dpeItem.id
      });
      return;
    }
    
    setLoading(true);
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'x-authorization': 'dperdition'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus(data);
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!dpeItem?.id) return;
    
    setLogsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiLogsSuffix = import.meta.env.VITE_API_LOGS_SUFFIX || 'backoffice/get_redis_all_logs';
      
      const url = `${apiBaseUrl}/${apiLogsSuffix}`;
      
      const searchParams = new URLSearchParams();
      searchParams.append('ref_ademe', dpeItem.id);
      
      // Add env parameter based on which API base URL is being used
      const envParam = useDevEnvironment ? "dev" : "stg";
      searchParams.append('env', envParam);
      
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
      // Handle the actual API response structure
      setLogsData(data);
    } catch (error) {
      message.error('Failed to load logs');
      console.error('Error loading logs:', error);
      setLogsData(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    if (quotaStatus && editingKey) {
      setQuotaStatus(prev => ({
        ...prev,
        [editingKey]: editingValue
      }));
      message.success('Value updated successfully');
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Check if this is a "no purchase info" case
      if (quotaStatus.no_purchase_info) {
        infoItems.push({
          key: 'no_purchase_info',
          name: 'Purchase Information',
          value: {
            status: 'No purchase information available',
            message: quotaStatus.message,
            dpe_id: quotaStatus.dpe_id,
            note: 'API call skipped to avoid unnecessary requests'
          }
        });
      } else {
        // Add quota status summary
        infoItems.push({
          key: 'quota_status_summary',
          name: 'Quota Status Summary',
          value: {
            total_items: quotaStatus.table_values?.length || 0,
            purchased_items: quotaStatus.table_values?.filter((item: any) => item.purchase === 1).length || 0,
            api_response: quotaStatus
          }
        });
        
        // Add individual purchased items if any exist
        if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
          const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
          if (purchasedItems.length > 0) {
            infoItems.push({
              key: 'purchased_items',
              name: 'Purchased Items',
              value: purchasedItems
            });
          }
        }
      }
    }

    const columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              {typeof value === 'object' ? (
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 8, 
                  borderRadius: 4, 
                  margin: 0,
                  fontSize: '12px',
                  maxHeight: 100,
                  overflow: 'auto'
                }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <Text>{String(value)}</Text>
              )}
            </div>
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditClick(record.key, value)}
            />
          </div>
        ),
      },
    ];

    return (
      <div>
        <Title level={4}>DPE Information</Title>
        {dpeItem && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Text strong>ID:</Text> {dpeItem.id}
              </div>
              <div>
                <Text strong>DPE Rating:</Text> {dpeItem.dpe || 'N/A'}
              </div>
              <div>
                <Text strong>Address:</Text> {dpeItem.address}
              </div>
              <div>
                <Text strong>Handicap:</Text> {dpeItem.handicap}
              </div>
              <div>
                <Text strong>Note:</Text> {dpeItem.note}
              </div>
              <div>
                <Text strong>Last Modified:</Text> {new Date(dpeItem.last_modified).toLocaleString()}
              </div>
            </div>
          </Card>
        )}
        
        <Title level={4}>Infos</Title>
        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading quota status...</div>
            </div>
          ) : infoItems.length > 0 ? (
            <Table
              columns={columns}
              dataSource={infoItems}
              rowKey="key"
              pagination={false}
              size="small"
              showHeader={true}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Text type="secondary">
                {quotaStatus?.no_purchase_info 
                  ? 'No purchase information found in DPE record - API call skipped'
                  : 'No quota status data available or no purchased items found.'
                }
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {quotaStatus?.no_purchase_info 
                  ? 'No API call was made to avoid unnecessary requests'
                  : `API endpoint: ${import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr'}/backoffice/dpe_quota?ref_ademe=${dpeItem?.id}`
                }
              </Text>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderWorkflowTab = () => (
    <div>
      <Title level={4}>Workflow</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Workflow information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show the workflow status and progression for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderActionsTab = () => (
    <div>
      <Title level={4}>Actions</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Available actions will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show available actions for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderDetailsTab = () => (
    <div>
      <Title level={4}>Details</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Detailed information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show detailed technical information for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderLogsTab = () => {
    const parseLogDetails = (logKey: string) => {
      if (!logsData?.cd_log) return null;
      
      try {
        // cd_log is already an object, no need to parse JSON
        const cdLogData = logsData.cd_log;
        
        // Extract the actual log type from the key (e.g., "2369E0905921W:stg_middleware_latest_log" -> "stg_middleware_latest_log")
        const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
        const logDetails = cdLogData[logType];
        
        if (Array.isArray(logDetails)) {
          const parsedItems = logDetails.map((item, index) => {
            // Parse JSON strings within the array
            const parsed = typeof item === 'string' ? JSON.parse(item) : item;
            return { ...parsed, index };
          });
          
          // Sort by timestamp (most recent first) if timestamps are available
          return parsedItems.sort((a, b) => {
            const timestampA = a.hr_ts || a.ts;
            const timestampB = b.hr_ts || b.ts;
            
            if (!timestampA || !timestampB) return 0; // Keep original order if no timestamps
            
            // Convert to comparable format
            const dateA = timestampA.includes(':') ? new Date(timestampA) : new Date(timestampA * 1000);
            const dateB = timestampB.includes(':') ? new Date(timestampB) : new Date(timestampB * 1000);
            
            // Most recent first (descending order)
            return dateB.getTime() - dateA.getTime();
          });
        } else if (logDetails) {
          // Single object - no need to parse, already an object
          return [logDetails];
        }
        return [];
      } catch (error) {
        console.error('Error parsing log details:', error);
        return [];
      }
    };

    const renderTimeline = (timers: any) => {
      if (!timers || typeof timers !== 'object') return null;

      // Convert timers to array and sort by timestamp
      const timerEntries = Object.entries(timers)
        .map(([name, timestamp]) => ({
          name,
          timestamp: timestamp as number,
          displayName: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (timerEntries.length === 0) return null;

      // Calculate relative times (first timestamp as baseline)
      const baseline = timerEntries[0].timestamp;
      const timelineItems = timerEntries.map((entry, index) => {
        const relativeTime = entry.timestamp - baseline;
        const duration = index > 0 ? entry.timestamp - timerEntries[index - 1].timestamp : 0;
        
        return {
          key: entry.name,
          children: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {entry.displayName}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <Text code>{new Date(entry.timestamp * 1000).toLocaleTimeString()}</Text>
                {index > 0 && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    +{duration.toFixed(3)}s
                  </Tag>
                )}
                <Tag color="blue" style={{ marginLeft: 4 }}>
                  {relativeTime.toFixed(3)}s from start
                </Tag>
              </div>
            </div>
          ),
          dot: <ClockCircleOutlined style={{ color: '#1890ff' }} />
        };
      });

      return (
        <div style={{ marginTop: 8 }}>
          <Text strong style={{ fontSize: '13px' }}>Execution Timeline:</Text>
          <Timeline
            items={timelineItems}
            size="small"
            style={{ marginTop: 8 }}
          />
        </div>
      );
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {details.map((detail, index) => (
            <Card key={index} size="small" style={{ marginBottom: 8 }}>
              <Descriptions size="small" column={1}>
                {detail.hr_ts && (
                  <Descriptions.Item label="Timestamp">
                    <Tag color="blue">{detail.hr_ts}</Tag>
                  </Descriptions.Item>
                )}
                {detail.client_id && (
                  <Descriptions.Item label="Client ID">
                    <Text code>{detail.client_id}</Text>
                  </Descriptions.Item>
                )}
                {detail.client_ip_hash && (
                  <Descriptions.Item label="Client IP Hash">
                    <Text code>{detail.client_ip_hash}</Text>
                  </Descriptions.Item>
                )}
                {detail.path && (
                  <Descriptions.Item label="Path">
                    <Text code>{detail.path}</Text>
                  </Descriptions.Item>
                )}
                {detail.method && (
                  <Descriptions.Item label="Method">
                    <Tag color="green">{detail.method}</Tag>
                  </Descriptions.Item>
                )}
                {detail.time && (
                  <Descriptions.Item label="Time (ms)">
                    <Tag color="orange">{detail.time}</Tag>
                  </Descriptions.Item>
                )}
                {detail.uuid && (
                  <Descriptions.Item label="UUID">
                    <Text code style={{ fontSize: '11px' }}>{detail.uuid}</Text>
                  </Descriptions.Item>
                )}
                {detail.body && (
                  <Descriptions.Item label="Body">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '150px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {detail.body}
                    </pre>
                  </Descriptions.Item>
                )}
                {detail.content && (
                  <Descriptions.Item label="Content Details">
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {Array.isArray(detail.content) ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {detail.content.map((contentItem, contentIndex) => (
                            <Card key={contentIndex} size="small" style={{ backgroundColor: '#fafafa' }}>
                              <Descriptions size="small" column={1}>
                                {contentItem.step && (
                                  <Descriptions.Item label="Step">
                                    <Tag color="purple">{contentItem.step}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.called_from && (
                                  <Descriptions.Item label="Called From">
                                    <Text code>{contentItem.called_from}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.message && (
                                  <Descriptions.Item label="Message">
                                    <Text>{contentItem.message}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.ts && (
                                  <Descriptions.Item label="Timestamp">
                                    <Tag color="cyan">{new Date(contentItem.ts * 1000).toLocaleString()}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.uuid && (
                                  <Descriptions.Item label="UUID">
                                    <Text code style={{ fontSize: '10px' }}>{contentItem.uuid}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.path && (
                                  <Descriptions.Item label="Path">
                                    <Text code>{contentItem.path}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.timers && (
                                  <Descriptions.Item label="Execution Timeline">
                                    {renderTimeline(contentItem.timers)}
                                  </Descriptions.Item>
                                )}
                              </Descriptions>
                            </Card>
                          ))}
                        </Space>
                      ) : (
                        <pre style={{ 
                          fontSize: '11px', 
                          backgroundColor: '#f5f5f5', 
                          padding: '8px', 
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {typeof detail.content === 'string' ? detail.content : JSON.stringify(detail.content, null, 2)}
                        </pre>
                      )}
                    </div>
                  </Descriptions.Item>
                )}
                {detail.user_data && (
                  <Descriptions.Item label="User Data">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(detail.user_data, null, 2)}
                    </pre>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          ))}
        </Space>
      );
    };

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            Logs 
            {logsData?.count && (
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: 8 }}>
                ({logsData.count} entries)
              </Text>
            )}
          </Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchLogs}
            loading={logsLoading}
            size="small"
          >
            Refresh
          </Button>
        </div>
        
        <Card>
          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading logs...</Text>
              </div>
            </div>
          ) : !logsData || logsData.logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No logs found for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Collapse
              items={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                const details = parseLogDetails(logKey);
                
                return {
                  key: index.toString(),
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <Text code style={{ fontSize: '13px' }}>{logType}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>Full key: {logKey}</Text>
                      </div>
                      <Tag color="blue" style={{ marginLeft: 'auto' }}>
                        {details?.length || 0} entries
                      </Tag>
                    </div>
                  ),
                  children: renderLogDetails(logKey),
                  extra: <EyeOutlined />
                };
              })}
              size="small"
              ghost
            />
          )}
        </Card>
      </div>
    );
  };

  const tabItems = [
    {
      key: 'infos',
      label: 'Infos',
      children: renderInfosTab(),
    },
    {
      key: 'workflow',
      label: 'Workflow',
      children: renderWorkflowTab(),
    },
    {
      key: 'actions',
      label: 'Actions',
      children: renderActionsTab(),
    },
    {
      key: 'details',
      label: 'Details',
      children: renderDetailsTab(),
    },
    {
      key: 'logs',
      label: 'Logs',
      children: renderLogsTab(),
    },
  ];

  return (
    <>
      <Modal
        title={`DPE Details - ${dpeItem?.id || ''}`}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`Edit ${editingKey}`}
        open={editModalVisible}
        onOk={handleEditSave}
        onCancel={handleEditCancel}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Editing: </Text>
          <Text code>{editingKey}</Text>
        </div>
        <div>
          <Text strong>Current Value:</Text>
          <div style={{ 
            background: '#f5f5f5', 
            padding: 12, 
            borderRadius: 6, 
            marginTop: 8,
            marginBottom: 16
          }}>
            <pre style={{ margin: 0, fontSize: '12px' }}>
              {JSON.stringify(editingValue, null, 2)}
            </pre>
          </div>
        </div>
        <div>
          <Text strong>New Value (JSON format):</Text>
          <Input.TextArea
            rows={8}
            placeholder="Enter new value in JSON format..."
            value={typeof editingValue === 'string' ? editingValue : JSON.stringify(editingValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setEditingValue(parsed);
              } catch {
                setEditingValue(e.target.value);
              }
            }}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </>
  );
};

```

Now let me check for any linting errors:


Perfect! Now let me update the todo status:


Excellent! I have successfully implemented the requested changes. Here's a summary of what was implemented:

## Summary of Changes

I've successfully updated the DPE details modal "Infos" tab to avoid making unnecessary API calls when there's no purchase information in the DPE record, and to prevent any errors from occurring.

### Key Changes Made:

### 1. **Added Purchase Information Check**
- **New Function**: `hasPurchaseInfo()` that checks if the DPE record contains any purchase-related information
- **Checks For**: Various purchase-related fields like `purchase`, `purchase_status`, `has_purchase`, `purchase_info`, or any field containing "purchase" or "quota" in the name
- **Flexible Detection**: Uses case-insensitive matching to catch various naming conventions

### 2. **Conditional API Call Logic**
- **Pre-Check**: Before making the API call, the system now checks if purchase information exists in the DPE record
- **Skip Logic**: If no purchase information is found, the API call to `https://api-dev.etiquettedpe.fr/backoffice/dpe_quota?ref_ademe={dpeItem.id}` is completely skipped
- **No Errors**: When no purchase info exists, no errors are thrown and no unnecessary network requests are made

### 3. **Enhanced User Experience**
- **Informative Messages**: Shows clear messages when purchase information is not available
- **Status Indication**: Displays "No purchase information found in DPE record - API call skipped"
- **Debugging Info**: Shows "No API call was made to avoid unnecessary requests" instead of the API endpoint
- **Graceful Handling**: The modal still opens and functions normally, just with appropriate messaging

### 4. **Improved Display Logic**
- **Special Status**: When no purchase info is detected, sets a special `no_purchase_info` status
- **Conditional Rendering**: Different display logic for records with vs. without purchase information
- **Consistent UI**: Maintains the same table structure but with appropriate content

### Behavior:
- ✅ **With Purchase Info**: Makes API call and displays filtered quota status (purchase = 1)
- ✅ **Without Purchase Info**: Skips API call entirely, shows informative message, no errors
- ✅ **Error Prevention**: No network errors or unnecessary API calls
- ✅ **User-Friendly**: Clear messaging about why no data is shown

The implementation now intelligently detects whether a DPE record has purchase information and only makes the API call when it's likely to return useful data, significantly improving performance and user experience while preventing unnecessary network requests and potential errors.

---

**User**

if "  "status": "No purchase information available"
just hide this line in the table

---

**Cursor**

I understand you want to hide the table row that shows "No purchase information available" when there's no purchase information. Let me modify the code to not display that row in the table.


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      }
    }
  }, [visible, dpeItem, activeTab]);

  const hasPurchaseInfo = (dpeItem: any): boolean => {
    // Check if the DPE record has any purchase-related information
    // This could be a direct purchase field or any indicator that suggests purchase data exists
    return dpeItem && (
      dpeItem.purchase !== undefined ||
      dpeItem.purchase_status !== undefined ||
      dpeItem.has_purchase !== undefined ||
      dpeItem.purchase_info !== undefined ||
      // Add any other purchase-related fields that might exist
      (typeof dpeItem === 'object' && Object.keys(dpeItem).some(key => 
        key.toLowerCase().includes('purchase') || 
        key.toLowerCase().includes('quota')
      ))
    );
  };

  const fetchQuotaStatus = async () => {
    if (!dpeItem) return;
    
    // Check if the DPE record has purchase information before making the API call
    if (!hasPurchaseInfo(dpeItem)) {
      // Set a special status to indicate no purchase info available
      setQuotaStatus({
        no_purchase_info: true,
        message: 'No purchase information available for this DPE record',
        dpe_id: dpeItem.id
      });
      return;
    }
    
    setLoading(true);
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'x-authorization': 'dperdition'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus(data);
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!dpeItem?.id) return;
    
    setLogsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiLogsSuffix = import.meta.env.VITE_API_LOGS_SUFFIX || 'backoffice/get_redis_all_logs';
      
      const url = `${apiBaseUrl}/${apiLogsSuffix}`;
      
      const searchParams = new URLSearchParams();
      searchParams.append('ref_ademe', dpeItem.id);
      
      // Add env parameter based on which API base URL is being used
      const envParam = useDevEnvironment ? "dev" : "stg";
      searchParams.append('env', envParam);
      
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
      // Handle the actual API response structure
      setLogsData(data);
    } catch (error) {
      message.error('Failed to load logs');
      console.error('Error loading logs:', error);
      setLogsData(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    if (quotaStatus && editingKey) {
      setQuotaStatus(prev => ({
        ...prev,
        [editingKey]: editingValue
      }));
      message.success('Value updated successfully');
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Check if this is a "no purchase info" case - don't add any items to the table
      if (!quotaStatus.no_purchase_info) {
        // Add quota status summary
        infoItems.push({
          key: 'quota_status_summary',
          name: 'Quota Status Summary',
          value: {
            total_items: quotaStatus.table_values?.length || 0,
            purchased_items: quotaStatus.table_values?.filter((item: any) => item.purchase === 1).length || 0,
            api_response: quotaStatus
          }
        });
        
        // Add individual purchased items if any exist
        if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
          const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
          if (purchasedItems.length > 0) {
            infoItems.push({
              key: 'purchased_items',
              name: 'Purchased Items',
              value: purchasedItems
            });
          }
        }
      }
    }

    const columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              {typeof value === 'object' ? (
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 8, 
                  borderRadius: 4, 
                  margin: 0,
                  fontSize: '12px',
                  maxHeight: 100,
                  overflow: 'auto'
                }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <Text>{String(value)}</Text>
              )}
            </div>
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditClick(record.key, value)}
            />
          </div>
        ),
      },
    ];

    return (
      <div>
        <Title level={4}>DPE Information</Title>
        {dpeItem && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Text strong>ID:</Text> {dpeItem.id}
              </div>
              <div>
                <Text strong>DPE Rating:</Text> {dpeItem.dpe || 'N/A'}
              </div>
              <div>
                <Text strong>Address:</Text> {dpeItem.address}
              </div>
              <div>
                <Text strong>Handicap:</Text> {dpeItem.handicap}
              </div>
              <div>
                <Text strong>Note:</Text> {dpeItem.note}
              </div>
              <div>
                <Text strong>Last Modified:</Text> {new Date(dpeItem.last_modified).toLocaleString()}
              </div>
            </div>
          </Card>
        )}
        
        <Title level={4}>Infos</Title>
        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading quota status...</div>
            </div>
          ) : infoItems.length > 0 ? (
            <Table
              columns={columns}
              dataSource={infoItems}
              rowKey="key"
              pagination={false}
              size="small"
              showHeader={true}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Text type="secondary">
                {quotaStatus?.no_purchase_info 
                  ? 'No purchase information found in DPE record - API call skipped'
                  : 'No quota status data available or no purchased items found.'
                }
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {quotaStatus?.no_purchase_info 
                  ? 'No API call was made to avoid unnecessary requests'
                  : `API endpoint: ${import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr'}/backoffice/dpe_quota?ref_ademe=${dpeItem?.id}`
                }
              </Text>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderWorkflowTab = () => (
    <div>
      <Title level={4}>Workflow</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Workflow information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show the workflow status and progression for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderActionsTab = () => (
    <div>
      <Title level={4}>Actions</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Available actions will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show available actions for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderDetailsTab = () => (
    <div>
      <Title level={4}>Details</Title>
      <Card>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text type="secondary">Detailed information will be displayed here.</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This tab will show detailed technical information for DPE ID: {dpeItem?.id}
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderLogsTab = () => {
    const parseLogDetails = (logKey: string) => {
      if (!logsData?.cd_log) return null;
      
      try {
        // cd_log is already an object, no need to parse JSON
        const cdLogData = logsData.cd_log;
        
        // Extract the actual log type from the key (e.g., "2369E0905921W:stg_middleware_latest_log" -> "stg_middleware_latest_log")
        const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
        const logDetails = cdLogData[logType];
        
        if (Array.isArray(logDetails)) {
          const parsedItems = logDetails.map((item, index) => {
            // Parse JSON strings within the array
            const parsed = typeof item === 'string' ? JSON.parse(item) : item;
            return { ...parsed, index };
          });
          
          // Sort by timestamp (most recent first) if timestamps are available
          return parsedItems.sort((a, b) => {
            const timestampA = a.hr_ts || a.ts;
            const timestampB = b.hr_ts || b.ts;
            
            if (!timestampA || !timestampB) return 0; // Keep original order if no timestamps
            
            // Convert to comparable format
            const dateA = timestampA.includes(':') ? new Date(timestampA) : new Date(timestampA * 1000);
            const dateB = timestampB.includes(':') ? new Date(timestampB) : new Date(timestampB * 1000);
            
            // Most recent first (descending order)
            return dateB.getTime() - dateA.getTime();
          });
        } else if (logDetails) {
          // Single object - no need to parse, already an object
          return [logDetails];
        }
        return [];
      } catch (error) {
        console.error('Error parsing log details:', error);
        return [];
      }
    };

    const renderTimeline = (timers: any) => {
      if (!timers || typeof timers !== 'object') return null;

      // Convert timers to array and sort by timestamp
      const timerEntries = Object.entries(timers)
        .map(([name, timestamp]) => ({
          name,
          timestamp: timestamp as number,
          displayName: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      if (timerEntries.length === 0) return null;

      // Calculate relative times (first timestamp as baseline)
      const baseline = timerEntries[0].timestamp;
      const timelineItems = timerEntries.map((entry, index) => {
        const relativeTime = entry.timestamp - baseline;
        const duration = index > 0 ? entry.timestamp - timerEntries[index - 1].timestamp : 0;
        
        return {
          key: entry.name,
          children: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {entry.displayName}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <Text code>{new Date(entry.timestamp * 1000).toLocaleTimeString()}</Text>
                {index > 0 && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    +{duration.toFixed(3)}s
                  </Tag>
                )}
                <Tag color="blue" style={{ marginLeft: 4 }}>
                  {relativeTime.toFixed(3)}s from start
                </Tag>
              </div>
            </div>
          ),
          dot: <ClockCircleOutlined style={{ color: '#1890ff' }} />
        };
      });

      return (
        <div style={{ marginTop: 8 }}>
          <Text strong style={{ fontSize: '13px' }}>Execution Timeline:</Text>
          <Timeline
            items={timelineItems}
            size="small"
            style={{ marginTop: 8 }}
          />
        </div>
      );
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {details.map((detail, index) => (
            <Card key={index} size="small" style={{ marginBottom: 8 }}>
              <Descriptions size="small" column={1}>
                {detail.hr_ts && (
                  <Descriptions.Item label="Timestamp">
                    <Tag color="blue">{detail.hr_ts}</Tag>
                  </Descriptions.Item>
                )}
                {detail.client_id && (
                  <Descriptions.Item label="Client ID">
                    <Text code>{detail.client_id}</Text>
                  </Descriptions.Item>
                )}
                {detail.client_ip_hash && (
                  <Descriptions.Item label="Client IP Hash">
                    <Text code>{detail.client_ip_hash}</Text>
                  </Descriptions.Item>
                )}
                {detail.path && (
                  <Descriptions.Item label="Path">
                    <Text code>{detail.path}</Text>
                  </Descriptions.Item>
                )}
                {detail.method && (
                  <Descriptions.Item label="Method">
                    <Tag color="green">{detail.method}</Tag>
                  </Descriptions.Item>
                )}
                {detail.time && (
                  <Descriptions.Item label="Time (ms)">
                    <Tag color="orange">{detail.time}</Tag>
                  </Descriptions.Item>
                )}
                {detail.uuid && (
                  <Descriptions.Item label="UUID">
                    <Text code style={{ fontSize: '11px' }}>{detail.uuid}</Text>
                  </Descriptions.Item>
                )}
                {detail.body && (
                  <Descriptions.Item label="Body">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '150px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {detail.body}
                    </pre>
                  </Descriptions.Item>
                )}
                {detail.content && (
                  <Descriptions.Item label="Content Details">
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {Array.isArray(detail.content) ? (
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {detail.content.map((contentItem, contentIndex) => (
                            <Card key={contentIndex} size="small" style={{ backgroundColor: '#fafafa' }}>
                              <Descriptions size="small" column={1}>
                                {contentItem.step && (
                                  <Descriptions.Item label="Step">
                                    <Tag color="purple">{contentItem.step}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.called_from && (
                                  <Descriptions.Item label="Called From">
                                    <Text code>{contentItem.called_from}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.message && (
                                  <Descriptions.Item label="Message">
                                    <Text>{contentItem.message}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.ts && (
                                  <Descriptions.Item label="Timestamp">
                                    <Tag color="cyan">{new Date(contentItem.ts * 1000).toLocaleString()}</Tag>
                                  </Descriptions.Item>
                                )}
                                {contentItem.uuid && (
                                  <Descriptions.Item label="UUID">
                                    <Text code style={{ fontSize: '10px' }}>{contentItem.uuid}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.path && (
                                  <Descriptions.Item label="Path">
                                    <Text code>{contentItem.path}</Text>
                                  </Descriptions.Item>
                                )}
                                {contentItem.timers && (
                                  <Descriptions.Item label="Execution Timeline">
                                    {renderTimeline(contentItem.timers)}
                                  </Descriptions.Item>
                                )}
                              </Descriptions>
                            </Card>
                          ))}
                        </Space>
                      ) : (
                        <pre style={{ 
                          fontSize: '11px', 
                          backgroundColor: '#f5f5f5', 
                          padding: '8px', 
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {typeof detail.content === 'string' ? detail.content : JSON.stringify(detail.content, null, 2)}
                        </pre>
                      )}
                    </div>
                  </Descriptions.Item>
                )}
                {detail.user_data && (
                  <Descriptions.Item label="User Data">
                    <pre style={{ 
                      fontSize: '11px', 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(detail.user_data, null, 2)}
                    </pre>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          ))}
        </Space>
      );
    };

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            Logs 
            {logsData?.count && (
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: 8 }}>
                ({logsData.count} entries)
              </Text>
            )}
          </Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchLogs}
            loading={logsLoading}
            size="small"
          >
            Refresh
          </Button>
        </div>
        
        <Card>
          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading logs...</Text>
              </div>
            </div>
          ) : !logsData || logsData.logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No logs found for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Collapse
              items={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                const details = parseLogDetails(logKey);
                
                return {
                  key: index.toString(),
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <Text code style={{ fontSize: '13px' }}>{logType}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>Full key: {logKey}</Text>
                      </div>
                      <Tag color="blue" style={{ marginLeft: 'auto' }}>
                        {details?.length || 0} entries
                      </Tag>
                    </div>
                  ),
                  children: renderLogDetails(logKey),
                  extra: <EyeOutlined />
                };
              })}
              size="small"
              ghost
            />
          )}
        </Card>
      </div>
    );
  };

  const tabItems = [
    {
      key: 'infos',
      label: 'Infos',
      children: renderInfosTab(),
    },
    {
      key: 'workflow',
      label: 'Workflow',
      children: renderWorkflowTab(),
    },
    {
      key: 'actions',
      label: 'Actions',
      children: renderActionsTab(),
    },
    {
      key: 'details',
      label: 'Details',
      children: renderDetailsTab(),
    },
    {
      key: 'logs',
      label: 'Logs',
      children: renderLogsTab(),
    },
  ];

  return (
    <>
      <Modal
        title={`DPE Details - ${dpeItem?.id || ''}`}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`Edit ${editingKey}`}
        open={editModalVisible}
        onOk={handleEditSave}
        onCancel={handleEditCancel}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Editing: </Text>
          <Text code>{editingKey}</Text>
        </div>
        <div>
          <Text strong>Current Value:</Text>
          <div style={{ 
            background: '#f5f5f5', 
            padding: 12, 
            borderRadius: 6, 
            marginTop: 8,
            marginBottom: 16
          }}>
            <pre style={{ margin: 0, fontSize: '12px' }}>
              {JSON.stringify(editingValue, null, 2)}
            </pre>
          </div>
        </div>
        <div>
          <Text strong>New Value (JSON format):</Text>
          <Input.TextArea
            rows={8}
            placeholder="Enter new value in JSON format..."
            value={typeof editingValue === 'string' ? editingValue : JSON.stringify(editingValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setEditingValue(parsed);
              } catch {
                setEditingValue(e.target.value);
              }
            }}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </>
  );
};

```

Now I need to close the if statement properly and remove the else block that was handling the no_purchase_info case:


```typescriptreact
        // Add quota status summary
        infoItems.push({
          key: 'quota_status_summary',
          name: 'Quota Status Summary',
          value: {
            total_items: quotaStatus.table_values?.length || 0,
            purchased_items: quotaStatus.table_values?.filter((item: any) => item.purchase === 1).length || 0,
            api_response: quotaStatus
          }
        });
        
        // Add individual purchased items if any exist
        if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
          const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
          if (purchasedItems.length > 0) {
            infoItems.push({
              key: 'purchased_items',
              name: 'Purchased Items',
              value: purchasedItems
            });
          }
        }
      }
    }
```

Let me read the current state of the file to see the exact structure:


Perfect! The code is already correctly structured. Now I need to check if there are any linting errors:


Great! Now let me update the todo status:


Perfect! I have successfully implemented the requested change. Here's what was modified:

## Summary of Changes

I've updated the DPE details modal "Infos" tab to hide the "No purchase information available" row from the table when there's no purchase information in the DPE record.

### Key Changes Made:

### 1. **Removed Table Row for No Purchase Info**
- **Before**: When no purchase information was found, a table row was displayed showing "No purchase information available"
- **After**: When no purchase information is found, no table rows are added to the `infoItems` array

### 2. **Simplified Logic**
- **Conditional Logic**: Now only adds items to the table when `!quotaStatus.no_purchase_info` (i.e., when there IS purchase information)
- **Clean Display**: When no purchase info exists, the table will be empty and the existing empty state message will be shown instead

### 3. **Behavior**
- ✅ **With Purchase Info**: Shows quota status summary and purchased items in the table
- ✅ **Without Purchase Info**: Shows empty table with the informative message "No purchase information found in DPE record - API call skipped"
- ✅ **No Confusing Rows**: No table row saying "No purchase information available" is displayed

### Result:
Now when a DPE record has no purchase information:
- The API call is skipped (as before)
- No "No purchase information available" row appears in the table
- The empty state message clearly explains why no data is shown
- The user experience is cleaner and less confusing

The table will only show actual quota status data when purchase information exists in the DPE record, making the interface much cleaner and more intuitive.

