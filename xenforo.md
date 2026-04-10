# easylightning Ticket System

> Modern, gelişmiş ve yönetilebilir Discord destek sistemi.

**GitHub:** [https://github.com/easylightning/discord-v14-ticket](https://github.com/easylightning/discord-v14-ticket)  
**Destek Sunucusu:** [https://discord.gg/eMJdaP7Nqs](https://discord.gg/eMJdaP7Nqs)

---

## Projenin Amacı

`easylightning Ticket System`, Discord sunucularında destek süreçlerini düzenli, hızlı ve kontrol edilebilir hale getirmek için hazırlanmış bir **Discord.js v14 ticket botudur**.

Bu sistemin temel amacı:

- kullanıcıların düzenli şekilde destek talebi açabilmesi
- yetkililerin ticket süreçlerini tek panel üzerinden yönetebilmesi
- claim, kapatma ve mesaj performanslarının takip edilebilmesi
- transcript ve log kayıtlarının otomatik tutulabilmesi
- modern görünümlü bir ticket altyapısı sunulması

---

## Genel Özellikler

| Özellik | Açıklama |
|---|---|
| Modern Panel Sistemi | Comp V2 tabanlı, şık ve düzenli ticket paneli |
| Modal Destek Akışı | Kullanıcıdan forum adı, başlık ve detay toplar |
| Claim Sistemi | Yetkili ticket sahiplenebilir veya bırakabilir |
| Ticket Kapatma | Ticket kapatma, yeniden açma ve silme desteği |
| Transcript Sistemi | HTML transcript oluşturur ve log kanalına gönderir |
| Yetkili İstatistikleri | Claim, kapatma, mesaj ve cevap süresi kaydı tutar |
| Leaderboard | Günlük, haftalık ve aylık yetkili sıralaması |
| Blacklist Sistemi | İstenmeyen kullanıcıların ticket açmasını engeller |
| Sıralı Ticket Numarası | Ticket kanalları `0001`, `0002`, `0003` şeklinde ilerler |
| Log Altyapısı | Açılış, claim, kapatma ve transcript logları |

---

## Bot Ne İşe Yarar?

Bu bot, klasik ve dağınık destek sistemlerinin yerine daha profesyonel bir yapı sunar.

### Sağladığı avantajlar

- destek talepleri tek bir düzen içinde toplanır
- yetkililer hangi ticket ile ilgilendiğini net şekilde görür
- performans ölçümü yapılabilir
- ticket geçmişi kaybolmaz
- sunucu içindeki destek sistemi daha kurumsal görünür

---

## Ticket Sistemi İçeriği

| Sistem | Durum |
|---|---|
| Ticket paneli | Var |
| Ticket açma formu | Var |
| Claim / Unclaim | Var |
| Ticket kapatma | Var |
| Ticket geri açma | Var |
| Ticket silme | Var |
| Üye ekleme / çıkarma | Var |
| Transcript alma | Var |
| Yetkili log sistemi | Var |
| Yetkili istatistik sistemi | Var |

---

## Yetkili Takip Sistemi

Bot yalnızca ticket açıp kapatmakla kalmaz, aynı zamanda yetkili hareketlerini de kayıt altına alır.

### Takip edilen veriler

- toplam claim sayısı
- toplam kapatma sayısı
- toplam ticket mesajı
- ilk claim süresi
- ilk cevap süresi
- ortalama cevap süresi
- günlük / haftalık / aylık performans

Bu sayede sunucu yönetimi, hangi yetkilinin ne kadar aktif olduğunu doğrudan görebilir.

---

## Panel Yapısı

Bot içinde kullanılan panel yapısı modern görünüme sahiptir.

Panel içeriğinde:

- başlık
- açıklama
- kurallar alanı
- sağ üst logo
- alt banner görseli
- ticket oluşturma butonu

yer alır.

Bu yapı, klasik düz embed sistemlerinden daha düzenli ve daha profesyonel görünür.

---

## Kimler İçin Uygun?

Bu bot özellikle şu yapılar için uygundur:

- satış destek sunucuları
- oyun / hizmet destek sunucuları
- topluluk yönetim sunucuları
- premium ürün destek sistemleri
- forum bağlantılı destek toplulukları

---

## Kurulum

### Gereksinimler

| Gereksinim | Açıklama |
|---|---|
| Node.js | 18.17.0 veya üzeri |
| Discord Bot | Developer Portal üzerinden oluşturulmuş bot |
| Kanal ID'leri | Panel, log ve transcript kanalları |
| Rol ID'leri | Yetkili ve admin rollerinin ID'leri |

### Kurulum Adımları

```bash
npm install
```

Ardından:

1. `config.json` dosyasını açın
2. tüm ID alanlarını doldurun
3. bot tokenini girin
4. aşağıdaki komut ile başlatın

```bash
node .
```

---

## Config Yapısı

`config.json` dosyası paylaşım için hazır placeholder mantığında düzenlenmiştir.

Yani sistemi kullanan kişi sadece:

- `npm install`
- `config.json` düzenleme
- `node .`

işlemleri ile botu doğrudan çalıştırabilir.

---

## Teknik Özellikler

| Altyapı | Bilgi |
|---|---|
| Kütüphane | discord.js v14 |
| Sistem | Node.js |
| Panel Yapısı | Components V2 |
| Transcript Formatı | HTML |
| Log Yapısı | Kanal tabanlı + dosya tabanlı |
| Veri Yapısı | JSON tabanlı storage |

---

## Proje Linkleri

**GitHub Projesi:**  
[https://github.com/easylightning/discord-v14-ticket](https://github.com/easylightning/discord-v14-ticket)

**Destek Sunucusu:**  
[https://discord.gg/eMJdaP7Nqs](https://discord.gg/eMJdaP7Nqs)

---

## Kısa Özet

`easylightning Ticket System`, Discord sunucularında kullanılabilecek, modern görünümlü, performans odaklı ve yönetilebilir bir ticket çözümüdür.

Standart ticket botlarından farkı:

- daha modern panel yapısı
- daha detaylı yetkili takibi
- transcript desteği
- kapsamlı log sistemi
- yeniden açma ve silme akışları
- leaderboard ve admin status sistemi

Bu nedenle hem küçük hem de profesyonel topluluk sunucularında rahatlıkla kullanılabilir.
