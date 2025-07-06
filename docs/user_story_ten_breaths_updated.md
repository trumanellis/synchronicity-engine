# 📖 User Story — "Ten Breaths, Three Mats"

(Offering with 3 available slots, 5 competing Gratitude-bidders)

Field	Detail
Title	Host selects the richest Gratitude baskets to fill a limited yoga Offering.
Actors	Annabelle (host), five local players: Rafael, Elias, Freya, John, Leandro
Goal	Demonstrate bidding, ranking, and stewardship transfer when demand (>5) exceeds supply (3).
Pre-Conditions	• All six users exist • Each bidder already holds active Tokens (parents with nested children)
Post-Conditions	• Offering status = fulfilled • Three bidders become sub-stewards • Their entire token trees transfer to Annabelle • Unaccepted bids auto-revert


⸻

Narrative
	1.	Annabelle creates an Offering
Title: "Sunrise Yoga in the Cedar Temple"
Slots: 3
Time & Place: Saturday 06:00–07:30 · Agua Lila Deck
→ offeringsDB.put(...)
	2.	Bidders Discover the Offering
Engine pushes the card to local dashboards (≤25 km).

Bidder	Basket Composition	Total Duration
Rafael	parent + 3 children	8 h 40 m
Elias	parent + 2 children	6 h 10 m
Freya	single parent token	4 h 30 m
John	parent + 1 child	3 h 20 m
Leandro	single parent token	2 h 45 m

Each submits a bid:
offeringsDB.put(updated document with tokenOffers pushed)

	3.	Engine Ranks in Real-Time
UI sorts tokenOffers by totalTokenDuration(topToken).
	4.	Annabelle Reviews Bids
Offering detail shows 5 rows (highest first). She selects the top 3 (Rafael, Elias, Freya) and presses Accept.
	5.	System Transfers Stewardship
For each accepted bid:
flattenTokenTree(topToken) → iterate → blessingsDB.put(updated token with stewardId:'annabelle')
Update:
offeringsDB.put({selectedStewards:['rafael','elias','freya'], slotsAvailable:0, status:'fulfilled'})
	6.	Notifications
	•	Winners receive "You have a mat in Sunrise Yoga; your tokens have been transferred."
	•	John & Leandro receive "Your Gratitude basket was not selected and has been returned."
(Engine removes assignedToOffering flag on their bids.)
	7.	Yoga Occurs
On the morning of the practice, each attendee logs a new Blessing toward a fresh communal Intention ("Welcome the dawn in movement").

⸻

Acceptance Criteria
	•	✅offeringsDB.status flips to "fulfilled" once 3 accepts logged.
	•	✅selectedStewards.length === 3; slotsAvailable === 0.
	•	✅All tokens in winning parent trees show stewardId === 'annabelle'.
	•	✅Tokens of unselected bidders retain original stewardship.
	•	✅UI no longer allows further bids; card badge reads "Fulfilled".

⸻

System Calls Reference

// accept helper
function acceptBid(offer: OfferBid) {
  flattenTokenTree(offer.topToken, blessingsDB)
    .forEach(id => {
      const blessing = blessingsDB.get(id);
      blessing.value.stewardId = 'annabelle';
      blessingsDB.put(blessing.value);
    });
}


⸻

Notes for QA
	•	Simulate with seed data: ensure Rafael's basket > Elias > Freya > John > Leandro.
	•	Test rejection path: deselect Elias, accept John instead → totals and arrays update accordingly.