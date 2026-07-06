export function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function isAnswerCorrect(
  userInput: string,
  answer: string,
  acceptableAnswers: string[] = []
): boolean {
  const candidates = [answer, ...acceptableAnswers].map(normalize);
  return candidates.includes(normalize(userInput));
}
