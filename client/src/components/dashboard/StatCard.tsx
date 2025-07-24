import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  change?: {
    value: string;
    positive: boolean;
  };
  description?: string;
}

const StatCard = ({
  title,
  value,
  icon,
  change,
  description,
}: StatCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <h3 className="text-2xl font-bold mt-1 text-gray-800">{value}</h3>
        </div>
        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
          {icon}
        </div>
      </div>

      {change && (
        <div className="mt-4 flex items-center">
          <span
            className={`text-sm flex items-center ${change.positive ? 'text-green-500' : 'text-red-500'}`}
          >
            {change.positive ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            )}
            {change.value}
          </span>
          {description && (
            <span className="text-xs text-gray-500 ml-2">{description}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
