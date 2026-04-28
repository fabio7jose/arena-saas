'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import styles from './styles.module.css';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const params = useParams();
  const tenant = params.tenant as string;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>Arena</div>
        <span className={styles.userName}>{user?.name ?? '—'}</span>
      </header>
      <main className={styles.main}>{children}</main>
      <nav className={styles.bottomNav}>
        <Link href={`/${tenant}/student/schedule`} className={styles.navLink}>
          Reservar Aula
        </Link>
        <Link href={`/${tenant}/student/my-schedule`} className={styles.navLink}>
          Minha Agenda
        </Link>
      </nav>
    </div>
  );
}
