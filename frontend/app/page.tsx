"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  uploadPerson,
  scanVideo,
  getPersons,
  deletePerson,
  API_BASE,
} from "../lib/api";

export default function Home() {
  const [tab, setTab] = useState<"upload" | "scan" | "persons">("upload");
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [personName, setPersonName] = useState("");
  const [personAge, setPersonAge] = useState("");
  const [personDesc, setPersonDesc] = useState("");
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    loadPersons();
  }, []);

  async function loadPersons() {
    try {
      const data = await getPersons();
      setPersons(data.persons || []);
    } catch {}
  }

  function showMsg(text: string, type: "success" | "error" | "info" = "info") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 6000);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPersonImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleUploadPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!personName || !personImage) {
      showMsg("Name and photo are required", "error");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", personName);
      fd.append("age", personAge);
      fd.append("description", personDesc);
      fd.append("image", personImage);
      const result = await uploadPerson(fd);
      showMsg(result.message, "success");
      setPersonName("");
      setPersonAge("");
      setPersonDesc("");
      setPersonImage(null);
      setImagePreview(null);
      await loadPersons();
    } catch (err: any) {
      showMsg(err.response?.data?.detail || "Upload failed", "error");
    }
    setLoading(false);
  }

  async function handleScanVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPersonId || !videoFile) {
      showMsg("Please select a person and upload a video", "error");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("person_id", selectedPersonId);
      fd.append("video", videoFile);
      const result = await scanVideo(fd);
      showMsg(result.message, "info");
      setVideoFile(null);
    } catch (err: any) {
      showMsg(err.response?.data?.detail || "Scan failed", "error");
    }
    setLoading(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove case for ${name}?`)) return;
    await deletePerson(id);
    await loadPersons();
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

        /* GOV TOP BAR */
        .gov-topbar { background: #1a3a6b; color: #fff; padding: 6px 0; font-size: 12px; }
        .gov-topbar-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; }

        /* HEADER */
        .gov-header { background: #fff; border-bottom: 3px solid #f47920; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .gov-header-inner { max-width: 1200px; margin: 0 auto; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .gov-logo-block { display: flex; align-items: center; gap: 16px; }
        .gov-emblem { width: 60px; height: 60px; background: #1a3a6b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; }
        .gov-title-block h1 { font-size: 20px; font-weight: 700; color: #1a3a6b; line-height: 1.2; }
        .gov-title-block p { font-size: 11px; color: #666; font-weight: 400; margin-top: 2px; letter-spacing: 0.3px; }
        .gov-nav { display: flex; gap: 8px; }
        .gov-nav-btn { background: #1a3a6b; color: #fff; border: none; padding: 9px 18px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: background 0.15s; }
        .gov-nav-btn:hover { background: #0f2a55; }
        .gov-nav-btn.outline { background: transparent; color: #1a3a6b; border: 1.5px solid #1a3a6b; }
        .gov-nav-btn.outline:hover { background: #f0f4ff; }

        /* HERO STRIP */
        .hero-strip { background: linear-gradient(135deg, #1a3a6b 0%, #0f2a55 100%); color: #fff; padding: 32px 24px; }
        .hero-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 32px; }
        .hero-text h2 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .hero-text p { font-size: 14px; color: rgba(255,255,255,0.75); max-width: 480px; line-height: 1.6; }
        .hero-stats { display: flex; gap: 32px; flex-shrink: 0; }
        .hero-stat { text-align: center; }
        .hero-stat-num { font-size: 32px; font-weight: 700; color: #f47920; line-height: 1; }
        .hero-stat-label { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

        /* BREADCRUMB */
        .breadcrumb { background: #fff; border-bottom: 1px solid #e8eaf0; }
        .breadcrumb-inner { max-width: 1200px; margin: 0 auto; padding: 10px 24px; font-size: 12px; color: #666; display: flex; align-items: center; gap: 6px; }
        .breadcrumb span { color: #1a3a6b; font-weight: 500; }

        /* MAIN CONTENT */
        .main-inner { max-width: 1200px; margin: 0 auto; padding: 28px 24px; }

        /* ALERT MESSAGE */
        .alert-msg { padding: 12px 16px; border-radius: 4px; font-size: 13px; font-weight: 500; margin-bottom: 20px; border-left: 4px solid; }
        .alert-success { background: #f0fdf4; border-color: #22c55e; color: #15803d; }
        .alert-error { background: #fef2f2; border-color: #ef4444; color: #dc2626; }
        .alert-info { background: #eff6ff; border-color: #3b82f6; color: #1d4ed8; }

        /* TABS */
        .tab-bar { display: flex; border-bottom: 2px solid #e8eaf0; margin-bottom: 28px; gap: 0; }
        .tab-btn { padding: 12px 24px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; color: #666; transition: all 0.15s; }
        .tab-btn.active { color: #1a3a6b; border-bottom-color: #f47920; font-weight: 600; }
        .tab-btn:not(.active):hover { color: #1a3a6b; background: #f8f9ff; }

        /* FORM CARD */
        .form-card { background: #fff; border-radius: 6px; border: 1px solid #e8eaf0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .form-card-header { padding: 16px 24px; border-bottom: 1px solid #f0f2f7; display: flex; align-items: center; gap: 10px; }
        .form-card-header-icon { width: 32px; height: 32px; background: #eef2ff; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .form-card-header h3 { font-size: 15px; font-weight: 600; color: #1a1a2e; }
        .form-card-header p { font-size: 12px; color: #888; margin-top: 1px; }
        .form-card-body { padding: 24px; }

        /* FORM ELEMENTS */
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .form-input { width: 100%; padding: 10px 14px; border: 1.5px solid #d1d5db; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 14px; color: #1a1a2e; background: #fff; outline: none; transition: border-color 0.15s; }
        .form-input:focus { border-color: #1a3a6b; box-shadow: 0 0 0 3px rgba(26,58,107,0.08); }
        .form-input::placeholder { color: #9ca3af; }
        textarea.form-input { resize: vertical; min-height: 90px; }

        /* SUBMIT BUTTON */
        .btn-submit { background: #1a3a6b; color: #fff; border: none; width: 100%; padding: 13px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; letter-spacing: 0.2px; }
        .btn-submit:hover { background: #0f2a55; }
        .btn-submit:disabled { background: #9ca3af; cursor: not-allowed; }

        /* PHOTO UPLOAD */
        .photo-upload { border: 2px dashed #d1d5db; border-radius: 6px; cursor: pointer; transition: all 0.15s; display: block; overflow: hidden; }
        .photo-upload:hover { border-color: #1a3a6b; background: #f8f9ff; }
        .photo-upload-inner { padding: 40px; text-align: center; }
        .photo-upload-icon { font-size: 40px; margin-bottom: 12px; }
        .photo-upload-text { font-size: 13px; color: #6b7280; font-weight: 500; }
        .photo-upload-sub { font-size: 11px; color: #9ca3af; margin-top: 4px; }

        /* PERSON SELECTOR */
        .person-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
        .person-thumb { border: 2px solid #e8eaf0; border-radius: 6px; cursor: pointer; overflow: hidden; width: 100px; background: #fff; transition: all 0.15s; text-align: center; }
        .person-thumb:hover { border-color: #1a3a6b; box-shadow: 0 2px 8px rgba(26,58,107,0.12); }
        .person-thumb.selected { border-color: #f47920; box-shadow: 0 0 0 3px rgba(244,121,32,0.15); }
        .person-thumb img { width: 100%; height: 80px; object-fit: cover; display: block; }
        .person-thumb-name { padding: 6px 4px; font-size: 10px; font-weight: 600; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* VIDEO UPLOAD */
        .video-upload { border: 2px dashed #d1d5db; border-radius: 6px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.15s; display: block; }
        .video-upload:hover { border-color: #1a3a6b; background: #f8f9ff; }

        /* CASE CARDS */
        .cases-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .case-card { background: #fff; border: 1px solid #e8eaf0; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: box-shadow 0.15s; }
        .case-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .case-card-img { width: 100%; height: 200px; object-fit: cover; display: block; }
        .case-card-body { padding: 14px 16px; }
        .case-card-name { font-size: 14px; font-weight: 600; color: #1a1a2e; }
        .case-card-meta { font-size: 12px; color: #6b7280; margin-top: 4px; }
        .case-card-footer { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #f8f9ff; border-top: 1px solid #f0f2f7; }
        .status-badge { background: #dcfce7; color: #166534; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
        .btn-remove { background: transparent; border: none; font-size: 12px; color: #9ca3af; cursor: pointer; font-family: 'Inter', sans-serif; transition: color 0.15s; }
        .btn-remove:hover { color: #ef4444; }

        /* EMPTY STATE */
        .empty-state { text-align: center; padding: 60px 24px; background: #fff; border: 1px solid #e8eaf0; border-radius: 6px; }
        .empty-state-icon { font-size: 48px; margin-bottom: 12px; }
        .empty-state-title { font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .empty-state-text { font-size: 13px; color: #9ca3af; }

        /* INFO BOX */
        .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 12px 16px; margin-bottom: 20px; display: flex; gap: 10px; align-items: flex-start; }
        .info-box-text { font-size: 12px; color: #1e40af; line-height: 1.5; }

        /* FOOTER */
        .gov-footer { background: #1a3a6b; color: rgba(255,255,255,0.7); text-align: center; padding: 20px; font-size: 12px; margin-top: 60px; }
        .gov-footer a { color: #f47920; text-decoration: none; }

        /* SAFFRON DIVIDER */
        .saffron-bar { height: 4px; background: linear-gradient(90deg, #ff9933, #f47920); }
      `}</style>

      {/* Top Gov Bar */}
      <div className="gov-topbar">
        <div className="gov-topbar-inner">
          <span>
            🇮🇳 Government of India &nbsp;|&nbsp; Ministry of Home Affairs
          </span>
          <span>
            Helpline: 112 &nbsp;|&nbsp; Missing Persons: 1800-XXX-XXXX
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="gov-header">
        <div className="gov-header-inner">
          <div className="gov-logo-block">
            <div className="gov-emblem">
              <img src="/govt.jpg" alt="Government Emblem" />
            </div>
            <div className="gov-title-block">
              <h1>National Missing Persons Identification Portal</h1>
              <p>
                AI-Powered Facial Recognition System &nbsp;|&nbsp; Powered by
                DeepFace Technology
              </p>
            </div>
          </div>

          <nav
            className="gov-nav"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              position: "relative",
            }}
          >
            {/* Admin — always visible */}
            <Link href="/admin" className="gov-nav-btn">
              ⚡ Admin Panel
            </Link>

            {/* More dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="gov-nav-btn outline"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                ☰ More <span style={{ fontSize: "10px" }}>▼</span>
              </button>

              {menuOpen && (
                <>
                  {/* Backdrop to close */}
                  <div
                    onClick={() => setMenuOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 40 }}
                  />

                  {/* Dropdown */}
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      background: "#fff",
                      border: "1px solid #e8eaf0",
                      borderRadius: "6px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      minWidth: "210px",
                      zIndex: 50,
                      overflow: "hidden",
                    }}
                  >
                    {[
                      {
                        href: "/missing-people",
                        icon: "🏆",
                        label: "Missing People",
                        sub: "Public reward portal",
                      },
                      {
                        href: "/group-scan",
                        icon: "👥",
                        label: "Group Scan",
                        sub: "Crowd photo detection",
                      },
                      {
                        href: "/camera",
                        icon: "📱",
                        label: "Live Camera",
                        sub: "Mobile scanner",
                      },
                      {
                        href: "/ai-detector",
                        icon: "🔬",
                        label: "AI Image Detector",
                        sub: "Detect fake photos",
                      },
                    ].map((item, i, arr) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "11px 16px",
                          textDecoration: "none",
                          color: "#1a1a2e",
                          borderBottom:
                            i < arr.length - 1 ? "1px solid #f0f2f7" : "none",
                          background: "#fff",
                          transition: "background .15s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.background = "#f8f9ff")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.background = "#fff")
                        }
                      >
                        <span style={{ fontSize: "18px" }}>{item.icon}</span>
                        <div>
                          <p
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              margin: 0,
                            }}
                          >
                            {item.label}
                          </p>
                          <p
                            style={{
                              fontSize: "11px",
                              color: "#9ca3af",
                              margin: 0,
                            }}
                          >
                            {item.sub}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </nav>
        </div>
        <div className="saffron-bar" />
      </header>

      {/* Hero */}
      <div className="hero-strip">
        <div className="hero-inner">
          <div className="hero-text">
            <h2>Find Missing Persons with AI</h2>
            <p>
              Upload a photograph and scan any video footage or live CCTV feed.
              Our AI engine analyzes every frame and sends instant alerts when a
              match is detected.
            </p>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-num">{persons.length}</div>
              <div className="hero-stat-label">Active Cases</div>
            </div>
            <div
              style={{ width: "1px", background: "rgba(255,255,255,0.15)" }}
            />
            <div className="hero-stat">
              <div className="hero-stat-num">AI</div>
              <div className="hero-stat-label">Face Match</div>
            </div>
            <div
              style={{ width: "1px", background: "rgba(255,255,255,0.15)" }}
            />
            <div className="hero-stat">
              <div className="hero-stat-num">24/7</div>
              <div className="hero-stat-label">Monitoring</div>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <div className="breadcrumb-inner">
          Home &rsaquo; <span>Missing Persons Portal</span>
        </div>
      </div>

      {/* Main */}
      <main className="main-inner">
        {message && (
          <div
            className={`alert-msg ${message.type === "success" ? "alert-success" : message.type === "error" ? "alert-error" : "alert-info"}`}
          >
            {message.type === "success"
              ? "✅"
              : message.type === "error"
                ? "❌"
                : "ℹ️"}{" "}
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="tab-bar">
          {(["upload", "scan", "persons"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`tab-btn ${tab === t ? "active" : ""}`}
            >
              {t === "upload"
                ? "📋 Register Missing Person"
                : t === "scan"
                  ? "🎬 Scan Video Footage"
                  : `👥 Active Cases (${persons.length})`}
            </button>
          ))}
        </div>

        {/* REGISTER TAB */}
        {tab === "upload" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
            }}
          >
            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-header-icon">📋</div>
                <div>
                  <h3>Person Details</h3>
                  <p>Fill in the missing person's information</p>
                </div>
              </div>
              <div className="form-card-body">
                <form onSubmit={handleUploadPerson}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="Enter full name"
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Age / Age Range</label>
                    <input
                      value={personAge}
                      onChange={(e) => setPersonAge(e.target.value)}
                      placeholder="e.g. 25 or 20–30"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Description / Last Seen
                    </label>
                    <textarea
                      value={personDesc}
                      onChange={(e) => setPersonDesc(e.target.value)}
                      placeholder="Last seen location, clothing description, identifying marks, medical info..."
                      className="form-input"
                      rows={4}
                    />
                  </div>
                  <div className="info-box">
                    <span style={{ fontSize: "14px" }}>ℹ️</span>
                    <p className="info-box-text">
                      Please provide a clear, recent front-facing photograph for
                      best AI matching accuracy.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-submit"
                  >
                    {loading ? "Registering..." : "✅ Register Missing Person"}
                  </button>
                </form>
              </div>
            </div>

            <div className="form-card">
              <div className="form-card-header">
                <div className="form-card-header-icon">📸</div>
                <div>
                  <h3>Upload Photograph</h3>
                  <p>Clear face photo required for AI matching</p>
                </div>
              </div>
              <div className="form-card-body">
                <label className="photo-upload">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        width: "100%",
                        height: "320px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div className="photo-upload-inner">
                      <div className="photo-upload-icon">🖼️</div>
                      <p className="photo-upload-text">
                        Click to upload photograph
                      </p>
                      <p className="photo-upload-sub">
                        JPG, PNG — Max 5MB — Clear face required
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: "none" }}
                  />
                </label>
                {imagePreview && (
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setPersonImage(null);
                    }}
                    style={{
                      marginTop: "8px",
                      background: "transparent",
                      border: "1px solid #e8eaf0",
                      padding: "6px 14px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: "#6b7280",
                      cursor: "pointer",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SCAN TAB */}
        {tab === "scan" && (
          <div className="form-card">
            <div className="form-card-header">
              <div className="form-card-header-icon">🎬</div>
              <div>
                <h3>Video Footage Analysis</h3>
                <p>
                  Upload CCTV or any video — AI will scan every frame for the
                  selected person
                </p>
              </div>
            </div>
            <div className="form-card-body">
              <form onSubmit={handleScanVideo}>
                <div className="form-group">
                  <label className="form-label">
                    Select Person to Search *
                  </label>
                  {persons.length === 0 ? (
                    <div
                      style={{
                        background: "#f9fafb",
                        border: "1px solid #e8eaf0",
                        borderRadius: "4px",
                        padding: "16px",
                      }}
                    >
                      <p style={{ fontSize: "13px", color: "#9ca3af" }}>
                        No persons registered. Please go to the Register tab
                        first.
                      </p>
                    </div>
                  ) : (
                    <div className="person-grid">
                      {persons.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => setSelectedPersonId(p.id)}
                          className={`person-thumb ${selectedPersonId === p.id ? "selected" : ""}`}
                        >
                          <img src={`${API_BASE}${p.image_url}`} alt={p.name} />
                          <div className="person-thumb-name">{p.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Video File *</label>
                  <label className="video-upload">
                    {videoFile ? (
                      <div>
                        <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                          🎬
                        </div>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#1a1a2e",
                          }}
                        >
                          {videoFile.name}
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            marginTop: "4px",
                          }}
                        >
                          {(videoFile.size / 1024 / 1024).toFixed(1)} MB — Ready
                          to scan
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                          📹
                        </div>
                        <p
                          style={{
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#6b7280",
                          }}
                        >
                          Click to upload CCTV or video footage
                        </p>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            marginTop: "4px",
                          }}
                        >
                          MP4, AVI, MOV — Up to 50MB
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) =>
                        setVideoFile(e.target.files?.[0] || null)
                      }
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                <div className="info-box">
                  <span style={{ fontSize: "14px" }}>⚡</span>
                  <p className="info-box-text">
                    AI will scan every frame at 2-second intervals. You will
                    receive an alert in the Admin Panel with the exact timestamp
                    and confidence score when a match is found.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedPersonId}
                  className="btn-submit"
                >
                  {loading
                    ? "Uploading & Starting Scan..."
                    : "🔍 Start AI Video Scan"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CASES TAB */}
        {tab === "persons" && (
          <div>
            {persons.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👤</div>
                <div className="empty-state-title">No Active Cases</div>
                <p className="empty-state-text">
                  Register a missing person to begin tracking
                </p>
              </div>
            ) : (
              <div className="cases-grid">
                {persons.map((p) => (
                  <div key={p.id} className="case-card">
                    <img
                      src={`${API_BASE}${p.image_url}`}
                      alt={p.name}
                      className="case-card-img"
                    />
                    <div className="case-card-body">
                      <div className="case-card-name">{p.name}</div>
                      <div className="case-card-meta">
                        Age: {p.age || "Not specified"}
                      </div>
                      {p.description && (
                        <div
                          className="case-card-meta"
                          style={{
                            marginTop: "6px",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {p.description}
                        </div>
                      )}
                    </div>
                    <div className="case-card-footer">
                      <span className="status-badge">● Active</span>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="btn-remove"
                      >
                        Remove Case
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="gov-footer">
        <p>
          National Missing Persons Identification Portal &nbsp;|&nbsp; Ministry
          of Home Affairs, Government of India
        </p>
        <p style={{ marginTop: "6px" }}>
          Helpline: <a href="tel:112">112</a> &nbsp;|&nbsp; For technical
          support: <a href="#">support@mha.gov.in</a>
        </p>
      </footer>
    </div>
  );
}
