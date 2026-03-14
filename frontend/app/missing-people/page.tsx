"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { API_BASE } from "../../lib/api";

export default function MissingPeoplePage() {
  const [persons, setPersons] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE}/public/missing-persons`)
      .then((r) => setPersons(r.data.persons || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmitTip(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("person_id", selected.id);
      fd.append("reporter_name", name);
      fd.append("reporter_email", email);
      fd.append("reporter_phone", phone);
      fd.append("sighting_location", location);
      fd.append("description", desc);
      if (photo) fd.append("photo", photo);
      const res = await axios.post(`${API_BASE}/public/submit-tip`, fd);
      setSuccess(res.data.message);
      setName("");
      setEmail("");
      setPhone("");
      setLocation("");
      setDesc("");
      setPhoto(null);
      setPhotoPreview(null);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Submission failed. Please try again.",
      );
    }
    setSubmitting(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f9",
        fontFamily: "'Inter','Roboto',sans-serif",
        color: "#1a1a2e",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f6f9 !important; }
        .topbar { background: #1a3a6b; color: #fff; padding: 6px 24px; font-size: 12px; display: flex; justify-content: space-between; }
        .header { background: #fff; border-bottom: 3px solid #f47920; box-shadow: 0 1px 4px rgba(0,0,0,.08); padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
        .saffron { height: 4px; background: linear-gradient(90deg,#ff9933,#f47920); }
        .nav-btn { background: transparent; color: #1a3a6b; border: 1.5px solid #1a3a6b; padding: 8px 16px; border-radius: 4px; font-family: 'Inter',sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none; transition: all .15s; display: inline-flex; align-items: center; gap: 6px; }
        .nav-btn:hover { background: #f0f4ff; }
        .panel { background: #fff; border: 1px solid #e8eaf0; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
        .person-card { background: #fff; border: 2px solid #e8eaf0; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all .2s; }
        .person-card:hover { border-color: #1a3a6b; box-shadow: 0 4px 16px rgba(26,58,107,.12); transform: translateY(-2px); }
        .person-card.sel { border-color: #f47920; box-shadow: 0 0 0 3px rgba(244,121,32,.15); }
        .reward-badge { background: linear-gradient(135deg,#f59e0b,#f47920); color: #fff; font-size: 13px; font-weight: 700; padding: 8px 14px; text-align: center; }
        .no-reward { background: #f4f6f9; padding: 8px; text-align: center; font-size: 11px; color: #9ca3af; }
        .form-label { display: block; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
        .form-input { width: 100%; padding: 10px 14px; border: 1.5px solid #d1d5db; border-radius: 4px; font-family: 'Inter',sans-serif; font-size: 14px; color: #1a1a2e; outline: none; transition: border-color .15s; background: #fff; }
        .form-input:focus { border-color: #1a3a6b; box-shadow: 0 0 0 3px rgba(26,58,107,.08); }
        .form-input::placeholder { color: #9ca3af; }
        textarea.form-input { resize: vertical; min-height: 80px; }
        .btn-submit { background: #1a3a6b; color: #fff; border: none; width: 100%; padding: 14px; border-radius: 4px; font-family: 'Inter',sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s; }
        .btn-submit:hover { background: #0f2a55; }
        .btn-submit:disabled { background: #9ca3af; cursor: not-allowed; }
        .upload-box { border: 2px dashed #d1d5db; border-radius: 6px; cursor: pointer; transition: all .15s; display: block; }
        .upload-box:hover { border-color: #1a3a6b; background: #f8f9ff; }
        .hero { background: linear-gradient(135deg,#1a3a6b,#0f2a55); color: #fff; padding: 40px 24px; }
        .hero-inner { max-width: 1100px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 32px; flex-wrap: wrap; }
        .step-num { width: 28px; height: 28px; border-radius: 50%; background: #1a3a6b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .gov-footer { background: #1a3a6b; color: rgba(255,255,255,.7); text-align: center; padding: 20px; font-size: 12px; margin-top: 60px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 18px; height: 18px; border: 3px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn .4s ease; }
        .selected-preview { display: flex; gap: 12px; align-items: center; background: #f8f9ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 10px 12px; margin-bottom: 20px; }
      `}</style>

      {/* Top Bar */}
      <div className="topbar">
        <span>🇮🇳 Government of India — Ministry of Home Affairs</span>
        <span>
          Missing Persons Helpline: <strong>112</strong>
        </span>
      </div>

      {/* Header */}
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
            🏆
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1a3a6b" }}>
              Missing Persons — Public Reward Portal
            </h1>
            <p style={{ fontSize: "11px", color: "#666" }}>
              Help find missing persons and earn rewards
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/" className="nav-btn">
            ← Home
          </Link>
          <Link href="/admin" className="nav-btn">
            ⚡ Admin
          </Link>
        </div>
      </div>
      <div className="saffron" />

      {/* Hero */}
      <div className="hero">
        <div className="hero-inner">
          <div>
            <h2
              style={{
                fontSize: "clamp(22px,4vw,36px)",
                fontWeight: 700,
                marginBottom: "10px",
              }}
            >
              Have you seen someone?
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "rgba(255,255,255,.75)",
                maxWidth: "480px",
                lineHeight: 1.7,
              }}
            >
              If you have seen any of the listed missing persons, report it
              here. Provide your contact details and a photo if available.
              Verified tips will be rewarded as listed.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "28px",
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            {[
              { num: persons.length, label: "Missing Persons" },
              {
                num: persons.filter((p) => p.reward > 0).length,
                label: "With Rewards",
              },
              {
                num:
                  "₹" +
                  persons
                    .reduce((s, p) => s + (p.reward || 0), 0)
                    .toLocaleString(),
                label: "Total Rewards",
              },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "#f47920",
                  }}
                >
                  {s.num}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,.6)",
                    textTransform: "uppercase",
                    letterSpacing: ".5px",
                    marginTop: "3px",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}
      >
        {/* How it works */}
        <div
          className="panel"
          style={{ padding: "20px 24px", marginBottom: "28px" }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: ".5px",
              marginBottom: "16px",
            }}
          >
            How to Submit a Tip
          </p>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {[
              {
                n: 1,
                t: "Select Person",
                d: "Click on the missing person you have seen",
              },
              {
                n: 2,
                t: "Fill Your Details",
                d: "Enter your name, email, phone and sighting location",
              },
              {
                n: 3,
                t: "Upload Photo",
                d: "Attach a photo of the sighting if available",
              },
              {
                n: 4,
                t: "Get Rewarded",
                d: "Verified tips receive the listed reward amount",
              },
            ].map((s) => (
              <div
                key={s.n}
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  flex: "1",
                  minWidth: "180px",
                }}
              >
                <div className="step-num">{s.n}</div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600 }}>{s.t}</p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "2px",
                    }}
                  >
                    {s.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 400px",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* LEFT — Missing Persons List */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ fontSize: "16px", fontWeight: 600 }}>
                Active Cases ({persons.length})
              </h2>
              {selected && (
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    background: "transparent",
                    border: "1px solid #e8eaf0",
                    padding: "5px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "#6b7280",
                    cursor: "pointer",
                    fontFamily: "Inter,sans-serif",
                  }}
                >
                  × Deselect
                </button>
              )}
            </div>

            {loading ? (
              <div
                className="panel"
                style={{ padding: "40px", textAlign: "center" }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    border: "3px solid #e8eaf0",
                    borderTopColor: "#1a3a6b",
                    borderRadius: "50%",
                    animation: "spin .8s linear infinite",
                    margin: "0 auto",
                  }}
                />
                <p
                  style={{
                    fontSize: "13px",
                    color: "#9ca3af",
                    marginTop: "12px",
                  }}
                >
                  Loading cases...
                </p>
              </div>
            ) : persons.length === 0 ? (
              <div
                className="panel"
                style={{ padding: "60px", textAlign: "center" }}
              >
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>👤</div>
                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  No active cases
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#9ca3af",
                    marginTop: "4px",
                  }}
                >
                  Check back later
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
                  gap: "16px",
                }}
              >
                {persons.map((p) => (
                  <div
                    key={p.id}
                    className={`person-card ${selected?.id === p.id ? "sel" : ""}`}
                    onClick={() => setSelected(p)}
                  >
                    <div style={{ position: "relative" }}>
                      <img
                        src={`${API_BASE}${p.image_url}`}
                        alt={p.name}
                        style={{
                          width: "100%",
                          height: "200px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      {selected?.id === p.id && (
                        <div
                          style={{
                            position: "absolute",
                            top: "10px",
                            right: "10px",
                            background: "#f47920",
                            color: "#fff",
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: 700,
                          }}
                        >
                          ✓
                        </div>
                      )}
                      {p.reward > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "10px",
                            left: "10px",
                            background: "rgba(0,0,0,0.7)",
                            color: "#f59e0b",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "20px",
                          }}
                        >
                          🏆 ₹{p.reward.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <h3
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          marginBottom: "3px",
                        }}
                      >
                        {p.name}
                      </h3>
                      <p style={{ fontSize: "12px", color: "#6b7280" }}>
                        Age: {p.age || "—"}
                      </p>
                      {p.description && (
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            marginTop: "5px",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {p.description}
                        </p>
                      )}
                    </div>
                    {p.reward > 0 ? (
                      <div className="reward-badge">
                        🏆 Reward: ₹{p.reward.toLocaleString()}
                      </div>
                    ) : (
                      <div className="no-reward">No reward listed</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Tip Submission Form */}
          <div style={{ position: "sticky", top: "20px" }}>
            <div className="panel">
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #f0f2f7",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    background: "#fef3c7",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}
                >
                  💡
                </div>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600 }}>
                    Submit a Tip
                  </h3>
                  <p style={{ fontSize: "11px", color: "#888" }}>
                    {selected
                      ? `For: ${selected.name}`
                      : "Select a person from the list"}
                  </p>
                </div>
              </div>

              <div style={{ padding: "20px" }}>
                {!selected ? (
                  <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <div style={{ fontSize: "40px", marginBottom: "10px" }}>
                      👈
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#9ca3af",
                        lineHeight: 1.6,
                      }}
                    >
                      Click on any missing person from the left to submit a tip
                      and claim the reward
                    </p>
                  </div>
                ) : success ? (
                  <div
                    className="fade-in"
                    style={{ textAlign: "center", padding: "20px 0" }}
                  >
                    <div style={{ fontSize: "52px", marginBottom: "12px" }}>
                      ✅
                    </div>
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#15803d",
                        marginBottom: "8px",
                      }}
                    >
                      Tip Submitted!
                    </h3>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#374151",
                        lineHeight: 1.7,
                        marginBottom: "20px",
                      }}
                    >
                      {success}
                    </p>
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #86efac",
                        borderRadius: "6px",
                        padding: "12px",
                        marginBottom: "16px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#166534",
                          fontWeight: 500,
                        }}
                      >
                        📧 Our team will contact you on your email once the tip
                        is verified.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSuccess(null);
                        setSelected(null);
                      }}
                      style={{
                        background: "#1a3a6b",
                        color: "#fff",
                        border: "none",
                        padding: "10px 24px",
                        borderRadius: "4px",
                        fontFamily: "Inter,sans-serif",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Submit Another Tip
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitTip}>
                    {/* Selected person preview */}
                    <div className="selected-preview">
                      <img
                        src={`${API_BASE}${selected.image_url}`}
                        alt={selected.name}
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "6px",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "13px", fontWeight: 600 }}>
                          {selected.name}
                        </p>
                        <p style={{ fontSize: "11px", color: "#6b7280" }}>
                          Age: {selected.age || "—"}
                        </p>
                      </div>
                      {selected.reward > 0 && (
                        <div
                          style={{
                            background: "#fef3c7",
                            border: "1px solid #fcd34d",
                            borderRadius: "4px",
                            padding: "5px 10px",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#92400e",
                            flexShrink: 0,
                          }}
                        >
                          🏆 ₹{selected.reward.toLocaleString()}
                        </div>
                      )}
                    </div>

                    {error && (
                      <div
                        style={{
                          background: "#fef2f2",
                          border: "1px solid #fca5a5",
                          borderRadius: "4px",
                          padding: "10px 14px",
                          fontSize: "13px",
                          color: "#dc2626",
                          marginBottom: "14px",
                        }}
                      >
                        ❌ {error}
                      </div>
                    )}

                    <div style={{ marginBottom: "14px" }}>
                      <label className="form-label">Your Full Name *</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        className="form-input"
                        required
                      />
                    </div>
                    <div style={{ marginBottom: "14px" }}>
                      <label className="form-label">Email Address *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="form-input"
                        required
                      />
                    </div>
                    <div style={{ marginBottom: "14px" }}>
                      <label className="form-label">Contact Number *</label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="form-input"
                        required
                      />
                    </div>
                    <div style={{ marginBottom: "14px" }}>
                      <label className="form-label">
                        Where did you see them? *
                      </label>
                      <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Connaught Place, New Delhi"
                        className="form-input"
                        required
                      />
                    </div>
                    <div style={{ marginBottom: "14px" }}>
                      <label className="form-label">Additional Details</label>
                      <textarea
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder="Date, time, what they were wearing, any other details..."
                        className="form-input"
                        rows={3}
                      />
                    </div>
                    <div style={{ marginBottom: "16px" }}>
                      <label className="form-label">
                        Upload Sighting Photo (optional)
                      </label>
                      <label
                        className="upload-box"
                        style={{ overflow: "hidden" }}
                      >
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="preview"
                            style={{
                              width: "100%",
                              height: "120px",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div style={{ padding: "20px", textAlign: "center" }}>
                            <div
                              style={{ fontSize: "24px", marginBottom: "6px" }}
                            >
                              📷
                            </div>
                            <p style={{ fontSize: "12px", color: "#6b7280" }}>
                              Click to attach a photo
                            </p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhoto}
                          style={{ display: "none" }}
                        />
                      </label>
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhoto(null);
                            setPhotoPreview(null);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            fontSize: "12px",
                            color: "#9ca3af",
                            cursor: "pointer",
                            fontFamily: "Inter,sans-serif",
                            marginTop: "4px",
                          }}
                        >
                          × Remove photo
                        </button>
                      )}
                    </div>

                    <div
                      style={{
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "4px",
                        padding: "10px 14px",
                        marginBottom: "14px",
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "14px" }}>🔒</span>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#1e40af",
                          lineHeight: 1.5,
                        }}
                      >
                        Your information is confidential and will only be used
                        by authorities to verify the tip.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-submit"
                    >
                      {submitting ? (
                        <>
                          <span className="spinner" />
                          Submitting...
                        </>
                      ) : (
                        "💡 Submit Tip & Claim Reward"
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="gov-footer">
        <p>
          National Missing Persons Identification Portal — Ministry of Home
          Affairs, Government of India
        </p>
        <p style={{ marginTop: "4px" }}>
          Helpline: 112 | All tips are strictly confidential
        </p>
      </footer>
    </div>
  );
}
