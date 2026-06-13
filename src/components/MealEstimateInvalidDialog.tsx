interface Props {
  onClose: () => void;
}

export function MealEstimateInvalidDialog({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meal-estimate-invalid-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="meal-estimate-invalid-title"
          className="text-base font-semibold text-slate-100"
        >
          Need more detail
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          The AI couldn&apos;t estimate a meal from what you typed. Describe what
          you ate more specifically: include portions, ingredients, or how it was
          prepared.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
