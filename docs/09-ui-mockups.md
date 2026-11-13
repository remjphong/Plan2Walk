# 09. Mockup giao diện desktop

[Mục lục](README.md) · [Luồng sử dụng](05-user-experience.md) · [Rà mockup và kế hoạch chuyển động](10-ui-review-and-motion-plan.md)

[Bộ mockup studio sáng](assets/mockups-studio/README.md) gồm 12 màn và trạng thái, dùng màn Đối chiếu làm ảnh tham chiếu. Xem lại [bộ desktop với lề bản vẽ](assets/mockups-v3/README.md) và [bộ ảnh vòng trước](assets/mockups-v2/README.md). Nội dung bên dưới mô tả bộ ảnh vòng đầu.

**Trạng thái** — Bộ studio sáng đã chốt làm tham chiếu cho giao diện desktop. Phần đối chiếu dùng bản vẽ người dùng tải lên và mô hình dựng từ hình học đã phân tích. Phối cảnh có nội thất trong bộ ảnh thể hiện hướng mỹ thuật.

Bộ ảnh dùng một hồ sơ kỹ thuật minh họa gồm bốn trang. Trang 2 chứa mặt bằng hai phòng, một chi tiết cửa bên cạnh và đường kích thước 4 200 mm. Cửa D03 nối Xưởng với Phòng họp. Các ảnh thể hiện luồng chọn đúng phần mặt bằng, đối chiếu cửa trên 2D và 3D, xác nhận tỉ lệ rồi đi qua cửa.

## 9.1. Từng màn và trạng thái

| Màn | Phần cố định và thao tác | Dữ liệu thay đổi |
| --- | --- | --- |
| [01. Mở bản vẽ](assets/mockups/01-mo-ban-ve.png) | Vùng kéo thả, nút chọn tệp, danh sách định dạng và lối mở mẫu. Nét tường lớn ở bên phải là minh họa nền của màn trống. | Tên tệp, thumbnail và số trang chỉ xuất hiện sau khi có nguồn. |
| [02. Chọn trang và vùng](assets/mockups/02-chon-trang-va-vung.png) | Danh sách trang ở mép trái, thao tác zoom, đặt lại vùng và phân tích. Viền crop có bốn góc kéo. | Thumbnail, trang hiện tại, tờ PDF và vùng đã chọn. Vùng mẫu giữ cả đường kích thước và loại phần chi tiết cửa bên ngoài. Với ảnh đơn, ẩn danh sách trang. |
| [03. Đang phân tích](assets/mockups/03-dang-phan-tich.png) | Khung 2D/3D, nút đổi bản vẽ và dấu chờ trong vùng 3D. Dấu chờ dùng trạng thái không xác định thời lượng. | Preview vùng đã chọn và trạng thái request. Chỉ hiện tên bước chi tiết khi backend cung cấp thông tin đó. |
| [04. Đối chiếu](assets/mockups/04-doi-chieu.png) | Hai khung đồng bộ, bảng chỉnh theo đối tượng, thanh trạng thái tỉ lệ và thao tác đi thử. | Hình học gốc, mesh 3D, thực thể đang chọn, tường chủ, vị trí cửa và số vấn đề. Cửa D03 được đánh dấu ở cả hai khung. |
| [05. Xác nhận tỉ lệ](assets/mockups/05-xac-nhan-ti-le.png) | Dùng lại khung đối chiếu và vị trí bảng chỉnh. Form gồm khoảng cách, đơn vị, xác nhận và hủy. | Hai mốc A/B trên bản gốc, số đo người dùng nhập và trạng thái tỉ lệ. Giá trị 4 200 mm trong ảnh là ví dụ có căn cứ từ bản vẽ mẫu. |
| [06. Đi thử](assets/mockups/06-di-thu.png) | Giữ thanh menu, mở rộng viewport. Có lối về tổng thể, tâm nhìn, phím điều khiển và minimap. | Vị trí và hướng camera, tên phòng, hình học hiển thị và trạng thái tỉ lệ. Minimap đọc cùng mô hình với viewport. |
| [07. Lỗi phân tích](assets/mockups/07-loi-phan-tich.png) | Giữ bản gốc bên trái. Khung trạng thái bên phải có nguyên nhân ngắn, nút thử lại và lối mở bản mẫu. | Loại lỗi và bản vẽ đang xử lý. Mẫu là một nguồn riêng và có nhãn mẫu khi mở. |
| [08. Cần chọn vùng](assets/mockups/08-can-chon-vung.png) | Dùng lại khung trạng thái. Nút Chọn vùng đưa về bộ chọn trang và vùng. | Trang gốc còn nguyên hai hình. Dấu crop chỉ xuất hiện sau khi người dùng bắt đầu chọn vùng. |

## 9.2. Hệ hình ảnh dùng chung

- **Khung giao diện.** Giữ thứ tự và vị trí thương hiệu, **Nguồn / Đối chiếu / Đi thử** và **Phím tắt**. Tab đang mở có gạch chân và chữ đậm. Thanh thông tin dưới menu dành cho tên tác vụ, thông tin nguồn và hành động chính.
- **Nền và nét vẽ.** Giấy ngà `#F4F1E8` với vân nhẹ dành cho shell. Chấm lưới mờ và dấu canh góc gợi bàn vẽ ở viewport. Bản gốc giữ nét và màu của tài liệu. Vân giấy dừng ở lớp giao diện để tránh làm mờ bản vẽ.
- **Màu.** Xanh mực `#173A34` dành cho chữ, nút chính và tab hiện tại. Đất nung `#C34D35` dùng cho lựa chọn, mốc đo và cảnh báo. Cảnh báo có thêm biểu tượng và chữ để phân biệt với trạng thái đang chọn.
- **Chữ.** Dùng serif cho thương hiệu và tiêu đề, sans cho điều khiển, mono cho tên tệp và số đo. Hướng font là Instrument Serif, Instrument Sans và IBM Plex Mono. Khi triển khai, dùng font hỗ trợ đủ dấu tiếng Việt cho mỗi vai trò.
- **Bố cục đối chiếu.** 2D và 3D chia bằng đường kẻ mảnh. Bảng chỉnh giữ cùng vị trí khi chuyển từ sửa cửa sang đo tỉ lệ. Metadata theo ngữ cảnh gồm tên tệp và trang ở đầu, số cảnh báo khi cần xử lý, trạng thái tỉ lệ ở chân và thuộc tính của đối tượng trong bảng chỉnh.
- **Cảnh 3D.** Tổng thể và đi bộ dùng cùng bảng vật liệu minh họa, gồm tường thạch cao, sàn gỗ sáng và sàn bê tông nhạt. Ánh sáng làm rõ độ sâu và ngưỡng cửa. Độ chi tiết trong ảnh là hướng mỹ thuật. Khi không có dữ liệu phương Bắc, dùng bộ chỉ hướng mô hình với các trục cục bộ.

## 9.3. Quy tắc nối dữ liệu

- Nguồn tải lên quyết định tên tệp, số trang, hình ảnh gốc và nội dung đã in trên đó. Dữ liệu hệ thống sinh gồm khung chọn, marker, cảnh báo, overlay và mô hình. Giữ các lớp này riêng để có thể tắt hoặc cập nhật overlay mà vẫn xem được bản gốc.
- Thực thể cùng ID có chung trạng thái chọn ở 2D, 3D và bảng chỉnh. Khi chuyển sang đo tỉ lệ, mốc A/B được ưu tiên hiển thị để tránh lẫn với cửa đang sửa.
- Tỉ lệ chỉ đổi sang đã xác nhận sau thao tác xác nhận. Giá trị mét hoặc milimét trong bảng chỉnh cần căn cứ phù hợp. Cảnh báo hình học độc lập với trạng thái tỉ lệ.
- Cho đi thử khi có vị trí bắt đầu hợp lệ. Nếu lỗi hình học chặn lối đang xét, giải thích vị trí cần sửa trước khi đi thử qua lối đó.
- Các trạng thái chờ, lỗi dịch vụ và cần chọn vùng dùng chung khung. Giữ bản gốc nhìn thấy được. Chỉ gắn kết quả phân tích với đúng nguồn và revision tạo ra kết quả đó.

[Hợp đồng dữ liệu](04-plan-pipeline.md) · [Kiểm thử luồng](06-verification-and-demo.md)
