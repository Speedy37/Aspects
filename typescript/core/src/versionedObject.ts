import {controlCenter, ControlCenter, Identifier, areEquals, Invocation, Invokable} from './core';
import { Flux } from '@microstep/async';
import {MSTE} from '@microstep/mstools';

export type VersionedObjectAttributes = Map<string, any>;
export class VersionedObjectManager<VersionedObject> {
  static NoVersion = -1;
  static NextVersion = Number.MAX_SAFE_INTEGER; // 2^56 version should be more than enought
  static SafeMode = true;
  static LocalIdCounter = 0;
  static isLocalId(id: Identifier) {
    return typeof id === "string" && id.startsWith("_localid:");
  }

  _id: Identifier;
  _object: VersionedObject | null;
  _controlCenter: ControlCenter;
  _aspect: ControlCenter.InstalledAspect;
  _localAttributes: VersionedObjectAttributes;
  _oldVersion: number;
  _oldVersionAttributes: VersionedObjectAttributes;
  _version: number;
  _versionAttributes: VersionedObjectAttributes;

  constructor(controlCenter: ControlCenter, object: VersionedObject) {
    this._controlCenter = controlCenter;
    this._aspect = controlCenter.aspect(<ControlCenter.Implementation>object.constructor);
    this._id = `_localid:${++VersionedObjectManager.LocalIdCounter}`;
    this._oldVersion = VersionedObjectManager.NoVersion;
    this._oldVersionAttributes = new Map<string, any>();
    this._version = VersionedObjectManager.NoVersion;
    this._versionAttributes = new Map<string, any>();
    this._localAttributes = new Map<string, any>();
    this._object = object;

    Object.defineProperty(object, '_id', {
      enumerable: true,
      get: () => { return this._id; },
      set: (value) => {
        if (VersionedObjectManager.isLocalId(value))
          throw new Error(`cannot change identifier to a local identifier`);
        if (!VersionedObjectManager.isLocalId(this._id)) 
          throw new Error(`cannot real identifier to another identifier`);
        this._id = value; // local -> real id (ie. object _id attribute got loaded)
      }
    });
    Object.defineProperty(object, '_version', {
      enumerable: true,
      get: () => { return this._version; },
      set: (value) => {
        if (this._version !== VersionedObjectManager.NoVersion)
          throw new Error(`Cannot change object version directly`); 
        this._version = value; 
      }
    });
    for (let attr of this._aspect.attributes) {
      Object.defineProperty(object, attr.name, {
        enumerable: true,
        get: () => {
          return this.attributeValue(attr.name);
        },
        set: (value) => {
          if (VersionedObjectManager.SafeMode && !attr.validator(value))
            throw new Error(`attribute value is invalid`);
          if (ControlCenter.isVersionedObjectType(attr))
            value = controlCenter.registeredObject(value.id()) || value; // value will be merged later
          this.setAttributeValue(attr.name, value);
        }
      });
    }
  }

  id()     : Identifier { return this._id; }
  version(): number { return this._localAttributes.size > 0 ? VersionedObjectManager.NextVersion : this._version; }
  name() { return this._aspect.name; }
  aspect() { return this._aspect; }
  controlCenter() { return this._controlCenter; }

  initWithMSTEDictionary(d) {
    this._id = d._id;
    this._version = d._version;
    for (var k in d._localAttributes)
      this._localAttributes.set(k, d._localAttributes[k]);
    for (var k in d._versionAttributes)
      this._versionAttributes.set(k, d._versionAttributes[k]);
  }

  diff() : VersionedObject {
    let ret = new VersionedObjectSnapshot(this);
    this._localAttributes.forEach((v, k) => {
      ret._localAttributes[k] = v;
      if (this._versionAttributes.has(k))
        ret._versionAttributes[k] = this._versionAttributes.get(k);
    });
    return <VersionedObject><any>ret;
  }

  snapshot() : VersionedObject {
    let ret = new VersionedObjectSnapshot(this);
    this._versionAttributes.forEach((v, k) => ret._versionAttributes[k] = v);
    this._localAttributes.forEach((v, k) => ret._localAttributes[k] = v);
    return <VersionedObject><any>ret;
  }
  
  attributeValue(attribute: string) {
    if (this._localAttributes.has(attribute))
      return this._localAttributes.get(attribute);
    if (this._versionAttributes.has(attribute))
      return this._versionAttributes.get(attribute);
    if (this._oldVersionAttributes.has(attribute))
      throw new Error(`attribute '${attribute}' is unaccessible due to version change`);
    throw new Error(`attribute '${attribute}' is unaccessible and never was`);
  }

  versionAttributeValue(attribute: string) {
    if (this._versionAttributes.has(attribute))
      return this._versionAttributes.get(attribute);
    throw new Error(`attribute '${attribute}' is unaccessible and never was`);
  }

  setAttributeValue(attribute: string, value) {
    if (areEquals(this._versionAttributes.get(attribute), value)) {
      this._localAttributes.delete(attribute);
    }
    else if (!areEquals(this._localAttributes.get(attribute), value)) {
      this._localAttributes.set(attribute, value);
    }
  }

  setVersion(version: number) {
    this._localAttributes.forEach((v, k) => this._versionAttributes.set(k, v));
    this._localAttributes.clear();
    this._version = version;
  }

  mergeWithRemote(manager: VersionedObjectManager<VersionedObject>) {
    this.mergeWithRemoteAttributes(manager._versionAttributes, manager._version);
  }

  mergeWithRemoteAttributes(attributes: Map<string, any>, version: number) {
    let ret = { changes: <string[]>[], conflicts: <string[]>[], missings: <string[]>[] };
    if (version === this._version) {
      if (VersionedObjectManager.SafeMode) {
        for (var k of attributes.keys())
          if (this._versionAttributes.has(k) && !areEquals(this._versionAttributes.get(k), attributes.get(k)))
            ret.conflicts.push(k);
      }
      Object.assign(this._versionAttributes, attributes);
    }
    else {
      this._oldVersion = this._version;
      this._oldVersionAttributes = this._versionAttributes;
      this._versionAttributes = attributes;
      for (var k of this._versionAttributes.keys()) {
        if (!this._oldVersionAttributes.has(k) || !areEquals(this._oldVersionAttributes.get(k), attributes.get(k)))
          ret.changes.push(k);
        if (this._localAttributes.has(k)) {
          if (areEquals(this._localAttributes.get(k), this._versionAttributes.get(k)))
            this._localAttributes.delete(k);
          else if (!areEquals(this._oldVersionAttributes.get(k), this._versionAttributes.get(k)))
            ret.conflicts.push(k);
        }
      }
      for (var k of this._oldVersionAttributes.keys()) {
        if (!this._versionAttributes.has(k))
          ret.missings.push(k);
      }
    }
    return ret;
  }
}

var constructedObjects: VersionedObject[] | null = null;

export class VersionedObject implements MSTE.Decodable {
  static createManager: <T extends VersionedObject>(object: T) => VersionedObjectManager<T> = controlCenter.managerFactory();

  static willConstructObjects(constructor: () => void, createManager?: <T extends VersionedObject>(object: T) => VersionedObjectManager<T>) {
    let cm = VersionedObject.createManager;
    let ret = constructedObjects = [];
    VersionedObject.createManager = createManager || cm;
    constructor();
    constructedObjects = null;
    VersionedObject.createManager = cm;
    return ret;
  }

  static extends(cstor: VersionedObjectConstructor<VersionedObject>, definition: any): VersionedObjectConstructor<VersionedObject> {
    return class extends cstor {
      static category(name: string, implementation: any) {
        Object.keys(implementation).forEach(k => this.prototype[k] = implementation[k]);
      }
    }
  }

  __manager: VersionedObjectManager<this>;
  _id: Identifier;
  _version: number;

  constructor() {
    this.__manager = VersionedObject.createManager(this); // this will fill _id and _version attributes
    if (constructedObjects)
      constructedObjects.push(this);
  }

  initWithMSTEDictionary(d) {
    this.manager().initWithMSTEDictionary(d);
  }

  encodeToMSTE(encoder: MSTE.Encoder) {
    // unless specified, only _id and _version are encoded
    // see manager().snapshot() and manager().diff() for variants
    encoder.encodeDictionary({ _id: this._id, _version: this._version }, this.manager().name());
  }

  id()     : Identifier { return this._id; }
  version(): number { return this._version; }
  manager(): VersionedObjectManager<this> { return this.__manager; }

  farCallback<O extends VersionedObject, R>(this: O, method: string, argument: any, callback: (envelop: Invocation<O, R>) => void) {
    new Invocation(this, method, argument).farCallback(callback);
  }
  farEvent<O extends VersionedObject>(this: O, method: string, argument: any, eventName: string, onObject?: Object) {
    new Invocation(this, method, argument).farEvent(eventName, onObject);
  }
  farPromise<O extends VersionedObject, R>(this: O, method: string, argument: any) : Promise<Invocation<O, R>> {
    return new Invocation(this, method, argument).farPromise();
  }
  farAsync<O extends VersionedObject, R>(this: O, method: string, argument: any) : (flux: Flux<{ envelop: Invocation<O, R> }>) => void {
    let invocation = new Invocation(this, method, argument);
    return (flux: Flux<{ envelop: Invocation<O, R> }>) => {
      invocation.farAsync(flux);
    };
  }
}

class VersionedObjectSnapshot<VersionedObject> {
  __cls: string;
  _id: Identifier;
  _version: number;
  _localAttributes: { [s: string]: any };
  _versionAttributes: { [s: string]: any };

  constructor(o: VersionedObjectManager<VersionedObject>) {
    Object.defineProperty(this, '__cls', {
      enumerable: false, value: o.name()
    });
    this._version = o.version();
    this._id = o.id();
    this._localAttributes = {};
    this._versionAttributes = {};
  }
  encodeToMSTE(encoder /*: MSTE.Encoder*/) {
    encoder.encodeDictionary(this, this.__cls);
  }
}

export interface VersionedObjectConstructor<C extends VersionedObject> {
    new(): C;
}