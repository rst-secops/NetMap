import Link from "next/link";
import { getLatestAnalysisResult } from "../lib/analysis-results";
import NetworkMap from "../components/NetworkMap";
import AnalysisSeenMarker from "../components/AnalysisSeenMarker";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const result = getLatestAnalysisResult();

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <h1 className="text-2xl font-bold">Network Topology</h1>
        <p className="text-gray-400">No analysis available yet.</p>
        <Link href="/analysis" className="text-blue-400 hover:text-blue-300 text-sm">
          Go to Analysis Configuration to run your first analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <AnalysisSeenMarker analysisId={result.id} />
      <div className="px-4 py-3 flex items-center gap-4 border-b border-gray-800 shrink-0">
        <h1 className="text-lg font-semibold">Network Topology</h1>
        <span className="text-sm text-gray-400">
          {result.graphData.nodes.length} nodes &middot;{" "}
          {result.graphData.edges.length} edges
        </span>
        <span className="text-xs text-gray-600 ml-auto">
          Last updated: {result.createdAt}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <NetworkMap graph={result.graphData} />
      </div>
    </div>
  );
}
