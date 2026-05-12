import enrollmentFixture from "../aca_calc/data/enrollment_context_sample.json";
import platformConfig from "../aca_calc/data/marketplace_platforms_2026.json";

const normalizeState = (state) => (state || "").trim().toUpperCase();

const normalizeCounty = (county) => {
  const normalized = (county || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.endsWith(" county")
    ? normalized.slice(0, -" county".length).trim()
    : normalized;
};

export const getMarketplacePlatform = (state) => {
  const stateCode = normalizeState(state);

  if (platformConfig.healthcare_gov_states.includes(stateCode)) {
    return "HealthCare.gov";
  }
  if (platformConfig.state_based_marketplace_states.includes(stateCode)) {
    return "State-based marketplace";
  }
  return "Unknown";
};

export const getEnrollmentContext = (state, county) => {
  const stateCode = normalizeState(state);
  const platform = getMarketplacePlatform(stateCode);
  const baseContext = {
    year: enrollmentFixture.year,
    state: stateCode,
    county,
    marketplacePlatform: platform,
    source: enrollmentFixture.source,
    sourceUrl: enrollmentFixture.source_url,
  };

  if (platform === "Unknown") {
    return {
      ...baseContext,
      status: "unknown_state",
      fineGrainedCmsAvailable: false,
      countyContextAvailable: false,
      message: `${stateCode || "This state"} is not recognized in the 2026 Marketplace platform configuration.`,
    };
  }

  if (platform === "State-based marketplace") {
    return {
      ...baseContext,
      status: "state_based_marketplace_fallback",
      fineGrainedCmsAvailable: false,
      countyContextAvailable: false,
      message: `${stateCode} runs a state-based marketplace. CMS county/ZIP Marketplace PUF detail is not available here, so this view falls back to state-level context only.`,
    };
  }

  const record = enrollmentFixture.records.find(
    (item) =>
      normalizeState(item.state) === stateCode &&
      normalizeCounty(item.county) === normalizeCounty(county),
  );

  if (!record) {
    const location = county ? `${county}, ${stateCode}` : stateCode;
    return {
      ...baseContext,
      status: "not_in_sample_fixture",
      fineGrainedCmsAvailable: true,
      countyContextAvailable: false,
      message: `CMS county/ZIP PUF detail is available for ${stateCode}, but ${location} is not included in this tiny checked-in sample fixture yet.`,
    };
  }

  return {
    ...baseContext,
    ...record,
    county: record.county,
    status: "county_context_available",
    fineGrainedCmsAvailable: true,
    countyContextAvailable: true,
    message: `Fine-grained CMS county enrollment context is available for ${record.county}, ${stateCode} in the sample fixture.`,
  };
};

export const formatNumber = (value) =>
  new Intl.NumberFormat("en-US").format(value || 0);

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);

export const platformConfig2026 = platformConfig;
export const enrollmentSample = enrollmentFixture;
