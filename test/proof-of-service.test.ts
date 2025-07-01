// test/proof-of-service.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'
import { 
  setIntention,
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
      intentions: await orbitdb.open('test-intentions', { type: 'documents' }),
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

  it('should post proof of service for an intention', async () => {
    const creatorId = 'truman'
    const serviceProviderId = 'rafael'
    
    // Create intention
    const intention = await setIntention({
      userId: creatorId,
      title: 'Clear invasive eucalyptus',
      databases,
      timestamp: 1000
    })

    // Post proof of service
    const result = await postProofOfService({
      intentionId: intention.intentionId,
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
    expect(proof.intentionId).toBe(intention.intentionId)
    expect(proof.by).toEqual([serviceProviderId])
    expect(proof.content).toBe('Cleared 50 eucalyptus trees from the north slope')
    expect(proof.media).toHaveLength(2)
    expect(proof.timestamp).toBe(2000)

    // Verify intention was updated with proof reference
    const updatedIntention = await databases.intentions.get(intention.intentionId)
    expect(updatedIntention.value.proofsOfService).toContain(result.proofId)
  })

  it('should handle collaborative proof by multiple people', async () => {
    const intention = await setIntention({
      userId: 'organizer',
      title: 'Community garden setup',
      databases,
      timestamp: 1000
    })

    const result = await postProofOfService({
      intentionId: intention.intentionId,
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
    
    // Create intention and accumulate some time
    const intention = await setIntention({
      userId: creatorId,
      title: 'Clear the mountain',
      databases,
      timestamp: 0
    })

    // Switch attention after 1 hour to complete the blessing
    await switchAttention({
      userId: creatorId,
      toIntentionId: 'other_intention',
      databases,
      timestamp: 3_600_000 // 1 hour
    })

    // Post proof of service
    const proof = await postProofOfService({
      intentionId: intention.intentionId,
      by: [providerId],
      content: 'Mountain cleared',
      media: [],
      databases,
      timestamp: 3_700_000
    })

    // Assign the blessing to service provider
    const assignment = await assignBlessing({
      blessingId: intention.blessingId,
      toUserId: providerId,
      proofId: proof.proofId,
      databases
    })

    expect(assignment.success).toBe(true)
    expect(assignment.previousSteward).toBe(creatorId)
    expect(assignment.newSteward).toBe(providerId)

    // Verify blessing was updated
    const blessing = await databases.blessings.get(intention.blessingId)
    expect(blessing.value.status).toBe('given')
    expect(blessing.value.stewardId).toBe(providerId)
    expect(blessing.value.proofId).toBe(proof.proofId)
  })

  it('should only allow assignment of potential blessings', async () => {
    const creatorId = 'alice'
    const providerId = 'bob'
    
    // Create intention (blessing is still active)
    const intention = await setIntention({
      userId: creatorId,
      title: 'Active intention',
      databases,
      timestamp: 1000
    })

    // Try to assign active blessing (should fail)
    const assignment = await assignBlessing({
      blessingId: intention.blessingId,
      toUserId: providerId,
      proofId: 'proof_123',
      databases
    })

    expect(assignment.success).toBe(false)
    expect(assignment.error).toBe('Can only assign potential blessings')
    
    // Blessing should remain unchanged
    const blessing = await databases.blessings.get(intention.blessingId)
    expect(blessing.value.status).toBe('active')
    expect(blessing.value.stewardId).toBe(creatorId)
  })

  it('should track multiple proofs for same intention', async () => {
    const intention = await setIntention({
      userId: 'organizer',
      title: 'Ongoing project',
      databases,
      timestamp: 1000
    })

    // Multiple people contribute at different times
    const proof1 = await postProofOfService({
      intentionId: intention.intentionId,
      by: ['worker1'],
      content: 'Phase 1 complete',
      media: [],
      databases,
      timestamp: 2000
    })

    const proof2 = await postProofOfService({
      intentionId: intention.intentionId,
      by: ['worker2', 'worker3'],
      content: 'Phase 2 complete',
      media: [],
      databases,
      timestamp: 3000
    })

    // Verify intention tracks all proofs
    const updatedIntention = await databases.intentions.get(intention.intentionId)
    expect(updatedIntention.value.proofsOfService).toHaveLength(2)
    expect(updatedIntention.value.proofsOfService).toContain(proof1.proofId)
    expect(updatedIntention.value.proofsOfService).toContain(proof2.proofId)
  })
})