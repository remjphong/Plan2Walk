# Plan2Walk · Mockup studio sáng

[Tổng quan 12 màn](overview.png) · [Tài liệu giao diện](../../09-ui-mockups.md) · [Bộ trước](../mockups-v3/README.md)

| Màn hoặc trạng thái | Mockup | Nội dung phụ thuộc dữ liệu |
| --- | --- | --- |
| Mở bản vẽ | [01](01-mo-ban-ve.png) | Trạng thái tải tệp. Mô hình trên giấy là minh họa cho màn trống. |
| Chọn trang và vùng | [02](02-chon-trang-va-vung.png) | Tên tệp, số trang, thumbnail và khung khoanh trên bản gốc. |
| Đang phân tích | [03](03-dang-phan-tich.png) | Vùng nguồn đang gửi và trạng thái chờ. |
| Đối chiếu | [04](04-doi-chieu.png) | Bản gốc, 3D, cảnh báo và cửa đang chọn. Chiều rộng theo pixel khi chưa xác nhận tỉ lệ. |
| Xác nhận tỉ lệ | [05](05-xac-nhan-ti-le.png) | Mốc A/B và khoảng cách người dùng nhập. |
| Chọn điểm đứng | [06a](06a-chon-diem-dung.png) | Điểm bắt đầu hợp lệ trên mặt bằng. |
| Đi thử | [06](06-di-thu.png) | Viewport 3D, tên phòng, vị trí và hướng trên minimap. |
| Lỗi phân tích | [07](07-loi-phan-tich.png) | Nguồn đang mở, lý do và thao tác thử lại. |
| Cần chọn vùng | [08](08-can-chon-vung.png) | Trang gốc đầy đủ và thao tác quay về khoanh vùng. |
| Cảnh báo đối chiếu | [10](10-canh-bao-doi-chieu.png) | Danh sách vấn đề, với liên kết tới cửa có thể đối chiếu. |
| Phím tắt | [11](11-phim-tat.png) | Hộp thoại dùng chung trên màn đang mở. |
| Thêm cửa | [12](12-them-cua.png) | Cửa tạm trên 2D. Lưu cửa bật khi có chiều rộng hợp lệ, rồi mới cập nhật mô hình. |

Dùng chung menu, thanh tiêu đề và khung cho ba trạng thái phân tích. Nét mặt cắt, giấy can và mẫu vật liệu là phần trang trí ngoài vùng thao tác. Thước trang trí dùng vạch không số. Tên tệp, số trang, cảnh báo và kích thước trên các ảnh là dữ liệu minh họa. Trạng thái tỉ lệ ở màn Đi thử hiển thị như thông tin, dù ảnh thể hiện dưới dạng nhãn xanh. Nội thất và ánh sáng trong ảnh là tham chiếu mỹ thuật. Viewer dùng hình học của hồ sơ.

Bộ ảnh được tạo bằng ImageGen, lấy màn Đối chiếu làm tham chiếu cho khung, màu và kiểu chữ. Mỗi ảnh thay nội dung theo đúng thao tác hoặc trạng thái trong bảng.
