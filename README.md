📘 README.md — Amorvia (Professional Edition)

(možeš ga kopirati cijelog u svoj repo)

![version](https://img.shields.io/badge/Amorvia-BETA%200.9.2-blue)
![status](https://img.shields.io/badge/Status-Production--Safe-green)
![engine](https://img.shields.io/badge/Engine-v2-orange)
![build](https://img.shields.io/badge/Build-Passing-brightgreen)

# ❤️ Amorvia  
**Interactive Relationship & Co-Parenting Scenario Engine**  
**BETA 0.9.2 – Polished Foundations**

Amorvia is an interactive scenario system designed to help users practice communication, empathy, and conflict-resolution skills through branching dialogues and emotionally realistic situations.  
Built with a modular V2 scenario engine, Amorvia provides dynamic HUD feedback (trust / tension / child-impact), mobile-friendly UI, and fully JSON-driven content.

---

# 📑 Table of Contents

- [✨ Features](#-features)
- [🖥 Architecture Overview](#-architecture-overview)
- [📚 Scenario System](#-scenario-system)
- [🚀 What's New in BETA 0.9.2](#-whats-new-in-beta-092)
- [📦 Installation & Running Locally](#-installation--running-locally)
- [🧪 Testing](#-testing)
- [📂 Project Structure](#-project-structure)
- [🧭 Roadmap](#-roadmap)
- [❤️ Credits](#️-credits)
- [📄 License](#-license)

---

# ✨ Features

### 🎭 Realistic branching scenarios  
Each scenario uses **nodes** and **steps** to simulate nuanced emotional and co-parenting situations.

### 🎛 Real-time emotional metrics  
Amorvia tracks three key meters:
- **Trust**  
- **Tension**  
- **Child Impact / Stress**

### 📱 Fully responsive  
Optimized for desktop, tablet, and mobile:
- Compact mode  
- Adaptive topbar  
- Touch-friendly choices  
- Smooth UI transitions  

### 🔧 JSON-driven content  
All scenarios are stored as `.v2.json` files for maximum transparency and modding potential.

### 🧩 Modular scenario engine  
- Dynamic loading  
- Safe node traversal  
- Soft recovery  
- Schema validation  

---

# 🖥 Architecture Overview

Amorvia consists of three major layers:

### 1) **Scenario Engine (v2)**
- Loads `.v2.json`
- Handles node/step transitions  
- Applies meter effects  
- Manages runtime state and HUD sync

### 2) **UI Layer**
- Stage rendering  
- Dialog  
- HUD  
- Compact/mobile mode  
- Scene transitions & micro animations  

### 3) **Data Layer**
- `public/data/*.v2.json`  
- Schema validation via AJV  
- v2 index (`v2-index.json`)  

---

# 📚 Scenario System

Each scenario is structured as:

```json
{
  "id": "scenario-id",
  "title": "Scenario Title",
  "acts": [
    {
      "id": "act-1",
      "nodes": [ ... ]
    }
  ]
}


Meters update per choice:

"effects": {
  "trust": +1,
  "tension": -2,
  "childStress": +1
}


All scenarios are validated against:
public/schema/scenario.v2.schema.json

Available scenarios include:

Co-Parenting With Bipolar Partner

Tense Pickups & Dropoffs

Step-Parenting Conflicts

First Agreements

New Introductions

Different Rules

De-escalation

Cultural / Religious Difference

Dating After Breakup (With Child)

Visitor

Brzi Kontakti (Support Hub)

🚀 What's New in BETA 0.9.2

This is the first fully stable, production-safe build of Amorvia.

🌟 UI Polish 9.8.x

Stage fade-in & dialog rise transitions

Character breathing

Unified button transitions

Improved readability

Stage “card” visual layout

🎛 HUD v9.7.3 Polish

Higher contrast

Widened chips

Better mobile wrapping

Cleaner typography

📱 Mobile & Compact Enhancements

Reorganized topbar

Larger tap zones

Safer bottom padding

Responsive HUD layout

🧹 Major Repo Cleanup

Removed 70+ legacy JS/CSS files

Unified HUD versions

Removed deprecated root index

Cleaned bootstrap pipeline

Eliminated extras-tabs.js ghost import

Zero console errors, zero 404, zero SW conflicts

🧪 Engine Stability

100% Cypress smoke pass

All scenarios validated

Clean node linking

No missing meters or unresolved IDs

📦 Installation & Running Locally
npm install
npm run dev


Open in your browser:

http://localhost:3000


(Or the URL displayed by your dev server / Codespaces.)

🧪 Testing

Amorvia uses a lightweight Cypress-based scenario runner:

npm run test:smoke


The test ensures that:

every scenario loads

several nodes can be navigated sequentially

HUD & UI initialize correctly

no new regressions are introduced

📂 Project Structure
public/
  ├─ css/                 # styles.css, HUD, compact UI, patches
  ├─ js/                  # app.v2.js, bootstrap.js, HUD, telemetry
  ├─ data/                # all scenario files
  ├─ schema/              # scenario JSON schema
  ├─ index.html           # main entrypoint
  └─ sw.js                # service worker

tools/                    # validators, converters, checkers
cypress/                  # smoke test suite
api/                      # backend endpoints (optional)

🧭 Roadmap
0.9.3 — Scenario Content Polish

tone consistency

pacing

emotional transitions

clarity in branching

0.9.4 — Playtest Protocol

5–15–30 minute playtests

structured user feedback

0.9.5 — Final BETA Packaging

art loading

minor UI refinements

onboarding experience

0.9.9 — Release Candidate
1.0.0 — Public Release
❤️ Credits

Created by Alen Mitrović
Engine Support by Nova AI Companion
2025 © All rights reserved.
