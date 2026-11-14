# Plan2Walk

Plan2Walk chuyển mặt bằng kiến trúc 2D thành không gian 3D có thể đi lại. Người dùng đối chiếu tường, cửa và tỉ lệ trên bản gốc, sửa bản nháp rồi xem kết quả trong 3D.

**Bản hiện tại** hỗ trợ xem trước PDF, PNG và JPG, chọn một vùng của một tầng, đối chiếu bản nháp 2D/3D, sửa cửa, xác nhận tỉ lệ và đi thử. Gemini hoặc DeepSeek đề xuất dữ liệu từ ảnh. Engine TypeScript kiểm tra dữ liệu, dựng tường và cửa, rồi tính va chạm cho Three.js. Bộ phân tích hiện giới hạn ở các phòng chữ nhật, tường song song trục và dựa trên ảnh vùng đã chọn. Với PDF, trình duyệt gửi thêm lớp chữ trong vùng nếu có.

## Chạy bằng Docker Compose

```sh
docker compose up -d --build --wait --remove-orphans
docker compose ps
```

Mở [Plan2Walk](http://127.0.0.1:3022). Compose gom hai service dưới project `plan2walk`.

| Service | Container | Cổng host → container | Vai trò |
| --- | --- | --- | --- |
| `web` | `plan2walk_frontend` | `3022 → 80` | Nginx phục vụ React và chuyển `/api/` đến `api:8080` qua mạng Compose |
| `api` | `plan2walk_backend` | `8080` nội bộ | NestJS xử lý yêu cầu và gọi AI |

Hai cổng host chỉ bind vào `127.0.0.1`, theo quy ước `3000 + 22` và `8000 + 22`. Đặt `PLAN2WALK_WEB_PORT` hoặc `PLAN2WALK_API_PORT` để đổi cổng. `PLAN2WALK_PORT` vẫn dùng được làm biến cũ cho cổng web. Xem log bằng `docker compose logs -f web api` và dừng bằng `docker compose down`.

Bản nháp hiện lưu trong phiên trình duyệt. PostgreSQL sẽ cần khi có luồng lưu và mở lại dự án. Gemini và DeepSeek là API bên ngoài do backend gọi.

## Phát triển local với Node.js

```sh
npm ci
npm test
npm run check
npm run dev
```

Frontend dùng cổng `3022`, API dùng `8022`. Hãy tải tệp bản vẽ để mở và chọn vùng. Cấu hình AI ở server trước khi bấm **Phân tích bản vẽ**.

## Phân tích bản vẽ qua AI

Đặt các biến sau trong môi trường shell trước khi chạy Compose hoặc trong tệp `.env` local đã được Git bỏ qua. Chạy lại `docker compose up -d --wait` sau khi đổi cấu hình.

- Gemini mặc định dùng `VISION_PROVIDER=gemini`, `GEMINI_MODEL` và `GEMINI_API_KEY`. Vertex AI dùng `GEMINI_MODEL`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` và xác thực của môi trường.
- DeepSeek dùng `VISION_PROVIDER=deepseek` và `DEEPSEEK_API_KEY`. `DEEPSEEK_MODEL` mặc định là `deepseek-flash`.
- Kiểm tra `provider`, `model` và `aiConfigured` tại [endpoint health qua web](http://127.0.0.1:3022/api/health). Compose kiểm tra web/API đã khởi động, còn `aiConfigured` cho biết đã có cấu hình cần thiết để gọi AI. Bản tải lên và bản nháp hiện chỉ giữ trong phiên làm việc của trình duyệt.

## Tài liệu thiết kế

- [Mục lục tài liệu](docs/README.md)
- [Phạm vi sản phẩm](docs/01-product-scope.md)
- [Kiến trúc và cấu trúc repo](docs/03-architecture.md)
- [Thứ tự triển khai](docs/08-implementation-plan.md)
