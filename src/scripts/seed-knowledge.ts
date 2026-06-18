/**
 * Seeds cpf_knowledge, cpf_sections, cpf_terminology into pulse DB.
 * Also migrates slang_dictionary from pulse_tools → pulse.
 * Run with: npx tsx src/scripts/seed-knowledge.ts
 */
import "dotenv/config";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;

// ── Sections ──────────────────────────────────────────────────────────────────
const SECTIONS = [
  { sectionKey: "accounts", title: "CPF Accounts", url: "https://www.cpf.gov.sg/member/growing-your-savings", summary: "The four CPF accounts and how they work." },
  { sectionKey: "retirement", title: "Retirement Income", url: "https://www.cpf.gov.sg/member/retirement-income", summary: "CPF LIFE, retirement sums, and monthly payouts." },
  { sectionKey: "healthcare", title: "Healthcare Financing", url: "https://www.cpf.gov.sg/member/healthcare-financing", summary: "MediSave, MediShield Life, and CareShield Life." },
  { sectionKey: "housing", title: "Home Ownership", url: "https://www.cpf.gov.sg/member/owning-a-home", summary: "Using CPF savings for housing." },
  { sectionKey: "investment", title: "CPF Investment Scheme", url: "https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/cpf-investment-scheme", summary: "Investing CPF savings for higher returns." },
  { sectionKey: "contributions", title: "CPF Contributions", url: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions", summary: "Contribution rates, ceilings, and rules." },
  { sectionKey: "employment", title: "Self-Employed & Employers", url: "https://www.cpf.gov.sg/member/self-employed-matters", summary: "CPF for self-employed persons and employers." },
  { sectionKey: "topups", title: "Top-Ups & Schemes", url: "https://www.cpf.gov.sg/member/growing-your-savings/saving-more-with-cpf", summary: "Top-up schemes and government matching." },
  { sectionKey: "withdrawal", title: "Withdrawals", url: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/withdrawing-for-retirement", summary: "Withdrawing CPF at 55 and beyond." },
  { sectionKey: "general", title: "CPF Overview", url: "https://www.cpf.gov.sg/member/cpf-overview", summary: "Introduction to CPF." },
];

// ── Knowledge Documents ───────────────────────────────────────────────────────
const DOCUMENTS = [
  // ── General ──
  {
    docId: "gen-001", sectionKey: "general", topic: "What is CPF",
    title: "What is the CPF (Central Provident Fund)?",
    summary: "CPF is Singapore's mandatory social security savings scheme. It helps working Singaporeans and Permanent Residents save for retirement, healthcare, and home ownership.",
    keyFacts: [
      "CPF stands for Central Provident Fund.",
      "All Singapore citizens and Permanent Residents working in Singapore must contribute to CPF.",
      "Both employees and employers contribute a percentage of wages to CPF.",
      "CPF savings are split across four accounts: Ordinary Account (OA), Special Account (SA), MediSave Account (MA), and Retirement Account (RA).",
      "RA is created automatically when you turn 55.",
    ],
    audienceTags: ["all", "new-member", "pr", "citizen"],
    sourceUrl: "https://www.cpf.gov.sg/member/cpf-overview",
    confidence: "high",
  },

  // ── Accounts ──
  {
    docId: "acc-001", sectionKey: "accounts", topic: "CPF Accounts Overview",
    title: "The Four CPF Accounts",
    summary: "CPF savings are held in four accounts: Ordinary Account (OA) for housing and education, Special Account (SA) for retirement, MediSave Account (MA) for healthcare, and Retirement Account (RA) created at age 55.",
    keyFacts: [
      "Ordinary Account (OA): earns 2.5% interest per year. Can be used for housing, CPF investment scheme (CPFIS), and education.",
      "Special Account (SA): earns 4% interest per year. Mainly for retirement savings.",
      "MediSave Account (MA): earns 4% interest per year. Used for hospitalisation and approved healthcare costs.",
      "Retirement Account (RA): created at age 55 by combining OA and SA savings. Earns 4% interest per year.",
      "The first $60,000 of combined CPF balances earns an extra 1% interest (up to $20,000 from OA).",
      "Members aged 55 and above earn an additional 1% on the first $30,000 of combined balances.",
    ],
    audienceTags: ["all", "employee", "employer"],
    sourceUrl: "https://www.cpf.gov.sg/member/infohub/cpf-overview/types-of-cpf-accounts",
    confidence: "high",
  },
  {
    docId: "acc-002", sectionKey: "accounts", topic: "CPF Interest Rates",
    title: "CPF Interest Rates",
    summary: "OA earns 2.5% per year. SA, MA, and RA earn 4% per year. Extra 1% is earned on the first $60,000 of combined balances.",
    keyFacts: [
      "Ordinary Account (OA) interest rate: 2.5% per annum.",
      "Special Account (SA) interest rate: 4% per annum.",
      "MediSave Account (MA) interest rate: 4% per annum.",
      "Retirement Account (RA) interest rate: 4% per annum.",
      "Extra 1% per annum on first $60,000 of combined CPF balances (cap of $20,000 from OA).",
      "Members aged 55 and above: additional extra 1% on first $30,000 of combined balances.",
      "Interest is computed monthly and credited annually in January.",
    ],
    audienceTags: ["all", "employee"],
    sourceUrl: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-interest-rates",
    confidence: "high",
  },

  // ── Contributions ──
  {
    docId: "con-001", sectionKey: "contributions", topic: "CPF Contribution Rates",
    title: "CPF Contribution Rates by Age",
    summary: "CPF contribution rates depend on age. For employees aged 55 and below, the total rate is 37% (20% from employee, 17% from employer). Rates decrease at age 55, 60, 65, and 70.",
    keyFacts: [
      "Age 55 and below: employee 20%, employer 17%, total 37%.",
      "Age 55 to 60: employee 13%, employer 13%, total 26%.",
      "Age 60 to 65: employee 7.5%, employer 9%, total 16.5%.",
      "Age 65 to 70: employee 5%, employer 7.5%, total 12.5%.",
      "Age above 70: employee 5%, employer 7.5%, total 12.5%.",
      "Ordinary Wage (OW) ceiling: $8,000 per month (from 1 September 2023).",
      "Annual wage ceiling: $102,000 per year.",
    ],
    audienceTags: ["employee", "employer"],
    sourceUrl: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/cpf-contribution-and-allocation-rates",
    confidence: "high",
  },
  {
    docId: "con-002", sectionKey: "contributions", topic: "CPF Allocation Rates",
    title: "How CPF Contributions Are Allocated",
    summary: "CPF contributions are split between OA, SA, and MA based on your age. Younger members allocate more to OA; older members allocate more to SA and MA.",
    keyFacts: [
      "Age 35 and below: OA 23%, SA 6%, MA 8% (of wage).",
      "Age 35 to 45: OA 21%, SA 7%, MA 9% (of wage).",
      "Age 45 to 50: OA 19%, SA 8%, MA 10% (of wage).",
      "Age 50 to 55: OA 15%, SA 11.5%, MA 10.5% (of wage).",
      "Age 55 to 60: OA 12%, SA 3.5%, MA 10.5% (of wage).",
      "Age 60 to 65: OA 3.5%, SA 2.5%, MA 10.5% (of wage).",
      "Age 65 and above: OA 1%, SA 1%, MA 10.5% (of wage).",
    ],
    audienceTags: ["employee"],
    sourceUrl: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/cpf-contribution-and-allocation-rates",
    confidence: "high",
  },

  // ── Retirement ──
  {
    docId: "ret-001", sectionKey: "retirement", topic: "CPF LIFE",
    title: "What is CPF LIFE?",
    summary: "CPF LIFE (Lifelong Income For the Elderly) is a national longevity insurance annuity scheme that provides Singaporeans with monthly payouts for as long as they live, starting from their payout eligibility age (age 65).",
    keyFacts: [
      "CPF LIFE provides lifelong monthly payouts — payouts continue even after your savings run out.",
      "Payout eligibility age is 65 for members born in 1958 or later.",
      "You are automatically enrolled in CPF LIFE if your RA savings meet the Basic Retirement Sum (BRS) at age 65.",
      "Three CPF LIFE plans: Standard Plan (fixed monthly payouts), Escalating Plan (payouts increase by 2% each year), Basic Plan (lower payouts, higher bequest to nominees).",
      "You can defer payouts beyond 65 (up to age 70) to receive higher monthly amounts.",
      "Example payouts for FRS members: approximately $1,500 to $1,600 per month under the Standard Plan.",
    ],
    audienceTags: ["retirement", "55-above", "elderly"],
    sourceUrl: "https://www.cpf.gov.sg/member/retirement-income/cpf-life",
    confidence: "high",
  },
  {
    docId: "ret-002", sectionKey: "retirement", topic: "Retirement Sums",
    title: "Basic, Full, and Enhanced Retirement Sums",
    summary: "CPF members must set aside a retirement sum in their RA at age 55. The Basic Retirement Sum (BRS), Full Retirement Sum (FRS), and Enhanced Retirement Sum (ERS) determine monthly payout amounts.",
    keyFacts: [
      "Basic Retirement Sum (BRS) 2025: $106,500. Provides lower monthly payouts; members must own a property with sufficient value.",
      "Full Retirement Sum (FRS) 2025: $213,000. The standard retirement sum that provides a comfortable monthly payout.",
      "Enhanced Retirement Sum (ERS) 2025: $426,000. For members who want maximum monthly payouts.",
      "Retirement sums increase by about 3.5% each year to keep pace with inflation and rising living standards.",
      "Monthly payouts under FRS (Standard Plan): approximately $1,550 to $1,650 per month.",
      "Monthly payouts under ERS (Standard Plan): approximately $3,000 to $3,300 per month.",
    ],
    audienceTags: ["retirement", "55-above"],
    sourceUrl: "https://www.cpf.gov.sg/member/retirement-income/retirement-sums",
    confidence: "high",
  },
  {
    docId: "ret-003", sectionKey: "retirement", topic: "Retirement Account",
    title: "Retirement Account (RA) — Created at Age 55",
    summary: "When you turn 55, a Retirement Account (RA) is automatically created. CPF savings from your OA and SA are transferred into the RA to form your retirement savings.",
    keyFacts: [
      "RA is created automatically when you turn 55.",
      "SA savings are transferred first to meet the retirement sum; OA savings are transferred next.",
      "The retirement sum in your RA determines your monthly CPF LIFE payouts.",
      "RA earns 4% interest per year.",
      "Any OA savings above what is needed for the retirement sum can be withdrawn.",
      "You can withdraw up to $5,000 from your CPF at age 55, or your OA/SA savings above the BRS.",
    ],
    audienceTags: ["retirement", "55-above"],
    sourceUrl: "https://www.cpf.gov.sg/member/retirement-income/retirement-account",
    confidence: "high",
  },
  {
    docId: "ret-004", sectionKey: "retirement", topic: "Payout Eligibility Age",
    title: "When Do CPF Payouts Start?",
    summary: "CPF monthly payouts start at the payout eligibility age, which is 65 for members born in 1958 or later. You can defer payouts up to age 70 for higher monthly amounts.",
    keyFacts: [
      "Payout eligibility age: 65 (for members born 1958 or later).",
      "You can start payouts anytime from age 65 to 70.",
      "Deferring payouts increases your monthly amount by up to 7% for each year of deferment.",
      "If you defer from 65 to 70, your monthly payout could be up to 35% higher.",
      "Once payouts start, the amount is fixed (unless you chose the Escalating Plan which increases 2% yearly).",
    ],
    audienceTags: ["retirement", "65-above"],
    sourceUrl: "https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/payout-eligibility",
    confidence: "high",
  },
  {
    docId: "ret-005", sectionKey: "withdrawal", topic: "Withdrawal at 55",
    title: "Withdrawing CPF at Age 55",
    summary: "At age 55, you can withdraw CPF savings above your retirement sum. A minimum of $5,000 can always be withdrawn regardless of your RA balance.",
    keyFacts: [
      "At age 55, you can withdraw OA and SA savings above the Full Retirement Sum (FRS).",
      "If you own a property, you can withdraw OA and SA savings above the Basic Retirement Sum (BRS).",
      "You can always withdraw at least $5,000 from CPF at age 55, even if you have not met the retirement sum.",
      "Remaining savings stay in your RA to fund your CPF LIFE payouts.",
      "Additional withdrawals can be made from age 55 onwards if you have savings above the retirement sum.",
    ],
    audienceTags: ["retirement", "55-above"],
    sourceUrl: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/withdrawing-for-retirement/withdrawal-at-age-55",
    confidence: "high",
  },

  // ── Healthcare ──
  {
    docId: "hea-001", sectionKey: "healthcare", topic: "MediSave",
    title: "What is MediSave?",
    summary: "MediSave is one of the four CPF accounts. It helps Singaporeans save for personal and immediate family members' hospitalisation, day surgery, and approved outpatient expenses.",
    keyFacts: [
      "MediSave earns 4% interest per year.",
      "Can be used for: hospitalisation, day surgery, approved outpatient treatments, MediShield Life premiums, and CareShield Life premiums.",
      "MediSave can be used for immediate family members (spouse, children, parents, siblings).",
      "Basic Healthcare Sum (BHS) for 2025: $75,500. MediSave contributions above BHS flow to SA or RA.",
      "Flexi-MediSave: members aged 60 and above can use up to $300 per year for outpatient treatments.",
      "Chronic Disease Management Programme (CDMP): up to $700 per year per patient for managing chronic conditions.",
    ],
    audienceTags: ["all", "healthcare"],
    sourceUrl: "https://www.cpf.gov.sg/member/healthcare-financing/medisave",
    confidence: "high",
  },
  {
    docId: "hea-002", sectionKey: "healthcare", topic: "MediShield Life",
    title: "What is MediShield Life?",
    summary: "MediShield Life is a basic health insurance plan that protects Singaporeans against large hospital bills and selected costly outpatient treatments. It is mandatory for all Singapore citizens and PRs.",
    keyFacts: [
      "MediShield Life is mandatory for all Singapore citizens and Permanent Residents.",
      "Premiums are paid from your MediSave account.",
      "Covers hospitalisation in subsidised wards and selected outpatient treatments like chemotherapy and dialysis.",
      "Premiums increase with age; subsidies are given to lower-income members and Pioneer/Merdeka Generation members.",
      "You can enhance MediShield Life coverage by purchasing an Integrated Shield Plan (IP) from a private insurer.",
      "MediShield Life claim limits are based on the bill, with deductibles and co-insurance requirements.",
    ],
    audienceTags: ["all", "healthcare"],
    sourceUrl: "https://www.cpf.gov.sg/member/healthcare-financing/medishield-life",
    confidence: "high",
  },
  {
    docId: "hea-003", sectionKey: "healthcare", topic: "CareShield Life",
    title: "What is CareShield Life?",
    summary: "CareShield Life is a long-term disability insurance scheme that provides monthly cash payouts if you become severely disabled and are unable to perform at least 3 of 6 Activities of Daily Living.",
    keyFacts: [
      "CareShield Life provides monthly payouts if you are severely disabled (unable to perform at least 3 of 6 Activities of Daily Living).",
      "Automatically enrolled for Singaporeans born in 1980 or later, starting at age 30.",
      "Starting payout: $600 per month (increases each year).",
      "Payouts continue for as long as you remain severely disabled.",
      "Premiums are paid from MediSave account.",
      "Supplements are available from private insurers for higher payout amounts.",
      "Those born before 1980 may opt in to CareShield Life; they were previously covered by ElderShield.",
    ],
    audienceTags: ["all", "healthcare", "elderly"],
    sourceUrl: "https://www.cpf.gov.sg/member/healthcare-financing/careshield-life",
    confidence: "high",
  },

  // ── Housing ──
  {
    docId: "hou-001", sectionKey: "housing", topic: "Using CPF for Housing",
    title: "Using CPF OA for Home Purchase",
    summary: "You can use your CPF Ordinary Account (OA) savings to pay for your home — for down payment, monthly mortgage, and stamp duty.",
    keyFacts: [
      "CPF OA savings can be used to buy HDB flats (new or resale) and private properties.",
      "Can pay for: down payment, monthly mortgage loan instalments, stamp duty, and conveyancing fees.",
      "A CPF usage limit (Valuation Limit) applies — generally you can use CPF up to the lower of the purchase price or property valuation.",
      "When you sell your property, you must refund the CPF used plus accrued interest.",
      "Accrued interest is the interest your CPF savings would have earned if not used for housing.",
      "Home Protection Scheme (HPS) is mandatory if you use CPF to service an HDB housing loan.",
    ],
    audienceTags: ["housing", "hdb", "property-owner"],
    sourceUrl: "https://www.cpf.gov.sg/member/owning-a-home/using-cpf-for-your-home",
    confidence: "high",
  },
  {
    docId: "hou-002", sectionKey: "housing", topic: "CPF Housing Grants",
    title: "CPF Housing Grants for HDB Flats",
    summary: "The government provides CPF Housing Grants to help Singaporeans purchase their HDB flats. Key grants include the Enhanced CPF Housing Grant (EHG), Family Grant, and Proximity Housing Bonus.",
    keyFacts: [
      "Enhanced CPF Housing Grant (EHG): up to $120,000 for eligible first-timer families buying new or resale flats. Income ceiling: $9,000/month.",
      "Family Grant: up to $80,000 for first-timer families buying a resale flat from non-citizen spouse.",
      "Singles Grant: up to $40,000 for eligible singles buying a 2-room flat in non-mature estate.",
      "Proximity Housing Bonus (PHB): up to $30,000 for buying a resale flat to live near or with parents or child.",
      "Grants are credited into CPF OA and cannot be taken as cash.",
      "To check eligibility, visit the HDB website or My HDBPage.",
    ],
    audienceTags: ["housing", "hdb", "first-timer"],
    sourceUrl: "https://www.cpf.gov.sg/member/owning-a-home/cpf-housing-grants-for-hdb-flats",
    confidence: "high",
  },
  {
    docId: "hou-003", sectionKey: "housing", topic: "Home Protection Scheme",
    title: "Home Protection Scheme (HPS)",
    summary: "HPS is a mortgage-reducing insurance that protects HDB flat owners and their families if they cannot repay their housing loan due to death, terminal illness, or total permanent disability.",
    keyFacts: [
      "HPS is mandatory if you use CPF savings to pay for your HDB housing loan.",
      "HPS covers the outstanding housing loan if you die, have a terminal illness, or become totally permanently disabled.",
      "Premiums are paid from your MediSave account.",
      "Premiums depend on your age, loan amount, and loan tenure.",
      "HPS is not required for private properties — you can choose your own mortgage insurance.",
      "You can check your HPS coverage and premium on the CPF website.",
    ],
    audienceTags: ["housing", "hdb"],
    sourceUrl: "https://www.cpf.gov.sg/member/owning-a-home/home-protection-scheme",
    confidence: "high",
  },

  // ── Investment ──
  {
    docId: "inv-001", sectionKey: "investment", topic: "CPFIS",
    title: "CPF Investment Scheme (CPFIS)",
    summary: "The CPF Investment Scheme (CPFIS) allows you to invest your OA and SA savings in approved investments like shares, unit trusts, ETFs, gold, and insurance products to potentially earn higher returns.",
    keyFacts: [
      "You can invest OA savings after setting aside $20,000 in OA.",
      "You can invest SA savings after setting aside $40,000 in SA.",
      "Approved investments include: stocks listed on SGX, unit trusts, ETFs, gold-related investments, and investment-linked insurance products.",
      "Investment returns are not guaranteed — you may earn less than the CPF interest rates.",
      "Losses from CPFIS investments are not covered by CPF.",
      "You must open a CPFIS Investment Account with a participating bank or broker.",
    ],
    audienceTags: ["investment", "employee"],
    sourceUrl: "https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/cpf-investment-scheme",
    confidence: "high",
  },

  // ── Top-ups ──
  {
    docId: "top-001", sectionKey: "topups", topic: "Retirement Sum Top-Up Scheme",
    title: "Retirement Sum Topping-Up Scheme (RSTU)",
    summary: "The RSTU scheme lets you top up your own or your family members' Special Account (below age 55) or Retirement Account (age 55 and above) to earn higher interest and boost retirement savings.",
    keyFacts: [
      "You can top up with cash or OA savings transfer.",
      "Top-ups to SA/RA earn 4% interest.",
      "Tax relief: up to $8,000 per calendar year for cash top-ups to your own account, and up to $8,000 for cash top-ups to family members' accounts.",
      "Maximum total tax relief for RSTU: $16,000 per calendar year.",
      "Family members eligible: parents, parents-in-law, grandparents, grandparents-in-law, spouse, and siblings.",
      "Top-ups are irreversible — funds go into SA/RA and cannot be withdrawn early.",
    ],
    audienceTags: ["retirement", "topup"],
    sourceUrl: "https://www.cpf.gov.sg/member/growing-your-savings/saving-more-with-cpf/retirement-sum-topping-up-scheme",
    confidence: "high",
  },
  {
    docId: "top-002", sectionKey: "topups", topic: "Matched Retirement Savings Scheme",
    title: "Matched Retirement Savings Scheme (MRSS)",
    summary: "The MRSS provides dollar-for-dollar matching from the government for eligible members who make cash top-ups to their Retirement Account.",
    keyFacts: [
      "Government matches dollar-for-dollar for cash top-ups to your RA, up to $600 per year.",
      "Eligible if: Singapore citizen aged 55 to 70, annual income ≤$22,500, and RA is below Full Retirement Sum.",
      "Matching is automatically credited to your RA in January of the following year.",
      "You do not need to apply — eligibility is assessed automatically.",
      "MRSS helps members with lower retirement savings accumulate more for retirement.",
    ],
    audienceTags: ["retirement", "lower-income", "55-above"],
    sourceUrl: "https://www.cpf.gov.sg/member/growing-your-savings/saving-more-with-cpf/cpf-matched-retirement-savings-scheme",
    confidence: "high",
  },

  // ── Employment ──
  {
    docId: "emp-001", sectionKey: "employment", topic: "Self-Employed CPF",
    title: "CPF for Self-Employed Persons",
    summary: "Self-employed persons must contribute to MediSave based on their net trade income. Contributions to OA and SA are voluntary but recommended.",
    keyFacts: [
      "Self-employed persons are required to contribute to MediSave if net trade income exceeds $6,000 per year.",
      "MediSave contribution rate for self-employed: 8% to 10.5% of net trade income, depending on age.",
      "Voluntary contributions to OA, SA, and MA are allowed for self-employed persons.",
      "Voluntary CPF contributions are eligible for tax relief.",
      "Self-employed persons can use the same CPF benefits as employees (housing, investment, MediShield Life).",
    ],
    audienceTags: ["self-employed"],
    sourceUrl: "https://www.cpf.gov.sg/member/self-employed-matters",
    confidence: "high",
  },
  {
    docId: "emp-002", sectionKey: "contributions", topic: "Voluntary Contributions",
    title: "Voluntary CPF Contributions",
    summary: "Members can make voluntary CPF contributions to increase their savings. Contributions are capped at the annual CPF limit minus mandatory contributions.",
    keyFacts: [
      "Annual CPF contribution limit: $37,740 (37% of $102,000 annual wage ceiling).",
      "Voluntary contributions are split across OA, SA, and MA in the same allocation ratio as mandatory contributions.",
      "You can also make voluntary top-ups specifically to SA or RA under the RSTU scheme.",
      "Voluntary contributions qualify for tax relief under certain conditions.",
      "You cannot withdraw voluntary contributions before the qualifying age.",
    ],
    audienceTags: ["employee", "self-employed"],
    sourceUrl: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/voluntary-contributions",
    confidence: "high",
  },

  // ── Workfare & Silver Support ──
  {
    docId: "gov-001", sectionKey: "topups", topic: "Workfare Income Supplement",
    title: "Workfare Income Supplement (WIS)",
    summary: "Workfare supplements the income and CPF savings of lower-wage Singaporean workers aged 30 and above. Cash and CPF top-ups are given based on income and age.",
    keyFacts: [
      "Eligible: Singapore citizens aged 30 and above (no age requirement for persons with disability), earning between $500 to $3,000 per month.",
      "Payments are given as cash (10%) and CPF top-ups (90%).",
      "Self-employed persons who contribute to MediSave are also eligible.",
      "Workers with disability get a higher proportion as cash.",
      "WIS payments are automatic — no application needed for employees.",
      "Annual WIS payouts range from a few hundred to a few thousand dollars depending on income and age.",
    ],
    audienceTags: ["lower-income", "elderly"],
    sourceUrl: "https://www.cpf.gov.sg/member/growing-your-savings/saving-more-with-cpf/workfare-income-supplement",
    confidence: "high",
  },
  {
    docId: "gov-002", sectionKey: "general", topic: "Silver Support Scheme",
    title: "Silver Support Scheme",
    summary: "The Silver Support Scheme provides quarterly cash payouts to elderly Singaporeans in the bottom 20th to 30th percentile of lifetime wages who have less retirement savings.",
    keyFacts: [
      "Quarterly cash payments for eligible elderly Singaporeans aged 65 and above.",
      "Payout amounts: $300 to $900 per quarter depending on housing type and level of support needed.",
      "Eligible if: Singapore citizen aged 65+, lived in 1-3 room HDB flat or 4-5 room HDB flat with low income, and low CPF savings.",
      "No application needed — eligibility is assessed automatically.",
      "Payouts are credited in January, April, July, and October.",
    ],
    audienceTags: ["elderly", "lower-income"],
    sourceUrl: "https://www.cpf.gov.sg/member/retirement-income/silver-support-scheme",
    confidence: "high",
  },

  // ── Nomination ──
  {
    docId: "nom-001", sectionKey: "general", topic: "CPF Nomination",
    title: "CPF Nomination — Who Gets Your CPF After Death",
    summary: "CPF savings do not form part of your estate and cannot be distributed via a will. You must make a CPF nomination to specify who receives your CPF savings when you pass away.",
    keyFacts: [
      "CPF savings are not covered by a will — you must make a CPF nomination.",
      "Without a nomination, CPF savings are distributed by the Public Trustee to your legal beneficiaries.",
      "You can nominate any person(s) you choose, including non-family members.",
      "You can update your nomination at any time via the CPF website (SingPass login required).",
      "Nominees receive the CPF savings as a lump sum cash payment within a few weeks of passing.",
      "If you are married, your spouse should be named as a nominee.",
    ],
    audienceTags: ["all", "planning"],
    sourceUrl: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/cpf-nomination",
    confidence: "high",
  },

  // ── Security ──
  {
    docId: "sec-001", sectionKey: "general", topic: "CPF Scams",
    title: "Beware of CPF Scams",
    summary: "CPF Board will never ask for your SingPass password, CPF PIN, or personal details via phone, SMS, or email. Always verify before sharing information.",
    keyFacts: [
      "CPF Board will NEVER call you to ask for your SingPass password or CPF PIN.",
      "CPF Board will NEVER send you an SMS with a link asking you to log in.",
      "Scammers may impersonate CPF Board — always verify by calling the official CPF hotline or visiting cpf.gov.sg directly.",
      "Never share your SingPass credentials with anyone, including people claiming to be CPF officers.",
      "If you suspect a scam, report it to the Singapore Police Force (999) or ScamShield.",
      "Official CPF communications use cpf.gov.sg email domain — not Gmail, Hotmail, or other domains.",
    ],
    audienceTags: ["all", "security"],
    sourceUrl: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/protect-your-retirement-savings/beware-of-scams",
    confidence: "high",
  },
];

// ── Terminology ───────────────────────────────────────────────────────────────
const TERMINOLOGY = [
  { term: "OA", plainEnglish: "Ordinary Account — earns 2.5% interest, used for housing and investment", zh: "普通账户", ms: "Akaun Biasa", ta: "சாதாரண கணக்கு" },
  { term: "SA", plainEnglish: "Special Account — earns 4% interest, mainly for retirement", zh: "特别账户", ms: "Akaun Khas", ta: "சிறப்பு கணக்கு" },
  { term: "MA", plainEnglish: "MediSave Account — earns 4% interest, used for healthcare", zh: "保健储蓄账户", ms: "Akaun MediSave", ta: "மெடிசேவ் கணக்கு" },
  { term: "RA", plainEnglish: "Retirement Account — created at age 55, earns 4% interest, funds CPF LIFE payouts", zh: "退休账户", ms: "Akaun Persaraan", ta: "ஓய்வூதிய கணக்கு" },
  { term: "CPF LIFE", plainEnglish: "Lifelong Income For the Elderly — provides monthly payouts for life from age 65", zh: "终身入息计划", ms: "CPF LIFE", ta: "சிபிஃப் லைஃப்" },
  { term: "BRS", plainEnglish: "Basic Retirement Sum — minimum amount needed in RA; $106,500 in 2025", zh: "基本退休存款", ms: "Jumlah Persaraan Asas", ta: "அடிப்படை ஓய்வூதியத் தொகை" },
  { term: "FRS", plainEnglish: "Full Retirement Sum — standard retirement target; $213,000 in 2025", zh: "全额退休存款", ms: "Jumlah Persaraan Penuh", ta: "முழு ஓய்வூதியத் தொகை" },
  { term: "ERS", plainEnglish: "Enhanced Retirement Sum — for maximum payouts; $426,000 in 2025", zh: "增额退休存款", ms: "Jumlah Persaraan Dipertingkatkan", ta: "மேம்படுத்தப்பட்ட ஓய்வூதியத் தொகை" },
  { term: "BHS", plainEnglish: "Basic Healthcare Sum — MediSave cap; $75,500 in 2025", zh: "基本医疗存款额", ms: "Jumlah Penjagaan Kesihatan Asas", ta: "அடிப்படை சுகாதாரத் தொகை" },
  { term: "HPS", plainEnglish: "Home Protection Scheme — mandatory insurance for HDB flat owners using CPF loan", zh: "公积金房屋保护计划", ms: "Skim Perlindungan Rumah", ta: "வீட்டு பாதுகாப்பு திட்டம்" },
  { term: "CPFIS", plainEnglish: "CPF Investment Scheme — invest OA and SA savings in approved products", zh: "公积金投资计划", ms: "Skim Pelaburan CPF", ta: "சிபிஃப் முதலீட்டு திட்டம்" },
  { term: "RSTU", plainEnglish: "Retirement Sum Topping-Up Scheme — top up SA or RA for higher retirement payouts", zh: "退休存款填补计划", ms: "Skim Tambahan Jumlah Persaraan", ta: "ஓய்வூதிய தொகை நிரப்பு திட்டம்" },
  { term: "MRSS", plainEnglish: "Matched Retirement Savings Scheme — government matches top-up dollar for dollar (up to $600/year)", zh: "配对退休储蓄计划", ms: "Skim Simpanan Persaraan Sepadan", ta: "பொருத்தப்பட்ட ஓய்வூதிய சேமிப்பு திட்டம்" },
  { term: "WIS", plainEnglish: "Workfare Income Supplement — cash and CPF top-ups for lower-wage workers", zh: "就业奖励计划", ms: "Tambahan Pendapatan Workfare", ta: "வொர்க்ஃபேர் வருமான நிரப்பு" },
  { term: "MediSave", plainEnglish: "Your CPF healthcare savings account — used for hospital bills and approved medical costs", zh: "保健储蓄", ms: "MediSave", ta: "மெடிசேவ்" },
  { term: "MediShield Life", plainEnglish: "Mandatory health insurance for all Singaporeans — protects against large hospital bills", zh: "终身健保", ms: "MediShield Life", ta: "மெடிஷீல்டு லைஃப்" },
  { term: "CareShield Life", plainEnglish: "Long-term disability insurance — monthly payouts if severely disabled", zh: "护盾计划", ms: "CareShield Life", ta: "கேர்ஷீல்டு லைஃப்" },
  { term: "SingPass", plainEnglish: "Singapore Personal Access — digital identity system for accessing government services online", zh: "新加坡个人通行证", ms: "SingPass", ta: "சிங்பாஸ்" },
  { term: "payout eligibility age", plainEnglish: "The age at which CPF monthly payouts start — currently age 65 for those born in 1958 or later", zh: "入息发放年龄", ms: "Umur kelayakan pembayaran", ta: "கட்டண தகுதி வயது" },
];

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    console.log("Connected to MongoDB — PULSE cluster");
    const db = client.db("pulse");

    // Seed sections
    await db.collection("cpf_sections").deleteMany({});
    await db.collection("cpf_sections").insertMany(SECTIONS);
    console.log(`✓ cpf_sections: ${SECTIONS.length} docs`);

    // Seed knowledge
    await db.collection("cpf_knowledge").deleteMany({});
    await db.collection("cpf_knowledge").insertMany(DOCUMENTS);
    console.log(`✓ cpf_knowledge: ${DOCUMENTS.length} docs`);

    // Seed terminology
    await db.collection("cpf_terminology").deleteMany({});
    await db.collection("cpf_terminology").insertMany(TERMINOLOGY);
    console.log(`✓ cpf_terminology: ${TERMINOLOGY.length} docs`);

    // Migrate slang from pulse_tools → pulse
    const slangSrc = client.db("pulse_tools").collection("slang_dictionary");
    const slangDst = client.db("pulse").collection("slang_dictionary");
    const slangs = await slangSrc.find({}, { projection: { _id: 0 } }).toArray();
    if (slangs.length > 0) {
      await slangDst.deleteMany({});
      await slangDst.insertMany(slangs);
      console.log(`✓ slang_dictionary migrated to pulse: ${slangs.length} docs`);
    }

    // Clean up stray pulse_tools.cpf_hyperlinks
    const stray = await client.db("pulse_tools").collection("cpf_hyperlinks").countDocuments();
    if (stray > 0) {
      await client.db("pulse_tools").collection("cpf_hyperlinks").drop();
      console.log(`✓ Removed stray pulse_tools.cpf_hyperlinks (${stray} docs)`);
    }

    // Create text index on cpf_knowledge
    await db.collection("cpf_knowledge").createIndex(
      { title: "text", summary: "text", topic: "text" },
      { name: "knowledge_text", default_language: "english" }
    ).catch(() => null);

    console.log("\nDone. Final state:");
    for (const col of ["cpf_sections", "cpf_knowledge", "cpf_terminology", "cpf_hyperlinks", "slang_dictionary"]) {
      const n = await db.collection(col).countDocuments();
      console.log(`  pulse.${col}: ${n} docs`);
    }
  } finally {
    await client.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
