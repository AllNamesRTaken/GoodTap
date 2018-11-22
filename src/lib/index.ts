let VERSION = "0.2.1";
import { Dictionary, Vec2, Timer, List} from "goodcore";
import { until } from "goodcore/Arr";
import { newUUID } from "goodcore/Util";
import { is, findAll, get } from "goodcore/Dom";
import { isNotUndefined } from "goodcore/Test";

export const ALL_EVENTS = ["down", "drag", "up", "press", "tap", "swipe", "outside", "dragstart", "dragend", "drag"];
export type TAllEvents = "down" | "drag" | "up" | "press" | "tap" | "swipe" | "outside" | "dragstart" | "dragend" | "drag";
export type TDownEvents = "down";
export type TUpEvents = "up" | "tap" | "swipe";
export interface IGTEventFunction {
    (event: MouseEvent | TouchEvent, target: ITouchEvenElement, touch: ITouchInfo): any;
}
export interface ITouchInfo {
    index: number;
    time: number;
    pos: Vec2,
    startPos: Vec2,
    origin: Vec2,
    long: NodeJS.Timer | number | null;
    swipeInfo?: ISwipeInfo;
    moveHandler: ((ev: TouchEvent) => void) | undefined;
    dragResistance: number;
    prevented: {[P in TAllEvents]?: boolean};
    dragTarget?: HTMLElement;
    dragTargetOrigin?: Vec2;
}
export interface ISwipeInfo {
    direction: "up" | "down" | "left" | "right";
    distance: number;
    delta: Vec2;
}
export interface ITouchEvenElement extends HTMLElement {
    touchInfo?: ITouchInfo;
    [key: string]: any;
}
export interface IOnOff {
    on(element: ITouchEvenElement, name: string, fn: IGTEventFunction): void;
    off(element: ITouchEvenElement, name: string): void;
}
export interface GoodTapConfig {
    map: Partial<{[P in TAllEvents]: string}>;
}
export class GoodTap implements IOnOff {
    version = VERSION;
    minSwipeDistance = 100;
    maxTapDuration = 400;
    defaultLongPressDuration = 400;
    defaultDragResistance = 0;
    dragResistanceSquared: number = 0;
    events = ALL_EVENTS;
    downEvents: TDownEvents[] = ["down"];
    upEvents: TUpEvents[] = ["up", "tap", "swipe"];
    longPressIntervals = new Dictionary<NodeJS.Timer | number>();
    eventAttr: string = "";
    upEventsAndPress: (TUpEvents | "press")[] = [];
    index: number = 0;
    root: HTMLElement;
    lastInsides: List<HTMLElement> = new List();
    dragging: List<HTMLElement> = new List();
    isListeningToMovement: boolean = false;
    config: GoodTapConfig = {map: {}};

    constructor(rootElement?: HTMLElement) {    
        this.init(rootElement || document.body);
        this.eventAttr = this.events.map((name) => "[" + name + "]").join(",");
        this.upEventsAndPress = [...this.upEvents, "press"];        
    }
    public init(rootElement: HTMLElement, config?: Partial<GoodTapConfig>): void {
        this.config = {...this.config, ...config};
        if (this.hasTouchEvent()) {
            rootElement.addEventListener("touchstart", (ev: TouchEvent) => { this.start(ev, rootElement); });
            rootElement.addEventListener("touchend", (ev: TouchEvent) => { this.end(ev, rootElement); });
        }
        rootElement.addEventListener("mousedown", (ev: MouseEvent) => { this.start(ev, rootElement); });
        rootElement.addEventListener("mouseup", (ev: MouseEvent) => { this.end(ev, rootElement); });
        rootElement.addEventListener("focus", (ev: FocusEvent) => this.triggerOutside(ev.target as HTMLElement, ev, rootElement), true)
        this.root = rootElement;
    }
    private findTarget(el: ITouchEvenElement | null): ITouchEvenElement | null {
        let target: ITouchEvenElement | null = null;
        while (el && el.parentElement !== document as any && target === null) {
            if (is(this.eventAttr, el)) {
                target = el;
            }
            el = el.parentElement;
        }
        return target;
    }
    private findTargets(el: ITouchEvenElement | null): ITouchEvenElement[] {
        let targets: ITouchEvenElement[] = [];
        while (el && el.parentElement !== document as any) {
            if (!el.id) {
                el.id = newUUID();
            }
            if (is(this.eventAttr, el)) {
                targets.push(el);
            }
            el = el.parentElement;
        }
        return targets;
    }
    private getTouchPos(ev: TouchEvent | MouseEvent, pos?: Vec2): Vec2 {
        pos = pos || new Vec2(0, 0);
        if (ev instanceof TouchEvent) {
            pos.x = ev.changedTouches[0].pageX;
            pos.y = ev.changedTouches[0].pageY;
        } else if (ev instanceof MouseEvent) {
            pos.x = ev.pageX;
            pos.y = ev.pageY;
        }

        return pos;
    }
    private longPress(ev: MouseEvent | TouchEvent, target: ITouchEvenElement) {
        let result = true;
        let touchInfo = target.touchInfo!;
        result = this.executeAction(ev, target, "press", touchInfo);
        if(result === false || target.hasAttribute("once")) {
            clearInterval(this.longPressIntervals.get(touchInfo.index)! as NodeJS.Timer & number);
            this.longPressIntervals.delete(touchInfo.index);
        }
    }
    private triggerOutside(target: HTMLElement, ev: MouseEvent | TouchEvent | FocusEvent, rootElement?: HTMLElement) {
        let outside: List<HTMLElement> = new List(findAll("[outside]", this.root) as HTMLElement[]);        
        if (outside.length > 0) {
            let insides = new List<HTMLElement>(this.findTargets(target));
            let preventOutside = insides.contains((el) => el.hasAttribute("preventDefault"));
            if (!preventOutside) {
                outside
                    .filter((el: HTMLElement) => this.lastInsides.contains(el) && !insides.contains(el))
                    .forEach((el: HTMLElement) => this.handleEvent("outside", ev, el!));
                this.lastInsides = insides;
            }
        }
    }
    private move(ev: TouchEvent, rootElement: HTMLElement, target: ITouchEvenElement, action: string): void {
        let result = true;
        let touchInfo = target.touchInfo!;
        if (touchInfo === undefined) {
            this.end(ev, rootElement);
            return;
        }
        if (ev.cancelBubble === true) {
            return;
        }
        this.getTouchPos(ev, touchInfo.pos)
        if (touchInfo.dragResistance === 0 || 
            this.getTouchPos(ev).subtract(touchInfo.pos).lengthSq() < touchInfo.dragResistance) 
        {
            let dragTarget = target.touchInfo!.dragTarget || target;
            let hasDragTarget = target !== dragTarget;
            touchInfo.dragResistance = 0;
            try {
                if (!!action) {
                    if (action === "[fn]" && ("drag-fn") in target) {
                        result = target["drag-fn"](ev, dragTarget, touchInfo);
                    } else {
                        target["drag-fn"] = (new Function("event", "target", "touch", action!)).bind(target);
                        result = target["drag-fn"](ev, dragTarget, touchInfo);
                    }
                }
            } catch (err) {
                throw name + " event function error on element '" + target.id + "'\n" + err.toString();
            }
            if ( result === false ) {
                this.end(ev, rootElement);
            }

            if (dragTarget.hasAttribute("draggable")) {
                let bcr = dragTarget.getBoundingClientRect();
                dragTarget.style.left = ((hasDragTarget ? target.touchInfo!.dragTargetOrigin!.x : target.touchInfo!.origin.x) + (target.touchInfo!.pos.x - target.touchInfo!.startPos.x)) + "px";
                dragTarget.style.top = ((hasDragTarget ? target.touchInfo!.dragTargetOrigin!.y : target.touchInfo!.origin.y) + (target.touchInfo!.pos.y - target.touchInfo!.startPos.y)) + "px";
            }
        }

        if ( target!.hasAttribute("stopPropagation") || target!.hasAttribute("gt-false") ) {
            ev.stopPropagation();
            target!.touchInfo!.prevented.drag = true;
        }
        if ( target!.hasAttribute("preventDefault") || target!.hasAttribute("gt-false") || target!.hasAttribute("noTouchScroll") ) {
            ev.preventDefault();
        }
    }
    private start(ev: TouchEvent | MouseEvent, rootElement: HTMLElement) {
        // begin clean
        this.longPressIntervals.values.forEach((long: number) => clearInterval(long));
        this.longPressIntervals.clear();

        let preventDefault = false;
        let stopPropagation = false;
        let target: ITouchEvenElement | null = ev.target as ITouchEvenElement;
        let loopCounter = 0;

        this.triggerOutside(target, ev, rootElement);

        while (loopCounter < 100 && (target = this.findTarget(target)) && !stopPropagation) {
            ++loopCounter;
            let pressInterval: NodeJS.Timer | number | null = null;
            if (target.hasAttribute("press")) {
                pressInterval = setInterval(((target: ITouchEvenElement) => this.longPress(ev, target)).bind(this, target), 
                    parseInt(target.getAttribute("pressInterval")!) || this.defaultLongPressDuration);
            }
            let moveHandler: ((ev: TouchEvent) => void) | undefined = undefined;
            let dragResistance: number = 0;
            let hasDragTarget = false;
            if (target.hasAttribute("drag")) {
                hasDragTarget = !!target.getAttribute("dragTarget");
                dragResistance = parseInt(target!.getAttribute("dragResistance")!);
                if (isNaN(dragResistance)) {
                    dragResistance = this.defaultDragResistance;
                }
                dragResistance *= dragResistance;
                let dragAction = target!.getAttribute("drag")!
                moveHandler = ((t: ITouchEvenElement, d: string, ev: TouchEvent) => {
                    this.move(ev, rootElement, t!, d);
                }).bind(this, target, dragAction);
            
                if (this.hasTouchEvent()) {
                    rootElement.addEventListener("touchmove", moveHandler!);
                }
                rootElement.addEventListener("mousemove", moveHandler!);
            }
            target.classList.add("gt-active");
            let dragTarget = hasDragTarget ? get(target.getAttribute("dragTarget")!) : target;
            target.touchInfo = {
                index: this.index++,
                time: Timer.now(),
                pos: this.getTouchPos(ev),
                startPos: this.getTouchPos(ev),
                origin: new Vec2(parseInt(target.style.left || "0"), parseInt(target.style.top || "0")),
                long: pressInterval,
                moveHandler,
                dragResistance,
                prevented: {},
                dragTarget: hasDragTarget ? dragTarget : undefined,
                dragTargetOrigin: hasDragTarget ? new Vec2(parseInt(dragTarget.style.left || "0"), parseInt(dragTarget.style.top || "0")): undefined
            };

            if( target.hasAttribute("dragstart") ) {
                this.handleEvent("dragstart", ev, target);
            }
            if (pressInterval) {
                this.longPressIntervals.set(target.touchInfo!.index, target.touchInfo!.long!);
            }
            until(this.downEvents, (name) => {
                if (target!.hasAttribute(name)) {
                    stopPropagation = (this.handleEvent(name, ev, target!) === false);
                    if (!stopPropagation && target!.hasAttribute("stopPropagation") || target!.hasAttribute("gt-false")) {
                        stopPropagation = true;
                        ev.stopPropagation();
                        target!.touchInfo!.prevented[name] = true;
                    }
                    if (target!.hasAttribute("preventDefault") || target!.hasAttribute("gt-false")) {
                        ev.preventDefault();
                        preventDefault = true;
                    }
                }
                return stopPropagation;
            });
            target = target.parentElement;
        }
    }
    private isSwipe(ev: TouchEvent | MouseEvent, target: ITouchEvenElement) {
        let pos = this.getTouchPos(ev);
        let result = false;
        if ("touchInfo" in target) {
            let dX = pos.x - target.touchInfo!.pos.x;
            let dY = pos.y - target.touchInfo!.pos.y;
            let absDX = Math.abs(dX);
            let absDY = Math.abs(dY);
            let horizontal = absDX > absDY;
            let distance = horizontal ? absDX : absDY;
            result = distance >= this.minSwipeDistance;
            if (result) {
                target.touchInfo!.swipeInfo = {
                    direction: horizontal ? 
                        (dX < 0 ? "left" : "right") :
                        (dY < 0 ? "up" : "down"),
                    distance: distance,
                    delta: new Vec2(dX, dY)
                }
            }
        }
        return result;
    }
    private end(ev: MouseEvent | TouchEvent, rootElement: HTMLElement) {
        let time = Timer.now();
        let stopPropagation = false;
        let target = ev.target as ITouchEvenElement | null;
        let loopCounter = 0;
        let endedOutsideTargets = new List<HTMLElement>();
        let originalTarget = target;
        this.dragging.clear();
        // noprotect
        while (loopCounter < 100 && (target = this.findTarget(target)) && !stopPropagation) {
            ++loopCounter;
            let touchInfo = target.touchInfo!;
            if (touchInfo !== undefined) {
                let duration = time - touchInfo.time;
                until(this.upEventsAndPress, (name) => {
                    if (target!.hasAttribute(name)) {
                        let isSwipe = this.isSwipe(ev as TouchEvent | MouseEvent, target!);
                        if((name === "swipe" && isSwipe)
                            || (name === "tap" && !isSwipe && duration < this.maxTapDuration)
                            || (name === "up")){
                            stopPropagation = (this.handleEvent(name, ev, target!) === false);
                        }
                        if (stopPropagation || target!.hasAttribute("stopPropagation") || target!.hasAttribute("gt-false")) {
                            stopPropagation = true;
                            ev.stopPropagation();
                            delete target!.touchInfo;            
                        }
                        if (target!.hasAttribute("preventDefault") || target!.hasAttribute("gt-false")) {
                            ev.preventDefault();
                        }
                    }
                    return stopPropagation;
                });
            }
            target = target.parentElement;
        }

        // clean up
        findAll(".gt-active").forEach((el: ITouchEvenElement) => {
            el.classList.remove("gt-active");
            if (el.touchInfo !== undefined && el.touchInfo!.moveHandler !== undefined) {
                rootElement.removeEventListener("touchmove", el.touchInfo!.moveHandler!);
                rootElement.removeEventListener("mousemove", el.touchInfo!.moveHandler!);
                this.handleEvent("dragend", ev, el!)
            }
            delete el.touchInfo;
        });
    this.longPressIntervals.values.forEach((long: number) => clearInterval(long));
        this.longPressIntervals.clear();
    }
    private mapAttr(actionAttr: TAllEvents): string {
        let result: string = actionAttr;
        if ( isNotUndefined(this.config.map[actionAttr]) ) {
            result = this.config.map[actionAttr]!;
        }
        return result;
    }
    private executeAction(ev: MouseEvent | TouchEvent | FocusEvent, target: ITouchEvenElement, eventName: TAllEvents, touchInfo: ITouchInfo): any {
        let result = true;
        if ( eventName === "outside" || !touchInfo.prevented[eventName] ) {
            let attr = this.mapAttr(eventName);
            let action = target.getAttribute(attr);
            try {
                if (action === "[fn]" && (attr + "-fn") in target) {
                    result = target[attr + "-fn"](ev, target, touchInfo);
                } else {
                    result = (new Function("event", "target", "touch", action!)).bind(target)(ev, target, touchInfo);
                }
            } catch (err) {
                throw name + " event function error on element '" + target.id + "'\n" + err.toString();
            }
        }
        return result;
    }
    private handleEvent(name: TAllEvents, ev: MouseEvent | TouchEvent | FocusEvent, target: ITouchEvenElement) {
        let result: boolean = true;
        if (target) {
            result = this.executeAction(ev, target, name, target.touchInfo!);
            // clear event objects
            if (name in this.upEvents) {
                target.classList.remove("gt-active");
                if(this.longPressIntervals.has(target.touchInfo!.index)) {
                    clearInterval(this.longPressIntervals.get(target.touchInfo!.index)! as NodeJS.Timer & number);
                }
                delete target.touchInfo;
            }
        }
        return result;
    }
    public on(element: ITouchEvenElement, name: string, fn: IGTEventFunction) {
        element.setAttribute(name, "[fn]");
        element[name + "-fn"] = fn;
    }
    public off(element: ITouchEvenElement, name: string) {
        element.removeAttribute(name + "-action");
        delete element[name + "-fn"];
    }
    public hideKeyboard(): void {
        let field = document.createElement("input");
        field.setAttribute("type", "text");
        document.body.appendChild(field);

        setTimeout(function () {
            field.focus();
            setTimeout(function () {
                field.setAttribute("style", "display:none;");
                field.parentElement!.removeChild(field);
            }, 50);
        }, 50);
    }
    private hasTouchEvent(): boolean {
        return isNotUndefined(document.documentElement) && "ontouchstart" in document.documentElement!;
    }
    public outside(): void {
        this.triggerOutside(this.root, new FocusEvent(""));
        this.hideKeyboard();
    }
}
export function init(root?: HTMLElement): GoodTap {
    return new GoodTap(root);
}