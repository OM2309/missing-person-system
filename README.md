# 🔍 Missing Person Finder - AI System

A simple, complete AI-powered missing person identification system.

## What it does

1. **Upload a person's photo** → registers them in the system
2. **Upload a video** (CCTV footage) → AI scans every frame for the person
3. **Mobile camera** → point your phone camera anywhere, it auto-scans live
4. **Admin panel** → see all alerts, matches with timestamps and confidence scores
5. **Real-time alerts** → WebSocket notifications the moment someone is found

---

## Project Structure

```
missing-person-system/
├── backend/          ← Python FastAPI + DeepFace AI
│   ├── main.py
│   ├── requirements.txt
│   └── uploads/      ← stored images, videos, frames
│
└── frontend/         ← Next.js web app
    ├── app/
    │   ├── page.tsx          ← Home: upload person + scan video
    │   ├── admin/page.tsx    ← Admin panel with live alerts
    │   └── camera/page.tsx   ← Mobile webcam scanner
    └── lib/api.ts
```

---

## Setup & Run

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)

---

### Step 1: Start MongoDB

**Option A - Local MongoDB:**
```bash
mongod --dbpath ./data/db
```

**Option B - MongoDB Atlas (free):**
- Go to https://cloud.mongodb.com
- Create free cluster → get connection string
- Edit `backend/.env`: `MONGO_URL=mongodb+srv://...`

---

### Step 2: Start Backend (Python)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

> **Note:** First run will download DeepFace models (~500MB). Be patient.

---

### Step 3: Start Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

---

## How to Use

### 🟦 Register a Missing Person
1. Open http://localhost:3000
2. Click "Register Person" tab
3. Enter name, age, description
4. Upload a clear face photo
5. Click "Register"

### 🟣 Scan a Video
1. Click "Scan Video" tab
2. Select the registered person
3. Upload CCTV/any video (MP4, AVI, MOV)
4. Click "Start Video Scan"
5. Check Admin Panel → Alerts for results

### 📱 Mobile Camera Scan
1. Open http://localhost:3000/camera on your phone
2. Click "Start Camera"
3. Click "Scan Now" (manual) or "Auto Scan" (every 5 seconds)
4. If a registered person appears → instant alert sent to admin

### 🛡️ Admin Panel
1. Open http://localhost:3000/admin
2. See live alerts with confidence scores and video timestamps
3. View matched video frames with timestamps like "2m 15s"
4. WebSocket live connection - alerts appear instantly

---

## How the AI Works

- Uses **DeepFace** library with **VGG-Face** model
- Compares face embeddings using cosine similarity
- Confidence threshold: **55%+** = potential match
- Scans video at **2-second intervals**
- Works on Indian faces well (VGG-Face is trained on diverse datasets)

---

## Environment Variables

### Backend (`backend/.env`)
```
MONGO_URL=mongodb://localhost:27017
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/upload-person` | Register missing person with photo |
| POST | `/scan-video` | Upload video to scan |
| POST | `/scan-frame` | Scan single image/camera frame |
| GET | `/persons` | List all registered persons |
| GET | `/alerts` | Get all alerts |
| GET | `/matches` | Get all matches |
| WS | `/ws/admin` | WebSocket for live alerts |

---

## Troubleshooting

**DeepFace model download slow?**
- First time only, models ~500MB. Let it complete.

**Camera not working on mobile?**
- Use HTTPS or localhost. Camera doesn't work on plain HTTP on other devices.
- For phone access: run `npm run dev -- --hostname 0.0.0.0` then open `http://YOUR_PC_IP:3000/camera`

**MongoDB connection refused?**
- Make sure MongoDB is running: `mongod`
- Or use MongoDB Atlas cloud (free tier)

**Low accuracy?**
- Use clear, front-facing photos
- Good lighting in source photo
- Multiple photos = better results (re-register with better photo)
# missing-person-system
