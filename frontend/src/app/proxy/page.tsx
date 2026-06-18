"use client";

import { useState } from "react";

export default function ProxyPage() {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("spouse");
  const [permissions, setPermissions] = useState({
    view: false,
    act: false,
    notify: false,
  });
  const [expiry, setExpiry] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const infoBannerStyle: React.CSSProperties = {
    background: "#eaf4fb",
    border: "1px solid #aed6f1",
    borderLeft: "4px solid #2980b9",
    borderRadius: 8,
    padding: "14px 18px",
    color: "#1a5276",
    fontSize: 14,
    lineHeight: 1.6,
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 10,
    padding: "24px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "#333",
    display: "block",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    fontSize: 14,
    border: "1px solid #ccc",
    borderRadius: 6,
    boxSizing: "border-box",
    color: "#222",
    background: "#fff",
  };

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page heading */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a2c3d", margin: 0 }}>
          Proxy Access
        </h1>
        <p style={{ fontSize: 14, color: "#666", marginTop: 6 }}>
          Authorise a trusted person to manage your CPF correspondence
        </p>
      </div>

      {/* Info banner */}
      <div style={infoBannerStyle}>
        <strong>What is Proxy Access?</strong> Proxy Access lets you authorise a trusted family
        member or caregiver to view your CPF correspondence and interact with PULSE on your behalf.
        This is especially useful for elderly residents or those with accessibility needs. You can
        set specific permissions and an expiry date, and revoke access at any time.
      </div>

      {/* Active proxies */}
      <section>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#1a2c3d",
            marginBottom: 12,
          }}
        >
          Active Proxies
        </h2>
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: "36px 24px",
            color: "#888",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#555", marginBottom: 6 }}>
            No active proxies
          </div>
          <p style={{ fontSize: 14, color: "#999", margin: 0, maxWidth: 380, marginInline: "auto" }}>
            Proxies you grant will appear here. Each proxy shows the person&apos;s name,
            relationship, permissions, and expiry date.
          </p>
        </div>
      </section>

      {/* Grant access form */}
      <section>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#1a2c3d",
            marginBottom: 12,
          }}
        >
          Grant Proxy Access
        </h2>

        {submitted ? (
          <div
            style={{
              ...cardStyle,
              background: "#eafaf1",
              border: "1px solid #a9dfbf",
              borderLeft: "4px solid #27ae60",
              color: "#1e8449",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              Request submitted (demo)
            </div>
            <p style={{ fontSize: 14, margin: 0 }}>
              In a live system, an authorisation request would be sent to{" "}
              <strong>{name || "the named person"}</strong> for confirmation via SingPass. This is a
              demo &mdash; no data was saved.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setName("");
                setPermissions({ view: false, act: false, notify: false });
                setExpiry("");
              }}
              style={{
                marginTop: 14,
                background: "#27ae60",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 18px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Add Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={cardStyle}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 20,
              }}
            >
              {/* Name */}
              <div>
                <label htmlFor="proxy-name" style={labelStyle}>
                  Full Name <span style={{ color: "#e74c3c" }}>*</span>
                </label>
                <input
                  id="proxy-name"
                  type="text"
                  required
                  placeholder="e.g. Tan Mei Ling"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Relationship */}
              <div>
                <label htmlFor="proxy-relationship" style={labelStyle}>
                  Relationship <span style={{ color: "#e74c3c" }}>*</span>
                </label>
                <select
                  id="proxy-relationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  style={inputStyle}
                >
                  <option value="spouse">Spouse</option>
                  <option value="child">Child / Adult Child</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="caregiver">Hired Caregiver</option>
                  <option value="coordinator">Community Coordinator</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Expiry */}
              <div>
                <label htmlFor="proxy-expiry" style={labelStyle}>
                  Access Expiry Date
                </label>
                <input
                  id="proxy-expiry"
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  style={inputStyle}
                />
                <span style={{ fontSize: 12, color: "#999", marginTop: 4, display: "block" }}>
                  Leave blank for no expiry
                </span>
              </div>
            </div>

            {/* Permissions */}
            <div style={{ marginTop: 20 }}>
              <span style={labelStyle}>Permissions</span>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                {(
                  [
                    {
                      key: "view" as const,
                      label: "View Correspondence",
                      desc: "Can read letters and notices",
                    },
                    {
                      key: "act" as const,
                      label: "Act on Behalf",
                      desc: "Can send messages via PULSE Chat",
                    },
                    {
                      key: "notify" as const,
                      label: "Receive Notifications",
                      desc: "Gets alerts for new mail",
                    },
                  ] as const
                ).map(({ key, label, desc }) => (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      background: permissions[key] ? "#eaf4fb" : "#f9f9f9",
                      border: `1px solid ${permissions[key] ? "#aed6f1" : "#e0e0e0"}`,
                      borderRadius: 8,
                      padding: "12px 14px",
                      cursor: "pointer",
                      flex: "1 1 190px",
                      minWidth: 170,
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={permissions[key]}
                      onChange={() => togglePermission(key)}
                      style={{ marginTop: 2, flexShrink: 0, cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2c3d" }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                style={{
                  background: "#1a5276",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 24px",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Grant Access
              </button>
              <span style={{ fontSize: 13, color: "#999" }}>
                The proxy will be asked to confirm via SingPass before access is active.
              </span>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
