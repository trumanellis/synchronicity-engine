<!-- path: /docs/data_schemas.ts -->


/* ============================================================
   Synchronicity Engine · Core Data Schemas (PoC)
   ------------------------------------------------------------
   • Every interface mirrors an OrbitDB document.
   • Timestamps = milliseconds since epoch.
   • All durations are derived at read-time (never stored).
   • Children arrays enable hierarchical Token trees.
   • OrbitDB requires _id field for documents databases.
   ============================================================ */

/* ----------  1. Intention  ---------- */
export interface IntentionDoc {
  _id: string;                     // "intention_001" - OrbitDB requires _id
  title: string;
  blessings: string[];             // ordered Blessing IDs
  proofsOfService: string[];       // Proof IDs
  attachedTokens: string[];        // Boosting token parent IDs
  status: "open" | "closed";
  createdBy: string;               // userId
  createdAt: number;               // ts
}

/* ----------  2. Blessing (Token of Gratitude)  ---------- */
export interface BlessingDoc {
  _id: string;                     // "blessing_truman_001" - OrbitDB requires _id
  userId: string;                  // author
  intentionId: string;
  attentionIndex: number;          // Single index into attentionSwitches log
  content: string;                 // text of the blessing
  timestamp: number;               // first attention entry
  status: "potential" | "active" | "given";
  stewardId: string;               // current holder (changes on assign)
  parentId?: string;               // optional hierarchical parent
  children?: string[];             // child token IDs
  proofId?: string;                // fulfilled via this proof
}

/* ----------  3. Proof of Service  ---------- */
export interface ProofDoc {
  _id: string;                     // "proof_abc" - OrbitDB requires _id
  intentionId: string;
  by: string[];                    // userIds
  content: string;
  media: string[];                 // IPFS / URL list
  timestamp: number;
}

/* ----------  4. Attention Switch Event  ---------- */
export interface AttentionSwitch {
  userId: string;
  intentionId: string;
  timestamp: number;
}

/* ----------  5. Offering  ---------- */
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

/* ----------  6. Artifact (Shared Resource)  ---------- */
export interface ArtifactDoc {
  _id: string;                     // "artifact_temple_agua_lila" - OrbitDB requires _id
  name: string;
  stewardId: string;               // Original Steward
  location: { lat: number; lon: number; radius_km: number };
  ethicsCode: string;
  accessType: "by_request" | "public" | "invite_only";
}

/* ----------  7. Stewardship Windows  ---------- */
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

/* ----------  8. User Profile Snapshot (client only)  ---------- */
export interface UserProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  itinerary?: WayPoint[];
}

export interface WayPoint {
  location: string;                // "Lisbon"
  from: string;                    // ISO
  until: string;                   // ISO
  tags?: string[];
}

/* ----------  9. Database Collection Type Mapping  ---------- */
export interface Databases {
  intentions: any;         // Documents DB
  blessings: any;          // Documents DB
  offerings: any;          // Documents DB
  artifacts: any;          // Documents DB
  attentionSwitches: any;  // Events DB
  proofsOfService: any;    // Events DB
  subStewardRequests: any; // Events DB
  subStewardAssignments: any; // Events DB
}