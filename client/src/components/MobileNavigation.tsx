import { useLocation, Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const MobileNavigation = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  const navItems = [
    { name: "Панель", path: "/", icon: "dashboard" },
    { name: "Измерения", path: "/measurements", icon: "straighten" },
    { name: "Тренировки", path: "/workouts", icon: "fitness_center" },
    { name: "Прогресс", path: "/progress", icon: "show_chart" }
  ];

  const addMenuItems = [
    { 
      name: "Измерение", 
      action: () => {
        navigate("/measurements");
        setTimeout(() => {
          const event = new CustomEvent('open-add-measurement-dialog');
          window.dispatchEvent(event);
        }, 100);
      },
      icon: "straighten" 
    },
    { 
      name: "Тренировку", 
      action: () => {
        navigate("/workouts");
        setTimeout(() => {
          const event = new CustomEvent('open-add-workout-dialog');
          window.dispatchEvent(event);
        }, 100);
      },
      icon: "fitness_center" 
    },
    { 
      name: "Фото", 
      action: () => {
        navigate("/progress");
        setTimeout(() => {
          const event = new CustomEvent('open-add-photo-dialog');
          window.dispatchEvent(event);
        }, 100);
      }, 
      icon: "add_a_photo" 
    }
  ];

  const toggleAddMenu = () => {
    setShowAddMenu(!showAddMenu);
  };
  
  return (
    <>
      <nav className="md:hidden bg-white border-t shadow-lg">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = 
              item.path === "/" 
                ? location === "/" 
                : location.startsWith(item.path);
                
            return (
              <Link key={item.path} href={item.path}>
                <a 
                  className={`flex flex-col items-center p-3 ${
                    isActive ? "text-primary" : "text-neutral-medium"
                  }`}
                >
                  <span className="material-icons">{item.icon}</span>
                  <span className="text-xs mt-1">{item.name}</span>
                </a>
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* Floating Action Button */}
      <div className="md:hidden fixed bottom-20 right-4">
        <button 
          className="bg-accent text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center"
          onClick={toggleAddMenu}
        >
          <span className="material-icons">
            {showAddMenu ? "close" : "add"}
          </span>
        </button>
      </div>
      
      {/* Add Menu */}
      {showAddMenu && (
        <div className="md:hidden fixed bottom-36 right-4 flex flex-col gap-3">
          {addMenuItems.map((item, index) => (
            <div key={index} className="flex items-center">
              <span className="bg-white shadow-md p-2 rounded-md mr-2 text-sm">
                Добавить {item.name}
              </span>
              <button 
                className="bg-primary text-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center"
                onClick={() => {
                  item.action();
                  setShowAddMenu(false);
                }}
              >
                <span className="material-icons">{item.icon}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default MobileNavigation;
