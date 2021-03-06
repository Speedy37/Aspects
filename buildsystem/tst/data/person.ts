import {Aspect, ControlCenter, ControlCenterContext, VersionedObject, VersionedObjectConstructor, Result, ImmutableList, ImmutableSet, ImmutableObject} from '@openmicrostep/aspects';

export class Person extends VersionedObject {
  _firstName: string | undefined;
  _lastName: string | undefined;
  _birthDate: Date | undefined;
  _mother: Person | undefined;
  _father: Person | undefined;
  _cats: ImmutableSet<Cat>;
  readonly _sons: ImmutableList<Person>;

  static readonly definition: Aspect.Definition = <any>{
    "is": "class",
    "name": "Person",
    "version": 0,
    "attributes": [
      {
        "is": "attribute",
        "name": "_firstName",
        "type": {
          "is": "type",
          "name": "string",
          "type": "primitive"
        }
      },
      {
        "is": "attribute",
        "name": "_lastName",
        "type": {
          "is": "type",
          "name": "string",
          "type": "primitive"
        }
      },
      {
        "is": "attribute",
        "name": "_birthDate",
        "type": {
          "is": "type",
          "name": "date",
          "type": "primitive"
        }
      },
      {
        "is": "attribute",
        "name": "_mother",
        "type": {
          "is": "type",
          "name": "Person",
          "type": "class"
        }
      },
      {
        "is": "attribute",
        "name": "_father",
        "type": {
          "is": "type",
          "name": "Person",
          "type": "class"
        }
      },
      {
        "is": "attribute",
        "name": "_cats",
        "type": {
          "is": "type",
          "itemType": {
            "is": "type",
            "name": "Cat",
            "type": "class"
          },
          "type": "set",
          "min": 0,
          "max": "*"
        },
        "relation": "_owner"
      }
    ],
    "queries": [
      {
        "is": "query",
        "name": "_sons",
        "type": {
          "is": "type",
          "itemType": {
            "is": "type",
            "name": "Person",
            "type": "class"
          },
          "type": "array",
          "min": 0,
          "max": "*"
        },
        "query": "{\n  \"instanceOf\": \"Person\",\n  \"$or\": [\n    { \"_father\": { \"$eq\": \"=self\" } },\n    { \"_mother\": { \"$eq\": \"=self\" } }\n  ]\n}\n"
      }
    ],
    "categories": [
      {
        "is": "category",
        "name": "core",
        "methods": [
          {
            "is": "method",
            "name": "firstName",
            "argumentTypes": [],
            "returnType": {
              "is": "type",
              "name": "string",
              "type": "primitive"
            }
          },
          {
            "is": "method",
            "name": "lastName",
            "argumentTypes": [],
            "returnType": {
              "is": "type",
              "name": "string",
              "type": "primitive"
            }
          },
          {
            "is": "method",
            "name": "fullName",
            "argumentTypes": [],
            "returnType": {
              "is": "type",
              "name": "string",
              "type": "primitive"
            }
          },
          {
            "is": "method",
            "name": "birthDate",
            "argumentTypes": [],
            "returnType": {
              "is": "type",
              "name": "date",
              "type": "primitive"
            }
          }
        ]
      }
    ],
    "farCategories": [
      {
        "is": "farCategory",
        "name": "calculation",
        "methods": [
          {
            "is": "method",
            "name": "age",
            "argumentTypes": [],
            "returnType": {
              "is": "type",
              "name": "integer",
              "type": "primitive"
            }
          }
        ]
      }
    ],
    "aspects": []
  };
  static readonly parent = VersionedObject;
  static readonly category: Person.Categories;
}
export declare namespace Person {
  function __Person_c(name: string): {};
  function __Person_c(name: 'core'): Person.Categories.core;
  function __Person_c(name: 'calculation'): Person.Categories.calculation;
  function __Person_i(name: string): {};
  function __Person_i<T extends Person>(name: 'core'): Person.ImplCategories.core<T>;
  function __Person_i<T extends Person>(name: 'calculation'): Person.ImplCategories.calculation<T>;

  export interface Categories<C extends Person = Person> extends VersionedObject.Categories<C> {
    (name: 'core', implementation: Person.ImplCategories.core<C>);
    (name: 'calculation', implementation: Person.ImplCategories.calculation<C>);
  }
  export namespace Categories {
    export type core = Person & {
      firstName(): string;
      lastName(): string;
      fullName(): string;
      birthDate(): Date;
    }
    export type calculation = Person & {
      age: Aspect.Invokable<undefined, number>;
    }
  }
  export namespace ImplCategories {
    export type core<C extends Person = Person> = {
      firstName: (this: C) => string;
      lastName: (this: C) => string;
      fullName: (this: C) => string;
      birthDate: (this: C) => Date;
    }
    export type calculation<C extends Person = Person> = {
      age: Aspect.FarImplementation<C, undefined, number>;
    }
  }
  export namespace Aspects {
  }
}
export namespace Person {
  export function create(ccc: ControlCenterContext) { return ccc.create<Person>("Person"); }
  export const Aspects = {
  };
}
export class Cat extends VersionedObject {
  _owner: Person | undefined;

  static readonly definition: Aspect.Definition = <any>{
    "is": "class",
    "name": "Cat",
    "version": 0,
    "attributes": [
      {
        "is": "attribute",
        "name": "_owner",
        "type": {
          "is": "type",
          "name": "Person",
          "type": "class"
        },
        "relation": "_cats"
      }
    ],
    "queries": [],
    "categories": [],
    "farCategories": [],
    "aspects": []
  };
  static readonly parent = VersionedObject;
  static readonly category: Cat.Categories;
}
export declare namespace Cat {
  function __Cat_c(name: string): {};
  function __Cat_i(name: string): {};
  export interface Categories<C extends Cat = Cat> extends VersionedObject.Categories<C> {
  }
  export namespace Categories {
  }
  export namespace ImplCategories {
  }
  export namespace Aspects {
  }
}
export namespace Cat {
  export function create(ccc: ControlCenterContext) { return ccc.create<Cat>("Cat"); }
  export const Aspects = {
  };
}
