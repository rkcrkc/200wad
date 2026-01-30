import { Plus } from "lucide-react";

export function AddLanguageCard() {
  return (
    <div className="group flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 p-6 transition-all hover:border-primary/50 hover:from-blue-50 hover:to-purple-50">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white transition-all group-hover:bg-primary/10">
        <Plus className="h-8 w-8 text-gray-400 group-hover:text-primary" />
      </div>
      <h3 className="mb-2 text-xl text-gray-700 group-hover:text-gray-900">
        Add a language
      </h3>
      <p className="text-center text-sm text-gray-500">
        Start learning a new language today
      </p>
    </div>
  );
}
