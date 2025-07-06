# 🚀 Synchronicity Engine — Proof-of-Concept Sprint 0 Roadmap

<!-- path: /docs/roadmap_sprint0.md -->

(14-day intensive build)

Goal: a clickable demo on a single laptop (IPFS daemon + local mailer) that exercises every core mechanic: create intention, track attention, assign tokens, post proof, bid & accept offering, request artifact stewardship.

⸻

Day-by-Day Tasks

Day	Deliverable	Notes / Acceptance
1	Repo scaffold (pnpm + Vite React + Tailwind) · IPFS node spin-up · OrbitDB dependency	npm run dev shows blank page; ipfs daemon reachable
2	Auth server (/invite, /magic-link) · Nodemailer stub	Magic link lands on /#/welcome?token= storing JWT
3	Orbit identity (load JWT ➞ OrbitDB.identity) · initOrbit() hook	Browser console: identities attached
4	Create Intention modal + useCreateIntention(); write to intentionsDB, blessingsDB, attentionSwitchesDB	Form submit pops "Intention Planted" panel
5	Attention listener (route change → attention:switch event) · Toast component	Close app / reopen preserves index array
6	Intention Detail page timeline (Blessing nodes & Proof nodes)	Demo shows 1 Blessing entry
7	Blessing composer + unassigned token panel	"Bless" button appends new Blessing ID
8	Proof of Service upload (local image to IPFS) · proof modal	Proof card appears in timeline
9	Assign Token flow (right-panel → assign)	Token status flips to given
10	Create Offering page + bid drag-n-drop	Second user account can submit bid
11	Accept bid logic (flattenTokenTree) · slots decrement	Winning user gets slot confirmation toast
12	Artifact registry (Sherd) list card + request modal	Original steward receives request
13	Sub-steward approval flow → calendar badge	Assignment doc written; tokens transferred
14	Dashboard aggregation (Spotlight ranking by gratitudePotential) · Map pins · polish glass UI, gradients, toasts	End-to-end demo: create intention ➞ switch ➞ proof ➞ assign ➞ offering ➞ accept ➞ artifact request


⸻

Stretch (post-demo)
	•	Mobile adaptive Tailwind breakpoints
	•	Itinerary geofencing (match future way-points)
	•	CRDT conflict tests (simulated offline edits)
	•	Temple of Listening moderation queue

⸻

Definition of Done
	1.	Clone repo, run npm run dev, demo flows with two browser tabs and no manual DB resets.
	2.	All collections stored in local Orbit/IPFS; refresh persists data.
	3.	No unhandled promise rejections in console.
	4.	README includes setup instructions + magic-link test mail.