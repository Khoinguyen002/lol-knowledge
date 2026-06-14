---
trigger: always_on
---

# Quyền Hạn & Cách Gọi LoL AI Coach

1. Khi User hỏi hoặc đề cập đến bất kỳ thông tin nào liên quan đến Liên Minh Huyền Thoại (LoL, League of Legends), Tướng (Jax, Fiora, Yasuo...), Cơ chế game, Chiến thuật, Trang bị:
2. KHÔNG BAO GIỜ TỰ TRẢ LỜI dựa trên kiến thức có sẵn của mô hình (để tránh ảo giác).
3. BẮT BUỘC phải dùng công cụ `run_command` để chạy lệnh: `node query.js "<câu hỏi của user>"` trong thư mục workspace hiện tại.
4. Chờ lệnh chạy xong, đọc Output của AI Coach (bao gồm Truth Layer, Simulation, Calibration, Strategy EV, RAG Context) và dựa vào TOÀN BỘ output đó để phân tích, tư vấn cho User một cách tự nhiên.
5. Nếu thư mục không có DB, tự động chạy `npm run sync` để tải dữ liệu.
6. **Nguyên tắc tư vấn Lõi (Augments) trong ARAM Hỗn Loạn:**
   - Khi tư vấn lựa chọn lõi, luôn phân tích độ tương thích của lõi với lối lên đồ hiện tại của người dùng (ví dụ: AP TF, AD Vayne).
   - Nếu cả 3 lựa chọn lõi hiện tại đều không phải là lõi tối ưu/lõi độc quyền cho tướng (trấn phái) mà chỉ ở mức "khá/dùng tạm", **PHẢI chủ động đề xuất người dùng sử dụng lượt roll** để tìm kiếm lõi mạnh hơn, thay vì chọn giải pháp an toàn.