## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Language

This is a **Spanish-language website** (primary locale: `es`).

- Use `lang="es"` on the root `<html>` element (and any document/layout that sets language).
- Write all user-facing copy in Spanish: headings, body text, buttons, labels, placeholders, form validation messages, empty states, toasts, tooltips, and navigation.
- Write accessibility text in Spanish: `alt`, `aria-label`, `aria-describedby` content, and visually hidden helper text.
- Write SEO/metadata in Spanish: page titles, descriptions, Open Graph, and similar meta content unless a field must stay in a brand/legal English form.
- Prefer natural, clear Spanish suitable for a church/community audience (Iglesia Bautista Victory). Avoid Spanglish and machine-translated phrasing when drafting or editing copy.
- Code identifiers (component names, CSS classes, file paths, props) stay in English as usual; only user-visible strings are Spanish.
- Do not add English UI as the default. If bilingual content is requested later, keep Spanish as the primary experience unless the user says otherwise.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Starwind UI

This project uses **Starwind UI** (Astro + Tailwind CSS v4). When creating, composing, fixing, theming, or styling UI components, **always** pull current guidance via the Context7 CLI before implementing. Do not guess props, composition patterns, or CLI flags from memory.

### Required ctx7 sources

| Source | Library ID | Use for |
|--------|------------|---------|
| Starwind docs | `/websites/starwind_dev` | Component APIs, install/CLI, theming, dark mode, examples |
| Starwind skills | `/starwind-ui/skills` | Agent workflows for install, compose, theme, and Pro usage |

```bash
# Docs and examples (prefer specific component/topic queries)
npx ctx7@latest docs /websites/starwind_dev "How to use the Button and Dialog components"
npx ctx7@latest docs /websites/starwind_dev "CLI add components and starwind.config.json"

# Skills / agent patterns for UI work
npx ctx7@latest docs /starwind-ui/skills "How to compose forms cards and dialogs with Starwind"
npx ctx7@latest docs /starwind-ui/skills "Theming CSS variables and dark mode"
```

Also load the local **starwind-ui** skill (if installed) and follow its critical rules: prefer existing components, compose with variants/tokens, Astro `class`/`for` syntax, and install missing pieces with `pnpm dlx starwind@latest add <component>` (this project uses pnpm).

Project anchors: `starwind.config.json`, `src/styles/starwind.css`, and installed components under `src/components/starwind` (local source is the final authority for already-installed components).


# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `pnpm dlx ultracite fix` before committing to ensure compliance.
