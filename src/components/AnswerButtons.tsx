"use client";

type Props = {
  selected: boolean | undefined;
  disabled?: boolean;
  onAnswer: (value: boolean) => void;
  labels: { true: string; false: string };
};

export function AnswerButtons({ selected, disabled, onAnswer, labels }: Props) {
  const base =
    "flex min-h-16 flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-4 text-lg font-semibold transition disabled:opacity-60";
  const idle =
    "border-border bg-surface hover:border-accent hover:bg-surface-muted";
  const active = "border-accent bg-accent text-accent-foreground";

  return (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={disabled}
        aria-pressed={selected === true}
        onClick={() => onAnswer(true)}
        className={`${base} ${selected === true ? active : idle}`}
      >
        <span aria-hidden="true">✓</span> {labels.true}
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={selected === false}
        onClick={() => onAnswer(false)}
        className={`${base} ${selected === false ? active : idle}`}
      >
        <span aria-hidden="true">✗</span> {labels.false}
      </button>
    </div>
  );
}
