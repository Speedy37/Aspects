import { Element, PathReporter, ElementDefinition, ProviderMap, Reporter } from '@openmicrostep/msbuildsystem.core';

export const elementFactories = Element.createElementFactoriesProviderMap('aspects');

export const GroupElement = Element.DynGroupElement(Element);
elementFactories.registerSimple('group', (at: PathReporter, name: string, definition: ElementDefinition, parent: Element) => {
  return new GroupElement('group', name, parent);
});

export class AspectBaseElement extends Element {

}


export class AspectRootElement extends Element {
  __classes: ClassElement[] = [];
}
export  interface AspectBaseElement {
  __root() : AspectRootElement;
}

function appendUndefined(type: string, allowUndefined: boolean) {
  return allowUndefined ? `${type} | undefined` : type;
}

function embedType(condition: boolean, prefix: [string, string], type: string, suffix: [string, string]) {
  return condition ? `${prefix[0]}${type}${suffix[0]}` : `${prefix[1]}${type}${suffix[1]}`;
}

elementFactories.registerSimple('scope', (at, name, definition, parent: AspectBaseElement) => {
  return new ScopeElement('scope', name, parent);
});
export class ScopeElement extends Element {
  toJSON() {
    return { is: this.is, name: this.name };
  }
}

elementFactories.registerSimple('type', (at, name, definition, parent: AspectBaseElement) => {
  return new TypeElement('type', name, parent);
});
export class TypeElement extends Element {
  type: 'primitive' | 'class' | 'array' | 'set' | 'dictionary' | 'or' | 'void';
  itemType?: TypeElement = undefined;
  properties?: { [s: string]: TypeElement } = undefined;
  types?: TypeElement[] = undefined;
  min?: number;
  max?: number | '*';
  scopes?: ScopeElement[];

  __decl(isAttribute: boolean, allowUndefined: boolean = false, relation: boolean = false) {
    switch (this.type) {
      case 'primitive':
        switch (this.name) {
          case 'integer':    return appendUndefined("number", allowUndefined);
          case 'decimal':    return appendUndefined("number", allowUndefined);
          case 'date':       return appendUndefined("Date", allowUndefined);
          case 'string':     return appendUndefined("string", allowUndefined);
          case 'array':      return appendUndefined("any[]", allowUndefined);
          case 'dictionary': return appendUndefined("{ [k: string]: any }", allowUndefined);
          case 'object':     return appendUndefined("Object", allowUndefined);
          case 'identifier': return appendUndefined("string | number", allowUndefined);
        }
        return "any";
      case 'class':
        return appendUndefined(this.name, allowUndefined);
      case 'array':
        return embedType(isAttribute, [`ImmutableList<`, ``], this.itemType ? this.itemType.__decl(isAttribute) : 'any' , [`>`, `[]`]);
      case 'set':
        return embedType(isAttribute, [`ImmutableSet<`, `Set<`], this.itemType ? this.itemType.__decl(isAttribute) : 'any' , [`>`, `>`]);
      case 'dictionary':
        return embedType(isAttribute, [`ImmutableObject<`, ``], `{${Object.keys(this.properties!).map(k => `${k === '*' ? '[k: string]' : `${k}`}: ${this.properties![k].__decl(isAttribute)}`).join(', ')}}` , [`>`, ``]);
      case 'or':
        return this.types ? `(${this.types.map(t => t.__decl(isAttribute)).join(' | ')})` : 'any';
      case 'void':
        return "void";
    }
  }

  toJSON() {
    let r: any = { is: this.is };
    if (this.name                    ) r.name = this.name;
    if (this.itemType !== undefined  ) r.itemType = this.itemType;
    if (this.types !== undefined     ) r.types = this.types;
    if (this.properties !== undefined) r.properties = this.properties;
    if (this.type !== undefined      ) r.type = this.type;
    if (this.min !== undefined       ) r.min = this.min;
    if (this.max !== undefined       ) r.max = this.max;
    if (this.scopes !== undefined) r.scopes = this.scopes.map(s => s.toJSON());
    return r;
  }
}

elementFactories.registerSimple('class', (at, name, definition, parent: AspectBaseElement) => {
  let ret = new ClassElement('class', name, parent);
  parent.__root().__classes.push(ret);
  return ret;
});
export class ClassElement extends Element {
  superclass: string = "VersionedObject";
  is_sub_object: boolean = false;
  attributes: AttributeElement[] = [];
  queries: QueryElement[] = [];
  categories: CategoryElement[] = [];
  farCategories: CategoryElement[] = [];
  aspects: AspectElement[] = [];

  __decl() {
    let parent = this.superclass;
    let categories = [...this.categories, ...this.farCategories];
    let workaround = '';
    if (parent !== "VersionedObject") {
      workaround = `${this.categories.map(category => `\n${category.__const(this)}`).join('')}${
                      this.farCategories.map(category => `\n${category.__const(this)}`).join('')}${
                      this.categories.map(category => `\n${category.__constImpl(this)}`).join('')}${
                      this.farCategories.map(category => `\n${category.__constImpl(this)}`).join('')}`;
    }
    let decl = `export class ${this.name} extends ${parent} {`;
    let attributes = [...this.attributes, ...this.queries];
    for (let attribute of attributes) {
      let type = attribute.type.__decl(true, true, attribute instanceof AttributeElement && !!attribute.relation);
      decl += `\n  ${attribute instanceof QueryElement ? 'readonly ' : ''}${attribute.name}: ${type};`;
    }
    if (attributes.length)
      decl += `\n`;
    decl += `\n  static readonly definition: Aspect.Definition = <any>${JSON.stringify(this, null, 2).replace(/\n/g, '\n  ')};`;
    decl += `\n  static readonly parent = ${parent};`;
    decl += `\n  static readonly category: ${this.name}.Categories;`;
    decl += `\n}`;
    if (parent !== "VersionedObject") {
      decl += `\nexport namespace ${this.name} {`;
      for (let category of categories)
        decl += `\n  ${category.__const(this)}`;
      for (let category of categories)
        decl += `\n  ${category.__constImpl(this)}`;
      decl += `\n}`;
    }
    decl += `
export declare namespace ${this.name} {`;
    decl += `\n  function __${this.name}_c(name: string): {};`;
    for (let category of categories)
      decl += `\n  function __${this.name}_c(name: '${category.name}'): ${this.name}.Categories.${category.name};`;

    decl += `\n  function __${this.name}_i(name: string): {};`;
    for (let category of categories)
      decl += `\n  function __${this.name}_i<T extends ${this.name}>(name: '${category.name}'): ${this.name}.ImplCategories.${category.name}<T>;`;
    if (categories.length)
      decl += `\n`;
    decl += `\n  export interface Categories<C extends ${this.name} = ${this.name}> extends ${parent}.Categories<C> {`;
    for (let category of categories)
      decl += `\n    (name: '${category.name}', implementation: ${this.name}.ImplCategories.${category.name}<C>);`
    decl += `\n  }`;
    decl += `
  export namespace Categories {${
    this.categories.map(category => category.__decl(this, !!workaround)).join('')}${
    this.farCategories.map(category => category.__decl(this, !!workaround)).join('')}
  }
  export namespace ImplCategories {${
    this.categories.map(category => category.__declImpl(this, !!workaround)).join('')}${
    this.farCategories.map(category => category.__declImpl(this, !!workaround)).join('')}
  }
  export namespace Aspects {${this.aspects.map(aspect => `
    export type ${aspect.name} = ${
      aspect.categories.concat(aspect.farCategories).map(c => `Categories.${c.name}`).join(' & ') || this.name
    };`).join('')}
  }`;
    decl += `\n}`;
    decl += `
export namespace ${this.name} {
  export function create(ccc: ControlCenterContext) { return ccc.create<${this.name}>(${JSON.stringify(this.name)}); }
  export const Aspects = {${this.aspects.map(aspect => `
    ${aspect.name}: <Aspect.FastConfiguration<${this.name}.Aspects.${aspect.name}>> {
      name: ${JSON.stringify(this.name)}, aspect: ${JSON.stringify(aspect.name)}, cstor: ${this.name}, categories: [${
        aspect.categories.concat(aspect.farCategories).map(c => JSON.stringify(c.name)).join(", ")
      }],
      create(ccc: ControlCenterContext) { return ccc.create<${this.name}.Aspects.${aspect.name}>(${JSON.stringify(this.name)}, this.categories); },
    },`).join('')}
  };
}
`;
    return decl;
  }

  toJSON() {
    return {
      is: this.is,
      name: this.name,
      version: 0,
      is_sub_object: this.is_sub_object || undefined,
      attributes: this.attributes.map(a => a.toJSON()),
      queries: this.queries.map(a => a.toJSON()),
      categories: this.categories.map(c => c.toJSON()),
      farCategories: this.farCategories.map(c => c.toJSON()),
      aspects: this.aspects.map(a => a.toJSON())
    };
  }
}

elementFactories.registerSimple('attribute', (at, name, definition, parent) => {
  return new AttributeElement('attribute', name, parent);
});
export class AttributeElement extends Element {
  type: TypeElement;
  relation?: string;
  is_sub_object: boolean = false;
  validators: string[] = [];

  __resolveWithPath(at: PathReporter) {
    super.__resolveWithPath(at);
    if (this.relation && this.type.type === 'array')
      this.type.type = 'set';
  }

  toJSON() {
    return {
      is: this.is,
      name: this.name,
      type: this.type,
      relation: this.relation,
      is_sub_object: this.is_sub_object || undefined,
      validators: this.validators.length > 0 ? this.validators : undefined,
    };
  }
}

elementFactories.registerSimple('query', (at, name, definition, parent) => {
  return new QueryElement('query', name, parent);
});
export class QueryElement extends Element {
  type: TypeElement;
  query: any;

  toJSON() {
    return {
      is: this.is,
      name: this.name,
      type: this.type,
      query: this.query
    };
  }
}

elementFactories.registerSimple('category', (at, name, definition, parent) => {
  return new CategoryElement('category', name, parent);
});
elementFactories.registerSimple('farCategory', (at, name, definition, parent) => {
  return new CategoryElement('farCategory', name, parent);
});
export class CategoryElement extends Element {
  langages: string[] = [];
  methods: MethodElement[] = [];

  __constName(clazz: ClassElement) {
    return `__${clazz.name}_Categories_${this.name}`;
  }
  __constNameImpl(clazz: ClassElement) {
    return `__${clazz.name}_ImplCategories_${this.name}`;
  }
  __const(clazz: ClassElement) {
    return `export const ${this.__constName(clazz)} = ${clazz.superclass}.__${clazz.superclass}_c && ${clazz.superclass}.__${clazz.superclass}_c('${this.name}');`;
  }
  __constImpl(clazz: ClassElement) {
    return `export const ${this.__constNameImpl(clazz)} = ${clazz.superclass}.__${clazz.superclass}_i && ${clazz.superclass}.__${clazz.superclass}_i<${clazz.name}>('${this.name}');`;
  }
  __decl(clazz: ClassElement, workaround: boolean) {
    return `
    export type ${this.name} = ${clazz.name} & ${workaround ? `typeof ${this.__constName(clazz)} & ` : ''}{${
      this.is === 'farCategory' ? this.__declFarMethods(clazz.name) : this.__declMethods()}
    }`;
  }
  __declImpl(clazz: ClassElement, workaround: boolean) {
    return `
    export type ${this.name}<C extends ${clazz.name} = ${clazz.name}> = ${workaround ? `typeof ${this.__constNameImpl(clazz)} & ` : ''}{${
      this.is === 'farCategory' ? this.__declImplFarMethods('C') : this.__declImplMethods('C')}
    }`;
  }
  __declMethods() {
    return this.methods.map(method => `
      ${method.name}(${method.__declArguments().join(', ')}): ${method.__declReturn()};`).join('');
  }
  __declFarMethods(clazz: string) {
    return this.methods.map(method => `
      ${method.name}: Aspect.Invokable<${method.__declFarArgument()}, ${method.__declReturn()}>;`).join('');
  }
  __declImplMethods(clazz: string) {
    return this.methods.map(method => `
      ${method.name}: (this: ${clazz}${method.__declArguments().map(a => `, ${a}`).join('')}) => ${method.__declReturn()};`).join('');
  }
  __declImplFarMethods(clazz: string) {
    return this.methods.map(method => `
      ${method.name}: Aspect.FarImplementation<${clazz}, ${method.__declFarArgument()}, ${method.__declReturn()}>;`).join('');
  }

  toJSON(){
    return {
      is: this.is,
      name: this.name,
      methods: this.methods.map(m => m.toJSON())
    };
  }
}

elementFactories.registerSimple('method', (at, name, definition, parent) => {
  return new MethodElement('method', name, parent);
});
export class MethodElement extends Element {
  arguments: TypeElement[] = [];
  return: TypeElement;

  __declArguments() : string[] {
    return this.arguments.map((a, i) => `arg${i}: ${a.__decl(false)}`);
  }
  __declFarArgument() {
    return this.arguments[0] ? this.arguments[0].__decl(false) : "undefined";
  }
  __declReturn() {
    return this.return.__decl(false);
  }

  toJSON() {
    return {
      is: this.is,
      name: this.name,
      argumentTypes: this.arguments,
      returnType: this.return,
    };
  }
}

elementFactories.registerSimple('aspect', (at, name, definition, parent) => {
  return new AspectElement('aspect', name, parent);
});
export class AspectElement extends Element {
  categories: CategoryElement[] = [];
  farCategories: CategoryElement[] = [];

  toJSON() {
    return {
      is: this.is,
      name: this.name,
      categories: this.categories.map(c => c.name),
      farCategories: this.farCategories.map(c => c.name),
    };
  }
}
