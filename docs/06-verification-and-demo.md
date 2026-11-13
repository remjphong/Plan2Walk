# 06. Kiểm thử và demo

[Mục lục](README.md)

## 6.1. Bằng chứng theo từng tầng

| Tầng | Ca kiểm thử tối thiểu | Bằng chứng |
| --- | --- | --- |
| Geometry | Hai phòng nối qua cửa khi biên phòng dừng ở hai mặt tường. Tường kế cửa và cửa sổ chặn người đi. Tường lỗi và phòng tự cắt có cảnh báo. | Kiểm qua nhiều điểm trên quỹ đạo, có assertion dương và âm. |
| Ingestion | PDF vector có text, PDF scan, ảnh xoay, vùng crop và tệp lỗi. | Overlay đi đúng nguồn sau phép đổi tọa độ. API xử lý lỗi theo hợp đồng. |
| API và Gemini | HTTP test với stub, sau đó gọi Gemini thật trên nguồn có đáp án. | Stub chứng minh hợp đồng. Run live ghi model, trạng thái, thời gian và lỗi theo mẫu. |
| Browser | Mở bản mới, sửa cửa, xác nhận tỉ lệ, đi qua cửa, đi vào tường và đổi nguồn khi request đang chạy. | Quan sát thao tác thực. Bản nháp cũ không ghi đè nguồn mới. |
| Docker và Cloud Run | Build image, khởi động, kiểm tra health rồi phân tích một bản kỹ thuật từ URL deploy. | Build image, HTTP response và kết quả Gemini thật trên môi trường đích. |

## 6.2. Bộ mẫu đầu tiên

Mục tiêu đề xuất là năm nguồn mới có đáp án về cửa và lối đi. Bắt đầu từ hai PDF vector kỹ thuật khác họ, một PDF scan, một ảnh mặt bằng rõ và một trang nhiều hình cần chọn vùng. Giữ thêm fixture tổng hợp để kiểm va chạm và tệp lỗi, vì những fixture này có đáp án chính xác và chạy lặp được.

Báo theo từng nhóm đầu vào gồm số mẫu đã chạy, số cửa đúng trước khi sửa, số chỉnh sửa, số lối đi đúng sau duyệt và thời gian phân tích. Ghi rõ kết quả nào đến từ mẫu đã biết trước và mẫu nào dùng để đánh giá. Các mẫu chưa chạy hoặc chưa kiểm nhãn giữ trạng thái tương ứng.

## 6.3. Bài học từ repo partner

Repo tham chiếu ở commit `18509a3` có viewer, editor và engine hình học. Khi rà repo, type-check, build và 27 test đã qua. API lúc đó gọi Groq, báo cáo ghi 19 mẫu chưa chạy benchmark live và chưa có ground truth được người duyệt xác nhận. Kết quả này thuộc repo tham chiếu. [Repo partner](https://github.com/remjphong/Plan2Walk/tree/18509a3d703090ada175ab0bf94152d36bc5fb4d) · [Báo cáo](https://github.com/remjphong/Plan2Walk/blob/18509a3d703090ada175ab0bf94152d36bc5fb4d/reports/VALIDATION.md)

Ca kiểm thử rút ra từ rà soát là hai phòng có biên kết thúc ở hai mặt tường. Hàm collision của repo tham chiếu đã chặn ở giữa cửa dù mesh có lỗ mở. Repo mới cần test đường đi liên tục qua bề dày tường và test đi vào tường ngay bên cạnh. [Đoạn collision tham chiếu](https://github.com/remjphong/Plan2Walk/blob/18509a3d703090ada175ab0bf94152d36bc5fb4d/geometry/engine.ts#L52)

## 6.4. Demo cho giám khảo

1. Mở một bản kỹ thuật phù hợp phạm vi từ URL Cloud Run.
2. Chọn trang hoặc vùng và chạy Gemini thật.
3. Chỉ vị trí cửa trên overlay. Nếu bản nháp cần chỉnh, sửa ngay để thấy 2D và 3D đổi cùng lúc. Nếu cửa đúng, có thể dịch thử rồi hoàn tác để minh họa thao tác.
4. Xác nhận một đoạn kích thước nếu bản vẽ có số đo. Chuyển từ tổng thể sang đi bộ và đi qua đúng cửa giữa hai phòng.
5. Nếu P1 đã xong, mở link chỉ đọc trên thiết bị khác. Nếu dịch vụ AI gặp sự cố trong buổi demo, trình bày mẫu đã chuẩn bị và ghi rõ nguồn của kết quả.

Bài demo đạt khi người xem đối chiếu được cửa trên bản gốc và đi qua được trong 3D. Kết quả nhận diện trên nhiều bản phải dựa vào bộ kiểm thử.
