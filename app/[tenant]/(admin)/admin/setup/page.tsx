'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from './styles.module.css';
import { COURTS, TEMPLATES, getSessionsStore, ServiceType } from '../../../../../lib/schedule';

function courtInUse(courtId: string): boolean {
  return getSessionsStore().some(s => s.courtId === courtId);
}

function templateInUse(templateId: string): boolean {
  return getSessionsStore().some(s => s.templateId === templateId);
}

export default function SetupPage() {
  const params = useParams();
  const tenant = params.tenant as string;

  const [, setTick] = useState(0);
  const rerender = () => setTick(t => t + 1);

  // Court form
  const [showCourtForm, setShowCourtForm] = useState(false);
  const [courtName, setCourtName] = useState('');

  // Template form
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplCapacity, setTplCapacity] = useState('');
  const [tplDuration, setTplDuration] = useState('');
  const [tplServiceType, setTplServiceType] = useState<ServiceType>('OPEN_GROUP');

  // Per-row delete error messages
  const [courtError, setCourtError] = useState<Record<string, string>>({});
  const [tplError, setTplError] = useState<Record<string, string>>({});

  function addCourt(e: React.FormEvent) {
    e.preventDefault();
    const name = courtName.trim();
    if (!name) return;
    COURTS.push({ id: `q${Date.now()}`, name });
    setCourtName('');
    setShowCourtForm(false);
    rerender();
  }

  function deleteCourt(id: string) {
    if (courtInUse(id)) {
      setCourtError(prev => ({ ...prev, [id]: 'Quadra em uso, não pode ser excluída.' }));
      return;
    }
    const idx = COURTS.findIndex(c => c.id === id);
    if (idx !== -1) COURTS.splice(idx, 1);
    setCourtError(prev => { const next = { ...prev }; delete next[id]; return next; });
    rerender();
  }

  function addTemplate(e: React.FormEvent) {
    e.preventDefault();
    const name = tplName.trim();
    if (!name || !tplCapacity || !tplDuration) return;
    TEMPLATES.push({
      id: `tpl${Date.now()}`,
      name,
      capacity: Number(tplCapacity),
      durationMinutes: Number(tplDuration),
      service_type: tplServiceType,
    });
    setTplName('');
    setTplCapacity('');
    setTplDuration('');
    setTplServiceType('OPEN_GROUP');
    setShowTemplateForm(false);
    rerender();
  }

  function deleteTemplate(id: string) {
    if (templateInUse(id)) {
      setTplError(prev => ({ ...prev, [id]: 'Template em uso, não pode ser excluído.' }));
      return;
    }
    const idx = TEMPLATES.findIndex(t => t.id === id);
    if (idx !== -1) TEMPLATES.splice(idx, 1);
    setTplError(prev => { const next = { ...prev }; delete next[id]; return next; });
    rerender();
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href={`/${tenant}/admin/schedule`} className={styles.backLink}>
            ← Grade Semanal
          </Link>
          <h1 className={styles.title}>Configuração da Arena</h1>
        </div>
      </header>

      <main className={styles.main}>

        {/* ── Quadras ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Quadras</h2>
            {!showCourtForm && (
              <button className={styles.btnPrimary} onClick={() => setShowCourtForm(true)}>
                Adicionar quadra
              </button>
            )}
          </div>

          {showCourtForm && (
            <form onSubmit={addCourt} className={styles.inlineForm}>
              <input
                className={styles.input}
                placeholder="Nome da quadra"
                value={courtName}
                onChange={e => setCourtName(e.target.value)}
                required
                autoFocus
              />
              <button type="submit" className={styles.btnPrimary}>Salvar</button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => { setShowCourtForm(false); setCourtName(''); }}
              >
                Cancelar
              </button>
            </form>
          )}

          <table className={styles.table}>
            <tbody>
              {COURTS.map(c => (
                <tr key={c.id} className={styles.row}>
                  <td className={styles.cellName}>{c.name}</td>
                  <td className={styles.cellAction}>
                    {courtError[c.id] && (
                      <span className={styles.inlineError}>{courtError[c.id]}</span>
                    )}
                    <button className={styles.btnDanger} onClick={() => deleteCourt(c.id)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {COURTS.length === 0 && (
                <tr>
                  <td colSpan={2} className={styles.empty}>Nenhuma quadra cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* ── Templates de aula ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Templates de aula</h2>
            {!showTemplateForm && (
              <button className={styles.btnPrimary} onClick={() => setShowTemplateForm(true)}>
                Adicionar template
              </button>
            )}
          </div>

          {showTemplateForm && (
            <form onSubmit={addTemplate} className={styles.inlineForm}>
              <input
                className={styles.input}
                placeholder="Nome"
                value={tplName}
                onChange={e => setTplName(e.target.value)}
                required
                autoFocus
              />
              <input
                className={styles.inputSmall}
                type="number"
                placeholder="Capacidade"
                min={1}
                value={tplCapacity}
                onChange={e => setTplCapacity(e.target.value)}
                required
              />
              <input
                className={styles.inputSmall}
                type="number"
                placeholder="Duração (min)"
                min={1}
                value={tplDuration}
                onChange={e => setTplDuration(e.target.value)}
                required
              />
              <select
                className={styles.input}
                value={tplServiceType}
                onChange={e => setTplServiceType(e.target.value as ServiceType)}
                required
              >
                <option value="OPEN_GROUP">Turma Aberta</option>
                <option value="PERSONAL">Personal</option>
                <option value="VIP">VIP</option>
              </select>
              <button type="submit" className={styles.btnPrimary}>Salvar</button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  setShowTemplateForm(false);
                  setTplName('');
                  setTplCapacity('');
                  setTplDuration('');
                }}
              >
                Cancelar
              </button>
            </form>
          )}

          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thName}>Nome</th>
                <th className={styles.th}>Capacidade</th>
                <th className={styles.th}>Duração</th>
                <th className={styles.th} />
              </tr>
            </thead>
            <tbody>
              {TEMPLATES.map(t => (
                <tr key={t.id} className={styles.row}>
                  <td className={styles.cellName}>{t.name}</td>
                  <td className={styles.cell}>{t.capacity} alunos</td>
                  <td className={styles.cell}>{t.durationMinutes} min</td>
                  <td className={styles.cellAction}>
                    {tplError[t.id] && (
                      <span className={styles.inlineError}>{tplError[t.id]}</span>
                    )}
                    <button className={styles.btnDanger} onClick={() => deleteTemplate(t.id)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {TEMPLATES.length === 0 && (
                <tr>
                  <td colSpan={4} className={styles.empty}>Nenhum template cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

      </main>
    </div>
  );
}
