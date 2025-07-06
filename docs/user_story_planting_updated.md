# 📖 User Story — "Planting the First Intention"

Field	Detail
Title	New player creates an Intention, begins a Blessing, and sees live attention tracking.
Actor	Truman (first-time user, invited via magic link)
Goal	Capture Truman's intention and start counting his presence without him needing to understand any advanced screens.
Pre-Conditions	• Truman is signed in (magic-link) • OrbitDB nodes running locally
Post-Conditions	• Intention document exists with one Blessing (status =potential) • One AttentionSwitch event logged • UI shows running timer


⸻

Narrative
	1.	Landing
Truman opens the app for the first time. The Home view simply lists "Create Intention" at the top and an empty feed below.
	2.	Create Intention
He taps Create Intention. A modal asks for:
Title → "Clear invasive eucalyptus from the mountain peak and replant with a native food forest."
Description → (optional, leaves blank)
⟶ Submit.
	3.	System Writes
	•	intentionsDB.put({ _id:'intention_001', title, status:'open', blessings:[], proofsOfService:[], createdBy:'truman', createdAt:Now })
	•	attentionSwitchesDB.add({ userId:'truman', intentionId:'intention_001', timestamp:Now })
	•	blessingsDB.put({ _id:'blessing_truman_001', userId:'truman', intentionId:'intention_001', attentionIndex:0, content:'', status:'potential', stewardId:'truman', timestamp:Now })
	•	intentionsDB.put(update with 'blessing_truman_001' pushed to blessings array)
	4.	Immediate Feedback
A confirmation panel appears:
Intention Planted
You're now focusing on "Clear invasive eucalyptus…"
Your Blessing is live. Time recording has begun.

A small pulsing dot (🟡) and a 00:00:00 timer start in the corner.
	5.	Passive Duration
Truman closes the app and hikes for three hours and forty-five minutes.
Because he never switched focus, no new AttentionSwitch entries are created; the original Blessing silently accumulates indices.
	6.	Switch Focus
Back at camp he re-opens the app, selects a different Intention ("Repair ridge fencing"), and taps Focus.
System adds:
attentionSwitchesDB.add({ userId:'truman', intentionId:'intention_fencing', timestamp:Now }).
	7.	Toast Notification
A toast slides in:
Attention Switched
Your Blessing on "Clear invasive eucalyptus…" recorded 3 h 45 m of presence.
Now focusing on "Repair ridge fencing."
	8.	Effect on Data
	•	calcBlessingDuration('blessing_truman_001') returns 3 h 45 m whenever the UI asks.
	•	Blessing remains potential and still belongs to Truman until Proof of Service appears.

⸻

Acceptance Criteria
	•	✅ Intention object created with correct title and empty arrays.
	•	✅ One Blessing created, status potential, attentionIndex === 0.
	•	✅ Timer visible and counting milliseconds while focused.
	•	✅ Switching focus logs second AttentionSwitch and triggers toast summarizing duration.
	•	✅ No duration field persisted in DB. Calculation always derived via helper.

⸻

Notes for Designers / Engineers
	•	The modal can be as simple as Title + Submit for the PoC.
	•	Timer UI can poll every second or leverage requestAnimationFrame; accuracy not critical.
	•	Toast style follows the forest-green glass aesthetic with gold accents; disappears after 5 s.
	•	No need to surface Blessing text on creation—Truman can add narrative later via the Blessing composer.