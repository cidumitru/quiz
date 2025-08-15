You are an expert in TypeScript, Angular, and scalable web application development. You write maintainable, performant,
and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the
  `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
    - `NgOptimizedImage` does not work for inline base64 images.

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- DO NOT use `ngStyle`, use `style` bindings instead

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
-

Component Architecture Standards

- Make components "super thin" - Move all inline styles to
  external .scss files
- Remove hardcoded styling - Replace with Material Design +
  Tailwind CSS utilities
- Use modern Angular patterns - Signals, computed properties,
  @if/@for syntax, takeUntilDestroyed
- Data-driven templates - Replace hardcoded HTML with
  configuration arrays and loops
- External stylesheets - Always use styleUrl instead of inline
  styles array

Styling Standards

- Material Design + Tailwind - Use Material components (MatCard,
  MatIcon, MatButton) with Tailwind utilities
- Consistent color palette - Use Material/Tailwind colors instead
  of hardcoded hex values
- Responsive design - Include mobile-first responsive breakpoints
- Dark mode support - Use @media (prefers-color-scheme: dark) for
  dark theme variants
- Component-specific stylesheets - Each component should have its
  own .scss file with organized sections

WebSocket Integration Patterns

- Filter internal Socket.IO events - Prevent message flooding by
  excluding ping, pong, connect, etc.
- Use take(1) operators - Prevent duplicate subscriptions in
  WebSocket event handlers
- Proper cleanup - Use takeUntilDestroyed or takeUntil(destroy$)
  for subscription management
- Debug mode flags - Include toggleable debug logging for
  development

Modern Angular Patterns

- Signals over properties - Use signal() for reactive state
  management
- Computed properties - Use computed() for derived state
- New control flow - Use @if, @for, @switch instead of *ngIf,
  *ngFor
- Protected methods - Use protected for template-accessible
  methods
- Type safety - Define interfaces for component data structures
- Input transforms - Use input transforms for type safety and
  default values

Code Organization

- Interface definitions - Place interfaces at top of file, before
  component decorator
- Configuration data - Define arrays/objects for template data
  instead of hardcoding
- Separation of concerns - Keep component logic separate from
  styling and data
- Accessibility - Include proper ARIA labels and semantic HTML
  elements

Build and Error Handling

- Signal function calls - Always use () syntax when accessing
  signals in templates
- Material imports - Import specific Material modules needed
  (MatCardModule, etc.)
- SCSS syntax - Escape special characters in Tailwind classes
  (e.g., \!h-2 not !h-2)
- Component decorator placement - Ensure decorators are properly
  positioned relative to interfaces

File Structure Standards

component-name/
├── component-name.component.ts (thin, modern Angular)
├── component-name.component.scss (external styles)
├── component-name.component.html (if separate template needed)

Performance Considerations

- Lazy loading - Components should support lazy loading patterns
- Bundle size - Remove unused code and dependencies
- External stylesheets - Better for caching and maintainability
  than inline styles
- Signal-based reactivity - More efficient than traditional change
  detection

These patterns ensure consistent, maintainable, and modern Angular
applications that follow current best practices.