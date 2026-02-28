# ☁️ MA Cloud Optimizer

Tối ưu hóa chiến lược Đám Mây MA cho giao dịch MEXC Futures & Binance Spot.

## Tính năng

| Tab | Chức năng |
|-----|-----------|
| 🔧 **Quét thủ công** | Chọn 1 loại MA, 1 khung thời gian → heatmap + top 20 |
| 🚀 **Quét đa khung** | Quét 5 khung (15m→4h) với 1 cặp MA cố định |
| 🧬 **Quét tổ hợp MA** | Quét tất cả combo loại MA trên 1 khung |
| 🔥 **Quét toàn diện** | 5 khung × tất cả combo MA → tìm combo + khung tối ưu nhất |

## Cài đặt & Chạy local

```bash
# Chỉ cần Python 3.7+ (không cần cài thêm thư viện)
python server.py
```

Mở trình duyệt: **http://localhost:8888**

## Deploy lên Render.com

1. Push code lên GitHub
2. Vào [render.com](https://render.com) → **New Web Service**
3. Kết nối repo GitHub
4. Render sẽ tự nhận `render.yaml`:
   - **Build**: `pip install -r requirements.txt`
   - **Start**: `python server.py`
   - **Port**: tự động qua biến `PORT`

## Cấu trúc

```
├── index.html          # Giao diện (HTML + CSS + JS)
├── server.py           # API proxy server (Python stdlib)
├── requirements.txt    # Dependencies
├── render.yaml         # Render.com config
├── setup.bat           # Kiểm tra môi trường (Windows)
└── start.bat           # Khởi động nhanh (Windows)
```
