import { TitleReadyScene } from "../TitleReadyScene";

export function DuelVsStage() {
  return <div className="arena-vs-stage" aria-label="Versus">
    <div className="arena-vs-orbit" aria-hidden="true" />
    <div className="arena-vs-scene" aria-hidden="true"><TitleReadyScene electric /></div>
    <div className="arena-vs-word" aria-hidden="true">VS</div>
    <span className="arena-vs-caption" aria-hidden="true">FACE À FACE</span>
    <div className="arena-energy-line" aria-hidden="true" />
  </div>;
}
