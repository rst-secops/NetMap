import { getAnalysisProvider, getClaudeConfig } from "../../lib/analysis-settings";
import { getLatestAnalysisResult } from "../../lib/analysis-results";
import { listApiCallLogs } from "../../lib/api-call-logs";
import ProviderCard from "../../components/ProviderCard";
import ClaudeConfigCard from "../../components/ClaudeConfigCard";
import RunAnalysisButton from "../../components/RunAnalysisButton";
import ApiCallLogsCard from "../../components/ApiCallLogsCard";

export const dynamic = "force-dynamic";

export default function AnalysisPage() {
  const provider = getAnalysisProvider();
  const claudeConfig = provider === "claude" ? getClaudeConfig() : null;
  const latestResult = getLatestAnalysisResult();
  const apiCallLogs = listApiCallLogs();

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
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold">Run Analysis</h2>
          <p className="mt-1 mb-4 text-sm text-gray-400">
            Send collected device data to Claude for topology analysis.
          </p>
          <RunAnalysisButton />
          {latestResult && (
            <p className="mt-4 text-xs text-gray-500">
              Last analysis: {latestResult.createdAt} —{" "}
              {latestResult.graphData.nodes.length} nodes,{" "}
              {latestResult.graphData.edges.length} edges
            </p>
          )}
        </div>
        <ApiCallLogsCard logs={apiCallLogs} />
      </div>
    </div>
  );
}
