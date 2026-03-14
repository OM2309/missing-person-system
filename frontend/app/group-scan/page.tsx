"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getPersons, API_BASE } from "../../lib/api";
import axios from "axios";

export default function GroupScanPage() {
  const [persons, setPersons] = useState<any[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [groupPreview, setGroupPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPersons()
      .then((d) => setPersons(d.persons || []))
      .catch(() => {});
  }, []);

  function handleGroupPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setGroupPhoto(file);
      setResult(null);
      const reader = new FileReader();
      reader.onload = (ev) => setGroupPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPersonId || !groupPhoto) {
      setError("Please select a person and upload a group photo");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("person_id", selectedPersonId);
      fd.append("group_photo", groupPhoto);
      const res = await axios.post(`${API_BASE}/scan-group-photo`, fd);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Scan failed. Please try again.");
    }
    setLoading(false);
  }

  const selectedPerson = persons.find((p) => p.id === selectedPersonId);

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
        .nav-btn { background: transparent; color: #1a3a6b; border: 1.5px solid #1a3a6b; padding: 8px 16px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s; }
        .nav-btn:hover { background: #f0f4ff; }
        .panel { background: #fff; border: 1px solid #e8eaf0; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .form-label { display: block; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .btn-submit { background: #1a3a6b; color: #fff; border: none; width: 100%; padding: 14px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .btn-submit:hover { background: #0f2a55; }
        .btn-submit:disabled { background: #9ca3af; cursor: not-allowed; }
        .person-thumb { border: 2px solid #e8eaf0; border-radius: 6px; cursor: pointer; overflow: hidden; width: 90px; background: #fff; transition: all 0.15s; text-align: center; }
        .person-thumb:hover { border-color: #1a3a6b; }
        .person-thumb.selected { border-color: #f47920; box-shadow: 0 0 0 3px rgba(244,121,32,0.15); }
        .upload-box { border: 2px dashed #d1d5db; border-radius: 6px; cursor: pointer; transition: all 0.15s; display: block; }
        .upload-box:hover { border-color: #1a3a6b; background: #f8f9ff; }
        .result-success { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 6px; padding: 16px 20px; }
        .result-fail { background: #fef9f0; border: 2px solid #f59e0b; border-radius: 6px; padding: 16px 20px; }
        .stat-pill { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 20px; padding: 6px 16px; font-size: 12px; font-weight: 600; color: #1a3a6b; display: inline-flex; align-items: center; gap: 6px; }
        .stat-pill.green { background: #f0fdf4; border-color: #86efac; color: #166534; }
        .stat-pill.red { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
        .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 12px 16px; display: flex; gap: 10px; }
        .gov-footer { background: #1a3a6b; color: rgba(255,255,255,0.7); text-align: center; padding: 20px; font-size: 12px; margin-top: 60px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 20px; height: 20px; border: 3px solid #fff3; border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px; }
      `}</style>

      {/* Top Bar */}
      <div className="gov-topbar">
        <span>🇮🇳 Government of India — Ministry of Home Affairs</span>
        <span>Helpline: 112</span>
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
            👥
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1a3a6b" }}>
              Group Photo Scanner
            </h1>
            <p style={{ fontSize: "11px", color: "#666" }}>
              Detect missing person in crowd / group photographs
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/" className="nav-btn">
            ← Portal
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
        {/* How it works */}
        <div className="info-box" style={{ marginBottom: "24px" }}>
          <span style={{ fontSize: "18px" }}>ℹ️</span>
          <div style={{ fontSize: "13px", color: "#1e40af", lineHeight: 1.6 }}>
            <strong>How it works:</strong> Select a registered missing person →
            Upload any group or crowd photo → AI detects every face in the image
            → Compares each face with the missing person → Returns annotated
            image with{" "}
            <span style={{ color: "#16a34a", fontWeight: 700 }}>green box</span>{" "}
            on matched faces and confidence score.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "380px 1fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* Left: Form */}
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
                🔍
              </div>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 600 }}>
                  Search Parameters
                </h3>
                <p style={{ fontSize: "11px", color: "#888" }}>
                  Select person and upload photo
                </p>
              </div>
            </div>
            <div style={{ padding: "20px" }}>
              <form onSubmit={handleScan}>
                {/* Person Select */}
                <div style={{ marginBottom: "24px" }}>
                  <label className="form-label">
                    Step 1 — Select Missing Person *
                  </label>
                  {persons.length === 0 ? (
                    <div
                      style={{
                        background: "#f9fafb",
                        border: "1px solid #e8eaf0",
                        borderRadius: "4px",
                        padding: "12px",
                        fontSize: "13px",
                        color: "#9ca3af",
                      }}
                    >
                      No persons registered.{" "}
                      <Link href="/" style={{ color: "#1a3a6b" }}>
                        Register one first →
                      </Link>
                    </div>
                  ) : (
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                    >
                      {persons.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => setSelectedPersonId(p.id)}
                          className={`person-thumb ${selectedPersonId === p.id ? "selected" : ""}`}
                        >
                          <img
                            src={`${API_BASE}${p.image_url}`}
                            alt={p.name}
                            style={{
                              width: "100%",
                              height: "70px",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                          <div
                            style={{
                              padding: "5px 4px",
                              fontSize: "10px",
                              fontWeight: 600,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Group Photo Upload */}
                <div style={{ marginBottom: "24px" }}>
                  <label className="form-label">
                    Step 2 — Upload Group / Crowd Photo *
                  </label>
                  <label
                    className="upload-box"
                    style={{
                      padding: groupPreview ? "0" : "32px",
                      textAlign: "center",
                      overflow: "hidden",
                    }}
                  >
                    {groupPreview ? (
                      <img
                        src={groupPreview}
                        alt="Group"
                        style={{
                          width: "100%",
                          maxHeight: "220px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div>
                        <div style={{ fontSize: "36px", marginBottom: "8px" }}>
                          🖼️
                        </div>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            fontWeight: 500,
                          }}
                        >
                          Click to upload group photo
                        </p>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            marginTop: "4px",
                          }}
                        >
                          JPG, PNG — Crowd, event, CCTV screenshot
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleGroupPhoto}
                      style={{ display: "none" }}
                    />
                  </label>
                  {groupPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setGroupPhoto(null);
                        setGroupPreview(null);
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
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Remove Photo
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
                  disabled={loading || !selectedPersonId || !groupPhoto}
                  className="btn-submit"
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Analyzing {result?.total_faces_detected || ""} faces...
                    </>
                  ) : (
                    "🔍 Scan Group Photo"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Results */}
          <div>
            {!result && !loading && (
              <div
                className="panel"
                style={{ padding: "60px", textAlign: "center" }}
              >
                <div style={{ fontSize: "56px", marginBottom: "16px" }}>👥</div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  Upload a Group Photo
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#9ca3af",
                    lineHeight: 1.6,
                  }}
                >
                  Select a missing person and upload any group photo, crowd
                  image, or event photograph. The AI will scan every face and
                  highlight matches.
                </p>
              </div>
            )}

            {loading && (
              <div
                className="panel"
                style={{ padding: "60px", textAlign: "center" }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔎</div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1a3a6b",
                    marginBottom: "8px",
                  }}
                >
                  Analyzing Group Photo...
                </h3>
                <p style={{ fontSize: "13px", color: "#6b7280" }}>
                  AI is detecting and comparing all faces. Please wait.
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
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                </div>
              </div>
            )}

            {result && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {/* Result Summary */}
                <div
                  className={
                    result.matches_found > 0 ? "result-success" : "result-fail"
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div style={{ fontSize: "32px" }}>
                      {result.matches_found > 0 ? "✅" : "❌"}
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          color:
                            result.matches_found > 0 ? "#15803d" : "#92400e",
                        }}
                      >
                        {result.matches_found > 0
                          ? `${result.person_name} FOUND in group photo!`
                          : `${result.person_name} not detected`}
                      </h3>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#6b7280",
                          marginTop: "2px",
                        }}
                      >
                        {result.matches_found > 0
                          ? "Green box highlights the matched person"
                          : "No confident match found in this image"}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
                  >
                    <span className="stat-pill">
                      👤 {result.total_faces_detected} faces detected
                    </span>
                    {result.matches_found > 0 && (
                      <>
                        <span className="stat-pill green">
                          ✅ {result.matches_found} match(es) found
                        </span>
                        {result.matched_faces?.[0] && (
                          <span className="stat-pill green">
                            🎯 {result.matched_faces[0].confidence.toFixed(0)}%
                            confidence
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Side by side: Original person + Annotated group */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr",
                    gap: "16px",
                  }}
                >
                  {/* Target person */}
                  {selectedPerson && (
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
                          Target Person
                        </h4>
                      </div>
                      <img
                        src={`${API_BASE}${selectedPerson.image_url}`}
                        alt={selectedPerson.name}
                        style={{
                          width: "100%",
                          aspectRatio: "1",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      <div style={{ padding: "10px 14px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 600 }}>
                          {selectedPerson.name}
                        </p>
                        <p style={{ fontSize: "11px", color: "#6b7280" }}>
                          Age: {selectedPerson.age || "—"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Annotated group photo */}
                  <div className="panel" style={{ overflow: "hidden" }}>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid #f0f2f7",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
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
                        Annotated Result
                        {result.matches_found > 0 && (
                          <span style={{ color: "#16a34a", marginLeft: "8px" }}>
                            ● Match Highlighted
                          </span>
                        )}
                      </h4>
                      {result.annotated_image_url && (
                        <a
                          href={`${API_BASE}${result.annotated_image_url}`}
                          download
                          target="_blank"
                          style={{
                            fontSize: "11px",
                            color: "#1a3a6b",
                            textDecoration: "none",
                            border: "1px solid #c7d2fe",
                            padding: "4px 10px",
                            borderRadius: "4px",
                          }}
                        >
                          ⬇ Download
                        </a>
                      )}
                    </div>
                    {result.annotated_image_b64 ? (
                      <img
                        src={`data:image/jpeg;base64,${result.annotated_image_b64}`}
                        alt="Annotated Result"
                        style={{
                          width: "100%",
                          display: "block",
                          maxHeight: "480px",
                          objectFit: "contain",
                          background: "#f8f9ff",
                        }}
                      />
                    ) : groupPreview ? (
                      <img
                        src={groupPreview}
                        alt="Group"
                        style={{ width: "100%", display: "block" }}
                      />
                    ) : null}
                    {result.matches_found > 0 && (
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "#f0fdf4",
                          borderTop: "1px solid #bbf7d0",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#166534",
                            fontWeight: 500,
                          }}
                        >
                          🟢 Green box = matched face &nbsp;|&nbsp; Grey box =
                          other detected faces
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Match detail */}
                {result.matched_faces && result.matched_faces.length > 0 && (
                  <div className="panel" style={{ padding: "16px 20px" }}>
                    <h4
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#6b7280",
                        marginBottom: "12px",
                      }}
                    >
                      Match Details
                    </h4>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}
                    >
                      {result.matched_faces.map((mf: any, i: number) => (
                        <div
                          key={i}
                          style={{
                            background: "#f0fdf4",
                            border: "1px solid #86efac",
                            borderRadius: "6px",
                            padding: "12px 16px",
                            minWidth: "160px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "24px",
                              fontWeight: 700,
                              color: "#16a34a",
                            }}
                          >
                            {mf.confidence.toFixed(1)}%
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#6b7280",
                              marginTop: "2px",
                            }}
                          >
                            Confidence Score
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#374151",
                              marginTop: "6px",
                              fontWeight: 500,
                            }}
                          >
                            Position: ({mf.bbox.x}, {mf.bbox.y})
                          </div>
                          <div style={{ fontSize: "11px", color: "#374151" }}>
                            Size: {mf.bbox.w}×{mf.bbox.h}px
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Try again */}
                <button
                  onClick={() => {
                    setResult(null);
                    setGroupPhoto(null);
                    setGroupPreview(null);
                  }}
                  style={{
                    background: "transparent",
                    border: "1.5px solid #1a3a6b",
                    color: "#1a3a6b",
                    padding: "12px",
                    borderRadius: "4px",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => {
                    (e.target as HTMLElement).style.background = "#f0f4ff";
                  }}
                  onMouseOut={(e) => {
                    (e.target as HTMLElement).style.background = "transparent";
                  }}
                >
                  🔄 Scan Another Photo
                </button>
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
