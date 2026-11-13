# 01. Phạm vi sản phẩm

[Mục lục](README.md)

## 1.1. Bài toán

Mặt bằng 2D mô tả bố cục chính xác theo quy ước bản vẽ, nhưng người xem cần tự suy ra lối vào, liên kết giữa các phòng và cảm giác về không gian. Khi dựng lại bằng tay để trao đổi hoặc trình bày, người làm phải đọc và nhập lại nhiều thông tin đã có trong bản gốc.

Plan2Walk tạo bản nháp 3D từ tài liệu sẵn có và giữ liên kết với bản gốc để người duyệt kiểm tra. Kết quả hữu ích khi người xem đi được từ vị trí A đến B qua đúng cửa, đồng thời người duyệt chỉ ra được cửa đó đến từ đâu trên mặt bằng.

## 1.2. Người dùng và luồng chính

| Vai trò | Việc cần làm |
| --- | --- |
| Người chuẩn bị bản vẽ, chẳng hạn kiến trúc sư, kỹ thuật viên hoặc nhân viên vận hành | Chọn tầng hoặc vùng, kiểm tra bản nháp, sửa phần nhận sai và xác nhận tỉ lệ nếu có căn cứ. |
| Người cần hiểu không gian, chẳng hạn khách hàng, đồng nghiệp hoặc người quản lý công trình | Nhìn bố cục tổng thể, vào chế độ đi bộ và kiểm tra cách các phòng kết nối. |

Các vai trò trên có thể là cùng một người. Ca dùng đầu tiên là kiểm tra bố cục và lối đi của một mặt bằng kỹ thuật. Bán căn hộ, giới thiệu mặt bằng văn phòng và trao đổi phương án cải tạo đều dùng được cùng quy trình.

## 1.3. Phạm vi từng bước

- **P0 — Tạo bản nháp, đối chiếu và đi thử.** Xử lý một tầng hoặc vùng có hình học trong [hợp đồng đầu vào](02-inputs-and-data.md). Duyệt tường, cửa, phòng và tỉ lệ trên 2D. Đi thử bằng mô hình 3D được dựng từ dữ liệu đã sửa.
- **P1 — Lưu và chia sẻ bản đã duyệt.** Thêm bản lưu có phiên bản và link viewer khi có nhu cầu bàn giao cho người khác. Thêm luồng chọn trang hoặc vùng trực quan nếu cần xử lý hồ sơ thường xuyên.
- **P2 — Mở rộng nhóm bản vẽ.** Ưu tiên theo mẫu thực tế và số lần người dùng phải sửa. Có thể thêm hình học phức tạp, nhiều tầng và bộ đọc tệp CAD/BIM theo thứ tự nhu cầu.

## 1.4. Cách đánh giá giá trị

Đo thời gian từ lúc chọn bản vẽ tới lúc xác nhận lối đi, số cửa phải chỉnh và tỷ lệ mặt bằng hoàn thành theo nhóm đầu vào. Khi có người dùng thực, so sánh với thời gian dựng lại cùng bản vẽ bằng quy trình họ đang dùng.

Trạng thái tỉ lệ thuộc từng bản nháp. Bản minh họa vẫn cho xem bố cục. Khi cần kiểm tra kích thước, người duyệt phải xác nhận kích thước tham chiếu từ tài liệu hoặc số đo đã biết. Chiều cao và vật liệu minh họa được ghi rõ trong giao diện.

[Mốc hoàn thành V1](11-v1-completion.md) cụ thể hóa kết quả từ nhập nguồn đến bàn giao, kèm tiêu chí độ khớp bản vẽ và chất lượng 3D.
