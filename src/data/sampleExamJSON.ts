/**
 * Standard Multi-Type Question JSON Specification & Sample Dataset
 * Supports:
 * 1. Normal MCQ (mcq)
 * 2. Match the Following (match_following)
 * 3. Passage / Paragraph + MCQ (passage_mcq)
 * 4. True / False (true_false)
 * 5. Fill in the Blank (fill_blank)
 * 6. Statement-Based Question (statement_based)
 * 7. Assertion & Reason (assertion_reason)
 */

export interface SampleQuestionFormat {
  id: number | string;
  questionType: 'mcq' | 'match_following' | 'passage_mcq' | 'true_false' | 'fill_blank' | 'statement_based' | 'assertion_reason';
  [key: string]: any;
}

export const SAMPLE_EXAM_JSON: SampleQuestionFormat[] = [
  {
    "id": 1,
    "questionType": "mcq",
    "questionText": "What is the capital of Tamil Nadu?",
    "questionTamilText": "தமிழ்நாட்டின் தலைநகரம் எது?",
    "options": [
      "Madurai",
      "Chennai",
      "Coimbatore",
      "Salem"
    ],
    "tamilOptions": [
      "மதுரை",
      "சென்னை",
      "கோயம்புத்தூர்",
      "சேலம்"
    ],
    "correctOptionIndex": 1,
    "explanation": "Chennai is the capital of Tamil Nadu.",
    "tamilExplanation": "சென்னை தமிழ்நாட்டின் தலைநகரமாகும்.",
    "marks": 1,
    "negativeMarks": 0.0
  },
  {
    "id": 2,
    "questionType": "match_following",
    "questionText": "Match the following:",
    "questionTamilText": "பின்வருவனவற்றைப் பொருத்துக:",
    "leftColumn": [
      {
        "id": "A",
        "text": "Thiruvalluvar",
        "tamilText": "திருவள்ளுவர்"
      },
      {
        "id": "B",
        "text": "Ilango Adigal",
        "tamilText": "இளங்கோ அடிகள்"
      },
      {
        "id": "C",
        "text": "Kambar",
        "tamilText": "கம்பர்"
      },
      {
        "id": "D",
        "text": "Avvaiyar",
        "tamilText": "ஔவையார்"
      }
    ],
    "rightColumn": [
      {
        "id": "1",
        "text": "Silappathikaram",
        "tamilText": "சிலப்பதிகாரம்"
      },
      {
        "id": "2",
        "text": "Thirukkural",
        "tamilText": "திருக்குறள்"
      },
      {
        "id": "3",
        "text": "Kamba Ramayanam",
        "tamilText": "கம்பராமாயணம்"
      },
      {
        "id": "4",
        "text": "Aathichudi",
        "tamilText": "ஆத்திசூடி"
      }
    ],
    "correctMatches": {
      "A": "2",
      "B": "1",
      "C": "3",
      "D": "4"
    },
    "explanation": "Thiruvalluvar wrote Thirukkural, Ilango Adigal wrote Silappathikaram, Kambar wrote Kamba Ramayanam, and Avvaiyar wrote Aathichudi.",
    "tamilExplanation": "திருவள்ளுவர் திருக்குறளை இயற்றினார், இளங்கோ அடிகள் சிலப்பதிகாரத்தை இயற்றினார், கம்பர் கம்பராமாயணத்தை இயற்றினார், ஔவையார் ஆத்திசூடியை இயற்றினார்.",
    "marks": 1,
    "negativeMarks": 0.0
  },
  {
    "id": 3,
    "questionType": "passage_mcq",
    "passage": "Tamil Nadu has a rich cultural heritage. Its temples, literature, classical dance and music are important parts of its cultural identity.",
    "passageTamilText": "தமிழ்நாடு வளமான கலாச்சாரப் பாரம்பரியத்தைக் கொண்டுள்ளது. அதன் கோயில்கள், இலக்கியம், பாரம்பரிய நடனம் மற்றும் இசை ஆகியவை அதன் கலாச்சார அடையாளத்தின் முக்கிய பகுதிகளாகும்.",
    "questionText": "Which of the following is mentioned as part of Tamil Nadu's cultural identity?",
    "questionTamilText": "பின்வருவனவற்றில் எது தமிழ்நாட்டின் கலாச்சார அடையாளத்தின் ஒரு பகுதியாக குறிப்பிடப்பட்டுள்ளது?",
    "options": [
      "Classical dance",
      "Ice hockey",
      "Skiing",
      "Baseball"
    ],
    "tamilOptions": [
      "பாரம்பரிய நடனம்",
      "ஐஸ் ஹாக்கி",
      "பனிச்சறுக்கு",
      "பேஸ்பால்"
    ],
    "correctOptionIndex": 0,
    "explanation": "Classical dance is mentioned as part of Tamil Nadu's cultural identity.",
    "tamilExplanation": "பாரம்பரிய நடனம் தமிழ்நாட்டின் கலாச்சார அடையாளத்தின் ஒரு பகுதியாக குறிப்பிடப்பட்டுள்ளது.",
    "marks": 1,
    "negativeMarks": 0.0
  },
  {
    "id": 4,
    "questionType": "true_false",
    "questionText": "The Indian Constitution came into force on 26 January 1950.",
    "questionTamilText": "இந்திய அரசியலமைப்பு 26 ஜனவரி 1950 அன்று நடைமுறைக்கு வந்தது.",
    "options": [
      "True",
      "False"
    ],
    "tamilOptions": [
      "சரி",
      "தவறு"
    ],
    "correctOptionIndex": 0,
    "explanation": "The Constitution of India came into force on 26 January 1950.",
    "tamilExplanation": "இந்திய அரசியலமைப்பு 26 ஜனவரி 1950 அன்று நடைமுறைக்கு வந்தது.",
    "marks": 1,
    "negativeMarks": 0.0
  },
  {
    "id": 5,
    "questionType": "fill_blank",
    "questionText": "The capital of India is ______.",
    "questionTamilText": "இந்தியாவின் தலைநகரம் ______ ஆகும்.",
    "options": [
      "Mumbai",
      "New Delhi",
      "Kolkata",
      "Chennai"
    ],
    "tamilOptions": [
      "மும்பை",
      "புது டெல்லி",
      "கொல்கத்தா",
      "சென்னை"
    ],
    "correctOptionIndex": 1,
    "explanation": "New Delhi is the capital of India.",
    "tamilExplanation": "புது டெல்லி இந்தியாவின் தலைநகரமாகும்.",
    "marks": 1,
    "negativeMarks": 0.0
  },
  {
    "id": 6,
    "questionType": "statement_based",
    "statements": [
      "1. The President of India is the constitutional head.",
      "2. The Prime Minister is the constitutional head."
    ],
    "tamilStatements": [
      "1. இந்தியாவின் குடியரசுத் தலைவர் அரசியலமைப்புச் சட்டத் தலைவராவார்.",
      "2. பிரதமர் அரசியலமைப்புச் சட்டத் தலைவராவார்."
    ],
    "questionText": "Which of the above statements is correct?",
    "questionTamilText": "மேற்கண்ட கூற்றுகளில் எது சரியானது?",
    "options": [
      "1 only",
      "2 only",
      "Both 1 and 2",
      "Neither 1 nor 2"
    ],
    "tamilOptions": [
      "1 மட்டும்",
      "2 மட்டும்",
      "1 மற்றும் 2 இரண்டும்",
      "1 அல்லது 2 இரண்டும் இல்லை"
    ],
    "correctOptionIndex": 0,
    "explanation": "The President is the constitutional head of India.",
    "tamilExplanation": "இந்தியாவின் அரசியலமைப்புச் சட்டத் தலைவர் குடியரசுத் தலைவர் ஆவார்.",
    "marks": 1,
    "negativeMarks": 0.0
  },
  {
    "id": 7,
    "questionType": "assertion_reason",
    "assertion": "The letters அ, இ, உ are demonstrative letters in Tamil grammar.",
    "assertionTamilText": "அ, இ, உ என்பன சுட்டெழுத்துகளாக வந்து பிறவற்றைச் சுட்டுகின்றன.",
    "reason": "Letters that are used to point out something are called demonstrative letters.",
    "reasonTamilText": "ஒன்றைச் சுட்டிக் காட்ட வரும் எழுத்துகளுக்குச் சுட்டு எழுத்துகள் என்று பெயர்.",
    "options": [
      "Both Assertion and Reason are true, and Reason correctly explains Assertion",
      "Assertion is true; Reason is false",
      "Assertion is false; Reason is true",
      "Both Assertion and Reason are false",
      "Answer not known"
    ],
    "tamilOptions": [
      "கூற்று மற்றும் காரணம் இரண்டும் சரி, காரணம் கூற்றை சரியாக விளக்குகிறது",
      "கூற்று - சரி; காரணம் - தவறு",
      "கூற்று - தவறு; காரணம் - சரி",
      "கூற்று மற்றும் காரணம் இரண்டும் தவறு",
      "விடை தெரியவில்லை"
    ],
    "correctOptionIndex": 0,
    "explanation": "In Tamil grammar, the letters அ, இ, உ serve as demonstrative letters used to point at objects near or far.",
    "tamilExplanation": "தமிழ் இலக்கணத்தில் அ, இ, உ ஆகிய எழுத்துகள் சுட்டெழுத்துகள் எனப்படும். இவை ஒன்றைக் சுட்டிக்காட்ட பயன்படுகின்றன.",
    "marks": 1,
    "negativeMarks": 0.0
  }
];

export const QUESTION_TYPES_DOCUMENTATION = [
  {
    type: 'mcq',
    title: '1. Normal MCQ (English + Tamil)',
    desc: 'Standard multiple choice question with 4 options and bilingual translations.',
    sample: SAMPLE_EXAM_JSON[0]
  },
  {
    type: 'match_following',
    title: '2. Match the Following (English + Tamil)',
    desc: 'Bilingual left and right column matching with key-value match pairings.',
    sample: SAMPLE_EXAM_JSON[1]
  },
  {
    type: 'passage_mcq',
    title: '3. Passage / Paragraph + MCQ (English + Tamil)',
    desc: 'Comprehension passage with associated question and bilingual options.',
    sample: SAMPLE_EXAM_JSON[2]
  },
  {
    type: 'true_false',
    title: '4. True / False (English + Tamil)',
    desc: 'Binary true/false statement validation with bilingual text.',
    sample: SAMPLE_EXAM_JSON[3]
  },
  {
    type: 'fill_blank',
    title: '5. Fill in the Blank (English + Tamil)',
    desc: 'Sentence completion with blank indicators and multiple choice options.',
    sample: SAMPLE_EXAM_JSON[4]
  },
  {
    type: 'statement_based',
    title: '6. Statement-Based Question (English + Tamil)',
    desc: 'Numbered statements analysis with combination options (1 only, 2 only, Both, Neither).',
    sample: SAMPLE_EXAM_JSON[5]
  },
  {
    type: 'assertion_reason',
    title: '7. Assertion & Reason (English + Tamil)',
    desc: 'Scientific/logical Assertion (A) and Reason (R) validation with standard options.',
    sample: SAMPLE_EXAM_JSON[6]
  }
];

export function downloadSampleJSONFile(): void {
  const jsonStr = JSON.stringify(SAMPLE_EXAM_JSON, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_exam_questions.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
