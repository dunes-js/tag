import type { Comp } from "../class/Base.js"

export function eComp<T extends {[key: string]: any} = {}>(comp: eComp<T>)
{
  return comp;
}



declare global 
{
  type eComp<T extends {[key: string]: any} = {}> = 
  {
    (this: Comp<T>, props: T, comp: Comp<T>): JSX.Element
  }
}