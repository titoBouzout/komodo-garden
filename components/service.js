
const EXTENSION_ID = 'tito@asynchremote';
const EXTENSION_NAME = 'Remote Places';
const CHROME_NAME = 'asynchremote';
const VERSION = '0';

const CI = Components.interfaces;
const CC = Components.classes;
const CU = Components.utils;

const SERVICE_NAME = EXTENSION_NAME + ' Service';
const SERVICE_CTRID = '@particle.universe.tito/service;1';
const SERVICE_ID = '{177d2640-75d0-11e0-a1f0-0800200c9a66}';

// interfaces implemented by this component
const SERVICE_IIDS = 
[
CI.nsIObserver,
CI.nsISupportsWeakReference
];

// categories which this component is registered in
const SERVICE_CATS = ['app-startup'];

const OS = CC['@mozilla.org/observer-service;1'].getService(CI.nsIObserverService);
const LOADER = CC['@mozilla.org/moz/jssubscript-loader;1'].getService(CI.mozIJSSubScriptLoader);
const _INCLUDED = {};

function IS_INCLUDED(name) name in _INCLUDED;

var singleton;

function INCLUDE(name) {
  if (arguments.length > 1)
    for (var j = 0, len = arguments.length; j < len; j++)
      INCLUDE(arguments[j]);
  else if (!(name in _INCLUDED)) {
    try {
      _INCLUDED[name] = true;
	  LOADER.loadSubScript('chrome://'+CHROME_NAME+'/content/js/'+ name , singleton);
    } catch(e) {
      singleton.log('INCLUDE:' + name + ':\n' + e + '\n' + (e.stack || ''));
    }
  }
}

function LAZY_INCLUDE(name) {
  if (arguments.length > 1)
    for (var j = 0, len = arguments.length; j < len; j++)
      arguments.callee(arguments[j]);
  else {
    __defineGetter__(name, function() {
      delete this[name];
      INCLUDE(name);
      return this[name];
    });
  }
}

const SERVICE_CONSTRUCTOR = function() {
  INCLUDE('_lib/_init.js');
  return singleton;
}

INCLUDE('_lib/XPCOM.js');