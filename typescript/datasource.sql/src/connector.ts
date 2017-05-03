import {DataSourceInternal} from '@openmicrostep/aspects';
import {Pool, SqlMaker, SqlBinding} from './index';
import ConstraintType = DataSourceInternal.ConstraintType;

export interface DBConnector {
  maker: SqlMaker;
  transaction(): Promise<DBConnectorTransaction>;
  unsafeRun(sql: SqlBinding) : Promise<void>;
  select(sql_select: SqlBinding) : Promise<object[]>;
  update(sql_update: SqlBinding) : Promise<number>;
  insert(sql_insert: SqlBinding, output_columns: string[]) : Promise<any[]>;
}
export interface DBConnectorTransaction {
  select(sql_select: SqlBinding) : Promise<object[]>;
  update(sql_update: SqlBinding) : Promise<number>;
  insert(sql_insert: SqlBinding, output_columns: string[]) : Promise<any[]>;
  commit() : Promise<void>;
  rollback() : Promise<void>;
}

export namespace DBConnector {
  export interface Definition<LIB, OPTIONS, DB> {
    maker: SqlMaker,
    create(lib: LIB, options: OPTIONS): Promise<DB>,
    destroy(lib: LIB, db: DB): Promise<void>,
    select(lib: LIB, db: DB, sql_select: SqlBinding) : Promise<object[]>,
    update(lib: LIB, db: DB, sql_update: SqlBinding) : Promise<number>,
    insert(lib: LIB, db: DB, sql_insert: SqlBinding, output_columns: string[]) : Promise<object>,
    run(lib: LIB, db: DB, sql: SqlBinding) : Promise<any>,
    beginTransaction(lib: LIB, db: DB): Promise<void>,
    commit(lib: LIB, db: DB): Promise<void>,
    rollback(lib: LIB, db: DB): Promise<void>,
    transform(sql: SqlBinding) : SqlBinding,
  }
  export function transformPass(sql: SqlBinding) { return sql; }
  export function transformBindings(sql: SqlBinding, replacer: (idx: number) => string) {
    let idx = 0;
    return { sql: sql.sql.replace(/\?/g, () => replacer(idx++)), bind: sql.bind };
  }
  export function createSimple<LIB, OPTIONS, DB>(definition: Definition<LIB, OPTIONS, DB>) {
    class GenericConnectorTransaction implements DBConnectorTransaction {
      lib: LIB;
      db: DB | undefined;
      pool: Pool<DB> | undefined;
      constructor(lib: LIB, db: DB, pool: Pool<DB>) {
        this.lib = lib;
        this.db = db;
        this.pool = pool;
      }

      private _check() {
        if (!this.db)
          return Promise.reject(`cannot use transaction after commit or rollback`);
        return undefined;
      }
      select(sql_select: SqlBinding) : Promise<object[]> { return this._check() || definition.select(this.lib, this.db!, definition.transform(sql_select)); }
      update(sql_update: SqlBinding) : Promise<number>   { return this._check() || definition.update(this.lib, this.db!, definition.transform(sql_update)); }
      insert(sql_insert: SqlBinding, out: string[])      { return this._check() || definition.insert(this.lib, this.db!, definition.transform(sql_insert), out); }
      commit() : Promise<void>   { return this._check() || this._endTransaction(definition.commit(this.lib, this.db!));   }
      rollback() : Promise<void> { return this._check() || this._endTransaction(definition.rollback(this.lib, this.db!)); }

      private _endTransaction(promise: Promise<void>): Promise<void> {
        let ret = promise.then(() => { this.pool!.release(this.db!); this.db = undefined; this.pool = undefined; });
        ret.catch(err => { this.pool!.releaseAndDestroy(this.db!); this.db = undefined; this.pool = undefined; });
        return ret;
      }
    }
    class GenericConnector implements DBConnector {
      _transaction = 0;
      constructor(private lib: LIB, private pool: Pool<DB>) {}
      maker = definition.maker;

      async transaction(): Promise<DBConnectorTransaction> {
        let db = await this.pool.acquire();
        await definition.beginTransaction(this.lib, db);
        return new GenericConnectorTransaction(this.lib, db, this.pool);
      }
      unsafeRun(sql: SqlBinding) : Promise<void>         { return this.pool.scoped(db => definition.run(this.lib, db, definition.transform(sql)));           }
      select(sql_select: SqlBinding) : Promise<object[]> { return this.pool.scoped(db => definition.select(this.lib, db, definition.transform(sql_select))); }
      update(sql_update: SqlBinding) : Promise<number>   { return this.pool.scoped(db => definition.update(this.lib, db, definition.transform(sql_update))); }
      insert(sql_insert: SqlBinding, out: string[])      { return this.pool.scoped(db => definition.insert(this.lib, db, definition.transform(sql_insert), out)); }
    }

    return function createPool(lib: LIB, options: OPTIONS, config?: Partial<Pool.Config>) : DBConnector {
      return new GenericConnector(lib, new Pool<DB>({
        create() { return definition.create(lib, options); },
        destroy(db: DB) { return definition.destroy(lib, db); }
      }, config))
    }
  }
}
