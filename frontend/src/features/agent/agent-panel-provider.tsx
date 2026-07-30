"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type AgentPanelContextValue = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  orgId: string;
  workspaceId: string;
};

const AgentPanelContext = createContext<AgentPanelContextValue | null>(null);

type AgentPanelProviderProps = {
  orgId: string;
  workspaceId: string;
  children: ReactNode;
};

export function AgentPanelProvider({ orgId, workspaceId, children }: AgentPanelProviderProps) {
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({ open, setOpen, orgId, workspaceId }),
    [open, orgId, workspaceId],
  );

  return <AgentPanelContext.Provider value={value}>{children}</AgentPanelContext.Provider>;
}

export function useAgentPanel() {
  const ctx = useContext(AgentPanelContext);
  if (!ctx) {
    throw new Error("useAgentPanel must be used within AgentPanelProvider");
  }
  return ctx;
}

export function useAgentPanelOptional() {
  return useContext(AgentPanelContext);
}
