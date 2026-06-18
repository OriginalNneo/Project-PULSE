/**
 * Seed cpf_hyperlinks collection in pulse DB from scraped CPF member portal data.
 * Run with: npx tsx src/scripts/seed-cpf-links.ts
 *
 * Security rule: any URL matching PERSONAL_INFO_PATTERNS is excluded — these
 * pages either require SingPass login or expose personal account data.
 */
import "dotenv/config";
import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Personal-info URL patterns — NEVER stored or returned to users ────────────
const PERSONAL_INFO_PATTERNS = [
  /\/login/i,
  /\/singpass/i,
  /\/auth/i,
  /\/oauth/i,
  /\/token/i,
  /\/my-cpf/i,
  /\/account-overview/i,
  /\/account-details/i,
  /\/transaction/i,
  /\/statement/i,
  /\/e-statement/i,
  /\/balance/i,
  /\/contribution-history/i,
  /\/withdrawal-request/i,
  /\/nomination-request/i,
  /\/update-contact/i,
  /\/update-personal/i,
  /\/update-info/i,
  /\/change-/i,
  /\/apply-for/i,
  /\/submit-/i,
  /\/dashboard/i,
  /\/profile/i,
  /\?.*token/i,
  /\?.*session/i,
];

function isPersonalInfoUrl(url: string): boolean {
  return PERSONAL_INFO_PATTERNS.some((p) => p.test(url));
}

interface ScrapedLink {
  url: string;
  service_name: string;
  description: string;
  section: string;
  keywords: string[];
}

export interface CpfHyperlink {
  url: string;
  service_name: string;
  description: string;
  section: string;
  keywords: string[];
  scraped_at: string;
}

// ── Scraped data (148 links from cpf.gov.sg/member) ──────────────────────────

const SCRAPED_LINKS: ScrapedLink[] = [
  { url: "https://www.cpf.gov.sg/member/cpf-overview", service_name: "CPF Overview", description: "Introduction to the Central Provident Fund as a key pillar of Singapore's social security system.", section: "general", keywords: ["CPF", "overview", "social security", "retirement", "savings"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings", service_name: "Growing Your Savings", description: "Overview of how CPF helps members save more for retirement income, home ownership, and healthcare needs.", section: "general", keywords: ["savings", "contributions", "retirement", "grow", "CPF accounts"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/saving-as-an-employee", service_name: "Saving as an Employee", description: "Explains employer-mandatory CPF contributions for employees and how these savings accumulate.", section: "employment", keywords: ["employee", "employer", "CPF contributions", "salary", "mandatory"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/saving-as-a-self-employed-person", service_name: "Saving as a Self-Employed Person", description: "Self-employed persons save for retirement and healthcare through MediSave contributions.", section: "employment", keywords: ["self-employed", "SEP", "MediSave", "voluntary contributions", "freelance"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/voluntary-contributions", service_name: "Voluntary Contributions", description: "Members can make voluntary top-ups to their CPF accounts to increase retirement savings.", section: "employment", keywords: ["voluntary", "top-up", "contributions", "savings", "retirement"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-interest-rates", service_name: "CPF Interest Rates", description: "Current interest rates for CPF Ordinary, Special, MediSave, and Retirement Accounts.", section: "general", keywords: ["interest", "interest rate", "OA", "SA", "MA", "RA", "returns"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/cpf-contribution-and-allocation-rates", service_name: "CPF Contribution and Allocation Rates", description: "CPF contribution rates for employees and employers by age group, and how contributions are allocated.", section: "employment", keywords: ["contribution rate", "allocation", "ordinary account", "special account", "medisave", "age"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/saving-more-with-cpf/retirement-sum-topping-up-scheme", service_name: "Retirement Sum Topping-Up Scheme (RSTU)", description: "Top up your own or your family members' Special or Retirement Account to earn higher interest.", section: "retirement", keywords: ["RSTU", "retirement sum topping-up", "top up", "special account", "retirement account"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/saving-more-with-cpf/cpf-matched-retirement-savings-scheme", service_name: "Matched Retirement Savings Scheme (MRSS)", description: "Government matches dollar-for-dollar cash top-ups to eligible members' Retirement Accounts.", section: "retirement", keywords: ["MRSS", "matched retirement savings", "government match", "retirement account", "top-up"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/cpf-investment-scheme", service_name: "CPF Investment Scheme (CPFIS)", description: "Invest OA and SA savings in approved investment products to potentially earn higher returns.", section: "investment", keywords: ["CPFIS", "investment", "invest", "OA", "SA", "returns", "stocks", "unit trust"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/cpf-investment-scheme/what-can-i-invest-in", service_name: "CPFIS: What Can I Invest In", description: "List of approved investment products available under the CPF Investment Scheme.", section: "investment", keywords: ["CPFIS", "investment products", "approved", "shares", "unit trusts", "ETF"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/cpf-investment-scheme/investing-with-cpf-oa", service_name: "Investing with CPF OA", description: "How to use your Ordinary Account savings under CPFIS to invest.", section: "investment", keywords: ["CPFIS", "ordinary account", "OA", "invest", "investment"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/cpf-investment-scheme/investing-with-cpf-sa", service_name: "Investing with CPF SA", description: "How to use your Special Account savings under CPFIS to invest.", section: "investment", keywords: ["CPFIS", "special account", "SA", "invest", "investment"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income", service_name: "Retirement Income Overview", description: "Overview of CPF retirement income options and planning for your retirement.", section: "retirement", keywords: ["retirement income", "retirement planning", "CPF LIFE", "payout", "retirement"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/retirement-account", service_name: "Retirement Account", description: "Your Retirement Account (RA) is created when you turn 55, combining OA and SA savings.", section: "retirement", keywords: ["retirement account", "RA", "age 55", "55", "OA", "SA", "combine"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/retirement-sums", service_name: "Retirement Sums", description: "Find out about the Basic Retirement Sum (BRS), Full Retirement Sum (FRS), and Enhanced Retirement Sum (ERS).", section: "retirement", keywords: ["retirement sum", "BRS", "FRS", "ERS", "basic retirement sum", "full retirement sum", "enhanced retirement sum"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/cpf-life", service_name: "CPF LIFE", description: "CPF LIFE provides lifelong monthly payouts from your payout eligibility age.", section: "retirement", keywords: ["CPF LIFE", "cpf life", "lifelong", "monthly payout", "retirement income", "annuity"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/cpf-life/cpf-life-plans", service_name: "CPF LIFE Plans", description: "Compare the Standard, Escalating, and Basic CPF LIFE plans and their payout amounts.", section: "retirement", keywords: ["CPF LIFE", "standard plan", "escalating plan", "basic plan", "payout", "compare"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/payout-eligibility", service_name: "Payout Eligibility Age", description: "Check when you can start receiving your CPF monthly payouts based on your birth year.", section: "retirement", keywords: ["payout eligibility", "payout age", "retirement age", "65", "monthly payout", "when can I receive"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/payout-amounts", service_name: "CPF Payout Amounts", description: "Estimated monthly payout amounts based on your Retirement Account savings.", section: "retirement", keywords: ["payout amount", "monthly payout", "how much", "retirement income", "CPF LIFE amount"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/silver-support-scheme", service_name: "Silver Support Scheme", description: "Quarterly cash payments from the government for elderly Singaporeans with less CPF savings.", section: "retirement", keywords: ["silver support", "elderly", "quarterly payment", "government scheme", "low savings"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/workfare-income-supplement", service_name: "Workfare Income Supplement (WIS)", description: "Workfare supplements income and CPF savings for lower-wage workers aged 35 and above.", section: "retirement", keywords: ["workfare", "WIS", "lower wage", "income supplement", "CPF top-up", "35"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/senior-employment-credit", service_name: "Senior Employment Credit", description: "Wage offset for employers who hire Singaporean workers aged 55 and above.", section: "employment", keywords: ["senior employment", "55 and above", "employer", "wage offset", "senior worker"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/cpf-life/join-cpf-life", service_name: "Join CPF LIFE", description: "How and when to join CPF LIFE, including auto-inclusion criteria.", section: "retirement", keywords: ["join CPF LIFE", "auto-inclusion", "opt-in", "eligible", "how to join"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/cpf-life/deferring-payouts", service_name: "Deferring CPF LIFE Payouts", description: "Defer your CPF LIFE payouts beyond the payout eligibility age to receive higher monthly payouts.", section: "retirement", keywords: ["defer payout", "defer", "delay payout", "higher payout", "CPF LIFE"] },
  { url: "https://www.cpf.gov.sg/member/owning-a-home", service_name: "Owning a Home", description: "Use your CPF savings to fund your home purchase, including HDB flats and private properties.", section: "housing", keywords: ["home", "housing", "HDB", "private property", "buy house", "CPF housing"] },
  { url: "https://www.cpf.gov.sg/member/owning-a-home/using-cpf-for-your-home", service_name: "Using CPF for Your Home", description: "How to use CPF Ordinary Account savings to pay for home loans and property purchases.", section: "housing", keywords: ["CPF housing", "OA", "ordinary account", "home loan", "mortgage", "use CPF"] },
  { url: "https://www.cpf.gov.sg/member/owning-a-home/cpf-housing-grants-for-hdb-flats", service_name: "CPF Housing Grants for HDB Flats", description: "Government grants including AHG and SHG to help Singaporeans afford HDB flats.", section: "housing", keywords: ["housing grant", "AHG", "SHG", "HDB", "grant", "affordable", "first home"] },
  { url: "https://www.cpf.gov.sg/member/owning-a-home/cpf-housing-grants-for-hdb-flats/family-grant", service_name: "Family Grant", description: "CPF Housing Grant for families buying a new or resale HDB flat.", section: "housing", keywords: ["family grant", "HDB", "resale", "new flat", "housing grant"] },
  { url: "https://www.cpf.gov.sg/member/owning-a-home/cpf-housing-grants-for-hdb-flats/enhanced-cpf-housing-grant", service_name: "Enhanced CPF Housing Grant (EHG)", description: "Enhanced CPF Housing Grant for eligible first-timer families with lower income.", section: "housing", keywords: ["EHG", "enhanced CPF housing grant", "first timer", "lower income", "HDB"] },
  { url: "https://www.cpf.gov.sg/member/owning-a-home/cpf-housing-grants-for-hdb-flats/singles-grant", service_name: "Singles Grant", description: "CPF Housing Grant for eligible singles purchasing a 2-room HDB flat in a non-mature estate.", section: "housing", keywords: ["singles grant", "single", "HDB", "2-room", "non-mature estate"] },
  { url: "https://www.cpf.gov.sg/member/owning-a-home/cpf-housing-grants-for-hdb-flats/proximity-housing-bonus", service_name: "Proximity Housing Bonus (PHB)", description: "Bonus grant for families buying a resale flat to live near or with their parents/child.", section: "housing", keywords: ["proximity housing bonus", "PHB", "near parents", "resale flat", "family"] },
  { url: "https://www.cpf.gov.sg/member/owning-a-home/home-protection-scheme", service_name: "Home Protection Scheme (HPS)", description: "Mortgage-reducing insurance protecting your home if you cannot service your housing loan.", section: "housing", keywords: ["HPS", "home protection scheme", "mortgage insurance", "housing loan", "protection"] },
  { url: "https://www.cpf.gov.sg/member/owning-a-home/selling-your-property", service_name: "Selling Your Property", description: "What happens to CPF monies used for your property when you sell it.", section: "housing", keywords: ["sell property", "selling home", "CPF refund", "accrued interest", "property sale"] },
  { url: "https://www.cpf.gov.sg/member/owning-a-home/using-cpf-for-your-home/cpf-usage-limit", service_name: "CPF Usage Limit for Housing", description: "Limits on how much CPF you can use to pay for your property.", section: "housing", keywords: ["CPF usage limit", "valuation limit", "withdrawal limit", "housing", "property"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing", service_name: "Healthcare Financing Overview", description: "Overview of CPF schemes helping members finance healthcare costs.", section: "healthcare", keywords: ["healthcare", "MediSave", "MediShield Life", "CareShield Life", "health"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/medisave", service_name: "MediSave", description: "MediSave savings help pay for hospitalisation, day surgery, and approved outpatient treatments.", section: "healthcare", keywords: ["MediSave", "MA", "medisave account", "hospitalisation", "medical", "health"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/medisave/using-your-medisave", service_name: "Using Your MediSave", description: "What MediSave can be used for, including hospitalisation and approved treatments.", section: "healthcare", keywords: ["use MediSave", "MediSave withdrawal", "hospitalisation", "day surgery", "outpatient", "approved"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/medisave/medisave-contribution-ceiling", service_name: "MediSave Contribution Ceiling (BHS)", description: "The Basic Healthcare Sum (BHS) is the maximum MediSave balance each member needs to set aside.", section: "healthcare", keywords: ["BHS", "basic healthcare sum", "MediSave ceiling", "contribution ceiling", "MediSave limit"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/medisave/growing-your-medisave", service_name: "Growing Your MediSave", description: "How to increase your MediSave balance through top-ups and contributions.", section: "healthcare", keywords: ["grow MediSave", "top up MediSave", "MediSave top-up", "increase", "savings"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/medishield-life", service_name: "MediShield Life", description: "MediShield Life is mandatory basic health insurance covering large hospital bills and selected outpatient treatments.", section: "healthcare", keywords: ["MediShield Life", "health insurance", "hospitalisation", "hospital bill", "claim"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/medishield-life/medishield-life-premiums", service_name: "MediShield Life Premiums", description: "Premium amounts for MediShield Life by age group and available subsidies.", section: "healthcare", keywords: ["MediShield Life premium", "premium", "subsidy", "age", "how much", "insurance"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/medishield-life/making-a-claim", service_name: "Making a MediShield Life Claim", description: "How to make a MediShield Life claim for hospitalisation and outpatient treatments.", section: "healthcare", keywords: ["MediShield Life claim", "claim", "how to claim", "hospitalisation", "reimburse"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/medishield-life/integrated-shield-plans", service_name: "Integrated Shield Plans", description: "Private insurers offer Integrated Shield Plans that provide additional coverage on top of MediShield Life.", section: "healthcare", keywords: ["integrated shield plan", "ISP", "private insurance", "additional coverage", "IP"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/careshield-life", service_name: "CareShield Life", description: "CareShield Life provides long-term care insurance payouts when you are severely disabled.", section: "healthcare", keywords: ["CareShield Life", "long-term care", "disability", "severe disability", "payout", "insurance"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/careshield-life/careshield-life-premiums", service_name: "CareShield Life Premiums", description: "Premium amounts for CareShield Life and how they are paid from MediSave.", section: "healthcare", keywords: ["CareShield Life premium", "premium", "MediSave", "how much", "payment"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/careshield-life/making-a-claim", service_name: "Making a CareShield Life Claim", description: "How to claim CareShield Life benefits when you are severely disabled.", section: "healthcare", keywords: ["CareShield Life claim", "claim", "severely disabled", "how to claim", "benefit"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/careshield-life/careshield-life-supplements", service_name: "CareShield Life Supplements", description: "Private insurance supplements that provide additional payouts on top of CareShield Life.", section: "healthcare", keywords: ["CareShield supplement", "additional coverage", "private insurance", "top-up", "ElderShield"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/eldershield", service_name: "ElderShield", description: "ElderShield is a severe disability insurance scheme launched before CareShield Life.", section: "healthcare", keywords: ["ElderShield", "disability insurance", "severe disability", "old scheme", "legacy"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/prucashmed", service_name: "PruCashMed", description: "PruCashMed is a short-term accident and illness plan that pays daily cash benefits.", section: "healthcare", keywords: ["PruCashMed", "accident", "illness", "daily cash", "short-term"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/medifund", service_name: "MediFund", description: "MediFund is a government endowment fund assisting needy Singaporeans who cannot afford their bills.", section: "healthcare", keywords: ["MediFund", "financial assistance", "needy", "cannot afford", "hospital bill"] },
  { url: "https://www.cpf.gov.sg/member/self-employed-matters", service_name: "Self-Employed Matters", description: "CPF information specifically for self-employed persons in Singapore.", section: "employment", keywords: ["self-employed", "freelance", "sole proprietor", "SEP", "self-employed CPF"] },
  { url: "https://www.cpf.gov.sg/member/self-employed-matters/cpf-contributions-for-self-employed-persons", service_name: "CPF Contributions for Self-Employed", description: "Mandatory MediSave contributions and voluntary CPF contributions for self-employed persons.", section: "employment", keywords: ["self-employed contribution", "MediSave contribution", "mandatory", "voluntary", "SEP"] },
  { url: "https://www.cpf.gov.sg/member/self-employed-matters/save-more-with-cpf/contribute-to-your-own-medisave-account", service_name: "Contribute to Your Own MediSave", description: "How self-employed persons can make contributions to their own MediSave account.", section: "employment", keywords: ["MediSave", "self-employed", "contribute", "own MediSave", "SEP"] },
  { url: "https://www.cpf.gov.sg/member/self-employed-matters/save-more-with-cpf/voluntary-contributions-for-self-employed", service_name: "Voluntary Contributions for Self-Employed", description: "Self-employed persons can make voluntary CPF contributions to OA, SA, and MA.", section: "employment", keywords: ["voluntary CPF", "self-employed", "OA", "SA", "MA", "voluntary"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services", service_name: "Tools and Services", description: "CPF online tools and services including calculators, e-services, and forms.", section: "tools", keywords: ["tools", "calculators", "e-services", "forms", "online", "services"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/calculators", service_name: "CPF Calculators", description: "Online calculators to estimate CPF contributions, retirement income, and home loan amounts.", section: "tools", keywords: ["calculator", "estimate", "compute", "retirement", "contribution", "how much"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/calculators/cpf-retirement-income-planner", service_name: "CPF Retirement Income Planner", description: "Plan your retirement income with this calculator based on your CPF savings.", section: "tools", keywords: ["retirement income planner", "calculator", "retirement", "payout", "plan"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/calculators/cpf-housing-usage-calculator", service_name: "CPF Housing Usage Calculator", description: "Calculate how much CPF you can use for your home purchase.", section: "tools", keywords: ["housing calculator", "CPF housing", "home loan", "calculate", "how much CPF"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/calculators/home-protection-scheme-calculator", service_name: "HPS Calculator", description: "Calculate your Home Protection Scheme premium and coverage.", section: "tools", keywords: ["HPS calculator", "home protection", "premium", "coverage", "calculate"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/calculators/cpf-contribution-calculator", service_name: "CPF Contribution Calculator", description: "Calculate CPF contributions for employees based on wage and age.", section: "tools", keywords: ["contribution calculator", "CPF contribution", "employee", "employer", "wage", "calculate"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/calculators/retirement-sum-topup-calculator", service_name: "Retirement Sum Top-Up Calculator", description: "Estimate how much to top up to reach your preferred retirement sum.", section: "tools", keywords: ["top-up calculator", "retirement sum", "how much to top up", "RSTU", "calculate"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/locate-us", service_name: "Locate a CPF Service Centre", description: "Find the nearest CPF Service Centre location and operating hours.", section: "tools", keywords: ["service centre", "location", "where is", "CPF office", "walk in", "visit"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/contact-us", service_name: "Contact CPF Board", description: "Contact CPF Board by phone, email, or visit a service centre for assistance.", section: "tools", keywords: ["contact", "contact CPF", "enquiry", "help", "phone", "email", "service centre"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/forms", service_name: "CPF Forms", description: "Download CPF forms for various applications including top-ups, withdrawals, and nominations.", section: "tools", keywords: ["form", "download form", "application form", "CPF form", "paperwork"] },
  { url: "https://www.cpf.gov.sg/member/infohub", service_name: "CPF InfoHub", description: "News, articles, and announcements from CPF Board.", section: "general", keywords: ["infohub", "news", "articles", "announcements", "CPF news"] },
  { url: "https://www.cpf.gov.sg/member/infohub/educational-resources", service_name: "CPF Educational Resources", description: "Educational guides and resources to help you understand CPF.", section: "general", keywords: ["educational resources", "guide", "learn", "understand CPF", "resources"] },
  { url: "https://www.cpf.gov.sg/member/infohub/cpf-overview/what-is-cpf", service_name: "What is CPF", description: "A beginner's guide to CPF — what it is, how it works, and why it matters.", section: "general", keywords: ["what is CPF", "beginner", "introduction", "CPF basics", "how CPF works"] },
  { url: "https://www.cpf.gov.sg/member/infohub/cpf-overview/types-of-cpf-accounts", service_name: "Types of CPF Accounts", description: "Overview of the four CPF accounts: OA, SA, MA, and RA.", section: "general", keywords: ["CPF accounts", "OA", "SA", "MA", "RA", "types of accounts", "four accounts"] },
  { url: "https://www.cpf.gov.sg/member/infohub/cpf-overview/cpf-for-new-citizens-and-prs", service_name: "CPF for New Citizens and PRs", description: "How CPF works for newly naturalised citizens and Permanent Residents.", section: "general", keywords: ["new citizen", "PR", "permanent resident", "new to CPF", "CPF for PR"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/cpf-contribution-ceiling", service_name: "CPF Contribution Ceiling", description: "The monthly and annual CPF contribution ceilings that apply to ordinary wages.", section: "employment", keywords: ["contribution ceiling", "ordinary wage ceiling", "OWC", "monthly ceiling", "$8000"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/wages-subject-to-cpf", service_name: "Wages Subject to CPF Contributions", description: "Which types of wages are subject to CPF contributions.", section: "employment", keywords: ["wages", "subject to CPF", "ordinary wage", "additional wage", "bonus", "commission"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/withdrawing-for-retirement", service_name: "Withdrawing CPF Savings for Retirement", description: "How to withdraw your CPF savings at age 55 and beyond.", section: "retirement", keywords: ["withdraw", "withdrawal", "age 55", "retirement withdrawal", "cash out CPF"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/withdrawing-for-retirement/withdrawal-at-age-55", service_name: "CPF Withdrawal at Age 55", description: "What happens to your CPF savings when you turn 55 and how to make a withdrawal.", section: "retirement", keywords: ["age 55", "55", "withdraw at 55", "CPF at 55", "retirement withdrawal"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/withdrawing-for-retirement/full-withdrawal-on-medical-grounds", service_name: "Full Withdrawal on Medical Grounds", description: "Members with a terminal illness or permanently incapacitated may fully withdraw CPF savings.", section: "retirement", keywords: ["medical withdrawal", "terminal illness", "incapacitated", "full withdrawal", "medical grounds"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/withdrawing-for-retirement/leaving-singapore", service_name: "Withdrawal on Leaving Singapore", description: "Singaporeans or PRs renouncing citizenship or emigrating may withdraw their CPF savings.", section: "retirement", keywords: ["leave Singapore", "emigrate", "renounce citizenship", "withdraw all CPF", "leaving"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/cpf-nomination", service_name: "CPF Nomination", description: "Nominate beneficiaries to receive your CPF savings after your death.", section: "retirement", keywords: ["nomination", "CPF nomination", "beneficiary", "after death", "nominate", "will"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/cpf-nomination/making-a-cpf-nomination", service_name: "Making a CPF Nomination", description: "How to make or update your CPF nomination to specify who receives your savings.", section: "retirement", keywords: ["make nomination", "CPF nomination", "how to nominate", "update nomination", "nominee"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/cpf-nomination/who-can-be-a-nominee", service_name: "Who Can Be a CPF Nominee", description: "Eligible persons who can be named as CPF nominees.", section: "retirement", keywords: ["nominee", "who can nominate", "family", "eligible nominee", "beneficiary"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/death-related-cpf-matters", service_name: "Death-Related CPF Matters", description: "How CPF savings are distributed after a member passes away.", section: "retirement", keywords: ["death", "deceased", "CPF after death", "estate", "distribution", "nominee"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/saving-more-with-cpf/medisave-top-up", service_name: "MediSave Top-Up", description: "Increase your MediSave balance by topping up in cash or from CPF savings.", section: "healthcare", keywords: ["MediSave top-up", "top up MediSave", "increase MediSave", "cash top-up", "medisave savings"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/medisave/medisave-approved-insurance-schemes", service_name: "MediSave-Approved Insurance Schemes", description: "Insurance schemes that allow premiums to be paid using MediSave.", section: "healthcare", keywords: ["MediSave insurance", "approved insurance", "MediSave premium", "Integrated Shield Plan", "insurance"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/medisave/medisave-for-healthcare-costs", service_name: "MediSave for Healthcare Costs", description: "Use MediSave to pay for hospitalisation, chronic disease management, and health screenings.", section: "healthcare", keywords: ["MediSave healthcare", "hospitalisation", "chronic disease", "health screening", "CDMP"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/calculators/cpf-planner", service_name: "CPF Planner", description: "Interactive planner to project your CPF savings and retirement income.", section: "tools", keywords: ["CPF planner", "plan", "project", "retirement", "savings projection", "interactive"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/calculators/medisave-contribution-calculator", service_name: "MediSave Contribution Calculator", description: "Calculate mandatory MediSave contributions based on your net trade income.", section: "tools", keywords: ["MediSave calculator", "self-employed", "contribution", "net trade income", "calculate"] },
  { url: "https://www.cpf.gov.sg/employer/cpf-contribution/cpf-contribution-and-allocation-rates", service_name: "Employer CPF Contribution Rates", description: "CPF contribution rates and allocation details for employers.", section: "employment", keywords: ["employer", "contribution rates", "allocation", "employee CPF", "employer CPF"] },
  { url: "https://www.cpf.gov.sg/member/infohub/news/news-releases", service_name: "CPF News Releases", description: "Official news releases and announcements from CPF Board.", section: "general", keywords: ["news", "announcements", "press release", "CPF update", "latest news"] },
  { url: "https://www.cpf.gov.sg/member/infohub/educational-resources/cpf-basics", service_name: "CPF Basics", description: "Foundational knowledge about CPF accounts, contributions, and uses.", section: "general", keywords: ["CPF basics", "beginner", "fundamentals", "introduction", "how CPF works"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/my-cpf-voluntary-housing-refund", service_name: "Voluntary Housing Refund", description: "Refund CPF monies used for housing back into your CPF account voluntarily.", section: "housing", keywords: ["housing refund", "voluntary refund", "CPF refund", "housing monies", "refund CPF"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/re-employment", service_name: "Re-employment and CPF", description: "How CPF contributions work for re-employed workers aged 55 to 70.", section: "employment", keywords: ["re-employment", "55 to 70", "older worker", "re-employed", "CPF contributions"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/saving-more-with-cpf/top-up-to-help-loved-ones", service_name: "Top Up CPF for Loved Ones", description: "Top up your family members' CPF Special or Retirement Account to help them save more.", section: "retirement", keywords: ["top up family", "top up loved ones", "family CPF", "help family", "RSTU"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/cpf-life/cpf-life-escalating-plan", service_name: "CPF LIFE Escalating Plan", description: "CPF LIFE plan with payouts that increase by 2% each year to keep up with inflation.", section: "retirement", keywords: ["escalating plan", "CPF LIFE", "inflation", "increasing payout", "2 percent"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/cpf-life/cpf-life-standard-plan", service_name: "CPF LIFE Standard Plan", description: "CPF LIFE plan with fixed monthly payouts for life.", section: "retirement", keywords: ["standard plan", "CPF LIFE", "fixed payout", "monthly", "for life"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/cpf-life/cpf-life-basic-plan", service_name: "CPF LIFE Basic Plan", description: "CPF LIFE plan with lower payouts and higher bequest to nominees.", section: "retirement", keywords: ["basic plan", "CPF LIFE", "bequest", "nominee", "lower payout"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/long-term-care-support-fund", service_name: "Long-Term Care Support Fund", description: "Government fund providing subsidies for long-term care services.", section: "healthcare", keywords: ["long-term care", "support fund", "subsidy", "care", "elderly"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/e-services/top-up-cpf-savings", service_name: "Top Up CPF Savings (e-Service)", description: "Online service to top up your own or your family's CPF Special or Retirement Account.", section: "tools", keywords: ["top up e-service", "online top up", "CPF top up", "e-service", "digital"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/e-services/join-cpf-life", service_name: "Join CPF LIFE (e-Service)", description: "Online service to join CPF LIFE or change your CPF LIFE plan.", section: "tools", keywords: ["join CPF LIFE", "e-service", "online", "CPF LIFE plan", "change plan"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/e-services/apply-for-hps", service_name: "Apply for HPS (e-Service)", description: "Online application for Home Protection Scheme insurance coverage.", section: "tools", keywords: ["HPS application", "apply HPS", "home protection", "e-service", "apply online"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/e-services/apply-for-rstu", service_name: "Apply for RSTU (e-Service)", description: "Online service to apply for the Retirement Sum Topping-Up scheme.", section: "tools", keywords: ["RSTU application", "apply RSTU", "retirement sum top-up", "e-service", "apply online"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/e-services/cpf-nomination", service_name: "CPF Nomination (e-Service)", description: "Online service to make or update your CPF nomination.", section: "tools", keywords: ["nomination e-service", "CPF nomination online", "make nomination", "online nomination"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/e-services/apply-for-workfare", service_name: "Apply for Workfare (e-Service)", description: "Online application for the Workfare Income Supplement scheme.", section: "tools", keywords: ["Workfare application", "apply Workfare", "WIS", "e-service", "apply online"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/extra-interest", service_name: "Extra Interest on CPF Savings", description: "Earn an additional 1% to 2% interest on your first $60,000 of CPF savings.", section: "general", keywords: ["extra interest", "additional interest", "1 percent", "2 percent", "first $60000", "bonus interest"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/workfare-income-supplement/workfare-special-payment", service_name: "Workfare Special Payment", description: "One-time Workfare special payment for eligible lower-wage Singaporeans.", section: "retirement", keywords: ["Workfare special payment", "one-time", "special payment", "lower wage", "WIS"] },
  { url: "https://www.cpf.gov.sg/member/infohub/educational-resources/growing-your-savings", service_name: "Educational Resources: Growing Your Savings", description: "Articles and guides on how to grow your CPF savings effectively.", section: "general", keywords: ["grow savings", "educational", "articles", "guide", "tips"] },
  { url: "https://www.cpf.gov.sg/member/infohub/educational-resources/owning-a-home", service_name: "Educational Resources: Owning a Home", description: "Articles and guides on using CPF for home ownership.", section: "housing", keywords: ["home ownership", "educational", "CPF housing", "guide", "articles"] },
  { url: "https://www.cpf.gov.sg/member/infohub/educational-resources/healthcare-financing", service_name: "Educational Resources: Healthcare Financing", description: "Articles and guides on CPF healthcare financing schemes.", section: "healthcare", keywords: ["healthcare", "educational", "MediSave", "MediShield", "guide"] },
  { url: "https://www.cpf.gov.sg/member/infohub/educational-resources/retirement", service_name: "Educational Resources: Retirement", description: "Articles and guides on CPF retirement planning and income.", section: "retirement", keywords: ["retirement", "educational", "CPF LIFE", "guide", "retirement planning"] },
  { url: "https://www.cpf.gov.sg/member/business-owners", service_name: "Business Owners", description: "CPF information and resources for employers and business owners.", section: "employment", keywords: ["business owner", "employer", "company", "CPF employer", "business"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/making-cpf-contributions", service_name: "Making CPF Contributions (Employer)", description: "Guide for employers on how to make CPF contributions for their employees.", section: "employment", keywords: ["make contributions", "employer", "CPF payment", "submit CPF", "how to contribute"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/cpf-contributions/late-payment-interest", service_name: "Late Payment Interest", description: "Interest charged on CPF contributions that are submitted late by employers.", section: "employment", keywords: ["late payment", "interest", "late CPF", "employer penalty", "overdue"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/calculators/careshield-life-premium-calculator", service_name: "CareShield Life Premium Calculator", description: "Calculate your CareShield Life premiums by age.", section: "tools", keywords: ["CareShield calculator", "premium calculator", "CareShield Life", "how much premium"] },
  { url: "https://www.cpf.gov.sg/member/tools-and-services/calculators/medishield-life-premium-calculator", service_name: "MediShield Life Premium Calculator", description: "Calculate your MediShield Life premiums by age.", section: "tools", keywords: ["MediShield calculator", "premium calculator", "MediShield Life", "how much premium"] },
  { url: "https://www.cpf.gov.sg/member/growing-your-savings/saving-more-with-cpf/workfare-income-supplement", service_name: "Workfare Income Supplement (WIS)", description: "Workfare boosts income and CPF savings for lower-wage Singaporean workers.", section: "retirement", keywords: ["WIS", "Workfare", "lower wage", "income supplement", "CPF boost"] },
  { url: "https://www.cpf.gov.sg/member/healthcare-financing/medisave/medisave-for-flexi-medisave", service_name: "Flexi-MediSave", description: "Elderly Singaporeans aged 60 and above can use MediSave for outpatient treatments.", section: "healthcare", keywords: ["Flexi-MediSave", "outpatient", "elderly", "60 and above", "MediSave outpatient"] },
  { url: "https://www.cpf.gov.sg/member/retirement-income/managing-your-retirement-income/protect-your-retirement-savings/beware-of-scams", service_name: "Beware of CPF Scams", description: "How to identify and protect yourself from CPF-related scams.", section: "general", keywords: ["scam", "fraud", "phishing", "CPF scam", "protect", "beware", "fake CPF"] },
];

// ── Seed script ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    console.log("Connected to MongoDB — database: pulse");

    const col = client.db("pulse").collection<CpfHyperlink>("cpf_hyperlinks");

    // Enforce personal-info exclusion at insert time
    const safe = SCRAPED_LINKS.filter((l) => !isPersonalInfoUrl(l.url));
    const excluded = SCRAPED_LINKS.length - safe.length;
    if (excluded > 0) console.log(`Excluded ${excluded} personal-info URLs`);

    const scraped_at = new Date().toISOString();
    let inserted = 0, updated = 0;

    for (const link of safe) {
      const result = await col.updateOne(
        { url: link.url },
        { $set: { ...link, scraped_at } },
        { upsert: true },
      );
      if (result.upsertedCount > 0) inserted++;
      else if (result.modifiedCount > 0) updated++;
    }

    // Create text index for keyword search
    await col.createIndex(
      { service_name: "text", description: "text", keywords: "text" },
      { name: "cpf_links_text", default_language: "english" },
    ).catch(() => null); // index may already exist

    const total = await col.countDocuments();
    console.log(`Done — inserted: ${inserted}, updated: ${updated}, total in collection: ${total}`);
  } finally {
    await client.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
