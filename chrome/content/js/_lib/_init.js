
var ns = singleton = {

  QueryInterface: xpcom_generateQI(SERVICE_IIDS),
  generateQI: xpcom_generateQI,
  
  init:function()
  {
	this.addObservers('profile-after-change');
	
	var os = String(Components
					  .classes['@mozilla.org/xre/app-info;1']
					  .getService(Components.interfaces.nsIXULRuntime).OS)
					  .toLowerCase();
		
	if(os.indexOf('darwin') !=-1)
	{
	  this.__NL = '\r';
	  this.__DS = '/';
	}			
	else if(os.indexOf('win') != -1)
	{
	  this.__NL = '\r\n';
	  this.__DS = '\\';
	}
	else
	{
	  this.__NL = '\n';
	  this.__DS = '/';
	}
	delete os;
  },
  
  include:function()
  {
	for (var j = 0, len = arguments.length; j < len; j++)
	  INCLUDE('_lib/'+arguments[j]);
  },
  includeShared:function()
  {
	for (var j = 0, len = arguments.length; j < len; j++)
	  INCLUDE('_shared/'+arguments[j]);
  },
  
  get window()
  {
	var wm = Components
			  .classes['@mozilla.org/appshell/window-mediator;1']  
			  .getService(Components.interfaces.nsIWindowMediator);
	var win;
	if(win = wm.getMostRecentWindow('navigator:browser'))
		return win;
	else
	  return wm.getMostRecentWindow('Komodo');
  },

  observedTopics:[],
  observersFunctions:[],
  addObservers: function(aTopic) {
	this.observedTopics[aTopic] = true;
	this.removeObservers(aTopic);
	OS.addObserver(this, aTopic, true);
  },
  removeObservers: function(aTopic) {
	try {
	  OS.removeObserver(this, aTopic);
	} catch (e) {}
  },
  addObserver:function(aTopic, aFunction)
  {
	//saving the function to call
	if(!this.observersFunctions[aTopic])
	  this.observersFunctions[aTopic] = [];
	this.observersFunctions[aTopic][this.observersFunctions[aTopic].length] = aFunction;
	//registering the observer
	if(!(aTopic in this.observedTopics))
	  this.addObservers(aTopic);
  },
  observe: function(aSubject, aTopic, aData) {
    
      switch (aTopic) {
        case 'profile-after-change':
        {
           break;
        }
        case 'quit-application-requested':
        {
		  aSubject.QueryInterface(Components.interfaces.nsISupportsPRBool);
		  
          if(this.observersFunctions[aTopic])
		  {
			for(var id in this.observersFunctions[aTopic])
			{
			  this.observersFunctions[aTopic][id](aSubject);
			}
		  }
		  break;
        }
      }
  },
  
  prefs : CC['@mozilla.org/preferences-service;1']
			  .getService(CI.nsIPrefService)
			  .QueryInterface(CI.nsIPrefBranch)
			  .getBranch('extensions.'+CHROME_NAME+'.')
			  .QueryInterface(CI.nsIPrefBranch2),
  pref: function(name, value) {
	
	const prefs = this.prefs;
	const IPC = CI.nsIPrefBranch;
	
	if(typeof(value) == 'undefined')
	{
	   switch (prefs.getPrefType(name)) {
		 case IPC.PREF_STRING:
		   return prefs.getCharPref(name);
		 case IPC.PREF_INT:
		   return prefs.getIntPref(name);
		 case IPC.PREF_BOOL:
		   return prefs.getBoolPref(name);
	   }
	}
	else
	{
	  try {
		switch (typeof(value)) {
		  case 'string':
			  prefs.setCharPref(name,value);
			  break;
		  case 'boolean':
			prefs.setBoolPref(name,value);
			break;
		  case 'number':
			prefs.setIntPref(name,value);
			break;
		  default:
			throw new Error('Unsupported type ' + typeof(value) + ' for preference ' + name);
		}
	  } catch(e) {

		switch (prefs.getPrefType(name)) {
		  case IPC.PREF_STRING:
			prefs.setCharPref(name, value);
			break;
		  case IPC.PREF_INT:
			prefs.setIntPref(name, parseInt(value));
			break;
		  case IPC.PREF_BOOL:
			prefs.setBoolPref(name, !!value && value != 'false');
			break;
		  default:
			throw new Error('Unsupported type ' + typeof(value) + ' for preference ' + name);
		}
	  }
	}
  },
  
  bind: function(f) {
    return '_bound' in f ? f._bound : f._bound = (function() { return f.apply(ns, arguments); });
  },
  
  consoleService: CC['@mozilla.org/consoleservice;1'].getService(CI.nsIConsoleService),
  reportLeaks: function() {
    // leakage detection
    var parent = '__parent__' in this ? this.__parent__ : CU.getGlobalForObject(this);
    this.log('DUMPING ' + parent);
    for(var v in parent) {
      this.log(v + ' = ' + parent[v] + '\n');
    }
  },
  log: function(msg, dump) {
	switch (typeof(msg)) {
        case 'string':
        case 'boolean':
        case 'number':
          break;
		case 'object':
		case 'function':
		  msg = msg.toSource();
          break;
		case 'undefined':
		  msg = 'undefined';
          break;
        default:
          throw new Error('Unsupported type ' + typeof(value) + ' for log');
      }
    this.consoleService.logStringMessage(EXTENSION_NAME+':'+msg);
    if (dump) this.dump(msg, true);
  },
  dump: function(msg, noConsole) {
    msg = EXTENSION_NAME+':' + msg;
    dump(msg + '\n');
    if(this.consoleLog && !noConsole) this.log(msg);
  }
}
ns.wrappedJSObject = ns;
ns.init();