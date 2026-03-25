import Link from "next/link";
import { notFound } from "next/navigation";
import { getNodeById } from "../../../lib/dc-nodes";
import NodeResults from "../../../components/NodeResults";
import CollectNodeButton from "../../../components/CollectNodeButton";

export const dynamic = "force-dynamic";

export default async function DcNodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const node = getNodeById(id);
  if (!node) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/dc-nodes" className="hover:text-gray-300">
              Data Collection
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-300">{node.nodeDisplayName}</li>
        </ol>
      </nav>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{node.nodeDisplayName}</h1>
        <div className="flex items-center gap-3">
          <CollectNodeButton nodeId={id} />
          <Link
            href={`/dc-nodes/${id}/edit`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
          >
            Edit Node
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Node Details */}
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Configuration</h2>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-gray-500">Type</dt>
              <dd className="mt-0.5">
                <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs">
                  {node.nodeType}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Status</dt>
              <dd className="mt-0.5 text-sm">
                {node.isEnabled ? (
                  <span className="text-green-400">Enabled</span>
                ) : (
                  <span className="text-gray-500">Disabled</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Host</dt>
              <dd className="mt-0.5 text-sm text-gray-300">
                {node.host}:{node.port}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Username</dt>
              <dd className="mt-0.5 text-sm text-gray-300">{node.nodeUser}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-gray-500">Commands</dt>
              <dd className="mt-1.5 flex flex-wrap gap-2">
                {node.commands.map((cmd) => (
                  <code
                    key={cmd}
                    className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gray-300"
                  >
                    {cmd}
                  </code>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Created</dt>
              <dd className="mt-0.5 text-sm text-gray-400">
                {node.createdAt}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">
                Last Updated
              </dt>
              <dd className="mt-0.5 text-sm text-gray-400">
                {node.updatedAt}
              </dd>
            </div>
          </dl>
        </section>

        {/* Results */}
        <NodeResults
          results={node.results as Record<string, string> | null}
        />
      </div>
    </div>
  );
}
