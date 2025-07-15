// src/lib/types-v2.ts
// New data model based on 15-7-25 Proof of Concept Architecture

/* ============================================================
   Synchronicity Engine V2 · Core Data Types
   ============================================================ */

// 1. Attention Switch Event (Per User Log)
export interface AttentionSwitchEvent {
  index: number;                      // Natural number index (0, 1, 2, 3...)
  userId: string;                     // Who switched attention
  intentionId: string;                // What intention received focus
  timestamp: number;                  // When the switch occurred
}

// 2. Blessing (Derived from Attention Events)
export interface Blessing {
  index: number;                      // Corresponds to AttentionSwitchEvent index
  userId: string;                     // Who gave the attention
  intentionId: string;                // Which intention received attention
  status: "active" | "potential" | "given";
  content?: string;                   // Optional reflection text
  forgedIntoToken?: string;           // Token ID if this blessing was forged
}

// 3. Token of Gratitude
export interface TokenOfGratitude {
  tokenId: string;                    // Unique identifier
  forgedBy: string;                   // Who created this token
  forgedFrom: number[];               // Array of blessing indices
  intentionId: string;                // All blessings must be from same intention
  dedicatedTo: string;                // Intention this token honors
  honoringProof: string;              // Proof of Service this recognizes
  message?: string;                   // Personal message with the gift

  // Ownership chain
  parent: string;                     // User, Offering, Intention, Artifact, or Token ID
  steward: string;                    // Current controller of this token

  // Metadata
  totalDuration: number;              // Sum of constituent blessing durations
  forgedAt: number;                   // When token was created
}

// 4. Proof of Service
export interface ProofOfService {
  proofId: string;                    // Unique identifier
  intentionId: string;                // Which intention this serves
  submittedBy: string;                // Who provided the service
  title: string;                      // Brief description
  description: string;                // Detailed account
  media: string[];                    // IPFS hashes of photos/videos
  timestamp: number;                  // When proof was submitted
  tokensReceived: string[];           // Tokens gifted in recognition
}

// 5. Intention
export interface Intention {
  intentionId: string;                // Unique identifier
  title: string;                      // "Build solar dehydrator this weekend"
  description: string;                // Longer explanation
  createdBy: string;                  // Who created this intention
  createdAt: number;                  // When created
  status: "active" | "completed";

  // Community engagement
  activeBlessings: string[];          // Users currently focusing on this
  proofsOfService: string[];          // Evidence of progress
}

// Database Schema Types
export interface AttentionDatabase {
  // One attention log per user
  attentionSwitches: Map<string, AttentionSwitchEvent[]>;
}

export interface DocumentDatabase {
  // User blessing arrays
  blessings: Map<string, Blessing[]>;
  
  // Token registry
  tokensOfGratitude: Map<string, TokenOfGratitude>;
  
  // Intention registry
  intentions: Map<string, Intention>;
}

// Function Parameter Types
export interface SwitchAttentionParams {
  userId: string;
  newIntentionId: string;
  databases: any; // OrbitDB instance
}

export interface ForgeTokenParams {
  forgedBy: string;
  blessingIndices: number[];
  intentionId: string;
  honoringProof: string;
  message?: string;
  databases: any;
}

export interface PostProofParams {
  intentionId: string;
  submittedBy: string;
  title: string;
  description: string;
  media?: string[];
  databases: any;
}

export interface GiftTokenParams {
  tokenId: string;
  serviceProviderId: string;
  databases: any;
}

// Result Types
export interface SwitchAttentionResult {
  success: boolean;
  newIndex: number;
  error?: string;
}

export interface ForgeTokenResult {
  success: boolean;
  tokenId?: string;
  error?: string;
}

export interface PostProofResult {
  success: boolean;
  proofId?: string;
  error?: string;
}

export interface GiftTokenResult {
  success: boolean;
  error?: string;
}

// Notification Types
export interface NotificationEvent {
  userId: string;
  type: "proof_available" | "token_received" | "attention_milestone";
  intentionId?: string;
  proofId?: string;
  tokenId?: string;
  message: string;
  timestamp: number;
}

// Utility Types
export interface AttentionDuration {
  userId: string;
  index: number;
  duration: number;
  intentionId: string;
}

export interface EligibleTokenForger {
  userId: string;
  intentionId: string;
  potentialBlessings: number[];
  totalDuration: number;
}