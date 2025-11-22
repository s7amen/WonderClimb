const Button = ({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', 
  disabled = false,
  className = '',
  ...props 
}) => {
  // Base classes: rounded-lg (8px), text-sm (14px), font-rubik font-medium, padding
  const baseClasses = 'px-4 py-2 rounded-lg text-sm font-rubik font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    // Primary: orange background (#ea7a24), white text
    primary: 'bg-orange-brand !text-white hover:opacity-90 focus:ring-orange-brand disabled:opacity-50 disabled:cursor-not-allowed',
    // Secondary: green background (#adb933), white text
    secondary: 'bg-green-brand !text-white hover:opacity-90 focus:ring-green-brand disabled:opacity-50 disabled:cursor-not-allowed',
    // Danger: keep red for delete actions (white text for contrast)
    danger: 'bg-red-600 !text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300 disabled:cursor-not-allowed',
    // Success: keep green for success states (white text for contrast)
    success: 'bg-green-600 !text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

