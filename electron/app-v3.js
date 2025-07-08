// Synchronicity Engine Dashboard v3 - Connected to OrbitDB
let currentUser = 'truman'
let intentions = []
let blessings = []
let offerings = []
let attentionSwitches = []
let proofsOfService = []
let activeIntention = null
let currentIntentionId = null
let attentionStartTime = null
let timerInterval = null
let isConnected = false
let pendingIntentionSwitch = null
let dataLoaded = false

// Token hierarchy state
let tokenHierarchy = {}
let draggedTokenId = null

// Gratitude potential cache
let gratitudePotentialCache = {}
let cacheTimestamp = 0
const CACHE_DURATION = 30000 // 30 seconds

// Error handling system
const ERROR_TYPES = {
    NETWORK: 'network',
    DATABASE: 'database', 
    VALIDATION: 'validation',
    PERMISSION: 'permission',
    UNKNOWN: 'unknown'
}

const ERROR_MESSAGES = {
    [ERROR_TYPES.NETWORK]: 'Network connection issue. Please check your connection.',
    [ERROR_TYPES.DATABASE]: 'Database error. Please try again.',
    [ERROR_TYPES.VALIDATION]: 'Invalid input. Please check your data.',
    [ERROR_TYPES.PERMISSION]: 'Permission denied. Please check your access.',
    [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred. Please try again.'
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Synchronicity Dashboard v3 initializing...')
    
    // Load token hierarchy from localStorage
    loadTokenHierarchy()
    
    // Load data from OrbitDB
    await loadAllData()
    
    // Setup event listeners (do this before updating dashboard)
    setupEventListeners()
    
    // Start event-based real-time updates
    startEventBasedUpdates()
    
    // Add CSS animations for toasts
    addToastStyles()
    
    // Setup connection status monitoring
    setupConnectionMonitoring()
    
    // Global error handlers
    setupGlobalErrorHandlers()
})

// Setup global error handlers
function setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        handleError(event.reason, 'unhandled promise rejection')
        event.preventDefault()
    })
    
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
        handleError(event.error, 'uncaught error')
    })
    
    // Handle navigation errors
    window.addEventListener('beforeunload', () => {
        // Log any pending errors before page unloads
        const errorLog = localStorage.getItem('errorLog')
        if (errorLog) {
            console.log('Error log before unload:', JSON.parse(errorLog))
        }
    })
}

// Load all data from OrbitDB via Electron API
async function loadAllData() {
    try {
        if (window.electronAPI) {
            console.log('Loading data from OrbitDB...')
            const startTime = performance.now()
            
            // Use the new single API call for maximum speed
            const result = await window.electronAPI.getAllDashboardData()
            
            if (result.success) {
                console.log('Data loaded successfully in single call')
                
                // Assign data directly from the single API response
                intentions = result.data.intentions || []
                blessings = result.data.blessings || []
                offerings = result.data.offerings || []
                attentionSwitches = result.data.attentionSwitches || []
                proofsOfService = result.data.proofsOfService || []
            } else {
                console.log('Single API call failed, using fallback')
                // Fallback to individual API calls if single call fails
                const [intentionsResult, blessingsResult, offeringsResult, attentionResult, proofsResult] = await Promise.all([
                    window.electronAPI.getAllIntentions(),
                    window.electronAPI.getAllBlessings(),
                    window.electronAPI.getAllOfferings(),
                    window.electronAPI.getAllAttentionSwitches(),
                    window.electronAPI.getAllProofsOfService()
                ])
                
                if (intentionsResult.success) intentions = intentionsResult.data
                if (blessingsResult.success) blessings = blessingsResult.data
                if (offeringsResult.success) offerings = offeringsResult.data
                if (attentionResult.success) attentionSwitches = attentionResult.data
                if (proofsResult.success) proofsOfService = proofsResult.data
            }
            
            const endTime = performance.now()
            console.log(`Data loaded in ${Math.round(endTime - startTime)}ms:`, {
                intentions: intentions.length,
                blessings: blessings.length,
                offerings: offerings.length,
                attentionSwitches: attentionSwitches.length,
                proofsOfService: proofsOfService.length
            })
            
            // Update connection status
            isConnected = true
            updateConnectionStatus()
            
            // Mark data as loaded
            dataLoaded = true
            
            // Find active intention for current user (after data is marked as loaded)
            findActiveIntention()
            
            // Clear gratitude potential cache when data loads
            gratitudePotentialCache = {}
            cacheTimestamp = 0
            
            // Immediately update dashboard after data loads
            console.log('Updating dashboard after data load...')
            const dashboardStartTime = performance.now()
            await updateDashboard()
            const dashboardEndTime = performance.now()
            console.log(`Dashboard updated in ${Math.round(dashboardEndTime - dashboardStartTime)}ms`)
            
        } else {
            console.log('ElectronAPI not available - no data will be loaded')
            isConnected = false
            updateConnectionStatus()
            handleError(new Error('ElectronAPI not available'), 'loading data', false)
        }
    } catch (error) {
        isConnected = false
        updateConnectionStatus()
        handleError(error, 'loading data')
    }
}

// Find the current active intention for the user
function findActiveIntention() {
    // Get the most recent attention switch for the current user
    const userAttentionSwitches = attentionSwitches
        .filter(sw => sw.userId === currentUser)
        .sort((a, b) => b.timestamp - a.timestamp)
    
    if (userAttentionSwitches.length > 0) {
        const latestSwitch = userAttentionSwitches[0]
        activeIntention = intentions.find(i => i._id === latestSwitch.intentionId)
        
        if (activeIntention) {
            // Set the attention start time to the switch timestamp
            attentionStartTime = latestSwitch.timestamp
            currentIntentionId = activeIntention._id
            console.log('Found active intention:', activeIntention.title, 'started at:', new Date(attentionStartTime).toLocaleString())
            // Always start the timer when we have an active intention
            startTimer()
        } else {
            console.log('Attention switch found but intention not found:', latestSwitch.intentionId)
            activeIntention = null
            currentIntentionId = null
            attentionStartTime = null
            stopTimer()
        }
    } else {
        // If no attention switches exist, there is genuinely no active intention
        console.log('No attention switches found for user:', currentUser)
        activeIntention = null
        currentIntentionId = null
        attentionStartTime = null
        stopTimer()
    }
    
    const userAttentionSwitchesLength = userAttentionSwitches?.length || 0
    console.log('Active intention result:', {
        activeIntention: activeIntention?.title || 'None',
        currentIntentionId,
        attentionStartTime: attentionStartTime ? new Date(attentionStartTime).toLocaleString() : 'None',
        attentionSwitchesCount: userAttentionSwitchesLength,
        totalIntentions: intentions.length,
        totalAttentionSwitches: attentionSwitches.length
    })
}

// Mock data removed - app only uses real OrbitDB data

// Update all dashboard components
async function updateDashboard() {
    const startTime = performance.now()
    
    console.log('Starting dashboard component updates...')
    
    // Check if DOM elements exist before trying to update them
    const elementsExist = checkDOMElements()
    if (!elementsExist) {
        console.error('DOM elements not ready yet, delaying update...')
        setTimeout(async () => await updateDashboard(), 100)
        return
    }
    
    // Debug: log current data state
    console.log('Dashboard update - current data:', {
        intentions: intentions.length,
        blessings: blessings.length,
        offerings: offerings.length,
        attentionSwitches: attentionSwitches.length,
        proofsOfService: proofsOfService.length,
        activeIntention: activeIntention ? activeIntention.title : 'None'
    })
    
    const activeStart = performance.now()
    await updateActiveIntention()
    console.log(`Active intention updated in ${Math.round(performance.now() - activeStart)}ms`)
    
    const resonatingStart = performance.now()
    await updateResonatingIntentions()
    console.log(`Resonating intentions updated in ${Math.round(performance.now() - resonatingStart)}ms`)
    
    const offeringsStart = performance.now()
    updateOfferings()
    console.log(`Offerings updated in ${Math.round(performance.now() - offeringsStart)}ms`)
    
    const tokensStart = performance.now()
    await updateTokens()
    console.log(`Tokens updated in ${Math.round(performance.now() - tokensStart)}ms`)
    
    const totalTime = performance.now() - startTime
    console.log(`Total dashboard update completed in ${Math.round(totalTime)}ms`)
}

// Check if all required DOM elements exist
function checkDOMElements() {
    const requiredElements = [
        'activeAuthor', 'totalGratitude', 'activeUserAvatars',
        'resonatingList', 'offeringsList', 'tokensList'
    ]
    
    for (const id of requiredElements) {
        const element = document.getElementById(id)
        if (!element) {
            console.error(`Missing DOM element: ${id}`)
            return false
        }
    }
    return true
}

// Update active intention panel
async function updateActiveIntention() {
    const activeAuthor = document.getElementById('activeAuthor')
    const totalGratitude = document.getElementById('totalGratitude')
    const activeUserAvatars = document.getElementById('activeUserAvatars')
    const activeIntentionHeader = document.getElementById('activeIntentionHeader')
    
    if (activeIntention) {
        activeAuthor.textContent = activeIntention.createdBy
        activeIntentionHeader.textContent = activeIntention.title
        
        // Calculate total gratitude potential for this intention using the engine
        calculateProperGratitudePotential(activeIntention._id).then(totalMs => {
            totalGratitude.textContent = `Total: ${formatDuration(totalMs)}`
        }).catch(error => {
            console.error('Error calculating gratitude potential:', error)
            totalGratitude.textContent = `Total: Error calculating`
        })
        
        // Show other active users
        const otherActiveUsers = getActiveUsersForIntention(activeIntention._id)
        activeUserAvatars.innerHTML = otherActiveUsers.map(user => 
            `<div class="user-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#0D1F0A" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="12" cy="7" r="4" stroke="#0D1F0A" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </div>`
        ).join('')
        
    } else {
        if (!dataLoaded) {
            activeAuthor.textContent = 'Loading...'
            totalGratitude.textContent = 'Total: Loading...'
            activeIntentionHeader.textContent = 'Loading...'
        } else {
            activeAuthor.textContent = 'None'
            totalGratitude.textContent = 'Total: 0h 0m'
            activeIntentionHeader.textContent = 'No Active Intention'
        }
        activeUserAvatars.innerHTML = ''
    }
    
    // Refresh timeline details if they're currently open
    await refreshTimelineDetailsIfOpen()
}

// Update resonating intentions list
async function updateResonatingIntentions() {
    const resonatingList = document.getElementById('resonatingList')
    
    if (!dataLoaded) {
        resonatingList.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 20px;">Loading intentions...</div>'
        return
    }
    
    if (intentions.length === 0) {
        resonatingList.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 20px;">No intentions found</div>'
        return
    }
    
    // Show loading state while calculating
    resonatingList.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 20px;">Calculating gratitude potential...</div>'
    
    try {
        // Calculate proper gratitude potential for all intentions
        const intentionsWithPotential = await Promise.all(
            intentions.map(intention => calculateGratitudePotentialWithFallback(intention))
        )
        
        // Sort by gratitude potential
        const sortedIntentions = intentionsWithPotential
            .sort((a, b) => b.gratitudePotential - a.gratitudePotential)
        
        resonatingList.innerHTML = sortedIntentions.map(intention => 
            `<div class="intention-item" onclick="selectIntention('${intention._id}')">
                <div class="font-medium mb-1 text-sm line-clamp-2">${intention.title}</div>
                <div class="flex justify-between items-center text-xs">
                    <span class="opacity-70">by ${intention.createdBy}</span>
                    <span style="color: #D4AF37">${formatDuration(intention.gratitudePotential)}</span>
                </div>
            </div>`
        ).join('')
        
    } catch (error) {
        console.error('Error updating resonating intentions:', error)
        resonatingList.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 20px; color: #FF6B6B;">Error loading intentions</div>'
    }
}

// Synchronicities functionality removed - data is now available in notifications timeline modal

// Update offerings list
function updateOfferings() {
    const offeringsList = document.getElementById('offeringsList')
    
    if (!dataLoaded) {
        offeringsList.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 20px;">Loading offerings...</div>'
    } else if (offerings.length === 0) {
        offeringsList.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 20px;">No offerings found</div>'
    } else {
        offeringsList.innerHTML = offerings.map(offering => 
            `<div class="offering-item" onclick="selectOffering('${offering._id}')">
                <div class="text-sm font-medium mb-2 line-clamp-2">${offering.title}</div>
                <div class="text-xs mb-1">by ${offering.host || 'Host TBD'}</div>
                <div class="text-xs mb-1" style="color: #D4AF37">${formatOfferingTime(offering.time)}</div>
                <div class="text-xs mb-2 opacity-80">${offering.place || offering.location || 'Location TBD'}</div>
                <div class="flex justify-between items-center text-xs">
                    <span>${offering.slotsAvailable || offering.slots || 0} slots</span>
                    <span style="color: #D4AF37">${offering.tokenOffers?.length || offering.bids || 0} bids</span>
                </div>
            </div>`
        ).join('')
    }
}

// Update tokens list
async function updateTokens() {
    await updateTokensDisplay()
}

// Calculate blessing duration from attention switches
function calculateBlessingDuration(blessing) {
    if (!blessing || typeof blessing.attentionIndex !== 'number') {
        console.warn('Invalid blessing for duration calculation:', blessing)
        return 0
    }
    
    const userSwitches = attentionSwitches
        .filter(sw => sw.userId === blessing.userId)
        .sort((a, b) => a.timestamp - b.timestamp)
    
    if (userSwitches.length === 0) {
        console.warn('No attention switches found for user:', blessing.userId)
        return 0
    }
    
    const switchIndex = blessing.attentionIndex
    if (switchIndex < 0 || switchIndex >= userSwitches.length) {
        console.warn(`Invalid attention index ${switchIndex} for user ${blessing.userId}, max index: ${userSwitches.length - 1}`)
        return 0
    }
    
    const startTime = userSwitches[switchIndex].timestamp
    const endTime = switchIndex + 1 < userSwitches.length 
        ? userSwitches[switchIndex + 1].timestamp 
        : Date.now()
    
    return Math.max(0, endTime - startTime)
}

// Get active users for an intention
function getActiveUsersForIntention(intentionId) {
    // Find users who recently switched to this intention
    const recentSwitches = attentionSwitches
        .filter(sw => sw.intentionId === intentionId)
        .filter(sw => Date.now() - sw.timestamp < 86400000) // Within 24 hours
    
    return [...new Set(recentSwitches.map(sw => sw.userId))]
        .filter(userId => userId !== currentUser)
}

// Event handlers

function selectOffering(offeringId) {
    console.log('Selected offering:', offeringId)
    // Could open offering details
}

// Setup event listeners
function setupEventListeners() {
    // Hamburger menu toggle
    const hamburgerButton = document.getElementById('hamburgerButton')
    const navDropdown = document.getElementById('navDropdown')
    
    hamburgerButton.addEventListener('click', (e) => {
        e.stopPropagation()
        navDropdown.classList.toggle('show')
    })
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburgerButton.contains(e.target) && !navDropdown.contains(e.target)) {
            navDropdown.classList.remove('show')
        }
    })
    
    // Navigation pills
    document.querySelectorAll('.nav-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            const page = e.target.dataset.page
            
            // Close dropdown after selection
            navDropdown.classList.remove('show')
            
            if (page && page !== 'app') {
                if (window.electronAPI && window.electronAPI.navigateTo) {
                    window.electronAPI.navigateTo(page)
                } else {
                    console.log('Navigation to:', page)
                }
            }
        })
    })
    
    // Blessing text auto-save
    const blessingText = document.getElementById('blessingText')
    blessingText.addEventListener('input', debounce(saveBlessingContent, 500))
    
    // Username input
    const usernameInput = document.getElementById('usernameInput')
    usernameInput.addEventListener('change', async (e) => {
        currentUser = e.target.value
        await updateDashboard()
    })
    
    // Setup username as drop target for resetting tokens to root
    setupUsernameDropTarget()
    
    // Expand details button
    const expandDetails = document.getElementById('expandDetails')
    expandDetails.addEventListener('click', toggleTimelineDetails)
    
    // Create intention button
    const createIntentionBtn = document.getElementById('createIntentionBtn')
    createIntentionBtn.addEventListener('click', () => {
        document.getElementById('createIntentionModal').style.display = 'flex'
        // Focus on title field after a small delay to ensure modal is fully visible
        setTimeout(() => {
            document.getElementById('intentionTitle').focus()
        }, 100)
    })
    
    // Post proof button
    const postProofBtn = document.getElementById('postProofBtn')
    postProofBtn.addEventListener('click', () => {
        if (!activeIntention) {
            showToast('Please select an active intention first', 'error')
            return
        }
        document.getElementById('proofModal').style.display = 'flex'
    })
    
    // Modal event listeners
    setupModalListeners()
    
    // Start timer if there's an active intention
    if (activeIntention) {
        startTimer()
    }
    
    // Update timer display immediately
    updateTimerDisplay()
    
    // Add click handlers for status indicators
    const statusIndicator = document.querySelector('.status-indicator')
    const notificationsIndicator = document.querySelector('.notifications-indicator')
    
    if (statusIndicator) {
        statusIndicator.addEventListener('click', showConnectionInfo)
        statusIndicator.style.cursor = 'pointer'
        statusIndicator.title = 'Click for connection details'
    }
    
    if (notificationsIndicator) {
        notificationsIndicator.addEventListener('click', showNotificationTimeline)
        notificationsIndicator.style.cursor = 'pointer'
        notificationsIndicator.title = 'Click to view OrbitDB event timeline'
    }
}

function saveBlessingContent() {
    const content = document.getElementById('blessingText').value
    localStorage.setItem('currentBlessingContent', content)
    console.log('Blessing content saved')
}

function toggleTimelineDetails() {
    const button = document.getElementById('expandDetails')
    const isExpanded = button.textContent.includes('▲')
    
    if (isExpanded) {
        button.textContent = '▼ Show Timeline Details'
        hideTimelineDetails()
    } else {
        button.textContent = '▲ Hide Timeline Details'
        showTimelineDetails()
    }
}

function showTimelineDetails() {
    if (!activeIntention) return
    
    // Create timeline details container if it doesn't exist
    let timelineContainer = document.getElementById('timelineDetails')
    if (!timelineContainer) {
        timelineContainer = document.createElement('div')
        timelineContainer.id = 'timelineDetails'
        timelineContainer.style.cssText = `
            margin-top: 16px;
            padding: 16px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            border: 1px solid rgba(212, 175, 55, 0.2);
            max-height: 300px;
            overflow-y: auto;
        `
        
        // Insert after the expand button
        const expandButton = document.getElementById('expandDetails')
        expandButton.parentNode.insertBefore(timelineContainer, expandButton.nextSibling)
    }
    
    // Load timeline data
    loadTimelineDetails(timelineContainer)
    timelineContainer.style.display = 'block'
}

function hideTimelineDetails() {
    const timelineContainer = document.getElementById('timelineDetails')
    if (timelineContainer) {
        timelineContainer.style.display = 'none'
    }
}

async function refreshTimelineDetailsIfOpen() {
    const timelineContainer = document.getElementById('timelineDetails')
    if (timelineContainer && timelineContainer.style.display === 'block') {
        // Timeline is open, refresh it with new data
        await loadTimelineDetails(timelineContainer)
    }
}

async function loadTimelineDetails(container) {
    if (!activeIntention) return
    
    // Get all related data for this intention - only Blessings and Proofs of Service
    const intentionBlessings = blessings.filter(b => b.intentionId === activeIntention._id)
    const intentionProofs = proofsOfService.filter(p => p.intentionId === activeIntention._id)
    
    // Create timeline entries
    const timelineEntries = []
    
    // Add blessings
    for (const blessing of intentionBlessings) {
        // Calculate duration using engine function
        let duration = 0
        try {
            if (window.electronAPI && window.electronAPI.calculateBlessingDuration) {
                const result = await window.electronAPI.calculateBlessingDuration(blessing._id)
                if (result.success) {
                    duration = result.duration
                } else {
                    // Fallback to frontend calculation if engine fails
                    duration = calculateBlessingDuration(blessing)
                }
            } else {
                // Fallback to frontend calculation if engine not available
                duration = calculateBlessingDuration(blessing)
            }
        } catch (error) {
            console.warn('Engine blessing duration calculation failed, using fallback:', error)
            duration = calculateBlessingDuration(blessing)
        }
        
        timelineEntries.push({
            type: 'blessing',
            timestamp: blessing.timestamp,
            data: blessing,
            duration: duration
        })
    }
    
    // Add proofs of service
    intentionProofs.forEach(proof => {
        timelineEntries.push({
            type: 'proof',
            timestamp: proof.timestamp,
            data: proof
        })
    })
    
    // Sort by timestamp (newest first)
    timelineEntries.sort((a, b) => b.timestamp - a.timestamp)
    
    // Generate HTML
    if (timelineEntries.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #E6C565; opacity: 0.7; font-size: 0.9rem; padding: 20px;">
                No blessings or proofs of service yet for this intention
            </div>
        `
        return
    }
    
    const timelineHTML = timelineEntries.map(entry => {
        const timeAgo = getTimeAgo(entry.timestamp)
        const timestamp = new Date(entry.timestamp).toLocaleString()
        
        switch (entry.type) {
            case 'blessing':
                const statusColor = entry.data.status === 'active' ? '#32CD32' : 
                                   entry.data.status === 'given' ? '#FFD700' : 
                                   entry.data.status === 'potential' ? '#E6C565' : '#E6C565'
                const statusText = entry.data.status === 'active' ? 'Active' :
                                  entry.data.status === 'given' ? 'Given' :
                                  entry.data.status === 'potential' ? 'Potential' : 'Unknown'
                
                return `
                    <div class="timeline-entry" style="margin-bottom: 16px; padding: 12px; background: rgba(0, 0, 0, 0.15); border-radius: 8px; border-left: 4px solid ${statusColor};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 0.9rem; color: #D4AF37; font-weight: 600;">🙏 Blessing</span>
                                <span style="font-size: 0.8rem; color: ${statusColor}; background: rgba(${statusColor === '#32CD32' ? '50, 205, 50' : statusColor === '#FFD700' ? '255, 215, 0' : '230, 197, 101'}, 0.2); padding: 2px 6px; border-radius: 4px;">${statusText}</span>
                            </div>
                            <div style="text-align: right; font-size: 0.75rem; color: #E6C565; opacity: 0.8;">
                                <div>${timeAgo}</div>
                                <div style="font-size: 0.7rem; opacity: 0.6;">${timestamp}</div>
                            </div>
                        </div>
                        <div style="font-size: 0.9rem; color: #E6C565; margin-bottom: 8px; line-height: 1.4;">${entry.data.content || 'No blessing content provided'}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
                            <div style="color: #D4AF37; font-weight: 500;">
                                ⏱️ ${formatDuration(entry.duration)}
                            </div>
                            <div style="color: #E6C565; opacity: 0.8;">
                                by ${entry.data.userId || entry.data.stewardId || 'Unknown'}
                            </div>
                        </div>
                    </div>
                `
            case 'proof':
                const proofBy = Array.isArray(entry.data.by) ? entry.data.by.join(', ') : entry.data.by
                const hasMedia = entry.data.media && entry.data.media.length > 0
                
                return `
                    <div class="timeline-entry" style="margin-bottom: 16px; padding: 12px; background: rgba(0, 0, 0, 0.15); border-radius: 8px; border-left: 4px solid #32CD32;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 0.9rem; color: #32CD32; font-weight: 600;">📸 Proof of Service</span>
                                ${hasMedia ? '<span style="font-size: 0.8rem; color: #FFD700; background: rgba(255, 215, 0, 0.2); padding: 2px 6px; border-radius: 4px;">Has Media</span>' : ''}
                            </div>
                            <div style="text-align: right; font-size: 0.75rem; color: #E6C565; opacity: 0.8;">
                                <div>${timeAgo}</div>
                                <div style="font-size: 0.7rem; opacity: 0.6;">${timestamp}</div>
                            </div>
                        </div>
                        <div style="font-size: 0.9rem; color: #E6C565; margin-bottom: 8px; line-height: 1.4;">${entry.data.content || 'No proof content provided'}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
                            <div style="color: #32CD32; font-weight: 500;">
                                ✅ Service Completed
                            </div>
                            <div style="color: #E6C565; opacity: 0.8;">
                                by ${proofBy}
                            </div>
                        </div>
                        ${hasMedia ? `<div style="margin-top: 8px; font-size: 0.7rem; color: #FFD700; opacity: 0.8;">📎 Media: ${entry.data.media.join(', ')}</div>` : ''}
                    </div>
                `
            default:
                return ''
        }
    }).join('')
    
    container.innerHTML = timelineHTML
}

// Start event-based real-time updates
function startEventBasedUpdates() {
    console.log('Setting up event-based real-time updates...')
    
    if (window.electronAPI) {
        // Listen for database update events
        window.electronAPI.onDatabaseUpdated((event, updateInfo) => {
            console.log('Database update received:', updateInfo)
            
            // Debounce rapid updates to avoid excessive re-rendering
            if (updateTimeout) {
                clearTimeout(updateTimeout)
            }
            
            updateTimeout = setTimeout(async () => {
                console.log('Refreshing data due to database update...')
                const startTime = performance.now()
                
                // Reload only the affected data if possible, otherwise reload all
                if (updateInfo.database && updateInfo.operation === 'write') {
                    await reloadSpecificDatabase(updateInfo.database)
                } else {
                    await loadAllData()
                }
                
                const endTime = performance.now()
                console.log(`Event-triggered update completed in ${Math.round(endTime - startTime)}ms`)
            }, 500) // 500ms debounce
        })
        
        // Fallback polling every 30 seconds as backup (much less frequent)
        setInterval(async () => {
            console.log('Periodic backup sync...')
            await loadAllData()
        }, 30000)
        
        console.log('Event-based updates configured successfully')
    } else {
        console.log('ElectronAPI not available, falling back to polling')
        // Fallback to polling if no electronAPI
        setInterval(async () => {
            await loadAllData()
            await updateDashboard()
        }, 5000)
    }
}

let updateTimeout = null

// Reload specific database for more efficient updates
async function reloadSpecificDatabase(databaseName) {
    try {
        const startTime = performance.now()
        
        switch (databaseName) {
            case 'intentions':
                const intentionsResult = await window.electronAPI.getAllIntentions()
                if (intentionsResult.success) intentions = intentionsResult.data
                break
            case 'blessings':
                const blessingsResult = await window.electronAPI.getAllBlessings()
                if (blessingsResult.success) blessings = blessingsResult.data
                break
            case 'offerings':
                const offeringsResult = await window.electronAPI.getAllOfferings()
                if (offeringsResult.success) offerings = offeringsResult.data
                break
            case 'attentionSwitches':
                const attentionResult = await window.electronAPI.getAllAttentionSwitches()
                if (attentionResult.success) attentionSwitches = attentionResult.data
                break
            case 'proofsOfService':
                const proofsResult = await window.electronAPI.getAllProofsOfService()
                if (proofsResult.success) proofsOfService = proofsResult.data
                break
            default:
                // If unknown database, reload everything
                await loadAllData()
                return
        }
        
        // Clear gratitude potential cache when specific data is reloaded
        if (['intentions', 'blessings', 'attentionSwitches'].includes(databaseName)) {
            gratitudePotentialCache = {}
            cacheTimestamp = 0
        }
        
        // Find active intention after any data reload
        findActiveIntention()
        
        // Update dashboard
        await updateDashboard()
        
        const endTime = performance.now()
        console.log(`Specific database reload (${databaseName}) completed in ${Math.round(endTime - startTime)}ms`)
        
    } catch (error) {
        console.error(`Error reloading ${databaseName}:`, error)
        // Fallback to full reload on error
        await loadAllData()
    }
}

// Add toast animation styles
function addToastStyles() {
    const style = document.createElement('style')
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `
    document.head.appendChild(style)
}

// Connection status monitoring
function setupConnectionMonitoring() {
    // Set initial connecting state
    isConnected = false
    updateConnectionStatus()
    
    // Listen for database connection events
    if (window.electronAPI) {
        window.electronAPI.onDatabasesConnected(async () => {
            console.log('Databases connected event received - reloading data')
            isConnected = true
            updateConnectionStatus()
            
            // Reload all data when databases connect
            await loadAllData()
        })
        
        window.electronAPI.onDatabasesConnectionFailed((error) => {
            console.log('Database connection failed:', error)
            isConnected = false
            updateConnectionStatus()
            showToast('Database connection failed', 'error')
        })
    }
}

function updateConnectionStatus() {
    const statusIndicator = document.querySelector('.status-indicator')
    const statusIcon = statusIndicator?.querySelector('svg')
    
    if (isConnected) {
        // Connected state - green with pulse
        statusIndicator.style.backgroundColor = '#32CD32'
        statusIndicator.style.boxShadow = '0 0 12px #32CD32, 0 0 24px rgba(0, 255, 65, 0.25)'
        statusIndicator.style.animation = 'pulse-green 2s infinite'
        if (statusIcon) {
            statusIcon.style.stroke = '#0D1F0A'
        }
    } else {
        // Connecting state - orange with faster pulse
        statusIndicator.style.backgroundColor = '#FFA500'
        statusIndicator.style.boxShadow = '0 0 12px #FFA500, 0 0 24px rgba(255, 165, 0, 0.25)'
        statusIndicator.style.animation = 'pulse-orange 1s infinite'
        if (statusIcon) {
            statusIcon.style.stroke = '#0D1F0A'
        }
    }
    
    // Add orange pulse animation if not exists
    if (!document.querySelector('#connection-status-styles')) {
        const style = document.createElement('style')
        style.id = 'connection-status-styles'
        style.textContent = `
            @keyframes pulse-orange {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
        `
        document.head.appendChild(style)
    }
}

// Drag and drop functionality for tokens
function setupTokenDragAndDrop() {
    const tokenItems = document.querySelectorAll('.token-item')
    const tokensList = document.getElementById('tokensList')
    
    tokenItems.forEach(item => {
        item.addEventListener('dragstart', handleTokenDragStart)
        item.addEventListener('dragend', handleTokenDragEnd)
    })
    
    // Allow dropping on the tokens list itself for reordering
    tokensList.addEventListener('dragover', handleTokenDragOver)
    tokensList.addEventListener('drop', handleTokenDrop)
}

function handleTokenDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.tokenId)
    e.target.style.opacity = '0.5'
    e.target.style.transform = 'rotate(2deg)'
}

function handleTokenDragEnd(e) {
    e.target.style.opacity = '1'
    e.target.style.transform = 'none'
}

function handleTokenDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
}

function handleTokenDrop(e) {
    e.preventDefault()
    const draggedTokenId = e.dataTransfer.getData('text/plain')
    const dropTarget = e.target.closest('.token-item')
    
    if (dropTarget && draggedTokenId) {
        console.log(`Token ${draggedTokenId} dropped near token ${dropTarget.dataset.tokenId}`)
        showToast('Token reordering not yet implemented', 'info')
        // Future: Implement token hierarchy reordering logic here
    }
}

// Utility functions
function formatDuration(ms) {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`
    } else {
        return `${minutes}m`
    }
}

function formatOfferingTime(timeString) {
    if (!timeString) return 'Time TBD'
    
    try {
        const date = new Date(timeString)
        const now = new Date()
        
        // Check if it's today
        if (date.toDateString() === now.toDateString()) {
            return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        }
        
        // Check if it's tomorrow
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        if (date.toDateString() === tomorrow.toDateString()) {
            return `Tomorrow ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        }
        
        // Otherwise show full date
        return date.toLocaleDateString([], { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        })
    } catch (error) {
        return timeString
    }
}

function getTimeAgo(timestamp) {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return `${days} days ago`
    if (hours > 0) return `${hours} hours ago`
    return `${minutes} minutes ago`
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

// Generate default blessing message with time duration
function generateDefaultBlessingMessage() {
    if (!attentionStartTime) {
        return "Focused attention and made progress on this intention."
    }
    
    const elapsed = Date.now() - attentionStartTime
    const duration = formatDuration(elapsed)
    
    // Array of default blessing templates
    const templates = [
        `Spent ${duration} focused on this intention with mindful attention.`,
        `Dedicated ${duration} of concentrated effort to this work.`,
        `Invested ${duration} in thoughtful progress on this intention.`,
        `Applied ${duration} of focused energy to move this intention forward.`,
        `Committed ${duration} to advancing this intention with presence.`
    ]
    
    // Select a template based on the current time (pseudo-random but consistent)
    const templateIndex = Math.floor(Date.now() / 100000) % templates.length
    return templates[templateIndex]
}

// Timer functionality
function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval)
    }
    
    // Don't override attentionStartTime - it should already be set from the attention switch timestamp
    // Only set it if it's not already set (fallback to current time)
    if (!attentionStartTime) {
        attentionStartTime = Date.now()
    }
    currentIntentionId = activeIntention?._id
    
    const timerDisplay = document.getElementById('timerDisplay')
    const timerText = document.getElementById('timerText')
    
    timerInterval = setInterval(() => {
        if (attentionStartTime) {
            const elapsed = Date.now() - attentionStartTime
            if (timerDisplay) {
                timerDisplay.textContent = formatDurationAsTime(elapsed)
            }
        }
    }, 1000)
    
    // Update immediately to show current elapsed time
    if (attentionStartTime) {
        const elapsed = Date.now() - attentionStartTime
        if (timerDisplay) {
            timerDisplay.textContent = formatDurationAsTime(elapsed)
        }
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
    }
    
    const pulseDot = document.getElementById('pulseDot')
    
    if (pulseDot) pulseDot.style.display = 'none'
    
    attentionStartTime = null
    currentIntentionId = null
}

function formatDurationAsTime(ms) {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function updateTimerDisplay() {
    const pulseDot = document.getElementById('pulseDot')
    
    if (activeIntention && currentIntentionId) {
        if (pulseDot) pulseDot.style.display = 'inline-block'
    } else {
        if (pulseDot) pulseDot.style.display = 'none'
    }
}

// Modal functionality
function setupModalListeners() {
    // Create intention modal
    const createIntentionForm = document.getElementById('createIntentionForm')
    const cancelIntentionBtn = document.getElementById('cancelIntentionBtn')
    const createIntentionModal = document.getElementById('createIntentionModal')
    
    createIntentionForm.addEventListener('submit', handleCreateIntention)
    cancelIntentionBtn.addEventListener('click', () => {
        createIntentionModal.style.display = 'none'
        clearForm('createIntentionForm')
    })
    
    // Close modal on background click
    createIntentionModal.addEventListener('click', (e) => {
        if (e.target === createIntentionModal) {
            createIntentionModal.style.display = 'none'
            clearForm('createIntentionForm')
        }
    })
    
    // Blessing modal
    const blessingForm = document.getElementById('blessingForm')
    const cancelBlessingBtn = document.getElementById('cancelBlessingBtn')
    const blessingModal = document.getElementById('blessingModal')
    
    blessingForm.addEventListener('submit', handleBlessingSubmit)
    cancelBlessingBtn.addEventListener('click', () => {
        blessingModal.style.display = 'none'
        clearForm('blessingForm')
        pendingIntentionSwitch = null
    })
    
    // Proof modal
    const proofForm = document.getElementById('proofForm')
    const cancelProofBtn = document.getElementById('cancelProofBtn')
    const proofModal = document.getElementById('proofModal')
    
    proofForm.addEventListener('submit', handleProofSubmit)
    cancelProofBtn.addEventListener('click', () => {
        proofModal.style.display = 'none'
        clearForm('proofForm')
    })
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === createIntentionModal) {
            createIntentionModal.style.display = 'none'
            clearForm('createIntentionForm')
        }
        if (e.target === blessingModal) {
            blessingModal.style.display = 'none'
            clearForm('blessingForm')
            pendingIntentionSwitch = null
        }
        if (e.target === proofModal) {
            proofModal.style.display = 'none'
            clearForm('proofForm')
        }
        if (e.target === document.getElementById('connectionModal')) {
            document.getElementById('connectionModal').style.display = 'none'
        }
        if (e.target === document.getElementById('timelineModal')) {
            document.getElementById('timelineModal').style.display = 'none'
        }
    })
    
    // Close button handlers for new modals
    const closeConnectionModal = document.getElementById('closeConnectionModal')
    const closeTimelineModal = document.getElementById('closeTimelineModal')
    
    if (closeConnectionModal) {
        closeConnectionModal.addEventListener('click', () => {
            document.getElementById('connectionModal').style.display = 'none'
        })
    }
    
    if (closeTimelineModal) {
        closeTimelineModal.addEventListener('click', () => {
            document.getElementById('timelineModal').style.display = 'none'
        })
    }
}

async function handleCreateIntention(e) {
    e.preventDefault()
    
    const title = document.getElementById('intentionTitle').value.trim()
    const description = document.getElementById('intentionDescription').value.trim()
    const blessingContent = document.getElementById('blessingContent').value.trim()
    
    // Clear previous validation errors
    showValidationErrors('intentionTitle', [])
    showValidationErrors('intentionDescription', [])
    showValidationErrors('blessingContent', [])
    
    // Comprehensive validation
    const titleErrors = validateInput(title, {
        required: true,
        minLength: 3,
        maxLength: 100
    })
    
    const descriptionErrors = validateInput(description, {
        maxLength: 500
    })
    
    const blessingErrors = validateInput(blessingContent, {
        maxLength: 200
    })
    
    // Show validation errors
    showValidationErrors('intentionTitle', titleErrors)
    showValidationErrors('intentionDescription', descriptionErrors)
    showValidationErrors('blessingContent', blessingErrors)
    
    // Stop if there are validation errors
    if (titleErrors.length > 0 || descriptionErrors.length > 0 || blessingErrors.length > 0) {
        return
    }
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]')
        const originalText = submitBtn.textContent
        submitBtn.textContent = 'Creating...'
        submitBtn.disabled = true
        
        const intentionParams = {
            userId: currentUser,
            title: title
        }
        
        // Add description if provided
        if (description) {
            intentionParams.description = description
        }
        
        // Add initial blessing content if provided
        if (blessingContent) {
            intentionParams.blessingContent = blessingContent
        }
        
        const result = await window.electronAPI?.setIntention(intentionParams)
        
        if (result?.success) {
            showToast(`Intention "${title}" created successfully!`, 'success')
            document.getElementById('createIntentionModal').style.display = 'none'
            clearForm('createIntentionForm')
            
            // Refresh data and switch to new intention
            await loadAllData()
            await updateDashboard()
        } else {
            const errorMsg = result?.error || 'Unknown error occurred'
            handleError(new Error(errorMsg), 'creating intention')
        }
    } catch (error) {
        handleError(error, 'creating intention')
    } finally {
        // Restore button state
        if (submitBtn) {
            submitBtn.textContent = originalText
            submitBtn.disabled = false
        }
    }
}

async function handleBlessingSubmit(e) {
    e.preventDefault()
    
    const blessingContent = document.getElementById('blessingContent').value
    
    if (!blessingContent) {
        showToast('Please provide blessing content', 'error')
        return
    }
    
    try {
        if (pendingIntentionSwitch) {
            const result = await window.electronAPI?.switchAttention({
                userId: currentUser,
                newIntentionId: pendingIntentionSwitch,
                blessingContent: blessingContent
            })
            
            if (result?.success) {
                showToast('Attention switched successfully!', 'success')
                activeIntention = intentions.find(i => i._id === pendingIntentionSwitch)
                startTimer()
                await updateDashboard()
                
                // Clear the blessing text field since it was submitted
                const blessingTextInput = document.getElementById('blessingText')
                if (blessingTextInput) {
                    blessingTextInput.value = ''
                }
            } else {
                showToast('Failed to switch attention: ' + (result?.error || 'Unknown error'), 'error')
            }
        }
        
        document.getElementById('blessingModal').style.display = 'none'
        clearForm('blessingForm')
        pendingIntentionSwitch = null
        
    } catch (error) {
        console.error('Error switching attention:', error)
        showToast('Error switching attention', 'error')
    }
}

async function handleProofSubmit(e) {
    e.preventDefault()
    
    const proofContent = document.getElementById('proofContent').value
    const proofMedia = document.getElementById('proofMedia').value
    
    if (!proofContent) {
        showToast('Please describe what you accomplished', 'error')
        return
    }
    
    if (!activeIntention) {
        showToast('No active intention to post proof for', 'error')
        return
    }
    
    try {
        const proofParams = {
            intentionId: activeIntention._id,
            by: [currentUser],
            content: proofContent,
            timestamp: Date.now(),
            media: proofMedia && proofMedia.trim() ? [proofMedia.trim()] : []
        }
        
        const result = await window.electronAPI?.postProofOfService(proofParams)
        
        if (result?.success) {
            showToast('Proof of service posted successfully!', 'success')
            document.getElementById('proofModal').style.display = 'none'
            clearForm('proofForm')
            
            // Refresh data to show new proof
            await loadAllData()
            await updateDashboard()
            
            // Check for blessing assignment opportunities
            await checkForBlessingAssignmentOpportunities(activeIntention._id, result)
        } else {
            showToast('Failed to post proof: ' + (result?.error || 'Unknown error'), 'error')
        }
    } catch (error) {
        console.error('Error posting proof:', error)
        showToast('Error posting proof of service', 'error')
    }
}

function clearForm(formId) {
    const form = document.getElementById(formId)
    if (form) {
        form.reset()
    }
}

// Toast notifications
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer')
    const toast = document.createElement('div')
    
    toast.style.cssText = `
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid ${type === 'success' ? '#32CD32' : type === 'error' ? '#FF6B6B' : '#D4AF37'};
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        color: #E6C565;
        box-shadow: 0 0 15px ${type === 'success' ? 'rgba(50, 205, 50, 0.3)' : type === 'error' ? 'rgba(255, 107, 107, 0.3)' : 'rgba(212, 175, 55, 0.3)'};
        animation: slideInRight 0.3s ease;
    `
    
    toast.textContent = message
    toastContainer.appendChild(toast)
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease'
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast)
            }
        }, 300)
    }, 3000)
}

// Show connection information modal
async function showConnectionInfo() {
    const modal = document.getElementById('connectionModal')
    const details = document.getElementById('connectionDetails')
    
    try {
        // Get detailed connection status
        const connectionStatus = await window.electronAPI?.getConnectionStatus()
        const dbList = await window.electronAPI?.getDatabaseList()
        
        let html = `
            <div style="margin-bottom: 16px;">
                <strong>Connection Status:</strong> ${isConnected ? '🟢 Connected' : '🟠 Connecting...'}
            </div>
        `
        
        if (connectionStatus) {
            html += `
                <div style="margin-bottom: 16px;">
                    <strong>OrbitDB Status:</strong> ${connectionStatus.connected ? 'Connected' : 'Disconnected'}<br>
                    <strong>Currently Connecting:</strong> ${connectionStatus.connecting ? 'Yes' : 'No'}
                </div>
            `
        }
        
        if (dbList && dbList.connected && dbList.databases) {
            html += `
                <div style="margin-bottom: 16px;">
                    <strong>Databases:</strong>
                </div>
                <div style="margin-left: 16px; margin-bottom: 16px;">
            `
            
            dbList.databases.forEach(db => {
                html += `
                    <div style="margin-bottom: 8px; padding: 8px; background: rgba(0, 0, 0, 0.3); border-radius: 4px;">
                        <strong>${db.name}</strong> (${db.type})<br>
                        <span style="font-size: 0.8rem; opacity: 0.8;">
                            Documents: ${db.count}<br>
                            Address: ${db.address}
                        </span>
                    </div>
                `
            })
            
            html += '</div>'
        }
        
        html += `
            <div style="margin-bottom: 16px;">
                <strong>Data Summary:</strong><br>
                <span style="margin-left: 16px;">
                    Intentions: ${intentions.length}<br>
                    Blessings: ${blessings.length}<br>
                    Offerings: ${offerings.length}<br>
                    Attention Switches: ${attentionSwitches.length}<br>
                    Proofs of Service: ${proofsOfService.length}
                </span>
            </div>
        `
        
        details.innerHTML = html
        modal.style.display = 'flex'
        
    } catch (error) {
        details.innerHTML = `
            <div style="color: #FF6B6B;">
                <strong>Error getting connection info:</strong><br>
                ${error.message}
            </div>
        `
        modal.style.display = 'flex'
    }
}

// Show notification timeline modal
function showNotificationTimeline() {
    const modal = document.getElementById('timelineModal')
    const timeline = document.getElementById('eventTimeline')
    
    // Create comprehensive timeline from all OrbitDB events
    const events = []
    
    // Add intention events
    intentions.forEach(intention => {
        events.push({
            type: 'intention_created',
            icon: '🎯',
            message: `Intention created: "${intention.title}"`,
            timestamp: intention.createdAt || intention.timestamp || Date.now(),
            user: intention.createdBy,
            data: intention
        })
    })
    
    // Add attention switch events
    attentionSwitches.forEach(sw => {
        const intention = intentions.find(i => i._id === sw.intentionId)
        events.push({
            type: 'attention_switched',
            icon: '👁️',
            message: `Attention switched to: "${intention?.title || 'Unknown'}"`,
            timestamp: sw.timestamp,
            user: sw.userId,
            data: sw
        })
    })
    
    // Add blessing events
    blessings.forEach(blessing => {
        const intention = intentions.find(i => i._id === blessing.intentionId)
        if (blessing.status === 'given') {
            events.push({
                type: 'blessing_assigned',
                icon: '✨',
                message: `Blessing assigned for: "${intention?.title || 'Unknown'}"`,
                timestamp: blessing.timestamp,
                user: blessing.userId,
                data: blessing
            })
        } else {
            events.push({
                type: 'blessing_potential',
                icon: '💫',
                message: `Blessing potential created for: "${intention?.title || 'Unknown'}"`,
                timestamp: blessing.timestamp,
                user: blessing.userId,
                data: blessing
            })
        }
    })
    
    // Add proof events
    proofsOfService.forEach(proof => {
        const intention = intentions.find(i => i._id === proof.intentionId)
        events.push({
            type: 'proof_posted',
            icon: '📸',
            message: `Proof posted for: "${intention?.title || 'Unknown'}"`,
            timestamp: proof.timestamp,
            user: proof.by?.[0] || 'Unknown',
            data: proof
        })
    })
    
    // Add offering events
    offerings.forEach(offering => {
        events.push({
            type: 'offering_created',
            icon: '💝',
            message: `Offering created: "${offering.title}"`,
            timestamp: offering.time ? new Date(offering.time).getTime() : Date.now(),
            user: offering.host || 'Unknown',
            data: offering
        })
    })
    
    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp - a.timestamp)
    
    // Generate HTML
    let html = '<div style="font-family: monospace;">'
    
    if (events.length === 0) {
        html += '<div style="text-align: center; opacity: 0.7;">No events found</div>'
    } else {
        events.forEach((event, index) => {
            const timeAgo = getTimeAgo(event.timestamp)
            const bgColor = index % 2 === 0 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)'
            
            html += `
                <div style="padding: 12px; margin-bottom: 8px; background: ${bgColor}; border-radius: 8px; border-left: 3px solid #D4AF37;">
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                        <span style="margin-right: 8px; font-size: 1.2rem;">${event.icon}</span>
                        <span style="font-weight: 600; color: #D4AF37;">${event.type.replace('_', ' ').toUpperCase()}</span>
                        <span style="margin-left: auto; font-size: 0.8rem; opacity: 0.7;">${timeAgo}</span>
                    </div>
                    <div style="margin-bottom: 4px; color: #E6C565;">
                        ${event.message}
                    </div>
                    <div style="font-size: 0.8rem; opacity: 0.6;">
                        by ${event.user}
                    </div>
                </div>
            `
        })
    }
    
    html += '</div>'
    timeline.innerHTML = html
    modal.style.display = 'flex'
}

// Enhanced selectIntention function to show blessing modal if switching
async function selectIntention(intentionId) {
    if (currentIntentionId && currentIntentionId !== intentionId) {
        // Get the current blessing text from the input field
        const currentBlessingText = document.getElementById('blessingText').value
        
        // Pre-populate the blessing modal with the current text or default message
        const blessingContentTextarea = document.getElementById('blessingContent')
        if (blessingContentTextarea) {
            if (currentBlessingText && currentBlessingText.trim()) {
                // Use existing blessing text if available
                blessingContentTextarea.value = currentBlessingText
            } else {
                // Generate default blessing message with time duration
                const defaultMessage = generateDefaultBlessingMessage()
                blessingContentTextarea.value = defaultMessage
            }
        }
        
        // Show the current intention title in the modal
        const currentIntentionTitleElement = document.getElementById('currentIntentionTitle')
        if (currentIntentionTitleElement && activeIntention) {
            currentIntentionTitleElement.textContent = activeIntention.title
        }
        
        // Show blessing modal for attention switch
        pendingIntentionSwitch = intentionId
        document.getElementById('blessingModal').style.display = 'flex'
        
        // Focus on the blessing content textarea
        setTimeout(() => {
            if (blessingContentTextarea) {
                blessingContentTextarea.focus()
            }
        }, 100)
    } else {
        // Direct switch if no current intention
        activeIntention = intentions.find(i => i._id === intentionId)
        startTimer()
        await updateDashboard()
    }
}

// Check for blessing assignment opportunities after proof posting
async function checkForBlessingAssignmentOpportunities(intentionId, proofResult) {
    console.log('Checking for blessing assignment opportunities...')
    
    // Find current user's potential blessings for this intention
    const userBlessings = blessings.filter(blessing => 
        blessing.intentionId === intentionId && 
        blessing.status === 'potential' &&
        blessing.userId === currentUser
    )
    
    console.log(`Found ${userBlessings.length} potential blessings for assignment`)
    
    if (userBlessings.length > 0) {
        await showBlessingAssignmentNotification(intentionId, userBlessings, proofResult)
    }
}

// Show blessing assignment notification modal
async function showBlessingAssignmentNotification(intentionId, userBlessings, proofResult) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('blessingAssignmentModal')
    if (!modal) {
        modal = document.createElement('div')
        modal.id = 'blessingAssignmentModal'
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        `
        document.body.appendChild(modal)
    }
    
    const intention = intentions.find(i => i._id === intentionId)
    const intentionTitle = intention ? intention.title : 'Unknown Intention'
    
    // Get service provider from proof result
    const providers = Array.isArray(proofResult.result.by) ? proofResult.result.by : [proofResult.result.by]
    const primaryProvider = providers[0]
    
    modal.innerHTML = `
        <div class="modal-content" style="background: rgba(0, 0, 0, 0.9); border: 2px solid #D4AF37; border-radius: 16px; padding: 32px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="color: #D4AF37; margin-bottom: 24px; text-align: center;">🙏 Release Blessings</h3>
            
            <div style="margin-bottom: 24px; text-align: center;">
                <p style="color: #E6C565; margin-bottom: 16px;">
                    <strong>${primaryProvider}</strong> has completed service for:
                </p>
                <p style="color: #D4AF37; font-weight: 600; font-size: 1.1rem; margin-bottom: 16px; font-style: italic;">
                    ${intentionTitle}
                </p>
                <p style="color: #E6C565; font-size: 0.9rem; margin-bottom: 16px;">
                    ${proofResult.result.content || 'Service completed'}
                </p>
                <p style="color: #E6C565; font-size: 0.9rem;">
                    You have potential blessings to release. Select which ones to give:
                </p>
            </div>
            
            <div style="margin-bottom: 24px;" id="blessingsList">
                <!-- Blessings will be populated here -->
            </div>
            
            <div style="display: flex; gap: 16px; justify-content: flex-end;">
                <button type="button" id="cancelBlessingAssignment" style="padding: 12px 24px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 8px; color: #E6C565; cursor: pointer;">
                    Cancel
                </button>
                <button type="button" id="confirmBlessingAssignment" style="padding: 12px 24px; background: rgba(212, 175, 55, 0.3); border: 1px solid #D4AF37; border-radius: 8px; color: #D4AF37; cursor: pointer;">
                    🙏 Release Blessings
                </button>
            </div>
        </div>
    `
    
    // Populate blessings list
    const blessingsList = modal.querySelector('#blessingsList')
    const blessingsHTML = []
    
    for (const blessing of userBlessings) {
        // Calculate duration using engine function
        let duration = 0
        try {
            if (window.electronAPI && window.electronAPI.calculateBlessingDuration) {
                const result = await window.electronAPI.calculateBlessingDuration(blessing._id)
                if (result.success) {
                    duration = result.duration
                } else {
                    // Fallback to frontend calculation if engine fails
                    duration = calculateBlessingDuration(blessing)
                }
            } else {
                // Fallback to frontend calculation if engine not available
                duration = calculateBlessingDuration(blessing)
            }
        } catch (error) {
            console.warn('Engine blessing duration calculation failed, using fallback:', error)
            duration = calculateBlessingDuration(blessing)
        }
        
        const timeAgo = getTimeAgo(blessing.timestamp)
        
        blessingsHTML.push(`
            <div style="margin-bottom: 16px; padding: 12px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; border: 1px solid rgba(212, 175, 55, 0.3);">
                <label style="display: flex; align-items: flex-start; cursor: pointer;">
                    <input type="checkbox" class="blessing-checkbox" data-blessing-id="${blessing._id}" checked 
                           style="margin-right: 12px; margin-top: 4px; transform: scale(1.2);">
                    <div style="flex: 1;">
                        <div style="color: #D4AF37; font-weight: 500; margin-bottom: 4px;">
                            ⏱️ ${formatDuration(duration)} blessing
                        </div>
                        <div style="color: #E6C565; font-size: 0.9rem; margin-bottom: 4px;">
                            ${blessing.content || 'No content provided'}
                        </div>
                        <div style="color: #E6C565; font-size: 0.8rem; opacity: 0.8;">
                            Created ${timeAgo}
                        </div>
                    </div>
                </label>
            </div>
        `)
    }
    
    blessingsList.innerHTML = blessingsHTML.join('')
    
    // Add event listeners
    const cancelBtn = modal.querySelector('#cancelBlessingAssignment')
    const confirmBtn = modal.querySelector('#confirmBlessingAssignment')
    
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none'
    })
    
    confirmBtn.addEventListener('click', async () => {
        await handleBlessingAssignments(modal, primaryProvider, proofResult.result._id)
    })
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none'
        }
    })
    
    modal.style.display = 'flex'
}

// Handle blessing assignments
async function handleBlessingAssignments(modal, serviceProvider, proofId) {
    const checkboxes = modal.querySelectorAll('.blessing-checkbox:checked')
    const selectedBlessingIds = Array.from(checkboxes).map(cb => cb.dataset.blessingId)
    
    if (selectedBlessingIds.length === 0) {
        showToast('Please select at least one blessing to assign', 'error')
        return
    }
    
    try {
        // Get the actual proof document to get the correct provider information (like v1)
        const proof = proofsOfService.find(p => p._id === proofId)
        
        if (!proof) {
            showToast('Proof not found', 'error')
            return
        }
        
        // Get the primary provider from the proof document
        const providers = Array.isArray(proof.by) ? proof.by : [proof.by]
        const primaryProvider = providers[0]
        
        console.log('Assigning blessings to provider:', primaryProvider, 'from proof by:', proof.by)
        
        let successCount = 0
        let errorCount = 0
        const errors = []
        
        console.log('Starting blessing assignments with params:', {
            selectedBlessingIds,
            primaryProvider,
            proofId,
            proof: proof
        })
        
        for (const blessingId of selectedBlessingIds) {
            try {
                console.log(`Attempting to assign blessing ${blessingId} to ${primaryProvider}`)
                
                const result = await window.electronAPI?.assignBlessing({
                    blessingId: blessingId,
                    toUserId: primaryProvider,
                    proofId: proofId
                })
                
                console.log(`Assignment result for blessing ${blessingId}:`, result)
                
                if (result?.success) {
                    successCount++
                    console.log(`Successfully assigned blessing ${blessingId}`)
                } else {
                    errorCount++
                    const errorMsg = result?.error || 'Unknown error'
                    errors.push(`${blessingId}: ${errorMsg}`)
                    console.error(`Failed to assign blessing ${blessingId}: ${errorMsg}`)
                }
            } catch (error) {
                errorCount++
                const errorMsg = `Error assigning blessing ${blessingId}: ${error.message}`
                console.error(errorMsg)
                errors.push(errorMsg)
            }
        }
        
        modal.style.display = 'none'
        
        if (successCount > 0) {
            const message = `Successfully released ${successCount} blessing${successCount > 1 ? 's' : ''} to ${serviceProvider}`
            showToast(message, 'success')
            
            // Refresh data to reflect changes
            await loadAllData()
            await updateDashboard()
        }
        
        if (errorCount > 0) {
            const errorSummary = errors.length > 3 ? 
                `${errorCount} failures (see console for details)` : 
                errors.join('; ')
            showToast(`Failed to assign ${errorCount} blessing${errorCount > 1 ? 's' : ''}: ${errorSummary}`, 'error')
        }
        
    } catch (error) {
        console.error('Error assigning blessings:', error)
        showToast('Error assigning blessings', 'error')
    }
}

// Token hierarchy utility functions
function setTokenParent(tokenId, parentId) {
    if (!tokenHierarchy[tokenId]) {
        tokenHierarchy[tokenId] = { children: [] }
    }
    
    // Remove from old parent if exists
    if (tokenHierarchy[tokenId].parent) {
        removeTokenFromParent(tokenId, tokenHierarchy[tokenId].parent)
    }
    
    // Set new parent
    tokenHierarchy[tokenId].parent = parentId
    
    // Add to new parent's children
    if (parentId) {
        if (!tokenHierarchy[parentId]) {
            tokenHierarchy[parentId] = { children: [] }
        }
        if (!tokenHierarchy[parentId].children.includes(tokenId)) {
            tokenHierarchy[parentId].children.push(tokenId)
        }
    }
    
    saveTokenHierarchy()
}

function removeTokenFromParent(tokenId, parentId) {
    if (tokenHierarchy[parentId] && tokenHierarchy[parentId].children) {
        const index = tokenHierarchy[parentId].children.indexOf(tokenId)
        if (index > -1) {
            tokenHierarchy[parentId].children.splice(index, 1)
        }
    }
}

function getTokenChildren(tokenId) {
    return tokenHierarchy[tokenId] ? tokenHierarchy[tokenId].children || [] : []
}

function getTokenParent(tokenId) {
    return tokenHierarchy[tokenId] ? tokenHierarchy[tokenId].parent || null : null
}

function getRootTokens(allTokens) {
    return allTokens.filter(token => !getTokenParent(token._id))
}

function saveTokenHierarchy() {
    localStorage.setItem('tokenHierarchy', JSON.stringify(tokenHierarchy))
}

function loadTokenHierarchy() {
    try {
        const saved = localStorage.getItem('tokenHierarchy')
        if (saved) {
            tokenHierarchy = JSON.parse(saved)
        }
    } catch (error) {
        console.error('Error loading token hierarchy:', error)
        tokenHierarchy = {}
    }
}

// Toggle token hierarchy expansion
async function toggleTokenHierarchy(tokenId) {
    if (!tokenHierarchy[tokenId]) {
        tokenHierarchy[tokenId] = { children: [] }
    }
    
    const wasExpanded = tokenHierarchy[tokenId].expanded !== false
    tokenHierarchy[tokenId].expanded = !wasExpanded
    
    const childrenContainer = document.getElementById(`hierarchy-children-${tokenId}`)
    const toggle = document.querySelector(`[data-token-id="${tokenId}"] .token-hierarchy-toggle`)
    
    if (childrenContainer && toggle) {
        if (tokenHierarchy[tokenId].expanded) {
            childrenContainer.classList.add('expanded')
            toggle.textContent = '▼'
        } else {
            childrenContainer.classList.remove('expanded')
            toggle.textContent = '▶'
        }
    }
    
    saveTokenHierarchy()
    await updateTokensDisplay()
}

// Calculate proper gratitude potential using the engine with caching
async function calculateProperGratitudePotential(intentionId) {
    const now = Date.now()
    
    // Check cache first
    if (gratitudePotentialCache[intentionId] && (now - cacheTimestamp) < CACHE_DURATION) {
        return gratitudePotentialCache[intentionId]
    }
    
    try {
        if (window.electronAPI && window.electronAPI.calculateGratitudePotential) {
            const result = await window.electronAPI.calculateGratitudePotential({
                intentionId: intentionId
            })
            
            if (result.success) {
                // Cache the result
                gratitudePotentialCache[intentionId] = result.potential
                cacheTimestamp = now
                return result.potential
            } else {
                throw new Error(result.error || 'Failed to calculate gratitude potential')
            }
        } else {
            throw new Error('ElectronAPI not available')
        }
    } catch (error) {
        console.error('Error in calculateProperGratitudePotential:', error)
        throw error
    }
}

// Calculate gratitude potential with fallback for multiple intentions
async function calculateGratitudePotentialWithFallback(intention) {
    try {
        const potential = await calculateProperGratitudePotential(intention._id)
        return { ...intention, gratitudePotential: potential }
    } catch (error) {
        console.error('Engine gratitude potential calculation failed for intention:', intention._id, error)
        // Return zero potential if engine calculation fails
        return { ...intention, gratitudePotential: 0 }
    }
}

// Update tokens display with hierarchical structure
async function updateTokensDisplay() {
    const tokensList = document.getElementById('tokensList')
    if (!tokensList) return
    
    // Get user's blessings/tokens
    const userTokens = blessings.filter(blessing => blessing.stewardId === currentUser)
    
    if (userTokens.length === 0) {
        tokensList.innerHTML = `
            <div style="text-align: center; color: #E6C565; opacity: 0.7; padding: 20px;">
                No tokens yet. Create intentions to start earning tokens!
            </div>
        `
        return
    }
    
    // Get root tokens (tokens with no parent)
    const rootTokens = getRootTokens(userTokens)
    
    // Create hierarchical structure
    tokensList.innerHTML = ''
    for (const token of rootTokens) {
        const tokenElement = await createHierarchicalTokenElement(token, userTokens, 0)
        tokensList.appendChild(tokenElement)
    }
}

// Create a hierarchical token element
async function createHierarchicalTokenElement(token, allTokens, depth) {
    const tokenId = token._id
    const children = getTokenChildren(tokenId)
    const childTokens = children.map(childId => allTokens.find(t => t._id === childId)).filter(Boolean)
    const hasChildren = childTokens.length > 0
    const isExpanded = tokenHierarchy[tokenId]?.expanded !== false
    
    const tokenDiv = document.createElement('div')
    tokenDiv.className = 'token-item'
    tokenDiv.setAttribute('data-token-id', tokenId)
    
    // Calculate actual duration using engine
    let duration = '0s'
    try {
        if (window.electronAPI && window.electronAPI.calculateBlessingDuration) {
            const result = await window.electronAPI.calculateBlessingDuration(token._id)
            if (result.success) {
                duration = formatDuration(result.duration)
            }
        }
    } catch (error) {
        console.warn('Engine blessing duration calculation failed, using fallback:', error)
        const fallbackMs = calculateBlessingDuration(token)
        duration = formatDuration(fallbackMs)
    }
    
    tokenDiv.innerHTML = `
        <div class="token-content" draggable="true" data-token-id="${tokenId}">
            <div class="token-header">
                <div style="display: flex; align-items: center;">
                    ${hasChildren ? `<span class="token-hierarchy-toggle" onclick="toggleTokenHierarchy('${tokenId}')" style="cursor: pointer;">${isExpanded ? '▼' : '▶'}</span>` : '<span style="width: 16px;"></span>'}
                    <span class="token-title">${token.intentionId ? intentions.find(i => i._id === token.intentionId)?.title || 'Unknown Intention' : 'Token'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="token-duration">${duration}</span>
                    <span class="token-status ${token.status}">${token.status}</span>
                </div>
            </div>
            ${token.content ? `<div style="font-size: 0.75rem; color: #E6C565; opacity: 0.8; margin-top: 4px;">${token.content}</div>` : ''}
        </div>
        ${hasChildren ? `<div class="token-children ${isExpanded ? 'expanded' : ''}" id="hierarchy-children-${tokenId}"></div>` : ''}
    `
    
    // Add drag and drop event listeners
    const tokenContent = tokenDiv.querySelector('.token-content')
    tokenContent.addEventListener('dragstart', handleHierarchyDragStart)
    tokenContent.addEventListener('dragover', handleHierarchyDragOver)
    tokenContent.addEventListener('drop', handleHierarchyDrop)
    tokenContent.addEventListener('dragend', handleHierarchyDragEnd)
    
    // Add children if expanded
    if (hasChildren && isExpanded) {
        const childrenContainer = tokenDiv.querySelector(`#hierarchy-children-${tokenId}`)
        for (const childToken of childTokens) {
            const childElement = await createHierarchicalTokenElement(childToken, allTokens, depth + 1)
            childrenContainer.appendChild(childElement)
        }
    }
    
    return tokenDiv
}

// Error handling functions
function classifyError(error) {
    if (!error) return ERROR_TYPES.UNKNOWN
    
    const errorMessage = error.message?.toLowerCase() || error.toString().toLowerCase()
    
    if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('fetch')) {
        return ERROR_TYPES.NETWORK
    }
    if (errorMessage.includes('database') || errorMessage.includes('orbitdb') || errorMessage.includes('ipfs')) {
        return ERROR_TYPES.DATABASE
    }
    if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorMessage.includes('required')) {
        return ERROR_TYPES.VALIDATION
    }
    if (errorMessage.includes('permission') || errorMessage.includes('access') || errorMessage.includes('denied')) {
        return ERROR_TYPES.PERMISSION
    }
    
    return ERROR_TYPES.UNKNOWN
}

function handleError(error, context = '', userFriendly = true) {
    console.error(`Error in ${context}:`, error)
    
    if (userFriendly) {
        const errorType = classifyError(error)
        const message = ERROR_MESSAGES[errorType]
        const contextSuffix = context ? ` (${context})` : ''
        showToast(`${message}${contextSuffix}`, 'error')
    }
    
    // Log to a centralized error tracking system (if available)
    logError(error, context)
}

function logError(error, context) {
    // Store errors for debugging
    const errorLog = {
        timestamp: new Date().toISOString(),
        context,
        message: error.message || error.toString(),
        stack: error.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
    }
    
    // Save to localStorage for debugging
    try {
        const existingErrors = JSON.parse(localStorage.getItem('errorLog') || '[]')
        existingErrors.push(errorLog)
        
        // Keep only last 50 errors
        if (existingErrors.length > 50) {
            existingErrors.splice(0, existingErrors.length - 50)
        }
        
        localStorage.setItem('errorLog', JSON.stringify(existingErrors))
    } catch (e) {
        console.error('Failed to log error to localStorage:', e)
    }
}

function validateInput(value, rules) {
    const errors = []
    
    if (rules.required && (!value || value.trim() === '')) {
        errors.push('This field is required')
    }
    
    if (rules.minLength && value && value.length < rules.minLength) {
        errors.push(`Must be at least ${rules.minLength} characters`)
    }
    
    if (rules.maxLength && value && value.length > rules.maxLength) {
        errors.push(`Must be no more than ${rules.maxLength} characters`)
    }
    
    if (rules.pattern && value && !rules.pattern.test(value)) {
        errors.push(rules.patternMessage || 'Invalid format')
    }
    
    return errors
}

function showValidationErrors(fieldId, errors) {
    const field = document.getElementById(fieldId)
    if (!field) return
    
    // Remove existing error display
    const existingError = field.parentNode.querySelector('.validation-error')
    if (existingError) {
        existingError.remove()
    }
    
    if (errors.length > 0) {
        // Add error styling
        field.style.borderColor = '#FF6B6B'
        
        // Create error message
        const errorDiv = document.createElement('div')
        errorDiv.className = 'validation-error'
        errorDiv.style.cssText = 'color: #FF6B6B; font-size: 0.75rem; margin-top: 4px;'
        errorDiv.textContent = errors[0] // Show first error
        
        field.parentNode.appendChild(errorDiv)
    } else {
        // Remove error styling
        field.style.borderColor = ''
    }
}

// Debug function to view error logs
function showErrorLog() {
    try {
        const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]')
        console.group('Error Log (' + errorLog.length + ' entries)')
        errorLog.forEach((error, index) => {
            console.log(`${index + 1}. [${error.timestamp}] ${error.context}: ${error.message}`)
        })
        console.groupEnd()
        
        if (errorLog.length === 0) {
            showToast('No errors logged', 'success')
        } else {
            showToast(`${errorLog.length} errors in console log`, 'info')
        }
    } catch (error) {
        console.error('Failed to display error log:', error)
    }
}

// Clear error log
function clearErrorLog() {
    localStorage.removeItem('errorLog')
    showToast('Error log cleared', 'success')
}

// Retry operation with exponential backoff
async function retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation()
        } catch (error) {
            if (attempt === maxRetries) {
                throw error
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1)
            console.log(`Retry attempt ${attempt} failed, retrying in ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }
}

// Setup username input as drop target for resetting tokens to root
function setupUsernameDropTarget() {
    const usernameInput = document.getElementById('usernameInput')
    if (!usernameInput) return
    
    // Allow drop on username input
    usernameInput.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        usernameInput.classList.add('drag-over')
    })
    
    usernameInput.addEventListener('dragleave', (e) => {
        // Only remove highlight if we're actually leaving the element
        if (!usernameInput.contains(e.relatedTarget)) {
            usernameInput.classList.remove('drag-over')
        }
    })
    
    usernameInput.addEventListener('drop', async (e) => {
        e.preventDefault()
        usernameInput.classList.remove('drag-over')
        
        if (draggedTokenId) {
            await resetTokenToRoot(draggedTokenId)
        }
    })
}

// Reset a token to root level (remove from parent) while preserving its children
async function resetTokenToRoot(tokenId) {
    const parentId = getTokenParent(tokenId)
    
    if (parentId) {
        // Remove from parent's children list
        removeTokenFromParent(tokenId, parentId)
        
        // Clear only the parent reference, keeping children intact
        if (tokenHierarchy[tokenId]) {
            delete tokenHierarchy[tokenId].parent
            // Note: We deliberately keep tokenHierarchy[tokenId].children intact
        }
        
        saveTokenHierarchy()
        await updateTokensDisplay()
        
        const childCount = getTokenChildren(tokenId).length
        const childText = childCount > 0 ? ` (with ${childCount} child${childCount > 1 ? 'ren' : ''})` : ''
        showToast(`Token moved to root level${childText}`, 'success')
        console.log(`Token ${tokenId} reset to root level from parent ${parentId}, preserving ${childCount} children`)
    } else {
        showToast('Token is already at root level', 'info')
    }
}

// Drag and drop handlers for token hierarchy
function handleHierarchyDragStart(e) {
    const tokenElement = e.target.closest('[data-token-id]')
    if (!tokenElement) return
    
    draggedTokenId = tokenElement.dataset.tokenId
    e.target.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', draggedTokenId)
    
    console.log('Drag started:', draggedTokenId)
}

function handleHierarchyDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    const targetElement = e.currentTarget.closest('[data-token-id]')
    if (targetElement && targetElement.dataset.tokenId !== draggedTokenId) {
        targetElement.classList.add('drag-over')
    }
}

async function handleHierarchyDrop(e) {
    e.preventDefault()
    
    const targetElement = e.currentTarget.closest('[data-token-id]')
    const targetTokenId = targetElement ? targetElement.dataset.tokenId : null
    
    if (targetTokenId && targetTokenId !== draggedTokenId) {
        console.log(`Creating parent-child relationship: ${draggedTokenId} -> ${targetTokenId}`)
        setTokenParent(draggedTokenId, targetTokenId)
        await updateTokensDisplay()
        showToast('Token hierarchy updated', 'success')
    }
    
    // Clean up
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
}

function handleHierarchyDragEnd(e) {
    e.target.classList.remove('dragging')
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
    draggedTokenId = null
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDuration,
        getTimeAgo,
        calculateBlessingDuration,
        formatDurationAsTime
    }
}