"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import {
  getAlerts,
  getMatches,
  getPersons,
  markAlertRead,
  API_BASE,
} from "../../lib/api";

export default function AdminPanel() {
  const [tab, setTab] = useState<"alerts" | "matches" | "persons" | "tips">(
    "alerts",
  );
  const [alerts, setAlerts] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [tips, setTips] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [liveAlert, setLiveAlert] = useState<any | null>(null);

  // Reward modal state
  const [rewardModal, setRewardModal] = useState<any | null>(null);
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardSaving, setRewardSaving] = useState(false);

  // Reply modal state
  const [replyModal, setReplyModal] = useState<any | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyResult, setReplyResult] = useState<any | null>(null);

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
      const [ad, md, pd, td] = await Promise.all([
        axios.get(`${API_BASE}/alerts`),
        axios.get(`${API_BASE}/matches`),
        axios.get(`${API_BASE}/persons`),
        axios.get(`${API_BASE}/admin/tips`),
      ]);
      setAlerts(ad.data.alerts || []);
      setUnread(ad.data.unread_count || 0);
      setMatches(md.data.matches || []);
      setPersons(pd.data.persons || []);
      setTips(td.data.tips || []);
    } catch {}
  }

  async function handleMarkRead(id: string) {
    await markAlertRead(id);
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a)),
    );
    setUnread((prev) => Math.max(0, prev - 1));
  }

  async function handleSetReward() {
    if (!rewardModal || !rewardAmount) return;
    setRewardSaving(true);
    try {
      await axios.post(
        `${API_BASE}/persons/${rewardModal.id}/set-reward`,
        new URLSearchParams({ amount: rewardAmount, currency: "INR" }),
      );
      setRewardModal(null);
      setRewardAmount("");
      loadAll();
    } catch {}
    setRewardSaving(false);
  }

  async function handleUpdateTipStatus(tipId: string, status: string) {
    await axios.post(
      `${API_BASE}/admin/tips/${tipId}/status`,
      new URLSearchParams({ status }),
    );
    loadAll();
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyModal) return;
    setReplySending(true);
    setReplyResult(null);
    try {
      const fd = new FormData();
      fd.append("subject", replySubject);
      fd.append("message", replyMessage);
      fd.append("smtp_email", smtpEmail);
      fd.append("smtp_password", smtpPass);
      const res = await axios.post(
        `${API_BASE}/admin/tips/${replyModal.id}/reply`,
        fd,
      );
      setReplyResult({
        success: true,
        msg: res.data.message,
        email_sent: res.data.email_sent,
      });
      loadAll();
    } catch (err: any) {
      setReplyResult({
        success: false,
        msg: err.response?.data?.detail || "Failed",
      });
    }
    setReplySending(false);
  }

  const sourceLabel = (s: string) =>
    s === "video"
      ? "Video Scan"
      : s === "cctv"
        ? "CCTV Live"
        : s === "group_photo"
          ? "Group Photo"
          : "Mobile Camera";
  const sourceBg = (s: string) =>
    s === "video"
      ? "#ede9fe"
      : s === "cctv"
        ? "#fee2e2"
        : s === "group_photo"
          ? "#fef3c7"
          : "#dcfce7";
  const sourceColor = (s: string) =>
    s === "video"
      ? "#5b21b6"
      : s === "cctv"
        ? "#991b1b"
        : s === "group_photo"
          ? "#92400e"
          : "#166534";

  const tipStatusConfig: Record<
    string,
    { bg: string; color: string; label: string }
  > = {
    pending: { bg: "#fef3c7", color: "#92400e", label: "⏳ Pending" },
    verified: { bg: "#dcfce7", color: "#166534", label: "✅ Verified" },
    rejected: { bg: "#fee2e2", color: "#991b1b", label: "❌ Rejected" },
    rewarded: { bg: "#ede9fe", color: "#5b21b6", label: "🏆 Rewarded" },
  };

  const pendingTips = tips.filter((t) => t.status === "pending").length;

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
        .topbar { background: #1a3a6b; color: #fff; padding: 6px 24px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
        .header { background: #fff; border-bottom: 3px solid #f47920; box-shadow: 0 1px 4px rgba(0,0,0,.08); padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
        .saffron { height: 4px; background: linear-gradient(90deg,#ff9933,#f47920); }
        .nav-btn { background: transparent; color: #1a3a6b; border: 1.5px solid #1a3a6b; padding: 8px 16px; border-radius: 4px; font-family: 'Inter',sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; }
        .nav-btn:hover { background: #f0f4ff; }
        .panel { background: #fff; border: 1px solid #e8eaf0; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.05); overflow: hidden; }
        .stats-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 14px; margin-bottom: 24px; }
        .stat-card { background: #fff; border: 1px solid #e8eaf0; border-radius: 6px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
        .stat-card.accent { border-left: 4px solid #f47920; }
        .stat-label { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; }
        .stat-num { font-size: 26px; font-weight: 700; margin-top: 4px; line-height: 1; }
        .stat-sub { font-size: 10px; color: #9ca3af; margin-top: 3px; }
        .tab-bar { display: flex; border-bottom: 2px solid #e8eaf0; margin-bottom: 24px; }
        .tab-btn { padding: 12px 20px; font-family: 'Inter',sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; color: #666; transition: all .15s; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
        .tab-btn.active { color: #1a3a6b; border-bottom-color: #f47920; font-weight: 600; }
        .tab-btn:not(.active):hover { color: #1a3a6b; background: #f8f9ff; }
        .badge-pill { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; white-space: nowrap; }
        .alert-row { padding: 14px 20px; border-bottom: 1px solid #f0f2f7; display: flex; gap: 16px; align-items: flex-start; transition: background .1s; }
        .alert-row:last-child { border-bottom: none; }
        .alert-row:hover { background: #fafbff; }
        .alert-unread { border-left: 3px solid #1a3a6b; }
        .alert-read { opacity: .55; }
        .btn-sm { background: transparent; border: 1px solid #d1d5db; padding: 5px 12px; border-radius: 4px; font-family: 'Inter',sans-serif; font-size: 11px; font-weight: 500; color: #6b7280; cursor: pointer; transition: all .15s; white-space: nowrap; }
        .btn-sm:hover { border-color: #1a3a6b; color: #1a3a6b; }
        .tip-card { border-bottom: 1px solid #f0f2f7; padding: 18px 20px; }
        .tip-card:last-child { border-bottom: none; }
        .form-input { width: 100%; padding: 9px 12px; border: 1.5px solid #d1d5db; border-radius: 4px; font-family: 'Inter',sans-serif; font-size: 13px; outline: none; transition: border-color .15s; background: #fff; color: #1a1a2e; }
        .form-input:focus { border-color: #1a3a6b; }
        .form-label { display: block; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 5px; }
        .btn-primary { background: #1a3a6b; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; font-family: 'Inter',sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; }
        .btn-primary:hover { background: #0f2a55; }
        .btn-primary:disabled { background: #9ca3af; cursor: not-allowed; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-box { background: #fff; border-radius: 8px; width: 100%; max-width: 580px; box-shadow: 0 20px 60px rgba(0,0,0,.2); max-height: 90vh; overflow-y: auto; }
        .modal-header { padding: 16px 20px; border-bottom: 1px solid #f0f2f7; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #fff; z-index: 1; }
        .modal-body { padding: 20px; }
        .ws-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .ws-on { background: #22c55e; }
        .ws-off { background: #f87171; }
        .live-toast { position: fixed; top: 20px; right: 20px; z-index: 999; background: #dc2626; color: #fff; padding: 16px 20px; max-width: 380px; border-radius: 6px; box-shadow: 0 8px 24px rgba(220,38,38,.3); animation: toastIn .3s ease; }
        @keyframes toastIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .gov-footer { background: #1a3a6b; color: rgba(255,255,255,.7); text-align: center; padding: 20px; font-size: 12px; margin-top: 60px; }
        .empty-state { text-align: center; padding: 60px 24px; }
        .reporter-info-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(180px,1fr)); gap: 8px; margin-bottom: 12px; }
        .reporter-info-box { background: #f8f9ff; border-radius: 4px; padding: 8px 12px; }
        .template-btn { background: #f4f6f9; border: 1px solid #e8eaf0; padding: 5px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; color: #374151; font-family: 'Inter',sans-serif; transition: all .15s; }
        .template-btn:hover { background: #f0f4ff; border-color: #1a3a6b; color: #1a3a6b; }
        .reward-quick-btn { border: 1px solid #e8eaf0; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; font-family: 'Inter',sans-serif; transition: all .15s; }
      `}</style>

      {/* Live Toast */}
      {liveAlert && (
        <div className="live-toast">
          <div
            style={{
              fontSize: "11px",
              letterSpacing: ".1em",
              marginBottom: "6px",
              opacity: 0.8,
              fontWeight: 600,
            }}
          >
            {liveAlert.type === "new_tip"
              ? "💡 NEW TIP RECEIVED"
              : "🚨 LIVE MATCH DETECTED"}
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

      {/* ======== REWARD MODAL ======== */}
      {rewardModal && (
        <div className="modal-overlay" onClick={() => setRewardModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: "15px", fontWeight: 600 }}>
                🏆 Set Reward — {rewardModal.name}
              </h3>
              <button
                onClick={() => setRewardModal(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6b7280",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  background: "#f8f9ff",
                  border: "1px solid #e8eaf0",
                  borderRadius: "6px",
                  padding: "12px",
                  marginBottom: "20px",
                }}
              >
                <img
                  src={`${API_BASE}${rewardModal.image_url}`}
                  alt={rewardModal.name}
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "6px",
                    objectFit: "cover",
                  }}
                />
                <div>
                  <p style={{ fontWeight: 600, fontSize: "14px" }}>
                    {rewardModal.name}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "2px",
                    }}
                  >
                    Age: {rewardModal.age || "—"}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: rewardModal.reward > 0 ? "#92400e" : "#9ca3af",
                      marginTop: "2px",
                      fontWeight: 600,
                    }}
                  >
                    Current reward:{" "}
                    {rewardModal.reward > 0
                      ? `₹${rewardModal.reward.toLocaleString()}`
                      : "None"}
                  </p>
                </div>
              </div>

              <label className="form-label">Reward Amount (₹)</label>
              <input
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                placeholder="Enter amount e.g. 50000"
                className="form-input"
                type="number"
                min="0"
                style={{ marginBottom: "12px" }}
              />

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginBottom: "20px",
                }}
              >
                {[5000, 10000, 25000, 50000, 100000].map((a) => (
                  <button
                    key={a}
                    onClick={() => setRewardAmount(String(a))}
                    className="reward-quick-btn"
                    style={{
                      background:
                        rewardAmount === String(a) ? "#1a3a6b" : "#f4f6f9",
                      color: rewardAmount === String(a) ? "#fff" : "#374151",
                      borderColor:
                        rewardAmount === String(a) ? "#1a3a6b" : "#e8eaf0",
                    }}
                  >
                    ₹{a.toLocaleString()}
                  </button>
                ))}
              </div>

              {rewardAmount && (
                <div
                  style={{
                    background: "#fef3c7",
                    border: "1px solid #fcd34d",
                    borderRadius: "4px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#92400e",
                      fontWeight: 500,
                    }}
                  >
                    🏆 Setting reward of{" "}
                    <strong>₹{parseInt(rewardAmount).toLocaleString()}</strong>{" "}
                    for {rewardModal.name}. This will be visible on the public
                    portal.
                  </p>
                </div>
              )}

              <button
                onClick={handleSetReward}
                disabled={!rewardAmount || rewardSaving}
                className="btn-primary"
                style={{ width: "100%" }}
              >
                {rewardSaving
                  ? "Saving..."
                  : `✅ Set Reward ₹${rewardAmount ? parseInt(rewardAmount).toLocaleString() : "0"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======== REPLY MODAL ======== */}
      {replyModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setReplyModal(null);
            setReplyResult(null);
          }}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: "15px", fontWeight: 600 }}>
                📧 Reply to {replyModal.reporter_name}
              </h3>
              <button
                onClick={() => {
                  setReplyModal(null);
                  setReplyResult(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6b7280",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* Reporter details */}
              <div
                style={{
                  background: "#f8f9ff",
                  border: "1px solid #e8eaf0",
                  borderRadius: "6px",
                  padding: "12px 14px",
                  marginBottom: "16px",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#1a3a6b",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: ".5px",
                  }}
                >
                  Reporter Details
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                  }}
                >
                  {[
                    { icon: "👤", label: replyModal.reporter_name },
                    { icon: "📧", label: replyModal.reporter_email },
                    { icon: "📱", label: replyModal.reporter_phone },
                    { icon: "📍", label: replyModal.sighting_location },
                  ].map((r, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: "12px",
                        color: "#374151",
                        display: "flex",
                        gap: "5px",
                        alignItems: "center",
                      }}
                    >
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </div>
                  ))}
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginTop: "6px",
                  }}
                >
                  🔎 Tip for: <strong>{replyModal.person_name}</strong>
                  {replyModal.reward > 0 && (
                    <span
                      style={{
                        marginLeft: "8px",
                        color: "#92400e",
                        fontWeight: 700,
                      }}
                    >
                      🏆 ₹{replyModal.reward?.toLocaleString()}
                    </span>
                  )}
                </p>
              </div>

              {replyResult ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: "40px", marginBottom: "10px" }}>
                    {replyResult.email_sent ? "✅" : "💾"}
                  </div>
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: replyResult.success ? "#15803d" : "#dc2626",
                      marginBottom: "8px",
                    }}
                  >
                    {replyResult.email_sent
                      ? "Email Sent Successfully!"
                      : "Reply Saved"}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      lineHeight: 1.6,
                    }}
                  >
                    {replyResult.msg}
                  </p>
                  <button
                    onClick={() => setReplyResult(null)}
                    className="btn-primary"
                    style={{ marginTop: "16px" }}
                  >
                    Send Another Reply
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendReply}>
                  {/* Quick Templates */}
                  <div style={{ marginBottom: "14px" }}>
                    <p className="form-label" style={{ marginBottom: "8px" }}>
                      Quick Templates
                    </p>
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      {[
                        {
                          label: "Thank You",
                          subject: `Re: Tip for ${replyModal.person_name}`,
                          msg: `Dear ${replyModal.reporter_name},\n\nThank you for your valuable tip regarding ${replyModal.person_name}. Our team is currently verifying the information provided. We will contact you once the verification is complete.\n\nYour reference ID: ${replyModal.id?.substring(0, 8).toUpperCase()}\n\nRegards,\nNational Missing Persons Portal`,
                        },
                        {
                          label: "✅ Verified + Reward",
                          subject: `Tip Verified - Reward for ${replyModal.person_name}`,
                          msg: `Dear ${replyModal.reporter_name},\n\nWe are pleased to inform you that your tip has been verified and was instrumental in locating ${replyModal.person_name}.\n\nThe reward of ₹${replyModal.reward?.toLocaleString() || "___"} will be processed within 7 working days to your registered contact.\n\nThank you for your service to the nation.\n\nRegards,\nNational Missing Persons Portal`,
                        },
                        {
                          label: "Need More Info",
                          subject: `Additional Information Required - ${replyModal.person_name}`,
                          msg: `Dear ${replyModal.reporter_name},\n\nThank you for your tip. To proceed with verification, we need some additional information:\n\n- Exact date and time of sighting\n- Any additional photos if available\n- Any other details you remember\n\nPlease reply to this email with the above information.\n\nRegards,\nNational Missing Persons Portal`,
                        },
                      ].map((t, i) => (
                        <button
                          type="button"
                          key={i}
                          className="template-btn"
                          onClick={() => {
                            setReplySubject(t.subject);
                            setReplyMessage(t.msg);
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <label className="form-label">Subject *</label>
                    <input
                      value={replySubject}
                      onChange={(e) => setReplySubject(e.target.value)}
                      placeholder={`Re: Tip for ${replyModal.person_name}`}
                      className="form-input"
                      required
                    />
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <label className="form-label">Message *</label>
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Write your reply..."
                      className="form-input"
                      rows={6}
                      required
                      style={{
                        resize: "vertical",
                        fontFamily: "Inter,sans-serif",
                      }}
                    />
                  </div>

                  {/* SMTP Settings */}
                  <div
                    style={{
                      background: "#fffbeb",
                      border: "1px solid #fcd34d",
                      borderRadius: "4px",
                      padding: "14px",
                      marginBottom: "14px",
                    }}
                  >
                    <p
                      className="form-label"
                      style={{ color: "#92400e", marginBottom: "10px" }}
                    >
                      📨 Gmail SMTP — To Actually Send Email (Optional)
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <label
                          className="form-label"
                          style={{ color: "#92400e", fontSize: "10px" }}
                        >
                          Gmail Address
                        </label>
                        <input
                          value={smtpEmail}
                          onChange={(e) => setSmtpEmail(e.target.value)}
                          placeholder="admin@gmail.com"
                          className="form-input"
                          style={{ fontSize: "12px" }}
                        />
                      </div>
                      <div>
                        <label
                          className="form-label"
                          style={{ color: "#92400e", fontSize: "10px" }}
                        >
                          App Password
                        </label>
                        <input
                          type="password"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          placeholder="Gmail App Password"
                          className="form-input"
                          style={{ fontSize: "12px" }}
                        />
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#92400e",
                        marginTop: "8px",
                        lineHeight: 1.5,
                      }}
                    >
                      Leave blank to only save reply in database without sending
                      email.
                      <br />
                      Use Gmail App Password from Google Account → Security →
                      2FA → App Passwords.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={replySending}
                    className="btn-primary"
                    style={{ width: "100%" }}
                  >
                    {replySending
                      ? "Sending..."
                      : smtpEmail
                        ? `📧 Send Email to ${replyModal.reporter_email}`
                        : "💾 Save Reply (No Email)"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="topbar">
        <span>🇮🇳 Government of India — Ministry of Home Affairs</span>
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            className={`ws-dot ${wsStatus === "connected" ? "ws-on" : "ws-off"}`}
          />
          Live: {wsStatus === "connected" ? "Connected" : "Reconnecting..."}
        </span>
      </div>

      {/* Header */}
      <div className="header">
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
              🛡️
            </div>
          </Link>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#1a3a6b" }}>
              Admin Control Panel
            </h1>
            <p style={{ fontSize: "11px", color: "#666" }}>
              National Missing Persons Identification Portal
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/missing-people" className="nav-btn">
            🏆 Public Portal
          </Link>
          <Link href="/" className="nav-btn">
            ← Home
          </Link>
          <Link href="/camera" className="nav-btn">
            📱 Camera
          </Link>
        </div>
      </div>
      <div className="saffron" />

      <main
        style={{ maxWidth: "1300px", margin: "0 auto", padding: "28px 24px" }}
      >
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card accent">
            <div className="stat-label">Active Cases</div>
            <div className="stat-num" style={{ color: "#1a1a2e" }}>
              {persons.length}
            </div>
            <div className="stat-sub">Registered persons</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Matches Found</div>
            <div className="stat-num" style={{ color: "#166534" }}>
              {matches.length}
            </div>
            <div className="stat-sub">AI detections</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Unread Alerts</div>
            <div
              className="stat-num"
              style={{ color: unread > 0 ? "#dc2626" : "#9ca3af" }}
            >
              {unread}
            </div>
            <div className="stat-sub">Pending review</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Tips Received</div>
            <div
              className="stat-num"
              style={{ color: pendingTips > 0 ? "#d97706" : "#1a1a2e" }}
            >
              {tips.length}
            </div>
            <div className="stat-sub">{pendingTips} pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">System</div>
            <div
              className="stat-num"
              style={{
                fontSize: "14px",
                marginTop: "8px",
                color: wsStatus === "connected" ? "#166534" : "#dc2626",
              }}
            >
              {wsStatus === "connected" ? "● Live" : "● Offline"}
            </div>
            <div className="stat-sub">WebSocket</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          <button
            onClick={() => setTab("alerts")}
            className={`tab-btn ${tab === "alerts" ? "active" : ""}`}
          >
            🔔 Alerts
            {unread > 0 && (
              <span
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: "10px",
                  padding: "2px 7px",
                  borderRadius: "20px",
                  fontWeight: 700,
                }}
              >
                {unread}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("tips")}
            className={`tab-btn ${tab === "tips" ? "active" : ""}`}
          >
            💡 Tips & Rewards
            {pendingTips > 0 && (
              <span
                style={{
                  background: "#d97706",
                  color: "#fff",
                  fontSize: "10px",
                  padding: "2px 7px",
                  borderRadius: "20px",
                  fontWeight: 700,
                }}
              >
                {pendingTips}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("matches")}
            className={`tab-btn ${tab === "matches" ? "active" : ""}`}
          >
            🎯 Matches ({matches.length})
          </button>
          <button
            onClick={() => setTab("persons")}
            className={`tab-btn ${tab === "persons" ? "active" : ""}`}
          >
            👥 Cases ({persons.length})
          </button>
        </div>

        {/* ====== ALERTS TAB ====== */}
        {tab === "alerts" && (
          <div className="panel">
            {alerts.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔕</div>
                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  No Alerts
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#9ca3af",
                    marginTop: "4px",
                  }}
                >
                  Alerts appear here when matches or tips are received
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
                        marginBottom: "6px",
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
                        className="badge-pill"
                        style={{
                          background:
                            a.type === "new_tip"
                              ? "#fef3c7"
                              : a.type === "video_match"
                                ? "#ede9fe"
                                : a.type === "cctv_match"
                                  ? "#fee2e2"
                                  : "#dcfce7",
                          color:
                            a.type === "new_tip"
                              ? "#92400e"
                              : a.type === "video_match"
                                ? "#5b21b6"
                                : a.type === "cctv_match"
                                  ? "#991b1b"
                                  : "#166534",
                        }}
                      >
                        {a.type === "new_tip"
                          ? "💡 Tip"
                          : a.type === "video_match"
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
                        ⏱ Timestamp: <strong>{a.timestamp}</strong>
                      </p>
                    )}
                    {!a.read && (a.frame_url || a.person_image_url) && (
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          marginTop: "10px",
                        }}
                      >
                        {a.person_image_url && (
                          <div>
                            <p
                              style={{
                                fontSize: "10px",
                                fontWeight: 600,
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: ".5px",
                                marginBottom: "4px",
                              }}
                            >
                              Registered
                            </p>
                            <img
                              src={`${API_BASE}${a.person_image_url}`}
                              alt="registered"
                              style={{
                                width: "64px",
                                height: "64px",
                                objectFit: "cover",
                                borderRadius: "4px",
                                border: "1px solid #d1d5db",
                              }}
                            />
                          </div>
                        )}
                        {a.frame_url && (
                          <div>
                            <p
                              style={{
                                fontSize: "10px",
                                fontWeight: 600,
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: ".5px",
                                marginBottom: "4px",
                              }}
                            >
                              Captured
                            </p>
                            <img
                              src={`${API_BASE}${a.frame_url}`}
                              alt="captured"
                              style={{
                                width: "64px",
                                height: "64px",
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
                      gap: "8px",
                      flexShrink: 0,
                    }}
                  >
                    {a.confidence && (
                      <span
                        style={{
                          fontSize: "22px",
                          fontWeight: 700,
                          color: a.confidence > 75 ? "#166534" : "#92400e",
                        }}
                      >
                        {a.confidence}%
                      </span>
                    )}
                    {!a.read && (
                      <button
                        onClick={() => handleMarkRead(a.id)}
                        className="btn-sm"
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

        {/* ====== TIPS TAB ====== */}
        {tab === "tips" && (
          <div>
            {tips.length === 0 ? (
              <div className="panel">
                <div className="empty-state">
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                    💡
                  </div>
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    No Tips Yet
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#9ca3af",
                      marginTop: "4px",
                    }}
                  >
                    Tips submitted from public portal appear here
                  </p>
                  <Link
                    href="/missing-people"
                    style={{
                      marginTop: "16px",
                      display: "inline-block",
                      background: "#1a3a6b",
                      color: "#fff",
                      padding: "10px 20px",
                      borderRadius: "4px",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    View Public Portal →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="panel">
                {tips.map((t) => {
                  const sc =
                    tipStatusConfig[t.status] || tipStatusConfig.pending;
                  return (
                    <div key={t.id} className="tip-card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "16px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: "260px" }}>
                          {/* Status + meta row */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              marginBottom: "12px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              className="badge-pill"
                              style={{ background: sc.bg, color: sc.color }}
                            >
                              {sc.label}
                            </span>
                            <span
                              style={{ fontSize: "12px", color: "#9ca3af" }}
                            >
                              {new Date(t.created_at).toLocaleString()}
                            </span>
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#374151",
                              }}
                            >
                              For: <strong>{t.person_name}</strong>
                            </span>
                            {t.reward > 0 && (
                              <span
                                className="badge-pill"
                                style={{
                                  background: "#fef3c7",
                                  color: "#92400e",
                                }}
                              >
                                🏆 ₹{t.reward.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* Reporter info boxes */}
                          <div className="reporter-info-grid">
                            <div className="reporter-info-box">
                              <p
                                style={{
                                  fontSize: "10px",
                                  color: "#6b7280",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: ".5px",
                                }}
                              >
                                Reporter
                              </p>
                              <p
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  marginTop: "2px",
                                }}
                              >
                                {t.reporter_name}
                              </p>
                            </div>
                            <div className="reporter-info-box">
                              <p
                                style={{
                                  fontSize: "10px",
                                  color: "#6b7280",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: ".5px",
                                }}
                              >
                                Email
                              </p>
                              <p
                                style={{
                                  fontSize: "12px",
                                  color: "#1a3a6b",
                                  marginTop: "2px",
                                }}
                              >
                                {t.reporter_email}
                              </p>
                            </div>
                            <div className="reporter-info-box">
                              <p
                                style={{
                                  fontSize: "10px",
                                  color: "#6b7280",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: ".5px",
                                }}
                              >
                                Phone
                              </p>
                              <p style={{ fontSize: "13px", marginTop: "2px" }}>
                                {t.reporter_phone}
                              </p>
                            </div>
                            <div className="reporter-info-box">
                              <p
                                style={{
                                  fontSize: "10px",
                                  color: "#6b7280",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: ".5px",
                                }}
                              >
                                Location
                              </p>
                              <p style={{ fontSize: "13px", marginTop: "2px" }}>
                                {t.sighting_location}
                              </p>
                            </div>
                          </div>

                          {t.description && (
                            <div
                              style={{
                                background: "#f9fafb",
                                borderLeft: "3px solid #e8eaf0",
                                padding: "10px 12px",
                                borderRadius: "0 4px 4px 0",
                                marginBottom: "10px",
                                fontSize: "13px",
                                color: "#374151",
                                lineHeight: 1.6,
                              }}
                            >
                              {t.description}
                            </div>
                          )}

                          {/* Submitted photo */}
                          {t.photo_url && (
                            <div style={{ marginBottom: "10px" }}>
                              <p
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  color: "#6b7280",
                                  textTransform: "uppercase",
                                  letterSpacing: ".5px",
                                  marginBottom: "6px",
                                }}
                              >
                                Submitted Photo
                              </p>
                              <img
                                src={`${API_BASE}${t.photo_url}`}
                                alt="tip photo"
                                style={{
                                  width: "120px",
                                  height: "90px",
                                  objectFit: "cover",
                                  borderRadius: "4px",
                                  border: "1px solid #e8eaf0",
                                }}
                              />
                            </div>
                          )}

                          {/* Previous reply indicator */}
                          {t.admin_reply && (
                            <div
                              style={{
                                background: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                borderRadius: "4px",
                                padding: "10px 12px",
                              }}
                            >
                              <p
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  color: "#166534",
                                  textTransform: "uppercase",
                                  letterSpacing: ".5px",
                                  marginBottom: "3px",
                                }}
                              >
                                ✅ Reply Already Sent
                              </p>
                              <p
                                style={{
                                  fontSize: "12px",
                                  color: "#374151",
                                  lineHeight: 1.5,
                                }}
                              >
                                {t.admin_reply.substring(0, 120)}
                                {t.admin_reply.length > 120 ? "..." : ""}
                              </p>
                              {t.admin_replied_at && (
                                <p
                                  style={{
                                    fontSize: "11px",
                                    color: "#9ca3af",
                                    marginTop: "3px",
                                  }}
                                >
                                  {new Date(
                                    t.admin_replied_at,
                                  ).toLocaleString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            flexShrink: 0,
                            minWidth: "150px",
                          }}
                        >
                          <button
                            onClick={() => {
                              setReplyModal(t);
                              setReplySubject(`Re: Tip for ${t.person_name}`);
                              setReplyMessage("");
                              setReplyResult(null);
                            }}
                            className="btn-primary"
                            style={{
                              fontSize: "12px",
                              padding: "9px 14px",
                              textAlign: "center",
                            }}
                          >
                            📧 Reply via Email
                          </button>

                          <select
                            value={t.status}
                            onChange={(e) =>
                              handleUpdateTipStatus(t.id, e.target.value)
                            }
                            style={{
                              padding: "8px 10px",
                              borderRadius: "4px",
                              border: "1px solid #d1d5db",
                              fontFamily: "Inter,sans-serif",
                              fontSize: "12px",
                              cursor: "pointer",
                              background: "#fff",
                              color: "#1a1a2e",
                            }}
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="verified">✅ Verified</option>
                            <option value="rejected">❌ Rejected</option>
                            <option value="rewarded">🏆 Rewarded</option>
                          </select>

                          <p
                            style={{
                              fontSize: "10px",
                              color: "#9ca3af",
                              textAlign: "center",
                            }}
                          >
                            ID: {t.id?.substring(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ====== MATCHES TAB ====== */}
        {tab === "matches" && (
          <div className="panel">
            {matches.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎯</div>
                <p
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  No Matches Yet
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#9ca3af",
                    marginTop: "4px",
                  }}
                >
                  Matches appear after video or camera scans
                </p>
              </div>
            ) : (
              matches.map((m) => (
                <div
                  key={m.id}
                  style={{
                    borderBottom: "1px solid #f0f2f7",
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        className="badge-pill"
                        style={{
                          background: sourceBg(m.source),
                          color: sourceColor(m.source),
                        }}
                      >
                        {sourceLabel(m.source)}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: 600 }}>
                        {m.person_name}
                      </span>
                      {m.stream_name && (
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
                          / {m.stream_name}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "22px",
                        fontWeight: 700,
                        color:
                          (m.best_confidence || m.confidence) > 75
                            ? "#166534"
                            : "#92400e",
                      }}
                    >
                      {m.best_confidence || m.confidence}%
                    </span>
                  </div>

                  {(m.source === "mobile_camera" || m.source === "cctv") && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                        maxWidth: "400px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#6b7280",
                            textTransform: "uppercase",
                            letterSpacing: ".5px",
                            marginBottom: "5px",
                          }}
                        >
                          Registered Photo
                        </p>
                        {m.person_image_url && (
                          <img
                            src={`${API_BASE}${m.person_image_url}`}
                            alt="registered"
                            style={{
                              width: "100%",
                              height: "120px",
                              objectFit: "cover",
                              borderRadius: "4px",
                              border: "1px solid #e8eaf0",
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "#6b7280",
                            textTransform: "uppercase",
                            letterSpacing: ".5px",
                            marginBottom: "5px",
                          }}
                        >
                          Captured Frame
                        </p>
                        {m.frame_url && (
                          <img
                            src={`${API_BASE}${m.frame_url}`}
                            alt="captured"
                            style={{
                              width: "100%",
                              height: "120px",
                              objectFit: "cover",
                              borderRadius: "4px",
                              border: "2px solid #1a3a6b",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {m.source === "video" && m.matches && (
                    <div>
                      <p
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: ".5px",
                          marginBottom: "8px",
                        }}
                      >
                        Matched Frames
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        {m.matches.slice(0, 5).map((f: any, i: number) => (
                          <div key={i} style={{ width: "110px" }}>
                            {f.frame_path && (
                              <img
                                src={`${API_BASE}/${f.frame_path}`}
                                alt={`t=${f.timestamp}`}
                                style={{
                                  width: "110px",
                                  height: "80px",
                                  objectFit: "cover",
                                  borderRadius: "4px",
                                  border: "1px solid #e8eaf0",
                                  display: "block",
                                }}
                              />
                            )}
                            <p
                              style={{
                                fontSize: "11px",
                                color: "#1a3a6b",
                                fontWeight: 600,
                                marginTop: "4px",
                              }}
                            >
                              ⏱ {f.timestamp}
                            </p>
                            <p
                              style={{
                                fontSize: "11px",
                                color: "#166534",
                                fontWeight: 700,
                              }}
                            >
                              {f.confidence}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.source === "group_photo" && m.frame_url && (
                    <div>
                      <p
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: ".5px",
                          marginBottom: "6px",
                        }}
                      >
                        Annotated Group Photo
                      </p>
                      <img
                        src={`${API_BASE}${m.frame_url}`}
                        alt="group annotated"
                        style={{
                          maxWidth: "400px",
                          width: "100%",
                          borderRadius: "4px",
                          border: "1px solid #e8eaf0",
                        }}
                      />
                    </div>
                  )}

                  <p
                    style={{
                      fontSize: "11px",
                      color: "#9ca3af",
                      marginTop: "10px",
                    }}
                  >
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ====== CASES TAB ====== */}
        {tab === "persons" && (
          <div>
            {persons.length === 0 ? (
              <div className="panel">
                <div className="empty-state">
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                    👤
                  </div>
                  <p
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    No Cases Registered
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#9ca3af",
                      marginTop: "4px",
                    }}
                  >
                    Go to main portal to register persons
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
                  gap: "16px",
                }}
              >
                {persons.map((p) => (
                  <div
                    key={p.id}
                    className="panel"
                    style={{ overflow: "visible" }}
                  >
                    <img
                      src={`${API_BASE}${p.image_url}`}
                      alt={p.name}
                      style={{
                        width: "100%",
                        height: "180px",
                        objectFit: "cover",
                        display: "block",
                        borderRadius: "6px 6px 0 0",
                      }}
                    />
                    <div style={{ padding: "14px 16px" }}>
                      <p style={{ fontSize: "14px", fontWeight: 600 }}>
                        {p.name}
                      </p>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "3px",
                        }}
                      >
                        Age: {p.age || "—"}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "8px",
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
                        {p.reward > 0 ? (
                          <span
                            style={{
                              background: "#fef3c7",
                              color: "#92400e",
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "3px 10px",
                              borderRadius: "20px",
                            }}
                          >
                            🏆 ₹{p.reward.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                            No reward
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setRewardModal(p);
                          setRewardAmount(p.reward ? String(p.reward) : "");
                        }}
                        style={{
                          width: "100%",
                          marginTop: "10px",
                          background: "#f4f6f9",
                          border: "1px solid #e8eaf0",
                          padding: "8px",
                          borderRadius: "4px",
                          fontFamily: "Inter,sans-serif",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          color: "#374151",
                          transition: "all .15s",
                        }}
                        onMouseOver={(e) => {
                          (e.target as HTMLElement).style.background =
                            "#f0f4ff";
                          (e.target as HTMLElement).style.borderColor =
                            "#1a3a6b";
                        }}
                        onMouseOut={(e) => {
                          (e.target as HTMLElement).style.background =
                            "#f4f6f9";
                          (e.target as HTMLElement).style.borderColor =
                            "#e8eaf0";
                        }}
                      >
                        🏆 {p.reward > 0 ? "Update Reward" : "Set Reward"}
                      </button>
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
          National Missing Persons Identification Portal — Ministry of Home
          Affairs, Government of India
        </p>
      </footer>
    </div>
  );
}
