import { useEffect, useRef } from "react";
import type { Epreuve, GameControls } from "../types";
import { currentFeedback } from "../duel/engine";
import { isAnswerCorrect } from "../utils";
import { KillerBeePlayer } from "./KillerBeePlayer";
import { LogicLinksPlayer } from "./LogicLinksPlayer";
import { EpreuveLogo } from "./EpreuveLogo";

const POINTS_PAR_BONNE_REPONSE = 100;
interface Props extends GameControls {
  epreuve: Epreuve;
}

export function EpreuvePlayer(props: Props) {
  if (props.epreuve.id === "blind-test-openings") return <KillerBeePlayer {...props} />;
  if (props.epreuve.type === "logic-links") return <LogicLinksPlayer {...props} />;
  if (!props.epreuve.questions.length) return <p className="duel-notice">Cette épreuve ne contient pas encore de questions.</p>;
  return <QuestionPlayer {...props} />;
}

function QuestionPlayer({ epreuve, progress, onEdit, onValidate, onNext }: Props) {
  const questionIndex = progress.roundIndex;
  const input = progress.input;
  const roundResult = currentFeedback(progress);
  const feedback = roundResult ? (roundResult.correct ? "correct" : "incorrect") : "none";
  const points = progress.rounds.reduce((sum, round) => sum + round.points, 0);
  const question = epreuve.questions[questionIndex];
  const isLastQuestion = questionIndex === epreuve.questions.length - 1;
  const answerField = useRef<HTMLInputElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);

  // Keep the keyboard on the next expected action: typing, then moving on.
  useEffect(() => {
    if (feedback === "none") answerField.current?.focus({ preventScroll: true });
    else nextButton.current?.focus({ preventScroll: true });
  }, [questionIndex, feedback, progress.respondent]);

  function handleSubmit() {
    if (feedback !== "none") return;
    const correct = isAnswerCorrect(
      input,
      question.answer,
      question.acceptableAnswers
    );
    onValidate({ roundId: question.id, correct, points: correct ? POINTS_PAR_BONNE_REPONSE : 0, answer: [input] });
  }

  function handleNext() {
    if (roundResult) onNext();
  }

  return (
    <div className="screen quote-session">
      <header className="header">
        <div className="zk-quote-logo"><EpreuveLogo epreuveId={epreuve.id} /></div>
        <div>
          <p className="eyebrow">{epreuve.nom}</p>
          <h1>
            Manche {questionIndex + 1}/{epreuve.questions.length}
          </h1>
        </div>
        <ol className="quote-steps" aria-label="Progression des manches">
          {epreuve.questions.map((item, index) => {
            const round = progress.rounds[index];
            const status = round ? (round.correct ? "réussie" : "manquée") : index === questionIndex ? "en cours" : "à venir";
            return <li key={item.id} aria-label={`Manche ${index + 1} : ${status}`} aria-current={index === questionIndex ? "step" : undefined}
              className={"quote-step" + (index === questionIndex ? " quote-step-current" : "") + (round ? (round.correct ? " quote-step-correct" : " quote-step-wrong") : "")}>
              <span aria-hidden="true">{index + 1}</span>
            </li>;
          })}
        </ol>
        <div className="score-box">
          <span className="score-label">POINTS ATTRIBUÉS</span>
          <span className="score-value">{points}</span>
        </div>
      </header>

      <div className="question-card">
        {question.audioSrc && (
          <audio controls preload="auto" src={question.audioSrc} className="audio-player">
            Ton navigateur ne supporte pas la lecture audio.
          </audio>
        )}
        <p className="question-prompt">{question.prompt}</p>

        <div className="answer-field">
          <label htmlFor="answer-input">{epreuve.type === "citation" ? "Qui a prononcé cette réplique ?" : "Ta réponse"}</label>
          <input
            id="answer-input"
            ref={answerField}
            className="answer-input"
            type="text"
            value={input}
            placeholder="Nom du personnage"
            autoComplete="off"
            spellCheck={false}
            disabled={feedback !== "none"}
            aria-describedby="answer-hint"
            onChange={(e) => onEdit({ input: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (feedback === "none") {
                  handleSubmit();
                } else {
                  handleNext();
                }
              }
            }}
          />
          <p id="answer-hint" className="answer-hint">{feedback === "none" ? "Touche Entrée pour valider." : "Réponse enregistrée."}</p>
        </div>

        {feedback === "none" && (
          <button className="btn-primary" onClick={handleSubmit}>
            Valider
          </button>
        )}

        {feedback !== "none" && (
          <div className={"feedback feedback-" + feedback} role="status">
            {feedback === "correct" ? (
              <p>Bonne réponse !</p>
            ) : (
              <p>Réponse attendue : {question.answer}</p>
            )}
            <button ref={nextButton} className="btn-primary" onClick={handleNext}>
              {isLastQuestion ? "Terminer l'épreuve" : "Manche suivante"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
