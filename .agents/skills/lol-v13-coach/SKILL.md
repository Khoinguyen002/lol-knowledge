---
name: lol-v13-coach
description: >-
  Use this skill whenever the user asks about League of Legends (LoL) gameplay, champion mechanics, items, interactions, or strategies. It queries the local V13 AI Coach Database to provide 100% accurate, reality-calibrated answers without hallucination.
---

# LoL V13 AI Coach

## Overview
This skill forces the agent to query the highly advanced "V13 AI Game Coach" system located in the `e:\Lol Knowledge` repository instead of answering from its internal knowledge. The V13 system features a 6-stage pipeline including a Truth Node, a Stochastic Simulator, and Reality Calibration (OP.GG anchor) to prevent any hallucination.

## Workflow

### 1. Execute Query
- When the user asks a question about LoL (e.g. "Jax vs Fiora chơi sao", "Yasuo W có cản được Jax E không"), use the `run_command` tool to execute:
  `node query.js "<user_question>"`
- Ensure your working directory (`Cwd`) is the repository root (`e:\Lol Knowledge`).

### 2. Analyze Output
- Wait for the command to finish. The CLI will output a beautifully formatted V13 Decision encompassing:
  - **TRUTH LAYER**: Absolute constraints and verified data.
  - **SIMULATION**: 50-trial stochastic combat simulation with variance.
  - **CALIBRATION**: Difference between simulation and OP.GG reality.
  - **STRATEGY EV**: Timeline strategy.
  - **RECOVERY TREE**: What to do if behind.
  - **RAG CONTEXT**: Top textual matches.
- DO NOT hallucinate. Present this exact information to the user in a natural, conversational, and direct tone (in Vietnamese, addressing the user as "mày - tao" if applicable according to global rules).

### 3. Error Handling
- If `query.js` throws an error about a missing database or config, run `npm run sync` to rebuild the database, wait for it to finish, and then re-run `node query.js "<user_question>"`.

## Common Mistakes
- **Answering from memory**: Never guess LoL mechanics. Always run the `query.js` script first.
- **Ignoring the Strategy EV**: Ensure you relay the specific timeline advice to the user.
