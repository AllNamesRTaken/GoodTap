import { Vec2 } from "goodcore";
interface IGTEventFunction {
    (event: MouseEvent | TouchEvent, target: ITouchEvenElement, touch: ITouchInfo): any;
}
interface ITouchInfo {
    index: number;
    time: number;
    pos: Vec2,
    long: number | null;
    swipeInfo?: ISwipeInfo;
}
interface ISwipeInfo {
    direction: "up" | "down" | "left" | "right";
    distance: number;
    delta: Vec2;
}
interface ITouchEvenElement extends HTMLElement {
    touchInfo?: ITouchInfo;
    [key: string]: any;
}
interface IOnOff {
    on(element: ITouchEvenElement, name: string, fn: IGTEventFunction): void;
    off(element: ITouchEvenElement, name: string): void;
}
declare namespace goodtap {
    export function init(root?: HTMLElement): IOnOff;
    export function hideKeyboard(): void;
    export function outside(): void;
}