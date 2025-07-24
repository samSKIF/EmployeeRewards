import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const isMobile = useMobile();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <Sidebar />
      <main className={`flex-1 p-5 md:p-8 ${isMobile ? '' : 'md:ml-64'}`}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
