'use client';


import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';

/* ------------------------------------------------------------------ data --- */

// ───────────────────────── Live data layer ─────────────────────────────
// Officer-queue API: GET /dashboard/queue, POST /dashboard/send/:id, live
// updates over WS /dashboard/ws. In dev we call the backend directly
// (NEXT_PUBLIC_BACKEND_URL in .env.local) because the Next proxy is unreliable.
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';
const OFFICER_ID = 'patricia-lam';

// Mock fallbacks for fields the backend queue does NOT carry (identity + financials).
const MOCK_C = 'Singapore Citizen';
const MOCK_BAL = { oa: '$12,430', ma: '$4,862', ra: '$8,205' };
const MOCK_RET = { sum: 'Basic', payout: '$780 / month', start: 'Mar 2025', shortfall: '$43,500' };
const MOCK_SCHEMES = [['CPF LIFE', 'Active'], ['MediShield Life', 'Enrolled'], ['Silver Support Scheme', 'Enrolled'], ['Matched Retirement Savings', 'Eligible']];

const EMO_TO_SENT = { anger: 'angry', angry: 'angry', frustration: 'frustrated', frustrated: 'frustrated', sadness: 'sad', sad: 'sad', fear: 'sad', disgust: 'angry', confusion: 'confused', confused: 'confused', neutral: 'neutral', joy: 'happy', happy: 'happy', happiness: 'happy', surprise: 'neutral' };
const sentFromEmotion = (label) => EMO_TO_SENT[String(label || '').toLowerCase()] || 'neutral';
const LANG_NAME = { en: 'English', zh: 'Mandarin', ms: 'Malay', ta: 'Tamil', hi: 'Hindi', ml: 'Malayalam', pa: 'Punjabi' };
const urgencyFromScore = (s) => { const n = s > 1 ? s : s * 100; return n >= 66 ? 'urgent' : n >= 33 ? 'medium' : 'low'; }; // scores are 0–100
const minsSince = (iso) => { const t = Date.parse(iso); return Number.isNaN(t) ? 0 : Math.max(0, Math.round((Date.now() - t) / 60000)); };
const channelName = (uid) => (String(uid).startsWith('tg:') ? 'Telegram' : String(uid).startsWith('wa:') ? 'WhatsApp' : String(uid).startsWith('web:') ? 'Text Us (Web)' : 'Member');
const deriveName = (uid) => { const id = String(uid).replace(/^(tg:|wa:|web:)/, ''); return `${channelName(uid)} user ${id.slice(-4) || id}`; };

// Compliance guard: officers must never disclose a member's private CPF information over chat —
// account balances/amounts (written any way, including evasions) or personal identifiers (NRIC/FIN).
// The public hotline 1800-227-1188 is allow-listed so officers can still share it.
const NUMWORD = "(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)";
const SPELLED_AMOUNT = new RegExp(`\\b${NUMWORD}(?:[\\s-]+${NUMWORD})*[\\s-]+(?:thousand|million|lakh)\\b`, "i");

function containsSensitiveInfo(text, oc) {
  if (!text) return false;
  // Strip the public hotline first so it never trips the numeric rules.
  const t = String(text).replace(/1800[\s.\-]?227[\s.\-]?1188/g, " ");

  // Personal identifier — Singapore NRIC/FIN: S/T/F/G/M + 7 digits + checksum letter.
  if (/\b[STFGM]\d{7}[A-Z]\b/i.test(t)) return true;

  // ── Monetary amounts, many forms ──
  if (/(?:\$|s\$|\bsgd\b)\s?\d/i.test(t)) return true;         // $12,430 / S$66 / SGD 66
  if (/\d[\d.,]*\s?k\b/i.test(t)) return true;                  // 66K / 66 k / 1.2k
  if (/\d[\d.,]*\s?(?:thousand|million|grand|lakh)\b/i.test(t)) return true; // 66 thousand
  if (SPELLED_AMOUNT.test(t)) return true;                      // "sixty-six thousand"
  if (/\d{1,3}(?:,\d{3})+/.test(t)) return true;               // 66,000
  // Arithmetic used to disguise an amount: "60000+6000", "600 * 100", "6 x 10000".
  if (/\d[\d.,\s]*[+*x×][\s]*\d/i.test(t)) return true;
  // De-space / de-dash / de-dot evasion: "6 6 0 0 0", "6-6-0-0-0", "1 2 4 3 0" -> "12430".
  const collapsed = t.replace(/(\d)[\s.\-_]+(?=\d)/g, "$1");
  // Any 4+ digit number >= 1000, excluding a plain 4-digit year (1900-2099).
  const looksLikeAmount = (s) => (s.match(/\b\d{4,}\b/g) || []).some((n) => { const v = Number(n); return v >= 1000 && !(n.length === 4 && v >= 1900 && v <= 2099); });
  if (looksLikeAmount(t) || looksLikeAmount(collapsed)) return true;

  // A bare number exactly matching one of the member's known figures (covers 4-digit
  // balances like "8,205" typed as "8205"), on either the raw or de-spaced text.
  const figures = new Set();
  const add = (v) => { const d = String(v ?? '').replace(/[^\d]/g, ''); if (d.length >= 3) figures.add(d); };
  if (oc && oc.balances) { add(oc.balances.oa); add(oc.balances.ma); add(oc.balances.ra); }
  if (oc && oc.retirement) { add(oc.retirement.payout); add(oc.retirement.shortfall); }
  const nums = (`${t} ${collapsed}`.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => n.replace(/[^\d]/g, ''));
  return nums.some((n) => figures.has(n));
}

// Realistic mock identities — the backend queue carries none, so each case is assigned
// one deterministically (stable per case) to fill the profile + chat header. Display only.
const MOCK_PROFILES = [
  { name: 'Tan Wei Ming', nric: 'S6012345A', age: 66, phone: '+65 9123 4567', dob: '12 Mar 1960', address: 'Blk 412 Toa Payoh Lor 6, #08-21', balances: { oa: '$12,430', ma: '$4,862', ra: '$8,205' }, flags: ['Shortfall alert — $43,500 below Full Retirement Sum'] },
  { name: 'Priya Nair', nric: 'S8123456B', age: 41, phone: '+65 9234 5678', dob: '04 Jul 1985', address: 'Blk 128 Bishan St 12, #11-08', balances: { oa: '$58,900', ma: '$31,450', ra: '$96,200' }, flags: [] },
  { name: 'Chen Jia Hao', nric: 'S9234567C', age: 33, phone: '+65 9345 6789', dob: '21 Nov 1992', address: 'Blk 88 Punggol Field, #14-23', balances: { oa: '$74,100', ma: '$22,300', ra: '$18,640' }, flags: ['Approaching annual RSTU tax-relief cap'] },
  { name: 'Lim Hui Ying', nric: 'S7345678D', age: 52, phone: '+65 9456 7890', dob: '09 Feb 1974', address: 'Blk 250 Ang Mo Kio Ave 4, #05-117', balances: { oa: '$41,200', ma: '$28,900', ra: '$62,100' }, flags: [] },
  { name: 'Ahamed Faizal', nric: 'S8456789E', age: 38, phone: '+65 9567 8901', dob: '17 Sep 1987', address: 'Blk 501 Jurong West St 51, #09-44', balances: { oa: '$3,180', ma: '$19,540', ra: '$24,300' }, flags: ['Low OA balance after recent housing withdrawal'] },
  { name: 'Lee Cheng Wei', nric: 'S9156782F', age: 35, phone: '+65 9678 9012', dob: '02 Jan 1991', address: 'Blk 19 Telok Blangah Cres, #07-30', balances: { oa: '$66,400', ma: '$14,870', ra: '$20,110' }, flags: [] },
  { name: 'Siti Rahimah', nric: 'S8378901H', age: 44, phone: '+65 9890 1234', dob: '15 Dec 1981', address: 'Blk 677 Woodlands Dr 71, #03-256', balances: { oa: '$22,700', ma: '$16,300', ra: '$31,800' }, flags: [] },
  { name: 'Goh Boon Kiat', nric: 'S6189012J', age: 67, phone: '+65 9012 3456', dob: '30 Mar 1959', address: 'Blk 7 Marine Terrace, #15-88', balances: { oa: '$31,500', ma: '$25,800', ra: '$98,400' }, flags: [] },
];
const hashIdx = (str, mod) => { let h = 0; const s = String(str || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return mod ? h % mod : 0; };

// Map a backend QueueEntry → the person shape this dashboard renders.
// Real fields come from the queue; identity + financials fall back to mock.
function buildPerson(entry) {
  const history = Array.isArray(entry.chat_history) ? entry.chat_history : [];
  const createdAt = Date.parse(entry.created_at);
  const isOfficer = (role) => (role === 'officer' || role === 'agent' || role === 'bot');
  // Split by escalation time: messages before created_at are the prior AI-chatbot
  // session (→ "Chat History" tab); messages after are the live officer conversation.
  const prior = [], post = [];
  for (const m of history) {
    const ts = Date.parse(m.ts);
    if (!Number.isNaN(ts) && !Number.isNaN(createdAt) && ts > createdAt) post.push(m);
    else prior.push(m);
  }
  const summaryText = entry.query_summary || entry.summary || 'CPF enquiry';
  // The WhatsApp "Text Us" opener that starts the officer chat — carries the summary.
  const opener = {
    from: 'cust',
    system: true, // the canned WhatsApp opener (already English) — no translate control
    text: `[Please do not edit this message]\nWelcome to CPF Board Text Us. To begin the chat, simply press the send button.\n\n[Summary of query]\n${summaryText}`,
  };
  const subject = summaryText.length > 48 ? summaryText.slice(0, 46).trim() + '…' : summaryText;
  const lastUser = [...prior].reverse().find((m) => !isOfficer(m.role));
  const profile = MOCK_PROFILES[hashIdx(entry.queueId || entry.userId, MOCK_PROFILES.length)];
  return {
    id: entry.queueId,
    // Real channel name (Telegram first_name), captured at escalation. Falls back to a
    // derived label (e.g. "Telegram user 1234") if the channel gave us no name.
    name: entry.display_name || deriveName(entry.userId),
    citizenship: MOCK_C,
    language: LANG_NAME[entry.preferred_lang] || 'English',
    langCode: entry.preferred_lang || 'en', // source language for the on-demand Translate button
    nric: profile.nric, age: profile.age, phone: profile.phone, dob: profile.dob, address: profile.address,
    urgency: urgencyFromScore(entry.priority_score != null ? entry.priority_score : (entry.emotion_score || 0)),
    sentiment: sentFromEmotion(entry.emotion_label),
    subject, preview: summaryText,
    mins: minsSince(entry.created_at),
    q: lastUser ? lastUser.content : '',
    balances: profile.balances, retirement: MOCK_RET, schemes: MOCK_SCHEMES, flags: profile.flags || [],
    // Main chat = opener + post-escalation messages. Officer + citizen messages both
    // live in chat_history now, so they interleave in chronological order.
    thread: [opener, ...post.map((m) => ({ from: isOfficer(m.role) ? 'officer' : 'cust', text: m.content, translated: m.translated, translatedLang: m.translated_lang, original: m.original, originalLang: m.original_lang }))],
    // Prior AI-chatbot session → rendered in the "Chat History" tab.
    priorSession: prior.map((m) => ({ text: m.content, right: m.role === 'user' })),
    status: entry.status,
  };
}

// Heera's sample cases — used to seed the dashboard so it's never empty (demo data).
// Real escalated cases load on top of these via loadQueue(); mock cases are display-only.
const PEOPLE = (function () {
  const C = 'Singapore Citizen';
  const dB = { oa: '$12,430', ma: '$4,862', ra: '$8,205' };
  const dR = { sum: 'Basic', payout: '$780 / month', start: 'Mar 2025', shortfall: '$43,500' };
  const dS = [['CPF LIFE', 'Active'], ['MediShield Life', 'Enrolled'], ['Silver Support Scheme', 'Enrolled'], ['Matched Retirement Savings', 'Eligible']];
  const raw = [
    { id: 'tan', name: 'Tan Wei Ming', sal: 'Mr Tan', nric: 'S6012345A', age: 66, phone: '+65 9123 4567', dob: '12 Mar 1960', address: 'Blk 412 Toa Payoh Lor 6, #08-21', language: 'Mandarin', urgency: 'urgent', sentiment: 'angry', subject: 'Rejection of a Medisave claim', preview: 'Medisave claim for an outpatient day surgery at a private medical facility rejected and wants to understand why\u2026', mins: 0,
      balances: { oa: '$12,430', ma: '$4,862', ra: '$8,205' },
      flags: ['Shortfall alert \u2014 $43,500 below Full Retirement Sum target', 'Unread letter \u2014 MRSS eligibility notice, unread since 01 May 2026', 'Vulnerable member \u2014 elderly, mobility issues, no caregiver'],
      thread: [
        { from: 'cust', text: '[Please do not edit this message]\nWelcome to CPF Board Text Us. To begin the chat, simply press the send button.\n\n[Summary of query]\nUser wants to find out why his Medisave claim for an outpatient day surgery at a private medical facility was rejected.' },
        { from: 'officer', text: 'Dear Mr Tan,\n\nThank you for your query. We will connect you with a Customer Care Officer shortly.' },
        { from: 'officer', text: 'Hi Mr Tan, you have insufficient funds in your Medisave Account to make this claim of $8,500.\n\nCurrently, you have $4,862 in your Medisave Account. Hope this helps and let us know how we can assist you further.' },
        { from: 'cust', text: 'can i do partial claim' }
      ] },
    { id: 'priya', name: 'Priya Nair', sal: 'Ms Nair', nric: 'S8123456B', age: 41, phone: '+65 9234 5678', dob: '04 Jul 1985', address: 'Blk 128 Bishan St 12, #11-08', urgency: 'low', sentiment: 'happy', subject: 'CPF LIFE payout enquiry', preview: 'Wants to confirm when her CPF LIFE monthly payouts will begin and the expected amount\u2026', mins: 2,
      balances: { oa: '$58,900', ma: '$31,450', ra: '$96,200' }, retirement: { sum: 'Full', payout: '$1,470 / month', start: 'Jul 2050', shortfall: '$0' },
      summary: 'User would like to confirm when her CPF LIFE monthly payouts will start and how much she will receive.', q: 'Hi, when will my CPF LIFE payouts start?' },
    { id: 'chen', name: 'Chen Jia Hao', sal: 'Mr Chen', nric: 'S9234567C', age: 33, phone: '+65 9345 6789', dob: '21 Nov 1992', address: 'Blk 88 Punggol Field, #14-23', urgency: 'medium', sentiment: 'neutral', subject: 'Retirement Sum Top-up (RSTU)', preview: 'Asking how much he can top up under RSTU this year for tax relief\u2026', mins: 6,
      balances: { oa: '$74,100', ma: '$22,300', ra: '$18,640' }, retirement: { sum: 'Not set', payout: 'Not yet', start: '2059', shortfall: '\u2014' }, flags: ['Approaching annual RSTU tax-relief cap'],
      summary: 'User is asking how much he can top up to his Special Account under RSTU this year to qualify for tax relief.', q: 'How much can I top up for tax relief this year?' },
    { id: 'lim', name: 'Lim Hui Ying', sal: 'Ms Lim', nric: 'S7345678D', age: 52, phone: '+65 9456 7890', dob: '09 Feb 1974', address: 'Blk 250 Ang Mo Kio Ave 4, #05-117', urgency: 'low', sentiment: 'happy', subject: 'CPF nomination update', preview: 'Would like to update her beneficiary nomination after a change in family circumstances\u2026', mins: 10,
      balances: { oa: '$41,200', ma: '$28,900', ra: '$62,100' },
      summary: 'User would like to update her CPF nomination following a change in family circumstances.', q: 'How do I update my CPF nomination?' },
    { id: 'ahamed', name: 'Ahamed Faizal', sal: 'Mr Faizal', nric: 'S8456789E', age: 38, phone: '+65 9567 8901', dob: '17 Sep 1987', address: 'Blk 501 Jurong West St 51, #09-44', language: 'Malay', urgency: 'urgent', sentiment: 'sad', subject: 'Housing withdrawal for HDB flat', preview: 'Concerned a CPF housing withdrawal may have been wrongly processed for his new flat\u2026', mins: 18,
      balances: { oa: '$3,180', ma: '$19,540', ra: '$24,300' }, flags: ['Low OA balance after recent housing withdrawal'],
      summary: 'User is concerned that a CPF housing withdrawal for his new HDB flat may have been processed incorrectly.', q: 'I think too much was deducted from my OA, can you check?' },
    { id: 'lee', name: 'Lee Cheng Wei', sal: 'Mr Lee', nric: 'S9156782F', age: 35, phone: '+65 9678 9012', dob: '02 Jan 1991', address: 'Blk 19 Telok Blangah Cres, #07-30', urgency: 'urgent', sentiment: 'neutral', subject: 'MediShield Life premium', preview: 'Disputes a MediShield Life premium deduction he says was charged twice this year\u2026', mins: 25,
      balances: { oa: '$66,400', ma: '$14,870', ra: '$20,110' }, flags: ['Possible duplicate premium deduction \u2014 under review'],
      summary: 'User disputes a MediShield Life premium deduction which he believes was charged twice this year.', q: 'Why was I charged the MediShield premium twice?' },
    { id: 'thomas', name: 'Thomas Lee', sal: 'Mr Lee', nric: 'S7267890G', age: 49, phone: '+65 9789 0123', dob: '28 Jun 1976', address: 'Blk 333 Clementi Ave 2, #12-19', urgency: 'urgent', sentiment: 'frustrated', subject: 'Self-employed MediSave shortfall', preview: 'Received a MediSave contribution shortfall notice and is upset about late-payment interest\u2026', mins: 30,
      balances: { oa: '$8,920', ma: '$2,140', ra: '$15,600' }, flags: ['MediSave contribution shortfall notice issued', 'Late-payment interest accruing'],
      summary: 'User received a self-employed MediSave contribution shortfall notice and is upset about the late-payment interest.', q: 'I never received any notice and now you are charging me interest?' },
    { id: 'siti', name: 'Siti Rahimah', sal: 'Ms Siti', nric: 'S8378901H', age: 44, phone: '+65 9890 1234', dob: '15 Dec 1981', address: 'Blk 677 Woodlands Dr 71, #03-256', language: 'Malay', urgency: 'medium', sentiment: 'confused', subject: 'Matched Retirement Savings (MRSS)', preview: 'Unsure whether she qualifies for the Matched Retirement Savings Scheme and how matching works\u2026', mins: 45,
      balances: { oa: '$22,700', ma: '$16,300', ra: '$31,800' },
      summary: 'User is unsure whether she qualifies for the Matched Retirement Savings Scheme and how the matching works.', q: 'Do I qualify for MRSS? I do not really understand it.' },
    { id: 'goh', name: 'Goh Boon Kiat', sal: 'Mr Goh', nric: 'S6189012J', age: 67, phone: '+65 9012 3456', dob: '30 Mar 1959', address: 'Blk 7 Marine Terrace, #15-88', language: 'Mandarin', urgency: 'low', sentiment: 'sad', subject: 'Withdrawal of CPF savings at 55', preview: 'Asking how much of his CPF savings he can withdraw now that he has turned 55\u2026', mins: 50,
      balances: { oa: '$31,500', ma: '$25,800', ra: '$98,400' },
      summary: 'User would like to know how much of his CPF savings he can withdraw now that he has turned 55.', q: 'How much can I take out now that I am past 55?' },
    { id: 'raj', name: 'Raj Kumar', sal: 'Mr Kumar', nric: 'S9090123K', age: 36, phone: '+65 9111 2222', dob: '11 Aug 1990', address: 'Blk 210 Serangoon Ave 4, #06-12', language: 'Tamil', urgency: 'medium', sentiment: 'neutral', subject: 'CPF transfer to spouse', preview: 'Wants to transfer CPF savings to his spouse\u2019s Retirement Account and asks about limits\u2026', mins: 7,
      balances: { oa: '$80,300', ma: '$30,100', ra: '$40,500' },
      summary: 'User would like to transfer CPF savings to his spouse\u2019s Retirement Account and is asking about the limits.', q: 'How much can I transfer to my wife\u2019s RA?' },
    { id: 'wong', name: 'Wong Mei Ling', sal: 'Ms Wong', nric: 'S8101234L', age: 45, phone: '+65 9222 3333', dob: '23 May 1980', address: 'Blk 360 Bukit Batok St 31, #08-77', language: 'Mandarin', urgency: 'low', sentiment: 'happy', subject: 'CPF contribution history', preview: 'Requesting a statement of her CPF contribution history for a loan application\u2026', mins: 12,
      balances: { oa: '$52,800', ma: '$27,600', ra: '$48,900' },
      summary: 'User is requesting a statement of her CPF contribution history for a loan application.', q: 'How do I get my contribution history statement?' },
    { id: 'nurul', name: 'Nurul Aisyah', sal: 'Ms Nurul', nric: 'S9512345M', age: 30, phone: '+65 9333 4444', dob: '06 Oct 1995', address: 'Blk 145 Tampines St 12, #10-04', language: 'Malay', urgency: 'medium', sentiment: 'confused', subject: 'First CPF for new job', preview: 'New to the workforce and asking how employer CPF contributions and allocation work\u2026', mins: 3,
      balances: { oa: '$2,410', ma: '$640', ra: '$0' },
      summary: 'User is new to the workforce and is asking how employer CPF contributions and account allocation work.', q: 'I just started work \u2014 how does CPF actually work?' },
    // No `q` field \u2192 its thread ends on the officer greeting, so on accept it lands in the
    // "Inactive \u00b7 no reply" bucket. Dated 2h back to exercise the auto-switch dropdown feature.
    { id: 'harpreet', name: 'Harpreet Singh', sal: 'Mr Singh', nric: 'S7434512P', age: 51, phone: '+65 9445 1200', dob: '19 Apr 1975', address: 'Blk 264 Bukit Panjang Ring Rd, #11-45', urgency: 'medium', sentiment: 'neutral', subject: 'CPF LIFE plan switch', preview: 'Asked about switching his CPF LIFE plan and has not replied since our last message\u2026', mins: 120,
      balances: { oa: '$44,300', ma: '$21,100', ra: '$71,500' },
      summary: 'User asked how to switch his CPF LIFE plan and has not responded to the officer\u2019s reply.' },
    // Already-active case whose last message is 2.5h old \u2192 starts in the "Inactive \u00b7 no reply"
    // bucket, to test the time-based split. Opening or replying re-activates it.
    { id: 'meng', name: 'Ong Bee Choo', sal: 'Madam Ong', nric: 'S6534210Q', age: 60, phone: '+65 9330 7788', dob: '08 Feb 1966', address: 'Blk 511 Bedok Nth St 3, #12-32', urgency: 'low', sentiment: 'neutral', subject: 'CPF LIFE monthly payout', preview: 'Confirmed her payout details earlier and has not messaged since\u2026', mins: 150,
      balances: { oa: '$18,900', ma: '$23,400', ra: '$102,300' },
      summary: 'User asked to confirm her CPF LIFE monthly payout details.', q: 'Just checking \u2014 is my payout amount correct?' }
  ];
  const out = {};
  raw.forEach(function (p) {
    const sal = p.sal || 'Sir/Madam';
    const thread = p.thread || [
      { from: 'cust', text: '[Summary of query]\n' + (p.summary || p.subject) },
      { from: 'officer', text: 'Dear ' + sal + ',\n\nThank you for reaching out to the CPF Board. We will connect you with a Customer Care Officer shortly.' }
    ].concat(p.q ? [{ from: 'cust', text: p.q }] : []);
    out[p.id] = Object.assign({ citizenship: C, language: 'English', langCode: 'en', balances: dB, retirement: dR, schemes: dS, flags: [] }, p, { thread: thread });
  });
  return out;
})();

// Seed lists for the mock cases (heera's original incoming / active split).
const MOCK_INCOMING = ['nurul', 'raj', 'lim', 'wong', 'ahamed', 'lee', 'siti', 'thomas', 'goh', 'harpreet'];
const MOCK_ACTIVE = ['tan', 'priya', 'chen', 'meng'];
const MOCK_THREADS = Object.fromEntries(Object.entries(PEOPLE).map(([id, p]) => [id, p.thread.slice()]));
// Fuller back-and-forth for the active (open) chats so they read like live conversations.
Object.assign(MOCK_THREADS, {
  tan: [
    { from: 'cust', text: '[Please do not edit this message]\nWelcome to CPF Board Text Us. To begin the chat, simply press the send button.\n\n[Summary of query]\nUser wants to understand why his MediSave claim for an outpatient day surgery was rejected.' },
    { from: 'officer', text: 'Dear Mr Tan, thank you for reaching out. Let me check the details of your MediSave claim now.' },
    { from: 'cust', text: 'I dont understand why it was rejected, I have money inside' },
    { from: 'officer', text: 'I understand your concern. The claim of $8,500 exceeds your current MediSave balance of $4,862, so it could not be fully processed.' },
    { from: 'cust', text: 'so what can i do? can i do partial claim?' },
    { from: 'officer', text: 'Yes, you can make a partial MediSave claim up to your available balance and settle the rest separately. Shall I guide you through it?' },
    { from: 'cust', text: 'yes please help me' },
  ],
  priya: [
    { from: 'cust', text: '[Please do not edit this message]\nWelcome to CPF Board Text Us. To begin the chat, simply press the send button.\n\n[Summary of query]\nUser would like to confirm when her CPF LIFE monthly payouts will begin and the expected amount.' },
    { from: 'officer', text: 'Hi Ms Nair, happy to help! Let me pull up your CPF LIFE plan details.' },
    { from: 'cust', text: 'Sure! When will my payouts start?' },
    { from: 'officer', text: 'Based on your Full Retirement Sum, your CPF LIFE payouts of about $1,470/month are scheduled to begin in July 2050, from age 65.' },
    { from: 'cust', text: 'Oh thats great, thank you so much!' },
    { from: 'officer', text: 'You are most welcome! Is there anything else I can help you with today?' },
  ],
  chen: [
    { from: 'cust', text: '[Please do not edit this message]\nWelcome to CPF Board Text Us. To begin the chat, simply press the send button.\n\n[Summary of query]\nUser is asking how much he can top up under RSTU this year to qualify for tax relief.' },
    { from: 'officer', text: 'Hi Mr Chen, thanks for your enquiry. Cash top-ups to your Special Account under RSTU may qualify for tax relief.' },
    { from: 'cust', text: 'how much can i top up for tax relief this year?' },
    { from: 'officer', text: 'You can receive tax relief of up to $8,000 a year for top-ups to your own Special Account. You are close to that cap, so do check your year-to-date amount first.' },
    { from: 'cust', text: 'ok noted, where can i check that?' },
    { from: 'officer', text: 'You can view your year-to-date top-ups under My Statement on the CPF website via Singpass. Would you like the link?' },
  ],
});

/* -------------------------------------------------------------- helpers --- */

const fmt = (m) => (m < 1 ? 'Just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} hr ago`);
// Compact accept→resolve duration for the AVG RESPONSE TIME card (sub-minute shows seconds).
const fmtDuration = (ms) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
};
const mask = (n) => (n ? n[0] + '\u2022\u2022\u2022\u2022' + n.slice(-3) : '');
const colorFor = (u) => (u === 'urgent' ? '#ca2424' : u === 'medium' ? '#c98a1e' : '#1a981e');
const urgRank = (u) => (u === 'urgent' ? 3 : u === 'medium' ? 2 : 1);
const SENT = { angry: 4, frustrated: 4, sad: 3, confused: 2, neutral: 1, happy: 0 };
const sentRank = (s) => (SENT[s] != null ? SENT[s] : 1);
const sentColor = (s) => (sentRank(s) >= 4 ? '#ca2424' : sentRank(s) >= 2 ? '#c98a1e' : '#1a981e');
const mouthFor = (s) => (({ happy: 'M 9 19 Q 16 25 23 19', neutral: 'M 10 21 L 22 21', sad: 'M 9 23 Q 16 17 23 23', angry: 'M 9 23 Q 16 18 23 23', frustrated: 'M 10 23 Q 16 18 22 23', confused: 'M 9 22 Q 12 19 15 22 Q 18 25 22 21' })[s] || 'M 10 21 L 22 21');
const sentLabel = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

function botAnswer(subj) {
  const s = (subj || '').toLowerCase();
  if (s.includes('medisave claim') || (s.includes('medisave') && s.includes('claim'))) return 'MediSave can be used for approved treatments, subject to withdrawal limits. A claim may be rejected if your MediSave balance is insufficient, or if the procedure is not claimable under the limits.';
  if (s.includes('cpf life')) return 'CPF LIFE payouts can start anytime from age 65, depending on your chosen plan. You can view your estimated monthly payout in the CPF Mobile app under \u2018Retirement\u2019.';
  if (s.includes('top-up') || s.includes('rstu')) return 'Under the Retirement Sum Topping-Up scheme, cash top-ups to your Special or Retirement Account may qualify for tax relief of up to $8,000 per calendar year.';
  if (s.includes('nomination')) return 'You can make or update a CPF nomination online via the CPF website using Singpass, or in person at any CPF Service Centre.';
  if (s.includes('housing') || s.includes('hdb')) return 'CPF savings used for housing are based on your flat\u2019s purchase details. You can review every housing withdrawal under \u2018My Statement\u2019 on the CPF website.';
  if (s.includes('medishield')) return 'MediShield Life premiums are deducted once a year from your MediSave. The amount depends on your age band and any premium subsidies you qualify for.';
  if (s.includes('shortfall') || s.includes('self-employed')) return 'Self-employed persons contribute to MediSave based on Net Trade Income. Unpaid amounts may accrue late-payment interest until they are settled.';
  if (s.includes('matched retirement') || s.includes('mrss')) return 'Under the Matched Retirement Savings Scheme, the Government matches eligible cash top-ups dollar-for-dollar, up to $2,000 a year.';
  if (s.includes('transfer')) return 'You may transfer CPF savings above your Full Retirement Sum to your spouse\u2019s Retirement Account, subject to the prevailing limits.';
  if (s.includes('withdrawal') || s.includes(' 55')) return 'From age 55, you may withdraw up to $5,000 unconditionally, or any savings above your Full Retirement Sum \u2014 whichever is higher.';
  if (s.includes('contribution history')) return 'You can download your Contribution History statement anytime from \u2018My Statement\u2019 on the CPF website using Singpass.';
  if (s.includes('new job') || s.includes('first cpf')) return 'When you start working, you and your employer contribute to your CPF each month, split across your Ordinary, Special and MediSave accounts.';
  return 'Here is some general guidance on your enquiry. For account-specific details, I can connect you to a Customer Correspondence Officer.';
}

const seg = (on) => ({ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 14.5, transition: 'all .2s', background: on ? '#fff' : 'transparent', color: on ? '#0a6160' : '#667085', boxShadow: on ? '0 1px 2px rgba(16,24,40,.12)' : 'none' });
const statusStyleFor = (st) => ({ color: (st === 'Active' || st === 'Enrolled' || st === 'Eligible') ? '#1a981e' : '#555', fontWeight: 700, fontSize: 14 });
const cardShadow = { boxShadow: '0 1px 2px rgba(16,24,40,.04),0 6px 16px rgba(16,24,40,.05)', border: '1px solid #ebedf0' };
// On-demand "Translate" link under a citizen bubble, and the outbound "sent in <lang>" audit line.
const TRANS_BTN = { marginTop: 3, border: 'none', background: 'none', cursor: 'pointer', color: '#0a6160', fontWeight: 600, fontSize: 11.5, padding: '1px 2px', fontFamily: 'inherit' };
const SENT_IN = { marginTop: 3, fontSize: 11.5, color: '#7a7a7a', fontStyle: 'italic', maxWidth: '100%', whiteSpace: 'pre-wrap', lineHeight: 1.35 };

/* ------------------------------------------------------------ component --- */

export default function CpfDashboard({ simulateReplies = true, replyDelaySec = 1.7, headerColor = '#0a6160', logoSrc = '/cpf-logo.png' }) {
  const [tab, setTab] = useState('incoming');
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [chatView, setChatView] = useState('active'); // 'active' | 'inactive' — which list the dropdown shows
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [people, setPeople] = useState(PEOPLE);
  const [incoming, setIncoming] = useState(MOCK_INCOMING);
  const [active, setActive] = useState(MOCK_ACTIVE);
  const [openChatId, setOpenChatId] = useState('tan');
  const [infoTab, setInfoTab] = useState('info');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [resolved, setResolved] = useState(0);            // # of Resolve clicks this session
  const [respDurations, setRespDurations] = useState([]); // accept→resolve durations (ms) this session
  const [threads, setThreads] = useState(MOCK_THREADS);
  const [translations, setTranslations] = useState({}); // original text → { translated, showing, loading, error }
  const [showOrig, setShowOrig] = useState({}); // English text → bool: show the citizen's original instead

  const msgRef = useRef(null);
  const transRef = useRef({}); // mirror of `translations` for stale-free reads inside the handler
  const replyIdx = useRef(0);
  const timer = useRef(null);
  const acceptedRef = useRef(new Set());   // locally-accepted ids (no backend "assign" route)
  const removedRef = useRef(new Set());    // locally-resolved ids (mock + live) — don't re-show on refetch
  const acceptTimesRef = useRef(new Map()); // id → accept timestamp (ms), set once on accept; cleared on resolve
  const activityRef = useRef({});          // id → last-message time (ms); drives the 2h active/inactive split

  useEffect(() => {
    const el = msgRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  // Load the live officer queue and map each entry onto this dashboard's shape.
  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/queue`);
      if (!res.ok) return;
      const data = await res.json();
      const entries = Array.isArray(data && data.queue) ? data.queue : [];
      const livePeople = {}, liveInc = [], liveAct = [], liveThreads = {};
      for (const entry of entries) {
        if (removedRef.current.has(entry.queueId)) continue; // locally resolved — skip until backend catches up
        const person = buildPerson(entry);
        livePeople[person.id] = person;
        liveThreads[person.id] = person.thread; // citizen + officer messages both come from chat_history
        if (entry.status === 'assigned' || acceptedRef.current.has(person.id)) liveAct.push(person.id);
        else liveInc.push(person.id);
      }
      // Mock sample cases (display-only) sit alongside live cases: accepted ones move to
      // active, resolved ones drop out.
      const mockInc = MOCK_INCOMING.filter((id) => !acceptedRef.current.has(id) && !removedRef.current.has(id));
      const mockAct = [
        ...MOCK_ACTIVE.filter((id) => !removedRef.current.has(id)),
        ...MOCK_INCOMING.filter((id) => acceptedRef.current.has(id) && !removedRef.current.has(id)),
      ];
      setPeople({ ...PEOPLE, ...livePeople });
      setIncoming([...liveInc, ...mockInc]);
      setActive([...liveAct, ...mockAct]);
      setThreads((prev) => ({ ...prev, ...liveThreads }));
    } catch { /* keep whatever is shown on failure */ }
  }, []);

  // Initial load + live updates over the dashboard WebSocket (direct to :3000).
  useEffect(() => {
    loadQueue();
    let ws;
    const wsBase = API_BASE
      ? API_BASE.replace(/^http/, 'ws')
      : (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}` : '');
    try {
      ws = new WebSocket(`${wsBase}/dashboard/ws`);
      ws.onmessage = (ev) => {
        let msg; try { msg = JSON.parse(ev.data); } catch { return; }
        const REFRESH = ['new_queue_entry', 'queue_updated', 'case_resolved', 'officer_assigned', 'emotion_update', 'user_message', 'officer_message'];
        if (msg && REFRESH.includes(msg.event)) loadQueue();
      };
    } catch { /* websocket is optional — the initial fetch already ran */ }
    return () => { try { if (ws) ws.close(); } catch { /* noop */ } };
  }, [loadQueue]);

  const accept = useCallback((id) => {
    // Stamp the accept time once (first accept wins) so AVG RESPONSE TIME can measure
    // accept→resolve. Re-opening an already-accepted case must not reset the clock.
    if (!acceptTimesRef.current.has(id)) acceptTimesRef.current.set(id, Date.now());
    acceptedRef.current.add(id);
    setIncoming((inc) => inc.filter((x) => x !== id));
    setActive((act) => (act.includes(id) ? act : [id, ...act.filter((x) => x !== id)]));
    setOpenChatId(id);
    setInfoTab('info');
    setTab('chats');
    // Opening a case always brings it into the Active list — accepting counts as fresh
    // activity, so restamp its last-message time and show the Active bucket.
    activityRef.current[id] = Date.now();
    setChatView('active');
  }, []);

  // Officer marks the case resolved → drops it from the live queue (PATCH backend).
  const resolveCase = useCallback(async (id) => {
    if (!id) return;
    // RESOLVED TODAY = every Resolve click this session. AVG RESPONSE TIME = mean of
    // accept→resolve for cases that were accepted this session (skip ones with no accept stamp).
    setResolved((n) => n + 1);
    const acceptedAt = acceptTimesRef.current.get(id);
    if (acceptedAt != null) {
      setRespDurations((d) => [...d, Date.now() - acceptedAt]);
      acceptTimesRef.current.delete(id);
    }
    acceptedRef.current.delete(id);
    removedRef.current.add(id);
    setActive((act) => act.filter((x) => x !== id));
    setIncoming((inc) => inc.filter((x) => x !== id));
    setOpenChatId((cur) => (cur === id ? '' : cur));
    if (id in PEOPLE) return; // mock sample case — nothing to resolve on the backend
    try {
      await fetch(`${API_BASE}/dashboard/resolve/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId: OFFICER_ID }),
      });
    } catch { /* keep the optimistic removal even if the request fails */ }
  }, []);

  const open = useCallback((id) => { setOpenChatId(id); setInfoTab('info'); }, []);

  // For auto-translated citizen messages we already have both versions — flip locally, no fetch.
  const toggleOrig = useCallback((key) => setShowOrig((p) => ({ ...p, [key]: !p[key] })), []);

  // On-demand "Translate" for a citizen message. Caches by original text (stable across
  // refetches); toggles original ⇄ English once fetched. Works on any message — live relay,
  // failed translation, or untranslated pre-escalation bot history.
  const translateMsg = useCallback(async (text, srcLang) => {
    if (!text) return;
    const existing = transRef.current[text];
    if (existing && existing.translated != null) {
      const next = { ...transRef.current, [text]: { ...existing, showing: !existing.showing } };
      transRef.current = next; setTranslations(next);
      return;
    }
    const loading = { ...transRef.current, [text]: { translated: null, showing: true, loading: true } };
    transRef.current = loading; setTranslations(loading);
    try {
      const res = await fetch(`${API_BASE}/dashboard/translate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: srcLang || 'auto', target: 'en' }),
      });
      const data = res.ok ? await res.json() : null;
      const done = { ...transRef.current, [text]: data && data.translated_text
        ? { translated: data.translated_text, showing: true, loading: false }
        : { translated: null, showing: false, loading: false, error: true } };
      transRef.current = done; setTranslations(done);
    } catch {
      const err = { ...transRef.current, [text]: { translated: null, showing: false, loading: false, error: true } };
      transRef.current = err; setTranslations(err);
    }
  }, []);

  const send = useCallback(async () => {
    const id = openChatId;
    const text = (draft || '').trim();
    if (!text || !id) return;
    // Compliance guard — never let a member's private info go out. The live banner (computed
    // from `draft` on every keystroke) already warns; this just refuses to send while flagged.
    if (containsSensitiveInfo(text, people[id])) return;
    // Optimistic append for instant feedback; the backend persists it to chat_history,
    // so the next refetch shows it interleaved chronologically (no duplicate).
    setThreads((t) => ({ ...t, [id]: [...(t[id] || []), { from: 'officer', text }] }));
    activityRef.current[id] = Date.now(); // officer message counts as activity → keeps the chat Active
    setDraft('');
    try {
      await fetch(`${API_BASE}/dashboard/send/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, officerId: OFFICER_ID }),
      });
    } catch { /* keep the optimistic message even if the send fails */ }
  }, [openChatId, draft, people]);

  /* ---- derived view data ---- */

  const queries = useMemo(() => {
    let ids = incoming.slice();
    if (filter !== 'all') ids = ids.filter((id) => people[id].urgency === filter);
    ids.sort((a, b) => {
      const pa = people[a], pb = people[b];
      if (sort === 'oldest') return pb.mins - pa.mins;
      if (sort === 'urgency') return urgRank(pb.urgency) - urgRank(pa.urgency) || pa.mins - pb.mins;
      if (sort === 'sentiment') return sentRank(pb.sentiment) - sentRank(pa.sentiment) || pa.mins - pb.mins;
      return pa.mins - pb.mins;
    });
    return ids.map((id) => people[id]);
  }, [incoming, filter, sort]);

  const chatRows = useMemo(() => active.map((id) => {
    const p = people[id];
    const t = threads[id] || [];
    const last = t[t.length - 1];
    // "Inactive" = no message from EITHER side (officer replies count) for over 2h.
    // Sending/opening restamps activityRef; otherwise fall back to the case's age.
    const stamped = activityRef.current[id];
    const lastMins = stamped != null ? Math.max(0, Math.round((Date.now() - stamped) / 60000)) : (p.mins ?? 0);
    const idle = lastMins > 120;
    const waitH = Math.max(1, Math.floor(lastMins / 60)); // whole-hours "no reply" window
    // "Active now" presence is the customer's own recency — officer replies don't make the
    // customer present. Demo proxy: the case age (no per-message timestamps in mock data).
    const custMins = p.mins ?? 0;
    return {
      id, name: p.name, urgency: p.urgency, sentiment: p.sentiment,
      preview: (last ? last.text : '').replace(/\s+/g, ' ').slice(0, 64),
      isOpen: id === openChatId,
      showAlert: p.urgency === 'urgent',
      idle, waitH, custMins,
    };
  }), [active, threads, openChatId]);
  // Active-chat presence, based on when the customer last replied: green "Active now" if
  // just now, otherwise their last-reply time in grey italics.
  const custStatus = (m) => (m < 3
    ? <span style={{ color: '#1a981e', fontWeight: 600 }}>● Active now</span>
    : <span style={{ color: '#9a9a9a', fontStyle: 'italic' }}>{fmt(m)}</span>);
  const liveChats = chatRows.filter((r) => !r.idle);
  const idleChats = chatRows.filter((r) => r.idle);

  const oc = people[openChatId];
  const hasOpen = !!oc;
  // Live compliance flag — recomputed on every keystroke so the officer is warned the moment
  // they type a member's private info (amount/identifier), before they can send it.
  const composeFlag = draft.trim() ? containsSensitiveInfo(draft, oc) : false;
  const msgs = (threads[openChatId] || []).map((m, i) => ({ ...m, right: m.from === 'officer', key: i }));

  const schemesList = hasOpen ? oc.schemes.map((s) => ({ name: s[0], status: s[1] })) : [];
  const flags = hasOpen ? oc.flags : [];

  const followUp = (oc && (oc.sentiment === 'angry' || oc.sentiment === 'frustrated'))
    ? 'This is really frustrating \u2014 I need someone to actually look into my case.'
    : (oc && oc.sentiment === 'confused') ? 'Sorry, I still don\u2019t understand. Can a real person help me?'
    : (oc && oc.sentiment === 'sad') ? 'I\u2019m quite worried about this. Could someone please check for me?'
    : 'That doesn\u2019t fully resolve my issue \u2014 can I speak to an officer?';
  const botMsgs = hasOpen ? [
    { from: 'bot', text: 'Hello! I\u2019m the CPF Virtual Assistant. How can I help you today?' },
    { from: 'user', text: oc.q || `I need help with my ${oc.subject.toLowerCase()}.` },
    { from: 'bot', text: botAnswer(oc.subject) },
    { from: 'user', text: followUp },
    { from: 'bot', text: 'Thanks for sharing those details. This needs a closer look, so I\u2019m connecting you to a Customer Correspondence Officer who can assist you further.' }
  ].map((m, i) => ({ ...m, right: m.from === 'user', key: i })) : [];

  const urgentActive = active.filter((id) => people[id].urgency === 'urgent').length;
  // AVG RESPONSE TIME — mean accept→resolve over cases resolved this session (live, '—' until the first).
  const avgRespLabel = respDurations.length
    ? fmtDuration(respDurations.reduce((a, b) => a + b, 0) / respDurations.length)
    : '—';

  // Encouraging, number-aware status line for each metric card (text + colour adapt to the value).
  const openStatus = urgentActive
    ? { text: `${urgentActive} need attention`, color: '#ca2424' }
    : active.length === 0
    ? { text: 'None open', color: '#0a9384' }
    : { text: 'All on track', color: '#0a9384' };
  const incomingStatus = incoming.length === 0
    ? { text: 'All caught up', color: '#0a9384' }
    : incoming.length >= 6
    ? { text: 'Busy — dive in', color: '#c98a1e' }
    : { text: 'Waiting now', color: '#c98a1e' };
  const respStatus = (() => {
    if (!respDurations.length) return { text: 'Awaiting first', color: '#6b7280' };
    const s = respDurations.reduce((a, b) => a + b, 0) / respDurations.length / 1000;
    if (s <= 60) return { text: 'Lightning fast', color: '#059669' };
    if (s <= 300) return { text: 'Good pace', color: '#4f46e5' };
    return { text: 'Pick up the pace', color: '#c98a1e' };
  })();
  const resolvedStatus = resolved === 0
    ? { text: 'Keep going!', color: '#c98a1e' }
    : resolved < 5
    ? { text: 'Good start', color: '#0a9384' }
    : resolved < 10
    ? { text: 'Great work!', color: '#059669' }
    : { text: 'On fire! 🔥', color: '#059669' };

  const isIncoming = tab === 'incoming';
  const FILTERS = [['all', 'All'], ['urgent', 'Urgent!']];

  /* --------------------------------------------------------------- view --- */

  return (
    <div style={{ width: 'calc(100vw / 0.8)', height: 'calc(100vh / 0.8)', transform: 'scale(0.8)', transformOrigin: 'top left', display: 'flex', flexDirection: 'row', background: '#f5f6f8', overflow: 'hidden', color: '#1c1c1c', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes blink{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
        @keyframes pulsering{0%{transform:scale(1);opacity:.7}70%{transform:scale(2.4);opacity:0}100%{opacity:0}}
        @keyframes msgIn{from{transform:translateY(6px)}to{transform:none}}
        .cpf-card-hover{transition:transform .18s,box-shadow .18s,border-color .18s}
        .cpf-card-hover:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(16,24,40,.10);border-color:#d8dbe0}
        .cpf-stat-card{transition:box-shadow .18s}
        .cpf-nav-item:hover{background:rgba(255,255,255,.1) !important}
        .cpf-icon-btn{transition:background .15s}.cpf-icon-btn:hover{background:#e6e6e6}
        .cpf-send-btn{transition:background .15s}.cpf-send-btn:hover{background:#0c8684}
        .cpf-scroll::-webkit-scrollbar{width:10px;height:10px}
        .cpf-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,.16);border-radius:8px}
        .cpf-scroll::-webkit-scrollbar-track{background:transparent}
        .cpf-input::placeholder{color:#a3a3a3}
        .cpf-emo{position:relative;display:flex}
        .cpf-emo-tip{position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(-4px);background:#1c1c1c;color:#fff;font-size:11.5px;font-weight:600;padding:4px 9px;border-radius:6px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s,transform .15s;z-index:5}
        .cpf-emo:hover .cpf-emo-tip{opacity:1;transform:translateX(-50%) translateY(0)}
      `}</style>

      <NavRail
        collapsed={navCollapsed}
        onToggle={() => setNavCollapsed((c) => !c)}
        isIncoming={isIncoming}
        setTab={setTab}
        incomingCount={incoming.length}
        activeCount={active.length}
        headerColor={headerColor}
        logoSrc={logoSrc}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
      {/* ---------------- INCOMING ---------------- */}
      {isIncoming && (
        <div className="cpf-scroll" style={{ flex: 1, overflow: 'auto', scrollbarGutter: 'stable', padding: '48px 44px 64px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
            <StatCard value={String(active.length)} label="OPEN CHATS" sub={openStatus.text} subColor={openStatus.color} accent="#0f9d94" icon={<StatIconChats color="#0f9d94" />} />
            <StatCard value={String(incoming.length)} label="INCOMING INQUIRIES" sub={incomingStatus.text} subColor={incomingStatus.color} accent="#d97706" icon={<StatIconInbox color="#d97706" />} />
            <StatCard value={avgRespLabel} label="AVG RESPONSE TIME" sub={respStatus.text} subColor={respStatus.color} accent="#4f46e5" icon={<StatIconClock color="#4f46e5" />} />
            <StatCard value={String(resolved)} label="RESOLVED TODAY" sub={resolvedStatus.text} subColor={resolvedStatus.color} accent="#059669" icon={<StatIconCheck color="#059669" />} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '56px 0 20px', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <svg viewBox="0 0 24 24" width="34" height="30" fill="none" stroke="#1d1d1d" strokeWidth="1.6" strokeLinejoin="round"><path d="M3 5h13v9H8l-4 3v-3H3z" /><path d="M8.5 9.5h11v8h-3v2l-3-2" /></svg>
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '.2px' }}>INCOMING QUERIES</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 26, padding: '0 8px', borderRadius: 13, background: '#0a6160', color: '#fff', fontSize: 14, fontWeight: 700 }}>{queries.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {FILTERS.map(([k, l]) => {
                  const c = k === 'all' ? '#0a6160' : colorFor(k);
                  const on = filter === k;
                  return (
                    <div key={k} onClick={() => setFilter(k)} style={{ padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all .15s', background: on ? c : `${c}16`, color: on ? '#fff' : c, border: `1px solid ${on ? c : `${c}40`}`, boxShadow: on ? `0 2px 8px ${c}55, inset 0 0 0 999px rgba(0,0,0,.14)` : 'none' }}>{l}</div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#555' }}>
                <span style={{ fontWeight: 500 }}>Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ border: '1px solid #cfcfcf', background: '#fff', borderRadius: 10, padding: '8px 12px', fontSize: 14, color: '#333', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="urgency">Most urgent</option>
                  <option value="sentiment">Sentiment</option>
                </select>
              </div>
            </div>
          </div>

          {queries.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 22 }}>
              {queries.map((p) => (
                <div key={p.id} className="cpf-card-hover" onClick={() => accept(p.id)} style={{ background: '#fff', borderRadius: 16, border: '1px solid #ebedf0', boxShadow: '0 1px 2px rgba(16,24,40,.04)', cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ height: 6, background: sentColor(p.sentiment) }} />
                  <div style={{ padding: '16px 18px 14px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{p.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
                        {p.urgency === 'urgent' && (
                          <span style={{ fontSize: 26, fontWeight: 800, color: '#ca2424', lineHeight: 1 }}>!</span>
                        )}
                        <div className="cpf-emo" style={{ flex: 'none' }}>
                          <div className="cpf-emo-tip">
                            {sentLabel(p.sentiment)}
                            <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '5px solid #1c1c1c' }} />
                          </div>
                          <svg viewBox="0 0 32 32" width="40" height="40" style={{ flex: 'none' }}>
                            <circle cx="16" cy="16" r="14.4" fill="none" stroke={sentColor(p.sentiment)} strokeWidth="1.6" />
                            <circle cx="11" cy="13" r="1.7" fill={sentColor(p.sentiment)} />
                            <circle cx="21" cy="13" r="1.7" fill={sentColor(p.sentiment)} />
                            <path d={mouthFor(p.sentiment)} fill="none" stroke={sentColor(p.sentiment)} strokeWidth="1.7" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <span style={{ fontStyle: 'italic', fontSize: 14, color: '#8a8a8a', letterSpacing: '1px' }}>{mask(p.nric)}</span>
                    <span style={{ fontSize: 16, fontWeight: 600, marginTop: 2, lineHeight: 1.2 }}>{p.subject}</span>
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#667085', lineHeight: 1.45 }}>{p.preview}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 12 }}>
                      <span style={{ fontStyle: 'italic', fontSize: 13, color: '#9a9a9a' }}>{fmt(p.mins)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 70, textAlign: 'center', color: '#9a9a9a', fontSize: 19, fontWeight: 300 }}>No queries match this filter.</div>
          )}

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <span style={{ fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: '#7a7a7a' }}>You have reached the end of your incoming queries.</span>
            <div style={{ width: 200, height: 1, background: '#bdbdbd', margin: '16px auto 0' }} />
          </div>
        </div>
      )}

      {/* ---------------- CHATS ---------------- */}
      {!isIncoming && (
        <div style={{ flex: 1, display: 'flex', minHeight: 0, background: '#f5f6f8' }}>
          {/* left list */}
          <div style={{ flex: 'none', width: 340, background: '#fafbfc', boxShadow: '1px 0 0 #e7e9ec', display: 'flex', flexDirection: 'column', minHeight: 0, zIndex: 1 }}>
            {/* dropdown header — switch between Active / Inactive chats */}
            <div style={{ flex: 'none', position: 'relative', borderBottom: '1px solid #e3e5e5' }}>
              <div onClick={() => setChatMenuOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}>
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke={chatView === 'inactive' ? '#c98a1e' : '#0a6160'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
                  {chatView === 'inactive'
                    ? (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)
                    : (<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5 6h14l3 6v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6z" /></>)}
                </svg>
                <span style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '.2px' }}>{chatView === 'inactive' ? 'Inactive Chats' : 'Active Chats'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: chatView === 'inactive' ? '#c98a1e' : '#0a6160', color: '#fff', fontSize: 11.5, fontWeight: 700 }}>{(chatView === 'inactive' ? idleChats : liveChats).length}</span>
                <div style={{ flex: 1 }} />
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#555" style={{ flex: 'none', transform: chatMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M7 10l5 5 5-5z" /></svg>
              </div>
              {chatMenuOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 8, right: 8, background: '#fff', borderRadius: 12, boxShadow: '0 8px 28px rgba(16,24,40,.16)', border: '1px solid #e7e9ec', padding: 6, zIndex: 20 }}>
                  {[['active', 'Active Chats', liveChats.length, '#0a6160'], ['inactive', 'Inactive · no reply', idleChats.length, '#c98a1e']].map(([key, label, count, col]) => (
                    <div key={key} onClick={() => { setChatView(key); setChatMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: chatView === key ? `${col}12` : 'transparent' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, flex: 'none' }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1c', flex: 1 }}>{label}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: col, color: '#fff', fontSize: 11, fontWeight: 700 }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="cpf-scroll" style={{ flex: 1, overflow: 'auto' }}>
              {(chatView === 'inactive' ? idleChats : liveChats).map((row) => (
                <div key={row.id} onClick={() => open(row.id)} style={{ position: 'relative', cursor: 'pointer', borderBottom: '1px solid #e3e5e5', padding: '14px 18px 14px 24px', transition: 'background .15s', background: row.isOpen ? '#ffffff' : (row.idle ? 'rgba(201,138,30,0.05)' : 'rgba(12,134,132,0.03)'), boxShadow: row.isOpen ? 'inset 0 0 0 2px #24a09f' : 'none' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: sentColor(row.sentiment), opacity: row.idle ? .45 : 1 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1, color: row.idle ? '#555' : '#1c1c1c' }}>{row.name}</span>
                    {row.showAlert && !row.idle && (
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#ca2424', lineHeight: 1, flex: 'none' }}>!</span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 300, color: row.idle ? '#777' : '#444', display: 'block', marginTop: 4, lineHeight: 1.35, maxHeight: 36, overflow: 'hidden' }}>{row.preview}</span>
                  {row.idle
                    ? <span style={{ fontSize: 12, fontWeight: 600, color: '#c98a1e', display: 'block', marginTop: 5 }}>⏳ No reply · {row.waitH}h</span>
                    : <span style={{ fontSize: 12, display: 'block', marginTop: 5 }}>{custStatus(row.custMins)}</span>}
                </div>
              ))}
              {(chatView === 'inactive' ? idleChats : liveChats).length === 0 && (
                <div style={{ padding: '20px 18px', fontSize: 13, color: '#9a9a9a', fontStyle: 'italic' }}>
                  {chatView === 'inactive' ? 'No inactive chats — everyone has replied.' : 'No active chats right now.'}
                </div>
              )}
            </div>
          </div>

          {/* messenger */}
          {hasOpen ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#e9e2d9' }}>
              <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '11px 22px', background: '#f4f4f4', boxShadow: '0 2px 5px rgba(0,0,0,.12)', zIndex: 2 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#d9d9d9', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <svg viewBox="0 0 24 24" width="34" height="34" fill="#727272"><circle cx="12" cy="8" r="4" /><path d="M4 20.5c0-4.2 3.8-6.2 8-6.2s8 2 8 6.2V21H4z" /></svg>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{oc.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{custStatus(oc.mins ?? 0)}<span style={{ color: '#8a8a8a' }}> · {oc.subject}</span></span>
                </div>
                <button onClick={() => resolveCase(openChatId)} title="Resolve this case" style={{ flex: 'none', border: 'none', cursor: 'pointer', background: '#0a6160', color: '#fff', fontWeight: 700, fontSize: 14, padding: '11px 20px', borderRadius: 24, boxShadow: '0 2px 8px rgba(10,97,96,.32)', letterSpacing: '.3px' }}>✓ Resolve</button>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#fff', boxShadow: '2px 2px 6px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}>
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="#1a981e"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.56.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.56 1 1 0 0 1-.24 1l-2.23 2.24z" /></svg>
                </div>
              </div>

              <div ref={msgRef} className="cpf-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px 26px 14px', display: 'flex', flexDirection: 'column', gap: 3, background: '#e9e2d9' }}>
                <div style={{ alignSelf: 'center', background: '#fff', borderRadius: 14, padding: '5px 16px', fontSize: 13, color: '#666', boxShadow: '0 1px 1px rgba(0,0,0,.08)', marginBottom: 8 }}>Today</div>
                {msgs.map((m) => {
                  // Auto-translated citizen message (relay kept the original) → local "Show original" toggle.
                  const auto = !m.right && m.original && m.original !== m.text;
                  // Otherwise, a non-English citizen message we couldn't auto-translate → on-demand translate.
                  const onDemand = !m.right && !auto && !m.system && oc.langCode && oc.langCode !== 'en' && m.text;
                  const tr = onDemand ? translations[m.text] : null;
                  const showingOrig = showOrig[m.text];
                  const body = auto
                    ? (showingOrig ? m.original : m.text)
                    : (tr && tr.showing && tr.translated ? tr.translated : m.text);
                  return (
                    <div key={m.key} style={{ display: 'flex', justifyContent: m.right ? 'flex-end' : 'flex-start', padding: '4px 0', animation: 'msgIn .25s ease both' }}>
                      <div style={{ maxWidth: '74%', display: 'flex', flexDirection: 'column', alignItems: m.right ? 'flex-end' : 'flex-start' }}>
                        <div style={{ padding: '12px 16px', borderRadius: m.right ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.right ? '#dcf6c8' : '#ffffff', color: '#1c1c1c', fontSize: 15, lineHeight: 1.45, whiteSpace: 'pre-wrap', boxShadow: '0 1px 1px rgba(0,0,0,0.08)' }}>{body}</div>
                        {auto && (
                          <button onClick={() => toggleOrig(m.text)} style={TRANS_BTN}>
                            {showingOrig ? `🌐 Show English` : `↩ Show original (${LANG_NAME[m.originalLang] || m.originalLang})`}
                          </button>
                        )}
                        {onDemand && (
                          <button onClick={() => translateMsg(m.text, oc.langCode)} style={TRANS_BTN}>
                            {tr && tr.loading ? '🌐 Translating…' : tr && tr.error ? '⚠ Unavailable — retry' : tr && tr.showing && tr.translated ? '↩ Show original' : '🌐 Translate to English'}
                          </button>
                        )}
                        {m.right && m.translated && (
                          <span style={SENT_IN}>{`↳ sent in ${LANG_NAME[m.translatedLang] || m.translatedLang}: ${m.translated}`}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {typing && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '4px 0' }}>
                    <div style={{ background: '#fff', borderRadius: '16px 16px 16px 4px', padding: '15px 18px', display: 'flex', gap: 5, boxShadow: '0 1px 1px rgba(0,0,0,.08)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9a9a9a', animation: 'blink 1.2s infinite' }} />
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9a9a9a', animation: 'blink 1.2s infinite .2s' }} />
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9a9a9a', animation: 'blink 1.2s infinite .4s' }} />
                    </div>
                  </div>
                )}
              </div>

              {oc.langCode && oc.langCode !== 'en' && (
                <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 20px', background: '#eef4f4', borderTop: '1px solid #dde7e7', fontSize: 12.5, color: '#0a6160', fontWeight: 600 }}>
                  <span>🌐</span><span>{`Type in English — replies are auto-translated to ${oc.language} before sending.`}</span>
                </div>
              )}
              {composeFlag && (
                <div role="alert" style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#fee4e2', borderTop: '1px solid #f5b5ad', color: '#912018', fontSize: 13, fontWeight: 600 }}>
                  <span aria-hidden="true">🚫</span>
                  <span>This looks like a member’s account amount or personal identifier (e.g. NRIC). For their security it can’t be sent by text — please remove it.</span>
                </div>
              )}
              <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: '#f4f4f4', boxShadow: '0 -2px 5px rgba(0,0,0,.1)' }}>
                <div className="cpf-icon-btn" style={{ width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </div>
                <input className="cpf-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} placeholder="Type a message…" style={{ flex: 1, border: 'none', outline: 'none', background: '#fff', borderRadius: 24, padding: '14px 20px', fontSize: 15, fontFamily: 'inherit', boxShadow: `inset 0 0 0 ${composeFlag ? '2px #d92d20' : '1px #ddd'}` }} />
                <div className="cpf-send-btn" onClick={composeFlag ? undefined : send} style={{ width: 50, height: 50, borderRadius: '50%', background: composeFlag ? '#c9ccce' : '#0a6160', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: composeFlag ? 'not-allowed' : 'pointer', flex: 'none', boxShadow: '0 2px 6px rgba(10,97,96,.4)' }}>
                  <svg viewBox="0 0 24 24" width="23" height="23" fill="#fff"><path d="M3 20l18-8L3 4v6.2l12 1.8-12 1.8z" /></svg>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a9a9a', fontSize: 20, fontWeight: 300, background: '#e9e2d9' }}>Select a chat to begin</div>
          )}

          {/* right panel */}
          <div style={{ flex: 'none', width: 520, background: '#f5f6f8', display: 'flex', flexDirection: 'column', minHeight: 0, borderLeft: '1px solid #e0e2e2' }}>
            <div style={{ flex: 'none', padding: '16px 18px 6px' }}>
              <div style={{ display: 'flex', background: '#e6e9ec', borderRadius: 24, padding: 4, gap: 4 }}>
                <div style={seg(infoTab === 'info')} onClick={() => setInfoTab('info')}>User Information</div>
                <div style={seg(infoTab === 'history')} onClick={() => setInfoTab('history')}>Chat History</div>
              </div>
            </div>
            <div className="cpf-scroll" style={{ flex: 1, overflow: 'auto', padding: '10px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {hasOpen && infoTab === 'info' && (
                <>
                  <div style={{ background: '#fff', borderRadius: 16, padding: 20, ...cardShadow }}>
                    <span style={{ fontSize: 24, fontWeight: 700 }}>{oc.name}</span>
                    <div style={{ fontSize: 12.5, color: '#555', marginTop: 5, lineHeight: 1.4 }}>{`${mask(oc.nric)}  ·  Age ${oc.age}  ·  ${oc.phone}`}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                      <Field label="Date of birth" value={oc.dob} />
                      <Field label="Address" value={oc.address} />
                      <Field label="Preferred language" value={oc.language} />
                      <Field label="Nationality" value={oc.citizenship} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <Balance label="Ordinary (OA)" value={oc.balances.oa} />
                    <Balance label="MediSave (MA)" value={oc.balances.ma} />
                    <Balance label="Retirement (RA)" value={oc.balances.ra} />
                  </div>

                  <Panel title="Retirement Overview">
                    <Row k="Retirement sum elected" v={oc.retirement.sum} />
                    <Row k="Monthly payout" v={oc.retirement.payout} />
                    <Row k="Payout start date" v={oc.retirement.start} />
                    <Row k="Shortfall vs Full RS" v={oc.retirement.shortfall} />
                  </Panel>

                  <Panel title="Schemes">
                    {schemesList.map((s) => (
                      <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <span style={{ color: '#333', fontWeight: 500 }}>{s.name}</span>
                        <span style={statusStyleFor(s.status)}>{s.status}</span>
                      </div>
                    ))}
                  </Panel>

                  <Panel title="Flags & Alerts">
                    {flags.length > 0 ? flags.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                        <span style={{ flex: 'none', width: 7, height: 7, borderRadius: '50%', background: '#ca2424', marginTop: 7 }} />
                        <span style={{ fontSize: 13.5, lineHeight: 1.4, color: '#333' }}>{f}</span>
                      </div>
                    )) : (
                      <div style={{ fontSize: 14, color: '#1a981e', fontWeight: 500 }}>No active flags — account in good standing.</div>
                    )}
                  </Panel>
                </>
              )}

              {hasOpen && infoTab === 'history' && (
                <>
                  <div style={{ fontSize: 12, color: '#8a8a8a', fontWeight: 500, letterSpacing: '.5px', margin: '4px 2px 2px' }}>PRIOR SESSION</div>
                  <div style={{ background: '#fff', borderRadius: 16, ...cardShadow, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 16px', background: '#0a6160', color: '#fff' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: '#24a09f', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="11" rx="3.5" /><path d="M12 4.5v3.5" /><circle cx="12" cy="3.6" r="1.1" fill="#fff" stroke="none" /><circle cx="9" cy="13.4" r="1.3" fill="#fff" stroke="none" /><circle cx="15" cy="13.4" r="1.3" fill="#fff" stroke="none" /><path d="M9.5 16.4h5" /></svg>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>PULSE</span>
                        <span style={{ fontSize: 11.5, opacity: .82 }}>AI Chatbot session · Today · 09:14</span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.6px', padding: '4px 9px', borderRadius: 10, background: 'rgba(255,255,255,.22)' }}>AI</span>
                    </div>
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 5, background: '#f4f6f6' }}>
                      {(hasOpen && oc.priorSession ? oc.priorSession : []).map((b, idx) => {
                        // Both halves of the prior bot session are in the citizen's language
                        // (the bot replies natively), so any bubble is translatable — not just the
                        // citizen's (b.right). Officer messages don't appear in this prior session.
                        const canTranslate = oc.langCode && oc.langCode !== 'en' && b.text;
                        const tr = canTranslate ? translations[b.text] : null;
                        const body = tr && tr.showing && tr.translated ? tr.translated : b.text;
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: b.right ? 'flex-end' : 'flex-start', padding: '3px 0' }}>
                            <div style={{ maxWidth: '84%', display: 'flex', flexDirection: 'column', alignItems: b.right ? 'flex-end' : 'flex-start' }}>
                              <div style={{ padding: '9px 13px', borderRadius: b.right ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: b.right ? '#dcf6c8' : '#e6efef', color: '#1c1c1c', fontSize: 13.5, lineHeight: 1.42, whiteSpace: 'pre-wrap', boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>{body}</div>
                              {canTranslate && (
                                <button onClick={() => translateMsg(b.text, oc.langCode)} style={TRANS_BTN}>
                                  {tr && tr.loading ? '🌐 Translating…' : tr && tr.error ? '⚠ Unavailable — retry' : tr && tr.showing && tr.translated ? '↩ Show original' : `🌐 Translate from ${oc.language}`}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', background: '#fff', borderTop: '1px solid #eee' }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#c98a1e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M5 12h12" /><path d="M13 6l6 6-6 6" /></svg>
                      <span style={{ fontSize: 12.5, color: '#c98a1e', fontWeight: 600, lineHeight: 1.3 }}>{`Escalated to a live officer · ${oc.name}`}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- subviews --- */

function NavRail({ collapsed, onToggle, isIncoming, setTab, incomingCount, activeCount, headerColor, logoSrc }) {
  const width = collapsed ? 96 : 300;
  const navItem = (active) => ({
    position: 'relative', display: 'flex', alignItems: 'center', gap: 15,
    padding: collapsed ? '14px 0' : '13px 16px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    borderRadius: 14, cursor: 'pointer', margin: collapsed ? '0 12px' : '0 16px', transition: 'background .15s',
    background: active ? 'rgba(255,255,255,.17)' : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,.72)',
    boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,.2)' : 'none',
  });
  const badge = (n, active) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 26, padding: '0 8px', borderRadius: 13, background: active ? '#fff' : 'rgba(255,255,255,.9)', color: headerColor, fontSize: 13, fontWeight: 800, flex: 'none' }}>{n}</span>
  );
  // Collapsed: a small count chip pinned to the icon's corner (numbers still visible).
  const cornerCount = (n) => n > 0 && (
    <span style={{ position: 'absolute', top: 4, right: 14, minWidth: 20, height: 20, padding: '0 5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: '#ffb020', color: '#3d2a00', fontSize: 11.5, fontWeight: 800, boxShadow: `0 0 0 2px ${headerColor}` }}>{n}</span>
  );
  return (
    <div style={{ flex: 'none', width, background: headerColor, display: 'flex', flexDirection: 'column', transition: 'width .2s cubic-bezier(.4,0,.2,1)', boxShadow: '2px 0 24px rgba(0,0,0,.18)', zIndex: 6, overflow: 'hidden' }}>
      {/* Brand — logo stacked above the wordmark so nothing clips (logo is landscape) */}
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'flex-start', gap: 14, padding: collapsed ? '28px 0 22px' : '32px 24px 24px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="CPF Board" style={{ height: collapsed ? 34 : 52, width: 'auto', maxWidth: collapsed ? 64 : '100%', objectFit: 'contain', borderRadius: 7, flex: 'none' }} />
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.28, minWidth: 0 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 19, letterSpacing: '.2px' }}>Queries Dashboard</span>
            <span style={{ color: 'rgba(255,255,255,.68)', fontStyle: 'italic', fontWeight: 300, fontSize: 12.5 }}>Customer Correspondence Unit</span>
          </div>
        )}
      </div>

      <div style={{ flex: 'none', height: 1, background: 'rgba(255,255,255,.12)', margin: collapsed ? '0 16px' : '0 20px' }} />

      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
        <div className="cpf-nav-item" style={navItem(isIncoming)} onClick={() => setTab('incoming')} title="Incoming">
          <NavInboxIcon active={isIncoming} />
          {collapsed && cornerCount(incomingCount)}
          {!collapsed && <span style={{ fontWeight: 600, fontSize: 15.5, flex: 1, whiteSpace: 'nowrap' }}>Incoming</span>}
          {!collapsed && badge(incomingCount, isIncoming)}
        </div>
        <div className="cpf-nav-item" style={navItem(!isIncoming)} onClick={() => setTab('chats')} title="Current chats">
          <NavChatsIcon active={!isIncoming} />
          {collapsed && cornerCount(activeCount)}
          {!collapsed && <span style={{ fontWeight: 600, fontSize: 15.5, flex: 1, whiteSpace: 'nowrap' }}>Current Chats</span>}
          {!collapsed && activeCount > 0 && badge(activeCount, !isIncoming)}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div onClick={onToggle} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="cpf-nav-item" style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '13px 0' : '13px 16px', margin: collapsed ? '0 12px 6px' : '0 16px 6px', borderRadius: 14, cursor: 'pointer', color: 'rgba(255,255,255,.66)' }}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flex: 'none' }}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
        {!collapsed && <span style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap' }}>Collapse</span>}
      </div>

      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: collapsed ? '16px 0 24px' : '16px 24px 24px', borderTop: '1px solid rgba(255,255,255,.16)', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#4749be', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flex: 'none' }}>PL</div>
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Patricia Lam</span>
            <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 11.5, whiteSpace: 'nowrap' }}>Correspondence Officer</span>
          </div>
        )}
      </div>
    </div>
  );
}
function NavInboxIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="24" fill="none" stroke={active ? '#fff' : 'rgba(255,255,255,.78)'} strokeWidth="1.6" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M3 5h13v9H8l-4 3v-3H3z" /><path d="M8.5 9.5h11v8h-3v2l-3-2" />
    </svg>
  );
}
function NavChatsIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke={active ? '#fff' : 'rgba(255,255,255,.78)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5 6h14l3 6v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6z" />
    </svg>
  );
}
function StatIconChats({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 9 9 0 0 1-3.6-.7L3 21l1.8-4.8A8.4 8.4 0 1 1 21 11.5z" /></svg>
  );
}
function StatIconInbox({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke={color} strokeWidth="1.9" strokeLinejoin="round"><path d="M3 5h13v9H8l-4 3v-3H3z" /><path d="M8.5 9.5h11v8h-3v2l-3-2" /></svg>
  );
}
function StatIconClock({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
  );
}
function StatIconCheck({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
  );
}
function StatCard({ value, label, sub, subColor, accent, icon }) {
  return (
    <div className="cpf-stat-card" style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(145deg, ${accent}14 0%, ${accent}09 34%, #f4f6f9 100%)`, borderRadius: 20, padding: '22px 24px', border: '1px solid #e7eaee', boxShadow: '0 1px 2px rgba(16,24,40,.03), 0 10px 26px rgba(16,24,40,.05)', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150 }}>
      {/* header: icon + what the metric is */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}20`, boxShadow: `inset 0 0 0 1px ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{icon}</div>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.9px', color: '#7c8698', textTransform: 'uppercase', lineHeight: 1.3 }}>{label}</span>
      </div>
      {/* value + adaptive status */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.5, letterSpacing: '-1.8px', color: '#101828', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 20, background: `${subColor}16`, color: subColor, fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', boxShadow: `inset 0 0 0 1px ${subColor}2b`, marginBottom: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: subColor, flex: 'none' }} />
          {sub}
        </span>
      </div>
    </div>
  );
}
function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 12, color: '#8a8a8a' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
function Balance({ label, value }) {
  return (
    <div style={{ flex: 1, background: 'linear-gradient(155deg,#0c8a88,#0a6160)', borderRadius: 14, padding: '13px 8px', textAlign: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(10,97,96,.22)' }}>
      <div style={{ fontSize: 12, opacity: .85 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 3 }}>{value}</div>
    </div>
  );
}
function Panel({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 18, ...cardShadow }}>
      <span style={{ fontStyle: 'italic', fontSize: 17, color: '#333', fontWeight: 500 }}>{title}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>{children}</div>
    </div>
  );
}
function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: '#555' }}>{k}</span>
      <span style={{ fontWeight: 700 }}>{v}</span>
    </div>
  );
}
