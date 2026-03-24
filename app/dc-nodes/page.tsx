import { getSchedule } from "../../lib/settings";
import { getAllNodes } from "../../lib/dc-nodes";
import ScheduleCard from "../../components/ScheduleCard";
import NodeList from "../../components/NodeList";

export const dynamic = "force-dynamic";

export default function DcNodesPage() {
  const schedule = getSchedule();
  const allNodes = getAllNodes();

  // Strip sensitive fields before passing to client components
  const nodes = allNodes.map(({ id, nodeType, nodeDisplayName, host, port, isEnabled }) => ({
    id,
    nodeType,
    nodeDisplayName,
    host,
    port,
    isEnabled,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Data Collection Configuration</h1>
      <div className="space-y-6">
        <ScheduleCard schedule={schedule} />
        <NodeList nodes={nodes} />
      </div>
    </div>
  );
}
