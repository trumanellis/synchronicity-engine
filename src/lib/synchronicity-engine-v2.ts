// src/lib/synchronicity-engine-v2.ts
// New engine implementation based on 15-7-25 Proof of Concept Architecture

import {
  AttentionSwitchEvent,
  Blessing,
  TokenOfGratitude,
  ProofOfService,
  Intention,
  SwitchAttentionParams,
  SwitchAttentionResult,
  ForgeTokenParams,
  ForgeTokenResult,
  PostProofParams,
  PostProofResult,
  GiftTokenParams,
  GiftTokenResult,
  NotificationEvent,
  EligibleTokenForger
} from './types-v2.js';

/* ============================================================
   Core Duration Calculation
   ============================================================ */

export function calculateAttentionDuration(
  userAttentionLog: AttentionSwitchEvent[],
  index: number
): number {
  const currentEvent = userAttentionLog[index];
  const nextEvent = userAttentionLog[index + 1];

  if (!currentEvent) {
    throw new Error(`No attention event at index ${index}`);
  }

  const startTime = currentEvent.timestamp;
  const endTime = nextEvent ? nextEvent.timestamp : Date.now();

  return endTime - startTime;
}

/* ============================================================
   Attention Management
   ============================================================ */

export async function switchAttention({
  userId,
  newIntentionId,
  databases
}: SwitchAttentionParams): Promise<SwitchAttentionResult> {
  try {
    // Validate input parameters
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }
    if (!newIntentionId || typeof newIntentionId !== 'string') {
      throw new Error('Valid newIntentionId is required');
    }
    // Get user's attention log
    const userAttentionLog = await getUserAttentionLog(userId, databases);
    const newIndex = userAttentionLog.length;

    // Mark previous blessing as potential (if exists)
    if (newIndex > 0) {
      const previousBlessing = await getBlessingByIndex(userId, newIndex - 1, databases);
      if (previousBlessing) {
        previousBlessing.status = "potential";
        await updateBlessing(previousBlessing, databases);
      }
    }

    // Add new attention switch event
    const switchEvent: AttentionSwitchEvent = {
      index: newIndex,
      userId,
      intentionId: newIntentionId,
      timestamp: Date.now()
    };

    await addAttentionSwitchEvent(switchEvent, databases);

    // Create new active blessing
    const newBlessing: Blessing = {
      index: newIndex,
      userId,
      intentionId: newIntentionId,
      status: "active"
    };

    await createBlessing(newBlessing, databases);

    return {
      success: true,
      newIndex
    };
  } catch (error) {
    return {
      success: false,
      newIndex: -1,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/* ============================================================
   Token Forging System
   ============================================================ */

export async function forgeTokenOfGratitude({
  forgedBy,
  blessingIndices,
  intentionId,
  honoringProof,
  message,
  databases
}: ForgeTokenParams): Promise<ForgeTokenResult> {
  try {
    // Validate blessing indices array is not empty
    if (!blessingIndices || blessingIndices.length === 0) {
      throw new Error("Must provide at least one blessing index");
    }

    // Validate all blessings are from same user and intention
    const blessings = await Promise.all(
      blessingIndices.map(index => getBlessingByIndex(forgedBy, index, databases))
    );

    // Validation checks
    for (const blessing of blessings) {
      if (!blessing) {
        throw new Error("One or more blessings not found");
      }
      if (blessing.userId !== forgedBy) {
        throw new Error("Can only forge tokens from your own blessings");
      }
      if (blessing.intentionId !== intentionId) {
        throw new Error("All blessings must be from the same intention");
      }
      if (blessing.status !== "potential") {
        throw new Error("Can only forge from potential blessings");
      }
    }

    // Calculate total duration
    const userAttentionLog = await getUserAttentionLog(forgedBy, databases);
    let totalDuration = 0;
    
    for (const index of blessingIndices) {
      totalDuration += calculateAttentionDuration(userAttentionLog, index);
    }

    // Create token
    const tokenId = generateId('token');
    const token: TokenOfGratitude = {
      tokenId,
      forgedBy,
      forgedFrom: blessingIndices,
      intentionId,
      dedicatedTo: intentionId,
      honoringProof,
      message,
      parent: forgedBy,  // Initially owned by forger
      steward: forgedBy,
      totalDuration,
      forgedAt: Date.now()
    };

    // Mark blessings as given
    for (const blessing of blessings) {
      if (blessing) {
        blessing.status = "given";
        blessing.forgedIntoToken = tokenId;
        await updateBlessing(blessing, databases);
      }
    }

    await saveTokenOfGratitude(token, databases);

    return {
      success: true,
      tokenId
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/* ============================================================
   Proof of Service System
   ============================================================ */

export async function postProofOfService({
  intentionId,
  submittedBy,
  title,
  description,
  media = [],
  databases
}: PostProofParams): Promise<PostProofResult> {
  try {
    const proofId = generateId('proof');

    const proof: ProofOfService = {
      proofId,
      intentionId,
      submittedBy,
      title,
      description,
      media,
      timestamp: Date.now(),
      tokensReceived: []
    };

    await saveProofOfService(proof, databases);

    // Notify all users with potential blessings for this intention
    await notifyPotentialTokenForgers(intentionId, proofId, databases);

    return {
      success: true,
      proofId
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function notifyPotentialTokenForgers(
  intentionId: string,
  proofId: string,
  databases: any
): Promise<void> {
  const eligibleUsers = await getUsersWithPotentialBlessings(intentionId, databases);

  for (const user of eligibleUsers) {
    const notification: NotificationEvent = {
      userId: user.userId,
      type: "proof_available",
      intentionId,
      proofId,
      message: `New proof of service available for "${intentionId}" - you can forge ${user.potentialBlessings.length} blessing(s) into tokens of gratitude`,
      timestamp: Date.now()
    };

    await sendNotification(notification, databases);
  }
}

/* ============================================================
   Token Gifting System
   ============================================================ */

export async function giftTokenToServiceProvider({
  tokenId,
  serviceProviderId,
  databases
}: GiftTokenParams): Promise<GiftTokenResult> {
  try {
    const token = await getTokenOfGratitude(tokenId, databases);
    const proof = await getProofOfService(token.honoringProof, databases);

    // Verify the token honors this service provider's proof
    if (proof.submittedBy !== serviceProviderId) {
      throw new Error("Token must be gifted to the service provider");
    }

    // Transfer stewardship
    token.steward = serviceProviderId;
    token.parent = serviceProviderId;

    await updateTokenOfGratitude(token, databases);

    // Update proof to track received token (handle concurrent updates)
    const currentProof = await getProofOfService(token.honoringProof, databases);
    if (!currentProof.tokensReceived.includes(tokenId)) {
      currentProof.tokensReceived.push(tokenId);
      await updateProofOfService(currentProof, databases);
    }

    // Send notification to service provider
    const notification: NotificationEvent = {
      userId: serviceProviderId,
      type: "token_received",
      intentionId: token.intentionId,
      tokenId,
      message: `You received a token of gratitude for your service! Duration: ${formatDuration(token.totalDuration)}`,
      timestamp: Date.now()
    };

    await sendNotification(notification, databases);

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/* ============================================================
   Database Helper Functions
   ============================================================ */

async function getUserAttentionLog(userId: string, databases: any): Promise<AttentionSwitchEvent[]> {
  const userLogKey = `attention-${userId}`;
  const logData = await databases.attentionSwitches.get(userLogKey);
  return logData?.value?.events || [];
}

async function addAttentionSwitchEvent(event: AttentionSwitchEvent, databases: any): Promise<void> {
  const userLogKey = `attention-${event.userId}`;
  const existingLog = await databases.attentionSwitches.get(userLogKey);
  const events = existingLog?.value?.events || [];
  
  events.push(event);
  
  await databases.attentionSwitches.put({
    _id: userLogKey,
    userId: event.userId,
    events,
    lastUpdated: Date.now()
  });
}

async function getBlessingByIndex(
  userId: string,
  index: number,
  databases: any
): Promise<Blessing | null> {
  const userBlessingsKey = `blessings-${userId}`;
  const blessingsData = await databases.blessings.get(userBlessingsKey);
  return blessingsData?.value?.blessings?.[index] || null;
}

async function createBlessing(blessing: Blessing, databases: any): Promise<void> {
  const userBlessingsKey = `blessings-${blessing.userId}`;
  const existingData = await databases.blessings.get(userBlessingsKey);
  const blessings = existingData?.value?.blessings || [];
  
  blessings[blessing.index] = blessing;
  
  await databases.blessings.put({
    _id: userBlessingsKey,
    userId: blessing.userId,
    blessings,
    lastUpdated: Date.now()
  });
}

async function updateBlessing(blessing: Blessing, databases: any): Promise<void> {
  await createBlessing(blessing, databases); // Same operation
}

async function saveTokenOfGratitude(token: TokenOfGratitude, databases: any): Promise<void> {
  await databases.tokensOfGratitude.put({
    _id: token.tokenId,
    ...token
  });
}

async function getTokenOfGratitude(tokenId: string, databases: any): Promise<TokenOfGratitude> {
  const tokenData = await databases.tokensOfGratitude.get(tokenId);
  if (!tokenData) {
    throw new Error(`Token ${tokenId} not found`);
  }
  return tokenData.value;
}

async function updateTokenOfGratitude(token: TokenOfGratitude, databases: any): Promise<void> {
  await databases.tokensOfGratitude.put({
    _id: token.tokenId,
    ...token
  });
}

async function saveProofOfService(proof: ProofOfService, databases: any): Promise<void> {
  await databases.proofsOfService.put({
    _id: proof.proofId,
    ...proof
  });
}

async function getProofOfService(proofId: string, databases: any): Promise<ProofOfService> {
  const proofData = await databases.proofsOfService.get(proofId);
  if (!proofData) {
    throw new Error(`Proof ${proofId} not found`);
  }
  return proofData.value;
}

async function updateProofOfService(proof: ProofOfService, databases: any): Promise<void> {
  await databases.proofsOfService.put({
    _id: proof.proofId,
    ...proof
  });
}

async function getUsersWithPotentialBlessings(
  _intentionId: string,
  _databases: any
): Promise<EligibleTokenForger[]> {
  // TODO: Implement user discovery system
  // This would need to iterate through all user blessings to find those with potential status
  // for the given intentionId. For now, return empty array.
  return [];
}

async function sendNotification(_notification: NotificationEvent, _databases: any): Promise<void> {
  // Implementation depends on notification system
  // TODO: Implement proper notification delivery system
}

/* ============================================================
   Utility Functions
   ============================================================ */

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/* ============================================================
   Query Functions
   ============================================================ */

export async function getUserBlessings(userId: string, databases: any): Promise<Blessing[]> {
  const userBlessingsKey = `blessings-${userId}`;
  const blessingsData = await databases.blessings.get(userBlessingsKey);
  return blessingsData?.value?.blessings || [];
}

export async function getUserTokens(userId: string, databases: any): Promise<TokenOfGratitude[]> {
  // Get all tokens where user is the steward
  const allTokens = await databases.tokensOfGratitude.all();
  return allTokens.filter((token: TokenOfGratitude) => token.steward === userId);
}

export async function getIntentionProofs(intentionId: string, databases: any): Promise<ProofOfService[]> {
  const allProofs = await databases.proofsOfService.all();
  return allProofs.filter((proof: ProofOfService) => proof.intentionId === intentionId);
}

export async function getActiveIntention(userId: string, databases: any): Promise<Intention | null> {
  const userBlessings = await getUserBlessings(userId, databases);
  const activeBlessing = userBlessings.find(b => b.status === "active");
  
  if (!activeBlessing) {
    return null;
  }
  
  const intentionData = await databases.intentions.get(activeBlessing.intentionId);
  return intentionData || null;
}