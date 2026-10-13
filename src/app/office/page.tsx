import { Suspense } from "react";
import { RunningAvatarLoader } from "@/features/agents/components/RunningAvatarLoader";
import { AgentStoreProvider } from "@/features/agents/state/store";
import { OfficeScreen } from "@/features/office/screens/OfficeScreen";

const ENABLED_RE = /^(1|true|yes|on)$/i;

const readDebugFlag = (value: string | undefined): boolean => {
  const normalized = (value ?? "").trim();
  if (!normalized) return true;
  return ENABLED_RE.test(normalized);
};

function OfficeLoadingFallback() {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-background"
      aria-label="Loading office"
      role="status"
    >
      <div className="flex flex-col items-center gap-3">
        <RunningAvatarLoader
          size={28}
          trackWidth={76}
          label="Loading..."
          labelClassName="text-muted-foreground"
        />
      </div>
    </div>
  );
}

export default function OfficePage() {
  // The technical event console is hidden in the Savana office.
  const showOpenClawConsole =
    readDebugFlag(process.env.DEBUG) && process.env.NEXT_PUBLIC_SAVANA_OFFICE !== "1";

  return (
    <AgentStoreProvider>
      <Suspense fallback={<OfficeLoadingFallback />}>
        <OfficeScreen showOpenClawConsole={showOpenClawConsole} />
      </Suspense>
    </AgentStoreProvider>
  );
}
