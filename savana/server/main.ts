import { loadConfig } from "./config";
import { createSavanaApp } from "./app";

const config = loadConfig();
const app = createSavanaApp(config);
const info = app.service.getRuntimeInfo();

app.server.listen(config.port, config.host, () => {
  console.info(`[savana] API em http://${config.host}:${config.port}/api`);
  console.info(`[savana] Banco SQLite: ${config.dbPath}`);
  console.info(`[savana] Runtime: ${info.label}${info.simulated ? " (SIMULADO)" : ""}`);
});

const shutdown = () => {
  void app.close().finally(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
