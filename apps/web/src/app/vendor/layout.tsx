import VendorNav from './components/VendorNav';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        background: '#F4F5F6',
        fontFamily: "'Archivo', sans-serif",
        color: '#222A30',
        WebkitFontSmoothing: 'antialiased',
        overflow: 'hidden',
      }}
    >
      <VendorNav />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
