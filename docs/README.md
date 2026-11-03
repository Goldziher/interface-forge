# Interface Forge Documentation

This directory contains the documentation for Interface Forge, built with [Docusaurus](https://docusaurus.io/).

## 🚀 Getting Started

### Prerequisites

- Node.js v22 or higher
- pnpm v11 or higher

### Development

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm docs:start

# The site will be available at http://localhost:3000/interface-forge/
```

### Building

```bash
# Build the documentation
pnpm docs:build

# Preview the production build locally
pnpm docs:serve
```

## 📁 Structure

```text
docs/
├── docs/                    # Documentation content
│   ├── getting-started/     # Getting started guides
│   ├── guides/             # Usage guides
│   ├── key-concepts/       # Core concepts
│   └── api/               # API documentation (generated)
├── src/                    # Custom components and pages
│   ├── components/         # React components
│   ├── css/               # Global styles
│   └── pages/             # Custom pages (homepage)
├── static/                 # Static assets
└── docusaurus.config.ts    # Docusaurus configuration
```

## 🎨 Customization

The documentation uses a GitHub-inspired theme. You can customize:

- **Colors**: Edit `src/css/custom.css`
- **Components**: Add new components in `src/components/`
- **Pages**: Create new pages in `src/pages/`

## 📝 Writing Documentation

1. **Markdown files**: Add `.md` or `.mdx` files in the `docs/` directory
2. **Sidebar**: Update `sidebars.ts` to include new pages
3. **API docs**: API documentation is generated from TypeScript source files

## 🚀 Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

- **Production**: <https://goldziher.github.io/interface-forge/>
- **Pull Request Previews**: Build artifacts are uploaded for each PR

## 🛠️ Troubleshooting

### Port already in use

If port 3000 is already in use:

```bash
pnpm docs:start -- --port 3001
```

### Build failures

1. Clear the cache:

    ```bash
    pnpm clear
    pnpm build
    ```

2. Check for broken links:

    ```bash
    pnpm build -- --no-minify
    ```

### API documentation not updating

The API documentation is generated during the build process. If it's not updating:

1. Delete the `api/` directory
2. Run `pnpm build` to regenerate

## 📚 Resources

- [Docusaurus Documentation](https://docusaurus.io/docs)
- [MDX Documentation](https://mdxjs.com/)
- [React Documentation](https://react.dev/)
