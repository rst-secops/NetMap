import { getAnalysisProvider, getClaudeConfig } from "../../lib/analysis-settings";
import ProviderCard from "../../components/ProviderCard";
import ClaudeConfigCard from "../../components/ClaudeConfigCard";

export const dynamic = "force-dynamic";

export default function AnalysisPage() {
  const provider = getAnalysisProvider();
  const claudeConfig = provider === "claude" ? getClaudeConfig() : null;

  const safeClaudeConfig = claudeConfig
    ? {
        ...claudeConfig,
        apiKey: claudeConfig.apiKey
          ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + claudeConfig.apiKey.slice(-4)
          : "",
        hasKey: !!claudeConfig.apiKey,
      }
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Data Analysis Configuration</h1>
      <div className="space-y-6">
        <ProviderCard provider={provider} />
        {provider === "claude" && safeClaudeConfig && (
          <ClaudeConfigCard config={safeClaudeConfig} />
        )}
      </div>
    </div>
  );
}
