import Link from "next/link";
import { notFound } from "next/navigation";
import { getNodeById } from "../../../../lib/dc-nodes";
import NodeForm from "../../../../components/NodeForm";
import { updateNodeAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditDcNodePage({
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
          <li>
            <Link href={`/dc-nodes/${id}`} className="hover:text-gray-300">
              {node.nodeDisplayName}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-300">Edit</li>
        </ol>
      </nav>

      <h1 className="mb-6 text-2xl font-bold">Edit {node.nodeDisplayName}</h1>
      <NodeForm
        action={updateNodeAction}
        defaultValues={{
          id: node.id,
          nodeType: node.nodeType,
          nodeDisplayName: node.nodeDisplayName,
          host: node.host,
          port: node.port,
          commands: node.commands,
          nodeUser: node.nodeUser,
          nodePasswd: node.nodePasswd,
          isEnabled: node.isEnabled,
        }}
      />
    </div>
  );
}
