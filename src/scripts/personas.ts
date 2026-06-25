import type { CustomerDetail, Language } from "../data/customers/types.js";
import { buildCustomerFromInput, pick, rng } from "../data/customers/factory.js";

const LANGUAGES: Language[] = ["en", "zh", "ms", "ta"];
const DIALECTS = ["zh-can", "zh-hok", "zh-teo", "ms-bms", "ta-sin", null, null, null];
const INCOME_BANDS = ["low", "lower_mid", "mid", "upper", "high"] as const;
const EMPLOYMENT = ["employed", "self_employed", "platform_worker", "retired", "unemployed"] as const;
const LITERACY = ["low", "medium", "high"] as const;
const ACCESSIBILITY = ["none", "none", "none", "high_contrast", "assisted"] as const;

const NAMES = [
  "Wei Liang Tan", "Mei Lin Chen", "Ravi Kumar", "Siti Aminah", "John Lim",
  "Priya Nair", "Ahmad Fauzi", "Li Hua Wong", "Selvam Muthu", "Grace Ng",
  "Boon Keng Loh", "Sunita Rao", "Hafiz Ismail", "Xiao Ming Lee", "Anitha Devi",
  "Chong Wei Foo", "Nalini Pillai", "Zulkifli Hassan", "Hui Ting Koh", "Mohan Das",
];

export function generateCustomers(count: number): CustomerDetail[] {
  const r = rng(42);
  const results: CustomerDetail[] = [];

  for (let i = 0; i < count; i++) {
    const nameBase = NAMES[i % NAMES.length]!;
    const suffix = i >= NAMES.length ? ` ${Math.floor(i / NAMES.length) + 1}` : "";
    const age = 22 + Math.floor(r() * 60);

    results.push(
      buildCustomerFromInput(
        {
          fullName: `${nameBase}${suffix}`,
          age,
          preferredLanguage: pick(LANGUAGES, r),
          dialect: pick(DIALECTS, r),
          employmentStatus: pick(EMPLOYMENT, r),
          digitalLiteracy: pick(LITERACY, r),
          incomeBand: pick(INCOME_BANDS, r),
          accessibility: pick(ACCESSIBILITY, r),
          caregiverLinked: r() < 0.15,
        },
        i + 1,
      ),
    );
  }

  return results;
}
