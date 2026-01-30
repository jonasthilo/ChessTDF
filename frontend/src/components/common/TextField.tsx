interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'color';
}

export const TextField = ({ label, value, onChange, type = 'text' }: TextFieldProps) => (
  <div className="field-row">
    <label>{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);
