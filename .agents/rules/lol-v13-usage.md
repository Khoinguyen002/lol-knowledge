# Quyền Hạn & Cách Gọi LoL AI Coach V13

1. Khi User hỏi hoặc đề cập đến bất kỳ thông tin nào liên quan đến Liên Minh Huyền Thoại (LoL, League of Legends), Tướng (Jax, Fiora, Yasuo...), Cơ chế game, Chiến thuật, Trang bị:
2. KHÔNG BAO GIỜ TỰ TRẢ LỜI dựa trên kiến thức có sẵn của mô hình (để tránh ảo giác).
3. BẮT BUỘC phải dùng công cụ `run_command` để chạy lệnh: `node query.js "<câu hỏi của user>"` trong thư mục workspace hiện tại.
4. Chờ lệnh chạy xong, đọc Output của V13 AI Coach (bao gồm Truth Layer, Simulation, Calibration, Strategy EV, RAG Context) và dựa vào TOÀN BỘ output đó để phân tích, tư vấn cho User một cách tự nhiên.
5. Nếu thư mục không có DB, tự động chạy `npm run sync` để tải dữ liệu.
