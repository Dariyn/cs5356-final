# Kanban Board Application

A full-stack Kanban board application built with Next.js, featuring drag-and-drop functionality, user authentication, and role-based access control.

## Features

- **User Authentication**: Sign up, login, and profile management
- **Kanban Boards**: Create and manage multiple boards
- **Drag and Drop Interface**: Intuitive drag-and-drop for tasks and columns
- **Task Management**: Create, edit, delete, and mark tasks as completed
- **Role-Based Access Control**: Admin interface for managing users and permissions
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React, Next.js, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js
- **Drag and Drop**: dnd-kit

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Docker and Docker Compose (for local PostgreSQL database)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd kanban-board
```

2. Install dependencies:

```bash
npm install
# or
pnpm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/kanban

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key
```

4. Start the PostgreSQL database:

```bash
npm run db:start
```

5. Generate and apply database migrations:

```bash
npm run db:generate
npm run db:migrate
```

6. Start the development server:

```bash
npm run dev
```

7. Open your browser and navigate to `http://localhost:3000`

## Deployment

The application can be deployed to Vercel with a PostgreSQL database from providers like Neon or Supabase.

1. Create a Vercel account and connect your repository
2. Set up environment variables on Vercel:
   - `DATABASE_URL`: Your production database connection string
   - `NEXTAUTH_URL`: Your application URL
   - `NEXTAUTH_SECRET`: A secure random key (generate with `openssl rand -hex 32`)
3. Deploy your application

## Project Structure

```
kanban-board/
├── src/
│   ├── app/              # Next.js app router
│   │   ├── api/          # API routes
│   │   ├── auth/         # Authentication pages
│   │   ├── boards/       # Board pages
│   │   └── admin/        # Admin interface
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   │   ├── db/           # Database models and connection
│   │   └── auth.ts       # Authentication setup
│   └── types/            # TypeScript definitions
├── public/               # Static files
├── drizzle/              # Drizzle migrations
└── docker-compose.yml    # Docker setup for local development
```

## License

This project is licensed under the MIT License.
