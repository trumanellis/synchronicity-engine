// test/set-intention.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'
import { setIntention } from '../src/lib/synchronicity-engine'
import type { IntentionDoc, BlessingDoc, AttentionSwitch } from '../src/lib/types'

describe('Set Intention Flow', () => {
  let orbitdb: any
  let databases: any

  beforeEach(async () => {
    // Start fresh OrbitDB instance
    orbitdb = await startOrbitDB({ directory: './test-orbitdb' })
    
    // Create all required databases
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

  it('should set an intention with an active blessing and attention switch', async () => {
    const userId = 'truman'
    const intentionTitle = 'Clear invasive eucalyptus from the mountain peak'
    const timestamp = Date.now()
    
    // Execute the set intention flow
    const result = await setIntention({
      userId,
      title: intentionTitle,
      databases,
      timestamp
    })

    expect(result).toBeDefined()
    expect(result.intentionId).toMatch(/^intention_/)
    expect(result.blessingId).toMatch(/^blessing_/)
    expect(result.attentionIndex).toBe(0) // First attention switch for this user

    // Verify Intention was created correctly
    const intentionEntry = await databases.intentions.get(result.intentionId)
    expect(intentionEntry).toBeDefined()
    
    const intention: IntentionDoc = intentionEntry.value
    expect(intention.title).toBe(intentionTitle)
    expect(intention.status).toBe('open')
    expect(intention.createdBy).toBe(userId)
    expect(intention.blessings).toContain(result.blessingId)
    expect(intention.proofsOfService).toHaveLength(0)
    expect(intention.attachedTokens).toHaveLength(0)

    // Verify Blessing was created correctly
    const blessingEntry = await databases.blessings.get(result.blessingId)
    expect(blessingEntry).toBeDefined()
    
    const blessing: BlessingDoc = blessingEntry.value
    expect(blessing.userId).toBe(userId)
    expect(blessing.intentionId).toBe(result.intentionId)
    expect(blessing.attentionIndex).toBe(0)
    expect(blessing.status).toBe('active') // Currently accumulating time
    expect(blessing.stewardId).toBe(userId)
    expect(blessing.timestamp).toBe(timestamp)
    expect(blessing.content).toBe('') // Empty on creation

    // Verify AttentionSwitch was logged
    const allSwitches = []
    for await (const entry of databases.attentionSwitches.iterator()) {
      allSwitches.push(entry.value)
    }
    
    expect(allSwitches).toHaveLength(1)
    const attentionSwitch: AttentionSwitch = allSwitches[0]
    expect(attentionSwitch.userId).toBe(userId)
    expect(attentionSwitch.intentionId).toBe(result.intentionId)
    expect(attentionSwitch.timestamp).toBe(timestamp)
  })

  it('should handle multiple intentions from same user with correct attention indices', async () => {
    const userId = 'truman'
    
    // Create first intention
    const result1 = await setIntention({
      userId,
      title: 'First intention',
      databases,
      timestamp: 1000
    })
    
    expect(result1.attentionIndex).toBe(0)

    // Create second intention (simulates attention switch with blessing content)
    const result2 = await setIntention({
      userId,
      title: 'Second intention',
      databases,
      timestamp: 2000,
      blessingContent: 'Completed initial planning for first intention'
    })
    
    expect(result2.attentionIndex).toBe(1)

    // Verify first blessing is now 'potential' (not active) and has blessing content
    const blessing1Entry = await databases.blessings.get(result1.blessingId)
    expect(blessing1Entry.value.status).toBe('potential')
    expect(blessing1Entry.value.content).toBe('Completed initial planning for first intention')

    // Verify second blessing is 'active' with empty content
    const blessing2Entry = await databases.blessings.get(result2.blessingId)
    expect(blessing2Entry.value.status).toBe('active')
    expect(blessing2Entry.value.content).toBe('')

    // Verify we have 2 attention switches
    const allSwitches = []
    for await (const entry of databases.attentionSwitches.iterator()) {
      allSwitches.push(entry.value)
    }
    expect(allSwitches).toHaveLength(2)
  })

  it('should generate unique IDs with user prefix', async () => {
    const result = await setIntention({
      userId: 'alice',
      title: 'Test intention',
      databases,
      timestamp: Date.now()
    })

    expect(result.intentionId).toMatch(/^intention_\d+$/)
    expect(result.blessingId).toMatch(/^blessing_alice_\d+$/)
  })
})