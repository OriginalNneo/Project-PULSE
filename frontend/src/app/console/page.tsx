"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Console.module.css";
import { consoleApi } from "../../lib/console/api";
import type {
  CopilotResult,
  CorrespondenceCase,
  Customer,
  CustomerDetail,
  KnowledgeDoc,
  KnowledgeSection,
  NewCustomerInput,
  Stats,
} from "../../lib/console/types";

function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `S$${Math.round(n).toLocaleString()}`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-SG", { day: "2-digit", month: "short" });
}

const TIER_LABEL: Record<string, string> = {
  self_service: "Self-service",
  guided: "Guided",
  high_touch: "High-touch",
};

// ---------------------------------------------------------------------------

export default function ConsolePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [ageBracket, setAgeBracket] = useState("");
  const [tier, setTier] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [rightTab, setRightTab] = useState<"member" | "knowledge" | "new">("knowledge");
  const [knowledge, setKnowledge] = useState<{ sections: KnowledgeSection[]; documents: KnowledgeDoc[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(() => {
    consoleApi.getStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  const loadCustomers = useCallback(() => {
    consoleApi
      .listCustomers({ search: search || undefined, ageBracket: ageBracket || undefined, tier: tier || undefined })
      .then((r) => {
        setCustomers(r.items);
        setTotal(r.total);
      })
      .catch((e) => setError(e.message));
  }, [search, ageBracket, tier]);

  useEffect(() => {
    refreshStats();
    consoleApi.getKnowledge().then((k) => setKnowledge({ sections: k.sections, documents: k.documents })).catch(() => undefined);
  }, [refreshStats]);

  useEffect(() => {
    const t = setTimeout(loadCustomers, 200);
    return () => clearTimeout(t);
  }, [loadCustomers]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    consoleApi.getCustomer(selectedId).then(setDetail).catch((e) => setError(e.message));
  }, [selectedId]);

  function selectMember(id: string) {
    setSelectedId(id);
    setRightTab("member");
  }

  async function handleCreate(input: NewCustomerInput) {
    const created = await consoleApi.createCustomer(input);
    refreshStats();
    loadCustomers();
    setSelectedId(created.id);
    setDetail(created);
    setRightTab("member");
  }

  return (
    <div className={styles.page}>
      <h1>Data &amp; AI Console</h1>
      <p className={styles.lede}>
        A live window into the PULSE back end: the <strong>customer SQL database</strong> (SQLite), the{" "}
        <strong>CPF knowledge database</strong> (MongoDB document store, seeded from cpf.gov.sg), and the{" "}
        <strong>AI copilot</strong> that reads both in natural language. Browse members, key in new records, bring up
        cases, and ask the AI anything.
      </p>

      <div className={styles.dbflow}>
        <span className={styles.pill}>Member question</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.pill}>AI copilot (GLM)</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.pill}>SQLite · customers &amp; cases</span>
        <span className={styles.arrow}>+</span>
        <span className={styles.pill}>MongoDB · CPF knowledge</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.pill}>Grounded answer + citations</span>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <StatCards stats={stats} />

      <div className={styles.grid}>
        <section className={styles.panel} aria-label="Customer database">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Customer database</h2>
            <span className={styles.panelTag}>SQLite · {total} records</span>
          </div>
          <div className={styles.filters}>
            <input
              className={styles.input}
              placeholder="Search name, alias, persona…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search customers"
            />
            <div className={styles.filterRow}>
              <select className={styles.select} value={ageBracket} onChange={(e) => setAgeBracket(e.target.value)} aria-label="Age bracket">
                <option value="">All ages</option>
                <option value="under_35">Under 35</option>
                <option value="35_to_54">35–54</option>
                <option value="55_to_64">55–64</option>
                <option value="65_plus">65+</option>
              </select>
              <select className={styles.select} value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Support tier">
                <option value="">All tiers</option>
                <option value="self_service">Self-service</option>
                <option value="guided">Guided</option>
                <option value="high_touch">High-touch</option>
              </select>
            </div>
          </div>
          <div className={styles.list}>
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`${styles.listItem} ${selectedId === c.id ? styles.listItemActive : ""}`}
                onClick={() => selectMember(c.id)}
              >
                <span className={styles.listName}>{c.displayAlias}</span>{" "}
                <span className={`${styles.badge} ${styles[`tier_${c.vulnerabilityTier}`]}`}>{TIER_LABEL[c.vulnerabilityTier]}</span>
                <div className={styles.listMeta}>Age {c.age} · {c.persona}</div>
              </button>
            ))}
            {customers.length === 0 && <div className={styles.empty}>No members match these filters.</div>}
          </div>
        </section>

        <section className={styles.panel} aria-label="Detail panel">
          <div className={styles.panelHead}>
            <div className={styles.tabs}>
              <button type="button" className={`${styles.tab} ${rightTab === "member" ? styles.tabActive : ""}`} onClick={() => setRightTab("member")}>
                Member record
              </button>
              <button type="button" className={`${styles.tab} ${rightTab === "knowledge" ? styles.tabActive : ""}`} onClick={() => setRightTab("knowledge")}>
                CPF knowledge
              </button>
              <button type="button" className={`${styles.tab} ${rightTab === "new" ? styles.tabActive : ""}`} onClick={() => setRightTab("new")}>
                + Key in member
              </button>
            </div>
          </div>
          <div className={styles.panelBody}>
            {rightTab === "member" && (detail ? <MemberDetail detail={detail} /> : <div className={styles.empty}>Select a member from the list to bring up their record.</div>)}
            {rightTab === "knowledge" && <KnowledgeBrowser knowledge={knowledge} />}
            {rightTab === "new" && <NewMemberForm onCreate={handleCreate} />}
          </div>
        </section>
      </div>

      <CopilotPanel member={detail} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function StatCards({ stats }: { stats: Stats | null }) {
  if (!stats) return <div className={styles.statRow} aria-hidden="true" />;
  const c = stats.customers;
  return (
    <div className={styles.statRow}>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{c.totalCustomers}</div>
        <div className={styles.statLabel}>Members (SQLite)</div>
        <div className={styles.statSub}>{c.byAgeBracket["65_plus"] ?? 0} seniors · {c.byTier["high_touch"] ?? 0} high-touch</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{c.openCases}</div>
        <div className={styles.statLabel}>Open cases</div>
        <div className={styles.statSub}>{c.highPriorityCases} high-priority</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{money(c.totalCpfManaged)}</div>
        <div className={styles.statLabel}>CPF modelled</div>
        <div className={styles.statSub}>across all accounts</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{stats.knowledge.documents}</div>
        <div className={styles.statLabel}>CPF knowledge docs</div>
        <div className={styles.statSub}>{stats.knowledge.sections} sections · store: {stats.knowledge.backend}</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statValue} style={{ fontSize: 18 }}>{stats.ai.configured ? stats.ai.model : "offline"}</div>
        <div className={styles.statLabel}>AI copilot</div>
        <div className={styles.statSub}>{stats.ai.configured ? "live · grounded RAG" : "fallback mode"}</div>
      </div>
    </div>
  );
}

function MemberDetail({ detail }: { detail: CustomerDetail }) {
  const a = detail.cpfAccount;
  return (
    <div>
      <div className={styles.detailHead}>
        <h3 className={styles.detailName}>{detail.displayAlias}</h3>
        <span className={`${styles.badge} ${styles[`tier_${detail.vulnerabilityTier}`]}`}>{TIER_LABEL[detail.vulnerabilityTier]}</span>
      </div>
      <p className={styles.detailPersona}>{detail.persona}</p>

      <div className={styles.kv}>
        <div className={styles.kvItem}><div className={styles.kvLabel}>Age</div><div className={styles.kvValue}>{detail.age}</div></div>
        <div className={styles.kvItem}><div className={styles.kvLabel}>Language</div><div className={styles.kvValue}>{detail.preferredLanguage.toUpperCase()}{detail.dialect ? ` · ${detail.dialect}` : ""}</div></div>
        <div className={styles.kvItem}><div className={styles.kvLabel}>Employment</div><div className={styles.kvValue}>{detail.employmentStatus.replace("_", " ")}</div></div>
        <div className={styles.kvItem}><div className={styles.kvLabel}>Digital literacy</div><div className={styles.kvValue}>{detail.digitalLiteracy}</div></div>
      </div>

      {a && (
        <>
          <div className={styles.sectionLabel}>CPF accounts</div>
          <div className={styles.accounts}>
            <div className={styles.acct}><div className={styles.acctName}>Ordinary (OA)</div><div className={styles.acctVal}>{money(a.oaBalance)}</div></div>
            <div className={styles.acct}><div className={styles.acctName}>Special (SA)</div><div className={styles.acctVal}>{money(a.saBalance)}</div></div>
            <div className={styles.acct}><div className={styles.acctName}>MediSave (MA)</div><div className={styles.acctVal}>{money(a.maBalance)}</div></div>
            <div className={styles.acct}><div className={styles.acctName}>Retirement (RA)</div><div className={styles.acctVal}>{money(a.raBalance)}</div></div>
          </div>
          <div className={styles.kv}>
            <div className={styles.kvItem}><div className={styles.kvLabel}>Total CPF</div><div className={styles.kvValue}>{money(a.total)}</div></div>
            {a.retirementSumTarget && <div className={styles.kvItem}><div className={styles.kvLabel}>Retirement sum</div><div className={styles.kvValue}>{a.retirementSumTarget} · {money(a.retirementSumAmount)}</div></div>}
            {a.cpfLifePlan && <div className={styles.kvItem}><div className={styles.kvLabel}>CPF LIFE plan</div><div className={styles.kvValue} style={{ textTransform: "capitalize" }}>{a.cpfLifePlan}</div></div>}
            {a.monthlyPayoutEstimate != null && <div className={styles.kvItem}><div className={styles.kvLabel}>Est. payout/mo</div><div className={styles.kvValue}>{money(a.monthlyPayoutEstimate)}</div></div>}
          </div>
        </>
      )}

      {detail.vulnerabilityMarkers.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Vulnerability markers</div>
          <div className={styles.markerRow}>
            {detail.vulnerabilityMarkers.map((m) => (
              <span key={m.id} className={styles.marker}>{m.markerType.replace(/_/g, " ")} · {Math.round(m.confidence * 100)}%</span>
            ))}
          </div>
        </>
      )}

      <div className={styles.sectionLabel}>Correspondence cases ({detail.cases.length})</div>
      {detail.cases.length === 0 && <div className={styles.muted}>No cases on record.</div>}
      {detail.cases.map((c) => <CaseCard key={c.id} c={c} />)}
    </div>
  );
}

function CaseCard({ c }: { c: CorrespondenceCase }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.caseItem}>
      <div className={styles.caseTop}>
        <button type="button" className={styles.caseTitle} onClick={() => setOpen((v) => !v)}>{c.title}</button>
        <span className={`${styles.badge} ${styles[`prio_${c.priority}`]}`}>{c.priority}</span>
      </div>
      <div className={styles.caseRef}>{c.reference} · <span className={styles.status}>{c.status.replace("_", " ")}</span> · {c.category} · {shortDate(c.createdAt)}</div>
      {open && (
        <>
          <p className={styles.caseSummary}>{c.summary}</p>
          {c.events && c.events.length > 0 && (
            <div className={styles.timeline}>
              {c.events.map((e) => (
                <div key={e.id} className={styles.tlItem}>
                  <span className={styles.tlTime}>{shortDate(e.occurredAt)}</span> — {e.detail}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KnowledgeBrowser({ knowledge }: { knowledge: { sections: KnowledgeSection[]; documents: KnowledgeDoc[] } | null }) {
  const [activeSection, setActiveSection] = useState<string>("");
  if (!knowledge) return <div className={styles.empty}>Loading CPF knowledge…</div>;
  const docs = activeSection ? knowledge.documents.filter((d) => d.sectionKey === activeSection) : knowledge.documents;
  return (
    <div>
      <p className={styles.muted}>Sourced live from cpf.gov.sg and stored in the document database. This is what the AI retrieves over.</p>
      <div className={styles.filterRow} style={{ flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" className={`${styles.btn} ${styles.btnSmall} ${activeSection ? styles.btnGhost : ""}`} onClick={() => setActiveSection("")}>All</button>
        {knowledge.sections.map((s) => (
          <button key={s.sectionKey} type="button" className={`${styles.btn} ${styles.btnSmall} ${activeSection === s.sectionKey ? "" : styles.btnGhost}`} onClick={() => setActiveSection(s.sectionKey)}>
            {s.title}
          </button>
        ))}
      </div>
      {docs.map((d) => (
        <div key={d.docId} className={styles.knowDoc}>
          <div className={styles.knowTitle}>{d.title}</div>
          <ul className={styles.knowFacts}>
            {d.keyFacts.slice(0, 3).map((f, i) => <li key={i}>{f}</li>)}
          </ul>
          <a className={styles.cite} href={d.sourceUrl} target="_blank" rel="noreferrer">cpf.gov.sg ↗</a>
        </div>
      ))}
    </div>
  );
}

function NewMemberForm({ onCreate }: { onCreate: (input: NewCustomerInput) => Promise<void> }) {
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("70");
  const [language, setLanguage] = useState("en");
  const [dialect, setDialect] = useState("");
  const [digital, setDigital] = useState("medium");
  const [income, setIncome] = useState("mid");
  const [access, setAccess] = useState("none");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await onCreate({
        fullName,
        age: Number(age),
        preferredLanguage: language as NewCustomerInput["preferredLanguage"],
        dialect: dialect || null,
        digitalLiteracy: digital as NewCustomerInput["digitalLiteracy"],
        incomeBand: income as NewCustomerInput["incomeBand"],
        accessibility: access as NewCustomerInput["accessibility"],
      });
      setFullName("");
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <p className={styles.muted}>
        Key a new member into the customer database. The system derives their age bracket, support tier, vulnerability
        markers and a realistic CPF account automatically.
      </p>
      <label className={styles.sectionLabel} htmlFor="nm-name">Full name</label>
      <input id="nm-name" className={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="e.g. Tan Bee Hoon" />
      <div className={styles.filterRow} style={{ marginTop: 10 }}>
        <div style={{ flex: 1 }}>
          <label className={styles.sectionLabel} htmlFor="nm-age">Age</label>
          <input id="nm-age" className={styles.input} type="number" min={18} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label className={styles.sectionLabel} htmlFor="nm-lang">Language</label>
          <select id="nm-lang" className={styles.select} value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option><option value="zh">Chinese</option><option value="ms">Malay</option><option value="ta">Tamil</option>
          </select>
        </div>
      </div>
      <div className={styles.filterRow} style={{ marginTop: 10 }}>
        <div style={{ flex: 1 }}>
          <label className={styles.sectionLabel} htmlFor="nm-dialect">Dialect (optional)</label>
          <input id="nm-dialect" className={styles.input} value={dialect} onChange={(e) => setDialect(e.target.value)} placeholder="e.g. Hokkien" />
        </div>
        <div style={{ flex: 1 }}>
          <label className={styles.sectionLabel} htmlFor="nm-income">Income band</label>
          <select id="nm-income" className={styles.select} value={income} onChange={(e) => setIncome(e.target.value)}>
            <option value="low">Low</option><option value="lower_mid">Lower-mid</option><option value="mid">Mid</option><option value="upper">Upper</option><option value="high">High</option>
          </select>
        </div>
      </div>
      <div className={styles.filterRow} style={{ marginTop: 10 }}>
        <div style={{ flex: 1 }}>
          <label className={styles.sectionLabel} htmlFor="nm-digital">Digital literacy</label>
          <select id="nm-digital" className={styles.select} value={digital} onChange={(e) => setDigital(e.target.value)}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label className={styles.sectionLabel} htmlFor="nm-access">Accessibility</label>
          <select id="nm-access" className={styles.select} value={access} onChange={(e) => setAccess(e.target.value)}>
            <option value="none">None</option><option value="high_contrast">High contrast</option><option value="assisted">Assisted</option>
          </select>
        </div>
      </div>
      {err && <div className={styles.error}>{err}</div>}
      <div style={{ marginTop: 14 }}>
        <button type="submit" className={styles.btn} disabled={busy || !fullName}>{busy ? "Saving…" : "Add member to database"}</button>
      </div>
    </form>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  result?: CopilotResult;
}

function CopilotPanel({ member }: { member: CustomerDetail | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [useContext, setUseContext] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  const lastResult = [...messages].reverse().find((m) => m.role === "assistant")?.result ?? null;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setBusy(true);
    try {
      const result = await consoleApi.copilotChat({
        question,
        userId: useContext && member ? member.id : undefined,
        history,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer, result }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${(err as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  const samples = [
    "What is the Basic Healthcare Sum in 2026?",
    "How does CPF LIFE work and when do payouts start?",
    "I'm selling my flat — what is accrued interest?",
    member ? "How much is my monthly payout and which plan am I on?" : "What are the Basic, Full and Enhanced Retirement Sums?",
  ];

  return (
    <section className={`${styles.panel} ${styles.copilot}`} aria-label="AI copilot">
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>AI Copilot — ask the databases in natural language</h2>
        <label className={styles.checkRow}>
          <input type="checkbox" checked={useContext} onChange={(e) => setUseContext(e.target.checked)} disabled={!member} />
          Use selected member as context
        </label>
      </div>
      <div className={styles.copilotGrid}>
        <div className={styles.chatArea}>
          <div className={styles.chatLog} ref={logRef} role="log" aria-live="polite">
            {messages.length === 0 && (
              <div className={styles.empty}>
                Ask about CPF — the AI searches the CPF knowledge store and, when a member is selected, their CPF
                accounts and cases.
                <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {samples.map((s) => (
                    <button key={s} type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => setInput(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? styles.msgUser : styles.msgBot}>
                <div className={styles.msgRole}>{m.role === "user" ? "You" : "PULSE Copilot"}</div>
                <div className={styles.bubble}>{m.content}</div>
                {m.result && m.result.citations.length > 0 && (
                  <div className={styles.citationRow}>
                    {m.result.citations.map((c) => (
                      <a key={c.docId} className={styles.cite} href={c.sourceUrl} target="_blank" rel="noreferrer" title={c.topic}>{c.title} ↗</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className={styles.msgBot}><div className={styles.msgRole}>PULSE Copilot</div><div className={styles.bubble}>Navigating the databases…</div></div>}
          </div>
          <form className={styles.chatInputRow} onSubmit={send}>
            <textarea
              className={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
              placeholder={member && useContext ? `Ask about ${member.displayAlias} or CPF in general…` : "Ask a CPF question…"}
              rows={2}
              aria-label="Ask the AI copilot"
            />
            <button type="submit" className={styles.btn} disabled={busy || !input.trim()}>Send</button>
          </form>
        </div>

        <aside className={styles.navPanel} aria-label="AI navigation trace">
          <p className={styles.navTitle}>How the AI navigated</p>
          {lastResult ? (
            <>
              {member && useContext && lastResult.member && (
                <div className={styles.contextChip} style={{ marginBottom: 10 }}>● context: {lastResult.member.alias}</div>
              )}
              {lastResult.navigation.map((step, i) => (
                <div key={i} className={styles.navStep}>{step}</div>
              ))}
              <div className={styles.modelTag}>
                {lastResult.source === "llm" ? `Answered by ${lastResult.model}` : "Answered by deterministic fallback"} ·{" "}
                {lastResult.groundedInKnowledge ? "grounded in CPF knowledge" : "no direct knowledge match"}
              </div>
            </>
          ) : (
            <p className={styles.navHint}>Ask a question to see the steps the AI takes across the customer and CPF knowledge databases.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
