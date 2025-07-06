// Marketplace application state
let currentUser = 'truman'
let offerings = []
let blessings = []
let isConnected = false

// DOM elements
const offeringsGrid = document.getElementById('offeringsGrid')
const createOfferingBtn = document.getElementById('createOfferingBtn')
const refreshBtn = document.getElementById('refreshBtn')
const statusFilter = document.getElementById('statusFilter')
const searchInput = document.getElementById('searchInput')
const sortFilter = document.getElementById('sortFilter')

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
            if (page && page !== 'offerings') {
                window.electronAPI.navigateTo(page)
            }
        })
    })

    // Offerings actions
    createOfferingBtn.addEventListener('click', () => {
        // TODO: Open create offering modal
        console.log('Create offering clicked')
    })

    refreshBtn.addEventListener('click', async () => {
        await loadData()
        updateUI()
    })

    // Filters
    statusFilter.addEventListener('change', updateUI)
    searchInput.addEventListener('input', updateUI)
    sortFilter.addEventListener('change', updateUI)
}

// Check database connection
async function checkConnection() {
    try {
        console.log('Checking database connection...')
        console.log('electronAPI available:', !!window.electronAPI)
        
        if (!window.electronAPI) {
            console.error('electronAPI not available')
            isConnected = false
            return
        }
        
        const status = await window.electronAPI.getConnectionStatus()
        console.log('Database connection status:', status)
        isConnected = status.connected
        
        if (!isConnected && !status.connecting) {
            console.log('Not connected, attempting to connect...')
            // Try to connect
            await window.electronAPI.connectDatabases()
            const newStatus = await window.electronAPI.getConnectionStatus()
            isConnected = newStatus.connected
            console.log('After connection attempt:', newStatus)
        }
        
        if (isConnected) {
            console.log('Connected to database successfully')
        } else {
            console.error('Failed to connect to database')
        }
    } catch (error) {
        console.error('Error checking connection:', error)
        isConnected = false
    }
}

// Load all offerings data
async function loadData() {
    if (!isConnected) {
        console.log('Not connected to database')
        return
    }

    try {
        // Load offerings
        const offeringsResult = await window.electronAPI.getDatabaseDocuments('offerings')
        if (offeringsResult.documents) {
            offerings = offeringsResult.documents.map(doc => doc.value)
        }

        // Load blessings (for portfolio/bidding)
        const blessingsResult = await window.electronAPI.getDatabaseDocuments('blessings')
        if (blessingsResult.documents) {
            blessings = blessingsResult.documents.map(doc => doc.value)
        }

        console.log(`Loaded ${offerings.length} offerings and ${blessings.length} blessings`)
        
        // If no data exists, try to add sample data
        if (offerings.length === 0) {
            console.log('No offerings found, attempting to add sample data...')
            try {
                const sampleResult = await window.electronAPI.addSampleData()
                console.log('Sample data result:', sampleResult)
                
                // Reload data after adding samples
                if (sampleResult.success) {
                    const offeringsResult = await window.electronAPI.getDatabaseDocuments('offerings')
                    if (offeringsResult.documents) {
                        offerings = offeringsResult.documents.map(doc => doc.value)
                        console.log(`After sample data: ${offerings.length} offerings`)
                    }
                }
            } catch (error) {
                console.error('Error adding sample data:', error)
            }
        }
    } catch (error) {
        console.error('Error loading data:', error)
    }
}

// Update UI elements
function updateUI() {
    updateOfferingsGrid()
}

// Update offerings grid with filters
function updateOfferingsGrid() {
    if (!isConnected) {
        offeringsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>Not connected to database. Please check your connection.</p>
            </div>
        `
        return
    }

    if (offerings.length === 0) {
        offeringsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🛍️</div>
                <p>No offerings available yet. Create the first one!</p>
            </div>
        `
        return
    }

    // Apply filters
    let filteredOfferings = offerings

    // Status filter
    const statusValue = statusFilter.value
    if (statusValue !== 'all') {
        filteredOfferings = filteredOfferings.filter(offering => offering.status === statusValue)
    }

    // Search filter
    const searchValue = searchInput.value.toLowerCase()
    if (searchValue) {
        filteredOfferings = filteredOfferings.filter(offering => 
            offering.title.toLowerCase().includes(searchValue) ||
            offering.description.toLowerCase().includes(searchValue)
        )
    }

    // Sort offerings
    const sortValue = sortFilter.value
    switch (sortValue) {
        case 'newest':
            filteredOfferings.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
            break
        case 'slots':
            filteredOfferings.sort((a, b) => b.slotsAvailable - a.slotsAvailable)
            break
        case 'bids':
            filteredOfferings.sort((a, b) => b.tokenOffers.length - a.tokenOffers.length)
            break
    }

    // Render offerings
    if (filteredOfferings.length === 0) {
        offeringsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p>No offerings match your filters.</p>
            </div>
        `
        return
    }

    offeringsGrid.innerHTML = filteredOfferings.map(offering => `
        <div class="offering-card">
            <div class="offering-header">
                <div>
                    <div class="offering-title">${offering.title}</div>
                    <div class="offering-meta">
                        ${offering.time ? `<span>📅 ${formatDate(offering.time)}</span>` : ''}
                        ${offering.place ? `<span>📍 ${offering.place}</span>` : ''}
                    </div>
                </div>
                <div class="offering-status status-${offering.status}">
                    ${offering.status}
                </div>
            </div>

            <div class="offering-description">
                ${offering.description}
            </div>

            <div class="offering-details">
                <div class="detail-item">
                    <div class="detail-label">Slots Available</div>
                    <div class="detail-value slots-available">${offering.slotsAvailable}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Gratitude Bids</div>
                    <div class="detail-value">${offering.tokenOffers.length}</div>
                </div>
            </div>

            ${offering.tokenOffers.length > 0 ? `
                <div class="bids-section">
                    <div class="bids-header">
                        <strong>Gratitude Offerings</strong>
                        <span class="bids-count">${offering.tokenOffers.length} offering${offering.tokenOffers.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="bid-list">
                        ${offering.tokenOffers.slice(0, 3).map(bid => `
                            <div class="bid-item">
                                <span class="bid-user">${bid.userId}</span>
                                <span class="bid-value">Token: ${bid.topToken}</span>
                            </div>
                        `).join('')}
                        ${offering.tokenOffers.length > 3 ? `
                            <div class="bid-item">
                                <span style="opacity: 0.7;">+${offering.tokenOffers.length - 3} more offerings...</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <div class="offering-actions">
                <button class="btn btn-bid" ${offering.status === 'fulfilled' ? 'disabled' : ''} onclick="bidOnOffering('${offering._id}')">
                    ${offering.status === 'fulfilled' ? 'Fulfilled' : 'Place Bid'}
                </button>
            </div>
        </div>
    `).join('')
}

// Handle bidding on an offering
async function bidOnOffering(offeringId) {
    console.log('Bidding on offering:', offeringId)
    
    // TODO: Implement bidding interface
    // 1. Show available tokens/blessings
    // 2. Let user select token to bid with
    // 3. Call bidOnOffering function
    // 4. Refresh offerings display
    
    alert('Bidding interface coming soon! This will show your available tokens and let you place a bid.')
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'No date'
    
    try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    } catch (error) {
        return 'Invalid date'
    }
}

// Debug info
console.log('Offerings app initialized')