// Main application state
let currentUser = 'truman'
let intentions = []
let blessings = []
let currentIntentionId = null
let attentionStartTime = null
let timerInterval = null
let isConnected = false
let pendingIntentionSwitch = null

// DOM elements
const intentionList = document.getElementById('intentionList')
const createIntentionBtn = document.getElementById('createIntentionBtn')
const createIntentionModal = document.getElementById('createIntentionModal')
const createIntentionForm = document.getElementById('createIntentionForm')
const cancelBtn = document.getElementById('cancelBtn')
const blessingModal = document.getElementById('blessingModal')
const blessingForm = document.getElementById('blessingForm')
const cancelBlessingBtn = document.getElementById('cancelBlessingBtn')
const activeDetailsToggle = document.getElementById('activeDetailsToggle')
const timerDisplay = document.getElementById('timerDisplay')
const timerText = document.getElementById('timerText')
const pulseDot = document.getElementById('pulseDot')
const connectionStatus = document.getElementById('connectionStatus')
const connectionText = document.getElementById('connectionText')
const totalIntentions = document.getElementById('totalIntentions')
const totalBlessings = document.getElementById('totalBlessings')

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners()
    await checkConnection()
    await loadData()
    updateUI()
})

// Event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            const page = e.target.dataset.page
            if (page && page !== 'app') {
                window.electronAPI.navigateTo(page)
            }
        })
    })

    // Intention creation
    createIntentionBtn.addEventListener('click', () => {
        createIntentionModal.classList.add('show')
        document.getElementById('intentionTitle').focus()
    })

    cancelBtn.addEventListener('click', () => {
        createIntentionModal.classList.remove('show')
        createIntentionForm.reset()
    })

    createIntentionForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        await handleCreateIntention()
    })

    // Blessing modal events
    cancelBlessingBtn.addEventListener('click', () => {
        blessingModal.classList.remove('show')
        blessingForm.reset()
        pendingIntentionSwitch = null
    })

    blessingForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const blessingContent = document.getElementById('blessingInput').value
        
        // Hide modal
        blessingModal.classList.remove('show')
        blessingForm.reset()
        
        // Perform the attention switch
        if (pendingIntentionSwitch) {
            await performAttentionSwitch(pendingIntentionSwitch, blessingContent)
            pendingIntentionSwitch = null
        }
    })

    // Close modal on background click
    createIntentionModal.addEventListener('click', (e) => {
        if (e.target === createIntentionModal) {
            createIntentionModal.classList.remove('show')
            createIntentionForm.reset()
        }
    })

    blessingModal.addEventListener('click', (e) => {
        if (e.target === blessingModal) {
            blessingModal.classList.remove('show')
            blessingForm.reset()
            pendingIntentionSwitch = null
        }
    })

    // Active details toggle
    activeDetailsToggle.addEventListener('click', () => {
        const details = document.getElementById('activeIntentionDetails')
        const icon = activeDetailsToggle.querySelector('.expand-icon')
        
        if (details.style.display === 'none') {
            details.style.display = 'block'
            icon.textContent = '▲'
        } else {
            details.style.display = 'none'
            icon.textContent = '▼'
        }
    })
}

// Check database connection
async function checkConnection() {
    try {
        const status = await window.electronAPI.getConnectionStatus()
        isConnected = status.connected
        updateConnectionUI()
        
        if (!isConnected && !status.connecting) {
            // Try to connect
            await window.electronAPI.connectDatabases()
            const newStatus = await window.electronAPI.getConnectionStatus()
            isConnected = newStatus.connected
            updateConnectionUI()
        }
    } catch (error) {
        console.error('Error checking connection:', error)
        isConnected = false
        updateConnectionUI()
    }
}

// Update connection UI
function updateConnectionUI() {
    if (isConnected) {
        connectionStatus.className = 'connection-status'
        connectionText.textContent = 'Connected to OrbitDB'
    } else {
        connectionStatus.className = 'connection-status disconnected'
        connectionText.textContent = 'Disconnected'
    }
}

// Load data from databases
async function loadData() {
    if (!isConnected) return

    try {
        // Load intentions
        const intentionsResult = await window.electronAPI.getDatabaseDocuments('intentions')
        if (intentionsResult.documents) {
            intentions = intentionsResult.documents.map(doc => doc.value)
        }

        // Load blessings
        const blessingsResult = await window.electronAPI.getDatabaseDocuments('blessings')
        if (blessingsResult.documents) {
            blessings = blessingsResult.documents.map(doc => doc.value)
        }

        // Load attention switches to determine current intention
        const attentionResult = await window.electronAPI.getDatabaseDocuments('attentionSwitches')
        if (attentionResult.documents && attentionResult.documents.length > 0) {
            // Sort by timestamp to get latest
            const switches = attentionResult.documents
                .map(doc => doc.value)
                .sort((a, b) => b.timestamp - a.timestamp)
            
            if (switches.length > 0) {
                const latestSwitch = switches[0]
                if (latestSwitch.userId === currentUser) {
                    currentIntentionId = latestSwitch.intentionId
                    attentionStartTime = latestSwitch.timestamp
                    startTimer()
                }
            }
        }
    } catch (error) {
        console.error('Error loading data:', error)
    }
}

// Update UI elements
async function updateUI() {
    await updateIntentionsList()
    updateStats()
}

// Update intentions list
async function updateIntentionsList() {
    if (intentions.length === 0) {
        intentionList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🌱</div>
                <p>No intentions yet. Create your first intention to begin tracking your attention.</p>
            </div>
        `
        return
    }

    // Debug: Check what blessings we have
    console.log('Current blessings:', blessings)
    console.log('Current intentions:', intentions)

    // Calculate gratitude potential for each intention and sort by it
    const intentionsWithPotential = await Promise.all(
        intentions.map(async intention => {
            const potential = await calculateGratitudePotential(intention._id)
            console.log(`Intention ${intention._id} has potential: ${potential}`)
            return { ...intention, gratitudePotential: potential }
        })
    )

    // Sort by gratitude potential (descending) but keep active intention separate
    const activeIntention = intentionsWithPotential.find(i => i._id === currentIntentionId)
    const otherIntentions = intentionsWithPotential
        .filter(i => i._id !== currentIntentionId)
        .sort((a, b) => b.gratitudePotential - a.gratitudePotential)

    // Update active intention card
    if (activeIntention) {
        updateActiveIntentionCard(activeIntention)
    } else {
        document.getElementById('activeIntentionCard').style.display = 'none'
    }

    // Render other intentions
    const intentionsToShow = otherIntentions

    intentionList.innerHTML = intentionsToShow.map(intention => `
        <div class="intention-card" data-intention-id="${intention._id}">
            <div class="gratitude-potential-badge">
                ${formatDuration(intention.gratitudePotential)} potential
            </div>
            <div class="intention-header">
                <div class="intention-title">${intention.title}</div>
                <div class="intention-actions">
                    <button class="expand-btn" data-intention-id="${intention._id}">
                        <span class="expand-icon">▼</span>
                    </button>
                    <button class="switch-btn" data-intention-id="${intention._id}">
                        Switch
                    </button>
                </div>
            </div>
            <div class="intention-meta">
                <span>by ${intention.createdBy}</span>
                <span>${formatDate(intention.createdAt)}</span>
            </div>
            <div class="intention-details" id="details-${intention._id}" style="display: none;">
                <div class="details-section">
                    <h4>Active Users</h4>
                    <div class="active-users" id="users-${intention._id}">
                        <div class="loading">Loading users...</div>
                    </div>
                </div>
                <div class="details-section">
                    <h4>Timeline</h4>
                    <div class="timeline" id="timeline-${intention._id}">
                        <div class="loading">Loading timeline...</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('')

    // Add click handlers
    document.querySelectorAll('.expand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation()
            const intentionId = btn.dataset.intentionId
            toggleIntentionDetails(intentionId)
        })
    })

    document.querySelectorAll('.switch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation()
            const intentionId = btn.dataset.intentionId
            switchAttention(intentionId)
        })
    })
}

// Calculate gratitude potential for an intention
async function calculateGratitudePotential(intentionId) {
    try {
        console.log('Calculating gratitude potential for:', intentionId)
        const result = await window.electronAPI.calculateGratitudePotential({
            intentionId: intentionId
        })
        console.log('Gratitude potential result:', result)
        
        // If the main calculation returns 0, try a simple fallback calculation
        if (result.potential === 0) {
            const fallbackPotential = await calculateFallbackGratitudePotential(intentionId)
            console.log('Fallback potential:', fallbackPotential)
            return fallbackPotential
        }
        
        return result.potential || 0
    } catch (error) {
        console.error('Error calculating gratitude potential:', error)
        // Try fallback calculation on error
        return await calculateFallbackGratitudePotential(intentionId)
    }
}

// Fallback gratitude potential calculation
async function calculateFallbackGratitudePotential(intentionId) {
    try {
        // Get all blessings for this intention
        const blessingsForIntention = blessings.filter(blessing => blessing.intentionId === intentionId)
        console.log(`Found ${blessingsForIntention.length} blessings for intention ${intentionId}`)
        
        if (blessingsForIntention.length === 0) {
            return 0
        }
        
        // Get attention switches to calculate durations
        const attentionResult = await window.electronAPI.getDatabaseDocuments('attentionSwitches')
        const switches = attentionResult.documents ? attentionResult.documents.map(doc => doc.value) : []
        
        let totalPotential = 0
        
        // For each blessing, calculate its duration
        for (const blessing of blessingsForIntention) {
            // Find the attention switch that started this blessing
            const startSwitch = switches.find(s => 
                s.userId === blessing.userId && 
                s.intentionId === intentionId && 
                s.timestamp <= blessing.timestamp
            )
            
            if (!startSwitch) continue
            
            // Find the next attention switch by this user after the blessing started
            const endSwitches = switches.filter(s => 
                s.userId === blessing.userId && 
                s.timestamp > startSwitch.timestamp
            ).sort((a, b) => a.timestamp - b.timestamp)
            
            const endTime = endSwitches.length > 0 ? endSwitches[0].timestamp : Date.now()
            const duration = endTime - startSwitch.timestamp
            
            // Only count active and potential blessings
            if (blessing.status === 'active' || blessing.status === 'potential') {
                totalPotential += duration
            }
            
            console.log(`Blessing ${blessing._id}: duration = ${duration}ms, status = ${blessing.status}`)
        }
        
        console.log(`Total potential for ${intentionId}: ${totalPotential}ms`)
        return totalPotential
    } catch (error) {
        console.error('Error in fallback calculation:', error)
        return 0
    }
}

// Update active intention card
async function updateActiveIntentionCard(intention) {
    const card = document.getElementById('activeIntentionCard')
    
    if (!intention) {
        card.style.display = 'none'
        return
    }

    card.style.display = 'block'
    
    // Update title and meta
    document.getElementById('activeIntentionTitle').textContent = intention.title
    document.getElementById('activeIntentionCreator').textContent = `by ${intention.createdBy}`
    
    // Update gratitude potential
    document.getElementById('activeGratitudePotential').textContent = `${formatDuration(intention.gratitudePotential)} potential`
    
    // Load active users and timeline (but don't show details by default)
    await loadActiveUsers(intention._id, 'activeUsers')
    await loadTimeline(intention._id, 'activeTimeline')
}

// Toggle intention details
async function toggleIntentionDetails(intentionId) {
    const detailsElement = document.getElementById(`details-${intentionId}`)
    const expandIcon = document.querySelector(`[data-intention-id="${intentionId}"] .expand-icon`)
    
    if (detailsElement.style.display === 'none') {
        // Show details
        detailsElement.style.display = 'block'
        expandIcon.textContent = '▲'
        
        // Load the data for this intention
        await loadIntentionDetails(intentionId)
    } else {
        // Hide details
        detailsElement.style.display = 'none'
        expandIcon.textContent = '▼'
    }
}

// Load active users and timeline for an intention
async function loadIntentionDetails(intentionId) {
    await Promise.all([
        loadActiveUsers(intentionId),
        loadTimeline(intentionId)
    ])
}

// Load active users for an intention
async function loadActiveUsers(intentionId, containerId = null) {
    const containerIdToUse = containerId || `users-${intentionId}`
    const usersContainer = document.getElementById(containerIdToUse)
    
    try {
        // Get all attention switches to find current active users
        const attentionResult = await window.electronAPI.getDatabaseDocuments('attentionSwitches')
        const activeUsers = new Set()
        
        if (attentionResult.documents) {
            const switches = attentionResult.documents.map(doc => doc.value)
            
            // Find the latest switch for each user
            const userLatestSwitch = {}
            switches.forEach(switch_ => {
                if (!userLatestSwitch[switch_.userId] || switch_.timestamp > userLatestSwitch[switch_.userId].timestamp) {
                    userLatestSwitch[switch_.userId] = switch_
                }
            })
            
            // Check which users are currently on this intention
            Object.values(userLatestSwitch).forEach(switch_ => {
                if (switch_.intentionId === intentionId) {
                    activeUsers.add(switch_.userId)
                }
            })
        }
        
        if (activeUsers.size === 0) {
            usersContainer.innerHTML = '<div class="empty-message">No active users</div>'
        } else {
            usersContainer.innerHTML = Array.from(activeUsers).map(userId => `
                <div class="user-badge ${userId === currentUser ? 'current-user' : ''}">
                    <div class="user-avatar">${userId.charAt(0).toUpperCase()}</div>
                    <div class="user-name">${userId}</div>
                </div>
            `).join('')
        }
    } catch (error) {
        console.error('Error loading active users:', error)
        usersContainer.innerHTML = '<div class="error-message">Error loading users</div>'
    }
}

// Calculate duration for a single blessing
async function calculateBlessingDuration(blessing) {
    try {
        // Get attention switches to calculate duration
        const attentionResult = await window.electronAPI.getDatabaseDocuments('attentionSwitches')
        const switches = attentionResult.documents ? attentionResult.documents.map(doc => doc.value) : []
        
        // Find the attention switch that started this blessing
        const startSwitch = switches.find(s => 
            s.userId === blessing.userId && 
            s.intentionId === blessing.intentionId && 
            s.timestamp <= blessing.timestamp
        )
        
        if (!startSwitch) return 0
        
        // Find the next attention switch by this user after the blessing started
        const endSwitches = switches.filter(s => 
            s.userId === blessing.userId && 
            s.timestamp > startSwitch.timestamp
        ).sort((a, b) => a.timestamp - b.timestamp)
        
        const endTime = endSwitches.length > 0 ? endSwitches[0].timestamp : Date.now()
        return endTime - startSwitch.timestamp
    } catch (error) {
        console.error('Error calculating blessing duration:', error)
        return 0
    }
}

// Load timeline for an intention
async function loadTimeline(intentionId, containerId = null) {
    const containerIdToUse = containerId || `timeline-${intentionId}`
    const timelineContainer = document.getElementById(containerIdToUse)
    
    try {
        // Get blessings and proofs for this intention
        const [blessingsResult, proofsResult] = await Promise.all([
            window.electronAPI.getDatabaseDocuments('blessings'),
            window.electronAPI.getDatabaseDocuments('proofsOfService')
        ])
        
        const timelineItems = []
        
        // Add blessings with duration calculation
        if (blessingsResult.documents) {
            for (const doc of blessingsResult.documents) {
                const blessing = doc.value
                if (blessing.intentionId === intentionId) {
                    const duration = await calculateBlessingDuration(blessing)
                    timelineItems.push({
                        type: 'blessing',
                        timestamp: blessing.timestamp,
                        userId: blessing.userId,
                        content: blessing.content,
                        status: blessing.status,
                        duration: duration,
                        id: blessing._id
                    })
                }
            }
        }
        
        // Add proofs of service
        if (proofsResult.documents) {
            proofsResult.documents.forEach(doc => {
                const proof = doc.value
                if (proof.intentionId === intentionId) {
                    timelineItems.push({
                        type: 'proof',
                        timestamp: proof.timestamp,
                        userId: proof.userId,
                        content: proof.content,
                        duration: proof.duration,
                        id: proof._id
                    })
                }
            })
        }
        
        // Sort by timestamp (newest first)
        timelineItems.sort((a, b) => b.timestamp - a.timestamp)
        
        if (timelineItems.length === 0) {
            timelineContainer.innerHTML = '<div class="empty-message">No timeline items yet</div>'
        } else {
            timelineContainer.innerHTML = timelineItems.map(item => `
                <div class="timeline-item ${item.type}">
                    <div class="timeline-header">
                        <div class="timeline-left">
                            <span class="timeline-type">${item.type === 'blessing' ? '🙏' : '✅'}</span>
                            <span class="timeline-user">${item.userId}</span>
                            <span class="timeline-date">${formatDate(item.timestamp)}</span>
                        </div>
                        ${item.duration > 0 ? `<span class="gratitude-potential-badge small">${formatDuration(item.duration)}</span>` : ''}
                    </div>
                    <div class="timeline-content">
                        ${item.content || 'No content'}
                        ${item.status ? `<span class="status status-${item.status}">${item.status}</span>` : ''}
                    </div>
                </div>
            `).join('')
        }
    } catch (error) {
        console.error('Error loading timeline:', error)
        timelineContainer.innerHTML = '<div class="error-message">Error loading timeline</div>'
    }
}

// Update statistics
function updateStats() {
    totalIntentions.textContent = intentions.length
    totalBlessings.textContent = blessings.length
}


// Handle creating new intention
async function handleCreateIntention() {
    const title = document.getElementById('intentionTitle').value.trim()
    const description = document.getElementById('intentionDescription').value.trim()
    const blessingContent = document.getElementById('blessingContent').value.trim()

    if (!title) {
        alert('Please enter a title for your intention')
        return
    }

    if (!isConnected) {
        alert('Not connected to database. Please check your connection.')
        return
    }

    try {
        // Create intention using the engine
        const result = await window.electronAPI.setIntention({
            userId: currentUser,
            title: title,
            blessingContent: blessingContent || ''
        })

        if (result.success) {
            // Close modal and reset form
            createIntentionModal.classList.remove('show')
            createIntentionForm.reset()

            // Reload data and update UI
            await loadData()
            updateUI()

            // Show success feedback
            showToast(`Intention created: "${title}"`, 'success')
        } else {
            alert(`Error creating intention: ${result.error}`)
        }
    } catch (error) {
        console.error('Error creating intention:', error)
        alert('Failed to create intention. Please try again.')
    }
}

// Switch attention to different intention
async function switchAttention(intentionId) {
    if (!isConnected) {
        alert('Not connected to database')
        return
    }

    // Store the target intention ID for later use
    pendingIntentionSwitch = intentionId

    // If there's a current intention, show blessing modal first
    if (currentIntentionId) {
        const currentIntention = intentions.find(i => i._id === currentIntentionId)
        const targetIntention = intentions.find(i => i._id === intentionId)
        
        // Calculate duration for display
        let duration = 0
        if (attentionStartTime) {
            duration = Date.now() - attentionStartTime
        }
        const formattedDuration = formatDuration(duration)
        
        // Set up blessing modal content
        document.getElementById('blessingPrompt').textContent = 
            `Leave a blessing for "${currentIntention?.title}" (${formattedDuration}) before switching to "${targetIntention?.title}"`
        
        // Pre-fill with default blessing content
        document.getElementById('blessingInput').value = `Work completed at ${new Date().toLocaleTimeString()}`
        
        // Show the blessing modal
        document.getElementById('blessingModal').classList.add('show')
        document.getElementById('blessingInput').focus()
    } else {
        // No current intention, switch directly
        await performAttentionSwitch(intentionId, '')
    }
}

// Perform the actual attention switch
async function performAttentionSwitch(intentionId, blessingContent) {
    try {
        // Calculate duration for current blessing if there is one
        let duration = 0
        if (currentIntentionId && attentionStartTime) {
            duration = Date.now() - attentionStartTime
        }

        // Switch attention using the engine
        const result = await window.electronAPI.switchAttention({
            userId: currentUser,
            newIntentionId: intentionId,
            blessingContent: blessingContent
        })

        if (result.success) {
            // Update local state
            currentIntentionId = intentionId
            attentionStartTime = Date.now()
            
            // Reload data to update blessing count
            await loadData()
            
            // Restart timer
            startTimer()
            
            // Update UI
            updateUI()

            // Show duration if switching from another intention
            if (duration > 0) {
                const formattedDuration = formatDuration(duration)
                const currentIntention = intentions.find(i => i._id === currentIntentionId)
                showToast(`Attention switched to "${currentIntention?.title}". Previous focus: ${formattedDuration}`, 'info')
            } else {
                const intention = intentions.find(i => i._id === intentionId)
                showToast(`Now focusing on "${intention?.title}"`, 'success')
            }
        } else {
            alert(`Error switching attention: ${result.error}`)
        }
    } catch (error) {
        console.error('Error switching attention:', error)
        alert('Failed to switch attention. Please try again.')
    }
}

// Timer management
function startTimer() {
    stopTimer()
    
    if (!currentIntentionId || !attentionStartTime) {
        timerDisplay.textContent = '00:00:00'
        timerText.textContent = 'No active intention'
        pulseDot.style.display = 'none'
        return
    }

    pulseDot.style.display = 'inline-block'
    timerText.textContent = 'Tracking attention'

    timerInterval = setInterval(() => {
        const elapsed = Date.now() - attentionStartTime
        timerDisplay.textContent = formatDuration(elapsed)
    }, 1000)

    // Update immediately
    const elapsed = Date.now() - attentionStartTime
    timerDisplay.textContent = formatDuration(elapsed)
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
    }
}

// Utility functions
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString()
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.textContent = message
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1001;
        font-weight: 500;
        max-width: 400px;
        word-wrap: break-word;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `

    document.body.appendChild(toast)
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)'
    }, 100)

    // Auto remove
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)'
        setTimeout(() => {
            document.body.removeChild(toast)
        }, 300)
    }, 5000)
}

// Listen for database events
window.electronAPI.onDatabasesConnected(() => {
    isConnected = true
    updateConnectionUI()
    loadData().then(() => updateUI())
})

window.electronAPI.onDatabasesConnectionFailed((error) => {
    isConnected = false
    updateConnectionUI()
    showToast(`Database connection failed: ${error}`, 'error')
})

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopTimer()
})