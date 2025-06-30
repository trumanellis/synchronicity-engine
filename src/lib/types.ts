// src/lib/types.ts

/* ============================================================
   Synchronicity Engine · Core Data Types
   ============================================================ */

export interface PrayerDoc {
  _id: string;                     // "prayer_001" - OrbitDB requires _id
  title: string;
  blessings: string[];             // ordered Blessing IDs
  proofsOfService: string[];       // Proof IDs
  attachedTokens: string[];        // Boosting token parent IDs
  status: "open" | "closed";
  createdBy: string;               // userId
  createdAt: number;               // timestamp
}

export interface BlessingDoc {
  _id: string;                     // "blessing_truman_001" - OrbitDB requires _id
  userId: string;                  // author
  prayerId: string;
  attentionIndex: number;          // Single index into user's attention log
  content: string;                 // text of the blessing
  timestamp: number;               // when attention started
  status: "active" | "potential" | "given";
  stewardId: string;               // current holder (changes on assign)
  parentId?: string;               // optional hierarchical parent
  children?: string[];             // optional child blessing IDs
  proofId?: string;                // fulfilled via this proof
}

export interface ProofDoc {
  _id: string;                     // "proof_abc" - OrbitDB requires _id
  prayerId: string;
  by: string[];                    // userIds
  content: string;
  media: string[];                 // IPFS / URL list
  timestamp: number;
}

export interface AttentionSwitch {
  userId: string;
  prayerId: string;
  timestamp: number;
}

export interface OfferingDoc {
  _id: string;                     // "offering_001" - OrbitDB requires _id
  title: string;
  description: string;
  time?: string;                   // ISO date-time (optional)
  place?: string;                  // human location or lat/long
  slotsAvailable: number;
  tokenOffers: OfferBid[];         // bids waiting
  selectedStewards: string[];      // userIds granted slots
  status: "open" | "fulfilled";
}

export interface OfferBid {
  userId: string;
  topToken: string;                // parent token representing basket
}

export interface ArtifactDoc {
  _id: string;                     // "artifact_temple_agua_lila" - OrbitDB requires _id
  name: string;
  stewardId: string;               // Original Steward
  location: { lat: number; lon: number; radius_km: number };
  ethicsCode: string;
  accessType: "by_request" | "public" | "invite_only";
}

export interface SubStewardRequest {
  artifactId: string;
  requestedBy: string;
  start: string;                   // ISO
  end: string;                     // ISO
  gratitudeOffering: string[];     // topToken IDs
  intent: string;
  agreementToEthics: boolean;
  timestamp: number;
}

export interface SubStewardAssignment {
  artifactId: string;
  stewardId: string;               // approved user
  assignedBy: string;              // original steward
  start: string;
  end: string;
  tokensReceived: string[];        // accepted token IDs
}

// Database collection type mapping
export interface Databases {
  prayers: any;           // Documents DB
  blessings: any;         // Documents DB
  offerings: any;         // Documents DB
  artifacts: any;         // Documents DB
  attentionSwitches: any; // Events DB
  proofsOfService: any;   // Events DB
  subStewardRequests: any; // Events DB
  subStewardAssignments: any; // Events DB
}