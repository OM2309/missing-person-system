"use client";
import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { API_BASE } from "../../lib/api";

export default function AIDetectorPage() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setResult(null);
      setError(null);
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleDetect(e: React.FormEvent) {
    e.preventDefault();
    if (!image) {
      setError("Please upload an image");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", image);
      const res = await axios.post(`${API_BASE}/detect-ai-image`, fd);
      setResult(res.data.result);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Detection failed. Please try again.",
      );
    }
    setLoading(false);
  }

  const verdictConfig: Record<
    string,
    { bg: string; border: string; color: string; icon: string; label: string }
  > = {
    AI_GENERATED: {
      bg: "#fef2f2",
      border: "#f87171",
      color: "#991b1b",
      icon: "🤖",
      label: "AI GENERATED",
    },
    SUSPICIOUS: {
      bg: "#fffbeb",
      border: "#fbbf24",
      color: "#92400e",
      icon: "⚠️",
      label: "SUSPICIOUS",
    },
    REAL: {
      bg: "#f0fdf4",
      border: "#4ade80",
      color: "#166534",
      icon: "✅",
      label: "REAL PHOTO",
    },
  };

  const checkColor: Record<string, string> = {
    pass: "#16a34a",
    warn: "#d97706",
    fail: "#dc2626",
  };
  const checkBg: Record<string, string> = {
    pass: "#f0fdf4",
    warn: "#fffbeb",
    fail: "#fef2f2",
  };
  const checkIcon: Record<string, string> = { pass: "✓", warn: "!", fail: "✗" };

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
        .gov-topbar { background: #1a3a6b; color: #fff; padding: 6px 24px; font-size: 12px; display: flex; justify-content: space-between; }
        .gov-header { background: #fff; border-bottom: 3px solid #f47920; box-shadow: 0 1px 4px rgba(0,0,0,0.08); padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
        .saffron-bar { height: 4px; background: linear-gradient(90deg,#ff9933,#f47920); }
        .nav-btn { background: transparent; color: #1a3a6b; border: 1.5px solid #1a3a6b; padding: 8px 16px; border-radius: 4px; font-family: 'Inter',sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; }
        .nav-btn:hover { background: #f0f4ff; }
        .panel { background: #fff; border: 1px solid #e8eaf0; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
        .upload-box { border: 2px dashed #d1d5db; border-radius: 6px; cursor: pointer; transition: all .15s; display: block; }
        .upload-box:hover { border-color: #1a3a6b; background: #f8f9ff; }
        .btn-submit { background: #1a3a6b; color: #fff; border: none; width: 100%; padding: 14px; border-radius: 4px; font-family: 'Inter',sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s; }
        .btn-submit:hover { background: #0f2a55; }
        .btn-submit:disabled { background: #9ca3af; cursor: not-allowed; }
        .form-label { display: block; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
        .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 12px 16px; display: flex; gap: 10px; }
        .check-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 4px; margin-bottom: 8px; }
        .check-icon { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .meter-bar { height: 10px; border-radius: 20px; background: #e8eaf0; overflow: hidden; }
        .meter-fill { height: 100%; border-radius: 20px; transition: width .6s ease; }
        .gov-footer { background: #1a3a6b; color: rgba(255,255,255,.7); text-align: center; padding: 20px; font-size: 12px; margin-top: 60px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 18px; height: 18px; border: 3px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn .4s ease; }
      `}</style>

      {/* Top Bar */}
      <div className="gov-topbar">
        <span>🇮🇳 Government of India — Ministry of Home Affairs</span>
        <span>AI Forensics Tool — Internal Use Only</span>
      </div>

      {/* Header */}
      <div className="gov-header">
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
            🔬
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1a3a6b" }}>
              AI Image Authenticity Detector
            </h1>
            <p style={{ fontSize: "11px", color: "#666" }}>
              Detect AI-generated / deepfake photos using image forensics
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/" className="nav-btn">
            ← Portal
          </Link>
          <Link href="/group-scan" className="nav-btn">
            👥 Group Scan
          </Link>
          <Link href="/admin" className="nav-btn">
            ⚡ Admin
          </Link>
        </div>
      </div>
      <div className="saffron-bar" />

      <main
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 24px" }}
      >
        <div className="info-box" style={{ marginBottom: "24px" }}>
          <span style={{ fontSize: "18px" }}>🔬</span>
          <div style={{ fontSize: "13px", color: "#1e40af", lineHeight: 1.6 }}>
            <strong>Purpose:</strong> Prevent fake/AI-generated photos from
            being submitted as missing person reports. Analyzes noise patterns,
            frequency spectrum, facial symmetry, texture uniformity, and color
            distribution to determine if an image is <strong>real</strong>,{" "}
            <strong>suspicious</strong>, or <strong>AI-generated</strong>.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* Upload Panel */}
          <div className="panel">
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #f0f2f7",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  background: "#eef2ff",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                }}
              >
                🖼️
              </div>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 600 }}>
                  Upload Image
                </h3>
                <p style={{ fontSize: "11px", color: "#888" }}>
                  Any photo to analyze
                </p>
              </div>
            </div>
            <div style={{ padding: "20px" }}>
              <form onSubmit={handleDetect}>
                <div style={{ marginBottom: "20px" }}>
                  <label className="form-label">Select Image *</label>
                  <label className="upload-box" style={{ overflow: "hidden" }}>
                    {preview ? (
                      <img
                        src={preview}
                        alt="Preview"
                        style={{
                          width: "100%",
                          maxHeight: "260px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div style={{ padding: "40px", textAlign: "center" }}>
                        <div style={{ fontSize: "40px", marginBottom: "10px" }}>
                          🖼️
                        </div>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            fontWeight: 500,
                          }}
                        >
                          Click to upload image
                        </p>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            marginTop: "4px",
                          }}
                        >
                          JPG, PNG — Any photo
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImage}
                      style={{ display: "none" }}
                    />
                  </label>
                  {preview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setPreview(null);
                        setResult(null);
                      }}
                      style={{
                        marginTop: "8px",
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
                      Remove
                    </button>
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
                      marginBottom: "16px",
                    }}
                  >
                    ❌ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !image}
                  className="btn-submit"
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Analyzing...
                    </>
                  ) : (
                    "🔬 Analyze Image"
                  )}
                </button>
              </form>

              {/* How it works */}
              <div
                style={{
                  marginTop: "20px",
                  borderTop: "1px solid #f0f2f7",
                  paddingTop: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#374151",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "10px",
                  }}
                >
                  Detection Methods
                </p>
                {[
                  { icon: "📊", label: "Noise Pattern Analysis" },
                  { icon: "🌊", label: "Frequency Spectrum (FFT)" },
                  { icon: "🪞", label: "Facial Symmetry Check" },
                  { icon: "🎨", label: "Color Channel Distribution" },
                  { icon: "🔲", label: "Texture Uniformity" },
                  { icon: "✂️", label: "Edge Sharpness Analysis" },
                ].map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "5px 0",
                      borderBottom: "1px solid #f9fafb",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>{m.icon}</span>
                    <span style={{ fontSize: "12px", color: "#374151" }}>
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div>
            {!result && !loading && (
              <div
                className="panel"
                style={{ padding: "60px", textAlign: "center" }}
              >
                <div style={{ fontSize: "56px", marginBottom: "16px" }}>🔬</div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  Upload an image to analyze
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#9ca3af",
                    lineHeight: 1.6,
                    maxWidth: "380px",
                    margin: "0 auto",
                  }}
                >
                  Our forensics engine will scan the image using 6 different
                  detection methods and tell you if it is a real photograph or
                  AI-generated content.
                </p>
              </div>
            )}

            {loading && (
              <div
                className="panel"
                style={{ padding: "60px", textAlign: "center" }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1a3a6b",
                    marginBottom: "8px",
                  }}
                >
                  Running Forensic Analysis...
                </h3>
                <p style={{ fontSize: "13px", color: "#6b7280" }}>
                  Analyzing noise, frequency, symmetry, texture...
                </p>
                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "4px solid #e8eaf0",
                      borderTopColor: "#1a3a6b",
                      borderRadius: "50%",
                      animation: "spin .8s linear infinite",
                    }}
                  />
                </div>
              </div>
            )}

            {result && (
              <div
                className="fade-in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {/* VERDICT CARD */}
                {(() => {
                  const cfg =
                    verdictConfig[result.verdict] || verdictConfig.REAL;
                  return (
                    <div
                      style={{
                        background: cfg.bg,
                        border: `2px solid ${cfg.border}`,
                        borderRadius: "8px",
                        padding: "24px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          marginBottom: "20px",
                        }}
                      >
                        <div style={{ fontSize: "48px", lineHeight: 1 }}>
                          {cfg.icon}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#6b7280",
                              textTransform: "uppercase",
                              letterSpacing: "0.8px",
                              marginBottom: "4px",
                            }}
                          >
                            Verdict
                          </div>
                          <h2
                            style={{
                              fontSize: "24px",
                              fontWeight: 700,
                              color: cfg.color,
                            }}
                          >
                            {cfg.label}
                          </h2>
                          <p
                            style={{
                              fontSize: "13px",
                              color: "#6b7280",
                              marginTop: "4px",
                            }}
                          >
                            {result.verdict === "AI_GENERATED"
                              ? "This image shows strong signs of being AI-generated or deepfake."
                              : result.verdict === "SUSPICIOUS"
                                ? "Some anomalies detected. Manual review recommended."
                                : "This image appears to be a genuine real photograph."}
                          </p>
                        </div>
                      </div>

                      {/* Probability Meters */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "6px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#dc2626",
                              }}
                            >
                              🤖 AI Probability
                            </span>
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "#dc2626",
                              }}
                            >
                              {result.ai_probability}%
                            </span>
                          </div>
                          <div className="meter-bar">
                            <div
                              className="meter-fill"
                              style={{
                                width: `${result.ai_probability}%`,
                                background:
                                  result.ai_probability > 60
                                    ? "#ef4444"
                                    : result.ai_probability > 35
                                      ? "#f59e0b"
                                      : "#22c55e",
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "6px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#16a34a",
                              }}
                            >
                              👤 Real Probability
                            </span>
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "#16a34a",
                              }}
                            >
                              {result.real_probability}%
                            </span>
                          </div>
                          <div className="meter-bar">
                            <div
                              className="meter-fill"
                              style={{
                                width: `${result.real_probability}%`,
                                background: "#22c55e",
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Reasons */}
                      {result.reasons && result.reasons.length > 0 && (
                        <div>
                          <p
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#374151",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              marginBottom: "8px",
                            }}
                          >
                            Suspicious Signals Detected:
                          </p>
                          {result.reasons.map((r: string, i: number) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "8px",
                                marginBottom: "5px",
                              }}
                            >
                              <span
                                style={{
                                  color: "#dc2626",
                                  fontWeight: 700,
                                  fontSize: "14px",
                                  flexShrink: 0,
                                }}
                              >
                                ⚠
                              </span>
                              <span
                                style={{ fontSize: "13px", color: "#374151" }}
                              >
                                {r}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* FORENSIC CHECKS */}
                <div className="panel">
                  <div
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid #f0f2f7",
                    }}
                  >
                    <h3 style={{ fontSize: "14px", fontWeight: 600 }}>
                      Forensic Analysis Breakdown
                    </h3>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#888",
                        marginTop: "2px",
                      }}
                    >
                      6 independent checks performed
                    </p>
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    {result.checks?.map((c: any, i: number) => (
                      <div
                        key={i}
                        className="check-row"
                        style={{
                          background: checkBg[c.status] || "#f9fafb",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <div
                            className="check-icon"
                            style={{
                              background: checkColor[c.status],
                              color: "#fff",
                            }}
                          >
                            {checkIcon[c.status]}
                          </div>
                          <div>
                            <p
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#1a1a2e",
                              }}
                            >
                              {c.check}
                            </p>
                            <p style={{ fontSize: "11px", color: "#6b7280" }}>
                              {c.result}
                            </p>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: checkColor[c.status],
                            background: "#fff",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            border: `1px solid ${checkColor[c.status]}33`,
                          }}
                        >
                          {c.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* IMAGE + SUMMARY side by side */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div className="panel" style={{ overflow: "hidden" }}>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid #f0f2f7",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#6b7280",
                        }}
                      >
                        Analyzed Image
                      </h4>
                    </div>
                    {result.image_b64 && (
                      <img
                        src={`data:image/jpeg;base64,${result.image_b64}`}
                        alt="Analyzed"
                        style={{
                          width: "100%",
                          maxHeight: "240px",
                          objectFit: "contain",
                          display: "block",
                          background: "#f8f9ff",
                        }}
                      />
                    )}
                    <div style={{ padding: "10px 14px" }}>
                      <p style={{ fontSize: "12px", color: "#6b7280" }}>
                        File: {result.filename}
                      </p>
                    </div>
                  </div>

                  <div className="panel" style={{ padding: "20px" }}>
                    <h4
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#6b7280",
                        marginBottom: "16px",
                      }}
                    >
                      Technical Readings
                    </h4>
                    {[
                      {
                        label: "Image Size",
                        value: `${result.features?.image_width}×${result.features?.image_height}px`,
                      },
                      {
                        label: "Noise Level",
                        value: result.features?.noise_std?.toFixed(2),
                      },
                      {
                        label: "Texture Score",
                        value: result.features?.texture_uniformity?.toFixed(3),
                      },
                      {
                        label: "Symmetry Diff",
                        value: result.features?.face_symmetry_diff?.toFixed(2),
                      },
                      {
                        label: "Freq Spectrum",
                        value: result.features?.freq_std?.toFixed(2),
                      },
                      {
                        label: "Edge Sharpness",
                        value: result.features?.edge_sharpness?.toFixed(0),
                      },
                    ].map((row, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "7px 0",
                          borderBottom: "1px solid #f9fafb",
                        }}
                      >
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
                          {row.label}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#1a1a2e",
                            fontFamily: "monospace",
                          }}
                        >
                          {row.value || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => {
                      setResult(null);
                      setImage(null);
                      setPreview(null);
                    }}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "1.5px solid #1a3a6b",
                      color: "#1a3a6b",
                      padding: "12px",
                      borderRadius: "4px",
                      fontFamily: "Inter,sans-serif",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🔄 Analyze Another Image
                  </button>
                  {result.verdict !== "REAL" && (
                    <div
                      style={{
                        flex: 1,
                        background: "#fef2f2",
                        border: "1px solid #fca5a5",
                        borderRadius: "4px",
                        padding: "12px",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#991b1b",
                          fontWeight: 600,
                        }}
                      >
                        ⚠️ Do not use this image for missing person report
                      </p>
                    </div>
                  )}
                  {result.verdict === "REAL" && (
                    <Link
                      href="/"
                      style={{
                        flex: 1,
                        background: "#1a3a6b",
                        color: "#fff",
                        padding: "12px",
                        borderRadius: "4px",
                        fontFamily: "Inter,sans-serif",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        textDecoration: "none",
                        textAlign: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✅ Use in Missing Person Report →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="gov-footer">
        <p>
          National Missing Persons Identification Portal — Ministry of Home
          Affairs, Government of India
        </p>
      </footer>
    </div>
  );
}
