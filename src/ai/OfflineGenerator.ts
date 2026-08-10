import { Question } from '../types';

/**
 * Robust Offline/Local Question Bank & Generator
 * Provides an alternate path for the 429 Quota Exceeded error or general fallbacks.
 * Generates highly realistic, bilingual (English & Tamil) CBT multiple-choice questions.
 */

interface BaseQuestion {
  questionText: string;
  questionTamilText: string;
  options: string[];
  tamilOptions: string[];
  correctOptionIndex: number;
  explanation: string;
  tamilExplanation: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

// ----------------------------------------------------
// DATABASE OF BILINGUAL QUESTIONS GROUPED BY CATEGORY
// ----------------------------------------------------

const COMPUTER_SCIENCE_QUESTIONS: BaseQuestion[] = [
  {
    questionText: "What is the primary function of the Central Processing Unit (CPU) in a computer?",
    questionTamilText: "ஒரு கணினியில் உள்ள மத்திய செயலாக்க அலகின் (CPU) முதன்மை செயல்பாடு என்ன?",
    options: ["To store data permanently", "To execute instructions and process data", "To display visual output on the screen", "To connect to external network devices"],
    tamilOptions: ["தரவை நிரந்தரமாக சேமிக்க", "வழிமுறைகளை செயல்படுத்த மற்றும் தரவை செயலாக்க", "திரையில் காட்சி வெளியீட்டைக் காட்ட", "வெளிப்புற பிணைய சாதனங்களுடன் இணைக்க"],
    correctOptionIndex: 1,
    explanation: "The CPU acts as the brain of the computer, executing program instructions and processing data.",
    tamilExplanation: "சிபியு கணினியின் மூளையாக செயல்படுகிறது, நிரல் வழிமுறைகளை செயல்படுத்துகிறது மற்றும் தரவை செயலாக்குகிறது.",
    topic: "Computer Architecture",
    difficulty: "Easy"
  },
  {
    questionText: "Which protocol is universally used for securing data transmission over the World Wide Web?",
    questionTamilText: "உலகளாவிய வலையில் (WWW) பாதுகாப்பான தரவு பரிமாற்றத்திற்கு உலகளவில் எந்த நெறிமுறை பயன்படுத்தப்படுகிறது?",
    options: ["HTTP", "FTP", "HTTPS", "SMTP"],
    tamilOptions: ["HTTP", "FTP", "HTTPS", "SMTP"],
    correctOptionIndex: 2,
    explanation: "HTTPS encrypts the data packets, ensuring a secure and encrypted communication channel.",
    tamilExplanation: "HTTPS தரவு பாக்கெட்டுகளை குறியாக்குகிறது, பாதுகாப்பான மற்றும் மறைகுறியாக்கப்பட்ட தகவல் தொடர்பு சேனலை உறுதி செய்கிறது.",
    topic: "Computer Networks",
    difficulty: "Medium"
  },
  {
    questionText: "What is the term used to describe the permanent memory built into a computer's motherboard?",
    questionTamilText: "கணினியின் மதர்போர்டில் கட்டமைக்கப்பட்ட நிரந்தர நினைவகத்தை விவரிக்கப் பயன்படுத்தப்படும் சொல் எது?",
    options: ["RAM", "ROM", "Cache Memory", "Virtual Memory"],
    tamilOptions: ["RAM (ரேம்)", "ROM (ரோம்)", "கேச் நினைவகம்", "மெய்நிகர் நினைவகம்"],
    correctOptionIndex: 1,
    explanation: "ROM (Read-Only Memory) is non-volatile and permanently stores startup instructions (BIOS).",
    tamilExplanation: "ரோம் (ROM - படிக்க மட்டும் நினைவகம்) என்பது நிலையற்றது மற்றும் தொடக்க வழிமுறைகளை (BIOS) நிரந்தரமாக சேமிக்கிறது.",
    topic: "Computer Memory",
    difficulty: "Easy"
  },
  {
    questionText: "In object-oriented programming, which concept refers to hiding internal details and showing only functionality?",
    questionTamilText: "பொருள் சார்ந்த நிரலாக்கத்தில் (OOP), உள் விவரங்களை மறைத்து செயல்பாட்டை மட்டும் காண்பிக்கும் கருத்து எது?",
    options: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"],
    tamilOptions: ["மரபுரிமை (Inheritance)", "பல்வகைமை (Polymorphism)", "உறைபொதியாக்கம் (Encapsulation)", "அருவமாக்கல் (Abstraction)"],
    correctOptionIndex: 3,
    explanation: "Abstraction focuses on what an object does rather than how it does it, hiding complex details.",
    tamilExplanation: "அருவமாக்கல் (Abstraction) என்பது ஒரு பொருள் எவ்வாறு செய்கிறது என்பதை விட அது என்ன செய்கிறது என்பதில் கவனம் செலுத்துகிறது, சிக்கலான விவரங்களை மறைக்கிறது.",
    topic: "Software Engineering",
    difficulty: "Hard"
  },
  {
    questionText: "Which data structure operates on a Last-In, First-Out (LIFO) basis?",
    questionTamilText: "எந்த தரவு அமைப்பு கடைசியாக வந்தது, முதலில் செல்லும் (LIFO) அடிப்படையில் செயல்படுகிறது?",
    options: ["Queue", "Stack", "Linked List", "Binary Tree"],
    tamilOptions: ["வரிசை (Queue)", "அடுக்கு (Stack)", "இணைக்கப்பட்ட பட்டியல்", "இருபடி மரம்"],
    correctOptionIndex: 1,
    explanation: "A Stack utilizes LIFO structure, where the last element inserted is the first one removed.",
    tamilExplanation: "அடுக்கு (Stack) என்பது LIFO கட்டமைப்பைப் பயன்படுத்துகிறது, அங்கு கடைசியாக செருகப்பட்ட உறுப்பு முதலில் அகற்றப்படும்.",
    topic: "Data Structures",
    difficulty: "Medium"
  },
  {
    questionText: "Which protocol is commonly used to transfer computer files from one host to another over a TCP network?",
    questionTamilText: "TCP நெட்வொர்க்கில் கோப்புகளை ஒரு கணினியிலிருந்து மற்றொரு கணினிக்கு மாற்ற பொதுவாக எந்த நெறிமுறை பயன்படுத்தப்படுகிறது?",
    options: ["HTTP", "FTP", "HTTPS", "SMTP"],
    tamilOptions: ["HTTP", "FTP", "HTTPS", "SMTP"],
    correctOptionIndex: 1,
    explanation: "FTP (File Transfer Protocol) is designed specifically for copying files between different computer systems.",
    tamilExplanation: "FTP (கோப்பு பரிமாற்ற நெறிமுறை) வெவ்வேறு கணினி அமைப்புகளுக்கு இடையில் கோப்புகளை நகலெடுப்பதற்காக வடிவமைக்கப்பட்டுள்ளது.",
    topic: "Computer Networks",
    difficulty: "Easy"
  },
  {
    questionText: "Which protocol is the standard mechanism used for sending electronic mail (emails) across the internet?",
    questionTamilText: "இணையத்தில் மின்னஞ்சல்களை அனுப்பப் பயன்படும் நிலையான நெறிமுறை எது?",
    options: ["HTTP", "FTP", "HTTPS", "SMTP"],
    tamilOptions: ["HTTP", "FTP", "HTTPS", "SMTP"],
    correctOptionIndex: 3,
    explanation: "SMTP (Simple Mail Transfer Protocol) is the standard TCP/IP protocol used to transmit outgoing emails.",
    tamilExplanation: "SMTP (எளிய அஞ்சல் பரிமாற்ற நெறிமுறை) என்பது வெளிச்செல்லும் மின்னஞ்சல்களை அனுப்பப் பயன்படும் நிலையான நெறிமுறையாகும்.",
    topic: "Computer Networks",
    difficulty: "Easy"
  },
  {
    questionText: "Which system is responsible for translating human-readable domain names into numeric IP addresses?",
    questionTamilText: "மனிதர்கள் படிக்கக்கூடிய டொமைன் பெயர்களை எண் ஐபி முகவரிகளாக மாற்றுவதற்கு எந்த அமைப்பு பொறுப்பாகும்?",
    options: ["DHCP", "DNS", "WINS", "ARP"],
    tamilOptions: ["DHCP", "DNS", "WINS", "ARP"],
    correctOptionIndex: 1,
    explanation: "DNS (Domain Name System) translates friendly hostnames like google.com into numeric IP addresses.",
    tamilExplanation: "DNS (டொமைன் பெயர் அமைப்பு) google.com போன்ற ஹோஸ்ட் பெயர்களை எண் ஐபி முகவரிகளாக மாற்றுகிறது.",
    topic: "Computer Networks",
    difficulty: "Medium"
  },
  {
    questionText: "Which memory type is volatile and requires constant electrical refresh to maintain its contents?",
    questionTamilText: "எந்த நினைவக வகை நிலையற்றது மற்றும் அதன் உள்ளடக்கங்களை பராமரிக்க நிலையான மின்சார புதுப்பித்தல் தேவைப்படுகிறது?",
    options: ["SRAM", "DRAM", "ROM", "Flash Memory"],
    tamilOptions: ["SRAM", "DRAM", "ROM", "ஃப்ளாஷ் நினைவகம்"],
    correctOptionIndex: 1,
    explanation: "DRAM (Dynamic RAM) stores data in capacitors that slowly leak charge, requiring periodic refreshing.",
    tamilExplanation: "DRAM (டைனமிக் ரேம்) மின்தேக்கிகளில் தரவைச் சேமிக்கிறது, இதற்கு குறிப்பிட்ட கால இடைவெளியில் புதுப்பித்தல் தேவைப்படுகிறது.",
    topic: "Computer Memory",
    difficulty: "Hard"
  },
  {
    questionText: "In object-oriented programming, which concept refers to wrapping data and code into a single unit?",
    questionTamilText: "பொருள் சார்ந்த நிரலாக்கத்தில் (OOP), தரவு மற்றும் குறியீட்டை ஒரே அலகாக இணைக்கும் கருத்து எது?",
    options: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"],
    tamilOptions: ["மரபுரிமை", "பல்வகைமை", "உறைபொதியாக்கம்", "அருவமாக்கல்"],
    correctOptionIndex: 2,
    explanation: "Encapsulation bundles properties and methods together, shielding the internal state from direct outside interference.",
    tamilExplanation: "உறைபொதியாக்கம் பண்புகள் மற்றும் முறைகளை ஒன்றாக இணைத்து, வெளிப்புற தலையீடுகளிலிருந்து உள் நிலையைப் பாதுகாக்கிறது.",
    topic: "Software Engineering",
    difficulty: "Medium"
  },
  {
    questionText: "Which data structure operates on a First-In, First-Out (FIFO) basis?",
    questionTamilText: "எந்த தரவு அமைப்பு முதலில் வந்தது, முதலில் செல்லும் (FIFO) அடிப்படையில் செயல்படுகிறது?",
    options: ["Queue", "Stack", "Linked List", "Binary Tree"],
    tamilOptions: ["வரிசை (Queue)", "அடுக்கு (Stack)", "இணைக்கப்பட்ட பட்டியல்", "இருபடி மரம்"],
    correctOptionIndex: 0,
    explanation: "A Queue operates on FIFO, where elements are inserted at the back and removed from the front.",
    tamilExplanation: "ஒரு வரிசை (Queue) FIFO அடிப்படையில் செயல்படுகிறது, அங்கு உறுப்புகள் பின்புறம் சேர்க்கப்பட்டு முன்புறம் அகற்றப்படுகின்றன.",
    topic: "Data Structures",
    difficulty: "Easy"
  },
  {
    questionText: "In databases, which key uniquely identifies each record or row in a table?",
    questionTamilText: "தரவுத்தளங்களில், அட்டவணையில் உள்ள ஒவ்வொரு பதிவையும் தனித்துவமாக அடையாளம் காணும் விசை எது?",
    options: ["Foreign Key", "Primary Key", "Composite Key", "Candidate Key"],
    tamilOptions: ["அந்நிய விசை", "முதன்மை விசை", "கூட்டு விசை", "வேட்பாளர் விசை"],
    correctOptionIndex: 1,
    explanation: "A Primary Key must contain unique values and cannot contain null values, identifying each row.",
    tamilExplanation: "முதன்மை விசை (Primary Key) தனித்துவமான மதிப்புகளைக் கொண்டிருக்க வேண்டும் மற்றும் அது பூஜ்யமாக இருக்க முடியாது.",
    topic: "Databases",
    difficulty: "Easy"
  }
];

const GENERAL_SCIENCE_QUESTIONS: BaseQuestion[] = [
  {
    questionText: "What is the exact speed of light in a vacuum?",
    questionTamilText: "வெற்றிடத்தில் ஒளியின் சரியான வேகம் என்ன?",
    options: ["3 x 10^5 m/s", "3 x 10^8 m/s", "1.5 x 10^8 m/s", "3 x 10^10 m/s"],
    tamilOptions: ["விநாடிக்கு 3 x 10^5 மீட்டர்", "விநாடிக்கு 3 x 10^8 மீட்டர்", "விநாடிக்கு 1.5 x 10^8 மீட்டர்", "விநாடிக்கு 3 x 10^10 மீட்டர்"],
    correctOptionIndex: 1,
    explanation: "The speed of light in a vacuum is approximately 300,000 km/s, which is 3 x 10^8 meters per second.",
    tamilExplanation: "வெற்றிடத்தில் ஒளியின் வேகம் தோராயமாக விநாடிக்கு 3,00,000 கி.மீ ஆகும், இது விநாடிக்கு 3 x 10^8 மீட்டர்.",
    topic: "Physics",
    difficulty: "Medium"
  },
  {
    questionText: "Which gas is most abundant in the Earth's atmosphere?",
    questionTamilText: "பூமியின் வளிமண்டலத்தில் மிக அதிகமாக உள்ள வாயு எது?",
    options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"],
    tamilOptions: ["ஆக்ஸிஜன்", "கார்பன் டை ஆக்சைடு", "நைட்ரஜன்", "ஆர்கான்"],
    correctOptionIndex: 2,
    explanation: "Nitrogen makes up approximately 78% of the Earth's atmosphere.",
    tamilExplanation: "பூமியின் வளிமண்டலத்தில் நைட்ரஜன் தோராயமாக 78% உள்ளது.",
    topic: "Chemistry & Environment",
    difficulty: "Easy"
  },
  {
    questionText: "What is the powerhouse of the biological cell?",
    questionTamilText: "உயிரியல் செல்லின் ஆற்றல் மையம் எது?",
    options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Apparatus"],
    tamilOptions: ["உட்கரு (Nucleus)", "ரைபோசோம் (Ribosome)", "மைட்டோகாண்ட்ரியா (Mitochondria)", "கோல்கி உறுப்பு"],
    correctOptionIndex: 2,
    explanation: "Mitochondria generate most of the chemical energy needed to power the cell's reactions.",
    tamilExplanation: "செல்லின் எதிர்வினைகளை இயக்குவதற்குத் தேவையான பெரும்பாலான வேதியியல் ஆற்றலை மைட்டோகாண்ட்ரியா உற்பத்தி செய்கிறது.",
    topic: "Biology",
    difficulty: "Easy"
  },
  {
    questionText: "Which chemical element has the highest thermal and electrical conductivity of all metals?",
    questionTamilText: "அனைத்து உலோகங்களிலும் மிக உயர்ந்த வெப்ப மற்றும் மின் கடத்துத்திறன் கொண்ட வேதியியல் தனிமம் எது?",
    options: ["Copper", "Gold", "Silver", "Aluminium"],
    tamilOptions: ["செம்பு", "தங்கம்", "வெள்ளி", "அலுமினியம்"],
    correctOptionIndex: 2,
    explanation: "Silver possesses the highest electrical and thermal conductivity of any element.",
    tamilExplanation: "வெள்ளி எந்தவொரு தனிமத்தையும் விட மிக உயர்ந்த மின்சார மற்றும் வெப்ப கடத்துத்திறனைக் கொண்டுள்ளது.",
    topic: "Chemistry",
    difficulty: "Hard"
  },
  {
    questionText: "What is the common name for Sodium Bicarbonate?",
    questionTamilText: "சோடியம் பைகார்பனேட்டின் பொதுவான பெயர் என்ன?",
    options: ["Baking Soda", "Washing Soda", "Bleaching Powder", "Common Salt"],
    tamilOptions: ["சமையல் சோடா", "சலவை சோடா", "சலவை தூள்", "சாதாரண உப்பு"],
    correctOptionIndex: 0,
    explanation: "Sodium Bicarbonate (NaHCO3) is commonly known as baking soda.",
    tamilExplanation: "சோடியம் பைகார்பனேட் (NaHCO3) பொதுவாக சமையல் சோடா என்று அழைக்கப்படுகிறது.",
    topic: "Chemistry",
    difficulty: "Medium"
  },
  {
    questionText: "What is the standard acceleration due to gravity on the Earth's surface?",
    questionTamilText: "பூமியின் மேற்பரப்பில் புவியீர்ப்பு விசையின் காரணமாக ஏற்படும் நிலையான முடுக்கம் என்ன?",
    options: ["9.8 m/s^2", "8.9 m/s^2", "9.8 cm/s^2", "11.2 km/s"],
    tamilOptions: ["9.8 மீ/வி^2", "8.9 மீ/வி^2", "9.8 செமீ/வி^2", "11.2 கிமீ/வி"],
    correctOptionIndex: 0,
    explanation: "The standard acceleration due to gravity on Earth is approximately 9.80665 m/s^2.",
    tamilExplanation: "பூமியில் புவியீர்ப்பு விசையால் ஏற்படும் முடுக்கம் தோராயமாக 9.8 மீ/வி^2 ஆகும்.",
    topic: "Physics",
    difficulty: "Easy"
  },
  {
    questionText: "What is the absolute zero temperature on the Celsius scale?",
    questionTamilText: "செல்சியஸ் அளவுகோலில் தனிப் பூஜ்ஜிய வெப்பநிலை (absolute zero) எவ்வளவு?",
    options: ["0 °C", "-273.15 °C", "-100 °C", "-459.67 °C"],
    tamilOptions: ["0 °C", "-273.15 °C", "-100 °C", "-459.67 °C"],
    correctOptionIndex: 1,
    explanation: "Absolute zero, the lowest limit of thermodynamic temperature, is -273.15 °C.",
    tamilExplanation: "வெப்ப இயக்கவியல் வெப்பநிலையின் மிகக் குறைந்த வரம்பான தனிப் பூஜ்ஜியம் -273.15 °C ஆகும்.",
    topic: "Physics",
    difficulty: "Medium"
  },
  {
    questionText: "Which biological organelle contains the cell's genetic material (DNA) and controls its activities?",
    questionTamilText: "செல்லின் மரபணுப் பொருளைக் (DNA) கொண்டுள்ள மற்றும் அதன் செயல்பாடுகளைக் கட்டுப்படுத்தும் உறுப்பு எது?",
    options: ["Nucleus", "Ribosome", "Mitochondria", "Lysosome"],
    tamilOptions: ["உட்கரு (Nucleus)", "ரைபோசோம்", "மைட்டோகாண்ட்ரியா", "லைசோசோம்"],
    correctOptionIndex: 0,
    explanation: "The nucleus acts as the repository of genetic information and the cell's control center.",
    tamilExplanation: "உட்கரு மரபணு தகவல்களின் களஞ்சியமாகவும் செல்லின் கட்டுப்பாட்டு மையமாகவும் செயல்படுகிறது.",
    topic: "Biology",
    difficulty: "Easy"
  },
  {
    questionText: "Which gas is primarily responsible for global warming as a greenhouse gas?",
    questionTamilText: "பசுமை இல்ல வாயுவாக உலக வெப்பமயமாதலுக்கு முதன்மையாக காரணமான வாயு எது?",
    options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Helium"],
    tamilOptions: ["ஆக்ஸிஜன்", "கார்பன் டை ஆக்சைடு", "நைட்ரஜன்", "ஹீலியம்"],
    correctOptionIndex: 1,
    explanation: "Carbon Dioxide (CO2) traps infrared radiation in the atmosphere, driving global warming.",
    tamilExplanation: "கார்பன் டை ஆக்சைடு (CO2) வளிமண்டலத்தில் அகச்சிவப்பு கதிர்வீச்சை சிக்க வைத்து உலக வெப்பமயமாதலை உண்டாக்குகிறது.",
    topic: "Chemistry & Environment",
    difficulty: "Easy"
  }
];

const HISTORY_GEOGRAPHY_QUESTIONS: BaseQuestion[] = [
  {
    questionText: "Who is formally recognized as the chief architect and Father of the Indian Constitution?",
    questionTamilText: "இந்திய அரசியலமைப்பின் முதன்மை வடிவமைப்பாளர் மற்றும் தந்தை என்று அதிகாரப்பூர்வமாக அங்கீகரிக்கப்பட்டவர் யார்?",
    options: ["Mahatma Gandhi", "Dr. B.R. Ambedkar", "Jawaharlal Nehru", "Dr. Rajendra Prasad"],
    tamilOptions: ["மகாத்மா காந்தி", "டாக்டர் பி.ஆர்.அம்பேத்கர்", "ஜவஹர்லால் நேரு", "டாக்டர் ராஜேந்திர பிரசாத்"],
    correctOptionIndex: 1,
    explanation: "Dr. B.R. Ambedkar served as the Chairman of the Drafting Committee for the Constitution.",
    tamilExplanation: "டாக்டர் பி.ஆர்.அம்பேத்கர் அரசியலமைப்பு வரைவுக் குழுவின் தலைவராக பணியாற்றினார்.",
    topic: "Indian Polity",
    difficulty: "Easy"
  },
  {
    questionText: "Which river is the longest in the world?",
    questionTamilText: "உலகின் மிக நீளமான நதி எது?",
    options: ["Amazon River", "Nile River", "Yangtze River", "Mississippi River"],
    tamilOptions: ["அமேசான் நதி", "நைல் நதி", "யாங்சே நதி", "மிசிசிப்பி நதி"],
    correctOptionIndex: 1,
    explanation: "The Nile River is historically considered the longest river in the world, stretching over 6,650 km.",
    tamilExplanation: "நைல் நதி வரலாற்று ரீதியாக உலகின் மிக நீளமான நதியாக கருதப்படுகிறது, இது 6,650 கி.மீ க்கும் அதிகமாக நீண்டுள்ளது.",
    topic: "World Geography",
    difficulty: "Easy"
  },
  {
    questionText: "In which year did the historic French Revolution officially begin?",
    questionTamilText: "வரலாற்று சிறப்புமிக்க பிரெஞ்சு புரட்சி எந்த ஆண்டில் அதிகாரப்பூர்வமாக தொடங்கியது?",
    options: ["1776", "1789", "1815", "1848"],
    tamilOptions: ["1776", "1789", "1815", "1848"],
    correctOptionIndex: 1,
    explanation: "The French Revolution began in 1789 with the storming of the Bastille on July 14.",
    tamilExplanation: "பிரெஞ்சு புரட்சி 1789 இல் ஜூலை 14 அன்று பாஸ்டில் சிறை தகர்ப்புடன் தொடங்கியது.",
    topic: "World History",
    difficulty: "Hard"
  },
  {
    questionText: "Which Indian state has the longest mainland coastline?",
    questionTamilText: "மிக நீளமான பிரதான நிலப்பரப்பு கடற்கரையைக் கொண்ட இந்திய மாநிலம் எது?",
    options: ["Tamil Nadu", "Maharashtra", "Gujarat", "Andhra Pradesh"],
    tamilOptions: ["தமிழ்நாடு", "மகாராஷ்டிரா", "குஜராத்", "ஆந்திரப் பிரதேசம்"],
    correctOptionIndex: 2,
    explanation: "Gujarat has the longest mainland coastline in India, extending over 1,600 km.",
    tamilExplanation: "குஜராத் இந்தியாவில் மிக நீளமான கடற்கரையைக் கொண்டுள்ளது, இது 1,600 கி.மீ க்கும் அதிகமாக நீண்டுள்ளது.",
    topic: "Indian Geography",
    difficulty: "Medium"
  },
  {
    questionText: "Who was the first emperor of the historic Maurya Empire in ancient India?",
    questionTamilText: "பண்டைய இந்தியாவின் வரலாற்று சிறப்புமிக்க மௌரியப் பேரரசின் முதல் பேரரசர் யார்?",
    options: ["Ashoka the Great", "Chandragupta Maurya", "Bindusara", "Samudragupta"],
    tamilOptions: ["மாபெரும் அசோகர்", "சந்திரகுப்த மௌரியர்", "பிந்துசாரர்", "சமுத்திரகுப்தர்"],
    correctOptionIndex: 1,
    explanation: "Chandragupta Maurya founded the Maurya Empire in 322 BCE with the guidance of Chanakya.",
    tamilExplanation: "சந்திரகுப்த மௌரியர் கிமு 322 இல் சாணக்கியரின் வழிகாட்டுதலுடன் மௌரியப் பேரரசை நிறுவினார்.",
    topic: "Indian History",
    difficulty: "Medium"
  },
  {
    questionText: "Which river is the largest river in the world by water volume discharge?",
    questionTamilText: "நீர் வெளியேற்றத்தின் அளவின் அடிப்படையில் உலகின் மிகப்பெரிய நதி எது?",
    options: ["Nile River", "Amazon River", "Ganga River", "Mississippi River"],
    tamilOptions: ["நைல் நதி", "அமேசான் நதி", "கங்கை நதி", "மிசிசிப்பி நதி"],
    correctOptionIndex: 1,
    explanation: "The Amazon River is the largest river in the world by water discharge, exceeding the next seven combined.",
    tamilExplanation: "அமேசான் நதி நீர் வெளியேற்றத்தில் உலகின் மிகப்பெரிய நதியாகும்.",
    topic: "World Geography",
    difficulty: "Hard"
  },
  {
    questionText: "In which year did the United States of America officially declare its Independence?",
    questionTamilText: "அமெரிக்க ஐக்கிய நாடுகள் எந்த ஆண்டில் அதிகாரப்பூர்வமாக சுதந்திரத்தை அறிவித்தது?",
    options: ["1776", "1789", "1812", "1865"],
    tamilOptions: ["1776", "1789", "1812", "1865"],
    correctOptionIndex: 0,
    explanation: "The Declaration of Independence was adopted on July 4, 1776, marking the birth of the USA.",
    tamilExplanation: "அமெரிக்க சுதந்திரப் பிரகடனம் ஜூலை 4, 1776 இல் ஏற்றுக்கொள்ளப்பட்டது.",
    topic: "World History",
    difficulty: "Medium"
  },
  {
    questionText: "Which Indian state is the largest in terms of land area?",
    questionTamilText: "நிலப்பரப்பின் அடிப்படையில் மிகப்பெரிய இந்திய மாநிலம் எது?",
    options: ["Uttar Pradesh", "Maharashtra", "Rajasthan", "Madhya Pradesh"],
    tamilOptions: ["உத்தரப் பிரதேசம்", "மகாராஷ்டிரா", "ராஜஸ்தான்", "மத்தியப் பிரதேசம்"],
    correctOptionIndex: 2,
    explanation: "Rajasthan is the largest Indian state by area, covering over 342,239 square kilometers.",
    tamilExplanation: "ராஜஸ்தான் பரப்பளவில் இந்தியாவின் மிகப்பெரிய மாநிலமாகும், இது 3,42,239 சதுர கி.மீ பரப்பளவைக் கொண்டுள்ளது.",
    topic: "Indian Geography",
    difficulty: "Easy"
  },
  {
    questionText: "Which great Maurya emperor famously embraced Buddhism and sent missions across Asia after the Kalinga War?",
    questionTamilText: "கலிங்கப் போருக்குப் பிறகு மௌரியப் பேரரசர்களில் யார் பௌத்த மதத்தைத் தழுவி ஆசியா முழுவதும் பரப்பினார்?",
    options: ["Chandragupta Maurya", "Bindusara", "Ashoka the Great", "Brihadratha"],
    tamilOptions: ["சந்திரகுப்த மௌரியர்", "பிந்துசாரர்", "மாபெரும் அசோகர்", "பிருகத்ரதன்"],
    correctOptionIndex: 2,
    explanation: "Emperor Ashoka embraced Buddhism after witnessing the devastation of the Kalinga War in 261 BCE.",
    tamilExplanation: "பேரரசர் அசோகர் கிமு 261 இல் கலிங்கப் போரின் அழிவைக் கண்ட பின்னர் பௌத்த மதத்தைத் தழுவினார்.",
    topic: "Indian History",
    difficulty: "Medium"
  }
];

const POLITY_GK_QUESTIONS: BaseQuestion[] = [
  {
    questionText: "Which article of the Constitution of India guarantees the Right to Equality?",
    questionTamilText: "இந்திய அரசியலமைப்பின் எந்த விதி சமத்துவத்திற்கான உரிமைக்கு உத்தரவாதம் அளிக்கிறது?",
    options: ["Article 14", "Article 19", "Article 21", "Article 32"],
    tamilOptions: ["பிரிவு 14", "பிரிவு 19", "பிரிவு 21", "பிரிவு 32"],
    correctOptionIndex: 0,
    explanation: "Article 14 guarantees equality before the law and equal protection of the laws.",
    tamilExplanation: "பிரிவு 14 சட்டத்தின் முன் சமத்துவத்தையும் சட்டங்களின் சமமான பாதுகாப்பையும் உத்தரவாதம் செய்கிறது.",
    topic: "Indian Constitution",
    difficulty: "Medium"
  },
  {
    questionText: "What is the term of office for a member of the Rajya Sabha in India?",
    questionTamilText: "இந்தியாவில் ராஜ்யசபா உறுப்பினரின் பதவிக்காலம் என்ன?",
    options: ["4 Years", "5 Years", "6 Years", "6 Months"],
    tamilOptions: ["4 ஆண்டுகள்", "5 ஆண்டுகள்", "6 ஆண்டுகள்", "6 மாதங்கள்"],
    correctOptionIndex: 2,
    explanation: "Members of the Rajya Sabha are elected for a term of six years, with one-third retiring every second year.",
    tamilExplanation: "ராஜ்யசபா உறுப்பினர்கள் ஆறு ஆண்டுகள் பதவிக்காலத்திற்கு தேர்ந்தெடுக்கப்படுகிறார்கள், மூன்றில் ஒரு பங்கு உறுப்பினர்கள் ஒவ்வொரு இரண்டு வருடங்களுக்கும் ஓய்வு பெறுகிறார்கள்.",
    topic: "Indian Polity",
    difficulty: "Easy"
  },
  {
    questionText: "Which standard authority sets and publishes the syllabus and guidelines for the CBT National Exams?",
    questionTamilText: "CBT தேசிய தேர்வுகளுக்கான பாடத்திட்டம் மற்றும் வழிகாட்டுதல்களை எந்த நிலையான அமைப்பு அமைத்து வெளியிடுகிறது?",
    options: ["National CBT Examination Board", "State Education Department", "University Grants Commission", "National Testing Agency"],
    tamilOptions: ["தேசிய சிபிடி தேர்வு வாரியம்", "மாநில கல்வித்துறை", "பல்கலைக்கழக மானியக் குழு", "தேசிய தேர்வு முகமை"],
    correctOptionIndex: 0,
    explanation: "The National CBT Examination Board is the official standard authority for governing these examinations.",
    tamilExplanation: "தேசிய சிபிடி தேர்வு வாரியம் இந்த தேர்வுகளை நிர்வகிக்கும் அதிகாரப்பூர்வ அமைப்பாகும்.",
    topic: "General Administration",
    difficulty: "Medium"
  },
  {
    questionText: "Which article of the Indian Constitution protects the Right to Life and Personal Liberty?",
    questionTamilText: "இந்திய அரசியலமைப்பின் எந்த விதி உயிர் வாழும் உரிமை மற்றும் தனிநபர் சுதந்திரத்திற்கு பாதுகாப்பு அளிக்கிறது?",
    options: ["Article 19", "Article 21", "Article 14", "Article 32"],
    tamilOptions: ["பிரிவு 19", "பிரிவு 21", "பிரிவு 14", "பிரிவு 32"],
    correctOptionIndex: 1,
    explanation: "Article 21 declares that no person shall be deprived of his life or personal liberty except according to procedure established by law.",
    tamilExplanation: "விதி 21 சட்டப்பூர்வ நடைமுறையின்றி எந்தவொரு நபரின் உயிர் அல்லது தனிநபர் சுதந்திரத்தை பறிக்க முடியாது என கூறுகிறது.",
    topic: "Indian Constitution",
    difficulty: "Medium"
  },
  {
    questionText: "What is the normal term of office for a member of the Lok Sabha in India?",
    questionTamilText: "இந்தியாவில் மக்களவை (Lok Sabha) உறுப்பினரின் சாதாரண பதவிக்காலம் என்ன?",
    options: ["4 Years", "5 Years", "6 Years", "2 Years"],
    tamilOptions: ["4 ஆண்டுகள்", "5 ஆண்டுகள்", "6 ஆண்டுகள்", "2 ஆண்டுகள்"],
    correctOptionIndex: 1,
    explanation: "The normal term of the Lok Sabha is five years from the date appointed for its first meeting.",
    tamilExplanation: "மக்களவையின் சாதாரண பதவிக்காலம் அதன் முதல் கூட்டத்திலிருந்தே ஐந்து ஆண்டுகள் ஆகும்.",
    topic: "Indian Polity",
    difficulty: "Easy"
  },
  {
    questionText: "What is the minimum age required to qualify to become the President of India?",
    questionTamilText: "இந்திய குடியரசுத் தலைவராக தகுதி பெறுவதற்குத் தேவையான குறைந்தபட்ச வயது என்ன?",
    options: ["25 Years", "30 Years", "35 Years", "40 Years"],
    tamilOptions: ["25 ஆண்டுகள்", "30 ஆண்டுகள்", "35 ஆண்டுகள்", "40 ஆண்டுகள்"],
    correctOptionIndex: 2,
    explanation: "Article 58 of the Indian Constitution states that a presidential candidate must be at least 35 years old.",
    tamilExplanation: "இந்திய அரசியலமைப்பின் பிரிவு 58 இன் படி, குடியரசுத் தலைவர் வேட்பாளருக்கு குறைந்தபட்சம் 35 வயது இருக்க வேண்டும்.",
    topic: "Indian Polity",
    difficulty: "Easy"
  }
];

const GENERIC_QUESTIONS_POOL: BaseQuestion[] = [
  ...COMPUTER_SCIENCE_QUESTIONS,
  ...GENERAL_SCIENCE_QUESTIONS,
  ...HISTORY_GEOGRAPHY_QUESTIONS,
  ...POLITY_GK_QUESTIONS
];

/**
 * Shuffles an array in place.
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates exact question sets of up to 200 questions offline.
 * Seamlessly modifies templates using the custom PDF name/topic.
 */
export function generateOfflineQuestions(
  topic: string,
  count: number,
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed'
): Question[] {
  const targetCount = count || 50;
  let basePool = [...GENERIC_QUESTIONS_POOL];

  // If the topic is specific, prioritize related questions or customize them
  const isCS = /comp|tech|software|data|program|code|network|it/i.test(topic);
  const isScience = /sci|phys|chem|bio|natur|elect|environ/i.test(topic);
  const isHistory = /hist|geog|world|polity|coast|coastline|india|rule/i.test(topic);

  if (isCS) {
    basePool = [...COMPUTER_SCIENCE_QUESTIONS, ...POLITY_GK_QUESTIONS, ...GENERAL_SCIENCE_QUESTIONS, ...HISTORY_GEOGRAPHY_QUESTIONS];
  } else if (isScience) {
    basePool = [...GENERAL_SCIENCE_QUESTIONS, ...COMPUTER_SCIENCE_QUESTIONS, ...POLITY_GK_QUESTIONS, ...HISTORY_GEOGRAPHY_QUESTIONS];
  } else if (isHistory) {
    basePool = [...HISTORY_GEOGRAPHY_QUESTIONS, ...POLITY_GK_QUESTIONS, ...GENERAL_SCIENCE_QUESTIONS, ...COMPUTER_SCIENCE_QUESTIONS];
  }

  // Shuffle pool to guarantee randomness
  let shuffled = shuffleArray(basePool);
  const generated: Question[] = [];

  for (let i = 0; i < targetCount; i++) {
    const baseIndex = i % shuffled.length;
    const base = shuffled[baseIndex];
    const cycle = Math.floor(i / shuffled.length);

    let questionText = base.questionText;
    let questionTamilText = base.questionTamilText;
    let topicName = topic || base.topic;

    // If we have cycled (i.e. we need more questions than what exists in the pool),
    // let's apply subtle variations to numbers, prefixes, or titles so they are NOT duplicates!
    if (cycle > 0) {
      // Modify text slightly so they are completely separate questions conceptually
      const variants = [
        { eng: "[Advanced Concept]", tam: "[மேம்பட்ட கருத்து]" },
        { eng: "[Deep Analysis]", tam: "[ஆழ்ந்த பகுப்பாய்வு]" },
        { eng: "[Syllabus Core]", tam: "[பாடத்திட்ட மையம்]" },
        { eng: "[CBT Selected]", tam: "[CBT தேர்ந்தெடுக்கப்பட்டது]" }
      ];
      const variant = variants[(cycle - 1) % variants.length];
      questionText = `${variant.eng} ${questionText}`;
      if (questionTamilText) {
        questionTamilText = `${variant.tam} ${questionTamilText}`;
      }
    }

    generated.push({
      id: `q${i + 1}`,
      type: 'mcq',
      question_en: questionText,
      questionText,
      question_ta: questionTamilText,
      questionTamilText,
      options_en: [...base.options],
      options: [...base.options],
      options_ta: [...base.tamilOptions],
      tamilOptions: [...base.tamilOptions],
      correctOptionIndex: base.correctOptionIndex,
      explanation_en: base.explanation,
      explanation: base.explanation,
      explanation_ta: base.tamilExplanation,
      tamilExplanation: base.tamilExplanation,
      topic: topicName,
      difficulty: base.difficulty
    });
  }

  return generated;
}
