# 07. Docker, Cloud Run và Gemini

[Mục lục](README.md)

## 7.1. Mô hình chạy

Một Dockerfile nhiều stage build web và API, sau đó đóng gói bản build vào image chạy. NestJS phục vụ tệp tĩnh của web và các endpoint dưới `/api` trên cùng domain. Tiến trình lắng nghe `0.0.0.0` ở cổng Cloud Run truyền qua `PORT`. Kiểm tra image Linux và thư viện render PDF ngay trong container, vì render thành công trên máy dev chưa chứng minh binary hoặc font có mặt trên image. [Container runtime contract](https://docs.cloud.google.com/run/docs/reference/container-contract)

P0 xử lý tệp trong request và giữ bản nháp ở phiên trình duyệt. Bộ nhớ và filesystem trong container chỉ phục vụ xử lý tạm. P1 dùng nơi lưu bền vững, với Cloud Storage là lựa chọn ban đầu cho bản nháp đã duyệt và tài sản chia sẻ. Quyền đọc được kiểm tra theo revision đã xuất bản. Tệp gốc giữ riêng theo quyền và thời hạn lưu của dự án.

## 7.2. Kết nối Gemini

| Quyền được cấp | Cách kết nối dự kiến |
| --- | --- |
| Gemini Developer API key | Khởi tạo SDK với API key ở backend. Cloud Run lấy key qua Secret Manager, bằng quyền của service account runtime. |
| Project có quyền gọi Vertex AI | Khởi tạo SDK theo project và location. Dùng danh tính service account Cloud Run qua Application Default Credentials và cấp IAM tương ứng. |

Tên model và giới hạn timeout đọc từ cấu hình của backend. Kiểm tra cùng project và endpoint mà BTC chỉ định. Credits và quota cần xác nhận theo loại tài khoản, chương trình credit và cách cấp quyền. Health check chỉ chứng minh tiến trình trả HTTP. Bài test một ảnh thật mới xác nhận quyền gọi model và kết quả phân tích. [Google Gen AI SDK](https://github.com/googleapis/js-genai) · [Cloud Run Secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets) · [Gemini billing](https://ai.google.dev/gemini-api/docs/billing/)

Cấu hình dự kiến gồm `GEMINI_MODEL`, `GEMINI_API_KEY` cho Developer API, hoặc `GOOGLE_CLOUD_PROJECT` và `GOOGLE_CLOUD_LOCATION` cho Vertex AI. Key giữ ở backend. Log vận hành ghi request ID, nhóm đầu vào, thời gian xử lý và mã lỗi. Giới hạn upload, số pixel, request đồng thời và số lần thử lại trước khi mở truy cập phân tích.

## 7.3. Đường deploy ban đầu

1. Khi code có Dockerfile, build và chạy image tại máy dev. Mở trang, kiểm tra `/api/health` và chạy một fixture PDF để kiểm tra phụ thuộc render.
2. Xác nhận project, region, quyền deploy, service account và secret hoặc quyền gọi Vertex AI.
3. Deploy từ thư mục repo bằng mẫu lệnh dưới đây. Cloud Build dùng Dockerfile và lưu image vào Artifact Registry. Cloud Run nhận revision và trả URL. [Triển khai từ source](https://docs.cloud.google.com/run/docs/deploying-source-code)

```powershell
gcloud run deploy plan2walk --source . --project PROJECT_ID --region REGION
```

4. Từ URL thực, kiểm tra health, chạy một bản kỹ thuật mới và xem log. Kiểm tra thời gian từ lúc bấm phân tích đến lúc có bản nháp, gồm lần chạy đầu. Xác nhận giám khảo mở được URL theo quyền BTC cấp.

Lệnh trên là mẫu cho giai đoạn implementation. Cần thay `PROJECT_ID` và `REGION` và cấu hình danh tính hoặc secret tương ứng trước khi thử luồng AI.

## 7.4. GitHub Actions sau khi deploy đầu tiên ổn định

Luồng đề xuất là check và test → xác thực với Google qua OIDC và Workload Identity Federation → build và push image gắn commit SHA → deploy revision → smoke test. Thay bước SSH tới VPS bằng deploy image lên Cloud Run. Giữ quy trình build và test trong GitHub Actions. [Workload Identity Federation cho CI/CD](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) · [GitHub Action deploy Cloud Run](https://github.com/google-github-actions/deploy-cloudrun)
