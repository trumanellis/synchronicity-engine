/**
 * Sets a new Intention with an initial Blessing and logs the attention switch.
 * This is the foundational action in the Synchronicity Engine.
 *
 * If the user has a previous active blessing, it will be marked as 'potential'
 * and optionally updated with blessing content to reflect on the completed work.
 *
 * Flow:
 * 1. Mark previous active blessing as 'potential' and add blessing content (if any)
 * 2. Create new Intention document
 * 3. Log AttentionSwitch event
 * 4. Create active Blessing pointing to the attention index
 * 5. Update Intention with blessing reference
 */
export async function setIntention({ userId, title, databases, timestamp = Date.now(), blessingContent }) {
    // Generate IDs
    const intentionId = `intention_${timestamp}`;
    const blessingId = `blessing_${userId}_${timestamp}`;
    // Get user's attention history to find their current index
    const allSwitches = [];
    for await (const entry of databases.attentionSwitches.iterator()) {
        if (entry.value.userId === userId) {
            allSwitches.push(entry.value);
        }
    }
    const attentionIndex = allSwitches.length;
    // If user has an active blessing, mark it as potential and add content
    if (attentionIndex > 0) {
        // Find all user's blessings
        const allBlessings = await databases.blessings.all();
        for (const blessingEntry of allBlessings) {
            const blessing = blessingEntry.value;
            if (blessing.userId === userId && blessing.status === 'active') {
                // Update to potential status and add blessing content if provided
                blessing.status = 'potential';
                if (blessingContent) {
                    blessing.content = blessingContent;
                }
                await databases.blessings.put(blessing);
            }
        }
    }
    // Step 1: Create Intention
    const intention = {
        _id: intentionId,
        title,
        blessings: [], // Will be updated after blessing creation
        proofsOfService: [],
        attachedTokens: [],
        status: 'open',
        createdBy: userId,
        createdAt: timestamp
    };
    await databases.intentions.put(intention);
    // Step 2: Log AttentionSwitch
    const attentionSwitch = {
        userId,
        intentionId,
        timestamp
    };
    await databases.attentionSwitches.add(attentionSwitch);
    // Step 3: Create Blessing
    const blessing = {
        _id: blessingId,
        userId,
        intentionId,
        attentionIndex,
        content: '', // Empty initially, user can add text later
        timestamp,
        status: 'active', // This is the user's current focus
        stewardId: userId // Creator owns the blessing initially
    };
    await databases.blessings.put(blessing);
    // Step 4: Update Intention with blessing reference
    intention.blessings.push(blessingId);
    await databases.intentions.put(intention);
    return {
        intentionId,
        blessingId,
        attentionIndex
    };
}
/**
 * Switches user's attention to a different intention.
 * - Marks previous blessing as 'potential'
 * - Creates new AttentionSwitch event
 * - Creates new active blessing for the target intention
 * - Optionally updates previous blessing's content
 */
export async function switchAttention({ userId, toIntentionId, databases, timestamp = Date.now(), blessingContent }) {
    // Find user's current active blessing
    let previousBlessingId = null;
    let previousBlessing = null;
    const allBlessings = await databases.blessings.all();
    for (const blessingEntry of allBlessings) {
        const blessing = blessingEntry.value;
        if (blessing.userId === userId && blessing.status === 'active') {
            previousBlessingId = blessing._id;
            previousBlessing = blessing;
            break;
        }
    }
    // Update previous blessing to potential and add content if provided
    if (previousBlessing) {
        previousBlessing.status = 'potential';
        if (blessingContent) {
            previousBlessing.content = blessingContent;
        }
        await databases.blessings.put(previousBlessing);
    }
    // Get user's attention history to find their current index
    const allSwitches = [];
    for await (const entry of databases.attentionSwitches.iterator()) {
        if (entry.value.userId === userId) {
            allSwitches.push(entry.value);
        }
    }
    const attentionIndex = allSwitches.length;
    // Log new attention switch
    const attentionSwitch = {
        userId,
        intentionId: toIntentionId,
        timestamp
    };
    await databases.attentionSwitches.add(attentionSwitch);
    // Create new blessing for the target intention
    const newBlessingId = `blessing_${userId}_${timestamp}`;
    const newBlessing = {
        _id: newBlessingId,
        userId,
        intentionId: toIntentionId,
        attentionIndex,
        content: '', // Will be filled when switching away
        timestamp,
        status: 'active',
        stewardId: userId
    };
    await databases.blessings.put(newBlessing);
    // Update the intention to include this blessing
    const intentionEntry = await databases.intentions.get(toIntentionId);
    if (intentionEntry) {
        const intention = intentionEntry.value;
        intention.blessings.push(newBlessingId);
        await databases.intentions.put(intention);
    }
    return {
        newBlessingId,
        previousBlessingId,
        attentionIndex
    };
}
/**
 * Gets a user's complete attention history in chronological order.
 * This is the foundation for all duration calculations.
 */
export async function getUserAttentionHistory({ userId, databases }) {
    const userSwitches = [];
    // Collect all attention switches for this user
    for await (const entry of databases.attentionSwitches.iterator()) {
        if (entry.value.userId === userId) {
            userSwitches.push(entry.value);
        }
    }
    // Sort by timestamp to ensure chronological order
    return userSwitches.sort((a, b) => a.timestamp - b.timestamp);
}
/**
 * Calculates the duration of a blessing based on attention switch events.
 * Duration = time between blessing's attention index and the next switch (or current time).
 */
export async function calculateBlessingDuration({ blessingId, userId, databases, currentTime = Date.now() }) {
    // Get the blessing
    const blessingEntry = await databases.blessings.get(blessingId);
    if (!blessingEntry) {
        throw new Error(`Blessing ${blessingId} not found`);
    }
    const blessing = blessingEntry.value;
    // Get user's attention history
    const history = await getUserAttentionHistory({ userId, databases });
    // Find the start and end times based on attention index
    const startEvent = history[blessing.attentionIndex];
    const nextEvent = history[blessing.attentionIndex + 1];
    if (!startEvent) {
        throw new Error(`No attention event found at index ${blessing.attentionIndex}`);
    }
    const startTime = startEvent.timestamp;
    const endTime = nextEvent?.timestamp ?? currentTime;
    // Duration is the difference
    return endTime - startTime;
}
/**
 * Posts a proof of service for an intention.
 * This triggers the ability to assign blessings to service providers.
 */
export async function postProofOfService({ intentionId, by, content, media, databases, timestamp = Date.now() }) {
    const proofId = `proof_${timestamp}`;
    // Create proof document
    const proof = {
        _id: proofId,
        intentionId,
        by,
        content,
        media,
        timestamp
    };
    // Add to events log
    const hash = await databases.proofsOfService.add(proof);
    // Update intention to reference this proof
    const intentionEntry = await databases.intentions.get(intentionId);
    if (intentionEntry) {
        const intention = intentionEntry.value;
        intention.proofsOfService.push(proofId);
        await databases.intentions.put(intention);
    }
    return {
        proofId,
        hash
    };
}
/**
 * Assigns a blessing to a service provider after proof of service.
 * - Blessing must be in 'potential' status
 * - Updates blessing status to 'given'
 * - Transfers stewardship to the service provider
 */
export async function assignBlessing({ blessingId, toUserId, proofId, databases }) {
    const blessingEntry = await databases.blessings.get(blessingId);
    if (!blessingEntry) {
        return {
            success: false,
            error: 'Blessing not found'
        };
    }
    const blessing = blessingEntry.value;
    // Verify blessing is in potential status
    if (blessing.status !== 'potential') {
        return {
            success: false,
            error: 'Can only assign potential blessings'
        };
    }
    const previousSteward = blessing.stewardId;
    // Update blessing
    blessing.status = 'given';
    blessing.stewardId = toUserId;
    blessing.proofId = proofId;
    await databases.blessings.put(blessing);
    return {
        success: true,
        previousSteward,
        newSteward: toUserId
    };
}
/**
 * Attaches a blessing token to an intention as a boost.
 * This allows accumulated gratitude to support new intentions.
 */
export async function attachTokenToIntention({ tokenId, intentionId, databases }) {
    const intentionEntry = await databases.intentions.get(intentionId);
    if (!intentionEntry) {
        throw new Error(`Intention ${intentionId} not found`);
    }
    const intention = intentionEntry.value;
    intention.attachedTokens.push(tokenId);
    await databases.intentions.put(intention);
}
/**
 * Calculates the total gratitude potential of an intention.
 * Includes:
 * - Live blessings (active + potential status)
 * - Attached token boosts
 * - Optionally includes children of attached tokens
 */
export async function calculateGratitudePotential({ intentionId, databases, currentTime = Date.now(), includeChildren = true }) {
    const intentionEntry = await databases.intentions.get(intentionId);
    if (!intentionEntry) {
        throw new Error(`Intention ${intentionId} not found`);
    }
    const intention = intentionEntry.value;
    let totalPotential = 0;
    // Calculate potential from direct blessings
    for (const blessingId of intention.blessings) {
        const blessingEntry = await databases.blessings.get(blessingId);
        if (!blessingEntry)
            continue;
        const blessing = blessingEntry.value;
        // Only count active and potential blessings (not given)
        if (blessing.status === 'active' || blessing.status === 'potential') {
            const duration = await calculateBlessingDuration({
                blessingId,
                userId: blessing.userId,
                databases,
                currentTime
            });
            totalPotential += duration;
        }
    }
    // Calculate potential from attached tokens
    for (const tokenId of intention.attachedTokens) {
        totalPotential += await calculateTokenTreeDuration({
            tokenId,
            databases,
            currentTime,
            includeChildren
        });
    }
    return totalPotential;
}
/**
 * Helper to calculate total duration of a token and optionally its children.
 */
export async function calculateTokenTreeDuration({ tokenId, databases, currentTime = Date.now(), includeChildren = true, visited = new Set() }) {
    // Prevent circular references
    if (visited.has(tokenId))
        return 0;
    visited.add(tokenId);
    const blessingEntry = await databases.blessings.get(tokenId);
    if (!blessingEntry)
        return 0;
    const blessing = blessingEntry.value;
    // Calculate this token's duration
    let duration = await calculateBlessingDuration({
        blessingId: tokenId,
        userId: blessing.userId,
        databases,
        currentTime
    });
    // Add children if requested
    if (includeChildren && blessing.children) {
        for (const childId of blessing.children) {
            duration += await calculateTokenTreeDuration({
                tokenId: childId,
                databases,
                currentTime,
                includeChildren,
                visited
            });
        }
    }
    return duration;
}
/**
 * Creates an offering - a limited opportunity that people can bid on with tokens.
 */
export async function createOffering({ hostId, title, description, time, place, slotsAvailable, databases, timestamp = Date.now() }) {
    const offeringId = `offering_${timestamp}`;
    const offering = {
        _id: offeringId,
        title,
        description,
        slotsAvailable,
        tokenOffers: [],
        selectedStewards: [],
        status: 'open'
    };
    // Only add optional fields if they exist
    if (time !== undefined) {
        offering.time = time;
    }
    if (place !== undefined) {
        offering.place = place;
    }
    await databases.offerings.put(offering);
    return { offeringId };
}
/**
 * Places a bid on an offering using a token basket.
 */
export async function bidOnOffering({ offeringId, userId, topTokenId, databases }) {
    const offeringEntry = await databases.offerings.get(offeringId);
    if (!offeringEntry) {
        return {
            success: false,
            error: 'Offering not found'
        };
    }
    const offering = offeringEntry.value;
    if (offering.status !== 'open') {
        return {
            success: false,
            error: 'Offering is not open for bids'
        };
    }
    // Check if user already bid
    const existingBid = offering.tokenOffers.find((bid) => bid.userId === userId);
    if (existingBid) {
        return {
            success: false,
            error: 'User has already bid on this offering'
        };
    }
    // Add bid
    offering.tokenOffers.push({
        userId,
        topToken: topTokenId
    });
    await databases.offerings.put(offering);
    return {
        success: true,
        position: offering.tokenOffers.length
    };
}
/**
 * Accepts the top bids for an offering based on available slots.
 * Transfers all tokens in winning baskets to the host.
 */
export async function acceptOfferingBids({ offeringId, hostId, databases }) {
    const offeringEntry = await databases.offerings.get(offeringId);
    if (!offeringEntry) {
        throw new Error(`Offering ${offeringId} not found`);
    }
    const offering = offeringEntry.value;
    // Rank bids by total token duration
    const rankedBids = [];
    for (const bid of offering.tokenOffers) {
        const duration = await calculateTokenTreeDuration({
            tokenId: bid.topToken,
            databases,
            includeChildren: true
        });
        rankedBids.push({
            ...bid,
            duration
        });
    }
    // Sort by duration descending
    rankedBids.sort((a, b) => b.duration - a.duration);
    // Select winners based on available slots
    const winners = rankedBids.slice(0, offering.slotsAvailable);
    const losers = rankedBids.slice(offering.slotsAvailable);
    // Transfer tokens from winners to host
    for (const winner of winners) {
        await transferTokenTree({
            tokenId: winner.topToken,
            toUserId: hostId,
            databases
        });
    }
    // Update offering
    offering.selectedStewards = winners.map(w => w.userId);
    offering.slotsAvailable = 0;
    offering.status = 'fulfilled';
    await databases.offerings.put(offering);
    return {
        accepted: winners.map(w => w.userId),
        rejected: losers.map(l => l.userId)
    };
}
/**
 * Helper to transfer a token and all its children to a new steward.
 */
async function transferTokenTree({ tokenId, toUserId, databases, visited = new Set() }) {
    if (visited.has(tokenId))
        return;
    visited.add(tokenId);
    const blessingEntry = await databases.blessings.get(tokenId);
    if (!blessingEntry)
        return;
    const blessing = blessingEntry.value;
    // Create a clean copy without undefined fields
    const updatedBlessing = {
        _id: blessing._id,
        userId: blessing.userId,
        intentionId: blessing.intentionId,
        attentionIndex: blessing.attentionIndex,
        content: blessing.content,
        timestamp: blessing.timestamp,
        status: blessing.status,
        stewardId: toUserId // Update steward
    };
    // Only add optional fields if they exist
    if (blessing.parentId) {
        updatedBlessing.parentId = blessing.parentId;
    }
    if (blessing.children && blessing.children.length > 0) {
        updatedBlessing.children = blessing.children;
    }
    if (blessing.proofId) {
        updatedBlessing.proofId = blessing.proofId;
    }
    await databases.blessings.put(updatedBlessing);
    // Transfer children
    if (blessing.children) {
        for (const childId of blessing.children) {
            await transferTokenTree({
                tokenId: childId,
                toUserId,
                databases,
                visited
            });
        }
    }
}
/**
 * Flattens a token tree into an array of token IDs.
 * Prevents infinite recursion via visited set.
 */
export async function flattenTokenTree(topTokenId, blessingsDB, visited = new Set()) {
    if (visited.has(topTokenId))
        return [];
    visited.add(topTokenId);
    const tokenEntry = await blessingsDB.get(topTokenId);
    if (!tokenEntry)
        return [];
    const token = tokenEntry.value;
    const children = (token.children ?? []);
    const childResults = await Promise.all(children.map(id => flattenTokenTree(id, blessingsDB, visited)));
    return [topTokenId, ...childResults.flat()];
}
/**
 * Formats milliseconds duration into human-readable "Xh Ym" format.
 */
export function formatDuration(ms) {
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m`;
}
