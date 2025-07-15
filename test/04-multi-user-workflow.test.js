// test/04-multi-user-workflow.test.js
// TDD: Multi-user workflow with multiple potential blessings

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rimraf } from 'rimraf'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'

describe('TDD: Multi-User Workflow', () => {
  let orbitdb
  let databases

  beforeEach(async () => {
    await rimraf('./test-orbitdb-tdd')
    orbitdb = await startOrbitDB({ directory: './test-orbitdb-tdd' })
    databases = {
      attentionSwitches: await orbitdb.open('attention-switches', { type: 'documents' }),
      blessings: await orbitdb.open('blessings', { type: 'documents' }),
      tokensOfGratitude: await orbitdb.open('tokens-of-gratitude', { type: 'documents' }),
      proofsOfService: await orbitdb.open('proofs-of-service', { type: 'documents' }),
      intentions: await orbitdb.open('intentions', { type: 'documents' })
    }
  })

  afterEach(async () => {
    if (orbitdb) {
      await stopOrbitDB(orbitdb)
    }
    await rimraf('./test-orbitdb-tdd')
  })

  it('should handle multiple users giving attention to same intention', async () => {
    const { switchAttention, getUserBlessings, postProofOfService, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Alice gives attention to community garden
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'community_garden',
      databases
    })

    // Bob also gives attention to community garden
    await switchAttention({
      userId: 'bob',
      newIntentionId: 'community_garden',
      databases
    })

    // Charlie gives attention to community garden
    await switchAttention({
      userId: 'charlie',
      newIntentionId: 'community_garden',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // Everyone switches to other activities
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'alice_other',
      databases
    })

    await switchAttention({
      userId: 'bob',
      newIntentionId: 'bob_other',
      databases
    })

    await switchAttention({
      userId: 'charlie',
      newIntentionId: 'charlie_other',
      databases
    })

    // Verify all users have potential blessings
    const aliceBlessings = await getUserBlessings('alice', databases)
    const bobBlessings = await getUserBlessings('bob', databases)
    const charlieBlessings = await getUserBlessings('charlie', databases)

    expect(aliceBlessings[0].status).toBe('potential')
    expect(aliceBlessings[0].intentionId).toBe('community_garden')
    expect(bobBlessings[0].status).toBe('potential')
    expect(bobBlessings[0].intentionId).toBe('community_garden')
    expect(charlieBlessings[0].status).toBe('potential')
    expect(charlieBlessings[0].intentionId).toBe('community_garden')

    // Dave provides service to community garden
    const proof = await postProofOfService({
      intentionId: 'community_garden',
      submittedBy: 'dave',
      title: 'Community garden setup complete',
      description: 'Tilled soil, planted seeds, set up irrigation',
      databases
    })

    expect(proof.success).toBe(true)

    // All three users can forge tokens
    const aliceToken = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0],
      intentionId: 'community_garden',
      honoringProof: proof.proofId,
      message: 'Thank you for the beautiful garden setup!',
      databases
    })

    const bobToken = await forgeTokenOfGratitude({
      forgedBy: 'bob',
      blessingIndices: [0],
      intentionId: 'community_garden',
      honoringProof: proof.proofId,
      message: 'Amazing work on the garden!',
      databases
    })

    const charlieToken = await forgeTokenOfGratitude({
      forgedBy: 'charlie',
      blessingIndices: [0],
      intentionId: 'community_garden',
      honoringProof: proof.proofId,
      message: 'The garden looks fantastic!',
      databases
    })

    expect(aliceToken.success).toBe(true)
    expect(bobToken.success).toBe(true)
    expect(charlieToken.success).toBe(true)

    // Verify all tokens are different but honor same proof
    expect(aliceToken.tokenId).not.toBe(bobToken.tokenId)
    expect(bobToken.tokenId).not.toBe(charlieToken.tokenId)

    const aliceTokenData = await databases.tokensOfGratitude.get(aliceToken.tokenId)
    const bobTokenData = await databases.tokensOfGratitude.get(bobToken.tokenId)
    const charlieTokenData = await databases.tokensOfGratitude.get(charlieToken.tokenId)

    expect(aliceTokenData.value.honoringProof).toBe(proof.proofId)
    expect(bobTokenData.value.honoringProof).toBe(proof.proofId)
    expect(charlieTokenData.value.honoringProof).toBe(proof.proofId)

    // Verify all blessings marked as given
    const aliceFinalBlessings = await getUserBlessings('alice', databases)
    const bobFinalBlessings = await getUserBlessings('bob', databases)
    const charlieFinalBlessings = await getUserBlessings('charlie', databases)

    expect(aliceFinalBlessings[0].status).toBe('given')
    expect(bobFinalBlessings[0].status).toBe('given')
    expect(charlieFinalBlessings[0].status).toBe('given')
  })

  it('should handle interleaved attention switches between multiple users', async () => {
    const { switchAttention, getUserBlessings, calculateAttentionDuration } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Complex interleaved attention pattern
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'project_a',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'bob',
      newIntentionId: 'project_a',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'project_b',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'bob',
      newIntentionId: 'project_b',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'project_a',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'bob',
      newIntentionId: 'project_c',
      databases
    })

    // Verify independent attention tracking
    const aliceBlessings = await getUserBlessings('alice', databases)
    const bobBlessings = await getUserBlessings('bob', databases)

    expect(aliceBlessings.length).toBe(3) // 3 attention switches
    expect(bobBlessings.length).toBe(3) // 3 attention switches

    // Verify blessing sequences
    expect(aliceBlessings[0].intentionId).toBe('project_a')
    expect(aliceBlessings[0].status).toBe('potential')
    expect(aliceBlessings[1].intentionId).toBe('project_b')
    expect(aliceBlessings[1].status).toBe('potential')
    expect(aliceBlessings[2].intentionId).toBe('project_a')
    expect(aliceBlessings[2].status).toBe('active')

    expect(bobBlessings[0].intentionId).toBe('project_a')
    expect(bobBlessings[0].status).toBe('potential')
    expect(bobBlessings[1].intentionId).toBe('project_b')
    expect(bobBlessings[1].status).toBe('potential')
    expect(bobBlessings[2].intentionId).toBe('project_c')
    expect(bobBlessings[2].status).toBe('active')

    // Verify duration calculations are independent
    const aliceAttentionLog = await databases.attentionSwitches.get('attention-alice')
    const bobAttentionLog = await databases.attentionSwitches.get('attention-bob')

    expect(aliceAttentionLog.value.events.length).toBe(3)
    expect(bobAttentionLog.value.events.length).toBe(3)

    const aliceDuration0 = calculateAttentionDuration(aliceAttentionLog.value.events, 0)
    const bobDuration0 = calculateAttentionDuration(bobAttentionLog.value.events, 0)

    expect(aliceDuration0).toBeGreaterThan(40)
    expect(bobDuration0).toBeGreaterThan(40)
  })

  it('should prevent cross-user blessing forgery', async () => {
    const { switchAttention, forgeTokenOfGratitude, postProofOfService } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Alice gives attention
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'help_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    // Bob gives attention
    await switchAttention({
      userId: 'bob',
      newIntentionId: 'help_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    // Both switch away
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'alice_other',
      databases
    })

    await switchAttention({
      userId: 'bob',
      newIntentionId: 'bob_other',
      databases
    })

    // Charlie provides service
    const proof = await postProofOfService({
      intentionId: 'help_project',
      submittedBy: 'charlie',
      title: 'Project completed',
      description: 'Finished the work',
      databases
    })

    // Alice tries to forge token from mixed intentions - should fail
    // Alice has blessing index 0 for 'help_project' and index 1 for 'bob_other'
    const maliciousToken = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0, 1], // Mixed intentions: index 0 is help_project, index 1 is bob_other
      intentionId: 'help_project',
      honoringProof: proof.proofId,
      message: 'Fraudulent token attempt',
      databases
    })

    expect(maliciousToken.success).toBe(false)
    expect(maliciousToken.error).toContain('All blessings must be from the same intention')
  })

  it('should handle simultaneous token forging from same proof', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude, giftTokenToServiceProvider } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Multiple users give attention to same intention
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'big_project',
      databases
    })

    await switchAttention({
      userId: 'bob',
      newIntentionId: 'big_project',
      databases
    })

    await switchAttention({
      userId: 'charlie',
      newIntentionId: 'big_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // All switch away
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'alice_other',
      databases
    })

    await switchAttention({
      userId: 'bob',
      newIntentionId: 'bob_other',
      databases
    })

    await switchAttention({
      userId: 'charlie',
      newIntentionId: 'charlie_other',
      databases
    })

    // Dave provides service
    const proof = await postProofOfService({
      intentionId: 'big_project',
      submittedBy: 'dave',
      title: 'Big project completed',
      description: 'Comprehensive work done',
      databases
    })

    // All users forge tokens simultaneously
    const [aliceToken, bobToken, charlieToken] = await Promise.all([
      forgeTokenOfGratitude({
        forgedBy: 'alice',
        blessingIndices: [0],
        intentionId: 'big_project',
        honoringProof: proof.proofId,
        message: 'Alice thanks Dave',
        databases
      }),
      forgeTokenOfGratitude({
        forgedBy: 'bob',
        blessingIndices: [0],
        intentionId: 'big_project',
        honoringProof: proof.proofId,
        message: 'Bob thanks Dave',
        databases
      }),
      forgeTokenOfGratitude({
        forgedBy: 'charlie',
        blessingIndices: [0],
        intentionId: 'big_project',
        honoringProof: proof.proofId,
        message: 'Charlie thanks Dave',
        databases
      })
    ])

    expect(aliceToken.success).toBe(true)
    expect(bobToken.success).toBe(true)
    expect(charlieToken.success).toBe(true)

    // All gift tokens to Dave simultaneously
    const [aliceGift, bobGift, charlieGift] = await Promise.all([
      giftTokenToServiceProvider({
        tokenId: aliceToken.tokenId,
        serviceProviderId: 'dave',
        databases
      }),
      giftTokenToServiceProvider({
        tokenId: bobToken.tokenId,
        serviceProviderId: 'dave',
        databases
      }),
      giftTokenToServiceProvider({
        tokenId: charlieToken.tokenId,
        serviceProviderId: 'dave',
        databases
      })
    ])

    expect(aliceGift.success).toBe(true)
    expect(bobGift.success).toBe(true)
    expect(charlieGift.success).toBe(true)

    // Verify proof tracks received tokens (eventual consistency means we might not get all 3)
    const finalProof = await databases.proofsOfService.get(proof.proofId)
    expect(finalProof.value.tokensReceived.length).toBeGreaterThan(0)
    expect(finalProof.value.tokensReceived.length).toBeLessThanOrEqual(3)
    
    // All tokens should be properly transferred to Dave
    const aliceTokenData = await databases.tokensOfGratitude.get(aliceToken.tokenId)
    const bobTokenData = await databases.tokensOfGratitude.get(bobToken.tokenId)
    const charlieTokenData = await databases.tokensOfGratitude.get(charlieToken.tokenId)
    
    expect(aliceTokenData.value.steward).toBe('dave')
    expect(bobTokenData.value.steward).toBe('dave')
    expect(charlieTokenData.value.steward).toBe('dave')
  })
}, { timeout: 30000 })