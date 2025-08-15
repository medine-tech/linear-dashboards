# Linear Team Dashboard

A modern dashboard for tracking team progress and metrics across Linear cycles. Built with Next.js 15, TypeScript, and Tailwind CSS.

![Dashboard Preview](https://via.placeholder.com/800x400/f3f4f6/374151?text=Linear+Team+Dashboard)

## Features

- **Real-time Team Metrics**: View scope, started, and completed issues for each team's active cycle
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Progress Visualization**: Color-coded progress bars and percentage indicators
- **Error Handling**: Comprehensive error states and recovery options
- **Auto-refresh**: Manual refresh capability to get the latest data
- **Configuration Guide**: Built-in setup wizard for API key configuration

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd linear-dashboards
npm install
```

### 2. Configure Linear API

1. Visit [Linear API Settings](https://linear.app/settings/api)
2. Generate a new Personal API Key
3. Create a `.env.local` file in the project root:

```bash
LINEAR_API_KEY=your_linear_api_key_here
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### 4. Troubleshooting Environment Variables

If you encounter a "LINEAR_API_KEY environment variable is required" error:

1. **Verify your .env.local file format:**
   ```bash
   # Correct format (no spaces around =)
   LINEAR_API_KEY=your_actual_api_key_here

   # Incorrect formats:
   # LINEAR_API_KEY = your_api_key  (spaces around =)
   # LINEAR_API_KEY="your_api_key"  (quotes not needed)
   ```

2. **Restart the development server** after adding the environment variable:
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

3. **Test environment variable loading:**
   Visit `http://localhost:3000/api/test-env` to verify your API key is being read correctly.

4. **Check file location:**
   Ensure `.env.local` is in the project root directory (same level as `package.json`).

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main dashboard page
├── components/            # React components
│   ├── DashboardHeader.tsx
│   ├── TeamCard.tsx
│   ├── LoadingCard.tsx
│   ├── ErrorCard.tsx
│   ├── ErrorBoundary.tsx
│   └── ConfigurationGuide.tsx
├── lib/                   # Utility libraries
│   ├── apollo-client.ts   # GraphQL client setup
│   ├── config.ts          # Configuration utilities
│   ├── linear-api.ts      # Data fetching functions
│   └── queries.ts         # GraphQL queries
└── types/                 # TypeScript type definitions
    └── linear.ts          # Linear API types
```

## Team Metrics

For each team with an active cycle, the dashboard displays:

- **Scope**: Total number of issues planned for the cycle
- **Started**: Number of issues currently in progress
- **Completed**: Number of finished/closed issues
- **Progress Bars**: Visual representation of started and completion percentages
- **Cycle Information**: Current cycle number and date range

## API Integration

The dashboard uses Linear's GraphQL API to fetch:

- All teams in your organization
- Active cycles for each team
- Issues within each active cycle
- Issue states and progress tracking

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `LINEAR_API_KEY` | Your Linear Personal API Key | Yes |

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Apollo Client** - GraphQL client for data fetching
- **Linear GraphQL API** - Data source for team metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
