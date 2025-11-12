# Next.js with shadcn/ui and Tailwind CSS

A modern Next.js application featuring shadcn/ui components and Tailwind CSS styling with a responsive sidebar navigation.

## Features

- ⚡ **Next.js 16** - React framework with App Router
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🧩 **shadcn/ui** - High-quality, accessible component library
- 📱 **Responsive Sidebar** - Collapsible navigation with mobile support
- 🎯 **TypeScript** - Type-safe development
- 🔧 **ESLint** - Code linting and formatting

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout with sidebar
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   ├── app-sidebar.tsx  # Main sidebar component
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/
│   │   └── use-mobile.ts    # Mobile detection hook
│   └── lib/
│       └── utils.ts         # Utility functions
├── components.json          # shadcn/ui configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, pnpm, or bun

### Installation

Dependencies are already installed. To reinstall:

```bash
npm install
```

### Development Server

The development server is currently running at:
- **Local**: http://localhost:3000
- **Network**: http://192.168.68.62:3000

To start the server manually:

To start the server manually:

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## Components

### Sidebar Navigation

The application includes a fully functional sidebar with:
- Home
- Dashboard
- Users
- Documents
- Calendar
- Messages
- Settings

The sidebar is:
- Collapsible with a trigger button
- Responsive (mobile-friendly)
- Accessible
- Built with shadcn/ui components

### Available shadcn/ui Components

The following components are installed:
- Button
- Separator
- Sheet
- Tooltip
- Input
- Skeleton
- Sidebar

### Adding More Components

To add more shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

For example:
```bash
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

## Customization

### Tailwind CSS

Modify `tailwind.config.ts` to customize colors, spacing, and other design tokens.

### shadcn/ui Themes

Update color variables in `src/app/globals.css` to change the theme.

### Sidebar Items

Edit `src/components/app-sidebar.tsx` to modify navigation items:

```tsx
const items = [
  {
    title: "Your Item",
    url: "/your-path",
    icon: YourIcon,
  },
  // ... more items
]
```

## Tech Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui
- **Icons**: lucide-react
- **Linting**: ESLint

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
