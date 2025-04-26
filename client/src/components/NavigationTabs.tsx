import { useLocation, Link } from "wouter";

const NavigationTabs = () => {
  const [location] = useLocation();
  
  const navItems = [
    { name: "Панель", path: "/" },
    { name: "Измерения", path: "/measurements" },
    { name: "Тренировки", path: "/workouts" },
    { name: "Прогресс", path: "/progress" }
  ];
  
  return (
    <div className="bg-white text-primary border-b hidden md:block">
      <div className="flex">
        {navItems.map((item) => {
          const isActive = 
            item.path === "/" 
              ? location === "/" 
              : location.startsWith(item.path);
              
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`px-6 py-3 font-medium ${
                isActive
                  ? "border-b-2 border-primary text-primary" 
                  : "text-neutral-medium hover:text-primary"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default NavigationTabs;
