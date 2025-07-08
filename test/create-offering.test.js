// test/create-offering.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff';
import { rimraf } from 'rimraf';
import { setIntention, switchAttention, createOffering, bidOnOffering, acceptOfferingBids, calculateTokenTreeDuration } from '../src/lib/synchronicity-engine';
describe('Create Offering', () => {
    let orbitdb;
    let databases;
    beforeEach(async () => {
        orbitdb = await startOrbitDB({ directory: './test-orbitdb' });
        databases = {
            intentions: await orbitdb.open('test-intentions', { type: 'documents' }),
            blessings: await orbitdb.open('test-blessings', { type: 'documents' }),
            attentionSwitches: await orbitdb.open('test-attention', { type: 'events' }),
            offerings: await orbitdb.open('test-offerings', { type: 'documents' })
        };
    });
    afterEach(async () => {
        if (orbitdb) {
            await stopOrbitDB(orbitdb);
        }
        await rimraf('./test-orbitdb');
        await rimraf('./test-ipfs');
    });
    it('should create an offering with limited slots', async () => {
        const hostId = 'annabelle';
        const result = await createOffering({
            hostId,
            title: 'Sunrise Yoga in the Cedar Temple',
            description: 'Grounding Hatha practice at dawn',
            time: '2025-07-06T06:00:00Z',
            place: 'Agua Lila Upper Temple Deck',
            slotsAvailable: 3,
            databases,
            timestamp: 1000
        });
        expect(result.offeringId).toMatch(/^offering_/);
        // Verify offering was created
        const offering = await databases.offerings.get(result.offeringId);
        expect(offering).toBeDefined();
        const offeringDoc = offering.value;
        expect(offeringDoc.title).toBe('Sunrise Yoga in the Cedar Temple');
        expect(offeringDoc.slotsAvailable).toBe(3);
        expect(offeringDoc.tokenOffers).toEqual([]);
        expect(offeringDoc.selectedStewards).toEqual([]);
        expect(offeringDoc.status).toBe('open');
    });
    it('should allow bidding with token baskets', async () => {
        // Create tokens to bid with
        const bidder1 = await setIntention({
            userId: 'rafael',
            title: 'Work 1',
            databases,
            timestamp: 0
        });
        await switchAttention({
            userId: 'rafael',
            toIntentionId: 'other',
            databases,
            timestamp: 3_600_000, // 1 hour
            blessingContent: 'Completed 1 hour of work to bid with'
        });
        // Create offering
        const offering = await createOffering({
            hostId: 'host',
            title: 'Yoga Session',
            description: 'Morning practice',
            slotsAvailable: 2,
            databases
        });
        // Place bid
        const bid = await bidOnOffering({
            offeringId: offering.offeringId,
            userId: 'rafael',
            topTokenId: bidder1.blessingId,
            databases
        });
        expect(bid.success).toBe(true);
        expect(bid.position).toBe(1); // First bidder
        // Verify bid was recorded
        const updated = await databases.offerings.get(offering.offeringId);
        expect(updated.value.tokenOffers).toHaveLength(1);
        expect(updated.value.tokenOffers[0].userId).toBe('rafael');
        expect(updated.value.tokenOffers[0].topToken).toBe(bidder1.blessingId);
    });
    it('should rank bids by total token duration', async () => {
        // Create offering
        const offering = await createOffering({
            hostId: 'host',
            title: 'Limited Workshop',
            description: '3 spots only',
            slotsAvailable: 3,
            databases
        });
        // Create bidders with different token values
        const bidders = [
            { userId: 'alice', duration: 2_000_000 }, // 33 min
            { userId: 'bob', duration: 3_600_000 }, // 1 hour
            { userId: 'charlie', duration: 900_000 }, // 15 min
            { userId: 'david', duration: 5_400_000 } // 1.5 hours
        ];
        // Create tokens and place bids
        for (const bidder of bidders) {
            const intention = await setIntention({
                userId: bidder.userId,
                title: `${bidder.userId} work`,
                databases,
                timestamp: 0
            });
            await switchAttention({
                userId: bidder.userId,
                toIntentionId: 'other',
                databases,
                timestamp: bidder.duration,
                blessingContent: `Completed ${bidder.duration / 60000} minutes of focused work`
            });
            await bidOnOffering({
                offeringId: offering.offeringId,
                userId: bidder.userId,
                topTokenId: intention.blessingId,
                databases
            });
        }
        // Check ranking
        const updated = await databases.offerings.get(offering.offeringId);
        const ranked = await rankOfferingBids(updated.value, databases);
        expect(ranked[0].userId).toBe('david'); // 1.5 hours
        expect(ranked[1].userId).toBe('bob'); // 1 hour
        expect(ranked[2].userId).toBe('alice'); // 33 min
        expect(ranked[3].userId).toBe('charlie'); // 15 min
    });
    it('should accept winning bids and transfer tokens', async () => {
        const hostId = 'marisol';
        // Create offering with 2 slots
        const offering = await createOffering({
            hostId,
            title: 'Eco-Cabin Weekend',
            description: 'Off-grid retreat',
            slotsAvailable: 2,
            databases
        });
        // Create 3 bidders
        const bidders = [];
        for (let i = 0; i < 3; i++) {
            const intention = await setIntention({
                userId: `bidder${i}`,
                title: `Work ${i}`,
                databases,
                timestamp: i * 1000
            });
            await switchAttention({
                userId: `bidder${i}`,
                toIntentionId: 'other',
                databases,
                timestamp: i * 1000 + (i + 1) * 1_800_000, // Varying durations
                blessingContent: `Bidder ${i} completed work session`
            });
            await bidOnOffering({
                offeringId: offering.offeringId,
                userId: `bidder${i}`,
                topTokenId: intention.blessingId,
                databases
            });
            bidders.push({
                userId: `bidder${i}`,
                blessingId: intention.blessingId
            });
        }
        // Accept top 2 bids
        const result = await acceptOfferingBids({
            offeringId: offering.offeringId,
            hostId,
            databases
        });
        expect(result.accepted).toHaveLength(2);
        expect(result.rejected).toHaveLength(1);
        // Verify tokens were transferred to host
        for (const acceptedUserId of result.accepted) {
            const bidder = bidders.find(b => b.userId === acceptedUserId);
            const blessing = await databases.blessings.get(bidder.blessingId);
            expect(blessing.value.stewardId).toBe(hostId);
        }
        // Verify offering is fulfilled
        const fulfilled = await databases.offerings.get(offering.offeringId);
        expect(fulfilled.value.status).toBe('fulfilled');
        expect(fulfilled.value.selectedStewards).toEqual(result.accepted);
        expect(fulfilled.value.slotsAvailable).toBe(0);
    });
    it('should handle token trees in bids', async () => {
        // Create parent token with children
        const parent = await setIntention({
            userId: 'parent_user',
            title: 'Parent work',
            databases,
            timestamp: 0
        });
        await switchAttention({
            userId: 'parent_user',
            toIntentionId: 'other',
            databases,
            timestamp: 1_800_000, // 30 min
            blessingContent: 'Completed 30 minutes of parent work'
        });
        // Create child tokens
        const child1 = await setIntention({
            userId: 'child_user_1',
            title: 'Child work 1',
            databases,
            timestamp: 2_000_000
        });
        await switchAttention({
            userId: 'child_user_1',
            toIntentionId: 'other',
            databases,
            timestamp: 2_600_000, // 10 min
            blessingContent: 'Finished 10 minutes of child work'
        });
        // Link parent and child - do this more carefully
        const parentBlessingEntry = await databases.blessings.get(parent.blessingId);
        const parentBlessing = parentBlessingEntry.value;
        // Create a clean copy with children array
        const updatedParent = {
            ...parentBlessing,
            children: [child1.blessingId]
        };
        await databases.blessings.put(updatedParent);
        const childBlessingEntry = await databases.blessings.get(child1.blessingId);
        const childBlessing = childBlessingEntry.value;
        // Create a clean copy with parentId
        const updatedChild = {
            ...childBlessing,
            parentId: parent.blessingId
        };
        await databases.blessings.put(updatedChild);
        // Create offering and bid with parent token
        const offering = await createOffering({
            hostId: 'host',
            title: 'Special Event',
            description: 'A special gathering',
            slotsAvailable: 1,
            databases
        });
        await bidOnOffering({
            offeringId: offering.offeringId,
            userId: 'parent_user',
            topTokenId: parent.blessingId,
            databases
        });
        // Accept the bid
        const result = await acceptOfferingBids({
            offeringId: offering.offeringId,
            hostId: 'host',
            databases
        });
        // Verify both parent and child transferred
        const parentAfter = await databases.blessings.get(parent.blessingId);
        const childAfter = await databases.blessings.get(child1.blessingId);
        expect(parentAfter.value.stewardId).toBe('host');
        expect(childAfter.value.stewardId).toBe('host');
    });
});
// Helper function to rank bids
async function rankOfferingBids(offering, databases) {
    const rankedBids = [];
    for (const bid of offering.tokenOffers) {
        const duration = await calculateTokenTreeDuration({
            tokenId: bid.topToken,
            databases,
            includeChildren: true
        });
        rankedBids.push({
            ...bid,
            duration
        });
    }
    return rankedBids.sort((a, b) => b.duration - a.duration);
}
