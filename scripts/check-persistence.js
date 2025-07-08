import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'

async function checkPersistence() {
  console.log('🔍 Checking database persistence...')
  
  try {
    // Connect to the same databases the Electron app uses
    const orbitdb = await startOrbitDB({ 
      directory: './synchronicity-orbitdb'
    })
    
    const databases = {
      intentions: await orbitdb.open('synchronicity-intentions', { type: 'documents' }),
      blessings: await orbitdb.open('synchronicity-blessings', { type: 'documents' }),
      attentionSwitches: await orbitdb.open('synchronicity-attention-switches', { type: 'events' }),
      proofsOfService: await orbitdb.open('synchronicity-proofs-of-service', { type: 'events' }),
      offerings: await orbitdb.open('synchronicity-offerings', { type: 'documents' })
    }
    
    console.log('Connected to databases')
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Check what data exists
    for (const [name, db] of Object.entries(databases)) {
      try {
        let count = 0
        if (db.type === 'documents') {
          const allDocs = await db.all()
          count = allDocs.length
          if (count > 0) {
            console.log(`📄 ${name}: ${count} documents`)
            // Show first document as example
            console.log(`   Example: ${JSON.stringify(allDocs[0].value, null, 2).substring(0, 200)}...`)
          }
        } else {
          const entries = []
          for await (const entry of db.iterator()) {
            entries.push(entry)
          }
          count = entries.length
          if (count > 0) {
            console.log(`⚡ ${name}: ${count} events`)
          }
        }
        
        if (count === 0) {
          console.log(`📭 ${name}: empty`)
        }
      } catch (err) {
        console.warn(`❌ Error reading ${name}: ${err.message}`)
      }
    }
    
    await stopOrbitDB(orbitdb)
    console.log('✅ Persistence check complete')
    
  } catch (error) {
    console.error('❌ Error checking persistence:', error)
  }
}

checkPersistence()