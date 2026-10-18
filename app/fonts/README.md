# Fonts

Both typefaces are self-hosted here and loaded with `next/font/local` from `app/layout.tsx`, so a build never has to reach Google Fonts (the previous `next/font/google` setup failed to build on machines without that network access, and could not produce a metric-matched fallback for Atkinson Hyperlegible Next).

| File | Family | Weights | Subset | Licence |
| --- | --- | --- | --- | --- |
| `AtkinsonHyperlegibleNext-latin.woff2` | Atkinson Hyperlegible Next (body text) | variable, 400 to 700 | latin | SIL OFL 1.1, `OFL-AtkinsonHyperlegibleNext.txt` |
| `BricolageGrotesque-latin.woff2` | Bricolage Grotesque (headings) | variable, 600 to 700 used | latin | SIL OFL 1.1, `OFL-BricolageGrotesque.txt` |

The files are the exact `woff2` files Google Fonts served on 2026-10-18 for the `latin` unicode range (`fonts.gstatic.com/s/atkinsonhyperlegiblenext/v7/…` and `fonts.gstatic.com/s/bricolagegrotesque/v9/…`). Only the latin subset is shipped: every string in the app is covered by it (including "café", U+00E9). To add latin-ext later, add a second `src` entry per family in `app/layout.tsx`.

Neither font was written for this project. Authors: the Atkinson Hyperlegible Next Project Authors (Braille Institute, https://github.com/googlefonts/atkinson-hyperlegible-next) and the Bricolage Grotesque Project Authors (https://github.com/ateliertriay/bricolage).
