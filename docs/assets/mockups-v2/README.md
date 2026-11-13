# Plan2Walk · Mockup desktop sáng

[Tài liệu giao diện](../../09-ui-mockups.md) · [Mục lục dự án](../../README.md)

| Màn hoặc trạng thái | Ảnh | Dữ liệu thay đổi |
| --- | --- | --- |
| Mở bản vẽ | [01](01-mo-ban-ve.png) | Chưa có tệp hoặc mô hình. Cụm giấy can và mô hình kiến trúc là minh họa màn trống. |
| Chọn trang và vùng | [02](02-chon-trang-va-vung.png) | Tên tệp, trang, bản gốc, hình thu nhỏ và vùng chọn. |
| Đang phân tích | [03](03-dang-phan-tich.png) | Vùng bản gốc được gửi đi. Khung 3D chờ kết quả. |
| Đối chiếu | [04](04-doi-chieu.png) | Bản gốc, overlay, mô hình, cảnh báo và thông số cửa. |
| Xác nhận tỉ lệ | [05](05-xac-nhan-ti-le.png) | Mốc A/B, khoảng cách người dùng nhập, đơn vị và trạng thái xác nhận. |
| Chọn điểm đứng | [06](06-chon-diem-dung.png) | Vị trí bắt đầu trên mặt bằng và trạng thái điểm đứng. |
| Đi thử | [07](07-di-thu.png) | Góc nhìn 3D, vị trí và hướng trên minimap, tên phòng và trạng thái tỉ lệ. |
| Lỗi phân tích | [08](08-loi-phan-tich.png) | Nguồn đã chọn, thông báo lỗi và thao tác thử lại. |
| Cần chọn vùng | [09](09-can-chon-vung.png) | Trang gốc có nhiều hình. Vùng được chọn khi trở về màn Nguồn. |
| Cảnh báo đối chiếu | [10](10-canh-bao-doi-chieu.png) | Danh sách vấn đề từ revision đang mở. |
| Phím tắt | [11](11-phim-tat.png) | Hộp thoại dùng chung, trả focus về nút mở khi đóng. |
| Thêm cửa | [12](12-them-cua.png) | Cửa đang chỉnh ở 2D. Mô hình 3D cập nhật sau khi lưu. |

Giữ chung menu, vị trí tiêu đề, bảng màu và ngữ nghĩa nút qua các màn. Dùng nền trắng và xanh nhạt, cobalt cho thao tác chính, san hô cho đối tượng đang chọn và hổ phách cho cảnh báo. Chừa trống dải quanh tiêu đề và chân trang. Giữ một cụm trang trí nhỏ ở mép khi màn còn chỗ.

Đây là ảnh ý tưởng được tạo bằng ImageGen. Tên tệp, mặt bằng, số liệu và nội thất trong ảnh minh họa cách bố trí. Khi triển khai, bản gốc lấy từ tệp người dùng và 3D lấy từ dữ liệu hình học của revision đang mở. Nhãn và nút bám theo trạng thái thực tế trong app.

Khi chuyển ảnh thành UI, dùng một bố cục chung cho ba trạng thái phân tích, lỗi và cần chọn vùng. Giữ đúng nút phóng to, thu nhỏ và vừa khung theo vị trí thật. Trong danh sách cảnh báo, chỉ hiện dấu điều hướng ở dòng có đích đến. Khi thêm cửa, nút Hủy luôn khả dụng. Giá trị nhập khoảng cách để trống cho đến khi người dùng điền.
