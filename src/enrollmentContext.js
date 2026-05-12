import enrollmentFixture from "../aca_calc/data/enrollment_context_2026_counties.json";
import platformConfig from "../aca_calc/data/marketplace_platforms_2026.json";

const normalizeState = (state) => (state || "").trim().toUpperCase();

const normalizeCounty = (county) => {
  let normalized = (county || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const suffix of [
    " city and borough",
    " census area",
    " municipality",
    " borough",
    " county",
    " parish",
  ]) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length).trim();
      break;
    }
  }

  return normalized;
};

const countyKeys = (county) => {
  const normalized = normalizeCounty(county);
  return [normalized, normalized.replace(/\s+/g, "")];
};

const roundCurrencyValue = (value) =>
  Number.isFinite(value) ? Math.round(value) : null;

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

export const getStatePremiumAverages = () => {
  const states = [
    ...platformConfig.healthcare_gov_states,
    ...platformConfig.state_based_marketplace_states,
  ].sort();

  const stateTotals = enrollmentFixture.records.reduce((totals, record) => {
    const stateCode = normalizeState(record.state);
    const planSelections = Number(record.marketplace_plan_selections) || 0;
    const averagePremium = Number(record.average_premium);
    const averagePremiumAfterAptc = Number(record.average_premium_after_aptc);

    if (!totals[stateCode]) {
      totals[stateCode] = {
        countyCount: 0,
        planSelections: 0,
        premiumPlanSelections: 0,
        premiumWeight: 0,
        premiumAfterAptcPlanSelections: 0,
        premiumAfterAptcWeight: 0,
      };
    }

    totals[stateCode].countyCount += 1;
    totals[stateCode].planSelections += planSelections;

    if (Number.isFinite(averagePremium) && planSelections > 0) {
      totals[stateCode].premiumPlanSelections += planSelections;
      totals[stateCode].premiumWeight += averagePremium * planSelections;
    }

    if (Number.isFinite(averagePremiumAfterAptc) && planSelections > 0) {
      totals[stateCode].premiumAfterAptcPlanSelections += planSelections;
      totals[stateCode].premiumAfterAptcWeight +=
        averagePremiumAfterAptc * planSelections;
    }

    return totals;
  }, {});

  return states.map((stateCode) => {
    const totals = stateTotals[stateCode];
    const marketplacePlatform = getMarketplacePlatform(stateCode);
    const hasWeightedPremium = Boolean(totals?.premiumPlanSelections);
    const hasWeightedPremiumAfterAptc = Boolean(
      totals?.premiumAfterAptcPlanSelections,
    );
    const fineGrainedCmsAvailable = marketplacePlatform === "HealthCare.gov";

    return {
      state: stateCode,
      marketplacePlatform,
      fineGrainedCmsAvailable,
      premiumContextAvailable: hasWeightedPremium,
      countyCount: totals?.countyCount || 0,
      marketplacePlanSelections: totals?.planSelections || null,
      averagePremium: hasWeightedPremium
        ? roundCurrencyValue(totals.premiumWeight / totals.premiumPlanSelections)
        : null,
      averagePremiumAfterAptc: hasWeightedPremiumAfterAptc
        ? roundCurrencyValue(
            totals.premiumAfterAptcWeight /
              totals.premiumAfterAptcPlanSelections,
          )
        : null,
    };
  });
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

  const selectedCountyKeys = new Set(countyKeys(county));
  const record = enrollmentFixture.records.find(
    (item) =>
      normalizeState(item.state) === stateCode &&
      countyKeys(item.county).some((key) => selectedCountyKeys.has(key)),
  );

  if (!record) {
    const location = county ? `${county}, ${stateCode}` : stateCode;
    return {
      ...baseContext,
      status: "not_in_compact_dataset",
      fineGrainedCmsAvailable: true,
      countyContextAvailable: false,
      message: `CMS county/ZIP PUF detail is available for ${stateCode}, but ${location} is not included in the checked-in compact county dataset yet.`,
    };
  }

  return {
    ...baseContext,
    ...record,
    county: record.county,
    status: "county_context_available",
    fineGrainedCmsAvailable: true,
    countyContextAvailable: true,
    message: `Fine-grained CMS county enrollment context is available for ${record.county}, ${stateCode}.`,
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
