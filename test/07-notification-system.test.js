// test/07-notification-system.test.js
// TDD: Notification system and potential token forger discovery

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rimraf } from 'rimraf'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'

describe('TDD: Notification System', () => {
  let orbitdb
  let databases
  let notificationLogs

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
    notificationLogs = []
  })

  afterEach(async () => {
    if (orbitdb) {
      await stopOrbitDB(orbitdb)
    }
    await rimraf('./test-orbitdb-tdd')
  })

  it('should discover users with potential blessings for an intention', async () => {
    const { switchAttention, getUserBlessings } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Multiple users give attention to same intention
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'shared_intention',
      databases
    })

    await switchAttention({
      userId: 'bob',
      newIntentionId: 'shared_intention',
      databases
    })

    await switchAttention({
      userId: 'charlie',
      newIntentionId: 'shared_intention',
      databases
    })

    // Dave gives attention to different intention
    await switchAttention({
      userId: 'dave',
      newIntentionId: 'different_intention',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // All users switch away
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

    await switchAttention({
      userId: 'dave',
      newIntentionId: 'dave_other',
      databases
    })

    // Verify users have potential blessings
    const aliceBlessings = await getUserBlessings('alice', databases)
    const bobBlessings = await getUserBlessings('bob', databases)
    const charlieBlessings = await getUserBlessings('charlie', databases)
    const daveBlessings = await getUserBlessings('dave', databases)

    expect(aliceBlessings[0].intentionId).toBe('shared_intention')
    expect(aliceBlessings[0].status).toBe('potential')
    expect(bobBlessings[0].intentionId).toBe('shared_intention')
    expect(bobBlessings[0].status).toBe('potential')
    expect(charlieBlessings[0].intentionId).toBe('shared_intention')
    expect(charlieBlessings[0].status).toBe('potential')
    expect(daveBlessings[0].intentionId).toBe('different_intention')
    expect(daveBlessings[0].status).toBe('potential')

    // TODO: Test getUsersWithPotentialBlessings function when implemented
    // This would find alice, bob, charlie but not dave for 'shared_intention'
  })

  it('should handle proof posting with notification triggers', async () => {
    const { switchAttention, postProofOfService } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Setup users with potential blessings
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'notify_intention',
      databases
    })

    await switchAttention({
      userId: 'bob',
      newIntentionId: 'notify_intention',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

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

    // Charlie posts proof (this should trigger notifications)
    const proof = await postProofOfService({
      intentionId: 'notify_intention',
      submittedBy: 'charlie',
      title: 'Notification test service',
      description: 'Service that should trigger notifications',
      databases
    })

    expect(proof.success).toBe(true)

    // Verify proof was created
    const proofData = await databases.proofsOfService.get(proof.proofId)
    expect(proofData.value.intentionId).toBe('notify_intention')
    expect(proofData.value.submittedBy).toBe('charlie')
    expect(proofData.value.tokensReceived).toEqual([])
  })

  it('should handle notification system gracefully when no eligible users', async () => {
    const { postProofOfService } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Post proof for intention with no potential blessings
    const proof = await postProofOfService({
      intentionId: 'empty_intention',
      submittedBy: 'alice',
      title: 'Service with no potential forgers',
      description: 'No one has potential blessings for this intention',
      databases
    })

    expect(proof.success).toBe(true)

    // Should not crash even with no eligible users
    const proofData = await databases.proofsOfService.get(proof.proofId)
    expect(proofData.value.intentionId).toBe('empty_intention')
  })

  it('should handle token received notifications', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude, giftTokenToServiceProvider } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Setup complete workflow
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'gift_intention',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'alice_other',
      databases
    })

    const proof = await postProofOfService({
      intentionId: 'gift_intention',
      submittedBy: 'bob',
      title: 'Gift test service',
      description: 'Service for gift notification test',
      databases
    })

    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0],
      intentionId: 'gift_intention',
      honoringProof: proof.proofId,
      message: 'Test token for notification',
      databases
    })

    // Gift token to service provider (should trigger notification)
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

    // Verify proof updated
    const proofData = await databases.proofsOfService.get(proof.proofId)
    expect(proofData.value.tokensReceived).toContain(token.tokenId)
  })

  it('should handle multiple proofs for same intention', async () => {
    const { switchAttention, postProofOfService } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Setup users with potential blessings
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'multi_proof_intention',
      databases
    })

    await switchAttention({
      userId: 'bob',
      newIntentionId: 'multi_proof_intention',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

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

    // Multiple people post proofs for same intention
    const proof1 = await postProofOfService({
      intentionId: 'multi_proof_intention',
      submittedBy: 'charlie',
      title: 'First proof',
      description: 'First service proof',
      databases
    })

    const proof2 = await postProofOfService({
      intentionId: 'multi_proof_intention',
      submittedBy: 'dave',
      title: 'Second proof',
      description: 'Second service proof',
      databases
    })

    expect(proof1.success).toBe(true)
    expect(proof2.success).toBe(true)
    expect(proof1.proofId).not.toBe(proof2.proofId)

    // Both proofs should be stored
    const proof1Data = await databases.proofsOfService.get(proof1.proofId)
    const proof2Data = await databases.proofsOfService.get(proof2.proofId)

    expect(proof1Data.value.submittedBy).toBe('charlie')
    expect(proof2Data.value.submittedBy).toBe('dave')
    expect(proof1Data.value.intentionId).toBe('multi_proof_intention')
    expect(proof2Data.value.intentionId).toBe('multi_proof_intention')
  })

  it('should handle notification system edge cases', async () => {
    const { switchAttention, postProofOfService } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // User has both active and potential blessings for same intention
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'edge_intention',
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
      newIntentionId: 'edge_intention',
      databases
    })

    // Alice now has one potential blessing and one active blessing for edge_intention

    const proof = await postProofOfService({
      intentionId: 'edge_intention',
      submittedBy: 'bob',
      title: 'Edge case service',
      description: 'Service for edge case testing',
      databases
    })

    expect(proof.success).toBe(true)

    // Should handle the case where user has mixed blessing states
    const proofData = await databases.proofsOfService.get(proof.proofId)
    expect(proofData.value.intentionId).toBe('edge_intention')
  })

  it('should handle very long intention and user IDs', async () => {
    const { switchAttention, postProofOfService } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    const longUserId = 'a'.repeat(100)
    const longIntentionId = 'intention_' + 'b'.repeat(100)
    
    await switchAttention({
      userId: longUserId,
      newIntentionId: longIntentionId,
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: longUserId,
      newIntentionId: 'other_task',
      databases
    })

    const proof = await postProofOfService({
      intentionId: longIntentionId,
      submittedBy: 'bob',
      title: 'Long ID service',
      description: 'Service with very long IDs',
      databases
    })

    expect(proof.success).toBe(true)

    const proofData = await databases.proofsOfService.get(proof.proofId)
    expect(proofData.value.intentionId).toBe(longIntentionId)
  })
}, { timeout: 30000 })