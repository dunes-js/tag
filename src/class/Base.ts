import { Content } from "./Content.js";
import type { 
    CSSProperties,
  Descendants, Properties, Template, 
  TemplateFunction, 
  TemplateFunctionParam, Thing 
} from "../types/index.js";

export function isNone(x: unknown): x is (null |undefined) 
{
  return x === null || x === undefined
}

export function isConstructor<T extends new (...args:any[])=>any>(fn: unknown): fn is T  
{
  return typeof fn == "function" && String(fn).startsWith("class");
}

export function isHTML(x: unknown): x is HTMLElement
{
  return x != null && "window" in globalThis && typeof x === "object" && "nodeType" in x && x.nodeType == Node.ELEMENT_NODE;
}

abstract class Base<P extends {[key: string]: any}> implements Thing {
	static type: "elem" | "comp" | "frag"

	static isElement(x: unknown): x is JSX.Element {
		return (x != null) && (
			x instanceof Elem || x instanceof Comp || (
				typeof x === "object" && "type" in x && (
					x.type === "elem" || x.type === "comp"
				)
			)
		)
	}

	static create(
		temp: Template, 
		props: Properties, 
		...
		desc: Descendants
	): JSX.Element
	{
		if (typeof temp === "function") {
			if (isConstructor(temp)) {
				if (temp.type === "elem") {
					throw "Cannot extend Elem yet"
				}
        if (temp.type === "frag") {
          return new Frag(desc);
        }
				return new (temp as typeof Comp)(temp, props, desc);
			}
      else
      {
        return new Comp(temp, props, desc);
      }
		}
		return new Elem(temp as "div", props, desc);
	}

	abstract type: "elem" | "comp" | "frag"
	abstract readonly temp: Template

	readonly kind = "element";

	abstract appendTo(elem: HTMLElement): HTMLElement
  abstract prependTo(elem: HTMLElement): HTMLElement
  abstract insertAt(elem: HTMLElement, position: InsertPosition): HTMLElement
	abstract replace(elem: HTMLElement): HTMLElement

	#children: Child[] = [];
	#parent: null | JSX.Element = null;
	#original: null | JSX.Element = null;
	#root: null | HTMLElement = null;

	constructor(public props: P, desc: Descendants) {
		this.desc = desc;
	}

	get parent() {
		return this.#parent;
	}

	get original() {
		return this.#original;
	}

	set original(value) {
		this.#original = value;
	}

	get root() {
		return this.#root;
	}

	set root(value) {
		this.#root = value;
	}

	get desc(): Child[] {
		return this.#children;
	}

	set desc(children: unknown[]) {
		this.#children = [];
    this.append(...children);
	}

  append(...children: unknown[]) {
    for (const child of children.flat().filter(e => e || e !== 0)) 
    {
      if (child instanceof Elem || child instanceof Comp || child instanceof Content) 
      {
        this.#children.push(child)
      }

      else if (!isNone(child) && child !== false)
      {
        this.#children.push(new Content(child))
      }
    }
  }
}

export class Elem<T extends TagName = "div"> extends Base<JSX.IntrinsicElements[T]> 
{
	static override readonly type = "elem";
	readonly type = Elem.type

	constructor(readonly temp: T, props: JSX.IntrinsicElements[T] | null, desc: Descendants) {
		super(props || {}, desc);
	}

	isTag<Tn extends TagName>(name: Tn): this is Elem<Tn> {
		return this.temp as TagName === name;
	}

  static readonly SELF = [
    "area",
    "base",
    "col",
    "embed",
    "hr",
    "img",
    "input", 
    "link",
    "meta",
    "param",
    "source",
  ]

	override toString(n = 0): string {
	  
		const self = Elem.SELF.includes(this.temp);

		let str = `<${this.temp}`;

		for (let [name, value] of Object.entries(this.props)) {
			if (typeof value === "function") continue;
      if (name == "cl")
      {
        name = "class"
      }
			str += " " + name;
			if (value === true) {
				continue
			}
			if (!isNone(value)) {
        str += "=" + JSON.stringify(value);
			}
		}

		str += self ? "/>" : ">";

		if (self) return str;

		for (const child of this.desc) {
			str += "\n" + "\t".repeat(n) + child.toString(n + 1);
		}

		if (this.desc.length) {
			str += "\n";
		}

		if (n) {
			str += "\t".repeat(n-1)
		}

		str += `</${this.temp}>`

		return str;
	}

	#createNode(): HTMLElement {
	  const node = document.createElement(this.temp);

		for (let [name, value] of Object.entries(this.props)) {
	  	if (name.startsWith("on")) {
	  		node.addEventListener(
	  			name.replace(/^on/, ""), 
	  			e => value.bind(node)(e)
	  		)
	  	}
	  	else if (isNone(value)) {
	  		continue;
	  	}
      else if (name == "style")
      {
        if (typeof value == "string")
        {
          node.setAttribute((name as string), value);
        }
        else if (typeof value == "object")
        {
          for (const [pName, pValue] of Object.entries(value) as [
            keyof CSSProperties, CSSProperties[keyof CSSProperties]
          ][])
          {
            node.style[pName] = pValue as any;
          }
        }
      }
	  	else {

        if (name == "cl") {
          name = "class";
        }
        if (name == "htmlFor") {
          name = "for";
        }
        if (typeof value == "boolean" && !name.includes("-"))
        {
          (node as any)[name] = value;
        }
        else
          node.setAttribute(name, value.toString());
	  	}
	  }

	  return node;
	}

  #create(): HTMLElement
  {
    const node = this.#createNode();

    for (const child of this.desc) {
      if (child.kind === "element") {
        child.appendTo(node);
      }
      else if (isHTML(child.value))
      {
        node.append(child.value);
      }
      else {
        node.append(child.toString());
      }
    }

    return node;
  }

	override insertAt(elem: HTMLElement, position: InsertPosition) 
  {
    const node = this.#create();
	  elem.insertAdjacentElement(position, node);
	  this.root = node;
		return node;
	}

  override appendTo(elem: HTMLElement) {
    const node = this.#create();
    elem.append(node);
    this.root = node;
    return node;
  }

  override prependTo(elem: HTMLElement) {
    const node = this.#create();
    elem.prepend(node);
    this.root = node;
    return node;
  }

	override replace(elem: HTMLElement) {
    const node = this.#create();
    elem.replaceWith(node);
    this.root = node;
    return node;
	}

}

export class Frag extends Base<{}> 
{
	static override readonly type = "frag";
	readonly type = Frag.type;
  readonly temp = Frag;

	constructor(desc: Descendants) 
  {
		super({}, desc);
	}

  override appendTo(elem: HTMLElement): HTMLElement 
  {
    for (const child of this.desc)
    {
      if (child.kind == "content")
      {
        if (isHTML(child.value))
        {
          elem.append(child.value);
        }
        else elem.append(child.toString());
      }
      else
      {
        child.appendTo(elem);
      }
    }

    return elem;
  }

  override prependTo(elem: HTMLElement): HTMLElement 
  {
    let first: HTMLElement | null = null;
    
    for (const child of this.desc)
    {
      if (child.kind == "content")
      {
        if (isHTML(child.value))
        {
          elem.append(child.value);
        }
        else elem.append(child.toString());
      }
      else if (first)
      {
        child.insertAt(first, "afterend");
      }
      else
      {
        first = child.prependTo(elem);
      }
    }

    return elem;
  }

  override insertAt(elem: HTMLElement, position: InsertPosition): HTMLElement 
  {
    let first: HTMLElement | null = null;
    
    for (const child of this.desc)
    {
      if (child.kind == "content")
      {
        if (isHTML(child.value))
        {
          elem.append(child.value);
        }
        else elem.append(child.toString());
      }
      else if (first)
      {
        child.insertAt(first, "afterend");
      }
      else
      {
        first = child.insertAt(elem, position);
      }
    }

    return elem;
  }

  override replace(_elem: HTMLElement): HTMLElement 
  {
    throw new Error("Cannot replace an element with a fragment of elements");
  }
}

export class Comp<P extends { [key: string]: any; } = any> extends Base<P> 
{
  static override readonly type = "comp";
  readonly type = Comp.type;

  constructor(readonly temp: TemplateFunctionParam, props: P | null, desc: Descendants) 
  {
    super(props || {} as P, desc);
  }

	protected produce(): JSX.Element 
  {
		if (isConstructor(this.temp)) 
    {
			throw "Override produce in a class component";
		}

		return (this.temp as TemplateFunction)(this.props, this);
	}

	override toString(n = 0): string 
  {
		return this.template().toString(n);
	}

	template() 
  {
		(this.props as any).desc = this.desc;
		const elem = this.produce();
		elem.original = this;

		return elem;
	}

	willRender?(): void;
	hasRendered?(): void;
	willDestroy?(): void;

	re(props?: Partial<P>)
  : this
  {
		if (!this.root) throw "Not rooted";
		this.willDestroy?.();

		if (props) for (const key in props) 
    {
			// @ts-expect-error
			this.props[key] = props[key];
		}

		this.replace(this.root);
    return this;
	}

	override appendTo(elem: HTMLElement): HTMLElement 
  {
		this.willRender?.();
		const node = this.template().appendTo(elem);
		this.root = node;
		this.hasRendered?.();
		return node;
	}

  override prependTo(elem: HTMLElement): HTMLElement 
  {
    this.willRender?.();
    const node = this.template().prependTo(elem);
    this.root = node;
    this.hasRendered?.();
    return node;
  }

  override insertAt(elem: HTMLElement, position: InsertPosition): HTMLElement 
  {
    this.willRender?.();
    const node = this.template().insertAt(elem, position);
    this.root = node;
    this.hasRendered?.();
    return node;
  }

	override replace(elem: HTMLElement): HTMLElement 
  {
		this.willRender?.()
		const node = this.template().replace(elem);
		this.root = node;
		this.hasRendered?.()
		return node;
	}
}
