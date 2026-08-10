import { QuestionPaperData, Question } from '../types';

export const CCSEIVGT_2025_PAPER: QuestionPaperData = {
  title_en: "CCSEIVGT 2025 Question Paper",
  title_ta: "CCSEIVGT 2025 வினாத்தாள்",
  questions: [
    {
      id: "Q1",
      type: "mcq",
      question_en: "What does the Sun provide?",
      question_ta: "சூரியன் எதை வழங்குகிறது?",
      options_en: [
        "Rain",
        "Light and Heat",
        "Wind",
        "Clouds"
      ],
      options_ta: [
        "மழை",
        "ஒளி மற்றும் வெப்பம்",
        "காற்று",
        "மேகங்கள்"
      ],
      correctOptionIndex: 1,
      correctAnswer_en: "Light and Heat",
      correctAnswer_ta: "ஒளி மற்றும் வெப்பம்",
      marks: 1,
      negativeMarks: 0,
      difficulty: "Easy",
      year: "2025",
      topic: "General Science"
    },
    {
      id: "Q2",
      type: "match",
      question_en: "Match the following",
      question_ta: "பொருத்துக",
      displayMode: "interactive",
      interactionType: "dropdown",
      leftItems: [
        {
          id: "A",
          text_en: "CPU",
          text_ta: "மத்திய செயலி"
        },
        {
          id: "B",
          text_en: "RAM",
          text_ta: "ரேம்"
        },
        {
          id: "C",
          text_en: "ROM",
          text_ta: "ரோம்"
        },
        {
          id: "D",
          text_en: "Hard Disk",
          text_ta: "கடின வட்டு"
        }
      ],
      rightItems: [
        {
          id: "1",
          text_en: "Permanent Memory",
          text_ta: "நிலையான நினைவகம்"
        },
        {
          id: "2",
          text_en: "Temporary Memory",
          text_ta: "தற்காலிக நினைவகம்"
        },
        {
          id: "3",
          text_en: "Processing Unit",
          text_ta: "செயலாக்க அலகு"
        },
        {
          id: "4",
          text_en: "Storage Device",
          text_ta: "சேமிப்பு சாதனம்"
        }
      ],
      correctAnswer: {
        "A": "3",
        "B": "2",
        "C": "1",
        "D": "4"
      },
      marks: 2,
      negativeMarks: 0,
      difficulty: "Moderate",
      year: "2025",
      topic: "Computer Science"
    },
    {
      id: "Q3",
      type: "passage",
      title_en: "Reading Comprehension",
      title_ta: "படித்துப் புரிதல்",
      layout: "split",
      stickyPassage: true,
      passage_en: "The Sun is the nearest star to the Earth. It provides light and heat that make life possible on our planet.",
      passage_ta: "சூரியன் பூமிக்கு மிக அருகிலுள்ள நட்சத்திரமாகும். அது ஒளி மற்றும் வெப்பத்தை வழங்கி பூமியில் உயிர்கள் வாழ உதவுகிறது.",
      topic: "General Science",
      questions: [
        {
          id: "Q3Q1",
          type: "mcq",
          question_en: "What is the nearest star to the Earth?",
          question_ta: "பூமிக்கு மிக அருகிலுள்ள நட்சத்திரம் எது?",
          options_en: [
            "Moon",
            "Sun",
            "Mars",
            "Venus"
          ],
          options_ta: [
            "சந்திரன்",
            "சூரியன்",
            "செவ்வாய்",
            "வெள்ளி"
          ],
          correctOptionIndex: 1,
          correctAnswer_en: "Sun",
          correctAnswer_ta: "சூரியன்",
          marks: 1,
          negativeMarks: 0,
          difficulty: "Easy",
          year: "2025",
          topic: "General Science"
        }
      ]
    }
  ]
};

export const DEFAULT_QUESTIONS: Question[] = [
  ...CCSEIVGT_2025_PAPER.questions,
  {
    id: 'Q4',
    type: 'mcq',
    question_en: 'Which planet in our solar system is known as the Red Planet due to iron oxide on its surface?',
    question_ta: 'அதன் மேற்பரப்பில் உள்ள இரும்பு ஆக்சைடு காரணமாக நமது சூரிய மண்டலத்தில் சிவப்பு கிரகம் என்று அழைக்கப்படும் கிரகம் எது?',
    options_en: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    options_ta: ['வெள்ளி', 'செவ்வாய்', 'வியாழன்', 'சனி'],
    correctOptionIndex: 1,
    correctAnswer_en: 'Mars',
    correctAnswer_ta: 'செவ்வாய்',
    marks: 1,
    negativeMarks: 0,
    difficulty: 'Easy',
    year: '2025',
    topic: 'Space Science'
  },
  {
    id: 'Q5',
    type: 'mcq',
    question_en: 'The Thirukkural, an ancient Tamil treatise on ethics and morality, was written by which famous poet?',
    question_ta: 'அறநெறி மற்றும் ஒழுக்கம் பற்றிய பண்டைய தமிழ் நூலான திருக்குறளை எழுதிய புகழ்பெற்ற புலவர் யார்?',
    options_en: ['Kambar', 'Thiruvalluvar', 'Ilango Adigal', 'Avvaiyar'],
    options_ta: ['கம்பர்', 'திருவள்ளுவர்', 'இளங்கோ அடிகள்', 'அவ்வையார்'],
    correctOptionIndex: 1,
    correctAnswer_en: 'Thiruvalluvar',
    correctAnswer_ta: 'திருவள்ளுவர்',
    marks: 1,
    negativeMarks: 0,
    difficulty: 'Easy',
    year: '2025',
    topic: 'Tamil Literature'
  }
];
