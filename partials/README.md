# Partials

Markup shared by several pages. A page asks for one with a comment, and
`setup/build.js` swaps the comment for the file's contents:

```html
<!-- include: password-gate -->
<!-- include: password-gate title="Wedding Day" prompt="Enter the invitation code to see the program." -->
<!-- include: footer -->
<!-- include: lightbox -->
```

`[[name|default]]` in a partial is filled from the matching attribute, or
the default. Change a partial once and every page that includes it
changes. This folder isn't published; only the pages that include it are.

Remove a feature from a page by deleting its include line (for example, no
`password-gate` include makes that page public).
