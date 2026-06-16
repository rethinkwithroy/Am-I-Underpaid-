// BLS OES (Occupational Employment Statistics) helper.
// Returns real national median annual salary for a given SOC code, or null.
//
// Series ID format for national OES data:
//   "OESM" + "0000000" (national area) + SOC code (no dash) + datatype "04" (annual median)
// BLS publishes both hourly (datatype 03) and annual (datatype 04) series; we request
// the annual median directly and only fall back to hourly * 2080 if needed.

const BLS_ENDPOINT = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

async function fetchBLSSalary(socCode) {
  const cleanCode = String(socCode).replace('-', ''); // e.g. "151252"
  // National area code is 0000000; pad SOC to 6 digits.
  const padded = cleanCode.padEnd(6, '0');
  const annualMedianSeries = `OESM0000000${padded}04`; // datatype 04 = annual median wage
  const hourlyMedianSeries = `OESM0000000${padded}03`; // datatype 03 = hourly median wage

  const body = {
    seriesid: [annualMedianSeries, hourlyMedianSeries],
    startyear: '2023',
    endyear: '2024',
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

    const seriesById = {};
    for (const s of data.Results.series) {
      if (s.data && s.data.length) seriesById[s.seriesID] = s.data[0];
    }

    const annual = seriesById[annualMedianSeries];
    if (annual && Number.isFinite(parseFloat(annual.value))) {
      return {
        median: Math.round(parseFloat(annual.value)),
        source: 'Bureau of Labor Statistics (BLS OES)',
        year: annual.year,
      };
    }

    const hourly = seriesById[hourlyMedianSeries];
    if (hourly && Number.isFinite(parseFloat(hourly.value))) {
      return {
        median: Math.round(parseFloat(hourly.value) * 2080), // 52 weeks x 40 hours
        source: 'Bureau of Labor Statistics (BLS OES)',
        year: hourly.year,
      };
    }

    return null;
  } catch {
    return null;
  }
}

module.exports = { fetchBLSSalary };
