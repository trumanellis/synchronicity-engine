// test/set-intention-blessing.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'
import { setIntention } from '../src/lib/synchronicity-engine'
import type { IntentionDoc, BlessingDoc } from '../src/lib/types'

describe('Set Intention with Blessing Content', () => {
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

  it('should set blessing content when creating a new intention', async () => {
    const userId = 'alice'
    
    // Create first intention
    const firstIntention = await setIntention({
      userId,
      title: 'Morning meditation',
      databases,
      timestamp: 1000
    })

    // Create second intention with blessing content for the first
    const secondIntention = await setIntention({
      userId,
      title: 'Review code',
      databases,
      timestamp: 3_601_000, // 1 hour later
      blessingContent: 'Completed 30 minutes of mindfulness practice'
    })

    // Verify first blessing has the content and is potential
    const firstBlessing = await databases.blessings.get(firstIntention.blessingId)
    expect(firstBlessing.value.status).toBe('potential')
    expect(firstBlessing.value.content).toBe('Completed 30 minutes of mindfulness practice')

    // Verify second blessing is active with empty content
    const secondBlessing = await databases.blessings.get(secondIntention.blessingId)
    expect(secondBlessing.value.status).toBe('active')
    expect(secondBlessing.value.content).toBe('') // New blessings start empty
  })

  it('should work without blessing content (backward compatibility)', async () => {
    const userId = 'bob'
    
    // Create first intention
    const firstIntention = await setIntention({
      userId,
      title: 'Task 1',
      databases,
      timestamp: 1000
    })

    // Create second intention without blessing content
    const secondIntention = await setIntention({
      userId,
      title: 'Task 2',
      databases,
      timestamp: 2000
    })

    // Verify first blessing is potential but has no content
    const firstBlessing = await databases.blessings.get(firstIntention.blessingId)
    expect(firstBlessing.value.status).toBe('potential')
    expect(firstBlessing.value.content).toBe('') // Should remain empty

    // Verify second blessing is active
    const secondBlessing = await databases.blessings.get(secondIntention.blessingId)
    expect(secondBlessing.value.status).toBe('active')
  })

  it('should handle first intention creation (no previous blessing)', async () => {
    const userId = 'charlie'
    
    // Create very first intention - no previous blessing to update
    const intention = await setIntention({
      userId,
      title: 'First ever task',
      databases,
      timestamp: 1000,
      blessingContent: 'This content should be ignored since no previous blessing'
    })

    // Verify the blessing is active (first blessing for user)
    const blessing = await databases.blessings.get(intention.blessingId)
    expect(blessing.value.status).toBe('active')
    expect(blessing.value.content).toBe('') // New blessing starts empty
    expect(blessing.value.attentionIndex).toBe(0) // First attention event
  })

  it('should handle multiple intention switches with blessing content', async () => {
    const userId = 'diana'
    
    // Create chain of intentions with blessing content
    const intention1 = await setIntention({
      userId,
      title: 'Research',
      databases,
      timestamp: 1000
    })

    const intention2 = await setIntention({
      userId,
      title: 'Writing',
      databases,
      timestamp: 2000,
      blessingContent: 'Found 5 relevant research papers'
    })

    const intention3 = await setIntention({
      userId,
      title: 'Review',
      databases,
      timestamp: 3000,
      blessingContent: 'Wrote first draft of introduction'
    })

    // Check all blessings have correct content and status
    const blessing1 = await databases.blessings.get(intention1.blessingId)
    expect(blessing1.value.status).toBe('potential')
    expect(blessing1.value.content).toBe('Found 5 relevant research papers')

    const blessing2 = await databases.blessings.get(intention2.blessingId)
    expect(blessing2.value.status).toBe('potential')
    expect(blessing2.value.content).toBe('Wrote first draft of introduction')

    const blessing3 = await databases.blessings.get(intention3.blessingId)
    expect(blessing3.value.status).toBe('active')
    expect(blessing3.value.content).toBe('') // Current active blessing
  })
})