// test/gratitude-potential.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff';
import { rimraf } from 'rimraf';
import { setIntention, switchAttention, assignBlessing, postProofOfService, calculateGratitudePotential, attachTokenToIntention } from '../src/lib/synchronicity-engine';
describe('Gratitude Potential', () => {
    let orbitdb;
    let databases;
    beforeEach(async () => {
        orbitdb = await startOrbitDB({ directory: './test-orbitdb' });
        databases = {
            intentions: await orbitdb.open('test-intentions', { type: 'documents' }),
            blessings: await orbitdb.open('test-blessings', { type: 'documents' }),
            attentionSwitches: await orbitdb.open('test-attention', { type: 'events' }),
            proofsOfService: await orbitdb.open('test-proofs', { type: 'events' })
        };
    });
    afterEach(async () => {
        if (orbitdb) {
            await stopOrbitDB(orbitdb);
        }
        await rimraf('./test-orbitdb');
        await rimraf('./test-ipfs');
    });
    it('should calculate potential from live blessings only', async () => {
        const userId = 'truman';
        // Create intention with 30 minutes attention
        const intention = await setIntention({
            userId,
            title: 'Clear the mountain',
            databases,
            timestamp: 0
        });
        // Switch attention after 30 minutes
        await switchAttention({
            userId,
            toIntentionId: 'other_intention',
            databases,
            timestamp: 1_800_000, // 30 minutes
            blessingContent: 'Spent 30 minutes clearing mountain paths'
        });
        // Calculate potential (should be 30 minutes)
        const potential = await calculateGratitudePotential({
            intentionId: intention.intentionId,
            databases
        });
        expect(potential).toBe(1_800_000);
    });
    it('should include multiple blessings from different users', async () => {
        // User 1 blesses for 20 minutes
        const intention = await setIntention({
            userId: 'alice',
            title: 'Community garden',
            databases,
            timestamp: 0
        });
        await switchAttention({
            userId: 'alice',
            toIntentionId: 'other',
            databases,
            timestamp: 1_200_000, // 20 minutes
            blessingContent: 'Worked on community garden planning for 20 minutes'
        });
        // User 2 blesses for 15 minutes
        await switchAttention({
            userId: 'bob',
            toIntentionId: intention.intentionId,
            databases,
            timestamp: 2_000_000
        });
        await switchAttention({
            userId: 'bob',
            toIntentionId: 'other',
            databases,
            timestamp: 2_900_000, // 15 minutes later
            blessingContent: 'Contributed 15 minutes to garden design'
        });
        // Total should be 35 minutes
        const potential = await calculateGratitudePotential({
            intentionId: intention.intentionId,
            databases
        });
        expect(potential).toBe(2_100_000); // 35 minutes
    });
    it('should include attached token boosts', async () => {
        // Create main intention
        const mainIntention = await setIntention({
            userId: 'organizer',
            title: 'Main project',
            databases,
            timestamp: 0
        });
        // Create a blessing token from previous work
        const previousWork = await setIntention({
            userId: 'helper',
            title: 'Previous help',
            databases,
            timestamp: 1000
        });
        await switchAttention({
            userId: 'helper',
            toIntentionId: 'other',
            databases,
            timestamp: 3_601_000, // 1 hour later
            blessingContent: 'Completed 1 hour of previous help work'
        });
        // Attach the blessing as a boost token
        await attachTokenToIntention({
            tokenId: previousWork.blessingId,
            intentionId: mainIntention.intentionId,
            databases
        });
        // Add some direct attention too
        await switchAttention({
            userId: 'organizer',
            toIntentionId: 'other',
            databases,
            timestamp: 600_000, // 10 minutes
            blessingContent: 'Organized project structure for 10 minutes'
        });
        // Total should be 1 hour 10 minutes
        const potential = await calculateGratitudePotential({
            intentionId: mainIntention.intentionId,
            databases
        });
        expect(potential).toBe(4_200_000); // 70 minutes total
    });
    it('should exclude given blessings from potential', async () => {
        const creatorId = 'creator';
        const helperId = 'helper';
        // Create intention with blessing
        const intention = await setIntention({
            userId: creatorId,
            title: 'Need help',
            databases,
            timestamp: 0
        });
        // Add 30 minutes attention
        await switchAttention({
            userId: creatorId,
            toIntentionId: 'other',
            databases,
            timestamp: 1_800_000,
            blessingContent: 'Spent 30 minutes working on help request'
        });
        // Post proof and assign blessing
        const proof = await postProofOfService({
            intentionId: intention.intentionId,
            by: [helperId],
            content: 'Helped!',
            media: [],
            databases
        });
        await assignBlessing({
            blessingId: intention.blessingId,
            toUserId: helperId,
            proofId: proof.proofId,
            databases
        });
        // Potential should now be 0 (blessing was given away)
        const potential = await calculateGratitudePotential({
            intentionId: intention.intentionId,
            databases
        });
        expect(potential).toBe(0);
    });
    it('should handle nested token hierarchies', async () => {
        // Create parent token (1 hour)
        const parentWork = await setIntention({
            userId: 'alice',
            title: 'Parent work',
            databases,
            timestamp: 0
        });
        await switchAttention({
            userId: 'alice',
            toIntentionId: 'other',
            databases,
            timestamp: 3_600_000, // 1 hour
            blessingContent: 'Completed 1 hour of parent work'
        });
        // Create child token (30 minutes)
        const childWork = await setIntention({
            userId: 'bob',
            title: 'Child work',
            databases,
            timestamp: 4_000_000 // Start after parent is done
        });
        await switchAttention({
            userId: 'bob',
            toIntentionId: 'other',
            databases,
            timestamp: 5_800_000, // 30 minutes later
            blessingContent: 'Finished 30 minutes of child work'
        });
        // Make child a child of parent
        const parentBlessing = await databases.blessings.get(parentWork.blessingId);
        parentBlessing.value.children = [childWork.blessingId];
        await databases.blessings.put(parentBlessing.value);
        const childBlessing = await databases.blessings.get(childWork.blessingId);
        childBlessing.value.parentId = parentWork.blessingId;
        await databases.blessings.put(childBlessing.value);
        // Create main intention and attach parent token
        const mainIntention = await setIntention({
            userId: 'organizer',
            title: 'Main intention',
            databases,
            timestamp: 6_000_000
        });
        await attachTokenToIntention({
            tokenId: parentWork.blessingId,
            intentionId: mainIntention.intentionId,
            databases
        });
        // Should include:
        // - Parent token: 1 hour (3,600,000)
        // - Child token: 30 minutes (1,800,000)
        // - Main intention's own blessing: ~17 minutes (1,000,000)
        // Total: 6,400,000 ms
        const potential = await calculateGratitudePotential({
            intentionId: mainIntention.intentionId,
            databases,
            includeChildren: true,
            currentTime: 7_000_000 // Fixed time for calculation
        });
        expect(potential).toBe(6_400_000); // 1 hour 46 minutes 40 seconds
    });
    it('should calculate potential at specific point in time', async () => {
        const intention = await setIntention({
            userId: 'timekeeper',
            title: 'Time sensitive',
            databases,
            timestamp: 0
        });
        // Calculate at different times
        const at10min = await calculateGratitudePotential({
            intentionId: intention.intentionId,
            databases,
            currentTime: 600_000 // 10 minutes
        });
        const at30min = await calculateGratitudePotential({
            intentionId: intention.intentionId,
            databases,
            currentTime: 1_800_000 // 30 minutes
        });
        expect(at10min).toBe(600_000);
        expect(at30min).toBe(1_800_000);
    });
});
