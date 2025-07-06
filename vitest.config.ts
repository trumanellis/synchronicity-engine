import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Increase timeout for IPFS operations
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run tests sequentially to avoid OrbitDB database conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
})
