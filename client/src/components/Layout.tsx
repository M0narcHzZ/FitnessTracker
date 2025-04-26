import { ReactNode } from "react";
import Header from "./Header";
import NavigationTabs from "./NavigationTabs";
import MobileNavigation from "./MobileNavigation";
import { useLocation } from "wouter";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [location] = useLocation();
  
  // Check if we're on the workout execution page
  const isWorkoutExecution = location.startsWith('/workout') && location.includes('/execute');

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-white shadow-lg">
      <Header />
      
      {!isWorkoutExecution && (
        <>
          <NavigationTabs />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
          <MobileNavigation />
        </>
      )}
      
      {isWorkoutExecution && (
        <main className="flex-1 overflow-auto bg-neutral-lightest">
          {children}
        </main>
      )}
    </div>
  );
};

export default Layout;
