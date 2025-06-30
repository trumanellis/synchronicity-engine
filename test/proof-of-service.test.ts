// test/proof-of-service.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'
import { 
  createPrayer,
  switchAttention,
  postProofOfService,
  assignBlessing
} from '../src/lib/synchronicity-engine'
import type { ProofDoc, BlessingDoc } from '../src/lib/types'

describe('Proof of Service', () => {
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

  it('should post proof of service for a prayer', async () => {
    const creatorId = 'truman'
    const serviceProviderId = 'rafael'
    
    // Create prayer
    const prayer = await createPrayer({
      userId: creatorId,
      title: 'Clear invasive eucalyptus',
      databases,
      timestamp: 1000
    })

    // Post proof of service
    const result = await postProofOfService({
      prayerId: prayer.prayerId,
      by: [serviceProviderId],
      content: 'Cleared 50 eucalyptus trees from the north slope',
      media: ['ipfs://QmProofImage1', 'ipfs://QmProofImage2'],
      databases,
      timestamp: 2000
    })

    expect(result.proofId).toMatch(/^proof_/)
    expect(result.hash).toBeDefined()

    // Verify proof was added to event log
    const allProofs = []
    for await (const entry of databases.proofsOfService.iterator()) {
      allProofs.push(entry.value)
    }
    
    expect(allProofs).toHaveLength(1)
    const proof: ProofDoc = allProofs[0]
    expect(proof._id).toBe(result.proofId)
    expect(proof.prayerId).toBe(prayer.prayerId)
    expect(proof.by).toEqual([serviceProviderId])
    expect(proof.content).toBe('Cleared 50 eucalyptus trees from the north slope')
    expect(proof.media).toHaveLength(2)
    expect(proof.timestamp).toBe(2000)

    // Verify prayer was updated with proof reference
    const updatedPrayer = await databases.prayers.get(prayer.prayerId)
    expect(updatedPrayer.value.proofsOfService).toContain(result.proofId)
  })

  it('should handle collaborative proof by multiple people', async () => {
    const prayer = await createPrayer({
      userId: 'organizer',
      title: 'Community garden setup',
      databases,
      timestamp: 1000
    })

    const result = await postProofOfService({
      prayerId: prayer.prayerId,
      by: ['alice', 'bob', 'charlie'],
      content: 'Built raised beds and planted vegetables',
      media: [],
      databases,
      timestamp: 2000
    })

    const allProofs = []
    for await (const entry of databases.proofsOfService.iterator()) {
      allProofs.push(entry.value)
    }

    expect(allProofs[0].by).toEqual(['alice', 'bob', 'charlie'])
  })

  it('should assign blessing to service provider after proof', async () => {
    const creatorId = 'truman'
    const providerId = 'rafael'
    
    // Create prayer and accumulate some time
    const prayer = await createPrayer({
      userId: creatorId,
      title: 'Clear the mountain',
      databases,
      timestamp: 0
    })

    // Switch attention after 1 hour to complete the blessing
    await switchAttention({
      userId: creatorId,
      toPrayerId: 'other_prayer',
      databases,
      timestamp: 3_600_000 // 1 hour
    })

    // Post proof of service
    const proof = await postProofOfService({
      prayerId: prayer.prayerId,
      by: [providerId],
      content: 'Mountain cleared',
      media: [],
      databases,
      timestamp: 3_700_000
    })

    // Assign the blessing to service provider
    const assignment = await assignBlessing({
      blessingId: prayer.blessingId,
      toUserId: providerId,
      proofId: proof.proofId,
      databases
    })

    expect(assignment.success).toBe(true)
    expect(assignment.previousSteward).toBe(creatorId)
    expect(assignment.newSteward).toBe(providerId)

    // Verify blessing was updated
    const blessing = await databases.blessings.get(prayer.blessingId)
    expect(blessing.value.status).toBe('given')
    expect(blessing.value.stewardId).toBe(providerId)
    expect(blessing.value.proofId).toBe(proof.proofId)
  })

  it('should only allow assignment of potential blessings', async () => {
    const creatorId = 'alice'
    const providerId = 'bob'
    
    // Create prayer (blessing is still active)
    const prayer = await createPrayer({
      userId: creatorId,
      title: 'Active prayer',
      databases,
      timestamp: 1000
    })

    // Try to assign active blessing (should fail)
    const assignment = await assignBlessing({
      blessingId: prayer.blessingId,
      toUserId: providerId,
      proofId: 'proof_123',
      databases
    })

    expect(assignment.success).toBe(false)
    expect(assignment.error).toBe('Can only assign potential blessings')
    
    // Blessing should remain unchanged
    const blessing = await databases.blessings.get(prayer.blessingId)
    expect(blessing.value.status).toBe('active')
    expect(blessing.value.stewardId).toBe(creatorId)
  })

  it('should track multiple proofs for same prayer', async () => {
    const prayer = await createPrayer({
      userId: 'organizer',
      title: 'Ongoing project',
      databases,
      timestamp: 1000
    })

    // Multiple people contribute at different times
    const proof1 = await postProofOfService({
      prayerId: prayer.prayerId,
      by: ['worker1'],
      content: 'Phase 1 complete',
      media: [],
      databases,
      timestamp: 2000
    })

    const proof2 = await postProofOfService({
      prayerId: prayer.prayerId,
      by: ['worker2', 'worker3'],
      content: 'Phase 2 complete',
      media: [],
      databases,
      timestamp: 3000
    })

    // Verify prayer tracks all proofs
    const updatedPrayer = await databases.prayers.get(prayer.prayerId)
    expect(updatedPrayer.value.proofsOfService).toHaveLength(2)
    expect(updatedPrayer.value.proofsOfService).toContain(proof1.proofId)
    expect(updatedPrayer.value.proofsOfService).toContain(proof2.proofId)
  })
})