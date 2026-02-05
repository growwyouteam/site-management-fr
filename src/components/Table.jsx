// Reusable Table Component with Tailwind - Mobile Responsive
const Table = ({ headers, children, className = '' }) => {
  return (
    <div className={`overflow-x-auto scrollbar-custom ${className}`}>
      <table className="w-full min-w-full bg-white rounded-lg overflow-hidden">
        <thead className="bg-bg-secondary border-b-2 border-border">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
