import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow
let orbitdb = null
let databases = null
let isConnecting = false

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  // Start with the main app (v3 dashboard)
  mainWindow.loadFile(path.join(__dirname, 'app-v3.html'))
  
  // Open DevTools in development
  mainWindow.webContents.openDevTools()
  
  // Auto-connect to databases when window is ready
  mainWindow.webContents.once('dom-ready', () => {
    initializeDatabases()
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', async () => {
  if (orbitdb) {
    console.log('Shutting down OrbitDB...')
    await stopOrbitDB(orbitdb)
  }
})

// Setup event listeners for database changes
function setupDatabaseEventListeners() {
  if (!databases) return
  
  console.log('Setting up database event listeners for real-time updates...')
  
  // Listen for database updates and notify renderer
  Object.entries(databases).forEach(([dbName, db]) => {
    console.log(`Setting up listeners for ${dbName} database`)
    
    // Listen for new entries/updates
    db.events.on('write', (address, entry) => {
      console.log(`Database update: ${dbName} - new entry`)
      
      // Notify renderer about the specific database update
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('database-updated', {
          database: dbName,
          operation: 'write',
          entry: entry
        })
      }
    })
    
    // Listen for database replication (when syncing with peers)
    db.events.on('replicated', (address) => {
      console.log(`Database replicated: ${dbName}`)
      
      // Notify renderer about replication
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('database-updated', {
          database: dbName,
          operation: 'replicated'
        })
      }
    })
    
    // Listen for database joins (when peers connect)
    db.events.on('join', (peerId, heads) => {
      console.log(`Peer joined ${dbName}: ${peerId}`)
      
      // Notify renderer about peer join
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('database-updated', {
          database: dbName,
          operation: 'peer-joined',
          peerId: peerId
        })
      }
    })
  })
  
  console.log('Database event listeners set up successfully')
}

// Initialize persistent databases
async function initializeDatabases() {
  if (isConnecting || databases) {
    console.log('Database initialization already in progress or completed')
    return
  }
  
  isConnecting = true
  console.log('Auto-connecting to persistent databases...')
  
  try {
    // Use a simpler, more reliable OrbitDB setup with consistent identity
    orbitdb = await startOrbitDB({ 
      directory: './synchronicity-orbitdb',
      id: 'synchronicity-main' // Use consistent identity
    })
    
    // Load saved database addresses for persistence
    const fs = await import('fs/promises')
    const path = await import('path')
    const addressFile = path.join('./synchronicity-orbitdb', 'addresses.json')
    
    let savedAddresses = {}
    try {
      const data = await fs.readFile(addressFile, 'utf8')
      savedAddresses = JSON.parse(data)
      console.log('Found saved database addresses - connecting to persistent databases')
    } catch (error) {
      console.log('No saved addresses found - creating new databases')
    }
    
    // Open databases using saved addresses or create new ones
    databases = {}
    const dbNames = ['intentions', 'blessings', 'attentionSwitches', 'proofsOfService', 'offerings']
    const dbTypes = {
      intentions: 'documents',
      blessings: 'documents', 
      attentionSwitches: 'events',
      proofsOfService: 'events',
      offerings: 'documents'
    }
    
    for (const dbName of dbNames) {
      if (savedAddresses[dbName]) {
        // Connect to existing database
        databases[dbName] = await orbitdb.open(savedAddresses[dbName])
        console.log(`Connected to existing ${dbName} database`)
      } else {
        // Create new database
        databases[dbName] = await orbitdb.open(`synchronicity-${dbName}`, { type: dbTypes[dbName] })
        console.log(`Created new ${dbName} database`)
      }
    }
    
    // Save current addresses for future sessions
    const currentAddresses = {}
    for (const [name, db] of Object.entries(databases)) {
      currentAddresses[name] = db.address
    }
    
    try {
      await fs.mkdir('./synchronicity-orbitdb', { recursive: true })
      await fs.writeFile(addressFile, JSON.stringify(currentAddresses, null, 2))
      console.log('Saved database addresses for persistence')
    } catch (error) {
      console.warn('Failed to save addresses:', error.message)
    }
    
    // Wait for databases to sync
    console.log('Waiting for databases to sync...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('Databases connected successfully')
    
    // Set up event listeners for real-time updates
    setupDatabaseEventListeners()
    
    // Notify renderer that databases are ready
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('databases-connected')
    }
    
  } catch (error) {
    console.error('Failed to initialize databases:', error)
    
    // Notify renderer of connection failure
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('databases-connection-failed', error.message)
    }
  } finally {
    isConnecting = false
  }
}

// IPC handlers for test execution
ipcMain.handle('run-tests', async () => {
  console.log('Starting test execution...')
  return new Promise((resolve, reject) => {
    const testProcess = spawn('npm', ['run', 'test:run'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      shell: true // Add shell option for better compatibility
    })

    let output = ''
    let error = ''

    testProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    testProcess.stderr.on('data', (data) => {
      error += data.toString()
    })

    testProcess.on('close', (code) => {
      resolve({
        exitCode: code,
        stdout: output,
        stderr: error,
        success: code === 0
      })
    })

    testProcess.on('error', (err) => {
      reject(err)
    })

    // Add timeout as fallback
    setTimeout(() => {
      testProcess.kill()
      resolve({
        exitCode: -1,
        stdout: output,
        stderr: error + '\n[TIMEOUT] Test execution timed out after 60 seconds',
        success: false
      })
    }, 60000)
  })
})

// Database IPC handlers
ipcMain.handle('connect-databases', async () => {
  // Databases auto-connect on startup, but allow manual retry
  if (!databases && !isConnecting) {
    await initializeDatabases()
  }
  
  if (databases) {
    return {
      success: true,
      databases: Object.keys(databases).map(name => ({
        name,
        type: databases[name].type,
        address: databases[name].address
      }))
    }
  } else {
    return {
      success: false,
      error: 'Databases not available'
    }
  }
})

ipcMain.handle('get-connection-status', async () => {
  return {
    connected: !!databases,
    connecting: isConnecting
  }
})

ipcMain.handle('get-database-list', async () => {
  if (!databases) {
    return { connected: false, databases: [] }
  }
  
  try {
    const databaseInfo = await Promise.all(
      Object.entries(databases).map(async ([name, db]) => {
        let count = 0
        try {
          if (db.type === 'documents') {
            const allDocs = await db.all()
            count = allDocs.length
          } else {
            // For events, count entries
            const entries = []
            for await (const entry of db.iterator()) {
              entries.push(entry)
            }
            count = entries.length
          }
        } catch (err) {
          console.warn(`Error counting ${name}:`, err.message)
        }
        
        return {
          name,
          type: db.type,
          count,
          address: db.address
        }
      })
    )
    
    return { connected: true, databases: databaseInfo }
  } catch (error) {
    console.error('Error getting database list:', error)
    return { connected: false, databases: [] }
  }
})

ipcMain.handle('get-database-documents', async (event, databaseName) => {
  if (!databases || !databases[databaseName]) {
    return { error: 'Database not found or not connected' }
  }
  
  try {
    const db = databases[databaseName]
    const documents = []
    
    if (db.type === 'documents') {
      const allDocs = await db.all()
      for (const doc of allDocs) {
        documents.push({
          key: doc.key,
          value: doc.value,
          hash: doc.hash
        })
      }
    } else {
      // For events, iterate through entries
      for await (const entry of db.iterator()) {
        documents.push({
          key: entry.hash,
          value: entry.value,
          hash: entry.hash,
          timestamp: entry.payload?.timestamp
        })
      }
    }
    
    return { documents }
  } catch (error) {
    console.error(`Error getting documents from ${databaseName}:`, error)
    return { error: error.message }
  }
})

ipcMain.handle('disconnect-databases', async () => {
  try {
    if (orbitdb) {
      await stopOrbitDB(orbitdb)
      orbitdb = null
      databases = null
      isConnecting = false
      console.log('Disconnected from databases')
    }
    return { success: true }
  } catch (error) {
    console.error('Error disconnecting:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('refresh-databases', async () => {
  try {
    console.log('Refreshing databases...')
    
    // Disconnect existing databases
    if (orbitdb) {
      await stopOrbitDB(orbitdb)
      orbitdb = null
      databases = null
      isConnecting = false
    }
    
    // Reconnect to databases
    await initializeDatabases()
    
    return { success: true }
  } catch (error) {
    console.error('Error refreshing databases:', error)
    return { success: false, error: error.message }
  }
})

// Sample data handler
ipcMain.handle('add-sample-data', async () => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    console.log('Adding regenerative and spiritual sample data...')
    
    // Regenerative and spiritual intentions
    const sampleIntentions = [
      {
        _id: 'intention_001',
        title: 'Restore the sacred grove with native medicinal plants',
        blessings: ['blessing_sage_001', 'blessing_luna_001'],
        proofsOfService: [],
        attachedTokens: [],
        status: 'open',
        createdBy: 'sage_willow',
        createdAt: Date.now() - 7200000 // 2 hours ago
      },
      {
        _id: 'intention_002',
        title: 'Build community meditation labyrinth',
        blessings: ['blessing_river_001'],
        proofsOfService: [],
        attachedTokens: [],
        status: 'open',
        createdBy: 'river_stone',
        createdAt: Date.now() - 3600000 // 1 hour ago
      },
      {
        _id: 'intention_003',
        title: 'Establish seed library for heirloom varieties',
        blessings: ['blessing_dawn_001', 'blessing_forest_001'],
        proofsOfService: [],
        attachedTokens: [],
        status: 'open',
        createdBy: 'dawn_keeper',
        createdAt: Date.now() - 1800000 // 30 minutes ago
      },
      {
        _id: 'intention_004',
        title: 'Create healing sound bath sanctuary',
        blessings: [],
        proofsOfService: [],
        attachedTokens: [],
        status: 'open',
        createdBy: 'cosmic_heart',
        createdAt: Date.now() - 900000 // 15 minutes ago
      },
      {
        _id: 'intention_005',
        title: 'Organize monthly earth blessing ceremony',
        blessings: ['blessing_moon_001'],
        proofsOfService: [],
        attachedTokens: [],
        status: 'open',
        createdBy: 'moon_sister',
        createdAt: Date.now() - 600000 // 10 minutes ago
      }
    ]
    
    // Spiritual and regenerative blessings
    const sampleBlessings = [
      {
        _id: 'blessing_sage_001',
        userId: 'sage_willow',
        intentionId: 'intention_001',
        attentionIndex: 0,
        content: 'May this grove become a sanctuary where ancient plant wisdom flows through every leaf and root.',
        timestamp: Date.now() - 7200000,
        status: 'potential',
        stewardId: 'sage_willow'
      },
      {
        _id: 'blessing_luna_001',
        userId: 'luna_bright',
        intentionId: 'intention_001',
        attentionIndex: 1,
        content: 'Grateful to tend this sacred space where healing plants will flourish for generations.',
        timestamp: Date.now() - 5400000,
        status: 'potential',
        stewardId: 'luna_bright'
      },
      {
        _id: 'blessing_river_001',
        userId: 'river_stone',
        intentionId: 'intention_002',
        attentionIndex: 0,
        content: 'Each stone placed with intention, creating pathways for deep contemplation and inner peace.',
        timestamp: Date.now() - 3600000,
        status: 'active',
        stewardId: 'river_stone'
      },
      {
        _id: 'blessing_dawn_001',
        userId: 'dawn_keeper',
        intentionId: 'intention_003',
        attentionIndex: 0,
        content: 'Preserving the genetic wisdom of our ancestors, ensuring abundance for future generations.',
        timestamp: Date.now() - 1800000,
        status: 'potential',
        stewardId: 'dawn_keeper'
      },
      {
        _id: 'blessing_forest_001',
        userId: 'forest_heart',
        intentionId: 'intention_003',
        attentionIndex: 1,
        content: 'Each seed carries the memory of earth\'s abundance. Honored to be a keeper of this legacy.',
        timestamp: Date.now() - 1200000,
        status: 'potential',
        stewardId: 'forest_heart'
      },
      {
        _id: 'blessing_moon_001',
        userId: 'moon_sister',
        intentionId: 'intention_005',
        attentionIndex: 0,
        content: 'Calling in the sacred feminine to bless our beautiful earth with love and healing.',
        timestamp: Date.now() - 600000,
        status: 'active',
        stewardId: 'moon_sister'
      }
    ]
    
    // Attention switches for spiritual users
    const sampleAttentionSwitches = [
      {
        userId: 'sage_willow',
        intentionId: 'intention_001',
        timestamp: Date.now() - 7200000
      },
      {
        userId: 'luna_bright',
        intentionId: 'intention_001',
        timestamp: Date.now() - 5400000
      },
      {
        userId: 'river_stone',
        intentionId: 'intention_002',
        timestamp: Date.now() - 3600000
      },
      {
        userId: 'dawn_keeper',
        intentionId: 'intention_003',
        timestamp: Date.now() - 1800000
      },
      {
        userId: 'forest_heart',
        intentionId: 'intention_003',
        timestamp: Date.now() - 1200000
      },
      {
        userId: 'moon_sister',
        intentionId: 'intention_005',
        timestamp: Date.now() - 600000
      }
    ]
    
    // Regenerative and spiritual proofs of service
    const sampleProofsOfService = [
      {
        _id: 'proof_001',
        intentionId: 'intention_001',
        by: ['sage_willow', 'luna_bright'],
        content: 'Planted 12 native medicinal herbs including echinacea, calendula, and nettle. Created sacred spiral pattern.',
        media: ['ipfs://QmSacredGrovePhoto'],
        timestamp: Date.now() - 3600000
      },
      {
        _id: 'proof_002',
        intentionId: 'intention_002',
        by: ['river_stone'],
        content: 'Laid foundation stones for meditation labyrinth in seven-circuit classical pattern.',
        media: ['ipfs://QmLabyrinthProgress'],
        timestamp: Date.now() - 1800000
      }
    ]
    
    // Spiritual and regenerative offerings
    const sampleOfferings = [
      {
        _id: 'offering_001',
        title: 'Sacred Plant Medicine Workshop',
        description: 'Learn to work with local medicinal plants in ceremony and daily practice. We\'ll harvest, prepare tinctures, and share ancient plant wisdom.',
        time: '2024-12-20T14:00:00-08:00',
        place: 'Sacred Grove Sanctuary',
        slotsAvailable: 8,
        tokenOffers: [
          {
            userId: 'forest_heart',
            topToken: 'blessing_forest_001'
          },
          {
            userId: 'dawn_keeper',
            topToken: 'blessing_dawn_001'
          }
        ],
        selectedStewards: [],
        status: 'open'
      },
      {
        _id: 'offering_002',
        title: 'New Moon Ceremony & Sound Bath',
        description: 'Monthly gathering to honor the new moon with crystal singing bowls, intention setting, and community blessing circle.',
        time: '2024-12-30T19:00:00-08:00',
        place: 'Moonrise Meadow',
        slotsAvailable: 20,
        tokenOffers: [
          {
            userId: 'luna_bright',
            topToken: 'blessing_luna_001'
          }
        ],
        selectedStewards: [],
        status: 'open'
      },
      {
        _id: 'offering_003',
        title: 'Permaculture Design Intensive',
        description: 'Three-day deep dive into regenerative land design. Learn to read the landscape and create abundance through earth partnership.',
        time: '2025-01-15T09:00:00-08:00',
        place: 'Gaia Learning Center',
        slotsAvailable: 15,
        tokenOffers: [],
        selectedStewards: [],
        status: 'open'
      },
      {
        _id: 'offering_004',
        title: 'Seed Blessing & Exchange Circle',
        description: 'Seasonal gathering to bless heirloom seeds and share varieties. Includes seed starting workshop and community feast.',
        time: '2025-02-02T11:00:00-08:00',
        place: 'Community Garden Greenhouse',
        slotsAvailable: 25,
        tokenOffers: [
          {
            userId: 'sage_willow',
            topToken: 'blessing_sage_001'
          }
        ],
        selectedStewards: [],
        status: 'open'
      },
      {
        _id: 'offering_005',
        title: 'Earth Healing Meditation Retreat',
        description: 'Weekend retreat focusing on sending healing energy to damaged ecosystems. Includes forest bathing, earth prayers, and restoration work.',
        time: '2025-03-21T16:00:00-07:00',
        place: 'Redwood Restoration Site',
        slotsAvailable: 12,
        tokenOffers: [],
        selectedStewards: [],
        status: 'open'
      }
    ]
    
    // Add intentions
    for (const intention of sampleIntentions) {
      await databases.intentions.put(intention)
    }
    
    // Add blessings
    for (const blessing of sampleBlessings) {
      await databases.blessings.put(blessing)
    }
    
    // Add attention switches
    for (const attentionSwitch of sampleAttentionSwitches) {
      await databases.attentionSwitches.add(attentionSwitch)
    }
    
    // Add proofs of service
    for (const proof of sampleProofsOfService) {
      await databases.proofsOfService.add(proof)
    }
    
    // Add offerings
    for (const offering of sampleOfferings) {
      await databases.offerings.put(offering)
    }
    
    console.log('Realistic sample data added successfully')
    return { success: true }
    
  } catch (error) {
    console.error('Error adding sample data:', error)
    return { success: false, error: error.message }
  }
})

// Core engine handlers
ipcMain.handle('set-intention', async (event, params) => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const { setIntention } = await import('../src/lib/synchronicity-engine.js')
    
    const intentionParams = {
      userId: params.userId,
      title: params.title,
      databases: databases,
      timestamp: Date.now()
    }
    
    // Only add blessingContent if it's defined and not empty
    if (params.blessingContent && params.blessingContent.trim()) {
      intentionParams.blessingContent = params.blessingContent
    }
    
    const result = await setIntention(intentionParams)
    
    return { success: true, intention: result }
  } catch (error) {
    console.error('Error setting intention:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('switch-attention', async (event, params) => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const { switchAttention } = await import('../src/lib/synchronicity-engine.js')
    
    const switchParams = {
      userId: params.userId,
      toIntentionId: params.newIntentionId,
      databases: databases
    }
    
    // Only add blessingContent if it's defined and not empty
    if (params.blessingContent && params.blessingContent.trim()) {
      switchParams.blessingContent = params.blessingContent
    }
    
    const result = await switchAttention(switchParams)
    
    return { success: true, result }
  } catch (error) {
    console.error('Error switching attention:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-current-attention', async (event, userId) => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const { getCurrentAttention } = await import('../src/lib/synchronicity-engine.js')
    
    const result = await getCurrentAttention(userId, databases.attentionSwitches)
    return { success: true, attention: result }
  } catch (error) {
    console.error('Error getting current attention:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('calculate-blessing-duration', async (event, blessingId) => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const { calcBlessingDuration } = await import('../src/lib/synchronicity-engine.js')
    
    const duration = await calcBlessingDuration(blessingId, databases.attentionSwitches)
    return { success: true, duration }
  } catch (error) {
    console.error('Error calculating blessing duration:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('calculate-gratitude-potential', async (event, params) => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    console.log('IPC: Calculating gratitude potential for:', params.intentionId)
    const { calculateGratitudePotential } = await import('../src/lib/synchronicity-engine.js')
    
    const potential = await calculateGratitudePotential({
      intentionId: params.intentionId,
      databases,
      currentTime: Date.now(),
      includeChildren: true
    })
    console.log('IPC: Calculated potential:', potential)
    return { success: true, potential }
  } catch (error) {
    console.error('Error calculating gratitude potential:', error)
    return { success: false, error: error.message }
  }
})

// Offerings APIs
ipcMain.handle('create-offering', async (event, params) => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const { createOffering } = await import('../src/lib/synchronicity-engine.js')
    
    const result = await createOffering(params, databases)
    return { success: true, result }
  } catch (error) {
    console.error('Error creating offering:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('bid-on-offering', async (event, params) => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const { bidOnOffering } = await import('../src/lib/synchronicity-engine.js')
    
    const result = await bidOnOffering(params, databases)
    return { success: true, result }
  } catch (error) {
    console.error('Error bidding on offering:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('accept-offering-bids', async (event, params) => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const { acceptOfferingBids } = await import('../src/lib/synchronicity-engine.js')
    
    const result = await acceptOfferingBids(params, databases)
    return { success: true, result }
  } catch (error) {
    console.error('Error accepting offering bids:', error)
    return { success: false, error: error.message }
  }
})

// Proof of Service APIs
ipcMain.handle('post-proof-of-service', async (event, params) => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const { postProofOfService } = await import('../src/lib/synchronicity-engine.js')
    
    const result = await postProofOfService({
      ...params,
      databases
    })
    return { success: true, result }
  } catch (error) {
    console.error('Error posting proof of service:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('assign-blessing', async (event, params) => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const { assignBlessing } = await import('../src/lib/synchronicity-engine.js')
    
    const result = await assignBlessing({
      ...params,
      databases
    })
    return { success: true, result }
  } catch (error) {
    console.error('Error assigning blessing:', error)
    return { success: false, error: error.message }
  }
})

// Data retrieval handlers for dashboard
ipcMain.handle('get-all-intentions', async () => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const allDocs = await databases.intentions.all()
    const intentions = allDocs.map(doc => ({ _id: doc.key, ...doc.value }))
    return { success: true, data: intentions }
  } catch (error) {
    console.error('Error getting intentions:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-all-blessings', async () => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const allDocs = await databases.blessings.all()
    const blessings = allDocs.map(doc => ({ _id: doc.key, ...doc.value }))
    return { success: true, data: blessings }
  } catch (error) {
    console.error('Error getting blessings:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-all-offerings', async () => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const allDocs = await databases.offerings.all()
    const offerings = allDocs.map(doc => ({ _id: doc.key, ...doc.value }))
    return { success: true, data: offerings }
  } catch (error) {
    console.error('Error getting offerings:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-all-attention-switches', async () => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const entries = []
    for await (const entry of databases.attentionSwitches.iterator()) {
      entries.push({ _id: entry.hash, ...entry.value })
    }
    return { success: true, data: entries }
  } catch (error) {
    console.error('Error getting attention switches:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-all-proofs-of-service', async () => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    const entries = []
    for await (const entry of databases.proofsOfService.iterator()) {
      entries.push({ _id: entry.hash, ...entry.value })
    }
    return { success: true, data: entries }
  } catch (error) {
    console.error('Error getting proofs of service:', error)
    return { success: false, error: error.message }
  }
})

// Single efficient API to get all dashboard data at once
ipcMain.handle('get-all-dashboard-data', async () => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    console.log('Loading all dashboard data in single call...')
    
    // Load all data in parallel using existing database connections
    const [intentionsData, blessingsData, offeringsData, attentionData, proofsData] = await Promise.all([
      databases.intentions.all(),
      databases.blessings.all(),
      databases.offerings.all(),
      (async () => {
        const entries = []
        for await (const entry of databases.attentionSwitches.iterator()) {
          entries.push({ _id: entry.hash, ...entry.value })
        }
        return entries
      })(),
      (async () => {
        const entries = []
        for await (const entry of databases.proofsOfService.iterator()) {
          entries.push({ _id: entry.hash, ...entry.value })
        }
        return entries
      })()
    ])
    
    // Transform to expected format
    const result = {
      success: true,
      data: {
        intentions: intentionsData.map(doc => ({ _id: doc.key, ...doc.value })),
        blessings: blessingsData.map(doc => ({ _id: doc.key, ...doc.value })),
        offerings: offeringsData.map(doc => ({ _id: doc.key, ...doc.value })),
        attentionSwitches: attentionData,
        proofsOfService: proofsData
      }
    }
    
    console.log('Dashboard data loaded:', {
      intentions: result.data.intentions.length,
      blessings: result.data.blessings.length,
      offerings: result.data.offerings.length,
      attentionSwitches: result.data.attentionSwitches.length,
      proofsOfService: result.data.proofsOfService.length
    })
    
    return result
    
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    return { success: false, error: error.message }
  }
})

// Navigation handlers
ipcMain.handle('navigate-to', async (event, page) => {
  const pages = {
    'app': 'app.html',
    'offerings': 'offerings.html',
    'test-runner': 'renderer.html',
    'database-browser': 'database-browser.html',
    'token-explorer': 'token-explorer.html'
  }
  
  if (pages[page]) {
    mainWindow.loadFile(path.join(__dirname, pages[page]))
    return { success: true }
  }
  
  return { success: false, error: 'Page not found' }
})