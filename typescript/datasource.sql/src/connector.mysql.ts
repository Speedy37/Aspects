import {DBConnector, DBConnectorTransaction, SqlBinding, SqlMaker} from './index';

function trace<T extends SqlBinding | string>(sql: T) : T {
//  console.info(sql);
  return sql;
}

export const MySQLDBConnectorFactory = DBConnector.createSimple<any, { host: string, user: string, password: string, database: string }, any>({
  maker: new SqlMaker(),
  create(mysql2, options) {
    return new Promise((resolve, reject) => {
      let db = mysql2.createConnection(options);
      db.connect(err => err ? reject(err) : resolve(db));
    });
  },
  destroy(db) {
    return new Promise<void>((resolve, reject) => {
      db.close(err => err ? reject(err) : resolve());
    });
  },
  select(db, sql_select: SqlBinding) : Promise<object[]> {
    return new Promise<any>((resolve, reject) => {
      trace(sql_select);
      db.execute(sql_select.sql, sql_select.bind, function (err, results: object[], fields) {
        err ? reject(err) : resolve(results ? results : []);
      });
    });
  },
  update(db, sql_update: SqlBinding) : Promise<number> {
    return new Promise<any>((resolve, reject) => {
      trace(sql_update);
      db.execute(sql_update.sql, sql_update.bind, function (err, results, fields) {
        err ? reject(err) : resolve(results.affectedRows);
      });
    });
  },
  insert(db, sql_insert: SqlBinding) : Promise<any> {
    return new Promise<any>((resolve, reject) => {
      trace(sql_insert);
      db.execute(sql_insert.sql, sql_insert.bind, function (err, results, fields) {
        err ? reject(err) : resolve(results.insertId);
      });
    });
  },
  run(db, sql: SqlBinding) : Promise<any> {
    return new Promise<any>((resolve, reject) => {
      db.execute(sql.sql, sql.bind, function (err, rows) {
        err ? reject(err) : resolve();
      });
    });
  },
  beginTransaction(db): Promise<void> {
    return new Promise<any>((resolve, reject) => { trace("beginTransaction()"); db.beginTransaction((err) => err ? reject(err) : resolve()) });
  },
  commit(db): Promise<void> {
    return new Promise<any>((resolve, reject) => { trace("commit()"); db.commit((err) => err ? reject(err) : resolve()) });
  },
  rollback(db): Promise<void> {
    return new Promise<any>((resolve, reject) => { trace("rollback()"); db.rollback((err) => err ? reject(err) : resolve()) });
  },
  transform: DBConnector.transformPass,
});