// Reusable Card Component with Tailwind
const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-border ${className}`}>
      {children}
    </div>
  );
};

export default Card;
