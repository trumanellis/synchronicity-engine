// test/utility-functions.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff';
import { rimraf } from 'rimraf';
import { setIntention, switchAttention, flattenTokenTree, formatDuration } from '../src/lib/synchronicity-engine';
describe('Utility Functions', () => {
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
    describe('flattenTokenTree', () => {
        it('should return single token when no children exist', async () => {
            // Create a simple token with no children
            const intention = await setIntention({
                userId: 'alice',
                title: 'Simple work',
                databases,
                timestamp: 1000
            });
            await switchAttention({
                userId: 'alice',
                toIntentionId: 'other',
                databases,
                timestamp: 2000
            });
            const flattened = await flattenTokenTree(intention.blessingId, databases.blessings);
            expect(flattened).toEqual([intention.blessingId]);
        });
        it('should flatten a simple parent-child hierarchy', async () => {
            // Create parent token
            const parent = await setIntention({
                userId: 'parent',
                title: 'Parent work',
                databases,
                timestamp: 1000
            });
            await switchAttention({
                userId: 'parent',
                toIntentionId: 'other',
                databases,
                timestamp: 2000
            });
            // Create child token
            const child = await setIntention({
                userId: 'child',
                title: 'Child work',
                databases,
                timestamp: 3000
            });
            await switchAttention({
                userId: 'child',
                toIntentionId: 'other',
                databases,
                timestamp: 4000
            });
            // Manually set up parent-child relationship
            const parentBlessing = await databases.blessings.get(parent.blessingId);
            parentBlessing.value.children = [child.blessingId];
            await databases.blessings.put(parentBlessing.value);
            const childBlessing = await databases.blessings.get(child.blessingId);
            childBlessing.value.parentId = parent.blessingId;
            await databases.blessings.put(childBlessing.value);
            const flattened = await flattenTokenTree(parent.blessingId, databases.blessings);
            expect(flattened).toEqual([parent.blessingId, child.blessingId]);
        });
        it('should handle multi-level hierarchies', async () => {
            // Create grandparent -> parent -> child hierarchy
            const grandparent = await setIntention({
                userId: 'grandparent',
                title: 'Grandparent work',
                databases,
                timestamp: 1000
            });
            const parent = await setIntention({
                userId: 'parent',
                title: 'Parent work',
                databases,
                timestamp: 2000
            });
            const child = await setIntention({
                userId: 'child',
                title: 'Child work',
                databases,
                timestamp: 3000
            });
            // Set up hierarchy
            const grandparentBlessing = await databases.blessings.get(grandparent.blessingId);
            grandparentBlessing.value.children = [parent.blessingId];
            await databases.blessings.put(grandparentBlessing.value);
            const parentBlessing = await databases.blessings.get(parent.blessingId);
            parentBlessing.value.parentId = grandparent.blessingId;
            parentBlessing.value.children = [child.blessingId];
            await databases.blessings.put(parentBlessing.value);
            const childBlessing = await databases.blessings.get(child.blessingId);
            childBlessing.value.parentId = parent.blessingId;
            await databases.blessings.put(childBlessing.value);
            const flattened = await flattenTokenTree(grandparent.blessingId, databases.blessings);
            expect(flattened).toEqual([
                grandparent.blessingId,
                parent.blessingId,
                child.blessingId
            ]);
        });
        it('should prevent infinite recursion with circular references', async () => {
            // Create two tokens that reference each other
            const token1 = await setIntention({
                userId: 'user1',
                title: 'Token 1',
                databases,
                timestamp: 1000
            });
            const token2 = await setIntention({
                userId: 'user2',
                title: 'Token 2',
                databases,
                timestamp: 2000
            });
            // Create circular reference
            const blessing1 = await databases.blessings.get(token1.blessingId);
            blessing1.value.children = [token2.blessingId];
            await databases.blessings.put(blessing1.value);
            const blessing2 = await databases.blessings.get(token2.blessingId);
            blessing2.value.children = [token1.blessingId]; // Circular!
            await databases.blessings.put(blessing2.value);
            const flattened = await flattenTokenTree(token1.blessingId, databases.blessings);
            // Should include both tokens exactly once
            expect(flattened).toHaveLength(2);
            expect(flattened).toContain(token1.blessingId);
            expect(flattened).toContain(token2.blessingId);
        });
        it('should handle missing tokens gracefully', async () => {
            const flattened = await flattenTokenTree('nonexistent_token', databases.blessings);
            expect(flattened).toEqual([]);
        });
    });
    describe('formatDuration', () => {
        it('should format zero duration', () => {
            expect(formatDuration(0)).toBe('0h 0m');
        });
        it('should format minutes only', () => {
            const thirtyMinutes = 30 * 60 * 1000;
            expect(formatDuration(thirtyMinutes)).toBe('0h 30m');
        });
        it('should format hours only', () => {
            const twoHours = 2 * 60 * 60 * 1000;
            expect(formatDuration(twoHours)).toBe('2h 0m');
        });
        it('should format hours and minutes', () => {
            const threeHoursFifteenMinutes = (3 * 60 * 60 + 15 * 60) * 1000;
            expect(formatDuration(threeHoursFifteenMinutes)).toBe('3h 15m');
        });
        it('should handle large durations', () => {
            const twentyFourHours = 24 * 60 * 60 * 1000;
            expect(formatDuration(twentyFourHours)).toBe('24h 0m');
        });
        it('should round down partial minutes', () => {
            const oneMinuteFiftySeconds = (1 * 60 + 50) * 1000;
            expect(formatDuration(oneMinuteFiftySeconds)).toBe('0h 1m');
        });
        it('should handle very small durations', () => {
            const fiveSeconds = 5 * 1000;
            expect(formatDuration(fiveSeconds)).toBe('0h 0m');
        });
    });
    describe('Integration with existing functions', () => {
        it('should work with calculateTokenTreeDuration', async () => {
            // Create a parent token with children
            const parent = await setIntention({
                userId: 'parent',
                title: 'Parent work',
                databases,
                timestamp: 1000
            });
            await switchAttention({
                userId: 'parent',
                toIntentionId: 'other',
                databases,
                timestamp: 3600000 // 1 hour
            });
            const child = await setIntention({
                userId: 'child',
                title: 'Child work',
                databases,
                timestamp: 3600000
            });
            await switchAttention({
                userId: 'child',
                toIntentionId: 'other',
                databases,
                timestamp: 5400000 // 30 minutes later
            });
            // Set up parent-child relationship
            const parentBlessing = await databases.blessings.get(parent.blessingId);
            parentBlessing.value.children = [child.blessingId];
            await databases.blessings.put(parentBlessing.value);
            const childBlessing = await databases.blessings.get(child.blessingId);
            childBlessing.value.parentId = parent.blessingId;
            await databases.blessings.put(childBlessing.value);
            // Test flattenTokenTree
            const flattened = await flattenTokenTree(parent.blessingId, databases.blessings);
            expect(flattened).toEqual([parent.blessingId, child.blessingId]);
            // Test that it works with existing duration calculation
            const { calculateTokenTreeDuration } = await import('../src/lib/synchronicity-engine');
            const totalDuration = await calculateTokenTreeDuration({
                tokenId: parent.blessingId,
                databases,
                currentTime: 5400000
            });
            // Parent: 1 hour (from 1000 to 3600000), Child: 30 minutes (from 3600000 to 5400000)
            // Total should be close to 1.5 hours (allowing for small timing differences)
            expect(totalDuration).toBeGreaterThan(5390000); // ~1.5 hours
            expect(totalDuration).toBeLessThanOrEqual(5400000);
        });
        it('should format durations from real blessing calculations', async () => {
            const intention = await setIntention({
                userId: 'formatter_test',
                title: 'Format test',
                databases,
                timestamp: 0
            });
            await switchAttention({
                userId: 'formatter_test',
                toIntentionId: 'other',
                databases,
                timestamp: 7_500_000 // 2h 5m in milliseconds
            });
            const { calculateBlessingDuration } = await import('../src/lib/synchronicity-engine');
            const duration = await calculateBlessingDuration({
                blessingId: intention.blessingId,
                userId: 'formatter_test',
                databases
            });
            expect(formatDuration(duration)).toBe('2h 5m');
        });
    });
});
