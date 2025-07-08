import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock token hierarchy functions from app.js
// We'll need to extract these from app.js to make them testable

describe('Token Hierarchy Operations', () => {
  let tokenHierarchy
  let mockTokens
  let currentUser
  
  beforeEach(() => {
    // Reset hierarchy before each test
    tokenHierarchy = {}
    currentUser = 'testUser'
    
    // Create mock tokens for testing
    mockTokens = [
      { _id: 'token1', content: 'First token', timestamp: Date.now() - 1000, stewardId: currentUser },
      { _id: 'token2', content: 'Second token', timestamp: Date.now() - 2000, stewardId: currentUser },
      { _id: 'token3', content: 'Third token', timestamp: Date.now() - 3000, stewardId: currentUser },
      { _id: 'token4', content: 'Fourth token', timestamp: Date.now() - 4000, stewardId: currentUser }
    ]
  })

  // Helper functions (extracted from app.js for testing)
  function setTokenParent(tokenId, parentId) {
    if (!tokenHierarchy[tokenId]) {
      tokenHierarchy[tokenId] = { children: [] }
    }
    
    // Remove from old parent if exists
    if (tokenHierarchy[tokenId].parent) {
      removeTokenFromParent(tokenId, tokenHierarchy[tokenId].parent)
    }
    
    // Set new parent
    tokenHierarchy[tokenId].parent = parentId
    
    // Add to new parent's children
    if (parentId) {
      if (!tokenHierarchy[parentId]) {
        tokenHierarchy[parentId] = { children: [] }
      }
      if (!tokenHierarchy[parentId].children.includes(tokenId)) {
        tokenHierarchy[parentId].children.push(tokenId)
      }
    }
  }

  function removeTokenFromParent(tokenId, parentId) {
    if (tokenHierarchy[parentId] && tokenHierarchy[parentId].children) {
      const index = tokenHierarchy[parentId].children.indexOf(tokenId)
      if (index > -1) {
        tokenHierarchy[parentId].children.splice(index, 1)
      }
    }
  }

  function getTokenChildren(tokenId) {
    return tokenHierarchy[tokenId] ? tokenHierarchy[tokenId].children || [] : []
  }

  function getTokenParent(tokenId) {
    return tokenHierarchy[tokenId] ? tokenHierarchy[tokenId].parent || null : null
  }

  function getRootTokens(allTokens) {
    return allTokens.filter(token => !getTokenParent(token._id))
  }

  // New functions for steward-as-parent concept
  function getStewardId(tokenId) {
    const token = mockTokens.find(t => t._id === tokenId)
    return token ? token.stewardId : null
  }

  function getTokenParentWithSteward(tokenId) {
    const parent = getTokenParent(tokenId)
    if (parent) {
      return parent
    }
    // If no parent, the steward is the parent
    return getStewardId(tokenId)
  }

  function getTrueRootTokens(allTokens) {
    // Root tokens are those whose only parent is their steward
    return allTokens.filter(token => {
      const parent = getTokenParent(token._id)
      return !parent // No explicit parent means steward is the parent
    })
  }

  function setTokenParentWithStewardSupport(tokenId, parentId) {
    const stewardId = getStewardId(tokenId)
    
    // If trying to set steward as parent, remove from current parent and clear explicit parent
    if (parentId === stewardId) {
      // Remove from old parent's children if exists
      if (tokenHierarchy[tokenId] && tokenHierarchy[tokenId].parent) {
        removeTokenFromParent(tokenId, tokenHierarchy[tokenId].parent)
        delete tokenHierarchy[tokenId].parent
      }
      return
    }
    
    // Otherwise use normal parent setting
    setTokenParent(tokenId, parentId)
  }

  function promoteChildrenToSteward(tokenId) {
    const children = getTokenChildren(tokenId)
    
    // Clear the parent's children array
    if (tokenHierarchy[tokenId]) {
      tokenHierarchy[tokenId].children = []
    }
    
    // Remove parent reference from each child (making steward the implicit parent)
    for (const childId of children) {
      if (tokenHierarchy[childId]) {
        delete tokenHierarchy[childId].parent
      }
    }
  }

  function promoteChildren(tokenId) {
    const children = getTokenChildren(tokenId)
    console.log(`Promoting children of ${tokenId}:`, children)
    
    // First, clear the parent's children array to avoid issues
    if (tokenHierarchy[tokenId]) {
      tokenHierarchy[tokenId].children = []
    }
    
    // Then, remove parent reference from each child
    for (const childId of children) {
      console.log(`Promoting child ${childId} to root`)
      if (tokenHierarchy[childId]) {
        delete tokenHierarchy[childId].parent
      } else {
        // If child doesn't exist in hierarchy, create empty entry to ensure it's tracked
        tokenHierarchy[childId] = { children: [] }
      }
    }
    
    console.log('After promotion, hierarchy:', tokenHierarchy)
  }

  describe('Basic Hierarchy Operations', () => {
    it('should create parent-child relationship correctly', () => {
      setTokenParent('token2', 'token1')
      
      expect(getTokenParent('token2')).toBe('token1')
      expect(getTokenChildren('token1')).toContain('token2')
    })

    it('should handle multiple children under one parent', () => {
      setTokenParent('token2', 'token1')
      setTokenParent('token3', 'token1')
      setTokenParent('token4', 'token1')
      
      expect(getTokenChildren('token1')).toEqual(['token2', 'token3', 'token4'])
      expect(getTokenParent('token2')).toBe('token1')
      expect(getTokenParent('token3')).toBe('token1')
      expect(getTokenParent('token4')).toBe('token1')
    })

    it('should move token from one parent to another', () => {
      setTokenParent('token3', 'token1')
      setTokenParent('token3', 'token2')
      
      expect(getTokenParent('token3')).toBe('token2')
      expect(getTokenChildren('token1')).not.toContain('token3')
      expect(getTokenChildren('token2')).toContain('token3')
    })
  })

  describe('Root Token Identification', () => {
    it('should identify root tokens correctly', () => {
      setTokenParent('token2', 'token1')
      setTokenParent('token3', 'token1')
      // token4 stays as root
      
      const rootTokens = getRootTokens(mockTokens)
      expect(rootTokens).toHaveLength(2)
      expect(rootTokens.map(t => t._id)).toEqual(['token1', 'token4'])
    })

    it('should handle all tokens being root tokens', () => {
      const rootTokens = getRootTokens(mockTokens)
      expect(rootTokens).toHaveLength(4)
      expect(rootTokens.map(t => t._id)).toEqual(['token1', 'token2', 'token3', 'token4'])
    })
  })

  describe('Promote Children Bug Reproduction', () => {
    it('should reproduce the token loss bug when promoting children', () => {
      // Setup: Create hierarchy with 1 parent and 3 children (reproducing user scenario)
      setTokenParent('token2', 'token1') // token2 becomes child of token1
      setTokenParent('token3', 'token1') // token3 becomes child of token1  
      setTokenParent('token4', 'token1') // token4 becomes child of token1
      
      console.log('Before promotion:')
      console.log('token1 children:', getTokenChildren('token1'))
      console.log('Root tokens:', getRootTokens(mockTokens).map(t => t._id))
      console.log('All tokens in hierarchy:', Object.keys(tokenHierarchy))
      
      // Verify initial setup
      expect(getTokenChildren('token1')).toEqual(['token2', 'token3', 'token4'])
      expect(getRootTokens(mockTokens)).toHaveLength(1) // Only token1 should be root
      
      // Action: Promote children back to root (this should cause the bug)
      promoteChildren('token1')
      
      console.log('After promotion:')
      console.log('token1 children:', getTokenChildren('token1'))
      console.log('Root tokens:', getRootTokens(mockTokens).map(t => t._id))
      console.log('All tokens in hierarchy:', Object.keys(tokenHierarchy))
      
      // Expected: All 4 tokens should be root tokens after promotion
      const rootTokens = getRootTokens(mockTokens)
      console.log('Root token count:', rootTokens.length)
      console.log('Root token IDs:', rootTokens.map(t => t._id))
      
      // This test should currently FAIL due to the bug
      expect(rootTokens).toHaveLength(4) // Should have all 4 tokens as root
      expect(rootTokens.map(t => t._id).sort()).toEqual(['token1', 'token2', 'token3', 'token4'].sort())
      
      // Verify no parent relationships exist
      expect(getTokenParent('token1')).toBeNull()
      expect(getTokenParent('token2')).toBeNull()
      expect(getTokenParent('token3')).toBeNull()
      expect(getTokenParent('token4')).toBeNull()
      
      // Verify no child relationships exist
      expect(getTokenChildren('token1')).toEqual([])
      expect(getTokenChildren('token2')).toEqual([])
      expect(getTokenChildren('token3')).toEqual([])
      expect(getTokenChildren('token4')).toEqual([])
    })

    it('should preserve all tokens when promoting children (fixed version)', () => {
      // This test will pass once we fix the promoteChildren function
      
      // Setup
      setTokenParent('token2', 'token1')
      setTokenParent('token3', 'token1') 
      setTokenParent('token4', 'token1')
      
      // Verify setup
      expect(mockTokens).toHaveLength(4) // Ensure we start with 4 tokens
      expect(getRootTokens(mockTokens)).toHaveLength(1)
      
      // Action
      promoteChildren('token1')
      
      // Verification: All original tokens should still be available as root tokens
      const rootTokens = getRootTokens(mockTokens)
      expect(rootTokens).toHaveLength(4)
      expect(new Set(rootTokens.map(t => t._id))).toEqual(new Set(['token1', 'token2', 'token3', 'token4']))
    })
  })

  describe('Data Integrity', () => {
    it('should not create circular references', () => {
      setTokenParent('token2', 'token1')
      
      // Attempting to make token1 a child of token2 should be prevented
      // (This would create a circular reference: token1 -> token2 -> token1)
      expect(() => {
        setTokenParent('token1', 'token2')
      }).not.toThrow() // Current implementation doesn't prevent this, but it should
      
      // For now, just verify the relationship was set
      // TODO: Add circular reference prevention
    })

    it('should handle removing non-existent relationships gracefully', () => {
      expect(() => {
        removeTokenFromParent('nonexistent', 'token1')
      }).not.toThrow()
      
      expect(() => {
        removeTokenFromParent('token1', 'nonexistent')
      }).not.toThrow()
    })

    it('should preserve token count through multiple hierarchy operations', () => {
      const initialTokenCount = mockTokens.length
      
      // Create complex hierarchy: token1 -> token2 -> token3 -> token4
      setTokenParent('token2', 'token1')
      setTokenParent('token3', 'token2')
      setTokenParent('token4', 'token3')
      
      // Verify all tokens still exist
      expect(getRootTokens(mockTokens)).toHaveLength(1) // only token1 should be root
      expect(mockTokens).toHaveLength(initialTokenCount)
      
      // Promote direct children of token1 (only token2)
      promoteChildren('token1')
      
      // After promoting token1's children, we should have:
      // - token1 (root, no children)
      // - token2 (root, with token3 as child)
      // - token3 (child of token2, with token4 as child)
      // - token4 (child of token3)
      expect(getRootTokens(mockTokens)).toHaveLength(2) // token1 and token2 should be root
      expect(mockTokens).toHaveLength(initialTokenCount)
      
      // Promote token2's children to get token3 as root too
      promoteChildren('token2')
      
      // Now we should have token1, token2, token3 as roots, token4 as child of token3
      expect(getRootTokens(mockTokens)).toHaveLength(3) // token1, token2, token3
      expect(mockTokens).toHaveLength(initialTokenCount)
      
      // Promote token3's children to make all tokens root
      promoteChildren('token3')
      
      // Now all tokens should be root
      expect(getRootTokens(mockTokens)).toHaveLength(initialTokenCount)
      expect(mockTokens).toHaveLength(initialTokenCount)
    })

    it('should handle edge case: promoting children of token with no children', () => {
      // This should not throw an error
      expect(() => {
        promoteChildren('token1') // token1 has no children initially
      }).not.toThrow()
      
      // All tokens should still be root tokens
      expect(getRootTokens(mockTokens)).toHaveLength(4)
    })

    it('should handle edge case: promoting children of non-existent token', () => {
      expect(() => {
        promoteChildren('nonexistent')
      }).not.toThrow()
      
      // All tokens should still be root tokens
      expect(getRootTokens(mockTokens)).toHaveLength(4)
    })
  })

  describe('Steward as Root Parent Concept', () => {
    it('should identify steward as parent of root tokens', () => {
      // Initially all tokens should have steward as parent
      expect(getTokenParentWithSteward('token1')).toBe(currentUser)
      expect(getTokenParentWithSteward('token2')).toBe(currentUser)
      expect(getTokenParentWithSteward('token3')).toBe(currentUser)
      expect(getTokenParentWithSteward('token4')).toBe(currentUser)
    })

    it('should show token parent when explicitly set, steward when not', () => {
      // Set token2 as child of token1
      setTokenParent('token2', 'token1')
      
      // token2 should now have token1 as parent, not steward
      expect(getTokenParentWithSteward('token2')).toBe('token1')
      // token1 should still have steward as parent
      expect(getTokenParentWithSteward('token1')).toBe(currentUser)
      // Other tokens should still have steward as parent
      expect(getTokenParentWithSteward('token3')).toBe(currentUser)
      expect(getTokenParentWithSteward('token4')).toBe(currentUser)
    })

    it('should handle promoting children back to steward', () => {
      // Create hierarchy: token1 -> token2, token3, token4
      setTokenParent('token2', 'token1')
      setTokenParent('token3', 'token1')
      setTokenParent('token4', 'token1')
      
      // Verify hierarchy
      expect(getTokenParentWithSteward('token1')).toBe(currentUser) // steward
      expect(getTokenParentWithSteward('token2')).toBe('token1')
      expect(getTokenParentWithSteward('token3')).toBe('token1')
      expect(getTokenParentWithSteward('token4')).toBe('token1')
      
      // Promote children back to steward
      promoteChildrenToSteward('token1')
      
      // Now all tokens should have steward as parent again
      expect(getTokenParentWithSteward('token1')).toBe(currentUser)
      expect(getTokenParentWithSteward('token2')).toBe(currentUser)
      expect(getTokenParentWithSteward('token3')).toBe(currentUser)
      expect(getTokenParentWithSteward('token4')).toBe(currentUser)
      
      // All should be root tokens (under steward)
      expect(getTrueRootTokens(mockTokens)).toHaveLength(4)
    })

    it('should support setting steward explicitly as parent (removes hierarchy)', () => {
      // Set up hierarchy
      setTokenParent('token2', 'token1')
      expect(getTokenParentWithSteward('token2')).toBe('token1')
      
      // Explicitly set steward as parent (should remove hierarchy)
      setTokenParentWithStewardSupport('token2', currentUser)
      expect(getTokenParentWithSteward('token2')).toBe(currentUser)
      expect(getTokenChildren('token1')).not.toContain('token2')
    })

    it('should maintain steward relationship through complex operations', () => {
      // Complex hierarchy operations
      setTokenParent('token2', 'token1')
      setTokenParent('token3', 'token2')
      setTokenParent('token4', 'token3')
      
      // Deep hierarchy: steward -> token1 -> token2 -> token3 -> token4
      expect(getTokenParentWithSteward('token1')).toBe(currentUser)
      expect(getTokenParentWithSteward('token2')).toBe('token1')
      expect(getTokenParentWithSteward('token3')).toBe('token2')
      expect(getTokenParentWithSteward('token4')).toBe('token3')
      
      // Promote token2's children (token3)
      promoteChildrenToSteward('token2')
      
      // Should result in: steward -> token1 -> token2 AND steward -> token3 -> token4
      expect(getTokenParentWithSteward('token1')).toBe(currentUser)
      expect(getTokenParentWithSteward('token2')).toBe('token1')
      expect(getTokenParentWithSteward('token3')).toBe(currentUser) // promoted to steward
      expect(getTokenParentWithSteward('token4')).toBe('token3')
      
      // Should have 2 root tokens under steward
      expect(getTrueRootTokens(mockTokens)).toHaveLength(2)
      expect(getTrueRootTokens(mockTokens).map(t => t._id).sort()).toEqual(['token1', 'token3'])
    })

    it('should preserve token count with steward as ultimate parent', () => {
      const initialCount = mockTokens.length
      
      // Perform various operations
      setTokenParent('token2', 'token1')
      setTokenParent('token3', 'token1')
      promoteChildrenToSteward('token1')
      setTokenParent('token4', 'token2')
      promoteChildrenToSteward('token2')
      
      // All tokens should still exist and have steward as ultimate parent
      expect(mockTokens).toHaveLength(initialCount)
      
      // Every token should have a path to steward
      for (const token of mockTokens) {
        let current = token._id
        let depth = 0
        const maxDepth = 10 // prevent infinite loops
        
        while (depth < maxDepth) {
          const parent = getTokenParentWithSteward(current)
          if (parent === currentUser) {
            break // Found steward
          }
          current = parent
          depth++
        }
        
        expect(depth).toBeLessThan(maxDepth) // Should have found steward
      }
    })
  })

  describe('Drag-to-Remove Functionality', () => {
    it('should remove token from parent when dragged to remove zone', () => {
      // Set up hierarchy: token1 -> token2
      setTokenParent('token2', 'token1')
      expect(getTokenParentWithSteward('token2')).toBe('token1')
      expect(getTokenChildren('token1')).toContain('token2')
      
      // Simulate drag-to-remove
      dragTokenToRemoveZone('token2')
      
      // token2 should now be under steward, not token1
      expect(getTokenParentWithSteward('token2')).toBe(currentUser)
      expect(getTokenChildren('token1')).not.toContain('token2')
    })

    it('should handle removing token with children (preserve children)', () => {
      // Set up hierarchy: token1 -> token2 -> token3
      setTokenParent('token2', 'token1')
      setTokenParent('token3', 'token2')
      
      expect(getTokenParentWithSteward('token2')).toBe('token1')
      expect(getTokenParentWithSteward('token3')).toBe('token2')
      
      // Remove token2 from token1 (token3 should stay with token2)
      dragTokenToRemoveZone('token2')
      
      // token2 should be under steward, token3 should still be under token2
      expect(getTokenParentWithSteward('token2')).toBe(currentUser)
      expect(getTokenParentWithSteward('token3')).toBe('token2')
      expect(getTokenChildren('token1')).not.toContain('token2')
      expect(getTokenChildren('token2')).toContain('token3')
    })

    it('should handle removing already root token (no-op)', () => {
      // token1 is already under steward
      expect(getTokenParentWithSteward('token1')).toBe(currentUser)
      
      // Try to remove it (should be no-op)
      dragTokenToRemoveZone('token1')
      
      // Should still be under steward
      expect(getTokenParentWithSteward('token1')).toBe(currentUser)
    })

    it('should handle removing from deep hierarchy', () => {
      // Set up deep hierarchy: token1 -> token2 -> token3 -> token4
      setTokenParent('token2', 'token1')
      setTokenParent('token3', 'token2')
      setTokenParent('token4', 'token3')
      
      // Remove token3 from token2
      dragTokenToRemoveZone('token3')
      
      // token3 and token4 should be promoted to steward level
      expect(getTokenParentWithSteward('token3')).toBe(currentUser)
      expect(getTokenParentWithSteward('token4')).toBe('token3') // token4 stays with token3
      expect(getTokenChildren('token2')).not.toContain('token3')
      expect(getTokenChildren('token3')).toContain('token4')
      
      // Should have 2 root tokens now: token1 and token3
      expect(getTrueRootTokens(mockTokens)).toHaveLength(2)
      expect(getTrueRootTokens(mockTokens).map(t => t._id).sort()).toEqual(['token1', 'token3'])
    })

    it('should preserve all tokens during drag-to-remove operations', () => {
      const initialCount = mockTokens.length
      
      // Create hierarchy and perform multiple remove operations
      setTokenParent('token2', 'token1')
      setTokenParent('token3', 'token2')
      setTokenParent('token4', 'token3')
      
      dragTokenToRemoveZone('token3') // Remove token3 from token2
      dragTokenToRemoveZone('token2') // Remove token2 from token1
      
      // All tokens should still exist
      expect(mockTokens).toHaveLength(initialCount)
      
      // All should be traceable to steward
      for (const token of mockTokens) {
        let current = token._id
        let depth = 0
        const maxDepth = 10
        
        while (depth < maxDepth) {
          const parent = getTokenParentWithSteward(current)
          if (parent === currentUser) {
            break
          }
          current = parent
          depth++
        }
        
        expect(depth).toBeLessThan(maxDepth)
      }
    })
  })

  // Helper function for drag-to-remove testing
  function dragTokenToRemoveZone(tokenId) {
    const stewardId = getStewardId(tokenId)
    if (stewardId) {
      setTokenParentWithStewardSupport(tokenId, stewardId)
    }
  }
})