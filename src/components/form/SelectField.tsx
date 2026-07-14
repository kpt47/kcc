import { forwardRef, SelectHTMLAttributes } from "react";
import { FieldWrapper } from "./FieldWrapper";
import { inputClassName } from "./inputStyles";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, Props>(function SelectField(
  { label, error, hint, required, className, id, name, placeholder, children, ...rest },
  ref
) {
  const inputId = id ?? name;
  return (
    <FieldWrapper label={label} htmlFor={inputId} required={required} error={error} hint={hint}>
      <select ref={ref} id={inputId} name={name} className={inputClassName(!!error, className)} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
    </FieldWrapper>
  );
});
