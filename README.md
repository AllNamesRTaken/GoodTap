[![Build Status](https://travis-ci.org/AllNamesRTaken/GoodTap.svg?branch=master)](https://travis-ci.org/AllNamesRTaken/GoodTap)

# GoodTap
Good typescript library with to handle taps, clicks, swipes and presses dynamically without adding listeners to every element.

It supports Tap, Long Press swipe Swipe actions and has an Outside event for when you click outside a component. Events can be added as markup and requires no code to become active, or can be added programatically. 

# Installation
```
npm install goodtap --save
```
or through unpgk as iife of you want to try it in JSBin etc.
```
<script src="https://unpkg.com/goodtap"></script>
```

# Examples

```html
<script src="https://unpkg.com/goodtap"></script>

<div id="o1" class="outer">
  outer clickable
  <div id="i1" class="inner" tap="alert(this.id);">
    clickable
  </div>
  <div id="i2" class="inner">
    not clickable
  </div>
  <div id="i3" class="inner" stopPropagation tap="alert(this.id);">
    clickable stops propagation
  </div>
  <input id="t1">Normal textbox</input>
  <input id="t1" tap="return false;">Capturing textbox</input>
  <div id="m1" stopPropagation down="this.m = performance.now()" up="alert(performance.now() - this.m);">mouse down/up</div>
  <div id="i4" class="inner" stopPropagation press="console.log('PRESSED');">
    Long Press every 500ms
  </div>
  <div id="i4" class="inner" once pressInterval="300" stopPropagation press="console.log('300ms long press');">
    Long Press after 300ms, only once
  </div>
  <div id="i4" style="height: 200px" class="inner" stopPropagation swipe="alert('swipe ' + (touch.swipeInfo.direction));">
    Swipe here
  </div>
  <div id="select1" class="inner" outside="this.classList.remove('selected'); console.log(this.id + ' unselected')" stopPropagation
    tap="this.classList.add('selected'); console.log(this.id + ' selected')">
    select me
  </div>
  <div id="select2" class="inner" outside="this.classList.remove('selected'); console.log(this.id + ' unselected')" stopPropagation
    tap="this.classList.add('selected'); console.log(this.id + ' selected')">
    no, select me
  </div>
</div>
<script>
    var tap = goodtap.init();
    tap.on(document.getElementById("o1"), "tap", (event, target, touch) => alert("you tapped " + target.id));
</script>
```

# TODO
- Tests. There are none!
- Variable swipe distance per element

# Contribute
Found a bug? GREAT! Raise an issue!

When developing, please:

- Write unit tests.
- Make sure your unit tests pass
