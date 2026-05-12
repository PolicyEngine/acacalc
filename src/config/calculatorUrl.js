const DEFAULT_CALCULATOR_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8501"
    : "https://policyengine-aca-calc.streamlit.app/";

export const CALCULATOR_URL =
  process.env.NEXT_PUBLIC_CALCULATOR_URL || DEFAULT_CALCULATOR_URL;
