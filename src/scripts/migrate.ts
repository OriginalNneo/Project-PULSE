import "dotenv/config";
import { migrate } from "../data/customers/repository.js";
import { closeDb } from "../data/sqlite/connection.js";
import { getDocumentStore, resetDocumentStore } from "../data/docstore/index.js";
import { sqlitePath } from "../data/paths.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("migrate");

async function main(): Promise<void> {
  migrate();
  log.info({ file: sqlitePath() }, "SQLite customer schema ready");

  const store = await getDocumentStore();
  log.info({ backend: store.backend }, "Document store ready");
}

main()
  .then(async () => {
    closeDb();
    await resetDocumentStore();
    process.exit(0);
  })
  .catch((error) => {
    log.error({ err: (error as Error).message }, "Migration failed");
    process.exit(1);
  });
