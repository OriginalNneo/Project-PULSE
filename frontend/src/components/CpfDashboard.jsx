'use client';


import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';

/* ------------------------------------------------------------------ data --- */

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
    { id: 'ahamed', name: 'Ahamed Faizal', sal: 'Mr Faizal', nric: 'S8456789E', age: 38, phone: '+65 9567 8901', dob: '17 Sep 1987', address: 'Blk 501 Jurong West St 51, #09-44', language: 'Malay', urgency: 'low', sentiment: 'sad', subject: 'Housing withdrawal for HDB flat', preview: 'Concerned a CPF housing withdrawal may have been wrongly processed for his new flat\u2026', mins: 18,
      balances: { oa: '$3,180', ma: '$19,540', ra: '$24,300' }, flags: ['Low OA balance after recent housing withdrawal'],
      summary: 'User is concerned that a CPF housing withdrawal for his new HDB flat may have been processed incorrectly.', q: 'I think too much was deducted from my OA, can you check?' },
    { id: 'lee', name: 'Lee Cheng Wei', sal: 'Mr Lee', nric: 'S9156782F', age: 35, phone: '+65 9678 9012', dob: '02 Jan 1991', address: 'Blk 19 Telok Blangah Cres, #07-30', urgency: 'medium', sentiment: 'neutral', subject: 'MediShield Life premium', preview: 'Disputes a MediShield Life premium deduction he says was charged twice this year\u2026', mins: 25,
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
      summary: 'User is new to the workforce and is asking how employer CPF contributions and account allocation work.', q: 'I just started work \u2014 how does CPF actually work?' }
  ];
  const out = {};
  raw.forEach(function (p) {
    const sal = p.sal || 'Sir/Madam';
    const thread = p.thread || [
      { from: 'cust', text: '[Summary of query]\n' + (p.summary || p.subject) },
      { from: 'officer', text: 'Dear ' + sal + ',\n\nThank you for reaching out to the CPF Board. We will connect you with a Customer Care Officer shortly.' }
    ].concat(p.q ? [{ from: 'cust', text: p.q }] : []);
    out[p.id] = Object.assign({ citizenship: C, language: 'English', balances: dB, retirement: dR, schemes: dS, flags: [] }, p, { thread: thread });
  });
  return out;
})();

/* -------------------------------------------------------------- helpers --- */

const fmt = (m) => (m < 1 ? 'Just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} hr ago`);
const mask = (n) => (n ? n[0] + '\u2022\u2022\u2022\u2022' + n.slice(-3) : '');
const colorFor = (u) => (u === 'urgent' ? '#ca2424' : u === 'medium' ? '#c98a1e' : '#1a981e');
const tintFor = (u) => (u === 'urgent' ? 'rgba(202,36,36,.10)' : u === 'medium' ? 'rgba(201,138,30,.14)' : 'rgba(26,152,30,.12)');
const labelFor = (u) => (u === 'urgent' ? 'Urgent' : u === 'medium' ? 'Medium' : 'Low');
const urgRank = (u) => (u === 'urgent' ? 3 : u === 'medium' ? 2 : 1);
const SENT = { angry: 4, frustrated: 4, sad: 3, confused: 2, neutral: 1, happy: 0 };
const sentRank = (s) => (SENT[s] != null ? SENT[s] : 1);
const mouthFor = (s) => (({ happy: 'M 9 19 Q 16 25 23 19', neutral: 'M 10 21 L 22 21', sad: 'M 9 23 Q 16 17 23 23', angry: 'M 9 23 Q 16 18 23 23', frustrated: 'M 10 23 Q 16 18 22 23', confused: 'M 9 22 Q 12 19 15 22 Q 18 25 22 21' })[s] || 'M 10 21 L 22 21');

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

const pill = (on) => ({ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 20px', borderRadius: 24, cursor: 'pointer', fontWeight: 600, fontSize: 16, letterSpacing: '.4px', transition: 'all .2s', background: on ? '#1f8f8d' : 'rgba(255,255,255,.07)', color: on ? '#fff' : 'rgba(255,255,255,.82)', boxShadow: on ? '0 4px 14px rgba(0,0,0,.18)' : 'none' });
const seg = (on) => ({ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 14.5, transition: 'all .2s', background: on ? '#fff' : 'transparent', color: on ? '#0a6160' : '#667085', boxShadow: on ? '0 1px 2px rgba(16,24,40,.12)' : 'none' });
const statusStyleFor = (st) => ({ color: (st === 'Active' || st === 'Enrolled' || st === 'Eligible') ? '#1a981e' : '#555', fontWeight: 700, fontSize: 14 });
const cardShadow = { boxShadow: '0 1px 2px rgba(16,24,40,.04),0 6px 16px rgba(16,24,40,.05)', border: '1px solid #ebedf0' };

/* ------------------------------------------------------------ component --- */

export default function CpfDashboard({ simulateReplies = true, replyDelaySec = 1.7, headerColor = '#0a6160', logoSrc = '/cpf-logo.png' }) {
  const [tab, setTab] = useState('incoming');
  const [incoming, setIncoming] = useState(['nurul', 'raj', 'lim', 'wong', 'ahamed', 'lee', 'siti', 'thomas', 'goh']);
  const [active, setActive] = useState(['tan', 'priya', 'chen']);
  const [openChatId, setOpenChatId] = useState('tan');
  const [infoTab, setInfoTab] = useState('info');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [resolved] = useState(23);
  const [threads, setThreads] = useState(() =>
    Object.fromEntries(Object.entries(PEOPLE).map(([id, p]) => [id, p.thread.slice()]))
  );

  const msgRef = useRef(null);
  const replyIdx = useRef(0);
  const timer = useRef(null);

  useEffect(() => {
    const el = msgRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  const accept = useCallback((id) => {
    setIncoming((inc) => inc.filter((x) => x !== id));
    setActive((act) => (act.includes(id) ? act : [id, ...act.filter((x) => x !== id)]));
    setOpenChatId(id);
    setInfoTab('info');
    setTab('chats');
  }, []);

  const open = useCallback((id) => { setOpenChatId(id); setInfoTab('info'); }, []);

  const send = useCallback(() => {
    const id = openChatId;
    const text = (draft || '').trim();
    if (!text || !id) return;
    setThreads((t) => ({ ...t, [id]: [...(t[id] || []), { from: 'officer', text }] }));
    setDraft('');
    if (!simulateReplies) return;
    setTyping(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const pool = ['Okay, thank you for explaining.', 'So what should I do next?', 'I see \u2014 how long will that take?', 'Can I settle this online, or must I visit a branch?', 'Alright, I understand now. Appreciate the help.', 'But I submitted the documents last week already.', 'Got it, thank you for your patience with me.'];
      const r = pool[replyIdx.current++ % pool.length];
      setThreads((t) => ({ ...t, [id]: [...(t[id] || []), { from: 'cust', text: r }] }));
      setTyping(false);
    }, replyDelaySec * 1000);
  }, [openChatId, draft, simulateReplies, replyDelaySec]);

  /* ---- derived view data ---- */

  const queries = useMemo(() => {
    let ids = incoming.slice();
    if (filter !== 'all') ids = ids.filter((id) => PEOPLE[id].urgency === filter);
    ids.sort((a, b) => {
      const pa = PEOPLE[a], pb = PEOPLE[b];
      if (sort === 'oldest') return pb.mins - pa.mins;
      if (sort === 'urgency') return urgRank(pb.urgency) - urgRank(pa.urgency) || pa.mins - pb.mins;
      if (sort === 'sentiment') return sentRank(pb.sentiment) - sentRank(pa.sentiment) || pa.mins - pb.mins;
      return pa.mins - pb.mins;
    });
    return ids.map((id) => PEOPLE[id]);
  }, [incoming, filter, sort]);

  const activeList = useMemo(() => active.map((id) => {
    const p = PEOPLE[id];
    const t = threads[id] || [];
    const last = t[t.length - 1];
    return {
      id, name: p.name, urgency: p.urgency,
      preview: (last ? last.text : '').replace(/\s+/g, ' ').slice(0, 64),
      isOpen: id === openChatId,
      showAlert: p.urgency === 'urgent'
    };
  }), [active, threads, openChatId]);

  const oc = PEOPLE[openChatId];
  const hasOpen = !!oc;
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

  const urgentActive = active.filter((id) => PEOPLE[id].urgency === 'urgent').length;
  const isIncoming = tab === 'incoming';
  const FILTERS = [['all', 'All'], ['urgent', 'Urgent'], ['medium', 'Medium'], ['low', 'Low']];

  /* --------------------------------------------------------------- view --- */

  return (
    <div style={{ width: 'calc(100vw / 0.8)', height: 'calc(100vh / 0.8)', transform: 'scale(0.8)', transformOrigin: 'top left', display: 'flex', flexDirection: 'column', background: '#f5f6f8', overflow: 'hidden', color: '#1c1c1c', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes blink{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
        @keyframes pulsering{0%{transform:scale(1);opacity:.7}70%{transform:scale(2.4);opacity:0}100%{opacity:0}}
        @keyframes msgIn{from{transform:translateY(6px)}to{transform:none}}
        .cpf-card-hover{transition:transform .18s,box-shadow .18s,border-color .18s}
        .cpf-card-hover:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(16,24,40,.10);border-color:#d8dbe0}
        .cpf-icon-btn{transition:background .15s}.cpf-icon-btn:hover{background:#e6e6e6}
        .cpf-send-btn{transition:background .15s}.cpf-send-btn:hover{background:#0c8684}
        .cpf-scroll::-webkit-scrollbar{width:10px;height:10px}
        .cpf-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,.16);border-radius:8px}
        .cpf-scroll::-webkit-scrollbar-track{background:transparent}
        .cpf-input::placeholder{color:#a3a3a3}
      `}</style>

      {/* header */}
      <div style={{ flex: 'none', height: 64, background: headerColor, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 22, boxShadow: '0 1px 0 rgba(0,0,0,.04), 0 6px 20px rgba(10,97,96,.14)', zIndex: 5 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="CPF Board" style={{ height: 46, width: 'auto', borderRadius: 5, flex: 'none' }} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.12, flex: 'none' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 23, letterSpacing: '.2px' }}>CPF Queries Dashboard</span>
          <span style={{ color: 'rgba(255,255,255,.82)', fontStyle: 'italic', fontWeight: 300, fontSize: 13 }}>Customer Correspondence Unit</span>
        </div>
        <div style={{ display: 'flex', gap: 12, margin: '0 auto', alignItems: 'center' }}>
          <div style={pill(isIncoming)} onClick={() => setTab('incoming')}>
            <span>INCOMING</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 24, padding: '0 7px', borderRadius: 12, background: '#fff', color: '#0a6160', fontSize: 13, fontWeight: 700, fontStyle: 'italic' }}>{incoming.length}</span>
          </div>
          <div style={pill(!isIncoming)} onClick={() => setTab('chats')}>CURRENT CHATS</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#fff', fontWeight: 300, fontSize: 18 }}>
            <span style={{ position: 'relative', display: 'inline-flex', width: 14, height: 14 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#6bff9a', animation: 'pulsering 1.9s ease-out infinite' }} />
              <span style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: '#36cf6a' }} />
            </span>Live
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px 4px 5px', borderRadius: 22, background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.5)' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#4749be', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>SL</div>
            <span style={{ color: '#fff', fontWeight: 300, fontSize: 17 }}>Sharon Lee</span>
          </div>
        </div>
      </div>

      {/* ---------------- INCOMING ---------------- */}
      {isIncoming && (
        <div className="cpf-scroll" style={{ flex: 1, overflow: 'auto', padding: '28px 38px 64px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 22 }}>
            <StatCard value={String(active.length)} label="OPEN CHATS" sub={urgentActive ? `${urgentActive} urgent` : 'all calm'} subColor={urgentActive ? '#ca2424' : '#1a981e'} />
            <StatCard value={String(incoming.length)} label="INCOMING INQUIRIES" sub="+3 in the last 10 min" subColor="#ca2424" />
            <StatCard value="10m" label="AVG RESPONSE TIME" sub="Good!" subColor="#1a981e" />
            <StatCard value={String(resolved)} label="RESOLVED TODAY" sub="Good!" subColor="#1a981e" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '36px 0 20px', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <svg viewBox="0 0 24 24" width="34" height="30" fill="none" stroke="#1d1d1d" strokeWidth="1.6" strokeLinejoin="round"><path d="M3 5h13v9H8l-4 3v-3H3z" /><path d="M8.5 9.5h11v8h-3v2l-3-2" /></svg>
              <span style={{ fontSize: 20, fontWeight: 300, letterSpacing: '1.5px' }}>INCOMING QUERIES</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 26, padding: '0 8px', borderRadius: 13, background: '#0a6160', color: '#fff', fontSize: 14, fontWeight: 700 }}>{queries.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {FILTERS.map(([k, l]) => (
                  <div key={k} onClick={() => setFilter(k)} style={{ padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all .15s', background: filter === k ? '#0a6160' : '#fff', color: filter === k ? '#fff' : '#555', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>{l}</div>
                ))}
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
                  <div style={{ height: 6, background: colorFor(p.urgency) }} />
                  <div style={{ padding: '16px 18px 14px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{p.name}</span>
                      <svg viewBox="0 0 32 32" width="40" height="40" style={{ flex: 'none' }}>
                        <circle cx="16" cy="16" r="14.4" fill="none" stroke={colorFor(p.urgency)} strokeWidth="1.6" />
                        <circle cx="11" cy="13" r="1.7" fill={colorFor(p.urgency)} />
                        <circle cx="21" cy="13" r="1.7" fill={colorFor(p.urgency)} />
                        <path d={mouthFor(p.sentiment)} fill="none" stroke={colorFor(p.urgency)} strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span style={{ fontStyle: 'italic', fontSize: 14, color: '#8a8a8a', letterSpacing: '1px' }}>{mask(p.nric)}</span>
                    <span style={{ display: 'inline-block', alignSelf: 'flex-start', padding: '3px 11px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: colorFor(p.urgency), background: tintFor(p.urgency) }}>{labelFor(p.urgency)}</span>
                    <span style={{ fontSize: 16, fontWeight: 600, marginTop: 2, lineHeight: 1.2 }}>{p.subject}</span>
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#667085', lineHeight: 1.45 }}>{p.preview}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 12 }}>
                      <span style={{ fontStyle: 'italic', fontSize: 13, color: '#9a9a9a' }}>{fmt(p.mins)}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0a6160', letterSpacing: '.3px' }}>Accept →</span>
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
            <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #e3e5e5' }}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#222" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5 6h14l3 6v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6z" /></svg>
              <span style={{ fontSize: 26, fontWeight: 600, flex: 1 }}>Active Chats</span>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#333"><path d="M7 10l5 5 5-5z" /></svg>
            </div>
            <div className="cpf-scroll" style={{ flex: 1, overflow: 'auto' }}>
              {activeList.map((row) => (
                <div key={row.id} onClick={() => open(row.id)} style={{ position: 'relative', cursor: 'pointer', borderBottom: '1px solid #e3e5e5', padding: '14px 18px 14px 24px', transition: 'background .15s', background: row.isOpen ? '#ffffff' : 'rgba(12,134,132,0.03)', boxShadow: row.isOpen ? 'inset 0 0 0 2px #24a09f' : 'none' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: colorFor(row.urgency) }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>{row.name}</span>
                    {row.showAlert && (
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ca2424" strokeWidth="2.4" strokeLinecap="round" style={{ flex: 'none' }}><path d="M12 4v9" /><path d="M12 18.2v.2" /></svg>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 300, color: '#444', display: 'block', marginTop: 4, lineHeight: 1.35, maxHeight: 36, overflow: 'hidden' }}>{row.preview}</span>
                  <span style={{ fontSize: 12, fontStyle: 'italic', color: '#8a8a8a', display: 'block', marginTop: 5 }}>Just now</span>
                </div>
              ))}
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
                  <span style={{ fontSize: 13, color: '#1a981e', fontWeight: 500, marginTop: 2 }}>● Active now · {oc.subject}</span>
                </div>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#fff', boxShadow: '2px 2px 6px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}>
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="#1a981e"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.56.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.56 1 1 0 0 1-.24 1l-2.23 2.24z" /></svg>
                </div>
              </div>

              <div ref={msgRef} className="cpf-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px 26px 14px', display: 'flex', flexDirection: 'column', gap: 3, background: '#e9e2d9' }}>
                <div style={{ alignSelf: 'center', background: '#fff', borderRadius: 14, padding: '5px 16px', fontSize: 13, color: '#666', boxShadow: '0 1px 1px rgba(0,0,0,.08)', marginBottom: 8 }}>Today</div>
                {msgs.map((m) => (
                  <div key={m.key} style={{ display: 'flex', justifyContent: m.right ? 'flex-end' : 'flex-start', padding: '4px 0', animation: 'msgIn .25s ease both' }}>
                    <div style={{ maxWidth: '74%', padding: '12px 16px', borderRadius: m.right ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.right ? '#dcf6c8' : '#ffffff', color: '#1c1c1c', fontSize: 15, lineHeight: 1.45, whiteSpace: 'pre-wrap', boxShadow: '0 1px 1px rgba(0,0,0,0.08)' }}>{m.text}</div>
                  </div>
                ))}
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

              <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: '#f4f4f4', boxShadow: '0 -2px 5px rgba(0,0,0,.1)' }}>
                <div className="cpf-icon-btn" style={{ width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </div>
                <input className="cpf-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} placeholder="Type a message…" style={{ flex: 1, border: 'none', outline: 'none', background: '#fff', borderRadius: 24, padding: '14px 20px', fontSize: 15, fontFamily: 'inherit', boxShadow: 'inset 0 0 0 1px #ddd' }} />
                <div className="cpf-send-btn" onClick={send} style={{ width: 50, height: 50, borderRadius: '50%', background: '#0a6160', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none', boxShadow: '0 2px 6px rgba(10,97,96,.4)' }}>
                  <svg viewBox="0 0 24 24" width="23" height="23" fill="#fff"><path d="M3 20l18-8L3 4v6.2l12 1.8-12 1.8z" /></svg>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a9a9a', fontSize: 20, fontWeight: 300, background: '#e9e2d9' }}>Select a chat to begin</div>
          )}

          {/* right panel */}
          <div style={{ flex: 'none', width: 404, background: '#f5f6f8', display: 'flex', flexDirection: 'column', minHeight: 0, borderLeft: '1px solid #e0e2e2' }}>
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
                      {botMsgs.map((b) => (
                        <div key={b.key} style={{ display: 'flex', justifyContent: b.right ? 'flex-end' : 'flex-start', padding: '3px 0' }}>
                          <div style={{ maxWidth: '84%', padding: '9px 13px', borderRadius: b.right ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: b.right ? '#dcf6c8' : '#e6efef', color: '#1c1c1c', fontSize: 13.5, lineHeight: 1.42, whiteSpace: 'pre-wrap', boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>{b.text}</div>
                        </div>
                      ))}
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
  );
}

/* ----------------------------------------------------------- subviews --- */

function StatCard({ value, label, sub, subColor }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', ...cardShadow, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 46, fontWeight: 700, lineHeight: 1, letterSpacing: '-1.5px' }}>{value}</span>
      <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: '1px', color: '#667085' }}>{label}</span>
      <span style={{ color: subColor, fontStyle: 'italic', fontSize: 14 }}>{sub}</span>
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
