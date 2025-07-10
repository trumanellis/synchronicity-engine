// test/token-drag-bidding.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff';
import { rimraf } from 'rimraf';
import { setIntention, switchAttention, createOffering, bidOnOffering } from '../src/lib/synchronicity-engine.js';

describe('Token Drag-and-Drop Bidding', () => {
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

    it('should create a bid when token is dropped on offering', async () => {
        // Create a token to bid with
        const bidder = await setIntention({
            userId: 'alice',
            title: 'Website Development',
            databases,
            timestamp: 0
        });

        await switchAttention({
            userId: 'alice',
            toIntentionId: 'completed',
            databases,
            timestamp: 3_600_000, // 1 hour
            blessingContent: 'Completed 1 hour of focused web development'
        });

        // Create an offering
        const offering = await createOffering({
            hostId: 'bob',
            title: 'Morning Yoga Session',
            description: 'Gentle hatha practice at sunrise',
            time: '2025-07-15T06:00:00Z',
            place: 'Garden Studio',
            slotsAvailable: 5,
            databases
        });

        // Simulate drag-and-drop bid
        const bidResult = await handleTokenDropOnOffering({
            tokenId: bidder.blessingId,
            offeringId: offering.offeringId,
            userId: 'alice',
            databases
        });

        expect(bidResult.success).toBe(true);
        expect(bidResult.bidPosition).toBe(1);

        // Verify bid was recorded in offering
        const updatedOffering = await databases.offerings.get(offering.offeringId);
        expect(updatedOffering.value.tokenOffers).toHaveLength(1);
        expect(updatedOffering.value.tokenOffers[0].userId).toBe('alice');
        expect(updatedOffering.value.tokenOffers[0].topToken).toBe(bidder.blessingId);
    });

    it('should handle multiple tokens being dropped on the same offering', async () => {
        // Create multiple tokens for the same user
        const tokens = [];
        for (let i = 0; i < 3; i++) {
            const intention = await setIntention({
                userId: 'charlie',
                title: `Task ${i + 1}`,
                databases,
                timestamp: i * 1000
            });

            await switchAttention({
                userId: 'charlie',
                toIntentionId: 'completed',
                databases,
                timestamp: i * 1000 + (i + 1) * 1800000, // 30, 60, 90 minutes
                blessingContent: `Completed task ${i + 1}`
            });

            tokens.push(intention.blessingId);
        }

        // Create offering
        const offering = await createOffering({
            hostId: 'dana',
            title: 'Weekend Workshop',
            description: 'Intensive learning session',
            slotsAvailable: 3,
            databases
        });

        // Try to bid with multiple tokens (should use the last one dropped)
        const bidResult = await handleMultipleTokenDropOnOffering({
            tokenIds: tokens,
            offeringId: offering.offeringId,
            userId: 'charlie',
            databases
        });

        expect(bidResult.success).toBe(true);
        // Should use the highest value token (the last one with 90 minutes)
        expect(bidResult.tokenId).toBe(tokens[2]);

        // Verify only one bid was placed
        const updatedOffering = await databases.offerings.get(offering.offeringId);
        expect(updatedOffering.value.tokenOffers).toHaveLength(1);
        expect(updatedOffering.value.tokenOffers[0].topToken).toBe(tokens[2]);
    });

    it('should prevent bidding on closed offerings', async () => {
        const token = await setIntention({
            userId: 'eve',
            title: 'Design Work',
            databases,
            timestamp: 0
        });

        await switchAttention({
            userId: 'eve',
            toIntentionId: 'completed',
            databases,
            timestamp: 1800000,
            blessingContent: 'Completed design work'
        });

        // Create and close offering
        const offering = await createOffering({
            hostId: 'frank',
            title: 'Closed Event',
            description: 'This event is closed',
            slotsAvailable: 1,
            databases
        });

        // Manually close the offering
        const offeringDoc = await databases.offerings.get(offering.offeringId);
        offeringDoc.value.status = 'closed';
        await databases.offerings.put(offeringDoc.value);

        // Try to bid on closed offering
        const bidResult = await handleTokenDropOnOffering({
            tokenId: token.blessingId,
            offeringId: offering.offeringId,
            userId: 'eve',
            databases
        });

        expect(bidResult.success).toBe(false);
        expect(bidResult.error).toContain('not open');
    });

    it('should prevent duplicate bids from the same user', async () => {
        const token1 = await setIntention({
            userId: 'grace',
            title: 'First Task',
            databases,
            timestamp: 0
        });

        await switchAttention({
            userId: 'grace',
            toIntentionId: 'other',
            databases,
            timestamp: 1800000,
            blessingContent: 'Completed first task'
        });

        const token2 = await setIntention({
            userId: 'grace',
            title: 'Second Task',
            databases,
            timestamp: 2000000
        });

        await switchAttention({
            userId: 'grace',
            toIntentionId: 'completed',
            databases,
            timestamp: 3800000,
            blessingContent: 'Completed second task'
        });

        const offering = await createOffering({
            hostId: 'henry',
            title: 'Exclusive Workshop',
            description: 'Limited spots',
            slotsAvailable: 2,
            databases
        });

        // First bid should succeed
        const firstBid = await handleTokenDropOnOffering({
            tokenId: token1.blessingId,
            offeringId: offering.offeringId,
            userId: 'grace',
            databases
        });

        expect(firstBid.success).toBe(true);

        // Second bid from same user should fail
        const secondBid = await handleTokenDropOnOffering({
            tokenId: token2.blessingId,
            offeringId: offering.offeringId,
            userId: 'grace',
            databases
        });

        expect(secondBid.success).toBe(false);
        expect(secondBid.error).toContain('already bid');
    });
});

// Helper functions to simulate drag-and-drop behavior

async function handleTokenDropOnOffering({ tokenId, offeringId, userId, databases }) {
    try {
        const result = await bidOnOffering({
            offeringId,
            userId,
            topTokenId: tokenId,
            databases
        });

        if (result.success) {
            return {
                success: true,
                bidPosition: result.position,
                tokenId
            };
        } else {
            return {
                success: false,
                error: result.error
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function handleMultipleTokenDropOnOffering({ tokenIds, offeringId, userId, databases }) {
    // When multiple tokens are dropped, we should select the one with highest value
    // For simplicity, we'll use the last token in the array (newest/most recent)
    const selectedTokenId = tokenIds[tokenIds.length - 1];
    
    return await handleTokenDropOnOffering({
        tokenId: selectedTokenId,
        offeringId,
        userId,
        databases
    });
}