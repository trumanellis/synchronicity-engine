# Synchronicity Engine - Complete Guide

*"A ledger of presence, a marketplace of gratitude, a loom where intention, action, and stewardship intertwine."*

---

# Overview

The Synchronicity Engine transforms collective attention into a currency of gratitude. Time spent in presence becomes transferable value. Service creates reciprocal flows. Communities self-organize through intention and appreciation.

This document serves as the complete technical specification and implementation guide for the proof-of-concept.

---

# Core Concepts

## The Fundamentals

**Blessings are the gaps between AttentionSwitch events.**

Each user has ONE continuous timeline of AttentionSwitch events. Each gap between switches represents a Blessing. Duration is NEVER stored - only calculated by looking at the next event.

```
User Timeline:  [Switch]----Blessing----[Switch]----Blessing----[Switch]----[Now]
                Intention A  (Index 0)    Intention B  (Index 1)    Intention C
                10:00am                   10:45am                   11:30am
                
Blessing 0: 45 minutes on Intention A
Blessing 1: 45 minutes on Intention B  
Blessing 2: Still accumulating on Intention C...
```

## Canon of Primitives

| Primitive | Essence | Database |
|-----------|---------|----------|
| **Intention** | A living intention that invites collective energy | intentionsDB |
| **Blessing** | A span of attention; becomes a Token of Gratitude | blessingsDB |
| **Proof of Service** | Verifiable evidence an action advanced an Intention | proofsOfServiceDB |
| **AttentionSwitch** | Timestamp marking focus changes | attentionSwitchesDB |
| **Offering** | Limited opportunity bid on with token baskets | offeringsDB |
| **Artifact** | Shared resource stewarded via time-windows | artifactsDB |

## Blessing Status Flow

1. **active** - Currently accumulating time (only ONE per user globally)
2. **potential** - Completed time span, available to assign
3. **given** - Transferred to service provider

## Key Behaviors

- **Multiple Blessings Per Intention**: Users can return to an Intention multiple times, each creating a NEW Blessing with a NEW index
- **Selective Rewarding**: Give some time spans but not others, incentivizing quality service
- **Time is Derived**: All durations calculated live from AttentionSwitch differences

---

# Data Architecture

## Core Data Types

```typescript
// Intention - A living intention that collects Blessings and Proofs
interface IntentionDoc {
  _id: string;                     // "intention_001"
  title: string;
  blessings: string[];             // Blessing IDs
  proofsOfService: string[];       // Proof IDs
  attachedTokens: string[];        // Boosting tokens
  status: "open" | "closed";
  createdBy: string;
  createdAt: number;
}

// Blessing - A span of attention that becomes a Token of Gratitude
interface BlessingDoc {
  _id: string;                     // "blessing_truman_001"
  userId: string;
  intentionId: string;
  attentionIndex: number;          // Index into user's attention timeline
  content: string;
  timestamp: number;
  status: "potential" | "active" | "given";
  stewardId: string;               // Current holder
  parentId?: string;               // For hierarchical tokens
  children?: string[];
  proofId?: string;
}

// Proof of Service - Evidence of completed work
interface ProofDoc {
  _id: string;
  intentionId: string;
  by: string[];                    // userIds who did the work
  content: string;
  media: string[];                 // IPFS links
  timestamp: number;
}

// Attention Switch - Timeline events
interface AttentionSwitch {
  userId: string;
  intentionId: string;
  timestamp: number;
}

// Offering - Limited opportunities
interface OfferingDoc {
  _id: string;
  title: string;
  description: string;
  time?: string;                   // ISO date-time
  place?: string;
  slotsAvailable: number;
  tokenOffers: OfferBid[];
  selectedStewards: string[];
  status: "open" | "fulfilled";
}

interface OfferBid {
  userId: string;
  topToken: string;                // Parent token of basket
}

// Artifact - Shared resources
interface ArtifactDoc {
  _id: string;
  name: string;
  stewardId: string;               // Original steward
  location: { lat: number; lon: number; radius_km: number };
  ethicsCode: string;
  accessType: "by_request" | "public" | "invite_only";
}
```

## Database Structure

```typescript
interface Databases {
  intentions: any;         // Documents DB
  blessings: any;          // Documents DB
  offerings: any;          // Documents DB
  artifacts: any;          // Documents DB
  attentionSwitches: any;  // Events DB (append-only)
  proofsOfService: any;    // Events DB
}
```

## Data Relationships

```
intentionsDB
 ├─ blessings[] ─▶ blessingsDB
 │                 ├─ children[] (hierarchy)
 │                 └─ proofId? ─▶ proofsOfServiceDB
 ├─ proofsOfService[] ─▶ proofsOfServiceDB
 └─ attachedTokens[] ─▶ blessingsDB (boosts)

offeringsDB
 ├─ tokenOffers[].topToken ─▶ blessingsDB
 └─ selectedStewards[] (userIds)
```

---

# Core Operations

## 1. Create Intention Flow

**What happens when a user creates their first intention:**

1. `intentionsDB.put()` - Create intention document
2. `attentionSwitchesDB.add()` - Log attention switch event
3. `blessingsDB.put()` - Create active blessing
4. `intentionsDB.put()` - Update intention with blessing reference

```javascript
// System writes
intentionsDB.put({
  _id: 'intention_001',
  title: 'Clear invasive eucalyptus',
  blessings: ['blessing_truman_001'],
  proofsOfService: [],
  attachedTokens: [],
  status: 'open',
  createdBy: 'truman',
  createdAt: Date.now()
});

attentionSwitchesDB.add({
  userId: 'truman',
  intentionId: 'intention_001',
  timestamp: Date.now()
});

blessingsDB.put({
  _id: 'blessing_truman_001',
  userId: 'truman',
  intentionId: 'intention_001',
  attentionIndex: 0,
  content: '',
  status: 'active',
  stewardId: 'truman',
  timestamp: Date.now()
});
```

## 2. Switch Attention Flow

**When user changes focus to different intention:**

1. Previous blessing changes status to 'potential'
2. New `AttentionSwitch` event logged
3. New active blessing created for target intention
4. UI calculates and displays previous blessing duration

```javascript
// Duration calculation (never stored)
function calcBlessingDuration(blessing, userId, attentionSwitchesDB) {
  const userHistory = getUserAttentionHistory(userId, attentionSwitchesDB);
  const startEvent = userHistory[blessing.attentionIndex];
  const nextEvent = userHistory[blessing.attentionIndex + 1];
  
  const startTime = startEvent.timestamp;
  const endTime = nextEvent?.timestamp ?? Date.now();
  
  return endTime - startTime;
}
```

## 3. Proof of Service & Token Assignment

**When work is completed and tokens are assigned:**

1. Post proof with evidence
2. Assign potential blessings to service providers
3. Tokens transfer stewardship

```javascript
// Post proof
proofsOfServiceDB.add({
  _id: 'proof_001',
  intentionId: 'intention_001',
  by: ['rafael'],
  content: 'Cleared 50 eucalyptus trees',
  media: ['ipfs://QmProofImage'],
  timestamp: Date.now()
});

// Assign blessing
blessingsDB.put({
  ...blessing,
  status: 'given',
  stewardId: 'rafael',
  proofId: 'proof_001'
});
```

## 4. Offering & Marketplace Flow

**How limited opportunities work with token bidding:**

1. Create offering with limited slots
2. Users bid with token baskets
3. Host accepts highest-value bids
4. Token trees transfer to host

```javascript
// Bid ranking by total duration
function rankBids(offering, blessingsDB, attentionSwitchesDB) {
  return offering.tokenOffers
    .map(bid => ({
      ...bid,
      duration: calculateTokenTreeDuration(bid.topToken, blessingsDB, attentionSwitchesDB)
    }))
    .sort((a, b) => b.duration - a.duration);
}

// Accept winning bids
function acceptBids(topBids, hostId) {
  topBids.forEach(bid => {
    flattenTokenTree(bid.topToken, blessingsDB)
      .forEach(tokenId => {
        const token = blessingsDB.get(tokenId);
        token.value.stewardId = hostId;
        blessingsDB.put(token.value);
      });
  });
}
```

---

# Essential Utility Functions

```typescript
// Calculate blessing duration from attention switches
export function calcBlessingDuration(
  blessing: BlessingDoc,
  userId: string,
  attentionSwitchesDB: any,
  currentTime = Date.now()
): number {
  const userSwitches = getUserAttentionHistory(userId, attentionSwitchesDB);
  const startEvent = userSwitches[blessing.attentionIndex];
  const nextEvent = userSwitches[blessing.attentionIndex + 1];
  
  if (!startEvent) return 0;
  
  const startTime = startEvent.timestamp;
  const endTime = nextEvent?.timestamp ?? currentTime;
  
  return endTime - startTime;
}

// Flatten hierarchical token trees
export function flattenTokenTree(
  topTokenId: string,
  blessingsDB: any,
  visited = new Set<string>()
): string[] {
  if (visited.has(topTokenId)) return [];
  visited.add(topTokenId);

  const tokenEntry = blessingsDB.get(topTokenId);
  if (!tokenEntry) return [];
  
  const token = tokenEntry.value;
  const children = (token.children ?? []) as string[];
  
  return [topTokenId, ...children.flatMap(id => 
    flattenTokenTree(id, blessingsDB, visited)
  )];
}

// Calculate total gratitude potential
export function gratitudePotential(
  intention: IntentionDoc,
  blessingsDB: any,
  attentionSwitchesDB: any,
  currentTime = Date.now()
): number {
  // Sum live blessings (active + potential)
  const liveBlessings = intention.blessings
    .map(id => blessingsDB.get(id))
    .filter(entry => entry)
    .map(entry => entry.value)
    .filter(b => b.status === 'active' || b.status === 'potential');

  const liveTotal = liveBlessings
    .map(b => calcBlessingDuration(b, b.userId, attentionSwitchesDB, currentTime))
    .reduce((a, b) => a + b, 0);

  // Add attached token boosts
  const boostTotal = (intention.attachedTokens ?? [])
    .map(id => totalTokenDuration(id, blessingsDB, attentionSwitchesDB, currentTime))
    .reduce((a, b) => a + b, 0);

  return liveTotal + boostTotal;
}

// Format duration for display
export function formatDuration(ms: number): string {
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${m}m`;
}
```

---

# User Journey Examples

## Story 1: "Planting the First Intention"

**Truman (first-time user) creates an intention and begins tracking attention:**

1. **Landing** - Opens app, sees "Create Intention" 
2. **Create** - Enters: "Clear invasive eucalyptus from the mountain peak"
3. **System Response** - Creates intention, blessing, attention switch
4. **Feedback** - "Intention Planted" confirmation with live timer
5. **Time Passes** - Hikes for 3h 45m (app closed, time accumulates)
6. **Switch Focus** - Returns, switches to "Repair ridge fencing"
7. **Toast** - "Your Blessing recorded 3 h 45 m of presence"

## Story 2: "Token Marketplace"

**Annabelle hosts yoga with 3 slots, 5 bidders compete:**

1. **Create Offering** - "Sunrise Yoga" with 3 available slots
2. **Bidding** - 5 users bid with token baskets of varying durations
3. **Ranking** - System ranks by total gratitude value automatically
4. **Selection** - Annabelle accepts top 3 bids (Rafael 8h40m, Elias 6h10m, Freya 4h30m)
5. **Transfer** - All tokens in winning baskets transfer to Annabelle
6. **Event** - Yoga happens, new communal intention created

## Story 3: "Sharing Sacred Space"

**Temple donation and sub-steward request flow:**

1. **Donation** - Truman donates "Temple of Água Lila" to shared registry
2. **Discovery** - Rafael finds temple, requests 7-hour window for dance ceremony
3. **Offering** - Rafael offers parent token + 3 children (8h40m total gratitude)
4. **Approval** - Truman reviews and accepts request
5. **Transfer** - Rafael's entire token tree transfers to Truman
6. **Access** - Calendar shows reserved window, Rafael gets access

---

# Technical Implementation

## Current Status (June 2025)

**✅ Completed:**
- Modern TypeScript project with Vite + OrbitDB v3.x
- Complete test suite covering all core mechanics
- All utility functions implemented and tested
- Data schemas finalized

**🔲 Next Steps:**
- Electron integration (2-3 days)
- React UI implementation (3-4 days)
- Magic link authentication (1-2 days)
- Glass morphism styling and polish (2-3 days)

## OrbitDB Implementation Details

```typescript
// Database types
const DB_TYPES = {
  // Documents DBs (support put/get operations)
  intentionsDB: 'documents',
  blessingsDB: 'documents',
  offeringsDB: 'documents',
  
  // Events DBs (append-only logs)
  attentionSwitchesDB: 'events',
  proofsOfServiceDB: 'events'
}

// Update pattern for documents
const intention = await intentionsDB.get(intentionId);
intention.value.blessings.push(blessingId);
await intentionsDB.put(intention.value); // Replace entire document
```

## Architecture Recommendations

```javascript
// Electron main process
async function initializeOrbitDB() {
  const orbitdb = await startOrbitDB({ directory: './orbitdb' });
  
  const databases = {
    intentions: await orbitdb.open('intentions', { type: 'documents' }),
    blessings: await orbitdb.open('blessings', { type: 'documents' }),
    attentionSwitches: await orbitdb.open('attention', { type: 'events' })
  };
  
  // Set up IPC handlers
  ipcMain.handle('synchronicity:createIntention', async (e, params) => {
    return await createIntention({ ...params, databases });
  });
}

// React hooks pattern
export function useIntentions() {
  const [intentions, setIntentions] = useState<IntentionDoc[]>([]);
  
  useEffect(() => {
    window.orbitdb.intentions.all().then(setIntentions);
    window.orbitdb.on('intentions:update', setIntentions);
  }, []);
  
  return intentions;
}
```

---

# User Interface Design

## Visual Ethos

| Aspect | Specification |
|--------|---------------|
| **Palette** | Forest #103825, Moss #2c6142, Earth #5a4634, Gold #d4b550 |
| **Style** | Glass morphism with blur effects and light-leak overlays |
| **Typography** | Inter for UI, Georgia italic for quotes |
| **Icons** | Fluent/Phosphor outline at 24px |

## Key Interface Components

### Blessing Constellation ⭐
Radial star-map of user's tokens:
- **Nodes** = parent tokens, **Satellites** = children
- **States**: active (pulsing gold), potential (soft moss), given (light streak animation)
- **Interaction**: Drag-lasso to attach to intentions or bid in offerings

### Season & Moon Timeline 🌙
Horizontal strip showing blessing durations:
- Segmented by equinox/solstice markers and lunar cycles
- Each blessing patch inherits intention color, width = duration
- Hover shows tooltip and highlights corresponding intention

### Undoable Attention Toast 💬
Slide-in notification after focus changes:
- Shows last span duration (e.g., "3h 45m")
- **Undo** button (5s timeout) to cancel switch
- Forest-green glass aesthetic with gold accents

### Potential Basket Drawer 📦
Right-edge drawer for unassigned blessings:
- Lists potential blessings sorted oldest→newest
- Each tile shows text, duration, drag handle
- Toggle with swipe (mobile) or Shift key (desktop)

## Screen Structure

| Screen | Components |
|--------|------------|
| **Home Dashboard** | Spotlight grid, notifications, edge widget |
| **Token Wallet** | Blessing constellation, potential basket drawer |
| **Intention Detail** | Timeline panel, blessing composer |
| **Offering Detail** | Quantum slot visuals, ranked bid list |

---

# Authentication & Security

## Magic Link Flow

1. **Invite** - Existing user submits friend's email
2. **Send Link** - Server generates JWT, emails one-time URL
3. **Landing** - New user clicks link, JWT stored in localStorage
4. **Profile Setup** - Display name, avatar, itinerary
5. **Subsequent visits** - JWT in Authorization header

```javascript
// Server endpoint
app.post("/invite", async (req, res) => {
  const { email } = req.body;
  const userId = uuid();
  const token = jwt.sign({ sub: userId, invite: true }, SECRET, { expiresIn: "24h" });
  const link = `https://app.synchro.dev/magic-link?token=${token}`;
  await sendEmail(email, "Your Synchronicity invite", `Click → ${link}`);
  res.json({ ok: true });
});

// Client handling
const token = new URLSearchParams(location.search).get("token");
localStorage.setItem("synchro_jwt", token);
navigate("/profile-setup");
```

---

# Glossary

| Term | Definition |
|------|------------|
| **Intention** | A living intention that collects Blessings and Proofs of Service |
| **Blessing** | A span of attention toward an Intention, becomes a Token of Gratitude |
| **Token of Gratitude** | A transferable blessing that may nest hierarchically |
| **Gratitude Potential** | Sum of blessing durations + attached token boosts |
| **Attention Switch** | Timestamp when user changes focus between intentions |
| **Proof of Service** | Verifiable evidence that work advanced an intention |
| **Offering** | Limited opportunity bid on with token baskets |
| **Artifact** | Shared resource (temple, tool) stewarded via time-windows |
| **Steward** | Current holder of a token, intention, or artifact |
| **Sherd** | "Shared Resource Shed" - registry of available artifacts |

---

*The Synchronicity Engine transforms collective attention into a currency of gratitude, enabling communities to self-organize through intention and appreciation.*

**Last Updated:** July 02, 2025