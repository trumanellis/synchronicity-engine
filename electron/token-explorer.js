// Token Explorer - Standalone Fractal Navigation Interface

// Main application state
let currentUser = 'truman'
let intentions = []
let blessings = []
let isConnected = false

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await checkConnection()
    await loadData()
    await initializeFractalExplorer()
})

// Check database connection
async function checkConnection() {
    try {
        const status = await window.electronAPI.getConnectionStatus()
        isConnected = status.connected
        console.log('Explorer connection status:', status)
    } catch (error) {
        console.error('Error checking connection:', error)
        isConnected = false
    }
}

// Load data from databases
async function loadData() {
    if (!isConnected) {
        console.log('Not connected to databases, skipping data load')
        return
    }

    try {
        // Load intentions
        const intentionsResult = await window.electronAPI.getDatabaseDocuments('intentions')
        if (intentionsResult.documents) {
            intentions = intentionsResult.documents.map(doc => doc.value)
            console.log('Loaded intentions:', intentions.length)
        }

        // Load blessings
        const blessingsResult = await window.electronAPI.getDatabaseDocuments('blessings')
        if (blessingsResult.documents) {
            blessings = blessingsResult.documents.map(doc => doc.value)
            console.log('Loaded blessings:', blessings.length)
        }
    } catch (error) {
        console.error('Error loading data:', error)
    }
}

// Navigate back to main app
function navigateToApp() {
    window.electronAPI.navigateTo('app')
}

// Initialize the fractal explorer
async function initializeFractalExplorer() {
    console.log('Initializing fractal explorer')
    
    // Initialize navigation state
    window.navState = {
        currentLevel: 0,
        currentToken: { id: 'user', type: 'user', content: 'User Center', emoji: '☀️' },
        navigationStack: [],
        maxLevel: 5
    }
    
    // Set up the navigation view
    await initializeNavigationView()
}

// Initialize the navigation view
async function initializeNavigationView() {
    const currentNodeEmoji = document.getElementById('currentNodeEmoji')
    const currentTitle = document.getElementById('currentTitle')
    const currentGratitude = document.getElementById('currentGratitude')
    const parentSection = document.getElementById('parentSection')
    
    // Update current node
    const current = window.navState.currentToken
    currentNodeEmoji.innerHTML = current.emoji
    
    // Show user name for root level, otherwise show token content
    if (current.id === 'user') {
        currentTitle.textContent = `${currentUser} Center`
    } else {
        currentTitle.textContent = current.content
    }
    
    // Calculate and display gratitude
    const gratitudeMinutes = await calculateTokenGratitude(current.id)
    currentGratitude.textContent = formatGratitude(gratitudeMinutes)
    
    // Show/hide parent section
    if (window.navState.currentLevel > 0) {
        parentSection.style.display = 'flex'
        await setupParentNode()
    } else {
        parentSection.style.display = 'none'
    }
    
    // Generate and render children
    const children = await generateChildrenForToken(current)
    await renderChildren(children)
    
    // Update breadcrumb
    updateBreadcrumb()
    
    // Update info overlay
    await updateInfoOverlay(current, children)
}

// Generate children for a given token
async function generateChildrenForToken(token) {
    // For user center, get all intentions from database
    if (token.id === 'user') {
        try {
            console.log('Loading intentions for user center. Total intentions:', intentions?.length || 0)
            const allIntentions = intentions || []
            const children = allIntentions.map(intention => ({
                id: intention._id,
                content: intention.title,
                emoji: '🏆',
                type: 'intention',
                children: (intention.blessings || []).length
            }))
            console.log('Generated children for user:', children)
            return children
        } catch (error) {
            console.error('Error loading intentions:', error)
            return []
        }
    }
    
    // For intentions, get their blessings as children
    const intention = intentions.find(i => i._id === token.id)
    if (intention && intention.blessings) {
        try {
            const intentionBlessings = blessings.filter(blessing => 
                intention.blessings.includes(blessing._id)
            )
            return intentionBlessings.map(blessing => ({
                id: blessing._id,
                content: blessing.content,
                emoji: '⭐',
                type: 'blessing',
                children: 0 // Blessings are leaf nodes for now
            }))
        } catch (error) {
            console.error('Error loading blessings for intention:', error)
            return []
        }
    }
    
    // Fallback: return empty array
    return []
}

// Setup parent node for navigation back
async function setupParentNode() {
    const parentNode = document.getElementById('parentNode')
    const parentLabel = document.getElementById('parentLabel')
    const parentGratitude = document.getElementById('parentGratitude')
    const siblingsContainer = document.getElementById('siblingsContainer')
    
    if (window.navState.navigationStack.length > 0) {
        const parentToken = window.navState.navigationStack[window.navState.navigationStack.length - 1]
        
        // Calculate actual gratitude from attention events
        const gratitudeMinutes = await calculateTokenGratitude(parentToken.id)
        
        // Update parent node display
        parentLabel.textContent = parentToken.content
        parentGratitude.textContent = formatGratitude(gratitudeMinutes)
        
        // Add click event to go back
        parentNode.onclick = () => navigateToParent()
        
        // Show siblings of current token
        await renderSiblings(parentToken)
    }
}

// Render sibling tokens
async function renderSiblings(parentToken) {
    const siblingsContainer = document.getElementById('siblingsContainer')
    siblingsContainer.innerHTML = ''
    
    const siblings = (await generateChildrenForToken(parentToken))
        .filter(child => child.id !== window.navState.currentToken.id)
    
    // Calculate gratitude for all siblings and sort by it
    const siblingsWithGratitude = await Promise.all(
        siblings.map(async (sibling) => ({
            ...sibling,
            calculatedGratitude: await calculateTokenGratitude(sibling.id)
        }))
    )
    
    siblingsWithGratitude
        .sort((a, b) => b.calculatedGratitude - a.calculatedGratitude)
        .forEach(sibling => {
            const siblingNode = document.createElement('div')
            siblingNode.className = 'sibling-node'
            siblingNode.innerHTML = `
                <span class="sibling-label">${sibling.content}</span>
                <span class="sibling-gratitude">${formatGratitude(sibling.calculatedGratitude)}</span>
            `
            
            siblingNode.onclick = () => navigateToToken(sibling)
            siblingsContainer.appendChild(siblingNode)
        })
}

// Render children tokens
async function renderChildren(children) {
    const childrenSection = document.getElementById('childrenSection')
    childrenSection.innerHTML = ''
    
    console.log('Rendering children:', children.length, 'children')
    console.log('Children data:', children)
    
    if (children.length === 0) {
        console.log('No children to render')
        return
    }
    
    // Calculate gratitude for all children and sort by it
    const childrenWithGratitude = await Promise.all(
        children.map(async (child) => {
            const gratitude = await calculateTokenGratitude(child.id)
            console.log(`Child ${child.id} (${child.content}): ${gratitude} minutes`)
            return {
                ...child,
                calculatedGratitude: gratitude
            }
        })
    )
    
    console.log('Children with gratitude:', childrenWithGratitude)
    
    childrenWithGratitude
        .sort((a, b) => b.calculatedGratitude - a.calculatedGratitude)
        .forEach((child, index) => {
            console.log(`Creating child node ${index}:`, child.content)
            const childNode = document.createElement('div')
            childNode.className = 'child-node'
            childNode.innerHTML = `
                ${child.emoji}
                <span class="child-label">${child.content}</span>
                <span class="child-gratitude">${formatGratitude(child.calculatedGratitude)}</span>
            `
            
            childNode.onclick = () => navigateToToken(child)
            childrenSection.appendChild(childNode)
            console.log('Appended child node to section')
        })
    
    console.log('Final children section innerHTML:', childrenSection.innerHTML)
}

// Calculate hierarchical token gratitude (sum across itself and all children)
async function calculateTokenGratitude(tokenId) {
    if (!isConnected) {
        return 0 // Return 0 if not connected to database
    }
    
    try {
        // For user center, calculate sum of all intentions and their children
        if (tokenId === 'user') {
            let totalGratitude = 0
            
            // Sum all intentions and their blessings
            for (const intention of intentions || []) {
                const intentionGratitude = await calculateTokenGratitude(intention._id)
                totalGratitude += intentionGratitude
            }
            
            return totalGratitude
        }
        
        // For intentions, calculate own duration + sum of all blessings
        const intention = intentions.find(i => i._id === tokenId)
        if (intention) {
            let totalGratitude = 0
            
            // Add intention's own duration
            const intentionResult = await window.electronAPI.calculateBlessingDuration(tokenId)
            if (intentionResult.success) {
                totalGratitude += Math.floor(intentionResult.duration / 60000)
            }
            
            // Add sum of all blessings for this intention
            if (intention.blessings) {
                for (const blessingId of intention.blessings) {
                    const blessingResult = await window.electronAPI.calculateBlessingDuration(blessingId)
                    if (blessingResult.success) {
                        totalGratitude += Math.floor(blessingResult.duration / 60000)
                    }
                }
            }
            
            return totalGratitude
        }
        
        // For blessings, just return their own duration
        const result = await window.electronAPI.calculateBlessingDuration(tokenId)
        if (result.success) {
            return Math.floor(result.duration / 60000) // Convert ms to minutes
        } else {
            console.warn(`Could not calculate duration for token ${tokenId}:`, result.error)
            return 0
        }
    } catch (error) {
        console.error('Error calculating token gratitude:', error)
        return 0
    }
}

// Navigate to a specific token
async function navigateToToken(token) {
    console.log('Navigating to token:', token.content)
    
    if (window.navState.currentLevel >= window.navState.maxLevel) {
        console.log('Maximum depth reached')
        return
    }
    
    // Save current state to navigation stack
    window.navState.navigationStack.push(window.navState.currentToken)
    
    // Update state
    window.navState.currentLevel++
    window.navState.currentToken = token
    
    // Refresh the navigation view
    await initializeNavigationView()
}

// Navigate back to parent
async function navigateToParent() {
    if (window.navState.navigationStack.length === 0) {
        console.log('Already at root level')
        return
    }
    
    // Restore previous state
    const parentToken = window.navState.navigationStack.pop()
    window.navState.currentLevel--
    window.navState.currentToken = parentToken
    
    // Refresh the navigation view
    await initializeNavigationView()
}

// Update breadcrumb navigation
function updateBreadcrumb() {
    // For now, we'll show the path in the info overlay
    // This can be enhanced later with actual breadcrumb UI
}

// Update the minimal info overlay with current token information
async function updateInfoOverlay(token, children) {
    const infoPath = document.getElementById('infoPath')
    const infoStats = document.getElementById('infoStats')
    
    if (!infoPath || !infoStats) return
    
    // Calculate gratitude for this token
    const gratitudeMinutes = await calculateTokenGratitude(token.id)
    
    // Update path display
    if (token.id === 'user') {
        infoPath.textContent = `${currentUser} Center`
    } else {
        // Build breadcrumb path
        const pathParts = [`${currentUser} Center`]
        for (const stackToken of window.navState.navigationStack) {
            pathParts.push(stackToken.content)
        }
        pathParts.push(token.content)
        infoPath.textContent = pathParts.join(' → ')
    }
    
    // Update stats
    const level = window.navState.currentLevel
    const childCount = children.length
    const gratitudeText = formatGratitude(gratitudeMinutes)
    infoStats.textContent = `Level ${level} • ${childCount} children • ${gratitudeText} gratitude`
}

// Format gratitude value (time-based)
function formatGratitude(minutes) {
    if (minutes === 0 || !minutes) return '0m'
    if (minutes === Infinity) return '∞'
    
    const days = Math.floor(minutes / (24 * 60))
    const hours = Math.floor((minutes % (24 * 60)) / 60)
    const remainingMinutes = minutes % 60
    
    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`)
    
    return parts.join(' ') || '0m'
}