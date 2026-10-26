# Separate HTML Reader test package — subject-wise Marrow Custom Module

This is a separate GitHub Pages test build based on the uploaded `index.html`. It does not modify your original HTML Reader repository.

## Custom Module behaviour

1. Open **Custom Module** in HTML Reader.
2. Choose one or more subjects, or use **Select all**.
3. Topic choices are shown in separate, clearly labelled **subject panels** rather than in one mixed cluster.
   - Each subject panel has its own **All topics** and **Clear** controls.
   - The top-level **All visible topics** button selects every currently visible topic.
   - JSON filename number prefixes are removed from topic display names.
4. Set the number of questions with the slider: **10 to 100**, in steps of 10. The display is a plain number.
5. Build the module. The reference-format test runner opens immediately.

## Saved-test rule

When a module is built, its generated reference-runner HTML is saved automatically in:

`My HTML → Custom Modules`

The Custom Module tab changes to a saved-module screen with **Review saved test** and **Delete saved test and unlock maker**. A new custom module cannot be created until that saved test is deleted. It can still be reviewed later and its runner/review state remains on the same device.

## Reader controls

The original Reader library, imports, Favorites, Settings, display modes, Network Access, and offline shell remain available. The Reader's `••• → Font Size` control is a genuine **60%–250% slider**.

On test pages (every library test, custom module and searched MCQ) the slider raises the **real font-size** of the question, the options and the buttons below them — the page is re-laid-out at the new size, never zoomed or bitmap-scaled, so text stays sharp at every step. The test's top bar (title, timer, progress, All-questions and End-test controls) keeps its normal size. Every question screen also uses the reference layout: the question scrolls in its own area while the options and the button row stay fixed at the bottom of the screen.

## Static source behaviour

The custom maker uses the static source you selected from:

`https://github.com/sunday2212/WEBREPLITX5`

It fetches the pinned public `Marrow/Edition 8 qBank` manifest and only the selected JSON topic files at build time. No third-party MCQ JSON bank is bundled in this ZIP.

This is a static-source maker, not the live QBank Hub RPC maker. Turn on **Settings → Network access** before opening the Custom Module tab. The PWA shell can work offline, but a new module requires internet access and depends on the selected public source remaining online.

## Deploy safely to a new repository

1. Create a new empty public GitHub repository, for example `html-reader-subjectwise-module-test`.
2. Extract the ZIP and upload the **contents** of this directory to the new repository's `main` branch root. Do not upload the enclosing directory as a nested folder.
3. Go to **Settings → Pages** and set:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: `/(root)`
4. Open the published Pages URL. In the Reader, enable **Settings → Network access** and test the Custom Module tab.

## Main files

- `index.html` — Reader with Custom Module tab, persistent saved-module handling, and font-size slider
- `custom-module.html` — grouped subject/topic module maker plus reference-runner conversion
- `sw.js` — PWA service worker
- `manifest.webmanifest`, icons, `.nojekyll` — GitHub Pages/PWA support
