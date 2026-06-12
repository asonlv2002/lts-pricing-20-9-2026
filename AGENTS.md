# AGENTS.md

Primary project guidance lives in [CLAUDE.md](./CLAUDE.md). Always read and follow it.

## Mandatory Rule: UI Skill Selection

When choosing a UI/design skill for this project:

- Use `ui-ux-pro-max` for anything related to the UI of web mobile, including "web mobile", "UI web mobile", "mobile tren web", mobile layout, mobile styling, mobile interaction states, or mobile responsiveness in `apps/web`.
- Use `frontend-design` for other frontend UI/design work that is not specifically web mobile.
- If a task affects both web mobile and non-mobile frontend UI, use `ui-ux-pro-max` first for the web mobile constraints, then use `frontend-design` only for the non-mobile UI parts if still needed.

## Mandatory Rule: UI Sketch Requests

When the user asks to "vẽ ra", "vẽ lại", "vẽ UI", or uses any instruction where "vẽ" means sketching or illustrating a UI/layout concept:

- Respond with ASCII art in the chat to sketch the UI/layout.
- Do not treat the request as asking for image generation, canvas drawing, or code implementation unless the user explicitly asks for those.
- If the user asks to continue after a UI spec and says "vẽ", draw the proposed UI state(s) with ASCII art first.
- Keep labels in Vietnamese when sketching this project's UI.
- If multiple states are relevant, draw each state separately with a short title.

## Mandatory Rule: Web Mobile UI

When the user mentions "web mobile", "UI web mobile", "mobile trên web", or asks to adjust the mobile UI of the web app:

- Treat the request as applying only to the Next.js web app in `apps/web`.
- Never edit the React Native app in `apps/mobile` unless the user explicitly says "React Native", "native app", or `apps/mobile`.
- Never change web desktop/base UI unless the user explicitly asks for desktop changes.
- Desktop/base CSS is the default. Do not change broad base selectors such as `.form-row`, `.form-row-3`, `.card`, `.btn`, `.main-grid`, or shared layout rules for a web-mobile-only request.
- All web mobile CSS changes must be inside `@media (max-width: 767px)` unless there is a specific existing narrower mobile breakpoint being extended.
- All app-level web mobile CSS must be scoped with `.lts-shell--mobile`.
- For the pricing/calculator screen, additionally scope mobile CSS with `.mobile-calc-container`.
- Preferred selector shape for pricing web mobile changes:
  `.lts-shell--mobile .mobile-calc-container .specific-class-name`
- Prefer adding a specific class to the exact JSX group being changed, then styling that class in the mobile scope. Examples: `.product-type-row`, `.structure-size-row`, `.structure-print-row`.
- Do not use global mobile selectors like `.form-row { ... }`, `.form-row-3 { ... }`, `.card { ... }`, or `.btn { ... }` unless they are scoped under the relevant module wrapper.
- Do not add new `!important` rules unless needed to beat legacy CSS. If unavoidable, the selector must still be scoped under `.lts-shell--mobile` and the relevant module wrapper.
- Before editing for a web-mobile-only UI task, verify the planned selectors cannot affect web desktop.

For web mobile pricing UI work, the safe scope is:

```css
@media (max-width: 767px) {
  .lts-shell--mobile .mobile-calc-container .specific-class-name {
    /* mobile-only styles */
  }
}
```
