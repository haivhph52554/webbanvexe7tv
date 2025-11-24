# BaseVeXe Frontend

Ứng dụng frontend cho hệ thống đặt vé xe buýt BaseVeXe được xây dựng bằng React và TypeScript.

## Tính năng

- 🚌 Trang chủ với giao diện hiện đại
- 🔍 Tìm kiếm tuyến đường xe buýt
- 📱 Responsive design cho mọi thiết bị
- 🎨 UI/UX đẹp mắt với Tailwind CSS
- ⚡ Hiệu suất cao với Vite

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy ứng dụng ở chế độ development:
```bash
npm run dev
```

3. Build ứng dụng cho production:
```bash
npm run build
```

## Công nghệ sử dụng

- **React 18** - Thư viện UI
- **TypeScript** - Ngôn ngữ lập trình
- **Vite** - Build tool
- **Tailwind CSS** - CSS framework
- **Lucide React** - Icon library

## Cấu trúc thư mục

```
src/
├── components/
│   └── HomePage.tsx    # Trang chủ
├── App.tsx            # Component chính
├── App.css           # Styles chính
└── main.tsx          # Entry point
```

## API Proxy

Ứng dụng được cấu hình để proxy các request API đến backend server chạy trên port 5000.
