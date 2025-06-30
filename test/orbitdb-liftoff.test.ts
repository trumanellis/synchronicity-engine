// test/orbitdb-liftoff.test.ts
import { describe, it, expect, afterEach } from 'vitest'
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'

describe('OrbitDB Liftoff Basic Test', () => {
  let orbitdb: any

  afterEach(async () => {
    // Clean up after each test
    if (orbitdb) {
      await stopOrbitDB(orbitdb)
    }
    await rimraf('./test-orbitdb')
    await rimraf('./test-ipfs')
  })

  it('should create and retrieve a simple value from OrbitDB', async () => {
    // Start OrbitDB using Liftoff - exactly as shown in the reference
    orbitdb = await startOrbitDB({ 
      directory: './test-orbitdb' 
    })
    
    // Open a database - using default 'events' type
    const db = await orbitdb.open('test-db')
    
    // Add data
    const hash = await db.add('hello world!')
    expect(hash).toBeDefined()
    expect(typeof hash).toBe('string')
    
    // Retrieve data
    const all = await db.all()
    expect(all).toHaveLength(1)
    expect(all[0].value).toBe('hello world!')
    expect(all[0].hash).toBe(hash)
    
    // Close the database
    await db.close()
  })

  it('should persist data between database sessions', async () => {
    // Start OrbitDB
    orbitdb = await startOrbitDB({ 
      directory: './test-orbitdb' 
    })
    
    // Create and populate database
    const db1 = await orbitdb.open('persist-test')
    await db1.add('persistent data')
    const address = db1.address
    await db1.close()
    
    // Reopen the same database by address
    const db2 = await orbitdb.open(address)
    const all = await db2.all()
    
    expect(all).toHaveLength(1)
    expect(all[0].value).toBe('persistent data')
    
    await db2.close()
  })

  it('should work with documents database type', async () => {
    // Start OrbitDB
    orbitdb = await startOrbitDB({ 
      directory: './test-orbitdb' 
    })
    
    // Open a documents database
    const db = await orbitdb.open('docs-test', { 
      type: 'documents' 
    })
    
    // Put a document
    const doc = { 
      _id: 'user1', 
      name: 'Alice', 
      age: 30 
    }
    const hash = await db.put(doc)
    expect(hash).toBeDefined()
    
    // Get the document
    const retrieved = await db.get('user1')
    expect(retrieved).toBeDefined()
    expect(retrieved.key).toBe('user1')
    expect(retrieved.value).toEqual(doc)
    expect(retrieved.hash).toBe(hash)
    
    // Query all documents
    const all = await db.all()
    expect(all).toHaveLength(1)
    expect(all[0].key).toBe('user1')
    expect(all[0].value).toEqual(doc)
    expect(all[0].hash).toBe(hash)
    
    await db.close()
  })
})