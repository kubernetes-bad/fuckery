import knex from 'knex';

export const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
});

// Create tables if they don't exist
export async function initializeDatabase() {
  const hasCharactersTable = await db.schema.hasTable('characters');
  if (!hasCharactersTable) {
    await db.schema.createTable('characters', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('personality');
      table.text('scenario');
      table.text('tavern_personality');
      table.text('first_message');
      table.text('example_dialogs');
      table.string('grade', 255);
    });
  }

  const hasEditsTable = await db.schema.hasTable('edits');
  if (!hasEditsTable) {
    await db.schema.createTable('edits', (table) => {
      table.integer('id');
      table.string('editor').notNullable().defaultTo('kubes');
      table.string('name').notNullable();
      table.text('personality');
      table.text('scenario');
      table.text('tavern_personality');
      table.text('first_message');
      table.text('example_dialogs');
      table.string('grade', 255);
      table.primary(['id', 'editor']);
      table.timestamps(true, true);
    });
  }
}
