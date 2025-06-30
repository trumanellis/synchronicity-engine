// test/calculate-duration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'
import { 
  createPrayer, 
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
      prayers: await orbitdb.open('test-prayers', { type: 'documents' }),
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
    
    // Create prayer at 10:00 (0ms)
    const prayer1 = await createPrayer({
      userId,
      title: 'Morning meditation',
      databases,
      timestamp: 0
    })

    // Switch attention at 10:30 (30 minutes = 1,800,000ms)
    await switchAttention({
      userId,
      toPrayerId: 'prayer_other',
      databases,
      timestamp: 1_800_000
    })

    // Calculate duration of first blessing
    const duration = await calculateBlessingDuration({
      blessingId: prayer1.blessingId,
      userId,
      databases
    })

    expect(duration).toBe(1_800_000) // 30 minutes in milliseconds
  })

  it('should calculate duration for active blessing using current time', async () => {
    const userId = 'alice'
    const startTime = Date.now() - 600_000 // 10 minutes ago
    
    // Create prayer 10 minutes ago
    const prayer = await createPrayer({
      userId,
      title: 'Active prayer',
      databases,
      timestamp: startTime
    })

    // Calculate duration (should use current time as end)
    const duration = await calculateBlessingDuration({
      blessingId: prayer.blessingId,
      userId,
      databases
    })

    // Should be approximately 10 minutes (allowing 1 second tolerance for test execution)
    expect(duration).toBeGreaterThanOrEqual(600_000)
    expect(duration).toBeLessThan(601_000)
  })

  it('should calculate duration for blessing with specific attention index', async () => {
    const userId = 'poet'
    
    // Create timeline: prayer1 (5min) -> prayer2 (10min) -> prayer1 again (15min)
    const prayer1 = await createPrayer({
      userId,
      title: 'First prayer',
      databases,
      timestamp: 0
    })

    const prayer2 = await createPrayer({
      userId,
      title: 'Second prayer',
      databases,
      timestamp: 300_000 // 5 minutes
    })

    const result = await switchAttention({
      userId,
      toPrayerId: prayer1.prayerId,
      databases,
      timestamp: 900_000 // 15 minutes total
    })

    // Calculate durations
    const duration1 = await calculateBlessingDuration({
      blessingId: prayer1.blessingId,
      userId,
      databases
    })
    
    const duration2 = await calculateBlessingDuration({
      blessingId: prayer2.blessingId,
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
    const prayer3 = await createPrayer({
      userId,
      title: 'Third',
      databases,
      timestamp: 3000
    })

    const prayer1 = await createPrayer({
      userId,
      title: 'First',
      databases,
      timestamp: 1000
    })

    const prayer2 = await createPrayer({
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
    
    // Prayer IDs are based on timestamp, so:
    expect(history[0].prayerId).toBe('prayer_1000')
    expect(history[1].prayerId).toBe('prayer_2000')
    expect(history[2].prayerId).toBe('prayer_3000')
  })

  it('should handle blessings with no duration (edge case)', async () => {
    const userId = 'edgecase'
    
    // Create a prayer but don't switch attention
    const prayer = await createPrayer({
      userId,
      title: 'No duration prayer',
      databases,
      timestamp: 1000
    })

    // Manually set blessing to potential with same timestamp
    const blessing = await databases.blessings.get(prayer.blessingId)
    blessing.value.status = 'potential'
    await databases.blessings.put(blessing.value)

    // Add another attention switch at exact same time
    await databases.attentionSwitches.add({
      userId,
      prayerId: 'other',
      timestamp: 1000
    })

    const duration = await calculateBlessingDuration({
      blessingId: prayer.blessingId,
      userId,
      databases
    })

    expect(duration).toBe(0) // No time elapsed
  })
})