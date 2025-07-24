import React from 'react';
import { useLocation } from 'wouter';

const AdminOrgChart: React.FC = () => {
  const [, navigate] = useLocation();

  // Redirect to existing org-chart page
  React.useEffect(() => {
    navigate('/org-chart');
  }, [navigate]);

  return null;
};

export default AdminOrgChart;