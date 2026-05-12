import { useMemo } from "react";
import {
  formatCurrency,
  formatNumber,
  getStatePremiumAverages,
} from "../enrollmentContext";

const STATE_TILE_LAYOUT = [
  { state: "AK", row: 1, col: 1 },
  { state: "ME", row: 1, col: 12 },
  { state: "VT", row: 2, col: 10 },
  { state: "NH", row: 2, col: 11 },
  { state: "MA", row: 2, col: 12 },
  { state: "WA", row: 3, col: 1 },
  { state: "ID", row: 3, col: 2 },
  { state: "MT", row: 3, col: 3 },
  { state: "ND", row: 3, col: 4 },
  { state: "MN", row: 3, col: 5 },
  { state: "WI", row: 3, col: 6 },
  { state: "MI", row: 3, col: 7 },
  { state: "NY", row: 3, col: 9 },
  { state: "RI", row: 3, col: 11 },
  { state: "CT", row: 3, col: 12 },
  { state: "OR", row: 4, col: 1 },
  { state: "NV", row: 4, col: 2 },
  { state: "WY", row: 4, col: 3 },
  { state: "SD", row: 4, col: 4 },
  { state: "IA", row: 4, col: 5 },
  { state: "IL", row: 4, col: 6 },
  { state: "IN", row: 4, col: 7 },
  { state: "OH", row: 4, col: 8 },
  { state: "PA", row: 4, col: 9 },
  { state: "NJ", row: 4, col: 10 },
  { state: "CA", row: 5, col: 1 },
  { state: "UT", row: 5, col: 2 },
  { state: "CO", row: 5, col: 3 },
  { state: "NE", row: 5, col: 4 },
  { state: "MO", row: 5, col: 5 },
  { state: "KY", row: 5, col: 6 },
  { state: "WV", row: 5, col: 7 },
  { state: "VA", row: 5, col: 8 },
  { state: "MD", row: 5, col: 9 },
  { state: "DE", row: 5, col: 10 },
  { state: "DC", row: 5, col: 11 },
  { state: "AZ", row: 6, col: 2 },
  { state: "NM", row: 6, col: 3 },
  { state: "KS", row: 6, col: 4 },
  { state: "AR", row: 6, col: 5 },
  { state: "TN", row: 6, col: 6 },
  { state: "NC", row: 6, col: 7 },
  { state: "SC", row: 6, col: 8 },
  { state: "HI", row: 7, col: 1 },
  { state: "OK", row: 7, col: 4 },
  { state: "LA", row: 7, col: 5 },
  { state: "MS", row: 7, col: 6 },
  { state: "AL", row: 7, col: 7 },
  { state: "GA", row: 7, col: 8 },
  { state: "TX", row: 8, col: 4 },
  { state: "FL", row: 8, col: 9 },
];

const STATE_NAMES = {
  AK: "Alaska",
  AL: "Alabama",
  AR: "Arkansas",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DC: "District of Columbia",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  IA: "Iowa",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  MA: "Massachusetts",
  MD: "Maryland",
  ME: "Maine",
  MI: "Michigan",
  MN: "Minnesota",
  MO: "Missouri",
  MS: "Mississippi",
  MT: "Montana",
  NC: "North Carolina",
  ND: "North Dakota",
  NE: "Nebraska",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NV: "Nevada",
  NY: "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VA: "Virginia",
  VT: "Vermont",
  WA: "Washington",
  WI: "Wisconsin",
  WV: "West Virginia",
  WY: "Wyoming",
};

const PREMIUM_COLORS = [
  "premium-bucket-1",
  "premium-bucket-2",
  "premium-bucket-3",
  "premium-bucket-4",
  "premium-bucket-5",
];

const buildPremiumScale = (averages) => {
  const values = averages
    .map((item) => item.averagePremium)
    .filter((value) => Number.isFinite(value));
  const min = Math.floor(Math.min(...values) / 50) * 50;
  const max = Math.ceil(Math.max(...values) / 50) * 50;
  const step = (max - min) / PREMIUM_COLORS.length;

  return PREMIUM_COLORS.map((className, index) => {
    const start = Math.round(min + step * index);
    const end = Math.round(min + step * (index + 1));
    return {
      className,
      min: start,
      max: end,
      label:
        index === PREMIUM_COLORS.length - 1
          ? `${formatCurrency(start)}+`
          : `${formatCurrency(start)}-${formatCurrency(end)}`,
    };
  });
};

const premiumBucketFor = (averagePremium, scale) => {
  if (!Number.isFinite(averagePremium)) {
    return null;
  }

  return (
    scale.find(
      (bucket, index) =>
        averagePremium >= bucket.min &&
        (averagePremium < bucket.max || index === scale.length - 1),
    ) || scale[scale.length - 1]
  );
};

function StatePremiumMap({ selectedState, onSelectState }) {
  const stateAverages = useMemo(() => getStatePremiumAverages(), []);
  const scale = useMemo(() => buildPremiumScale(stateAverages), [stateAverages]);
  const averagesByState = useMemo(
    () =>
      Object.fromEntries(
        stateAverages.map((stateAverage) => [
          stateAverage.state,
          stateAverage,
        ]),
      ),
    [stateAverages],
  );
  const selectedPremium = averagesByState[selectedState];
  const availableStates = stateAverages.filter(
    (stateAverage) => stateAverage.premiumContextAvailable,
  );

  return (
    <section className="local-panel local-map-panel">
      <div className="local-panel-header">
        <div>
          <h3>Average premium by state</h3>
          <p>
            Weighted by Marketplace plan selections across CMS county records.
          </p>
        </div>
        <span className="local-year">2026 OEP</span>
      </div>

      <div
        className="premium-map-grid"
        role="group"
        aria-label="Average monthly Marketplace premium by state"
      >
        {STATE_TILE_LAYOUT.map(({ state, row, col }) => {
          const premium = averagesByState[state];
          const bucket = premiumBucketFor(premium?.averagePremium, scale);
          const isSelected = selectedState === state;
          const isAvailable = premium?.premiumContextAvailable;
          const tileLabel = isAvailable
            ? `${STATE_NAMES[state]}, average premium ${formatCurrency(premium.averagePremium)} per month`
            : `${STATE_NAMES[state]}, CMS county premium detail unavailable`;

          return (
            <button
              aria-label={tileLabel}
              className={[
                "premium-state-tile",
                bucket?.className || "premium-unavailable",
                isSelected ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={state}
              onClick={() => onSelectState(state)}
              style={{ gridColumn: col, gridRow: row }}
              title={tileLabel}
              type="button"
            >
              <span>{state}</span>
            </button>
          );
        })}
      </div>

      <div className="premium-map-footer">
        <div className="premium-map-legend" aria-label="Premium color scale">
          {scale.map((bucket) => (
            <span className="premium-legend-item" key={bucket.className}>
              <span className={`premium-legend-swatch ${bucket.className}`} />
              {bucket.label}
            </span>
          ))}
          <span className="premium-legend-item">
            <span className="premium-legend-swatch premium-unavailable" />
            Unavailable
          </span>
        </div>

        <div className="premium-map-summary">
          <span>{selectedState} average premium</span>
          <strong>
            {selectedPremium?.premiumContextAvailable
              ? `${formatCurrency(selectedPremium.averagePremium)}/mo`
              : "No CMS county premium data"}
          </strong>
          <p>
            {selectedPremium?.premiumContextAvailable
              ? `${formatNumber(selectedPremium.marketplacePlanSelections)} plan selections across ${formatNumber(selectedPremium.countyCount)} county records; average after APTC is ${formatCurrency(selectedPremium.averagePremiumAfterAptc)}/mo.`
              : `${selectedState} is selectable, but CMS does not publish county-level Marketplace premium context for this platform in the County/ZIP PUF.`}
          </p>
        </div>
      </div>

      <p className="premium-map-note">
        Map includes {formatNumber(availableStates.length)} HealthCare.gov
        platform states with county premium detail. State-based marketplace
        states are shown in gray.
      </p>
    </section>
  );
}

export default StatePremiumMap;
