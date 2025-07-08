// New Synchronicity Engine Interface v2
// Clean, modern implementation based on user mockup

let currentUser = 'truman'
let intentions = []
let blessings = []
let offerings = []
let tokenHierarchy = {}
let draggedTokenId = null

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Synchronicity Engine v2 initializing...')
    
    // Initialize UI components
    initializeEventListeners()
    initializeDragAndDrop()
    
    // Load data
    await loadData()
    updateUI()
    
    // Start real-time updates
    startRealTimeUpdates()
})

// Event Listeners
function initializeEventListeners() {
    // Blessing input auto-save
    const blessingInput = document.getElementById('blessingInput')
    blessingInput.addEventListener('input', debounce(saveBlessingContent, 500))
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
            e.target.classList.add('active')
            filterOfferings(e.target.textContent.toLowerCase())
        })
    })
}

// Drag and Drop System
function initializeDragAndDrop() {
    const stewardHeader = document.getElementById('stewardHeader')
    const tokensList = document.getElementById('tokensList')
    
    // Steward header drop target
    stewardHeader.addEventListener('dragover', handleStewardDragOver)
    stewardHeader.addEventListener('drop', handleStewardDrop)
    stewardHeader.addEventListener('dragenter', (e) => {
        e.preventDefault()
        e.currentTarget.classList.add('drag-over')
    })
    stewardHeader.addEventListener('dragleave', (e) => {
        e.currentTarget.classList.remove('drag-over')
    })
    
    // Initialize existing token drag handlers
    initializeTokenDragHandlers()
}

function initializeTokenDragHandlers() {
    document.querySelectorAll('.token-item').forEach(token => {
        token.addEventListener('dragstart', handleTokenDragStart)
        token.addEventListener('dragover', handleTokenDragOver)
        token.addEventListener('drop', handleTokenDrop)
        token.addEventListener('dragend', handleTokenDragEnd)
    })
}

function handleTokenDragStart(e) {
    draggedTokenId = e.currentTarget.dataset.tokenId
    e.currentTarget.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
    console.log('Started dragging token:', draggedTokenId)
}

function handleTokenDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    const targetTokenId = e.currentTarget.dataset.tokenId
    if (targetTokenId && targetTokenId !== draggedTokenId) {
        e.currentTarget.classList.add('drag-over')
    }
}

function handleTokenDrop(e) {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    
    const targetTokenId = e.currentTarget.dataset.tokenId
    if (targetTokenId && targetTokenId !== draggedTokenId) {
        console.log(`Making ${draggedTokenId} a child of ${targetTokenId}`)
        setTokenParent(draggedTokenId, targetTokenId)
        saveTokenHierarchy()
        renderTokens()
    }
}

function handleTokenDragEnd(e) {
    e.currentTarget.classList.remove('dragging', 'drag-over')
    document.querySelectorAll('.token-item').forEach(token => {
        token.classList.remove('drag-over')
    })
    draggedTokenId = null
}

function handleStewardDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
}

function handleStewardDrop(e) {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    
    if (draggedTokenId) {
        console.log(`Moving ${draggedTokenId} to steward level`)
        removeTokenFromParent(draggedTokenId)
        saveTokenHierarchy()
        renderTokens()
    }
}

// Token Hierarchy Management
function setTokenParent(tokenId, parentId) {
    if (!tokenHierarchy[tokenId]) {
        tokenHierarchy[tokenId] = { children: [] }
    }
    
    // Remove from old parent
    if (tokenHierarchy[tokenId].parent) {
        removeTokenFromParent(tokenId)
    }
    
    // Set new parent
    tokenHierarchy[tokenId].parent = parentId
    
    // Add to new parent's children
    if (!tokenHierarchy[parentId]) {
        tokenHierarchy[parentId] = { children: [] }
    }
    if (!tokenHierarchy[parentId].children.includes(tokenId)) {
        tokenHierarchy[parentId].children.push(tokenId)
    }
}

function removeTokenFromParent(tokenId) {
    if (tokenHierarchy[tokenId] && tokenHierarchy[tokenId].parent) {
        const parentId = tokenHierarchy[tokenId].parent
        if (tokenHierarchy[parentId] && tokenHierarchy[parentId].children) {
            const index = tokenHierarchy[parentId].children.indexOf(tokenId)
            if (index > -1) {
                tokenHierarchy[parentId].children.splice(index, 1)
            }
        }
        delete tokenHierarchy[tokenId].parent
    }
}

function saveTokenHierarchy() {
    localStorage.setItem('tokenHierarchy', JSON.stringify(tokenHierarchy))
}

function loadTokenHierarchy() {
    const saved = localStorage.getItem('tokenHierarchy')
    if (saved) {
        tokenHierarchy = JSON.parse(saved)
    }
}

// Data Loading
async function loadData() {
    try {
        // Load from electron API if available, otherwise use mock data
        if (window.electronAPI) {
            const result = await window.electronAPI.getAllData()
            if (result.success) {
                intentions = result.data.intentions || []
                blessings = result.data.blessings || []
                offerings = result.data.offerings || []
            }
        } else {
            // Mock data for development
            loadMockData()
        }
        
        loadTokenHierarchy()
        console.log('Data loaded:', { intentions: intentions.length, blessings: blessings.length })
    } catch (error) {
        console.error('Error loading data:', error)
        loadMockData()
    }
}

function loadMockData() {
    intentions = [
        {
            _id: 'intention_001',
            title: 'Build better UI',
            content: 'Create a clean, modern interface for the Synchronicity Engine',
            userId: 'truman',
            timestamp: Date.now() - 3600000,
            status: 'active'
        }
    ]
    
    blessings = [
        {
            _id: 'blessing_001',
            intentionId: 'intention_001',
            userId: 'truman',
            stewardId: 'truman',
            content: 'Working on the new interface design...',
            duration: 8100000, // 2h 15m in ms
            timestamp: Date.now() - 1800000,
            status: 'given'
        },
        {
            _id: 'blessing_002',
            intentionId: 'intention_002',
            userId: 'truman',
            stewardId: 'truman',
            content: 'Reviewing authentication system...',
            duration: 5400000, // 1h 30m in ms
            timestamp: Date.now() - 900000,
            status: 'given'
        },
        {
            _id: 'blessing_003',
            intentionId: 'intention_003',
            userId: 'truman',
            stewardId: 'truman',
            content: 'Fixed login validation...',
            duration: 2700000, // 45m in ms
            timestamp: Date.now() - 300000,
            status: 'given'
        }
    ]
    
    offerings = [
        {
            _id: 'offering_001',
            title: 'Code Review Session',
            description: 'Detailed code review with feedback',
            slots: 2,
            bids: 3,
            endTime: Date.now() + 7200000, // 2 hours
            status: 'active'
        },
        {
            _id: 'offering_002',
            title: 'Design Consultation',
            description: 'UI/UX design advice and consultation',
            slots: 1,
            bids: 5,
            endTime: Date.now() + 14400000, // 4 hours
            status: 'active'
        }
    ]
    
    // Mock token hierarchy
    tokenHierarchy = {
        'blessing_003': {
            parent: 'blessing_002',
            children: []
        },
        'blessing_002': {
            children: ['blessing_003']
        },
        'blessing_001': {
            children: []
        }
    }
}

// UI Updates
function updateUI() {
    updateConnectionStatus()
    updateActiveIntention()
    updateSyncLog()
    updateOfferings()
    renderTokens()
    updateGratitudePotential()
}

function updateConnectionStatus() {
    const dot = document.getElementById('connectionDot')
    const connected = window.electronAPI ? true : false
    
    if (connected) {
        dot.style.background = '#27ae60'
        dot.style.animation = 'pulse 2s infinite'
    } else {
        dot.style.background = '#e74c3c'
        dot.style.animation = 'none'
    }
}

function updateActiveIntention() {
    const activeIntention = intentions.find(i => i.status === 'active')
    if (activeIntention) {
        // Update timeline
        const timeline = document.getElementById('timeline')
        timeline.innerHTML = `
            <div class="timeline-item">Started intention: "${activeIntention.title}"</div>
            <div class="timeline-item">User joined focus session</div>
            <div class="timeline-item">Posted proof of service</div>
            <div class="timeline-item">Blessing assigned: ${formatDuration(8100000)}</div>
        `
    }
}

function updateSyncLog() {
    const syncLog = document.getElementById('syncLog')
    const logs = [
        { time: '14:23:15', event: 'Intention created: "Build better UI"' },
        { time: '14:24:01', event: 'Attention switched to intention_001' },
        { time: '14:25:33', event: 'Blessing assigned: 45 minutes' },
        { time: '14:26:12', event: 'Token hierarchy updated' },
        { time: '14:27:45', event: 'Proof of service posted' }
    ]
    
    syncLog.innerHTML = logs.map(log => 
        `<div class="log-entry">
            <span class="log-timestamp">${log.time}</span>
            ${log.event}
        </div>`
    ).join('')
}

function updateOfferings() {
    const offeringsList = document.getElementById('offeringsList')
    
    offeringsList.innerHTML = offerings.map(offering => {
        const timeLeft = Math.max(0, offering.endTime - Date.now())
        const hoursLeft = Math.floor(timeLeft / 3600000)
        
        return `
            <div class="offering-item">
                <div class="offering-title">${offering.title}</div>
                <div class="offering-meta">
                    ${offering.slots} slots • ${offering.bids} bids • Ends in ${hoursLeft}h
                </div>
            </div>
        `
    }).join('')
}

function renderTokens() {
    const tokensList = document.getElementById('tokensList')
    const stewardCount = document.getElementById('stewardCount')
    
    // Get user's tokens (blessings they steward)
    const userTokens = blessings.filter(b => b.stewardId === currentUser && b.status === 'given')
    
    // Get root tokens (no parent)
    const rootTokens = userTokens.filter(token => !getTokenParent(token._id))
    
    // Update steward count
    stewardCount.textContent = `${rootTokens.length} tokens`
    
    // Render tokens
    let html = ''
    for (const token of rootTokens) {
        html += renderToken(token, userTokens, 0)
    }
    
    tokensList.innerHTML = html
    
    // Re-initialize drag handlers for new elements
    setTimeout(() => {
        initializeTokenDragHandlers()
    }, 100)
}

function renderToken(token, allTokens, depth) {
    const intention = intentions.find(i => i._id === token.intentionId)
    const children = getTokenChildren(token._id)
    const childTokens = allTokens.filter(t => children.includes(t._id))
    
    let html = `
        <div class="token-item" draggable="true" data-token-id="${token._id}" style="margin-left: ${depth * 20}px">
            <div class="token-duration">${formatDuration(token.duration)}</div>
            <div class="token-intention">${intention?.title || 'Unknown intention'}</div>
            <div class="token-content">${token.content || 'No content'}</div>
    `
    
    if (childTokens.length > 0) {
        html += '<div class="token-hierarchy">'
        for (const childToken of childTokens) {
            html += renderToken(childToken, allTokens, depth + 1)
        }
        html += '</div>'
    }
    
    html += '</div>'
    return html
}

function getTokenParent(tokenId) {
    return tokenHierarchy[tokenId]?.parent || null
}

function getTokenChildren(tokenId) {
    return tokenHierarchy[tokenId]?.children || []
}

function updateGratitudePotential() {
    const potential = document.getElementById('gratitudePotential')
    
    // Calculate total potential from all active intentions
    let totalMs = 0
    const activeIntentions = intentions.filter(i => i.status === 'active')
    
    for (const intention of activeIntentions) {
        // Mock calculation - in real app this would call the calculation engine
        totalMs += 8100000 // 2h 15m
    }
    
    potential.textContent = formatDuration(totalMs)
}

// Utility Functions
function formatDuration(ms) {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`
    } else {
        return `${seconds}s`
    }
}

function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

function saveBlessingContent() {
    const content = document.getElementById('blessingInput').value
    localStorage.setItem('currentBlessingContent', content)
    console.log('Blessing content saved:', content.slice(0, 50) + '...')
}

function filterOfferings(filter) {
    console.log('Filtering offerings by:', filter)
    // Implementation for filtering offerings
    updateOfferings()
}

function startRealTimeUpdates() {
    // Update UI every 30 seconds
    setInterval(() => {
        updateGratitudePotential()
        updateSyncLog()
    }, 30000)
    
    console.log('Real-time updates started')
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setTokenParent,
        removeTokenFromParent,
        getTokenParent,
        getTokenChildren,
        formatDuration
    }
}