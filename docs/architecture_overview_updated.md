# 🌲 Synchronicity Engine — Architecture Overview

<!-- path: /docs/architecture_overview.md -->

"A ledger of presence, a marketplace of gratitude, a loom where intention, action, and stewardship intertwine."

This document paints the whole forest in one glance:

⸻

1 · Canon of Primitives

Primitive	Essence	OrbitDB Collection
Intention	A living intention that invites collective energy.	intentionsDB
Blessing (= Token of Gratitude)	A span of attention + optional action; may nest inside other tokens.	blessingsDB
Proof of Service	Verifiable evidence an action advanced an Intention.	proofsOfServiceDB
AttentionSwitch	Timestamp marking the moment a user changes focus.	attentionSwitchesDB
Offering	A gift/opportunity with finite slots, bid on via tokens.	offeringsDB
Artifact	Physical/virtual asset (temple, tool) stewarded via time-windows.	artifactsDB
Sub-Steward Window	Temporary lease of stewardship.	subStewardAssignmentsDB

Invariant: Time is never stored as duration—only as differences between AttentionSwitch events.

⸻

2 · Data-Flow Rosetta

graph TD
  A(Create Intention) --> B{Switch Attention}
  B --> C(New Blessing: potential)
  C --> D[Live Clock • UI shows running duration]
  D -->|Switch| E{AttentionSwitch}
  E --> F[Compute span → store nothing]
  F --> G[Same Blessing updated (new index)]
  click A href "#create"
  click E href "#switch"


⸻

3 · Collection Relationships

intentionsDB
 ├─ blessings[]  ─▶ blessingsDB
 │                 ├─ children[]  (hierarchy)
 │                 └─ proofId? ─▶ proofsOfServiceDB
 ├─ proofsOfService[] ─▶ proofsOfServiceDB
 └─ attachedTokens[]  ─▶ blessingsDB (boost)

offeringsDB
 ├─ tokenOffers[].topToken ─▶ blessingsDB (parent nodes)
 └─ selectedStewards[]     (userIds)

artifactsDB
 └─ subSteward windows ─▶ subStewardAssignmentsDB


⸻

4 · Core Write Path Recipes

4.1 Create Intention
	1.	intentionsDB.put(intentionDoc)
	2.	attentionSwitchesDB.add({...})
	3.	blessingsDB.put({status:'potential'})
	4.	intentionsDB.update(push blessingId)

4.2 Attention Switch
	1.	New attentionSwitchesDB.add
	2.	UI calculates previous Blessing's span
duration = now – lastSwitchTimestamp
	3.	If Blessing status is still potential, keep accumulating indices.

4.3 Assign Token

blessingsDB.update({
  status:'active',
  stewardId: receiver,
  proofId
})

4.4 Accept Offering Bids
	1.	flattenTokenTree(topToken)
	2.	For each ID → blessingsDB.update(stewardId ← host)
	3.	offeringsDB.update({status:'fulfilled'})

⸻

5 · Calculations at Read-Time

function gratitudePotential(intentionId){
  const live = sum(liveBlessings(intentionId).map(calcDuration));
  const boosts = intentionsDB.get(intentionId).attachedTokens
        .map(calcDuration).reduce((a,b)=>a+b,0);
  return live + boosts;
}

All summary numbers (Potential, duration badges, bid totals) are derived on the fly; the DB never stores redundant hours.

⸻

6 · Event Bus (client-side)

Event	Fired When	Consumed By UI
attention:switch	user selects different Intention	Toast "Blessing recorded…"
proof:new	Proof added	Notify all potential-token holders
offering:bid	tokenOffer pushed	Offering steward sees ranked list refresh
artifact:request	sub-steward request added	Original steward dashboard alert


⸻

7 · Security & Auth
	•	Magic-Link e-mail → JWT → orbit-identity.
	•	First identity to sign a document is treated as Original Steward.
	•	Every write is signed; OrbitDB's CRDT merges gracefully.

⸻

8 · Deployment Anatomy (PoC)

/client   → Vite + Tailwind, connects via OrbitDB
/server   → Express for magic-link + simple mailgun
/orbitdb  → local databases or network peers


⸻

9 · Edge-Cases & Future Flags
	•	Nested token reassignment loops → prevent circular parentId.
	•	Concurrent Proofs → CRDT handles; UI de-dupes display.
	•	Spam intentions → upcoming "Temple of Listening" moderation layer (not in PoC).

⸻

📜 End-Note

This overview is designed for immediate engineering hand-off.
If any ambiguity remains, ask for clarification before coding.