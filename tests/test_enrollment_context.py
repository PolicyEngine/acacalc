"""Tests for CMS Marketplace enrollment context helpers."""

from aca_calc.enrollment_context import get_enrollment_context


def test_healthcare_gov_county_with_fixture_data_returns_context():
    context = get_enrollment_context("TX", "Travis County")

    assert context.status == "county_context_available"
    assert context.marketplace_platform == "HealthCare.gov"
    assert context.fine_grained_cms_available
    assert context.county_context_available
    assert context.marketplace_plan_selections == 184_355
    assert context.aptc_consumers == 162_349
    assert context.average_aptc == 562


def test_state_based_marketplace_state_returns_fallback_status():
    context = get_enrollment_context("CA", "San Benito County")

    assert context.status == "state_based_marketplace_fallback"
    assert context.marketplace_platform == "State-based marketplace"
    assert not context.fine_grained_cms_available
    assert not context.county_context_available
    assert context.marketplace_plan_selections is None
    assert "falls back to state-level context" in context.message


def test_unknown_county_in_healthcare_gov_state_is_graceful():
    context = get_enrollment_context("TX", "Not A County")

    assert context.status == "not_in_sample_fixture"
    assert context.marketplace_platform == "HealthCare.gov"
    assert context.fine_grained_cms_available
    assert not context.county_context_available
    assert context.marketplace_plan_selections is None


def test_unknown_state_is_graceful():
    context = get_enrollment_context("ZZ", "Example County")

    assert context.status == "unknown_state"
    assert context.marketplace_platform == "Unknown"
    assert not context.fine_grained_cms_available
    assert not context.county_context_available
