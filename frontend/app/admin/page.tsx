"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  getAlerts,
  getMatches,
  getPersons,
  markAlertRead,
  API_BASE,
} from "../../lib/api";

export default function AdminPanel() {
  const [tab, setTab] = useState<"alerts" | "matches" | "persons">("alerts");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [liveAlert, setLiveAlert] = useState<any | null>(null);

  useEffect(() => {
    loadAll();
    connectWs();
    const interval = setInterval(loadAll, 10000);
    return () => {
      clearInterval(interval);
      wsRef.current?.close();
    };
  }, []);

  function connectWs() {
    const wsUrl =
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(
        "http",
        "ws",
      ) + "/ws/admin";
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setWsStatus("connected");
      ws.onclose = () => {
        setWsStatus("disconnected");
        setTimeout(connectWs, 3000);
      };
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        setLiveAlert(data);
        setTimeout(() => setLiveAlert(null), 8000);
        loadAll();
      };
    } catch {
      setWsStatus("disconnected");
    }
  }

  async function loadAll() {
    try {
      const [ad, md, pd] = await Promise.all([
        getAlerts(),
        getMatches(),
        getPersons(),
      ]);
      setAlerts(ad.alerts || []);
      setUnread(ad.unread_count || 0);
      setMatches(md.matches || []);
      setPersons(pd.persons || []);
    } catch {}
  }

  async function handleMarkRead(id: string) {
    await markAlertRead(id);
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a)),
    );
    setUnread((prev) => Math.max(0, prev - 1));
  }

  const sourceLabel = (s: string) =>
    s === "video" ? "Video Scan" : s === "cctv" ? "CCTV Live" : "Mobile Camera";
  const sourceBg = (s: string) =>
    s === "video" ? "#ede9fe" : s === "cctv" ? "#fee2e2" : "#dcfce7";
  const sourceColor = (s: string) =>
    s === "video" ? "#5b21b6" : s === "cctv" ? "#991b1b" : "#166534";

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
        .gov-topbar { background: #1a3a6b; color: #fff; padding: 6px 0; font-size: 12px; }
        .gov-topbar-inner { max-width: 1300px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; }
        .gov-header { background: #fff; border-bottom: 3px solid #f47920; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .gov-header-inner { max-width: 1300px; margin: 0 auto; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
        .saffron-bar { height: 4px; background: linear-gradient(90deg, #ff9933, #f47920); }
        .nav-btn { background: transparent; color: #1a3a6b; border: 1.5px solid #1a3a6b; padding: 8px 16px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s; }
        .nav-btn:hover { background: #f0f4ff; }
        .live-toast { position: fixed; top: 20px; right: 20px; z-index: 999; background: #dc2626; color: #fff; padding: 16px 20px; max-width: 380px; border-radius: 6px; box-shadow: 0 8px 24px rgba(220,38,38,0.3); animation: toastIn 0.3s ease; }
        @keyframes toastIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .main-inner { max-width: 1300px; margin: 0 auto; padding: 28px 24px; }
        .stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .stat-card { background: #fff; border: 1px solid #e8eaf0; border-radius: 6px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .stat-card-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-card-num { font-size: 28px; font-weight: 700; color: #1a1a2e; margin-top: 4px; line-height: 1; }
        .stat-card-sub { font-size: 11px; color: #9ca3af; margin-top: 4px; }
        .stat-card.accent { border-left: 4px solid #f47920; }
        .tab-bar { display: flex; border-bottom: 2px solid #e8eaf0; margin-bottom: 24px; }
        .tab-btn { padding: 12px 24px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; color: #666; transition: all 0.15s; }
        .tab-btn.active { color: #1a3a6b; border-bottom-color: #f47920; font-weight: 600; }
        .tab-btn:not(.active):hover { color: #1a3a6b; background: #f8f9ff; }
        .panel { background: #fff; border: 1px solid #e8eaf0; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; }
        .alert-row { padding: 16px 20px; border-bottom: 1px solid #f0f2f7; transition: background 0.1s; display: flex; gap: 16px; align-items: flex-start; }
        .alert-row:hover { background: #fafbff; }
        .alert-row:last-child { border-bottom: none; }
        .alert-unread { border-left: 3px solid #1a3a6b; }
        .alert-read { opacity: 0.55; }
        .source-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
        .conf-num { font-size: 24px; font-weight: 700; line-height: 1; }
        .conf-high { color: #166534; }
        .conf-med { color: #92400e; }
        .btn-read { background: transparent; border: 1px solid #d1d5db; padding: 5px 12px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 500; color: #6b7280; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
        .btn-read:hover { border-color: #1a3a6b; color: #1a3a6b; }
        .match-card { border-bottom: 1px solid #f0f2f7; padding: 20px; }
        .match-card:last-child { border-bottom: none; }
        .match-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .match-name { font-size: 15px; font-weight: 600; color: #1a1a2e; }
        .match-time { font-size: 12px; color: #9ca3af; }
        .frame-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 480px; }
        .frame-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .frame-img { width: 100%; height: 140px; object-fit: cover; border-radius: 4px; display: block; }
        .frame-img.registered { border: 2px solid #d1d5db; }
        .frame-img.captured { border: 2px solid #1a3a6b; }
        .video-frames { display: flex; gap: 12px; flex-wrap: wrap; }
        .video-frame-item { width: 120px; }
        .video-frame-img { width: 120px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #e8eaf0; display: block; }
        .video-frame-ts { font-size: 11px; color: #1a3a6b; font-weight: 600; margin-top: 4px; }
        .video-frame-conf { font-size: 11px; color: #166534; font-weight: 700; }
        .empty-state { text-align: center; padding: 60px; }
        .empty-icon { font-size: 48px; margin-bottom: 12px; }
        .empty-title { font-size: 15px; font-weight: 600; color: #374151; }
        .empty-text { font-size: 13px; color: #9ca3af; margin-top: 4px; }
        .person-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .person-card { border: 1px solid #e8eaf0; border-radius: 6px; overflow: hidden; background: #fff; }
        .person-card-img { width: 100%; height: 180px; object-fit: cover; display: block; }
        .person-card-body { padding: 12px 14px; }
        .person-card-name { font-size: 13px; font-weight: 600; }
        .person-card-meta { font-size: 12px; color: #6b7280; margin-top: 3px; }
        .ws-indicator { display: inline-flex; align-items: center; gap: 6px; }
        .ws-dot { width: 8px; height: 8px; border-radius: 50%; }
        .ws-on { background: #22c55e; }
        .ws-off { background: #f87171; }
        .gov-footer { background: #1a3a6b; color: rgba(255,255,255,0.7); text-align: center; padding: 20px; font-size: 12px; margin-top: 60px; }
      `}</style>

      {/* Live Alert Toast */}
      {liveAlert && (
        <div className="live-toast">
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.1em",
              marginBottom: "6px",
              opacity: 0.8,
              fontWeight: 600,
            }}
          >
            🚨 LIVE MATCH DETECTED
          </div>
          <p style={{ fontSize: "13px", lineHeight: 1.5 }}>
            {liveAlert.message}
          </p>
          {liveAlert.confidence && (
            <div
              style={{ fontSize: "28px", fontWeight: 700, marginTop: "8px" }}
            >
              {liveAlert.confidence}% Match
            </div>
          )}
        </div>
      )}

      {/* Top Bar */}
      <div className="gov-topbar">
        <div className="gov-topbar-inner">
          <span>
            🇮🇳 Government of India &nbsp;|&nbsp; Ministry of Home Affairs
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="ws-indicator">
              <span
                className={`ws-dot ${wsStatus === "connected" ? "ws-on" : "ws-off"}`}
              />
              Live Feed:{" "}
              {wsStatus === "connected" ? "Connected" : "Reconnecting..."}
            </span>
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="gov-header">
        <div className="gov-header-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  background: "#1a3a6b",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                🔍
              </div>
            </Link>
            <div>
              <h1
                style={{ fontSize: "18px", fontWeight: 700, color: "#1a3a6b" }}
              >
                Admin Control Panel
              </h1>
              <p style={{ fontSize: "11px", color: "#666" }}>
                National Missing Persons Identification Portal
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Link href="/" className="nav-btn">
              ← Main Portal
            </Link>
            <Link href="/camera" className="nav-btn">
              📱 Camera
            </Link>
          </div>
        </div>
        <div className="saffron-bar" />
      </header>

      <main className="main-inner">
        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-card accent">
            <div className="stat-card-label">Active Cases</div>
            <div className="stat-card-num">{persons.length}</div>
            <div className="stat-card-sub">Registered persons</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Total Matches</div>
            <div className="stat-card-num" style={{ color: "#166534" }}>
              {matches.length}
            </div>
            <div className="stat-card-sub">Faces identified</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Unread Alerts</div>
            <div
              className="stat-card-num"
              style={{ color: unread > 0 ? "#dc2626" : "#9ca3af" }}
            >
              {unread}
            </div>
            <div className="stat-card-sub">Pending review</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">System Status</div>
            <div
              className="stat-card-num"
              style={{
                fontSize: "16px",
                marginTop: "8px",
                color: wsStatus === "connected" ? "#166534" : "#dc2626",
              }}
            >
              {wsStatus === "connected" ? "● Operational" : "● Reconnecting"}
            </div>
            <div className="stat-card-sub">Live WebSocket</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          <button
            onClick={() => setTab("alerts")}
            className={`tab-btn ${tab === "alerts" ? "active" : ""}`}
          >
            🔔 Alerts{" "}
            {unread > 0 && (
              <span
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: "10px",
                  padding: "2px 7px",
                  borderRadius: "20px",
                  marginLeft: "6px",
                  fontWeight: 700,
                }}
              >
                {unread}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("matches")}
            className={`tab-btn ${tab === "matches" ? "active" : ""}`}
          >
            🎯 Match Records ({matches.length})
          </button>
          <button
            onClick={() => setTab("persons")}
            className={`tab-btn ${tab === "persons" ? "active" : ""}`}
          >
            👥 Case Files ({persons.length})
          </button>
        </div>

        {/* ALERTS */}
        {tab === "alerts" && (
          <div className="panel">
            {alerts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔕</div>
                <div className="empty-title">No Alerts</div>
                <p className="empty-text">
                  Alerts will appear here when a match is detected in a video or
                  camera scan
                </p>
              </div>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className={`alert-row ${a.read ? "alert-read" : "alert-unread"}`}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      {!a.read && (
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#dc2626",
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span
                        className="source-badge"
                        style={{
                          background: sourceBg(a.type?.replace("_match", "")),
                          color: sourceColor(a.type?.replace("_match", "")),
                        }}
                      >
                        {a.type === "video_match"
                          ? "▶ Video"
                          : a.type === "cctv_match"
                            ? "◉ CCTV"
                            : "◎ Camera"}
                      </span>
                      <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: a.read ? 400 : 500,
                        color: "#1a1a2e",
                        lineHeight: 1.5,
                      }}
                    >
                      {a.message}
                    </p>
                    {a.timestamp && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "4px",
                        }}
                      >
                        📍 Timestamp in video: <strong>{a.timestamp}</strong>
                      </p>
                    )}
                    {a.stream_name && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "4px",
                        }}
                      >
                        📹 Stream: {a.stream_name}
                      </p>
                    )}

                    {!a.read && (a.frame_url || a.person_image_url) && (
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          marginTop: "12px",
                        }}
                      >
                        {a.person_image_url && (
                          <div>
                            <div className="frame-label">Registered</div>
                            <img
                              src={`${API_BASE}${a.person_image_url}`}
                              alt="registered"
                              style={{
                                width: "72px",
                                height: "72px",
                                objectFit: "cover",
                                borderRadius: "4px",
                                border: "1px solid #d1d5db",
                              }}
                            />
                          </div>
                        )}
                        {a.frame_url && (
                          <div>
                            <div className="frame-label">Captured</div>
                            <img
                              src={`${API_BASE}${a.frame_url}`}
                              alt="captured"
                              style={{
                                width: "72px",
                                height: "72px",
                                objectFit: "cover",
                                borderRadius: "4px",
                                border: "2px solid #1a3a6b",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "10px",
                      flexShrink: 0,
                    }}
                  >
                    {a.confidence && (
                      <div
                        className={`conf-num ${a.confidence > 75 ? "conf-high" : "conf-med"}`}
                      >
                        {a.confidence}%
                      </div>
                    )}
                    {!a.read && (
                      <button
                        onClick={() => handleMarkRead(a.id)}
                        className="btn-read"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* MATCHES */}
        {tab === "matches" && (
          <div className="panel">
            {matches.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <div className="empty-title">No Matches Yet</div>
                <p className="empty-text">
                  Matches will appear here after video or camera scans
                </p>
              </div>
            ) : (
              matches.map((m) => (
                <div key={m.id} className="match-card">
                  <div className="match-header">
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "6px",
                        }}
                      >
                        <span
                          className="source-badge"
                          style={{
                            background: sourceBg(m.source),
                            color: sourceColor(m.source),
                          }}
                        >
                          {sourceLabel(m.source)}
                        </span>
                        {m.stream_name && (
                          <span style={{ fontSize: "12px", color: "#6b7280" }}>
                            {m.stream_name}
                          </span>
                        )}
                      </div>
                      <div className="match-name">{m.person_name}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        className={`conf-num ${(m.best_confidence || m.confidence) > 75 ? "conf-high" : "conf-med"}`}
                      >
                        {m.best_confidence || m.confidence}%
                      </div>
                      <div className="match-time">
                        {new Date(m.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {(m.source === "mobile_camera" || m.source === "cctv") && (
                    <div className="frame-compare">
                      <div>
                        <div className="frame-label">Registered Photo</div>
                        {m.person_image_url && (
                          <img
                            src={`${API_BASE}${m.person_image_url}`}
                            alt="registered"
                            className="frame-img registered"
                          />
                        )}
                      </div>
                      <div>
                        <div className="frame-label">Captured Frame</div>
                        {m.frame_url && (
                          <img
                            src={`${API_BASE}${m.frame_url}`}
                            alt="captured"
                            className="frame-img captured"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {m.source === "video" && m.matches && (
                    <div>
                      <div
                        className="frame-label"
                        style={{ marginBottom: "10px" }}
                      >
                        Matched Frames
                      </div>
                      <div className="video-frames">
                        {m.matches.slice(0, 5).map((f: any, i: number) => (
                          <div key={i} className="video-frame-item">
                            {f.frame_path && (
                              <img
                                src={`${API_BASE}/${f.frame_path}`}
                                alt={`t=${f.timestamp}`}
                                className="video-frame-img"
                              />
                            )}
                            <div className="video-frame-ts">
                              ⏱ {f.timestamp}
                            </div>
                            <div className="video-frame-conf">
                              {f.confidence}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* PERSONS */}
        {tab === "persons" && (
          <div>
            {persons.length === 0 ? (
              <div className="panel">
                <div className="empty-state">
                  <div className="empty-icon">👤</div>
                  <div className="empty-title">No Cases Registered</div>
                  <p className="empty-text">
                    Go to the main portal to register missing persons
                  </p>
                </div>
              </div>
            ) : (
              <div className="person-grid">
                {persons.map((p) => (
                  <div key={p.id} className="person-card">
                    <img
                      src={`${API_BASE}${p.image_url}`}
                      alt={p.name}
                      className="person-card-img"
                    />
                    <div className="person-card-body">
                      <div className="person-card-name">{p.name}</div>
                      <div className="person-card-meta">
                        Age: {p.age || "Not specified"}
                      </div>
                      <div
                        style={{
                          marginTop: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#166534",
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "20px",
                          }}
                        >
                          ● Active
                        </span>
                        <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="gov-footer">
        <p>
          National Missing Persons Identification Portal &nbsp;|&nbsp; Ministry
          of Home Affairs, Government of India
        </p>
      </footer>
    </div>
  );
}
