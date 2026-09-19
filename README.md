# Md. Asikur Rahman — Portfolio

A single-page portfolio website built from my CV. No frameworks, no build step —
plain HTML, CSS and JavaScript, so it runs anywhere.

## Run it locally

Double-click `index.html`. That's it.

## File layout

```
Porfolio/
├── index.html                  all page content
├── README.md
└── assets/
    ├── css/style.css           all styling (colours + type at the top)
    ├── js/main.js              mobile menu, scroll reveal, active nav link
    ├── img/asikur.jpg          profile photo (square; shown as a circle)
    └── files/…CV.pdf           PUBLIC version of the CV (see below)
```

## Two versions of the CV — don't mix them up

| Version | Where | Contains |
|---|---|---|
| **Public** | `assets/files/Md_Asikur_Rahman_CV.pdf` (this repo) | Everything except the signature, references and personal details |
| **Full** | `Desktop\Asikur Info\Md_Asikur_Rahman_CV.pdf` (not in this repo) | Also has the scanned signature, referees' contact details, date of birth and home address |

Only the **public** version belongs on the internet. The full version is what you
email or hand to a specific employer. Never commit the full one to this repo —
a public scanned signature can be reused on documents you never signed, and the
referees' phone numbers are their data, not yours to publish.

## Things to update over time

| What | Where |
|---|---|
| Profile text, job bullets | `index.html` — `#about`, `#experience` |
| A new project card | `index.html` — copy an `<article class="project reveal">` block inside `#projects` |
| A new client hospital | `index.html` — add an `<li>` inside `<ul class="clients">` |
| Colours / fonts | `assets/css/style.css` — the `:root` block at the very top |
| Replace the CV | drop a new PDF in `assets/files/` using the same filename |

The stat numbers in `#about` (13+, 7, 40+) are written by hand — remember to bump
them when the client count or project count changes.

## Publish it free on GitHub Pages

1. Create a **public** repo named `asikatm.github.io` on GitHub.
2. Upload everything in this folder to the repo root (so `index.html` is at the top level).
3. Go to **Settings → Pages**, set *Source* to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. After a minute the site is live at **https://asikatm.github.io**

Then put that URL on your CV and LinkedIn instead of only the GitHub profile link.

## Notes

- The client-hospital links point at **private** repositories under
  `github.com/E-Medical-Solution-Ltd`. Anyone without access sees GitHub's
  "not found" page — the note under the list explains this, so keep it there.
- References and personal details (date of birth, religion, blood group, home
  address) are deliberately **not** on this site. They belong on the CV you send
  to a specific employer, not on a public page.
