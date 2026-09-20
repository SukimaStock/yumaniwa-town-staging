# ORBIT text / localization

Runtime copy lives outside the game code.

- `ja.json` is the current Japanese build, moved out verbatim before editorial review.
- `orbit-text.js` loads the requested locale before ORBIT starts.
- Use `?lang=ja` (and later `?lang=en`) or `OrbitText.setLocale(locale)`.
- If a requested locale file does not exist, the loader falls back to Japanese.

## Rules

1. Stable game logic stays in JavaScript; user-facing copy belongs in locale JSON.
2. Event IDs and planet IDs are not translated.
3. Placeholders use `{name}` syntax.
4. E.V.E. phase text is authored per locale, not mechanically translated.

Japanese E.V.E. currently evolves:
broken English -> simple English -> katakana -> hiragana -> natural Japanese.

The planned English curve should preserve the same narrative meaning without copying that visual trick:
signal fragments/noise -> very limited English -> simple complete English -> natural conversational English -> nuanced/emotionally precise English.

Do not make late English merely use obscure vocabulary; the recovery is primarily the ability to express context, implication, relationship and feeling.
