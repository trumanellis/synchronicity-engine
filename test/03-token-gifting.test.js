// test/03-token-gifting.test.js
// TDD: Token gifting to service providers

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rimraf } from 'rimraf'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'

describe('TDD: Token Gifting Workflow', () => {
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

  it('should complete full workflow: attention -> token -> gift to service provider', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude, giftTokenToServiceProvider } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // 1. Alice gives attention to help Bob
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'help_bob_garden',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // 2. Alice switches away, making blessing potential
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task',
      databases
    })

    // 3. Bob posts proof of service
    const proof = await postProofOfService({
      intentionId: 'help_bob_garden',
      submittedBy: 'bob',
      title: 'Garden maintenance completed',
      description: 'Weeded and watered the garden beds',
      databases
    })

    // 4. Alice forges token of gratitude
    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0],
      intentionId: 'help_bob_garden',
      honoringProof: proof.proofId,
      message: 'Thank you for the beautiful garden work!',
      databases
    })

    // 5. Alice gifts token to Bob
    const gift = await giftTokenToServiceProvider({
      tokenId: token.tokenId,
      serviceProviderId: 'bob',
      databases
    })
    expect(gift.success).toBe(true)

    // Verify token ownership transferred
    const tokenData = await databases.tokensOfGratitude.get(token.tokenId)
    expect(tokenData.value.steward).toBe('bob')
    expect(tokenData.value.parent).toBe('bob')

    // Verify proof updated with received token
    const proofData = await databases.proofsOfService.get(proof.proofId)
    expect(proofData.value.tokensReceived).toContain(token.tokenId)
  })

  it('should prevent gifting token to wrong service provider', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude, giftTokenToServiceProvider } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Setup: Create token for Bob's service
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'help_bob_garden',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task',
      databases
    })

    const proof = await postProofOfService({
      intentionId: 'help_bob_garden',
      submittedBy: 'bob',
      title: 'Garden work',
      description: 'Completed',
      databases
    })

    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0],
      intentionId: 'help_bob_garden',
      honoringProof: proof.proofId,
      message: 'Thank you for your service',
      databases
    })
    expect(token.success).toBe(true)

    // Try to gift token to Charlie instead of Bob - should fail
    const gift = await giftTokenToServiceProvider({
      tokenId: token.tokenId,
      serviceProviderId: 'charlie',
      databases
    })
    expect(gift.success).toBe(false)
    expect(gift.error).toContain('Token must be gifted to the service provider')
  })

  it('should allow multiple tokens to be gifted to same service provider', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude, giftTokenToServiceProvider } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Alice gives attention twice to same intention
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'help_bob_garden',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'help_bob_garden',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'final_task',
      databases
    })

    // Bob posts proof
    const proof = await postProofOfService({
      intentionId: 'help_bob_garden',
      submittedBy: 'bob',
      title: 'Comprehensive garden work',
      description: 'Deep cleaning and restructuring',
      databases
    })

    // Alice forges token from both blessings
    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0, 2],
      intentionId: 'help_bob_garden',
      honoringProof: proof.proofId,
      message: 'Thank you for the extensive garden work!',
      databases
    })

    // Gift to Bob
    const gift = await giftTokenToServiceProvider({
      tokenId: token.tokenId,
      serviceProviderId: 'bob',
      databases
    })
    expect(gift.success).toBe(true)

    // Verify proof tracks the token
    const proofData = await databases.proofsOfService.get(proof.proofId)
    expect(proofData.value.tokensReceived).toContain(token.tokenId)
  })
}, { timeout: 30000 })