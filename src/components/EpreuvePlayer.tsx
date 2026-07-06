import { useState } from "react";
import type { Epreuve, EpreuveResult } from "../types";
import { isAnswerCorrect } from "../utils";

const POINTS_PAR_BONNE_REPONSE = 100;

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

  return (
    <div className="screen">
      <header className="header">
        <div>
          <p className="eyebrow">{epreuve.nom}</p>
          <h1>
            Question {questionIndex + 1}/{epreuve.questions.length}
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
              feedback === "none" ? handleSubmit() : handleNext();
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
              <p>✅ Bonne réponse !</p>
            ) : (
              <p>❌ Réponse attendue : {question.answer}</p>
            )}
            <button className="btn-primary" onClick={handleNext}>
              {isLastQuestion ? "Terminer l'épreuve" : "Question suivante"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
