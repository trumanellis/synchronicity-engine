// src/lib/artifact-system.ts
// This file contains the artifact management system for the Synchronicity Engine
// It handles creation, stewardship requests, and time-window management

import type { 
  ArtifactDoc, 
  SubStewardRequest, 
  SubStewardAssignment,
  BlessingDoc 
} from './types'

interface CreateArtifactParams {
  stewardId: string
  name: string
  location: {
    lat: number
    lon: number
    radius_km: number
  }
  ethicsCode: string
  accessType: 'by_request' | 'public' | 'invite_only'
  databases: any
  timestamp?: number
}

export async function createArtifact({
  stewardId,
  name,
  location,
  ethicsCode,
  accessType,
  databases,
  timestamp = Date.now()
}: CreateArtifactParams) {
  const artifactId = `artifact_${stewardId}_${timestamp}`
  
  const artifact: ArtifactDoc = {
    _id: artifactId,
    name,
    stewardId,
    location,
    ethicsCode,
    accessType
  }
  
  await databases.artifacts.put(artifact)
  
  return { artifactId }
}

interface RequestSubStewardshipParams {
  artifactId: string
  requestedBy: string
  start: string
  end: string
  gratitudeOffering: string[]
  intent: string
  agreementToEthics: boolean
  databases: any
  timestamp?: number
}

export async function requestSubStewardship({
  artifactId,
  requestedBy,
  start,
  end,
  gratitudeOffering,
  intent,
  agreementToEthics,
  databases,
  timestamp = Date.now()
}: RequestSubStewardshipParams) {
  const requestId = `request_${requestedBy}_${timestamp}`
  
  const request: SubStewardRequest = {
    _id: requestId,
    artifactId,
    requestedBy,
    start,
    end,
    gratitudeOffering,
    intent,
    agreementToEthics,
    timestamp
  }
  
  await databases.subStewardRequests.add(request)
  
  return { requestId }
}

interface ApproveSubStewardshipParams {
  requestId: string
  artifactId: string
  approvedBy: string
  databases: any
  timestamp?: number
}

export async function approveSubStewardship({
  requestId,
  artifactId,
  approvedBy,
  databases,
  timestamp = Date.now()
}: ApproveSubStewardshipParams) {
  // Find the request
  let request: SubStewardRequest | null = null
  for await (const entry of databases.subStewardRequests.iterator()) {
    if (entry.value._id === requestId) {
      request = entry.value
      break
    }
  }
  
  if (!request) {
    return {
      success: false,
      error: 'Request not found'
    }
  }
  
  // Check if time slot is available
  const available = await getArtifactAvailability({
    artifactId,
    start: request.start,
    end: request.end,
    databases
  })
  
  if (!available) {
    return {
      success: false,
      error: 'Time slot conflicts with existing assignment'
    }
  }
  
  // Flatten token tree and transfer ownership
  const tokensToTransfer = await flattenTokenTree(
    request.gratitudeOffering[0], // For now, just handle first token
    databases
  )
  
  // Transfer each token to the artifact owner
  for (const tokenId of tokensToTransfer) {
    const blessing = await databases.blessings.get(tokenId)
    if (blessing) {
      blessing.value.stewardId = approvedBy
      await databases.blessings.put(blessing.value)
    }
  }
  
  // Create assignment
  const assignmentId = `assignment_${request.requestedBy}_${timestamp}`
  const assignment: SubStewardAssignment = {
    _id: assignmentId,
    artifactId,
    stewardId: request.requestedBy,
    assignedBy: approvedBy,
    start: request.start,
    end: request.end,
    tokensReceived: tokensToTransfer,
    timestamp
  }
  
  await databases.subStewardAssignments.add(assignment)
  
  return {
    success: true,
    assignmentId,
    tokensTransferred: tokensToTransfer
  }
}

interface GetArtifactAvailabilityParams {
  artifactId: string
  start: string
  end: string
  databases: any
}

export async function getArtifactAvailability({
  artifactId,
  start,
  end,
  databases
}: GetArtifactAvailabilityParams): Promise<boolean> {
  const requestStart = new Date(start).getTime()
  const requestEnd = new Date(end).getTime()
  
  // Check all assignments for conflicts
  for await (const entry of databases.subStewardAssignments.iterator()) {
    const assignment: SubStewardAssignment = entry.value
    
    if (assignment.artifactId !== artifactId) {
      continue
    }
    
    const assignmentStart = new Date(assignment.start).getTime()
    const assignmentEnd = new Date(assignment.end).getTime()
    
    // Check for overlap
    if (requestStart < assignmentEnd && requestEnd > assignmentStart) {
      return false // Conflict found
    }
  }
  
  return true // No conflicts
}

// Helper function to flatten token tree (similar to offering system)
async function flattenTokenTree(
  topTokenId: string,
  databases: any,
  visited = new Set<string>()
): Promise<string[]> {
  if (visited.has(topTokenId)) return []
  visited.add(topTokenId)
  
  const token = await databases.blessings.get(topTokenId)
  if (!token) return []
  
  const blessing: BlessingDoc = token.value
  const children = blessing.children || []
  
  const childTokens = await Promise.all(
    children.map(childId => flattenTokenTree(childId, databases, visited))
  )
  
  return [topTokenId, ...childTokens.flat()]
}