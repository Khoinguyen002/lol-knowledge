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

### 4. AI-Guided Sync for Patch Notes & Game Mode Updates (Bắt buộc tuân thủ)
Khi người dùng yêu cầu "Cập nhật chế độ chơi X" hoặc "Update game mode X" hoặc "Cập nhật patch mới nhất cho ARAM Hỗn Loạn", đại lý PHẢI thực hiện theo quy trình tự động 5 bước sau mà không cần hỏi lại cách làm:

1. **Tìm kiếm (Research) thông tin Patch mới nhất:**
   - Sử dụng công cụ `search_web` tìm kiếm thông tin về bản cập nhật của chế độ chơi (ví dụ: `"ARAM: Mayhem" 2026 OR "ARAM: Hỗn Loạn" patch notes OR augments list`).
   - Xác định rõ danh sách Lõi (Augments) mới được thêm, Lõi bị loại bỏ, hoặc các thay đổi về chỉ số cơ học/luật chơi.

2. **So sánh (Compare) với Config hiện tại:**
   - Đọc file [game_modes.json](../../../game_modes.json) (hoặc [meta_decisions.json](../../../meta_decisions.json) nếu cần) để định vị xem chế độ chơi đó có gì khác biệt với dữ liệu cũ.

3. **Cập nhật File Config (Update Config):**
   - Chỉnh sửa [game_modes.json](../../../game_modes.json) để thêm các lõi mới, cập nhật tên/mô tả bằng tiếng Việt, và thiết lập các `modifiers` (như `hp_bonus`, `damage_dealt_multiplier`...) khớp với các trường được hỗ trợ bởi `MechanicsEngine` trong [db-store.js](../../../db-store.js).

4. **Đồng bộ hóa Database Vector (Rebuild DB):**
   - Chạy lệnh `npm run sync` bằng công cụ `run_command` và đợi tác động hoàn tất thành công để hệ thống biên dịch lại dữ liệu vector mới.

5. **Kiểm thử & Báo cáo kết quả (Verification):**
   - Chạy lệnh `node query.js "<tên_chế_độ>"` để kiểm chứng xem hệ thống có nhận diện đúng chế độ chơi và hiển thị chính xác danh sách các lõi mới hay không. Sau đó phản hồi báo cáo kết quả cụ thể cho người dùng.

## Common Mistakes
- **Answering from memory**: Never guess LoL mechanics. Always run the `query.js` script first.
- **Ignoring the Strategy EV**: Ensure you relay the specific timeline advice to the user.
- **Forgetting to sync after edit**: Any manual edits to `.json` files will NOT take effect until you run `npm run sync` to rebuild the vector database.

