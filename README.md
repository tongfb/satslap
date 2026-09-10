# SAT SLAP

Private source repository for **SAT SLAP — HODL White vs. FIAT Sheep**.

A 60-second responsive browser game. Tap/click the black-faced FIAT Sheep to earn sats and avoid the white sheep.

## Current version

v1.5

## Devices

Designed for modern browsers on mobile phones, tablets, Windows PCs, and Macs. The layout adapts automatically to portrait and landscape screens and supports touch/pointer input.

## Game rules

- Black-faced FIAT Sheep: +100 sats
- White sheep: -100 sats, floor at 0
- Round time: 60 seconds
- Player name and score are local only; no leaderboard/database in this version
- Result screen is designed for screenshots
- Donate Lightning Address: `donate@zapm.uk`

## Deployment

This repository is intended to stay private. The public game should be deployed from this repository to Cloudflare Pages/Workers and later use `satslap.zapm.uk`.

## Project structure

- `index.html` — page and game UI
- `styles.css` — responsive layout
- `game.js` — gameplay and audio logic
- `config.js` — easy-to-change gameplay settings
- `assets/images/` — game artwork
- `assets/audio/` — background music and victory fanfare
- `CREDITS.md` — asset/license notes

## Privacy

SAT SLAP v1.5 does not send player names or scores to a server.
