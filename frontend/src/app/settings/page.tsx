"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [language, setLanguage] = useState("en");
  const [dialect, setDialect] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [notifyPush, setNotifyPush] = useState(false);
  const [fontSize, setFontSize] = useState("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 10,
    padding: "24px",
  };

  const sectionHeadStyle: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: "#1a2c3d",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: "1px solid #f0f0f0",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "#333",
    display: "block",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px",
    fontSize: 14,
    border: "1px solid #ccc",
    borderRadius: 6,
    color: "#222",
    background: "#fff",
    width: "100%",
    maxWidth: 320,
    boxSizing: "border-box",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #f5f5f5",
    gap: 16,
    flexWrap: "wrap",
  };

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: 44,
    height: 24,
    borderRadius: 12,
    background: on ? "#2980b9" : "#ccc",
    position: "relative",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background 0.2s",
    border: "none",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Heading */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a2c3d", margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 14, color: "#666", marginTop: 6 }}>
          Manage your language, notification, and accessibility preferences
        </p>
      </div>

      {saved && (
        <div
          style={{
            background: "#eafaf1",
            border: "1px solid #a9dfbf",
            borderLeft: "4px solid #27ae60",
            borderRadius: 8,
            padding: "12px 18px",
            fontSize: 14,
            color: "#1e8449",
            fontWeight: 600,
          }}
        >
          Preferences saved (demo &mdash; no data persisted)
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Language & Voice */}
        <section style={cardStyle}>
          <h2 style={sectionHeadStyle}>Language &amp; Voice</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
              marginBottom: 20,
            }}
          >
            <div>
              <label htmlFor="preferred-language" style={labelStyle}>
                Preferred Language
              </label>
              <select
                id="preferred-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={inputStyle}
              >
                <option value="en">English</option>
                <option value="zh">中文 (Mandarin)</option>
                <option value="ms">Bahasa Melayu (Malay)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="ml">Malayalam</option>
                <option value="pa">Punjabi</option>
              </select>
            </div>

            <div>
              <label htmlFor="preferred-dialect" style={labelStyle}>
                Dialect (optional)
              </label>
              <select
                id="preferred-dialect"
                value={dialect}
                onChange={(e) => setDialect(e.target.value)}
                style={inputStyle}
              >
                <option value="">None</option>
                <optgroup label="Chinese Dialects">
                  <option value="zh-hok">福建话 (Hokkien)</option>
                  <option value="zh-can">广东话 (Cantonese)</option>
                  <option value="zh-teo">潮州话 (Teochew)</option>
                  <option value="zh-hak">客家话 (Hakka)</option>
                  <option value="zh-hai">海南话 (Hainanese)</option>
                </optgroup>
                <optgroup label="Malay Varieties">
                  <option value="ms-bms">Bazaar Melayu</option>
                  <option value="ms-jav">Javanese</option>
                </optgroup>
                <optgroup label="Indian Varieties">
                  <option value="ta-sin">Singapore Tamil</option>
                  <option value="ta-spo">Spoken Tamil</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div style={rowStyle}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a2c3d" }}>Voice Replies</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                PULSE reads responses aloud via text-to-speech (MMS-TTS)
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVoiceEnabled((v) => !v)}
              style={toggleStyle(voiceEnabled)}
              aria-label={`Voice replies ${voiceEnabled ? "on" : "off"}`}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: voiceEnabled ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                }}
              />
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section style={cardStyle}>
          <h2 style={sectionHeadStyle}>Notifications</h2>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 16, marginTop: -6 }}>
            Choose how PULSE notifies you when new correspondence arrives.
          </p>

          {(
            [
              {
                id: "notify-email",
                label: "Email Notifications",
                desc: "New letters sent to your registered email",
                value: notifyEmail,
                set: setNotifyEmail,
              },
              {
                id: "notify-sms",
                label: "SMS Notifications",
                desc: "Alert to your registered mobile number",
                value: notifySms,
                set: setNotifySms,
              },
              {
                id: "notify-push",
                label: "Push Notifications",
                desc: "Browser push alerts when you are online",
                value: notifyPush,
                set: setNotifyPush,
              },
            ] as const
          ).map(({ id, label, desc, value, set }) => (
            <div key={id} style={rowStyle}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a2c3d" }}>{label}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{desc}</div>
              </div>
              <button
                type="button"
                onClick={() => set((v) => !v)}
                style={toggleStyle(value)}
                aria-label={`${label} ${value ? "on" : "off"}`}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: value ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
          ))}
        </section>

        {/* Accessibility */}
        <section style={cardStyle}>
          <h2 style={sectionHeadStyle}>Accessibility</h2>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="font-size" style={labelStyle}>
              Text Size
            </label>
            <select
              id="font-size"
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              style={inputStyle}
            >
              <option value="normal">Normal (18px)</option>
              <option value="large">Large (22px)</option>
              <option value="extra-large">Extra Large (26px)</option>
            </select>
          </div>

          <div style={rowStyle}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a2c3d" }}>
                High Contrast Mode
              </div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                Increases contrast for better readability
              </div>
            </div>
            <button
              type="button"
              onClick={() => setHighContrast((v) => !v)}
              style={toggleStyle(highContrast)}
              aria-label={`High contrast ${highContrast ? "on" : "off"}`}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: highContrast ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                }}
              />
            </button>
          </div>
        </section>

        {/* About PULSE */}
        <section style={cardStyle}>
          <h2 style={sectionHeadStyle}>About PULSE</h2>
          <p style={{ fontSize: 14, color: "#444", lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: "#1a2c3d" }}>
              PULSE (People-centric Framework for Correspondence)
            </strong>{" "}
            is an AI-powered multilingual assistant developed to help Singapore residents navigate
            CPF matters. It supports English, Mandarin, Malay, Tamil, Hindi, Malayalam, Punjabi, and
            several Chinese dialects including Hokkien, Cantonese, Teochew, Hakka, and Hainanese.
          </p>
          <p style={{ fontSize: 14, color: "#444", lineHeight: 1.7, marginTop: 12 }}>
            PULSE runs on Hugging Face Inference for speech recognition, translation, and voice
            synthesis. Escalated cases are handled by CCU officers via the live officer dashboard.
            Conversations are available via Telegram or the web interface.
          </p>
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              background: "#f5f7f9",
              borderRadius: 8,
              fontSize: 13,
              color: "#888",
            }}
          >
            Version: Davin branch &mdash; HF Inference edition &nbsp;|&nbsp; For official CPF
            enquiries:{" "}
            <a href="https://www.cpf.gov.sg" style={{ color: "#2980b9" }}>
              cpf.gov.sg
            </a>
          </div>
        </section>

        {/* Save button */}
        <div>
          <button
            type="submit"
            style={{
              background: "#1a5276",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "11px 28px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Save All Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
