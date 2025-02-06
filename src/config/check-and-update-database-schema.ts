import { DataSource, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

async function createEnumType(queryRunner: any, enumName: string, enumValues: (string | number)[]) {
  const enumExists = await queryRunner.query(`
    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${enumName}');
  `);

  if (!enumExists[0].exists) {
    console.log(`Creating enum type ${enumName}`);
    const formattedValues = enumValues
      .map((value) => (typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : `'${value}'`))
      .join(', ');
    await queryRunner.query(`CREATE TYPE ${enumName} AS ENUM (${formattedValues});`);
  }
}

function getPostgresType(columnMetadata: any): string {
  if (columnMetadata.enum) {
    const enumName = `${columnMetadata.entityMetadata.tableName}_${columnMetadata.databaseName}_enum`.toLowerCase();
    return columnMetadata.isArray ? `${enumName}[]` : enumName;
  }

  const typeMap: Record<string, string> = {
    uuid: 'uuid',
    string: 'text',
    text: 'text',
    number: 'integer',
    int: 'integer',
    decimal: 'decimal',
    boolean: 'boolean',
    date: 'timestamp',
  };

  // Ensure type is a string before calling toLowerCase
  const type = typeof columnMetadata.type === 'string' ? columnMetadata.type.toLowerCase() : '';

  return typeMap[type] || 'text';
}

function formatDefaultValue(value: any, type: string, columnMetadata: any): string | undefined {
  if (value === undefined) return undefined;

  if (typeof value === 'function') {
    const fnStr = value.toString().toLowerCase();
    if (fnStr.includes('current_timestamp') || fnStr.includes('now')) return 'CURRENT_TIMESTAMP';
    return undefined;
  }

  if (Array.isArray(value) || (typeof value === 'string' && columnMetadata.isArray)) {
    const arrayValues = Array.isArray(value) ? value : [value];
    if (type.endsWith('[]')) {
      type.slice(0, -2);
      return `ARRAY[${arrayValues.map((v) => `'${v}'`).join(',')}]::${type}`;
    }
    return `ARRAY[${arrayValues.map((v) => `'${v}'`).join(',')}]`;
  }

  if (typeof value === 'boolean' || typeof value === 'number') return value.toString();
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;

  return undefined;
}

async function createJunctionTable(queryRunner: any, relation: any, ownerTable: string, inverseTable: string) {
  const junctionTableName = relation.junctionEntityMetadata?.tableName;
  if (!junctionTableName || await queryRunner.hasTable(junctionTableName)) return;

  console.log(`Creating junction table ${junctionTableName}...`);
  const table = new Table({
    name: junctionTableName,
    columns: [
      { name: relation.junctionEntityMetadata.ownerColumns[0].propertyPath, type: 'uuid', isNullable: false },
      { name: relation.junctionEntityMetadata.inverseColumns[0].propertyPath, type: 'uuid', isNullable: false },
    ],
  });

  await queryRunner.createTable(table, true);

  const ownerForeignKey = new TableForeignKey({
    columnNames: [relation.junctionEntityMetadata.ownerColumns[0].propertyPath],
    referencedColumnNames: ['id'],
    referencedTableName: ownerTable,
    onDelete: 'CASCADE',
  });

  const inverseForeignKey = new TableForeignKey({
    columnNames: [relation.junctionEntityMetadata.inverseColumns[0].propertyPath],
    referencedColumnNames: ['id'],
    referencedTableName: inverseTable,
    onDelete: 'CASCADE',
  });

  await queryRunner.createForeignKey(junctionTableName, ownerForeignKey);
  await queryRunner.createForeignKey(junctionTableName, inverseForeignKey);
}

async function checkAndUpdateDatabaseSchema(dataSource: DataSource) {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const entities = dataSource.entityMetadatas;

    // Create enum types first
    for (const entity of entities) {
      for (const column of entity.columns) {
        if (column.enum) {
          const enumName = `${entity.tableName}_${column.databaseName}_enum`.toLowerCase();
          await createEnumType(queryRunner, enumName, column.enum);
        }
      }
    }

    // Create or update tables and handle relationships
    for (const entity of entities) {
      const tableName = entity.tableName;
      const tableExists = await queryRunner.hasTable(tableName);

      if (!tableExists) {
        console.log(`Creating table ${tableName}...`);
        const table = new Table({
          name: tableName,
          columns: entity.columns.map((column) => {
            const postgresType = getPostgresType(column);
            const columnDef = new TableColumn({
              name: column.databaseName,
              type: postgresType,
              isNullable: column.isNullable,
              isPrimary: column.isPrimary,
              isGenerated: column.isGenerated,
              generationStrategy: column.generationStrategy,
            });

            const defaultValue = formatDefaultValue(column.default, postgresType, column);
            if (defaultValue !== undefined) columnDef.default = defaultValue;

            return columnDef;
          }),
        });

        await queryRunner.createTable(table, true);

        // Create indices
        for (const index of entity.indices) {
          const tableIndex = new TableIndex({
            name: index.name,
            columnNames: index.columns.map((col) => (typeof col === 'string' ? col : col.databaseName)),
            isUnique: index.isUnique,
            where: index.where,
          });
          await queryRunner.createIndex(tableName, tableIndex);
        }
      } else {
        console.log(`Checking columns for table ${tableName}...`);
        const columns = await queryRunner.query(`
          SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}';
        `);

        for (const column of entity.columns) {
          const columnExists = columns.some((c: any) => c.column_name === column.databaseName);
          if (!columnExists) {
            console.log(`Adding column ${column.databaseName} to table ${tableName}...`);
            const postgresType = getPostgresType(column);
            const columnDef = new TableColumn({
              name: column.databaseName,
              type: postgresType,
              isNullable: column.isNullable,
              isPrimary: column.isPrimary,
              isGenerated: column.isGenerated,
              generationStrategy: column.generationStrategy,
            });

            const defaultValue = formatDefaultValue(column.default, postgresType, column);
            if (defaultValue !== undefined) columnDef.default = defaultValue;

            await queryRunner.addColumn(tableName, columnDef);
          }
        }
      }

      // Handle many-to-many relationships
      for (const relation of entity.manyToManyRelations) {
        if (relation.junctionEntityMetadata) {
          await createJunctionTable(queryRunner, relation, tableName, relation.inverseEntityMetadata.tableName);
        }
      }
    }

    await queryRunner.commitTransaction();
    console.log('Database schema update completed successfully');
  } catch (error) {
    console.error('Error updating database schema:', error);
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export { checkAndUpdateDatabaseSchema };
