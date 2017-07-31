import {
  FarTransport, VersionedObject, VersionedObjectManager, VersionedObjectConstructor, NotificationCenter, Invocation, InvocationState, DataSource, 
  Aspect, AspectCache,
} from './core';

export type Identifier = string | number;
export type FarImplementation<P extends VersionedObject, A, R> = ((this: P, arg: A) => R | Invocation<R> | Promise<R | Invocation<R>>);

export interface AComponent {

}

export class ControlCenter {
  /** @internal */ _notificationCenter = new NotificationCenter();
  /** @internal */ _objects = new Map<Identifier, VersionedObject>();
  /** @internal */ _components = new Set<AComponent>();
  /** @internal */ _aspects = new Map<string, Aspect.Constructor>();
  /** @internal */ _cache: AspectCache;

  static readonly globalCache = new AspectCache();

  constructor(cache: AspectCache = ControlCenter.globalCache) {
    this._cache = cache;
  }
  /// events
  notificationCenter() { return this._notificationCenter; }

  /// category component
  registeredObject(id: Identifier, classname: string) : VersionedObject;
  registeredObject(id: Identifier) : VersionedObject | undefined;
  registeredObject(id: Identifier, classname?: string) : VersionedObject | undefined {
    let vo = this._objects.get(id);
    if (!vo && classname) {
      let cstor = this.aspect(classname)!;
      vo = new cstor();
      vo.manager().setId(id);
    }
    return vo;
  }
  
  registeredObjects(component: AComponent) : VersionedObject[] {
    let ret = <VersionedObject[]>[];
    this._objects.forEach((o, k) => {
      if (o.manager()._components.has(component))
        ret.push(o);
    });
    return ret;
  }

  registerComponent(component: AComponent) {
    this._components.add(component);
  }

  unregisterComponent(component: AComponent) {
    if (!this._components.delete(component))
      throw new Error(`cannot remove unregistered component`);
    this._objects.forEach((o, k) => {
      let m = o.manager();
      if (m._components.delete(component)) {
        if (m._components.size === 0) {
          this._objects.delete(k);
          o.__manager = new VersionedObjectManager.UnregisteredVersionedObjectManager(m);
        }
      }
    });
  }

  registerObjects(component: AComponent, objects: VersionedObject[], method?: string, events?: string[]) {
    if (!this._components.has(component))
      throw new Error(`you must register the component with 'registerComponent' before registering objects`);
    const notificationCenter = this.notificationCenter();
    for (let o of objects) {
      if (o.controlCenter() !== this)
        throw new Error(`you can't register an object that is associated with another control center`);
      let id = o.id();
      let i = this._objects;
      let d = i.get(id);
      if (method)
        (<(string | undefined)[]>(events || [undefined])).forEach(event => notificationCenter.addObserver(component as any, method, event, o));
      if (!d)
        i.set(id, d = o);
      if (d !== o)
        throw new Error(`a different object with the same id (${id}) is already registered`);
      d.manager().registerComponent(component);
    }
  }

  unregisterObjects(component: AComponent, objects: VersionedObject[]) {
    objects.forEach(o => {
      let i = this._objects;
      let id = o.id();
      let d = i.get(id);
      if (!d)
        throw new Error(`cannot unregister an object that is not registered`);
      let m = o.manager();
      if (!m._components.delete(component))
        throw new Error(`cannot unregister an object that is not registered by the given component`);
      if (m._components.size === 0) {
        i.delete(id);
        o.__manager = new VersionedObjectManager.UnregisteredVersionedObjectManager(m);
      }
    });
  }

  swapObjects<T extends VersionedObject>(component: AComponent, oldObjects: T[], newObjects: T[]) : T[] {
    this.unregisterObjects(component, oldObjects);
    this.registerObjects(component, newObjects);
    return newObjects;
  }

  swapObject<T extends VersionedObject>(component: AComponent, oldObject: T | undefined, newObject: T) : T;
  swapObject<T extends VersionedObject>(component: AComponent, oldObject: T | undefined, newObject: T | undefined) : T | undefined;
  swapObject<T extends VersionedObject>(component: AComponent, oldObject: T | undefined, newObject: T | undefined) : T | undefined {
    this.swapObjects(component, oldObject ? [oldObject] : [], newObject ? [newObject] : []);
    return newObject;
  }

  /// category VersionedObject
  cache() {
    return this._cache;
  }
  aspect(name: string) {
    return this._aspects.get(name);
  }
  installedAspectConstructors() {
    return this._aspects.values();
  }

  create<T extends VersionedObject>(cstor: VersionedObjectConstructor<VersionedObject>, categories: string[]) : T {
    let aspectCstor = this.aspect(cstor.definition.name);
    if (!aspectCstor)
      throw new Error(`cannot create ${cstor.definition.name}: no aspect found`);
    for (let category of categories)
      if (!aspectCstor.aspect.categories.has(category))
        throw new Error(`cannot create ${cstor.definition.name}: category ${category} is missing in aspect ${aspectCstor.aspect.aspect}`);
    return new aspectCstor() as T;
  }

  changeObjectId(oldId: Identifier, newId: Identifier) {
    let o = this._objects.get(oldId);
    if (o !== undefined) {
      this._objects.delete(oldId);
      if (this._objects.has(newId))
        throw new Error(`a different object with the same id (${newId}) is already registered`);
      this._objects.set(newId, o);
    }
  }

  mergeObject(object: VersionedObject) {
    let m = object.manager();
    let o = this.registeredObject(object.id());
    if (o && o !== object)
      o.manager().mergeWithRemote(m);
    return o || object;
  }

  /// category Transport
  installTransport(transport: FarTransport, filter?: (cstor: Aspect.Constructor) => boolean) {
    this._aspects.forEach(cstor => {
      if (filter && !filter(cstor))
        return;
      cstor.aspect.farMethods.forEach(method => {
        if (method.transport === Aspect.farTransportStub)
          method.transport = transport;
      });
    });
  }
}
