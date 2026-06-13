// Scholarship Finder 2026 data and WhatsApp menu helpers.
// Data is compiled from the user's provided scholarship bot/PDF list.

const scholarships = [
  {
    name: 'KFUPM Graduate Scholarship 2026',
    country: 'Saudi Arabia',
    level: ['ms', 'phd'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme'],
    ielts: true,
    deadline: 'April 26, 2026 (check next cycle)',
    benefits: ['Full tuition', 'Monthly stipend', 'Free furnished accommodation', 'Medical and dental care', 'Round-trip airfare', 'Free textbooks and subsidized meals', 'Research assistantship'],
    eligibility: ['4-year Bachelor degree, GPA 3.0/4.0', 'IELTS 6.0 / TOEFL 70 / Duolingo 105', 'Fields include AI, Cybersecurity, Robotics, CS, Petroleum, Business Analytics'],
    link: 'https://cgis.kfupm.edu.sa/admission/kfupm-scholarship'
  },
  {
    name: 'Koc University Turkey Scholarship 2026',
    country: 'Turkey',
    level: ['ms', 'phd'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam', 'med'],
    ielts: false,
    deadline: 'Check per school deadline',
    benefits: ['Full tuition waiver', 'Monthly stipend for MS/PhD', 'Free furnished housing near campus', 'Private health insurance', 'Meal card for PhD', 'Conference travel support'],
    eligibility: ['All nationalities', 'TOEFL iBT 80+; IELTS is not accepted in Turkey', 'GRE/GMAT for some programs', 'Fields include CS, EE, ME, Chemistry, Materials, Bio, Medicine, Physics, Math'],
    link: 'https://gsse.ku.edu.tr/en/application/application-deadlines/'
  },
  {
    name: 'Berlin DAAD MIDE Scholarship 2026',
    country: 'Germany',
    level: ['ms'],
    depts: ['cis', 'dpam'],
    ielts: false,
    deadline: 'August 31, 2026',
    benefits: ['EUR 934/month stipend', 'Health, accident and liability insurance', 'Travel allowance', 'Rent subsidy in some cases'],
    eligibility: ['From a developing country', '2+ years work experience after graduation', '180 ECTS first degree, 15+ ECTS in Economics/related', 'English proficiency; IELTS may be waived if English was medium of instruction'],
    link: 'https://mide.htw-berlin.de/applying/#c67981'
  },
  {
    name: 'University of Twente Scholarship 2026',
    country: 'Netherlands',
    level: ['ms'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam'],
    ielts: true,
    deadline: 'May 1, 2026',
    benefits: ['EUR 3,000 to EUR 22,000 per year', 'Kipaji top-up: extra EUR 12,000 for developing countries', 'Renewable for 2nd year'],
    eligibility: ['Non-EU/EEA citizens only', 'IELTS 6.5 / TOEFL 90 minimum', 'Must be admitted to an eligible Master program first'],
    link: 'https://www.utwente.nl/en/education/scholarship-finder/application-forms/preapl-uts/'
  },
  {
    name: 'UNSW Graduate Scholarships 2026-2027',
    country: 'Australia',
    level: ['ms', 'phd'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam', 'med'],
    ielts: true,
    deadline: 'Check next round (April 2026 passed)',
    benefits: ['Full tuition and fees', 'Monthly stipend', 'Accommodation and travel support'],
    eligibility: ['All nationalities', 'IELTS 6.5 overall / 6.0 each band; waiver possible for prior English study', 'Must find a supervisor before applying'],
    link: 'https://www.unsw.edu.au/research/hdr/application'
  },
  {
    name: 'Australian Government RTP Scholarship 2026',
    country: 'Australia',
    level: ['ms', 'phd'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam', 'med'],
    ielts: false,
    deadline: 'Varies by university',
    benefits: ['Full tuition offset', 'AUD 52,352 to AUD 53,608 annual stipend', 'Ancillary cost allowances'],
    eligibility: ['All nationalities', 'Bachelor degree from recognized university', 'Must meet Masters by Research or Doctoral requirements'],
    link: 'https://www.education.gov.au/research-block-grants/research-training-program'
  },
  {
    name: 'Monash Graduate Scholarship CF-MGS 2026',
    country: 'Australia',
    level: ['ms', 'phd'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam', 'med'],
    ielts: true,
    deadline: 'August 31, 2026',
    benefits: ['AUD 37,145 annual stipend', 'Relocation allowance', 'Tuition scholarship for international students'],
    eligibility: ['All nationalities', 'Research Masters or Doctorate only', 'Strong academic record required'],
    link: 'https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship/co-funded-monash-graduate-scholarship-cf-mgs'
  },
  {
    name: 'University of Alberta Scholarship 2026-2027',
    country: 'Canada',
    level: ['ms', 'phd'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam', 'med'],
    ielts: true,
    deadline: 'Varies by department',
    benefits: ['CAD 17,500 stipend for MS / CAD 21,000 for PhD', 'Additional CAD 10,000 toward fees', 'CGRS-D: CAD 40,000/year for 3 years', 'Alberta Graduate Excellence: CAD 11,000 to CAD 15,000'],
    eligibility: ['All nationalities', 'Outstanding academic record', 'IELTS/TOEFL required', 'Newly admitted to MS or PhD program'],
    link: 'https://www.ualberta.ca/en/graduate-studies/admissions-programs/apply/application-portal-change.html'
  },
  {
    name: 'Queen Elizabeth Commonwealth Scholarship QECS 2026',
    country: 'UK / Commonwealth',
    level: ['ms'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam', 'med'],
    ielts: false,
    deadline: 'June 3, 2026',
    benefits: ['Full tuition fees', 'Living allowance stipend', 'Return economy flights', 'Arrival allowance', 'Research Support Grant on request'],
    eligibility: ['Citizen of a Commonwealth country', 'Must hold a Bachelor degree', 'No age limit', 'No IELTS required'],
    link: 'https://www.acu.ac.uk/funding-opportunities/for-students/scholarships/queen-elizabeth-commonwealth-scholarships/'
  },
  {
    name: 'Joint Japan World Bank Scholarship 2026',
    country: 'USA, UK, Europe, Asia, Australia',
    level: ['ms'],
    depts: ['cis', 'dpam', 'me', 'dchem', 'ee'],
    ielts: false,
    deadline: 'May 29, 2026 (Window 2)',
    benefits: ['Economy class air travel both ways plus USD 500 travel allowance', 'Full tuition and basic medical insurance', 'Monthly subsistence allowance'],
    eligibility: ['National of World Bank member developing country', 'No dual citizenship of developed country', 'Bachelor degree earned 3+ years ago', '3+ years development-related work experience', 'Currently employed full-time in development work'],
    link: 'https://www.worldbank.org/en/programs/scholarships/jj-wbgsp'
  },
  {
    name: 'Erasmus Mundus CLIDE Scholarship 2026-2028',
    country: 'Europe (Poland, Spain, Austria, Morocco)',
    level: ['ms'],
    depts: ['cis', 'dpam'],
    ielts: false,
    deadline: 'April 15, 2026 (check next round)',
    benefits: ['Full tuition waiver', 'EUR 1,400/month for 24 months', 'Health and accident insurance', 'Mobility/travel costs covered'],
    eligibility: ['All nationalities', 'Bachelor degree or final year', 'English B2 level', 'Must study in 2+ countries'],
    link: 'https://clide.umk.pl/pages/home/'
  },
  {
    name: 'University of Siena International Excellence Scholarship 2026',
    country: 'Italy',
    level: ['ms'],
    depts: ['cis', 'dpam', 'dchem', 'ee', 'me'],
    ielts: false,
    deadline: 'May 6, 2026',
    benefits: ['EUR 6,000/year grant; EUR 12,000 total if renewed', 'No IELTS required', 'EUR 10 application fee'],
    eligibility: ['Non-Italian citizenship', 'Not resident of Italy', 'Bachelor degree obtained outside Italy', 'Fields include AI, Engineering, Applied Math, Chemistry, Electronics, Biotech'],
    link: 'https://admission.unisi.it/?p=2283'
  },
  {
    name: 'Estonia Government Scholarships 2026',
    country: 'Estonia',
    level: ['bs', 'ms', 'phd'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam', 'med'],
    ielts: false,
    deadline: 'May 1, 2026',
    benefits: ['Full tuition for selected programs', 'Monthly living stipend', 'International travel grants', 'Health insurance', 'Accommodation assistance'],
    eligibility: ['All international students', 'BS, MS, PhD or short programs', 'Academic and language requirements vary', 'No IELTS required'],
    link: 'https://harno.ee/en/scholarships-and-grants/scholarships-studying-and-working-estonia/scholarships-international'
  },
  {
    name: 'Kazakhstan Government Scholarships 2026-2027',
    country: 'Kazakhstan',
    level: ['bs', 'ms', 'phd'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam', 'med'],
    ielts: false,
    deadline: 'May 31, 2026',
    benefits: ['Full tuition fee', 'Monthly allowance', '550 slots: 490 BS, 50 MS, 10 PhD', 'No IELTS required'],
    eligibility: ['All nationalities', 'Minimum GPA 2.33/4.0', 'English, German, or French proficiency'],
    link: 'https://bolashak.gov.kz/kz/ctipendiyaly-badarlama'
  },
  {
    name: 'UMY University Scholarship Indonesia 2026',
    country: 'Indonesia',
    level: ['bs', 'ms', 'phd'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dpam', 'med'],
    ielts: false,
    deadline: 'May 31, 2026',
    benefits: ['Full tuition', 'Stipend: BS IDR 1,850,000 / MS IDR 2,350,000 / PhD IDR 2,600,000', 'Dormitory accommodation', 'Health coverage', 'Indonesian language course'],
    eligibility: ['All international students', 'English proficiency; IELTS waiver if prior English education'],
    link: 'https://internationaladmissions.umy.ac.id/'
  },
  {
    name: 'Macquarie University International Scholarship 2026',
    country: 'Australia',
    level: ['bs', 'ms'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dpam', 'med'],
    ielts: true,
    deadline: 'Check official website',
    benefits: ['Up to AUD 10,000 toward tuition'],
    eligibility: ['All countries except Australia and New Zealand', 'Minimum WAM 65 for postgraduate / ATAR 85 for undergraduate', 'Full-time on-campus study only'],
    link: 'https://www.mq.edu.au/study/admissions-and-entry/apply/international'
  },
  {
    name: 'Croatia Government Bilateral Scholarships 2026-2027',
    country: 'Croatia',
    level: ['bs', 'ms', 'phd'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam', 'med'],
    ielts: false,
    deadline: 'April 10, 2026 (check next cycle)',
    benefits: ['Tuition coverage', 'Monthly stipend in some cases', 'Accommodation support'],
    eligibility: ['Pool 1: countries with bilateral agreements', 'Pool 2: students studying Croatian/Slavic Studies worldwide'],
    link: 'https://www.ampeu.hr/scholarship_application/'
  },
  {
    name: 'University of Padua International Excellence Scholarship 2026',
    country: 'Italy',
    level: ['bs', 'ms'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam', 'med'],
    ielts: false,
    deadline: 'May 2, 2026',
    benefits: ['Full tuition waiver', 'EUR 8,000 living allowance', 'Free/subsidized meals and accommodation'],
    eligibility: ['All nationalities', 'Family income ISEE below EUR 26,306 or equivalent abroad', 'Age under 30 at deadline'],
    link: 'https://www.unipd.it/en/padua-excellence'
  },
  {
    name: 'University of Bologna Scholarships 2026',
    country: 'Italy',
    level: ['bs', 'ms'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam', 'med'],
    ielts: false,
    deadline: 'Varies by opportunity',
    benefits: ['Full or partial tuition waiver', 'Financial grants for living expenses'],
    eligibility: ['All nationalities', 'SAT test for BS or GRE test for MS', 'ISEE EUR 16,000 to EUR 35,000 or equivalent', 'Age under 30'],
    link: 'https://bandi.unibo.it/agevolazioni/opportunita?tipobando=agevolazioni%23borse-mobilita'
  },
  {
    name: 'UAE University UAEU Scholarship 2026',
    country: 'United Arab Emirates',
    level: ['bs', 'ms', 'phd'],
    depts: ['cis', 'ee', 'me', 'dchem', 'dmme', 'dpam', 'med'],
    ielts: true,
    deadline: 'Postgraduate: April 30, 2026',
    benefits: ['Full tuition for BS', 'Teaching and Research Assistantships for MS/PhD', 'Living stipends'],
    eligibility: ['All nationalities', 'Minimum GPA 3.0/4.0 for postgraduate', 'IELTS/TOEFL required'],
    link: 'https://www.uaeu.ac.ae/en/admission/undergraduate-scholarships.shtml'
  },
  {
    name: "King's College London Sanctuary Scholarship 2026",
    country: 'United Kingdom',
    level: ['bs', 'ms'],
    depts: ['med'],
    ielts: false,
    deadline: 'May 5, 2026',
    benefits: ['Full tuition fee waiver', 'GBP 20,000 living stipend', 'Academic and personal support'],
    eligibility: ['Asylum seekers or displaced persons only', 'One-year in-person program at KCL', 'Starting September 2026', 'Open to applicants in UK or abroad'],
    link: 'https://www.kcl.ac.uk/study-legacy/funding/sanctuary-scholarship-2026-27'
  }
];

const DEPARTMENTS = {
  '1': { key: 'cis', emoji: '💻', name: 'CIS - Computer and Information Sciences' },
  '2': { key: 'dpam', emoji: '⚛️', name: 'DPAM - Physics and Applied Mathematics' },
  '3': { key: 'dmme', emoji: '⚙️', name: 'DMME - Materials and Metallurgical Engineering' },
  '4': { key: 'me', emoji: '🔧', name: 'ME - Mechanical Engineering' },
  '5': { key: 'dchem', emoji: '🧪', name: 'DCHEM - Chemical Engineering' },
  '6': { key: 'ee', emoji: '⚡', name: 'EE - Electrical Engineering' },
  '7': { key: 'med', emoji: '🏥', name: 'MED - Medical Sciences (MBBS/BDS/Pharma/Biomedical)' },
  '8': { key: 'all', emoji: '🌐', name: 'ALL - Show All Departments' }
};

const DEGREE_LEVELS = {
  '1': { key: 'bs', emoji: '🎓', name: "Bachelor's (BS/BE/BSc)" },
  '2': { key: 'ms', emoji: '📚', name: "Master's (MS/MSc/MBA)" },
  '3': { key: 'phd', emoji: '🔬', name: 'PhD / Doctoral' }
};

const DEGREE_MENU = `🎓 *Scholarship Finder 2026*
━━━━━━━━━━━━━━━━━━━━
Select your *degree level:*

1️⃣ 🎓 *Bachelor's* (BS/BE/BSc)
2️⃣ 📚 *Master's* (MS/MSc/MBA)
3️⃣ 🔬 *PhD / Doctoral*

0️⃣ ⬅️ Back to Main Menu`;

function buildDeptMenu(levelKey) {
  const lvl = Object.values(DEGREE_LEVELS).find(d => d.key === levelKey);
  let msg = `${lvl?.emoji || '🎓'} *${lvl?.name || 'Selected Degree'}*\n`;
  msg += '━━━━━━━━━━━━━━━━━━━━\n';
  msg += 'Select your *department:*\n\n';
  for (const [num, dept] of Object.entries(DEPARTMENTS)) {
    msg += `${num}️⃣ ${dept.emoji} *${dept.name}*\n`;
  }
  msg += '\n0️⃣ ⬅️ Back to Main Menu';
  return msg;
}

function filterScholarships(levelKey, deptKey) {
  return scholarships.filter(s => {
    const levelMatch = s.level.includes(levelKey);
    const deptMatch = deptKey === 'all' || s.depts.includes(deptKey);
    return levelMatch && deptMatch;
  });
}

function formatCard(s, index) {
  return [
    '━━━━━━━━━━━━━━━━━━━━',
    `*${index + 1}. ${s.name}*`,
    `🌍 *Country:* ${s.country}`,
    `📅 *Deadline:* ${s.deadline}`,
    `🔤 *IELTS:* ${s.ielts ? 'Required' : 'Not required ✅'}`,
    `💰 *Benefits:*\n✅ ${s.benefits.join('\n✅ ')}`,
    `📋 *Eligibility:*\n• ${s.eligibility.join('\n• ')}`,
    `🔗 *Apply:* ${s.link}`
  ].join('\n');
}

function chunkMessages(header, cards, footer, maxLength = 3500) {
  const chunks = [];
  let current = header;
  for (const card of cards) {
    const next = `${current}\n\n${card}`;
    if (next.length > maxLength && current.trim()) {
      chunks.push(current.trim());
      current = card;
    } else {
      current = next;
    }
  }
  const finalChunk = `${current}\n\n${footer}`.trim();
  if (finalChunk.length > maxLength) {
    if (current.trim()) chunks.push(current.trim());
    chunks.push(footer.trim());
  } else {
    chunks.push(finalChunk);
  }
  return chunks;
}

function buildScholarshipMessages(levelKey, deptKey) {
  const list = filterScholarships(levelKey, deptKey);
  const lvl = Object.values(DEGREE_LEVELS).find(d => d.key === levelKey);
  const dept = Object.values(DEPARTMENTS).find(d => d.key === deptKey);
  const deptName = deptKey === 'all' ? 'All Departments' : (dept?.name || deptKey);

  if (!list.length) {
    return [`😔 No scholarships found for:\n• Level: ${lvl?.emoji || ''} ${lvl?.name || levelKey}\n• Department: ${deptName}\n\nTry *ALL* departments or another level.\n\nType *3* to search again | *menu* for main menu`];
  }

  const header = `${lvl?.emoji || '🎓'} *${lvl?.name || levelKey} Scholarships 2026*\n${deptName}\n📊 *${list.length} Scholarships Found*`;
  const cards = list.map(formatCard);
  const footer = '━━━━━━━━━━━━━━━━━━━━\nType *3* to search again | *menu* for main menu';
  return chunkMessages(header, cards, footer);
}

module.exports = {
  scholarships,
  DEPARTMENTS,
  DEGREE_LEVELS,
  DEGREE_MENU,
  buildDeptMenu,
  buildScholarshipMessages
};
