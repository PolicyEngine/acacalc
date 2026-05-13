# Contributing Guide

## Code Structure

### React Application

The user-facing ACA calculator lives in the Next.js/React app:

- `app/`: Next.js shell
- `src/App.jsx`: top-level application routing and tabs
- `src/components/Calculator.jsx`: calculator orchestration
- `src/components/CalculatorForm.jsx`: household input form
- `src/components/CalculatorResults.jsx`: calculator outputs and charts
- `src/pages/LocalImpact.jsx`: local enrollment and premium context

Run it locally with:

```bash
npm run dev
```

The calculator route is `/#calculator`.

### Python Package

Reusable PolicyEngine and data access logic lives in `aca_calc/`:

1. `aca_calc/calculations/ptc.py`
   - Builds household situations
   - Applies ACA reform parameters when requested
   - Returns PTC, SLCSP, FPL, and FPL percentage values

2. `aca_calc/calculations/household.py`
   - Builds PolicyEngine household dictionaries
   - Handles spouse, dependent, county, ZIP, and income-axis structure

3. `aca_calc/enrollment_context.py`
   - Loads checked-in CMS Marketplace enrollment fixtures
   - Labels HealthCare.gov-platform states versus fallback-only states
   - Provides county and congressional district local context

### Data Files

- `counties.json`: counties across all states plus DC
- `aca_calc/data/enrollment_context_2026_counties.json`: tiny county fixture
- `aca_calc/data/enrollment_context_2026_districts.json`: tiny district fixture
- `aca_calc/data/marketplace_platforms_2026.json`: state Marketplace platform config
- `process_counties.py`: updates county data from PolicyEngine

## Testing

```bash
npm run lint
npm run build
uv run pytest
```

For local impact work, the focused Python tests are:

```bash
uv run pytest \
  tests/test_enrollment_context.py \
  tests/test_enrollment_ingest.py \
  tests/test_congressional_district_ingest.py
```

## PolicyEngine Integration

### Household Structure Pattern

```python
situation = {
    "people": {...},
    "families": {...},
    "spm_units": {...},
    "tax_units": {...},
    "households": {...},
    "marital_units": {...},
}
```

Always include `spm_units` for accurate ACA calculations. Add
`marital_units` when the household includes a spouse or child dependents.

### Reform Parameters

IRA enhancements modify these PolicyEngine parameters:

```python
"gov.aca.ptc_phase_out_rate[0-6].amount"
"gov.aca.ptc_income_eligibility[2].amount"
```

### County Format

PolicyEngine expects `COUNTY_NAME_STATE`:

- `TRAVIS_COUNTY_TX`
- `BERGEN_COUNTY_NJ`

Use all caps, underscores instead of spaces, and a state abbreviation suffix.

## Common Issues

### SLCSP Returns $0

- Check county name format
- Verify state has Marketplace pricing data
- Try without county to use the state default

### Reform Not Applied

- Ensure `use_reform=True`
- Check `Reform.from_dict()` imports correctly
- Verify date ranges use the expected PolicyEngine parameter format

### Calculations Do Not Match Notebook Values

- Check PolicyEngine version
- Verify household structure matches
- Confirm income is split correctly for couples

## Adding Features

### New State-Specific Logic

1. Add reusable logic under `aca_calc/`.
2. Wire UI behavior through React components in `src/`.
3. Test with multiple counties or districts in that state.

### UI Changes

1. Keep navigation in `src/App.jsx`.
2. Keep calculator state in the calculator components.
3. Match existing component and CSS conventions.

### New Visualizations

1. Prefer existing Recharts/D3 patterns.
2. Keep chart data preparation separate from visual rendering.
3. Include labels and hover states that work on desktop and mobile.

## Questions?

Check PolicyEngine docs: https://policyengine.github.io/policyengine-us/
