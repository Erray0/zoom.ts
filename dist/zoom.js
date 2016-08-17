(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
exports.ZOOM_FUNCTION_KEY = 'data-zoom';
exports.ZOOM_IN_VALUE = 'zoom-in';
exports.ZOOM_OUT_VALUE = 'zoom-out';
/* the media in data-zoom-src="value" is loaded and displayed when the image is zoomed in */
exports.FULL_SRC_KEY = 'data-zoom-src';
/* when data-zoom-play="always" then the video will continue playing even after dismissed from zoom */
exports.PLAY_VIDEO_KEY = 'data-zoom-play';
exports.ALWAYS_PLAY_VIDEO_VALUE = 'always';

},{}],2:[function(require,module,exports){
"use strict";
exports.OVERLAY_CLASS = 'zoom-overlay';
exports.OVERLAY_OPEN_CLASS = 'zoom-overlay-open';
exports.OVERLAY_TRANSITIONING_CLASS = 'zoom-overlay-transitioning';
exports.ZOOMED_CLASS = 'zoom-media';
exports.WRAP_CLASS = 'zoom-media-wrap';

},{}],3:[function(require,module,exports){
/*!
 * http://www.quirksmode.org/js/findpos.html
 */
"use strict";
var MEMO_ATTR_KEY = 'data-offset-memo-key';
var Position = (function () {
    function Position(top, left) {
        this._top = top;
        this._left = left;
    }
    Position.from = function (element) {
        if (!element.offsetParent) {
            return Position.origin;
        }
        var key = element.getAttribute(MEMO_ATTR_KEY);
        if (key) {
            return Position.cache[key];
        }
        do {
            key = String(Math.random());
        } while (Position.cache[key]);
        element.setAttribute(MEMO_ATTR_KEY, key);
        Position.cache[key] = new Position(0, 0);
        var parent = element;
        do {
            var position = Position.cache[key];
            position._top += parent.offsetTop;
            position._left += parent.offsetLeft;
            parent = parent.offsetParent;
        } while (parent);
        return Position.cache[key];
    };
    Position.origin = new Position(0, 0);
    Position.cache = {};
    return Position;
}());
exports.Position = Position;

},{}],4:[function(require,module,exports){
"use strict";
var Attributes_1 = require('./Attributes');
var Classes_1 = require('./Classes');
var ZoomedImageElement_1 = require('./ZoomedImageElement');
var ZoomedVideoElement_1 = require('./ZoomedVideoElement');
var ESCAPE_KEY_CODE = 27;
/* pixels required to scroll vertically with a mouse/keyboard for a zoomed image to be dismissed */
var SCROLL_Y_DELTA = 70;
/* pixels required to scroll vertically with a touch screen for a zoomed image to be dismissed  */
var TOUCH_Y_DELTA = 30;
var ZoomListener = (function () {
    function ZoomListener() {
        var _this = this;
        this.scrollListener = function () {
            if (Math.abs(_this._initialScrollPosition - window.scrollY) >= SCROLL_Y_DELTA) {
                _this.close();
            }
        };
        this.clickListener = function (event) {
            event.stopPropagation();
            event.preventDefault();
            _this.close();
        };
        this.keyboardListener = function (event) {
            if (event.keyCode === ESCAPE_KEY_CODE) {
                _this.close();
            }
        };
        this.touchStartListener = function (event) {
            _this._initialTouchPosition = event.touches[0].pageY;
            event.target.addEventListener('touchmove', _this.touchMoveListener);
        };
        this.touchMoveListener = function (event) {
            if (Math.abs(event.touches[0].pageY - _this._initialTouchPosition) > TOUCH_Y_DELTA) {
                _this.close();
                event.target.removeEventListener('touchmove', _this.touchMoveListener);
            }
        };
    }
    ZoomListener.prototype.listen = function () {
        var _this = this;
        document.body.addEventListener('click', function (event) {
            var target = event.target;
            if (target.getAttribute(Attributes_1.ZOOM_FUNCTION_KEY) === Attributes_1.ZOOM_IN_VALUE) {
                _this.zoom(event);
            }
        });
    };
    ZoomListener.prototype.zoom = function (event) {
        event.stopPropagation();
        if (document.body.classList.contains(Classes_1.OVERLAY_OPEN_CLASS)) {
            return;
        }
        var target = event.target;
        if (event.metaKey || event.ctrlKey) {
            var url = target.getAttribute(Attributes_1.FULL_SRC_KEY) || target.currentSrc || target.src;
            window.open(url, '_blank');
            return;
        }
        if (target.width >= window.innerWidth) {
            return;
        }
        this.dispose();
        if (target.tagName === 'IMG' || target.tagName === 'PICTURE') {
            this._current = new ZoomedImageElement_1.ZoomedImageElement(target);
        }
        else {
            this._current = new ZoomedVideoElement_1.ZoomedVideoElement(target);
        }
        this._current.zoom();
        this.addCloseListeners();
        this._initialScrollPosition = window.scrollY;
    };
    ZoomListener.prototype.close = function () {
        if (this._current) {
            this._current.close();
            this.removeCloseListeners();
            this._current = undefined;
        }
    };
    ZoomListener.prototype.dispose = function () {
        if (this._current) {
            this._current.dispose();
            this.removeCloseListeners();
            this._current = undefined;
        }
    };
    ZoomListener.prototype.addCloseListeners = function () {
        // todo(fat): probably worth throttling this
        window.addEventListener('scroll', this.scrollListener);
        document.addEventListener('click', this.clickListener);
        document.addEventListener('keyup', this.keyboardListener);
        document.addEventListener('touchstart', this.touchStartListener);
    };
    ZoomListener.prototype.removeCloseListeners = function () {
        window.removeEventListener('scroll', this.scrollListener);
        document.removeEventListener('click', this.clickListener);
        document.removeEventListener('keyup', this.keyboardListener);
        document.removeEventListener('touchstart', this.touchStartListener);
    };
    return ZoomListener;
}());
exports.ZoomListener = ZoomListener;

},{"./Attributes":1,"./Classes":2,"./ZoomedImageElement":6,"./ZoomedVideoElement":7}],5:[function(require,module,exports){
"use strict";
var Attributes_1 = require('./Attributes');
var Classes_1 = require('./Classes');
var Position_1 = require('./Position');
var ZoomedElement = (function () {
    function ZoomedElement(element) {
        var _this = this;
        this.disposeListener = function () {
            _this.dispose();
        };
        this._element = element;
    }
    ZoomedElement.transformStyle = function (element, style) {
        element.style.webkitTransform = style;
        element.style.transform = style;
    };
    ZoomedElement.prototype.zoom = function () {
        var element = this._element;
        var src = element.getAttribute(Attributes_1.FULL_SRC_KEY) || element.currentSrc || element.src;
        this.zoomedIn(src);
        element.src = src;
    };
    ZoomedElement.prototype.close = function () {
        document.body.classList.remove(Classes_1.OVERLAY_OPEN_CLASS);
        document.body.classList.add(Classes_1.OVERLAY_TRANSITIONING_CLASS);
        ZoomedElement.transformStyle(this._element, '');
        ZoomedElement.transformStyle(this._wrap, '');
        if ('transition' in document.body.style) {
            var element = this._element;
            element.addEventListener('transitionend', this.disposeListener);
            element.addEventListener('webkitTransitionEnd', this.disposeListener);
        }
        else {
            this.dispose();
        }
    };
    ZoomedElement.prototype.dispose = function () {
        this._element.removeEventListener('transitioned', this.disposeListener);
        this._element.removeEventListener('webkitTransitionEnd', this.disposeListener);
        if (this._wrap && this._wrap.parentNode) {
            this._element.classList.remove(Classes_1.ZOOMED_CLASS);
            this._element.style.width = '';
            this._element.setAttribute(Attributes_1.ZOOM_FUNCTION_KEY, Attributes_1.ZOOM_IN_VALUE);
            this._clone.parentNode.replaceChild(this._element, this._clone);
            this._wrap.parentNode.removeChild(this._wrap);
            this._overlay.parentNode.removeChild(this._overlay);
            document.body.classList.remove(Classes_1.OVERLAY_TRANSITIONING_CLASS);
            this.disposed();
        }
    };
    ZoomedElement.prototype.zoomOriginal = function (width, height) {
        this._wrap = document.createElement('div');
        this._wrap.className = Classes_1.WRAP_CLASS;
        this._wrap.style.position = 'absolute';
        var position = Position_1.Position.from(this._element);
        this._wrap.style.top = position._top + 'px';
        this._wrap.style.left = position._left + 'px';
        this._clone = this._element.cloneNode();
        this._clone.style.visibility = 'hidden';
        this._element.style.width = this._element.offsetWidth + 'px';
        this._element.parentNode.replaceChild(this._clone, this._element);
        document.body.appendChild(this._wrap);
        this._wrap.appendChild(this._element);
        this._element.classList.add(Classes_1.ZOOMED_CLASS);
        this._element.setAttribute(Attributes_1.ZOOM_FUNCTION_KEY, Attributes_1.ZOOM_OUT_VALUE);
        this._overlay = document.createElement('div');
        this._overlay.className = Classes_1.OVERLAY_CLASS;
        document.body.appendChild(this._overlay);
        ZoomedElement.transformStyle(this._element, this.scale(width, height));
        ZoomedElement.transformStyle(this._wrap, this.translate());
        document.body.classList.add(Classes_1.OVERLAY_OPEN_CLASS);
    };
    ZoomedElement.prototype.repaint = function () {
        /* tslint:disable */
        this._element.offsetWidth;
        /* tslint:enable */
    };
    ZoomedElement.prototype.scale = function (width, height) {
        this.repaint();
        var maxFactor = width / this.width();
        var aspectRatio = width / height;
        var viewportWidth = window.innerWidth;
        var viewportHeight = window.innerHeight;
        var viewportAspectRatio = viewportWidth / viewportHeight;
        var factor;
        if (width < viewportWidth && height < viewportHeight) {
            factor = maxFactor;
        }
        else if (aspectRatio < viewportAspectRatio) {
            factor = (viewportHeight / height) * maxFactor;
        }
        else {
            factor = (viewportWidth / width) * maxFactor;
        }
        return 'scale(' + factor + ')';
    };
    ZoomedElement.prototype.translate = function () {
        this.repaint();
        var viewportX = window.innerWidth / 2;
        var viewportY = window.scrollY + (window.innerHeight / 2);
        var position = Position_1.Position.from(this._element);
        var mediaCenterX = position._left + ((this._element.width || this._element.offsetWidth) / 2);
        var mediaCenterY = position._top + ((this._element.height || this._element.offsetHeight) / 2);
        var translateX = Math.round(viewportX - mediaCenterX);
        var translateY = Math.round(viewportY - mediaCenterY);
        return 'translate(' + translateX + 'px, ' + translateY + 'px) translateZ(0)';
    };
    return ZoomedElement;
}());
exports.ZoomedElement = ZoomedElement;

},{"./Attributes":1,"./Classes":2,"./Position":3}],6:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Attributes_1 = require('./Attributes');
var ZoomedElement_1 = require('./ZoomedElement');
var ZoomedImageElement = (function (_super) {
    __extends(ZoomedImageElement, _super);
    function ZoomedImageElement() {
        _super.apply(this, arguments);
    }
    ZoomedImageElement.prototype.zoomedIn = function (src) {
        var _this = this;
        var image = document.createElement('img');
        image.onload = function () {
            _this.zoomOriginal(image.width, image.height);
            _this._element.removeAttribute(Attributes_1.FULL_SRC_KEY);
        };
        image.src = src;
    };
    ZoomedImageElement.prototype.disposed = function () {
        /* empty */
    };
    ZoomedImageElement.prototype.width = function () {
        return this._element.width;
    };
    return ZoomedImageElement;
}(ZoomedElement_1.ZoomedElement));
exports.ZoomedImageElement = ZoomedImageElement;

},{"./Attributes":1,"./ZoomedElement":5}],7:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Attributes_1 = require('./Attributes');
var ZoomedElement_1 = require('./ZoomedElement');
var ZoomedVideoElement = (function (_super) {
    __extends(ZoomedVideoElement, _super);
    function ZoomedVideoElement() {
        _super.apply(this, arguments);
    }
    ZoomedVideoElement.prototype.zoomedIn = function (src) {
        var _this = this;
        var video = document.createElement('video');
        var source = document.createElement('source');
        video.appendChild(source);
        video.addEventListener('canplay', function () {
            _this.zoomOriginal(video.videoWidth, video.videoHeight);
            _this._element.play();
        });
        source.src = src;
    };
    ZoomedVideoElement.prototype.disposed = function () {
        var video = this._element;
        if (this._element.getAttribute(Attributes_1.PLAY_VIDEO_KEY) === Attributes_1.ALWAYS_PLAY_VIDEO_VALUE) {
            video.play();
        }
    };
    ZoomedVideoElement.prototype.width = function () {
        return this._element.width || this._element.videoWidth;
    };
    return ZoomedVideoElement;
}(ZoomedElement_1.ZoomedElement));
exports.ZoomedVideoElement = ZoomedVideoElement;

},{"./Attributes":1,"./ZoomedElement":5}],8:[function(require,module,exports){
"use strict";
var ZoomListener_1 = require('./ZoomListener');
new ZoomListener_1.ZoomListener().listen();

},{"./ZoomListener":4}]},{},[8]);