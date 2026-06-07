import { getToolsDb } from "../connections.js";

interface CpfLink {
  keyword: string;
  service_name: string;
  url: string;
  description: string;
  section: string;
  last_verified: Date;
}

const CPF_LINKS: Omit<CpfLink, "last_verified">[] = [
  // Retirement
  { keyword: "cpf life", service_name: "CPF LIFE", url: "https://www.cpf.gov.sg/member/retirement-income/cpf-life", description: "CPF LIFE provides lifelong monthly payouts from your retirement age.", section: "retirement" },
  { keyword: "retirement sum", service_name: "Retirement Sums", url: "https://www.cpf.gov.sg/member/retirement-income/retirement-sums", description: "Find out about the Basic, Full, and Enhanced Retirement Sums.", section: "retirement" },
  { keyword: "payout eligibility", service_name: "CPF Payout Eligibility", url: "https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/payout-eligibility", description: "Check when you can start receiving your CPF monthly payouts.", section: "retirement" },
  { keyword: "retirement account", service_name: "Retirement Account", url: "https://www.cpf.gov.sg/member/retirement-income/retirement-account", description: "Your Retirement Account is created when you turn 55.", section: "retirement" },

  // Housing
  { keyword: "housing grant", service_name: "CPF Housing Grants", url: "https://www.cpf.gov.sg/member/owning-a-home/cpf-housing-grants-for-hdb-flats", description: "CPF housing grants help Singaporeans buy HDB flats at an affordable price.", section: "housing" },
  { keyword: "home protection scheme", service_name: "Home Protection Scheme (HPS)", url: "https://www.cpf.gov.sg/member/owning-a-home/home-protection-scheme", description: "HPS is a mortgage-reducing insurance that protects your family if you cannot pay your housing loan.", section: "housing" },
  { keyword: "using cpf for home", service_name: "Using CPF for Housing", url: "https://www.cpf.gov.sg/member/owning-a-home/using-cpf-for-your-home", description: "Learn how to use your CPF Ordinary Account savings to pay for your home.", section: "housing" },

  // Healthcare
  { keyword: "medisave", service_name: "MediSave", url: "https://www.cpf.gov.sg/member/healthcare-financing/medisave", description: "MediSave helps you save for medical expenses and health insurance premiums.", section: "healthcare" },
  { keyword: "medishield life", service_name: "MediShield Life", url: "https://www.cpf.gov.sg/member/healthcare-financing/medishield-life", description: "MediShield Life is a basic health insurance plan that covers large hospital bills.", section: "healthcare" },
  { keyword: "careshield life", service_name: "CareShield Life", url: "https://www.cpf.gov.sg/member/healthcare-financing/careshield-life", description: "CareShield Life provides long-term care insurance for severe disability.", section: "healthcare" },

  // Employment / Contributions
  { keyword: "cpf contribution", service_name: "CPF Contribution Rates", url: "https://www.cpf.gov.sg/employer/cpf-contribution/cpf-contribution-and-allocation-rates", description: "View CPF contribution rates for employees and employers by age group.", section: "employment" },
  { keyword: "voluntary contribution", service_name: "Voluntary Contribution", url: "https://www.cpf.gov.sg/member/growing-your-cpf/saving-more-with-cpf/voluntary-contribution", description: "Top up your CPF accounts voluntarily to grow your savings.", section: "employment" },
  { keyword: "self-employed contribution", service_name: "MediSave for Self-Employed", url: "https://www.cpf.gov.sg/member/self-employed-matters/cpf-contributions-for-self-employed-persons", description: "Self-employed persons must contribute to MediSave based on net trade income.", section: "employment" },

  // Investments
  { keyword: "cpf investment", service_name: "CPF Investment Scheme (CPFIS)", url: "https://www.cpf.gov.sg/member/growing-your-cpf/earning-higher-returns/cpf-investment-scheme", description: "Invest your CPF savings in approved investment products through CPFIS.", section: "general" },
  { keyword: "silver support", service_name: "Silver Support Scheme", url: "https://www.cpf.gov.sg/member/retirement-income/silver-support-scheme", description: "Silver Support provides quarterly cash payments to elderly Singaporeans with less CPF savings.", section: "retirement" },

  // General
  { keyword: "cpf overview", service_name: "CPF Overview", url: "https://www.cpf.gov.sg/member", description: "The main CPF member portal for managing your CPF accounts.", section: "general" },
  { keyword: "cpf hotline", service_name: "CPF Hotline", url: "https://www.cpf.gov.sg/member/tools-and-services/contact-us", description: "Contact CPF Board at 1800-227-1188 (Mon–Fri, 8am–5:30pm) for assistance.", section: "general" },
];

export async function seedCpfLinks(): Promise<void> {
  const col = getToolsDb().collection("cpf_hyperlinks");
  const existing = await col.countDocuments();
  if (existing > 0) return;

  const docs: CpfLink[] = CPF_LINKS.map((link) => ({ ...link, last_verified: new Date() }));
  await col.insertMany(docs);
  await col.createIndex({ keyword: "text", service_name: "text", description: "text" });
}
