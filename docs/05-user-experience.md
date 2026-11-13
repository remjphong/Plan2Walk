# 05. Luồng sử dụng và 3D

[Mục lục](README.md) · [Mockup từng màn](09-ui-mockups.md)

## 5.1. Luồng chính

1. **Mở bản vẽ.** Hiển thị loại tệp, trang hoặc vùng đang xử lý và preview. Nếu PDF có nhiều trang hoặc một trang có nhiều hình, cho người dùng xác nhận phần cần dựng. P0 có thể hỗ trợ vùng crop chuẩn bị sẵn.
2. **Đối chiếu bản nháp.** Hai khung chính hiển thị mặt bằng gốc với overlay bên trái và 3D bên phải. Bấm một cửa hoặc cảnh báo để đưa 2D và 3D đến đúng vị trí.
3. **Sửa phần ảnh hưởng đến lối đi.** Chọn cửa, kéo dọc tường, chỉnh rộng hoặc gán tường chủ. Với tường hay phòng nhận sai, cho sửa điểm ảnh hưởng đến khu vực đang duyệt. Đổi hình học phải cập nhật overlay, 3D và collision từ cùng một revision.
4. **Xác nhận tỉ lệ khi có số đo.** Người dùng bấm hai điểm và nhập chiều dài đã biết. UI giữ dấu mốc và hiển thị trạng thái tỉ lệ cạnh mọi số đo.
5. **Đi thử.** Mở góc nhìn tổng thể trước, chọn vị trí bắt đầu trong phòng hợp lệ rồi vào chế độ đi bộ. Có hướng dẫn điều khiển, thoát chế độ và đặt lại vị trí.

## 5.2. Các trạng thái quan trọng

| Trạng thái | Cách hiển thị và thao tác |
| --- | --- |
| Đang đọc hoặc phân tích | Giữ preview và cho đổi nguồn. Chỉ áp dụng response khớp với nguồn và revision hiện tại. |
| Cần duyệt | Gắn marker vào đúng đối tượng hoặc vùng. Cho sửa ngay từ thông báo. |
| Xem minh họa | Cho xem bố cục và đi thử ở vùng đủ dữ liệu. Gắn nhãn chiều cao, vật liệu và số đo ước lượng. |
| Đã xác nhận tỉ lệ | Hiện số đo theo đơn vị thật kèm điểm tham chiếu. Việc xác nhận tỉ lệ vẫn độc lập với cảnh báo về tường và cửa. |
| Tệp hoặc vùng ngoài phạm vi | Nêu phần nào ngoài phạm vi và thao tác tiếp theo như chọn trang, crop hoặc dùng bản rõ hơn. |
| Dịch vụ AI lỗi hoặc hết quota | Giữ nguồn, vùng đã chọn và bản nháp đã có. Cho thử lại hoặc quay về đối chiếu bản đã có. |

## 5.3. Hướng hiển thị 3D

Dùng góc **isometric** có thể mở mặt tường gần camera để đọc bố cục, sau đó chuyển sang **góc nhìn thứ nhất** để đi thử. Tường màu trung tính, sàn phân biệt theo khu vực, ánh sáng dịu và đường biên cửa rõ. Màu chọn đồng nhất giữa overlay và 3D. Viewer ưu tiên thấy hướng đi, vị trí cửa và phòng đang chọn.

P0 dùng hình học sinh trực tiếp và vật liệu đơn giản để scene phản hồi ngay sau edit. Nội thất có thể xuất hiện dưới dạng khối minh họa nếu có dữ liệu và phục vụ ca kiểm thử. Mô hình nội thất chi tiết, ánh sáng chân thực và bộ vật liệu mở rộng thuộc phần nâng chất lượng hiển thị sau khi cửa và sàn đã đúng.

P1 có thể cung cấp viewer chỉ đọc bằng link của revision đã duyệt. Phần lưu, quyền truy cập và việc công bố bản nháp phải được giải quyết cùng lúc. [Triển khai theo bước](08-implementation-plan.md)

[Tiêu chí V1 cho chất lượng 3D và giao diện](11-v1-completion.md#114-chất-lượng-3d-và-giao-diện) dùng để rà khung đối chiếu, góc tổng thể và chế độ đi bộ trên bản vẽ thật.
