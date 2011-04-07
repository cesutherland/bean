/*!
  * event.js - copyright @dedfat
  * https://github.com/fat/bean
  * Follow our software http://twitter.com/dedfat
  * MIT License
  */
//smooshing mootools eventy stuff and dean edwards eventy stuff
!function (context) {

  var _uid = 1,
      overOut = /over|out/;

  function isDescendant(parent, child) {
    var node = child.parentNode;
    while (node != null) {
      if (node == parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  function retrieveEvents(element) {
    return (element._events = element._events) || {};
  }

  function retrieveUid(handler) {
    return (handler._uid = handler._uid) || _uid++;
  }

  function addNativeListener(element, type, fn) {
    if (element.addEventListener) {
      element.addEventListener(type, fn, false);
    } else {
      element.attachEvent('on' + type, fn);
    }
  }

  function removeNativeListener(element, type, fn) {
    if (element.removeEventListener) {
      element.removeEventListener(type, fn, false);
    } else {
      element.detachEvent('on' + type, fn);
    }
  }

  function fireNativeEvent(element, type) {
    var evt;
    if (document.createEventObject) {
      evt = document.createEventObject();
      return element.fireEvent('on' + type, evt);
    }
    else {
      evt = document.createEvent("HTMLEvents");
      evt.initEvent(type, true, true);
      return !element.dispatchEvent(evt);
    }
  }

  function nativeHandler(element, fn) {
    return function (event) {
      event = event || fixEvent(((this.ownerDocument || this.document || this).parentWindow || window).event);
      if (fn.call(element, event) === false) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
  }

  function addCustomListener(element, type, fn) {
    if (element.addEventListener) {
      element.addEventListener(type, fn, false);
    } else {
      element['_on' + type] = 0;
      element.attachEvent("onpropertychange", function (event) {
        if (event.propertyName == '_on' + type) {
          fn.apply(element, arguments);
        }
      });
    }
  }

  function removeCustomListener(element, type, fn) {
    if (element.addEventListener) {
      element.removeEventListener(type, fn, false);
    } else {
      element.detachEvent("onpropertychange", fn);
    }
  }

  function fireCustomEvent(element, type) {
    if (element.addEventListener) {
      var customeEvent = document.createEvent("UIEvents");
      customeEvent.initEvent(type, false, false);
      element.dispatchEvent(fakeEvent);
    } else {
      element['_on' + type]++;
    }
  }

  function customHandler(custom, fn) {
    return function (event) {
      if (custom.condition.call(this, event)) {
        return fn.call(this, event);
      }
      return true;
    };
  }

  function addEvent(element, type, fn) {
    var events = retrieveEvents(element),
        handlers = events[type];
    if (!handlers) {
      handlers = events[type] = {};
      if (element["on" + type]) {
        handlers[0] = element["on" + type];
      }
    }
    var uid = retrieveUid(fn);
    if (handlers[uid]) {
      return element;
    }
    var custom = customEvents[type];
    if (custom) {
      if (custom.condition) {
        fn = customHandler(custom, fn);
      }
      type = custom.base || type;
    }
    if (nativeEvents.indexOf(type) != -1) {
      fn = nativeHandler(element, fn);
      addNativeListener(element, type, fn);
    } else {
      addCustomListener(element, type, fn);
    }
    handlers[uid] = fn;
    fn._uid = uid;
    return element;
  }

  function addEvents(element, events, fn) {
    if (typeof events == 'object') {
      for (var type in events) {
        if (events.hasOwnProperty(type)) {
          addEvent(element, type, events[type]);
        }
      }
    } else {
      addEvent(element, events, fn);
    }
    return element;
  }

  function removeEvent(element, type, handler) {
    var events = retrieveEvents(element);
    if (!events || !events[type]) {
      return element;
    }
    delete events[type][handler._uid];
    if (customEvents[type] && !nativeEvents[customEvents[type].base]) {
      removeCustomListener(element, type, handler, arguments[3]);
    } else {
      removeNativeListener(element, type, handler, arguments[3]);
    }
    return element;
  }

  function removeEvents(element, events, fn) {
    var type, uid, attached, typeEvents, event;
    if (typeof events == 'object') {
      for (event in events) {
        if (events.hasOwnProperty(event)) {
          removeEvent(element, event, events[event]);
        }
      }
      return element;
    }
    attached = retrieveEvents(element);
    if (!attached) {
      return element;
    }
    if (!events) {
      for (type in attached) {
        removeEvents(element, type);
      }
      attached = null;
    } else if (attached[events]) {
      if (fn) {
        removeEvent(element, events, fn);
      } else {
        typeEvents = attached[events];
        for (uid in typeEvents) {
          removeEvent(element, events, typeEvents[uid]);
        }
        delete attached[events];
      }
    }
    return element;
  }

  function fireEvent(element, type, args) {
    if (customEvents[type]) {
      fireCustomEvent(element, type, args);
    } else {
      fireNativeEvent(element, type);
    }
  }

  function cloneEvents(element, from, type) {
    var events = retrieveEvents(from), eventType, typeEvents, k;
    if (!events) {
      return element;
    }
    if (!type) {
      for (eventType in events) {
        cloneEvents(element, from, eventType);
      }
    } else if (events[type]) {
      typeEvents = events[type];
      for (k in typeEvents) {
        addEvent(element, type, typeEvents[k]);
      }
    }
    return element;
  }

  function fixEvent(e) {
    var type = e.type;
    e = e || {};
    e.preventDefault = fixEvent.preventDefault;
    e.stopPropagation = fixEvent.stopPropagation;
    e.target = e.target || e.srcElement;
    if (e.target.nodeType == 3) {
      e.target = e.target.parentNode;
    }
    if (type.indexOf('key') != -1) {
      if (e.which) {
        e.keyCode = e.which;
      }
    } else if ((/click|mouse|menu/i).test(type)) {
      e.rightClick = (e.which == 3) || (e.button == 2);
      e.pos = { x: 0, y: 0 };
      if (e.pageX || e.pageY) {
        e.pos.x = e.pageX;
        e.pos.y = e.pageY;
      } else if (e.clientX || e.clientY) {
        e.pos.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        e.pos.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      }
      if ((overOut).test(type)) {
        e.relatedTarget = e.relatedTarget || e[(type == 'mouseover' ? 'from' : 'to') + 'Element'];
      }
    }
  }
  fixEvent.preventDefault = function () {
    this.returnValue = false;
  };
  fixEvent.stopPropagation = function () {
    this.cancelBubble = true;
  };

  var nativeEvents = [ 'click', 'dblclick', 'mouseup', 'mousedown', 'contextmenu', //mouse buttons
    'mousewheel', 'DOMMouseScroll', //mouse wheel
    'mouseover', 'mouseout', 'mousemove', 'selectstart', 'selectend', //mouse movement
    'keydown', 'keypress', 'keyup', //keyboard
    'orientationchange', // mobile
    'touchstart', 'touchmove', 'touchend', 'touchcancel', // touch
    'gesturestart', 'gesturechange', 'gestureend', // gesture
    'focus', 'blur', 'change', 'reset', 'select', 'submit', //form elements
    'load', 'unload', 'beforeunload', 'resize', 'move', 'DOMContentLoaded', 'readystatechange', //window
    'error', 'abort', 'scroll' //misc
  ];

  function check(event) {
    var related = event.relatedTarget;
    if (related == null) {
      return true;
    }
    if (!related) {
      return false;
    }
    return (related != this && related.prefix != 'xul' && !/document/.test(this.toString()) && !isDescendant(this, related));
  }

  var customEvents = {
    mouseenter: {
      base: 'mouseover',
      condition: check
    },
    mouseleave: {
      base: 'mouseout',
      condition: check
    },
    mousewheel: {
      base: (navigator.userAgent.indexOf("Firefox") != -1) ? 'DOMMouseScroll' : 'mousewheel'
    }
  };

  var evnt = {
    add: addEvents,
    remove: removeEvents,
    clone: cloneEvents,
    fire: fireEvent
  };

  var oldEvnt = context.evnt;
  evnt.noConflict = function () {
    context.evnt = oldEvnt;
    return this;
  };
  context.evnt = evnt;

}(this);