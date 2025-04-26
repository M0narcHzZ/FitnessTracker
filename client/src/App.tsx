import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Measurements from "@/pages/Measurements";
import Workouts from "@/pages/Workouts";
import Progress from "@/pages/Progress";
import ExecuteWorkout from "@/pages/ExecuteWorkout";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/measurements" component={Measurements} />
        <Route path="/workouts" component={Workouts} />
        <Route path="/progress" component={Progress} />
        <Route path="/workout/:id/execute" component={ExecuteWorkout} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
