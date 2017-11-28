## class VersionedObject

La classe VersionedObject est la classe mère dont héritent tous les objets aspects.

### core
#### id(): Identifier
L'identifiant de l'objet géré.

#### version(): integer
La version courante de l'objet géré.

#### manager(): VersionedObjectManager
Le gestionnaire de cet objet.

#### controlCenter(): ControlCenter
Le center de contrôle auquel est rattaché l'objet.

#### ${attribute_name}: any
Pour chaque attribut, il existe la propriété correspondant permettant un accès classique à la valeur qui serait autrement accessible via `manager().attributeValue(attribute_name)`.

__!__: Lève une exception si l'attribut n'est pas chargé

### validation

#### validate(reporter: Reporter)
Validation de l'objet sans considération pour son entourage et report des diagnostics dans _reporter_.

## class VersionedObjectManager

Les méthodes ayant en paramètre un nom d'attribut existes aussi dans une version plus rapide avec le suffix `Fast`. Elles prennent directement les données Aspects de l'attribut évitant ainsi la résolution du nom sur une table de hashage. Ces méthodes ne sont pas décrite dans ce document par soucis de lisibilité.

Un attribut est considéré chargé si:

 - l'objet est _nouveau_
 - l'attribut est _sauvé_

Une fois qu'un objet possède un identifiant réel, il n'est plus considéré comme _nouveau_.

Un sous-objet ne peut-être supprimé, cette information étant porté par la présence ou non du sous-objet dans les valeurs de l'objet racine. Ainsi un sous-objet renverra toujours faux à la question `isPendingDeletion()`.

La suppression d'un objet n'implique aucun effet immédiat, cette information étant appliquer au moment de l'enregistrement de l'objet, résultant en la suppréssion réel de l'objet.

### Environnement
#### id(): Identifier
L'identifiant de l'objet géré.

#### version(): integer
La version courante de l'objet géré:

 - un entier si l'objet est sauvé (via setVersion / mergeSavedAttributes)
 - `VersionedObjectManager.NoVersion` si l'objet est nouveau et sans réel identifiant (`isNew()` vrai)
- `VersionedObjectManager.UndefinedVersion` si l'objet à un identifiant réel mais pas de version définit

#### object(): VersionedObject
L'objet géré.

#### rootObject(): VersionedObject
L'objet racine.
Si l'objet est un sous-objet alors c'est l'objet racine de son parent, sinon c'est l'objet géré.

#### controlCenter(): ControlCenter
Le center de contrôle auquel est rattaché l'objet.

### Définition
#### classname(): string
Le nom de la classe de l'objet

#### aspect(): Aspect.Installed
Les données sur l'aspect de l'objet.

#### isSubObject(): boolean
Vrai si l'objet est un sous-object.

### Etat & Valeurs
#### isSaved(): boolean
Vrai si l'objet est sauvé.

#### isNew(): boolean
Vrai si l'objet est nouveau.

#### isModified(): boolean
Vrai si l'objet est modifié.

#### isInConflict(): boolean
Vrai si l'objet à un conflit.

#### isPendingDeletion(): boolean
Vrai si l'objet sera supprimé à la prochaine sauvegarde.

#### isAttributeSaved(attribute_name: string): boolean
Vrai si l'attribut _attribute\_name_ est sauvé.

#### isAttributeModified(attribute_name: string): boolean
Vrai si l'attribut _attribute\_name_ est modifié.

#### isAttributeInConflict(attribute_name: string): boolean
Vrai si l'attribut _attribute\_name_ est en conflit.

#### hasAttributeValue(attribute_name: string): boolean
Vrai si l'attribut _attribute\_name_ est chargé.

#### attributeValue(attribute_name: string): any
La valeur courante de l'attribut _attribute\_name_.

 - Si l'attribut est modifié, c'est la valeur modifié.
 - Sinon si l'attribut est sauvé, c'est la valeur sauvé
 - Sinon si l'objet est nouveau, c'est la valeur par défaut
  - un ensemble vide si l'attribut est un ensemble
  - un tabeau vide si l'attribute est un tableau
  - undefined sinon

__!__: Lève une exception si l'attribut n'est pas chargé

#### savedAttributeValue(attribute_name: string): any
La valeur sauvé de le l'attribut _attribute\_name_.

__!__: Lève une exception si l'attribut n'est pas chargé

#### outdatedAttributeValue(attribute_name: string): any
L'ancienne valeur sauvé avant l'introduction d'un conflit sur l'attribut _attribute\_name_.

__!__: Lève une exception si l'attribut n'est pas chargé ou en conflit

#### modifiedAttributes(): Iterable<{ attribute: Aspect.InstalledAttribute, modified: any }>
Retourne un itérateur sur l'ensemble des attributs modifiés et la valeur associée.

#### outdatedAttributes(): Iterable<{ attribute: Aspect.InstalledAttribute, outdated: any }>
Retourne un itérateur sur l'ensemble des attributs en conflits et l'ancienne valeur sauvé associée.


### Gestion

#### setAttributeValue(attribute_name: string, value: any): void
Change la valeur courante de l'attribut _attribute\_name_.

__!__: Lève une exception si:
 - l'attribut n'est pas chargé
 - la valeur donnée pose un problème de cohérence vis à vis du modèle Aspects


#### resolveOutdatedAttribute(attribute_name: string): void
Marque un éventuel conflit sur l'attribute _attribute\_name_ comme résolu.
Si l'attribut contient des sous-objets en conflit, ces conflits sont aussi marqués résolus.

#### resolveAllOutdatedAttributes(): void
Marque tous les éventuels conflits sur les attributs de l'objet comme résolu.

#### clearModifiedAttribute(attribute_name: string): void
Annule les modifications faites à l'attribut _attribute\_name_.

#### clearAllModifiedAttributes(): void
Annule toutes les modifications.

#### unloadAttribute(attribute_name: string): void
Décharge l'attribut _attribute\_name_, si l'attribut est modifié, les modifications sont perdues.

#### unloadAllAttributes(): void
Décharge tous les attributs.

#### setPendingDeletion(will_delete: boolean): void
Marque ou démarque l'objet pour suppression. Un objet marqué pour suppression sera effectivement supprimé à la prochaine sauvegarde.

__!__: Lève une exception si l'objet est un sous-objet

#### setId(id: Identifier)
Définit l'identifiant réel de l'objet.

__!__: Lève une exception si:
 - _id_ est un identifiant local
 - un identifiant à déjà été définit pour l'objet

#### setVersion(version: number)
Marque l'objet comme sauvé, l'ensemble des modifications sont placés sont considérés comme sauvé.

__!__: Lève une exception si:
 - l'objet est _nouveau_ (ne possède pas d'identifiant réel)
 - l'objet est en _conflit_

#### computeMissingAttributes(snapshot: VersionedObjectSnapshot): string[]
Retourne la liste des attributs actuellement chargé qui ne sont pas présent dans l'instantané _snapshot_.

#### mergeSavedAttributes(snapshot: VersionedObjectSnapshot): { changes: string[], conflicts: string[], missings: string[] }
Fusionne l'instantané _snapshot_ en tant que valeur sauvé de l'objet et retourne 3 listes d'attributs:

 - `changes`: pour l'ensemble des attributs qui ont une nouvelle valeur sauvé,
 - `conflicts`: pour l'ensemble des attributs qui sont désormais en conflit,
 - `missings`: pour l'ensemble des attributs qui était chargé et qui ne le sont plus car non présents dans l'instantané.

__!__: Lève une exception si les valeurs données posent un problème de cohérence vis à vis du modèle Aspects

## class VersionedObjectSnapshot

#### id(): Identifier
L'identifiant de l'objet au moment de sa capture.

#### version(): integer
La version de l'objet au moment de sa capture.

#### setAttributeValueFast(attribute: Aspect.InstalledAttribute, value): void
Définit la valeur de l'attribut _attribute_ au moment de sa capture.

#### hasAttributeValueFast(attribute: Aspect.InstalledAttribute): boolean
Vrai si la valeur de l'attribut _attribute_ fait partie de la capture.

#### attributeValueFast(attribute: Aspect.InstalledAttribute): any
La valeur de l'attribut _attribute_ au moment de sa capture.

## Détails d'implémentations

Les attributs sont stockés dans des tableaux dont l'indice est calculé pour chaque attribut au démarrage (voir `AspectConfiguration`).
Les attributs `_id` et `_version` sont toujours respectivement aux indices `0` et `1`.
Les attributs _utilisateur_ commencent donc à l'indice `2`.

A chaque attribut dans `VersionedObjectManager` est associé les données suivantes:

 - l'attribut est t'il sauvé ou non (`flags & SAVED`)
 - le nombre de modifications et s'il y a modification la valeur modifiée
 - le nombre de conflict et s'il y a conflit l'ancienne valeur

Ces données sont stockées dans un objet qui à la forme: 

```ts
type InternalAttributeData = {
  flags   : number, // 16 bits pour le nombre de modification, 2 bits pour les flags, 14 bits pour le nombre de conflits
  modified: any,    // accessible si le nombre de modification > 0
  saved   : any,    // accessible si flags & SAVED
  outdated: any,    // accessible si le nombre de conflits > 0
}
```

### Comptage du nombre de modifications

Le comptage du nombre de modifications est présent pour gérer correctement les sous-objets. Un attribut étant modifié si lui-même ou l'un de ses sous-objets est modifiés.

Si l'attribut est modifié par un changement de valeur (en ignorant les valeurs contenues dans les sous-objets), ce nombre est incrémenté de `1`. Ainsi pour les attributs sans sous-objet ce nombre vaut `0` ou `1`.

Si l'attribut peut contenir des sous-objets alors les différences sont générées et le compteur est incrémenté selon les règles non exclusives suivantes:

  - `+1` si ajout d'un objet modifié
  - `-1` si ajout d'un objet déjà sauvé et à l'endroit ou il était sauvé, `+1` sinon
  - `-1` si suppression d'un objet modifié
  - `+1` si suppression d'un objet déjà sauvé et à l'endroit ou il était sauvé, `-1` sinon

Par exemple, dans un tableau de sous-objets ordonés, le déplacement d'une valeur sauvé équivaut à la suppression de celle-ci `+1` et à l'ajout de celle-ci à la nouvelle position `+1`.

### Comptage du nombre de conflits

Le comptage du nombre de conflits est présent pour gérer correctement les sous-objets. Un attribut étant en conflit si lui-même ou l'un de ses sous-objets est en conflit.

Il correspond simplement au nombre de sous-objet en conflits plus un si la valeur de l'attribut est lui-même la source d'un conflit.

Ainsi lorsqu'un sous-objet lève tous ses conflits, le compteur de l'attribut contenant le sous-objet est décrémenté.
Levé un conflit sur un attribut contenant des sous objects impliques la levé de tous les conflits possibles sur ces sous-objets