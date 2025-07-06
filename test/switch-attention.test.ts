// test/switch-attention.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'
import { setIntention, switchAttention } from '../src/lib/synchronicity-engine'
import type { BlessingDoc } from '../src/lib/types'

describe('Switch Attention Flow', () => {
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

  it('should switch attention from one intention to another', async () => {
    const userId = 'truman'
    
    // Create first intention at time 1000
    const intention1 = await setIntention({
      userId,
      title: 'Clear the mountain',
      databases,
      timestamp: 1000
    })

    // Create second intention at time 2000 (1 second later)
    const intention2 = await setIntention({
      userId,
      title: 'Plant native trees',
      databases,
      timestamp: 2000
    })

    // Switch attention to intention1 at time 5000
    const result = await switchAttention({
      userId,
      toIntentionId: intention1.intentionId,
      databases,
      timestamp: 5000
    })

    expect(result).toBeDefined()
    expect(result.newBlessingId).toMatch(/^blessing_truman_/)
    expect(result.previousBlessingId).toBe(intention2.blessingId)
    expect(result.attentionIndex).toBe(2) // Third attention event for this user

    // Verify previous blessing (intention2) is now 'potential'
    const prevBlessing = await databases.blessings.get(intention2.blessingId)
    expect(prevBlessing.value.status).toBe('potential')

    // Verify new blessing is 'active'
    const newBlessing = await databases.blessings.get(result.newBlessingId)
    expect(newBlessing.value.status).toBe('active')
    expect(newBlessing.value.intentionId).toBe(intention1.intentionId)
    expect(newBlessing.value.attentionIndex).toBe(2)

    // Verify attention switch was logged
    const allSwitches = []
    for await (const entry of databases.attentionSwitches.iterator()) {
      allSwitches.push(entry.value)
    }
    expect(allSwitches).toHaveLength(3) // Two from setIntention, one from switchAttention
    
    // Sort by timestamp to ensure order
    allSwitches.sort((a, b) => a.timestamp - b.timestamp)
    
    expect(allSwitches[0].timestamp).toBe(1000) // First intention
    expect(allSwitches[1].timestamp).toBe(2000) // Second intention
    expect(allSwitches[2].timestamp).toBe(5000) // Switch back
    expect(allSwitches[2].intentionId).toBe(intention1.intentionId)
  })

  it('should create new blessing when returning to same intention', async () => {
    const userId = 'alice'
    
    // Create intention and switch away
    const intention1 = await setIntention({
      userId,
      title: 'Morning meditation',
      databases,
      timestamp: 1000
    })

    const intention2 = await setIntention({
      userId,
      title: 'Evening reflection',
      databases,
      timestamp: 2000,
      blessingContent: 'Completed morning meditation session'
    })

    // Return to intention1
    const result = await switchAttention({
      userId,
      toIntentionId: intention1.intentionId,
      databases,
      timestamp: 3000
    })

    // Should have created a NEW blessing, not reused the old one
    expect(result.newBlessingId).not.toBe(intention1.blessingId)
    
    // Verify intention1 now has 2 blessings
    const intentionDoc = await databases.intentions.get(intention1.intentionId)
    expect(intentionDoc.value.blessings).toHaveLength(2)
    expect(intentionDoc.value.blessings).toContain(intention1.blessingId)
    expect(intentionDoc.value.blessings).toContain(result.newBlessingId)

    // Both blessings should belong to same intention
    const blessing1 = await databases.blessings.get(intention1.blessingId)
    const blessing2 = await databases.blessings.get(result.newBlessingId)
    expect(blessing1.value.intentionId).toBe(intention1.intentionId)
    expect(blessing2.value.intentionId).toBe(intention1.intentionId)
  })

  it('should handle switching when no active blessing exists', async () => {
    const userId = 'newuser'
    
    // Create a intention but immediately mark blessing as potential (simulating time passed)
    const intention = await setIntention({
      userId,
      title: 'First intention',
      databases,
      timestamp: 1000
    })
    
    // Manually set blessing to potential
    const blessing = await databases.blessings.get(intention.blessingId)
    blessing.value.status = 'potential'
    await databases.blessings.put(blessing.value)

    // Now switch attention
    const result = await switchAttention({
      userId,
      toIntentionId: intention.intentionId,
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
    
    // Create intention
    const intention1 = await setIntention({
      userId,
      title: 'Mountain wisdom',
      databases,
      timestamp: 1000
    })

    // Switch with content
    const result = await switchAttention({
      userId,
      toIntentionId: 'intention_2000', // Switch to a different intention
      databases,
      timestamp: 2000,
      blessingContent: content
    })

    // Verify the previous blessing was updated with content
    const prevBlessing = await databases.blessings.get(intention1.blessingId)
    expect(prevBlessing.value.content).toBe(content)
  })
})