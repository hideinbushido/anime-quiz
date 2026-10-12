import { useEffect, useRef, type ReactNode } from "react";
import type { Epreuve } from "../types";
import { CLASSES, SELECTION_ORDER } from "../duel/engine";
import { getKillerBeePoints } from "../duel/killerBee";
import { REGLES } from "../data/regles";
import { EpreuveLogo } from "./EpreuveLogo";

const CHAPITRES = [
  { id: "duel", titre: "Le duel" },
  { id: "choix", titre: "Le choix" },
  { id: "classes", titre: "Les classes" },
  { id: "points", titre: "Les points" },
  { id: "epreuves", titre: "Les épreuves" },
];
const CHOIX = { player1: "Joueur 1", player2: "Joueur 2", host: "Présentateur" } as const;

/** Un bloc qui se pose à l'écran la première fois qu'il y entre, et n'en repart plus. */
function Reveal({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      element.classList.add("is-in");
      observer.disconnect();
    }, { rootMargin: "0px 0px -14% 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <section ref={ref} id={id} className={"rules-block " + className}>{children}</section>;
}

/** Les lettres d'un titre, qui montent une à une quand leur bloc entre à l'écran. */
function Rise({ text }: { text: string }) {
  let letter = 0;
  return <>{text.split(" ").map((word, w) => <span key={w} className="rules-word" aria-hidden="true">
    {[...word].map((char, c) => <span key={c} style={{ ["--i" as string]: letter++ }}>{char}</span>)}
  </span>)}</>;
}

/**
 * Les règles, à parcourir : une page de titre, puis un chapitre par idée.
 * Les chiffres (classes, ordre des choix, barème du blind test) sont lus dans
 * le moteur du jeu : la page ne peut pas contredire ce que le jeu applique.
 */
export function Rules({ epreuves, onBack }: { epreuves: Epreuve[]; onBack: () => void }) {
  const classLabels = epreuves[0]?.difficulties;
  return <div className="rules">
    <header className="rules-cover">
      <img className="rules-cover-seal" src="/logo-zenkai.png" alt="" />
      <p className="rules-kicker">Quiz'Animanga · le duel anime</p>
      <h1 aria-label="Les règles"><Rise text="Les règles" /></h1>
      <p className="rules-lede">Deux joueurs, cinq épreuves, un seul vainqueur. Tout ce qu'il faut savoir avant d'entrer dans l'arène.</p>
      <nav className="rules-index" aria-label="Chapitres">
        {CHAPITRES.map(chapitre => <a key={chapitre.id} href={`#${chapitre.id}`}>{chapitre.titre}</a>)}
      </nav>
    </header>

    <Reveal id="duel">
      <p className="rules-kicker">Le duel</p>
      <h2 aria-label="Un contre un"><Rise text="Un contre un" /></h2>
      <div className="rules-trio">
        <div className="player1"><b>2</b><span>joueurs</span><p>Un côté saphir, un côté rubis. Le présentateur arbitre et tient l'écran.</p></div>
        <div className="host"><b>{SELECTION_ORDER.length}</b><span>épreuves</span><p>Toutes différentes. Chaque épreuve se joue en plusieurs manches.</p></div>
        <div className="player2"><b>1</b><span>vainqueur</span><p>Celui qui a le plus de points après la dernière épreuve. À égalité, personne ne cède.</p></div>
      </div>
    </Reveal>

    <Reveal id="choix">
      <p className="rules-kicker">Le choix des épreuves</p>
      <h2 aria-label="Chacun son terrain"><Rise text="Chacun son terrain" /></h2>
      <p className="rules-text">Avant de jouer, on compose le programme. Chaque joueur choisit deux épreuves, là où il se sent fort. Le présentateur garde la cinquième : son défi surprise. Une épreuve ne peut être choisie qu'une fois.</p>
      <ol className="rules-order">
        {SELECTION_ORDER.map((selector, index) => <li key={index} className={selector} style={{ ["--i" as string]: index }}>
          <b>{index + 1}</b><span>{CHOIX[selector]}</span>
        </li>)}
      </ol>
    </Reveal>

    <Reveal id="classes">
      <p className="rules-kicker">Les classes</p>
      <h2 aria-label="Quatre niveaux de difficulté"><Rise text="Quatre niveaux de difficulté" /></h2>
      <p className="rules-text">En choisissant une épreuve, on choisit aussi sa classe. Plus la classe est haute, plus l'épreuve est dure. Chacun dose son risque.</p>
      <div className="rules-classes">
        {CLASSES.map((level, index) => <div key={level} style={{ ["--i" as string]: index }}>
          <b>{level}</b><span>{classLabels?.[level].label}</span>
        </div>)}
      </div>
    </Reveal>

    <Reveal id="points">
      <p className="rules-kicker">Les points</p>
      <h2 aria-label="Rien ne se perd"><Rise text="Rien ne se perd" /></h2>
      <div className="rules-facts">
        <p><b>Le présentateur attribue.</b> Avant chaque réponse, il désigne le joueur qui répond. Les points vont à ce joueur, peu importe qui a choisi l'épreuve.</p>
        <p><b>Une erreur ne coûte rien.</b> Aucune épreuve ne retire de points : une mauvaise réponse, c'est seulement une occasion manquée.</p>
        <p><b>Tout s'additionne.</b> Le score final est la somme des cinq épreuves. Le trait d'or du bandeau montre à tout moment qui mène.</p>
      </div>
    </Reveal>

    <div id="epreuves" className="rules-epreuves">
      <Reveal className="rules-epreuves-title">
        <p className="rules-kicker">Les épreuves</p>
        <h2 aria-label="Le catalogue"><Rise text="Le catalogue" /></h2>
        <p className="rules-text">{epreuves.length} épreuves pour l'instant. D'autres arrivent.</p>
      </Reveal>
      {epreuves.map(epreuve => {
        const regle = REGLES[epreuve.id];
        return <Reveal key={epreuve.id} className="rules-epreuve">
          <div className="rules-epreuve-logo"><EpreuveLogo epreuveId={epreuve.id} /></div>
          <div className="rules-epreuve-body">
            <h3>{epreuve.nom}</h3>
            <p className="rules-principe">{regle?.principe ?? epreuve.theme}</p>
            {regle && <ol className="rules-steps">{regle.etapes.map((etape, index) => <li key={index} style={{ ["--i" as string]: index }}>{etape}</li>)}</ol>}
            {regle && <p className="rules-bareme"><span>Barème</span>{regle.bareme}</p>}
            {epreuve.type === "blind-test" && <table className="rules-table">
              <caption>Points par morceau, selon la classe</caption>
              <thead><tr><th scope="col">Classe</th>{[1, 2, 3, 4, 5].map(n => <th key={n} scope="col">Morceau {n}</th>)}</tr></thead>
              <tbody>{CLASSES.map(level => <tr key={level}><th scope="row">{level}</th>{[0, 1, 2, 3, 4].map(n => <td key={n}>{getKillerBeePoints(level, n)}</td>)}</tr>)}</tbody>
            </table>}
          </div>
        </Reveal>;
      })}
    </div>

    <Reveal className="rules-end">
      <img src="/logo-zenkai.png" alt="" />
      <h2 aria-label="À vous de jouer"><Rise text="À vous de jouer" /></h2>
      <button className="rules-cta" onClick={onBack}>Entrer dans l'arène</button>
    </Reveal>
  </div>;
}
