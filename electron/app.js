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

    // Active blessing content field
    const activeBlessingInput = document.getElementById('activeBlessingInput')
    if (activeBlessingInput) {
        activeBlessingInput.addEventListener('input', async (e) => {
            // Save blessing content as user types (debounced)
            clearTimeout(activeBlessingInput.saveTimeout)
            activeBlessingInput.saveTimeout = setTimeout(async () => {
                await saveBlessingContent(e.target.value)
            }, 1000) // Save after 1 second of no typing
        })
    }

    // Proof modal events
    const proofModal = document.getElementById('proofModal')
    const proofForm = document.getElementById('proofForm')
    const cancelProofBtn = document.getElementById('cancelProofBtn')
    const activeProofBtn = document.getElementById('activeProofBtn')

    activeProofBtn.addEventListener('click', () => {
        if (currentIntentionId) {
            showProofModal(currentIntentionId)
        }
    })

    cancelProofBtn.addEventListener('click', () => {
        proofModal.classList.remove('show')
        proofForm.reset()
    })

    proofForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        await handlePostProof()
    })

    // Close proof modal on background click
    proofModal.addEventListener('click', (e) => {
        if (e.target === proofModal) {
            proofModal.classList.remove('show')
            proofForm.reset()
        }
    })

    // Blessing notification modal events
    const blessingNotificationModal = document.getElementById('blessingNotificationModal')
    const dismissNotificationBtn = document.getElementById('dismissNotificationBtn')
    const assignBlessingsBtn = document.getElementById('assignBlessingsBtn')

    dismissNotificationBtn.addEventListener('click', () => {
        blessingNotificationModal.classList.remove('show')
    })

    assignBlessingsBtn.addEventListener('click', async () => {
        await handleBlessingAssignments()
    })

    // Close notification modal on background click
    blessingNotificationModal.addEventListener('click', (e) => {
        if (e.target === blessingNotificationModal) {
            blessingNotificationModal.classList.remove('show')
        }
    })

    // Tokens panel events
    const tokensToggleBtn = document.getElementById('tokensToggleBtn')
    const tokensPanel = document.getElementById('tokensPanel')
    const closeTokensPanel = document.getElementById('closeTokensPanel')
    const mainContent = document.querySelector('.main-content')

    tokensToggleBtn.addEventListener('click', () => {
        toggleTokensPanel()
    })

    closeTokensPanel.addEventListener('click', () => {
        closeTokensPanelView()
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
    await updateTokensPanel()
}

// Toggle tokens panel
function toggleTokensPanel() {
    const tokensPanel = document.getElementById('tokensPanel')
    const tokensToggleBtn = document.getElementById('tokensToggleBtn')
    const mainContent = document.querySelector('.main-content')
    
    if (tokensPanel.classList.contains('open')) {
        closeTokensPanelView()
    } else {
        tokensPanel.classList.add('open')
        tokensToggleBtn.classList.add('panel-open')
        mainContent.classList.add('with-panel')
        loadTokensOfGratitude()
    }
}

// Close tokens panel
function closeTokensPanelView() {
    const tokensPanel = document.getElementById('tokensPanel')
    const tokensToggleBtn = document.getElementById('tokensToggleBtn')
    const mainContent = document.querySelector('.main-content')
    
    tokensPanel.classList.remove('open')
    tokensToggleBtn.classList.remove('panel-open')
    mainContent.classList.remove('with-panel')
}

// Update tokens panel (called from updateUI)
async function updateTokensPanel() {
    if (document.getElementById('tokensPanel').classList.contains('open')) {
        await loadTokensOfGratitude()
    }
}

// Load Tokens of Gratitude (given blessings stewarded by current user)
async function loadTokensOfGratitude() {
    const tokensContainer = document.getElementById('tokensContainer')
    
    try {
        // Find all "given" blessings where current user is the steward
        const tokens = blessings.filter(blessing => 
            blessing.status === 'given' && 
            blessing.stewardId === currentUser
        )

        if (tokens.length === 0) {
            tokensContainer.innerHTML = `
                <div class="empty-state" style="opacity: 0.6; text-align: center; padding: 40px 20px;">
                    <div style="font-size: 2rem; margin-bottom: 16px;">🏆</div>
                    <p>No tokens stewarded yet</p>
                </div>
            `
            return
        }

        // Sort tokens by timestamp (newest first)
        tokens.sort((a, b) => b.timestamp - a.timestamp)

        tokensContainer.innerHTML = ''
        
        for (const token of tokens) {
            // Get intention details
            const intention = intentions.find(i => i._id === token.intentionId)
            
            // Calculate duration for this token
            const duration = await calculateBlessingDuration(token)
            
            const tokenElement = document.createElement('div')
            tokenElement.className = 'token-item'
            tokenElement.innerHTML = `
                <div class="token-header">
                    <div class="token-value">${formatDuration(duration)}</div>
                </div>
                <div class="token-content">${token.content || 'No content'}</div>
                <div class="token-meta">
                    <span class="token-intention">${intention?.title || 'Unknown intention'}</span>
                    <span>${formatDate(token.timestamp)}</span>
                </div>
            `
            tokensContainer.appendChild(tokenElement)
        }
        
        // Update the panel title to show count
        document.querySelector('.tokens-panel-title').textContent = `Tokens of Gratitude (${tokens.length})`
        
    } catch (error) {
        console.error('Error loading tokens of gratitude:', error)
        tokensContainer.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 20px;">
                Error loading tokens
            </div>
        `
    }
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
                <div class="details-section">
                    <button class="btn btn-proof proof-btn" data-intention-id="${intention._id}">
                        📝 Post Proof of Service
                    </button>
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

    document.querySelectorAll('.proof-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation()
            const intentionId = btn.dataset.intentionId
            showProofModal(intentionId)
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
    
    // Load and display active blessing content
    await loadActiveBlessingContent()
    
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
                        userId: proof.by ? proof.by.join(', ') : 'Unknown',
                        content: proof.content,
                        media: proof.media || [],
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
                        ${item.media && item.media.length > 0 ? `
                            <div class="timeline-media">
                                <strong>Media:</strong> 
                                ${item.media.map(url => `<a href="${url}" target="_blank" rel="noopener">📎 Link</a>`).join(', ')}
                            </div>
                        ` : ''}
                        ${item.type === 'proof' ? `
                            <button class="btn btn-secondary assign-blessing-btn" 
                                    data-proof-id="${item.id}" 
                                    data-intention-id="${intentionId}"
                                    style="margin-top: 8px; padding: 4px 8px; font-size: 0.8rem;">
                                🙏 Assign Blessing
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('')

            // Add event listeners for assign blessing buttons
            timelineContainer.querySelectorAll('.assign-blessing-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation()
                    const proofId = btn.dataset.proofId
                    const intentionId = btn.dataset.intentionId
                    await showBlessingAssignmentFromTimeline(proofId, intentionId)
                })
            })
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
        
        // Pre-fill with saved blessing content or default
        const activeBlessingInput = document.getElementById('activeBlessingInput')
        let defaultContent = `Work completed at ${new Date().toLocaleTimeString()}`
        
        if (activeBlessingInput && activeBlessingInput.value.trim()) {
            defaultContent = activeBlessingInput.value.trim()
        }
        
        document.getElementById('blessingInput').value = defaultContent
        
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

// Save blessing content to current active blessing
async function saveBlessingContent(content) {
    if (!currentIntentionId || !isConnected) {
        return
    }

    try {
        // Find the current active blessing for this user and intention
        const activeBlessings = blessings.filter(blessing => 
            blessing.userId === currentUser && 
            blessing.intentionId === currentIntentionId && 
            blessing.status === 'active'
        )

        if (activeBlessings.length > 0) {
            // Update the most recent active blessing
            const activeBlessingId = activeBlessings[activeBlessings.length - 1]._id
            console.log('Saving blessing content:', content, 'to blessing:', activeBlessingId)
            
            // For now, we'll store this in local storage as a temporary solution
            // until we can implement proper blessing content updates in the engine
            localStorage.setItem(`blessing_content_${activeBlessingId}`, content)
        }
    } catch (error) {
        console.error('Error saving blessing content:', error)
    }
}

// Load blessing content for current active blessing
async function loadActiveBlessingContent() {
    const activeBlessingInput = document.getElementById('activeBlessingInput')
    if (!activeBlessingInput || !currentIntentionId) {
        return
    }

    try {
        // Find the current active blessing for this user and intention
        const activeBlessings = blessings.filter(blessing => 
            blessing.userId === currentUser && 
            blessing.intentionId === currentIntentionId && 
            blessing.status === 'active'
        )

        if (activeBlessings.length > 0) {
            const activeBlessingId = activeBlessings[activeBlessings.length - 1]._id
            const savedContent = localStorage.getItem(`blessing_content_${activeBlessingId}`)
            
            if (savedContent) {
                activeBlessingInput.value = savedContent
            } else {
                // Default content based on blessing
                const blessing = activeBlessings[activeBlessings.length - 1]
                activeBlessingInput.value = blessing.content || ''
            }
        } else {
            activeBlessingInput.value = ''
        }
    } catch (error) {
        console.error('Error loading blessing content:', error)
        activeBlessingInput.value = ''
    }
}

// Show proof of service modal
function showProofModal(intentionId) {
    if (!isConnected) {
        alert('Not connected to database')
        return
    }

    // Store the intention ID for submission
    document.getElementById('proofModal').dataset.intentionId = intentionId
    
    // Find intention details for display
    const intention = intentions.find(i => i._id === intentionId)
    if (intention) {
        document.getElementById('proofPrompt').textContent = 
            `Document the work you've completed on "${intention.title}"`
    }
    
    // Show the modal
    document.getElementById('proofModal').classList.add('show')
    document.getElementById('proofContent').focus()
}

// Handle posting proof of service
async function handlePostProof() {
    const modal = document.getElementById('proofModal')
    const intentionId = modal.dataset.intentionId
    
    if (!intentionId) {
        alert('No intention selected')
        return
    }

    const content = document.getElementById('proofContent').value.trim()
    const collaboratorsInput = document.getElementById('proofCollaborators').value.trim()
    const mediaInput = document.getElementById('proofMedia').value.trim()

    if (!content) {
        alert('Please describe the service you provided')
        return
    }

    try {
        // Parse collaborators (comma-separated)
        const collaborators = collaboratorsInput 
            ? collaboratorsInput.split(',').map(name => name.trim()).filter(name => name)
            : []
        
        // Parse media URLs (comma-separated)
        const media = mediaInput 
            ? mediaInput.split(',').map(url => url.trim()).filter(url => url)
            : []

        // Add current user to the "by" array
        const by = [currentUser, ...collaborators]

        // Post the proof
        const result = await window.electronAPI.postProofOfService({
            intentionId: intentionId,
            by: by,
            content: content,
            media: media
        })

        if (result.success) {
            // Close modal and reset form
            modal.classList.remove('show')
            document.getElementById('proofForm').reset()

            // Reload data and update UI
            await loadData()
            updateUI()

            // Show success feedback
            showToast(`Proof of service posted successfully!`, 'success')

            // Check for potential blessings to assign and show notification
            // We need to pass the actual proof data, not just the result
            const fullProofData = {
                _id: result.result.proofId,
                proofId: result.result.proofId,
                intentionId: intentionId,
                by: by,
                content: content,
                media: media,
                timestamp: Date.now()
            }
            await checkForBlessingAssignmentOpportunities(intentionId, fullProofData)
        } else {
            alert(`Error posting proof: ${result.error}`)
        }
    } catch (error) {
        console.error('Error posting proof:', error)
        alert('Failed to post proof of service. Please try again.')
    }
}

// Check for blessing assignment opportunities after proof is posted
async function checkForBlessingAssignmentOpportunities(intentionId, proofResult) {
    try {
        // Debug: Log all blessings for current user
        const allUserBlessings = blessings.filter(blessing => blessing.userId === currentUser)
        console.log('All blessings for current user:', allUserBlessings)
        
        // Debug: Log all blessings for this intention
        const allIntentionBlessings = blessings.filter(blessing => blessing.intentionId === intentionId)
        console.log('All blessings for this intention:', allIntentionBlessings)
        
        // Find current user's potential blessings on this intention (only potential can be assigned)
        const userBlessings = blessings.filter(blessing => 
            blessing.intentionId === intentionId && 
            blessing.status === 'potential' &&
            blessing.userId === currentUser
        )

        console.log('User potential blessings for this intention:', userBlessings)

        if (userBlessings.length > 0) {
            showBlessingAssignmentNotification(intentionId, userBlessings, proofResult)
        } else {
            console.log('No potential blessings found for user on this intention')
        }
    } catch (error) {
        console.error('Error checking for blessing assignment opportunities:', error)
    }
}

// Show blessing assignment notification modal
async function showBlessingAssignmentNotification(intentionId, userBlessings, proofResult) {
    const modal = document.getElementById('blessingNotificationModal')
    const intention = intentions.find(i => i._id === intentionId)
    
    // Store data for later use
    modal.dataset.intentionId = intentionId
    modal.dataset.proofId = proofResult.proofId || proofResult._id

    // Update notification message with prominent author display
    const primaryAuthor = proofResult.by && proofResult.by.length > 0 ? proofResult.by[0] : 'Unknown'
    document.getElementById('notificationMessage').innerHTML = 
        `<strong>${primaryAuthor}</strong> has posted a proof of service for "<em>${intention?.title}</em>". You can assign your potential blessings to reward their service.`

    // Populate potential blessings list
    const blessingsList = document.getElementById('potentialBlessingsList')
    blessingsList.innerHTML = ''

    for (const blessing of userBlessings) {
        // Calculate duration for this blessing
        const duration = await calculateBlessingDuration(blessing)
        
        const blessingElement = document.createElement('div')
        blessingElement.className = 'potential-blessing-item'
        blessingElement.innerHTML = `
            <input type="checkbox" class="blessing-checkbox" data-blessing-id="${blessing._id}" checked>
            <div class="blessing-info">
                <div class="blessing-content">${blessing.content || 'No content'}</div>
                <div class="blessing-meta">
                    <span class="blessing-duration">${formatDuration(duration)}</span>
                    <span>Status: ${blessing.status}</span>
                    <span>${formatDate(blessing.timestamp)}</span>
                </div>
            </div>
        `
        blessingsList.appendChild(blessingElement)
    }

    // Populate proof details
    const proofDetailsContent = document.getElementById('proofDetailsContent')
    console.log('Proof result data:', proofResult)
    proofDetailsContent.innerHTML = `
        <div style="margin-bottom: 12px; font-size: 1.1rem;"><strong>🏆 Service by:</strong> <span style="color: #ffd700; font-weight: 600;">${proofResult.by ? proofResult.by.join(', ') : 'Unknown'}</span></div>
        <div style="margin-bottom: 8px;"><strong>Description:</strong> ${proofResult.content || 'No description'}</div>
        ${proofResult.media && proofResult.media.length > 0 ? `
            <div><strong>Media:</strong> ${proofResult.media.map(url => `<a href="${url}" target="_blank" rel="noopener">📎 Link</a>`).join(', ')}</div>
        ` : ''}
    `

    // Show the modal
    modal.classList.add('show')
}

// Handle blessing assignments
async function handleBlessingAssignments() {
    const modal = document.getElementById('blessingNotificationModal')
    const proofId = modal.dataset.proofId
    
    if (!proofId) {
        alert('No proof ID found')
        return
    }

    try {
        // Get selected blessings
        const checkboxes = modal.querySelectorAll('.blessing-checkbox:checked')
        const selectedBlessingIds = Array.from(checkboxes).map(cb => cb.dataset.blessingId)

        if (selectedBlessingIds.length === 0) {
            alert('Please select at least one blessing to assign')
            return
        }

        // Get the proof data from the modal
        const intentionId = modal.dataset.intentionId
        
        // Get the actual proof document to get the correct provider information
        const proofsResult = await window.electronAPI.getDatabaseDocuments('proofsOfService')
        const proof = proofsResult.documents?.map(doc => doc.value).find(p => p._id === proofId)
        
        if (!proof) {
            alert('Proof not found')
            return
        }
        
        // Show a selection interface for multiple providers or use the first one
        const providers = proof.by || [currentUser]
        
        // For now, assign to the first provider, but in a full implementation 
        // you might want to let users choose which provider gets each blessing
        const primaryProvider = providers[0]
        
        console.log('Assigning blessings to provider:', primaryProvider, 'from proof by:', proof.by)

        console.log('Assigning blessings:', {
            selectedBlessingIds,
            primaryProvider,
            proofId,
            proof: proof
        })

        let assignedCount = 0
        const errors = []
        
        for (const blessingId of selectedBlessingIds) {
            try {
                console.log(`Attempting to assign blessing ${blessingId} to ${primaryProvider}`)
                const result = await window.electronAPI.assignBlessing({
                    blessingId: blessingId,
                    toUserId: primaryProvider,
                    proofId: proofId
                })

                console.log(`Assignment result for ${blessingId}:`, result)

                if (result.success) {
                    assignedCount++
                    console.log(`Successfully assigned blessing ${blessingId}`)
                } else {
                    const errorMsg = `Failed to assign blessing ${blessingId}: ${result.error}`
                    console.error(errorMsg)
                    errors.push(errorMsg)
                }
            } catch (error) {
                const errorMsg = `Error assigning blessing ${blessingId}: ${error.message}`
                console.error(errorMsg)
                errors.push(errorMsg)
            }
        }

        // Close modal
        modal.classList.remove('show')

        // Reload data to reflect changes
        await loadData()
        updateUI()

        // Show success message or errors
        if (assignedCount > 0) {
            showToast(`Successfully assigned ${assignedCount} blessing(s) to ${primaryProvider}`, 'success')
        }
        
        if (errors.length > 0) {
            console.error('Assignment errors:', errors)
            if (assignedCount === 0) {
                alert(`Failed to assign blessings:\n${errors.join('\n')}`)
            } else {
                showToast(`Some assignments failed. Check console for details.`, 'error')
            }
        }

    } catch (error) {
        console.error('Error handling blessing assignments:', error)
        alert(`Failed to assign blessings: ${error.message}. Please try again.`)
    }
}

// Show blessing assignment modal from timeline button
async function showBlessingAssignmentFromTimeline(proofId, intentionId) {
    try {
        // Find the proof document to get details
        const proofsResult = await window.electronAPI.getDatabaseDocuments('proofsOfService')
        const proof = proofsResult.documents?.map(doc => doc.value).find(p => p._id === proofId)
        
        if (!proof) {
            alert('Proof not found')
            return
        }

        // Debug logging for timeline assignment
        console.log('Timeline assignment - looking for blessings:', {
            intentionId,
            currentUser,
            allUserBlessings: blessings.filter(b => b.userId === currentUser),
            allIntentionBlessings: blessings.filter(b => b.intentionId === intentionId)
        })

        // Find current user's potential blessings for this intention (only potential can be assigned)
        const userBlessings = blessings.filter(blessing => 
            blessing.intentionId === intentionId && 
            blessing.status === 'potential' &&
            blessing.userId === currentUser
        )

        if (userBlessings.length === 0) {
            showToast('You have no potential blessings for this intention', 'info')
            return
        }

        // Show the notification modal with this proof
        await showBlessingAssignmentNotification(intentionId, userBlessings, proof)
    } catch (error) {
        console.error('Error showing blessing assignment from timeline:', error)
        alert('Failed to load blessing assignment options')
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