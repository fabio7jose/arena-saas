'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './styles.module.css';

const TENANT = 'demo';
const SESSION = 's1';

const links = [
  {
    group: 'Admin',
    items: [
      { label: 'Grade Semanal', href: `/${TENANT}/admin/schedule` },
      { label: 'Hoje (Admin)', href: `/${TENANT}/admin/today` },
      { label: 'Setup da Arena', href: `/${TENANT}/admin/setup` },
      { label: `Sessão ${SESSION}`, href: `/${TENANT}/admin/sessions/${SESSION}` },
    ],
  },
  {
    group: 'Professor',
    items: [
      { label: 'Meu Dia', href: `/${TENANT}/teacher/today` },
      { label: `Chamada ${SESSION}`, href: `/${TENANT}/teacher/sessions/${SESSION}` },
    ],
  },
  {
    group: 'Aluno',
    items: [
      { label: 'Reservar Aula', href: `/${TENANT}/student/schedule` },
      { label: 'Minha Agenda', href: `/${TENANT}/student/my-schedule` },
    ],
  },
];

export default function DevNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={styles.hamburger} onClick={() => setOpen(true)} aria-label="Dev Nav">
        ☰
      </button>

      {open && (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} />
          <nav className={styles.panel}>
            <div className={styles.header}>
              <span className={styles.title}>🛠 DEV NAV</span>
              <button className={styles.close} onClick={() => setOpen(false)} aria-label="Fechar">
                ✕
              </button>
            </div>

            {links.map(({ group, items }) => (
              <div key={group} className={styles.section}>
                <div className={styles.sectionLabel}>{group}</div>
                {items.map(({ label, href }) => (
                  <Link key={href} href={href} className={styles.link} onClick={() => setOpen(false)}>
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </>
      )}
    </>
  );
}
