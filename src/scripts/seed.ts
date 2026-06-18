import "dotenv/config";
import { clearAll, insertCustomerBundle, migrate, stats } from "../data/customers/repository.js";
import { closeDb } from "../data/sqlite/connection.js";
import { resetDocumentStore } from "../data/docstore/index.js";
import { knowledgeStats, loadKnowledgeFile, seedKnowledge } from "../data/knowledge/repository.js";
import { createServiceLogger } from "../shared/logger.js";
import { generateCustomers } from "./personas.js";

const log = createServiceLogger("seed");

const COUNT = Number(process.env.SEED_COUNT ?? process.argv[2] ?? 150) || 150;

async function main(): Promise<void> {
  migrate();
  clearAll();

  const customers = generateCustomers(COUNT);
  for (const customer of customers) {
    insertCustomerBundle(customer);
  }
  const s = stats();
  log.info(
    { customers: s.totalCustomers, cases: s.totalCases, cpfManaged: Math.round(s.totalCpfManaged) },
    "Seeded SQLite customers",
  );

  const file = loadKnowledgeFile();
  const k = await seedKnowledge(file);
  log.info(k, "Seeded CPF knowledge into document store");

  const ks = await knowledgeStats();

  console.log("\n=== PULSE seed complete ===");
  console.log(`Customers:        ${s.totalCustomers}`);
  console.log(`Cases:            ${s.totalCases}  (open/in-progress: ${s.openCases}, high-priority open: ${s.highPriorityCases})`);
  console.log(`CPF under mgmt:   S$${Math.round(s.totalCpfManaged).toLocaleString()}`);
  console.log(`By age bracket:   ${JSON.stringify(s.byAgeBracket)}`);
  console.log(`By support tier:  ${JSON.stringify(s.byTier)}`);
  console.log(`Knowledge store:  backend=${ks.backend} sections=${ks.sections} documents=${ks.documents} terminology=${ks.terminology}`);
  console.log("===========================\n");
}

main()
  .then(async () => {
    closeDb();
    await resetDocumentStore();
    process.exit(0);
  })
  .catch((error) => {
    log.error({ err: (error as Error).message, stack: (error as Error).stack }, "Seed failed");
    process.exit(1);
  });
