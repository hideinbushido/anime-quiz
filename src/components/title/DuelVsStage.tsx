/** Le sceau Zenkai posé sur le trait d'or : il tourne et s'allume quand les deux joueurs sont prêts. */
export function DuelVsStage({ armed }: { armed: boolean }) {
  return <div className={"arena-vs-stage" + (armed ? " is-armed" : "")} aria-label="Versus">
    <span className="arena-vs-halo" aria-hidden="true" />
    <img className="arena-vs-seal" src="/logo-zenkai.png" alt="" />
    <span className="arena-vs-word" aria-hidden="true">VS</span>
  </div>;
}
