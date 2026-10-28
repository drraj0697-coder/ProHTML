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

On test pages (every library test, custom module and searched MCQ) the slider raises the **real font-size** of the question, the options and the buttons below them — the page is re-laid-out at the new size, never zoomed or bitmap-scaled, so text stays sharp at every step. The test's top bar (title, counter, timer and close) keeps its normal size.

Every question screen uses the reference (Marrow) layout: the question and its options share one scrollable area — short questions keep the options low on screen, tall content (big images) simply scrolls while the button row stays fixed at the bottom. The MCQ options use the exact reference styling: white 88px boxes (no borders, 4px radius, soft shadow) in a two-column grid with a 39px column gap, 10px row gap and 20px page padding on a `#f6f6f6` background; the selected option fills `#c8f3ff`. Question text is bold while option text is regular 16px black with an 11px grey label (set in the bundled **Inter** typeface, shipped in `assets/fonts/` and cached offline), and question images are centred on screen. The test name is hidden on question screens (it stays on the start and score screens), and single-section tests show just the "question of total" counter in the taskbar instead of the "Full test" chip. Section programming is exactly as in the original test files: Next is simply disabled at a section's last question, nothing advances while the app is closed, and the End-section button — normally out of the bar — automatically appears only at the last question of a section, and only in tests with more than one section (the final section's last question says **SUBMIT** instead, with confirmation). The bottom bar carries ☰ (all questions), ☆ (mark for review), a Guess checkbox, then PREV and SKIP/NEXT pushed to the far right of the bar — all in one 44px row sharing the same baseline. Tapping a selected option clears it; tapping a different one switches your choice; answering never scrolls the page away from the option you tapped. The section clock keeps running while the app is closed: if a section's time already ended in the background, the test reopens at the section that should be running now (or submits itself when everything expired). Answering a searched MCQ switches that question to review mode: the marked options and the explanation join the scrollable page below the question (like the review screen of a full test), and **Try again** returns to the unanswered layout for the next attempt. Review screens use the Marrow layout — full width with no card box, the cyan Q MCQID pill, single-column coloured options, an EXPLANATION block and PREV / NEXT / ☰ / DONE — and each question scrolls in its own page box, so **Next** and **Prev** always open the next question at the top.

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
