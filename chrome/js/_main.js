
function AsynchRemote()
{
  this.loadExtension = function(event)
  {
	event.currentTarget.removeEventListener('load', garden.loadExtension, false);
	event.currentTarget.addEventListener('unload', garden.unloadExtension, false);
	garden.initExtension();
  }
  this.unloadExtension = function(event)
  {
	event.currentTarget.removeEventListener('unload', garden.unloadExtension, false);
	garden.uninitExtension();
  }
  this.initExtension = function()
  {
	//global singleton object
	Components.utils.import('resource://up.tito.asynchremote/_init.js', this);
	this.s.extensionID = 'tito@garden';
	this.s.extensionName = 'Garden';
	this.s.extensionChromeName = 'asynchremote';
	this.s.include('file','thread','sharedMemory','DOM','places','window','listener','application','tab','document','urls');
	this.windowID = this.s.getWindowID();
	//end global singleton object
	
	if(!myAPI.shared.garden()) {
	  this.shared = myAPI.shared.garden();
	  this.shared.include('chrome://asynchremote/content/js/shared/id.js');
	  this.shared.include('chrome://asynchremote/content/js/shared/preferences.js');
	  this.shared.include('chrome://asynchremote/content/js/shared/sessions.js');
	  this.shared.include('chrome://asynchremote/content/js/shared/forms.js');
	  this.shared.include('chrome://asynchremote/content/js/shared/variete.js');
	} else {
	  this.shared = myAPI.shared.garden();
	}
	
	this.gardenDrivers = gardenDrivers;
	this.trees = [];
	this.instances = [];
	
	for(var id in this.drivers)
	  new this.drivers[id]().driverRegister();
	  
	delete this.drivers;
	
	//when the location change some buttons are disabled/enabled
	this.s.addListener(
						{'id':this.windowID,'window':window},
						'onLocationChange',
						function(aTab){ garden.onLocationChange(aTab);}
						);
	
	//if there is some connection working on something let the user know about that before quiting the application
	myAPI.observer().add('quit-application-requested',
						function(aSubject)
						{
						  garden.onApplicationClose(aSubject);
						});
	if(
	   this.shared.pref('last.focused.groupID') != '0' &&
	   this.shared.pref('last.focused.treeID') != '0' &&
	   this.shared.pref('last.focused.path') != ''   
	)
	{
	  //this.s.dump('initExtension:switchToTree');
	  if(this.groupTreeExists(
							  this.shared.pref('last.focused.groupID'),
							  this.shared.pref('last.focused.treeID')
							  ))
	  {
		this.switchToTreeData(
							  this.shared.pref('last.focused.groupID'),
							  this.shared.pref('last.focused.treeID'),
							  this.shared.pref('last.focused.path'));
	  }
	}
  }
  this.registerDriverClass = function(aClass)
  {
	if(!this.drivers)
	  this.drivers = [];
	this.drivers[this.drivers.length] = aClass
  }

  //disable or enable the toolbarbuttons for current document
  this.onLocationChange = function(aTab)
  {
	/*
	var focusedPath = this.s.documentGetLocation(this.s.documentGetFromTab(aTab));
	var currentLocalPath 	= this.s.placesLocalCurrentPath(window);
	var server = this.focusedServer;
	if(
	   focusedPath.indexOf(currentLocalPath) !== 0 ||
	  !this.connections[server]
	)
	{
	  this.element('g-toolbar-local-upload').setAttribute('disabled', true);
	  this.element('g-toolbar-local-download').setAttribute('disabled', true);
	}
	else
	{
	  this.element('g-toolbar-local-upload').removeAttribute('disabled');
	  this.element('g-toolbar-local-download').removeAttribute('disabled');
	}*/
  }

  this.onApplicationClose = function(aSubject)
  {
	var processesRunning = 0;
	
	var groups = this.element('g-groups').childNodes;
	
	var iterations = false;
	var connected = false;
	
	for(var i=0;i<groups.length;i++)
	{
	  var trees = groups[i].childNodes;
	  var groupID = groups[i].getAttribute('groupID');
	  
	  for(var a=0;a<trees.length;a++)
	  {
		var treeID = trees[a].getAttribute('treeID');
		if(this.instances[treeID])
		{
		  processesRunning += this.instances[treeID].iterations;
		  for(var id in this.instances[treeID].processes)
		  {
			if(this.instances[treeID].processes[id].running())
			  processesRunning += this.instances[treeID].processes[id].runnables.length;
		  }
		}
	  }
	}
	
	if(processesRunning > 0 && !garden.shared.confirm('There is processes running into "Garden Extension".\n Do you still want to close the application?'))
	{
	  aSubject.data = true;
	}
	else
	{
	  this.s.folderDeleteTemporal();
	}
  }

  this.uninitExtension = function(){}

  this.element = function(aElement)
  {
	return document.getElementById(aElement);
  }
  this.dump = function(aName, aString)
  {
	myAPI.debug().dump(aName, aString);
  }
  return this;
}

var asynchRemote = new AsynchRemote();
var garden = asynchRemote;

window.addEventListener('load', garden.loadExtension, false);