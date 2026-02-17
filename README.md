# ANEMONE PLUS - Paydaş Analizi ve Mekânsal Veri Toplama Platformu

![Logo](frontend/public/logo.png) <!-- Logo yolu projeye göre güncellenebilir -->

## 🌟 Proje Hakkında

Bu uygulama, projeler kapsamında paydaş veri toplama, haritalama ve analiz süreçlerini dijitalleştirmek amacıyla geliştirilmiş web tabanlı, coğrafi bilgi destekli bir platformdur. Farklı paydaş gruplarından mekânsal (nokta, çizgi, poligon) ve öznitelik verilerinin toplanmasını, yönetilmesini ve analiz edilmesini sağlar.

### 🎯 Temel Amaçlar
- Paydaşların konumsal ve nitel verilerini tek bir merkezde toplamak.
- Sezgisel arayüzlerle (H3 Hexagon grid ve manuel çizim) veri girişini kolaylaştırmak.
- Toplanan verileri tematik haritalar ve raporlar üzerinden görselleştirmek.
- Veri tutarlılığını sağlamak için dinamik form yapıları kullanmak.

---

## 🚀 Teknolojik Mimari

Uygulama modern, ölçeklenebilir ve açık kaynaklı bir teknoloji yığını üzerine kurgulanmıştır.

### 💻 Frontend (Arayüz)
- **Framework:** [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Harita Kütüphanesi:** [MapLibre GL JS](https://maplibre.org/)
- **Mekânsal Çizim:** [Mapbox GL Draw](https://github.com/mapbox/mapbox-gl-draw)
- **Stil Yönetimi:** Vanilla CSS + Modern UI Bileşenleri
- **Uluslararasılaştırma:** Çoklu dil desteği (TR, EN, UA, RO, BG)

### ⚙️ Backend (Sunucu & Veri)
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **Veritabanı:** [PostgreSQL](https://www.postgresql.org/) + [PostGIS](https://postgis.net/)
- **Bulut Veritabanı:** [Supabase](https://supabase.com/) (Üretim ve uzaktan erişim için)
- **ORM:** [SQLAlchemy](https://www.sqlalchemy.org/) + [Alembic](https://alembic.sqlalchemy.org/)
- **Grid Sistemi:** [Uber H3](https://h3geo.org/) (Hexagonal Hierarchical Geospatial Indexing)
- **Coğrafi Formatlar:** GeoJSON, MVT (Mapbox Vector Tiles), GeoPackage export

---

## 🛠️ Kurulum ve Çalıştırma

Uygulama **Docker** konteynerleri üzerinde çalışacak şekilde yapılandırılmıştır.

### 1. Hazırlık
`.env` dosyalarınızı yapılandırın. `frontend/.env` ve `backend/` dizinindeki ilgili ayarları kontrol edin.

### 2. Docker ile Başlatma
Proje kök dizininde aşağıdaki komutu çalıştırarak tüm servisleri (Frontend, Backend, DB) ayağa kaldırabilirsiniz:

```bash
docker-compose up --build
```

Servisler başladıktan sonra:
- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000/docs` (Swagger UI) adreslerinden erişilebilir.

---

## 👥 Kullanıcı Rolleri ve Yetenekler

Platform, veri tasarımı ve veri girişi süreçlerini ayıran iki temel rol üzerine kuruludur:

### 🛡️ Admin Paneli
- **Tablo Tasarımcısı:** Veri toplama formlarını dinamik olarak oluşturma (Metin, Sayı, Seçim Listesi, Skor vb.).
- **Proje Yönetimi:** Çalışma alanlarını (KML/Shapefile) sisteme yükleme ve yönetme.
- **Grid Yapılandırma:** Zoom seviyelerine bağlı H3 çözünürlüklerini belirleme.
- **Veri Denetimi:** Girilen verileri onaylama, düzenleme ve dışa aktarma (GeoPackage).

### 🌍 Public (Paydaş) Paneli
- **Kılavuzlu Veri Girişi:** Kendisine atanan projeler için form doldurma.
- **Mekânsal Seçim:** Harita üzerinde hexagon hücre seçimi yaparak veri girişi.
- **Manuel Çizim:** Nokta, çizgi ve poligon araçlarıyla karmaşık geometrileri manuel tanımlama.
- **Kendi Verilerini Yönetme:** Daha önce girdiği kayıtları görüntüleme ve güncelleme.

---

## 📊 Mekânsal Veri Stratejisi

Uygulama iki farklı mekânsal yaklaşımı birleştirir:
1. **Grid-Tabanlı (H3):** Verilerin karşılaştırılabilirliğini artırmak için alanı hexagon hücrelere böler. İstatistiksel analizler için idealdir.
2. **Serbest Çizim:** Spesifik varlıkların (örneğin bir tesis veya kıyı şeridi) tam geometrisini yakalamak için kullanılır.

---

## 📄 Lisans
Bu proje özel mülkiyet altındadır ve izin alınmadan kullanılamaz.

---
*Geliştirici: Google Deepmind Agentic Coding Team & Antigravity AI*
