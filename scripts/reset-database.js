#!/usr/bin/env node

/**
 * Database Reset Script
 * 
 * Wipes the current OrbitDB database and inserts fresh, consistent sample data
 * using the synchronicity engine functions to ensure proper data relationships.
 */

import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'
import path from 'path'
import { fileURLToPath } from 'url'
import { 
    setIntention, 
    switchAttention, 
    postProofOfService,
    assignBlessing,
    createOffering,
    bidOnOffering
} from '../dist/lib/synchronicity-engine.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Database configuration
const DB_DIRECTORY = './synchronicity-orbitdb'
const ADDRESSES_FILE = path.join(DB_DIRECTORY, 'addresses.json')

console.log('🔄 Starting database reset...')

async function resetDatabase() {
    let orbitdb = null
    let databases = null

    try {
        // Step 1: Stop any existing databases and clean up
        console.log('🗑️  Cleaning up existing database...')
        await rimraf(DB_DIRECTORY)
        console.log('✅ Existing database removed')

        // Step 2: Initialize fresh OrbitDB instance
        console.log('🚀 Initializing fresh OrbitDB...')
        orbitdb = await startOrbitDB({ 
            directory: DB_DIRECTORY,
            id: 'synchronicity-main' // Use same identity as main app
        })

        // Step 3: Create fresh databases
        databases = {
            intentions: await orbitdb.open('synchronicity-intentions', { type: 'documents' }),
            blessings: await orbitdb.open('synchronicity-blessings', { type: 'documents' }),
            attentionSwitches: await orbitdb.open('synchronicity-attention', { type: 'events' }),
            proofsOfService: await orbitdb.open('synchronicity-proofs', { type: 'events' }),
            offerings: await orbitdb.open('synchronicity-offerings', { type: 'documents' })
        }

        console.log('✅ Fresh databases created')

        // Step 3.5: Save database addresses for the main app to find
        console.log('💾 Saving database addresses...')
        const fs = await import('fs/promises')
        const addressFile = ADDRESSES_FILE
        
        const currentAddresses = {}
        for (const [name, db] of Object.entries(databases)) {
            currentAddresses[name] = db.address
        }
        
        try {
            await fs.mkdir(DB_DIRECTORY, { recursive: true })
            await fs.writeFile(addressFile, JSON.stringify(currentAddresses, null, 2))
            console.log('✅ Database addresses saved for main app')
        } catch (error) {
            console.warn('⚠️  Failed to save addresses:', error.message)
        }

        // Step 4: Insert sample data using engine functions
        await insertSampleData(databases)

        console.log('✅ Database reset completed successfully!')

    } catch (error) {
        console.error('❌ Error during database reset:', error)
        throw error
    } finally {
        // Clean up
        if (orbitdb) {
            await stopOrbitDB(orbitdb)
        }
    }
}

async function insertSampleData(databases) {
    console.log('📝 Inserting sample data using engine functions...')

    // Define base timestamp (1 week ago)
    const baseTime = Date.now() - (7 * 24 * 60 * 60 * 1000)
    
    // Step 1: Create intentions sequentially
    console.log('🎯 Creating intentions...')
    
    const intention1 = await setIntention({
        userId: 'alex_gardener',
        title: 'Plant 10 native seedlings in the community garden',
        blessingContent: 'I feel drawn to nurture new life and create more green spaces in our neighborhood.',
        databases,
        timestamp: baseTime
    })
    console.log(`✓ Created intention: ${intention1.intentionId}`)

    // Wait a moment between creations
    await sleep(100)

    const intention2 = await setIntention({
        userId: 'maria_composting', 
        title: 'Build one compost bin for the neighborhood',
        blessingContent: 'I envision waste becoming nourishment, completing the cycle of abundance.',
        databases,
        timestamp: baseTime + (1 * 60 * 60 * 1000) // 1 hour later
    })
    console.log(`✓ Created intention: ${intention2.intentionId}`)

    await sleep(100)

    const intention3 = await setIntention({
        userId: 'david_cleanup',
        title: 'Remove invasive plants from local park trail', 
        blessingContent: 'I see this trail clear and welcoming, allowing native plants to flourish.',
        databases,
        timestamp: baseTime + (2 * 60 * 60 * 1000) // 2 hours later
    })
    console.log(`✓ Created intention: ${intention3.intentionId}`)

    await sleep(100)

    const intention4 = await setIntention({
        userId: 'sarah_seeds',
        title: 'Collect and package native wildflower seeds',
        blessingContent: 'I imagine these seeds spreading beauty and supporting pollinators everywhere.',
        databases,
        timestamp: baseTime + (3 * 60 * 60 * 1000) // 3 hours later
    })
    console.log(`✓ Created intention: ${intention4.intentionId}`)

    await sleep(100)

    const intention5 = await setIntention({
        userId: 'tom_maintenance',
        title: 'Repair broken bird houses at nature center',
        blessingContent: 'I hold the vision of birds finding safe homes and raising their young here.',
        databases,
        timestamp: baseTime + (4 * 60 * 60 * 1000) // 4 hours later
    })
    console.log(`✓ Created intention: ${intention5.intentionId}`)

    // Step 2: Create attention switches and additional blessings
    console.log('💫 Creating attention switches and collaborative blessings...')

    // Emma's attention journey
    await switchAttention({
        userId: 'emma_volunteer',
        toIntentionId: intention1.intentionId,
        blessingContent: 'I feel called to nurture these seedlings and create more living spaces. My attention flows toward growth and healing.',
        databases,
        timestamp: baseTime + (1.5 * 60 * 60 * 1000) // 1.5 hours after start
    })
    console.log('✓ Emma joined tree planting')

    await sleep(100)

    // Jake's attention journey  
    await switchAttention({
        userId: 'jake_helper',
        toIntentionId: intention2.intentionId,
        blessingContent: 'I envision completing the cycle of abundance through composting. My attention supports transformation and renewal.',
        databases,
        timestamp: baseTime + (2.5 * 60 * 60 * 1000) // 2.5 hours after start
    })
    console.log('✓ Jake joined compost bin building')

    await sleep(100)

    // Truman's attention journey
    await switchAttention({
        userId: 'truman',
        toIntentionId: intention3.intentionId,
        blessingContent: 'I hold the vision of native plants thriving in this space. My attention supports the restoration of natural balance.',
        databases,
        timestamp: baseTime + (3.5 * 60 * 60 * 1000) // 3.5 hours after start
    })
    console.log('✓ Truman joined trail cleanup')

    await sleep(100)

    // Emma switches to seed collection
    await switchAttention({
        userId: 'emma_volunteer',
        toIntentionId: intention4.intentionId,
        blessingContent: 'I am drawn to preserving the genetic wisdom of these plants. My attention honors the continuity of life.',
        databases,
        timestamp: baseTime + (4.5 * 60 * 60 * 1000) // 4.5 hours after start
    })
    console.log('✓ Emma switched to seed collection')

    await sleep(100)

    // Jake switches to bird house repair
    await switchAttention({
        userId: 'jake_helper',
        toIntentionId: intention5.intentionId,
        blessingContent: 'I envision birds finding safe sanctuary here. My attention nurtures the creatures that share our world.',
        databases,
        timestamp: baseTime + (5.5 * 60 * 60 * 1000) // 5.5 hours after start
    })
    console.log('✓ Jake switched to bird house repair')

    await sleep(100)

    // Truman switches to tree planting
    await switchAttention({
        userId: 'truman',
        toIntentionId: intention1.intentionId,
        blessingContent: 'I see these seedlings growing into mighty trees. My attention supports their journey toward strength and beauty.',
        databases,
        timestamp: baseTime + (6.5 * 60 * 60 * 1000) // 6.5 hours after start
    })
    console.log('✓ Truman switched to tree planting')

    await sleep(100)

    // Step 3: Complete some work and create proofs of service
    console.log('📸 Creating proofs of service...')

    // Alex, Emma, and Truman complete work on tree planting
    await switchAttention({
        userId: 'alex_gardener',
        toIntentionId: null, // Switch away to complete the blessing
        blessingContent: 'I have poured my love and attention into this vision of abundant green life. The seedlings now carry this blessing forward.',
        databases,
        timestamp: baseTime + (7 * 60 * 60 * 1000) // 7 hours after start
    })

    await switchAttention({
        userId: 'emma_volunteer',
        toIntentionId: null, // Switch away to complete the blessing
        blessingContent: 'My attention has honored the wisdom held in these seeds. I trust they will bloom into beauty and abundance.',
        databases,
        timestamp: baseTime + (7.1 * 60 * 60 * 1000)
    })

    await switchAttention({
        userId: 'truman',
        toIntentionId: null, // Switch away to complete the blessing  
        blessingContent: 'My loving attention has been given to these growing trees. I see them flourishing and bringing life to this space.',
        databases,
        timestamp: baseTime + (7.2 * 60 * 60 * 1000)
    })

    const proof1 = await postProofOfService({
        intentionId: intention1.intentionId,
        by: ['alex_gardener', 'emma_volunteer', 'truman'],
        content: 'Successfully planted 10 native oak seedlings in the community garden northeast section. Added mulch and watered thoroughly.',
        media: ['ipfs://QmTreePlantingPhoto'],
        databases,
        timestamp: baseTime + (7.3 * 60 * 60 * 1000)
    })
    console.log(`✓ Created proof of service: ${proof1.proofId}`)

    await sleep(100)

    // Maria and Jake complete compost bin
    await switchAttention({
        userId: 'maria_composting',
        toIntentionId: null, // Switch away to complete the blessing
        databases,
        timestamp: baseTime + (8 * 60 * 60 * 1000)
    })

    const proof2 = await postProofOfService({
        intentionId: intention2.intentionId,
        by: ['maria_composting', 'jake_helper'],
        content: 'Completed building one wooden compost bin with 3 compartments. Added first layer of brown and green materials.',
        media: ['ipfs://QmCompostBinPhoto'],
        databases,
        timestamp: baseTime + (8.1 * 60 * 60 * 1000)
    })
    console.log(`✓ Created proof of service: ${proof2.proofId}`)

    await sleep(100)

    // David and Truman complete trail cleanup
    await switchAttention({
        userId: 'david_cleanup',
        toIntentionId: null, // Switch away to complete blessing
        blessingContent: 'I have focused my intention on clearing space for native plants to thrive. My attention blesses this restoration.',
        databases,
        timestamp: baseTime + (8.5 * 60 * 60 * 1000)
    })

    const proof3 = await postProofOfService({
        intentionId: intention3.intentionId,
        by: ['david_cleanup', 'truman'],
        content: 'Cleared 200 feet of park trail removing garlic mustard and other invasive plants. Filled 8 bags for disposal.',
        media: ['ipfs://QmTrailCleanupPhoto'],
        databases,
        timestamp: baseTime + (8.6 * 60 * 60 * 1000)
    })
    console.log(`✓ Created proof of service: ${proof3.proofId}`)

    await sleep(100)

    // Step 4: Assign some blessings for completed work
    console.log('🙏 Assigning blessings for completed service...')

    // Find the completed blessings to assign
    const allBlessings = await databases.blessings.all()
    const sageBlessing = allBlessings.find(doc => 
        doc.value.userId === 'sage_willow' && 
        doc.value.intentionId === intention1.intentionId &&
        doc.value.status === 'potential'
    )

    if (sageBlessing) {
        await assignBlessing({
            blessingId: sageBlessing.key,
            toUserId: 'luna_bright', // Assign to collaborator
            proofId: proof1.proofId,
            databases
        })
        console.log('✓ Assigned blessing from sage to luna')
    }

    await sleep(100)

    // Step 5: Create offerings
    console.log('🎪 Creating offerings...')

    const offering1 = await createOffering({
        hostId: 'sage_willow',
        title: 'Sacred Plant Medicine Workshop',
        description: 'Learn to work with local medicinal plants in ceremony and daily practice. We\'ll harvest, prepare tinctures, and share ancient plant wisdom.',
        time: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)).toISOString(), // 2 weeks from now
        place: 'Sacred Grove Sanctuary',
        slotsAvailable: 8,
        databases
    })
    console.log(`✓ Created offering: ${offering1.offeringId}`)

    await sleep(100)

    const offering2 = await createOffering({
        hostId: 'moon_sister',
        title: 'New Moon Ceremony & Sound Bath',
        description: 'Monthly gathering to honor the new moon with crystal singing bowls, intention setting, and community blessing circle.',
        time: new Date(Date.now() + (21 * 24 * 60 * 60 * 1000)).toISOString(), // 3 weeks from now
        place: 'Moonrise Meadow',
        slotsAvailable: 20,
        databases
    })
    console.log(`✓ Created offering: ${offering2.offeringId}`)

    await sleep(100)

    const offering3 = await createOffering({
        hostId: 'dawn_keeper',
        title: 'Seed Blessing & Exchange Circle',
        description: 'Seasonal gathering to bless heirloom seeds and share varieties. Includes seed starting workshop and community feast.',
        time: new Date(Date.now() + (28 * 24 * 60 * 60 * 1000)).toISOString(), // 4 weeks from now
        place: 'Community Garden Greenhouse',
        slotsAvailable: 25,
        databases
    })
    console.log(`✓ Created offering: ${offering3.offeringId}`)

    // Step 6: Add some bids to offerings
    console.log('💎 Adding token bids to offerings...')

    // Find some available blessings to use as tokens
    const availableBlessings = await databases.blessings.all()
    const forestBlessingDoc = availableBlessings.find(doc => 
        doc.value.userId === 'forest_heart' && doc.value.status === 'potential'
    )
    const lunaBlessingDoc = availableBlessings.find(doc => 
        doc.value.userId === 'luna_bright' && doc.value.status === 'given'
    )

    if (forestBlessingDoc) {
        await bidOnOffering({
            offeringId: offering1.offeringId,
            userId: 'forest_heart',
            topTokenId: forestBlessingDoc.key,
            databases
        })
        console.log('✓ Forest heart bid on plant medicine workshop')
    }

    await sleep(100)

    if (lunaBlessingDoc) {
        await bidOnOffering({
            offeringId: offering2.offeringId,
            userId: 'luna_bright', 
            topTokenId: lunaBlessingDoc.key,
            databases
        })
        console.log('✓ Luna bid on sound bath ceremony')
    }

    // Set current active user states - multiple users currently working
    await switchAttention({
        userId: 'truman',
        toIntentionId: intention5.intentionId,
        blessingContent: 'I am holding the vision of safe homes for our feathered friends. My attention supports their wellbeing and joy.',
        databases,
        timestamp: Date.now() - (15 * 60 * 1000) // 15 minutes ago
    })
    console.log('✓ Set truman as actively working on earth blessing ceremony')

    await sleep(100)

    await switchAttention({
        userId: 'luna_bright',
        toIntentionId: intention4.intentionId,
        blessingContent: 'I envision these seeds growing into beautiful wildflowers that will feed pollinators and bring joy to all who see them.',
        databases,
        timestamp: Date.now() - (8 * 60 * 1000) // 8 minutes ago
    })
    console.log('✓ Set luna as actively working on sound sanctuary')

    await sleep(100)

    await switchAttention({
        userId: 'forest_heart',
        toIntentionId: intention3.intentionId,
        blessingContent: 'I hold the intention of a clear, welcoming trail where native plants can reclaim their rightful place.',
        databases,
        timestamp: Date.now() - (3 * 60 * 1000) // 3 minutes ago
    })
    console.log('✓ Set forest_heart as actively working on seed library')

    console.log('\n🎉 Sample data insertion completed!')
    
    // Print summary
    const intentionsCount = (await databases.intentions.all()).length
    const blessingsCount = (await databases.blessings.all()).length
    const attentionSwitchesCount = []
    for await (const entry of databases.attentionSwitches.iterator()) {
        attentionSwitchesCount.push(entry)
    }
    const proofsCount = []
    for await (const entry of databases.proofsOfService.iterator()) {
        proofsCount.push(entry)
    }
    const offeringsCount = (await databases.offerings.all()).length

    console.log('\n📊 Database Summary:')
    console.log(`   Intentions: ${intentionsCount}`)
    console.log(`   Blessings: ${blessingsCount}`)
    console.log(`   Attention Switches: ${attentionSwitchesCount.length}`)
    console.log(`   Proofs of Service: ${proofsCount.length}`)
    console.log(`   Offerings: ${offeringsCount}`)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    resetDatabase()
        .then(() => {
            console.log('\n✅ Database reset completed successfully!')
            process.exit(0)
        })
        .catch((error) => {
            console.error('\n❌ Database reset failed:', error)
            process.exit(1)
        })
}

export { resetDatabase }