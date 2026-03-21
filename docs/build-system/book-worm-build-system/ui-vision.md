# BookWorm UI Vision

Here is a research report that captures the aesthetics, design principles, and actionable recommendations for refining BookWorm’s look. You can download and view the report using the link below:

## Ethereal Fantasy Design Research for BookWorm

Objectives:

The client wants BookWorm—an AI agent focused on agentic novel writing—to adopt an ethereal, polished style that reflects the fantasy genre. To provide design direction, I examined examples of contemporary fantasy‑author websites and general design guidance for fantasy media. This report summarizes the elements that make these sites feel magical and professional and translates them into actionable recommendations for BookWorm’s look.

Insights from Fantasy‑Author Websites

The blog post “12 Fantasy Author Websites That Take Your Breath Away” (Rocket Expansion, updated Feb 24 2026) profiles several high‑performing fantasy author sites, highlighting the features that make them immersive and polished. The most notable sites and their defining elements are summarized below:

Site Notable design elements Lessons
Reni K. Amayo Single‑page, sophisticated design with regal brown color palette and cozy, coffee‑house vibe. A one‑page layout can feel luxurious; use a rich monochrome palette to reinforce personality.
Tom Elliot Rich visuals greet visitors: fantasy scenes with hooded characters and dragons, gold‑framed book covers, extras like lore, character charts, and glossary. Use illustrative hero sections, ornate frames, and fan‑focused extras to immerse users.
Susan Dennard Unique branding with a subtle sunshine motif, consistent across pages. Employ a distinct recurring symbol to unify the interface.
Fonda Lee Dark and gritty design; a punchy color scheme and slider banner showcase her books. Contrast dark backgrounds with luminous highlights and provide interactive banners to feature key items.
Bob & Todd (The Ulti Deic Prophecies) Intro section immerses visitors in the book’s world with architecture and rich earthy and ethereal tones; the site has an Explore page with lore wiki, interactive map and glossary, plus a reader magnet offering free chapters. Start with a cinematic landscape; integrate interactive world‑building tools and offer free content to boost engagement.
Trang Thanh Tran Simplistic layout with moody artwork framing the page; unique book covers stand out; includes playlists, a FAQ with audio, and a commissioned art section. Combine minimalist structure with ornate art at top and bottom, and include personal content like playlists or art to humanize the brand.
T.A. White Sleek modern design with generous white space and supporting background images; offers deleted scenes to fans. Balance empty space against atmospheric imagery; deliver exclusive content for fans.
Karuna Riazi Opens with a welcoming screen; heavy use of white space lets content and art breathe; navigation feels like a journey. Use interactive introductions and gentle animations to draw users into the site.
Gregory Kontaxis Intro image feels like entering an enchanted cave; moody backgrounds; site supports switching language to Greek. Evoke mystical atmospheres with dark backgrounds and color grading; support localization to reflect an author’s heritage.
Tomi Adeyemi The writer’s section tells a story as you scroll; includes reviews and book covers with animated art. Use scroll‑triggered storytelling and subtle animations to maintain engagement.
Davis Ashura Rich imagery and contrast; features the bestselling audiobook front and center; uses visual book links in navigation; an About page with a dramatic landscape and dragon plus parallax scroll; interactive world map and abundant signup forms. Highlight flagship products; leverage parallax effects and interactive maps; place prominent call‑to‑action forms.
Kate Jones A background video sets the fantasy tone; color pops of purple and green; a characters page where characters introduce themselves. Videos and vibrant accent colors can immediately convey fantasy; character‑driven content deepens world‑building.
General Fantasy Design Guidelines
Color Palettes

Fantasy palettes use glow highlights, deep shadows and jewel‑like tones to evoke otherworldly moods. A common technique is pairing a dark base (e.g., night blue, forest green, charcoal) with a controlled bright accent (violet, gold, emerald) for readability. Example schemes include:

Enchanted Forest Glow: mossy green (#0b3d2e), deep green (#1f6f4a), mint highlight (#5fd38d), violet accent (#7b2cbf) and cream background (#f2e9e4)—evokes mysticism and nature.
Dragon Ember Dusk: smoky maroon (#2b0f0f), dark red (#7a1f1f), ember orange (#c54b2c), gold‑orange (#f2a541) and charcoal violet (#2d2a3a)—adds drama and heat.
Moonlit Sapphire Mist: navy (#0a1f44), mid‑blue (#244a8a), sky blue (#6aa7d6), pale blue (#c7d9f2) and soft lilac (#a56cc1)—calm, nocturnal and ethereal.
Fairy Lantern Pastels: cream pink (#ffe3f1), buttery yellow (#ffd36e), mint (#b8f2e6), periwinkle (#a0c4ff) and violet (#7a5cff)—whimsical and airy.

These palettes suggest using two or three core colors supplemented by one or two accents for calls‑to‑action or decorative elements.

Typography

Fantasy design often relies on elegant serif fonts with decorative flourishes. MIBLART’s guide notes that Cinzel Decorative, Yana, Vectis and Artisan are popular typefaces for fantasy covers. Decorative touches like drop shadows, textures and gradients enhance these fonts. Body text should remain readable, often using classic serif fonts (e.g., Georgia) for a literary feel.

Imagery and Motifs

Key visual motifs include medieval architecture, castles, forests, mountains, dragons, hooded figures and magical artifacts. Backgrounds vary by subgenre:

High/Epic fantasy: majestic castles, enchanted forests and ancient ruins【714348444436200†L164-L167】.
Urban fantasy: modern cityscapes with neon lights and hidden symbols【714348444436200†L164-L167】.
Paranormal/dark fantasy: stormy skies, gothic cathedrals and eerie graveyards【714348444436200†L168-L170】.

Including mystical creatures, magical energy effects and decorative borders (e.g., Celtic motifs) enhances the fantasy vibe.

Layout and Features
Use hero sections with immersive artwork or videos to set the tone, as seen in Tom Elliot and Kate Jones’s sites.
Provide interactive world‑building tools—maps, glossaries and wikis—to engage readers.
Incorporate stories and reviews in a scroll‑based narrative flow, as Tomi Adeyemi does.
Offer free chapters or extras to encourage email sign‑ups.
Maintain a balance of white space and content; designs like T.A. White and Karuna Riazi show that calm spaces allow art and text to shine.
Current BookWorm Aesthetic

Pre-Stage-02-Slice-01 baseline

Before the root-shell vision-alignment slice shipped, BookWorm’s web layout used a warm, parchment-like palette: a primary brown (#945f2d) and paper backgrounds (#f8f4ea) reminiscent of aged book pages. The interface already had the core shell structure and sidebar navigation, but the typography leaned on Georgia/Times New Roman and the overall presentation read as classic and utilitarian rather than ethereal.

Current shipped root-shell reality

That baseline is no longer the current repository state. The shipped root shell in `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/AppSidebar.tsx`, and `apps/web/src/app/page.tsx` now uses a dark, atmospheric palette anchored by deep night-blue surfaces, luminous blue highlights, restrained gold accents, layered gradients, and elevated glass-like panels. Typography also moved to a more intentional literary pairing: Cormorant Garamond for display treatment and Spectral for body copy via `next/font`.

This means the root shell is now directionally aligned with the ethereal fantasy target, even though the broader product still has follow-on surfaces that have not yet inherited the same visual language. The recommendations below should therefore be read as a mix of validation for what has shipped in the shell and guidance for the remaining rollout.

Recommendations for an Ethereal Fantasy Makeover

1. Adopt a Mystical Color Scheme
Primary palette: choose a dark base such as deep navy or forest green and pair it with luminous accents like violet, gold or mint. For example, use “Moonlit Sapphire Mist” (#0a1f44, #244a8a, #6aa7d6, #c7d9f2, #a56cc1) or “Enchanted Forest Glow” (#0b3d2e, #1f6f4a, #5fd38d, #7b2cbf, #f2e9e4) to instantly evoke a mystical atmosphere.
Accent colors: incorporate metallic gold or silver for buttons and frames, echoing the gilded book frames on Tom Elliot’s site.
The shipped root shell has already moved in this direction with dark-base tokens, luminous blue highlights, and restrained gold accents in `globals.css`; continue extending and refining that token system as the rest of the product is brought into alignment.
2. Integrate Elegant Fantasy Typography
Headings: use a decorative or high-character serif for brand and major headings. The current root shell’s Cormorant Garamond display treatment is directionally correct; retain that class of literary display typography unless a stronger approved replacement is chosen.
Body text: keep body copy readable with a restrained serif pairing. The current Spectral body face is a credible implementation of this recommendation, and future refinement should preserve readability over ornament.
Consider adding subtle shadow or gradient effects to headings to mimic embossed book titles where contrast and restraint remain intact.
3. Enhance the Background and Borders
Hero header: replace the plain background with an illustrative hero section—perhaps a watercolor illustration of an enchanted library, starry night sky, or mystical forest. This could be a static image or a subtle parallax animation, similar to the cinematic intros on Bob & Todd and Kate Jones’s sites.
Textures: overlay light parchment textures or smoky mist patterns to add depth without clutter. Keep the opacity low so the interface remains polished.
Decorative frames: style cards or panels with subtle borders inspired by Celtic or Art Nouveau motifs, echoing the ornate frames around books in Tom Elliot’s site.
4. Introduce Fantasy‑Focused Features
World‑building tools: create dedicated pages for lore, character profiles, maps, and glossaries, following the example of The Ulti Deic Prophecies site. Use interactive components (e.g., zoomable maps) similar to Davis Ashura’s world maps.
Scroll‑based storytelling: design a section where users scroll through short narrative snippets or inspirational quotes, accompanied by illustrations, as on Tomi Adeyemi’s writer section.
Fan engagement: offer free sample chapters, deleted scenes, or audio playlists (inspired by T.A. White and Trang Thanh Tran). Place newsletter sign‑up forms prominently on these pages to grow the user base.
5. Refine the Sidebar and Navigation
Styling: change the sidebar’s background to a darker gradient (e.g., deep forest to navy) with translucent overlays. Update hover states to use glowing effects or subtle color transitions.
Icons: use custom icons depicting quills, scrolls, dragons or stars instead of generic bars. Ensure they match the font’s style.
Brand mark: incorporate a symbolic logo, such as an open book with an emanating light or a dragon wrapped around a quill, to replace or accompany the “BookWorm” text. Use this motif consistently across the site (similar to Susan Dennard’s sunshine graphic).
6. Maintain Performance and Accessibility
Optimize images and backgrounds to maintain quick loading times. Davis Ashura’s site improved user experience by making pages load six times faster—this remains essential for BookWorm.
Maintain sufficient contrast between text and backgrounds for readability; pair dark text with light backgrounds or vice versa, and ensure buttons stand out.
Provide alternative text descriptions for decorative images to support screen readers.
Conclusion

Fantasy author websites demonstrate that immersive artwork, carefully chosen palettes, elegant typography and interactive storytelling can transport visitors into the author’s world. By adopting a dark‑base plus luminous accent color scheme, incorporating decorative serif fonts, adding mystical imagery, and integrating world‑building features, BookWorm can evolve from a utilitarian writing tool into an ethereal companion that delights fantasy authors and readers alike. These refinements will align the AI agent’s visual identity with its mission of agentic novel writing and create a polished, magical experience.

The report synthesizes examples from top fantasy-author websites, outlines common color palettes, typography choices, and imagery motifs, and provides specific suggestions for adapting these elements to BookWorm’s interface. Let me know if you need help applying these recommendations or creating new assets!
