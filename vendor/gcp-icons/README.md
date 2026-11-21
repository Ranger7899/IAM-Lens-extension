# Google Cloud icons (vendored, unmodified)

Source: https://cloud.google.com/icons (downloaded 2026-11-21)
- `core/`     ← https://services.google.com/fh/files/misc/core-products-icons.zip
- `category/` ← https://services.google.com/fh/files/misc/category-icons.zip
- `legacy/`   ← https://services.google.com/fh/files/misc/google-cloud-legacy-icons.zip

The page describes these as "Official Google Cloud icons to build your own architecture diagrams"; no other
licence was shipped with the archives. They are Google trademarks. Using them inside a published extension is a
deliberate product decision by the owner (see Anvil IAM-34 / IAM-27 risk note). Only icons referenced by
`scripts/build-service-icons.ts` are copied into the build.

Security: all SVGs were scanned on import (no <script>, event handlers, foreignObject or external hrefs).
