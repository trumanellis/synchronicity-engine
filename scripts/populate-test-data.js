import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'

async function populateTestData() {
  console.log('🌱 Populating test data for database browser...')
  
  try {
    // Start OrbitDB
    const orbitdb = await startOrbitDB({ directory: './electron-orbitdb' })
    
    const databases = {
      intentions: await orbitdb.open('intentions', { type: 'documents' }),
      blessings: await orbitdb.open('blessings', { type: 'documents' }),
      attentionSwitches: await orbitdb.open('attention-switches', { type: 'events' }),
      proofsOfService: await orbitdb.open('proofs-of-service', { type: 'events' }),
      offerings: await orbitdb.open('offerings', { type: 'documents' })
    }
    
    console.log('Connected to databases')
    
    // Create sample intentions
    const sampleIntentions = [
      {
        _id: 'intention_0',
        intentionId: 'intention_0',
        title: 'Build a community garden',
        userId: 'alice',
        timestamp: Date.now() - 86400000,
        blessings: ['blessing_alice_0'],
        attachedTokens: [],
        status: 'active'
      },
      {
        _id: 'intention_1',
        intentionId: 'intention_1', 
        title: 'Organize neighborhood cleanup',
        userId: 'bob',
        timestamp: Date.now() - 43200000,
        blessings: ['blessing_bob_0'],
        attachedTokens: [],
        status: 'active'
      },
      {
        _id: 'intention_2',
        intentionId: 'intention_2',
        title: 'Create meditation app',
        userId: 'charlie',
        timestamp: Date.now() - 21600000,
        blessings: ['blessing_charlie_0'],
        attachedTokens: [],
        status: 'active'
      }
    ]
    
    // Create sample blessings
    const sampleBlessings = [
      {
        _id: 'blessing_alice_0',
        blessingId: 'blessing_alice_0',
        intentionId: 'intention_0',
        userId: 'alice',
        status: 'potential',
        content: 'Spent 2 hours researching community garden designs',
        attentionIndex: 0,
        stewardId: 'alice',
        duration: 7200000,
        timestamp: Date.now() - 86400000
      },
      {
        _id: 'blessing_bob_0',
        blessingId: 'blessing_bob_0',
        intentionId: 'intention_1',
        userId: 'bob',
        status: 'active',
        content: 'Organized volunteer team and got permits',
        attentionIndex: 0,
        stewardId: 'bob',
        duration: 5400000,
        timestamp: Date.now() - 43200000
      },
      {
        _id: 'blessing_charlie_0',
        blessingId: 'blessing_charlie_0',
        intentionId: 'intention_2', 
        userId: 'charlie',
        status: 'active',
        content: 'Created wireframes and user flow',
        attentionIndex: 0,
        stewardId: 'charlie',
        duration: 3600000,
        timestamp: Date.now() - 21600000
      }
    ]
    
    // Create sample attention switches
    const sampleAttentionSwitches = [
      {
        userId: 'alice',
        intentionId: 'intention_0',
        timestamp: Date.now() - 86400000,
        attentionIndex: 0
      },
      {
        userId: 'bob',
        intentionId: 'intention_1', 
        timestamp: Date.now() - 43200000,
        attentionIndex: 0
      },
      {
        userId: 'charlie',
        intentionId: 'intention_2',
        timestamp: Date.now() - 21600000,
        attentionIndex: 0
      }
    ]
    
    // Populate intentions
    for (const intention of sampleIntentions) {
      await databases.intentions.put(intention)
      console.log(`✅ Added intention: ${intention.title}`)
    }
    
    // Populate blessings
    for (const blessing of sampleBlessings) {
      await databases.blessings.put(blessing)
      console.log(`✅ Added blessing: ${blessing.blessingId}`)
    }
    
    // Populate attention switches
    for (const attentionSwitch of sampleAttentionSwitches) {
      await databases.attentionSwitches.add(attentionSwitch)
      console.log(`✅ Added attention switch for ${attentionSwitch.userId}`)
    }
    
    console.log('✅ Test data populated successfully!')
    console.log(`📊 Created ${sampleIntentions.length} intentions`)
    console.log(`📊 Created ${sampleBlessings.length} blessings`)
    console.log(`📊 Created ${sampleAttentionSwitches.length} attention switches`)
    console.log('💡 You can now view this data in the Database Browser')
    
    await stopOrbitDB(orbitdb)
    
  } catch (error) {
    console.error('❌ Error populating test data:', error)
    process.exit(1)
  }
}

populateTestData()