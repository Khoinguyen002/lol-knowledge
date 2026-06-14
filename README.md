# V14 Multi-Mode Game World Engine 🎮🤖
*(Tiến hóa từ hệ thống LoL Knowledge RAG)*

Hệ thống RAG tìm kiếm ngữ cảnh cục bộ siêu gọn nhẹ dùng cho dữ liệu game League of Legends (Liên Minh Huyền Thoại) nay đã được đập đi xây lại theo **Clean Architecture**, trở thành một **Vũ trụ Giả lập Vật lý Đa quy tắc (Multi-Mode Game World Engine)**.

---

## Tính năng nổi bật & Kiến trúc V14 ✨

Hệ thống không còn là một bộ RAG tra cứu văn bản thông thường, mà là một công cụ mô phỏng kết quả giao tranh và tư vấn chiến thuật dựa trên xác suất và luật lệ thay đổi linh hoạt theo Mode.

### 1. Kiến trúc Game Mode Layer (The Rule Injection System)
Chế độ chơi (Game Mode) không chỉ là thông số (Config), mà là một bộ bẻ cong quy tắc (Semantics):
- **GameModeConfig:** Xác định độ nhiễu `randomness_level` (0.15 cho SR, 0.4 cho ARAM, 0.8 cho CHAOS).
- **GameModeRuleset:** Bẻ cong luật lệ cơ bản (Ví dụ: ARAM sẽ tắt tính năng Biến Về, giảm 50% hồi máu).
- **ModeMutation:** Bơm đột biến vào runtime (đổi chiêu, thay đổi thông số phép) thông qua cơ chế *Seeded Deterministic*.

### 2. Mô Phỏng 3 Tầng Máy Gia Tốc (3-Layer Simulation Engine)
Để tránh anti-pattern "God Object", hệ thống tính toán (Simulation) được chặt làm 3 phần rạch ròi:
1. ⚙️ **MechanicsEngine (Tầng Cơ Học Tĩnh):** Tính toán logic nguyên thủy của game, hoàn toàn Deterministic (Toán học tĩnh 100%, không đổ xúc xắc).
2. ⚡ **ModeMutationEngine (Tầng Đột Biến):** Tiêm (Inject) các ruleset dị biệt của Game Mode. Cơ chế đột biến dựa trên Hạt giống (Seed) để đảm bảo có thể Debug và tái tạo (không Random bậy bạ ở Runtime).
3. 🎲 **HumanNoiseEngine (Tầng Khuyết Điểm Con Người):** Bơm sai số ngẫu nhiên vào kết quả. Mức độ bơm tuỳ thuộc vào `randomness_level` cấu hình ở Game Mode đó. Vòng lặp Monte Carlo sẽ quét qua đây 50 lần.

### 3. Passive Calibration Observer
Module Calibration (Chỉnh chuẩn) hoạt động dưới dạng **Observer (Người quan sát)**. Nó tính toán và báo cáo độ lệch (Drift) giữa giả lập và thực tế (OP.GG hoặc ARAM Zone), nhưng tuyệt đối **không được phép can thiệp** vào kết quả mô phỏng đang chạy để đảm bảo tính minh bạch khoa học.

### 4. Hybrid Search & RAG Core (Bản lề lưu trữ)
- **Semantic Chunks:** 170+ tướng được chẻ nhỏ ra (Overview, Abilities, Combos, Items).
- **Embeddings cục bộ:** Dùng Xenova/multilingual-e5-small chạy trực tiếp CPU.
- **Reranking:** Tự phát hiện ý đồ câu hỏi và chấm điểm kết hợp Cosine + Keyword.

---

## Cấu trúc luồng chạy (The World Execution Flow) 🔄

1. **Query** -> Nhập câu hỏi từ người dùng (Vd: "Chế độ hỗn loạn của Jax").
2. **ModeResolver** -> Xác định Game Mode hiện tại (SR, ARAM, CHAOS).
3. **TruthNode** -> Trích xuất quy tắc tuyệt đối (bị ảnh hưởng bởi Game Mode).
4. **StateBuilder** -> Dựng môi trường (Load meta chiến thuật base).
5. **MechanicsEngine** -> Tính toán nền tảng.
6. **ModeMutationEngine** -> Bẻ cong luật lệ theo seed.
7. **HumanNoiseEngine** -> Bơm độ nhiễu và chạy Monte Carlo 50 trials.
8. **CalibrationObserver** -> Đối chiếu Neo thực tế và báo lỗi (Drift Note).
9. **RenderNode** -> Nhả kết quả cho User.

---

## Cấu trúc thư mục 📂

```text
e:/Lol Knowledge/
├── config.json          # Pin phiên bản đang sử dụng (VD: 16.12.1)
├── game_modes.json      # [NEW V14] Bộ Config và Ruleset cho đa vũ trụ (SR, ARAM, CHAOS)
├── meta_decisions.json  # Chứa Base Meta Strategy và Reality Anchor
├── interactions.json    # Chứa Base Truth Rules và Domain Weights
├── combos.json          # Script thực hiện combo tướng
├── db-store.js          # [CORE V14] Chứa StagedControllerGraph và 3-Layer Engines
├── db_16.12.1.json      # Vector DB JSON lưu chunks + embeddings (Data tĩnh)
├── populate_meta.js     # Script bot cào API tự động gen Meta cho 170+ tướng
├── package.json         # Định nghĩa các thư viện dependencies
├── query.js             # Script CLI truy vấn thông tin (hiển thị UI V14)
└── sync.js              # Script build toàn bộ cấu trúc DB và nạp Game Modes
```

---

## Hướng dẫn sử dụng 🚀

### 1. Đồng bộ dữ liệu (Sync Data)
Để tải 170+ tướng và đóng gói thành DB kèm V14 Engine:
```bash
npm run sync
```

### 2. Tìm kiếm kiến thức đa vũ trụ (Query)
Trải nghiệm cách hệ thống đối xử khác nhau với cùng một tướng qua các Mode:

**Summoner's Rift (Mặc định):**
```bash
node query.js "Aatrox đánh thường"
```

**ARAM Mode:**
```bash
node query.js "chế độ aram của Aatrox"
```

**Chaos Mode:**
```bash
node query.js "chế độ hỗn loạn của Aatrox"
```

*Output hiển thị rõ ràng thông số [GAME MODE], [MUTATIONS], và độ nhiễu ±% của [SIMULATION] dựa trên từng Mode cụ thể.*
