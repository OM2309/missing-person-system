# 🔍 National Missing Persons Identification Portal

<div align="center">

![Government of India](https://img.shields.io/badge/Government%20of%20India-Ministry%20of%20Home%20Affairs-1a3a6b?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/AI-DeepFace%20%7C%20Facenet-f47920?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20FastAPI%20%7C%20MongoDB-green?style=for-the-badge)

**An AI-powered missing person identification system using facial recognition, video analysis, live camera scanning, and a public reward portal.**

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [How to Use](#-how-to-use)
- [API Reference](#-api-reference)
- [Pages Overview](#-pages-overview)
- [Environment Variables](#-environment-variables)
- [How the AI Works](#-how-the-ai-works)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

| Feature                    | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| 📋 **Person Registration** | Upload photo + details to register a missing person                     |
| 🎬 **Video Scan**          | Upload CCTV footage — AI scans every frame with timestamps              |
| 📱 **Live Camera**         | Mobile/webcam auto-scan every 5 seconds against all registered persons  |
| 👥 **Group Photo Scan**    | Upload a crowd/group photo — AI detects & highlights the missing person |
| 🔬 **AI Image Detector**   | Detect if a submitted photo is AI-generated or real                     |
| 🏆 **Reward Portal**       | Public portal where citizens submit tips and claim rewards              |
| 📧 **Email Reply System**  | Admin can reply to tip reporters directly via Gmail                     |
| ⚡ **Live Alerts**         | Real-time WebSocket notifications when a match is found                 |
| 🛡️ **Admin Panel**         | Manage cases, tips, matches, and send email replies                     |

---

## 📁 Project Structure

```
missing-person-system/
│
├── backend/                      ← Python FastAPI + AI Engine
│   ├── main.py                   ← All API routes (22 endpoints)
│   ├── requirements.txt          ← Python dependencies
│   ├── .env                      ← MongoDB URL config
│   └── uploads/
│       ├── persons/              ← Registered person photos
│       ├── videos/               ← Uploaded CCTV videos
│       └── frames/               ← Extracted video frames + matches
│
└── frontend/                     ← Next.js Web Application
    ├── app/
    │   ├── page.tsx              ← Home: Register person + Scan video
    │   ├── admin/page.tsx        ← Admin panel (Alerts, Tips, Matches)
    │   ├── camera/page.tsx       ← Live mobile camera scanner
    │   ├── missing-people/       ← Public reward portal
    │   ├── group-scan/           ← Group/crowd photo scanner
    │   └── ai-detector/          ← AI vs Real image detector
    ├── lib/
    │   └── api.ts                ← API helper functions
    └── .env.local                ← Frontend environment variables
```

---

## 🛠 Tech Stack

### Backend

- **FastAPI** — Python web framework
- **DeepFace** — Face recognition (Facenet model)
- **OpenCV** — Video processing & frame extraction
- **MongoDB** — Database (persons, matches, alerts, tips)
- **WebSocket** — Real-time live alerts
- **SMTP / Gmail** — Email notifications to tip reporters

### Frontend

- **Next.js 14** — React framework (App Router)
- **TypeScript** — Type safety
- **Axios** — API calls
- **Tailwind CSS** — Styling
- **Inter / Roboto** — Government portal typography

---

## 📦 Prerequisites

Before running, make sure you have:

- ✅ **Python 3.10+**
- ✅ **Node.js 18+**
- ✅ **MongoDB** (local or Atlas cloud)
- ✅ **4GB+ RAM** (for DeepFace AI model)
- ✅ **Internet** (first run downloads AI model ~90MB)

---

## 🚀 Installation & Setup

### Step 1 — Clone / Extract the project

```bash
# If downloaded as ZIP, extract it
unzip missing-person-system.zip
cd missing-person-system
```

---

### Step 2 — Start MongoDB

**Option A — Local MongoDB:**

```bash
mongod
```

**Option B — MongoDB Atlas (Free Cloud):**

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free cluster
3. Get your connection string
4. Update `backend/.env`:

```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
```

---

### Step 3 — Start Backend (Python)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

> ⏳ **First run:** Facenet model (~90MB) will be downloaded automatically. Wait for it to complete.

**Backend running at:** `http://localhost:8000`  
**API Docs at:** `http://localhost:8000/docs`

---

### Step 4 — Start Frontend (Next.js)

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

**Frontend running at:** `http://localhost:3000`

---

### Quick Start (Windows)

Double-click `start-windows.bat` — it starts both backend and frontend automatically.

### Quick Start (Mac/Linux)

```bash
chmod +x start-mac-linux.sh
./start-mac-linux.sh
```

---

## 📖 How to Use

### 1. Register a Missing Person

1. Open `http://localhost:3000`
2. Click **"Register Person"** tab
3. Fill in: Name, Age, Description
4. Upload a **clear, front-facing photo**
5. Click **"Register Missing Person"**

---

### 2. Scan a Video (CCTV Footage)

1. Click **"Scan Video"** tab
2. Select the registered person
3. Upload any video file (MP4, AVI, MOV)
4. Click **"Start AI Video Scan"**
5. Go to **Admin Panel → Alerts** for results with exact timestamps

---

### 3. Live Camera Scanner

1. Open `http://localhost:3000/camera` on your phone or PC
2. Click **"Start Camera"**
3. Use **"Scan Now"** (manual) or **"Auto Scan"** (every 5 seconds)
4. If a registered person is detected → instant alert in admin panel

> 📱 For phone access: run `npm run dev -- --hostname 0.0.0.0`  
> Then open `http://YOUR_PC_IP:3000/camera`

---

### 4. Group Photo / Crowd Scan

1. Open `http://localhost:3000/group-scan`
2. Select a registered person
3. Upload any group photo, event photo, or CCTV screenshot
4. AI detects all faces and **highlights the match with a green box**

---

### 5. AI Image Detector

1. Open `http://localhost:3000/ai-detector`
2. Upload any photo
3. System runs 6 forensic checks:
   - Noise pattern analysis
   - Frequency spectrum (FFT)
   - Facial symmetry check
   - Color channel distribution
   - Texture uniformity
   - Edge sharpness
4. Returns verdict: **Real Photo / Suspicious / AI Generated**

---

### 6. Public Reward Portal

1. Open `http://localhost:3000/missing-people`
2. Citizens can see all missing persons with reward amounts
3. Click on a person → Fill tip form (name, email, phone, location, photo)
4. Submit → Admin receives instant alert

---

### 7. Admin Panel

1. Open `http://localhost:3000/admin`
2. **Alerts tab** — Live match alerts with confidence scores
3. **Tips & Rewards tab** — All public tips with reporter details
4. **Matches tab** — All AI matches with frame screenshots
5. **Cases tab** — Manage persons + set reward amounts

#### Setting a Reward (Admin)

- Go to **Cases tab**
- Click **"Set Reward"** on any person
- Choose from quick amounts or enter custom
- Reward appears on public portal instantly

#### Replying to a Tip (Admin)

- Go to **Tips & Rewards tab**
- Click **"📧 Reply via Email"** on any tip
- Use quick templates or write custom message
- Add Gmail + App Password to actually send email
- Without credentials: reply is saved in database

---

## 📧 Email Setup (Gmail)

To enable email replies to tip reporters:

1. Enable **2-Factor Authentication** on your Google account
2. Go to: Google Account → Security → **App Passwords**
3. Create an App Password for "Mail"
4. In Admin Panel reply modal:
   - Gmail: `your@gmail.com`
   - Password: `your-16-char-app-password`

> ⚠️ Never use your regular Gmail password — only App Password works.

---

## 🔌 API Reference

### Core Endpoints

| Method   | Endpoint            | Description                        |
| -------- | ------------------- | ---------------------------------- |
| `GET`    | `/`                 | API status & endpoints list        |
| `POST`   | `/upload-person`    | Register missing person with photo |
| `POST`   | `/scan-video`       | Upload & scan video footage        |
| `POST`   | `/scan-frame`       | Scan single camera frame           |
| `POST`   | `/scan-group-photo` | Scan group/crowd photo             |
| `POST`   | `/detect-ai-image`  | Detect AI-generated image          |
| `GET`    | `/persons`          | List all registered persons        |
| `GET`    | `/matches`          | Get all AI matches                 |
| `GET`    | `/alerts`           | Get all alerts                     |
| `POST`   | `/alerts/{id}/read` | Mark alert as read                 |
| `DELETE` | `/persons/{id}`     | Remove a person                    |
| `WS`     | `/ws/admin`         | WebSocket live alerts              |

### Reward & Tips Endpoints

| Method | Endpoint                   | Description                  |
| ------ | -------------------------- | ---------------------------- |
| `POST` | `/persons/{id}/set-reward` | Set reward amount            |
| `GET`  | `/public/missing-persons`  | Public list with rewards     |
| `POST` | `/public/submit-tip`       | Submit public tip            |
| `GET`  | `/admin/tips`              | Get all tips (admin)         |
| `POST` | `/admin/tips/{id}/status`  | Update tip status            |
| `POST` | `/admin/tips/{id}/reply`   | Send email reply to reporter |

### CCTV Endpoints

| Method   | Endpoint            | Description      |
| -------- | ------------------- | ---------------- |
| `POST`   | `/cctv/add`         | Add RTSP stream  |
| `GET`    | `/cctv/streams`     | List all streams |
| `POST`   | `/cctv/stop/{id}`   | Stop a stream    |
| `DELETE` | `/cctv/delete/{id}` | Remove a stream  |

---

## 🖥 Pages Overview

| URL               | Page                                | Access |
| ----------------- | ----------------------------------- | ------ |
| `/`               | Home — Register person + Scan video | Public |
| `/admin`          | Admin panel — Alerts, Tips, Matches | Admin  |
| `/camera`         | Live camera scanner                 | Public |
| `/missing-people` | Public reward portal                | Public |
| `/group-scan`     | Group/crowd photo scanner           | Public |
| `/ai-detector`    | AI image authenticity detector      | Public |

---

## ⚙️ Environment Variables

### Backend — `backend/.env`

```env
MONGO_URL=mongodb://localhost:27017
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🧠 How the AI Works

### Face Recognition

- Model: **Facenet** (lightweight, ~90MB)
- Comparison: **Cosine similarity**
- Match threshold: **55%+ confidence**
- DeepFace library handles detection + embedding

### Video Analysis

- Extracts frames every **2 seconds**
- Each frame compared with registered person
- Matched frames saved with **exact timestamp** (e.g., "2m 15s")
- Results sent as live WebSocket alert to admin

### Group Photo Detection

- Detects **all faces** in the image using OpenCV
- Compares each face with target person
- Draws **green bounding box** on matches
- Returns annotated image as base64

### AI Image Detector (6 checks)

| Check              | What it detects                         |
| ------------------ | --------------------------------------- |
| Noise Analysis     | AI images have unnaturally low noise    |
| Frequency Spectrum | GAN models leave signature FFT patterns |
| Face Symmetry      | AI faces are too perfectly symmetric    |
| Color Distribution | Unnatural color channel balance         |
| Texture Uniformity | AI lacks natural micro-texture          |
| Edge Sharpness     | AI produces overly sharp edges          |

---

## 🐛 Troubleshooting

**Model download slow?**

> Facenet model is ~90MB — first run only. Let it complete, don't interrupt.

**RAM issue / "Unable to allocate" error?**

> Make sure `model_name="Facenet"` in `main.py` (not VGG-Face which needs 392MB).

**Camera not working on phone?**

> Camera only works on HTTPS or localhost. For phone access:
>
> ```bash
> npm run dev -- --hostname 0.0.0.0
> ```
>
> Then open `http://YOUR_PC_IP:3000/camera`

**MongoDB connection refused?**

> Make sure MongoDB is running: `mongod`  
> Or switch to MongoDB Atlas (free cloud).

**Python PATH warning on Windows?**

> Add to PATH: `C:\Users\YourName\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.10_xxx\LocalCache\local-packages\Python310\Scripts`

**Email not sending?**

> Use Gmail App Password, not regular password.  
> Enable 2FA → Google Account → Security → App Passwords.

**Low face match accuracy?**

> - Use clear, front-facing, well-lit photos
> - Avoid sunglasses, masks, or blurry images
> - Re-register with a better quality photo

---

## 📊 System Requirements

| Component | Minimum              | Recommended |
| --------- | -------------------- | ----------- |
| RAM       | 4GB                  | 8GB+        |
| Storage   | 2GB free             | 5GB+        |
| Python    | 3.10                 | 3.11        |
| Node.js   | 18                   | 20          |
| Internet  | Required (first run) | Required    |

---

## 🏗 Deployment

### Using Docker Compose

```bash
docker-compose up --build
```

Services:

- MongoDB: `localhost:27017`
- Backend: `localhost:8000`
- Frontend: `localhost:3000`

---

## 📄 License

This project is built for hackathon/government demonstration purposes.

---

<div align="center">

**National Missing Persons Identification Portal**  
Ministry of Home Affairs, Government of India  
Helpline: **112**

</div>
