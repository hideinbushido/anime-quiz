import { useEffect, useRef, useState } from "react";
import type { Epreuve, EpreuveResult } from "../types";
import { isAnswerCorrect } from "../utils";
import { EpreuveLogoDisplay } from "./EpreuveLogoDisplay";
import { LogicLinksPlayer } from "./LogicLinksPlayer";

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
  const questionAudioRef = useRef<HTMLAudioElement>(null);
  const revealAudioRef = useRef<HTMLAudioElement>(null);

  const question = epreuve.questions[questionIndex];
  const nextQuestion = epreuve.questions[questionIndex + 1];
  const isLastQuestion = questionIndex === epreuve.questions.length - 1;
  const isBeats = epreuve.id === "blind-test-openings";

  useEffect(() => {
    if (!isBeats) return;

    const assets = [
      { href: question.audioSrc, as: "audio", type: "audio/mpeg" },
      { href: question.revealAudioSrc, as: "audio", type: "audio/mpeg" },
      { href: question.imageSrc, as: "image", type: "" },
      { href: nextQuestion?.audioSrc, as: "audio", type: "audio/mpeg" },
      { href: nextQuestion?.revealAudioSrc, as: "audio", type: "audio/mpeg" },
      { href: nextQuestion?.imageSrc, as: "image", type: "" },
    ].filter((asset): asset is { href: string; as: string; type: string } =>
      Boolean(asset.href)
    );

    const links = assets.map((asset) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = asset.as;
      link.href = asset.href;
      if (asset.type) link.type = asset.type;
      document.head.appendChild(link);
      return link;
    });

    return () => links.forEach((link) => link.remove());
  }, [
    isBeats,
    question.audioSrc,
    question.imageSrc,
    question.revealAudioSrc,
    nextQuestion?.audioSrc,
    nextQuestion?.imageSrc,
    nextQuestion?.revealAudioSrc,
  ]);

  useEffect(() => {
    if (!isBeats || feedback === "none") return;

    questionAudioRef.current?.pause();
    const revealAudio = revealAudioRef.current;
    if (!revealAudio) return;

    revealAudio.currentTime = 0;
    revealAudio.play().catch(() => undefined);
  }, [feedback, isBeats, question.id]);

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

  if (epreuve.type === "logic-links") {
    return <LogicLinksPlayer epreuve={epreuve} onComplete={onComplete} />;
  }

  if (isBeats) {
    const revealed = feedback !== "none";

    return (
      <div className="screen beats-session">
        <div className="beats-ambient" aria-hidden>
          <span className="beats-ambient-ring beats-ambient-ring-one" />
          <span className="beats-ambient-ring beats-ambient-ring-two" />
        </div>

        <header className="beats-header">
          <div>
            <p className="beats-kicker">Blind test instrumental</p>
            <div className="beats-header-logo">
              <EpreuveLogoDisplay epreuveId={epreuve.id} />
            </div>
          </div>
          <div className="beats-score">
            <span>Score</span>
            <strong>{points}</strong>
          </div>
        </header>

        <main className={"beats-stage" + (revealed ? " beats-stage-revealed" : "")}>
          <section
            className={
              "beats-player-card" + (revealed ? " beats-player-card-revealed" : "")
            }
          >
            {!revealed ? (
              <>
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
                  <audio
                    ref={questionAudioRef}
                    controls
                    preload="auto"
                    src={question.audioSrc}
                    className="beats-audio"
                  >
                    Ton navigateur ne supporte pas la lecture audio.
                  </audio>
                )}

                <p className="beats-prompt">{question.prompt}</p>

                <div className="beats-answer-row beats-answer-judge">
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
                </div>
              </>
            ) : (
              <div className={"beats-reveal-scene beats-feedback-" + feedback}>
                <div className="beats-reveal-media">
                  {question.imageSrc ? (
                    <img
                      src={question.imageSrc}
                      alt={question.answer}
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <div className="beats-reveal-placeholder">
                      <span>Image anime</span>
                    </div>
                  )}
                </div>

                <div className="beats-reveal-info">
                  <span>Réponse</span>
                  <strong>{question.answer}</strong>
                  <p>
                    {feedback === "correct"
                      ? "Bonne réponse, on lance la version avec paroles."
                      : "Mauvaise réponse, on révèle le morceau."}
                  </p>

                  {question.revealAudioSrc ? (
                    <div className="beats-reveal-audio-panel">
                      <div>
                        <span>Version avec paroles</span>
                        <strong>Lecture de la reponse</strong>
                      </div>
                      <audio
                        ref={revealAudioRef}
                        controls
                        preload="auto"
                        src={question.revealAudioSrc}
                        className="beats-reveal-audio"
                      >
                        Ton navigateur ne supporte pas la lecture audio.
                      </audio>
                    </div>
                  ) : (
                    <div className="beats-reveal-audio-missing">
                      Musique avec paroles à ajouter
                    </div>
                  )}

                  <button className="beats-submit" onClick={handleNext}>
                    {isLastQuestion ? "Terminer l'épreuve" : "Manche suivante"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {!revealed && (
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
          )}
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
          <audio controls preload="auto" src={question.audioSrc} className="audio-player">
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
