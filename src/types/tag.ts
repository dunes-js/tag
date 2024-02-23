import type { Comp, Elem, Frag } from "../class/Base.js";

export type ThingKind = (
	"content" | "element"
)

export interface Thing {
	kind: ThingKind
	toString(n?: number): string
}


export type Template = TagName | TemplateFunctionParam | typeof Frag
export type Properties = null | {
  [key: string]: any
}
export type Descendants = unknown[]

export type TemplateFunctionParam = (
	| TemplateFunction 
	| typeof Comp 
	| typeof Frag
  | typeof Elem
)

export type TemplateFunction = {
	(this: Comp, props: Properties, comp: Comp): JSX.Element
}