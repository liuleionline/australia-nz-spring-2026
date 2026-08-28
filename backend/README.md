# Routebook private API

This service stores participant-only data for the public travel frontend:

- authenticated member accounts and sessions;
- shared expenses and settlement state;
- travel journals and task completion state;
- encrypted backup metadata.

## Security boundary

The public GitHub Pages repository contains only generalized itinerary content. Do not place any of the following in frontend JavaScript, examples, screenshots, issues or commits:

- real names, passport numbers or contact details;
- accommodation door numbers, host messages or booking references;
- expense amounts, payers, participants or settlement relationships;
- passwords, session tokens, backup credentials or private API keys.

All secrets belong in the server's private environment file. Copy `.env.example` to a file outside the repository and replace every placeholder.

## Account bootstrap

Set `ROUTEBOOK_BOOTSTRAP_PASSWORD` to a unique random value of at least 12 characters only while missing accounts are being created. Each member must change it at first login. Administrator resets return a new one-time temporary password and revoke the member's sessions; the server does not reset users to a fixed shared password.

Remove the bootstrap value after all expected accounts exist.

## Local verification

```bash
npm install
npm run smoke
```

The smoke test uses isolated temporary storage and test-only credentials. It does not read production data.

## Deployment outline

1. Run the service as an unprivileged account.
2. Store writable state under a private server directory.
3. Terminate HTTPS at a reverse proxy.
4. Restrict CORS to the production frontend origin.
5. Keep backup encryption and upload credentials out of Git.
6. Review logs and backups for accidental personal data before sharing them.

Use the templates under `deploy/` as examples and replace placeholder hostnames and paths for the target server.
