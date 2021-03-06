import {ControlCenter, AspectConfiguration, AspectSelection} from '@openmicrostep/aspects';
import {
  SqlDataSource, loadSqlMappers,
  SqliteDBConnectorFactory, MySQLDBConnectorFactory, PostgresDBConnectorFactory, MSSQLDBConnectorFactory, OracleDBConnectorFactory,
  SqlMaker, SqlBinding, DBConnector,
} from '@openmicrostep/aspects.sql';
import {createTests} from '../../core/tst/datasource.impl.spec';
import {Resource, Car, People, Point, Polygon, RootObject} from '../../../generated/aspects.interfaces';

function fromDbKeyPeople(id) { return `${id}:People`; }
function fromDbKeyCar(id)    { return `${id}:Car`   ; }
function toDBKey(id) { return +id.split(':')[0]; }

function createSqlControlCenter(flux) {
  const mappers = loadSqlMappers({
    "People=": {
      is: "sql-mapped-object",
      fromDbKey: (id) => `${id}:People`,
      toDbKey: toDBKey,
      "V=": { is: "sql-insert", table: "Version" , values: [{ is: "sql-value", name: "id"       , type: "autoincrement"                        },
                                                            { is: "sql-value", name: "type"     , type: "value"            , value: "Resource" }] },
      "R=": { is: "sql-insert", table: "Resource", values: [{ is: "sql-value", name: "id"       , type: "autoincrement"                        },
                                                            { is: "sql-value", name: "idVersion", type: "ref", insert: "=V", value: "id"       }] },
      "P=": { is: "sql-insert", table: "People"  , values: [{ is: "sql-value", name: "id"       , type: "ref", insert: "=R", value: "id"       }] },
      inserts: ["=V", "=R", "=P"],
      delete_cascade: [
        { is: "sql-path", table: "People" , key: "id", value: "idVersion" },
        { is: "sql-path", table: "Version", key: "id", where: { type: "Resource" }, value: "id" }
      ],
      attributes: [
          { is: "sql-mapped-attribute", name: "_id"        , insert: "=P", path: [{ is: "sql-path", table: "People"  , key: "id"    , value: "id"        }] },
          { is: "sql-mapped-attribute", name: "_version"   , insert: "=V", path: [{ is: "sql-path", table: "Resource", key: "id"    , value: "idVersion" },
                                                                                  { is: "sql-path", table: "Version" , key: "id"    , value: "version"   , where: { type: "Resource" } }]
          , fromDb: v => v - 100      , toDb: v => v + 100 },
          { is: "sql-mapped-attribute", name: "_name"      , insert: "=R", path: [{ is: "sql-path", table: "Resource", key: "id"    , value: "name"      }] },
          { is: "sql-mapped-attribute", name: "_firstname" , insert: "=P", path: [{ is: "sql-path", table: "People"  , key: "id"    , value: "firstname" }] },
          { is: "sql-mapped-attribute", name: "_lastname"  , insert: "=P", path: [{ is: "sql-path", table: "People"  , key: "id"    , value: "lastname"  }] },
          { is: "sql-mapped-attribute", name: "_birthDate" , insert: "=P", path: [{ is: "sql-path", table: "People"  , key: "id"    , value: "birthDate" }]
          , fromDb: v => new Date(+v) , toDb: d => d.getTime() },
          { is: "sql-mapped-attribute", name: "_father"    , insert: "=P", path: [{ is: "sql-path", table: "People"  , key: "id"    , value: "father"    }] },
          { is: "sql-mapped-attribute", name: "_mother"    , insert: "=P", path: [{ is: "sql-path", table: "People"  , key: "id"    , value: "mother"    }] },
          { is: "sql-mapped-attribute", name: "_childrens_by_father"     , path: [{ is: "sql-path", table: "People"  , key: "father", value: "id"        }] },
          { is: "sql-mapped-attribute", name: "_childrens_by_mother"     , path: [{ is: "sql-path", table: "People"  , key: "mother", value: "id"        }] },
          { is: "sql-mapped-attribute", name: "_cars"                    , path: [{ is: "sql-path", table: "Car"     , key: "owner" , value: "id"        }] },
          { is: "sql-mapped-attribute", name: "_drivenCars"              , path: [{ is: "sql-path", table: "Drivers" , key: "people", value: "car"       }] },
      ]
    },
    "Car=": {
      is: "sql-mapped-object",
      fromDbKey: (id) => `${id}:Car`,
      toDbKey: toDBKey,
      "T=": { is: "sql-insert", table: "Tags"    , values: [{ is: "sql-value", name: "car"      , type: "ref", insert: "=C", value: "id"       }] },
      "V=": { is: "sql-insert", table: "Version" , values: [{ is: "sql-value", name: "id"       , type: "autoincrement"                        },
                                                            { is: "sql-value", name: "type"     , type: "value"            , value: "Resource" }] },
      "R=": { is: "sql-insert", table: "Resource", values: [{ is: "sql-value", name: "id"       , type: "autoincrement"                        },
                                                            { is: "sql-value", name: "idVersion", type: "ref", insert: "=V", value: "id"       }] },
      "C=": { is: "sql-insert", table: "Car"     , values: [{ is: "sql-value", name: "id"       , type: "ref", insert: "=R", value: "id"       }] },
      inserts: ["=V", "=R", "=C"],
      delete_cascade: [
        { is: "sql-path", table: "Car"     , key: "id", value: "id" },
        { is: "sql-path", table: "Resource", key: "id", value: "idVersion" },
        { is: "sql-path", table: "Version" , key: "id", where: { type: "Resource" }, value: "id" }
      ],
      attributes: [
          { is: "sql-mapped-attribute", name: "_id"        , insert: "=C", path: [{ is: "sql-path", table: "Car"     , key: "id"    , value: "id"        }] },
          { is: "sql-mapped-attribute", name: "_version"   , insert: "=V", path: [{ is: "sql-path", table: "Resource", key: "id"    , value: "idVersion" }, { is: "sql-path", table: "Version", key: "id", where: { type: "Resource" }, value: "version" }] },
          { is: "sql-mapped-attribute", name: "_name"      , insert: "=R", path: [{ is: "sql-path", table: "Resource", key: "id"    , value: "name"      }] },
          { is: "sql-mapped-attribute", name: "_model"     , insert: "=C", path: [{ is: "sql-path", table: "Car"     , key: "id"    , value: "model"     }] },
          { is: "sql-mapped-attribute", name: "_owner"     , insert: "=C", path: [{ is: "sql-path", table: "Car"     , key: "id"    , value: "owner"     }] },
          { is: "sql-mapped-attribute", name: "_drivers"                 , path: [{ is: "sql-path", table: "Drivers" , key: "car"   , value: "people"    }] },
          { is: "sql-mapped-attribute", name: "_tags"      , insert: "=T", path: [{ is: "sql-path", table: "Tags"    , key: "car"   , value: "tag"       }] },
      ]
    },
    "Point=": {
      is: "sql-mapped-object",
      fromDbKey: (id) => `${id}:Point`,
      toDbKey: toDBKey,
      "P=": { is: "sql-insert", table: "Point", values: [{ is: "sql-value", name: "id", type: "autoincrement" }] },
      inserts: ["=P"],
      delete_cascade: [{ is: "sql-path", table: "Point", key: "id", value: "id" }],
      attributes: [
          { is: "sql-mapped-attribute", name: "_id"       , insert: "=P", path: [{ is: "sql-path", table: "Point", key: "id", value: "id"        }] },
          { is: "sql-mapped-attribute", name: "_version"  , insert: "=P", path: [{ is: "sql-path", table: "Point", key: "id", value: "version"   }] },
          { is: "sql-mapped-attribute", name: "_longitude", insert: "=P", path: [{ is: "sql-path", table: "Point", key: "id", value: "longitude" }] },
          { is: "sql-mapped-attribute", name: "_latitude" , insert: "=P", path: [{ is: "sql-path", table: "Point", key: "id", value: "latitude"  }] },
          { is: "sql-mapped-attribute", name: "_altitute" , insert: "=P", path: [{ is: "sql-path", table: "Point", key: "id", value: "altitute"  }] },
      ]
    },
    "Polygon=": {
      is: "sql-mapped-object",
      fromDbKey: (id) => `${id}:Polygon`,
      toDbKey: toDBKey,
      "P=": { is: "sql-insert", table: "Polygon", values: [{ is: "sql-value", name: "id", type: "autoincrement" }] },
      "A=": { is: "sql-insert", table: "PolygonPoints", values: [{ is: "sql-value", name: "polygon", type: "ref", insert: "=P", value: "id" }] },
      "S=": { is: "sql-insert", table: "PolygonSets", values: [{ is: "sql-value", name: "polygon", type: "ref", insert: "=P", value: "id" }] },
      inserts: ["=P"],
      delete_cascade: [{ is: "sql-path", table: "Polygon", key: "id", value: "id" }],
      attributes: [
          { is: "sql-mapped-attribute", name: "_id"     , insert: "=P", path: [{ is: "sql-path", table: "Polygon", key: "id", value: "id"        }] },
          { is: "sql-mapped-attribute", name: "_version", insert: "=P", path: [{ is: "sql-path", table: "Polygon", key: "id", value: "version"   }] },
          { is: "sql-mapped-attribute", name: "_points" , insert: "=A", path: [{ is: "sql-path", table: "PolygonPoints", key: "polygon", value: "point" }] },
          { is: "sql-mapped-attribute", name: "_set"    , insert: "=S", path: [{ is: "sql-path", table: "PolygonSets"  , key: "polygon", value: "point" }] },
      ]
    },
    "RootObject=": {
      is: "sql-mapped-object",
      fromDbKey: (id) => `${id}:RootObject`,
      toDbKey: toDBKey,
      "R=": { is: "sql-insert", table: "RootObject", values: [{ is: "sql-value", name: "id", type: "autoincrement" }] },
      inserts: ["=R"],
      delete_cascade: [{ is: "sql-path", table: "RootObject", key: "id", value: "id" }],
      attributes: [
          { is: "sql-mapped-attribute", name: "_id"     , insert: "=R", path: [{ is: "sql-path", table: "RootObject", key: "id", value: "id"        }] },
          { is: "sql-mapped-attribute", name: "_version", insert: "=R", path: [{ is: "sql-path", table: "RootObject", key: "id", value: "version"   }] },
          { is: "sql-mapped-attribute", name: "_p1"     , insert: "=R", path: [{ is: "sql-path", table: "RootObject", key: "id", value: "p1"        }] },
          { is: "sql-mapped-attribute", name: "_p2"     , insert: "=R", path: [{ is: "sql-path", table: "RootObject", key: "id", value: "p2"        }] },
          { is: "sql-mapped-attribute", name: "_p3"     , insert: "=R", path: [{ is: "sql-path", table: "RootObject", key: "id", value: "p3"        }] },
          { is: "sql-mapped-attribute", name: "_s0"     , insert: "=R", path: [{ is: "sql-path", table: "RootObject", key: "id", value: "s0"        }] },
          { is: "sql-mapped-attribute", name: "_s1"     , insert: "=R", path: [{ is: "sql-path", table: "RootObject", key: "id", value: "s1"        }] },
      ]
    }
  });

  let cfg = new AspectConfiguration(new AspectSelection([
    Car.Aspects.test1,
    People.Aspects.test1,
    Point.Aspects.test1,
    Polygon.Aspects.test1,
    RootObject.Aspects.test1,
    SqlDataSource.Aspects.server,
  ]));
  let cc = new ControlCenter(cfg);
  let ccc = cc.registerComponent({});
  let db = SqlDataSource.Aspects.server.create(ccc, mappers, flux.context.connector, flux.context.connector.maker);
  Object.assign(flux.context, {
    db: db,
    cc: cc
  });
  flux.continue();
}

function destroy(flux) {
  flux.context.connector.close();
  flux.continue();
}

export const name = "SqlDataSource";
export const tests: {
  name: string;
  tests: any[];
}[] = [];

function trace(sql) {
  if (process.env.TRACE_SQL)
    console.info(sql);
}

const tables: SqlMaker.Table[] = [
  {
    name: "Version",
    columns: [
      { name: "id"     , type: { is: "autoincrement", bytes: 8 } },
      { name: "type"   , type: { is: "string", max_bytes: 255 } },
      { name: "version", type: { is: "integer", bytes: 8 } },
    ],
    primary_key: ["id"],
  },
  {
    name: "Resource",
    columns: [
      { name: "id"       , type: { is: "autoincrement", bytes: 8 } },
      { name: "idVersion", type: { is: "integer", bytes: 8 } },
      { name: "name"     , type: { is: "string", max_bytes: 255 } },
    ],
    primary_key: ["id"],
    foreign_keys: [
      { columns: ["idVersion"], foreign_table: "Version", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
    ],
  },
  {
    name: "People",
    columns: [
      { name: "id"       , type: { is: "integer", bytes: 8 } },
      { name: "firstname", type: { is: "string", max_bytes: 255 } },
      { name: "lastname" , type: { is: "string", max_bytes: 255 } },
      { name: "birthDate", type: { is: "integer", bytes: 8 } },
      { name: "father", type: { is: "integer", bytes: 8 }, allow_null: true },
      { name: "mother", type: { is: "integer", bytes: 8 }, allow_null: true },
    ],
    primary_key: ["id"],
    foreign_keys: [
      { columns: ["id"], foreign_table: "Resource", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
      { columns: ["father"], foreign_table: "People", foreign_columns: ["id"], on_delete: "restrict", on_update: "restrict" },
      { columns: ["mother"], foreign_table: "People", foreign_columns: ["id"], on_delete: "restrict", on_update: "restrict" },
    ],
  },
  {
    name: "Car",
    columns: [
      { name: "id"       , type: { is: "integer", bytes: 8 } },
      { name: "model"    , type: { is: "string", max_bytes: 255 } },
      { name: "owner"    , type: { is: "integer", bytes: 8 }, allow_null: true },
    ],
    primary_key: ["id"],
    foreign_keys: [
      { columns: ["id"], foreign_table: "Resource", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
      { columns: ["owner"], foreign_table: "People", foreign_columns: ["id"], on_delete: "restrict", on_update: "restrict" },
    ],
  },
  {
    name: "Tags",
    columns: [
      { name: "car"      , type: { is: "integer", bytes: 8 } },
      { name: "tag"      , type: { is: "string", max_bytes: 255 } },
    ],
    primary_key: [],
    indexes: [
      { columns: [{ name: "car", asc: true }] }
    ],
    foreign_keys: [
      { columns: ["car"], foreign_table: "Car", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
    ],
  },
  {
    name: "Polygon",
    columns: [
      { name: "id", type: { is: "autoincrement", bytes: 8 } },
      { name: "version", type: { is: "integer", bytes: 8 } },
    ],
    primary_key: ["id"],
    foreign_keys: [],
  },
  {
    name: "Point",
    columns: [
      { name: "id", type: { is: "autoincrement", bytes: 8 } },
      { name: "version", type: { is: "integer", bytes: 8 } },
      { name: "longitude", type: { is: "double", bytes: 8 } },
      { name: "latitude", type: { is: "double", bytes: 8 } },
      { name: "altitute", type: { is: "double", bytes: 8 } },
    ],
    primary_key: ["id"],
  },
  {
    name: "RootObject",
    columns: [
      { name: "id", type: { is: "autoincrement", bytes: 8 } },
      { name: "version", type: { is: "integer", bytes: 8 } },
      { name: "p1", type: { is: "integer", bytes: 8 } },
      { name: "p2", type: { is: "integer", bytes: 8 } },
      { name: "p3", type: { is: "integer", bytes: 8 } },
      { name: "s0", type: { is: "integer", bytes: 8 } },
      { name: "s1", type: { is: "integer", bytes: 8 } },
    ],
    primary_key: ["id"],
    foreign_keys: [
      { columns: ["p1"], foreign_table: "Point", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
      { columns: ["p2"], foreign_table: "Point", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
      { columns: ["p3"], foreign_table: "Point", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
      { columns: ["s0"], foreign_table: "Polygon", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
      { columns: ["s1"], foreign_table: "Polygon", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
    ],
  },
  {
    name: "PolygonPoints",
    columns: [
      { name: "polygon", type: { is: "integer", bytes: 8 } },
      { name: "point", type: { is: "integer", bytes: 8 } },
    ],
    primary_key: ["polygon", "point"],
    foreign_keys: [
      { columns: ["polygon"], foreign_table: "Polygon", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
      { columns: ["point"], foreign_table: "Point", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
    ],
  },
  {
    name: "PolygonSets",
    columns: [
      { name: "polygon", type: { is: "integer", bytes: 8 } },
      { name: "point", type: { is: "integer", bytes: 8 } },
    ],
    primary_key: ["polygon", "point"],
    foreign_keys: [
      { columns: ["polygon"], foreign_table: "Polygon", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
      { columns: ["point"], foreign_table: "Point", foreign_columns: ["id"], on_delete: "cascade", on_update: "restrict" },
    ],
  },
];

function do_once(once: any, work: () => Promise<void>) {
  let promise: Promise<void> = once.promise;
  if (!promise)
    promise = once.promise = work();
  return promise;
}

async function create_tables(connector: DBConnector.Init) {
  const maker = connector.maker;
  for (let table of tables) {
    let sql_admin = maker.admin_create_table(table);
    try {
      await connector.admin(sql_admin);
    } catch (e) {
      console.info(sql_admin, e);
    }
  }
}

async function drop_tables(connector: DBConnector.Init) {
  const maker = connector.maker;
  for (let table of [...tables].reverse()) {
    let sql_admin = maker.admin_drop_table(table);
    try {
      await connector.admin(sql_admin);
    } catch (e) {
      console.info(sql_admin, e);
    }
  }
}

const sqlite = { name: "sqlite (npm sqlite3)", tests: createTests(async function sqliteCC(flux) {
    const sqlite3 = require('sqlite3').verbose();
    const once = {};
    const connector = SqliteDBConnectorFactory(sqlite3, {
      filename: 'test.sqlite',
      trace: trace,
      init: async (connector) => {
        await do_once(once, async () => {
          await drop_tables(connector);
          await create_tables(connector);
        });
        await connector.unsafeRun({ sql: `PRAGMA foreign_keys = ON`, bind: [] });
      },
    });
    flux.context.connector = connector;
    flux.setFirstElements([createSqlControlCenter]);
    flux.continue();
  }, destroy) };
tests.push(sqlite);

const mysql = { name: "mysql (npm mysql2)", tests: createTests(async function mysqlCC(flux) {
    const mysql2 = require('mysql2');
    const once = {};
    const connector = MySQLDBConnectorFactory(mysql2, {
      host: process.env.MYSQL_HOST || process.env.MYSQL_PORT_3306_TCP_ADDR  || 'localhost',
      port: +(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      trace: trace,
      database: "",
      init: async (connector) => {
        await do_once(once, async () => {
          await connector.unsafeRun({ sql: 'DROP DATABASE IF EXISTS aspects', bind: [] });
          await connector.unsafeRun({ sql: 'CREATE DATABASE aspects', bind: [] });
          await connector.unsafeRun({ sql: 'USE aspects', bind: [] });
          await create_tables(connector);
        });
        await connector.unsafeRun({ sql: 'USE aspects', bind: [] });
      },
    });
    flux.context.connector = connector;
    flux.setFirstElements([createSqlControlCenter]);
    flux.continue();
  }, destroy) };
if (process.env.MYSQL_USER)
  tests.push(mysql);

const postgres = { name: "postgres (npm pg)", tests: createTests(async function postgresCC(flux) {
    const host = process.env.POSTGRES_HOST || process.env.POSTGRES_PORT_5432_TCP_ADDR || 'localhost';
    const port = +(process.env.POSTGRES_PORT || '5432');
    const user = process.env.POSTGRES_USER;
    const password = process.env.POSTGRES_PASSWORD;
    const pg = require('pg');
    const init = PostgresDBConnectorFactory(pg, { host: host, port: port, user: user, password: password, database: "postgres" }, { max: 1 });
    await init.unsafeRun({ sql: 'DROP DATABASE IF EXISTS aspects', bind: [] });
    await init.unsafeRun({ sql: 'CREATE DATABASE aspects', bind: [] });
    init.close();
    const once = {};
    const connector = PostgresDBConnectorFactory(pg, {
      host: host, port: port, user: user, password: password, database: "aspects",
      trace: trace,
      init: async (connector) => {
        await do_once(once, () => create_tables(connector));
      },
    });
    flux.context.connector = connector;
    flux.setFirstElements([createSqlControlCenter]);
    flux.continue();
  }, destroy) };
if (process.env.POSTGRES_USER)
  tests.push(postgres);

const mssql = { name: "mssql (npm tedious)", tests: createTests(async function mssqlCC(flux) {
    const host = process.env.MSSQL_HOST || 'localhost';
    const port = +(process.env.MSSQL_PORT || '1433');
    const tedious = require('tedious');
    const once = {};
    const connector = MSSQLDBConnectorFactory(tedious, {
      server: host,
      options: { port: port },
      userName: process.env.MSSQL_USER,
      password: process.env.MSSQL_PASSWORD,
      trace: trace,
      init: async (connector) => {
        await do_once(once, async () => {
          await connector.unsafeRun({ sql: 'DROP DATABASE IF EXISTS aspects', bind: [] });
          await connector.unsafeRun({ sql: 'CREATE DATABASE aspects', bind: [] });
          await connector.unsafeRun({ sql: 'USE aspects', bind: [] });
          await create_tables(connector);
        });
        await connector.unsafeRun({ sql: 'USE aspects', bind: [] });
      },
    });
    flux.context.connector = connector;
    flux.setFirstElements([createSqlControlCenter]);
    flux.continue();
  }, destroy) };
if (process.env.MSSQL_USER)
  tests.push(mssql);

const oracle = { name: "oracle (npm oracledb)", tests: createTests(async function oracleCC(flux) {
  const oracledb = require('oracledb');
  const once = {};
  const connector = OracleDBConnectorFactory(oracledb, {
    connectString: `(DESCRIPTION = (ADDRESS_LIST = (ADDRESS = (PROTOCOL = TCP)
      (HOST = ${process.env.ORACLE_HOST || 'localhost'})
      (PORT = ${process.env.ORACLE_PORT || '1521'})
    ))(CONNECT_DATA = (SERVICE_NAME = XE)))`,
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    trace: trace,
    init: async (connector) => {
      await do_once(once, async () => {
        await drop_tables(connector);
        await create_tables(connector);
      });
    },
  });
  flux.context.connector = connector;
  flux.setFirstElements([createSqlControlCenter]);
  flux.continue();
}, destroy) };

if (process.env.ORACLE_USER)
  tests.push(oracle);
