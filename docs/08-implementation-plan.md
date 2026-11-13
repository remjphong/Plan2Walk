# 08. Thứ tự triển khai và mốc hackathon

[Mục lục](README.md)

## 8.1. Các quyết định đã thống nhất

| Quyết định | Áp dụng |
| --- | --- |
| Plan2Walk xử lý mặt bằng kiến trúc tổng quát | Bắt đầu với mặt bằng kỹ thuật. Bán căn hộ, văn phòng hoặc cải tạo là các ca dùng cùng một năng lực cốt lõi. |
| Build repo mới theo structure đã chọn | Repo partner dùng để rà vấn đề và rút ca kiểm thử. Công việc triển khai thực hiện trên cấu trúc mới trong [mục 03](03-architecture.md). |
| Một tầng hoặc vùng được chọn | Nhiều dạng tệp dùng chung `FloorPlanV1`. Chất lượng được kiểm theo nhóm tài liệu và nhóm hình học. |
| Gemini đọc, geometry kiểm, Three.js hiển thị | Code sinh mesh và tính đường đi. Người dùng duyệt phần chưa chắc và xác nhận tỉ lệ khi có bằng chứng. |
| Tài liệu trước, implementation sau hiệu lệnh | Các bước triển khai bên dưới là kế hoạch để đội duyệt. |

## 8.2. Thứ tự build

| Bước | Làm gì | Nghiệm thu |
| --- | --- | --- |
| 1. Hợp đồng và fixture | Dựng workspace NestJS + React. Tạo schema và fixture hai phòng có cửa, một đoạn kích thước tham chiếu. | Schema parse được fixture hợp lệ, báo đúng trường sai. Code geometry chạy độc lập. |
| 2. Hình học và viewer | Dựng tường, khoét cửa, sàn và collision. Hiển thị fixture bằng Three.js. | Đi qua cửa có khe giữa hai sàn, bị chặn ở tường bên cạnh. Thấy được đường đi trong browser. |
| 3. Đọc tài liệu và gọi AI | Cho PDF kỹ thuật một trang đi hết luồng. Kiểm tra PDF.js trong Docker, lấy vector/text khi có và nối Gemini theo SDK. Sau đó chạy PDF scan và ảnh qua cùng hợp đồng. | Bản mới qua upload, có overlay khớp nguồn và dựng được bản nháp 3D. Phân biệt kết quả live với fixture. |
| 4. Duyệt và demo | Sửa cửa trên overlay, chỉnh vùng ảnh hưởng, xác nhận tỉ lệ hai điểm. Gắn hướng dẫn và trạng thái lỗi. | Cùng một revision cập nhật 2D và 3D. Có ca test đổi tệp trong lúc phân tích và đi qua cửa sau khi sửa. |
| 5. Deploy và kiểm bằng nguồn mới | Triển khai Docker lên Cloud Run, thử quyền Gemini, chạy bộ mẫu và ghi kết quả. | URL thực chạy trọn luồng trên một bản mới. Các dạng đầu vào được báo theo số mẫu đã kiểm. |
| 6. Lưu và chia sẻ | Thêm bản lưu có version, viewer chỉ đọc và quyền truy cập. Ưu tiên cải thiện bộ chọn trang/vùng nếu đó là điểm nghẽn của người dùng. | Link mở lại trên thiết bị khác đúng revision đã duyệt, theo quyền được cấp. |

Bước 2 và kiểm tra thư viện PDF trong Docker có thể chạy song song sau khi đã chốt hợp đồng dữ liệu. Khi có quyền Cloud Run, làm smoke test môi trường sớm trong lúc hoàn thiện UI. Nếu thời gian ngắn, ưu tiên một bản kỹ thuật thật đi hết luồng với một cửa sửa được. Mở rộng số dạng đầu vào, chất lượng vật liệu và chia sẻ theo kết quả đã kiểm.

## 8.3. Mốc 30% và khai báo hiện trạng

Theo thể lệ được cung cấp, BTC xem xét dự án đã làm trước dựa trên bản hiện tại và hướng phát triển tiếp. Cách tính 30% chưa được xác nhận trong tài liệu đang có. Đội cần gửi đúng snapshot đã có, mô tả phần chạy được, phần dự kiến làm trong buổi thi và xin BTC xác nhận khi cần. Tách repository hoặc cắt tính năng ở bản nộp không thay đổi lượng công việc đã thực hiện trước đó. [Trang sự kiện GDG](https://gdg.community.dev/events/details/google-gdg-mientrung-presents-hackathon_gdg-devfest-mientrung-2026/)

Hồ sơ khai báo ngắn gọn gồm **snapshot và thời điểm**, **những gì đã chạy**, **tài liệu hoặc fixture đã chuẩn bị**, **phần còn phải triển khai**, và **repo tham chiếu cùng mức sử dụng thực tế**. Mốc hoàn thành được mô tả bằng năng lực đã kiểm chứng như đọc một tệp mới, cho đi qua cửa, sửa bản nháp hay deploy live. Số dòng code và số file tài liệu chỉ phản ánh kích thước thay đổi.

[Mốc hoàn thành Plan2Walk V1](11-v1-completion.md) là chuẩn nội bộ để đội đối chiếu từng nghiệp vụ, chất lượng bản vẽ và chất lượng 3D. Ghi phần đã chạy, phần còn thiếu và bằng chứng tại thời điểm chốt snapshot.

## 8.4. Việc cần xác minh khi bắt đầu

- Chọn các PDF kỹ thuật và ảnh kiểm thử có quyền sử dụng, kèm đáp án về cửa và tỉ lệ.
- Kiểm render PDF trong image Linux. Chốt cách lấy ứng viên vector sau khi đã nhìn kết quả trên bản kỹ thuật.
- Xác nhận cách BTC cấp project, quyền gọi Gemini và hạn mức thực tế.
- Kiểm tra hiệu năng trên bản đầu vào mới. Dựa vào kết quả để chốt ngưỡng kích thước, timeout và nhóm tài liệu có thể công bố hỗ trợ.

[Phạm vi đầu vào](02-inputs-and-data.md) · [Nghiệm thu và demo](06-verification-and-demo.md) · [Deploy](07-deployment.md)
