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
<script src="https://unpkg.com/goodtap"></script>

<div id="myOther" swipe="alert('you swiped ' + touch.swipeInfo.direction + ' on ' + this.id);"> 
    Swipe here 
</div>
<div id="presser" once press="alert('you long pressed');"> 
    Long press here 
</div>
<div id="outer"> 
    Tap here
    <div id="inner1" tap="alert('you tapped the first inner div and it will bubble');">
        Tap here
    </div>
    <div id="inner2" stopPropagation tap="alert('you tapped the second inner div and it doesnt bubble');">
        Tap here
    </div>
</div>
<script>
    var tap = goodtap.init();
    tap.on(document.getElementById("outer"), "tap", (event, target, touch) => alert("you tapped " + target.id));
</script>
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
