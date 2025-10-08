# Implement report loading and send button
_Exported on 08/10/2025 at 13:23:57 CEST from Cursor (1.7.33)_

---

**User**

for actions : when click
you can load the report under , based on "cdconfig" "done" 
add a button between actions and report
"send" so when action is clicked : it s not sent yet, not before "send" clicked
just load report for existing stuff at this stage

---

**Cursor**

I'll help you modify the actions behavior to add a "send" button. Let me first examine the current configuration and code to understand the structure.

Now I understand the current flow. Let me implement the changes to add a "Send" button between actions and reports. Here's what I'll do:

1. When an action button is clicked, it will be selected (but not sent)
2. Add a "Send" button that appears after an action is selected
3. Only when "Send" is clicked, the action will be sent
4. For existing actions with "done" config, add ability to load report directly

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Clear/reset all previous action done data when clicking a new button
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          const isExpanded = actionDoneExpanded[actionKey] || false;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
          }
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
      setSelectedAction(null);
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Clear/reset all previous action done data when clicking a new button
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          const isExpanded = actionDoneExpanded[actionKey] || false;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
          }
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
      setSelectedAction(null);
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Just select the action, don't send it yet
    setSelectedAction({ key: actionKey, config: actionConfig });
    message.info(`Action "${actionKey}" selected. Click "Send" to execute.`);
  };

  const handleSendAction = async () => {
    if (!selectedAction || !dpeItem?.id) {
      message.error('No action selected or DPE ID available');
      return;
    }

    const { key: actionKey, config: actionConfig } = selectedAction;

    // Clear/reset all previous action done data when sending
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  const handleLoadReport = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id || !actionConfig.done) {
      message.error('No DPE ID available or action has no report configuration');
      return;
    }

    // Load report directly without sending action
    pollActionDone(actionKey, actionConfig.done);
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          const isExpanded = actionDoneExpanded[actionKey] || false;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
          }
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

Now let me update the render function to add the Send button and Load Report functionality:

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
      setSelectedAction(null);
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Just select the action, don't send it yet
    setSelectedAction({ key: actionKey, config: actionConfig });
    message.info(`Action "${actionKey}" selected. Click "Send" to execute.`);
  };

  const handleSendAction = async () => {
    if (!selectedAction || !dpeItem?.id) {
      message.error('No action selected or DPE ID available');
      return;
    }

    const { key: actionKey, config: actionConfig } = selectedAction;

    // Clear/reset all previous action done data when sending
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  const handleLoadReport = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id || !actionConfig.done) {
      message.error('No DPE ID available or action has no report configuration');
      return;
    }

    // Load report directly without sending action
    pollActionDone(actionKey, actionConfig.done);
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                  type={selectedAction?.key === actionKey ? 'primary' : 'default'}
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Send Button */}
        {selectedAction && (
          <Card style={{ marginTop: 16, backgroundColor: '#f0f5ff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Selected Action: {selectedAction.key}</Text>
              <Button 
                type="primary" 
                icon={<Icons.SendOutlined />}
                onClick={handleSendAction}
                size="large"
              >
                Send Action
              </Button>
            </Space>
          </Card>
        )}

        {/* Load Report Buttons for actions with "done" config */}
        {visibleActions.some(([_, actionConfig]: [string, any]) => actionConfig.done) && (
          <Card style={{ marginTop: 16 }}>
            <Title level={5}>Load Existing Reports</Title>
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions
                .filter(([_, actionConfig]: [string, any]) => actionConfig.done)
                .map(([actionKey, actionConfig]: [string, any]) => (
                  <Button
                    key={`load-${actionKey}`}
                    icon={<ReloadOutlined />}
                    onClick={() => handleLoadReport(actionKey, actionConfig)}
                    title={`Load report for ${actionKey}`}
                    size="small"
                    type="dashed"
                  >
                    Load {actionKey} Report
                  </Button>
                ))}
            </Space>
          </Card>
        )}

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          const isExpanded = actionDoneExpanded[actionKey] || false;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
          }
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

Now let me check for any linter errors in the modified file:

The linter errors shown are pre-existing issues in the file, not from my changes. Let me verify that `SendOutlined` icon is available. Let me check if we need to import it explicitly:

Let me update the imports to include `SendOutlined`:

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined, SendOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
      setSelectedAction(null);
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Just select the action, don't send it yet
    setSelectedAction({ key: actionKey, config: actionConfig });
    message.info(`Action "${actionKey}" selected. Click "Send" to execute.`);
  };

  const handleSendAction = async () => {
    if (!selectedAction || !dpeItem?.id) {
      message.error('No action selected or DPE ID available');
      return;
    }

    const { key: actionKey, config: actionConfig } = selectedAction;

    // Clear/reset all previous action done data when sending
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  const handleLoadReport = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id || !actionConfig.done) {
      message.error('No DPE ID available or action has no report configuration');
      return;
    }

    // Load report directly without sending action
    pollActionDone(actionKey, actionConfig.done);
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                  type={selectedAction?.key === actionKey ? 'primary' : 'default'}
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Send Button */}
        {selectedAction && (
          <Card style={{ marginTop: 16, backgroundColor: '#f0f5ff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Selected Action: {selectedAction.key}</Text>
              <Button 
                type="primary" 
                icon={<Icons.SendOutlined />}
                onClick={handleSendAction}
                size="large"
              >
                Send Action
              </Button>
            </Space>
          </Card>
        )}

        {/* Load Report Buttons for actions with "done" config */}
        {visibleActions.some(([_, actionConfig]: [string, any]) => actionConfig.done) && (
          <Card style={{ marginTop: 16 }}>
            <Title level={5}>Load Existing Reports</Title>
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions
                .filter(([_, actionConfig]: [string, any]) => actionConfig.done)
                .map(([actionKey, actionConfig]: [string, any]) => (
                  <Button
                    key={`load-${actionKey}`}
                    icon={<ReloadOutlined />}
                    onClick={() => handleLoadReport(actionKey, actionConfig)}
                    title={`Load report for ${actionKey}`}
                    size="small"
                    type="dashed"
                  >
                    Load {actionKey} Report
                  </Button>
                ))}
            </Space>
          </Card>
        )}

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          const isExpanded = actionDoneExpanded[actionKey] || false;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
          }
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined, SendOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
      setSelectedAction(null);
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Just select the action, don't send it yet
    setSelectedAction({ key: actionKey, config: actionConfig });
    message.info(`Action "${actionKey}" selected. Click "Send" to execute.`);
  };

  const handleSendAction = async () => {
    if (!selectedAction || !dpeItem?.id) {
      message.error('No action selected or DPE ID available');
      return;
    }

    const { key: actionKey, config: actionConfig } = selectedAction;

    // Clear/reset all previous action done data when sending
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  const handleLoadReport = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id || !actionConfig.done) {
      message.error('No DPE ID available or action has no report configuration');
      return;
    }

    // Load report directly without sending action
    pollActionDone(actionKey, actionConfig.done);
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                  type={selectedAction?.key === actionKey ? 'primary' : 'default'}
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Send Button */}
        {selectedAction && (
          <Card style={{ marginTop: 16, backgroundColor: '#f0f5ff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Selected Action: {selectedAction.key}</Text>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendAction}
                size="large"
              >
                Send Action
              </Button>
            </Space>
          </Card>
        )}

        {/* Load Report Buttons for actions with "done" config */}
        {visibleActions.some(([_, actionConfig]: [string, any]) => actionConfig.done) && (
          <Card style={{ marginTop: 16 }}>
            <Title level={5}>Load Existing Reports</Title>
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions
                .filter(([_, actionConfig]: [string, any]) => actionConfig.done)
                .map(([actionKey, actionConfig]: [string, any]) => (
                  <Button
                    key={`load-${actionKey}`}
                    icon={<ReloadOutlined />}
                    onClick={() => handleLoadReport(actionKey, actionConfig)}
                    title={`Load report for ${actionKey}`}
                    size="small"
                    type="dashed"
                  >
                    Load {actionKey} Report
                  </Button>
                ))}
            </Space>
          </Card>
        )}

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          const isExpanded = actionDoneExpanded[actionKey] || false;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
          }
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

Now let me verify the changes work correctly by checking if there are any new linter errors:

Perfect! No new linter errors were introduced by my changes. The 16 errors shown are pre-existing issues in the file. Now let me test if the build works:

The package uses direct TypeScript imports without a build step, which is common in monorepos. Let me verify the dpes app builds correctly:

Excellent! The build was successful. Let me now create a summary of the changes I've made:

## Summary of Changes

I've successfully modified the DPE Modal component to implement the requested workflow changes:

### What Changed:

1. **Action Selection (No Immediate Send)**
   - When you click an action button, it now only **selects** the action instead of immediately sending it
   - The selected action is highlighted with a `primary` button style
   - A message appears: "Action [name] selected. Click 'Send' to execute."

2. **Send Button Added**
   - A new **"Send Action"** button appears between the actions and reports section
   - This button only shows when an action is selected
   - The button is displayed in a highlighted blue card showing which action is selected
   - Only when you click "Send" will the action actually be executed

3. **Load Report Functionality**
   - Added a new section called **"Load Existing Reports"** 
   - Shows buttons for all actions that have a "done" configuration in `cdconfig.json`
   - These "Load [action name] Report" buttons allow you to load existing reports without sending a new action
   - Currently, the `o3cl_init` action has a "done" config, so it will show a "Load o3cl_init Report" button

### Files Modified:
- `/Volumes/privateGg/ai-microfront-ant/packages/dpe-modal/src/DpeModal.tsx`

### Key Code Changes:
1. Added `selectedAction` state to track which action is selected
2. Modified `handleActionClick` to only select actions, not execute them
3. Created new `handleSendAction` function that actually sends the action
4. Created new `handleLoadReport` function to load reports for actions with "done" config
5. Updated the Actions tab UI to show:
   - Action buttons (now just select)
   - Send button (when action selected)
   - Load Report buttons (for actions with "done" config)
   - Report display section (unchanged)

The workflow is now:
**Click Action → Click Send → Action Executes → Report Loads**

Or for existing data:
**Click "Load Report" → Report Loads Directly**

---

**User**

"Load Existing Reports
" no need this part : just load it when the action is clicked and show the report at this place

---

**Cursor**

I'll modify the code to remove the "Load Existing Reports" section and instead automatically load the report when an action with "done" config is clicked.

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined, SendOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
      setSelectedAction(null);
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Just select the action, don't send it yet
    setSelectedAction({ key: actionKey, config: actionConfig });
    message.info(`Action "${actionKey}" selected. Click "Send" to execute.`);
    
    // If action has "done" config, load the report immediately
    if (actionConfig.done) {
      handleLoadReport(actionKey, actionConfig);
    }
  };

  const handleSendAction = async () => {
    if (!selectedAction || !dpeItem?.id) {
      message.error('No action selected or DPE ID available');
      return;
    }

    const { key: actionKey, config: actionConfig } = selectedAction;

    // Clear/reset all previous action done data when sending
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  const handleLoadReport = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id || !actionConfig.done) {
      message.error('No DPE ID available or action has no report configuration');
      return;
    }

    // Load report directly without sending action
    pollActionDone(actionKey, actionConfig.done);
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                  type={selectedAction?.key === actionKey ? 'primary' : 'default'}
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Send Button */}
        {selectedAction && (
          <Card style={{ marginTop: 16, backgroundColor: '#f0f5ff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Selected Action: {selectedAction.key}</Text>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendAction}
                size="large"
              >
                Send Action
              </Button>
            </Space>
          </Card>
        )}

        {/* Load Report Buttons for actions with "done" config */}
        {visibleActions.some(([_, actionConfig]: [string, any]) => actionConfig.done) && (
          <Card style={{ marginTop: 16 }}>
            <Title level={5}>Load Existing Reports</Title>
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions
                .filter(([_, actionConfig]: [string, any]) => actionConfig.done)
                .map(([actionKey, actionConfig]: [string, any]) => (
                  <Button
                    key={`load-${actionKey}`}
                    icon={<ReloadOutlined />}
                    onClick={() => handleLoadReport(actionKey, actionConfig)}
                    title={`Load report for ${actionKey}`}
                    size="small"
                    type="dashed"
                  >
                    Load {actionKey} Report
                  </Button>
                ))}
            </Space>
          </Card>
        )}

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          const isExpanded = actionDoneExpanded[actionKey] || false;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
          }
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined, SendOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
      setSelectedAction(null);
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Just select the action, don't send it yet
    setSelectedAction({ key: actionKey, config: actionConfig });
    message.info(`Action "${actionKey}" selected. Click "Send" to execute.`);
    
    // If action has "done" config, load the report immediately
    if (actionConfig.done) {
      handleLoadReport(actionKey, actionConfig);
    }
  };

  const handleSendAction = async () => {
    if (!selectedAction || !dpeItem?.id) {
      message.error('No action selected or DPE ID available');
      return;
    }

    const { key: actionKey, config: actionConfig } = selectedAction;

    // Clear/reset all previous action done data when sending
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  const handleLoadReport = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id || !actionConfig.done) {
      message.error('No DPE ID available or action has no report configuration');
      return;
    }

    // Load report directly without sending action
    pollActionDone(actionKey, actionConfig.done);
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                  type={selectedAction?.key === actionKey ? 'primary' : 'default'}
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Send Button */}
        {selectedAction && (
          <Card style={{ marginTop: 16, backgroundColor: '#f0f5ff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Selected Action: {selectedAction.key}</Text>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendAction}
                size="large"
              >
                Send Action
              </Button>
            </Space>
          </Card>
        )}

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          const isExpanded = actionDoneExpanded[actionKey] || false;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
          }
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

Perfect! I've successfully updated the code. Here's what changed:

## Updated Implementation

### Changes Made:

1. **Removed "Load Existing Reports" Section** - The separate section with manual load buttons has been removed.

2. **Automatic Report Loading on Action Click** - When you click an action button:
   - The action gets selected (highlighted in blue)
   - If the action has a `done` configuration in `cdconfig.json`, the report is **automatically loaded and displayed** below
   - A message shows: "Action [name] selected. Click 'Send' to execute."

3. **Send Button** - Still appears when an action is selected, allowing you to actually send the action when ready.

### New Workflow:

**For actions with "done" config (like `o3cl_init`):**
- Click action button → Report loads immediately → Click "Send" to execute the action

**For actions without "done" config:**
- Click action button → Click "Send" to execute the action

The report now appears in the same location as before, directly under the Send button, showing the existing data from the backend based on the `cdconfig.json` "done" configuration.

Build completed successfully! ✓

---

**User**

-i do not need the notification "Action "o3cl_init" selected. Click "Send" to execute."

-"show more/show less" if the content is < 200chars, it's expanded by default

---

**Cursor**

I'll make those two changes:

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined, SendOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
      setSelectedAction(null);
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Just select the action, don't send it yet
    setSelectedAction({ key: actionKey, config: actionConfig });
    
    // If action has "done" config, load the report immediately
    if (actionConfig.done) {
      handleLoadReport(actionKey, actionConfig);
    }
  };

  const handleSendAction = async () => {
    if (!selectedAction || !dpeItem?.id) {
      message.error('No action selected or DPE ID available');
      return;
    }

    const { key: actionKey, config: actionConfig } = selectedAction;

    // Clear/reset all previous action done data when sending
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  const handleLoadReport = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id || !actionConfig.done) {
      message.error('No DPE ID available or action has no report configuration');
      return;
    }

    // Load report directly without sending action
    pollActionDone(actionKey, actionConfig.done);
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                  type={selectedAction?.key === actionKey ? 'primary' : 'default'}
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Send Button */}
        {selectedAction && (
          <Card style={{ marginTop: 16, backgroundColor: '#f0f5ff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Selected Action: {selectedAction.key}</Text>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendAction}
                size="large"
              >
                Send Action
              </Button>
            </Space>
          </Card>
        )}

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          const isExpanded = actionDoneExpanded[actionKey] || false;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
          }
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined, SendOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
      setSelectedAction(null);
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Just select the action, don't send it yet
    setSelectedAction({ key: actionKey, config: actionConfig });
    
    // If action has "done" config, load the report immediately
    if (actionConfig.done) {
      handleLoadReport(actionKey, actionConfig);
    }
  };

  const handleSendAction = async () => {
    if (!selectedAction || !dpeItem?.id) {
      message.error('No action selected or DPE ID available');
      return;
    }

    const { key: actionKey, config: actionConfig } = selectedAction;

    // Clear/reset all previous action done data when sending
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  const handleLoadReport = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id || !actionConfig.done) {
      message.error('No DPE ID available or action has no report configuration');
      return;
    }

    // Load report directly without sending action
    pollActionDone(actionKey, actionConfig.done);
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                  type={selectedAction?.key === actionKey ? 'primary' : 'default'}
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Send Button */}
        {selectedAction && (
          <Card style={{ marginTop: 16, backgroundColor: '#f0f5ff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Selected Action: {selectedAction.key}</Text>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendAction}
                size="large"
              >
                Send Action
              </Button>
            </Space>
          </Card>
        )}

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          let shortDataLength = 0;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
            shortDataLength = JSON.stringify(shortData, null, 2).length;
          }
          
          // If content is less than 200 chars, expand by default
          const shouldAutoExpand = shortDataLength < 200;
          const isExpanded = actionDoneExpanded[actionKey] !== undefined 
            ? actionDoneExpanded[actionKey] 
            : shouldAutoExpand;
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

Perfect! Both changes have been implemented successfully. Here's what was updated:

## Changes Made:

### 1. Removed Notification Message ✓
- **Before**: When clicking an action, you'd see: "Action 'o3cl_init' selected. Click 'Send' to execute."
- **After**: No notification appears, the action is just silently selected and (if it has a "done" config) the report loads

### 2. Auto-Expand Short Content ✓
- **Before**: Reports always started collapsed (short view)
- **After**: If the short content is **less than 200 characters**, it automatically expands to show the full report
- If the content is **200+ characters**, it starts collapsed with the "Show more" button
- The logic now checks: `shortDataLength < 200` to determine if it should auto-expand

### How It Works Now:

1. **Click action button** → Action selected (highlighted), report loads if "done" config exists
2. **If report content < 200 chars** → Shows expanded (full) view automatically
3. **If report content ≥ 200 chars** → Shows collapsed (short) view with "Show more" button
4. **Click "Send"** → Executes the action and updates the report

Build completed successfully! ✓

---

**User**

i have this error in console

DpeModal.tsx?t=1759922008442:321 Sending data to dpe_quota: Object
DpeModal.tsx?t=1759922008442:322 JSON body being sent: {"id":"9d5f7fcc-a420-11f0-a0d7-0a58a9feac02","status":1}
DpeModal.tsx?t=1759922008442:840 Action "o3cl_init" done data: Object
DpeModal.tsx?t=1759922106274:840 Action "o3cl_init" done data: Object
DpeModal.tsx?t=1759922116243:840 Action "o3cl_init" done data: Object
DpeModal.tsx?t=1759922144797:840 Action "o3cl_init" done data: Object
DpeModal.tsx?t=1759922212400:840 Action "o3cl_init" done data: Object
DpeModal.tsx:981 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at DpeModal.tsx:981:64
    at Array.map (<anonymous>)
    at renderActionsTab (DpeModal.tsx:968:41)
    at DpeModal (DpeModal.tsx:1888:17)
    at renderWithHooks (chunk-ERKY3CUC.js?v=6fc83c47:11548:26)
    at updateFunctionComponent (chunk-ERKY3CUC.js?v=6fc83c47:14582:28)
    at beginWork (chunk-ERKY3CUC.js?v=6fc83c47:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-ERKY3CUC.js?v=6fc83c47:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-ERKY3CUC.js?v=6fc83c47:3699:24)
    at invokeGuardedCallback (chunk-ERKY3CUC.js?v=6fc83c47:3733:39)
DpeModal.tsx:981 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at DpeModal.tsx:981:64
    at Array.map (<anonymous>)
    at renderActionsTab (DpeModal.tsx:968:41)
    at DpeModal (DpeModal.tsx:1888:17)
    at renderWithHooks (chunk-ERKY3CUC.js?v=6fc83c47:11548:26)
    at updateFunctionComponent (chunk-ERKY3CUC.js?v=6fc83c47:14582:28)
    at beginWork (chunk-ERKY3CUC.js?v=6fc83c47:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-ERKY3CUC.js?v=6fc83c47:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-ERKY3CUC.js?v=6fc83c47:3699:24)
    at invokeGuardedCallback (chunk-ERKY3CUC.js?v=6fc83c47:3733:39)
hook.js:608 The above error occurred in the <DpeModal> component:

    at DpeModal (http://localhost:5173/@fs/Volumes/privateGg/ai-microfront-ant/packages/dpe-modal/src/DpeModal.tsx?t=1759922237146:25:28)
    at div
    at div
    at http://localhost:5173/node_modules/.vite/deps/antd.js?v=6fc83c47:48084:16
    at DpeList (http://localhost:5173/src/components/DpeList.tsx?t=1759921934508:27:27)
    at div
    at div
    at AppContent (http://localhost:5173/src/App.tsx?t=1759921934508:25:37)
    at EnvironmentProvider (http://localhost:5173/@fs/Volumes/privateGg/ai-microfront-ant/packages/top-menu/src/EnvironmentContext.tsx:21:39)
    at App

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
overrideMethod @ hook.js:608
DpeModal.tsx:981 Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'length')
    at DpeModal.tsx:981:64
    at Array.map (<anonymous>)
    at renderActionsTab (DpeModal.tsx:968:41)
    at DpeModal (DpeModal.tsx:1888:17)
    at renderWithHooks (chunk-ERKY3CUC.js?v=6fc83c47:11548:26)
    at updateFunctionComponent (chunk-ERKY3CUC.js?v=6fc83c47:14582:28)
    at beginWork (chunk-ERKY3CUC.js?v=6fc83c47:15924:22)
    at beginWork$1 (chunk-ERKY3CUC.js?v=6fc83c47:19753:22)
    at performUnitOfWork (chunk-ERKY3CUC.js?v=6fc83c47:19198:20)
    at workLoopSync (chunk-ERKY3CUC.js?v=6fc83c47:19137:13)
DpeModal.tsx:771 Action "o3cl_init" received simple error response, retrying in 2000ms... (attempt 1/5)
DpeModal.tsx:771 Action "o3cl_init" received simple error response, retrying in 2000ms... (attempt 2/5)
DpeModal.tsx:771 Action "o3cl_init" received simple error response, retrying in 2000ms... (attempt 3/5)
DpeModal.tsx:771 Action "o3cl_init" received simple error response, retrying in 2000ms... (attempt 4/5)
DpeModal.tsx:771 Action "o3cl_init" received simple error response, retrying in 2000ms... (attempt 5/5)
DpeModal.tsx:788 Action "o3cl_init" max retries reached, showing error response: {error: 'Log not found'}
DpeModal.tsx:981 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at DpeModal.tsx:981:64
    at Array.map (<anonymous>)
    at renderActionsTab (DpeModal.tsx:968:41)
    at DpeModal (DpeModal.tsx:1888:17)
    at renderWithHooks (chunk-ERKY3CUC.js?v=6fc83c47:11548:26)
    at updateFunctionComponent (chunk-ERKY3CUC.js?v=6fc83c47:14582:28)
    at beginWork (chunk-ERKY3CUC.js?v=6fc83c47:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-ERKY3CUC.js?v=6fc83c47:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-ERKY3CUC.js?v=6fc83c47:3699:24)
    at invokeGuardedCallback (chunk-ERKY3CUC.js?v=6fc83c47:3733:39)
(anonymous) @ DpeModal.tsx:981
renderActionsTab @ DpeModal.tsx:968
DpeModal @ DpeModal.tsx:1888
renderWithHooks @ chunk-ERKY3CUC.js?v=6fc83c47:11548
updateFunctionComponent @ chunk-ERKY3CUC.js?v=6fc83c47:14582
beginWork @ chunk-ERKY3CUC.js?v=6fc83c47:15924
callCallback2 @ chunk-ERKY3CUC.js?v=6fc83c47:3674
invokeGuardedCallbackDev @ chunk-ERKY3CUC.js?v=6fc83c47:3699
invokeGuardedCallback @ chunk-ERKY3CUC.js?v=6fc83c47:3733
beginWork$1 @ chunk-ERKY3CUC.js?v=6fc83c47:19765
performUnitOfWork @ chunk-ERKY3CUC.js?v=6fc83c47:19198
workLoopSync @ chunk-ERKY3CUC.js?v=6fc83c47:19137
renderRootSync @ chunk-ERKY3CUC.js?v=6fc83c47:19116
performConcurrentWorkOnRoot @ chunk-ERKY3CUC.js?v=6fc83c47:18678
workLoop @ chunk-ERKY3CUC.js?v=6fc83c47:197
flushWork @ chunk-ERKY3CUC.js?v=6fc83c47:176
performWorkUntilDeadline @ chunk-ERKY3CUC.js?v=6fc83c47:384
DpeModal.tsx:981 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at DpeModal.tsx:981:64
    at Array.map (<anonymous>)
    at renderActionsTab (DpeModal.tsx:968:41)
    at DpeModal (DpeModal.tsx:1888:17)
    at renderWithHooks (chunk-ERKY3CUC.js?v=6fc83c47:11548:26)
    at updateFunctionComponent (chunk-ERKY3CUC.js?v=6fc83c47:14582:28)
    at beginWork (chunk-ERKY3CUC.js?v=6fc83c47:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-ERKY3CUC.js?v=6fc83c47:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-ERKY3CUC.js?v=6fc83c47:3699:24)
    at invokeGuardedCallback (chunk-ERKY3CUC.js?v=6fc83c47:3733:39)
(anonymous) @ DpeModal.tsx:981
renderActionsTab @ DpeModal.tsx:968
DpeModal @ DpeModal.tsx:1888
renderWithHooks @ chunk-ERKY3CUC.js?v=6fc83c47:11548
updateFunctionComponent @ chunk-ERKY3CUC.js?v=6fc83c47:14582
beginWork @ chunk-ERKY3CUC.js?v=6fc83c47:15924
callCallback2 @ chunk-ERKY3CUC.js?v=6fc83c47:3674
invokeGuardedCallbackDev @ chunk-ERKY3CUC.js?v=6fc83c47:3699
invokeGuardedCallback @ chunk-ERKY3CUC.js?v=6fc83c47:3733
beginWork$1 @ chunk-ERKY3CUC.js?v=6fc83c47:19765
performUnitOfWork @ chunk-ERKY3CUC.js?v=6fc83c47:19198
workLoopSync @ chunk-ERKY3CUC.js?v=6fc83c47:19137
renderRootSync @ chunk-ERKY3CUC.js?v=6fc83c47:19116
recoverFromConcurrentError @ chunk-ERKY3CUC.js?v=6fc83c47:18736
performConcurrentWorkOnRoot @ chunk-ERKY3CUC.js?v=6fc83c47:18684
workLoop @ chunk-ERKY3CUC.js?v=6fc83c47:197
flushWork @ chunk-ERKY3CUC.js?v=6fc83c47:176
performWorkUntilDeadline @ chunk-ERKY3CUC.js?v=6fc83c47:384
hook.js:608 The above error occurred in the <DpeModal> component:

    at DpeModal (http://localhost:5173/@fs/Volumes/privateGg/ai-microfront-ant/packages/dpe-modal/src/DpeModal.tsx?t=1759922265591:25:28)
    at div
    at div
    at http://localhost:5173/node_modules/.vite/deps/antd.js?v=6fc83c47:48084:16
    at DpeList (http://localhost:5173/src/components/DpeList.tsx?t=1759921934508:27:27)
    at div
    at div
    at AppContent (http://localhost:5173/src/App.tsx?t=1759921934508:25:37)
    at EnvironmentProvider (http://localhost:5173/@fs/Volumes/privateGg/ai-microfront-ant/packages/top-menu/src/EnvironmentContext.tsx:21:39)
    at App

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
overrideMethod @ hook.js:608
logCapturedError @ chunk-ERKY3CUC.js?v=6fc83c47:14032
update.callback @ chunk-ERKY3CUC.js?v=6fc83c47:14052
callCallback @ chunk-ERKY3CUC.js?v=6fc83c47:11248
commitUpdateQueue @ chunk-ERKY3CUC.js?v=6fc83c47:11265
commitLayoutEffectOnFiber @ chunk-ERKY3CUC.js?v=6fc83c47:17093
commitLayoutMountEffects_complete @ chunk-ERKY3CUC.js?v=6fc83c47:17980
commitLayoutEffects_begin @ chunk-ERKY3CUC.js?v=6fc83c47:17969
commitLayoutEffects @ chunk-ERKY3CUC.js?v=6fc83c47:17920
commitRootImpl @ chunk-ERKY3CUC.js?v=6fc83c47:19353
commitRoot @ chunk-ERKY3CUC.js?v=6fc83c47:19277
finishConcurrentRender @ chunk-ERKY3CUC.js?v=6fc83c47:18760
performConcurrentWorkOnRoot @ chunk-ERKY3CUC.js?v=6fc83c47:18718
workLoop @ chunk-ERKY3CUC.js?v=6fc83c47:197
flushWork @ chunk-ERKY3CUC.js?v=6fc83c47:176
performWorkUntilDeadline @ chunk-ERKY3CUC.js?v=6fc83c47:384
chunk-ERKY3CUC.js?v=6fc83c47:19413 Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at DpeModal.tsx:981:64
    at Array.map (<anonymous>)
    at renderActionsTab (DpeModal.tsx:968:41)
    at DpeModal (DpeModal.tsx:1888:17)
    at renderWithHooks (chunk-ERKY3CUC.js?v=6fc83c47:11548:26)
    at updateFunctionComponent (chunk-ERKY3CUC.js?v=6fc83c47:14582:28)
    at beginWork (chunk-ERKY3CUC.js?v=6fc83c47:15924:22)
    at beginWork$1 (chunk-ERKY3CUC.js?v=6fc83c47:19753:22)
    at performUnitOfWork (chunk-ERKY3CUC.js?v=6fc83c47:19198:20)
    at workLoopSync (chunk-ERKY3CUC.js?v=6fc83c47:19137:13)
(anonymous) @ DpeModal.tsx:981
renderActionsTab @ DpeModal.tsx:968
DpeModal @ DpeModal.tsx:1888
renderWithHooks @ chunk-ERKY3CUC.js?v=6fc83c47:11548
updateFunctionComponent @ chunk-ERKY3CUC.js?v=6fc83c47:14582
beginWork @ chunk-ERKY3CUC.js?v=6fc83c47:15924
beginWork$1 @ chunk-ERKY3CUC.js?v=6fc83c47:19753
performUnitOfWork @ chunk-ERKY3CUC.js?v=6fc83c47:19198
workLoopSync @ chunk-ERKY3CUC.js?v=6fc83c47:19137
renderRootSync @ chunk-ERKY3CUC.js?v=6fc83c47:19116
recoverFromConcurrentError @ chunk-ERKY3CUC.js?v=6fc83c47:18736
performConcurrentWorkOnRoot @ chunk-ERKY3CUC.js?v=6fc83c47:18684
workLoop @ chunk-ERKY3CUC.js?v=6fc83c47:197
flushWork @ chunk-ERKY3CUC.js?v=6fc83c47:176
performWorkUntilDeadline @ chunk-ERKY3CUC.js?v=6fc83c47:384

?

---

**Cursor**

```javascript
shortDataLength = JSON.stringify(shortData, null, 2).length;
```

I see the error! Line 981 is trying to read `.length` on something that's undefined. The issue is in the code where I calculate `shortDataLength`. Let me fix that:

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined, SendOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
      setSelectedAction(null);
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Just select the action, don't send it yet
    setSelectedAction({ key: actionKey, config: actionConfig });
    
    // If action has "done" config, load the report immediately
    if (actionConfig.done) {
      handleLoadReport(actionKey, actionConfig);
    }
  };

  const handleSendAction = async () => {
    if (!selectedAction || !dpeItem?.id) {
      message.error('No action selected or DPE ID available');
      return;
    }

    const { key: actionKey, config: actionConfig } = selectedAction;

    // Clear/reset all previous action done data when sending
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  const handleLoadReport = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id || !actionConfig.done) {
      message.error('No DPE ID available or action has no report configuration');
      return;
    }

    // Load report directly without sending action
    pollActionDone(actionKey, actionConfig.done);
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                  type={selectedAction?.key === actionKey ? 'primary' : 'default'}
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Send Button */}
        {selectedAction && (
          <Card style={{ marginTop: 16, backgroundColor: '#f0f5ff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Selected Action: {selectedAction.key}</Text>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendAction}
                size="large"
              >
                Send Action
              </Button>
            </Space>
          </Card>
        )}

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          let shortDataLength = 0;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
            const stringified = JSON.stringify(shortData, null, 2);
            shortDataLength = stringified ? stringified.length : 0;
          }
          
          // If content is less than 200 chars, expand by default
          const shouldAutoExpand = shortDataLength < 200;
          const isExpanded = actionDoneExpanded[actionKey] !== undefined 
            ? actionDoneExpanded[actionKey] 
            : shouldAutoExpand;
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

Perfect! The error is fixed. Here's what was causing the problem and how I resolved it:

## Issue
Line 981 was trying to call `.length` on `undefined`:
```javascript
shortDataLength = JSON.stringify(shortData, null, 2).length;
```

The problem: When `shortData` is `null` or `undefined`, `JSON.stringify()` can return `undefined`, and calling `.length` on `undefined` throws an error.

## Solution
Added a safety check:
```javascript
const stringified = JSON.stringify(shortData, null, 2);
shortDataLength = stringified ? stringified.length : 0;
```

Now:
- If the data exists → calculates the actual length
- If the data is null/undefined → defaults to `0`
- With length `0`, the content will auto-expand to show full data (since 0 < 200)

Build completed successfully! ✓

The error should no longer appear in your console.

```javascript
shortDataLength = JSON.stringify(shortData, null, 2).length;
```

```javascript
const stringified = JSON.stringify(shortData, null, 2);
shortDataLength = stringified ? stringified.length : 0;
```

---

**User**

good
just : when clicking from action to action : need to reset/reinit the report 

---

**Cursor**

I'll modify the code to reset the report when switching between actions:

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined, SendOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
      setSelectedAction(null);
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Reset/clear all previous action done data when switching actions
    setActionDoneData({});
    setActionDoneExpanded({});

    // Just select the action, don't send it yet
    setSelectedAction({ key: actionKey, config: actionConfig });
    
    // If action has "done" config, load the report immediately
    if (actionConfig.done) {
      handleLoadReport(actionKey, actionConfig);
    }
  };

  const handleSendAction = async () => {
    if (!selectedAction || !dpeItem?.id) {
      message.error('No action selected or DPE ID available');
      return;
    }

    const { key: actionKey, config: actionConfig } = selectedAction;

    // Clear/reset all previous action done data when sending
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  const handleLoadReport = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id || !actionConfig.done) {
      message.error('No DPE ID available or action has no report configuration');
      return;
    }

    // Load report directly without sending action
    pollActionDone(actionKey, actionConfig.done);
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                  type={selectedAction?.key === actionKey ? 'primary' : 'default'}
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Send Button */}
        {selectedAction && (
          <Card style={{ marginTop: 16, backgroundColor: '#f0f5ff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Selected Action: {selectedAction.key}</Text>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendAction}
                size="large"
              >
                Send Action
              </Button>
            </Space>
          </Card>
        )}

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          let shortDataLength = 0;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
            const stringified = JSON.stringify(shortData, null, 2);
            shortDataLength = stringified ? stringified.length : 0;
          }
          
          // If content is less than 200 chars, expand by default
          const shouldAutoExpand = shortDataLength < 200;
          const isExpanded = actionDoneExpanded[actionKey] !== undefined 
            ? actionDoneExpanded[actionKey] 
            : shouldAutoExpand;
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

Perfect! ✓ 

Now when you click from one action to another action:
1. **Previous report is cleared** - `setActionDoneData({})` and `setActionDoneExpanded({})` reset all report data
2. **New action is selected** - The clicked action becomes highlighted
3. **New report loads** - If the action has a "done" config, its report loads fresh

This ensures a clean transition between actions without any leftover data from the previous action.

Build completed successfully!

---

**User**

under title "Selected Action: ..."
also show the tooltip, not bold

---

**Cursor**

I'll add the tooltip display under the selected action title:

```typescriptreact
import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Spin, message, Typography, Table, Button, Input, Tag, Space, Collapse, Descriptions, Divider, Timeline, Dropdown, InputNumber } from 'antd';
import * as Icons from '@ant-design/icons';
import { DpeModalProps, QuotaStatus, InfoItem } from './types';
import cdconfig from '../../../apps/dpes/cdconfig.json';
import { waitForAccessToken, invalidateTokenCache } from './auth';

const { Title, Text } = Typography;
const { EditOutlined, ReloadOutlined, EyeOutlined, ClockCircleOutlined, MenuOutlined, LinkOutlined, SendOutlined } = Icons;

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
  const [actionDoneData, setActionDoneData] = useState<{ [key: string]: { loading: boolean; data: any; error?: string } }>({});
  const [actionDoneExpanded, setActionDoneExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedAction, setSelectedAction] = useState<{ key: string; config: any } | null>(null);

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

  // Clear action done data when modal opens
  useEffect(() => {
    if (visible) {
      setActionDoneData({});
      setActionDoneExpanded({});
      setSelectedAction(null);
    }
  }, [visible]);

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Use the API base URL from environment
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      const fullUrl = `${apiBaseUrl}/backoffice/dpe_quota?ref_ademe=${dpeItem.id}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        setLoading(false);
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setLogsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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
    
    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      setDetailsLoading(false);
      return;
    }
    
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
          'authorization': `Bearer ${accessToken}`,
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

      if (response.status === 401) {
        invalidateTokenCache();
        message.error('Session expired. Please refresh the page and log in again.');
        return;
      }

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

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      throw new Error('Authentication token not found. Please log in again.');
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
        'authorization': `Bearer ${accessToken}`,
        'x-authorization': 'dperdition'
      },
      body: JSON.stringify(recordData)
    });

    if (response.status === 401) {
      invalidateTokenCache();
      throw new Error('Session expired. Please refresh the page and log in again.');
    }

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

  // Helper function to get current environment
  const getEnvironment = (): string => {
    const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
    return useDevEnvironment ? "dev" : "stg";
  };

  // Helper function to extract value from JSON using path (e.g., "user.address.city")
  const getJsonValueByPath = (obj: any, path: string | undefined): any => {
    if (!path || typeof path !== 'string') return obj;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return undefined;
      }
    }
    return result;
  };

  // Helper function to check if response is a simple error object that needs retry
  const isSimpleErrorResponse = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check if it's a simple object with only one key like {"error": "*"}
    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'error') {
      return true;
    }
    
    // You can add more conditions here if needed
    return false;
  };

  // Function to poll action completion status
  const pollActionDone = async (actionKey: string, doneConfig: any, retryCount: number = 0) => {
    if (!dpeItem?.id) return;

    const { data_source, key_suffix } = doneConfig;
    const MAX_RETRIES = parseInt(import.meta.env.VITE_RETRIES || '5', 10); // Maximum number of retries from env
    const RETRY_INTERVAL = 2000; // 2 seconds between retries
    
    // Set loading state
    setActionDoneData(prev => ({
      ...prev,
      [actionKey]: { loading: true, data: null }
    }));

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpointConfig = (cdconfig?.endpoints as any)?.[data_source];
      if (!endpointConfig || !endpointConfig.url) {
        throw new Error(`Endpoint "${data_source}" not found in config`);
      }
      
      const endpoint = endpointConfig.url;
      
      // Build the log parameter: {environment}_{key_suffix}
      const environment = getEnvironment();
      const logParam = `${environment}_${key_suffix}`;
      
      // Build full URL with query parameters
      const url = new URL(endpoint, apiBaseUrl);
      url.searchParams.append('ref_ademe', dpeItem.id);
      url.searchParams.append('log', logParam);
      
      // Get access token
      const accessToken = await waitForAccessToken();
      if (!accessToken) {
        throw new Error('Authentication token not found');
      }

      // Poll the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        }
      });

      if (response.status === 401) {
        invalidateTokenCache();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if response is a simple error object that needs retry
      if (isSimpleErrorResponse(data) && retryCount < MAX_RETRIES) {
        console.log(`Action "${actionKey}" received simple error response, retrying in ${RETRY_INTERVAL}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Schedule retry after interval
        setTimeout(() => {
          pollActionDone(actionKey, doneConfig, retryCount + 1);
        }, RETRY_INTERVAL);
        
        return; // Keep loading state
      }
      
      // Update state with data (even if it's still an error response after max retries)
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data }
      }));
      
      if (isSimpleErrorResponse(data)) {
        console.log(`Action "${actionKey}" max retries reached, showing error response:`, data);
      } else {
        console.log(`Action "${actionKey}" done data:`, data);
      }
    } catch (error) {
      // Update state with error
      setActionDoneData(prev => ({
        ...prev,
        [actionKey]: { loading: false, data: null, error: String(error) }
      }));
      console.error(`Error polling action "${actionKey}":`, error);
    }
  };

  const handleActionClick = (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id) {
      message.error('No DPE ID available');
      return;
    }

    // Reset/clear all previous action done data when switching actions
    setActionDoneData({});
    setActionDoneExpanded({});

    // Just select the action, don't send it yet
    setSelectedAction({ key: actionKey, config: actionConfig });
    
    // If action has "done" config, load the report immediately
    if (actionConfig.done) {
      handleLoadReport(actionKey, actionConfig);
    }
  };

  const handleSendAction = async () => {
    if (!selectedAction || !dpeItem?.id) {
      message.error('No action selected or DPE ID available');
      return;
    }

    const { key: actionKey, config: actionConfig } = selectedAction;

    // Clear/reset all previous action done data when sending
    setActionDoneData({});
    setActionDoneExpanded({});

    // Get access token with retry
    const accessToken = await waitForAccessToken();
    if (!accessToken) {
      message.error('Authentication token not found. Please log in again.');
      return;
    }

    try {
      // Get API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
      
      // Get endpoint from config
      const endpoint = cdconfig?.endpoints?.tasks?.url || '/backoffice/send_task';
      const fullUrl = `${apiBaseUrl}${endpoint}`;
      
      // Prepare request body
      const requestBody = {
        task_name: actionConfig.task_name,
        payload: {
          ref_ademe: dpeItem.id
        }
      };

      message.loading({ content: `Executing ${actionKey}...`, key: actionKey });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json',
          'authorization': `Bearer ${accessToken}`,
          'x-authorization': 'dperdition'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        invalidateTokenCache();
        message.error({ content: 'Session expired. Please refresh the page and log in again.', key: actionKey, duration: 5 });
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      message.success({ content: `Action "${actionKey}" sent successfully`, key: actionKey, duration: 3 });
      console.log('Action response:', data);

      // Check if action has "done" configuration for polling
      if (actionConfig.done) {
        pollActionDone(actionKey, actionConfig.done);
      }
    } catch (error) {
      message.error({ content: `Failed to execute action "${actionKey}": ${error}`, key: actionKey, duration: 5 });
      console.error(`Error executing action ${actionKey}:`, error);
    }
  };

  const handleLoadReport = async (actionKey: string, actionConfig: any) => {
    if (!dpeItem?.id || !actionConfig.done) {
      message.error('No DPE ID available or action has no report configuration');
      return;
    }

    // Load report directly without sending action
    pollActionDone(actionKey, actionConfig.done);
  };

  // Helper function to get icon component dynamically from icon name string
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    
    // Dynamically get the icon component from the Icons object
    const IconComponent = (Icons as any)[iconName];
    
    if (!IconComponent) {
      console.warn(`Icon "${iconName}" not found in @ant-design/icons`);
      return null;
    }
    
    return <IconComponent />;
  };

  const renderActionsTab = () => {
    const actions = cdconfig?.actions || {};
    const actionEntries = Object.entries(actions);

    // Filter actions based on visibility (for now using "all" property)
    const visibleActions = actionEntries.filter(([key, actionConfig]: [string, any]) => {
      const visibility = actionConfig?.visibility;
      return visibility && visibility.all === true;
    });

    return (
      <div>
        <Title level={4}>Actions</Title>
        <Card>
          {visibleActions.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No actions available for DPE ID: {dpeItem?.id}</Text>
            </div>
          ) : (
            <Space direction="horizontal" style={{ width: '100%', flexWrap: 'wrap' }} size="middle">
              {visibleActions.map(([actionKey, actionConfig]: [string, any]) => (
                <Button
                  key={actionKey}
                  icon={getIconComponent(actionConfig.icon)}
                  onClick={() => handleActionClick(actionKey, actionConfig)}
                  title={actionConfig.tooltip || ''}
                  size="small"
                  type={selectedAction?.key === actionKey ? 'primary' : 'default'}
                >
                  {actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}
                </Button>
              ))}
            </Space>
          )}
        </Card>

        {/* Send Button */}
        {selectedAction && (
          <Card style={{ marginTop: 16, backgroundColor: '#f0f5ff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Selected Action: {selectedAction.key}</Text>
                {selectedAction.config.tooltip && (
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">{selectedAction.config.tooltip}</Text>
                  </div>
                )}
              </div>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendAction}
                size="large"
              >
                Send Action
              </Button>
            </Space>
          </Card>
        )}

        {/* Display polling status for actions with "done" configuration */}
        {Object.entries(actionDoneData).map(([actionKey, doneData]) => {
          const actionConfig = actions[actionKey as keyof typeof actions];
          const keySuffix = (actionConfig as any)?.done?.key_suffix || actionKey;
          const reportShort = (actionConfig as any)?.done?.report_short;
          
          // Extract short data if report_short is defined
          let displayData = doneData.data;
          let shortData = null;
          let shortDataLength = 0;
          if (reportShort && doneData.data) {
            // Handle report_short as array or string
            const path = Array.isArray(reportShort) ? reportShort[0] : reportShort;
            shortData = getJsonValueByPath(doneData.data, path);
            const stringified = JSON.stringify(shortData, null, 2);
            shortDataLength = stringified ? stringified.length : 0;
          }
          
          // If content is less than 200 chars, expand by default
          const shouldAutoExpand = shortDataLength < 200;
          const isExpanded = actionDoneExpanded[actionKey] !== undefined 
            ? actionDoneExpanded[actionKey] 
            : shouldAutoExpand;
          
          return (
            <Card key={actionKey} style={{ marginTop: 16 }}>
              <Title level={5}>{keySuffix}</Title>
              {doneData.loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin tip="Loading data...">
                    <div style={{ minHeight: 50 }} />
                  </Spin>
                </div>
              ) : doneData.error ? (
                <div style={{ padding: 10 }}>
                  <Text type="danger">Error: {doneData.error}</Text>
                </div>
              ) : doneData.data ? (
                <div style={{ padding: 10 }}>
                  {/* Show short version if report_short is defined and not expanded */}
                  {reportShort && !isExpanded ? (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(shortData, null, 2)}
                      </pre>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: true }))}
                        style={{ marginTop: 8 }}
                      >
                        Show more
                      </Button>
                    </>
                  ) : (
                    <>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: 10, 
                        borderRadius: 4, 
                        maxHeight: 400, 
                        overflow: 'auto',
                        fontSize: 12
                      }}>
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                      {reportShort && (
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setActionDoneExpanded(prev => ({ ...prev, [actionKey]: false }))}
                          style={{ marginTop: 8 }}
                        >
                          Show less
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    );
  };

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

  const handleDemoLinkClick = () => {
    if (dpeItem?.id) {
      const demoUrl = `https://demo.ledpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(demoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAppLinkClick = () => {
    if (dpeItem?.id) {
      const appUrl = `https://app.checkdpe.fr/#/dashboard/${dpeItem.id}`;
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const dropdownMenuItems = [
    {
      key: 'simulation',
      label: 'Simulation',
      icon: <LinkOutlined />,
      onClick: handleExternalLinkClick,
    },
    {
      key: 'demo',
      label: 'Demo',
      icon: <LinkOutlined />,
      onClick: handleDemoLinkClick,
    },
    {
      key: 'app',
      label: 'App',
      icon: <LinkOutlined />,
      onClick: handleAppLinkClick,
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

  // Define all available tabs
  const allTabItems = [
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

  // Filter tabs based on visible_tabs config (using "all" property for now)
  const visibleTabsConfig = cdconfig?.visible_tabs || {};
  const tabItems = allTabItems.filter(tab => {
    const tabConfig = visibleTabsConfig[tab.key as keyof typeof visibleTabsConfig];
    // Show tab if config exists and "all" property is true
    return tabConfig && tabConfig.all === true;
  });

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

Perfect! ✓

Now when you select an action, you'll see:

**Selected Action: o3cl_init**
<span style="color: gray">ext_o3cl_managing.ademe_run: Run the o3cl</span>

The tooltip text is displayed:
- **Under** the "Selected Action" title
- In **secondary text style** (not bold, lighter gray color)
- With a small margin-top for spacing

Build completed successfully!

