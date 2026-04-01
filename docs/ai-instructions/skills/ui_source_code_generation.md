# ui_source_code_generation

| Field | Value |
|-------|-------|
| `name` | `ui_source_code_generation` |
| `next_phase` | development |

---

## Purpose

Generate frontend UI source code from UI module specs. Produces one component per page, a router, shared layout with menu, and an auth guard â€” all derived from ui-catalog.json and ui-{module}.json specs.

## Rules

- CRITICAL: config.design.uiModules is the INPUT folder (read-only spec files). config.output.uiSrc is the OUTPUT folder (write all generated code here). Never write into config.design.uiModules.
- CRITICAL: Generate .tsx / .ts files only â€” never .ejs, .hbs, .html, .vue, or any other template format unless config.ui.framework explicitly says so.
- CRITICAL: The Vite proxy must NOT include a rewrite that strips /api. Backend routes are registered as /api/... so the prefix must be forwarded intact.
- CRITICAL: The router must include a default index redirect at the root authenticated route: { index: true, element: <Navigate to='/{first-module-route}' replace /> }. Without this, visiting '/' shows a blank page.
- CRITICAL: Never generate duplicate .js and .tsx files for the same component. Generate .tsx only. If legacy .js files exist they will shadow the .tsx and the fix will appear to have no effect.
- CRITICAL: All mutation onSuccess handlers must call queryClient.invalidateQueries() for every affected query key before navigating. Without this the list page shows stale cached data after save.
- CRITICAL: Error messages shown to users must render the actual server error from error.response.data.error â€” not a hardcoded generic string. Use: (error as any)?.response?.data?.error ?? error?.message ?? 'fallback message'.
- Read config.ui for framework and styling choices before generating any file
- Read ui-catalog.json menu array to build the router and Sidebar â€” menu order = route order
- Read each ui-{module}.json for page specs â€” one component per page
- subNav in a module spec â†’ render a TabBar or secondary nav within the module's AppShell slot
- navigation.menuVisible=true pages are direct routes; menuVisible=false pages are nested/child routes
- Every page component receives typed props â€” no any
- Derive column and field names from shows[] and validation[] in the page spec â€” do not invent fields
- Every form must implement all validation rules from the page spec
- All list pages must render emptyState string when the data array is empty
- All delete/destructive actions must show a confirm dialog before proceeding
- Do not generate mock data or hardcoded values â€” all data comes from api/ functions
- Do not overwrite scaffold files (package.json, tsconfig.json, vite.config.ts) if they already exist
- Never write outside config.output.uiSrc
- The sidebar menu filters items by user role â€” mock auth must default to the highest-privilege role (HR_ADMIN or equivalent) so all modules are visible during development.
- tsconfig.json exclude must include src/test to prevent test files from breaking the production build.
- Any type used in a page component (e.g. actorName on an audit entry) must be declared in the corresponding type file in src/types/. Cross-check all page field references against the type definitions before generating.

## Tools Used

- file_manager
