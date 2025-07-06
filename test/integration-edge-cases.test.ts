// test/integration-edge-cases.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'
import { 
  setIntention,
  switchAttention,
  calculateGratitudePotential,
  postProofOfService,
  assignBlessing,
  bidOnOffering,
  createOffering,
  acceptOfferingBids,
  attachTokenToIntention,
  flattenTokenTree
} from '../src/lib/synchronicity-engine'

describe('Integration Tests - Edge Cases & Error Scenarios', () => {
  let orbitdb: any
  let databases: any

  beforeEach(async () => {
    orbitdb = await startOrbitDB({ directory: './test-orbitdb' })
    
    databases = {
      intentions: await orbitdb.open('test-intentions', { type: 'documents' }),
      blessings: await orbitdb.open('test-blessings', { type: 'documents' }),
      attentionSwitches: await orbitdb.open('test-attention', { type: 'events' }),
      proofsOfService: await orbitdb.open('test-proofs', { type: 'events' }),
      offerings: await orbitdb.open('test-offerings', { type: 'documents' })
    }
  })

  afterEach(async () => {
    if (orbitdb) {
      await stopOrbitDB(orbitdb)
    }
    await rimraf('./test-orbitdb')
    await rimraf('./test-ipfs')
  })

  describe('Marketplace Edge Cases', () => {
    it('should handle multiple bidders and rank them correctly', async () => {
      // Create offering with limited slots
      const offering = await createOffering({
        hostId: 'host',
        title: 'Limited workshop',
        description: 'Only 2 slots available',
        slotsAvailable: 2,
        databases,
        timestamp: 0
      })

      // Create 3 bidders with different token values
      const bidders = [
        { userId: 'alice', workDuration: 7_200_000 }, // 2 hours
        { userId: 'bob', workDuration: 3_600_000 },   // 1 hour  
        { userId: 'charlie', workDuration: 5_400_000 } // 1.5 hours
      ]

      const bids = []
      for (const bidder of bidders) {
        // Create work token
        const work = await setIntention({
          userId: bidder.userId,
          title: `${bidder.userId}'s work`,
          databases,
          timestamp: 1000
        })

        await switchAttention({
          userId: bidder.userId,
          toIntentionId: 'other',
          databases,
          timestamp: 1000 + bidder.workDuration,
          blessingContent: `Completed ${bidder.workDuration / 3600000} hours of focused work`
        })

        // Place bid
        const bid = await bidOnOffering({
          offeringId: offering.offeringId,
          userId: bidder.userId,
          topTokenId: work.blessingId,
          databases
        })

        expect(bid.success).toBe(true)
        bids.push({ ...bidder, blessingId: work.blessingId })
      }

      // Accept bids - should take top 2 (Alice: 2h, Charlie: 1.5h)
      const acceptance = await acceptOfferingBids({
        offeringId: offering.offeringId,
        hostId: 'host',
        databases
      })

      expect(acceptance.accepted).toEqual(['alice', 'charlie'])
      expect(acceptance.rejected).toEqual(['bob'])

      // Verify tokens were transferred to winners only
      const aliceBlessing = await databases.blessings.get(bids[0].blessingId)
      const charlieBlessing = await databases.blessings.get(bids[2].blessingId)
      const bobBlessing = await databases.blessings.get(bids[1].blessingId)

      expect(aliceBlessing.value.stewardId).toBe('host')
      expect(charlieBlessing.value.stewardId).toBe('host')
      expect(bobBlessing.value.stewardId).toBe('bob') // Still owns his token
    })

    it('should prevent double bidding from same user', async () => {
      const offering = await createOffering({
        hostId: 'host',
        title: 'Workshop',
        description: 'Test offering',
        slotsAvailable: 1,
        databases,
        timestamp: 0
      })

      const work = await setIntention({
        userId: 'alice',
        title: 'First work',
        databases,
        timestamp: 1000
      })

      // First bid should succeed
      const firstBid = await bidOnOffering({
        offeringId: offering.offeringId,
        userId: 'alice',
        topTokenId: work.blessingId,
        databases
      })

      expect(firstBid.success).toBe(true)

      // Second bid from same user should fail
      const secondBid = await bidOnOffering({
        offeringId: offering.offeringId,
        userId: 'alice',
        topTokenId: work.blessingId,
        databases
      })

      expect(secondBid.success).toBe(false)
      expect(secondBid.error).toBe('User has already bid on this offering')
    })
  })

  describe('Blessing Assignment Edge Cases', () => {
    it('should prevent assignment of non-potential blessings', async () => {
      const intention = await setIntention({
        userId: 'alice',
        title: 'Test work',
        databases,
        timestamp: 0
      })

      // Blessing is still active, not potential
      const assignment = await assignBlessing({
        blessingId: intention.blessingId,
        toUserId: 'bob',
        proofId: 'some_proof',
        databases
      })

      expect(assignment.success).toBe(false)
      expect(assignment.error).toBe('Can only assign potential blessings')
    })

    it('should handle assignment of already given blessings', async () => {
      const intention = await setIntention({
        userId: 'alice',
        title: 'Test work',
        databases,
        timestamp: 0
      })

      // Make blessing potential
      await switchAttention({
        userId: 'alice',
        toIntentionId: 'other',
        databases,
        timestamp: 3600000,
        blessingContent: 'Completed initial test work session'
      })

      // First assignment should work
      const firstAssignment = await assignBlessing({
        blessingId: intention.blessingId,
        toUserId: 'bob',
        proofId: 'proof1',
        databases
      })

      expect(firstAssignment.success).toBe(true)

      // Second assignment should fail
      const secondAssignment = await assignBlessing({
        blessingId: intention.blessingId,
        toUserId: 'charlie',
        proofId: 'proof2',
        databases
      })

      expect(secondAssignment.success).toBe(false)
      expect(secondAssignment.error).toBe('Can only assign potential blessings')
    })
  })

  describe('Token Tree Edge Cases', () => {
    it('should handle deeply nested token hierarchies', async () => {
      const users = ['alice', 'bob', 'charlie', 'diana', 'eve']
      const intentions = []

      // Create a 5-level hierarchy
      for (let i = 0; i < users.length; i++) {
        const intention = await setIntention({
          userId: users[i],
          title: `Level ${i + 1} work`,
          databases,
          timestamp: i * 1000
        })

        await switchAttention({
          userId: users[i],
          toIntentionId: 'other',
          databases,
          timestamp: i * 1000 + 3600000, // 1 hour each
          blessingContent: `Completed level ${i + 1} work session`
        })

        intentions.push(intention)
      }

      // Build hierarchy: alice -> bob -> charlie -> diana -> eve
      for (let i = 0; i < intentions.length - 1; i++) {
        const parentBlessing = await databases.blessings.get(intentions[i].blessingId)
        parentBlessing.value.children = [intentions[i + 1].blessingId]
        await databases.blessings.put(parentBlessing.value)

        const childBlessing = await databases.blessings.get(intentions[i + 1].blessingId)
        childBlessing.value.parentId = intentions[i].blessingId
        await databases.blessings.put(childBlessing.value)
      }

      // Flatten the entire tree
      const flattened = await flattenTokenTree(intentions[0].blessingId, databases.blessings)
      
      expect(flattened).toHaveLength(5)
      expect(flattened[0]).toBe(intentions[0].blessingId) // alice (root)
      expect(flattened[4]).toBe(intentions[4].blessingId) // eve (leaf)
    })

    it('should handle complex circular references in token trees', async () => {
      // Create 3 tokens that form a circle
      const tokenA = await setIntention({
        userId: 'alice',
        title: 'Token A',
        databases,
        timestamp: 0
      })

      const tokenB = await setIntention({
        userId: 'bob', 
        title: 'Token B',
        databases,
        timestamp: 1000
      })

      const tokenC = await setIntention({
        userId: 'charlie',
        title: 'Token C',
        databases,
        timestamp: 2000
      })

      // Create circular reference: A -> B -> C -> A
      const blessingA = await databases.blessings.get(tokenA.blessingId)
      blessingA.value.children = [tokenB.blessingId]
      await databases.blessings.put(blessingA.value)

      const blessingB = await databases.blessings.get(tokenB.blessingId)
      blessingB.value.children = [tokenC.blessingId]
      await databases.blessings.put(blessingB.value)

      const blessingC = await databases.blessings.get(tokenC.blessingId)
      blessingC.value.children = [tokenA.blessingId] // Back to A!
      await databases.blessings.put(blessingC.value)

      // Should still flatten without infinite recursion
      const flattened = await flattenTokenTree(tokenA.blessingId, databases.blessings)
      
      expect(flattened).toHaveLength(3)
      expect(flattened).toContain(tokenA.blessingId)
      expect(flattened).toContain(tokenB.blessingId) 
      expect(flattened).toContain(tokenC.blessingId)
    })
  })

  describe('Zero and Empty State Handling', () => {
    it('should handle intentions with zero gratitude potential', async () => {
      const intention = await setIntention({
        userId: 'alice',
        title: 'Instant intention',
        databases,
        timestamp: 1000
      })

      // Immediately switch away with no time elapsed
      await switchAttention({
        userId: 'alice',
        toIntentionId: 'other',
        databases,
        timestamp: 1000, // Same timestamp = 0 duration
        blessingContent: 'Quick intention switch with no duration'
      })

      const potential = await calculateGratitudePotential({
        intentionId: intention.intentionId,
        databases,
        currentTime: 1000
      })

      expect(potential).toBe(0)
    })

    it('should handle intentions with no blessings (edge case)', async () => {
      // Create intention but manually remove blessings
      const intention = await setIntention({
        userId: 'alice',
        title: 'Test intention',
        databases,
        timestamp: 0
      })

      const intentionDoc = await databases.intentions.get(intention.intentionId)
      intentionDoc.value.blessings = [] // Remove all blessings
      await databases.intentions.put(intentionDoc.value)

      const potential = await calculateGratitudePotential({
        intentionId: intention.intentionId,
        databases
      })

      expect(potential).toBe(0)
    })

    it('should handle empty offering acceptance', async () => {
      const offering = await createOffering({
        hostId: 'host',
        title: 'No bidders offering',
        description: 'Will have no bids',
        slotsAvailable: 3,
        databases,
        timestamp: 0
      })

      // Accept with no bids
      const acceptance = await acceptOfferingBids({
        offeringId: offering.offeringId,
        hostId: 'host',
        databases
      })

      expect(acceptance.accepted).toEqual([])
      expect(acceptance.rejected).toEqual([])

      // Verify offering status
      const finalOffering = await databases.offerings.get(offering.offeringId)
      expect(finalOffering.value.status).toBe('fulfilled')
      expect(finalOffering.value.selectedStewards).toEqual([])
    })
  })
})