
// List of reversed question numbers
export const reversedQuestions = new Set([
  1, 4, 7, 8, 10, 11, 14, 17, 18, 20, 21, 24, 27, 28, 30, 32, 33, 35, 36, 39,
  42, 43, 45, 46, 49, 52, 53, 55, 56, 59, 61, 64, 67, 68, 70, 71, 74, 77, 78, 80,
  81, 84, 87, 88, 90, 92, 93, 95, 96, 99, 102, 103, 105, 106, 109, 112, 113, 115, 116, 119,
  121, 124, 127, 128, 130, 137, 138, 140, 141, 144, 147, 148, 150, 153, 155, 156, 159, 162, 163, 166,
  169, 173, 175, 176, 181, 183, 187, 189, 190, 198, 199, 205, 206, 207, 208, 213, 219, 220, 222, 228,
  229, 231, 234, 236, 238
]);

// Map indices 0-4 to A-E
export const optionLabels = ['A', 'B', 'C', 'D', 'E'];

// Facet definitions
// Pattern: q(i), q(i+30), q(i+60)...
// i is 1-based index from 1 to 30.
export const facets = [
  // N (Neuroticism) - Facets 1-6
  { id: 'N1', name: 'Lęk', index: 1, trait: 'N', traitName: 'Neurotyczność' },
  { id: 'N2', name: 'Agresywna wrogość', index: 6, trait: 'N', traitName: 'Neurotyczność' },
  { id: 'N3', name: 'Depresyjność', index: 11, trait: 'N', traitName: 'Neurotyczność' },
  { id: 'N4', name: 'Nadmierny samokrytycyzm', index: 16, trait: 'N', traitName: 'Neurotyczność' },
  { id: 'N5', name: 'Impulsywność', index: 21, trait: 'N', traitName: 'Neurotyczność' },
  { id: 'N6', name: 'Nadwrażliwość', index: 26, trait: 'N', traitName: 'Neurotyczność' },

  // E (Extraversion) - Facets 1-6
  { id: 'E1', name: 'Serdeczność', index: 2, trait: 'E', traitName: 'Ekstrawersja' },
  { id: 'E2', name: 'Towarzyskość', index: 7, trait: 'E', traitName: 'Ekstrawersja' },
  { id: 'E3', name: 'Asertywność', index: 12, trait: 'E', traitName: 'Ekstrawersja' },
  { id: 'E4', name: 'Aktywność', index: 17, trait: 'E', traitName: 'Ekstrawersja' },
  { id: 'E5', name: 'Poszukiwanie doznań', index: 22, trait: 'E', traitName: 'Ekstrawersja' },
  { id: 'E6', name: 'Emocje pozytywne', index: 27, trait: 'E', traitName: 'Ekstrawersja' },

  // O (Openness) - Facets 1-6
  { id: 'O1', name: 'Wyobraźnia', index: 3, trait: 'O', traitName: 'Otwartość' },
  { id: 'O2', name: 'Estetyka', index: 8, trait: 'O', traitName: 'Otwartość' },
  { id: 'O3', name: 'Uczucia', index: 13, trait: 'O', traitName: 'Otwartość' },
  { id: 'O4', name: 'Działania', index: 18, trait: 'O', traitName: 'Otwartość' },
  { id: 'O5', name: 'Idee', index: 23, trait: 'O', traitName: 'Otwartość' },
  { id: 'O6', name: 'Wartości', index: 28, trait: 'O', traitName: 'Otwartość' },

  // A (Agreeableness) - Facets 1-6
  { id: 'A1', name: 'Zaufanie', index: 4, trait: 'A', traitName: 'Ugodowość' },
  { id: 'A2', name: 'Prostolinijność', index: 9, trait: 'A', traitName: 'Ugodowość' },
  { id: 'A3', name: 'Altruizm', index: 14, trait: 'A', traitName: 'Ugodowość' },
  { id: 'A4', name: 'Ustępliwość', index: 19, trait: 'A', traitName: 'Ugodowość' },
  { id: 'A5', name: 'Skromność', index: 24, trait: 'A', traitName: 'Ugodowość' },
  { id: 'A6', name: 'Skłonność do rozczulania się', index: 29, trait: 'A', traitName: 'Ugodowość' },

  // C (Conscientiousness) - Facets 1-6
  { id: 'C1', name: 'Kompetencja', index: 5, trait: 'C', traitName: 'Sumienność' },
  { id: 'C2', name: 'Skłonność do porządku', index: 10, trait: 'C', traitName: 'Sumienność' },
  { id: 'C3', name: 'Obowiązkowość', index: 15, trait: 'C', traitName: 'Sumienność' },
  { id: 'C4', name: 'Dążenie do osiągnięć', index: 20, trait: 'C', traitName: 'Sumienność' },
  { id: 'C5', name: 'Samodyscyplina', index: 25, trait: 'C', traitName: 'Sumienność' },
  { id: 'C6', name: 'Rozwaga', index: 30, trait: 'C', traitName: 'Sumienność' },
];

export function getFacetForQuestion(questionNumber: number) {
  // Questions are 1-based.
  // The facet index is determined by (questionNumber - 1) % 30 + 1
  // E.g.
  // Q1 -> (1-1)%30 + 1 = 1 -> match facet index 1 (N1)
  // Q31 -> (31-1)%30 + 1 = 1 -> match facet index 1 (N1)
  // Q2 -> (2-1)%30 + 1 = 2 -> match facet index 2 (E1)
  
  const facetIndex = ((questionNumber - 1) % 30) + 1;
  return facets.find(f => f.index === facetIndex);
}

// Map A-E to 0-4
export function calculateScore(valueIdx: number, isReversed: boolean): number {
  // valueIdx is 0 for A, 1 for B ... 4 for E
  if (isReversed) {
    return 4 - valueIdx;
  }
  return valueIdx;
}

export function optionToDisplay(valueIdx: number): string {
  return optionLabels[valueIdx];
}
