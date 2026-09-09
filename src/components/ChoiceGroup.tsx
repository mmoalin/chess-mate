import { useId } from 'react';

export function ChoiceGroup({ label, choices, value, onChange, disabled = false }: {
  label: string; choices: { id: string; label: string }[]; value: string;
  onChange: (id: string) => void; disabled?: boolean;
}) {
  const name = useId();
  return <div className="study-choice-list" role="radiogroup" aria-label={label}>
    {choices.map((choice) => <label className={`choice-option ${value === choice.id ? 'selected' : ''}`} key={choice.id}>
      <input type="radio" name={name} value={choice.id} checked={value === choice.id} disabled={disabled} onChange={() => onChange(choice.id)} />
      <span>{choice.label}</span>
    </label>)}
  </div>;
}
