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

  // Start with the main app
  mainWindow.loadFile(path.join(__dirname, 'app.html'))
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
  
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
      console.log('Disconnected from databases')
    }
    return { success: true }
  } catch (error) {
    console.error('Error disconnecting:', error)
    return { success: false, error: error.message }
  }
})

// Sample data handler
ipcMain.handle('add-sample-data', async () => {
  if (!databases) {
    return { success: false, error: 'Not connected to databases' }
  }
  
  try {
    console.log('Adding realistic sample data from documentation...')
    
    // Realistic intentions from docs
    const sampleIntentions = [
      {
        _id: 'intention_001',
        title: 'Clear invasive eucalyptus from the mountain peak',
        blessings: ['blessing_truman_001'],
        proofsOfService: [],
        attachedTokens: [],
        status: 'open',
        createdBy: 'truman',
        createdAt: 1719304800000
      },
      {
        _id: 'intention_002',
        title: 'Repair ridge fencing',
        blessings: [],
        proofsOfService: [],
        attachedTokens: [],
        status: 'open',
        createdBy: 'truman',
        createdAt: 1719312000000
      }
    ]
    
    // Realistic blessings from docs
    const sampleBlessings = [
      {
        _id: 'blessing_truman_001',
        userId: 'truman',
        intentionId: 'intention_001',
        attentionIndex: 0,
        content: 'The ridgeline could carry almonds again. But first, the invaders must go.',
        timestamp: 1719304800000,
        status: 'potential',
        stewardId: 'truman'
      }
    ]
    
    // Realistic attention switches from docs
    const sampleAttentionSwitches = [
      {
        userId: 'truman',
        intentionId: 'intention_001',
        timestamp: 1719304800000
      },
      {
        userId: 'truman',
        intentionId: 'intention_002',
        timestamp: 1719318300000
      }
    ]
    
    // Realistic proofs of service from docs
    const sampleProofsOfService = [
      {
        _id: 'proof_001',
        intentionId: 'intention_001',
        by: ['john', 'freya'],
        content: 'Cleared weeds and mulched paths.',
        media: ['ipfs://QmProofImage'],
        timestamp: 1719391200000
      }
    ]
    
    // Realistic offerings from docs
    const sampleOfferings = [
      {
        _id: 'offering_001',
        title: 'Yoga in the Temple',
        description: 'Grounding Hatha practice at Agua Lila.',
        time: '2025-06-21T10:00:00+01:00',
        place: 'Agua Lila Upper Temple Deck',
        slotsAvailable: 10,
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

// Navigation handlers
ipcMain.handle('navigate-to', async (event, page) => {
  const pages = {
    'app': 'app.html',
    'test-runner': 'renderer.html',
    'database-browser': 'database-browser.html'
  }
  
  if (pages[page]) {
    mainWindow.loadFile(path.join(__dirname, pages[page]))
    return { success: true }
  }
  
  return { success: false, error: 'Page not found' }
})