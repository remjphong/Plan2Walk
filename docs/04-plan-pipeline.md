# 04. Hợp đồng dữ liệu và pipeline

[Mục lục](README.md)

## 4.1. Mô hình `FloorPlanV1`

| Trường | Nội dung |
| --- | --- |
| `schemaVersion`, `revision` | Phiên bản định dạng và revision bản nháp để ghép đúng kết quả khi chỉnh sửa. |
| `source` | Loại tệp, định danh nguồn, trang nếu có, hướng, vùng chọn, kích thước và phép đổi tọa độ về mặt bằng gốc. |
| `walls` | ID, hai đầu đoạn theo tim tường, độ dày nếu có và nguồn bằng chứng. |
| `rooms` | ID, polygon biên phòng, tên hoặc loại phòng nếu nhận được. |
| `openings` | ID, loại cửa/cửa sổ, ID tường chủ, độ lệch dọc tường và chiều rộng. Vùng phát hiện chưa gán được tường nằm trong danh sách cần duyệt. |
| `scale` | `unknown`, `estimated` hoặc `verified`. Khi đã xác nhận, lưu hai điểm, chiều dài thực theo mét và nguồn số đo. |
| `issues` | Mã lỗi, mức độ, thực thể hoặc vùng liên quan và cách xử lý. Do pipeline và engine sinh ra từ bản nháp hiện tại. |

**Tọa độ chuẩn.** Lưu hình học 2D theo hệ tọa độ ảnh phân tích sau khi xoay và crop, gốc trái trên, x sang phải, y xuống dưới. Nếu Gemini trả tọa độ chuẩn hoá, adapter đổi sang pixel đúng một lần theo kích thước ảnh thực gửi đi. Mỗi phép crop, xoay hoặc resize có phép biến đổi để vẽ overlay lại trên nguồn. Giữ cùng một hệ tọa độ cho mọi edit. Geometry chuyển x/y sang x/z của 3D và dùng trục y cho chiều cao.

**Tỉ lệ.** Số mét trên một pixel bằng khoảng cách thực giữa hai điểm chia cho khoảng cách pixel trong hệ chuẩn. Chỉ thao tác xác nhận của người duyệt mới đặt `verified`. Tỉ lệ trang giấy hoặc diện tích ghi trên brochure là thông tin tham khảo khi thiếu một đoạn đo đối chiếu được. Giá trị chiều cao, độ dày và vật liệu giả định được ghi rõ trong UI.

## 4.2. Các bước xử lý

1. **Nhận và chuẩn hoá.** Xác thực định dạng qua nội dung tệp, giới hạn kích thước và số pixel. Chọn trang hoặc vùng, áp dụng hướng và tạo preview cùng phép đổi tọa độ. PDF khóa, tệp lỗi hoặc vùng quá mờ trả hướng dẫn chọn nguồn khác.
2. **Lấy bằng chứng từ PDF.** Với PDF vector, bộ đọc lấy text và các toán tử vẽ. Sau khi đổi qua viewport, thử tạo ứng viên từ đoạn gần song song, giao điểm và biên phòng. Kiểm tra trên fixture trước khi áp dụng bộ lọc bỏ đường kích thước, ghi chú hoặc nội thất. Nét PDF là bằng chứng hình học và cần được diễn giải thành tường, phòng, cửa.
3. **Dùng Gemini theo loại đầu vào.** Với ảnh và PDF scan, gửi preview vùng chọn để đề xuất hình học. Với PDF vector, ưu tiên ứng viên có bằng chứng, gửi Gemini các vùng hoặc ký hiệu cần diễn giải. Yêu cầu structured output có trường thiếu hợp lệ và vị trí bằng chứng khi có. Model, giới hạn ảnh và timeout cấu hình ở backend. [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output/)
4. **Hợp nhất và kiểm tra.** Parse bằng Zod, đối chiếu ID và phạm vi, gộp ứng viên trùng với ngưỡng có kiểm thử. Kiểm tra polygon tự cắt, tường suy biến, cửa lệch tường, cửa chồng nhau, cửa ra biên và hai phía cửa nối vùng đi được hay không. Xung đột giữa ảnh và vector hiển thị để người dùng xác nhận.
5. **Dựng hình.** Dựng sàn, chia tường tại đoạn cửa, tạo vùng chuyển qua bề dày tường cho cửa nối hợp lệ và tính va chạm theo bán kính người đi. Cửa sổ vẫn giữ phần cản ở bên dưới. Bản nháp thiếu căn cứ cho một vùng có thể xem tổng thể và hiện điểm cần sửa.
6. **Duyệt và tính lại.** Người dùng sửa một thực thể trên 2D hoặc xác nhận số đo. Tạo revision mới và tính lại lỗi, mesh và va chạm từ cùng bản nháp. Giá trị đã duyệt giữ nguyên cho đến khi có edit hoặc lần phân tích mới được áp dụng.

## 4.3. Quy tắc collision

Một cửa đi trong nhà hợp lệ tạo vùng nối giữa hai sàn liên quan. Camera được phép ở trong vùng sàn hoặc vùng nối này, sau khi kiểm tra hình học vật cản. Nếu hai polygon kết thúc tại hai mặt tường, vùng cửa phải phủ được khe giữa chúng. Kiểm tra đường đi bằng nhiều bước nhỏ từ bên này sang bên kia để thấy cả lỗi chặn cửa lẫn lỗi xuyên tường. Cửa ngoài kết thúc ở biên mô hình, trừ khi có vùng sàn phía ngoài trong phạm vi phân tích.

## 4.4. API P0 dự kiến

| Endpoint | Hợp đồng |
| --- | --- |
| `GET /api/health` | Kiểm tra tiến trình và báo cấu hình AI có mặt. |
| `POST /api/plans/analyze` | Multipart gồm `file`, trang đếm từ 1 nếu là PDF và vùng crop nếu cần. Crop dùng hệ tọa độ preview đã định hướng, theo tỉ lệ 0–1. Trả bản nháp `FloorPlanV1` gồm các vấn đề cần duyệt, preview vùng phân tích và định danh request. |

API trả lỗi theo dạng `{ code, message, requestId }`. Dùng 400 cho tham số sai, 413 cho tệp quá lớn, 415 cho loại tệp ngoài phạm vi, 422 cho nội dung đọc được nhưng thiếu điều kiện phân tích, 429 cho giới hạn yêu cầu, 503/504 cho lỗi dịch vụ AI tạm thời hoặc hết hạn. Phân tích một trang mỗi lần. Deadline của ứng dụng nhỏ hơn timeout hạ tầng. Thử lại có giới hạn cho lỗi tạm thời nếu ngân sách thời gian còn đủ.

Web dùng chung schema và geometry để cập nhật ngay sau edit trong P0. Khi thêm lưu hoặc xuất bản, API xác thực lại bản nháp và tự tính trạng thái phát hành. [UX và các trạng thái](05-user-experience.md)
