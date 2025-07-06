# 📖 User Story — "Sharing the Temple"

(Artifact donation → sub-steward request → approval and token transfer)

Field	Detail
Title	A Temple is donated to the Sherd, another player requests a 1-day window, offers Gratitude tokens, and receives sub-stewardship.
Actors	Truman (Original Steward), Rafael (requester)
Goal	Walk through the full Artifact sharing cycle.
Pre-Conditions	• Truman already owns user profile • Temple artifact not yet in Engine • Rafael holds active Tokens (tok_raf_parent with 3 child tokens)
Post-Conditions	• Artifact appears in Sherd with one approved window • Rafael's token tree transfers to Truman • Calendar shows booked slot


⸻

Narrative
	1.	Temple Donation
Truman opens the Sherd screen → "Donate Artifact".
Form fields:
Name: Temple of Água Lila
Location: lat 40.7431, lon −8.0734, radius 20 km
Access: By request
Code of Ethics: (uploads markdown)
→ artifactsDB.put(artifact_temple_agua_lila)
The Artifact card now pins on local map.
	2.	Browsing the Sherd
Rafael sees Temple of Água Lila card. Clicks Request Use.
Modal:
Start: 2025-07-06 15:00Z
End:   2025-07-06 22:00Z
Intent: Ecstatic Dance Ceremony
Drag-drops parent token + 3 children (total 8 h 40 m).
Checks "I agree to ethics."
→ subStewardRequestsDB.add(request)
→ offering:artifact_request event to Truman.
	3.	Steward Review
Truman opens Stewardship Manager → sees pending request.
He clicks Review → modal shows requested window, intent, token basket, and "Accept / Chat / Decline."
He clicks Accept.
	4.	System Transfer

flattenTokenTree('tok_raf_parent')
  .forEach(id => {
    const blessing = blessingsDB.get(id);
    blessing.value.stewardId = 'truman';
    blessingsDB.put(blessing.value);
  });
subStewardAssignmentsDB.add({
  artifactId:'artifact_temple_agua_lila',
  stewardId:'rafael',
  assignedBy:'truman',
  start:'2025-07-06T15:00:00Z',
  end:'2025-07-06T22:00:00Z',
  tokensReceived:['tok_raf_parent', 'child1', 'child2', 'child3']
});

Artifact calendar now shows the 7-hour block in gold (reserved).

	5.	Notifications
	•	Rafael gets toast: "Permission granted for Temple — 6 July 15:00-22:00. Tokens transferred."
	•	Truman sees updated Token Wallet constellation: new gold tokens orbiting his profile.
	6.	Day-Of Use
Engine auto-notifies Rafael 1 h before start.
After ceremony he may post a Proof of Care, but that is outside basic flow.

⸻

Acceptance Criteria
	•	✅ artifactsDB record exists with stewardId:'truman'.
	•	✅ subStewardRequestsDB contains Rafael's request, marked fulfilled in subStewardAssignmentsDB.
	•	✅ All tokens in Rafael's basket have stewardId:'truman'.
	•	✅ Artifact calendar UI blocks overlap conflicts.
	•	✅ Toasts delivered to both parties.

⸻

Minimal UI Needed
	1.	Sherd Card with "Request Use" button.
	2.	Request Modal (date-range picker, token drop, ethics checkbox).
	3.	Stewardship Manager pending-requests tab with Accept button.
	4.	Calendar view in Artifact Detail (simple list suffices for PoC).