import { getLatestAnalysisResult } from "../../../lib/analysis-results";
import { getAllConfigs } from "../../../lib/analysis-configs";
import RunAnalysisCard from "../../../components/RunAnalysisCard";
import ConfigList from "../../../components/ConfigList";

export const dynamic = "force-dynamic";

export default function AnalysisConfigsPage() {
  const latestResult = getLatestAnalysisResult();
  const allConfigs = getAllConfigs();

  const configOptions = allConfigs.map(({ id, name, isDefault }) => ({ id, name, isDefault }));
  const configs = allConfigs.map(({ id, name, provider, model, maxTokens, isDefault, apiKey }) => ({
    id,
    name,
    provider,
    model,
    maxTokens,
    isDefault,
    hasApiKey: apiKey.length > 0,
  }));
  const latestResultInfo = latestResult
    ? `Last analysis: ${latestResult.createdAt} — ${latestResult.graphData.nodes.length} nodes, ${latestResult.graphData.edges.length} edges`
    : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Data Analysis</h1>
      <div className="space-y-6">
        <RunAnalysisCard configs={configOptions} latestResultInfo={latestResultInfo} />
        <ConfigList configs={configs} />
      </div>
    </div>
  );
}
