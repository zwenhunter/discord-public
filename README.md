# 5 Botlu Discord Yönetim Sistemi

Sunucularım için ihtiyaçtan çıkma bir proje. 5 ayrı bot var, hepsi tek `.env` üzerinden yönetiliyor. Slash komut yok, her şey nokta prefix ile çalışıyor. TypeScript kullanmadım, saf Node.js.

## Neden 5 ayrı bot?

Tek bot her şeyi yapmaya çalışınca bir modül çökünce gerisi de gidiyor. Bundan dolayı guard, moderasyon, istatistik, tag ve kayıt işlemleri ayrı process'lerde. Ortak altyapıyı (veritabanı, cache, logger, izin sistemi, emoji yönetimi) paylaşıyorlar ama biri düşse bile diğerleri çalışmaya devam ediyor. PM2 ile tek tek restart atabilirsin, birini baştan başlatmak diğerlerini etkilemez.

Botlar:

- **Guard** - anti-nuke, anti-raid, anti-spam. Kanal/rol silmeleri, mass ban, webhook kurcalamaları ve izinsiz bot eklemelerini takip ediyor. Audit log eşleştirmesi var; botun kendi yaptığı işlemleri ayırt ediyor ki yanlış kişiyi cezalandırmasın.
- **Moderation** - ban, kick, timeout, jail, warn ve kalıcı case sistemi. Süreli cezalar MongoDB'de duruyor, bot restart atsa da ceza devam ediyor. Otomatik moderasyon filtreleri var.
- **Statistics** - mesaj ve ses istatistikleri. Her mesajda sorgu atmak yerine bulkWrite ile pencere bazında yazıyor. AFK'da bekleyenlerin ses süresi sayılmıyor.
- **Guild Tag** - tagını alanın rolünü veriyor, bırakanın rolünü alıyor. Manuel müdahale de mümkün.
- **Register** - erkek / kadın / diğer kayıt, isim ve yaş sistemi, kayıt geçmişi.

## Kurulum

Node 18 ve üstü, çalışan bir MongoDB. Redis şart değil; verirsen cache olarak kullanır, vermezsen bellek içinde çalışır.

```bash
npm install
cp .env.example .env
```

`.env` içine 5 botun tokenını, MongoDB adresini, sunucu ID'sini ve kendi Discord ID'ni yaz. Sonra:

```bash
npm run setup
```

Bu komut gerçek kontroller yapar: token'ları Discord API'de sorgulayarak doğrular, MongoDB'ye ping atar, index'leri hazırlar, komut ve event dosyalarını tarar. Eksik bir şey varsa botu başlatmaz - bozuk konfigürasyonla çalıştırıp sonra "neden çalışmıyor" diye bakmaktansa böyle daha iyi.

Her şey tamam ise:

```bash
npm run start
```

PM2 üzerinden 5 process ayağa kalkar. `npm run guard:restart` gibi komutlarla sadece tek botu yeniden başlatabilirsin.

## Bilinmesi gerekenler

- Prefix varsayılan olarak `.` (nokta) ve config'ten değiştirilebilir.
- Emojiler `emojiler/` klasöründen gelir. `.emojikur` komutu bunları gerçekten sunucuya yüklüyor - sunucuda "Manage Expressions" izni gerekiyor.
- Bir emoji yüklenmez ya da bulunamazsa bot rastgele bir Unicode emoji göstermez, onun yerine `[OK]`, `[X]` gibi düz metin döner.
- Bot ve webhook mesajlarını komut olarak algılamıyor.
- Token'lar ve MongoDB adresi loglarda maskeleniyor.
- Guard bot için Developer Portal 'da Server Members, Message Content ve Presence intent'lerinin açık olması gerekiyor; genel olarak her bot için Members + Message Content yeterli.

## Testler

```bash
npm test
```

Cooldown, rate limit, izin sistemi, süre parse, emoji fallback gibi çekirdek davranışların testleri var. Şu an 27 test geçiyor.

## Ne zaman kullanmayın

Küçük sunucularda bu kadar katman gereksiz olabilir. Proje yoğun, bol moderasyonlu Türkçe sunucular için yazıldı. Komutların çoğu Türkçe isimli (kayıt, kadın, isim gibi) çünkü kullanıcı kitlesi Türk.

## Not

Kendi kullanımım için yazdım ama bu tarz bot kurduran herkese lazım olabilir düşüncesiyle paylaştım. Kod her yerden mükemmel değil, ama çalışıyor; sizi rahatsız ediyorsa fork'layıp kendiniz develop edebilirsiniz.

## Lisans

MIT
