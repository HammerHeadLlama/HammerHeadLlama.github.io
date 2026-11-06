# HammerHeadLlama.github.io

Daniel Tsen's site, live at **https://hammerheadllama.github.io/**. Plain static files with no build step, served by GitHub Pages.

## Pages (keep these filenames and the links stay the same)

| URL | File |
| --- | --- |
| `/` | `index.html` (city map) |
| `/about.html` | About, photo, contact |
| `/simulation.html` | Generative-agent urban simulation |
| `/peptides.html` | Peptide self-assembly ML |
| `/exoplanet.html` | Exoplanet follow-up photometry |
| `/builds.html` | Builds |
| `/honors.html` | Honors |
| `/404.html` | Not-found page (GitHub Pages uses it automatically) |

GitHub Pages also serves each page without `.html` (for example `/simulation`). Renaming a file changes its link, so edit pages in place.

```
assets/css/site.css    styles for every page
assets/js/site.js      background traffic, lightbox, videos, copy button, filters
assets/js/city.js      the city map on the home page
assets/js/widgets.js   gate, cache, k-mer and transit widgets
assets/img/            figures and photos (WebP)
assets/video/          screen recordings (MP4) and their posters
```

## Photos and the dragon dance clip

- Your portrait is `assets/img/me.jpg` and the round avatar is `assets/img/me-face.webp`. Replace either file, keeping the same name.
- Dragon dance: save the clip as `assets/video/dragon-dance.mp4` and push it. The About page finds the file and shows it with the caption "I’m the tail of the second dragon to come in." Until then the tile shows text only. Keep the file under about 20 MB. A 720p H.264 export works well.
- Your CV for the site is `assets/Daniel-Tsen-CV.pdf`. This public version leaves out your phone numbers, grades and scores.

## Placeholders to fill

One placeholder is left. When the demo video is up, open `simulation.html`, search for `PASTE_SIM_DEMO_VIDEO_URL` and put the real URL in its place.

Each link stays hidden until its `href` starts with `http`.

## Edit and redeploy

Edit a file on github.com (pencil icon) and commit, or from your computer:

```
git add -A
git commit -m "Update site"
git push
```

Pages redeploys in about a minute. Hard-refresh (Ctrl/Cmd+Shift+R) if you still see the old version.

## Custom domain (optional, later)

1. In the repo, go to Settings > Pages > Custom domain and enter e.g. `www.yourdomain.com`. This adds a `CNAME` file.
2. In Cloudflare DNS:
   - `CNAME` `www` -> `hammerheadllama.github.io`
   - For the bare domain, either `CNAME` `@` -> `hammerheadllama.github.io` (Cloudflare flattens it) or four `A` records: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - Keep the records DNS only (grey cloud) until GitHub has issued the certificate.
3. Back in Settings > Pages, tick Enforce HTTPS.
4. The `hammerheadllama.github.io` address keeps working and redirects to the custom domain.
