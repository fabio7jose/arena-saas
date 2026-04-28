import type { Metadata } from 'next';
import './globals.css';
import DevNav from '@/components/DevNav/DevNav';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Arena SaaS',
  description: 'Gestão de arenas esportivas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <DevNav />
      </body>
    </html>
  );
}
