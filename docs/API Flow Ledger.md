# 🔄 Synchronicity Engine — API Flow Ledger

<!-- path: /docs/api_flows.md -->

"Every call, every write, a footstep in the forest of data."

This document enumerates the server-side and client-side sequences required to exercise every mechanic in the proof-of-concept.
Use them as ready-made acceptance tests or Postman collections.

⸻

Index of Flows
	1.	Create Intention
	2.	Switch Attention
	3.	Add Blessing (return to same Intention)
	4.	Post Proof of Service
	5.	Assign Blessing Token
	6.	Create Offering + Bid with Token Tree
	7.	Accept Winning Bids
	8.	Donate Artifact (Temple)
	9.	Request Sub-Steward Window
	10.	Approve Sub-Steward Request

⸻

1 · Create Intention

Step	Method/DB	Payload / Action
1	intentionsDB.put	{ _id, title, status:'open', blessings:[], proofsOfService:[], attachedTokens:[], createdBy, createdAt }
2	attentionSwitchesDB.add	{ userId, intentionId, timestamp }
3	blessingsDB.put	{ _id, userId, intentionId, content, attentionIndex:index0, status:'potential', stewardId:userId, timestamp }
4	intentionsDB.put	update with blessingId pushed to blessings array
5	Emit Event	intention:created → UI opens "Intention Planted" panel


⸻

2 · Switch Attention

Step	Method	Note
1	attentionSwitchesDB.add	{ userId, intentionId:newTarget, timestamp }
2	UI	Compute duration for previous Blessing: calcBlessingDuration()
3	UI Toast	"Blessing recorded X h Y m. Now focusing on Z."

No DB update to Blessing required; only new index is appended.

⸻

3 · Add Blessing (when returning)

Step	Method/DB	Payload
1	blessingsDB.put	new potential Blessing (same user, same intention)
2	intentionsDB.put	update with new blessingId pushed to blessings array
3	attentionSwitchesDB.add	start index for new Blessing


⸻

4 · Post Proof of Service

Step	Method	Payload
1	proofsOfServiceDB.add	{ _id, intentionId, by:[userIds], content, media[], timestamp }
2	intentionsDB.put	update with proofId pushed to proofsOfService array
3	Event	proof:new → notify all potential Blessing stewards


⸻

5 · Assign Blessing Token

Step	Method	Notes
1	blessingsDB.put	Set status:'given', stewardId:<receiver>, proofId
2	Event	token:assigned → update both users' wallets


⸻

6 · Create Offering

Step	Method/DB	Payload
1	offeringsDB.put	{ _id, title, description, time?, place?, slotsAvailable, tokenOffers:[], selectedStewards:[], status:'open' }
2	Event	offering:created → local dashboards

Bid with Token Tree

Step	Method	Payload
1	offeringsDB.put	tokenOffers.push({userId, topToken}) in updated document
2	Event	offering:bid → steward dashboard


⸻

7 · Accept Winning Bids

Step	Loop over top bids	Action
a	flattenTokenTree(topToken)	returns full IDs
b	blessingsDB.put	each token stewardId = offeringHost (full document update)
c	Accumulate selectedStewards	
d	decrement slotsAvailable	
e	offeringsDB.put	if slots==0 → status:'fulfilled'
f	Event	confirmation to winners; revert unaccepted bids


⸻

8 · Donate Artifact

Step	Method	Payload
1	artifactsDB.put	{ _id, name, stewardId:original, location, ethicsCode, accessType:'by_request' }
2	Event	artifact:donated → Sherd list refresh


⸻

9 · Request Sub-Steward Window

Step	Method	Payload
1	subStewardRequestsDB.add	{ artifactId, requestedBy, start, end, gratitudeOffering:[topToken], intent, agreementToEthics:true, timestamp }
2	Event	Notify original steward


⸻

10 · Approve Sub-Steward Request

Step	Method	Payload
1	flattenTokenTree(topToken)	transfer each token stewardId = requester
2	subStewardAssignmentsDB.add	{ artifactId, stewardId, assignedBy, start, end, tokensReceived:[ids] }
3	Event	confirm to requester; update artifact calendar


⸻

Event Summary Table

Event Name	Trigger	UI Component
intention:created	new Intention	Spotlight grid refresh
attention:switch	switch	Toast & current Blessing card
blessing:potential	new Blessing	"Assign later" prompt
proof:new	proof added	Notifications list
token:assigned	token transfer	Wallet & Intention Detail
offering:bid	bid added	Ranked list updates
offering:fulfilled	slots hit 0	Offering card status
artifact:donated	new artifact	Sherd map pin
artifact:request	sub-steward ask	Steward alert


⸻

Usage
	•	Implement each flow as a client hook (e.g., useCreateIntention()) wrapping OrbitDB calls.
	•	For backend e-mail invite, only two endpoints are needed: POST /invite and GET /magic-link?token=.

Confirm understanding and ask for clarifications before you code.