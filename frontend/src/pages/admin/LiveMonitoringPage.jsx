/**
 * Live Monitoring page boundary. Monitoring state and the existing
 * assessment telemetry handler remain in AdminDashboard to avoid duplicate
 * polling or API requests.
 */
export default function LiveMonitoringPage({ children }) {
  return children;
}
