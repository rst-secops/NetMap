import { listAnalysisResults } from "../lib/analysis-results";
import MapViewer from "../components/MapViewer";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const results = listAnalysisResults().map(({ id, name, createdAt, graphData, layoutData }) => ({
    id,
    name,
    createdAt,
    graphData,
    layoutData,
  }));

  return <MapViewer results={results} />;
}
