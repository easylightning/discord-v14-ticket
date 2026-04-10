# easylightning Ticket System

## Discord Destek

[Discord Destek Sunucusu](https://discord.gg/eMJdaP7Nqs)

Discord.js 14 tabanli, gelismis destek ve ticket yonetimi icin hazirlanmis profesyonel Discord ticket botu.

Bu proje, sunucu icinde duzenli destek akisi kurmak, yetkililerin performansini takip etmek ve ticket operasyonlarini daha kontrollu yonetmek icin gelistirildi.

## Genel Bakis

- Comp V2 tabanli modern ticket paneli
- Modal ile ticket acilisi
- Claim, unclaim, close, reopen ve delete akislari
- Yetkili bazli istatistik ve performans takibi
- Gunluk, haftalik ve aylik leaderboard
- Transcript olusturma sistemi
- Ticket blacklist sistemi
- Sira numarali ticket kanallari
- Gelismis log altyapisi
- GitHub paylasimina uygun hazir kurulum yapisi

## Panel Gorunumu

Bot, Discord icinde modern Comp V2 tasarimina sahip bir talep paneli kullanir.

Panel icerigi:

- Baslik ve aciklama alani
- Sag ustte marka logosu
- Kurallar listesi
- Alt bolumde banner gorseli
- `Talep Olustur` butonu

Bu yapi sayesinde klasik duz embed panel yerine daha derli toplu ve profesyonel bir destek girisi saglanir.

## Ozellikler

### Ticket Sistemi

- Ticket paneli uzerinden hizli talep olusturma
- Modal ile forum ismi, baslik ve detay toplama
- Tek kullanici icin acik ticket kontrolu
- Ticket numaralandirma sistemi (`0001`, `0002`, `0003` ...)
- Claim / unclaim / close / reopen / delete islemleri
- Uye ekleme ve uye cikarma islemleri

### Yetkili Takibi

- Yetkilinin kac claim attigi
- Kac ticket kapattigi
- Ticket icinde kac mesaj yazdigi
- Ilk cevap suresi
- Claim suresi
- Ortalama cevap ve ilgi suresi
- Gunluk / haftalik / aylik filtreleme

### Log ve Kayit Sistemi

- Ticket acilis logu
- Claim logu
- Ticket kapatma logu
- Transcript logu
- Yetkili hareket kayitlari
- Ticket gecmis hareketleri

### Ek Sistemler

- Ticket blacklist
- Transcript HTML ciktilari
- Developer yetkisi
- Owner role tabanli admin status sistemi
- Button tabanli leaderboard ve admin status menuleri

## Komutlar

- `/ticket-panel`
- `/admin-status`
- `/staff-leaderboard`
- `/ticket-blacklist`

## Gereksinimler

- Node.js `18.17.0` veya ustu
- Discord bot uygulamasi
- Discord sunucusunda gerekli kanal ve rol ID'leri

## Kurulum

1. Repoyu klonlayin.
2. Proje klasorune girin.
3. Bagimliliklari kurun:

```bash
npm install
```

4. `config.json` dosyasini acin.
5. Tum placeholder alanlarini kendi botunuza gore doldurun.
6. Botu baslatin:

```bash
node .
```

## Hızlı Kurulum Mantigi

Bu repo GitHub paylasimina uygun sekilde hazirlandi.

Kullanicinin yapmasi gerekenler:

1. `npm install`
2. `config.json` doldurmak
3. `node .` ile botu baslatmak

Ek olarak `node_modules`, log klasorleri ve runtime dosyalari repoya dahil edilmez.

## Config Alanlari

Asagidaki alanlar doldurulmalidir:

- `token`
- `clientId`
- `guildId`
- `ticketPanelChannelId`
- `ticketCategoryId`
- `logChannelId`
- `transcriptLogChannelId`
- `claimLogChannelId`
- `errorLogChannelId`
- `developers.ids`
- `adminStatus.ownerRoleIds`
- `adminStatus.logChannelId`
- `supportRoleIds`
- `allowedClaimRoleIds`
- `ticketMentionRoleIds`

## Calisma Akisi

1. Yetkili `/ticket-panel` komutu ile paneli gonderir.
2. Kullanici paneldeki butona tiklayarak formu acar.
3. Form doldurulduktan sonra bot yeni bir ticket kanali olusturur.
4. Yetkililer ticketi sahiplenir ve sureci yonetir.
5. Ticket kapatildiginda transcript ve loglar olusturulur.
6. Yetkili istatistikleri sistem icinde kaydedilir.

## GitHub Icin Hazirlik

Bu projede:

- `package.json` hazir gelir
- `package-lock.json` hazir gelir
- `config.json` placeholder degerlerle gelir
- `.gitignore` runtime klasorlerini disarida birakir

Bu nedenle proje dogrudan GitHub'a yuklenebilir.

## Gelistirici

[easylightning](https://github.com/easylightning)
