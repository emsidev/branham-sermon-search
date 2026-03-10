import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="surface-card w-full max-w-[520px] p-8 text-center">
        <h1 className="mb-3 font-mono text-4xl font-semibold text-foreground">404</h1>
        <p className="mb-4 text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="font-mono text-link underline hover:opacity-90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
