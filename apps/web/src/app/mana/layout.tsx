import { Metadata } from 'next';
import { Archivo, IBM_Plex_Mono, Newsreader } from 'next/font/google';
import './mana-styles.css';

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Mana Operations Platform - EOF',
  description: 'Professional operations platform for seafood distribution',
};

export default function ManaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${archivo.variable} ${ibmPlexMono.variable} ${newsreader.variable}`}
      style={{
        fontFamily: 'var(--font-archivo), sans-serif',
      }}
    >
      {children}
    </div>
  );
}
