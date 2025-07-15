// test/05-multi-blessing-tokens.test.js
// TDD: Complex token forging from multiple blessings

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rimraf } from 'rimraf'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'

describe('TDD: Multi-Blessing Token Forging', () => {
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

  it('should forge token from multiple consecutive blessings', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude, getUserBlessings } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Alice gives attention to same intention multiple times
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'marathon_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'break_task',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'marathon_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'another_break',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'marathon_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'final_task',
      databases
    })

    // Verify Alice has multiple potential blessings for marathon_project
    const blessings = await getUserBlessings('alice', databases)
    expect(blessings.length).toBe(6)

    const marathonBlessings = blessings.filter(b => b.intentionId === 'marathon_project')
    expect(marathonBlessings.length).toBe(3)
    expect(marathonBlessings[0].index).toBe(0)
    expect(marathonBlessings[1].index).toBe(2)
    expect(marathonBlessings[2].index).toBe(4)
    expect(marathonBlessings[0].status).toBe('potential')
    expect(marathonBlessings[1].status).toBe('potential')
    expect(marathonBlessings[2].status).toBe('potential')

    // Bob completes the marathon project
    const proof = await postProofOfService({
      intentionId: 'marathon_project',
      submittedBy: 'bob',
      title: 'Marathon project completed',
      description: 'Completed the extensive marathon project work',
      databases
    })

    // Alice forges token from all three marathon blessings
    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0, 2, 4],
      intentionId: 'marathon_project',
      honoringProof: proof.proofId,
      message: 'Thank you for completing this marathon project!',
      databases
    })

    expect(token.success).toBe(true)

    // Verify token contains all three blessings
    const tokenData = await databases.tokensOfGratitude.get(token.tokenId)
    expect(tokenData.value.forgedFrom).toEqual([0, 2, 4])
    expect(tokenData.value.totalDuration).toBeGreaterThan(250) // Sum of all three durations

    // Verify all three blessings marked as given
    const finalBlessings = await getUserBlessings('alice', databases)
    const marathonFinalBlessings = finalBlessings.filter(b => b.intentionId === 'marathon_project')
    expect(marathonFinalBlessings[0].status).toBe('given')
    expect(marathonFinalBlessings[1].status).toBe('given')
    expect(marathonFinalBlessings[2].status).toBe('given')
    expect(marathonFinalBlessings[0].forgedIntoToken).toBe(token.tokenId)
    expect(marathonFinalBlessings[1].forgedIntoToken).toBe(token.tokenId)
    expect(marathonFinalBlessings[2].forgedIntoToken).toBe(token.tokenId)
  })

  it('should prevent forging from mixed intention blessings', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Alice gives attention to different intentions
    await switchAttention({
      userId: 'alice',
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
      userId: 'alice',
      newIntentionId: 'project_a',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'final_task',
      databases
    })

    // Bob provides service to project_a
    const proof = await postProofOfService({
      intentionId: 'project_a',
      submittedBy: 'bob',
      title: 'Project A completed',
      description: 'Finished project A work',
      databases
    })

    // Alice tries to forge token mixing project_a and project_b blessings
    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0, 1, 2], // Mixed intentions
      intentionId: 'project_a',
      honoringProof: proof.proofId,
      message: 'Mixed blessing token attempt',
      databases
    })

    expect(token.success).toBe(false)
    expect(token.error).toContain('All blessings must be from the same intention')
  })

  it('should prevent forging from non-existent blessing indices', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Alice gives limited attention
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'small_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task',
      databases
    })

    // Bob provides service
    const proof = await postProofOfService({
      intentionId: 'small_project',
      submittedBy: 'bob',
      title: 'Small project done',
      description: 'Completed small project',
      databases
    })

    // Alice tries to forge token from non-existent blessing index
    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0, 5], // Index 5 doesn't exist
      intentionId: 'small_project',
      honoringProof: proof.proofId,
      message: 'Token from non-existent blessing',
      databases
    })

    expect(token.success).toBe(false)
    expect(token.error).toContain('One or more blessings not found')
  })

  it('should prevent forging from already given blessings', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Alice gives attention multiple times
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'reuse_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'break_task',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'reuse_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'final_task',
      databases
    })

    // Bob provides service
    const proof = await postProofOfService({
      intentionId: 'reuse_project',
      submittedBy: 'bob',
      title: 'Reuse project completed',
      description: 'Finished reuse project work',
      databases
    })

    // Alice forges token from first blessing
    const firstToken = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0],
      intentionId: 'reuse_project',
      honoringProof: proof.proofId,
      message: 'First token from first blessing',
      databases
    })

    expect(firstToken.success).toBe(true)

    // Alice tries to forge another token including the already given blessing
    const secondToken = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0, 2], // Index 0 is already given
      intentionId: 'reuse_project',
      honoringProof: proof.proofId,
      message: 'Second token reusing first blessing',
      databases
    })

    expect(secondToken.success).toBe(false)
    expect(secondToken.error).toContain('Can only forge from potential blessings')
  })

  it('should calculate correct total duration for multi-blessing tokens', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude, calculateAttentionDuration } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Alice gives attention with specific timing
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'timed_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 100)) // ~100ms

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'break_task',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50)) // ~50ms

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'timed_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 150)) // ~150ms

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'another_break',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 75)) // ~75ms

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'timed_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 200)) // ~200ms

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'final_task',
      databases
    })

    // Bob provides service
    const proof = await postProofOfService({
      intentionId: 'timed_project',
      submittedBy: 'bob',
      title: 'Timed project completed',
      description: 'Completed timed project work',
      databases
    })

    // Alice forges token from all timed_project blessings
    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0, 2, 4],
      intentionId: 'timed_project',
      honoringProof: proof.proofId,
      message: 'Token from all timed blessings',
      databases
    })

    expect(token.success).toBe(true)

    // Verify total duration is sum of individual durations
    const attentionLog = await databases.attentionSwitches.get('attention-alice')
    const duration0 = calculateAttentionDuration(attentionLog.value.events, 0)
    const duration2 = calculateAttentionDuration(attentionLog.value.events, 2)
    const duration4 = calculateAttentionDuration(attentionLog.value.events, 4)
    const expectedTotal = duration0 + duration2 + duration4

    const tokenData = await databases.tokensOfGratitude.get(token.tokenId)
    expect(tokenData.value.totalDuration).toBe(expectedTotal)
    expect(tokenData.value.totalDuration).toBeGreaterThan(400) // Should be ~450ms total
  })

  it('should handle sparse blessing indices correctly', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // Alice gives attention with gaps
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'sparse_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task_1',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task_2',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task_3',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task_4',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'sparse_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task_5',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task_6',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'sparse_project',
      databases
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    await switchAttention({
      userId: 'alice',
      newIntentionId: 'final_task',
      databases
    })

    // Bob provides service
    const proof = await postProofOfService({
      intentionId: 'sparse_project',
      submittedBy: 'bob',
      title: 'Sparse project completed',
      description: 'Completed sparse project work',
      databases
    })

    // Alice forges token from sparse indices [0, 5, 8]
    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0, 5, 8],
      intentionId: 'sparse_project',
      honoringProof: proof.proofId,
      message: 'Token from sparse blessings',
      databases
    })

    expect(token.success).toBe(true)

    const tokenData = await databases.tokensOfGratitude.get(token.tokenId)
    expect(tokenData.value.forgedFrom).toEqual([0, 5, 8])
    expect(tokenData.value.totalDuration).toBeGreaterThan(120) // Should be ~150ms total
  })
}, { timeout: 30000 })