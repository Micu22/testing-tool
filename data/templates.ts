import { big5Questions } from './big5_questions';

export type Question = {
  id: string;
  text: string;
  type: 'scale' | 'choice';
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  options?: { value: number; label: string }[];
};

export type SurveyTemplate = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  scaleLegend?: { label: string; }[];
};

export const templates: SurveyTemplate[] = [
  {
    id: 'big5',
    title: 'Kwestionariusz Osobowości Big 5',
    description: 'Poniżej znajduje się lista stwierdzeń... Wybierz odpowiedź, która najlepiej Cię opisuje.',
    scaleLegend: [
      { label: 'A – Całkowicie się nie zgadzam' },
      { label: 'B – Nie zgadzam się' },
      { label: 'C – Nie mam zdania' },
      { label: 'D – Zgadzam się' },
      { label: 'E – Całkowicie się zgadzam' }
    ],
    questions: big5Questions
  },
  {
    id: 'bdi',
    title: 'Skala Depresji Becka (Symulacja)',
    description: 'Przeczytaj uważnie każdą grupę stwierdzeń. Następnie wybierz jedno stwierdzenie z każdej grupy, które najlepiej opisuje to, jak się czułeś(aś) w ciągu ostatnich dwóch tygodni, wliczając dzisiejszy dzień.',
    questions: [
      {
        id: 'bdi_1',
        text: 'Smutek',
        type: 'choice',
        options: [
          { value: 0, label: 'Nie czuję się smutny.' },
          { value: 1, label: 'Czuję się smutny przez większość czasu.' },
          { value: 2, label: 'Jestem smutny przez cały czas.' },
          { value: 3, label: 'Jestem tak smutny lub nieszczęśliwy, że nie mogę tego znieść.' },
        ]
      },
      {
        id: 'bdi_2',
        text: 'Pesymizm',
        type: 'choice',
        options: [
          { value: 0, label: 'Nie jestem zniechęcony co do swojej przyszłości.' },
          { value: 1, label: 'Czuję się bardziej zniechęcony co do swojej przyszłości niż kiedyś.' },
          { value: 2, label: 'Nie spodziewam się, żeby cokolwiek mi się udało.' },
          { value: 3, label: 'Czuję, że moja przyszłość jest beznadziejna i będzie tylko gorzej.' },
        ]
      }
    ]
  }
];
