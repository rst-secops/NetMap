import Link from "next/link";
import NodeForm from "../../../components/NodeForm";
import { createNodeAction } from "../actions";

export default function NewDcNodePage() {
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
          <li className="text-gray-300">New Node</li>
        </ol>
      </nav>

      <h1 className="mb-6 text-2xl font-bold">Add New Node</h1>
      <NodeForm action={createNodeAction} />
    </div>
  );
}
