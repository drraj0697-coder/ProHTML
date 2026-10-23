# Separate HTML Reader test package — Marrow Custom Module

This is a **separate GitHub Pages test build** based on the uploaded `index.html`. It does not modify your current HTML Reader repository.

## Included features

- The original Reader library, imports, Favorites, Settings, reader controls, Network Access control, display modes, and offline app shell remain available.
- A new **Custom Module** tab opens an embedded Marrow module maker.
- The maker provides:
  1. multi-select **subject** choices;
  2. multi-select **topic** choices inside the selected subjects;
  3. an exact **question-count slider** from 5 to 200 questions;
  4. an optional module name;
  5. a reference-format test runner after Build Module.
- The Reader’s `More options → Font Size` control is a genuine **60%–250% slider**, replacing the original A− / A+ stepper.

## Source behaviour

The custom maker uses the static source you selected:

`https://github.com/sunday2212/WEBREPLITX5`

It fetches the pinned public `Marrow/Edition 8 qBank` manifest and selected JSON topic files only when you build a module. No Marrow question bank is copied into this package.

This is a static-source maker, not the QBank Hub live database/RPC maker. Leave **Settings → Network access** enabled before opening the Custom Module tab. The source requires internet access and can stop working if the public source repository removes or changes the pinned files.

## Deploy safely to a new repository

1. Create a new empty public GitHub repository, for example `html-reader-module-test`.
2. Upload the **contents** of this directory to the root of the new repository's `main` branch. Do not upload the enclosing folder as a nested directory.
3. In **Settings → Pages**, set:
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/(root)`
4. Open the Pages URL, then in the Reader use **Settings → Network access → On**.
5. Test **Custom Module**. Select subjects, choose topics, move the question slider, and select **Build module**.

After the test succeeds, the same files can be used in another deployment only if you choose to replace an existing Reader build.

## Main files

- `index.html` — uploaded Reader rebuilt with Custom Module tab and font slider
- `custom-module.html` — subject/topic/question-count maker and embedded reference runner
- `sw.js` — pre-caches the Reader shell and the maker
- `manifest.webmanifest`, icons, `.nojekyll` — GitHub Pages/PWA support
