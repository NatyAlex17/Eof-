import PortalShell from './components/PortalShell';
import '../portals-responsive.css';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
