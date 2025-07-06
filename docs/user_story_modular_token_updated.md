# 📖 User Story — "The Modular Token Basket"

(Fine-tuning a Gratitude bid by splitting & merging child tokens)

Field	Detail
Title	A member refines their Gratitude basket to secure a limited tool-lending Offering.
Actors	Leandro (community carpenter), Truman (steward of a chainsaw Artifact)
Goal	Demonstrate live editing of a hierarchical Token tree to fine-tune an Offering bid, and automatic cascade transfer when accepted.
Pre-Conditions	• Chainsaw Artifact is listed as an Offering with 1 slot for 24 h use.  • Leandro owns a parent token (tok_lean_root, 6 h) with three child tokens (tok_leaf_A 2 h, tok_leaf_B 1 h 30 m, tok_leaf_C 45 m).
Post-Conditions	• Truman accepts a tailored 4 h 15 m basket (parent + two children).  • The selected tokens transfer to Truman; the unoffered child token remains with Leandro.


⸻

Narrative
	1.	Chainsaw Offering Published
Truman creates an Offering: "Borrow Pro-Grade Chainsaw (24 h)" — slots = 1.
	2.	Initial Bid
Leandro drags his whole parent token onto the bid zone.
Engine shows duration: 6 h.
Truman feels that's more gratitude than necessary and messages:
"I don't need the full basket—4 h would be fair."
	3.	Token Basket Editor
Leandro clicks "Edit Basket."
UI opens a modal showing token tree:

tok_lean_root  6 h
├─ tok_leaf_A  2 h
├─ tok_leaf_B  1 h 30 m
└─ tok_leaf_C  45 m

He unticks tok_leaf_C, slider recalculates total → 4 h 15 m.

	4.	Updated Bid Saved
const offering = offeringsDB.get('chainsaw');
offering.value.tokenOffers[0].tokens = [root, leaf_A, leaf_B];
offeringsDB.put(offering.value);
	5.	Acceptance
Truman re-opens bid list, sees updated duration, clicks Accept.
Engine:

flattenTokenTree('tok_lean_root', blessingsDB)
  .filter(id => ['tok_lean_root','tok_leaf_A','tok_leaf_B'].includes(id))
  .forEach(id => {
    const blessing = blessingsDB.get(id);
    blessing.value.stewardId = 'truman';
    blessing.value.status = 'given';
    blessingsDB.put(blessing.value);
  });


	6.	Auto-Reversion
tok_leaf_C was never part of accepted array, remains with Leandro (stewardId:'leandro').
	7.	Notifications
	•	Leandro: "Your 4 h 15 m Gratitude basket accepted. Chainsaw reserved tomorrow 08:00–08:00."
	•	Truman: Wallet constellation gains new tokens.
	8.	Tool Pickup & Proof
After using the chainsaw, Leandro posts a Proof of Service to Truman's original Eucalyptus Peak Intention, closing a loop of reciprocity.

⸻

Acceptance Criteria

Check	Expected
Offering status	fulfilled
slotsAvailable	0
Tokens transferred	exactly tok_lean_root, tok_leaf_A, tok_leaf_B
tok_leaf_C	still with Leandro, status unchanged
Proof posting	triggers standard notification flow


⸻

UI Elements Introduced
	1.	Token Basket Editor
	•	Collapse/expand child tokens.
	•	Live duration sum at top.
	•	Enable/disable toggle per token.
	2.	Bid Duration Chip
	•	Shows "4 h 15 m" next to bidder name; updates in real time.
	3.	Cascade Animation
	•	Upon acceptance, highlighted tokens flow from bidder's constellation into steward's, leaving unchecked token behind (fades back).

⸻

This story spotlights the modular nature of Gratitude tokens: they can be split, merged, or partially offered, giving players fine control over value exchange while the Engine maintains stewardship consistency through hierarchical cascade logic.