import { forwardRef } from 'react';

const Checkbox = forwardRef(({ 
  label, 
  className = '',
  children,
  ...props 
}, ref) => {
  const inputId = props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={`flex items-center ${className}`}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="w-4 h-4 text-[#ea7a24] bg-[#f3f3f5] border-[#d1d5dc] rounded focus:ring-[#ea7a24] focus:ring-2 cursor-pointer"
        {...props}
      />
      {label && (
        <label htmlFor={inputId} className="ml-2 text-sm text-neutral-950 cursor-pointer">
          {label}
        </label>
      )}
      {children && (
        <label htmlFor={inputId} className="ml-2 text-sm text-neutral-950 cursor-pointer">
          {children}
        </label>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;
