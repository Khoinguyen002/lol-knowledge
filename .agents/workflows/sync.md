---
description: Workflow tự động kiểm tra và đồng bộ hóa phiên bản Liên Minh Huyền Thoại mới nhất cho CSDL Vector và Chế độ chơi.
---

# Quy Trình Đồng Bộ Hóa Phiên Bản Mới (Sync Workflow)

Quy trình này hướng dẫn Agent tự động phát hiện, cập nhật phiên bản game mới nhất, điều chỉnh config và build lại cơ sở dữ liệu vector.

## Các bước thực hiện:

1. **Tìm kiếm (Research) phiên bản LMHT mới nhất:**
   - Sử dụng công cụ `search_web` tìm kiếm: `latest league of legends patch version 2026` hoặc `league of legends patch notes current version`.
   - Xác định số phiên bản mới nhất (ví dụ: `16.13.1` hoặc `26.13.1`).

2. **Cập nhật File [config.json](../../config.json):**
   - Đọc file `config.json` hiện tại.
   - Nếu số phiên bản Riot mới nhất khác với `activeVersion` hiện tại, sử dụng công cụ chỉnh sửa để cập nhật `activeVersion` thành phiên bản mới nhất.

3. **Cập nhật Chế độ chơi (Game Mode Updates):**
   - Thực hiện quy trình cập nhật chế độ chơi xoay tua (như ARAM Hỗn Loạn) nếu có cập nhật trong patch mới:
     - Tìm kiếm thông tin cập nhật lõi/luật chơi của bản đó.
     - Cập nhật [game_modes.json](../../game_modes.json) theo cấu trúc đã quy định trong [SKILL.md](../skills/lol-coach/SKILL.md).

4. **Biên dịch & Đồng bộ Database (Run Sync):**
   - Sử dụng công cụ `run_command` chạy lệnh: `npm run sync`.
   - Đợi tác vụ chạy ngầm hoàn tất thành công. Hệ thống sẽ tự động tải các dữ liệu Riot mới nhất và kết hợp cấu hình cục bộ để tạo ra file database vector mới (ví dụ: `db_16.13.1.json`).

5. **Kiểm thử & Xác nhận (Verify):**
   - Chạy lệnh test: `node query.js "hỗn loạn"` hoặc `node query.js "aram"` để đảm bảo cơ sở dữ liệu mới hoạt động tốt, không có lỗi runtime.
   - Báo cáo kết quả phiên bản mới đã cập nhật cho người dùng.
