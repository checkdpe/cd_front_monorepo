# Adjust labels for timers translation
_Exported on 07/10/2025 at 8:10:29 CEST from Cursor (1.7.33)_

---

**User**

@cdconfig.json  I add this file for labels translation from 

"timers" key , in Details / Logs
ex. received from endpiont : "{\"hr_ts\": \"2025-10-06 11:33:51\", \"client_ip_hash\": \"0021_18992\", \"content\": [{\"step\": \"sync_init_state_redis_wait\", \"called_from\": \"home_home\", \"message\": \"found 10 after 5 retries\", \"ts\": 1759750431.145086}, {\"timers\": {\"attach_db_redis\": 1759750429.9508557, \"extract_client_ip_middleware\": 1759750429.9512036, \"post_execution\": 1759750431.5333486, \"final\": 1759750431.5334628}, \"uuid\": \"c266e011-f07f-4803-89fb-dc8bdca432ef\", \"path\": \"/home/home\"}]}"
 Please edit DpeModal in order to display labels from this json file. Do not edit the json file itself

---

**Cursor**

I'll help you integrate the label translations from `cdconfig.json` into the DpeModal component. Let me first read the DpeModal file to understand its current structure.

I'll help you integrate the label translations from `cdconfig.json` into the DpeModal component to display human-readable labels for the timer keys in the Details and Logs tabs.

Let me modify the DpeModal.tsx file:

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';

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

Now I'll add a helper function to get the translated label and update both `renderTimeline` functions in the Details and Logs tabs:

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';

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

  // Helper function to get translated label for timer keys
  const getTimerLabel = (timerKey: string): string => {
    const labels = cdconfig?.labels?.timers_step_label;
    if (labels && labels[timerKey as keyof typeof labels]) {
      return labels[timerKey as keyof typeof labels];
    }
    // Fallback to formatted key if no translation exists
    return timerKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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

Now I'll update the first `renderTimeline` function in the Details tab to use the translated labels:

```typescriptreact
    const renderTimeline = (timers: any) => {
      if (!timers || typeof timers !== 'object') return null;

      // Convert timers to array and sort by timestamp
      const timerEntries = Object.entries(timers)
        .map(([name, timestamp]) => ({
          name,
          timestamp: timestamp as number,
          displayName: getTimerLabel(name)
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
```

Let me update the first occurrence with more context:

```typescriptreact
      }
    };

    const renderTimeline = (timers: any) => {
      if (!timers || typeof timers !== 'object') return null;

      // Convert timers to array and sort by timestamp
      const timerEntries = Object.entries(timers)
        .map(([name, timestamp]) => ({
          name,
          timestamp: timestamp as number,
          displayName: getTimerLabel(name)
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
```

Since the `renderTimeline` function appears twice and needs the same change in both places, I'll use `replace_all`:

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';

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

  // Helper function to get translated label for timer keys
  const getTimerLabel = (timerKey: string): string => {
    const labels = cdconfig?.labels?.timers_step_label;
    if (labels && labels[timerKey as keyof typeof labels]) {
      return labels[timerKey as keyof typeof labels];
    }
    // Fallback to formatted key if no translation exists
    return timerKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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
          displayName: getTimerLabel(name)
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
          displayName: getTimerLabel(name)
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

Perfect! Now let me check for any linter errors:

The linter errors show that my changes need better type handling. Let me fix the `getTimerLabel` function to properly handle the types:

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';

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

  // Helper function to get translated label for timer keys
  const getTimerLabel = (timerKey: string): string => {
    try {
      const labels = cdconfig?.labels?.timers_step_label as Record<string, string> | undefined;
      if (labels && timerKey in labels && labels[timerKey]) {
        return labels[timerKey];
      }
    } catch (error) {
      console.error('Error getting timer label:', error);
    }
    // Fallback to formatted key if no translation exists
    return timerKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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
          displayName: getTimerLabel(name)
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
          displayName: getTimerLabel(name)
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

Let me check if my changes fixed the linter errors or introduced new ones:

Great! The linter errors are pre-existing issues in the codebase, not introduced by my changes. Let me verify that the integration is complete by reading the relevant section:

Let me verify one of the `renderTimeline` functions to confirm the integration:

Perfect! The integration is complete. Let me create a quick summary of the changes:

## Summary

I've successfully integrated the label translations from `cdconfig.json` into the DpeModal component. Here's what was done:

### Changes Made:

1. **Imported the config file** (line 5):
   ```typescript
   import cdconfig from '../../../apps/dpes/cdconfig.json';
   ```

2. **Created a helper function** `getTimerLabel` (lines 32-44) that:
   - Looks up timer keys in the `cdconfig.labels.timers_step_label` mapping
   - Returns the human-readable label if found
   - Falls back to the automatic formatting (capitalize words) if no translation exists
   - Includes error handling for robustness

3. **Updated both `renderTimeline` functions** (in Details and Logs tabs):
   - Changed line 646: `displayName: getTimerLabel(name)` (Details tab)
   - Changed line 1019: `displayName: getTimerLabel(name)` (Logs tab)

### How It Works:

When timer data is received from the endpoint (e.g., `"attach_db_redis"`, `"redis_status_change_10"`), the component will now:
- First check if there's a translation in `cdconfig.json`
- Display the translated label (e.g., "Connect to DB", "Reliability")
- If no translation exists, fall back to the formatted key name

The cdconfig.json file was not modified as requested, and the implementation is ready to use!

```typescript
   import cdconfig from '../../../apps/dpes/cdconfig.json';
```

---

**User**

@cdconfig.json review for new key and adjust

---

**Cursor**

I can see you've updated the `cdconfig.json` file with more descriptive labels! Let me review the changes:

**New additions:**
- Added `"redis_status_change_3": "Inserted"` - a new timer step
- Enhanced existing labels to be more descriptive:
  - `redis_status_change_1`: "1" → "DPE loading task received"
  - `redis_status_change_2`: "2" → "Will download"
  - `redis_status_change_9`: "9" → "Will calculate reliability"
  - `redis_status_change_10`: "Reliability" → "Reliability done"

**Good news:** The DpeModal integration I implemented is already dynamic, so these new labels will be automatically picked up without any code changes needed! The `getTimerLabel` function performs a dynamic lookup, so it will work with any keys you add to the config file.

The enhanced labels are much more descriptive and will provide better clarity in the Details and Logs tabs. For example:
- When the endpoint returns `"redis_status_change_1"`, users will now see "DPE loading task received" instead of "1"
- When `"redis_status_change_3"` appears, it will show "Inserted"
- And so on for all the other updated labels

Everything looks great! The integration is ready to use with your updated labels. No adjustments to the DpeModal code are necessary. 🎉

---

**User**

DPE details modal / Infos =>
after edit a status when sub-modal closed
please refresh endpoint for read of dpe_quotas (and update status then)

---

**Cursor**

I'll modify the DpeModal to refresh the quota status from the endpoint after successfully editing and closing the edit modal. Let me update the `handleEditSave` function:

Now I'll update the `handleEditSave` function to refresh the quota status after a successful edit:

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';

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

  // Helper function to get translated label for timer keys
  const getTimerLabel = (timerKey: string): string => {
    try {
      const labels = cdconfig?.labels?.timers_step_label as Record<string, string> | undefined;
      if (labels && timerKey in labels && labels[timerKey]) {
        return labels[timerKey];
      }
    } catch (error) {
      console.error('Error getting timer label:', error);
    }
    // Fallback to formatted key if no translation exists
    return timerKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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
          // Refresh quota status from endpoint after successful update
          await fetchQuotaStatus();
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
          displayName: getTimerLabel(name)
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
          displayName: getTimerLabel(name)
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

Let me check for any linter errors:

Perfect! The changes are complete and no new linter errors were introduced. The existing errors are pre-existing issues in the codebase.

## Summary of Changes

I've updated the `handleEditSave` function in DpeModal to refresh the quota status after a successful edit:

**What happens now:**

1. User clicks edit on a status in the Infos tab
2. Edit modal opens
3. User changes the status value
4. User saves the changes
5. **✨ NEW:** The component now calls `fetchQuotaStatus()` to refresh the data from the `dpe_quota` endpoint
6. The updated status is displayed with the fresh data from the server
7. Edit modal closes

This ensures that after editing a reliability record status, the Infos tab displays the most current data from the backend, including any changes that might have been made server-side during the update.

The refresh happens at line 300 in the DpeModal.tsx file, right after the successful update message and before closing the modal.

---

**User**

DPE Details modal / Infos
table to be ordered by : Date desc, email

---

**Cursor**

I'll update the DpeModal to sort the reliability records by date (descending) and then by email before displaying them in the table.

Now I'll update the code to sort the reliability records by date (descending) and then by email:

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';

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

  // Helper function to get translated label for timer keys
  const getTimerLabel = (timerKey: string): string => {
    try {
      const labels = cdconfig?.labels?.timers_step_label as Record<string, string> | undefined;
      if (labels && timerKey in labels && labels[timerKey]) {
        return labels[timerKey];
      }
    } catch (error) {
      console.error('Error getting timer label:', error);
    }
    // Fallback to formatted key if no translation exists
    return timerKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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
          // Refresh quota status from endpoint after successful update
          await fetchQuotaStatus();
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
          // Sort by date (descending) then by email (ascending)
          const sortedRecords = [...quotaStatus.purchase_reliability_data].sort((a: any, b: any) => {
            // First, sort by date (descending - most recent first)
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            
            if (dateB !== dateA) {
              return dateB - dateA; // Descending order (most recent first)
            }
            
            // If dates are equal, sort by email (ascending)
            const emailA = (a.user_email || '').toLowerCase();
            const emailB = (b.user_email || '').toLowerCase();
            return emailA.localeCompare(emailB);
          });
          
          // Add each reliability record as a separate editable item
          sortedRecords.forEach((record: any, index: number) => {
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
          displayName: getTimerLabel(name)
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
          displayName: getTimerLabel(name)
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

Let me check for any linter errors:

Perfect! The changes are complete and no new linter errors were introduced. The existing errors are pre-existing issues in the codebase.

## Summary of Changes

I've updated the Infos tab in the DpeModal to sort the reliability records table with the following order:

1. **Primary sort**: Date (descending) - Most recent dates appear first
2. **Secondary sort**: Email (ascending) - Alphabetical order when dates are the same

**Implementation details:**
- Created a sorted copy of the `purchase_reliability_data` array
- Sorting logic (lines 385-399):
  - First compares dates (most recent first)
  - If dates are equal, sorts alphabetically by email (case-insensitive)
- The sorted records are then displayed in the table

This ensures that users will see the most recent reliability records at the top of the table, and if multiple records have the same date, they'll be ordered alphabetically by email address.

