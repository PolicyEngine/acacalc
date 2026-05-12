"""CMS Marketplace enrollment context helpers."""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parent / "data"
DEFAULT_ENROLLMENT_PATH = DATA_DIR / "enrollment_context_sample.json"
DEFAULT_PLATFORM_PATH = DATA_DIR / "marketplace_platforms_2026.json"


@dataclass(frozen=True)
class EnrollmentContext:
    """Local Marketplace enrollment context for one state/county selection."""

    year: int
    state: str
    county: str | None
    status: str
    marketplace_platform: str
    fine_grained_cms_available: bool
    county_context_available: bool
    message: str
    source: str | None = None
    source_url: str | None = None
    county_fips: str | None = None
    marketplace_plan_selections: int | None = None
    new_consumers: int | None = None
    returning_consumers: int | None = None
    consumers_with_aptc_or_csr: int | None = None
    aptc_consumers: int | None = None
    average_premium: float | None = None
    average_premium_after_aptc: float | None = None
    average_aptc: float | None = None
    consumers_premium_after_aptc_lte_10: int | None = None

    def as_dict(self) -> dict[str, Any]:
        """Return a JSON-serializable representation."""
        return asdict(self)


def load_marketplace_platforms(
    path: str | Path = DEFAULT_PLATFORM_PATH,
) -> dict[str, Any]:
    """Load the 2026 platform configuration."""
    with Path(path).open() as f:
        return json.load(f)


def load_enrollment_records(
    path: str | Path = DEFAULT_ENROLLMENT_PATH,
) -> dict[str, Any]:
    """Load processed enrollment records.

    The default is a tiny checked-in sample fixture. A future ingestion job can
    point this function at processed CMS County/ZIP PUF output with the same
    field names.
    """
    with Path(path).open() as f:
        return json.load(f)


def _normalize_state(state: str | None) -> str:
    return (state or "").strip().upper()


def _normalize_county(county: str | None) -> str:
    value = (county or "").strip().casefold()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    if value.endswith(" county"):
        value = value.removesuffix(" county").strip()
    return value


def _platform_for_state(state: str, platforms: dict[str, Any]) -> str:
    if state in platforms["healthcare_gov_states"]:
        return "HealthCare.gov"
    if state in platforms["state_based_marketplace_states"]:
        return "State-based marketplace"
    return "Unknown"


def _record_index(records: list[dict[str, Any]]) -> dict[tuple[str, str], dict]:
    return {
        (record["state"].upper(), _normalize_county(record["county"])): record
        for record in records
    }


def get_enrollment_context(
    state: str,
    county: str | None = None,
    *,
    enrollment_path: str | Path = DEFAULT_ENROLLMENT_PATH,
    platform_path: str | Path = DEFAULT_PLATFORM_PATH,
) -> EnrollmentContext:
    """Return CMS Marketplace enrollment context for a state/county.

    HealthCare.gov-platform states can have county/ZIP PUF detail. State-based
    marketplace states return a clear fallback status because CMS does not
    publish those county/ZIP PUF rows for them.
    """
    platforms = load_marketplace_platforms(platform_path)
    enrollment_data = load_enrollment_records(enrollment_path)
    state_code = _normalize_state(state)
    platform = _platform_for_state(state_code, platforms)
    year = enrollment_data.get("year", platforms.get("year", 2026))
    source = enrollment_data.get("source")
    source_url = enrollment_data.get("source_url")

    if platform == "Unknown":
        return EnrollmentContext(
            year=year,
            state=state_code,
            county=county,
            status="unknown_state",
            marketplace_platform=platform,
            fine_grained_cms_available=False,
            county_context_available=False,
            message=(
                f"{state_code or 'This state'} is not recognized in the "
                "2026 Marketplace platform configuration."
            ),
            source=source,
            source_url=source_url,
        )

    if platform == "State-based marketplace":
        return EnrollmentContext(
            year=year,
            state=state_code,
            county=county,
            status="state_based_marketplace_fallback",
            marketplace_platform=platform,
            fine_grained_cms_available=False,
            county_context_available=False,
            message=(
                f"{state_code} runs a state-based marketplace. CMS county/ZIP "
                "Marketplace PUF detail is not available here, so this view "
                "falls back to state-level context only."
            ),
            source=source,
            source_url=source_url,
        )

    index = _record_index(enrollment_data.get("records", []))
    record = index.get((state_code, _normalize_county(county)))

    if record is None:
        location = f"{county}, {state_code}" if county else state_code
        return EnrollmentContext(
            year=year,
            state=state_code,
            county=county,
            status="not_in_sample_fixture",
            marketplace_platform=platform,
            fine_grained_cms_available=True,
            county_context_available=False,
            message=(
                f"CMS county/ZIP PUF detail is available for {state_code}, "
                f"but {location} is not included in this tiny checked-in "
                "sample fixture yet."
            ),
            source=source,
            source_url=source_url,
        )

    return EnrollmentContext(
        year=year,
        state=state_code,
        county=record["county"],
        status="county_context_available",
        marketplace_platform=platform,
        fine_grained_cms_available=True,
        county_context_available=True,
        message=(
            f"Fine-grained CMS county enrollment context is available for "
            f"{record['county']}, {state_code} in the sample fixture."
        ),
        source=source,
        source_url=source_url,
        county_fips=record.get("county_fips"),
        marketplace_plan_selections=record.get("marketplace_plan_selections"),
        new_consumers=record.get("new_consumers"),
        returning_consumers=record.get("returning_consumers"),
        consumers_with_aptc_or_csr=record.get("consumers_with_aptc_or_csr"),
        aptc_consumers=record.get("aptc_consumers"),
        average_premium=record.get("average_premium"),
        average_premium_after_aptc=record.get("average_premium_after_aptc"),
        average_aptc=record.get("average_aptc"),
        consumers_premium_after_aptc_lte_10=record.get(
            "consumers_premium_after_aptc_lte_10"
        ),
    )
