const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Test runner APIs
  runTests: () => ipcRenderer.invoke('run-tests'),
  
  // Database APIs
  connectDatabases: () => ipcRenderer.invoke('connect-databases'),
  getDatabaseList: () => ipcRenderer.invoke('get-database-list'),
  getDatabaseDocuments: (dbName) => ipcRenderer.invoke('get-database-documents', dbName),
  disconnectDatabases: () => ipcRenderer.invoke('disconnect-databases'),
  refreshDatabases: () => ipcRenderer.invoke('refresh-databases'),
  addSampleData: () => ipcRenderer.invoke('add-sample-data'),
  getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),
  
  // Data retrieval APIs for dashboard
  getAllDashboardData: () => ipcRenderer.invoke('get-all-dashboard-data'),
  getAllIntentions: () => ipcRenderer.invoke('get-all-intentions'),
  getAllBlessings: () => ipcRenderer.invoke('get-all-blessings'),
  getAllOfferings: () => ipcRenderer.invoke('get-all-offerings'),
  getAllAttentionSwitches: () => ipcRenderer.invoke('get-all-attention-switches'),
  getAllProofsOfService: () => ipcRenderer.invoke('get-all-proofs-of-service'),
  
  // Event listeners
  onDatabasesConnected: (callback) => ipcRenderer.on('databases-connected', callback),
  onDatabasesConnectionFailed: (callback) => ipcRenderer.on('databases-connection-failed', callback),
  onDatabaseUpdated: (callback) => ipcRenderer.on('database-updated', callback),
  
  // Navigation APIs
  navigateTo: (page) => ipcRenderer.invoke('navigate-to', page),
  
  // Core engine APIs
  setIntention: (params) => ipcRenderer.invoke('set-intention', params),
  switchAttention: (params) => ipcRenderer.invoke('switch-attention', params),
  getCurrentAttention: (userId) => ipcRenderer.invoke('get-current-attention', userId),
  calculateBlessingDuration: (blessingId) => ipcRenderer.invoke('calculate-blessing-duration', blessingId),
  calculateGratitudePotential: (params) => ipcRenderer.invoke('calculate-gratitude-potential', params),
  
  // Offerings APIs
  createOffering: (params) => ipcRenderer.invoke('create-offering', params),
  bidOnOffering: (params) => ipcRenderer.invoke('bid-on-offering', params),
  acceptOfferingBids: (params) => ipcRenderer.invoke('accept-offering-bids', params),
  
  // Proof of Service APIs
  postProofOfService: (params) => ipcRenderer.invoke('post-proof-of-service', params),
  assignBlessing: (params) => ipcRenderer.invoke('assign-blessing', params)
})