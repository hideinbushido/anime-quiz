import type { LogicLinksPuzzle } from "../types";
import { narutoIds, pickNarutoCharacters } from "./narutoCharacters";

export const ayanokojiPuzzles: LogicLinksPuzzle[] = [
  {
    id: "ayanokoji-naruto-1",
    title: "Equipe 7 et ombres Uchiwa",
    intro: "Une chaine d'eleves, de rivaux et de legendes de Konoha.",
    solutionIds: narutoIds([4, 1, 2, 54, 56, 57]),
    rules: [
      { id: "n1-r1", text: "Gauche est un mentor de Konoha, droite a ete son eleve." },
      { id: "n1-r2", text: "Les deux ont fait partie de l'equipe 7." },
      { id: "n1-r3", text: "Les deux partagent le clan Uchiwa." },
      { id: "n1-r4", text: "Les deux sont des Uchiwa lies au Mangekyo/legendes du clan." },
      { id: "n1-r5", text: "Les deux sont des rivaux fondateurs de l'histoire ninja." },
    ],
    characters: pickNarutoCharacters([4, 1, 2, 54, 56, 57]),
  },
  {
    id: "ayanokoji-naruto-2",
    title: "Sable, marionnettes et explosions",
    intro: "De Suna a l'Akatsuki, suis les liens d'affiliation et de technique.",
    solutionIds: narutoIds([75, 76, 77, 136, 135, 122]),
    rules: [
      { id: "n2-r1", text: "Les deux appartiennent a la fratrie de Suna." },
      { id: "n2-r2", text: "Les deux appartiennent a la fratrie de Suna." },
      { id: "n2-r3", text: "Les deux sont lies aux marionnettes de Suna." },
      { id: "n2-r4", text: "Les deux ont appartenu a l'Akatsuki." },
      { id: "n2-r5", text: "Les deux viennent du village d'Iwa." },
    ],
    characters: pickNarutoCharacters([75, 76, 77, 136, 135, 122]),
  },
  {
    id: "ayanokoji-naruto-3",
    title: "Dossier Akatsuki",
    intro: "Une chaine sur Ame, les fondateurs et les binomes criminels.",
    solutionIds: narutoIds([130, 132, 131, 133, 137, 138]),
    rules: [
      { id: "n3-r1", text: "Les deux viennent d'Ame et de l'Akatsuki." },
      { id: "n3-r2", text: "Les deux sont lies aux fondateurs de l'Akatsuki." },
      { id: "n3-r3", text: "Droite est directement lie au corps de gauche." },
      { id: "n3-r4", text: "Les deux ont appartenu a l'Akatsuki." },
      { id: "n3-r5", text: "Les deux forment un binome officiel de l'Akatsuki." },
    ],
    characters: pickNarutoCharacters([130, 132, 131, 133, 137, 138]),
  },
  {
    id: "ayanokoji-naruto-4",
    title: "Dojutsu sous surveillance",
    intro: "Byakugan, Sharingan et figures Uchiwa dans une chaine de regard.",
    solutionIds: narutoIds([29, 30, 2, 53, 54, 48]),
    rules: [
      { id: "n4-r1", text: "Les deux partagent le clan Hyuga et le Byakugan." },
      { id: "n4-r2", text: "Les deux possedent un dojutsu majeur." },
      { id: "n4-r3", text: "Les deux partagent le clan Uchiwa." },
      { id: "n4-r4", text: "Les deux sont des prodiges Uchiwa lies au genjutsu." },
      { id: "n4-r5", text: "Les deux sont des Uchiwa ayant appartenu a l'Akatsuki." },
    ],
    characters: pickNarutoCharacters([29, 30, 2, 53, 54, 48]),
  },
  {
    id: "ayanokoji-naruto-5",
    title: "Jinchuriki chain",
    intro: "La derniere chaine suit les hotes de biju et les Kage marques par eux.",
    solutionIds: narutoIds([47, 1, 75, 93, 108, 127]),
    rules: [
      { id: "n5-r1", text: "Les deux sont des Uzumaki lies a Kyubi." },
      { id: "n5-r2", text: "Les deux sont des jinchuriki devenus figures majeures de leur village." },
      { id: "n5-r3", text: "Les deux sont a la fois Kage et jinchuriki." },
      { id: "n5-r4", text: "Les deux sont des jinchuriki hors de Konoha." },
      { id: "n5-r5", text: "Les deux maitrisent un biju et viennent de grands villages ninja." },
    ],
    characters: pickNarutoCharacters([47, 1, 75, 93, 108, 127]),
  },
];
