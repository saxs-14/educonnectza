/**
 * Builds a `cors` package `origin` callback that only allows the given list of
 * origins, plus requests with no Origin header (same-origin, curl, mobile apps).
 */
export const buildOriginChecker = (allowedOrigins) => (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  }
};
