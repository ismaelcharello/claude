import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type SavanaDb = Database.Database;

const MIGRATIONS: string[] = [
  `
  CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    briefing TEXT NOT NULL,
    priority TEXT NOT NULL,
    project TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    due_date TEXT,
    status TEXT NOT NULL,
    blocked_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    simulated INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX tasks_agent ON tasks(agent_id);
  CREATE INDEX tasks_status ON tasks(status);

  CREATE TABLE subtasks (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX subtasks_task ON subtasks(task_id);

  CREATE TABLE timeline (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    message TEXT NOT NULL,
    actor TEXT NOT NULL,
    created_at TEXT NOT NULL,
    simulated INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX timeline_task ON timeline(task_id);

  CREATE TABLE approvals (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    action TEXT NOT NULL,
    summary TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL,
    decided_by TEXT,
    decision_note TEXT,
    created_at TEXT NOT NULL,
    decided_at TEXT,
    simulated INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX approvals_task ON approvals(task_id);
  CREATE INDEX approvals_status ON approvals(status);

  CREATE TABLE artifacts (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    simulated INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX artifacts_task ON artifacts(task_id);

  CREATE TABLE agent_logs (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    task_id TEXT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    simulated INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX agent_logs_agent ON agent_logs(agent_id);

  -- Future runtime executions (Claude Code). One row per attempt.
  CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    runtime TEXT NOT NULL,
    status TEXT NOT NULL,
    prompt TEXT NOT NULL,
    worktree_path TEXT,
    branch TEXT,
    command_json TEXT,
    files_changed_json TEXT,
    result_summary TEXT,
    exit_code INTEGER,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
  );
  CREATE INDEX runs_task ON runs(task_id);
  `,
  // 2: FORJA code runs — commit and push are recorded after human approval.
  `
  ALTER TABLE runs ADD COLUMN commit_sha TEXT;
  ALTER TABLE runs ADD COLUMN pushed_at TEXT;
  `,
];

export const openDatabase = (dbPath: string): SavanaDb => {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
};

const migrate = (db: SavanaDb) => {
  db.exec("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)");
  const row = db.prepare("SELECT version FROM schema_version LIMIT 1").get() as { version: number } | undefined;
  let version = row?.version ?? 0;
  if (!row) db.prepare("INSERT INTO schema_version (version) VALUES (0)").run();
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    db.transaction(() => {
      db.exec(sql);
      db.prepare("UPDATE schema_version SET version = ?").run(version + 1);
    })();
    version += 1;
  }
};
