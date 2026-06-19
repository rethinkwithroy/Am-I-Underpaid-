// BLS OEWS (Occupational Employment & Wage Statistics) helper.
// Returns the real national ANNUAL MEDIAN salary for a given SOC code, or null.
//
// OEWS series ID format (verified against the live BLS API):
//   OE | U | N | <area 7> | <industry 6> | <occupation 6> | <datatype 2>
//     OE         prefix
//     U          not seasonally adjusted
//     N          national
//     0000000    national area code
//     000000     all industries (cross-industry)
//     <SOC6>     SOC code, no dash (e.g. 15-1252 -> 151252)
//     <datatype> 13 = annual median wage, 04 = annual mean wage
//
// Example (Software Developers, national, annual median): OEUN000000000000015125213
// We request "latest" so we always get the most recent published year automatically.

const BLS_ENDPOINT = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
const NATIONAL_AREA = '0000000'; // 7 digits
const ALL_INDUSTRIES = '000000'; // 6 digits
const DT_ANNUAL_MEDIAN = '13';
const DT_ANNUAL_MEAN = '04';

function buildSeriesId(soc6, datatype) {
  return `OEUN${NATIONAL_AREA}${ALL_INDUSTRIES}${soc6}${datatype}`;
}

async function fetchBLSSalary(socCode) {
  const soc6 = String(socCode).replace('-', '').padEnd(6, '0').slice(0, 6);
  const medianSeries = buildSeriesId(soc6, DT_ANNUAL_MEDIAN);
  const meanSeries = buildSeriesId(soc6, DT_ANNUAL_MEAN);

  const body = {
    seriesid: [medianSeries, meanSeries],
    latest: true, // most recent published year, no need to hard-code years
  };
  if (process.env.BLS_API_KEY) {
    body.registrationkey = process.env.BLS_API_KEY;
  }

  try {
    const res = await fetch(BLS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    if (data.status !== 'REQUEST_SUCCEEDED' || !Array.isArray(data.Results?.series)) {
      return null;
    }

    const byId = {};
    for (const s of data.Results.series) {
      if (s.data && s.data.length) byId[s.seriesID] = s.data[0];
    }

    // Prefer the true median; fall back to the mean if median isn't published.
    const point = byId[medianSeries] || byId[meanSeries];
    if (!point || !Number.isFinite(parseFloat(point.value))) return null;

    return {
      median: Math.round(parseFloat(point.value)), // OEWS annual values are already yearly USD
      isMedian: Boolean(byId[medianSeries]),
      source: 'Bureau of Labor Statistics (BLS OEWS)',
      year: point.year,
    };
  } catch {
    return null;
  }
}

module.exports = { fetchBLSSalary };
