import { forwardRef, TextareaHTMLAttributes } from "react";
import { FieldWrapper } from "./FieldWrapper";
import { inputClassName } from "./inputStyles";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

export const TextAreaField = forwardRef<HTMLTextAreaElement, Props>(function TextAreaField(
  { label, error, hint, required, className, id, name, rows = 3, ...rest },
  ref
) {
  const inputId = id ?? name;
  return (
    <FieldWrapper label={label} htmlFor={inputId} required={required} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={inputId}
        name={name}
        rows={rows}
        className={inputClassName(!!error, className)}
        {...rest}
      />
    </FieldWrapper>
  );
});
