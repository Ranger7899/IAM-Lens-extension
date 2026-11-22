# Third-party notices

IAM Lens itself is released under the MIT licence (see `LICENSE`). It bundles the following third-party material.

## Fonts

| Font | Package | Licence |
| --- | --- | --- |
| Google Sans Flex (variable) | `@fontsource-variable/google-sans-flex` | SIL Open Font License 1.1 |
| Google Sans Code (variable) | `@fontsource-variable/google-sans-code` | SIL Open Font License 1.1 |

Copyright 2015 Google LLC (Google Sans Flex); Copyright 2025 The Google Sans Code Project Authors
(https://github.com/googlefonts/googlesans-code). Licence text: https://openfontlicense.org/. Only latin and
latin-ext subsets are included (see `src/ui/theme/fonts.css`).

## Icons

- **Material Symbols** (`@material-symbols/svg-400`): Apache License 2.0, https://www.apache.org/licenses/LICENSE-2.0
- **Google Cloud service icons** (`vendor/gcp-icons/`): official Google Cloud icons from
  https://cloud.google.com/icons, vendored unmodified; no separate licence file ships with the archives. They are
  trademarks of Google LLC and are used only to identify Google Cloud services. See `vendor/gcp-icons/README.md`
  for provenance.

## Libraries

- `@material/material-color-utilities`: Apache License 2.0.
- Other runtime dependencies keep their own licences; see `package.json` and each package in `node_modules`.

IAM Lens is not affiliated with or endorsed by Google.
