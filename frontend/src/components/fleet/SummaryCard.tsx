import type { SummaryCardProps } from '../../types';

export const SummaryCard: React.FC<SummaryCardProps> = ({ value, label }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {value}
        </div>
        <div className="text-sm font-medium text-gray-600">
          {label}
        </div>
      </div>
    </div>
  );
};
