import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import {
  getPublicCustomerServiceConfig,
  getPublicMaintenanceConfig,
  type CustomerServiceConfig,
  type MaintenanceConfig,
} from "./catalogApi";
import { MaintenancePage } from "./components/MaintenancePage";
import { router } from "./routes";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState<MaintenanceConfig | null>(null);
  const [customerService, setCustomerService] = useState<CustomerServiceConfig | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const config = await getPublicMaintenanceConfig();
        if (!alive) return;
        setMaintenance(config);
        if (config.enabled) {
          try {
            const service = await getPublicCustomerServiceConfig();
            if (!alive) return;
            setCustomerService(service);
          } catch {
            if (!alive) return;
            setCustomerService(null);
          }
        }
      } catch {
        if (!alive) return;
        setMaintenance(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (maintenance?.enabled) {
    return <MaintenancePage config={maintenance} customerService={customerService} />;
  }

  return <RouterProvider router={router} />;
}
