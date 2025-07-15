// test/06-edge-cases-validation.test.js
// TDD: Comprehensive edge cases and validation scenarios

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rimraf } from 'rimraf'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'

describe('TDD: Edge Cases and Validation', () => {
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

  it('should handle empty blessing indices array', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'test_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task',
      databases
    })

    const proof = await postProofOfService({
      intentionId: 'test_project',
      submittedBy: 'bob',
      title: 'Test project done',
      description: 'Completed test project',
      databases
    })

    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [], // Empty array
      intentionId: 'test_project',
      honoringProof: proof.proofId,
      message: 'Token from no blessings',
      databases
    })

    expect(token.success).toBe(false)
    expect(token.error).toContain('Must provide at least one blessing index')
  })

  it('should handle duplicate blessing indices', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'dup_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task',
      databases
    })

    const proof = await postProofOfService({
      intentionId: 'dup_project',
      submittedBy: 'bob',
      title: 'Dup project done',
      description: 'Completed dup project',
      databases
    })

    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0, 0, 0], // Duplicate indices
      intentionId: 'dup_project',
      honoringProof: proof.proofId,
      message: 'Token from duplicate blessings',
      databases
    })

    expect(token.success).toBe(true) // Should work, just calculate duration multiple times
    
    const tokenData = await databases.tokensOfGratitude.get(token.tokenId)
    expect(tokenData.value.forgedFrom).toEqual([0, 0, 0])
    
    // Duration should be 3x the single blessing duration
    const attentionLog = await databases.attentionSwitches.get('attention-alice')
    const singleDuration = (await import('../dist/lib/synchronicity-engine-v2.js')).calculateAttentionDuration(attentionLog.value.events, 0)
    expect(tokenData.value.totalDuration).toBe(singleDuration * 3)
  })

  it('should handle negative blessing indices', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'neg_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task',
      databases
    })

    const proof = await postProofOfService({
      intentionId: 'neg_project',
      submittedBy: 'bob',
      title: 'Neg project done',
      description: 'Completed neg project',
      databases
    })

    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [-1, 0], // Negative index
      intentionId: 'neg_project',
      honoringProof: proof.proofId,
      message: 'Token from negative index',
      databases
    })

    expect(token.success).toBe(false)
    expect(token.error).toContain('One or more blessings not found')
  })

  it('should handle extremely large blessing indices', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'large_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task',
      databases
    })

    const proof = await postProofOfService({
      intentionId: 'large_project',
      submittedBy: 'bob',
      title: 'Large project done',
      description: 'Completed large project',
      databases
    })

    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0, 999999], // Extremely large index
      intentionId: 'large_project',
      honoringProof: proof.proofId,
      message: 'Token from large index',
      databases
    })

    expect(token.success).toBe(false)
    expect(token.error).toContain('One or more blessings not found')
  })

  it('should handle invalid proof references', async () => {
    const { switchAttention, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'invalid_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task',
      databases
    })

    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0],
      intentionId: 'invalid_project',
      honoringProof: 'nonexistent_proof_id',
      message: 'Token from invalid proof',
      databases
    })

    expect(token.success).toBe(true) // Should succeed, proof validation happens during gifting
    
    const tokenData = await databases.tokensOfGratitude.get(token.tokenId)
    expect(tokenData.value.honoringProof).toBe('nonexistent_proof_id')
  })

  it('should handle gifting with nonexistent token', async () => {
    const { giftTokenToServiceProvider } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    const gift = await giftTokenToServiceProvider({
      tokenId: 'nonexistent_token_id',
      serviceProviderId: 'bob',
      databases
    })

    expect(gift.success).toBe(false)
    expect(gift.error).toContain('Token nonexistent_token_id not found')
  })

  it('should handle gifting with nonexistent proof', async () => {
    const { switchAttention, forgeTokenOfGratitude, giftTokenToServiceProvider } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'gift_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task',
      databases
    })

    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0],
      intentionId: 'gift_project',
      honoringProof: 'nonexistent_proof_id',
      message: 'Token with invalid proof',
      databases
    })

    expect(token.success).toBe(true)

    const gift = await giftTokenToServiceProvider({
      tokenId: token.tokenId,
      serviceProviderId: 'bob',
      databases
    })

    expect(gift.success).toBe(false)
    expect(gift.error).toContain('Proof nonexistent_proof_id not found')
  })

  it('should handle simultaneous attention switches', async () => {
    const { switchAttention, getUserBlessings } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Simulate rapid attention switches
    const switches = await Promise.all([
      switchAttention({
        userId: 'alice',
        newIntentionId: 'rapid_project_1',
        databases
      }),
      switchAttention({
        userId: 'alice',
        newIntentionId: 'rapid_project_2',
        databases
      }),
      switchAttention({
        userId: 'alice',
        newIntentionId: 'rapid_project_3',
        databases
      })
    ])

    // All switches should succeed
    expect(switches[0].success).toBe(true)
    expect(switches[1].success).toBe(true)
    expect(switches[2].success).toBe(true)

    // Due to race conditions, we might have fewer than 3 blessings
    // The final state depends on timing
    const blessings = await getUserBlessings('alice', databases)
    expect(blessings.length).toBeGreaterThan(0)
    
    // At least one should be active
    const activeCount = blessings.filter(b => b.status === 'active').length
    expect(activeCount).toBe(1)
  })

  it('should handle very long attention durations', async () => {
    const { switchAttention, calculateAttentionDuration } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Create attention switch but don't switch away (simulating long attention)
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'long_project',
      databases
    })

    // Calculate duration of ongoing attention
    const attentionLog = await databases.attentionSwitches.get('attention-alice')
    const duration = calculateAttentionDuration(attentionLog.value.events, 0)
    
    expect(duration).toBeGreaterThan(0)
    expect(duration).toBeLessThan(1000) // Should be reasonable for test
  })

  it('should handle same user switching to same intention', async () => {
    const { switchAttention, getUserBlessings } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'same_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    // Switch to same intention again
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'same_project',
      databases
    })

    const blessings = await getUserBlessings('alice', databases)
    expect(blessings.length).toBe(2)
    expect(blessings[0].intentionId).toBe('same_project')
    expect(blessings[1].intentionId).toBe('same_project')
    expect(blessings[0].status).toBe('potential')
    expect(blessings[1].status).toBe('active')
  })

  it('should handle empty or invalid user IDs', async () => {
    const { switchAttention, getUserBlessings } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Test empty user ID
    const emptyResult = await switchAttention({
      userId: '',
      newIntentionId: 'test_project',
      databases
    })

    expect(emptyResult.success).toBe(false) // Empty string should fail validation

    // Test null-like user ID
    const nullResult = await switchAttention({
      userId: null,
      newIntentionId: 'test_project',
      databases
    })

    expect(nullResult.success).toBe(false) // Should fail due to null processing

    // Test undefined user ID
    const undefinedResult = await switchAttention({
      userId: undefined,
      newIntentionId: 'test_project',
      databases
    })

    expect(undefinedResult.success).toBe(false) // Should fail due to undefined processing
  })

  it('should handle special characters in IDs', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    const specialUserId = 'alice@example.com'
    const specialIntentionId = 'project-with-dashes_and_underscores.123'
    
    await switchAttention({
      userId: specialUserId,
      newIntentionId: specialIntentionId,
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: specialUserId,
      newIntentionId: 'other_task',
      databases
    })

    const proof = await postProofOfService({
      intentionId: specialIntentionId,
      submittedBy: 'bob@example.com',
      title: 'Special project completed',
      description: 'Completed project with special characters',
      databases
    })

    const token = await forgeTokenOfGratitude({
      forgedBy: specialUserId,
      blessingIndices: [0],
      intentionId: specialIntentionId,
      honoringProof: proof.proofId,
      message: 'Token with special characters',
      databases
    })

    expect(token.success).toBe(true)
    
    const tokenData = await databases.tokensOfGratitude.get(token.tokenId)
    expect(tokenData.value.forgedBy).toBe(specialUserId)
    expect(tokenData.value.intentionId).toBe(specialIntentionId)
  })
}, { timeout: 30000 })