import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import MapPage from "./pages/MapPageNew";
import FlightSimPage from "./pages/FlightSimPage";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/map"} component={MapPage} />
      <Route path={"/emergency"} component={MapPage} />
      <Route path={"/flight-sim"} component={FlightSimPage} />
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
