// src/lib/synchronicity-engine.ts
import type { 
  PrayerDoc, 
  BlessingDoc, 
  AttentionSwitch, 
  Databases 
} from './types'

interface CreatePrayerParams {
  userId: string
  title: string
  databases: Databases
  timestamp?: number
}

interface CreatePrayerResult {
  prayerId: string
  blessingId: string
  attentionIndex: number
}

interface SwitchAttentionParams {
  userId: string
  toPrayerId: string
  databases: Databases
  timestamp?: number
  blessingContent?: string
}

interface SwitchAttentionResult {
  newBlessingId: string
  previousBlessingId: string | null
  attentionIndex: number
}

interface CalculateDurationParams {
  blessingId: string
  userId: string
  databases: Databases
  currentTime?: number
}

interface GetAttentionHistoryParams {
  userId: string
  databases: Databases
}

interface PostProofParams {
  prayerId: string
  by: string[]
  content: string
  media: string[]
  databases: Databases
  timestamp?: number
}

interface PostProofResult {
  proofId: string
  hash: string
}

interface AssignBlessingParams {
  blessingId: string
  toUserId: string
  proofId: string
  databases: Databases
}

interface AssignBlessingResult {
  success: boolean
  previousSteward?: string
  newSteward?: string
  error?: string
}

interface AttachTokenParams {
  tokenId: string
  prayerId: string
  databases: Databases
}

interface CalculatePotentialParams {
  prayerId: string
  databases: Databases
  currentTime?: number
  includeChildren?: boolean
}

interface CreateOfferingParams {
  hostId: string
  title: string
  description: string
  time?: string
  place?: string
  slotsAvailable: number
  databases: Databases
  timestamp?: number
}

interface CreateOfferingResult {
  offeringId: string
}

interface BidOnOfferingParams {
  offeringId: string
  userId: string
  topTokenId: string
  databases: Databases
}

interface BidOnOfferingResult {
  success: boolean
  position?: number
  error?: string
}

interface AcceptBidsParams {
  offeringId: string
  hostId: string
  databases: Databases
}

interface AcceptBidsResult {
  accepted: string[]
  rejected: string[]
}

/**
 * Creates a new Prayer with an initial Blessing and logs the attention switch.
 * This is the foundational action in the Synchronicity Engine.
 * 
 * Flow:
 * 1. Create Prayer document
 * 2. Log AttentionSwitch event 
 * 3. Create active Blessing pointing to the attention index
 * 4. Update Prayer with blessing reference
 */
export async function createPrayer({
  userId,
  title,
  databases,
  timestamp = Date.now()
}: CreatePrayerParams): Promise<CreatePrayerResult> {
  
  // Generate IDs
  const prayerId = `prayer_${timestamp}`
  const blessingId = `blessing_${userId}_${timestamp}`
  
  // Get user's attention history to find their current index
  const allSwitches = []
  for await (const entry of databases.attentionSwitches.iterator()) {
    if (entry.value.userId === userId) {
      allSwitches.push(entry.value)
    }
  }
  const attentionIndex = allSwitches.length
  
  // If user has an active blessing, mark it as potential
  if (attentionIndex > 0) {
    // Find all user's blessings
    const allBlessings = await databases.blessings.all()
    for (const blessingEntry of allBlessings) {
      const blessing: BlessingDoc = blessingEntry.value
      if (blessing.userId === userId && blessing.status === 'active') {
        // Update to potential status
        blessing.status = 'potential'
        await databases.blessings.put(blessing)
      }
    }
  }
  
  // Step 1: Create Prayer
  const prayer: PrayerDoc = {
    _id: prayerId,
    title,
    blessings: [], // Will be updated after blessing creation
    proofsOfService: [],
    attachedTokens: [],
    status: 'open',
    createdBy: userId,
    createdAt: timestamp
  }
  
  await databases.prayers.put(prayer)
  
  // Step 2: Log AttentionSwitch
  const attentionSwitch: AttentionSwitch = {
    userId,
    prayerId,
    timestamp
  }
  
  await databases.attentionSwitches.add(attentionSwitch)
  
  // Step 3: Create Blessing
  const blessing: BlessingDoc = {
    _id: blessingId,
    userId,
    prayerId,
    attentionIndex,
    content: '', // Empty initially, user can add text later
    timestamp,
    status: 'active', // This is the user's current focus
    stewardId: userId // Creator owns the blessing initially
  }
  
  await databases.blessings.put(blessing)
  
  // Step 4: Update Prayer with blessing reference
  prayer.blessings.push(blessingId)
  await databases.prayers.put(prayer)
  
  return {
    prayerId,
    blessingId,
    attentionIndex
  }
}

/**
 * Switches user's attention to a different prayer.
 * - Marks previous blessing as 'potential'
 * - Creates new AttentionSwitch event
 * - Creates new active blessing for the target prayer
 * - Optionally updates previous blessing's content
 */
export async function switchAttention({
  userId,
  toPrayerId,
  databases,
  timestamp = Date.now(),
  blessingContent
}: SwitchAttentionParams): Promise<SwitchAttentionResult> {
  
  // Find user's current active blessing
  let previousBlessingId: string | null = null
  let previousBlessing: BlessingDoc | null = null
  
  const allBlessings = await databases.blessings.all()
  for (const blessingEntry of allBlessings) {
    const blessing: BlessingDoc = blessingEntry.value
    if (blessing.userId === userId && blessing.status === 'active') {
      previousBlessingId = blessing._id
      previousBlessing = blessing
      break
    }
  }
  
  // Update previous blessing to potential and add content if provided
  if (previousBlessing) {
    previousBlessing.status = 'potential'
    if (blessingContent) {
      previousBlessing.content = blessingContent
    }
    await databases.blessings.put(previousBlessing)
  }
  
  // Get user's attention history to find their current index
  const allSwitches = []
  for await (const entry of databases.attentionSwitches.iterator()) {
    if (entry.value.userId === userId) {
      allSwitches.push(entry.value)
    }
  }
  const attentionIndex = allSwitches.length
  
  // Log new attention switch
  const attentionSwitch: AttentionSwitch = {
    userId,
    prayerId: toPrayerId,
    timestamp
  }
  await databases.attentionSwitches.add(attentionSwitch)
  
  // Create new blessing for the target prayer
  const newBlessingId = `blessing_${userId}_${timestamp}`
  const newBlessing: BlessingDoc = {
    _id: newBlessingId,
    userId,
    prayerId: toPrayerId,
    attentionIndex,
    content: '', // Will be filled when switching away
    timestamp,
    status: 'active',
    stewardId: userId
  }
  await databases.blessings.put(newBlessing)
  
  // Update the prayer to include this blessing
  const prayerEntry = await databases.prayers.get(toPrayerId)
  if (prayerEntry) {
    const prayer: PrayerDoc = prayerEntry.value
    prayer.blessings.push(newBlessingId)
    await databases.prayers.put(prayer)
  }
  
  return {
    newBlessingId,
    previousBlessingId,
    attentionIndex
  }
}

/**
 * Gets a user's complete attention history in chronological order.
 * This is the foundation for all duration calculations.
 */
export async function getUserAttentionHistory({
  userId,
  databases
}: GetAttentionHistoryParams): Promise<AttentionSwitch[]> {
  const userSwitches: AttentionSwitch[] = []
  
  // Collect all attention switches for this user
  for await (const entry of databases.attentionSwitches.iterator()) {
    if (entry.value.userId === userId) {
      userSwitches.push(entry.value)
    }
  }
  
  // Sort by timestamp to ensure chronological order
  return userSwitches.sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Calculates the duration of a blessing based on attention switch events.
 * Duration = time between blessing's attention index and the next switch (or current time).
 */
export async function calculateBlessingDuration({
  blessingId,
  userId,
  databases,
  currentTime = Date.now()
}: CalculateDurationParams): Promise<number> {
  
  // Get the blessing
  const blessingEntry = await databases.blessings.get(blessingId)
  if (!blessingEntry) {
    throw new Error(`Blessing ${blessingId} not found`)
  }
  
  const blessing: BlessingDoc = blessingEntry.value
  
  // Get user's attention history
  const history = await getUserAttentionHistory({ userId, databases })
  
  // Find the start and end times based on attention index
  const startEvent = history[blessing.attentionIndex]
  const nextEvent = history[blessing.attentionIndex + 1]
  
  if (!startEvent) {
    throw new Error(`No attention event found at index ${blessing.attentionIndex}`)
  }
  
  const startTime = startEvent.timestamp
  const endTime = nextEvent?.timestamp ?? currentTime
  
  // Duration is the difference
  return endTime - startTime
}

/**
 * Posts a proof of service for a prayer.
 * This triggers the ability to assign blessings to service providers.
 */
export async function postProofOfService({
  prayerId,
  by,
  content,
  media,
  databases,
  timestamp = Date.now()
}: PostProofParams): Promise<PostProofResult> {
  
  const proofId = `proof_${timestamp}`
  
  // Create proof document
  const proof: ProofDoc = {
    _id: proofId,
    prayerId,
    by,
    content,
    media,
    timestamp
  }
  
  // Add to events log
  const hash = await databases.proofsOfService.add(proof)
  
  // Update prayer to reference this proof
  const prayerEntry = await databases.prayers.get(prayerId)
  if (prayerEntry) {
    const prayer: PrayerDoc = prayerEntry.value
    prayer.proofsOfService.push(proofId)
    await databases.prayers.put(prayer)
  }
  
  return {
    proofId,
    hash
  }
}

/**
 * Assigns a blessing to a service provider after proof of service.
 * - Blessing must be in 'potential' status
 * - Updates blessing status to 'given'
 * - Transfers stewardship to the service provider
 */
export async function assignBlessing({
  blessingId,
  toUserId,
  proofId,
  databases
}: AssignBlessingParams): Promise<AssignBlessingResult> {
  
  const blessingEntry = await databases.blessings.get(blessingId)
  if (!blessingEntry) {
    return {
      success: false,
      error: 'Blessing not found'
    }
  }
  
  const blessing: BlessingDoc = blessingEntry.value
  
  // Verify blessing is in potential status
  if (blessing.status !== 'potential') {
    return {
      success: false,
      error: 'Can only assign potential blessings'
    }
  }
  
  const previousSteward = blessing.stewardId
  
  // Update blessing
  blessing.status = 'given'
  blessing.stewardId = toUserId
  blessing.proofId = proofId
  
  await databases.blessings.put(blessing)
  
  return {
    success: true,
    previousSteward,
    newSteward: toUserId
  }
}

/**
 * Attaches a blessing token to a prayer as a boost.
 * This allows accumulated gratitude to support new prayers.
 */
export async function attachTokenToPrayer({
  tokenId,
  prayerId,
  databases
}: AttachTokenParams): Promise<void> {
  
  const prayerEntry = await databases.prayers.get(prayerId)
  if (!prayerEntry) {
    throw new Error(`Prayer ${prayerId} not found`)
  }
  
  const prayer: PrayerDoc = prayerEntry.value
  prayer.attachedTokens.push(tokenId)
  await databases.prayers.put(prayer)
}

/**
 * Calculates the total gratitude potential of a prayer.
 * Includes:
 * - Live blessings (active + potential status)
 * - Attached token boosts
 * - Optionally includes children of attached tokens
 */
export async function calculateGratitudePotential({
  prayerId,
  databases,
  currentTime = Date.now(),
  includeChildren = true
}: CalculatePotentialParams): Promise<number> {
  
  const prayerEntry = await databases.prayers.get(prayerId)
  if (!prayerEntry) {
    throw new Error(`Prayer ${prayerId} not found`)
  }
  
  const prayer: PrayerDoc = prayerEntry.value
  let totalPotential = 0
  
  // Calculate potential from direct blessings
  for (const blessingId of prayer.blessings) {
    const blessingEntry = await databases.blessings.get(blessingId)
    if (!blessingEntry) continue
    
    const blessing: BlessingDoc = blessingEntry.value
    
    // Only count active and potential blessings (not given)
    if (blessing.status === 'active' || blessing.status === 'potential') {
      const duration = await calculateBlessingDuration({
        blessingId,
        userId: blessing.userId,
        databases,
        currentTime
      })
      totalPotential += duration
    }
  }
  
  // Calculate potential from attached tokens
  for (const tokenId of prayer.attachedTokens) {
    totalPotential += await calculateTokenTreeDuration({
      tokenId,
      databases,
      currentTime,
      includeChildren
    })
  }
  
  return totalPotential
}

/**
 * Helper to calculate total duration of a token and optionally its children.
 */
export async function calculateTokenTreeDuration({
  tokenId,
  databases,
  currentTime = Date.now(),
  includeChildren = true,
  visited = new Set<string>()
}: {
  tokenId: string
  databases: Databases
  currentTime?: number
  includeChildren?: boolean
  visited?: Set<string>
}): Promise<number> {
  
  // Prevent circular references
  if (visited.has(tokenId)) return 0
  visited.add(tokenId)
  
  const blessingEntry = await databases.blessings.get(tokenId)
  if (!blessingEntry) return 0
  
  const blessing: BlessingDoc = blessingEntry.value
  
  // Calculate this token's duration
  let duration = await calculateBlessingDuration({
    blessingId: tokenId,
    userId: blessing.userId,
    databases,
    currentTime
  })
  
  // Add children if requested
  if (includeChildren && blessing.children) {
    for (const childId of blessing.children) {
      duration += await calculateTokenTreeDuration({
        tokenId: childId,
        databases,
        currentTime,
        includeChildren,
        visited
      })
    }
  }
  
  return duration
}

/**
 * Creates an offering - a limited opportunity that people can bid on with tokens.
 */
export async function createOffering({
  hostId,
  title,
  description,
  time,
  place,
  slotsAvailable,
  databases,
  timestamp = Date.now()
}: CreateOfferingParams): Promise<CreateOfferingResult> {
  
  const offeringId = `offering_${timestamp}`
  
  const offering: OfferingDoc = {
    _id: offeringId,
    title,
    description,
    slotsAvailable,
    tokenOffers: [],
    selectedStewards: [],
    status: 'open'
  }
  
  // Only add optional fields if they exist
  if (time !== undefined) {
    offering.time = time
  }
  
  if (place !== undefined) {
    offering.place = place
  }
  
  await databases.offerings.put(offering)
  
  return { offeringId }
}

/**
 * Places a bid on an offering using a token basket.
 */
export async function bidOnOffering({
  offeringId,
  userId,
  topTokenId,
  databases
}: BidOnOfferingParams): Promise<BidOnOfferingResult> {
  
  const offeringEntry = await databases.offerings.get(offeringId)
  if (!offeringEntry) {
    return {
      success: false,
      error: 'Offering not found'
    }
  }
  
  const offering: OfferingDoc = offeringEntry.value
  
  if (offering.status !== 'open') {
    return {
      success: false,
      error: 'Offering is not open for bids'
    }
  }
  
  // Check if user already bid
  const existingBid = offering.tokenOffers.find(bid => bid.userId === userId)
  if (existingBid) {
    return {
      success: false,
      error: 'User has already bid on this offering'
    }
  }
  
  // Add bid
  offering.tokenOffers.push({
    userId,
    topToken: topTokenId
  })
  
  await databases.offerings.put(offering)
  
  return {
    success: true,
    position: offering.tokenOffers.length
  }
}

/**
 * Accepts the top bids for an offering based on available slots.
 * Transfers all tokens in winning baskets to the host.
 */
export async function acceptOfferingBids({
  offeringId,
  hostId,
  databases
}: AcceptBidsParams): Promise<AcceptBidsResult> {
  
  const offeringEntry = await databases.offerings.get(offeringId)
  if (!offeringEntry) {
    throw new Error(`Offering ${offeringId} not found`)
  }
  
  const offering: OfferingDoc = offeringEntry.value
  
  // Rank bids by total token duration
  const rankedBids = []
  for (const bid of offering.tokenOffers) {
    const duration = await calculateTokenTreeDuration({
      tokenId: bid.topToken,
      databases,
      includeChildren: true
    })
    
    rankedBids.push({
      ...bid,
      duration
    })
  }
  
  // Sort by duration descending
  rankedBids.sort((a, b) => b.duration - a.duration)
  
  // Select winners based on available slots
  const winners = rankedBids.slice(0, offering.slotsAvailable)
  const losers = rankedBids.slice(offering.slotsAvailable)
  
  // Transfer tokens from winners to host
  for (const winner of winners) {
    await transferTokenTree({
      tokenId: winner.topToken,
      toUserId: hostId,
      databases
    })
  }
  
  // Update offering
  offering.selectedStewards = winners.map(w => w.userId)
  offering.slotsAvailable = 0
  offering.status = 'fulfilled'
  await databases.offerings.put(offering)
  
  return {
    accepted: winners.map(w => w.userId),
    rejected: losers.map(l => l.userId)
  }
}

/**
 * Helper to transfer a token and all its children to a new steward.
 */
async function transferTokenTree({
  tokenId,
  toUserId,
  databases,
  visited = new Set<string>()
}: {
  tokenId: string
  toUserId: string
  databases: Databases
  visited?: Set<string>
}): Promise<void> {
  
  if (visited.has(tokenId)) return
  visited.add(tokenId)
  
  const blessingEntry = await databases.blessings.get(tokenId)
  if (!blessingEntry) return
  
  const blessing: BlessingDoc = blessingEntry.value
  
  // Create a clean copy without undefined fields
  const updatedBlessing: BlessingDoc = {
    _id: blessing._id,
    userId: blessing.userId,
    prayerId: blessing.prayerId,
    attentionIndex: blessing.attentionIndex,
    content: blessing.content,
    timestamp: blessing.timestamp,
    status: blessing.status,
    stewardId: toUserId // Update steward
  }
  
  // Only add optional fields if they exist
  if (blessing.parentId) {
    updatedBlessing.parentId = blessing.parentId
  }
  
  if (blessing.children && blessing.children.length > 0) {
    updatedBlessing.children = blessing.children
  }
  
  if (blessing.proofId) {
    updatedBlessing.proofId = blessing.proofId
  }
  
  await databases.blessings.put(updatedBlessing)
  
  // Transfer children
  if (blessing.children) {
    for (const childId of blessing.children) {
      await transferTokenTree({
        tokenId: childId,
        toUserId,
        databases,
        visited
      })
    }
  }
}