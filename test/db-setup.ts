// test/db-setup.ts
import { startOrbitDB, stopOrbitDB } from '@orbitdb/liftoff'
import { rimraf } from 'rimraf'
import { generateTestDbDir, generateTestDbNames } from './test-helpers'

export class TestDatabaseManager {
  private dbDir: string
  private orbitdb: any
  private databases: any

  constructor(private testSuiteName: string) {
    this.dbDir = generateTestDbDir()
  }

  async setup() {
    this.orbitdb = await startOrbitDB({ directory: this.dbDir })
    
    const dbNames = generateTestDbNames(this.testSuiteName)
    
    this.databases = {
      intentions: await this.orbitdb.open(dbNames.intentions, { type: 'documents' }),
      blessings: await this.orbitdb.open(dbNames.blessings, { type: 'documents' }),
      attentionSwitches: await this.orbitdb.open(dbNames.attentionSwitches, { type: 'events' }),
      proofsOfService: await this.orbitdb.open(dbNames.proofsOfService, { type: 'events' }),
      offerings: await this.orbitdb.open(dbNames.offerings, { type: 'documents' })
    }

    return { orbitdb: this.orbitdb, databases: this.databases }
  }

  async cleanup() {
    if (this.orbitdb) {
      await stopOrbitDB(this.orbitdb)
    }
    
    // Force cleanup with retries
    let retries = 3
    while (retries > 0) {
      try {
        await rimraf(this.dbDir)
        await rimraf(`${this.dbDir}-ipfs`)
        break
      } catch (error) {
        retries--
        if (retries === 0) {
          console.warn(`Failed to cleanup ${this.dbDir}:`, error)
        } else {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }
  }
}