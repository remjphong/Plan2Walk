# 02. Đầu vào và dữ liệu kiểm thử

[Mục lục](README.md)

## 2.1. Hợp đồng đầu vào P0

Đơn vị xử lý là mặt bằng kiến trúc của **một tầng trong một trang hoặc một vùng đã chọn**. P0 ưu tiên mặt bằng nhìn thẳng từ trên xuống, tường thẳng theo hai trục chính của bản vẽ, biên phòng và vị trí cửa nhìn rõ. Cùng điều kiện hình học áp dụng cho PDF kỹ thuật, ảnh scan và ảnh minh họa.

| Nhóm tài liệu | Xử lý dự kiến | Điều kiện đầu vào |
| --- | --- | --- |
| PDF vector xuất từ CAD hoặc phần mềm thiết kế | Đọc đường nét và text trước. Dùng ảnh render của vùng chọn để phân loại ký hiệu hoặc phân tích phần còn thiếu. | Chọn một trang. Trang có nhiều hình phải chọn vùng mặt bằng. |
| PDF scan | Render trang được chọn rồi xử lý như ảnh. | Bản scan đủ rõ, hướng đọc xác định được. |
| PNG, JPG | Kiểm tra ảnh, chuẩn hoá hướng, phân tích toàn ảnh hoặc vùng được chọn. | Tường và cửa phân biệt được với nội thất hoặc đường kích thước. |
| Trang có nhiều căn, nhiều tầng hoặc nhiều hình | Yêu cầu người dùng chọn phạm vi rồi mới phân tích. | P0 có thể yêu cầu người dùng crop sẵn nếu chưa có bộ chọn vùng trong UI. |
| Hồ sơ điện, nước, kết cấu; DWG, DXF, IFC gốc | Xác định mặt bằng kiến trúc làm đầu vào. Đánh giá bộ đọc CAD/BIM riêng ở các bước mở rộng. | Bản vẽ dùng để dựng tour cần có thông tin kiến trúc đủ để xác định không gian và lối đi. |

Bản mờ, biến dạng phối cảnh, tường cong, cầu thang hoặc lối đi không rõ cần được đánh dấu theo vùng. Người dùng có thể chọn tài liệu rõ hơn, sửa hình học hoặc thu hẹp phạm vi. Bộ đọc không tự gộp các hình rời thành một tầng.

## 2.2. Mẫu tham chiếu thực tế

| Mẫu | Dùng để kiểm tra |
| --- | --- |
| [Bản kỹ thuật căn một phòng ngủ, hồ sơ Mill Hill](https://data.london.gov.uk/download/2y55w/7d12ac8c-a26e-4c4b-b152-9deab058f61d/A_44032_MH%20-%20A50-00-05%20-%20TYPICAL%201%20BEDROOM%20APARTMENT_B.02.pdf) | Nhận diện tường và cửa giữa ghi chú kỹ thuật, nội thất và chỉ dẫn kích thước. |
| [Ảnh mặt bằng The Tonkin 2PN](https://market.vinhomes.vn/blog/mat-bang-can-ho-2-phong-ngu-the-tonkin) | Dạng ảnh có màu, vật liệu, nội thất minh họa và thông tin diện tích. |
| [Mặt bằng tầng Vinhomes S4.03, trang 2](https://smartcity.vinhomes.vn/wp-content/uploads/2020/07/To-gap-S403.pdf#page=2) | Kiểm tra luồng chọn vùng khi một tài liệu có nhiều căn và chú giải. |

Các tài liệu trên dùng để tham chiếu dạng đầu vào. Fixture được lưu vào repo phải có quyền sử dụng phù hợp. Ưu tiên tự tạo mặt bằng có đáp án rõ và dùng tài liệu thực tế đã được phép sử dụng.

## 2.3. Dataset và nhãn

**CubiCasa5K** cung cấp ảnh mặt bằng có nhãn để đánh giá nhận diện phòng, tường và cửa trong phạm vi giấy phép phi thương mại. Dataset cung cấp mẫu và đáp án. Chất lượng hiển thị 3D đến từ hình học, ánh sáng, vật liệu và điều khiển của viewer. [Repo CubiCasa5K](https://github.com/CubiCasa/CubiCasa5k) · [Giấy phép](https://raw.githubusercontent.com/CubiCasa/CubiCasa5k/master/LICENSE)

Mỗi fixture cần biết nguồn, quyền dùng, nhóm đầu vào, vùng phân tích, tường/cửa/phòng đã đối chiếu, tỉ lệ nếu biết, và kết quả mong đợi. Chia theo **họ bản vẽ** để bản xuất từ cùng một template không xuất hiện ở cả tập chỉnh pipeline và tập đánh giá. Mẫu không có đáp án có thể dùng để khảo sát lỗi. Số liệu công bố lấy từ mẫu đã được kiểm nhãn.

Để đánh giá đầu vào kỹ thuật dùng thực tế tại Việt Nam, bổ sung PDF và scan từ các đơn vị đồng ý cung cấp bản vẽ. [Tiêu chí kiểm thử](06-verification-and-demo.md)
