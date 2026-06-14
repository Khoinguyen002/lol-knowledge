---
name: lol-coach
description: >-
  Use this skill whenever the user asks about League of Legends (LoL) gameplay, champion mechanics, items, interactions, or strategies. It queries the local AI Coach Database to provide 100% accurate, reality-calibrated answers without hallucination.
---

# LoL AI Coach

## Overview
This skill forces the agent to query the highly advanced "AI Game Coach" system located in the active workspace repository instead of answering from its internal knowledge. The AI Coach system features a 6-stage pipeline including a Truth Node, a Stochastic Simulator, and Reality Calibration (OP.GG anchor) to prevent any hallucination.

## Workflow

### 1. Execute Query
- When the user asks a question about LoL (e.g. "Jax vs Fiora chơi sao", "Yasuo W có cản được Jax E không"), use the `run_command` tool to execute:
  `node query.js "<user_question>"`
- Ensure your working directory (`Cwd`) is the active workspace root.

### 2. Analyze Output
- Wait for the command to finish. The CLI will output a beautifully formatted AI Coach Decision encompassing:
  - **TRUTH LAYER**: Absolute constraints and verified data.
  - **SIMULATION**: 50-trial stochastic combat simulation with variance.
  - **CALIBRATION**: Difference between simulation and OP.GG reality.
  - **STRATEGY EV**: Timeline strategy.
  - **RECOVERY TREE**: What to do if behind.
  - **RAG CONTEXT**: Top textual matches.
- DO NOT hallucinate. Present this exact information to the user in a natural, conversational, and direct tone (in Vietnamese, addressing the user as "mày - tao" if applicable according to global rules).

### 3. Error Handling
- If `query.js` throws an error about a missing database or config, run `npm run sync` to rebuild the database, wait for it to finish, and then re-run `node query.js "<user_question>"`.


## Data Maintenance & Synchronization Workflow

### 1. Update Game Rules or Champion Data (Offline Configs)
- **Adding/Modifying Combos**: Edit [combos.json](./combos.json). Keep steps structured with `step`, `action`, `timing`, `state_precondition`, and `description`.
- **Modifying Game Modes & Augments**: Edit [game_modes.json](./game_modes.json). Update ruleset overrides (e.g. `no_runes_disabled`, `combo_breaker_active` for ARAM: Mayhem) or add new augments in the corresponding tiers (silver, gold, prismatic).
- **Updating System Rules (Truth Layer)**: Edit [interactions.json](./interactions.json) to tweak base game mechanics, weights, or absolute rules.

### 2. Synchronize Database (Sync)
- Run `npm run sync` (or `node sync.js --version <target_patch>`) using the `run_command` tool.
- This command connects to Riot Data Dragon, fetches the latest champion base stats, merges them with your local JSON configurations, runs Xenova multilingual embeddings, and compiles everything into a local vector database file (e.g., `db_16.12.1.json`).
- Ensure you wait for the sync task to complete successfully.

### 3. Verify and Test
- Run test queries using `node query.js "<query_text>"` to verify that:
  - The correct RAG context (combos, abilities) is retrieved.
  - The custom game mode rules (like ARAM Mayhem) are applied in the `[GAME MODE]` line.
  - The correct number of augments (e.g. 5 augments for ARAM: Mayhem) are selected.
- Document any changes and results in `walkthrough.md`.

### 4. AI-Guided Sync for Patch Notes
- When requested to sync new patches or updates of rotating modes (e.g., ARAM Mayhem updates):
  1. Search the web for official League of Legends patch notes or wiki updates.
  2. Parse the changes (buffs/nerfs, new augments, rule modifications).
  3. Propose edits to `game_modes.json` or `meta_decisions.json`.
  4. Perform the edits and execute step 2 (Sync) and step 3 (Verify).

## Common Mistakes
- **Answering from memory**: Never guess LoL mechanics. Always run the `query.js` script first.
- **Ignoring the Strategy EV**: Ensure you relay the specific timeline advice to the user.
- **Forgetting to sync after edit**: Any manual edits to `.json` files will NOT take effect until you run `npm run sync` to rebuild the vector database.

