# OrbitDB for Windsurf - Complete Reference Guide

> This document serves as a comprehensive reference for Windsurf AI to understand OrbitDB's capabilities, patterns, and best practices when working on the Synchronicity Engine project.

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Installation & Setup](#installation--setup)
3. [Database Types](#database-types)
4. [Essential Code Patterns](#essential-code-patterns)
5. [Replication & Networking](#replication--networking)
6. [Access Control](#access-control)
7. [Storage Configuration](#storage-configuration)
8. [Performance & Optimization](#performance--optimization)
9. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

---

## Core Concepts

### What is OrbitDB?
OrbitDB is a **serverless, distributed, peer-to-peer database** that uses IPFS for data storage and Libp2p for automatic synchronization. It's an eventually consistent database using Merkle-CRDTs for conflict-free writes and merges.

### Key Architecture Components
- **IPFS/Helia**: Provides content-addressed storage and networking
- **Libp2p**: Handles peer-to-peer communication and pubsub
- **OrbitDB Core**: Database logic and CRDT operations
- **Manifest**: Database metadata stored in IPFS
- **OpLog**: Immutable operation log forming a Merkle-DAG

---

## Installation & Setup

### Basic Installation
```bash
npm install @orbitdb/core helia
```

### Essential Dependencies
```bash
npm install @orbitdb/core helia blockstore-level @chainsafe/libp2p-gossipsub
```

### Minimal Setup Pattern
```javascript
import { createLibp2p } from 'libp2p'
import { createHelia } from 'helia'
import { createOrbitDB } from '@orbitdb/core'
import { LevelBlockstore } from 'blockstore-level'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { identify } from '@libp2p/identify'

const Libp2pOptions = {
  services: {
    pubsub: gossipsub({
      allowPublishToZeroTopicPeers: true
    }),
    identify: identify()
  }
}

// Initialize with persistent storage
const blockstore = new LevelBlockstore('./ipfs/blocks')
const libp2p = await createLibp2p(Libp2pOptions)
const ipfs = await createHelia({ libp2p, blockstore })
const orbitdb = await createOrbitDB({ ipfs })

// Create/open database
const db = await orbitdb.open('my-database')
```

---

## Database Types

### 1. Events Database (Default)
**Use case**: Append-only logs, message queues, audit trails
```javascript
const eventsDB = await orbitdb.open('events-db') // defaults to 'events'
await eventsDB.add('hello world')
await eventsDB.add({ message: 'structured data', timestamp: Date.now() })
```

### 2. Documents Database
**Use case**: JSON document storage with indexed queries
```javascript
const docsDB = await orbitdb.open('docs-db', { type: 'documents' })
await docsDB.put({ _id: 'user1', name: 'Alice', age: 30 })
await docsDB.put({ _id: 'user2', name: 'Bob', age: 25 })
```

### 3. Key-Value Database
**Use case**: Simple key-value storage
```javascript
const kvDB = await orbitdb.open('kv-db', { type: 'keyvalue' })
await kvDB.put('user:123', { name: 'Charlie', status: 'active' })
const user = await kvDB.get('user:123')
```

### 4. Key-Value Indexed
**Use case**: Key-value with LevelDB indexing for faster queries
```javascript
const indexedKV = await orbitdb.open('indexed-kv', { type: 'keyvalue-indexed' })
await indexedKV.put('config:theme', 'dark')
```

---

## Essential Code Patterns

### Complete Database Lifecycle
```javascript
// Initialize OrbitDB
const orbitdb = await createOrbitDB({ ipfs, id: 'user1', directory: './orbitdb' })

// Open database with specific type and access control
const db = await orbitdb.open('my-app-db', { 
  type: 'documents',
  AccessController: IPFSAccessController({ write: ['*'] }) // public write
})

// Listen for updates from peers
db.events.on('update', async (entry) => {
  console.log('Database updated:', entry.payload)
  const allRecords = await db.all()
  console.log('Current state:', allRecords)
})

// Add data
await db.put({ _id: 'doc1', content: 'Hello World' })

// Query data
for await (const record of db.iterator()) {
  console.log(record)
}

// Cleanup
await db.close()
await orbitdb.stop()
await ipfs.stop()
```

### Database Address and Replication
```javascript
// Create database on peer 1
const db1 = await orbitdb1.open('shared-db')
console.log('Database address:', db1.address)
// Output: /orbitdb/zdpuB2aYUCnZ7YUBrDkCWpRLQ8ieUbqJEVRZEd5aDhJBDpBqj

// Connect to database on peer 2 using address
const db2 = await orbitdb2.open(db1.address)

// Data added to db1 will automatically replicate to db2
await db1.add('This will sync to peer 2')
```

### Error Handling Pattern
```javascript
try {
  const orbitdb = await createOrbitDB({ ipfs, directory: './orbitdb' })
  const db = await orbitdb.open('my-db')
  
  // Database operations
  await db.add('data')
  
} catch (error) {
  console.error('OrbitDB Error:', error.message)
  // Handle specific error types
  if (error.message.includes('Database is not open')) {
    // Handle concurrent access issues
  }
}
```

---

## Replication & Networking

### Peer Connection Example
```javascript
// Node.js peer setup
const initIPFSInstance = async () => {
  const libp2p = await createLibp2p(Libp2pOptions)
  return createHelia({ libp2p })
}

const ipfs1 = await initIPFSInstance()
const ipfs2 = await initIPFSInstance()

// Direct connection for faster sync
await ipfs2.libp2p.peerStore.save(ipfs1.libp2p.peerId, { 
  multiaddrs: ipfs1.libp2p.getMultiaddrs() 
})
await ipfs2.libp2p.dial(ipfs1.libp2p.peerId)

// Create OrbitDB instances
const orbitdb1 = await createOrbitDB({ ipfs: ipfs1, id: 'peer1', directory: './peer1' })
const orbitdb2 = await createOrbitDB({ ipfs: ipfs2, id: 'peer2', directory: './peer2' })
```

### Browser-to-Node Connection
```javascript
// Browser configuration
const options = {
  addresses: { listen: ['/webrtc'] },
  transports: [
    webSockets({ filter: all }),
    webRTC(),
    circuitRelayTransport({ discoverRelays: 1 })
  ],
  connectionEncrypters: [noise()],
  streamMuxers: [yamux()],
  services: { identify: identify() }
}
```

### Event Monitoring
```javascript
// Monitor peer connections and data updates
db.events.on('join', (peerId, heads) => {
  console.log('Peer joined:', peerId)
})

db.events.on('update', (entry) => {
  console.log('New data:', entry.payload.value)
})

db.events.on('write', (address, entry) => {
  console.log('Data written to:', address)
})
```

---

## Access Control

### Public Access (Anyone can write)
```javascript
import { IPFSAccessController } from '@orbitdb/core'

const publicDB = await orbitdb.open('public-db', {
  AccessController: IPFSAccessController({ write: ['*'] })
})
```

### Restricted Access (Specific users)
```javascript
import { Identities, IPFSAccessController } from '@orbitdb/core'

const identities = await Identities()
const userB = await identities.createIdentity({ id: 'userB' })

const restrictedDB = await orbitdb.open('restricted-db', {
  AccessController: IPFSAccessController({ 
    write: [orbitdb.identity.id, userB.id] 
  })
})
```

### Mutable Access Control
```javascript
import { OrbitDBAccessController } from '@orbitdb/core'

const dynamicDB = await orbitdb.open('dynamic-db', {
  AccessController: OrbitDBAccessController({ 
    write: [orbitdb.identity.id] 
  })
})

// Grant/revoke access dynamically
await dynamicDB.access.grant('write', 'newUserId')
await dynamicDB.access.revoke('write', 'removedUserId')
```

### Custom Access Controller
```javascript
const CustomAccessController = ({ allowedUsers }) => async ({ orbitdb, identities, address }) => {
  const canAppend = async (entry) => {
    const writerIdentity = await identities.getIdentity(entry.identity)
    if (!writerIdentity) return false
    
    return allowedUsers.includes(writerIdentity.id) || 
           allowedUsers.includes('*')
  }
  
  return { canAppend }
}

CustomAccessController.type = 'custom'
```

---

## Storage Configuration

### Memory Storage (Fast, Non-persistent)
```javascript
import { MemoryStorage } from '@orbitdb/core'

const memoryDB = await orbitdb.open('temp-db', {
  entryStorage: await MemoryStorage(),
  headsStorage: await MemoryStorage()
})
```

### Composed Storage (Speed + Persistence)
```javascript
import { MemoryStorage, IPFSBlockStorage, ComposedStorage } from '@orbitdb/core'

const fastStorage = await MemoryStorage()
const persistentStorage = await IPFSBlockStorage({ ipfs })
const composedStorage = await ComposedStorage(fastStorage, persistentStorage)

const hybridDB = await orbitdb.open('hybrid-db', {
  entryStorage: composedStorage
})
```

### Custom Storage Implementation
```javascript
const CustomStorage = async (params) => {
  const data = new Map()
  
  return {
    put: async (hash, value) => data.set(hash, value),
    get: async (hash) => data.get(hash),
    del: async (hash) => data.delete(hash),
    iterator: async function* () {
      for (const [hash, value] of data.entries()) {
        yield { hash, value }
      }
    },
    merge: async (other) => { /* merge logic */ },
    clear: async () => data.clear(),
    close: async () => { /* cleanup */ }
  }
}
```

---

## Performance & Optimization

### Efficient Querying
```javascript
// Use iterator with limits for large datasets
const recentEntries = []
for await (const record of db.iterator({ amount: 100 })) {
  recentEntries.push(record)
}

// Filter during iteration instead of loading all
const filteredResults = []
for await (const record of db.iterator()) {
  if (record.value.category === 'important') {
    filteredResults.push(record)
  }
  if (filteredResults.length >= 10) break // Limit results
}
```

### Batch Operations
```javascript
// Batch writes for better performance
const batchData = [
  { _id: 'doc1', content: 'First document' },
  { _id: 'doc2', content: 'Second document' },
  { _id: 'doc3', content: 'Third document' }
]

for (const doc of batchData) {
  await db.put(doc) // Each operation is atomic
}
```

### Sync Control
```javascript
// Open database without automatic sync
const manualSyncDB = await orbitdb.open('manual-sync', { 
  syncAutomatically: false 
})

// Manually trigger sync when needed
await manualSyncDB.sync()
```

---

## Common Pitfalls & Solutions

### 1. Database Concurrency Issues
**Problem**: Multiple processes accessing same database directory
```javascript
// ❌ Wrong - will cause conflicts
const orbitdb1 = await createOrbitDB({ directory: './orbitdb' })
const orbitdb2 = await createOrbitDB({ directory: './orbitdb' }) // Same directory!
```

**Solution**: Use unique directories per instance
```javascript
// ✅ Correct
const orbitdb1 = await createOrbitDB({ directory: './orbitdb/instance1' })
const orbitdb2 = await createOrbitDB({ directory: './orbitdb/instance2' })
```

### 2. Documents Database Requirements
**Problem**: Missing `_id` field in documents
```javascript
// ❌ Wrong - documents need _id field
await docsDB.put({ name: 'Alice', age: 30 })
```

**Solution**: Always include `_id` field
```javascript
// ✅ Correct
await docsDB.put({ _id: 'user1', name: 'Alice', age: 30 })
```

### 3. Undefined Values in IPLD
**Problem**: IPLD cannot encode `undefined`
```javascript
// ❌ Wrong - undefined will cause encoding errors
await db.put({ 
  _id: 'doc1', 
  name: 'Alice', 
  middleName: undefined  // This will fail
})
```

**Solution**: Exclude undefined fields or use null
```javascript
// ✅ Correct
const doc = { _id: 'doc1', name: 'Alice' }
if (middleName) doc.middleName = middleName
await db.put(doc)
```

### 4. Proper Resource Cleanup
**Problem**: Not cleaning up resources
```javascript
// ❌ Wrong - resources leak
const db = await orbitdb.open('temp-db')
// ... use database
// Process exits without cleanup
```

**Solution**: Always clean up
```javascript
// ✅ Correct
try {
  const db = await orbitdb.open('temp-db')
  // ... use database
} finally {
  await db.close()
  await orbitdb.stop()
  await ipfs.stop()
}
```

### 5. Events Database vs Documents Database
**Problem**: Using wrong database type for use case
```javascript
// ❌ Wrong for key-value operations
const db = await orbitdb.open('users') // Defaults to 'events'
await db.add({ userId: '123', name: 'Alice' }) // Can't efficiently query by userId
```

**Solution**: Choose appropriate database type
```javascript
// ✅ Correct for key-value operations
const db = await orbitdb.open('users', { type: 'documents' })
await db.put({ _id: '123', name: 'Alice' }) // Can efficiently get by _id
```

---

## OrbitDB Liftoff Integration

For the Synchronicity Engine project, you're using `@orbitdb/liftoff` which provides preconfigured instances:

```javascript
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'

// Simplified startup with automatic configuration
const orbitdb = await startOrbitDB({ 
  id: 'synchronicity-user',
  directory: './orbitdb-data' 
})

// Use normally
const prayersDB = await orbitdb.open('prayers', { type: 'documents' })
const blessingsDB = await orbitdb.open('blessings', { type: 'documents' })
const attentionDB = await orbitdb.open('attention-switches', { type: 'events' })

// Cleanup
await stopOrbitDB(orbitdb)
```

---

## Key Reminders for Windsurf

1. **Always use `@orbitdb/core`** - Never use the legacy `orbit-db` package
2. **Handle undefined fields** - IPLD encoding will fail with undefined values
3. **Use proper database types** - Documents for JSON objects, Events for append-only logs
4. **Include `_id` fields** - Required for documents databases
5. **Clean up resources** - Always close databases and stop OrbitDB/IPFS
6. **Test offline scenarios** - OrbitDB's strength is offline-first operation
7. **Use Liftoff patterns** - Leverage the simplified configuration from `@orbitdb/liftoff`
8. **Sort attention events** - Always sort by timestamp for duration calculations
9. **Handle CRDT conflicts** - Design data structures for eventual consistency
10. **Monitor peer connections** - Use event listeners for debugging network issues

This reference should help Windsurf understand OrbitDB's patterns and make informed recommendations for the Synchronicity Engine implementation.