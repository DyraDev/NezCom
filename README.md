<div align="center">
  <img src="static/favicon.png" width="120" style="border-radius: 20px;" alt="NezCom Logo" />

  <h1>🏫 NEZCOM — SCHOOL CHAT PLATFORM 🏫</h1>

  <p>
    <img src="https://img.shields.io/badge/SvelteKit-2.0-FF3E00?style=for-the-badge&logo=svelte&logoColor=white" />
    <img src="https://img.shields.io/badge/PocketBase-0.22-B8DBE8?style=for-the-badge&logo=pocketbase&logoColor=black" />
    <img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/License-MIT-brightgreen?style=for-the-badge" />
    <img src="https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge" />
  </p>

  <p><i>Real-Time School Messaging Platform — Built with SvelteKit 2 & PocketBase, made in Indonesia 🇮🇩</i></p>
</div>

---

## 🇮🇩 Tentang Project | 🇺🇸 About

**[ID]**
**NezCom** adalah platform percakapan instan (*instant messaging*) real-time berbasis web yang dirancang khusus untuk lingkungan sekolah. NezCom menghubungkan komunikasi antara **Siswa**, **Guru**, dan **Administrator Sekolah** dalam satu antarmuka yang bersih, cepat, terstruktur, dan aman.

Aplikasi ini dibangun menggunakan arsitektur **SvelteKit 2 (Svelte 5 Runes)** di frontend dan **PocketBase (Single Go Binary + SQLite)** di backend. NezCom memanfaatkan fitur *Server-Sent Events (SSE)* untuk sinkronisasi data real-time instan tanpa *refresh*, serta *Native Browser APIs* untuk pemotongan foto, kompresi gambar, dan pemutaran audio secara ultra-ringan tanpa dependensi library eksternal yang berat.

**[EN]**
**NezCom** is a web-based real-time instant messaging platform designed specifically for school environments. NezCom seamlessly connects **Students**, **Teachers**, and **School Administrators** in a clean, fast, structured, and secure interface.

The application is built with **SvelteKit 2 (Svelte 5 Runes)** on the frontend and **PocketBase (Single Go Binary + SQLite)** on the backend. It leverages *Server-Sent Events (SSE)* for instant real-time data synchronization without page reloads, along with *Native Browser APIs* for image cropping, compression, and audio playback to maintain maximum performance and zero heavy external npm overhead.

---

## ✨ Fitur Utama | Key Features

### 💬 Percakapan & Manajemen Chat
- **Direct Message (1:1)**: Chat pribadi antar siswa, guru, dan admin dengan indikator kehadiran (*Online/Offline*) & indikator mengetik (*Typing Indicator*).
- **Grup Kelas & Komunitas**: Ruang diskusi per kelas atau komunitas kustom. Kontak pengguna sendiri **(Anda)** diurutkan paling atas untuk menghilangkan ambiguitas.
- **Saluran Siaran Resmi (Broadcast)**: Papan siaran pengumuman sekolah terpusat. Hanya Superadmin dan Guru ter-whitelist yang diizinkan mengirim pengumuman.
- **Tanda Terima Pesan (Read Receipts)**: Pelacakan pesan terkirim dan dibaca secara akurat per pengguna.

### 🖼️ Pengalaman Media & UX Cerdas
- **Paste Gambar dari Clipboard (`Ctrl + V`)**: Tempelkan tangkapan layar (*screenshot*) secara instan ke dalam composer tanpa perlu menyimpan berkas terlebih dahulu.
- **Lightbox Preview Modal**: Tampilan foto resolusi tinggi berlatar gelap *backdrop-blur* dilengkapi tombol unduh dan dukungan tombol `Esc`.
- **Pemutar Suara Native (Audio Player)**: Putar rekaman suara/audio (`.mp3`, `.wav`, `.m4a`, `.ogg`) langsung di dalam gelembung percakapan.
- **Smart Circle Crop (Canvas 2D)**: Pemotongan foto profil & foto avatar grup berbasis Canvas 2D native.
- **Badge Tipe File**: Indikator file lampiran berwarna (*PDF* merah, *DOCX* biru, *XLSX* hijau, *ZIP* kuning).
- **Smart Auto-Scroll**: Tombol melayang `↓ Pesan Baru` saat pengguna sedang membaca pesan/tugas lama di bagian atas.

### 🛡️ Keamanan & Kontrol Admin
- **Laporkan & Blokir Pengguna**: Fitur blokir real-time. Pengguna yang diblokir tidak dapat mengirimkan pesan pribadi.
- **Sematkan Pesan (Pin Message)**: Guru/Admin/Group Owner dapat menyematkan pengumuman penting di bagian atas percakapan.
- **Superadmin Control Panel**: Manajemen pengguna, impor massal (*Bulk CSV Import*), serta konfigurasi izin siaran guru.

---

## 📋 Persyaratan | Requirements

**[ID]** Sebelum instalasi, pastikan server atau laptop Anda sudah terinstall:

**[EN]** Before installation, make sure you have installed:

| Tool | Versi / Version | Link |
|------|-----------------|------|
| **Node.js** | v18.x / v20.x+ | [nodejs.org](https://nodejs.org/) |
| **npm** | v9.x+ | (Disertakan bersama Node.js) |
| **PocketBase** | v0.22.x+ | [pocketbase.io](https://pocketbase.io/docs/) |
| **Nginx** (VPS Linux) | Stable | `sudo apt install nginx` |
| **PM2** (VPS Linux) | Latest | `npm install -g pm2` |

---

## 🚀 Cara Build & Jalankan | How to Build & Run

### 1. Jalankan Backend PocketBase
```bash
cd pb
./pocketbase serve --http=127.0.0.1:8090
```

### 2. Inisialisasi Skema Database (Pertama Kali)
```bash
node scripts/setup_pocketbase.js
```

> **🔑 Kredensial Default Superadmin:**
> - **Username:** `superadmin`
> - **Password:** `admin123456`

### 3. Jalankan Frontend SvelteKit
```bash
npm install
npm run dev
```
> Buka browser Anda di `http://localhost:5173`

---

## ⚙️ Sistem Role & Hak Akses | Role System & Permissions

| Role | Nama Role | Keterangan & Hak Akses |
|------|-----------|------------------------|
| `student` | **Siswa** | Chat 1:1, masuk grup kelas/komunitas, salin teks, sematkan pesan 1:1, laporkan & blokir pengguna. |
| `teacher` | **Guru Sekolah** | Semua fitur siswa + buat grup komunitas, kirim siaran broadcast pengumuman (jika ter-whitelist), dan sematkan (*Pin*) pesan penting di grup. |
| `superadmin` | **Superadmin** | Full Access: Semua fitur di atas + Superadmin Control Panel (Bulk CSV Import, kelola whitelist broadcast guru, buat grup kelas official, hapus grup). |

---

## 🌐 Production Deployment (Linux VPS)

### 1. PocketBase Systemd Service
Buat berkas service di VPS `/etc/systemd/system/pocketbase.service`:
```ini
[Unit]
Description=PocketBase NezCom Backend Service
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/nezcom/pb
ExecStart=/var/www/nezcom/pb/pocketbase serve --http=127.0.0.1:8090
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Jalankan service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pocketbase
```

### 2. Build & Start Frontend (PM2)
```bash
cd /var/www/nezcom
npm install
npm run build
pm2 start build/index.js --name "nezcom-frontend"
pm2 save && pm2 startup
```

### 3. Konfigurasi Nginx Reverse Proxy & SSL (HTTPS)
Buat file `/etc/nginx/sites-available/nezcom`:
```nginx
server {
    server_name nezcom.sekolah.sch.id; # Ganti domain sekolah Anda

    # Frontend SvelteKit Node Server
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Backend PocketBase & Realtime SSE
    location /api/ {
        proxy_pass http://127.0.0.1:8090/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Berkas Upload Media
    location /api/files/ {
        proxy_pass http://127.0.0.1:8090/api/files/;
        proxy_set_header Host $host;
    }
}
```
Aktifkan dan pasang sertifikat SSL gratis (Certbot):
```bash
sudo ln -s /etc/nginx/sites-available/nezcom /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d nezcom.sekolah.sch.id
```

---

## 📂 Struktur Project | Project Structure

```
📦 NezCom
├── 📂 pb/                        # Binary PocketBase Engine & Data
│   ├── 📂 pb_migrations/         # Migrasi skema database PocketBase
│   └── 📂 pb_data/               # Storage SQLite & Berkas Upload (Di-ignore Git)
├── 📂 scripts/
│   └── 📄 setup_pocketbase.js    # Skrip inisialisasi skema & akun Superadmin
├── 📂 src/
│   ├── 📂 lib/
│   │   ├── 📂 components/
│   │   │   ├── 📂 brand/         # Logo & Identitas NezCom
│   │   │   ├── 📂 chat/          # ChatHeader, MessageBubble, Composer, InfoPanel, Lightbox
│   │   │   ├── 📂 modals/        # Modal Buat Grup, Admin Panel, Circle Crop
│   │   │   └── 📂 sidebar/       # Sidebar Kontak, Grup, dan Profil
│   │   ├── 📄 formatters.ts      # Helper tanggal, inisial & format file
│   │   ├── 📄 imageCompressor.ts  # Canvas 2D image compressor
│   │   ├── 📄 notifications.ts   # Notifikasi browser native
│   │   └── 📄 pocketbase.ts      # Client PocketBase SDK & Auth store
│   └── 📂 routes/
│       ├── 📄 +page.svelte       # Antarmuka utama aplikasi chat
│       └── 📂 login/             # Halaman login terautentikasi
├── 📂 static/                    # Aset statis & manifest
├── 📄 package.json               # Dependensi Node.js
└── 📄 README.md                  # Dokumentasi resmi
```

---

## 🔒 Skema Koleksi Database | Database Schema

| Koleksi | Tipe | Deskripsi & Hak Akses Rules |
|---|---|---|
| `users` | Auth | Pengguna sistem (`superadmin`, `teacher`, `student`). Menyangkut info kelas & izin broadcast. |
| `groups` | Base | Data grup (`class`, `custom`, `broadcast`) serta berkas foto avatar grup. |
| `group_members` | Base | Keanggotaan grup & pelacakan ID pesan terakhir yang dibaca (*read tracking*). |
| `messages` | Base | Berkas pesan, balasan (*reply_to*), lampiran media, dan waktu keterbacaan (*read_at*). |
| `blocks` | Base | Catatan pengguna yang diblokir beserta alasan pelaporan. |
| `app_settings` | Base | Konfigurasi sistem global (kebijakan broadcast guru). |

---

## 🤝 Kontribusi | Contributing

**[ID]** Pull request dan saran perbaikan sangat disambut! Silakan buka issue terlebih dahulu untuk diskusi perubahan besar.

**[EN]** Pull requests and feedback are welcome! Please open an issue first for major changes.

---

## 📄 Lisensi | License

MIT — Lihat berkas `LICENSE` untuk detail lengkap.

MIT — See `LICENSE` for full details.

---

## 🔎 Keywords / Tags

**NezCom** | **School Chat Web App** | **SvelteKit 2 Chat** | **PocketBase Realtime Chat** | **Aplikasi Chat Sekolah** | **School Communication Platform** | **Open Source School Chat** | **NezCom Indonesia**
