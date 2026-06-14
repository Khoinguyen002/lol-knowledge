# LoL Knowledge RAG System 🎮🤖

Hệ thống RAG (Retrieval-Augmented Generation) tìm kiếm ngữ cảnh cục bộ siêu gọn nhẹ dùng cho dữ liệu game League of Legends (Liên Minh Huyền Thoại), chạy hoàn toàn offline trên CPU máy bạn mà không cần bất kỳ API key nào.

## Tính năng nổi bật ✨

1. **Semantic Chunks Tường Minh:** Không chia nhỏ văn bản thô theo kích thước ký tự cố định. Dữ liệu của 170+ tướng được phân tách thành các cấu trúc ngữ nghĩa rõ ràng:
   * **Overview:** Tiểu sử, vai trò, thuộc tính cơ bản.
   * **Abilities (Passive, Q, W, E, R):** Tên chiêu, mô tả chi tiết, thời gian hồi chiêu, năng lượng tiêu hao, tầm đánh.
   * **Combos & Counter:** Mẹo phối hợp chiêu thức và mẹo đối phó với từng vị tướng.
   * **Items:** Giá vàng, công thức ghép, thuộc tính tăng thêm.
2. **Hỗ trợ Song ngữ (English & Vietnamese):** Tải và lập chỉ mục dữ liệu song song của cả hai ngôn ngữ giúp tìm kiếm cực nhạy với cả thuật ngữ tiếng Anh và tiếng Việt.
3. **Mô hình Embedding Đa ngôn ngữ (Multilingual):** Sử dụng model `Xenova/multilingual-e5-small` (~118 triệu tham số, kích thước ~230MB) chạy cục bộ trên CPU thông qua Transformers.js.
4. **Hybrid Search (Vector + Từ khóa):** Tính toán độ tương đồng kết hợp:
   $$\text{Hybrid Score} = 0.6 \times \text{Cosine Similarity} + 0.4 \times \text{Keyword Overlap}$$
5. **Rule-based Reranking (Bộ tái xếp hạng theo luật):** 
   Tự động phát hiện ý đồ câu hỏi (Tên tướng, loại kỹ năng, thuộc tính muốn hỏi như hồi chiêu, sát thương, năng lượng) và cộng điểm thưởng (boost) tương ứng:
   * Trùng khớp tên tướng: `+0.25`
   * Trùng khớp kỹ năng (Q/W/E/R/Passive): `+0.25`
   * Trùng khớp thuộc tính (Cooldown/Damage/Cost): `+0.20`
6. **Version Pinning (Chốt phiên bản):** Dữ liệu được lưu trữ riêng biệt theo phiên bản (ví dụ `db_16.12.1.json`) tránh tình trạng tự động update làm hỏng cơ sở dữ liệu cũ.

---

## Cấu trúc thư mục 📂

```text
e:/Lol Knowledge/
├── config.json          # Pin phiên bản đang sử dụng
├── db-store.js          # Chứa logic sinh vector, tính cosine, hybrid search và rerank
├── db_16.12.1.json      # File Vector Database dạng JSON lưu trữ chunks + embeddings
├── package.json         # Định nghĩa các thư viện dependencies
├── query.js             # Script CLI truy vấn thông tin
├── README.md            # Tài liệu hướng dẫn sử dụng
└── sync.js              # Script crawl Data Dragon từ Riot và lập chỉ mục
```

---

## Hướng dẫn sử dụng 🚀

### 1. Cài đặt môi trường
Đảm bảo máy đã cài đặt Node.js (v18 trở lên). Chạy lệnh cài đặt các thư viện:
```bash
npm install
```

### 2. Đồng bộ dữ liệu (Sync Data)
Để tải dữ liệu phiên bản mới nhất từ Riot và sinh embeddings (chạy lần đầu tiên):
```bash
npm run sync
```
*Để đồng bộ một patch cụ thể:*
```bash
node sync.js 16.12.1
```

### 3. Tìm kiếm kiến thức (Query)
Chạy lệnh truy vấn trực tiếp trên Terminal:
```bash
node query.js "Jax chiêu E hồi chiêu bao lâu"
```
Hoặc:
```bash
npm run query -- "Aatrox nội tại làm gì"
```

*Để trả về output dạng JSON thô cho các app khác parse:*
```bash
node query.js "Lư hương sôi sục giá bao nhiêu" --json
```

---

## Cách Tương tác cùng Antigravity IDE 💬
Khi bạn chat với Antigravity trong IDE và hỏi các câu hỏi như:
> "Ê Jax chiêu E ở level 1 hồi chiêu bao lâu?"

Antigravity sẽ tự động chạy script truy vấn dưới nền:
```bash
node query.js "Jax E hồi chiêu" --json
```
Sau đó đọc kết quả context trả về và tổng hợp câu trả lời chính xác 100% theo patch hiện tại cho bạn!
