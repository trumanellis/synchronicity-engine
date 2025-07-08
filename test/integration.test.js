// test/integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff';
import { rimraf } from 'rimraf';
import { setIntention, switchAttention, calculateBlessingDuration, calculateGratitudePotential, postProofOfService, assignBlessing, attachTokenToIntention, createOffering, bidOnOffering, acceptOfferingBids, calculateTokenTreeDuration, flattenTokenTree, formatDuration } from '../src/lib/synchronicity-engine';
describe('Integration Tests - End-to-End Workflows', () => {
    let orbitdb;
    let databases;
    beforeEach(async () => {
        orbitdb = await startOrbitDB({ directory: './test-orbitdb' });
        databases = {
            intentions: await orbitdb.open('test-intentions', { type: 'documents' }),
            blessings: await orbitdb.open('test-blessings', { type: 'documents' }),
            attentionSwitches: await orbitdb.open('test-attention', { type: 'events' }),
            proofsOfService: await orbitdb.open('test-proofs', { type: 'events' }),
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
    describe('Complete Intention Lifecycle', () => {
        it('should handle a full intention workflow from creation to completion', async () => {
            const creatorId = 'alice';
            const serviceProviderId = 'bob';
            // 1. Alice sets an intention
            const intention = await setIntention({
                userId: creatorId,
                title: 'Build a community garden',
                databases,
                timestamp: 0
            });
            expect(intention.intentionId).toBe('intention_0');
            expect(intention.blessingId).toBe('blessing_alice_0');
            expect(intention.attentionIndex).toBe(0);
            // 2. Alice focuses on this intention for 2 hours
            await switchAttention({
                userId: creatorId,
                toIntentionId: 'other_intention',
                databases,
                timestamp: 7_200_000, // 2 hours
                blessingContent: 'Spent 2 hours researching community garden designs'
            });
            // 3. Calculate the blessing duration
            const duration = await calculateBlessingDuration({
                blessingId: intention.blessingId,
                userId: creatorId,
                databases
            });
            expect(duration).toBe(7_200_000); // 2 hours in milliseconds
            expect(formatDuration(duration)).toBe('2h 0m');
            // 4. Calculate intention's gratitude potential
            const potential = await calculateGratitudePotential({
                intentionId: intention.intentionId,
                databases
            });
            expect(potential).toBe(7_200_000); // Should match the blessing duration
            // 5. Bob provides service for this intention
            const proof = await postProofOfService({
                intentionId: intention.intentionId,
                by: [serviceProviderId],
                content: 'Designed and built raised garden beds',
                media: ['ipfs://garden-photos-hash'],
                databases,
                timestamp: 8_000_000
            });
            expect(proof.proofId).toBe('proof_8000000');
            // 6. Alice assigns her blessing to Bob as gratitude
            const assignment = await assignBlessing({
                blessingId: intention.blessingId,
                toUserId: serviceProviderId,
                proofId: proof.proofId,
                databases
            });
            expect(assignment.success).toBe(true);
            expect(assignment.previousSteward).toBe(creatorId);
            expect(assignment.newSteward).toBe(serviceProviderId);
            // 7. Verify the blessing was transferred
            const finalBlessing = await databases.blessings.get(intention.blessingId);
            expect(finalBlessing.value.status).toBe('given');
            expect(finalBlessing.value.stewardId).toBe(serviceProviderId);
            expect(finalBlessing.value.proofId).toBe(proof.proofId);
            expect(finalBlessing.value.content).toBe('Spent 2 hours researching community garden designs');
        });
    });
    describe('Multi-User Collaboration Workflow', () => {
        it('should handle multiple users contributing to the same intention', async () => {
            const creator = 'alice';
            const contributor1 = 'bob';
            const contributor2 = 'charlie';
            // 1. Alice creates a collaborative intention
            const intention = await setIntention({
                userId: creator,
                title: 'Organize neighborhood cleanup',
                databases,
                timestamp: 1000
            });
            // 2. Alice works on it for 1 hour
            await switchAttention({
                userId: creator,
                toIntentionId: 'other',
                databases,
                timestamp: 3_601_000, // 1 hour + 1 second
                blessingContent: 'Planned cleanup routes and got permits'
            });
            // 3. Bob also focuses on this intention for 30 minutes
            await switchAttention({
                userId: contributor1,
                toIntentionId: intention.intentionId,
                databases,
                timestamp: 3_601_000
            });
            await switchAttention({
                userId: contributor1,
                toIntentionId: 'other',
                databases,
                timestamp: 5_401_000, // 30 minutes later
                blessingContent: 'Created flyers and promoted on social media'
            });
            // 4. Charlie contributes 45 minutes
            await switchAttention({
                userId: contributor2,
                toIntentionId: intention.intentionId,
                databases,
                timestamp: 5_401_000
            });
            await switchAttention({
                userId: contributor2,
                toIntentionId: 'other',
                databases,
                timestamp: 8_101_000, // 45 minutes later
                blessingContent: 'Coordinated with local businesses for supplies'
            });
            // 5. Calculate total gratitude potential
            const totalPotential = await calculateGratitudePotential({
                intentionId: intention.intentionId,
                databases,
                currentTime: 8_101_000
            });
            // Alice: 1 hour + Bob: 30 min + Charlie: 45 min = 2h 15m = 8,100,000ms
            expect(totalPotential).toBe(8_100_000);
            expect(formatDuration(totalPotential)).toBe('2h 15m');
            // 6. Verify individual blessing durations
            const intentionDoc = await databases.intentions.get(intention.intentionId);
            const allBlessings = intentionDoc.value.blessings;
            expect(allBlessings).toHaveLength(3); // One blessing per contributor
            // Check each blessing duration
            for (const blessingId of allBlessings) {
                const blessing = await databases.blessings.get(blessingId);
                const duration = await calculateBlessingDuration({
                    blessingId,
                    userId: blessing.value.userId,
                    databases,
                    currentTime: 8_101_000
                });
                if (blessing.value.userId === creator) {
                    expect(duration).toBe(3_600_000); // 1 hour
                }
                else if (blessing.value.userId === contributor1) {
                    expect(duration).toBe(1_800_000); // 30 minutes
                }
                else if (blessing.value.userId === contributor2) {
                    expect(duration).toBe(2_700_000); // 45 minutes
                }
            }
        });
    });
    describe('Token Hierarchy and Marketplace Workflow', () => {
        it('should handle token inheritance and marketplace transactions', async () => {
            const parentWorker = 'alice';
            const childWorker = 'bob';
            const offeringHost = 'charlie';
            const bidder = 'diana';
            // 1. Create parent work (mentoring project)
            const parentWork = await setIntention({
                userId: parentWorker,
                title: 'Mentor new developers',
                databases,
                timestamp: 0
            });
            await switchAttention({
                userId: parentWorker,
                toIntentionId: 'other',
                databases,
                timestamp: 3_600_000 // 1 hour
            });
            // 2. Create child work (specific mentoring session)
            const childWork = await setIntention({
                userId: childWorker,
                title: 'Learn React patterns',
                databases,
                timestamp: 1_800_000 // 30 minutes into parent work
            });
            await switchAttention({
                userId: childWorker,
                toIntentionId: 'other',
                databases,
                timestamp: 5_400_000 // 1 hour session
            });
            // 3. Establish parent-child relationship
            const parentBlessing = await databases.blessings.get(parentWork.blessingId);
            parentBlessing.value.children = [childWork.blessingId];
            await databases.blessings.put(parentBlessing.value);
            const childBlessing = await databases.blessings.get(childWork.blessingId);
            childBlessing.value.parentId = parentWork.blessingId;
            await databases.blessings.put(childBlessing.value);
            // 4. Test token tree flattening
            const flattenedTokens = await flattenTokenTree(parentWork.blessingId, databases.blessings);
            expect(flattenedTokens).toEqual([parentWork.blessingId, childWork.blessingId]);
            // 5. Calculate total token tree duration
            const treeDuration = await calculateTokenTreeDuration({
                tokenId: parentWork.blessingId,
                databases,
                currentTime: 5_400_000
            });
            // Parent: 1 hour + Child: 1 hour = 2 hours
            expect(treeDuration).toBe(7_200_000);
            // 6. Create an offering in the marketplace
            const offering = await createOffering({
                hostId: offeringHost,
                title: 'Weekend coding workshop',
                description: 'Intensive React workshop',
                time: '2024-08-15T09:00:00Z',
                place: 'Community Center',
                slotsAvailable: 1,
                databases,
                timestamp: 6_000_000
            });
            // 7. Alice bids with her parent token (includes child value)
            const bid = await bidOnOffering({
                offeringId: offering.offeringId,
                userId: parentWorker,
                topTokenId: parentWork.blessingId,
                databases
            });
            expect(bid.success).toBe(true);
            expect(bid.position).toBe(1);
            // 8. Charlie accepts the bid
            const acceptance = await acceptOfferingBids({
                offeringId: offering.offeringId,
                hostId: offeringHost,
                databases
            });
            expect(acceptance.accepted).toEqual([parentWorker]);
            expect(acceptance.rejected).toEqual([]);
            // 9. Verify token ownership was transferred
            const transferredParent = await databases.blessings.get(parentWork.blessingId);
            const transferredChild = await databases.blessings.get(childWork.blessingId);
            expect(transferredParent.value.stewardId).toBe(offeringHost);
            expect(transferredChild.value.stewardId).toBe(offeringHost);
            // 10. Verify offering status
            const finalOffering = await databases.offerings.get(offering.offeringId);
            expect(finalOffering.value.status).toBe('fulfilled');
            expect(finalOffering.value.selectedStewards).toEqual([parentWorker]);
        });
    });
    describe('Complex Attention Switching Patterns', () => {
        it('should handle complex attention switching with multiple intentions', async () => {
            const userId = 'multitasker';
            // Create multiple intentions
            const intention1 = await setIntention({
                userId,
                title: 'Write blog post',
                databases,
                timestamp: 0
            });
            const intention2 = await setIntention({
                userId,
                title: 'Review code',
                databases,
                timestamp: 3_600_000, // 1 hour later
                blessingContent: 'Planned cleanup routes and got permits'
            });
            const intention3 = await setIntention({
                userId,
                title: 'Plan meeting',
                databases,
                timestamp: 5_400_000, // 1.5 hours total
                blessingContent: 'Reviewed 3 pull requests and provided feedback'
            });
            // Switch back to intention1
            await switchAttention({
                userId,
                toIntentionId: intention1.intentionId,
                databases,
                timestamp: 7_200_000, // 2 hours total
                blessingContent: 'Finished code review and documentation'
            });
            // Switch to intention2 again
            await switchAttention({
                userId,
                toIntentionId: intention2.intentionId,
                databases,
                timestamp: 9_000_000, // 2.5 hours total
                blessingContent: 'Completed first draft of blog post'
            });
            // Finish with intention3
            await switchAttention({
                userId,
                toIntentionId: intention3.intentionId,
                databases,
                timestamp: 10_800_000, // 3 hours total
                blessingContent: 'Addressed code review feedback'
            });
            // Calculate durations for each intention
            const intention1Doc = await databases.intentions.get(intention1.intentionId);
            const intention2Doc = await databases.intentions.get(intention2.intentionId);
            const intention3Doc = await databases.intentions.get(intention3.intentionId);
            // Intention 1 should have 2 blessings (initial + return)
            expect(intention1Doc.value.blessings).toHaveLength(2);
            // Calculate total time spent on each intention
            const intention1Potential = await calculateGratitudePotential({
                intentionId: intention1.intentionId,
                databases,
                currentTime: 10_800_000
            });
            const intention2Potential = await calculateGratitudePotential({
                intentionId: intention2.intentionId,
                databases,
                currentTime: 10_800_000
            });
            const intention3Potential = await calculateGratitudePotential({
                intentionId: intention3.intentionId,
                databases,
                currentTime: 10_800_000
            });
            // Verify the time allocation
            // Intention1: 1h (0-3600000) + 0.5h (7200000-9000000) = 1.5h = 5,400,000ms
            expect(intention1Potential).toBe(5_400_000);
            // Intention2: 0.5h (3600000-5400000) + 0.5h (9000000-10800000) = 1h = 3,600,000ms  
            expect(intention2Potential).toBe(3_600_000);
            // Intention3: 0.5h (5400000-7200000) + currently active (from 10800000) = 0.5h + 0 = 1,800,000ms
            expect(intention3Potential).toBeGreaterThanOrEqual(1_800_000);
        });
    });
    describe('Token Boosting Workflow', () => {
        it('should handle attaching tokens to boost intention potential', async () => {
            const creator = 'alice';
            const booster = 'bob';
            // 1. Alice creates main intention
            const mainIntention = await setIntention({
                userId: creator,
                title: 'Develop climate action app',
                databases,
                timestamp: 0
            });
            await switchAttention({
                userId: creator,
                toIntentionId: 'other',
                databases,
                timestamp: 3_600_000 // 1 hour
            });
            // 2. Bob creates supporting work  
            const supportWork = await setIntention({
                userId: booster,
                title: 'Research climate APIs',
                databases,
                timestamp: 1_800_000
            });
            await switchAttention({
                userId: booster,
                toIntentionId: 'other',
                databases,
                timestamp: 5_400_000 // 1 hour of work
            });
            // 3. Check initial potential
            const initialPotential = await calculateGratitudePotential({
                intentionId: mainIntention.intentionId,
                databases,
                currentTime: 5_400_000
            });
            expect(initialPotential).toBe(3_600_000); // Just Alice's 1 hour
            // 4. Bob attaches his work as a boost to Alice's intention
            await attachTokenToIntention({
                tokenId: supportWork.blessingId,
                intentionId: mainIntention.intentionId,
                databases
            });
            // 5. Check boosted potential
            const boostedPotential = await calculateGratitudePotential({
                intentionId: mainIntention.intentionId,
                databases,
                currentTime: 5_400_000
            });
            // Should now include Alice's 1h + Bob's 1h = 2h = 7,200,000ms
            expect(boostedPotential).toBe(7_200_000);
            // 6. Verify the attachment
            const intentionDoc = await databases.intentions.get(mainIntention.intentionId);
            expect(intentionDoc.value.attachedTokens).toContain(supportWork.blessingId);
            // 7. Format the total potential for display
            expect(formatDuration(boostedPotential)).toBe('2h 0m');
        });
    });
});
