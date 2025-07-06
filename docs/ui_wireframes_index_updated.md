# 📐 UI Wireframes Folder — Index & Naming

<!-- path: /docs/ui_wireframes/README.md -->

All mock-ups are exported as pure HTML prototypes (desktop layout, 1440 × 900 baseline).
Each file already uses the shared color-token CSS variables (--forest, --gold, etc.), so dropping them into a browser shows the exact glass-morphic look.

Filename	Screen & Purpose
invite_screen.html	Email-invite form — send magic-link to new player.
magic_link_landing.html	Mythic welcome + display-name input after link click.
profile_setup.html	Display name, rich-text bio, avatar upload, itinerary table.
home_dashboard.html	Full dashboard: Spotlight grid, map placeholder, notifications, current Blessing card.
create_intention_modal.html	Modal to author a new Intention and drag-drop token boosts.
intention_detail.html	Intention timeline (Blessings + Proofs), unassigned tokens, attached boosts, composer.
offering_detail.html	Offering description, time/place, code of ethics, ranked Gratitude bids with Accept buttons.
attention_switch_toast.html	Toast UI that appears on attention switch; shows recorded duration + new focus.
full_dashboard.html	Final consolidated dashboard concept with topbar, sidebar, left/right columns.
intention_created.html	Confirmation panel after an Intention is planted.

Note: Each file is fully standalone (embedded <style> block), so no build step is required for quick demos.
Mobile or dark-mode tweaks can be forked into a parallel mobile/ subfolder when needed.