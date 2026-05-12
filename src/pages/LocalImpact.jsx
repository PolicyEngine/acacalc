import { useMemo, useState } from "react";
import countiesByState from "../../counties.json";
import cliffDemoData from "../data/households/cliff_demo.json";
import {
  formatCurrency,
  formatNumber,
  getEnrollmentContext,
  getMarketplacePlatform,
  platformConfig2026,
} from "../enrollmentContext";
import "./LocalImpact.css";

const DEFAULT_STATE = "TX";
const DEFAULT_COUNTY = "Travis County";

const getCountyOptions = (state) => [...(countiesByState[state] || [])].sort();

const statusText = {
  county_context_available: "County context available",
  state_based_marketplace_fallback: "State-level fallback",
  not_in_compact_dataset: "Available in full PUF",
  unknown_state: "Unknown state",
};

const getStateLabel = (state) => {
  const platform = getMarketplacePlatform(state);
  if (platform === "HealthCare.gov") {
    return `${state} - HealthCare.gov county/ZIP PUF`;
  }
  if (platform === "State-based marketplace") {
    return `${state} - state-level/fallback only`;
  }
  return state;
};

function Metric({ label, value, detail }) {
  return (
    <div className="local-metric">
      <span className="local-metric-label">{label}</span>
      <strong>{value}</strong>
      {detail && <span className="local-metric-detail">{detail}</span>}
    </div>
  );
}

function LocalImpact() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [county, setCounty] = useState(DEFAULT_COUNTY);
  const [subsidyLoss, setSubsidyLoss] = useState(
    Math.round(cliffDemoData.at_650_fpl.cliff_loss_annual),
  );

  const stateOptions = useMemo(
    () => Object.keys(countiesByState).sort(),
    [],
  );
  const countyOptions = useMemo(() => getCountyOptions(state), [state]);
  const selectedCounty = countyOptions.includes(county)
    ? county
    : countyOptions[0] || "";

  const context = useMemo(
    () => getEnrollmentContext(state, selectedCounty),
    [state, selectedCounty],
  );

  const demoLoss = Math.round(cliffDemoData.at_650_fpl.cliff_loss_annual);
  const hasSubsidyLoss = Number(subsidyLoss) > 0;
  const location = `${selectedCounty}, ${state}`;

  const handleStateChange = (event) => {
    const nextState = event.target.value;
    setState(nextState);
    setCounty(getCountyOptions(nextState)[0] || "");
  };

  const pairedImpactText = () => {
    if (!hasSubsidyLoss) {
      return "Enter a household subsidy loss from the calculator to pair it with local enrollment scale.";
    }

    if (context.countyContextAvailable) {
      return `${formatCurrency(subsidyLoss)} in modeled annual household subsidy loss sits alongside ${formatNumber(context.marketplace_plan_selections)} marketplace consumers who selected plans in ${location}; fine-grained enrollment context is available here.`;
    }

    if (context.fineGrainedCmsAvailable) {
      return `${formatCurrency(subsidyLoss)} in modeled annual household subsidy loss can be paired with county enrollment context once this geography is added to the compact CMS dataset.`;
    }

    return `${formatCurrency(subsidyLoss)} in modeled annual household subsidy loss is shown with a fallback note because fine-grained CMS county/ZIP enrollment context is unavailable for ${state}.`;
  };

  return (
    <main className="local-impact-page">
      <section className="local-impact-heading">
        <p className="eyebrow">Local impact</p>
        <h2>Pair household subsidy changes with Marketplace enrollment scale</h2>
        <p>
          Select a geography, then connect the calculator's household-level
          subsidy loss to CMS Marketplace enrollment context.
        </p>
      </section>

      <section className="local-impact-grid">
        <div className="local-panel local-selector-panel">
          <div className="local-panel-header">
            <h3>Geography</h3>
            <span className="local-year">2026 OEP</span>
          </div>

          <label className="local-field">
            <span>State</span>
            <select value={state} onChange={handleStateChange}>
              {stateOptions.map((stateCode) => (
                <option key={stateCode} value={stateCode}>
                  {getStateLabel(stateCode)}
                </option>
              ))}
            </select>
          </label>

          <label className="local-field">
            <span>County</span>
            <select
              value={selectedCounty}
              onChange={(event) => setCounty(event.target.value)}
              disabled={countyOptions.length === 0}
            >
              {countyOptions.map((countyName) => (
                <option key={countyName} value={countyName}>
                  {countyName}
                </option>
              ))}
            </select>
          </label>

          <div className="local-platform-summary">
            <span className="local-platform-label">Marketplace platform</span>
            <strong>{context.marketplacePlatform}</strong>
            <p>{platformConfig2026.fine_grained_puf_note}</p>
          </div>
        </div>

        <div className="local-panel local-context-panel">
          <div className="local-panel-header">
            <h3>{location}</h3>
            <span className={`status-pill status-${context.status}`}>
              {statusText[context.status] || "Context"}
            </span>
          </div>

          <p className="local-message">{context.message}</p>

          {context.countyContextAvailable ? (
            <div className="local-metric-grid">
              <Metric
                label="Marketplace plan selections"
                value={formatNumber(context.marketplace_plan_selections)}
                detail={`County FIPS ${context.county_fips}`}
              />
              <Metric
                label="APTC consumers"
                value={formatNumber(context.aptc_consumers)}
                detail={`${formatNumber(context.consumers_with_aptc_or_csr)} with APTC or CSR`}
              />
              <Metric
                label="Average APTC"
                value={`${formatCurrency(context.average_aptc)}/mo`}
                detail="Among APTC consumers"
              />
              <Metric
                label="Average premium after APTC"
                value={`${formatCurrency(context.average_premium_after_aptc)}/mo`}
                detail={`${formatNumber(context.consumers_premium_after_aptc_lte_10)} at $10 or less`}
              />
            </div>
          ) : (
            <div className="local-fallback">
              <strong>
                {context.fineGrainedCmsAvailable
                  ? "Full-PUF ingestion needed"
                  : "State-level/fallback only"}
              </strong>
              <p>
                {context.fineGrainedCmsAvailable
                  ? "This HealthCare.gov state has CMS county/ZIP PUF detail, but this county is not matched in the compact dataset yet."
                  : "State-based marketplace enrollment detail is reported outside the CMS county/ZIP PUF structure used in this first slice."}
              </p>
            </div>
          )}
        </div>

        <div className="local-panel local-impact-panel">
          <div className="local-panel-header">
            <h3>Household impact pairing</h3>
          </div>

          <label className="local-field">
            <span>Annual household subsidy loss</span>
            <input
              type="number"
              min="0"
              step="100"
              value={subsidyLoss}
              onChange={(event) => setSubsidyLoss(event.target.value)}
            />
          </label>

          <div className="local-impact-actions">
            <button type="button" onClick={() => setSubsidyLoss(demoLoss)}>
              Use demo result
            </button>
            <span>
              Demo: {formatCurrency(demoLoss)}/year from the existing cliff
              household fixture
            </span>
          </div>

          <div className="local-impact-copy">
            <p>{pairedImpactText()}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LocalImpact;
