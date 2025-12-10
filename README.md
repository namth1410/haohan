# MinIO Browser

Ứng dụng web đơn giản để duyệt, xem và tải file lên MinIO Storage.

![MinIO Browser](https://img.shields.io/badge/MinIO-Browser-6366f1?style=for-the-badge)

## Tính năng

- ✅ Duyệt thư mục và file trên MinIO
- ✅ Xem trước file (hình ảnh, video, audio, PDF, text...)
- ✅ Tải file lên MinIO
- ✅ Tải file xuống
- ✅ Tạo thư mục mới
- ✅ Giao diện hiện đại, dark theme
- ❌ Không cho phép xóa file (theo yêu cầu)

## Công nghệ sử dụng

- **Frontend**: React 19, TypeScript, Ant Design 6
- **Backend**: Express.js, MinIO Client
- **Build Tool**: Vite 7

## Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` với nội dung:

```env
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=your_bucket_name
```

### 3. Chạy ứng dụng

```bash
# Chạy cả frontend và backend
npm run dev

# Hoặc chạy riêng
npm run server   # Backend (port 3001)
npm run client   # Frontend (port 5173)
```

### 4. Truy cập

Mở trình duyệt và truy cập: http://localhost:5173

## Cấu trúc dự án

```
minio-browser/
├── server/
│   └── index.ts          # Express backend server
├── src/
│   ├── services/
│   │   └── api.ts        # API service layer
│   ├── types/
│   │   └── index.ts      # TypeScript types
│   ├── utils/
│   │   └── file.ts       # File utilities
│   ├── App.tsx           # Main React component
│   ├── App.css           # Styles
│   ├── main.tsx          # Entry point
│   └── index.css         # Reset styles
├── .env                  # Environment variables
├── package.json
├── vite.config.ts
└── README.md
```

## API Endpoints

| Method | Endpoint            | Mô tả                    |
| ------ | ------------------- | ------------------------ |
| GET    | /api/bucket/check   | Kiểm tra bucket tồn tại  |
| GET    | /api/files          | Liệt kê files và folders |
| GET    | /api/files/preview  | Xem trước file           |
| GET    | /api/files/download | Tải file xuống           |
| POST   | /api/files/upload   | Tải file lên             |
| POST   | /api/folders        | Tạo thư mục mới          |
| GET    | /api/files/url      | Lấy presigned URL        |

## Docker

Để chạy với Docker, bạn cần đảm bảo MinIO server đang chạy và có thể truy cập được từ container.

```yaml
# docker-compose.yml
version: "3.8"
services:
  minio-browser:
    build: .
    ports:
      - "5173:5173"
      - "3001:3001"
    environment:
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=namth
      - MINIO_SECRET_KEY=01664157092aA
      - MINIO_USE_SSL=false
      - MINIO_BUCKET_NAME=haohan
```

## License

MIT
