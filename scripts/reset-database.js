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
} from '../src/lib/synchronicity-engine.js'

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
        userId: 'sage_willow',
        title: 'Restore the sacred grove with native medicinal plants',
        blessingContent: 'May this grove become a sanctuary where ancient plant wisdom flows through every leaf and root.',
        databases,
        timestamp: baseTime
    })
    console.log(`✓ Created intention: ${intention1.intentionId}`)

    // Wait a moment between creations
    await sleep(100)

    const intention2 = await setIntention({
        userId: 'river_stone', 
        title: 'Build community meditation labyrinth',
        blessingContent: 'Each stone placed with intention, creating pathways for deep contemplation and inner peace.',
        databases,
        timestamp: baseTime + (1 * 60 * 60 * 1000) // 1 hour later
    })
    console.log(`✓ Created intention: ${intention2.intentionId}`)

    await sleep(100)

    const intention3 = await setIntention({
        userId: 'dawn_keeper',
        title: 'Establish seed library for heirloom varieties', 
        blessingContent: 'Preserving the genetic wisdom of our ancestors, ensuring abundance for future generations.',
        databases,
        timestamp: baseTime + (2 * 60 * 60 * 1000) // 2 hours later
    })
    console.log(`✓ Created intention: ${intention3.intentionId}`)

    await sleep(100)

    const intention4 = await setIntention({
        userId: 'cosmic_heart',
        title: 'Create healing sound bath sanctuary',
        blessingContent: 'Sacred frequencies to restore harmony between body, mind, and spirit.',
        databases,
        timestamp: baseTime + (3 * 60 * 60 * 1000) // 3 hours later
    })
    console.log(`✓ Created intention: ${intention4.intentionId}`)

    await sleep(100)

    const intention5 = await setIntention({
        userId: 'moon_sister',
        title: 'Organize monthly earth blessing ceremony',
        blessingContent: 'Calling in the sacred feminine to bless our beautiful earth with love and healing.',
        databases,
        timestamp: baseTime + (4 * 60 * 60 * 1000) // 4 hours later
    })
    console.log(`✓ Created intention: ${intention5.intentionId}`)

    // Step 2: Create attention switches and additional blessings
    console.log('💫 Creating attention switches and collaborative blessings...')

    // Luna's attention journey
    await switchAttention({
        userId: 'luna_bright',
        toIntentionId: intention1.intentionId,
        blessingContent: 'Grateful to tend this sacred space where healing plants will flourish for generations.',
        databases,
        timestamp: baseTime + (1.5 * 60 * 60 * 1000) // 1.5 hours after start
    })
    console.log('✓ Luna joined sacred grove intention')

    await sleep(100)

    // Forest heart's attention journey  
    await switchAttention({
        userId: 'forest_heart',
        toIntentionId: intention3.intentionId,
        blessingContent: 'Each seed carries the memory of earth\'s abundance. Honored to be a keeper of this legacy.',
        databases,
        timestamp: baseTime + (2.5 * 60 * 60 * 1000) // 2.5 hours after start
    })
    console.log('✓ Forest heart joined seed library intention')

    await sleep(100)

    // Truman's attention journey
    await switchAttention({
        userId: 'truman',
        toIntentionId: intention2.intentionId,
        blessingContent: 'The labyrinth calls to me - creating sacred paths for inner reflection.',
        databases,
        timestamp: baseTime + (3.5 * 60 * 60 * 1000) // 3.5 hours after start
    })
    console.log('✓ Truman joined labyrinth intention')

    await sleep(100)

    // Luna switches to sound sanctuary
    await switchAttention({
        userId: 'luna_bright',
        toIntentionId: intention4.intentionId,
        blessingContent: 'Sound and vibration heal the deep places within us.',
        databases,
        timestamp: baseTime + (4.5 * 60 * 60 * 1000) // 4.5 hours after start
    })
    console.log('✓ Luna switched to sound sanctuary')

    await sleep(100)

    // Forest heart switches to earth ceremony
    await switchAttention({
        userId: 'forest_heart',
        toIntentionId: intention5.intentionId,
        blessingContent: 'The earth speaks through ceremony, and we listen with grateful hearts.',
        databases,
        timestamp: baseTime + (5.5 * 60 * 60 * 1000) // 5.5 hours after start
    })
    console.log('✓ Forest heart switched to earth ceremony')

    await sleep(100)

    // Truman switches to sacred grove
    await switchAttention({
        userId: 'truman',
        toIntentionId: intention1.intentionId,
        blessingContent: 'Joining the plant medicine work with deep reverence.',
        databases,
        timestamp: baseTime + (6.5 * 60 * 60 * 1000) // 6.5 hours after start
    })
    console.log('✓ Truman switched to sacred grove')

    await sleep(100)

    // Step 3: Complete some work and create proofs of service
    console.log('📸 Creating proofs of service...')

    // Sage, Luna, and Truman complete work on the sacred grove
    await switchAttention({
        userId: 'sage_willow',
        toIntentionId: null, // Switch away to complete the blessing
        blessingContent: 'Work completed with deep gratitude for the plant spirits.',
        databases,
        timestamp: baseTime + (7 * 60 * 60 * 1000) // 7 hours after start
    })

    await switchAttention({
        userId: 'luna_bright',
        toIntentionId: null, // Switch away to complete the blessing
        blessingContent: 'The sound work is complete, resonating with plant frequencies.',
        databases,
        timestamp: baseTime + (7.1 * 60 * 60 * 1000)
    })

    await switchAttention({
        userId: 'truman',
        toIntentionId: null, // Switch away to complete the blessing  
        blessingContent: 'Sacred grove work complete - the plants are singing.',
        databases,
        timestamp: baseTime + (7.2 * 60 * 60 * 1000)
    })

    const proof1 = await postProofOfService({
        intentionId: intention1.intentionId,
        by: ['sage_willow', 'luna_bright', 'truman'],
        content: 'Planted 12 native medicinal herbs including echinacea, calendula, and nettle. Created sacred spiral pattern with sound healing integration.',
        media: ['ipfs://QmSacredGrovePhoto1', 'ipfs://QmSacredGrovePhoto2'],
        databases,
        timestamp: baseTime + (7.3 * 60 * 60 * 1000)
    })
    console.log(`✓ Created proof of service: ${proof1.proofId}`)

    await sleep(100)

    // River stone and truman make progress on labyrinth
    await switchAttention({
        userId: 'river_stone',
        toIntentionId: null, // Switch away to complete the blessing
        databases,
        timestamp: baseTime + (8 * 60 * 60 * 1000)
    })

    const proof2 = await postProofOfService({
        intentionId: intention2.intentionId,
        by: ['river_stone', 'truman'],
        content: 'Laid foundation stones for meditation labyrinth in seven-circuit classical pattern.',
        media: ['ipfs://QmLabyrinthProgress'],
        databases,
        timestamp: baseTime + (8.1 * 60 * 60 * 1000)
    })
    console.log(`✓ Created proof of service: ${proof2.proofId}`)

    await sleep(100)

    // Forest heart completes seed library work
    await switchAttention({
        userId: 'forest_heart',
        toIntentionId: null, // Switch away to complete blessing
        blessingContent: 'Seeds organized and blessed for future abundance.',
        databases,
        timestamp: baseTime + (8.5 * 60 * 60 * 1000)
    })

    const proof3 = await postProofOfService({
        intentionId: intention3.intentionId,
        by: ['forest_heart', 'dawn_keeper'],
        content: 'Catalogued and organized 150 heirloom seed varieties. Created seed blessing ceremony space.',
        media: ['ipfs://QmSeedLibraryPhoto'],
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
        blessingContent: 'Honored to support the sacred work of earth healing.',
        databases,
        timestamp: Date.now() - (15 * 60 * 1000) // 15 minutes ago
    })
    console.log('✓ Set truman as actively working on earth blessing ceremony')

    await sleep(100)

    await switchAttention({
        userId: 'luna_bright',
        toIntentionId: intention4.intentionId,
        blessingContent: 'Returning to sound healing work with renewed focus.',
        databases,
        timestamp: Date.now() - (8 * 60 * 1000) // 8 minutes ago
    })
    console.log('✓ Set luna as actively working on sound sanctuary')

    await sleep(100)

    await switchAttention({
        userId: 'forest_heart',
        toIntentionId: intention3.intentionId,
        blessingContent: 'Continuing seed library curation with love.',
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