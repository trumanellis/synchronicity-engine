// test/switch-attention.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'
import { createPrayer, switchAttention } from '../src/lib/synchronicity-engine'
import type { BlessingDoc } from '../src/lib/types'

describe('Switch Attention Flow', () => {
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

  it('should switch attention from one prayer to another', async () => {
    const userId = 'truman'
    
    // Create first prayer at time 1000
    const prayer1 = await createPrayer({
      userId,
      title: 'Clear the mountain',
      databases,
      timestamp: 1000
    })

    // Create second prayer at time 2000 (1 second later)
    const prayer2 = await createPrayer({
      userId,
      title: 'Plant native trees',
      databases,
      timestamp: 2000
    })

    // Switch attention to prayer1 at time 5000
    const result = await switchAttention({
      userId,
      toPrayerId: prayer1.prayerId,
      databases,
      timestamp: 5000
    })

    expect(result).toBeDefined()
    expect(result.newBlessingId).toMatch(/^blessing_truman_/)
    expect(result.previousBlessingId).toBe(prayer2.blessingId)
    expect(result.attentionIndex).toBe(2) // Third attention event for this user

    // Verify previous blessing (prayer2) is now 'potential'
    const prevBlessing = await databases.blessings.get(prayer2.blessingId)
    expect(prevBlessing.value.status).toBe('potential')

    // Verify new blessing is 'active'
    const newBlessing = await databases.blessings.get(result.newBlessingId)
    expect(newBlessing.value.status).toBe('active')
    expect(newBlessing.value.prayerId).toBe(prayer1.prayerId)
    expect(newBlessing.value.attentionIndex).toBe(2)

    // Verify attention switch was logged
    const allSwitches = []
    for await (const entry of databases.attentionSwitches.iterator()) {
      allSwitches.push(entry.value)
    }
    expect(allSwitches).toHaveLength(3) // Two from createPrayer, one from switchAttention
    
    // Sort by timestamp to ensure order
    allSwitches.sort((a, b) => a.timestamp - b.timestamp)
    
    expect(allSwitches[0].timestamp).toBe(1000) // First prayer
    expect(allSwitches[1].timestamp).toBe(2000) // Second prayer
    expect(allSwitches[2].timestamp).toBe(5000) // Switch back
    expect(allSwitches[2].prayerId).toBe(prayer1.prayerId)
  })

  it('should create new blessing when returning to same prayer', async () => {
    const userId = 'alice'
    
    // Create prayer and switch away
    const prayer1 = await createPrayer({
      userId,
      title: 'Morning meditation',
      databases,
      timestamp: 1000
    })

    const prayer2 = await createPrayer({
      userId,
      title: 'Evening reflection',
      databases,
      timestamp: 2000
    })

    // Return to prayer1
    const result = await switchAttention({
      userId,
      toPrayerId: prayer1.prayerId,
      databases,
      timestamp: 3000
    })

    // Should have created a NEW blessing, not reused the old one
    expect(result.newBlessingId).not.toBe(prayer1.blessingId)
    
    // Verify prayer1 now has 2 blessings
    const prayerDoc = await databases.prayers.get(prayer1.prayerId)
    expect(prayerDoc.value.blessings).toHaveLength(2)
    expect(prayerDoc.value.blessings).toContain(prayer1.blessingId)
    expect(prayerDoc.value.blessings).toContain(result.newBlessingId)

    // Both blessings should belong to same prayer
    const blessing1 = await databases.blessings.get(prayer1.blessingId)
    const blessing2 = await databases.blessings.get(result.newBlessingId)
    expect(blessing1.value.prayerId).toBe(prayer1.prayerId)
    expect(blessing2.value.prayerId).toBe(prayer1.prayerId)
  })

  it('should handle switching when no active blessing exists', async () => {
    const userId = 'newuser'
    
    // Create a prayer but immediately mark blessing as potential (simulating time passed)
    const prayer = await createPrayer({
      userId,
      title: 'First prayer',
      databases,
      timestamp: 1000
    })
    
    // Manually set blessing to potential
    const blessing = await databases.blessings.get(prayer.blessingId)
    blessing.value.status = 'potential'
    await databases.blessings.put(blessing.value)

    // Now switch attention
    const result = await switchAttention({
      userId,
      toPrayerId: prayer.prayerId,
      databases,
      timestamp: 2000
    })

    expect(result.previousBlessingId).toBeNull()
    expect(result.newBlessingId).toBeDefined()
    expect(result.attentionIndex).toBe(1)
  })

  it('should update blessing content when switching', async () => {
    const userId = 'poet'
    const content = 'The mountain speaks in whispers of ancient wisdom'
    
    // Create prayer
    const prayer1 = await createPrayer({
      userId,
      title: 'Mountain wisdom',
      databases,
      timestamp: 1000
    })

    // Switch with content
    const result = await switchAttention({
      userId,
      toPrayerId: 'prayer_2000', // Switch to a different prayer
      databases,
      timestamp: 2000,
      blessingContent: content
    })

    // Verify the previous blessing was updated with content
    const prevBlessing = await databases.blessings.get(prayer1.blessingId)
    expect(prevBlessing.value.content).toBe(content)
  })
})