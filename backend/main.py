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

# WebSocket connections for admin panel
admin_connections: List[WebSocket] = []


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
            model_name="VGG-Face",
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
    frame_interval = max(1, int(fps * 2))  # Check every 2 seconds
    frame_count = 0
    matches_found = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % frame_interval == 0:
            timestamp_sec = frame_count / fps
            timestamp_str = f"{int(timestamp_sec // 60)}m {int(timestamp_sec % 60)}s"

            # Save frame temporarily
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

    # Save all matches to DB
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

        # Broadcast to admin via websocket
        asyncio.run(broadcast_alert(alert_doc))

    return matches_found


# ========================
# ROUTES
# ========================

@app.get("/")
def root():
    return {"status": "Missing Person API Running", "endpoints": ["/upload-person", "/scan-video", "/scan-frame", "/persons", "/matches", "/alerts"]}


@app.post("/upload-person")
async def upload_person(
    name: str = Form(...),
    age: str = Form(default="Unknown"),
    description: str = Form(default=""),
    image: UploadFile = File(...)
):
    """Upload missing person image."""
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
        "created_at": datetime.utcnow().isoformat()
    }
    persons_col.insert_one(doc)

    return {"success": True, "person_id": person_id, "message": f"Person '{name}' registered successfully"}


@app.post("/scan-video")
async def scan_video(
    person_id: str = Form(...),
    video: UploadFile = File(...)
):
    """Upload video and scan for the person."""
    person = persons_col.find_one({"_id": person_id})
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    video_id = str(uuid.uuid4())
    ext = video.filename.split(".")[-1].lower()
    video_path = f"uploads/videos/{video_id}.{ext}"

    with open(video_path, "wb") as f:
        shutil.copyfileobj(video.file, f)

    # Run analysis in background thread
    thread = threading.Thread(
        target=analyze_video_for_person,
        args=(video_path, person["image_path"], person_id, person["name"])
    )
    thread.daemon = True
    thread.start()

    return {
        "success": True,
        "video_id": video_id,
        "message": f"Video uploaded. Scanning for {person['name']}... Check alerts for results."
    }


@app.post("/scan-frame")
async def scan_frame(image: UploadFile = File(...)):
    """Scan a single frame (from mobile camera) against all active persons."""
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
                match_doc = {
                    "_id": match_id,
                    "person_id": person["_id"],
                    "person_name": person["name"],
                    "source": "mobile_camera",
                    "confidence": result["confidence"],
                    "frame_path": frame_path,
                    "frame_url": frame_url,
                    "person_image_url": person.get("image_url", ""),
                    "created_at": datetime.utcnow().isoformat()
                }
                matches_col.insert_one(match_doc)

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
        # Clean up frame if no match
        if os.path.exists(frame_path):
            os.remove(frame_path)

    return {"success": True, "matches": results, "scanned_against": len(persons)}


@app.get("/persons")
def get_persons():
    persons = list(persons_col.find({}, {"embeddings": 0}))
    for p in persons:
        p["id"] = p.pop("_id")
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


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# ========================
# CCTV STREAM ROUTES
# ========================

active_streams = {}
streams_col = db["cctv_streams"]


def scan_rtsp_stream(stream_id: str, rtsp_url: str, stream_name: str, stop_flag: dict):
    """Continuously scan RTSP stream for missing persons."""
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

            time.sleep(30)  # scan every 30 seconds

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


@app.post("/cctv/add")
def add_cctv_stream(name: str = Form(...), rtsp_url: str = Form(...)):
    stream_id = str(uuid.uuid4())
    doc = {
        "_id": stream_id,
        "name": name,
        "rtsp_url": rtsp_url,
        "status": "connecting",
        "error": None,
        "created_at": datetime.utcnow().isoformat()
    }
    streams_col.insert_one(doc)

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
# GROUP PHOTO SCAN ROUTE
# ========================

@app.post("/scan-group-photo")
async def scan_group_photo(
    person_id: str = Form(...),
    group_photo: UploadFile = File(...)
):
    """
    Scan a group/crowd photo for a registered missing person.
    Detects all faces in the group photo, compares each with the target person,
    draws bounding boxes on matches, returns annotated image as base64.
    """
    person = persons_col.find_one({"_id": person_id})
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Save group photo
    group_id = str(uuid.uuid4())
    group_path = f"uploads/frames/group_{group_id}.jpg"
    with open(group_path, "wb") as f:
        shutil.copyfileobj(group_photo.file, f)

    # Read image with OpenCV
    img = cv2.imread(group_path)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not read image")

    original_img = img.copy()
    h, w = img.shape[:2]

    # Detect ALL faces in group photo using DeepFace
    try:
        face_objs = DeepFace.extract_faces(
            img_path=group_path,
            enforce_detection=False,
            detector_backend="opencv"
        )
    except Exception as e:
        face_objs = []
        print(f"Face detection error: {e}")

    results = []
    matched_faces = []
    total_faces = len(face_objs)

    for i, face_obj in enumerate(face_objs):
        try:
            # Get face region
            region = face_obj.get("facial_area", {})
            fx = region.get("x", 0)
            fy = region.get("y", 0)
            fw = region.get("w", 50)
            fh = region.get("h", 50)

            # Crop the face
            face_crop = original_img[max(0,fy):min(h,fy+fh), max(0,fx):min(w,fx+fw)]
            if face_crop.size == 0:
                continue

            # Save face crop temporarily
            face_path = f"uploads/frames/face_{group_id}_{i}.jpg"
            cv2.imwrite(face_path, face_crop)

            # Compare with target person
            compare_result = compare_faces(person["image_path"], face_path)
            confidence = compare_result["confidence"]
            is_match = compare_result["matched"] or confidence > 55

            if is_match:
                matched_faces.append({
                    "face_index": i,
                    "confidence": confidence,
                    "bbox": {"x": fx, "y": fy, "w": fw, "h": fh}
                })

                # Draw GREEN thick box on match
                cv2.rectangle(img, (fx, fy), (fx+fw, fy+fh), (0, 200, 0), 3)
                # Label background
                label = f"FOUND {confidence:.0f}%"
                (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(img, (fx, fy-lh-10), (fx+lw+8, fy), (0, 200, 0), -1)
                cv2.putText(img, label, (fx+4, fy-6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)
            else:
                # Draw grey box on non-matching faces
                cv2.rectangle(img, (fx, fy), (fx+fw, fy+fh), (180, 180, 180), 1)

            # Clean up temp face crop
            if os.path.exists(face_path):
                os.remove(face_path)

        except Exception as e:
            print(f"Error processing face {i}: {e}")
            continue

    # Save annotated image
    annotated_path = f"uploads/frames/annotated_{group_id}.jpg"
    cv2.imwrite(annotated_path, img)

    # Convert annotated image to base64 for immediate display
    with open(annotated_path, "rb") as f:
        annotated_b64 = base64.b64encode(f.read()).decode("utf-8")

    # Save to DB if match found
    if matched_faces:
        match_doc = {
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
        }
        matches_col.insert_one(match_doc)

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

    # Clean original group photo
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