import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arena SaaS',
  description: 'Gestão de arenas esportivas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
