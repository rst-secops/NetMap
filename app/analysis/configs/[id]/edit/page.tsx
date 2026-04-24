import { notFound } from "next/navigation";
import Link from "next/link";
import { getConfigById } from "../../../../../lib/analysis-configs";
import { listApiCallLogsByConfigId } from "../../../../../lib/api-call-logs";
import ConfigForm from "../../../../../components/ConfigForm";
import ApiCallLogsCard from "../../../../../components/ApiCallLogsCard";
import { updateConfigAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const config = getConfigById(id);
  if (!config) notFound();

  const logs = listApiCallLogsByConfigId(id);

  const defaultValues = {
    id: config.id,
    name: config.name,
    provider: config.provider,
    model: config.model,
    maxTokens: config.maxTokens,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey
      ? "••••••••" + config.apiKey.slice(-4)
      : "",
    hasApiKey: config.apiKey.length > 0,
    isDefault: config.isDefault,
    skipVlans: config.skipVlans,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/analysis/configs" className="hover:text-gray-300">
          Data Analysis
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-300">Edit {config.name}</span>
      </nav>
      <h1 className="mb-6 text-2xl font-bold">Edit {config.name}</h1>
      <div className="space-y-6">
        <ConfigForm action={updateConfigAction} defaultValues={defaultValues} />
        <ApiCallLogsCard logs={logs} />
      </div>
    </div>
  );
}
