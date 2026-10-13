# Onefold mobile design system

## Product

Onefold is a mobile-first training app for simple routines, focused workout sessions, and visible progress. Auth is the quiet entry point into a private, device-local demo experience. The sign-in screen should feel focused, trustworthy, and easy to complete with one hand.

Primary routes are sign in, registration, password reset, routines, workout history, active workout, and settings. Auth screens share one responsive component and must preserve the same hierarchy across modes.

## Visual direction

Use a calm digital-wellness style: spacious single-column composition, tactile rounded surfaces, restrained decoration, and clear sentence-case hierarchy. Adapt the selected “Softly — Digital Wellness App” direction to Onefold’s existing identity. Do not import its peach, lavender, cursive type, grain overlay, or landing-page scale.

The interface should feel modern through proportion, breathing room, gentle tonal layering, and polished controls. Keep the screen useful on compact phones and avoid dense nested cards. Decoration may use subtle blurred shapes or low-contrast tonal fields drawn only from the existing palette. Motion, if represented, should be slow and minimal; respect reduced-motion preferences in implementation.

## Color tokens

Use only these product colors.

### Light

- Background: `#F5F7F7`
- Surface: `#FFFFFF`
- Primary text: `#172526`
- Secondary text: `#526467`
- Accent: `#006D65`
- Accent text: `#FFFFFF`
- Accent soft: `#DDF3EE`
- Border: `#CAD8D6`
- Danger: `#AD2F38`
- Danger soft: `#FBEAEC`
- Disabled: `#758683`
- Background element: `#EAF0EF`

### Dark

- Background: `#101919`
- Surface: `#192525`
- Primary text: `#EDF5F3`
- Secondary text: `#AEC2BE`
- Accent: `#72DACA`
- Accent text: `#072D29`
- Accent soft: `#193D36`
- Border: `#3E5550`
- Danger: `#FFABB0`
- Danger soft: `#472A2E`
- Disabled: `#91A39F`
- Background element: `#22312E`

Do not introduce gradients or additional hues. Light and dark modes must maintain readable contrast.

## Typography

Use the platform system sans-serif only. Do not introduce web fonts, cursive faces, or decorative display type.

- Title: 30px, 700 weight, 42px line height
- Heading: 20px, 700 weight, 28px line height
- Body: 16px, 400 weight, 22px line height
- Caption: 13px, 400 to 600 weight, 18px line height
- Brand eyebrow may use 13px, 800 weight, and modest letter spacing

Prefer sentence case. Keep text scalable and avoid clipping at larger accessibility text sizes.

## Spacing, shape, and elevation

- Spacing scale: 2, 4, 8, 16, 24, 32, 64
- Screen horizontal padding: 20px; increase only on wider screens
- Screen content maximum width: 760px; auth form should stay comfortably narrower on tablet/web
- Control radius: 12px
- Card radius: 18px
- Pill radius: 28px
- Minimum touch target: 48px
- Use borders and tonal surfaces for depth. If a shadow is necessary, keep it soft and low-opacity.

## Auth screen pattern

- Respect top and bottom safe areas and keyboard avoidance.
- Use a vertically scrollable single-column layout with the primary form action reachable without awkward stretching.
- Lead with a compact Onefold wordmark treatment, a welcoming title, and short supporting copy.
- Keep the email and password fields grouped with clear labels.
- Put password visibility inside or directly beside the password field as a clear accessible action.
- Make the primary sign-in button full width and visually dominant.
- Add outlined “Continue with Google” and “Continue with Apple” buttons as visual placeholders only; show familiar monochrome provider marks and give each at least a 48px touch target. They have no functional behavior in this design round.
- Separate social sign-in from email sign-in with a calm “or continue with email” divider.
- Present create-account and forgot-password actions as concise secondary text actions rather than competing full-width buttons.
- Keep the demo-mode disclosure visible but quiet, using accent-soft or background-element treatment.
- Keep the device-local privacy note near the bottom.
- No navigation bar, bottom tabs, stock photography, or large marketing illustration on auth screens.

## Accessibility and cross-platform behavior

- Maintain visible labels; placeholders do not replace labels.
- Ensure icon-only actions have accessible names.
- Do not rely on color alone for validation or state.
- Keep controls at least 48px high with sufficient separation.
- Support iOS, Android, and web layout behavior without fixed-height screens.
- Keep important content within safe areas and visible when the software keyboard is open.

## Source fidelity

The current app uses custom React Native primitives backed by `@expo/ui`, the system palette, and Expo Router. Drafts should preserve the existing content and demo semantics unless the redesign prompt explicitly changes presentation. Use only the fonts, colors, spacing, and component styles defined here.
