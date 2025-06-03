interface AdminIconProps {
  size?: number;
  className?: string;
}

export const AdminIcon = ({ size = 40, className = "" }: AdminIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* User circle head */}
      <circle
        cx="50"
        cy="30"
        r="12"
        stroke="#374151"
        strokeWidth="3"
        fill="none"
      />
      
      {/* User body/shoulders */}
      <path
        d="M25 65 C25 55, 35 50, 50 50 C65 50, 75 55, 75 65 L75 75 L65 75 L65 70 L35 70 L35 75 L25 75 Z"
        stroke="#374151"
        strokeWidth="3"
        fill="none"
        strokeLinejoin="round"
      />
      
      {/* Star badge */}
      <path
        d="M75 60 L78 67 L86 67 L80 72 L82 80 L75 75 L68 80 L70 72 L64 67 L72 67 Z"
        stroke="#374151"
        strokeWidth="2.5"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
};