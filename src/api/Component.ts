import type { Comp } from "../class/Base.js"



/**@deprecated*/
export function Component<T extends {[key: string]: any} = {}>(comp: Component<T>) 
{
	return comp;
}

export function eComp<T extends {[key: string]: any} = {}>(comp: eComp<T>)
{
  return comp;
}



declare global 
{
  /**@deprecated*/
	type Component<T extends {[key: string]: any} = {}> = 
  {
		(this: Comp<T>, props: T, comp: Comp<T>): JSX.Element
	}
  
  type eComp<T extends {[key: string]: any} = {}> = 
  {
    (this: Comp<T>, props: T, comp: Comp<T>): JSX.Element
  }
}