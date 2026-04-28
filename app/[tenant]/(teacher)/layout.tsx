'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import styles from './styles.module.css';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const params = useParams();
  const tenant = params.tenant as string;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Arena</div>
        <nav className={styles.nav}>
          <Link href={`/${tenant}/teacher/today`} className={styles.navLink}>
            Meu Dia
          </Link>
        </nav>
        <div className={styles.userBlock}>
          <span className={styles.userName}>{user?.name ?? '—'}</span>
          <span className={styles.userRole}>Professor</span>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
