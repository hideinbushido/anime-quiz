import { useState } from "react";
import type { Epreuve, EpreuveResult } from "../types";
import { isAnswerCorrect } from "../utils";

const POINTS_PAR_BONNE_REPONSE = 100;
const MANCHE_LABELS = [
  "Warm-up",
  "Groove",
  "Flow",
  "Chorus",
  "Final Mix",
  "Encore",
  "Boss Track",
];

interface Props {
  epreuve: Epreuve;
  onComplete: (result: EpreuveResult) => void;
}

type Feedback = "none" | "correct" | "incorrect";

export function EpreuvePlayer({ epreuve, onComplete }: Props) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [points, setPoints] = useState(0);

  const question = epreuve.questions[questionIndex];
  const isLastQuestion = questionIndex === epreuve.questions.length - 1;
  const isBeats = epreuve.id === "blind-test-openings";

  function handleSubmit() {
    if (feedback !== "none") return;
    const correct = isAnswerCorrect(
      input,
      question.answer,
      question.acceptableAnswers
    );
    setFeedback(correct ? "correct" : "incorrect");
    if (correct) setPoints((p) => p + POINTS_PAR_BONNE_REPONSE);
  }

  function handleManualResult(correct: boolean) {
    if (feedback !== "none") return;
    setFeedback(correct ? "correct" : "incorrect");
    if (correct) setPoints((p) => p + POINTS_PAR_BONNE_REPONSE);
  }

  function handleNext() {
    if (isLastQuestion) {
      onComplete({
        epreuveId: epreuve.id,
        points,
        bonusIndiceUtilise: false,
        bonusDoubleUtilise: false,
      });
      return;
    }
    setQuestionIndex((i) => i + 1);
    setInput("");
    setFeedback("none");
  }

  if (isBeats) {
    return (
      <div className="screen beats-session">
        <div className="beats-ambient" aria-hidden>
          <span className="beats-ambient-ring beats-ambient-ring-one" />
          <span className="beats-ambient-ring beats-ambient-ring-two" />
        </div>

        <header className="beats-header">
          <div>
            <p className="beats-kicker">Blind test instrumental</p>
            <h1>Les Beats de Killer Bee</h1>
          </div>
          <div className="beats-score">
            <span>Score</span>
            <strong>{points}</strong>
          </div>
        </header>

        <main className="beats-stage">
          <section className="beats-player-card">
            <div className="beats-now-playing">
              <span>Manche {questionIndex + 1}</span>
              <strong>{MANCHE_LABELS[questionIndex] ?? "Mix"}</strong>
            </div>

            <div className="beats-turntable" aria-hidden>
              <div className="beats-vinyl">
                <span />
              </div>
              <div className="beats-arm" />
            </div>

            {question.audioSrc && (
              <audio controls src={question.audioSrc} className="beats-audio">
                Ton navigateur ne supporte pas la lecture audio.
              </audio>
            )}

            <p className="beats-prompt">{question.prompt}</p>

            <div className="beats-answer-row beats-answer-judge">
              {feedback === "none" && (
                <>
                  <button
                    className="beats-judge beats-judge-correct"
                    onClick={() => handleManualResult(true)}
                  >
                    V
                  </button>
                  <button
                    className="beats-judge beats-judge-incorrect"
                    onClick={() => handleManualResult(false)}
                  >
                    X
                  </button>
                </>
              )}
            </div>

            {feedback !== "none" && (
              <div className={"beats-feedback beats-feedback-" + feedback}>
                {feedback === "correct" ? (
                  <p>Bonne réponse, le son est validé.</p>
                ) : (
                  <p>Réponse attendue : {question.answer}</p>
                )}
                {(question.imageSrc || question.revealAudioSrc) && (
                  <div className="beats-reveal">
                    {question.imageSrc && (
                      <img src={question.imageSrc} alt={question.answer} />
                    )}
                    {question.revealAudioSrc && (
                      <audio controls src={question.revealAudioSrc}>
                        Ton navigateur ne supporte pas la lecture audio.
                      </audio>
                    )}
                  </div>
                )}
                <button className="beats-submit" onClick={handleNext}>
                  {isLastQuestion ? "Terminer l'épreuve" : "Manche suivante"}
                </button>
              </div>
            )}
          </section>

          <aside className="beats-mixer" aria-hidden>
            <div className="beats-meter">
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.06}s` }} />
              ))}
            </div>
            <div className="beats-faders">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i}>
                  <i style={{ top: `${22 + i * 14}%` }} />
                </span>
              ))}
            </div>
          </aside>
        </main>

        <nav className="beats-rounds" aria-label="Progression des manches">
          {epreuve.questions.map((round, index) => (
            <span
              key={round.id}
              className={
                "beats-round" +
                (index === questionIndex ? " beats-round-current" : "") +
                (index < questionIndex ? " beats-round-done" : "")
              }
            >
              <strong>{index + 1}</strong>
              <em>{MANCHE_LABELS[index] ?? `Manche ${index + 1}`}</em>
            </span>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="header">
        <div>
          <p className="eyebrow">{epreuve.nom}</p>
          <h1>
            Manche {questionIndex + 1}/{epreuve.questions.length}
          </h1>
        </div>
        <div className="score-box">
          <span className="score-label">POINTS</span>
          <span className="score-value">{points}</span>
        </div>
      </header>

      <div className="question-card">
        {question.audioSrc && (
          <audio controls src={question.audioSrc} className="audio-player">
            Ton navigateur ne supporte pas la lecture audio.
          </audio>
        )}
        <p className="question-prompt">{question.prompt}</p>

        <input
          className="answer-input"
          type="text"
          value={input}
          placeholder="Ta réponse..."
          disabled={feedback !== "none"}
          onChange={(e) => setInput(e.target.value)}
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

        {feedback === "none" && (
          <button className="btn-primary" onClick={handleSubmit}>
            Valider
          </button>
        )}

        {feedback !== "none" && (
          <div className={"feedback feedback-" + feedback}>
            {feedback === "correct" ? (
              <p>Bonne réponse !</p>
            ) : (
              <p>Réponse attendue : {question.answer}</p>
            )}
            <button className="btn-primary" onClick={handleNext}>
              {isLastQuestion ? "Terminer l'épreuve" : "Manche suivante"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
