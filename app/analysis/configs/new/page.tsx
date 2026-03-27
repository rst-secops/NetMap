import Link from "next/link";
import ConfigForm from "../../../../components/ConfigForm";
import { createConfigAction } from "../actions";

export default function NewConfigPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/analysis/configs" className="hover:text-gray-300">
          Data Analysis
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-300">New Config</span>
      </nav>
      <h1 className="mb-6 text-2xl font-bold">New Analysis Config</h1>
      <ConfigForm action={createConfigAction} />
    </div>
  );
}
