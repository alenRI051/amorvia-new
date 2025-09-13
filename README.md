# Amorvia `/api/track` — Blob (public) variant

Store requires `access: 'public'`. This build sets it explicitly and returns the public URL.

Env vars:
- BLOB_READ_WRITE_TOKEN (Read & Write token)
- TRACK_SALT
- TRACK_RATE_LIMIT (optional)

Security note: data is hashed for IP (`ipHash`) but files are public if you know URL. We randomize folder and file names to reduce guessability.
