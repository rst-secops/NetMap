import Link from "next/link";
import { notFound } from "next/navigation";
import { getConfigById } from "../../../../lib/analysis-configs";
import { listApiCallLogsByConfigId } from "../../../../lib/api-call-logs";
import ApiCallLogsCard from "../../../../components/ApiCallLogsCard";

export const dynamic = "force-dynamic";

const PROVIDER_LABELS: Record<string, string> = {
  claude: "Claude (Anthropic)",
  google: "Google AI Studio",
  ollama: "Ollama (Local)",
};

export default async function ConfigDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const config = getConfigById(id);
  if (!config) notFound();

  const logs = listApiCallLogsByConfigId(id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/analysis/configs" className="hover:text-gray-300">
              Data Analysis
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-300">{config.name}</li>
        </ol>
      </nav>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{config.name}</h1>
        <Link
          href={`/analysis/configs/${id}/edit`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
        >
          Edit Config
        </Link>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Configuration</h2>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-gray-500">Provider</dt>
              <dd className="mt-0.5">
                <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs">
                  {PROVIDER_LABELS[config.provider] ?? config.provider}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Default</dt>
              <dd className="mt-0.5 text-sm">
                {config.isDefault ? (
                  <span className="text-yellow-400">Yes</span>
                ) : (
                  <span className="text-gray-500">No</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Model</dt>
              <dd className="mt-0.5 text-sm text-gray-300">{config.model}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Max Tokens</dt>
              <dd className="mt-0.5 text-sm text-gray-300">{config.maxTokens}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Base URL</dt>
              <dd className="mt-0.5 text-sm text-gray-300">
                {config.baseUrl || <span className="text-gray-600">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">API Key</dt>
              <dd className="mt-0.5 text-sm">
                {config.apiKey ? (
                  <span className="text-green-400">Configured</span>
                ) : (
                  <span className="text-gray-500">Not set</span>
                )}
              </dd>
            </div>
            {config.provider === "ollama" && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Skip VLANs</dt>
                <dd className="mt-0.5 text-sm">
                  {config.skipVlans ? (
                    <span className="text-yellow-400">Yes</span>
                  ) : (
                    <span className="text-gray-500">No</span>
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium text-gray-500">Created</dt>
              <dd className="mt-0.5 text-sm text-gray-400">{config.createdAt}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-0.5 text-sm text-gray-400">{config.updatedAt}</dd>
            </div>
          </dl>
        </section>

        <ApiCallLogsCard logs={logs} />
      </div>
    </div>
  );
}
