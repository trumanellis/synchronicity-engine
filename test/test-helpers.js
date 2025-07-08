// test/test-helpers.ts
import { randomBytes } from 'crypto';
/**
 * Generates a unique database directory for each test run
 * to prevent conflicts between concurrent tests
 */
export function generateTestDbDir() {
    const randomId = randomBytes(8).toString('hex');
    return `./test-orbitdb-${randomId}`;
}
/**
 * Generates unique database names for each test file
 */
export function generateTestDbNames(prefix) {
    const randomId = randomBytes(4).toString('hex');
    return {
        intentions: `${prefix}-intentions-${randomId}`,
        blessings: `${prefix}-blessings-${randomId}`,
        attentionSwitches: `${prefix}-attention-${randomId}`,
        proofsOfService: `${prefix}-proofs-${randomId}`,
        offerings: `${prefix}-offerings-${randomId}`
    };
}
