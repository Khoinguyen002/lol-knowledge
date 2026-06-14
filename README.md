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
- **ModeMutation:** Bơm đột biến vào luật thế giới (World level) thông qua cơ chế *Seeded Deterministic*.

### 2. Mô Phỏng 4 Tầng Máy Gia Tốc (4-Layer Simulation Engine) [NEW V14.2]
Để đảm bảo tính modular và chống phình to logic, hệ thống giả lập được chia thành 4 tầng rạch ròi:
1. 🧬 **AugmentEngine (Tầng Chọn Nâng Cấp):** Xử lý lựa chọn của người chơi (Player level). Hệ thống tự chọn lõi ngẫu nhiên theo seed của tướng dựa trên các bậc Bạc, Vàng, Kim Cương. Đặc biệt, lõi chỉ thay đổi các chỉ số trạng thái nguyên bản (`state.modifiers` như `hp_bonus`, `ability_haste`,...) chứ không được phép tác động trực tiếp lên tỉ lệ thắng.
2. ⚙️ **MechanicsEngine (Tầng Cơ Học Giao Tranh):** Tính toán điểm sức khỏe giao tranh qua 3 giai đoạn:
   - `Pre-Hit` (Setup): Tính dựa trên tầm đánh, tốc chạy và chỉ số phản ứng.
   - `Hit Window` (Sát thương): Tách biệt dồn sát thương nhanh (Burst) cho Mage/Fighter và sát thương đều (Sustained DPS) cho ADC.
   - `Post-Hit` (Sống sót): Tính toán máu, kháng cự, hút máu, hồi sinh và khả năng không thể chỉ định.
3. ⚡ **ModeMutationEngine (Tầng Đột Biến):** Tiêm các quy tắc bẻ cong luật thế giới (World level) như đổi chiêu, tầm nhìn bất ổn, hoặc hồi chiêu ngẫu nhiên.
4. 🎲 **HumanNoiseEngine (Tầng Khuyết Điểm Con Người):** Bơm sai số ngẫu nhiên vào kết quả qua vòng lặp Monte Carlo 50 trials.

### 3. Ma Trận Chấm Điểm Vai Trò Động (RoleScore Matrix) [NEW V14.2]
Hệ thống không phân loại vai trò tướng một cách thô sơ (tĩnh) nữa mà tự động nhận diện vai trò động dựa trên ma trận:
$$\text{RoleScore} = \text{BaseRole}(3.0) + \text{QueryIntent}(2.0) + \text{ItemState}(2.0) + \text{ModeRuleset}(0.5)$$
Ví dụ, nếu câu hỏi ghi rõ "Jax lên AP" hoặc "Jax lên Mũ Phù Thủy", vai trò sẽ lập tức lái sang `mage` thay vì `fighter`, và hệ thống sẽ tự động chọn các lõi tăng hồi chiêu chiêu cuối (Robot Chiêu Cuối) thay vì lõi trâu bò (Khổng Lồ Hóa).

### 4. Passive Calibration Observer
Module Calibration (Chỉnh chuẩn) hoạt động dưới dạng **Observer (Người quan sát)**. Nó tính toán và báo cáo độ lệch (Drift) giữa giả lập và thực tế (OP.GG hoặc ARAM Zone), nhưng tuyệt đối **không được phép can thiệp** vào kết quả mô phỏng đang chạy để đảm bảo tính minh bạch khoa học.

### 5. Hybrid Search & RAG Core (Bản lề lưu trữ)
- **Semantic Chunks:** 170+ tướng được chẻ nhỏ ra (Overview, Abilities, Combos, Items).
- **Embeddings cục bộ:** Dùng Xenova/multilingual-e5-small chạy trực tiếp CPU.
- **Reranking:** Tự phát hiện ý đồ câu hỏi và chấm điểm kết hợp Cosine + Keyword.

---

## Cấu trúc luồng chạy (The World Execution Flow) 🔄

1. **Query** -> Nhập câu hỏi từ người dùng.
2. **ModeResolver** -> Xác định Game Mode hiện tại (SR, ARAM, CHAOS).
3. **TruthNode** -> Trích xuất quy tắc tuyệt đối theo Mode.
4. **StateBuilder** -> Dựng bối cảnh và nạp chỉ số Riot của tướng.
5. **AugmentEngine** -> Nhận diện vai trò động (`RoleScore`), sinh và chọn 3 lõi nâng cấp tối ưu.
6. **MechanicsEngine** -> Giải quyết combat 3 giai đoạn dựa trên chỉ số sau nâng cấp.
7. **ModeMutationEngine** -> Tiêm đột biến quy tắc thế giới.
8. **HumanNoiseEngine** -> Chạy Monte Carlo 50 trials với sai số hành vi.
9. **CalibrationObserver** -> Báo cáo độ lệch thực tế (Drift Note).
10. **RenderNode** -> Trả kết quả hiển thị chia rõ `Selected_Augments` và `Mutations_Applied`.

---

## Cấu trúc thư mục 📂

```text
e:/Lol Knowledge/
├── config.json          # Pin phiên bản đang sử dụng (VD: 16.12.1)
├── game_modes.json      # [UPDATED V14.2] Cấu hình Mode và Pool Nâng Cấp vật lý (Silver, Gold, Prismatic)
├── meta_decisions.json  # Chứa Base Meta Strategy và Reality Anchor
├── interactions.json    # Chứa Base Truth Rules và Domain Weights
├── combos.json          # Script thực hiện combo tướng
├── db-store.js          # [CORE V14.2] Chứa StagedControllerGraph và 4-Layer Engines
├── db_16.12.1.json      # Vector DB JSON lưu chunks + embeddings (Data tĩnh)
├── populate_meta.js     # Script bot cào API tự động gen Meta cho 170+ tướng
├── package.json         # Định nghĩa các thư viện dependencies
├── query.js             # Script CLI truy vấn thông tin (hiển thị UI V14.2)
└── sync.js              # Script build toàn bộ cấu trúc DB và nạp Game Modes & Augments
```

---

## Hướng dẫn sử dụng 🚀

### 1. Đồng bộ dữ liệu (Sync Data)
Để tải 170+ tướng và đóng gói thành DB kèm V14.2 Engine:
```bash
npm run sync
```

### 2. Tìm kiếm kiến thức đa vũ trụ (Query)
Trải nghiệm cách hệ thống chọn lõi động và tính điểm combat thực tế:

**Jax mặc định (Fighter):**
```bash
node query.js "Jax hỗn loạn"
# Hệ thống chọn lõi: Tay Đòn Nặng, Lưỡi Kiếm Hút Máu, Tầm Nhìn Bất Ổn.
```

**Jax lên phép (Mage Jax):**
```bash
node query.js "Jax lên mũ phù thủy ap hỗn loạn"
# Nhận dạng vai trò Mage. Chọn lõi: Dệt Phép, Robot Chiêu Cuối.
```

**Jax đỡ đòn (Tank Jax):**
```bash
node query.js "Jax lên giáp gai đỡ đòn hỗn loạn"
# Nhận dạng vai trò Tank. Chọn lõi: Tay Đòn Nặng, Khổng Lồ Hóa (size +50%).
```

*Output hiển thị rõ ràng thông số [GAME MODE], [MUTATIONS], [SELECTED AUGMENTS], và độ nhiễu ±% của [SIMULATION] dựa trên từng kịch bản.*
