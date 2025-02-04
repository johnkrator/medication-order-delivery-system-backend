import {
  DataSource,
  TableColumn,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Order } from '../order/entities/order.entity';
import { Medication } from '../medication/entities/medication.entity';
import { DeliveryPartner } from '../delivery-partner/entities/delivery-partner.entity';
import { Payment } from '../payment/entities/payment.entity';

async function createEnumType(
  queryRunner: any,
  enumName: string,
  enumValues: (string | number)[],
) {
  const enumExists = await queryRunner.query(`
      SELECT EXISTS (SELECT 1
                     FROM pg_type
                     WHERE typname = '${enumName}');
  `);

  if (!enumExists[0].exists) {
    console.log(`Creating enum type ${enumName}`);
    const formattedValues = enumValues
      .map((value) =>
        typeof value === 'string'
          ? `'${value.replace(/'/g, "''")}'`
          : `'${value}'`,
      )
      .join(', ');

    await queryRunner.query(`
      CREATE TYPE ${enumName} AS ENUM (${formattedValues});
    `);
  }
}

function getPostgresType(columnMetadata: any): string {
  if (columnMetadata.enum) {
    const enumName =
      `${columnMetadata.entityMetadata.tableName}_${columnMetadata.databaseName}_enum`.toLowerCase();
    return columnMetadata.isArray ? `${enumName}[]` : enumName;
  }

  if (typeof columnMetadata.type === 'string') {
    switch (columnMetadata.type.toLowerCase()) {
      case 'uuid':
        return 'uuid';
      case 'string':
      case 'text':
        return 'text';
      case 'number':
      case 'int':
        return 'integer';
      case 'decimal':
        return 'decimal';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'timestamp';
      default:
        return columnMetadata.type.toLowerCase();
    }
  }

  const typeStr = columnMetadata.type.toString().toLowerCase();
  if (typeStr.includes('string')) return 'text';
  if (typeStr.includes('number')) return 'integer';
  if (typeStr.includes('boolean')) return 'boolean';
  if (typeStr.includes('date')) return 'timestamp';

  return 'text';
}

function formatDefaultValue(
  value: any,
  type: string,
  columnMetadata: any,
): string | undefined {
  if (value === undefined) return undefined;

  if (typeof value === 'function') {
    const fnStr = value.toString().toLowerCase();
    if (fnStr.includes('current_timestamp') || fnStr.includes('now')) {
      return 'CURRENT_TIMESTAMP';
    }
    return undefined;
  }

  // Special handling for array defaults
  if (
    Array.isArray(value) ||
    (typeof value === 'string' && columnMetadata.isArray)
  ) {
    // If it's a single string value for an array column, wrap it in an array
    const arrayValues = Array.isArray(value) ? value : [value];

    // For enum arrays, we need to cast the array to the correct type
    if (type.endsWith('[]')) {
      const enumTypeName = type.slice(0, -2); // Remove the '[]' suffix
      return `ARRAY[${arrayValues.map((v) => `'${v}'`).join(',')}]::${type}`;
    }

    return `ARRAY[${arrayValues.map((v) => `'${v}'`).join(',')}]`;
  }

  if (typeof value === 'boolean') return value.toString();
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;

  return undefined;
}

async function createJunctionTable(
  queryRunner: any,
  relation: any,
  ownerTable: string,
  inverseTable: string,
) {
  const junctionTableName = relation.junctionEntityMetadata?.tableName;

  if (!junctionTableName) {
    return;
  }

  const tableExists = await queryRunner.hasTable(junctionTableName);
  if (tableExists) {
    return;
  }

  console.log(`Creating junction table ${junctionTableName}...`);

  // Create the junction table
  const table = new Table({
    name: junctionTableName,
    columns: [
      {
        name: relation.junctionEntityMetadata.ownerColumns[0].propertyPath,
        type: 'uuid',
        isNullable: false,
      },
      {
        name: relation.junctionEntityMetadata.inverseColumns[0].propertyPath,
        type: 'uuid',
        isNullable: false,
      },
    ],
  });

  await queryRunner.createTable(table, true);

  // Add foreign keys
  const ownerForeignKey = new TableForeignKey({
    columnNames: [relation.junctionEntityMetadata.ownerColumns[0].propertyPath],
    referencedColumnNames: ['id'],
    referencedTableName: ownerTable,
    onDelete: 'CASCADE',
  });

  const inverseForeignKey = new TableForeignKey({
    columnNames: [
      relation.junctionEntityMetadata.inverseColumns[0].propertyPath,
    ],
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

    const entities = [User, Order, Medication, DeliveryPartner, Payment];

    // Create enum types first
    for (const entity of entities) {
      const tableMetadata = dataSource.getMetadata(entity);

      for (const column of tableMetadata.columns) {
        if (column.enum) {
          const enumName =
            `${tableMetadata.tableName}_${column.databaseName}_enum`.toLowerCase();
          await createEnumType(queryRunner, enumName, column.enum);
        }
      }
    }

    // Create or update tables and handle relationships
    for (const entity of entities) {
      const tableMetadata = dataSource.getMetadata(entity);
      const tableName = tableMetadata.tableName;
      const tableExists = await queryRunner.hasTable(tableName);

      if (!tableExists) {
        console.log(`Creating table ${tableName}...`);

        const table = new Table({
          name: tableMetadata.tableName,
          columns: tableMetadata.columns.map((column) => {
            const postgresType = getPostgresType(column);
            const columnDef: TableColumn = new TableColumn({
              name: column.databaseName,
              type: postgresType,
              isNullable: column.isNullable,
              isPrimary: column.isPrimary,
              isGenerated: column.isGenerated,
              generationStrategy: column.generationStrategy,
            });

            const defaultValue = formatDefaultValue(
              column.default,
              postgresType,
              column,
            );
            if (defaultValue !== undefined) {
              columnDef.default = defaultValue;
            }

            return columnDef;
          }),
        });

        await queryRunner.createTable(table, true);

        // Create indices
        const indices = tableMetadata.indices;
        for (const indexMetadata of indices) {
          const tableIndex = new TableIndex({
            name: indexMetadata.name,
            columnNames: indexMetadata.columns.map((col) =>
              typeof col === 'string' ? col : col.databaseName,
            ),
            isUnique: indexMetadata.isUnique,
            where: indexMetadata.where,
          });

          await queryRunner.createIndex(tableName, tableIndex);
        }
      } else {
        console.log(`Checking columns for table ${tableName}...`);

        // Check and add missing columns
        const columns = await queryRunner.query(`
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns
            WHERE table_name = '${tableName}'
        `);

        for (const columnMetadata of tableMetadata.columns) {
          const columnExists = columns.some(
            (c) => c.column_name === columnMetadata.databaseName,
          );

          if (!columnExists) {
            console.log(
              `Adding column ${columnMetadata.databaseName} to table ${tableName}...`,
            );

            const postgresType = getPostgresType(columnMetadata);
            const columnDef = new TableColumn({
              name: columnMetadata.databaseName,
              type: postgresType,
              isNullable: columnMetadata.isNullable,
              isPrimary: columnMetadata.isPrimary,
              isGenerated: columnMetadata.isGenerated,
              generationStrategy: columnMetadata.generationStrategy,
            });

            const defaultValue = formatDefaultValue(
              columnMetadata.default,
              postgresType,
              columnMetadata,
            );
            if (defaultValue !== undefined) {
              columnDef.default = defaultValue;
            }

            await queryRunner.addColumn(tableName, columnDef);
          }
        }
      }

      // Handle many-to-many relationships
      for (const relation of tableMetadata.manyToManyRelations) {
        if (relation.junctionEntityMetadata) {
          const inverseEntityMetadata = relation.inverseEntityMetadata;
          await createJunctionTable(
            queryRunner,
            relation,
            tableName,
            inverseEntityMetadata.tableName,
          );
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
