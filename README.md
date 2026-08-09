# Karthick S — Portfolio

A static Next.js portfolio built around the “Built Block by Block” modular engineering concept.

## Requirements and development

Use Node.js 20 or newer and npm.

```bash
npm install
npm run dev
npm run lint
npm run build
```

The production build creates a static export in `out/`.

## Deployment

GitHub Pages is configured in `.github/workflows/deploy.yml`. Pushing to `main` builds and deploys the site. The repository base path is enabled automatically in GitHub Actions; change `repo` in `next.config.ts` if the repository is renamed.

For Vercel or a custom domain, deploy normally and set `NEXT_PUBLIC_SITE_URL` to the canonical URL. Outside GitHub Actions the site runs at the domain root.

## Assets and content

- Facts and links: `data/portfolio.ts`
- Profile image: `public/profile.jpg`
- Project screenshots: add images under `public/projects/`, then replace the CSS preview in `app/page.tsx` with `next/image`
- Résumé: add `public/karthick-s-resume.pdf`, then add résumé links in `app/page.tsx`

No résumé file existed in the legacy portfolio, so the rebuild does not expose a broken download.

## Future hero video

The `hero-media` boundary in `app/page.tsx` is ready for a future video. Add MP4/WebM files under `public/video/`, retain the CSS fallback for mobile and reduced-motion users, and account for `Save-Data`, muted autoplay, `playsInline`, visibility pausing and a poster image.

The original `index.html` remains for migration verification. It is not used by Next.js and can be removed after the new site is accepted.
