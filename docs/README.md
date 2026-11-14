# Mục lục Plan2Walk

| Mục | Tài liệu | Dùng để quyết định |
| --- | --- | --- |
| 01 | [Phạm vi sản phẩm](01-product-scope.md) | Giải bài toán nào, cho ai, kết quả dùng được là gì |
| 02 | [Đầu vào và dữ liệu kiểm thử](02-inputs-and-data.md) | Hỗ trợ nhóm bản vẽ nào, lấy mẫu ở đâu, xử lý ngoại lệ thế nào |
| 03 | [Kiến trúc và cấu trúc repo](03-architecture.md) | Đặt code ở đâu, các module phụ thuộc nhau thế nào |
| 04 | [Hợp đồng dữ liệu và pipeline](04-plan-pipeline.md) | API, toạ độ, phân công giữa bộ đọc, Gemini và engine hình học |
| 05 | [Luồng sử dụng và 3D](05-user-experience.md) | Tải bản vẽ, sửa cửa, xác nhận tỉ lệ và đi thử |
| 06 | [Kiểm thử và demo](06-verification-and-demo.md) | Bằng chứng cần có trước khi công bố hỗ trợ |
| 07 | [Docker, Cloud Run và Gemini](07-deployment.md) | Build image, cấu hình quyền, billing và xác minh deploy |
| 08 | [Thứ tự triển khai và mốc hackathon](08-implementation-plan.md) | Build phần nào trước, nghiệm thu từng bước và khai báo tiến độ |
| 09 | [Mockup giao diện desktop](09-ui-mockups.md) | Xem từng màn và tra phần cố định, trạng thái, dữ liệu bản vẽ |
| 10 | [Rà mockup và kế hoạch chuyển động](10-ui-review-and-motion-plan.md) | Xem ảnh nào cần sửa, cách duyệt theo vùng và thứ tự triển khai |
| 11 | [Mốc hoàn thành Plan2Walk V1](11-v1-completion.md) | Tra nghiệp vụ, màn hình, chất lượng hình học và 3D cần đạt để gọi là 100% V1 |
| 12 | [Kế hoạch nâng độ khớp và phần nhìn 3D](12-geometry-visual-plan.md) | Chốt cách đọc mặt bằng, chọn tài nguyên 3D và nghiệm thu qua Docker Compose cổng 3022 |

**Đường đọc theo việc cần làm**

- Chốt sản phẩm và phạm vi đầu vào → [01](01-product-scope.md) → [02](02-inputs-and-data.md) → [05](05-user-experience.md).
- Bắt đầu implementation sau khi có hiệu lệnh → [03](03-architecture.md) → [04](04-plan-pipeline.md) → [08](08-implementation-plan.md).
- Chuẩn bị demo và môi trường chạy → [06](06-verification-and-demo.md) → [07](07-deployment.md) → [08](08-implementation-plan.md).
- Duyệt hướng giao diện → [09](09-ui-mockups.md) → [10](10-ui-review-and-motion-plan.md).
- Đối chiếu hiện trạng với mốc 100% V1 → [11](11-v1-completion.md).
- Sửa độ khớp 2D–3D và nâng phần nhìn trên bản đang chạy → [12](12-geometry-visual-plan.md).

[Về README dự án](../README.md)
