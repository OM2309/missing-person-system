"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { scanFrame, getPersons, API_BASE } from "../../lib/api";

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [status, setStatus] = useState("Camera not started");
  const [scanCount, setScanCount] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const autoScanRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getPersons()
      .then((d) => setPersons(d.persons || []))
      .catch(() => {});
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (autoScanRef.current) clearInterval(autoScanRef.current);
    };
  }, []);

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setStatus("Camera active — Ready to scan");
    } catch (err: any) {
      setStatus("Camera access denied: " + err.message);
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setAutoScan(false);
    if (autoScanRef.current) clearInterval(autoScanRef.current);
    setStatus("Camera stopped");
  }

  const captureAndScan = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || scanning) return;
    setScanning(true);
    setStatus("Scanning frame...");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const frameDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setScanning(false);
          return;
        }
        try {
          const fd = new FormData();
          fd.append("image", blob, "frame.jpg");
          const result = await scanFrame(fd);
          setScanCount((c) => c + 1);
          if (result.matches && result.matches.length > 0) {
            const newMatches = result.matches.map((m: any) => ({
              ...m,
              time: new Date().toLocaleTimeString(),
              localFrameUrl: frameDataUrl,
            }));
            setResults((prev) => [...newMatches, ...prev].slice(0, 20));
            setStatus(
              `🚨 MATCH FOUND: ${result.matches.map((m: any) => m.person_name).join(", ")}`,
            );
          } else {
            setStatus(
              `No match — Scanned ${result.scanned_against || 0} person(s) (${new Date().toLocaleTimeString()})`,
            );
          }
        } catch (err: any) {
          setStatus("Scan error: " + err.message);
        }
        setScanning(false);
      },
      "image/jpeg",
      0.85,
    );
  }, [scanning]);

  function toggleAutoScan() {
    if (autoScan) {
      setAutoScan(false);
      if (autoScanRef.current) clearInterval(autoScanRef.current);
      setStatus("Auto scan stopped");
    } else {
      setAutoScan(true);
      setStatus("Auto scan active — every 5 seconds");
      autoScanRef.current = setInterval(captureAndScan, 5000);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f9",
        fontFamily: "'Inter', 'Roboto', sans-serif",
        color: "#1a1a2e",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f6f9 !important; }
        .gov-topbar { background: #1a3a6b; color: #fff; padding: 6px 24px; font-size: 12px; display: flex; justify-content: space-between; }
        .gov-header { background: #fff; border-bottom: 3px solid #f47920; box-shadow: 0 1px 4px rgba(0,0,0,0.08); padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
        .saffron-bar { height: 4px; background: linear-gradient(90deg, #ff9933, #f47920); }
        .nav-btn { background: transparent; color: #1a3a6b; border: 1.5px solid #1a3a6b; padding: 8px 16px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none; transition: all 0.15s; }
        .nav-btn:hover { background: #f0f4ff; }
        .btn-primary { background: #1a3a6b; color: #fff; border: none; padding: 11px 20px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .btn-primary:hover { background: #0f2a55; }
        .btn-primary:disabled { background: #9ca3af; cursor: not-allowed; }
        .btn-danger { background: #dc2626; color: #fff; border: none; padding: 11px 20px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-success { background: #16a34a; color: #fff; border: none; padding: 11px 20px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-outline { background: transparent; color: #1a3a6b; border: 1.5px solid #1a3a6b; padding: 10px 20px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; width: 100%; }
        .btn-outline:hover { background: #f0f4ff; }
        .panel { background: #fff; border: 1px solid #e8eaf0; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .match-result { border: 2px solid #dc2626; background: #fef2f2; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
        .match-result-name { font-size: 14px; font-weight: 600; color: #1a1a2e; }
        .match-conf { font-size: 20px; font-weight: 700; color: #16a34a; }
        .frame-label { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
        .gov-footer { background: #1a3a6b; color: rgba(255,255,255,0.7); text-align: center; padding: 16px; font-size: 12px; margin-top: auto; }
      `}</style>

      {/* Top Bar */}
      <div className="gov-topbar">
        <span>🇮🇳 Government of India — Missing Persons Portal</span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: autoScan ? "#22c55e" : "#9ca3af",
              display: "inline-block",
            }}
          />
          {autoScan ? "Auto-scanning active" : "Scanner idle"} — {scanCount}{" "}
          scans performed
        </span>
      </div>

      {/* Header */}
      <div className="gov-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              background: "#1a3a6b",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
            }}
          >
            📱
          </div>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a6b" }}>
              Live Camera Scanner
            </h1>
            <p style={{ fontSize: "11px", color: "#666" }}>
              Real-time facial recognition — {persons.length} person(s) in
              database
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/admin" className="nav-btn">
            ⚡ Admin
          </Link>
          <Link href="/" className="nav-btn">
            ← Portal
          </Link>
        </div>
      </div>
      <div className="saffron-bar" />

      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "24px",
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* Camera Panel */}
        <div className="panel" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #f0f2f7",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ fontSize: "14px", fontWeight: 600 }}>Camera Feed</h2>
            {stream && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#166534",
                  background: "#dcfce7",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontWeight: 600,
                }}
              >
                ● Live
              </span>
            )}
          </div>

          {/* Video */}
          <div
            style={{
              position: "relative",
              background: "#000",
              aspectRatio: "16/9",
            }}
          >
            <video
              ref={videoRef}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              muted
              playsInline
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {!stream && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📷</div>
                <p style={{ fontSize: "14px", fontWeight: 500 }}>
                  Camera not started
                </p>
                <p style={{ fontSize: "12px", opacity: 0.6, marginTop: "4px" }}>
                  Click "Start Camera" below
                </p>
              </div>
            )}
            {scanning && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  border: "3px solid #f47920",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "#f47920",
                    animation: "scanLine 1s ease-in-out infinite",
                  }}
                />
              </div>
            )}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "rgba(0,0,0,0.65)",
                padding: "8px 14px",
              }}
            >
              <p style={{ fontSize: "12px", color: "#fff" }}>{status}</p>
            </div>
          </div>

          {/* Controls */}
          <div style={{ padding: "16px 20px" }}>
            {!stream ? (
              <button
                onClick={startCamera}
                className="btn-primary"
                style={{ width: "100%" }}
              >
                📷 Start Camera
              </button>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "10px",
                }}
              >
                <button
                  onClick={captureAndScan}
                  disabled={scanning}
                  className="btn-primary"
                >
                  {scanning ? "Scanning..." : "📸 Scan Now"}
                </button>
                <button
                  onClick={toggleAutoScan}
                  className={autoScan ? "btn-danger" : "btn-success"}
                >
                  {autoScan ? "⏹ Stop Auto" : "▶ Auto Scan"}
                </button>
                <button
                  onClick={stopCamera}
                  style={{
                    background: "#6b7280",
                    color: "#fff",
                    border: "none",
                    padding: "11px",
                    borderRadius: "4px",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🛑 Stop
                </button>
              </div>
            )}
            {stream && (
              <button
                onClick={() => {
                  stopCamera();
                  setFacingMode((f) => (f === "user" ? "environment" : "user"));
                  setTimeout(startCamera, 300);
                }}
                className="btn-outline"
                style={{ marginTop: "10px" }}
              >
                🔄 Switch Camera (
                {facingMode === "environment" ? "Back → Front" : "Front → Back"}
                )
              </button>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Persons in DB */}
          <div className="panel">
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #f0f2f7",
              }}
            >
              <h3 style={{ fontSize: "13px", fontWeight: 600 }}>
                Scanning Against
              </h3>
              <p
                style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}
              >
                {persons.length} registered person(s)
              </p>
            </div>
            <div style={{ padding: "12px 16px" }}>
              {persons.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                  No persons registered
                </p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {persons.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#f8f9ff",
                        border: "1px solid #e8eaf0",
                        borderRadius: "4px",
                        padding: "4px 8px",
                      }}
                    >
                      <img
                        src={`${API_BASE}${p.image_url}`}
                        alt={p.name}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <span style={{ fontSize: "11px", fontWeight: 500 }}>
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Match Results */}
          <div className="panel">
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #f0f2f7",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ fontSize: "13px", fontWeight: 600 }}>
                Match Results
              </h3>
              {results.length > 0 && (
                <span
                  style={{
                    background: "#fee2e2",
                    color: "#991b1b",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "20px",
                  }}
                >
                  {results.length} found
                </span>
              )}
            </div>
            <div
              style={{
                padding: "12px 16px",
                maxHeight: "420px",
                overflowY: "auto",
              }}
            >
              {results.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                    🔍
                  </div>
                  <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                    No matches yet
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#c4c9d4",
                      marginTop: "4px",
                    }}
                  >
                    Start scanning to detect persons
                  </p>
                </div>
              ) : (
                results.map((r, i) => (
                  <div key={i} className="match-result">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "10px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "10px",
                            background: "#fee2e2",
                            color: "#991b1b",
                            padding: "2px 8px",
                            borderRadius: "20px",
                            fontWeight: 700,
                            display: "inline-block",
                            marginBottom: "5px",
                          }}
                        >
                          🚨 MATCH
                        </div>
                        <div className="match-result-name">{r.person_name}</div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#6b7280",
                            marginTop: "2px",
                          }}
                        >
                          {r.time}
                        </div>
                      </div>
                      <div className="match-conf">{r.confidence}%</div>
                    </div>
                    {r.localFrameUrl && r.person_image_url && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px",
                        }}
                      >
                        <div>
                          <div className="frame-label">Registered</div>
                          <img
                            src={`${API_BASE}${r.person_image_url}`}
                            alt="registered"
                            style={{
                              width: "100%",
                              height: "70px",
                              objectFit: "cover",
                              borderRadius: "3px",
                              border: "1px solid #d1d5db",
                            }}
                          />
                        </div>
                        <div>
                          <div className="frame-label">Captured</div>
                          <img
                            src={r.localFrameUrl}
                            alt="captured"
                            style={{
                              width: "100%",
                              height: "70px",
                              objectFit: "cover",
                              borderRadius: "3px",
                              border: "2px solid #1a3a6b",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="gov-footer">
        <p>
          National Missing Persons Identification Portal — Government of India
        </p>
      </footer>
    </div>
  );
}
