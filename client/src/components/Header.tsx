import { useLocation } from "wouter";

const Header = () => {
  const [location] = useLocation();
  
  return (
    <header className="bg-primary p-4 text-primary-foreground flex justify-between items-center shadow-md">
      <h1 
        className="text-xl font-heading font-bold cursor-pointer"
        onClick={() => location !== "/" && (window.location.href = "/")}
      >
        Фитнес Трекер
      </h1>
      <div className="flex items-center gap-3">
        <span className="material-icons cursor-pointer">notifications</span>
        <span className="material-icons cursor-pointer">account_circle</span>
      </div>
    </header>
  );
};

export default Header;
