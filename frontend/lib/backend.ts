// Server-side base URL for the FastAPI backend. Never exposed to the browser.
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export const COOKIE_NAME = "access_token";
