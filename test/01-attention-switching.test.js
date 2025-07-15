// test/01-attention-switching.test.js
// TDD: Start with the most basic attention switching behavior

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rimraf } from 'rimraf'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'

describe('TDD: Attention Switching', () => {
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

  it('should create first attention switch event', async () => {
    const { switchAttention } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    const result = await switchAttention({
      userId: 'alice',
      newIntentionId: 'intention_test',
      databases
    })

    expect(result.success).toBe(true)
    expect(result.newIndex).toBe(0)
  })

  it('should create second attention switch and mark previous blessing as potential', async () => {
    const { switchAttention } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // First attention switch
    const result1 = await switchAttention({
      userId: 'alice',
      newIntentionId: 'intention_1',
      databases
    })

    expect(result1.success).toBe(true)
    expect(result1.newIndex).toBe(0)

    // Second attention switch
    const result2 = await switchAttention({
      userId: 'alice',
      newIntentionId: 'intention_2',
      databases
    })

    expect(result2.success).toBe(true)
    expect(result2.newIndex).toBe(1)
  })

  it('should calculate attention duration and verify blessing status transitions', async () => {
    const { switchAttention, getUserBlessings, calculateAttentionDuration } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // First attention switch
    const result1 = await switchAttention({
      userId: 'alice',
      newIntentionId: 'intention_1',
      databases
    })

    expect(result1.success).toBe(true)
    expect(result1.newIndex).toBe(0)

    // Wait a bit to get measurable duration
    await new Promise(resolve => setTimeout(resolve, 100))

    // Second attention switch
    const result2 = await switchAttention({
      userId: 'alice',
      newIntentionId: 'intention_2',
      databases
    })

    expect(result2.success).toBe(true)
    expect(result2.newIndex).toBe(1)

    // Verify blessing states
    const blessings = await getUserBlessings('alice', databases)
    expect(blessings.length).toBe(2)
    
    // First blessing should be potential
    expect(blessings[0].status).toBe('potential')
    expect(blessings[0].intentionId).toBe('intention_1')
    expect(blessings[0].index).toBe(0)
    
    // Second blessing should be active
    expect(blessings[1].status).toBe('active')
    expect(blessings[1].intentionId).toBe('intention_2')
    expect(blessings[1].index).toBe(1)

    // Get attention log for duration calculation
    const attentionLog = await databases.attentionSwitches.get('attention-alice')
    expect(attentionLog.value.events.length).toBe(2)
    
    // Calculate duration for first blessing
    const duration = calculateAttentionDuration(attentionLog.value.events, 0)
    expect(duration).toBeGreaterThan(90) // Should be at least 90ms
  })
}, { timeout: 30000 })