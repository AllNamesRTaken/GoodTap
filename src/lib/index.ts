import { Arr, Dictionary, Dom, Vec2, Timer} from "goodcore";

export interface IGTEventFunction {
    (event: MouseEvent | TouchEvent, target: ITouchEvenElement, touch: ITouchInfo): any;
}
export interface ITouchInfo {
    index: number;
    time: number;
    pos: Vec2,
    long: number | null;
    swipeInfo?: ISwipeInfo;
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
export class GoodTap {
    minSwipeDistance = 100;
    events = ["down", "up", "press", "tap", "swipe"];
    downEvents = ["down"];
    upEvents = ["up", "tap", "swipe"];
    longPressIntervals = new Dictionary<number>();
    eventAttr: string = "";
    upEventsAndPress: string[] = [];
    index: number = 0;

    constructor(rootElement?: HTMLElement) {    
        this.init(rootElement || document.body);
        this.eventAttr = this.events.map((name) => "[" + name + "]").join(",");
        this.upEventsAndPress = [...this.upEvents, "press"];        
    }
    public init(rootElement: HTMLElement): void {
        if (GoodTap.hasTouchEvent()) {
            rootElement.addEventListener("touchInfo", (ev: TouchEvent) => { this.begin(ev); });
            rootElement.addEventListener("touchend", (ev: TouchEvent) => { this.end(ev); });
        }
        rootElement.addEventListener("mousedown", (ev: MouseEvent) => { this.begin(ev); });
        rootElement.addEventListener("mouseup", (ev: MouseEvent) => { this.end(ev); });
    }
    private findTarget(el: ITouchEvenElement | null): ITouchEvenElement | null {
        let target: ITouchEvenElement | null = null;
        while (el && el.parentElement !== document as any && target === null) {
            if (Dom.is(this.eventAttr, el)) {
                target = el;
            }
            el = el.parentElement;
        }
        return target;
    }
    private getTouchPos(ev: TouchEvent | MouseEvent): Vec2 {
        let pos = new Vec2(0, 0);
        if (ev instanceof TouchEvent) {
            pos = new Vec2( ev.changedTouches[0].pageX, ev.changedTouches[0].pageY );
        } else if (ev instanceof MouseEvent) {
            pos = new Vec2( ev.pageX, ev.pageY );
        }

        return pos;
    }
    private longPress(ev: MouseEvent | TouchEvent, target: ITouchEvenElement) {
        let result = true;
        let touchInfo = target.touchInfo!;
        result = this.executeAction(ev, target, "press", touchInfo);
        if(result === false || target.hasAttribute("once")) {
            clearInterval(this.longPressIntervals.get(touchInfo.index)!);
            this.longPressIntervals.delete(touchInfo.index);
        }
    }
    private begin(ev: TouchEvent | MouseEvent) {
        // begin clean
        this.longPressIntervals.list.forEach((long: number) => clearInterval(long));
        this.longPressIntervals.clear();

        let stopPropagation = false;
        let target: ITouchEvenElement | null = ev.target as ITouchEvenElement;
        let loopCounter = 0;
        while (loopCounter < 100 && (target = this.findTarget(target)) && !stopPropagation) {
            ++loopCounter;
            let pressInterval = null;
            if (target.hasAttribute("press")) {
                pressInterval = setInterval(((target: ITouchEvenElement) => this.longPress(ev, target)).bind(this, target), 
                    parseInt(target.getAttribute("pressInterval")!) || 500);
            }
            target.classList.add("gt-active");
            target.touchInfo = {
                index: this.index++,
                time: Timer.now(),
                pos: this.getTouchPos(ev),
                long: pressInterval
            };
            if (pressInterval) {
                this.longPressIntervals.set(target.touchInfo!.index, target.touchInfo!.long!);
            }
            Arr.until(this.downEvents, (name) => {
                if (target!.hasAttribute(name)) {
                    stopPropagation = (this.handleEvent(name, ev, target!) === false);
                    if (!stopPropagation && target!.hasAttribute("stopPropagation") && target!.hasAttribute("gt-false")) {
                        stopPropagation = true;
                        ev.stopPropagation();
                    }
                    if (target!.hasAttribute("preventDefault") && target!.hasAttribute("gt-false")) {
                        ev.preventDefault();
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
    private end(ev: MouseEvent | TouchEvent) {
        let time = Timer.now();
        let stopPropagation = false;
        let target = ev.target as ITouchEvenElement | null;
        let loopCounter = 0;
        // noprotect
        while (loopCounter < 100 && (target = this.findTarget(target)) && !stopPropagation) {
            ++loopCounter;
            let touchInfo = target.touchInfo!;
            let endedOutsideOrMultiTouch = touchInfo === undefined;
            if (endedOutsideOrMultiTouch && this.longPressIntervals.has(touchInfo.index)) {
                target.classList.remove("gt-active");
                clearInterval(this.longPressIntervals.get(touchInfo.index)!);
                delete target.touchInfo;
            } else {
                Arr.until(this.upEventsAndPress, (name) => {
                    if (target!.hasAttribute(name)) {
                        let isSwipe = this.isSwipe(ev as TouchEvent | MouseEvent, target!);
                        if(name === "swipe" && isSwipe
                            || name === "tap" && !isSwipe
                            || name === "up"){
                            stopPropagation = (this.handleEvent(name, ev, target!) === false);
                        }
                        if (stopPropagation || target!.hasAttribute("stopPropagation") && target!.hasAttribute("gt-false")) {
                            stopPropagation = true;
                            ev.stopPropagation();
                            delete target!.touchInfo;            
                        }
                        if (target!.hasAttribute("preventDefault") && target!.hasAttribute("gt-false")) {
                            ev.preventDefault();
                        }
                    }
                    return stopPropagation;
                });
            }
            target = target.parentElement;
        }

        // clean up
        Dom.findAll(".gt-active").forEach((el: ITouchEvenElement) => {
            el.classList.remove("gt-active");
            delete el.touchInfo;
        });
        this.longPressIntervals.list.forEach((long: number) => clearInterval(long));
        this.longPressIntervals.clear();
    }
    private executeAction(ev: MouseEvent | TouchEvent, target: ITouchEvenElement, actionAttr: string, touchInfo: ITouchInfo): any {
        let result = true;
        let action = target.getAttribute(actionAttr);
        try {
            if (action === "[fn]" && (actionAttr + "-fn") in target) {
                result = target[actionAttr + "-fn"](ev, target, touchInfo);
            } else {
                result = (new Function("event", "target", "touch", action!)).bind(target)(ev, target, touchInfo);
            }
        } catch (err) {
            throw name + " event function error on element '" + target.id + "'"
        }
        return result;
    }
    private handleEvent(name: string, ev: MouseEvent | TouchEvent, target: ITouchEvenElement) {
        let actionAttr: string = name;
        let result: boolean = true;
        if (target) {
            result = this.executeAction(ev, target, actionAttr, target.touchInfo!);
            // clear event objects
            if (name in this.upEvents) {
                target.classList.remove("gt-active");
                if(this.longPressIntervals.has(target.touchInfo!.index)) {
                    clearInterval(this.longPressIntervals.get(target.touchInfo!.index)!);
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
    public static hideKeyboard() {
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
    public static hasTouchEvent() {
        return "ontouchInfo" in document.documentElement;
    }
}
export function init(root?: HTMLElement): GoodTap {
    return new GoodTap(root);
}