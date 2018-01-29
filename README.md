[![Build Status](https://travis-ci.org/AllNamesRTaken/GoodTap.svg?branch=master)](https://travis-ci.org/AllNamesRTaken/GoodTap)

# GoodTap
Good typescript library with to handle taps, clicks, swipes and presses dynamically without adding listeners to every element.

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
<script src="https://unpkg.com/goodtap">
    var tap = new GoodTap();
    tap.on(document.getElementById("myElement"), "tap", (event, target, touch) => alert("you tapped " + target.id));
</script>

<div id="myOther" preventDefault stopPropagation swipe="alert('you swiped ' + touch.swipeInfo.direction + ' on ' + this.id);"> 
    Swipe here 
</div>
```

# TODO
- Tests. There are none!
- Variable swipe distance per element
- d.ts files are missing

# Contribute
Found a bug? GREAT! Raise an issue!

When developing, please:

- Write unit tests.
- Make sure your unit tests pass
