import { Question } from '../types';

export const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'q1',
    questionText: 'Which planet in our solar system is known as the Red Planet due to iron oxide on its surface?',
    questionTamilText: 'அதன் மேற்பரப்பில் உள்ள இரும்பு ஆக்சைடு காரணமாக நமது சூரிய மண்டலத்தில் சிவப்பு கிரகம் என்று அழைக்கப்படும் கிரகம் எது?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    tamilOptions: ['வெள்ளி', 'செவ்வாய்', 'வியாழன்', 'சனி'],
    correctOptionIndex: 1,
    explanation: 'Mars is often called the "Red Planet" because iron minerals in the Martian soil oxidize (or rust), causing the soil and atmosphere to look red.',
    tamilExplanation: 'செவ்வாய் கிரகம் பெரும்பாலும் "சிவப்பு கிரகம்" என்று அழைக்கப்படுகிறது, ஏனெனில் செவ்வாய் மண்ணில் உள்ள இரும்பு தாதுக்கள் ஆக்ஸிஜனேற்றமடைந்து (துருப்பிடித்து), மண்ணும் வளிமண்டலமும் சிவப்பாக காட்சியளிக்கின்றன.',
    topic: 'Space Science',
    difficulty: 'Easy'
  },
  {
    id: 'q2',
    questionText: 'If a car travels at a constant speed of 60 km/h, how far will it travel in 45 minutes?',
    questionTamilText: 'ஒரு கார் மணிக்கு 60 கிமீ வேகத்தில் சீராக சென்றால், அது 45 நிமிடங்களில் எவ்வளவு தூரம் பயணிக்கும்?',
    options: ['30 km', '40 km', '45 km', '50 km'],
    tamilOptions: ['30 கி.மீ', '40 கி.மீ', '45 கி.மீ', '50 கி.மீ'],
    correctOptionIndex: 2,
    explanation: 'Distance = Speed * Time. 45 minutes is 0.75 hours (45/60). So, Distance = 60 km/h * 0.75 h = 45 km.',
    tamilExplanation: 'தொலைவு = வேகம் * நேரம். 45 நிமிடங்கள் என்பது 0.75 மணிநேரம் (45/60) ஆகும். எனவே, தொலைவு = 60 கிமீ/மணி * 0.75 மணி = 45 கிமீ.',
    topic: 'Quantitative Aptitude',
    difficulty: 'Medium'
  },
  {
    id: 'q3',
    questionText: 'Which fundamental particle of an atom carries a negative electrical charge?',
    questionTamilText: 'அணுவின் எந்த அடிப்படை துகள் எதிர்மறை மின்சார மின்னூட்டத்தைக் கொண்டுள்ளது?',
    options: ['Proton', 'Neutron', 'Electron', 'Positron'],
    tamilOptions: ['புரோட்டான்', 'நியூட்ரான்', 'எலக்ட்ரான்', 'பாசிட்ரான்'],
    correctOptionIndex: 2,
    explanation: 'Electrons are subatomic particles that carry a negative electrical charge, orbiting around the atomic nucleus of protons and neutrons.',
    tamilExplanation: 'எலக்ட்ரான்கள் எதிர்மறை மின் கட்டணத்தைக் கொண்ட அணு உள்கூறு துகள்களாகும், அவை புரோட்டான்கள் மற்றும் நியூட்ரான்களின் அணுக்கருவைச் சுற்றி வருகின்றன.',
    topic: 'Chemistry',
    difficulty: 'Easy'
  },
  {
    id: 'q4',
    questionText: 'Who is known as the "Father of the Indian Constitution" for his monumental role in drafting it?',
    questionTamilText: 'இந்திய அரசியலமைப்பை வரைவதில் ஆற்றிய முக்கிய பங்கிற்காக "இந்திய அரசியலமைப்பின் தந்தை" என்று அழைக்கப்படுபவர் யார்?',
    options: ['Mahatma Gandhi', 'Dr. B.R. Ambedkar', 'Jawaharlal Nehru', 'Subhas Chandra Bose'],
    tamilOptions: ['மகாத்மா காந்தி', 'டாக்டர் பி.ஆர்.அம்பேத்கர்', 'ஜவஹர்லால் நேரு', 'சுபாஷ் சந்திர போஸ்'],
    correctOptionIndex: 1,
    explanation: 'Dr. Bhimrao Ramji Ambedkar was the chief architect and chairman of the Drafting Committee of the Indian Constitution.',
    tamilExplanation: 'டாக்டர் பீம்ராவ் ராம்ஜி அம்பேத்கர் இந்திய அரசியலமைப்பின் வரைவுக் குழுவின் தலைமை வடிவமைப்பாளராகவும் தலைவராகவும் இருந்தார்.',
    topic: 'Indian Polity',
    difficulty: 'Easy'
  },
  {
    id: 'q5',
    questionText: 'Which of the following computer memory types is volatile and loses its data when the power is turned off?',
    questionTamilText: 'கீழ்க்கண்ட கணினி நினைவக வகைகளில் எது நிலையற்றது மற்றும் மின்சாரம் அணைக்கப்படும் போது அதன் தரவை இழக்கிறது?',
    options: ['ROM', 'SSD', 'Hard Disk', 'RAM'],
    tamilOptions: ['ROM', 'SSD', 'ஹார்ட் டிஸ்க்', 'RAM'],
    correctOptionIndex: 3,
    explanation: 'RAM (Random Access Memory) is volatile, meaning it requires power to maintain the stored information. When power is lost, all stored data is cleared.',
    tamilExplanation: 'RAM (ரேண்டம் ஆக்சஸ் மெமரி) நிலையற்றது, அதாவது சேமிக்கப்பட்ட தகவலை பராமரிக்க மின்சாரம் தேவைப்படுகிறது. மின்சாரம் நிறுத்தப்படும் போது, சேமிக்கப்பட்ட எல்லா தரவும் அழிக்கப்படும்.',
    topic: 'Computer Science',
    difficulty: 'Medium'
  },
  {
    id: 'q6',
    questionText: 'The Thirukkural, an ancient Tamil treatise on ethics and morality, was written by which famous poet?',
    questionTamilText: 'அறநெறி மற்றும் ஒழுக்கம் பற்றிய பண்டைய தமிழ் நூலான திருக்குறளை எழுதிய புகழ்பெற்ற புலவர் யார்?',
    options: ['Kambar', 'Thiruvalluvar', 'Ilango Adigal', 'Avvaiyar'],
    tamilOptions: ['கம்பர்', 'திருவள்ளுவர்', 'இளங்கோ அடிகள்', 'அவ்வையார்'],
    correctOptionIndex: 1,
    explanation: 'Thirukkural was written by the legendary poet Thiruvalluvar. It consists of 133 chapters with 1,330 couplets (kurals).',
    tamilExplanation: 'திருக்குறள் புகழ்பெற்ற புலவரான திருவள்ளுவரால் எழுதப்பட்டது. இது 133 அதிகாரங்களையும், 1,330 குறள்களையும் கொண்டுள்ளது.',
    topic: 'Tamil Literature',
    difficulty: 'Easy'
  },
  {
    id: 'q7',
    questionText: 'In a code language, if "COMPUTER" is written as "RFUVQNPC", how is "MEDICINE" written in that same code?',
    questionTamilText: 'ஒரு குறியீட்டு மொழியில், "COMPUTER" என்பது "RFUVQNPC" என்று எழுதப்பட்டால், "MEDICINE" என்பது அதே குறியீட்டில் எவ்வாறு எழுதப்படும்?',
    options: ['EOJDEJFM', 'EOJDJEFM', 'MFEJDJOE', 'DJFMEJON'],
    tamilOptions: ['EOJDEJFM', 'EOJDJEFM', 'MFEJDJOE', 'DJFMEJON'],
    correctOptionIndex: 1,
    explanation: 'The letters of the word are reversed (COMPUTER -> RETUPMOC) and each inner letter is advanced by +1 letter. Similarly, MEDICINE reversed is ENICIDEM, and advancing inner letters by +1 yields EOJDJEFM.',
    tamilExplanation: 'வார்த்தையின் எழுத்துக்கள் தலைகீழாக மாற்றப்பட்டு (COMPUTER -> RETUPMOC) ஒவ்வொரு உள் எழுத்தும் +1 எழுத்தாக நகர்த்தப்படுகிறது. அதேபோல், MEDICINE என்பது ENICIDEM என்று தலைகீழாக மாற்றப்பட்டு, உள் எழுத்துக்களை +1 நகர்த்தினால் EOJDJEFM கிடைக்கும்.',
    topic: 'Logical Reasoning',
    difficulty: 'Hard'
  },
  {
    id: 'q8',
    questionText: 'What is the value of x if 3x + 12 = 4x - 5?',
    questionTamilText: '3x + 12 = 4x - 5 என்றால், x-இன் மதிப்பு என்ன?',
    options: ['7', '12', '17', '22'],
    tamilOptions: ['7', '12', '17', '22'],
    correctOptionIndex: 2,
    explanation: '3x + 12 = 4x - 5 -> Subtracting 3x from both sides: 12 = x - 5. Adding 5 to both sides: 17 = x.',
    tamilExplanation: '3x + 12 = 4x - 5 -> இருபுறமும் 3x-ஐக் கழித்தால்: 12 = x - 5. இருபுறமும் 5-ஐக் கூட்டினால்: 17 = x.',
    topic: 'Mathematics',
    difficulty: 'Medium'
  },
  {
    id: 'q9',
    questionText: 'Which ecosystem has the highest biodiversity per unit area on planet Earth?',
    questionTamilText: 'பூமியில் ஒரு அலகு பரப்பளவிற்கு மிக உயர்ந்த பல்லுயிர் பெருக்கத்தைக் கொண்ட சுற்றுச்சூழல் அமைப்பு எது?',
    options: ['Tundra', 'Desert', 'Tropical Rainforest', 'Grassland'],
    tamilOptions: ['துருவப் பகுதி', 'பாலைவனம்', 'வெப்பமண்டல மழைக்காடுகள்', 'புல்வெளி'],
    correctOptionIndex: 2,
    explanation: 'Tropical Rainforests cover only about 6% of the Earth’s land surface but house more than half of the world’s plant and animal species.',
    tamilExplanation: 'வெப்பமண்டல மழைக்காடுகள் பூமியின் நிலப்பரப்பில் சுமார் 6% மட்டுமே ஆக்கிரமித்துள்ளன, ஆனால் உலகின் தாவரங்கள் மற்றும் விலங்கு இனங்களில் பாதிக்கும் மேலானவை அங்கு வாழ்கின்றன.',
    topic: 'Environmental Science',
    difficulty: 'Medium'
  },
  {
    id: 'q10',
    questionText: 'Which scientist formulated the Three Laws of Motion and the Law of Universal Gravitation?',
    questionTamilText: 'மூன்று இயக்க விதிகள் மற்றும் புவியீர்ப்பு விதியை வகுத்த விஞ்ஞானி யார்?',
    options: ['Albert Einstein', 'Galileo Galilei', 'Nikola Tesla', 'Sir Isaac Newton'],
    tamilOptions: ['ஆல்பர்ட் ஐன்ஸ்டீன்', 'கலிலியோ கலிலி', 'நிகோலா டெஸ்லா', 'சர் ஐசக் நியூட்டன்'],
    correctOptionIndex: 3,
    explanation: 'Sir Isaac Newton published his laws of motion and universal gravitation in his monumental work "Philosophiæ Naturalis Principia Mathematica" in 1687.',
    tamilExplanation: 'சர் ஐசக் நியூட்டன் 1687 இல் தனது புகழ்பெற்ற "பிரின்சிபியா மேத்தமேட்டிகா" என்ற நூலில் இயக்க விதிகள் மற்றும் புவியீர்ப்பு விதிகளை வெளியிட்டார்.',
    topic: 'Physics',
    difficulty: 'Easy'
  }
];
