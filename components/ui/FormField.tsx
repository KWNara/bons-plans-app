type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string };
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { label: string };

const fieldClass =
  "mt-1.5 w-full rounded-control border border-ink/15 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 focus:border-teal transition-colors";

export function FormInput({ label, className, ...props }: InputProps) {
  return (
    <label className="block mb-3.5">
      <span className="text-xs font-semibold text-ink/50 uppercase tracking-wide">{label}</span>
      <input className={`${fieldClass} ${className ?? ""}`} {...props} />
    </label>
  );
}

export function FormTextarea({ label, className, ...props }: TextareaProps) {
  return (
    <label className="block mb-3.5">
      <span className="text-xs font-semibold text-ink/50 uppercase tracking-wide">{label}</span>
      <textarea className={`${fieldClass} ${className ?? ""}`} {...props} />
    </label>
  );
}

export function FormSelect({ label, className, children, ...props }: SelectProps) {
  return (
    <label className="block mb-3.5">
      <span className="text-xs font-semibold text-ink/50 uppercase tracking-wide">{label}</span>
      <select className={`${fieldClass} bg-white ${className ?? ""}`} {...props}>
        {children}
      </select>
    </label>
  );
}
