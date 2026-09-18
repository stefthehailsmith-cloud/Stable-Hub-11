# Auth Testing Playbook

## Endpoints
- POST /api/auth/register {email,password,name,role}
- POST /api/auth/login {email,password}
- GET /api/auth/me (cookies)
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/forgot-password {email}
- POST /api/auth/reset-password {token,password}

## Admin
tom@thehailsmith.co.za / Admin123!

## Cookies
httpOnly, Secure, SameSite=None. Send `withCredentials: true` from React.

## Password Reset
- Same generic 200 for registered and unregistered emails.
- Token stored as sha256 hash. Raw token is one-use, 1h expiry.
- In test/local env with non-https FRONTEND_URL and loopback host, reset link is logged to backend.

## Brute Force
- 5 failed logins within 15 min per {ip:email} → 429 lockout.
- 5 forgot-password requests per email per 15 min throttled.
