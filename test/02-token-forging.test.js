// test/02-token-forging.test.js
// TDD: Token forging workflow

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rimraf } from 'rimraf'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'

describe('TDD: Token Forging Workflow', () => {
  let orbitdb
  let databases

  beforeEach(async () => {
    await rimraf('./test-orbitdb-tdd')
    orbitdb = await startOrbitDB({ directory: './test-orbitdb-tdd' })
    databases = {
      attentionSwitches: await orbitdb.open('attention-switches', { type: 'documents' }),
      blessings: await orbitdb.open('blessings', { type: 'documents' }),
      tokensOfGratitude: await orbitdb.open('tokens-of-gratitude', { type: 'documents' }),
      proofsOfService: await orbitdb.open('proofs-of-service', { type: 'documents' }),
      intentions: await orbitdb.open('intentions', { type: 'documents' })
    }
  })

  afterEach(async () => {
    if (orbitdb) {
      await stopOrbitDB(orbitdb)
    }
    await rimraf('./test-orbitdb-tdd')
  })

  it('should complete full workflow: attention -> blessing -> proof -> token', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // 1. Alice switches attention to help Bob
    const attention1 = await switchAttention({
      userId: 'alice',
      newIntentionId: 'help_bob_garden',
      databases
    })
    expect(attention1.success).toBe(true)
    expect(attention1.newIndex).toBe(0)

    // Wait for some attention time
    await new Promise(resolve => setTimeout(resolve, 100))

    // 2. Alice switches to something else, marking blessing as potential
    const attention2 = await switchAttention({
      userId: 'alice',
      newIntentionId: 'other_task',
      databases
    })
    expect(attention2.success).toBe(true)
    expect(attention2.newIndex).toBe(1)

    // 3. Bob posts proof of service for the garden work
    const proof = await postProofOfService({
      intentionId: 'help_bob_garden',
      submittedBy: 'bob',
      title: 'Garden cleaned and organized',
      description: 'Spent the morning organizing the garden beds and removing weeds',
      databases
    })
    expect(proof.success).toBe(true)

    // 4. Alice forges token of gratitude from her potential blessing
    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0],
      intentionId: 'help_bob_garden',
      honoringProof: proof.proofId,
      message: 'Thank you for your beautiful garden work!',
      databases
    })
    expect(token.success).toBe(true)

    // Verify the token was created correctly
    const tokenData = await databases.tokensOfGratitude.get(token.tokenId)
    expect(tokenData.value.forgedBy).toBe('alice')
    expect(tokenData.value.forgedFrom).toEqual([0])
    expect(tokenData.value.intentionId).toBe('help_bob_garden')
    expect(tokenData.value.steward).toBe('alice')
    expect(tokenData.value.totalDuration).toBeGreaterThan(90)
  })

  it('should prevent forging tokens from active blessings', async () => {
    const { switchAttention, postProofOfService, forgeTokenOfGratitude } = await import('../dist/lib/synchronicity-engine-v2.js')
    
    // 1. Alice switches attention 
    await switchAttention({
      userId: 'alice',
      newIntentionId: 'help_bob_garden',
      databases
    })

    // 2. Bob posts proof
    const proof = await postProofOfService({
      intentionId: 'help_bob_garden',
      submittedBy: 'bob',
      title: 'Garden work done',
      description: 'Completed the task',
      databases
    })

    // 3. Try to forge token from active blessing - should fail
    const token = await forgeTokenOfGratitude({
      forgedBy: 'alice',
      blessingIndices: [0],
      intentionId: 'help_bob_garden',
      honoringProof: proof.proofId,
      databases
    })
    expect(token.success).toBe(false)
    expect(token.error).toContain('Can only forge from potential blessings')
  })
}, { timeout: 30000 })