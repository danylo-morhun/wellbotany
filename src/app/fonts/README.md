Self-hosted fonts (SIL Open Font License 1.1, licenses next to them), so builds
never download from Google Fonts — Turbopack's fetch failed on the VPS.

Source: github.com/google/fonts `ofl/*/[wght].ttf`, cut with fontTools to the
weights we use and Google's `latin` + `latin-ext` ranges (Geist Mono: `latin`):

    fonttools varLib.instancer Onest[wght].ttf wght=500:700 -o onest.ttf
    fonttools varLib.instancer PlusJakartaSans[wght].ttf wght=400:800 -o jakarta.ttf
    pyftsubset <font>.ttf --unicodes=<latin[,latin-ext]> --layout-features='*' --flavor=woff2
