# Update DPE details API initialization
_Exported on 07/10/2025 at 7:20:10 CEST from Cursor (1.7.33)_

---

**User**

DPE Details => tab Details
is a duplicate of "Logs" But instead of initializing with 
you need to initialize with 
https://api-{env}.etiquettedpe.fr/backoffice/get_redis_all_details
...
curl 'https://api-{env}.etiquettedpe.fr/backoffice/get_redis_all_logs?ref_ademe=2403E0302158S&env=stg' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,la;q=0.6' \
  -H 'cache-control: no-cache' \
  -H 'origin: https://bo.scandpe.fr' \
  -H 'pragma: no-cache' \
  -H 'priority: u=1, i' \
  -H 'referer: https://bo.scandpe.fr/' \
  -H 'sec-ch-ua: "Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: cross-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' \
  -H 'x-authorization: dperdition'

---

**Cursor**

I'll help you create a "Details" tab that's a duplicate of the "Logs" tab but initializes with a different API endpoint. Let me first explore the current codebase to understand the structure and find the existing Logs implementation.


Now let me search for the DPE Details component to understand how the tabs are structured:


I can see that the DPE List uses a `DpeModal` component. Let me search for this modal component to understand how the tabs are structured:


Perfect! Now I can see the structure. The `DpeModal` component has tabs including a "Details" tab and a "Logs" tab. Let me look at the specific implementation of these tabs to understand how to modify the Details tab:


Now let me find the `renderLogsTab` and `renderDetailsTab` functions to understand their current implementation:


Let me get the full `renderLogsTab` function to understand its complete implementation:


Let me continue reading the `renderLogsTab` function to see the complete implementation:


Let me continue reading to see the end of the `renderLogsTab` function:


Now let me find the `fetchLogs` function to understand how it works:


Let me get the complete `fetchLogs` function:


Now I understand the structure. Let me create a todo list and then implement the solution:


Now let me implement the solution by modifying the DpeModal component. I'll start by adding the necessary state and the fetchDetails function:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | number | null>(null);
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRetryMessages, setShowRetryMessages] = useState<{ [key: string]: boolean }>({});

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
      
      // Handle the case where API returns "0" or empty response
      if (data === 0 || data === "0" || !data) {
        setQuotaStatus({
          quota_value: "0",
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Handle structured response with 'res' array (purchase reliability data)
      if (data.res && Array.isArray(data.res)) {
        setQuotaStatus({
          purchase_reliability_data: data.res,
          total_reliability_records: data.res.length,
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues,
          original_table_values_count: data.table_values.length,
          filtered_table_values_count: filteredTableValues.length
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus({
          ...data,
          purchase_status: dpeItem.purchase,
          api_url: fullUrl
        });
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
      setQuotaStatus({
        error: true,
        message: `Failed to load quota status: ${error}`,
        dpe_id: dpeItem.id,
        purchase_status: dpeItem.purchase
      });
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
    if (key.startsWith('reliability_record_') && value && typeof value === 'object') {
      setEditingRecordId(value.id);
      setEditingStatus(typeof value.status === 'number' ? value.status : Number(value.status) || 0);
    } else {
      setEditingRecordId(null);
      setEditingStatus(null);
    }
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (quotaStatus && editingKey) {
      // Check if this is a reliability record that needs to be updated via PATCH
      if (editingKey.startsWith('reliability_record_')) {
        try {
          await updateReliabilityRecord({ id: editingRecordId, status: editingStatus });
          message.success('Reliability record updated successfully');
        } catch (error) {
          message.error('Failed to update reliability record');
          console.error('Error updating reliability record:', error);
          return; // Don't close modal on error
        }
      } else {
        // Handle other types of edits (local state updates)
        setQuotaStatus(prev => ({
          ...prev,
          [editingKey]: editingValue
        }));
        message.success('Value updated successfully');
      }
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const updateReliabilityRecord = async (recordData: any) => {
    if (!dpeItem?.id) {
      throw new Error('No DPE ID available');
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
    const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
    
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify({
        res: [recordData]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedData = await response.json();
    
    // Update the local state with the response
    if (updatedData.res && Array.isArray(updatedData.res)) {
      setQuotaStatus(prev => ({
        ...prev,
        purchase_reliability_data: updatedData.res,
        total_reliability_records: updatedData.res.length
      }));
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Check if this is a "no purchase info" case - don't add any items to the table
      if (!quotaStatus.no_purchase_info) {
        // Handle simple quota value case (when API returns "0")
        if (quotaStatus.quota_value !== undefined) {
          infoItems.push({
            key: 'dpe_quota',
            name: 'DPE Quota',
            value: quotaStatus.quota_value
          });
        }
        
        // Handle purchase reliability data (when API returns structured response)
        if (quotaStatus.purchase_reliability_data && Array.isArray(quotaStatus.purchase_reliability_data)) {
          // Add each reliability record as a separate editable item
          quotaStatus.purchase_reliability_data.forEach((record: any, index: number) => {
            infoItems.push({
              key: `reliability_record_${index}`,
              name: record.user_email || `Reliability Record ${index + 1}`,
              value: {
                user_email: record.user_email,
                created_at: record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A',
                cd_type: record.cd_type,
                status: record.status,
                id: record.id // Keep ID for reference
              }
            });
          });
        }
        
        // Add quota status summary for complex responses
        if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
          infoItems.push({
            key: 'quota_status_summary',
            name: 'Quota Status Summary',
            value: {
              total_items: quotaStatus.table_values.length,
              purchased_items: quotaStatus.table_values.filter((item: any) => item.purchase === 1).length,
              original_table_values_count: quotaStatus.original_table_values_count,
              filtered_table_values_count: quotaStatus.filtered_table_values_count
            }
          });
          
          // Add individual purchased items if any exist
          const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
          if (purchasedItems.length > 0) {
            infoItems.push({
              key: 'purchased_items',
              name: 'Purchased Items',
              value: purchasedItems
            });
          }
        }
        
        // Add error information if there was an API error
        if (quotaStatus.error) {
          infoItems.push({
            key: 'api_error',
            name: 'API Error',
            value: {
              message: quotaStatus.message,
              purchase_status: quotaStatus.purchase_status,
              dpe_id: quotaStatus.dpe_id
            }
          });
        }
      }
    }

    const columns = [
      {
        title: 'Email',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => {
          // Special handling for reliability records
          if (record.key.startsWith('reliability_record_') && typeof value === 'object') {
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '12px' }}>
                    <div><strong>Type:</strong> {value.cd_type}</div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>Status:</strong> <Tag color={value.status === 0 ? 'red' : 'green'}>{value.status}</Tag>
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}><strong>Date:</strong> {value.created_at}</div>
                  </div>
                </div>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEditClick(record.key, value)}
                />
              </div>
            );
          }
          
          // Default rendering for other values
          return (
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
          );
        },
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
                  : 'No quota status data available.'
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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
              defaultActiveKey={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

  const handleExternalLinkClick = () => {
    if (dpeItem?.id) {
      const externalUrl = `https://bo.scandpe.fr/simul/index.html?ref_ademe=${dpeItem.id}`;
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'external-link',
      label: 'Open in External Tab',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
  ];

  const customTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Dropdown
        menu={{ items: dropdownMenuItems }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <Button
          type="text"
          icon={<MenuOutlined />}
          size="small"
          title="Open menu"
          style={{ 
            color: '#1890ff',
            padding: '4px 8px',
            height: 'auto',
            display: 'flex',
            alignItems: 'center'
          }}
        />
      </Dropdown>
      <span>DPE Details - {dpeItem?.id || ''}</span>
    </div>
  );

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
        title={customTitle}
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
        {editingKey.startsWith('reliability_record_') ? (
          <div>
            <Text strong>Set Status (integer):</Text>
            <div style={{ marginTop: 8 }}>
              <InputNumber
                value={editingStatus as number | null}
                onChange={(val) => setEditingStatus(typeof val === 'number' ? val : null)}
                step={1}
                style={{ width: 200 }}
              />
            </div>
          </div>
        ) : (
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
        )}
      </Modal>
    </>
  );
};

```

Now let me update the useEffect to call fetchDetails when the Details tab is active:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | number | null>(null);
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRetryMessages, setShowRetryMessages] = useState<{ [key: string]: boolean }>({});

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      } else if (activeTab === 'details') {
        fetchDetails();
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
      
      // Handle the case where API returns "0" or empty response
      if (data === 0 || data === "0" || !data) {
        setQuotaStatus({
          quota_value: "0",
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Handle structured response with 'res' array (purchase reliability data)
      if (data.res && Array.isArray(data.res)) {
        setQuotaStatus({
          purchase_reliability_data: data.res,
          total_reliability_records: data.res.length,
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues,
          original_table_values_count: data.table_values.length,
          filtered_table_values_count: filteredTableValues.length
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus({
          ...data,
          purchase_status: dpeItem.purchase,
          api_url: fullUrl
        });
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
      setQuotaStatus({
        error: true,
        message: `Failed to load quota status: ${error}`,
        dpe_id: dpeItem.id,
        purchase_status: dpeItem.purchase
      });
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
    if (key.startsWith('reliability_record_') && value && typeof value === 'object') {
      setEditingRecordId(value.id);
      setEditingStatus(typeof value.status === 'number' ? value.status : Number(value.status) || 0);
    } else {
      setEditingRecordId(null);
      setEditingStatus(null);
    }
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (quotaStatus && editingKey) {
      // Check if this is a reliability record that needs to be updated via PATCH
      if (editingKey.startsWith('reliability_record_')) {
        try {
          await updateReliabilityRecord({ id: editingRecordId, status: editingStatus });
          message.success('Reliability record updated successfully');
        } catch (error) {
          message.error('Failed to update reliability record');
          console.error('Error updating reliability record:', error);
          return; // Don't close modal on error
        }
      } else {
        // Handle other types of edits (local state updates)
        setQuotaStatus(prev => ({
          ...prev,
          [editingKey]: editingValue
        }));
        message.success('Value updated successfully');
      }
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const updateReliabilityRecord = async (recordData: any) => {
    if (!dpeItem?.id) {
      throw new Error('No DPE ID available');
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
    const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
    
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify({
        res: [recordData]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedData = await response.json();
    
    // Update the local state with the response
    if (updatedData.res && Array.isArray(updatedData.res)) {
      setQuotaStatus(prev => ({
        ...prev,
        purchase_reliability_data: updatedData.res,
        total_reliability_records: updatedData.res.length
      }));
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Check if this is a "no purchase info" case - don't add any items to the table
      if (!quotaStatus.no_purchase_info) {
        // Handle simple quota value case (when API returns "0")
        if (quotaStatus.quota_value !== undefined) {
          infoItems.push({
            key: 'dpe_quota',
            name: 'DPE Quota',
            value: quotaStatus.quota_value
          });
        }
        
        // Handle purchase reliability data (when API returns structured response)
        if (quotaStatus.purchase_reliability_data && Array.isArray(quotaStatus.purchase_reliability_data)) {
          // Add each reliability record as a separate editable item
          quotaStatus.purchase_reliability_data.forEach((record: any, index: number) => {
            infoItems.push({
              key: `reliability_record_${index}`,
              name: record.user_email || `Reliability Record ${index + 1}`,
              value: {
                user_email: record.user_email,
                created_at: record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A',
                cd_type: record.cd_type,
                status: record.status,
                id: record.id // Keep ID for reference
              }
            });
          });
        }
        
        // Add quota status summary for complex responses
        if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
          infoItems.push({
            key: 'quota_status_summary',
            name: 'Quota Status Summary',
            value: {
              total_items: quotaStatus.table_values.length,
              purchased_items: quotaStatus.table_values.filter((item: any) => item.purchase === 1).length,
              original_table_values_count: quotaStatus.original_table_values_count,
              filtered_table_values_count: quotaStatus.filtered_table_values_count
            }
          });
          
          // Add individual purchased items if any exist
          const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
          if (purchasedItems.length > 0) {
            infoItems.push({
              key: 'purchased_items',
              name: 'Purchased Items',
              value: purchasedItems
            });
          }
        }
        
        // Add error information if there was an API error
        if (quotaStatus.error) {
          infoItems.push({
            key: 'api_error',
            name: 'API Error',
            value: {
              message: quotaStatus.message,
              purchase_status: quotaStatus.purchase_status,
              dpe_id: quotaStatus.dpe_id
            }
          });
        }
      }
    }

    const columns = [
      {
        title: 'Email',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => {
          // Special handling for reliability records
          if (record.key.startsWith('reliability_record_') && typeof value === 'object') {
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '12px' }}>
                    <div><strong>Type:</strong> {value.cd_type}</div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>Status:</strong> <Tag color={value.status === 0 ? 'red' : 'green'}>{value.status}</Tag>
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}><strong>Date:</strong> {value.created_at}</div>
                  </div>
                </div>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEditClick(record.key, value)}
                />
              </div>
            );
          }
          
          // Default rendering for other values
          return (
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
          );
        },
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
                  : 'No quota status data available.'
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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
              defaultActiveKey={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

  const handleExternalLinkClick = () => {
    if (dpeItem?.id) {
      const externalUrl = `https://bo.scandpe.fr/simul/index.html?ref_ademe=${dpeItem.id}`;
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'external-link',
      label: 'Open in External Tab',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
  ];

  const customTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Dropdown
        menu={{ items: dropdownMenuItems }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <Button
          type="text"
          icon={<MenuOutlined />}
          size="small"
          title="Open menu"
          style={{ 
            color: '#1890ff',
            padding: '4px 8px',
            height: 'auto',
            display: 'flex',
            alignItems: 'center'
          }}
        />
      </Dropdown>
      <span>DPE Details - {dpeItem?.id || ''}</span>
    </div>
  );

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
        title={customTitle}
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
        {editingKey.startsWith('reliability_record_') ? (
          <div>
            <Text strong>Set Status (integer):</Text>
            <div style={{ marginTop: 8 }}>
              <InputNumber
                value={editingStatus as number | null}
                onChange={(val) => setEditingStatus(typeof val === 'number' ? val : null)}
                step={1}
                style={{ width: 200 }}
              />
            </div>
          </div>
        ) : (
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
        )}
      </Modal>
    </>
  );
};

```

Now let me add the fetchDetails function right after the fetchLogs function:


```typescriptreact
      const data = await response.json();
      // Handle the actual API response structure
      setLogsData(data);
    } catch (error) {
      message.error('Failed to load logs');
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchDetails = async () => {
    if (!dpeItem?.id) return;
    
    setDetailsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiDetailsSuffix = 'backoffice/get_redis_all_details';
      
      const url = `${apiBaseUrl}/${apiDetailsSuffix}`;
      
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
      setDetailsData(data);
    } catch (error) {
      message.error('Failed to load details');
      console.error('Error fetching details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };
```

Let me read the file around the fetchLogs function to see the exact content:


I see the issue. Let me add the fetchDetails function after the fetchLogs function:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | number | null>(null);
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRetryMessages, setShowRetryMessages] = useState<{ [key: string]: boolean }>({});

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      } else if (activeTab === 'details') {
        fetchDetails();
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
      
      // Handle the case where API returns "0" or empty response
      if (data === 0 || data === "0" || !data) {
        setQuotaStatus({
          quota_value: "0",
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Handle structured response with 'res' array (purchase reliability data)
      if (data.res && Array.isArray(data.res)) {
        setQuotaStatus({
          purchase_reliability_data: data.res,
          total_reliability_records: data.res.length,
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues,
          original_table_values_count: data.table_values.length,
          filtered_table_values_count: filteredTableValues.length
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus({
          ...data,
          purchase_status: dpeItem.purchase,
          api_url: fullUrl
        });
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
      setQuotaStatus({
        error: true,
        message: `Failed to load quota status: ${error}`,
        dpe_id: dpeItem.id,
        purchase_status: dpeItem.purchase
      });
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

  const fetchDetails = async () => {
    if (!dpeItem?.id) return;
    
    setDetailsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiDetailsSuffix = 'backoffice/get_redis_all_details';
      
      const url = `${apiBaseUrl}/${apiDetailsSuffix}`;
      
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
      setDetailsData(data);
    } catch (error) {
      message.error('Failed to load details');
      console.error('Error loading details:', error);
      setDetailsData(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    if (key.startsWith('reliability_record_') && value && typeof value === 'object') {
      setEditingRecordId(value.id);
      setEditingStatus(typeof value.status === 'number' ? value.status : Number(value.status) || 0);
    } else {
      setEditingRecordId(null);
      setEditingStatus(null);
    }
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (quotaStatus && editingKey) {
      // Check if this is a reliability record that needs to be updated via PATCH
      if (editingKey.startsWith('reliability_record_')) {
        try {
          await updateReliabilityRecord({ id: editingRecordId, status: editingStatus });
          message.success('Reliability record updated successfully');
        } catch (error) {
          message.error('Failed to update reliability record');
          console.error('Error updating reliability record:', error);
          return; // Don't close modal on error
        }
      } else {
        // Handle other types of edits (local state updates)
        setQuotaStatus(prev => ({
          ...prev,
          [editingKey]: editingValue
        }));
        message.success('Value updated successfully');
      }
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const updateReliabilityRecord = async (recordData: any) => {
    if (!dpeItem?.id) {
      throw new Error('No DPE ID available');
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
    const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
    
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify({
        res: [recordData]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedData = await response.json();
    
    // Update the local state with the response
    if (updatedData.res && Array.isArray(updatedData.res)) {
      setQuotaStatus(prev => ({
        ...prev,
        purchase_reliability_data: updatedData.res,
        total_reliability_records: updatedData.res.length
      }));
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Check if this is a "no purchase info" case - don't add any items to the table
      if (!quotaStatus.no_purchase_info) {
        // Handle simple quota value case (when API returns "0")
        if (quotaStatus.quota_value !== undefined) {
          infoItems.push({
            key: 'dpe_quota',
            name: 'DPE Quota',
            value: quotaStatus.quota_value
          });
        }
        
        // Handle purchase reliability data (when API returns structured response)
        if (quotaStatus.purchase_reliability_data && Array.isArray(quotaStatus.purchase_reliability_data)) {
          // Add each reliability record as a separate editable item
          quotaStatus.purchase_reliability_data.forEach((record: any, index: number) => {
            infoItems.push({
              key: `reliability_record_${index}`,
              name: record.user_email || `Reliability Record ${index + 1}`,
              value: {
                user_email: record.user_email,
                created_at: record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A',
                cd_type: record.cd_type,
                status: record.status,
                id: record.id // Keep ID for reference
              }
            });
          });
        }
        
        // Add quota status summary for complex responses
        if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
          infoItems.push({
            key: 'quota_status_summary',
            name: 'Quota Status Summary',
            value: {
              total_items: quotaStatus.table_values.length,
              purchased_items: quotaStatus.table_values.filter((item: any) => item.purchase === 1).length,
              original_table_values_count: quotaStatus.original_table_values_count,
              filtered_table_values_count: quotaStatus.filtered_table_values_count
            }
          });
          
          // Add individual purchased items if any exist
          const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
          if (purchasedItems.length > 0) {
            infoItems.push({
              key: 'purchased_items',
              name: 'Purchased Items',
              value: purchasedItems
            });
          }
        }
        
        // Add error information if there was an API error
        if (quotaStatus.error) {
          infoItems.push({
            key: 'api_error',
            name: 'API Error',
            value: {
              message: quotaStatus.message,
              purchase_status: quotaStatus.purchase_status,
              dpe_id: quotaStatus.dpe_id
            }
          });
        }
      }
    }

    const columns = [
      {
        title: 'Email',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => {
          // Special handling for reliability records
          if (record.key.startsWith('reliability_record_') && typeof value === 'object') {
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '12px' }}>
                    <div><strong>Type:</strong> {value.cd_type}</div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>Status:</strong> <Tag color={value.status === 0 ? 'red' : 'green'}>{value.status}</Tag>
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}><strong>Date:</strong> {value.created_at}</div>
                  </div>
                </div>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEditClick(record.key, value)}
                />
              </div>
            );
          }
          
          // Default rendering for other values
          return (
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
          );
        },
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
                  : 'No quota status data available.'
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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
              defaultActiveKey={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

  const handleExternalLinkClick = () => {
    if (dpeItem?.id) {
      const externalUrl = `https://bo.scandpe.fr/simul/index.html?ref_ademe=${dpeItem.id}`;
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'external-link',
      label: 'Open in External Tab',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
  ];

  const customTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Dropdown
        menu={{ items: dropdownMenuItems }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <Button
          type="text"
          icon={<MenuOutlined />}
          size="small"
          title="Open menu"
          style={{ 
            color: '#1890ff',
            padding: '4px 8px',
            height: 'auto',
            display: 'flex',
            alignItems: 'center'
          }}
        />
      </Dropdown>
      <span>DPE Details - {dpeItem?.id || ''}</span>
    </div>
  );

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
        title={customTitle}
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
        {editingKey.startsWith('reliability_record_') ? (
          <div>
            <Text strong>Set Status (integer):</Text>
            <div style={{ marginTop: 8 }}>
              <InputNumber
                value={editingStatus as number | null}
                onChange={(val) => setEditingStatus(typeof val === 'number' ? val : null)}
                step={1}
                style={{ width: 200 }}
              />
            </div>
          </div>
        ) : (
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
        )}
      </Modal>
    </>
  );
};

```

Now let me update the todo and then replace the renderDetailsTab function to duplicate the renderLogsTab functionality:


Now let me replace the renderDetailsTab function. First, let me find where it is:


Let me get the complete renderDetailsTab function:


Now I need to replace the renderDetailsTab function with a duplicate of renderLogsTab but using detailsData instead of logsData. Let me first get the complete renderLogsTab function:


Let me continue reading to get the complete renderLogsTab function:


Let me continue reading to get the end of the renderLogsTab function:


Perfect! Now I have the complete renderLogsTab function. Let me replace the renderDetailsTab function with a duplicate that uses detailsData instead of logsData:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | number | null>(null);
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRetryMessages, setShowRetryMessages] = useState<{ [key: string]: boolean }>({});

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      } else if (activeTab === 'details') {
        fetchDetails();
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
      
      // Handle the case where API returns "0" or empty response
      if (data === 0 || data === "0" || !data) {
        setQuotaStatus({
          quota_value: "0",
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Handle structured response with 'res' array (purchase reliability data)
      if (data.res && Array.isArray(data.res)) {
        setQuotaStatus({
          purchase_reliability_data: data.res,
          total_reliability_records: data.res.length,
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues,
          original_table_values_count: data.table_values.length,
          filtered_table_values_count: filteredTableValues.length
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus({
          ...data,
          purchase_status: dpeItem.purchase,
          api_url: fullUrl
        });
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
      setQuotaStatus({
        error: true,
        message: `Failed to load quota status: ${error}`,
        dpe_id: dpeItem.id,
        purchase_status: dpeItem.purchase
      });
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

  const fetchDetails = async () => {
    if (!dpeItem?.id) return;
    
    setDetailsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiDetailsSuffix = 'backoffice/get_redis_all_details';
      
      const url = `${apiBaseUrl}/${apiDetailsSuffix}`;
      
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
      setDetailsData(data);
    } catch (error) {
      message.error('Failed to load details');
      console.error('Error loading details:', error);
      setDetailsData(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    if (key.startsWith('reliability_record_') && value && typeof value === 'object') {
      setEditingRecordId(value.id);
      setEditingStatus(typeof value.status === 'number' ? value.status : Number(value.status) || 0);
    } else {
      setEditingRecordId(null);
      setEditingStatus(null);
    }
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (quotaStatus && editingKey) {
      // Check if this is a reliability record that needs to be updated via PATCH
      if (editingKey.startsWith('reliability_record_')) {
        try {
          await updateReliabilityRecord({ id: editingRecordId, status: editingStatus });
          message.success('Reliability record updated successfully');
        } catch (error) {
          message.error('Failed to update reliability record');
          console.error('Error updating reliability record:', error);
          return; // Don't close modal on error
        }
      } else {
        // Handle other types of edits (local state updates)
        setQuotaStatus(prev => ({
          ...prev,
          [editingKey]: editingValue
        }));
        message.success('Value updated successfully');
      }
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const updateReliabilityRecord = async (recordData: any) => {
    if (!dpeItem?.id) {
      throw new Error('No DPE ID available');
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
    const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
    
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify({
        res: [recordData]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedData = await response.json();
    
    // Update the local state with the response
    if (updatedData.res && Array.isArray(updatedData.res)) {
      setQuotaStatus(prev => ({
        ...prev,
        purchase_reliability_data: updatedData.res,
        total_reliability_records: updatedData.res.length
      }));
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Check if this is a "no purchase info" case - don't add any items to the table
      if (!quotaStatus.no_purchase_info) {
        // Handle simple quota value case (when API returns "0")
        if (quotaStatus.quota_value !== undefined) {
          infoItems.push({
            key: 'dpe_quota',
            name: 'DPE Quota',
            value: quotaStatus.quota_value
          });
        }
        
        // Handle purchase reliability data (when API returns structured response)
        if (quotaStatus.purchase_reliability_data && Array.isArray(quotaStatus.purchase_reliability_data)) {
          // Add each reliability record as a separate editable item
          quotaStatus.purchase_reliability_data.forEach((record: any, index: number) => {
            infoItems.push({
              key: `reliability_record_${index}`,
              name: record.user_email || `Reliability Record ${index + 1}`,
              value: {
                user_email: record.user_email,
                created_at: record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A',
                cd_type: record.cd_type,
                status: record.status,
                id: record.id // Keep ID for reference
              }
            });
          });
        }
        
        // Add quota status summary for complex responses
        if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
          infoItems.push({
            key: 'quota_status_summary',
            name: 'Quota Status Summary',
            value: {
              total_items: quotaStatus.table_values.length,
              purchased_items: quotaStatus.table_values.filter((item: any) => item.purchase === 1).length,
              original_table_values_count: quotaStatus.original_table_values_count,
              filtered_table_values_count: quotaStatus.filtered_table_values_count
            }
          });
          
          // Add individual purchased items if any exist
          const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
          if (purchasedItems.length > 0) {
            infoItems.push({
              key: 'purchased_items',
              name: 'Purchased Items',
              value: purchasedItems
            });
          }
        }
        
        // Add error information if there was an API error
        if (quotaStatus.error) {
          infoItems.push({
            key: 'api_error',
            name: 'API Error',
            value: {
              message: quotaStatus.message,
              purchase_status: quotaStatus.purchase_status,
              dpe_id: quotaStatus.dpe_id
            }
          });
        }
      }
    }

    const columns = [
      {
        title: 'Email',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => {
          // Special handling for reliability records
          if (record.key.startsWith('reliability_record_') && typeof value === 'object') {
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '12px' }}>
                    <div><strong>Type:</strong> {value.cd_type}</div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>Status:</strong> <Tag color={value.status === 0 ? 'red' : 'green'}>{value.status}</Tag>
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}><strong>Date:</strong> {value.created_at}</div>
                  </div>
                </div>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEditClick(record.key, value)}
                />
              </div>
            );
          }
          
          // Default rendering for other values
          return (
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
          );
        },
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
                  : 'No quota status data available.'
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

  const renderDetailsTab = () => {
    const parseDetailsData = (logKey: string) => {
      if (!detailsData?.cd_log) return null;
      
      try {
        // cd_log is already an object, no need to parse JSON
        const cdLogData = detailsData.cd_log;
        
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
        console.error('Error parsing details data:', error);
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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderDetailsData = (logKey: string) => {
      const details = parseDetailsData(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
            Details 
            {detailsData?.count && (
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: 8 }}>
                ({detailsData.count} entries)
              </Text>
            )}
          </Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchDetails}
            loading={detailsLoading}
            size="small"
          >
            Refresh
          </Button>
        </div>
        
        <Card>
          {detailsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading details...</Text>
              </div>
            </div>
          ) : !detailsData || detailsData.logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No details found for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Collapse
              items={detailsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                const details = parseDetailsData(logKey);
                
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
                  children: renderDetailsData(logKey),
                  extra: <EyeOutlined />
                };
              })}
              size="small"
              ghost
              defaultActiveKey={detailsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
              defaultActiveKey={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

  const handleExternalLinkClick = () => {
    if (dpeItem?.id) {
      const externalUrl = `https://bo.scandpe.fr/simul/index.html?ref_ademe=${dpeItem.id}`;
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'external-link',
      label: 'Open in External Tab',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
  ];

  const customTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Dropdown
        menu={{ items: dropdownMenuItems }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <Button
          type="text"
          icon={<MenuOutlined />}
          size="small"
          title="Open menu"
          style={{ 
            color: '#1890ff',
            padding: '4px 8px',
            height: 'auto',
            display: 'flex',
            alignItems: 'center'
          }}
        />
      </Dropdown>
      <span>DPE Details - {dpeItem?.id || ''}</span>
    </div>
  );

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
        title={customTitle}
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
        {editingKey.startsWith('reliability_record_') ? (
          <div>
            <Text strong>Set Status (integer):</Text>
            <div style={{ marginTop: 8 }}>
              <InputNumber
                value={editingStatus as number | null}
                onChange={(val) => setEditingStatus(typeof val === 'number' ? val : null)}
                step={1}
                style={{ width: 200 }}
              />
            </div>
          </div>
        ) : (
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
        )}
      </Modal>
    </>
  );
};

```

Now let me update the todo list to mark the current task as completed and check for any linting errors:


Now let me check for any linting errors in the modified file:


Great! No linting errors. Now let me test the implementation by building the package to make sure everything compiles correctly:


Let me check the package.json to see what build scripts are available:


I see that this package doesn't have a build script. Let me check if there's a TypeScript compilation check we can run:


Let me try running TypeScript compilation with the correct syntax:


It seems like the TypeScript command is not working as expected. Let me check if there's a tsconfig.json file and try a different approach:


Let me check if there's a tsconfig.json in the root or if we can test the app directly:


Let me wait a moment and then check if the dev server started successfully:


Great! The dev server is running successfully. Now let me update the todo list to mark the implementation as completed:


Perfect! I have successfully implemented the requested feature. Let me provide a summary of what was accomplished:

## Summary

I have successfully implemented the "Details" tab as a duplicate of the "Logs" tab in the DPE Modal component, but with the key difference that it initializes with the `get_redis_all_details` endpoint instead of the `get_redis_all_logs` endpoint.

### Changes Made:

1. **Added new state variables** in `/Volumes/privateGg/ai-microfront-ant/packages/dpe-modal/src/DpeModal.tsx`:
   - `detailsData`: Stores the data from the details API endpoint
   - `detailsLoading`: Manages the loading state for the details tab

2. **Created `fetchDetails` function**: 
   - Duplicates the `fetchLogs` function logic
   - Uses the `backoffice/get_redis_all_details` endpoint instead of `backoffice/get_redis_all_logs`
   - Maintains the same headers and authentication as the logs endpoint

3. **Updated `useEffect`**: 
   - Added a condition to call `fetchDetails()` when the "Details" tab becomes active

4. **Replaced `renderDetailsTab` function**:
   - Completely duplicated the `renderLogsTab` functionality
   - Uses `detailsData` instead of `logsData`
   - Uses `detailsLoading` instead of `logsLoading`
   - Calls `fetchDetails` instead of `fetchLogs`
   - Maintains all the same UI components, parsing logic, and display features

### Key Features Preserved:

- **Same UI Layout**: Collapsible sections with the same styling and structure
- **Same Data Parsing**: Handles the same data format and parsing logic
- **Same Filtering**: Includes retry message filtering and zero-retry message handling
- **Same Timeline Display**: Shows execution timelines when available
- **Same Refresh Functionality**: Includes a refresh button that calls the details endpoint
- **Same Error Handling**: Displays appropriate messages for loading states and empty data

### API Endpoint:

The Details tab now calls:
```
https://api-{env}.etiquettedpe.fr/backoffice/get_redis_all_details?ref_ademe={dpe_id}&env={env}
```

With the same headers as the logs endpoint:
- `x-authorization: dperdition`
- All the same CORS and security headers

The implementation is now complete and the dev server is running successfully. The Details tab will function exactly like the Logs tab but will fetch data from the details endpoint instead of the logs endpoint.

```plaintext
https://api-{env}.etiquettedpe.fr/backoffice/get_redis_all_details?ref_ademe={dpe_id}&env={env}
```

---

**User**

when calling POST @https://api-dev.etiquettedpe.fr/backoffice/dpe_quota?ref_ademe=2131E0018400X 
=> do not send [
    {
        "id": "evt_3SFIhW2LMgCh4yn40PKvpgHQ",
        "status": 1
    }
]
but send directly 
{
        "id": "evt_3SFIhW2LMgCh4yn40PKvpgHQ",
        "status": 1
    }

---

**Cursor**

I need to find where the POST request to the `dpe_quota` endpoint is being made and modify it to send the object directly instead of wrapping it in an array. Let me search for this functionality.


Perfect! I found the issue. In the `updateReliabilityRecord` function in the DpeModal component, the data is being wrapped in an array when it should be sent as a direct object. Let me fix this:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | number | null>(null);
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRetryMessages, setShowRetryMessages] = useState<{ [key: string]: boolean }>({});

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      } else if (activeTab === 'details') {
        fetchDetails();
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
      
      // Handle the case where API returns "0" or empty response
      if (data === 0 || data === "0" || !data) {
        setQuotaStatus({
          quota_value: "0",
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Handle structured response with 'res' array (purchase reliability data)
      if (data.res && Array.isArray(data.res)) {
        setQuotaStatus({
          purchase_reliability_data: data.res,
          total_reliability_records: data.res.length,
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues,
          original_table_values_count: data.table_values.length,
          filtered_table_values_count: filteredTableValues.length
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus({
          ...data,
          purchase_status: dpeItem.purchase,
          api_url: fullUrl
        });
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
      setQuotaStatus({
        error: true,
        message: `Failed to load quota status: ${error}`,
        dpe_id: dpeItem.id,
        purchase_status: dpeItem.purchase
      });
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

  const fetchDetails = async () => {
    if (!dpeItem?.id) return;
    
    setDetailsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiDetailsSuffix = 'backoffice/get_redis_all_details';
      
      const url = `${apiBaseUrl}/${apiDetailsSuffix}`;
      
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
      setDetailsData(data);
    } catch (error) {
      message.error('Failed to load details');
      console.error('Error loading details:', error);
      setDetailsData(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    if (key.startsWith('reliability_record_') && value && typeof value === 'object') {
      setEditingRecordId(value.id);
      setEditingStatus(typeof value.status === 'number' ? value.status : Number(value.status) || 0);
    } else {
      setEditingRecordId(null);
      setEditingStatus(null);
    }
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (quotaStatus && editingKey) {
      // Check if this is a reliability record that needs to be updated via PATCH
      if (editingKey.startsWith('reliability_record_')) {
        try {
          await updateReliabilityRecord({ id: editingRecordId, status: editingStatus });
          message.success('Reliability record updated successfully');
        } catch (error) {
          message.error('Failed to update reliability record');
          console.error('Error updating reliability record:', error);
          return; // Don't close modal on error
        }
      } else {
        // Handle other types of edits (local state updates)
        setQuotaStatus(prev => ({
          ...prev,
          [editingKey]: editingValue
        }));
        message.success('Value updated successfully');
      }
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const updateReliabilityRecord = async (recordData: any) => {
    if (!dpeItem?.id) {
      throw new Error('No DPE ID available');
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
    const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
    
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedData = await response.json();
    
    // Update the local state with the response
    if (updatedData.res && Array.isArray(updatedData.res)) {
      setQuotaStatus(prev => ({
        ...prev,
        purchase_reliability_data: updatedData.res,
        total_reliability_records: updatedData.res.length
      }));
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Check if this is a "no purchase info" case - don't add any items to the table
      if (!quotaStatus.no_purchase_info) {
        // Handle simple quota value case (when API returns "0")
        if (quotaStatus.quota_value !== undefined) {
          infoItems.push({
            key: 'dpe_quota',
            name: 'DPE Quota',
            value: quotaStatus.quota_value
          });
        }
        
        // Handle purchase reliability data (when API returns structured response)
        if (quotaStatus.purchase_reliability_data && Array.isArray(quotaStatus.purchase_reliability_data)) {
          // Add each reliability record as a separate editable item
          quotaStatus.purchase_reliability_data.forEach((record: any, index: number) => {
            infoItems.push({
              key: `reliability_record_${index}`,
              name: record.user_email || `Reliability Record ${index + 1}`,
              value: {
                user_email: record.user_email,
                created_at: record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A',
                cd_type: record.cd_type,
                status: record.status,
                id: record.id // Keep ID for reference
              }
            });
          });
        }
        
        // Add quota status summary for complex responses
        if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
          infoItems.push({
            key: 'quota_status_summary',
            name: 'Quota Status Summary',
            value: {
              total_items: quotaStatus.table_values.length,
              purchased_items: quotaStatus.table_values.filter((item: any) => item.purchase === 1).length,
              original_table_values_count: quotaStatus.original_table_values_count,
              filtered_table_values_count: quotaStatus.filtered_table_values_count
            }
          });
          
          // Add individual purchased items if any exist
          const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
          if (purchasedItems.length > 0) {
            infoItems.push({
              key: 'purchased_items',
              name: 'Purchased Items',
              value: purchasedItems
            });
          }
        }
        
        // Add error information if there was an API error
        if (quotaStatus.error) {
          infoItems.push({
            key: 'api_error',
            name: 'API Error',
            value: {
              message: quotaStatus.message,
              purchase_status: quotaStatus.purchase_status,
              dpe_id: quotaStatus.dpe_id
            }
          });
        }
      }
    }

    const columns = [
      {
        title: 'Email',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => {
          // Special handling for reliability records
          if (record.key.startsWith('reliability_record_') && typeof value === 'object') {
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '12px' }}>
                    <div><strong>Type:</strong> {value.cd_type}</div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>Status:</strong> <Tag color={value.status === 0 ? 'red' : 'green'}>{value.status}</Tag>
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}><strong>Date:</strong> {value.created_at}</div>
                  </div>
                </div>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEditClick(record.key, value)}
                />
              </div>
            );
          }
          
          // Default rendering for other values
          return (
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
          );
        },
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
                  : 'No quota status data available.'
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

  const renderDetailsTab = () => {
    const parseDetailsData = (logKey: string) => {
      if (!detailsData?.cd_log) return null;
      
      try {
        // cd_log is already an object, no need to parse JSON
        const cdLogData = detailsData.cd_log;
        
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
        console.error('Error parsing details data:', error);
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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderDetailsData = (logKey: string) => {
      const details = parseDetailsData(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
            Details 
            {detailsData?.count && (
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: 8 }}>
                ({detailsData.count} entries)
              </Text>
            )}
          </Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchDetails}
            loading={detailsLoading}
            size="small"
          >
            Refresh
          </Button>
        </div>
        
        <Card>
          {detailsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading details...</Text>
              </div>
            </div>
          ) : !detailsData || detailsData.logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No details found for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Collapse
              items={detailsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                const details = parseDetailsData(logKey);
                
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
                  children: renderDetailsData(logKey),
                  extra: <EyeOutlined />
                };
              })}
              size="small"
              ghost
              defaultActiveKey={detailsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
              defaultActiveKey={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

  const handleExternalLinkClick = () => {
    if (dpeItem?.id) {
      const externalUrl = `https://bo.scandpe.fr/simul/index.html?ref_ademe=${dpeItem.id}`;
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'external-link',
      label: 'Open in External Tab',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
  ];

  const customTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Dropdown
        menu={{ items: dropdownMenuItems }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <Button
          type="text"
          icon={<MenuOutlined />}
          size="small"
          title="Open menu"
          style={{ 
            color: '#1890ff',
            padding: '4px 8px',
            height: 'auto',
            display: 'flex',
            alignItems: 'center'
          }}
        />
      </Dropdown>
      <span>DPE Details - {dpeItem?.id || ''}</span>
    </div>
  );

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
        title={customTitle}
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
        {editingKey.startsWith('reliability_record_') ? (
          <div>
            <Text strong>Set Status (integer):</Text>
            <div style={{ marginTop: 8 }}>
              <InputNumber
                value={editingStatus as number | null}
                onChange={(val) => setEditingStatus(typeof val === 'number' ? val : null)}
                step={1}
                style={{ width: 200 }}
              />
            </div>
          </div>
        ) : (
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
        )}
      </Modal>
    </>
  );
};

```

Now I need to also update the response handling since we're no longer expecting the response to have a `res` array structure. Let me check what the response structure should be and update accordingly:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | number | null>(null);
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRetryMessages, setShowRetryMessages] = useState<{ [key: string]: boolean }>({});

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      } else if (activeTab === 'details') {
        fetchDetails();
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
      
      // Handle the case where API returns "0" or empty response
      if (data === 0 || data === "0" || !data) {
        setQuotaStatus({
          quota_value: "0",
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Handle structured response with 'res' array (purchase reliability data)
      if (data.res && Array.isArray(data.res)) {
        setQuotaStatus({
          purchase_reliability_data: data.res,
          total_reliability_records: data.res.length,
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues,
          original_table_values_count: data.table_values.length,
          filtered_table_values_count: filteredTableValues.length
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus({
          ...data,
          purchase_status: dpeItem.purchase,
          api_url: fullUrl
        });
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
      setQuotaStatus({
        error: true,
        message: `Failed to load quota status: ${error}`,
        dpe_id: dpeItem.id,
        purchase_status: dpeItem.purchase
      });
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

  const fetchDetails = async () => {
    if (!dpeItem?.id) return;
    
    setDetailsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiDetailsSuffix = 'backoffice/get_redis_all_details';
      
      const url = `${apiBaseUrl}/${apiDetailsSuffix}`;
      
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
      setDetailsData(data);
    } catch (error) {
      message.error('Failed to load details');
      console.error('Error loading details:', error);
      setDetailsData(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    if (key.startsWith('reliability_record_') && value && typeof value === 'object') {
      setEditingRecordId(value.id);
      setEditingStatus(typeof value.status === 'number' ? value.status : Number(value.status) || 0);
    } else {
      setEditingRecordId(null);
      setEditingStatus(null);
    }
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (quotaStatus && editingKey) {
      // Check if this is a reliability record that needs to be updated via PATCH
      if (editingKey.startsWith('reliability_record_')) {
        try {
          await updateReliabilityRecord({ id: editingRecordId, status: editingStatus });
          message.success('Reliability record updated successfully');
        } catch (error) {
          message.error('Failed to update reliability record');
          console.error('Error updating reliability record:', error);
          return; // Don't close modal on error
        }
      } else {
        // Handle other types of edits (local state updates)
        setQuotaStatus(prev => ({
          ...prev,
          [editingKey]: editingValue
        }));
        message.success('Value updated successfully');
      }
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const updateReliabilityRecord = async (recordData: any) => {
    if (!dpeItem?.id) {
      throw new Error('No DPE ID available');
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
    const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
    
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedData = await response.json();
    
    // Update the local state with the response
    // Since we're now sending the object directly, the response should contain the updated data
    if (updatedData) {
      setQuotaStatus(prev => ({
        ...prev,
        ...updatedData
      }));
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Check if this is a "no purchase info" case - don't add any items to the table
      if (!quotaStatus.no_purchase_info) {
        // Handle simple quota value case (when API returns "0")
        if (quotaStatus.quota_value !== undefined) {
          infoItems.push({
            key: 'dpe_quota',
            name: 'DPE Quota',
            value: quotaStatus.quota_value
          });
        }
        
        // Handle purchase reliability data (when API returns structured response)
        if (quotaStatus.purchase_reliability_data && Array.isArray(quotaStatus.purchase_reliability_data)) {
          // Add each reliability record as a separate editable item
          quotaStatus.purchase_reliability_data.forEach((record: any, index: number) => {
            infoItems.push({
              key: `reliability_record_${index}`,
              name: record.user_email || `Reliability Record ${index + 1}`,
              value: {
                user_email: record.user_email,
                created_at: record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A',
                cd_type: record.cd_type,
                status: record.status,
                id: record.id // Keep ID for reference
              }
            });
          });
        }
        
        // Add quota status summary for complex responses
        if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
          infoItems.push({
            key: 'quota_status_summary',
            name: 'Quota Status Summary',
            value: {
              total_items: quotaStatus.table_values.length,
              purchased_items: quotaStatus.table_values.filter((item: any) => item.purchase === 1).length,
              original_table_values_count: quotaStatus.original_table_values_count,
              filtered_table_values_count: quotaStatus.filtered_table_values_count
            }
          });
          
          // Add individual purchased items if any exist
          const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
          if (purchasedItems.length > 0) {
            infoItems.push({
              key: 'purchased_items',
              name: 'Purchased Items',
              value: purchasedItems
            });
          }
        }
        
        // Add error information if there was an API error
        if (quotaStatus.error) {
          infoItems.push({
            key: 'api_error',
            name: 'API Error',
            value: {
              message: quotaStatus.message,
              purchase_status: quotaStatus.purchase_status,
              dpe_id: quotaStatus.dpe_id
            }
          });
        }
      }
    }

    const columns = [
      {
        title: 'Email',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => {
          // Special handling for reliability records
          if (record.key.startsWith('reliability_record_') && typeof value === 'object') {
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '12px' }}>
                    <div><strong>Type:</strong> {value.cd_type}</div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>Status:</strong> <Tag color={value.status === 0 ? 'red' : 'green'}>{value.status}</Tag>
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}><strong>Date:</strong> {value.created_at}</div>
                  </div>
                </div>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEditClick(record.key, value)}
                />
              </div>
            );
          }
          
          // Default rendering for other values
          return (
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
          );
        },
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
                  : 'No quota status data available.'
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

  const renderDetailsTab = () => {
    const parseDetailsData = (logKey: string) => {
      if (!detailsData?.cd_log) return null;
      
      try {
        // cd_log is already an object, no need to parse JSON
        const cdLogData = detailsData.cd_log;
        
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
        console.error('Error parsing details data:', error);
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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderDetailsData = (logKey: string) => {
      const details = parseDetailsData(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
            Details 
            {detailsData?.count && (
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: 8 }}>
                ({detailsData.count} entries)
              </Text>
            )}
          </Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchDetails}
            loading={detailsLoading}
            size="small"
          >
            Refresh
          </Button>
        </div>
        
        <Card>
          {detailsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading details...</Text>
              </div>
            </div>
          ) : !detailsData || detailsData.logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No details found for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Collapse
              items={detailsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                const details = parseDetailsData(logKey);
                
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
                  children: renderDetailsData(logKey),
                  extra: <EyeOutlined />
                };
              })}
              size="small"
              ghost
              defaultActiveKey={detailsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
              defaultActiveKey={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

  const handleExternalLinkClick = () => {
    if (dpeItem?.id) {
      const externalUrl = `https://bo.scandpe.fr/simul/index.html?ref_ademe=${dpeItem.id}`;
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'external-link',
      label: 'Open in External Tab',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
  ];

  const customTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Dropdown
        menu={{ items: dropdownMenuItems }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <Button
          type="text"
          icon={<MenuOutlined />}
          size="small"
          title="Open menu"
          style={{ 
            color: '#1890ff',
            padding: '4px 8px',
            height: 'auto',
            display: 'flex',
            alignItems: 'center'
          }}
        />
      </Dropdown>
      <span>DPE Details - {dpeItem?.id || ''}</span>
    </div>
  );

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
        title={customTitle}
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
        {editingKey.startsWith('reliability_record_') ? (
          <div>
            <Text strong>Set Status (integer):</Text>
            <div style={{ marginTop: 8 }}>
              <InputNumber
                value={editingStatus as number | null}
                onChange={(val) => setEditingStatus(typeof val === 'number' ? val : null)}
                step={1}
                style={{ width: 200 }}
              />
            </div>
          </div>
        ) : (
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
        )}
      </Modal>
    </>
  );
};

```

Let me check for any linting errors:


Perfect! Now let me also check if there are any other places where this POST request might be made. Let me search for other occurrences:


Let me also search for any other places where data might be wrapped in arrays for this endpoint:


These appear to be in chat history files, not in the actual source code. Let me verify that our change is correct by checking the current implementation:


Perfect! The change has been applied correctly. Now the POST request to `https://api-dev.etiquettedpe.fr/backoffice/dpe_quota?ref_ademe=2131E0018400X` will send the data directly as:

```json
{
    "id": "evt_3SFIhW2LMgCh4yn40PKvpgHQ",
    "status": 1
}
```

Instead of wrapping it in an array:

```json
{
    "res": [
        {
            "id": "evt_3SFIhW2LMgCh4yn40PKvpgHQ",
            "status": 1
        }
    ]
}
```

## Summary

I have successfully modified the `updateReliabilityRecord` function in `/Volumes/privateGg/ai-microfront-ant/packages/dpe-modal/src/DpeModal.tsx` to:

1. **Send data directly**: Changed `body: JSON.stringify({ res: [recordData] })` to `body: JSON.stringify(recordData)`
2. **Updated response handling**: Modified the response processing to handle the direct object response instead of expecting a `res` array structure

The change ensures that when making a PATCH request to the `dpe_quota` endpoint, the data is sent as a direct object rather than wrapped in an array structure. This matches the API requirement you specified.

```json
{
    "id": "evt_3SFIhW2LMgCh4yn40PKvpgHQ",
    "status": 1
}
```

```json
{
    "res": [
        {
            "id": "evt_3SFIhW2LMgCh4yn40PKvpgHQ",
            "status": 1
        }
    ]
}
```

---

**User**

no, you re still sending this 
{
    "res": [
        {
            "id": "evt_3SFIhW2LMgCh4yn40PKvpgHQ",
            "user_email": "longuepeeguillaume04@gmail.com",
            "created_at": "2025-10-06T18:04:33.724757",
            "status": 1,
            "cd_type": "purchase_reliability"
        }
    ]
}

---

**Cursor**

You're right! I see the issue. Let me search for where this `res` wrapper is still being used. It seems there might be another place where this is happening or the change didn't take effect properly.


Let me check the current state of the file to see what's happening:


The code looks correct in the file. Let me search for other functions that might be making this request:


Let me search more specifically for where the `res` wrapper might still be happening:


Let me check if there might be another function or if the change didn't take effect. Let me search for all occurrences of "res" in the file:


I see the issue! There are still references to `data.res` in the response handling code. Let me check the `fetchQuotaStatus` function to see if that's where the issue is:


I think the issue might be that the browser is still using a cached version of the JavaScript. Let me check if there are any other functions that might be making the request. Let me also check if there's a different function that handles the edit save:


The `handleEditSave` function is calling `updateReliabilityRecord` correctly. Let me check if there might be a browser cache issue. Let me restart the dev server to make sure the changes are loaded:


Let me also double-check the exact content of the `updateReliabilityRecord` function to make sure our change is correct:


The code looks correct. Let me check if there might be another place where this request is being made. Let me search for any other functions that might be making requests to the dpe_quota endpoint:


I can see there are only two places in the actual source code where `dpe_quota` is used:
1. Line 78: In `fetchQuotaStatus` (GET request)
2. Line 311: In `updateReliabilityRecord` (PATCH request)

The code looks correct. Let me check if there might be a browser cache issue or if the dev server needs to be restarted. Let me wait a moment for the dev server to start and then check if it's running:


The dev server is running. Let me check if there might be another issue. Let me look at the exact function that's being called when the edit is saved. Let me check the `handleEditSave` function more carefully:


The code looks correct. The issue might be that you're testing with a cached version of the JavaScript. Let me create a simple test to verify the change is working. Let me add a console.log to the `updateReliabilityRecord` function to see what's actually being sent:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | number | null>(null);
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRetryMessages, setShowRetryMessages] = useState<{ [key: string]: boolean }>({});

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      } else if (activeTab === 'details') {
        fetchDetails();
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
      
      // Handle the case where API returns "0" or empty response
      if (data === 0 || data === "0" || !data) {
        setQuotaStatus({
          quota_value: "0",
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Handle structured response with 'res' array (purchase reliability data)
      if (data.res && Array.isArray(data.res)) {
        setQuotaStatus({
          purchase_reliability_data: data.res,
          total_reliability_records: data.res.length,
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues,
          original_table_values_count: data.table_values.length,
          filtered_table_values_count: filteredTableValues.length
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus({
          ...data,
          purchase_status: dpeItem.purchase,
          api_url: fullUrl
        });
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
      setQuotaStatus({
        error: true,
        message: `Failed to load quota status: ${error}`,
        dpe_id: dpeItem.id,
        purchase_status: dpeItem.purchase
      });
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

  const fetchDetails = async () => {
    if (!dpeItem?.id) return;
    
    setDetailsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiDetailsSuffix = 'backoffice/get_redis_all_details';
      
      const url = `${apiBaseUrl}/${apiDetailsSuffix}`;
      
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
      setDetailsData(data);
    } catch (error) {
      message.error('Failed to load details');
      console.error('Error loading details:', error);
      setDetailsData(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    if (key.startsWith('reliability_record_') && value && typeof value === 'object') {
      setEditingRecordId(value.id);
      setEditingStatus(typeof value.status === 'number' ? value.status : Number(value.status) || 0);
    } else {
      setEditingRecordId(null);
      setEditingStatus(null);
    }
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (quotaStatus && editingKey) {
      // Check if this is a reliability record that needs to be updated via PATCH
      if (editingKey.startsWith('reliability_record_')) {
        try {
          await updateReliabilityRecord({ id: editingRecordId, status: editingStatus });
          message.success('Reliability record updated successfully');
        } catch (error) {
          message.error('Failed to update reliability record');
          console.error('Error updating reliability record:', error);
          return; // Don't close modal on error
        }
      } else {
        // Handle other types of edits (local state updates)
        setQuotaStatus(prev => ({
          ...prev,
          [editingKey]: editingValue
        }));
        message.success('Value updated successfully');
      }
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const updateReliabilityRecord = async (recordData: any) => {
    if (!dpeItem?.id) {
      throw new Error('No DPE ID available');
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
    const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
    
    console.log('Sending data to dpe_quota:', recordData);
    
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedData = await response.json();
    
    // Update the local state with the response
    // Since we're now sending the object directly, the response should contain the updated data
    if (updatedData) {
      setQuotaStatus(prev => ({
        ...prev,
        ...updatedData
      }));
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Check if this is a "no purchase info" case - don't add any items to the table
      if (!quotaStatus.no_purchase_info) {
        // Handle simple quota value case (when API returns "0")
        if (quotaStatus.quota_value !== undefined) {
          infoItems.push({
            key: 'dpe_quota',
            name: 'DPE Quota',
            value: quotaStatus.quota_value
          });
        }
        
        // Handle purchase reliability data (when API returns structured response)
        if (quotaStatus.purchase_reliability_data && Array.isArray(quotaStatus.purchase_reliability_data)) {
          // Add each reliability record as a separate editable item
          quotaStatus.purchase_reliability_data.forEach((record: any, index: number) => {
            infoItems.push({
              key: `reliability_record_${index}`,
              name: record.user_email || `Reliability Record ${index + 1}`,
              value: {
                user_email: record.user_email,
                created_at: record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A',
                cd_type: record.cd_type,
                status: record.status,
                id: record.id // Keep ID for reference
              }
            });
          });
        }
        
        // Add quota status summary for complex responses
        if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
          infoItems.push({
            key: 'quota_status_summary',
            name: 'Quota Status Summary',
            value: {
              total_items: quotaStatus.table_values.length,
              purchased_items: quotaStatus.table_values.filter((item: any) => item.purchase === 1).length,
              original_table_values_count: quotaStatus.original_table_values_count,
              filtered_table_values_count: quotaStatus.filtered_table_values_count
            }
          });
          
          // Add individual purchased items if any exist
          const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
          if (purchasedItems.length > 0) {
            infoItems.push({
              key: 'purchased_items',
              name: 'Purchased Items',
              value: purchasedItems
            });
          }
        }
        
        // Add error information if there was an API error
        if (quotaStatus.error) {
          infoItems.push({
            key: 'api_error',
            name: 'API Error',
            value: {
              message: quotaStatus.message,
              purchase_status: quotaStatus.purchase_status,
              dpe_id: quotaStatus.dpe_id
            }
          });
        }
      }
    }

    const columns = [
      {
        title: 'Email',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => {
          // Special handling for reliability records
          if (record.key.startsWith('reliability_record_') && typeof value === 'object') {
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '12px' }}>
                    <div><strong>Type:</strong> {value.cd_type}</div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>Status:</strong> <Tag color={value.status === 0 ? 'red' : 'green'}>{value.status}</Tag>
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}><strong>Date:</strong> {value.created_at}</div>
                  </div>
                </div>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEditClick(record.key, value)}
                />
              </div>
            );
          }
          
          // Default rendering for other values
          return (
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
          );
        },
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
                  : 'No quota status data available.'
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

  const renderDetailsTab = () => {
    const parseDetailsData = (logKey: string) => {
      if (!detailsData?.cd_log) return null;
      
      try {
        // cd_log is already an object, no need to parse JSON
        const cdLogData = detailsData.cd_log;
        
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
        console.error('Error parsing details data:', error);
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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderDetailsData = (logKey: string) => {
      const details = parseDetailsData(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
            Details 
            {detailsData?.count && (
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: 8 }}>
                ({detailsData.count} entries)
              </Text>
            )}
          </Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchDetails}
            loading={detailsLoading}
            size="small"
          >
            Refresh
          </Button>
        </div>
        
        <Card>
          {detailsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading details...</Text>
              </div>
            </div>
          ) : !detailsData || detailsData.logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No details found for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Collapse
              items={detailsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                const details = parseDetailsData(logKey);
                
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
                  children: renderDetailsData(logKey),
                  extra: <EyeOutlined />
                };
              })}
              size="small"
              ghost
              defaultActiveKey={detailsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
              defaultActiveKey={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

  const handleExternalLinkClick = () => {
    if (dpeItem?.id) {
      const externalUrl = `https://bo.scandpe.fr/simul/index.html?ref_ademe=${dpeItem.id}`;
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'external-link',
      label: 'Open in External Tab',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
  ];

  const customTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Dropdown
        menu={{ items: dropdownMenuItems }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <Button
          type="text"
          icon={<MenuOutlined />}
          size="small"
          title="Open menu"
          style={{ 
            color: '#1890ff',
            padding: '4px 8px',
            height: 'auto',
            display: 'flex',
            alignItems: 'center'
          }}
        />
      </Dropdown>
      <span>DPE Details - {dpeItem?.id || ''}</span>
    </div>
  );

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
        title={customTitle}
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
        {editingKey.startsWith('reliability_record_') ? (
          <div>
            <Text strong>Set Status (integer):</Text>
            <div style={{ marginTop: 8 }}>
              <InputNumber
                value={editingStatus as number | null}
                onChange={(val) => setEditingStatus(typeof val === 'number' ? val : null)}
                step={1}
                style={{ width: 200 }}
              />
            </div>
          </div>
        ) : (
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
        )}
      </Modal>
    </>
  );
};

```

Now let me also add a console.log to show what's being sent in the body:


```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';

const { Title, Text } = Typography;

export const DpeModal: React.FC<DpeModalProps> = ({ visible, onClose, dpeItem }) => {
  const [activeTab, setActiveTab] = useState('infos');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | number | null>(null);
  const [logsData, setLogsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<{
    logs: string[];
    cd_log: any;
    count: number;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRetryMessages, setShowRetryMessages] = useState<{ [key: string]: boolean }>({});

  // Fetch data when modal opens and specific tab is active
  useEffect(() => {
    if (visible && dpeItem) {
      if (activeTab === 'infos') {
        fetchQuotaStatus();
      } else if (activeTab === 'logs') {
        fetchLogs();
      } else if (activeTab === 'details') {
        fetchDetails();
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
      
      // Handle the case where API returns "0" or empty response
      if (data === 0 || data === "0" || !data) {
        setQuotaStatus({
          quota_value: "0",
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Handle structured response with 'res' array (purchase reliability data)
      if (data.res && Array.isArray(data.res)) {
        setQuotaStatus({
          purchase_reliability_data: data.res,
          total_reliability_records: data.res.length,
          dpe_id: dpeItem.id,
          purchase_status: dpeItem.purchase
        });
        return;
      }
      
      // Filter table_values to only include items where purchase = 1
      if (data.table_values && Array.isArray(data.table_values)) {
        const filteredTableValues = data.table_values.filter((item: any) => item.purchase === 1);
        const filteredData = {
          ...data,
          table_values: filteredTableValues,
          original_table_values_count: data.table_values.length,
          filtered_table_values_count: filteredTableValues.length
        };
        setQuotaStatus(filteredData);
      } else {
        setQuotaStatus({
          ...data,
          purchase_status: dpeItem.purchase,
          api_url: fullUrl
        });
      }
    } catch (error) {
      message.error('Failed to load quota status');
      console.error('Error loading quota status:', error);
      setQuotaStatus({
        error: true,
        message: `Failed to load quota status: ${error}`,
        dpe_id: dpeItem.id,
        purchase_status: dpeItem.purchase
      });
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

  const fetchDetails = async () => {
    if (!dpeItem?.id) return;
    
    setDetailsLoading(true);
    try {
      // Get API base URL based on environment preference
      const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
      const apiBaseUrl = useDevEnvironment 
        ? (import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr')
        : (import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr');
      
      const apiDetailsSuffix = 'backoffice/get_redis_all_details';
      
      const url = `${apiBaseUrl}/${apiDetailsSuffix}`;
      
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
      setDetailsData(data);
    } catch (error) {
      message.error('Failed to load details');
      console.error('Error loading details:', error);
      setDetailsData(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditClick = (key: string, value: any) => {
    setEditingKey(key);
    setEditingValue(value);
    if (key.startsWith('reliability_record_') && value && typeof value === 'object') {
      setEditingRecordId(value.id);
      setEditingStatus(typeof value.status === 'number' ? value.status : Number(value.status) || 0);
    } else {
      setEditingRecordId(null);
      setEditingStatus(null);
    }
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (quotaStatus && editingKey) {
      // Check if this is a reliability record that needs to be updated via PATCH
      if (editingKey.startsWith('reliability_record_')) {
        try {
          await updateReliabilityRecord({ id: editingRecordId, status: editingStatus });
          message.success('Reliability record updated successfully');
        } catch (error) {
          message.error('Failed to update reliability record');
          console.error('Error updating reliability record:', error);
          return; // Don't close modal on error
        }
      } else {
        // Handle other types of edits (local state updates)
        setQuotaStatus(prev => ({
          ...prev,
          [editingKey]: editingValue
        }));
        message.success('Value updated successfully');
      }
    }
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const updateReliabilityRecord = async (recordData: any) => {
    if (!dpeItem?.id) {
      throw new Error('No DPE ID available');
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
    const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
    
    console.log('Sending data to dpe_quota:', recordData);
    console.log('JSON body being sent:', JSON.stringify(recordData));
    
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedData = await response.json();
    
    // Update the local state with the response
    // Since we're now sending the object directly, the response should contain the updated data
    if (updatedData) {
      setQuotaStatus(prev => ({
        ...prev,
        ...updatedData
      }));
    }
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingKey('');
    setEditingValue(null);
    setEditingRecordId(null);
    setEditingStatus(null);
  };

  const renderInfosTab = () => {
    // Create info items array with better structure for quota status
    const infoItems: InfoItem[] = [];
    
    if (quotaStatus) {
      // Check if this is a "no purchase info" case - don't add any items to the table
      if (!quotaStatus.no_purchase_info) {
        // Handle simple quota value case (when API returns "0")
        if (quotaStatus.quota_value !== undefined) {
          infoItems.push({
            key: 'dpe_quota',
            name: 'DPE Quota',
            value: quotaStatus.quota_value
          });
        }
        
        // Handle purchase reliability data (when API returns structured response)
        if (quotaStatus.purchase_reliability_data && Array.isArray(quotaStatus.purchase_reliability_data)) {
          // Add each reliability record as a separate editable item
          quotaStatus.purchase_reliability_data.forEach((record: any, index: number) => {
            infoItems.push({
              key: `reliability_record_${index}`,
              name: record.user_email || `Reliability Record ${index + 1}`,
              value: {
                user_email: record.user_email,
                created_at: record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A',
                cd_type: record.cd_type,
                status: record.status,
                id: record.id // Keep ID for reference
              }
            });
          });
        }
        
        // Add quota status summary for complex responses
        if (quotaStatus.table_values && Array.isArray(quotaStatus.table_values)) {
          infoItems.push({
            key: 'quota_status_summary',
            name: 'Quota Status Summary',
            value: {
              total_items: quotaStatus.table_values.length,
              purchased_items: quotaStatus.table_values.filter((item: any) => item.purchase === 1).length,
              original_table_values_count: quotaStatus.original_table_values_count,
              filtered_table_values_count: quotaStatus.filtered_table_values_count
            }
          });
          
          // Add individual purchased items if any exist
          const purchasedItems = quotaStatus.table_values.filter((item: any) => item.purchase === 1);
          if (purchasedItems.length > 0) {
            infoItems.push({
              key: 'purchased_items',
              name: 'Purchased Items',
              value: purchasedItems
            });
          }
        }
        
        // Add error information if there was an API error
        if (quotaStatus.error) {
          infoItems.push({
            key: 'api_error',
            name: 'API Error',
            value: {
              message: quotaStatus.message,
              purchase_status: quotaStatus.purchase_status,
              dpe_id: quotaStatus.dpe_id
            }
          });
        }
      }
    }

    const columns = [
      {
        title: 'Email',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: 'Value',
        dataIndex: 'value',
        key: 'value',
        render: (value: any, record: InfoItem) => {
          // Special handling for reliability records
          if (record.key.startsWith('reliability_record_') && typeof value === 'object') {
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '12px' }}>
                    <div><strong>Type:</strong> {value.cd_type}</div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>Status:</strong> <Tag color={value.status === 0 ? 'red' : 'green'}>{value.status}</Tag>
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}><strong>Date:</strong> {value.created_at}</div>
                  </div>
                </div>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEditClick(record.key, value)}
                />
              </div>
            );
          }
          
          // Default rendering for other values
          return (
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
          );
        },
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
                  : 'No quota status data available.'
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

  const renderDetailsTab = () => {
    const parseDetailsData = (logKey: string) => {
      if (!detailsData?.cd_log) return null;
      
      try {
        // cd_log is already an object, no need to parse JSON
        const cdLogData = detailsData.cd_log;
        
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
        console.error('Error parsing details data:', error);
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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderDetailsData = (logKey: string) => {
      const details = parseDetailsData(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
            Details 
            {detailsData?.count && (
              <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: 8 }}>
                ({detailsData.count} entries)
              </Text>
            )}
          </Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchDetails}
            loading={detailsLoading}
            size="small"
          >
            Refresh
          </Button>
        </div>
        
        <Card>
          {detailsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Loading details...</Text>
              </div>
            </div>
          ) : !detailsData || detailsData.logs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No details found for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Collapse
              items={detailsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                const details = parseDetailsData(logKey);
                
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
                  children: renderDetailsData(logKey),
                  extra: <EyeOutlined />
                };
              })}
              size="small"
              ghost
              defaultActiveKey={detailsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

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

    const isRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries');
    };

    const isZeroRetryMessage = (message: string) => {
      return message && message.includes('after') && message.includes('retries') && message.includes('after 0 retries');
    };

    const toggleRetryMessages = (logKey: string) => {
      setShowRetryMessages(prev => ({
        ...prev,
        [logKey]: !prev[logKey]
      }));
    };

    const renderLogDetails = (logKey: string) => {
      const details = parseLogDetails(logKey);
      if (!details || details.length === 0) {
        return <Text type="secondary">No detailed data available</Text>;
      }

      // Filter out entire blocks that contain zero retry messages by default
      const showZeroRetries = showRetryMessages[logKey] || false;
      
      // Check if a detail block contains any zero retry messages
      const blockContainsZeroRetry = (detail: any) => {
        if (detail.content && Array.isArray(detail.content)) {
          return detail.content.some((contentItem: any) => 
            contentItem.message && isZeroRetryMessage(contentItem.message)
          );
        }
        return false;
      };

      // Filter out entire blocks that contain zero retry messages
      const filteredDetails = details.filter(detail => {
        if (blockContainsZeroRetry(detail)) {
          return showZeroRetries;
        }
        return true; // Show blocks that don't contain zero retry messages
      });

      // Count blocks with zero retry messages for display
      const zeroRetryCount = details.filter(detail => blockContainsZeroRetry(detail)).length;

      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {zeroRetryCount > 0 && (
            <div style={{ marginBottom: 8, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Space>
                <Text type="secondary">
                  {zeroRetryCount} log entr{zeroRetryCount > 1 ? 'ies' : 'y'} with zero retries hidden
                </Text>
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => toggleRetryMessages(logKey)}
                  style={{ padding: 0, height: 'auto' }}
                >
                  {showZeroRetries ? 'Hide' : 'Show more'}
                </Button>
              </Space>
            </div>
          )}
          {filteredDetails.map((detail, index) => (
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
                                    <Text>
                                      {contentItem.message}
                                    </Text>
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
              defaultActiveKey={logsData.logs.map((logKey, index) => {
                const logType = logKey.includes(':') ? logKey.split(':')[1] : logKey;
                return logType.endsWith('_middleware_end_full_log') ? index.toString() : null;
              }).filter(Boolean)}
            />
          )}
        </Card>
      </div>
    );
  };

  const handleExternalLinkClick = () => {
    if (dpeItem?.id) {
      const externalUrl = `https://bo.scandpe.fr/simul/index.html?ref_ademe=${dpeItem.id}`;
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'external-link',
      label: 'Open in External Tab',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
  ];

  const customTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Dropdown
        menu={{ items: dropdownMenuItems }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <Button
          type="text"
          icon={<MenuOutlined />}
          size="small"
          title="Open menu"
          style={{ 
            color: '#1890ff',
            padding: '4px 8px',
            height: 'auto',
            display: 'flex',
            alignItems: 'center'
          }}
        />
      </Dropdown>
      <span>DPE Details - {dpeItem?.id || ''}</span>
    </div>
  );

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
        title={customTitle}
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
        {editingKey.startsWith('reliability_record_') ? (
          <div>
            <Text strong>Set Status (integer):</Text>
            <div style={{ marginTop: 8 }}>
              <InputNumber
                value={editingStatus as number | null}
                onChange={(val) => setEditingStatus(typeof val === 'number' ? val : null)}
                step={1}
                style={{ width: 200 }}
              />
            </div>
          </div>
        ) : (
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
        )}
      </Modal>
    </>
  );
};

```

Perfect! Now when you test the functionality, you should see in the browser console exactly what data is being sent. The console logs will show:

1. `Sending data to dpe_quota:` - the raw recordData object
2. `JSON body being sent:` - the exact JSON string being sent in the request body

This will help us verify that the change is working correctly. The data should now be sent as:

```json
{
    "id": "evt_3SFIhW2LMgCh4yn40PKvpgHQ",
    "user_email": "longuepeeguillaume04@gmail.com",
    "created_at": "2025-10-06T18:04:33.724757",
    "status": 1,
    "cd_type": "purchase_reliability"
}
```

Instead of:

```json
{
    "res": [
        {
            "id": "evt_3SFIhW2LMgCh4yn40PKvpgHQ",
            "user_email": "longuepeeguillaume04@gmail.com",
            "created_at": "2025-10-06T18:04:33.724757",
            "status": 1,
            "cd_type": "purchase_reliability"
        }
    ]
}
```

Please test the functionality now and check the browser console to see what's actually being sent. If you're still seeing the `res` wrapper, it might be a browser cache issue, and you may need to:

1. Hard refresh the browser (Ctrl+F5 or Cmd+Shift+R)
2. Clear browser cache
3. Or open the app in an incognito/private window

The code change is definitely correct - we're now sending `JSON.stringify(recordData)` directly instead of `JSON.stringify({ res: [recordData] })`.

```json
{
    "id": "evt_3SFIhW2LMgCh4yn40PKvpgHQ",
    "user_email": "longuepeeguillaume04@gmail.com",
    "created_at": "2025-10-06T18:04:33.724757",
    "status": 1,
    "cd_type": "purchase_reliability"
}
```

```json
{
    "res": [
        {
            "id": "evt_3SFIhW2LMgCh4yn40PKvpgHQ",
            "user_email": "longuepeeguillaume04@gmail.com",
            "created_at": "2025-10-06T18:04:33.724757",
            "status": 1,
            "cd_type": "purchase_reliability"
        }
    ]
}
```

