# 📖 User Story — "A Nomad Finds Shelter"

(Itinerary-matching → lodging Offering → token bid → acceptance)

Field	Detail
Title	A traveling steward is recommended lodging that aligns with their future way-point and pays for the stay with Tokens of Gratitude.
Actors	Sage (digital-nomad traveler), Marisol (host with spare eco-cabin)
Goal	Demonstrate the Itinerary Planner feeding the recommendation engine, bidding with tokens, and acceptance for lodging.
Pre-Conditions	• Sage's profile contains an upcoming way-point "Lisbon → 15 Sep – 30 Sep"  • Marisol has published an Offering "Eco-Cabin Hideaway" with 1 slot  • Both have active internet connection; OrbitDB nodes synced
Post-Conditions	• Sage booked the cabin 20–24 Sep  • Marisol receives Sage's Gratitude tokens (parent + children)  • Offering status = fulfilled / slot = 0


⸻

1. Traveler Sets Way-Point
	•	Sage opens Itinerary Planner and adds:
Location: Lisbon, Portugal
From: 2025-09-15
Until: 2025-09-30
Tags: #seeking-lodging

→ Client stores this in profile.itinerary[].
→ Engine writes to local store; no Orbit write needed.

⸻

2. Host Creates Lodging Offering

Marisol posts an Offering:

Field	Value
Title	Eco-Cabin Hideaway
Description	Off-grid cabin, 2 km from Sintra forest.
Time	2025-09-20T14:00 – 2025-09-24T10:00
Place	"Eco-Cabin · Sintra, PT" (lat/lon)
Slots	1
Ethics	Quiet hours 22:00-06:00, no single-use plastic.

→ offeringsDB.put(offering_eco_cabin).

⸻

3. Recommendation Engine

A background query runs:

// pseudo
offersWithinRadius(wayPoint.latlon, 50km)
  .filter(o => intersects(o.timeWindow, wayPoint.from, wayPoint.until))
  .filter(o => o.slotsAvailable > 0)

Result: Eco-Cabin Hideaway card appears in Sage's Dashboard Spotlight with "Matched to your Lisbon trip" tag.

⸻

4. Sage Bids with Tokens
	•	Sage clicks the card → sees details & Code of Ethics.
	•	Opens Token Wallet → drags a parent token + 2 children (total 6 h 30 m) into bid zone.
	•	offeringsDB.put(updated document with tokenOffers.push({ userId:'sage', topToken:'tok_sage_main' }))

Engine ranks Sage #1 (only bidder).

⸻

5. Host Accepts Bid

Marisol receives a notification, opens Offering detail, reviews Sage's profile & ethics agreement, then clicks Accept.

System calls:

flattenTokenTree('tok_sage_main', blessingsDB)
  .forEach(id => {
    const blessing = blessingsDB.get(id);
    blessing.value.stewardId = 'marisol';
    blessingsDB.put(blessing.value);
  });
offeringsDB.put({
  ...offering,
  status:'fulfilled',
  selectedStewards:['sage'],
  slotsAvailable:0
});

Toast to Sage:

"Your Gratitude basket has secured the Eco-Cabin, 20 – 24 Sep. See you soon!"

⸻

6. Trip Reminder & Check-In
	•	48 h before 20 Sep, Engine auto-notifies Sage with map pin & ethics reminder.
	•	On arrival day, Sage taps Check-in → opens new Blessing toward a service Intention ("Care for cabin during stay").

⸻

Acceptance Criteria
	•	✅ Dashboard shows matching Offering within radius + date overlap.
	•	✅ Bid recorded in tokenOffers[]; tokens remain with Sage until acceptance.
	•	✅ After acceptance, every token in tree has stewardId:'marisol'.
	•	✅ slotsAvailable decremented to 0; Offering marked fulfilled.
	•	✅ Itinerary remains unchanged for future matching.

⸻

Key API Calls

/* itinerary matching */
GET /offers?near=lat,lon&from=2025-09-15&to=2025-09-30

/* bid submission */
const offering = offeringsDB.get('offering_eco_cabin');
offering.value.tokenOffers.push(bid);
offeringsDB.put(offering.value);

/* acceptance */
flattenTokenTree(top).forEach(updateSteward)
offeringsDB.put({...offering, status:'fulfilled', selectedStewards:[...], slotsAvailable:0})


⸻

UI Snapshot References

Step	Screen
Way-point entry	profile_setup.html itinerary table
Recommendation card	home_dashboard.html Spotlight grid
Offering detail & bid	offering_detail.html
Acceptance toast	pattern from attention_switch_toast.html


⸻

This story illustrates end-to-end use of the Itinerary Planner and token-based lodging exchange—demonstrating the Engine's power to weave nomads and hosts through gratitude.