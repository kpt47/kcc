import { forwardRef, InputHTMLAttributes } from "react";
import { FieldWrapper } from "./FieldWrapper";
import { inputClassName } from "./inputStyles";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, error, hint, required, className, id, name, ...rest },
  ref
) {
  const inputId = id ?? name;
  return (
    <FieldWrapper label={label} htmlFor={inputId} required={required} error={error} hint={hint}>
      <input
        ref={ref}
        id={inputId}
        name={name}
        className={inputClassName(!!error, className)}
        {...rest}
      />
    </FieldWrapper>
  );
});
