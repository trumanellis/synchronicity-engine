// test/gratitude-potential.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'
import { 
  createPrayer,
  switchAttention,
  assignBlessing,
  postProofOfService,
  calculateGratitudePotential,
  attachTokenToPrayer
} from '../src/lib/synchronicity-engine'

describe('Gratitude Potential', () => {
  let orbitdb: any
  let databases: any

  beforeEach(async () => {
    orbitdb = await startOrbitDB({ directory: './test-orbitdb' })
    
    databases = {
      prayers: await orbitdb.open('test-prayers', { type: 'documents' }),
      blessings: await orbitdb.open('test-blessings', { type: 'documents' }),
      attentionSwitches: await orbitdb.open('test-attention', { type: 'events' }),
      proofsOfService: await orbitdb.open('test-proofs', { type: 'events' })
    }
  })

  afterEach(async () => {
    if (orbitdb) {
      await stopOrbitDB(orbitdb)
    }
    await rimraf('./test-orbitdb')
    await rimraf('./test-ipfs')
  })

  it('should calculate potential from live blessings only', async () => {
    const userId = 'truman'
    
    // Create prayer with 30 minutes attention
    const prayer = await createPrayer({
      userId,
      title: 'Clear the mountain',
      databases,
      timestamp: 0
    })

    // Switch attention after 30 minutes
    await switchAttention({
      userId,
      toPrayerId: 'other_prayer',
      databases,
      timestamp: 1_800_000 // 30 minutes
    })

    // Calculate potential (should be 30 minutes)
    const potential = await calculateGratitudePotential({
      prayerId: prayer.prayerId,
      databases
    })

    expect(potential).toBe(1_800_000)
  })

  it('should include multiple blessings from different users', async () => {
    // User 1 blesses for 20 minutes
    const prayer = await createPrayer({
      userId: 'alice',
      title: 'Community garden',
      databases,
      timestamp: 0
    })

    await switchAttention({
      userId: 'alice',
      toPrayerId: 'other',
      databases,
      timestamp: 1_200_000 // 20 minutes
    })

    // User 2 blesses for 15 minutes
    await switchAttention({
      userId: 'bob',
      toPrayerId: prayer.prayerId,
      databases,
      timestamp: 2_000_000
    })

    await switchAttention({
      userId: 'bob',
      toPrayerId: 'other',
      databases,
      timestamp: 2_900_000 // 15 minutes later
    })

    // Total should be 35 minutes
    const potential = await calculateGratitudePotential({
      prayerId: prayer.prayerId,
      databases
    })

    expect(potential).toBe(2_100_000) // 35 minutes
  })

  it('should include attached token boosts', async () => {
    // Create main prayer
    const mainPrayer = await createPrayer({
      userId: 'organizer',
      title: 'Main project',
      databases,
      timestamp: 0
    })

    // Create a blessing token from previous work
    const previousWork = await createPrayer({
      userId: 'helper',
      title: 'Previous help',
      databases,
      timestamp: 1000
    })

    await switchAttention({
      userId: 'helper',
      toPrayerId: 'other',
      databases,
      timestamp: 3_601_000 // 1 hour later
    })

    // Attach the blessing as a boost token
    await attachTokenToPrayer({
      tokenId: previousWork.blessingId,
      prayerId: mainPrayer.prayerId,
      databases
    })

    // Add some direct attention too
    await switchAttention({
      userId: 'organizer',
      toPrayerId: 'other',
      databases,
      timestamp: 600_000 // 10 minutes
    })

    // Total should be 1 hour 10 minutes
    const potential = await calculateGratitudePotential({
      prayerId: mainPrayer.prayerId,
      databases
    })

    expect(potential).toBe(4_200_000) // 70 minutes total
  })

  it('should exclude given blessings from potential', async () => {
    const creatorId = 'creator'
    const helperId = 'helper'
    
    // Create prayer with blessing
    const prayer = await createPrayer({
      userId: creatorId,
      title: 'Need help',
      databases,
      timestamp: 0
    })

    // Add 30 minutes attention
    await switchAttention({
      userId: creatorId,
      toPrayerId: 'other',
      databases,
      timestamp: 1_800_000
    })

    // Post proof and assign blessing
    const proof = await postProofOfService({
      prayerId: prayer.prayerId,
      by: [helperId],
      content: 'Helped!',
      media: [],
      databases
    })

    await assignBlessing({
      blessingId: prayer.blessingId,
      toUserId: helperId,
      proofId: proof.proofId,
      databases
    })

    // Potential should now be 0 (blessing was given away)
    const potential = await calculateGratitudePotential({
      prayerId: prayer.prayerId,
      databases
    })

    expect(potential).toBe(0)
  })

  it('should handle nested token hierarchies', async () => {
    // Create parent token (1 hour)
    const parentWork = await createPrayer({
      userId: 'alice',
      title: 'Parent work',
      databases,
      timestamp: 0
    })

    await switchAttention({
      userId: 'alice',
      toPrayerId: 'other',
      databases,
      timestamp: 3_600_000 // 1 hour
    })

    // Create child token (30 minutes)
    const childWork = await createPrayer({
      userId: 'bob',
      title: 'Child work',
      databases,
      timestamp: 4_000_000  // Start after parent is done
    })

    await switchAttention({
      userId: 'bob', 
      toPrayerId: 'other',
      databases,
      timestamp: 5_800_000 // 30 minutes later
    })

    // Make child a child of parent
    const parentBlessing = await databases.blessings.get(parentWork.blessingId)
    parentBlessing.value.children = [childWork.blessingId]
    await databases.blessings.put(parentBlessing.value)

    const childBlessing = await databases.blessings.get(childWork.blessingId)
    childBlessing.value.parentId = parentWork.blessingId
    await databases.blessings.put(childBlessing.value)

    // Create main prayer and attach parent token
    const mainPrayer = await createPrayer({
      userId: 'organizer',
      title: 'Main prayer',
      databases,
      timestamp: 6_000_000
    })

    await attachTokenToPrayer({
      tokenId: parentWork.blessingId,
      prayerId: mainPrayer.prayerId,
      databases
    })

    // Should include:
    // - Parent token: 1 hour (3,600,000)
    // - Child token: 30 minutes (1,800,000)
    // - Main prayer's own blessing: ~17 minutes (1,000,000)
    // Total: 6,400,000 ms
    const potential = await calculateGratitudePotential({
      prayerId: mainPrayer.prayerId,
      databases,
      includeChildren: true,
      currentTime: 7_000_000  // Fixed time for calculation
    })

    expect(potential).toBe(6_400_000) // 1 hour 46 minutes 40 seconds
  })

  it('should calculate potential at specific point in time', async () => {
    const prayer = await createPrayer({
      userId: 'timekeeper',
      title: 'Time sensitive',
      databases,
      timestamp: 0
    })

    // Calculate at different times
    const at10min = await calculateGratitudePotential({
      prayerId: prayer.prayerId,
      databases,
      currentTime: 600_000 // 10 minutes
    })

    const at30min = await calculateGratitudePotential({
      prayerId: prayer.prayerId,
      databases,
      currentTime: 1_800_000 // 30 minutes
    })

    expect(at10min).toBe(600_000)
    expect(at30min).toBe(1_800_000)
  })
})