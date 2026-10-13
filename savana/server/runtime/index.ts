import type { SavanaConfig } from "../config";
import type { SavanaService } from "../service";
import { ClaudeCodeRuntime } from "./claudeCode";
import { DemoRuntime } from "./demo";
import type { AgentRuntime } from "./types";
import { UnconfiguredRuntime } from "./unconfigured";

export const createRuntime = (service: SavanaService, config: SavanaConfig): AgentRuntime => {
  const runtime: AgentRuntime =
    config.runtimeMode === "demonstracao"
      ? new DemoRuntime(service, config.demoStepMs)
      : config.runtimeMode === "claude_code"
        ? new ClaudeCodeRuntime(service, config)
        : new UnconfiguredRuntime(service, config);
  service.attachRuntimeInfo(() => runtime.info());
  service.on("task.created", (task) => runtime.onTaskCreated(task));
  service.on("approval.resolved", (approval) => runtime.onApprovalResolved(approval));
  return runtime;
};
