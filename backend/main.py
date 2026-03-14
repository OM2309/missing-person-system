from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import uuid
import shutil
import cv2
import numpy as np
from datetime import datetime
from pymongo import MongoClient
import base64
import json
from deepface import DeepFace
import asyncio
from typing import List
import threading
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = FastAPI(title="Missing Person Finder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
os.makedirs("uploads/persons", exist_ok=True)
os.makedirs("uploads/videos", exist_ok=True)
os.makedirs("uploads/frames", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# MongoDB
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = MongoClient(MONGO_URL)
db = client["missing_persons"]
persons_col = db["persons"]
matches_col = db["matches"]
alerts_col = db["alerts"]
tips_col = db["tips"]
streams_col = db["cctv_streams"]

# Active CCTV streams
active_streams = {}

# WebSocket connections for admin panel
admin_connections: List[WebSocket] = []


# ========================
# HELPER FUNCTIONS
# ========================

async def broadcast_alert(message: dict):
    dead = []
    for ws in admin_connections:
        try:
            await ws.send_json(message)
        except:
            dead.append(ws)
    for ws in dead:
        admin_connections.remove(ws)


def compare_faces(img1_path: str, img2_path: str) -> dict:
    """Compare two face images using DeepFace."""
    try:
        result = DeepFace.verify(
            img1_path=img1_path,
            img2_path=img2_path,
            model_name="Facenet",
            enforce_detection=False,
            distance_metric="cosine"
        )
        distance = result.get("distance", 1.0)
        confidence = max(0, round((1 - distance) * 100, 2))
        return {"matched": result.get("verified", False), "confidence": confidence, "distance": distance}
    except Exception as e:
        print(f"Face compare error: {e}")
        return {"matched": False, "confidence": 0, "distance": 1.0}


def analyze_video_for_person(video_path: str, person_img_path: str, person_id: str, person_name: str):
    """Scan video frames and find matching person - runs in thread."""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    frame_interval = max(1, int(fps * 2))
    frame_count = 0
    matches_found = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % frame_interval == 0:
            timestamp_sec = frame_count / fps
            timestamp_str = f"{int(timestamp_sec // 60)}m {int(timestamp_sec % 60)}s"

            frame_file = f"uploads/frames/frame_{uuid.uuid4().hex}.jpg"
            cv2.imwrite(frame_file, frame)

            try:
                result = compare_faces(person_img_path, frame_file)
                if result["matched"] or result["confidence"] > 55:
                    matches_found.append({
                        "timestamp": timestamp_str,
                        "timestamp_sec": timestamp_sec,
                        "confidence": result["confidence"],
                        "frame_path": frame_file
                    })
                    print(f"MATCH at {timestamp_str} with confidence {result['confidence']}%")
                else:
                    os.remove(frame_file)
            except:
                if os.path.exists(frame_file):
                    os.remove(frame_file)

        frame_count += 1

    cap.release()

    if matches_found:
        match_doc = {
            "_id": str(uuid.uuid4()),
            "person_id": person_id,
            "person_name": person_name,
            "video_path": video_path,
            "source": "video",
            "matches": matches_found,
            "best_confidence": max(m["confidence"] for m in matches_found),
            "first_seen_at": matches_found[0]["timestamp"],
            "created_at": datetime.utcnow().isoformat()
        }
        matches_col.insert_one(match_doc)

        alert_doc = {
            "_id": str(uuid.uuid4()),
            "type": "video_match",
            "person_id": person_id,
            "person_name": person_name,
            "message": f"🎯 {person_name} found in video at {matches_found[0]['timestamp']}! Confidence: {matches_found[0]['confidence']}%",
            "confidence": matches_found[0]["confidence"],
            "timestamp": matches_found[0]["timestamp"],
            "created_at": datetime.utcnow().isoformat(),
            "read": False
        }
        alerts_col.insert_one(alert_doc)
        asyncio.run(broadcast_alert(alert_doc))

    return matches_found


def scan_rtsp_stream(stream_id: str, rtsp_url: str, stream_name: str, stop_flag: dict):
    """Continuously scan RTSP CCTV stream for missing persons."""
    import time
    print(f"Starting CCTV scan: {stream_name} ({rtsp_url})")
    consecutive_failures = 0

    while not stop_flag["stop"]:
        cap = cv2.VideoCapture(rtsp_url)
        if not cap.isOpened():
            consecutive_failures += 1
            streams_col.update_one({"_id": stream_id}, {"$set": {"status": "error", "error": "Cannot connect to stream"}})
            time.sleep(10)
            if consecutive_failures > 5:
                break
            continue

        consecutive_failures = 0
        streams_col.update_one({"_id": stream_id}, {"$set": {"status": "active", "error": None}})
        print(f"CCTV connected: {stream_name}")

        while not stop_flag["stop"]:
            ret, frame = cap.read()
            if not ret:
                break

            time.sleep(30)

            frame_filename = f"cctv_{stream_id}_{uuid.uuid4().hex[:8]}.jpg"
            frame_path = f"uploads/frames/{frame_filename}"
            frame_url = f"/uploads/frames/{frame_filename}"
            cv2.imwrite(frame_path, frame)

            persons = list(persons_col.find({"status": "active"}))
            matched = False
            for person in persons:
                try:
                    result = compare_faces(person["image_path"], frame_path)
                    if result["matched"] or result["confidence"] > 55:
                        matched = True
                        print(f"CCTV MATCH: {person['name']} in {stream_name} - {result['confidence']}%")

                        match_doc = {
                            "_id": str(uuid.uuid4()),
                            "person_id": person["_id"],
                            "person_name": person["name"],
                            "source": "cctv",
                            "stream_name": stream_name,
                            "stream_id": stream_id,
                            "confidence": result["confidence"],
                            "frame_url": frame_url,
                            "person_image_url": person.get("image_url", ""),
                            "created_at": datetime.utcnow().isoformat()
                        }
                        matches_col.insert_one(match_doc)

                        alert_doc = {
                            "_id": str(uuid.uuid4()),
                            "type": "cctv_match",
                            "person_id": person["_id"],
                            "person_name": person["name"],
                            "message": f"📹 {person['name']} spotted on CCTV '{stream_name}'! Confidence: {result['confidence']}%",
                            "confidence": result["confidence"],
                            "stream_name": stream_name,
                            "frame_url": frame_url,
                            "person_image_url": person.get("image_url", ""),
                            "created_at": datetime.utcnow().isoformat(),
                            "read": False
                        }
                        alerts_col.insert_one(alert_doc)
                        asyncio.run(broadcast_alert(alert_doc))
                except Exception as e:
                    print(f"CCTV compare error: {e}")

            if not matched and os.path.exists(frame_path):
                os.remove(frame_path)

        cap.release()

    streams_col.update_one({"_id": stream_id}, {"$set": {"status": "stopped"}})
    print(f"CCTV stopped: {stream_name}")


def extract_image_features(img_path: str) -> dict:
    """Extract technical features from image to detect if AI generated."""
    img = cv2.imread(img_path)
    if img is None:
        return {}

    features = {}
    h, w = img.shape[:2]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray_f = gray.astype(np.float32)
    noise = gray_f - cv2.GaussianBlur(gray_f, (5, 5), 0)
    features["noise_std"] = float(np.std(noise))
    features["noise_mean"] = float(np.mean(np.abs(noise)))

    fft = np.fft.fft2(gray_f)
    fft_shift = np.fft.fftshift(fft)
    magnitude = np.log(np.abs(fft_shift) + 1)
    features["freq_std"] = float(np.std(magnitude))
    features["freq_high_ratio"] = float(np.mean(magnitude[h//4:3*h//4, w//4:3*w//4]) / (np.mean(magnitude) + 1e-6))

    for i, ch in enumerate(['b', 'g', 'r']):
        channel = img[:, :, i].astype(np.float32)
        features[f"color_{ch}_std"] = float(np.std(channel))
        features[f"color_{ch}_skew"] = float(np.mean((channel - np.mean(channel))**3) / (np.std(channel)**3 + 1e-6))

    edges = cv2.Canny(gray, 50, 150)
    features["edge_density"] = float(np.sum(edges > 0) / (h * w))
    edge_grad = cv2.Laplacian(gray, cv2.CV_64F)
    features["edge_sharpness"] = float(np.var(edge_grad))

    dx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    dy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    gradient_mag = np.sqrt(dx**2 + dy**2)
    features["texture_uniformity"] = float(np.std(gradient_mag) / (np.mean(gradient_mag) + 1e-6))

    if w > 10:
        left_half = gray[:, :w//2]
        right_half_flipped = cv2.flip(gray[:, w//2:], 1)
        min_w = min(left_half.shape[1], right_half_flipped.shape[1])
        if min_w > 0:
            sym_diff = np.mean(np.abs(left_half[:, :min_w].astype(float) - right_half_flipped[:, :min_w].astype(float)))
            features["face_symmetry_diff"] = float(sym_diff)

    features["image_width"] = w
    features["image_height"] = h
    features["aspect_ratio"] = float(w / h)
    return features


def classify_ai_or_real(features: dict) -> dict:
    """Rule-based classifier using image forensics."""
    ai_score = 0.0
    reasons = []
    checks = []

    noise_std = features.get("noise_std", 5)
    if noise_std < 3.5:
        ai_score += 25
        reasons.append("Unnaturally low noise levels (too clean)")
        checks.append({"check": "Noise Analysis", "result": "Suspicious", "value": f"{noise_std:.2f}", "status": "fail"})
    elif noise_std < 5.0:
        ai_score += 10
        checks.append({"check": "Noise Analysis", "result": "Slightly low", "value": f"{noise_std:.2f}", "status": "warn"})
    else:
        checks.append({"check": "Noise Analysis", "result": "Natural", "value": f"{noise_std:.2f}", "status": "pass"})

    texture = features.get("texture_uniformity", 1.0)
    if texture < 0.8:
        ai_score += 20
        reasons.append("Too-uniform texture (AI smoothing detected)")
        checks.append({"check": "Texture Analysis", "result": "Suspicious", "value": f"{texture:.2f}", "status": "fail"})
    elif texture < 1.2:
        ai_score += 8
        checks.append({"check": "Texture Analysis", "result": "Slightly smooth", "value": f"{texture:.2f}", "status": "warn"})
    else:
        checks.append({"check": "Texture Analysis", "result": "Natural", "value": f"{texture:.2f}", "status": "pass"})

    freq_std = features.get("freq_std", 3.0)
    if freq_std > 6.5:
        ai_score += 15
        reasons.append("Unusual frequency spectrum (GAN artifact pattern)")
        checks.append({"check": "Frequency Spectrum", "result": "Suspicious", "value": f"{freq_std:.2f}", "status": "fail"})
    else:
        checks.append({"check": "Frequency Spectrum", "result": "Normal", "value": f"{freq_std:.2f}", "status": "pass"})

    sym = features.get("face_symmetry_diff", 15)
    if sym < 4.0:
        ai_score += 20
        reasons.append("Extreme facial symmetry (too perfect for real photo)")
        checks.append({"check": "Face Symmetry", "result": "Too perfect", "value": f"{sym:.2f}", "status": "fail"})
    elif sym < 8.0:
        ai_score += 8
        checks.append({"check": "Face Symmetry", "result": "Very symmetric", "value": f"{sym:.2f}", "status": "warn"})
    else:
        checks.append({"check": "Face Symmetry", "result": "Natural asymmetry", "value": f"{sym:.2f}", "status": "pass"})

    color_stds = [features.get(f"color_{c}_std", 50) for c in ['b', 'g', 'r']]
    color_balance = max(color_stds) - min(color_stds)
    if color_balance < 5:
        ai_score += 15
        reasons.append("Unnaturally balanced color channels")
        checks.append({"check": "Color Distribution", "result": "Suspicious", "value": f"balance={color_balance:.1f}", "status": "fail"})
    else:
        checks.append({"check": "Color Distribution", "result": "Natural", "value": f"balance={color_balance:.1f}", "status": "pass"})

    edge_sharp = features.get("edge_sharpness", 500)
    if edge_sharp > 3000:
        ai_score += 10
        reasons.append("Overly sharp edges (unnatural sharpness)")
        checks.append({"check": "Edge Sharpness", "result": "Too sharp", "value": f"{edge_sharp:.0f}", "status": "warn"})
    else:
        checks.append({"check": "Edge Sharpness", "result": "Normal", "value": f"{edge_sharp:.0f}", "status": "pass"})

    ai_score = min(100, ai_score)
    real_score = 100 - ai_score

    if ai_score >= 60:
        verdict, verdict_label, verdict_color = "AI_GENERATED", "Likely AI Generated", "red"
    elif ai_score >= 35:
        verdict, verdict_label, verdict_color = "SUSPICIOUS", "Suspicious — Possibly AI", "orange"
    else:
        verdict, verdict_label, verdict_color = "REAL", "Likely Real Photo", "green"

    return {
        "verdict": verdict,
        "verdict_label": verdict_label,
        "verdict_color": verdict_color,
        "ai_probability": round(ai_score, 1),
        "real_probability": round(real_score, 1),
        "reasons": reasons,
        "checks": checks,
        "features": {k: round(v, 3) if isinstance(v, float) else v for k, v in features.items()}
    }


# ========================
# CORE ROUTES
# ========================

@app.get("/")
def root():
    return {
        "status": "Missing Person API Running",
        "endpoints": [
            "/upload-person", "/scan-video", "/scan-frame",
            "/scan-group-photo", "/detect-ai-image",
            "/persons", "/matches", "/alerts",
            "/public/missing-persons", "/public/submit-tip",
            "/admin/tips", "/cctv/add"
        ]
    }


@app.post("/upload-person")
async def upload_person(
    name: str = Form(...),
    age: str = Form(default="Unknown"),
    description: str = Form(default=""),
    image: UploadFile = File(...)
):
    person_id = str(uuid.uuid4())
    ext = image.filename.split(".")[-1].lower()
    filename = f"{person_id}.{ext}"
    filepath = f"uploads/persons/{filename}"

    with open(filepath, "wb") as f:
        shutil.copyfileobj(image.file, f)

    doc = {
        "_id": person_id,
        "name": name,
        "age": age,
        "description": description,
        "image_path": filepath,
        "image_url": f"/uploads/persons/{filename}",
        "status": "active",
        "reward": 0,
        "currency": "INR",
        "created_at": datetime.utcnow().isoformat()
    }
    persons_col.insert_one(doc)
    return {"success": True, "person_id": person_id, "message": f"Person '{name}' registered successfully"}


@app.post("/scan-video")
async def scan_video(person_id: str = Form(...), video: UploadFile = File(...)):
    person = persons_col.find_one({"_id": person_id})
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    video_id = str(uuid.uuid4())
    ext = video.filename.split(".")[-1].lower()
    video_path = f"uploads/videos/{video_id}.{ext}"

    with open(video_path, "wb") as f:
        shutil.copyfileobj(video.file, f)

    thread = threading.Thread(
        target=analyze_video_for_person,
        args=(video_path, person["image_path"], person_id, person["name"])
    )
    thread.daemon = True
    thread.start()

    return {"success": True, "video_id": video_id, "message": f"Video uploaded. Scanning for {person['name']}... Check alerts for results."}


@app.post("/scan-frame")
async def scan_frame(image: UploadFile = File(...)):
    frame_id = str(uuid.uuid4())
    frame_filename = f"cam_{frame_id}.jpg"
    frame_path = f"uploads/frames/{frame_filename}"
    frame_url = f"/uploads/frames/{frame_filename}"

    with open(frame_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    persons = list(persons_col.find({"status": "active"}))
    results = []

    for person in persons:
        try:
            result = compare_faces(person["image_path"], frame_path)
            if result["matched"] or result["confidence"] > 55:
                results.append({
                    "person_id": person["_id"],
                    "person_name": person["name"],
                    "confidence": result["confidence"],
                    "frame_url": frame_url,
                    "person_image_url": person.get("image_url", "")
                })

                match_id = str(uuid.uuid4())
                matches_col.insert_one({
                    "_id": match_id,
                    "person_id": person["_id"],
                    "person_name": person["name"],
                    "source": "mobile_camera",
                    "confidence": result["confidence"],
                    "frame_path": frame_path,
                    "frame_url": frame_url,
                    "person_image_url": person.get("image_url", ""),
                    "created_at": datetime.utcnow().isoformat()
                })

                alert_doc = {
                    "_id": str(uuid.uuid4()),
                    "type": "camera_match",
                    "person_id": person["_id"],
                    "person_name": person["name"],
                    "message": f"📸 {person['name']} spotted via mobile camera! Confidence: {result['confidence']}%",
                    "confidence": result["confidence"],
                    "frame_url": frame_url,
                    "person_image_url": person.get("image_url", ""),
                    "match_id": match_id,
                    "created_at": datetime.utcnow().isoformat(),
                    "read": False
                }
                alerts_col.insert_one(alert_doc)
                asyncio.create_task(broadcast_alert(alert_doc))
        except Exception as e:
            print(f"Error comparing with {person['name']}: {e}")

    if not results:
        if os.path.exists(frame_path):
            os.remove(frame_path)

    return {"success": True, "matches": results, "scanned_against": len(persons)}


@app.get("/persons")
def get_persons():
    persons = list(persons_col.find({}, {"embeddings": 0}))
    for p in persons:
        p["id"] = p.pop("_id")
        p.setdefault("reward", 0)
        p.setdefault("currency", "INR")
    return {"persons": persons}


@app.get("/matches")
def get_matches():
    matches = list(matches_col.find({}).sort("created_at", -1).limit(50))
    for m in matches:
        m["id"] = m.pop("_id")
    return {"matches": matches}


@app.get("/alerts")
def get_alerts():
    alerts = list(alerts_col.find({}).sort("created_at", -1).limit(100))
    for a in alerts:
        a["id"] = a.pop("_id")
    return {"alerts": alerts, "unread_count": alerts_col.count_documents({"read": False})}


@app.post("/alerts/{alert_id}/read")
def mark_alert_read(alert_id: str):
    alerts_col.update_one({"_id": alert_id}, {"$set": {"read": True}})
    return {"success": True}


@app.delete("/persons/{person_id}")
def delete_person(person_id: str):
    persons_col.delete_one({"_id": person_id})
    return {"success": True}


@app.websocket("/ws/admin")
async def websocket_admin(websocket: WebSocket):
    await websocket.accept()
    admin_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in admin_connections:
            admin_connections.remove(websocket)


# ========================
# CCTV STREAM ROUTES
# ========================

@app.post("/cctv/add")
def add_cctv_stream(name: str = Form(...), rtsp_url: str = Form(...)):
    stream_id = str(uuid.uuid4())
    streams_col.insert_one({
        "_id": stream_id,
        "name": name,
        "rtsp_url": rtsp_url,
        "status": "connecting",
        "error": None,
        "created_at": datetime.utcnow().isoformat()
    })
    stop_flag = {"stop": False}
    thread = threading.Thread(target=scan_rtsp_stream, args=(stream_id, rtsp_url, name, stop_flag), daemon=True)
    active_streams[stream_id] = {"thread": thread, "stop_flag": stop_flag, "name": name}
    thread.start()
    return {"success": True, "stream_id": stream_id, "message": f"CCTV '{name}' connecting..."}


@app.get("/cctv/streams")
def get_cctv_streams():
    streams = list(streams_col.find({}).sort("created_at", -1))
    for s in streams:
        s["id"] = s.pop("_id")
        s["running"] = s["id"] in active_streams
    return {"streams": streams}


@app.post("/cctv/stop/{stream_id}")
def stop_cctv_stream(stream_id: str):
    if stream_id in active_streams:
        active_streams[stream_id]["stop_flag"]["stop"] = True
        del active_streams[stream_id]
    streams_col.update_one({"_id": stream_id}, {"$set": {"status": "stopped"}})
    return {"success": True}


@app.delete("/cctv/delete/{stream_id}")
def delete_cctv_stream(stream_id: str):
    if stream_id in active_streams:
        active_streams[stream_id]["stop_flag"]["stop"] = True
        del active_streams[stream_id]
    streams_col.delete_one({"_id": stream_id})
    return {"success": True}


# ========================
# GROUP PHOTO SCAN
# ========================

@app.post("/scan-group-photo")
async def scan_group_photo(person_id: str = Form(...), group_photo: UploadFile = File(...)):
    person = persons_col.find_one({"_id": person_id})
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    group_id = str(uuid.uuid4())
    group_path = f"uploads/frames/group_{group_id}.jpg"
    with open(group_path, "wb") as f:
        shutil.copyfileobj(group_photo.file, f)

    img = cv2.imread(group_path)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not read image")

    original_img = img.copy()
    h, w = img.shape[:2]

    try:
        face_objs = DeepFace.extract_faces(img_path=group_path, enforce_detection=False, detector_backend="opencv")
    except Exception as e:
        face_objs = []
        print(f"Face detection error: {e}")

    matched_faces = []
    total_faces = len(face_objs)

    for i, face_obj in enumerate(face_objs):
        try:
            region = face_obj.get("facial_area", {})
            fx, fy = region.get("x", 0), region.get("y", 0)
            fw, fh = region.get("w", 50), region.get("h", 50)

            face_crop = original_img[max(0, fy):min(h, fy+fh), max(0, fx):min(w, fx+fw)]
            if face_crop.size == 0:
                continue

            face_path = f"uploads/frames/face_{group_id}_{i}.jpg"
            cv2.imwrite(face_path, face_crop)

            compare_result = compare_faces(person["image_path"], face_path)
            confidence = compare_result["confidence"]
            is_match = compare_result["matched"] or confidence > 55

            if is_match:
                matched_faces.append({"face_index": i, "confidence": confidence, "bbox": {"x": fx, "y": fy, "w": fw, "h": fh}})
                cv2.rectangle(img, (fx, fy), (fx+fw, fy+fh), (0, 200, 0), 3)
                label = f"FOUND {confidence:.0f}%"
                (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(img, (fx, fy-lh-10), (fx+lw+8, fy), (0, 200, 0), -1)
                cv2.putText(img, label, (fx+4, fy-6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            else:
                cv2.rectangle(img, (fx, fy), (fx+fw, fy+fh), (180, 180, 180), 1)

            if os.path.exists(face_path):
                os.remove(face_path)
        except Exception as e:
            print(f"Error processing face {i}: {e}")

    annotated_path = f"uploads/frames/annotated_{group_id}.jpg"
    cv2.imwrite(annotated_path, img)

    with open(annotated_path, "rb") as f:
        annotated_b64 = base64.b64encode(f.read()).decode("utf-8")

    if matched_faces:
        matches_col.insert_one({
            "_id": str(uuid.uuid4()),
            "person_id": person_id,
            "person_name": person["name"],
            "source": "group_photo",
            "confidence": max(m["confidence"] for m in matched_faces),
            "frame_url": f"/uploads/frames/annotated_{group_id}.jpg",
            "person_image_url": person.get("image_url", ""),
            "total_faces_detected": total_faces,
            "matched_faces": len(matched_faces),
            "created_at": datetime.utcnow().isoformat()
        })
        alert_doc = {
            "_id": str(uuid.uuid4()),
            "type": "group_photo_match",
            "person_id": person_id,
            "person_name": person["name"],
            "message": f"🔍 {person['name']} found in group photo! Confidence: {matched_faces[0]['confidence']:.0f}% — {total_faces} faces scanned",
            "confidence": matched_faces[0]["confidence"],
            "frame_url": f"/uploads/frames/annotated_{group_id}.jpg",
            "person_image_url": person.get("image_url", ""),
            "created_at": datetime.utcnow().isoformat(),
            "read": False
        }
        alerts_col.insert_one(alert_doc)
        asyncio.create_task(broadcast_alert(alert_doc))

    if os.path.exists(group_path):
        os.remove(group_path)

    return {
        "success": True,
        "total_faces_detected": total_faces,
        "matches_found": len(matched_faces),
        "matched_faces": matched_faces,
        "person_name": person["name"],
        "annotated_image_b64": annotated_b64,
        "annotated_image_url": f"/uploads/frames/annotated_{group_id}.jpg"
    }


# ========================
# AI IMAGE DETECTOR
# ========================

@app.post("/detect-ai-image")
async def detect_ai_image(image: UploadFile = File(...)):
    """Detect whether an uploaded image is AI-generated or a real photograph."""
    img_id = str(uuid.uuid4())
    img_path = f"uploads/frames/aicheck_{img_id}.jpg"

    with open(img_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    try:
        features = extract_image_features(img_path)
        if not features:
            raise HTTPException(status_code=400, detail="Could not process image")

        result = classify_ai_or_real(features)

        with open(img_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode("utf-8")

        result["image_b64"] = img_b64
        result["filename"] = image.filename

        if os.path.exists(img_path):
            os.remove(img_path)

        return {"success": True, "result": result}
    except Exception as e:
        if os.path.exists(img_path):
            os.remove(img_path)
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# REWARD & TIPS ROUTES
# ========================

@app.post("/persons/{person_id}/set-reward")
def set_reward(person_id: str, amount: int = Form(...), currency: str = Form(default="INR")):
    """Set reward amount for a missing person."""
    persons_col.update_one({"_id": person_id}, {"$set": {"reward": amount, "currency": currency}})
    return {"success": True, "message": f"Reward set to {currency} {amount}"}


@app.get("/public/missing-persons")
def get_public_missing_persons():
    """Public endpoint — returns all active missing persons with reward info."""
    persons = list(persons_col.find({"status": "active"}, {"embeddings": 0}))
    for p in persons:
        p["id"] = p.pop("_id")
        p.setdefault("reward", 0)
        p.setdefault("currency", "INR")
    return {"persons": persons}


@app.post("/public/submit-tip")
async def submit_tip(
    person_id: str = Form(...),
    reporter_name: str = Form(...),
    reporter_email: str = Form(...),
    reporter_phone: str = Form(...),
    sighting_location: str = Form(...),
    description: str = Form(default=""),
    photo: UploadFile = File(default=None)
):
    """Public user submits a tip/sighting for a missing person."""
    person = persons_col.find_one({"_id": person_id})
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    tip_id = str(uuid.uuid4())
    photo_url = None

    if photo and photo.filename:
        ext = photo.filename.split(".")[-1].lower() or "jpg"
        photo_filename = f"tip_{tip_id}.{ext}"
        photo_path = f"uploads/frames/{photo_filename}"
        with open(photo_path, "wb") as f:
            shutil.copyfileobj(photo.file, f)
        photo_url = f"/uploads/frames/{photo_filename}"

    tip_doc = {
        "_id": tip_id,
        "person_id": person_id,
        "person_name": person["name"],
        "reporter_name": reporter_name,
        "reporter_email": reporter_email,
        "reporter_phone": reporter_phone,
        "sighting_location": sighting_location,
        "description": description,
        "photo_url": photo_url,
        "reward": person.get("reward", 0),
        "currency": person.get("currency", "INR"),
        "status": "pending",
        "admin_reply": None,
        "admin_reply_subject": None,
        "admin_replied_at": None,
        "created_at": datetime.utcnow().isoformat()
    }
    tips_col.insert_one(tip_doc)

    alert_doc = {
        "_id": str(uuid.uuid4()),
        "type": "new_tip",
        "person_id": person_id,
        "person_name": person["name"],
        "tip_id": tip_id,
        "message": f"💡 New tip received for {person['name']} from {reporter_name} ({reporter_email})",
        "reporter_name": reporter_name,
        "reporter_email": reporter_email,
        "created_at": datetime.utcnow().isoformat(),
        "read": False
    }
    alerts_col.insert_one(alert_doc)
    asyncio.create_task(broadcast_alert(alert_doc))

    return {
        "success": True,
        "tip_id": tip_id,
        "message": f"Thank you {reporter_name}! Your tip has been submitted. We will contact you at {reporter_email}."
    }


@app.get("/admin/tips")
def get_all_tips():
    """Admin: get all submitted tips."""
    tips = list(tips_col.find({}).sort("created_at", -1))
    for t in tips:
        t["id"] = t.pop("_id")
    return {"tips": tips}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/admin/tips/{tip_id}/status")
def update_tip_status(tip_id: str, status: str = Form(...)):
    """Admin: update tip status — pending/verified/rejected/rewarded."""
    tips_col.update_one({"_id": tip_id}, {"$set": {"status": status}})
    return {"success": True}


@app.post("/admin/tips/{tip_id}/reply")
async def reply_to_tip(
    tip_id: str,
    subject: str = Form(...),
    message: str = Form(...),
    smtp_email: str = Form(default=""),
    smtp_password: str = Form(default=""),
):
    """Admin: reply to a tip reporter via email."""
    tip = tips_col.find_one({"_id": tip_id})
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")

    reporter_email = tip["reporter_email"]
    reporter_name = tip["reporter_name"]

    # Save reply to DB
    tips_col.update_one(
        {"_id": tip_id},
        {"$set": {
            "admin_reply": message,
            "admin_reply_subject": subject,
            "admin_replied_at": datetime.utcnow().isoformat()
        }}
    )

    email_sent = False
    email_error = None

    if smtp_email and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = smtp_email
            msg["To"] = reporter_email

            html_body = f"""
            <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                <div style="background:#1a3a6b;padding:20px;text-align:center;">
                    <h2 style="color:white;margin:0;">National Missing Persons Portal</h2>
                    <p style="color:rgba(255,255,255,0.7);margin:5px 0 0;">Ministry of Home Affairs, Government of India</p>
                </div>
                <div style="padding:30px;background:#fff;border:1px solid #e8eaf0;">
                    <p style="font-size:15px;">Dear <strong>{reporter_name}</strong>,</p>
                    <p style="color:#555;">Thank you for your tip regarding <strong>{tip['person_name']}</strong>.</p>
                    <div style="background:#f4f6f9;border-left:4px solid #1a3a6b;padding:16px;margin:20px 0;font-size:14px;line-height:1.7;">
                        {message.replace(chr(10), '<br>')}
                    </div>
                    <p style="color:#888;font-size:13px;">Your Tip Reference ID: <code style="background:#f4f6f9;padding:2px 6px;border-radius:3px;">{tip_id[:8].upper()}</code></p>
                </div>
                <div style="background:#f4f6f9;padding:16px;text-align:center;font-size:12px;color:#888;">
                    National Missing Persons Portal &nbsp;|&nbsp; Helpline: 112<br>
                    Ministry of Home Affairs, Government of India
                </div>
            </body></html>
            """

            msg.attach(MIMEText(html_body, "html"))
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(smtp_email, smtp_password)
                server.sendmail(smtp_email, reporter_email, msg.as_string())
            email_sent = True
            print(f"Email sent to {reporter_email}")
        except Exception as e:
            email_error = str(e)
            print(f"Email error: {e}")

    return {
        "success": True,
        "email_sent": email_sent,
        "email_error": email_error,
        "message": f"Reply saved. {'Email sent to ' + reporter_email if email_sent else 'Reply saved in database. Add Gmail SMTP credentials to send email.'}"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)