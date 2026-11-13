# 10. Rà mockup và kế hoạch chuyển động

[Mục lục](README.md) · [Bộ ảnh hiện tại](09-ui-mockups.md) · [Luồng sử dụng](05-user-experience.md)

**Mục tiêu** — Chốt bộ ảnh đủ để dựng website P0 và thiết kế chuyển động giúp người dùng hiểu bản vẽ, mô hình và lối đi liên hệ với nhau thế nào.

**Phạm vi** — Kế hoạch để đội duyệt. Bộ ảnh hiện tại là concept. Việc chỉnh hoặc gen ảnh, chốt thư mục bàn giao và triển khai web bắt đầu sau hiệu lệnh.

**Kiến trúc dự kiến** — Một shell React cho Nguồn, Đối chiếu và Đi thử. Các vùng xem dùng chung trạng thái bản vẽ. CSS xử lý chuyển trạng thái UI. Lớp overlay 2D và Three.js nhận cùng ID thực thể, revision và dữ liệu hình học.

## 10.1. Kết quả rà từng vùng và toàn màn

Đã chia từng ảnh desktop 1536 × 1024 thành năm vùng theo nội dung. Tổng cộng 40 crop. Sau lượt rà crop, mở lại cả tám ảnh toàn màn để kiểm tra trọng tâm, quan hệ giữa các vùng và sự liên tục giữa các màn.

| Ảnh | Năm vùng đã rà | Kết luận và việc xử lý |
| --- | --- | --- |
| **01. Mở bản vẽ** | Menu, tiêu đề, vùng upload, minh họa, lối mở mẫu | **Giữ hướng.** Hình góc tường phù hợp ngữ cảnh. Hai dòng serif lớn cạnh nhau cạnh tranh ở cột trái. Ở bản chốt, tiêu đề giữ vai trò lớn, “Kéo thả bản vẽ” giảm một cấp. Thể hiện khác biệt giữa tab đang dùng và tab chưa có dữ liệu. |
| **02. Chọn trang và vùng** | Menu và nút phân tích, danh sách trang, vùng crop, ngữ cảnh ngoài crop, toolbar dưới | **Chỉnh cục bộ.** Khung chọn giữ đúng đường 4 200 mm và loại chi tiết cửa. Mép dưới gần sát cung mở của cửa vào. Chừa khoảng đọc quanh hình và thêm nhãn số vào thumbnail. Tách rõ thao tác vừa khung, zoom và đặt lại vùng. |
| **03. Đang phân tích** | Thanh nguồn, bản gốc, nền khung 3D, cụm chờ, chân khung | **Thay cụm chờ.** Vòng có cung màu trông như tiến độ. Câu “Đang đọc tường và cửa” cụ thể hơn trạng thái API hiện có trong thiết kế. Dùng dấu canh góc với nhịp nhẹ và dòng “Đang phân tích bản vẽ”. Bỏ thanh chân rỗng hoặc dùng đúng vùng trạng thái đã quy định. |
| **04. Đối chiếu** | Thanh tác vụ, 2D, 3D, bảng chỉnh, thanh tỉ lệ | **Sửa chức năng trước.** Vị trí D03 khớp giữa hai khung. Bảng “Chiều rộng” chỉ có trạng thái tỉ lệ, nên người dùng chưa thấy cách đổi khẩu độ. Thêm hai tay nắm ở 2D để chỉnh theo hình học và chỉ hiện đơn vị thực khi có căn cứ. Biến cụm cảnh báo thành lối mở danh sách vấn đề. Thay la bàn N bằng trục mô hình khi nguồn thiếu phương Bắc. |
| **05. Xác nhận tỉ lệ** | Thanh tác vụ, mốc A/B, điểm tương ứng 3D, form số đo, chân khung | **Chỉnh form và trạng thái.** Vị trí bảng chỉnh trùng với màn 04. Ảnh mới cần chỉ rõ mốc đã chọn, thao tác đặt lại, trạng thái thiếu mốc hoặc số đo không hợp lệ và kết quả sau xác nhận. Giữ lưới, mốc và tỷ lệ zoom của hai khung. Dùng trục mô hình theo cùng quy tắc màn 04. |
| **06. Đi thử** | Thanh tác vụ, tầm nhìn qua cửa, minimap, phím điều khiển, tỉ lệ | **Giữ làm frame đang đi và bổ sung frame trước đó.** Ảnh diễn đạt cửa nối hai phòng. Luồng hiện nhảy thẳng vào góc nhìn thứ nhất, thiếu bước chọn điểm đứng. Rút gọn cụm WASD sau thao tác đầu, giữ lối thoát và thao tác đặt lại vị trí trong trạng thái tạm dừng. |
| **07. Lỗi phân tích** | Thanh nguồn, bản vẽ giữ lại, cụm lỗi, lối thử lại/mở mẫu, chân khung | **Giữ bố cục và đồng bộ với 03/08.** Lỗi tạm thời có hành động phù hợp. Cho ảnh trạng thái dùng cùng trục căn, nhịp cách và chiều cao nút. Bản mẫu mở như một nguồn riêng để có thể quay lại tệp đang làm. |
| **08. Cần chọn vùng** | Thanh nguồn, tờ đầy đủ, cụm giải thích, nút Chọn vùng, chân khung | **Giữ bố cục và nối lại 02.** Tờ PDF đúng ngữ cảnh. Nút cần mở lại chính trang đang xem để người dùng khoanh vùng ngay. Cùng component trạng thái với 03/07, có biểu tượng và chữ riêng. |

**Đối chiếu toàn phần.** Nhịp giấy ngà, nét xanh và viền mảnh phù hợp với tài liệu kỹ thuật. Màn 04 và 05 giữ được đường chia 2D/3D và vị trí bảng chỉnh. Khác biệt nhỏ giữa các ảnh ở biên ngoài, trạng thái tab và chân viewport cần quy về một shell. Các ảnh tĩnh đủ để nhận xét phân cấp và spacing. Khả năng dùng bàn phím, tương phản khi có nền thực và cảm giác chuyển động cần kiểm bằng prototype.

## 10.2. Chuẩn bàn giao ảnh

### Rà năm vùng rồi ghép lại

1. **Menu và thanh tác vụ** — Căn trục logo, tab, tên tệp, số trang, nút chính. Kiểm tra chữ có dấu, tệp tên dài và trạng thái tab chưa sẵn sàng.
2. **Vùng nguồn** — Kiểm nét bản vẽ, khung chọn, zoom, mốc và lớp overlay. Đối chiếu các chi tiết ở phần giao với vùng bên cạnh để phát hiện lệch crop.
3. **Vùng kết quả** — Kiểm tương quan hình học với nguồn, khoảng thở quanh mô hình, nhãn cửa và cách hiển thị tỉ lệ. Hình minh họa nền dừng ở màn trống và cụm trạng thái.
4. **Bảng chỉnh hoặc trạng thái** — Kiểm thứ tự nhãn, trường nhập, cảnh báo và hành động. Nội dung chờ, lỗi và yêu cầu crop dùng cùng bố cục với một hành động nổi bật theo ngữ cảnh.
5. **Chân khung và điều khiển** — Kiểm zoom, vừa khung, tỉ lệ, lối thoát, tránh đè lên bản vẽ hoặc ngưỡng cửa.

Sau khi duyệt crop ở tỷ lệ 100%, mở ảnh toàn màn và so với màn trước/sau. Kiểm điểm nhìn đầu tiên, đường căn, tương quan ba vùng, nhịp khoảng trắng và tính liên tục của cùng tệp, trang, cửa và mốc đo. Chạy thêm một lần ở desktop 1280 × 800. Kiểm tra tên tệp dài có thể đọc lại đầy đủ khi cần và bảng chỉnh có lối cuộn riêng.

Lấy đường trái và đường phải của khung làm trục chung. Đề xuất lề ngoài 16 px, đệm trong bảng chỉnh 20 px, nhóm trường cách nhau 16 px và nhãn cách trường 8 px. Giữ chiều rộng bảng chỉnh khoảng 240–280 px ở layout desktop ba vùng. Ở khung gọn, thu bảng chỉnh về một cột bên cạnh hoặc mở theo ngữ cảnh nếu hai viewport mất diện tích đọc. Chọn một phương án sau khi so cả hai ảnh toàn màn. Chữ trong ảnh gen là tham chiếu thị giác, chuỗi nhãn chuẩn lấy từ tài liệu và UI thực.

### Bộ ảnh cần bổ sung

- **Hai frame mới.** Danh sách vấn đề mở tới đúng thực thể, kèm lý do lối đang bị chặn. Tổng thể trước khi đi thử, có vị trí đứng hợp lệ trên mặt bằng và nút **Bắt đầu đi**.
- **Một sheet trạng thái component.** Tab chưa sẵn sàng, hover/focus/disabled, vùng kéo thả nhận tệp hoặc báo sai định dạng, chọn mốc A, thiếu mốc B, số đo sai, đã xác nhận, đi thử minh họa và tạm dừng với nút tiếp tục/đặt lại. Dùng crop cùng hệ giao diện cho các biến thể.
- **Một frame desktop gọn.** 1280 × 800 ở màn Đối chiếu. Dữ liệu mẫu gồm tên tệp dài và hai cảnh báo để kiểm layout chịu được nội dung.
- **Một storyboard chuyển động.** Ba khung cho mỗi hiệu ứng hiếm ở mục 10.3, ghi điểm bắt đầu, vị trí trọng tâm giữa chừng và trạng thái ổn định cuối. Hiệu ứng thao tác thường xuyên dùng spec và test tương tác.

Dùng 04 làm ảnh tham chiếu bố cục sau khi sửa. Chỉ gen lại vùng bị ảnh hưởng hoặc gen thêm frame còn thiếu. Thư mục bàn giao đề xuất là `docs/assets/mockups/final/`. Khi từng ảnh qua cả hai lượt rà, đặt bản đã duyệt vào đó và cập nhật [mục 09](09-ui-mockups.md) làm chỉ mục chính. Các bản concept hiện tại vẫn là nguồn đối chiếu.

## 10.3. Hướng chuyển động đề xuất

Có hai hướng khả thi. Chuyển cảnh kiểu lật trang tạo ấn tượng khi mở lần đầu nhưng kéo cả bản vẽ khỏi điểm nhìn khi đổi chế độ. Chuyển động bám theo nét, điểm chọn và vị trí đứng hợp hơn với công việc đối chiếu. Đề xuất dùng hướng thứ hai cho thao tác chính và giữ một nhịp mở đầu riêng ở màn trống.

| Sự kiện | Chuyển động và ý nghĩa | Thời lượng đề xuất và hành vi khi ngắt |
| --- | --- | --- |
| **Mở website lần đầu** | Hai dấu canh góc xuất hiện, sau đó nét cung mở cửa trên hình nền được vẽ theo tâm bản lề. Tiêu đề và nút chọn tệp xuất hiện sẵn. | Một lượt 360–420 ms khi đến màn trống từ bên ngoài hoặc mở tab mới. Kết thúc ngay khi kéo tệp hoặc tương tác. Quay lại luồng đang làm chỉ dùng chuyển cảnh ngắn. |
| **Đổi Nguồn / Đối chiếu / Đi thử** | Gạch chân đi đến tab vừa chọn. Vùng nội dung đổi theo điểm neo của khung, với opacity và độ dịch nhỏ. Logo, nguồn và các vùng dùng chung đứng yên. | 140–180 ms. Trạng thái tab và focus cập nhật ngay. Bấm tiếp thì huỷ hiệu ứng cũ. Bàn phím đổi chế độ ngay. |
| Kéo tệp, chọn trang hoặc crop | Cụm góc của vùng thả đổi nét khi nhận tệp. Khi chọn trang, trang mới hiện tại cùng vị trí fit. Tay nắm crop đi sát con trỏ. | 100–140 ms cho phản hồi. Kéo crop không easing. Giữ vùng chọn khi quay lại đúng trang nếu còn hợp lệ. |
| Phân tích | Dấu canh góc trong khung 3D nhấn luân phiên theo cạnh. Bản gốc đứng yên. Dòng chữ mô tả trạng thái thật của request. | Ba nhịp đầu khoảng 1,1 giây mỗi nhịp rồi giữ tĩnh nếu còn chờ. Kết thúc ngay khi có kết quả, lỗi hoặc đổi nguồn. |
| **Bản nháp sẵn sàng** | Trong khung 3D, đường viền nền theo hình học thật xuất hiện trước, rồi mặt sàn và tường rõ lên ở đúng vị trí. Một cửa cần duyệt sáng nhẹ trên hai khung nếu hệ thống đã định vị được cửa đó. | 260–320 ms, một lần cho kết quả mới. Tương tác bắt đầu ngay. Nếu 3D chưa sẵn sàng, hiển thị trạng thái hiện tại của viewport. |
| Chọn và sửa cửa | Gõ hoặc bấm để chọn thì marker hiện ngay ở 2D và 3D. Nét dóng kéo một đoạn ngắn từ điểm chọn tới nhãn. Bảng chỉnh đổi theo thực thể. Tay nắm chiều rộng và vị trí theo con trỏ khi kéo. | 100–150 ms cho marker bằng chuột. Kéo trực tiếp. Khi áp dụng, xác thực trước rồi cập nhật mesh và vùng va chạm cùng revision. |
| Xác nhận tỉ lệ | A và B hiện tại điểm bấm. Khi đủ hai mốc, đường kích thước hiện từ A tới B. Sau xác nhận, trạng thái ở chân khung đổi sang đã xác nhận. | 140–180 ms cho đường dóng. Trường nhập và mốc phản hồi ngay. Hủy trả về bản nháp trước khi đo. |
| **Bắt đầu đi thử** | Từ tổng thể, chọn điểm đứng và thấy nón hướng nhìn trên minimap. Khi người dùng bấm **Bắt đầu đi**, góc nhìn chuyển sang đúng điểm đã chọn bằng fade ngắn trong viewport. Người dùng tự bước qua cửa. | 140–180 ms. Giữ nguyên vị trí hợp lệ, tránh đường bay xuyên tường và camera tự lắc. Lối thoát luôn hoạt động. |
| Đi qua cửa và thoát | Marker đi liên tục theo người dùng. Khi sang phòng mới, tên phòng đổi nhẹ. Khi thoát, tổng thể mở ở vùng vừa đi. | 100–140 ms cho nhãn. Điều khiển di chuyển và thoát phản hồi tức thì. |
| Lỗi và thử lại | Cụm trạng thái đổi biểu tượng và copy tại chỗ. **Thử lại** giữ nguồn và vùng đang duyệt. | 100–140 ms cho opacity, không rung cảnh báo. Bỏ ngay animation khi chuyển nguồn. |

**Chuyển động giảm.** Khi hệ thống yêu cầu `prefers-reduced-motion: reduce`, dùng trạng thái tĩnh cho nét vẽ, gạch chân, dấu chờ, marker và chuyển camera. Nội dung, điều khiển và vị trí cuối vẫn tương đương. Ở chế độ mặc định, animation chỉ đổi lớp trình bày. Canvas, bảng chỉnh và va chạm đọc revision đã xác thực. [MDN về prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) · [W3C về chuyển động do tương tác](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

## 10.4. Thứ tự triển khai và nghiệm thu

Các đường dẫn code dưới đây là vị trí dự kiến theo [kiến trúc repo](03-architecture.md). Bước triển khai giao diện phụ thuộc workspace React và hợp đồng `FloorPlanV1` ở [kế hoạch chung](08-implementation-plan.md).

| Bước | Công việc sau hiệu lệnh | Nghiệm thu |
| --- | --- | --- |
| **1. Chốt hình** | Sửa các ảnh theo mục 10.1. Gen hai frame còn thiếu, sheet trạng thái, frame desktop gọn và storyboard. Rà từng vùng rồi rà luồng toàn màn, sau đó cập nhật chỉ mục. | Mọi thao tác P0 có frame hoặc biến thể component. Các ảnh đã duyệt cùng shell và giữ một nguồn nhất quán. |
| **2. Shell và trạng thái tĩnh** | Trong `apps/web/src/features/plan-workspace/`, dựng shell, bộ chọn nguồn, bảng vấn đề, bảng cửa, form đo và trạng thái dùng chung. Một bản nháp hiện tại, một đối tượng đang chọn, một chế độ đang mở. Kiểm tra khi thay nguồn hoặc đổi tab nhanh. | Upload và nhánh lỗi có lối tiếp tục. Tab và focus ổn định, không tràn ngang ở 1536 × 1024 và 1280 × 800. Fixture khớp ảnh đã duyệt theo vùng và toàn màn. |
| **3. Nối 2D và 3D** | Dùng chung ID, revision và geometry từ `packages/floorplan`. Bảng vấn đề mở đúng marker. Chỉnh cửa xem trước trên 2D, áp dụng thì cập nhật 2D, 3D và va chạm cùng lúc. | Chọn D03 ở hai phía đều mở cùng bảng. Cửa sai giữ lối chặn; sửa xong đi qua được và tường kế cửa vẫn chặn. A/B cập nhật tỉ lệ sau xác nhận. |
| **4. Đi thử có kiểm soát** | Trong `apps/web/src/features/walkthrough/`, chọn điểm đứng hợp lệ ở tổng thể, rồi bắt đầu bằng thao tác riêng. Nếu dùng pointer lock, gọi trong thao tác **Bắt đầu đi** và theo dõi việc vào/thoát khoá. Trả focus và xoá phím đang giữ khi thoát hoặc mất focus. | Bắt đầu đúng điểm, thoát giữa chừng được, quay lại tổng thể đúng vùng. Khi khóa chuột bị từ chối, vẫn có lối về tổng thể và hướng dẫn thử lại. [MDN Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API) |
| **5. Thêm chuyển động** | Tạo timing và easing dùng chung trong `apps/web/src/styles/motion.css`. Dùng CSS cho opacity, transform và trạng thái UI. Overlay vẽ nét dóng từ tọa độ thật. Three.js giữ cùng scene giữa tổng thể và đi thử. Thêm nhịp mở, chuyển tab, xuất hiện bản nháp rồi mới tinh chỉnh các hiệu ứng nhỏ. | Bấm nhanh, đổi nguồn, huỷ thao tác và bật giảm chuyển động đều về đúng trạng thái. Animation không khóa thao tác, không kéo lại focus và không tăng thời gian chờ dữ liệu. |
| **6. Kiểm trên web** | Kiểm fixture hai phòng, PDF nhiều hình, tên tệp dài, request chậm/lỗi, thiếu mốc đo, số đo sai và lối bị chặn. Chụp từng vùng và toàn màn. Quay ngắn luồng thường và giảm chuyển động, xem trace render khi đổi tab hoặc mở model. | Đối chiếu được trước/sau ở từng vùng. Hai kích thước desktop không vỡ bố cục. Phím, chuột, trạng thái lỗi và đường đi được kiểm trong browser. Chốt mốc hiệu năng dựa trên máy và trace thực tế. |

Trong `tests/e2e/`, ưu tiên ba ca dễ sai khi kết hợp chuyển động với dữ liệu. Phân tích tệp A rồi đổi sang B trước khi A trả kết quả, xác nhận B giữ nguyên. Chọn cửa và đổi tab liên tiếp, xác nhận chỉ có một thực thể và một chế độ đang hoạt động. Bật giảm chuyển động, đi qua cửa và thoát bằng Escape, xác nhận cùng điểm đứng cuối và focus quay về điều khiển phù hợp.

**Thứ tự ưu tiên khi rút gọn.** Giữ shell, bảng chỉnh đúng dữ liệu, luồng chọn điểm đi thử và phản hồi thao tác. Ba hiệu ứng làm trước là nét cửa ở lần mở đầu, chuyển tab giữ điểm neo và bản nháp xuất hiện theo hình học. Nếu thiếu thời gian, nhịp trang trí ở từng điều khiển có thể bổ sung sau khi đã kiểm luồng.
