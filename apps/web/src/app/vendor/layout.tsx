import VendorShell from './components/VendorShell';
import '../portals-responsive.css';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return <VendorShell>{children}</VendorShell>;
}
