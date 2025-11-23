const Card = ({ children, className = '', title, actions }) => {
  return (
    <div className={`bg-white border border-[rgba(0,0,0,0.1)] rounded-[10px] ${className}`}>
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.1)] flex justify-between items-center">
          {title && <h3 className="text-base font-medium text-neutral-950">{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default Card;

