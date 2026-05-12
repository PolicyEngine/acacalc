import { useMemo, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3";
import districtGeography from "../../aca_calc/data/congressional_districts_119_20m.json";
import {
  congressionalDistrictContext2026,
  formatCurrency,
  formatNumber,
  getCongressionalDistrictPremiumContexts,
  getMarketplacePlatform,
} from "../enrollmentContext";

const MAP_WIDTH = 960;
const MAP_HEIGHT = 610;

const PREMIUM_COLORS = [
  "cd-bucket-1",
  "cd-bucket-2",
  "cd-bucket-3",
  "cd-bucket-4",
  "cd-bucket-5",
];

const buildPremiumScale = (districts) => {
  const values = districts
    .map((district) => district.average_premium)
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

const unavailableMessage = (state) => {
  const platform = getMarketplacePlatform(state);
  if (platform === "State-based marketplace") {
    return `${state} runs a state-based marketplace, so CMS county/ZIP premium context is unavailable for its congressional districts in this slice.`;
  }
  return `${state} has no matched district premium context in the compact dataset.`;
};

function CongressionalDistrictPremiumMap({ selectedState, onSelectState }) {
  const [selectedGeoid, setSelectedGeoid] = useState(null);
  const districtContexts = useMemo(
    () => getCongressionalDistrictPremiumContexts(),
    [],
  );
  const scale = useMemo(
    () => buildPremiumScale(districtContexts),
    [districtContexts],
  );
  const contextByGeoid = useMemo(
    () =>
      Object.fromEntries(
        districtContexts.map((district) => [
          district.district_geoid,
          district,
        ]),
      ),
    [districtContexts],
  );
  const features = districtGeography.features;
  const featureByGeoid = useMemo(
    () =>
      Object.fromEntries(
        features.map((feature) => [feature.properties.geoid, feature]),
      ),
    [features],
  );
  const path = useMemo(() => {
    const projection = geoAlbersUsa().fitSize(
      [MAP_WIDTH, MAP_HEIGHT],
      districtGeography,
    );
    return geoPath(projection);
  }, []);
  const selectedFeature = featureByGeoid[selectedGeoid];
  const selectedFeatureMatchesState =
    selectedFeature?.properties.state === selectedState;
  const firstStateFeature = features.find(
    (feature) => feature.properties.state === selectedState,
  );
  const activeFeature = selectedFeatureMatchesState
    ? selectedFeature
    : firstStateFeature;
  const activeGeoid = activeFeature?.properties.geoid;
  const activeContext = contextByGeoid[activeGeoid];
  const activeState = activeFeature?.properties.state || selectedState;
  const activeDistrictLabel =
    activeContext?.district_label || activeFeature?.properties.label;
  const availableDistrictCount = districtContexts.filter(
    (district) => district.premiumContextAvailable,
  ).length;

  const selectDistrict = (feature) => {
    setSelectedGeoid(feature.properties.geoid);
    onSelectState(feature.properties.state);
  };

  const handleDistrictKeyDown = (event, feature) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDistrict(feature);
    }
  };

  return (
    <section className="local-panel cd-map-panel">
      <div className="local-panel-header">
        <div>
          <h3>Average premium by congressional district</h3>
          <p>119th Congressional Districts with CMS county context.</p>
        </div>
        <span className="local-year">2026 OEP</span>
      </div>

      <div className="cd-map-shell">
        <svg
          aria-label="Average monthly Marketplace premium by 119th congressional district"
          className="cd-map-svg"
          role="group"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        >
          {features.map((feature) => {
            const districtPath = path(feature);
            if (!districtPath) {
              return null;
            }

            const districtContext = contextByGeoid[feature.properties.geoid];
            const bucket = premiumBucketFor(
              districtContext?.average_premium,
              scale,
            );
            const platform = getMarketplacePlatform(feature.properties.state);
            const isSelected = activeGeoid === feature.properties.geoid;
            const isSelectedState =
              selectedState === feature.properties.state && !isSelected;
            const districtLabel =
              districtContext?.district_label || feature.properties.label;
            const ariaLabel = districtContext
              ? `${districtLabel}, average premium ${formatCurrency(districtContext.average_premium)} per month`
              : `${districtLabel}, ${platform} district premium context unavailable`;

            return (
              <path
                aria-label={ariaLabel}
                className={[
                  "cd-district",
                  bucket?.className || "cd-unavailable",
                  isSelectedState ? "same-state" : "",
                  isSelected ? "selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                d={districtPath}
                key={feature.properties.geoid}
                onClick={() => selectDistrict(feature)}
                onKeyDown={(event) => handleDistrictKeyDown(event, feature)}
                role="button"
                tabIndex="0"
              >
                <title>{ariaLabel}</title>
              </path>
            );
          })}
        </svg>
      </div>

      <div className="cd-map-footer">
        <div className="cd-map-legend" aria-label="Premium color scale">
          {scale.map((bucket) => (
            <span className="cd-legend-item" key={bucket.className}>
              <span className={`cd-legend-swatch ${bucket.className}`} />
              {bucket.label}
            </span>
          ))}
          <span className="cd-legend-item">
            <span className="cd-legend-swatch cd-unavailable" />
            Unavailable
          </span>
        </div>

        <div className="cd-map-summary">
          <span>{activeDistrictLabel || activeState}</span>
          <strong>
            {activeContext?.premiumContextAvailable
              ? `${formatCurrency(activeContext.average_premium)}/mo`
              : "No CMS district premium data"}
          </strong>
          <p>
            {activeContext?.premiumContextAvailable
              ? `${formatNumber(activeContext.marketplace_plan_selections)} plan selections; average after APTC is ${formatCurrency(activeContext.average_premium_after_aptc)}/mo. Built from ${formatNumber(activeContext.source_county_count)} county records and ${formatNumber(activeContext.county_part_count)} county-district parts.`
              : unavailableMessage(activeState)}
          </p>
        </div>
      </div>

      <p className="cd-map-note">
        District estimates use {formatNumber(availableDistrictCount)}
        HealthCare.gov-platform districts.{" "}
        {congressionalDistrictContext2026.allocation_method}
      </p>
    </section>
  );
}

export default CongressionalDistrictPremiumMap;
