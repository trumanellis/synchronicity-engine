// test/calculate-duration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'
import { 
  setIntention, 
  switchAttention, 
  calculateBlessingDuration,
  getUserAttentionHistory 
} from '../src/lib/synchronicity-engine'

describe('Calculate Duration', () => {
  let orbitdb: any
  let databases: any

  beforeEach(async () => {
    orbitdb = await startOrbitDB({ directory: './test-orbitdb' })
    
    databases = {
      intentions: await orbitdb.open('test-intentions', { type: 'documents' }),
      blessings: await orbitdb.open('test-blessings', { type: 'documents' }),
      attentionSwitches: await orbitdb.open('test-attention', { type: 'events' })
    }
  })

  afterEach(async () => {
    if (orbitdb) {
      await stopOrbitDB(orbitdb)
    }
    await rimraf('./test-orbitdb')
    await rimraf('./test-ipfs')
  })

  it('should calculate duration for a completed blessing', async () => {
    const userId = 'truman'
    
    // Create intention at 10:00 (0ms)
    const intention1 = await setIntention({
      userId,
      title: 'Morning meditation',
      databases,
      timestamp: 0
    })

    // Switch attention at 10:30 (30 minutes = 1,800,000ms)
    await switchAttention({
      userId,
      toIntentionId: 'intention_other',
      databases,
      timestamp: 1_800_000
    })

    // Calculate duration of first blessing
    const duration = await calculateBlessingDuration({
      blessingId: intention1.blessingId,
      userId,
      databases
    })

    expect(duration).toBe(1_800_000) // 30 minutes in milliseconds
  })

  it('should calculate duration for active blessing using current time', async () => {
    const userId = 'alice'
    const startTime = Date.now() - 600_000 // 10 minutes ago
    
    // Create intention 10 minutes ago
    const intention = await setIntention({
      userId,
      title: 'Active intention',
      databases,
      timestamp: startTime
    })

    // Calculate duration (should use current time as end)
    const duration = await calculateBlessingDuration({
      blessingId: intention.blessingId,
      userId,
      databases
    })

    // Should be approximately 10 minutes (allowing 1 second tolerance for test execution)
    expect(duration).toBeGreaterThanOrEqual(600_000)
    expect(duration).toBeLessThan(601_000)
  })

  it('should calculate duration for blessing with specific attention index', async () => {
    const userId = 'poet'
    
    // Create timeline: intention1 (5min) -> intention2 (10min) -> intention1 again (15min)
    const intention1 = await setIntention({
      userId,
      title: 'First intention',
      databases,
      timestamp: 0
    })

    const intention2 = await setIntention({
      userId,
      title: 'Second intention',
      databases,
      timestamp: 300_000 // 5 minutes
    })

    const result = await switchAttention({
      userId,
      toIntentionId: intention1.intentionId,
      databases,
      timestamp: 900_000 // 15 minutes total
    })

    // Calculate durations
    const duration1 = await calculateBlessingDuration({
      blessingId: intention1.blessingId,
      userId,
      databases
    })
    
    const duration2 = await calculateBlessingDuration({
      blessingId: intention2.blessingId,
      userId,
      databases
    })

    const duration3 = await calculateBlessingDuration({
      blessingId: result.newBlessingId,
      userId,
      databases,
      currentTime: 1_800_000 // 30 minutes total
    })

    expect(duration1).toBe(300_000)  // 5 minutes
    expect(duration2).toBe(600_000)  // 10 minutes  
    expect(duration3).toBe(900_000)  // 15 minutes
  })

  it('should get user attention history in chronological order', async () => {
    const userId = 'historian'
    
    // Create events out of chronological order
    const intention3 = await setIntention({
      userId,
      title: 'Third',
      databases,
      timestamp: 3000
    })

    const intention1 = await setIntention({
      userId,
      title: 'First',
      databases,
      timestamp: 1000
    })

    const intention2 = await setIntention({
      userId,
      title: 'Second', 
      databases,
      timestamp: 2000
    })

    const history = await getUserAttentionHistory({
      userId,
      databases
    })

    expect(history).toHaveLength(3)
    expect(history[0].timestamp).toBe(1000)
    expect(history[1].timestamp).toBe(2000)
    expect(history[2].timestamp).toBe(3000)
    
    // Intention IDs are based on timestamp, so:
    expect(history[0].intentionId).toBe('intention_1000')
    expect(history[1].intentionId).toBe('intention_2000')
    expect(history[2].intentionId).toBe('intention_3000')
  })

  it('should handle blessings with no duration (edge case)', async () => {
    const userId = 'edgecase'
    
    // Create an intention but don't switch attention
    const intention = await setIntention({
      userId,
      title: 'No duration intention',
      databases,
      timestamp: 1000
    })

    // Manually set blessing to potential with same timestamp
    const blessing = await databases.blessings.get(intention.blessingId)
    blessing.value.status = 'potential'
    await databases.blessings.put(blessing.value)

    // Add another attention switch at exact same time
    await databases.attentionSwitches.add({
      userId,
      intentionId: 'other',
      timestamp: 1000
    })

    const duration = await calculateBlessingDuration({
      blessingId: intention.blessingId,
      userId,
      databases
    })

    expect(duration).toBe(0) // No time elapsed
  })
})