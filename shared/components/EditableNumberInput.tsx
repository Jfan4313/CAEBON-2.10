import React, { useEffect, useRef, useState } from 'react';

interface EditableNumberInputProps extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange'
> {
    value: number;
    onValueChange: (value: number) => void;
}

/**
 * 保留空字符串、0. 等编辑中间态，避免受控数字输入打断小数录入。
 */
export const EditableNumberInput: React.FC<EditableNumberInputProps> = ({
    value,
    onValueChange,
    min,
    max,
    onFocus,
    onBlur,
    ...inputProps
}) => {
    const [draft, setDraft] = useState(String(value));
    const isEditingRef = useRef(false);

    useEffect(() => {
        if (!isEditingRef.current) setDraft(String(value));
    }, [value]);

    const getValidValue = (rawValue: string): number | null => {
        if (rawValue.trim() === '' || rawValue.endsWith('.') || rawValue === '-') return null;

        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) return null;
        if (min !== undefined && numericValue < Number(min)) return null;
        if (max !== undefined && numericValue > Number(max)) return null;
        return numericValue;
    };

    return (
        <input
            {...inputProps}
            type="number"
            min={min}
            max={max}
            value={draft}
            onFocus={(event) => {
                isEditingRef.current = true;
                onFocus?.(event);
            }}
            onChange={(event) => {
                isEditingRef.current = true;
                const rawValue = event.target.value;
                setDraft(rawValue);
                const numericValue = getValidValue(rawValue);
                if (numericValue !== null) onValueChange(numericValue);
            }}
            onBlur={(event) => {
                const numericValue = getValidValue(draft);
                if (numericValue !== null) {
                    onValueChange(numericValue);
                    setDraft(String(numericValue));
                } else {
                    setDraft(String(value));
                }
                isEditingRef.current = false;
                onBlur?.(event);
            }}
        />
    );
};
