import { LlmActiveProvider } from "@/features/generate/llm-active-context";

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LlmActiveProvider>{children}</LlmActiveProvider>;
}
