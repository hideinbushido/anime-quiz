import type { Epreuve } from "../types";

export const epreuves: Epreuve[] = [
  {
    id: "blind-test-openings",
    nom: "Les Beats de Killer Bee",
    logo: "🎧",
    couleur: "#3b82f6",
    theme: "Instrumentales d'openings d'animes cultes",
    type: "blind-test",
    questions: [
      {
        id: "bt-1",
        prompt: "Écoute l'instrumental et trouve le nom de l'anime.",
        audioSrc: "/Beats%20killer%20Bee/1ere%20manche.MP3",
        answer: "One Piece",
      },
      {
        id: "bt-2",
        prompt: "Écoute l'instrumental et trouve le nom de l'anime.",
        audioSrc: "/Beats%20killer%20Bee/2e%20manche.MP3",
        answer: "Naruto",
      },
      {
        id: "bt-3",
        prompt: "Écoute l'instrumental et trouve le nom de l'anime.",
        audioSrc: "/Beats%20killer%20Bee/3e%20Manche.MP3",
        answer: "Attack on Titan",
        acceptableAnswers: ["L'Attaque des Titans", "Shingeki no Kyojin"],
      },
      {
        id: "bt-4",
        prompt: "Écoute l'instrumental et trouve le nom de l'anime.",
        audioSrc: "/Beats%20killer%20Bee/4e%20manche.MP3",
        answer: "Demon Slayer",
        acceptableAnswers: ["Kimetsu no Yaiba"],
      },
      {
        id: "bt-5",
        prompt: "Écoute l'instrumental et trouve le nom de l'anime.",
        audioSrc: "/Beats%20killer%20Bee/5e%20manche.MP3",
        answer: "Jujutsu Kaisen",
      },
      {
        id: "bt-6",
        prompt: "Écoute l'instrumental et trouve le nom de l'anime.",
        audioSrc: "/Beats%20killer%20Bee/6e%20manche.MP3",
        answer: "À compléter",
      },
      {
        id: "bt-7",
        prompt: "Écoute l'instrumental et trouve le nom de l'anime.",
        audioSrc: "/Beats%20killer%20Bee/7e%20manche.MP3",
        answer: "À compléter",
      },
    ],
  },
  {
    id: "citations-cultes",
    nom: "Répliques Cultes",
    logo: "💬",
    couleur: "#f59e0b",
    theme: "Répliques célèbres de personnages d'anime",
    type: "citation",
    questions: [
      {
        id: "cit-1",
        prompt: '"Je deviendrai le Roi des Pirates !"',
        answer: "Luffy",
        acceptableAnswers: ["Monkey D. Luffy"],
      },
      {
        id: "cit-2",
        prompt: '"Plus Ultra !"',
        answer: "All Might",
      },
      {
        id: "cit-3",
        prompt: '"Je deviendrai Hokage, crois-le !"',
        answer: "Naruto",
        acceptableAnswers: ["Naruto Uzumaki"],
      },
      {
        id: "cit-4",
        prompt: '"Je suis Justice."',
        answer: "Light Yagami",
        acceptableAnswers: ["Light", "Kira"],
      },
      {
        id: "cit-5",
        prompt:
          '"Si je gagne, je vis. Si je perds, je meurs. Si je ne me bats pas, je ne peux pas gagner."',
        answer: "Eren Yeager",
        acceptableAnswers: ["Eren"],
      },
    ],
  },
];
