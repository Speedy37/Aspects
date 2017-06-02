import {DataSource, areEquals, DataSourceConstructor, VersionedObject, VersionedObjectManager, Identifier, ControlCenter, DataSourceInternal, AComponent, Aspect} from './core';
import ObjectSet = DataSourceInternal.ObjectSet;
declare var console: any;

const dbPrefix = "db:";

function fromDbId(id: Identifier) : Identifier {
  return (id as string).substring(dbPrefix.length);
}

export class InMemoryDataSource extends DataSource 
{
  constructor(manager: VersionedObjectManager<InMemoryDataSource>, private ds: InMemoryDataSource.DataStore) {
    super(manager);
  }
  static parent = DataSource;
  static definition = {
    is: "class",
    name: "InMemoryDataSource",
    version: 0,
    aspects: DataSource.definition.aspects
  };
  static installAspect(on: ControlCenter, name: 'client'): { new(ds?: InMemoryDataSource.DataStore): DataSource.Aspects.client };
  static installAspect(on: ControlCenter, name: 'server'): { new(ds?: InMemoryDataSource.DataStore): DataSource.Aspects.server };
  static installAspect(on: ControlCenter, name:string): any {
    return on.cache().createAspect(on, name, this);
  }

  fromDb(v, component: AComponent) {
    if (v instanceof Array)
      return v.map(v => this.fromDb(v, component));
    if (v instanceof Set)
      return new Set([...v].map(v => this.fromDb(v, component)));
    if (v instanceof VersionedObject) {
      let rObject = v;
      let lId = fromDbId(rObject.id());
      let cc = this.controlCenter();
      v = cc.registeredObject(lId);
      if (!v) {
        v = new (cc.aspect(rObject.manager().aspect().name)!)();
        v.manager().setId(lId);
        cc.registerObjects(component, [v]);
      }
    }
    return v;
  }

  toDb(v, allowCreate: boolean) {
    if (v instanceof Array)
      return v.map(v => this.toDb(v, allowCreate));
    if (v instanceof Set)
      return new Set([...v].map(v => this.toDb(v, allowCreate)));
    if (v instanceof VersionedObject) {
      let dbId = dbPrefix + v.id();
      let dbObject = this.ds.objects.get(dbId);
      if (!dbObject && allowCreate) {
        dbObject = new (this.controlCenter().aspect(v.manager().name())!)();
        dbObject.manager().setId(dbId);
        this.ds.objects.set(dbId, dbObject);
      }
      v = dbObject;
    }
    return v;
  }

  implQuery(sets: ObjectSet[]): { [k: string]: VersionedObject[] } {
    let ret = {};
    let cc = this.controlCenter();
    let component = {};
    cc.registerComponent(component);
    let res = DataSourceInternal.applySets(sets, [...this.ds.objects.values()], true, {
      aspect: (vo: VersionedObject) => vo.manager().aspect(),
      has: (vo: VersionedObject, attribute: string) => vo.manager().hasAttributeValue(attribute as keyof VersionedObject),
      get: (vo: VersionedObject, attribute: string) => {
        if (attribute === "_id")
          return vo;
        return vo.manager().attributeValue(attribute as keyof VersionedObject);
      },
      todb: (vo: VersionedObject, attribute: string, value) => {
        if (attribute === "_id" && typeof value !== "object")
          return this.ds.objects.get(dbPrefix + value);
        return this.toDb(value, false);
      }
    });
    res.forEach((objs, set) => {
      ret[set.name] = objs.map(dObject => {
        let dManager = dObject.manager();
        let cstor = cc.aspect(dManager.aspect().name)!;
        let lId = fromDbId(dObject.id());
        let lObject = cc.registeredObject(lId) || new cstor();
        let remoteAttributes = new Map<keyof VersionedObject, any>();
        let lManager = lObject.manager();
        cc.registerObjects(component, [lObject]);
        if (set.scope) for (let k of set.scope as (keyof VersionedObject)[])
          remoteAttributes.set(k, this.fromDb(dManager._versionAttributes.get(k), component));
        lManager.setId(lId);
        lManager.mergeWithRemoteAttributes(remoteAttributes, dObject.version());
        return lObject;
      });
    });
    cc.unregisterComponent(component);
    return ret;
  }

  implLoad({objects, scope} : {
      objects?: VersionedObject[];
      scope?: string[];
  }): VersionedObject[] {
    let cc = this.controlCenter();
    let component = {};
    let ret: VersionedObject[] = [];
    cc.registerComponent(component);
    if (objects) {
      for (let lObject of objects) {
        let dbId = dbPrefix + lObject.id();
        let dObject = this.ds.objects.get(dbId);
        if (dObject) {
          let lManager = lObject.manager();
          let dManager = dObject.manager();
          let remoteAttributes = new Map<keyof VersionedObject, any>();
          cc.registerObjects(component, [lObject]);
          if (scope) for (let k of scope as (keyof VersionedObject)[])
            remoteAttributes.set(k, this.fromDb(dManager._versionAttributes.get(k), component));
          lManager.mergeWithRemoteAttributes(remoteAttributes, dObject.version());
          ret.push(lObject);
        }
      }
    }
    cc.unregisterComponent(component);
    return ret;
  }

  implSave(objects: VersionedObject[]) : Promise<VersionedObject[]> {
    let willFail = false;
    for (let i = 0; !willFail && i < objects.length; i++) {
      let object = objects[i];
      let version = object.manager()._version;
      let dbId = dbPrefix + object.id();
      if (version === VersionedObjectManager.DeletedVersion) {
        willFail = !this.ds.objects.has(dbId);
      }
      else if (version !== VersionedObjectManager.NoVersion) { // Update
        let dbObject = this.ds.objects.get(dbId);
        if (!(willFail = !dbObject)) {
          let dbManager = dbObject!.manager();
          let obManager = object.manager();
          for (let k of obManager._localAttributes.keys()) {
            let dbv = dbManager._versionAttributes.get(k);
            let exv = obManager._versionAttributes.get(k);
            if ((willFail = !areEquals(exv,dbv))) 
              break;
          }
        }
      }
    }

    if (!willFail) {
      for (let lObject of objects) {
        let lManager = lObject.manager();
        let lVersion = lManager._version;
        if (lVersion === VersionedObjectManager.NoVersion) {
          let id = `${this.ds.prefix}${++this.ds.idCounter}`;
          let dbId = dbPrefix + id;
          let dObject = new (this.controlCenter().aspect(lManager.aspect().name)!)();
          let dManager = dObject.manager();
          for (let [lk, lv] of lManager._localAttributes)
            dManager._versionAttributes.set(lk, this.toDb(lv, true));
          dManager.setId(dbId);
          dManager.setVersion(0);
          lManager.setId(id);
          lManager.setVersion(dManager.versionVersion());
          this.ds.objects.set(dbId, dObject);
        }
        else if (lVersion === VersionedObjectManager.DeletedVersion) {
          this.ds.objects.delete(dbPrefix + lObject.id());
        }
        else {
          let dObject = this.ds.objects.get(dbPrefix + lObject.id())!;
          let dManager = dObject.manager();
          for (let [lk, lv] of lManager._localAttributes)
            dManager._versionAttributes.set(lk, this.toDb(lv, true));
          dManager.setVersion(dManager._version + 1);
          lManager.setVersion(dManager.versionVersion());
        }
      }
    }

    return willFail ? Promise.reject(objects) : Promise.resolve(objects);
  }
};
export namespace InMemoryDataSource {
  export class DataStore {
    prefix = "memory:";
    idCounter = 0;
    objects = new Map<Identifier, VersionedObject>();
  }
}
