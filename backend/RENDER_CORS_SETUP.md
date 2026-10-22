# Render CORS and refresh-cookie configuration

The frontend is hosted at `https://assesspro-1-i07n.onrender.com` and the API at `https://assesspro-4lwf.onrender.com`.

In the **backend Render service** Environment settings, configure:

```dotenv
NODE_ENV=production
CLIENT_ORIGIN=https://assesspro-1-i07n.onrender.com
```

For multiple approved frontends, use a comma-separated list of exact origins (no paths or trailing slash). Do not use `*` with credentialed requests.

Ensure `MONGODB_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` are set securely in Render; never commit their values. The JWT secrets must each be at least 32 characters. Deploy the backend after changing these settings, then deploy the frontend if necessary.

The refresh cookie is `HttpOnly; Secure; SameSite=None` in production so it can be sent between the two Render origins. Browsers blocking third-party cookies may still prevent cookie-based refresh; a shared custom domain is preferable for long-term reliability.

## Browser checks

1. Open frontend in a fresh browser session.
2. In DevTools Network, inspect `OPTIONS /api/v1/auth/refresh` when present: it should respond with `Access-Control-Allow-Origin: https://assesspro-1-i07n.onrender.com` and `Access-Control-Allow-Credentials: true`.
3. An unauthenticated `POST /api/v1/auth/refresh` should return HTTP **401** with JSON, not a CORS error or 500.
4. Sign in with a test account. Confirm the response sets an HttpOnly Secure SameSite=None refresh cookie.
5. Refresh the page and verify that a valid session can be renewed.
6. Confirm that requests from unrelated origins do not receive credentialed CORS approval.

If 500 remains after CORS is configured, inspect the Render backend logs and verify the database connection and signing secrets. CORS headers cannot repair an application startup failure.
