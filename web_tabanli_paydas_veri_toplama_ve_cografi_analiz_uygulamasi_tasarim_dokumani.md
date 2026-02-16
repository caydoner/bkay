# 1. Giriş ve Amaç
Bu doküman, projeler kapsamında gerçekleştirilecek paydaş veri toplama, haritalama ve analiz süreçlerini desteklemek üzere geliştirilecek web tabanlı, coğrafi bilgi destekli bir uygulama yazılımının kavramsal ve teknik tasarımını tanımlar. Amaç; farklı paydaşlardan (kurumlar, uzmanlar, yerel aktörler, vatandaşlar vb.) toplanan mekânsal ve mekânsal olmayan verilerin tek bir platformda güvenli, ölçeklenebilir ve analiz edilebilir şekilde yönetilmesini sağlamaktır.

# 2. Kapsam ve Kullanım Senaryoları
Uygulama aşağıdaki temel kullanım senaryolarını kapsar:
- Proje paydaşlarının web üzerinden konumsal veri (nokta, çizgi, poligon) ve öznitelik bilgisi girişi
- Anket, form ve dosya (fotoğraf, belge) tabanlı veri toplama
- Toplanan verilerin harita tabanlı görselleştirilmesi
- Temel ve ileri düzey mekânsal analizler
- Paydaş katılımı, geri bildirim ve raporlama süreçlerinin desteklenmesi

# 3. Paydaş Haritalama Odaklı Referans Yazılımlar ve Alınan Özellikler
Bu uygulamanın tasarımında klasik CBS (GIS) yazılımlarından ziyade, paydaş haritalama, katılımcı planlama ve karar destek süreçlerinde yaygın olarak kullanılan yazılımların fonksiyonel ve arayüz özellikleri esas alınmıştır. İncelenen başlıca yazılım türleri ve öne çıkan özellikler aşağıda özetlenmiştir.

## 3.1 Paydaş Haritalama ve Katılım Yazılımları
**Örnek Platformlar:** Kumu, Miro, Stakeholder Circle, Darzin, EngagementHQ, CitizenLab

Bu tür yazılımlardan alınan temel tasarım ilkeleri:
- Paydaşların **rol, etki, ilgi ve ilişki düzeylerine göre** tanımlanabilmesi
- Paydaşlar arası **ilişki ağlarının (network graph)** görselleştirilmesi
- Sürükle-bırak temelli, sezgisel arayüzler
- Görsel önceliklendirme (etki–ilgi matrisi, güç–etki diyagramları)

## 3.2 Katılımcı Haritalama ve Geri Bildirim Platformları
**Örnek Platformlar:** Maptionnaire, Social Pinpoint, CoUrbanize, Bang the Table

Bu platformlardan alınan özellikler:
- Harita üzerinde **yorum bırakma, işaretleme ve oylama**
- Basit, yönlendirmeli kullanıcı akışları (wizard tabanlı formlar)
- Teknik olmayan kullanıcılar için sadeleştirilmiş harita deneyimi
- Katılımcı girdilerinin otomatik sınıflandırılması ve özetlenmesi

## 3.3 Proje ve Karar Destek Odaklı Araçlar
**Örnek Platformlar:** Logical Framework tools, Decision Lens, SenseMaker

Bu araçlardan uyarlanan yaklaşımlar:
- Paydaş görüşlerinin **nitel + nicel** olarak birlikte değerlendirilmesi
- Senaryo bazlı analiz ve karşılaştırma
- Gösterge (KPI) ve skor kartı mantığı

## 3.4 Bu Proje İçin Hedeflenen Ayırt Edici Yaklaşım
Referans alınan paydaş haritalama yazılımlarının güçlü yönleri doğrultusunda geliştirilecek sistem:
- CBS detaylarını arka planda tutan, **paydaş odaklı ve karar verici dostu** bir arayüz sunacaktır
- Haritayı teknik bir analiz aracı değil, **katılım ve iletişim zemini** olarak konumlandıracaktır
- Paydaş ilişkileri ile mekânsal bilgiyi birlikte ele alan **hibrit bir yapı** sağlayacaktır

# 4. Fonksiyonel Gereksinimler

## 4.1 Kullanıcı Rolleri ve Yetkilendirme Modeli
Sistem iki temel kullanıcı rolü üzerine kurgulanmıştır: **ADMIN** ve **PUBLIC**. Bu ayrım, veri tasarımı ile veri girişi süreçlerinin net biçimde ayrılmasını ve paydaş katılımının kontrollü şekilde yürütülmesini sağlar.

### 4.1.1 ADMIN Kullanıcısı
ADMIN kullanıcıları, sistemi yöneten ve veri giriş süreçlerini tasarlayan yetkili kullanıcılardır.

**Temel Yetkinlikler:**
- Çalışma alanlarını (KML / SHAPE) sisteme yükleme ve yönetme
- Zoom seviyelerine bağlı hexagon grid yapılandırmasını belirleme
- PUBLIC kullanıcılara sunulacak:
  - veri giriş formlarını
  - öznitelik alanlarını
  - sınıflandırma ve seçenek listelerini
  tasarlama ve güncelleme
- Hangi paydaş grubunun, hangi grid çözünürlüğünde veri girebileceğini tanımlama
- Girilen verileri görüntüleme, onaylama ve gerektiğinde düzenleme
- Tematik haritalar ve özet analizleri görüntüleme

ADMIN arayüzü; harita tabanlı, form tasarımına odaklı ve karar verici dostu bir kontrol paneli (dashboard) şeklinde kurgulanır.

### 4.1.2 PUBLIC Kullanıcısı
PUBLIC kullanıcıları, sisteme kayıt olmuş ve ADMIN tarafından kendilerine açılmış veri giriş görevlerini yerine getiren paydaşlardır.

**Temel Yetkinlikler:**
- Kendilerine atanmış çalışma alanlarını ve gridleri görüntüleme
- Harita üzerinde:
  - tekil veya çoklu hexagon hücresi seçme
  - seçilen hücrelere veri girişi yapma
- Sadece yetkilendirildikleri:
  - form alanlarını
  - grid çözünürlüklerini
  - zaman aralıklarını
  kullanabilme
- Girilen verileri kaydetme ve güncelleme

PUBLIC arayüzü; teknik detaylardan arındırılmış, yönlendirmeli ve sade bir kullanıcı deneyimi sunacak şekilde tasarlanır.

## 4.2 Veri Giriş ve Sunum Mantığı
- ADMIN tarafından tasarlanan veri giriş şemaları, PUBLIC kullanıcıya otomatik olarak sunulur
- PUBLIC kullanıcı, serbest çizim yapmaz; yalnızca **hexagon hücre seçimi + form doldurma** işlemi gerçekleştirir
- Bu yaklaşım veri tutarlılığını ve karşılaştırılabilirliği artırır

## 4.3 Diğer Fonksiyonel Modüller
- Harita ve katman yönetimi
- Hücre bazlı filtreleme ve sorgulama
- Temel analiz ve raporlama araçları

# 5. Fonksiyonel Olmayan Gereksinimler

- **Performans**: Büyük veri setleriyle çalışabilme
- **Güvenlik**: Veri şifreleme, yetkilendirme, loglama
- **Ölçeklenebilirlik**: Bulut ve konteyner tabanlı mimariye uyum
- **Uyumluluk**: OGC (WMS, WFS), INSPIRE ve açık veri standartları

# 6. Sistem Mimarisi ve Teknoloji Yığını (Stack)

Bu proje için **açık kaynaklı, ölçeklenebilir ve uzun vadede sürdürülebilir** bir sistem mimarisi önerilmektedir. Mimari; büyük hacimli paydaş girdilerinin performans kaybı olmadan toplanması, görselleştirilmesi ve analiz edilmesi hedefiyle tasarlanmıştır.

## 6.1 Veritabanı Katmanı (Backend DB)
**PostgreSQL + PostGIS**

**Neden:**
- Mekânsal sorgular (hangi hücre seçildi, kesişim, kapsama vb.) için endüstri standardıdır
- H3 hexagon indeksleri ile birlikte **hibrit kullanım** (geometri + matematiksel grid) mümkündür
- Zamansal ve öznitelik tabanlı sorgular için güçlüdür

**Kullanım Yaklaşımı:**
- H3 grid hücreleri tercihe göre:
  - yalnızca **H3 index ID** olarak saklanabilir veya
  - gerektiğinde PostGIS üzerinde **geometriye dönüştürülerek** analiz edilebilir
- Çalışma alanı sınırları (KML / SHAPE) PostGIS üzerinde tutulur

## 6.2 Backend API Katmanı
**Python tabanlı API (FastAPI veya GeoDjango)**

**Neden:**
- Python ekosistemi ile güçlü mekânsal ve analitik kütüphane desteği
- FastAPI ile:
  - yüksek performanslı async servisler
  - otomatik API dokümantasyonu (OpenAPI)
- Mekânsal veriyi farklı formatlarda servis edebilme:
  - JSON / GeoJSON
  - MVT (Mapbox Vector Tile)

**Temel Backend Bileşenleri:**
- h3-py ile dinamik grid üretimi
- Zoom seviyesine göre resolution seçimi
- Hücre–paydaş–zaman ilişkilerinin yönetimi
- Yetkilendirme ve rol bazlı erişim kontrolü

## 6.3 Frontend (Arayüz) Katmanı
**React veya Vue.js + MapLibre GL JS (alternatif: OpenLayers)**

**Neden:**
- WebGL tabanlı render altyapısı sayesinde:
  - binlerce hexagon hücresinin akıcı şekilde görüntülenmesi
  - zoom ve pan hareketlerinde performans kaybı yaşanmaması
- Leaflet’e kıyasla büyük veri setlerinde belirgin performans avantajı
- Vector tile (MVT) desteği ile backend–frontend veri trafiğinin azaltılması

**Arayüz Özellikleri:**
- Zoom seviyesine bağlı dinamik grid yenileme
- Hücre bazlı tıklama, çoklu seçim ve veri girişi
- Paydaş filtreleri ve tematik görselleştirme

## 6.4 Servisler ve Entegrasyonlar
- Harici harita servisleri (OpenStreetMap, uydu altlıkları)
- Dosya yükleme servisleri (KML, SHAPE)
- Opsiyonel: Uzaktan algılama ve drone verileri entegrasyonu

## 6.5 Ölçeklenebilirlik ve Dağıtım
- Docker tabanlı konteyner mimarisi
- Bulut veya kurum içi sunucuya uygun dağıtım
- Yük dengeleme ve yatay ölçeklenebilirlik

# 7. Veri Modeli (Özet)
- Kullanıcı
- Paydaş
- Proje
- Konumsal Kayıt (geometry + öznitelikler)
- Anket/Form Yanıtları

# 8. Geliştirme ve Yaygınlaştırma Yol Haritası
1. İhtiyaç analizi ve paydaş görüşmeleri
2. Prototip (MVP) geliştirme
3. Pilot uygulama ve geri bildirim
4. Ölçeklendirme ve ek analiz modülleri

# 9. ADMIN ve PUBLIC Kullanıcı Arayüzleri – Ekran Akışları (User Flow)

Bu bölümde sistemin iki temel kullanıcı rolü için öngörülen ekranlar ve kullanıcı akışları özetlenmiştir. Amaç, teknik karmaşıklığı arka planda tutarak rol bazlı, sezgisel ve hataya dayanıklı bir kullanıcı deneyimi sunmaktır.

## 9.1 ADMIN Kullanıcı Ekran Akışı

**1. Giriş ve Genel Kontrol Paneli (Dashboard)**
- Aktif projeler ve çalışma alanları
- Veri girişi durumu (tamamlanan / bekleyen)
- Son girilen paydaş verileri

**2. Proje / Çalışma Alanı Tanımlama**
- KML / SHAPE dosyası yükleme
- Çalışma alanı önizleme (harita üzerinde)
- Alan meta verileri (proje adı, açıklama, tarih)

**3. Grid Yapılandırma Ekranı**
- Zoom–H3 resolution eşleşmelerinin tanımlanması
- Grid önizleme (farklı zoom seviyelerinde)
- Grid kullanım kuralları (hangi kullanıcı, hangi çözünürlük)

**4. Veri Giriş Formu Tasarım Ekranı**
- Dinamik form alanları oluşturma (metin, seçim, skor, yorum)
- Zorunlu / opsiyonel alan tanımları
- Etki–ilgi, öncelik, kategori gibi sınıflandırmalar

**5. Paydaş ve PUBLIC Kullanıcı Atama**
- PUBLIC kullanıcı listesi
- Kullanıcı–çalışma alanı eşleştirme
- Kullanıcı bazlı yetki ve zaman aralığı tanımı

**6. Veri İzleme ve Onaylama**
- Hücre bazlı girilen verilerin harita üzerinde izlenmesi
- Filtreleme (kullanıcı, tarih, kategori)
- Gerekirse düzenleme veya geri gönderme

---

## 9.2 PUBLIC Kullanıcı Ekran Akışı

**1. Giriş ve Görevler Ekranı**
- Kullanıcıya atanmış projeler
- Aktif veri giriş görevleri

**2. Çalışma Alanı Harita Görünümü**
- Sadece yetkili olunan alanların görüntülenmesi
- Zoom seviyesine bağlı otomatik hexagon grid

**3. Hücre Seçimi**
- Tekil veya çoklu hexagon hücresi seçimi
- Seçilen hücrelerin görsel olarak vurgulanması

**4. Veri Giriş Formu**
- ADMIN tarafından tanımlanmış formun otomatik açılması
- Yönlendirmeli, sade form akışı
- Hatalı / eksik alanlar için anlık uyarılar

**5. Kaydetme ve Güncelleme**
- Veri kaydı
- Gerekirse daha sonra güncelleme
- Girilen verilerin özet görünümü

PUBLIC kullanıcı arayüzü, minimum harita kontrolü ve maksimum yönlendirme prensibiyle tasarlanır.

# 10. Sonuç
Bu dokümanda tanımlanan mimari ve kullanıcı akışları; paydaş haritalama çalışmalarında veri tutarlılığını, katılım kolaylığını ve analiz edilebilirliği birlikte sağlamayı hedefleyen yenilikçi bir web tabanlı uygulama altyapısı sunmaktadır.

