// DOM elements
const databaseList = document.getElementById('databaseList')
const contentTitle = document.getElementById('contentTitle')
const contentBody = document.getElementById('contentBody')
const connectBtn = document.getElementById('connectBtn')
const refreshBtn = document.getElementById('refreshBtn')
const sampleDataBtn = document.getElementById('sampleDataBtn')
const orbitStatus = document.getElementById('orbitStatus')
const ipfsStatus = document.getElementById('ipfsStatus')
const lastUpdate = document.getElementById('lastUpdate')

// State
let currentDatabase = null
let connected = false
let databases = []

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateStatus()
    checkConnectionStatus()
    
    // Listen for database connection events
    window.electronAPI.onDatabasesConnected(() => {
        console.log('Databases connected successfully')
        connected = true
        updateStatus()
        loadDatabaseList()
        updateLastUpdateTime()
    })
    
    window.electronAPI.onDatabasesConnectionFailed((event, error) => {
        console.error('Database connection failed:', error)
        connected = false
        updateStatus()
        // Show connection failed message
        contentBody.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>Database Connection Failed</h3>
                <p>Error: ${error}</p>
                <button class="btn btn-primary" onclick="connectDatabases()">Retry Connection</button>
            </div>
        `
    })
})

async function checkConnectionStatus() {
    try {
        const status = await window.electronAPI.getConnectionStatus()
        connected = status.connected
        
        if (status.connecting) {
            // Show connecting state
            contentBody.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔄</div>
                    <h3>Connecting to Databases...</h3>
                    <p>Initializing persistent OrbitDB databases...</p>
                </div>
            `
            connectBtn.textContent = '⏳ Connecting...'
            connectBtn.disabled = true
        } else if (status.connected) {
            loadDatabaseList()
        }
        
        updateStatus()
    } catch (error) {
        console.error('Error checking connection status:', error)
    }
}

// Navigation functions
function showTestRunner() {
    window.electronAPI.navigateTo('test-runner')
}

function showDatabaseBrowser() {
    // Already on database browser
    loadDatabaseList()
}

// Database connection (now mainly for retry)
async function connectDatabases() {
    console.log('Connecting to databases...')
    connectBtn.disabled = true
    connectBtn.textContent = '⏳ Connecting...'
    
    try {
        const result = await window.electronAPI.connectDatabases()
        console.log('Connection result:', result)
        
        if (result.success) {
            connected = true
            updateStatus()
            loadDatabaseList()
            updateLastUpdateTime()
        } else {
            alert(`Connection failed: ${result.error}`)
            connected = false
            updateStatus()
        }
    } catch (error) {
        console.error('Connection error:', error)
        alert(`Connection failed: ${error.message}`)
        connected = false
        updateStatus()
    }
}

async function loadDatabaseList() {
    console.log('Loading database list...')
    
    try {
        const result = await window.electronAPI.getDatabaseList()
        console.log('Database list result:', result)
        
        connected = result.connected
        databases = result.databases || []
        
        updateStatus()
        renderDatabaseList()
        updateLastUpdateTime()
    } catch (error) {
        console.error('Error loading database list:', error)
        connected = false
        databases = []
        updateStatus()
        renderDatabaseList()
    }
}

function renderDatabaseList() {
    if (!connected) {
        databaseList.innerHTML = '<div class="loading">Not connected</div>'
        return
    }
    
    if (databases.length === 0) {
        databaseList.innerHTML = '<div class="loading">No databases found</div>'
        return
    }
    
    const databaseItems = databases.map(db => {
        const icon = getDatabaseIcon(db.type)
        const isActive = currentDatabase === db.name ? 'active' : ''
        
        return `
            <div class="database-item ${isActive}" onclick="selectDatabase('${db.name}')">
                <div class="database-icon">${icon}</div>
                <div class="database-info">
                    <div class="database-name">${db.name}</div>
                    <div class="database-count">${db.count} ${db.type === 'documents' ? 'docs' : 'events'}</div>
                </div>
            </div>
        `
    }).join('')
    
    databaseList.innerHTML = databaseItems
}

function getDatabaseIcon(type) {
    const icons = {
        'documents': '📄',
        'events': '⚡',
        'keyvalue': '🔑'
    }
    return icons[type] || '🗂️'
}

async function selectDatabase(databaseName) {
    console.log('Selecting database:', databaseName)
    currentDatabase = databaseName
    
    // Update active state in sidebar
    document.querySelectorAll('.database-item').forEach(item => {
        item.classList.remove('active')
    })
    event.target.closest('.database-item').classList.add('active')
    
    // Update content area
    contentTitle.textContent = `Database: ${databaseName}`
    contentBody.innerHTML = '<div class="loading">Loading documents...</div>'
    
    try {
        const result = await window.electronAPI.getDatabaseDocuments(databaseName)
        console.log('Documents result:', result)
        
        if (result.error) {
            contentBody.innerHTML = `<div class="loading">Error: ${result.error}</div>`
            return
        }
        
        renderDocuments(result.documents || [])
    } catch (error) {
        console.error('Error loading documents:', error)
        contentBody.innerHTML = `<div class="loading">Error: ${error.message}</div>`
    }
}

function renderDocuments(documents) {
    if (documents.length === 0) {
        contentBody.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3>No documents found</h3>
                <p>This database is empty or contains no accessible documents.</p>
            </div>
        `
        return
    }
    
    const documentItems = documents.map(doc => {
        const preview = generateDocumentPreview(doc.value)
        const timestamp = doc.value?.timestamp || doc.timestamp || 'Unknown'
        const displayId = doc.key || doc.hash || 'Unknown'
        
        return `
            <div class="document-item" onclick="viewDocument('${doc.key || doc.hash}')">
                <div class="document-header">
                    <div class="document-id">${displayId}</div>
                    <div class="document-timestamp">${formatTimestamp(timestamp)}</div>
                </div>
                <div class="document-preview">${preview}</div>
            </div>
        `
    }).join('')
    
    contentBody.innerHTML = `<div class="document-list">${documentItems}</div>`
}

function generateDocumentPreview(value) {
    if (!value || typeof value !== 'object') {
        return String(value || 'Empty')
    }
    
    // Extract key information based on document type
    if (value.title) {
        return `Title: ${value.title}`
    } else if (value.intentionId) {
        return `Intention: ${value.intentionId}`
    } else if (value.userId) {
        return `User: ${value.userId}`
    } else if (value.content) {
        return `Content: ${value.content.substring(0, 50)}...`
    } else {
        const keys = Object.keys(value).slice(0, 3)
        return `Fields: ${keys.join(', ')}`
    }
}

function formatTimestamp(timestamp) {
    if (!timestamp || timestamp === 'Unknown') return 'Unknown'
    
    try {
        const date = new Date(typeof timestamp === 'number' ? timestamp : parseInt(timestamp))
        if (isNaN(date.getTime())) return 'Invalid date'
        
        return date.toLocaleString()
    } catch (error) {
        return 'Invalid date'
    }
}

async function viewDocument(documentId) {
    console.log('Viewing document:', documentId)
    
    if (!currentDatabase) return
    
    try {
        // Get fresh documents to find the selected one
        const result = await window.electronAPI.getDatabaseDocuments(currentDatabase)
        if (result.error) {
            contentBody.innerHTML = `<div class="loading">Error: ${result.error}</div>`
            return
        }
        
        const document = result.documents.find(doc => 
            (doc.key && doc.key === documentId) || 
            (doc.hash && doc.hash === documentId)
        )
        
        if (!document) {
            contentBody.innerHTML = `<div class="loading">Document not found</div>`
            return
        }
        
        const formattedJson = JSON.stringify(document, null, 2)
        
        contentBody.innerHTML = `
            <div style="margin-bottom: 20px;">
                <button class="btn" onclick="backToDocumentList()">← Back to ${currentDatabase}</button>
                <button class="btn" onclick="copyToClipboard('${escapeHtml(formattedJson)}')">📋 Copy JSON</button>
            </div>
            <div class="json-viewer">${syntaxHighlight(formattedJson)}</div>
        `
    } catch (error) {
        console.error('Error viewing document:', error)
        contentBody.innerHTML = `<div class="loading">Error: ${error.message}</div>`
    }
}

function syntaxHighlight(json) {
    return json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="json-' + cls + '">' + match + '</span>';
        });
}

function escapeHtml(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"')
}

function backToDocumentList() {
    if (currentDatabase) {
        selectDatabase(currentDatabase)
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text.replace(/\\"/g, '"').replace(/\\'/g, "'")).then(() => {
        // Show temporary feedback
        const button = event.target
        const originalText = button.textContent
        button.textContent = '✅ Copied!'
        setTimeout(() => {
            button.textContent = originalText
        }, 2000)
    }).catch(err => {
        console.error('Copy failed:', err)
        alert('Copy to clipboard failed')
    })
}

function updateStatus() {
    // Update status dots
    orbitStatus.className = `status-dot ${connected ? '' : 'offline'}`
    ipfsStatus.className = `status-dot ${connected ? '' : 'offline'}`
    
    // Update button text and state
    if (connected) {
        connectBtn.textContent = '✅ Connected'
        connectBtn.className = 'btn'
        connectBtn.disabled = false
        connectBtn.style.color = '#28a745'
    } else {
        connectBtn.textContent = '🔌 Retry Connection'
        connectBtn.className = 'btn btn-primary'
        connectBtn.disabled = false
    }
}

function updateLastUpdateTime() {
    const now = new Date()
    lastUpdate.textContent = `Last updated: ${now.toLocaleTimeString()}`
}

async function refreshCurrent() {
    if (!connected) {
        return
    }
    
    refreshBtn.disabled = true
    refreshBtn.textContent = '🔄 Refreshing...'
    
    try {
        await loadDatabaseList()
        
        if (currentDatabase) {
            await selectDatabase(currentDatabase)
        }
    } finally {
        refreshBtn.disabled = false
        refreshBtn.textContent = '🔄 Refresh'
    }
}

async function addSampleData() {
    if (!connected) {
        alert('Please connect to databases first')
        return
    }
    
    sampleDataBtn.disabled = true
    sampleDataBtn.textContent = '⏳ Adding...'
    
    try {
        const result = await window.electronAPI.addSampleData()
        
        if (result.success) {
            alert('Sample data added successfully!')
            // Refresh the database list to show new counts
            await loadDatabaseList()
        } else {
            alert(`Failed to add sample data: ${result.error}`)
        }
    } catch (error) {
        console.error('Error adding sample data:', error)
        alert(`Error: ${error.message}`)
    } finally {
        sampleDataBtn.disabled = false
        sampleDataBtn.textContent = '📊 Add Sample Data'
    }
}

// Auto-refresh every 30 seconds when connected
setInterval(() => {
    if (connected) {
        loadDatabaseList()
    }
}, 30000)