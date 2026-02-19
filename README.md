# ABLUKA Web Oyunu

Tarayıcı için yerel ve çevrimiçi iki oyunculu Abluka oyunu.

## Nasıl Çalıştırılır

### Yerel Oyun (Bilgisayarda)
1. Dosyaları indir veya klonla
2. `index.html` dosyasını tarayıcıda aç
3. "Local Play" düğmesine tıkla
4. Oyunu oyna!

### Çevrimiçi Oyun (İnternetten)
1. **Oyuncu 1 (Ev Sahibi):**
   - Siteyi aç ve "Online Play" → "Create Game" tıkla
   - 6 karakterli kodu al
   - Kodu rakibinle paylaş (SMS, Discord, vs.)

2. **Oyuncu 2 (Misafir):**
   - Siteyi aç ve "Online Play" → "Join Game" tıkla
   - Kodu gir ve Enter tuşuna bas
   - Bağlantı kurulduğunda oyun başlar

## Oynanış Notları

- Tahta 7x7 boyutunda ve her oyuncunun tek oyuncu taşı var
- Sıranızda 1 kare hareket edin, sonra herhangi boş kareye engel taşı koyun
- Oyuncu taşları aynı karede olamaz ve engel taşlarına çıkamaz
- Rakibi hiç yasal hamle kalmayacak şekilde kilitleyerek kazanın

## Özellikler

- 🕹️ **Yerel Oyun**: İki oyuncu aynı bilgisayarda oynu
- 🌍 **Çevrimiçi Oyun**: Dünyadaki herhangi birden çevrimiçi oyun
- ⏱️ **Zaman Limiti**: 1 dk, 3 dk, 5 dk veya sınırsız seç
- 🎨 **Temalar**: 5 renk teması ve koyu/açık mod
- 🔊 **Ses Efektleri**: Oyun seslerini özelleştir
- ↺ **Geri Al**: Son hamleyi geri al

## Firebase Kurulumu (Çevrimiçi Oyun)

Çevrimiçi oyun Firebase Real-time Database kullanır. Hızlı başlamak için:

1. Demo veya kendi Firebase projenizi kullanın
2. [FIREBASE_SETUP.md](FIREBASE_SETUP.md) dosyasını okuyun

Daha fazla bilgi için dosyayı açın.

## Teknoloji

- HTML5 + CSS3 + JavaScript (Vanilla)
- Firebase Realtime Database (çevrimiçi senkronizasyon)
- Ses oluşturma Web Audio API
- Depolama localStorage

## Lisans

Eğitim amaçlı freely distributable.

