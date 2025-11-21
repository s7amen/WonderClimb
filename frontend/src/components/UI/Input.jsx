import { forwardRef } from 'react';

const Input = forwardRef(({ 
  label, 
  type = 'text', 
  error, 
  className = '',
  ...props 
}, ref) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-neutral-950 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={`
          w-full px-3 py-2 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px]
          focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24]
          text-sm text-neutral-950 placeholder:text-[#99a1af]
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

