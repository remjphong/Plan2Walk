# Plan2Walk V1 — engineering preview

Nâng cấp trực tiếp từ ZIP Groq MVP, giữ React / Vite / TypeScript / Three.js / Express / Zod / Docker. Đây là **bản V1 cần nghiệm thu trên trình duyệt và dữ liệu thật**, chưa phải bộ chuyển mọi bản vẽ thành mô hình chính xác.

## Chạy local (Node.js 22+)

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Mở http://localhost:5173. Phòng mẫu không cần API. Nếu dùng AI, nhập key hiện tại vào `.env`, model mặc định `qwen/qwen3.8-27b`. Không dùng lại key từng lộ; không commit `.env`. File key trong ZIP nguồn không được đưa vào bản giao này.

```powershell
npm run check
npm test
npm run build
npm start
```

Production local: http://localhost:8080. `npm test` chạy offline và mock API, không tiêu token. Build có cảnh báo chunk Three.js lớn, không phải lỗi biên dịch.

## Sử dụng

1. Chọn JPEG/PNG dưới 3 MB, tối đa 16 MP. Upload mới xóa dữ liệu nhận diện cũ để tránh overlay nhầm ảnh.
2. Phân tích với Groq hoặc tự vẽ polygon và tường trên overlay. AI chỉ trả tham số pixel. Dữ liệu không chắc giữ null.
3. Xem overlay màu và danh sách lỗi hình học. Chọn đồ vật để sửa category, bbox, rotation. JSON editor hỗ trợ đầy đủ cửa, độ dày, cao độ và schema cũ.
4. Hiệu chuẩn: chọn hai điểm trên đoạn có số đo đáng tin, nhập khoảng cách mét, áp dụng. Tỉ lệ vẫn chưa xác minh cho đến khi người dùng kiểm chứng; không tự bật verified từ AI.
5. WASD và chuột ở chế độ đi lại; ESC trả chuột. Nút nhìn từ trên bật orbit. Va chạm dựa trên các mảng tường sau khi khoét cửa và footprint đồ vật; sàn được giới hạn bởi polygon.
6. Bảng “Đồ vật chưa có mô hình / Báo cáo dựng hình” liệt kê **mọi detection**, cả thiếu bbox / tầng chưa dựng. Tải CSV/JSON. Sửa category để chọn model phù hợp; không tự thay giường đôi bằng giường tầng.
7. Muốn dùng nhãn nháp: chọn `data/raw/images (2).jpg`, nạp `data/candidates/bunk-bedroom.json` trong phần review. Nhãn này **chưa được người dùng xác nhận**.

## Kiến trúc và quy ước

- `server/vision.ts`: VisionProvider + Groq; JSON mode được tài liệu Qwen hỗ trợ; Zod kiểm tra sau parse. Chỉ retry 5xx một lần; không retry quota/auth/JSON lỗi. Timeout 60 giây mỗi attempt. Tối đa 2 ví dụ đã duyệt + 1 ảnh đích, giới hạn dung lượng ví dụ.
- `shared/v1.ts`: FloorPlanV1; adapter legacy một phòng; `shared/contract.ts` giữ nguyên contract và demo cũ.
- `geometry/engine.ts`: TypeScript thuần, không React/Groq/Three. Phòng đa giác, nhiều tường, nhiều cửa/cửa sổ gắn host wall; trả các mảng tường không phủ lỗ cửa. Tường trùng/chồng phát hiện và bỏ bản sau có báo cáo, không tự hợp nhất nguy hiểm.
- `frontend/src/renderScene.ts`: triangulation bằng Three ShapeGeometry, mesh tường, tải GLB lazy, cache và clone. Lỗi model giữ placeholder và cập nhật báo cáo.
- `assets/resolver.ts`, `assets/manifest.json`: 12 GLB CC0 đã đóng gói, nhãn Việt/Anh, nguồn URL ghim commit, SHA256, hệ trục và native accessor dimensions. Native units **không phải số đo đồ vật thực**. Bbox điều khiển footprint, chiều cao chưa có thì minh họa theo tỷ lệ asset.
- `frontend/src/ReviewPanel.tsx`: overlay SVG, vẽ polygon/tường, hiệu chuẩn hai điểm, sửa đồ vật, nhập/xuất annotation.
- `shared/evaluation.ts`, `scripts/evaluate.ts`: đánh giá từ predictions lưu sẵn và nhãn người duyệt cùng SHA256.

Hệ tọa độ: ảnh x sang phải / y xuống dưới; Geometry Engine chuyển một lần sang mặt phẳng x/z, y thế giới hướng lên. `bbox=[left,top,width,depth]` trước quay theo chiều kim đồng hồ quanh tâm; `source_bbox` là bbox ảnh để đối chiếu. Polygon được đóng ngầm, có thể lặp đỉnh đầu ở cuối. Không suy tường tự động từ polygon vì có thể trùng tường chung; phòng và tường đều là dữ liệu riêng cần review.

## Dataset và quy trình ground truth

17 ảnh gốc trong `data/raw`, 2 ảnh tham chiếu trong `data/reference`. Chỉ sử dụng nội bộ: nguồn bản quyền ảnh chưa xác minh. Những thư mục này bị gitignore và không đưa vào Docker.

```powershell
python -m pip install Pillow
npm run dataset:inventory
npm run evaluate
```

`manifest.json/csv` ghi SHA, kích thước, nhóm, gia đình và split. Seed 20261112. Split là **đề xuất**, phải duyệt gia đình/trùng gần trước benchmark. 17 JSON annotation ban đầu là `unreviewed`, không phải dữ liệu huấn luyện. Bản nháp bunk nằm riêng ở `data/candidates`.

Mở từng ảnh trong UI, nạp JSON nháp/prediction, sửa polygon, tường, cửa, đồ vật; ghi evidence cho scale. Nhập tên và tick xác nhận sau đối chiếu. Xuất `annotation.json`, đặt thành `data/annotations/<tên ảnh>.json`. SHA256 ngăn dùng nhãn của ảnh khác. Giữ trường không rõ null. Chỉ sửa `scale.verified=true` khi có cơ sở kiểm chứng, không dùng kích thước preview.

Lưu output nhận diện tại `data/predictions/<tên ảnh>.json` (plan trực tiếp hoặc `{plan: ...}`). Chạy `npm run evaluate` sau mỗi thay đổi. Tham chiếu dùng tên `reference-1.jpg.json` / `reference-2.jpg.json`.

Phép đo: room IoU xấp xỉ trên lưới 128², ghép greedy một-một; object bbox IoU đúng category, sai số tâm pixel, đếm phòng/tường/cửa, cửa ghép theo loại và tâm trong 10px, khoảng cách đầu tường GT tới đoạn dự đoán, sai lệch scale khi GT đã verified. Đây chưa phải thước đo topology đầy đủ. Không có nhãn => metric null. Không chạy API => `not_run`, không đổi thành success hoặc `api_failed`.

### Chạy benchmark trực tiếp khi đã kiểm tra quota

Script sau **gọi API thật**, tách khỏi test mặc định. Chỉ chạy khi bạn muốn dùng quota hiện có:

```powershell
node --import tsx scripts/benchmark-live.ts --allow-live
npm run evaluate
```

Few-shot: chỉ nhãn `human_verified`, plan `reviewed`, manifest `split_reviewed=true`, thuộc development và khác family ảnh đích. Tối đa 2 ví dụ. Chạy lại với `--few-shot` để so sánh, sao lưu `data/predictions` và `reports/benchmark.json` giữa hai lần. Chưa có ví dụ được xác minh nên mặc định zero-shot. **Không train/fine-tune model.**

## Docker / Cloud Run readiness

```powershell
docker build -t plan2walk-v1 .
docker run --rm -p 8080:8080 --env-file .env plan2walk-v1
```

Container phục vụ frontend/backend cùng cổng `PORT`, health `/api/health`. Không deploy công khai trong nhiệm vụ này. Docker chưa có trong môi trường thực hiện nên build image chưa được chạy. Rate limit hiện là bộ nhớ theo instance, không phải bảo vệ quota production nhiều instance.

## Kết quả và giới hạn

Xem `reports/VALIDATION.md`, `reports/benchmark.md` và `HANDOFF.md`. Không có nhãn người duyệt và chưa gọi Groq thật => chưa xác lập độ chính xác. Chỉ dựng tầng đầu; nhiều mặt bằng cần tách thủ công. Không dựng cầu thang có khả năng đi lên, không có polygon holes, cửa swing vật lý hay hệ thống chỉnh vertex bằng kéo thả. Chiều cao thiếu phải coi là minh họa. Wardrobe và class không trong registry dùng khối có nhãn. UI/WebGL/WASD cần smoke test trên máy người dùng do trình duyệt kiểm thử bị chặn socket ở môi trường này.

## Asset provenance

- Kenney Furniture Kit qua `Hidencod/tge-assets`, commit và URL từng GLB trong manifest; 11 model, CC0.
- KayKit Furniture Bits: sofa/couch GLB đóng gói từ OpenHome3D, 1 model; license CC0 của Kay Lousberg được đối chiếu upstream. Không sao chép code ứng dụng OpenHome3D.
- Giấy phép đầy đủ: `assets/licenses/`. Catalog chỉ ánh xạ class, không khẳng định đúng kiểu dáng hoặc kích thước thực.

Tài liệu đã đối chiếu: https://console.groq.com/docs/vision, https://console.groq.com/docs/structured-outputs, https://github.com/Hidencod/tge-assets, https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0, https://github.com/yuyou-dev/OpenHome3D. Trang Kenney official không tải được qua công cụ tìm kiếm; giấy phép lấy từ kho CC0 đã ghim.
