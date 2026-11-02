# HEALTH-INFO — UHealth Alert (GitHub Pages demo)

A responsive, browser-based demonstration of the UHealth Alert console project. It includes campus health alerts, mental wellbeing resources, support requests, student safety preferences, emergency contact links, and a sample staff queue. The interface uses red, green, and blue accents and adapts to mobile screens.

## What the demo can do

- Students can view campus health alerts and wellbeing information; Health Officers and Administrators can publish demo alerts.
- Students can save a location-consent preference (off by default). This static demo never requests GPS or stores location. Real location sharing needs explicit consent and secure, server-enforced staff authorization.
- Students can save an emergency contact email/phone and a device label. Call, text, and email links open the device's corresponding app; they do not send messages automatically. Health Officer and Safety Team demo roles can view contact details only when the student has opted in.
- Students can submit local demo support requests, and staff can review and resolve them in this browser.

## Demo sign-in accounts

Choose **Create a student account** to register with an email ending in `@students.cavendish.ac.ug` and a password of at least 8 characters. Accounts are saved in that browser. Return to **Sign in** to log in. Staff accounts cannot be self-registered; use the sample staff accounts:

| Role | Email | Password |
| --- | --- | --- |
| Student | `km275497@students.cavendish.ac.ug` | `student123` |
| Health Officer | `health.officer@cavendish.ac.ug` | `health123` |
| Safety Team | `safety@cavendish.ac.ug` | `safety123` |
| Welfare Officer | `welfare@cavendish.ac.ug` | `welfare123` |
| Administrator | `admin@cavendish.ac.ug` | `admin123` |

Sample passwords are checked against their SHA-256 digests, and newly created student passwords are stored as salted PBKDF2 hashes in browser `localStorage`. This is still only a client-side demo: accounts exist on one device, browser checks can be bypassed, and the sample credentials are public. It does not provide production-grade authentication. The staff contact-access restriction is also only a client-side demonstration, not real authorization.

## Run locally

Open `index.html` in a modern browser. For local web-server behavior, run this from the project folder:

```powershell
py -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish on GitHub Pages

1. Push these files to the root of a GitHub repository.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select your branch (usually `main`) and the `/(root)` folder, then save.
5. Wait for the Pages deployment and open the URL GitHub provides.

The site is static and needs no build step.

## Important limitations

GitHub Pages cannot run the Java program as a backend. This is a front-end demo with no server-side authorization, email/SMS delivery, push notifications, location tracking, or secure audit trail. Accounts, demo edits, and contact details are stored in the browser's `localStorage` and are not shared with other users or devices.

Do not use this version with real student accounts, health information, emergency reports, location, or other sensitive data. A production deployment would need a secure backend, real identity and access management, protected data storage, verified emergency contacts, notification delivery, and appropriate privacy/security review.
