import type { Approval, RuntimeInfo, Task } from "../../../src/lib/savana/types";
import type { SavanaService } from "../service";

/**
 * Contract every agent runtime implements. The service owns state; a runtime
 * only reacts to events and writes back through the service, so the state
 * machine and the approval gate are always enforced.
 */
export interface AgentRuntime {
  info(): RuntimeInfo;
  onTaskCreated(task: Task): void;
  onApprovalResolved(approval: Approval): void;
  dispose(): void;
}

export type RuntimeFactoryDeps = {
  service: SavanaService;
};
