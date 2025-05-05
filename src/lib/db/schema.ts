import { pgTable, serial, text, timestamp, varchar, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
  image: text('image'),
  role: varchar('role', { length: 20 }).default('user'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const boards = pgTable('boards', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const columns = pgTable('columns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  position: integer('position').notNull(),
  boardId: integer('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  position: integer('position').notNull(),
  columnId: integer('column_id').notNull().references(() => columns.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  dueDate: timestamp('due_date'),
  isCompleted: boolean('is_completed').default(false),
});

export const boardRelations = relations(boards, ({ one, many }) => ({
  user: one(users, {
    fields: [boards.userId],
    references: [users.id],
  }),
  columns: many(columns),
}));

export const columnRelations = relations(columns, ({ one, many }) => ({
  board: one(boards, {
    fields: [columns.boardId],
    references: [boards.id],
  }),
  tasks: many(tasks),
}));

export const taskRelations = relations(tasks, ({ one }) => ({
  column: one(columns, {
    fields: [tasks.columnId],
    references: [columns.id],
  }),
})); 