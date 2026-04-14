import { getTextOverrides } from "@/lib/queries/text";
import { TextLabelsClient } from "./TextLabelsClient";

export default async function TextLabelsPage() {
  const { overrides, error } = await getTextOverrides();

  if (error) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Text & Labels</h1>
        </div>
        <div className="rounded-xl bg-white p-12 text-center shadow-card">
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Text & Labels</h1>
        <p className="mt-1 text-gray-600">
          Customize all user-facing text, labels, and messages.
        </p>
      </div>
      <TextLabelsClient overrides={overrides} />
    </div>
  );
}
