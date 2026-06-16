// Maps common job-title keywords to BLS SOC codes.
// SOC codes are used to fetch real salary percentiles from the BLS OES API.
// Order matters: more specific keyword sets come first, broad fallbacks last.

const SOC_MAP = [
  { keywords: ['software engineer', 'software developer', 'swe', 'backend', 'frontend', 'full stack', 'fullstack'], code: '15-1252', label: 'Software Developer' },
  { keywords: ['product manager', 'product owner', 'product lead'], code: '11-2021', label: 'Product Manager' },
  { keywords: ['data scientist', 'ml engineer', 'machine learning', 'ai engineer'], code: '15-2051', label: 'Data Scientist' },
  { keywords: ['data analyst', 'business analyst', 'data engineer'], code: '15-2041', label: 'Data Analyst' },
  { keywords: ['ux designer', 'ui designer', 'product designer', 'ux', 'ui/ux', 'user experience'], code: '27-1021', label: 'UX Designer' },
  { keywords: ['graphic designer', 'visual designer', 'brand designer'], code: '27-1024', label: 'Graphic Designer' },
  { keywords: ['marketing manager', 'growth manager', 'demand gen', 'digital marketing'], code: '11-2021', label: 'Marketing Manager' },
  { keywords: ['content writer', 'copywriter', 'content strategist', 'content creator'], code: '27-3042', label: 'Writer/Author' },
  { keywords: ['sales manager', 'account executive', 'sales director', 'vp sales'], code: '11-2022', label: 'Sales Manager' },
  { keywords: ['sales rep', 'sdr', 'bdr', 'business development', 'account manager'], code: '41-3091', label: 'Sales Representative' },
  { keywords: ['project manager', 'program manager', 'scrum master', 'agile coach'], code: '11-9199', label: 'Project Manager' },
  { keywords: ['devops', 'site reliability', 'sre', 'platform engineer', 'cloud engineer', 'infrastructure'], code: '15-1244', label: 'DevOps Engineer' },
  { keywords: ['security engineer', 'cybersecurity', 'infosec', 'penetration tester'], code: '15-1212', label: 'Security Analyst' },
  { keywords: ['finance', 'financial analyst', 'fp&a', 'controller', 'cfo'], code: '13-2051', label: 'Financial Analyst' },
  { keywords: ['accountant', 'accounting', 'cpa', 'tax'], code: '13-2011', label: 'Accountant' },
  { keywords: ['human resources', 'recruiter', 'talent acquisition', 'people ops'], code: '13-1071', label: 'HR Specialist' },
  { keywords: ['operations', 'operations manager', 'biz ops', 'chief of staff'], code: '11-1021', label: 'General Manager' },
  { keywords: ['customer success', 'customer support', 'customer experience', 'csm'], code: '43-4051', label: 'Customer Service Rep' },
  { keywords: ['qa', 'quality assurance', 'test engineer', 'sdet'], code: '15-1253', label: 'Software QA Engineer' },
  { keywords: ['mobile developer', 'ios developer', 'android developer', 'react native', 'flutter'], code: '15-1252', label: 'Software Developer' },
  { keywords: ['designer'], code: '27-1021', label: 'Designer' },
  { keywords: ['engineer'], code: '17-2141', label: 'Industrial Engineer' },
  { keywords: ['manager'], code: '11-1021', label: 'General Manager' },
];

function getSocCode(jobTitle) {
  const lower = String(jobTitle || '').toLowerCase();
  for (const entry of SOC_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return { code: entry.code, label: entry.label };
    }
  }
  return { code: '11-1021', label: 'Manager/Professional' };
}

module.exports = { getSocCode };
