# 11. Mốc hoàn thành Plan2Walk V1

[Mục lục](README.md) · [Phạm vi đầu vào](02-inputs-and-data.md) · [Thứ tự triển khai](08-implementation-plan.md)

## 11.1. Kết quả người dùng nhận được

V1 hoàn thành khi người chuẩn bị hồ sơ có thể nhập mặt bằng kiến trúc của một tầng, sửa và kiểm chứng bố cục dựa trên nguồn, lưu công việc, rồi bàn giao đúng phiên bản 3D đã duyệt cho đồng nghiệp hoặc khách hàng. Cùng luồng này áp dụng cho căn hộ, văn phòng và cải tạo.

Phạm vi V1 đề xuất gồm PDF kỹ thuật dạng vector, PDF scan và ảnh PNG/JPG nhìn thẳng, đủ rõ. Một trang có nhiều hình cần chọn riêng vùng. Hình học bao gồm tường thẳng theo hai trục, phòng chữ nhật hoặc đa giác trực giao như phòng chữ L, và vùng mở liền nhau như bếp nối phòng khách. Tường cong, tường xiên, nhiều tầng liên thông, CAD/BIM gốc và nội thất photorealistic thuộc các hướng mở rộng.

## 11.2. Nghiệp vụ, màn hình và điều kiện nghiệm thu

| Mốc | Màn hình hoặc luồng | Nghiệm thu | Hiện trạng |
| --- | --- | --- | --- |
| 1. Nhận nguồn | **Nguồn** · nhập tệp, chọn trang/vùng, trạng thái phân tích | Chọn đúng tầng và giữ nguồn cùng vùng khi thử lại. Báo đúng lý do cho tệp lỗi, ảnh phối cảnh và vùng thiếu dữ liệu. Overlay khớp nguồn khi đổi zoom, crop hoặc xoay. | Có tải PDF/PNG/JPG, chọn trang/vùng và phân tích thật. Còn ca đã khoanh tầng vẫn dựng thất bại. |
| 2. Dựng và sửa hình học | **Đối chiếu 2D–3D** · cảnh báo, công cụ sửa, xác nhận tỉ lệ | Chọn cảnh báo để tới đúng vùng hoặc thực thể. Thêm, sửa, xóa tường và cửa. Sửa biên hoặc gộp vùng mở. Chỉnh cửa sổ khi ảnh hưởng kết quả. Có hoàn tác. Mỗi lần sửa cập nhật overlay, mesh và collision từ cùng revision. | Có đối chiếu, sửa cửa đi và xác nhận tỉ lệ. Tường vẫn dựng theo biên phòng chữ nhật. Chưa có công cụ sửa vách hoặc biên phòng. |
| 3. Kiểm tra lối đi và đọc mô hình | **Kiểm tra A–B**, **Đi thử** | Người dùng chọn hai điểm, thấy đường đi hợp lệ hoặc vùng mất kết nối, rồi thử trong 3D. Cửa đi hợp lệ cho qua, tường và cửa sổ chặn. Đạt các tiêu chí thị giác tại mục 11.4. | Có góc tổng thể và đi bộ với collision. Chưa có kiểm tra A–B hay chỉ ra vùng mất kết nối. |
| 4. Lưu và tiếp tục công việc | **Danh sách dự án**, **Chi tiết dự án** | Lưu nguồn, trang/vùng, revision đang sửa và mốc tỉ lệ. Hiện rõ đang lưu, đã lưu hoặc lỗi. Đóng tab, mở lại và tiếp tục đúng bản đã sửa, kể cả sau khi backend khởi động lại. | Bản nháp đang ở trong phiên trình duyệt. |
| 5. Duyệt và bàn giao | **Lịch sử phiên bản**, **Viewer chỉ xem**, **Đăng nhập và quyền dự án** | Chỉ xác nhận khi lỗi hình học ảnh hưởng lối đi đã được xử lý. Link mở đúng revision đã duyệt trên thiết bị khác và giữ nguyên khi tạo bản nháp mới. Kiểm quyền chủ dự án, người chỉnh sửa và người xem. Bản chưa xác nhận tỉ lệ hiển thị nhãn minh họa khi xem. | Chưa có lưu phiên bản, duyệt, tài khoản hoặc chia sẻ. |
| 6. Vận hành và kiểm chứng | **Môi trường đích**, **bộ bản vẽ nghiệm thu** | Chạy trọn luồng trên Cloud Run với Gemini thật. Kiểm lỗi AI, khôi phục luồng làm việc, quyền truy cập và dữ liệu qua lần khởi động lại. Đạt các tiêu chí tại mục 11.5. | Docker Compose tách frontend/backend đã chạy local với DeepSeek. Cloud Run và Gemini trên môi trường đích cần kiểm chứng. |

Thứ tự ưu tiên là **sửa hình học → kiểm tra lối đi và hoàn thiện viewer → lưu/mở lại → duyệt và chia sẻ**. Thử deploy và quyền Gemini sớm. Đăng nhập theo lời mời và quyền theo dự án đi cùng bước bàn giao hồ sơ riêng. Đăng ký công khai có thể bổ sung sau V1.

## 11.3. Độ khớp giữa bản vẽ và mô hình

Đợt thử thăm dò trên 8 tệp có 4 tệp dựng được bản nháp, 2 tệp cần khoanh vùng, 1 ảnh phối cảnh được từ chối và 1 hồ sơ lỗi phân tích. PDF và PNG Mill Hill là cùng một mặt bằng. Bản Mill Hill thiếu cửa phòng ngủ và dư vách giữa bếp với phòng khách. Bản Obici dựng được 8 vùng và bỏ sót cửa. Số 4/8 phản ánh kết quả xử lý của tập thử hỗn hợp, còn độ đúng của hình học cần đối chiếu từng mẫu có đáp án.

- **PDF vector.** Lấy nét và chữ trong vùng chọn để làm bằng chứng trước. Phân biệt tim tường, biên tường, nội thất, đường kích thước và ký hiệu cửa. PDF scan và ảnh dùng bằng chứng từ ảnh đã chuẩn hóa.
- **AI.** Đọc chữ, nhận diện ký hiệu và đề xuất giá trị cho trường có bằng chứng. Trường thiếu căn cứ được đánh dấu để người dùng duyệt. Engine nối đoạn tường, kiểm giao điểm, gắn cửa, tạo sàn, dựng mesh và tính va chạm.
- **Biên phòng và vách.** Dựng vách từ đoạn tường có căn cứ. Dùng polygon để thể hiện không gian đi được, bao gồm vùng chữ L và vùng mở. Hai nhãn chức năng nằm trong cùng không gian mở vẫn có thể hiển thị riêng.
- **Sửa và truy vết.** Khi xóa vách dư, editor tính lại vùng đi được, đánh dấu cửa phụ thuộc cần xem lại và kiểm tra lại A–B. Khi thêm cửa thiếu, cửa phải gắn đúng tường và khớp với vùng thông qua. Tỉ lệ xác nhận dựa trên hai điểm có số đo thực. Kích thước suy từ một nguồn thiếu chuẩn đo được hiển thị như ước lượng.

## 11.4. Chất lượng 3D và giao diện

Ảnh chụp Mill Hill cho thấy vật liệu sàn, cửa và cửa sổ đã có. Ở góc tổng thể, vách trước che một phần sàn, nhãn phòng tắm và kho chồng nhau, bóng đổ lấn vùng mô hình. Đây là các lỗi trình bày có thể kiểm riêng với lỗi vách và cửa từ bản gốc.

| Vùng cần kiểm | Tiêu chí đạt |
| --- | --- |
| **Khung bản gốc** | Bản vẽ vẫn đọc được ở vùng đang duyệt. Overlay nằm đúng đối tượng và phân biệt trạng thái được chọn, cần duyệt và đã xử lý. |
| **Góc tổng thể 3D** | Góc nhìn ban đầu vừa khung. Cắt vách gần camera theo góc nhìn để đọc được bố cục, thấy lối vào và cửa chính. Nhãn ưu tiên phòng hoặc cửa đang chọn, tự ẩn nhãn va nhau và vẫn đọc được khi xoay. |
| **Hình học và vật liệu** | Sàn liền ở vùng mở, tường nối kín tại góc, cửa và khung nằm đúng khẩu độ. Ánh sáng và bóng giúp đọc khối. Vật liệu phân biệt bề mặt, giữ ký hiệu duyệt nổi bật. Chiều cao, vật liệu và hướng mở minh họa có nhãn khi thiếu bằng chứng từ nguồn. |
| **Góc nhìn đi bộ** | Camera ngang tầm mắt, xác định được phòng đang đứng và hướng đi. Cùng một khẩu độ dùng cho hiển thị và va chạm. Khi cửa mở hợp lệ, đi qua mượt. Tường và cửa sổ vẫn cản người đi. |
| **Inspector, điều hướng và trạng thái** | Nguồn, revision, tiến độ lưu/phân tích, cảnh báo và tỉ lệ xuất hiện đúng chỗ cần dùng. Chuyển màn giữ vùng đang duyệt, focus và điểm đứng khi phù hợp. Chuyển động làm rõ hướng chuyển từ 2D sang 3D hoặc vào vị trí đi thử, tôn trọng chế độ giảm chuyển động. |

Rà từng vùng trên ảnh chụp, rồi xem lại toàn màn để kiểm bố cục, khoảng cách, nhãn và thứ tự chú ý. Lặp ở góc tổng thể và góc đi bộ với ít nhất một căn hộ và một mặt bằng văn phòng hoặc cải tạo trong phạm vi. [Cách rà giao diện theo vùng](10-ui-review-and-motion-plan.md)

## 11.5. Tiêu chí kiểm thử đề xuất cho mốc 100%

1. **Đầu vào và khả năng dựng bản nháp.** Dùng ít nhất 12 bản vẽ mới có đáp án, chia đều PDF vector, PDF scan và ảnh. Các mẫu bao phủ phòng chữ L, vùng mở, cửa hẹp, trang nhiều hình và bản xoay. Đề xuất ít nhất 3/4 tệp ở mỗi nhóm dựng được bản nháp sau khi chọn đúng vùng. Kiểm riêng ca ngoài phạm vi như ảnh phối cảnh, tệp lỗi và hình học vượt giới hạn, với trạng thái và thao tác tiếp theo đúng từng ca.
2. **Độ đúng trước và sau duyệt.** Ghi số tường/cửa đúng, thiếu, dư, lệch trước duyệt, số thao tác chỉnh và thời gian đến khi duyệt xong theo từng nhóm. Sau duyệt, mọi lối đi A–B đã gán nhãn trong bộ mẫu nghiệm thu phải có kết quả đúng. Mỗi mẫu đủ hình học có ít nhất một đường đi hợp lệ và một ca bị chặn. Nếu tệp hợp lệ phải dựng lại bằng tay hoặc bị loại, ghi nhận là ca chưa đạt luồng. Khi có quy trình thủ công để đối chứng, đo thời gian đến lúc xác nhận cùng lối đi trên cùng nhóm bản vẽ.
3. **Thao tác và thị giác.** Sửa vách dư và thêm cửa thiếu ngay trong editor, kiểm overlay, 3D và va chạm sau khi lưu, hoàn tác và mở lại. Lưu ảnh trước/sau ở hai góc nhìn, đối chiếu theo mục 11.4. Đo thời gian phân tích, độ trễ sau sửa và độ mượt khi đi trên máy tham chiếu đã ghi cấu hình. Chốt ngân sách hiệu năng từ lượt đo đầu tiên trước khi dùng hiệu năng làm tiêu chí phát hành.
4. **Lưu, duyệt và triển khai.** Trên Cloud Run, phân tích một tệp mới qua Gemini, sửa, lưu, mở lại, duyệt và mở link từ thiết bị khác. Kiểm quyền khi mở bản nháp hoặc revision riêng tư, đồng thời xác nhận link đã bàn giao vẫn trỏ đúng bản cũ khi nguồn hoặc bản nháp thay đổi.

Mốc 100% là toàn bộ các điều kiện V1 đã chốt có bằng chứng nghiệm thu. Khi tự đo tiến độ, có thể đánh dấu từng mốc trong bảng 11.2 là **chưa có**, **chạy được một phần** hoặc **đã nghiệm thu**, rồi gắn bằng chứng tương ứng. Mốc 30% của BTC theo [cách khai báo snapshot](08-implementation-plan.md#83-mốc-30-và-khai-báo-hiện-trạng).
