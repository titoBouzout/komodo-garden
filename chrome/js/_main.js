
function AsynchRemote()
{
  this.loadExtension = function(event)
  {
	event.currentTarget.removeEventListener('load', asynchRemote.loadExtension, false);
	
	asynchRemote.initExtension();
  }
  this.unloadExtension = function(event)
  {
	event.currentTarget.removeEventListener('unload', asynchRemote.unloadExtension, false);
	
	asynchRemote.uninitExtension();
  }
  
  this.initExtension = function()
  {
	this.debug = true;
	
	this.atomService = Components.classes["@mozilla.org/atom-service;1"]
						.getService(Components.interfaces.nsIAtomService);

	this.iconDirectoryOpen = this.atomService.getAtom("asynchremote_folder_open");
	this.iconDirectoryClosed = this.atomService.getAtom("asynchremote_folder_closed");
	this.iconFile = this.atomService.getAtom("asynchremote_file");
	this.iconBusy = this.atomService.getAtom("asynchremote_busy");
	
	this.mRCService = Components
						  .classes["@activestate.com/koRemoteConnectionService;1"]
						  .getService(
									  Components
										.interfaces
										.koIRemoteConnectionService
									  );

	this.servers = [];
	this.connections = [];
	this.trees = [];

	//global singleton object
	Components.utils.import('resource://up.tito.asynchremote/_init.js', this);
	this.s.extensionID = 'tito@asynchremote';
	this.s.extensionName = 'Asynch Remote';
	this.s.extensionChromeName = 'asynchremote';
	this.s.include('observer','preference','file','history','string','thread','serialize','sharedMemory','DOM','prompt','process','search','search','places','window','listener','application','tab','document');
	this.s.includeShared('prompt', 'variete');
	this.windowID = this.s.getWindowID();
	//end global singleton object
	
	//listeners
	this.s.addListener(
						{'id':this.windowID,'window':window},
						'onLocationChange',
						function(aTab){ asynchRemote.onLocationChange(aTab);}
						);
	this.s.addObserver('quit-application-requested',
						function(aSubject)
						{
						  asynchRemote.onApplicationClose(aSubject);
						});
	this.element('places-files-popup')
		  .addEventListener('popupshowing',
							function(event)
							{
							  asynchRemote.placesLocalContextPopupShowing(event);
							}, false);
  }
  
  //look for the tree and switch to that tree, create the tree if no exists
  this.switchToServer = function(anElement)
  {
	if(!anElement.hasAttribute('server'))
	  return;
	var server = anElement.getAttribute('server');
	var trees = this.element('asynchremote-trees').childNodes;
	//hide other trees, show ( if loaded ) selected tree
	var foundTree = false;
	for(var id =0;id<trees.length;id++)
	{
	  if(trees[id].hasAttribute('server'))
	  {
		if(trees[id].getAttribute('server') == server)
		{
		  trees[id].setAttribute('collapsed', false);
		  foundTree = true;
		}
		else
		  trees[id].setAttribute('collapsed', true);
	  }
	}
	if(this.element('asynchremote-box').getAttribute('collapsed') == 'true')
	{
	  this.element('asynchremote-box').setAttribute('collapsed', 'false');
	  this.element('asynchremote-box-splitter').setAttribute('collapsed', 'false');
	}
	//create tree if no exists
	if(!foundTree)
	{
	  var tree = this.element('asynchremote-tree').cloneNode(true);
		  tree.setAttribute('server', server);
		  tree.setAttribute('id', 'asynchremote-tree-'+server);
		  tree.setAttribute('collapsed', 'false');
	  
	  this.element('asynchremote-trees').appendChild(tree);
	
	  //view
	  this.trees[server] = new AsynchRemoteTree(server);
	  tree.treeBoxObject.view = this.trees[server];
	  tree.asynchTree = this.trees[server];
	  //connection
	  this.connections[server] = new AsynchRemoteConnection(server);
	  if(!this.s.serializedSessionExists(server))
		this.placesRemoteChangeTreeBase(server, this.servers[server].path);
	  else
		this.placesRemoteChangeTreeBase(server, this.connections[server].cache.currentPath);
	}
	
	this.focusedServer = server;
	
	this.placesRemoteToolbarUpdate(server);
	this.onLocationChange(this.s.tabGetFocused(window));
  }
  
/*
  the asynchremote places toolbarbutton and menupopup
*/

  //builds the menupopup with the menuitems to select a server
  this.placesLocalToolbarServersToolbarbuttonPopupShowing = function()
  {
	var menupopup = this.element('asynchremote-places-toolbar-button-menupopup');
	this.s.removeChilds(menupopup);
	this.servers = [];
	var servers = this.mRCService.getServerInfoList({});
	var server;
	for(var id in servers)
	{
	  server = servers[id].alias;
	  //append the info
	  this.servers[server] = servers[id];
	  var menuitem = document.createElement('menuitem');
		  menuitem.setAttribute('label', servers[id].alias);
		  menuitem.setAttribute('server', servers[id].alias);
		  menuitem.setAttribute('class', 'menuitem-iconic asynchremote-connection');
		  
		//playing with icons
		menuitem.removeAttribute('connected');	 
		menuitem.removeAttribute('connecting');	 
		
		//check if we are connected
		if(this.connections[server] && this.connections[server].connected)
		  menuitem.setAttribute('connected', true);

		//check if the connection is loading
		if(this.connections[server] && this.connections[server].connecting)
		  menuitem.setAttribute('connecting', true);

		menupopup.insertBefore(menuitem, menupopup.firstChild);
	}
  }
  
  /*
	when the local places tree popup is going to be show
  */
  this.placesLocalContextPopupShowing = function(event)
  {
	var server = this.focusedServer;
	if(!this.connections[server])
	{
	  this.element('asynchremote-context-local-download-upload-separator').setAttribute('hidden', true);
	  this.element('asynchremote-context-local-upload').setAttribute('hidden', true);
	  this.element('asynchremote-context-local-download').setAttribute('hidden', true);
	  this.element('asynchremote-context-local-download-to-folder').setAttribute('hidden', true);
	  this.element('asynchremote-context-local-locate').setAttribute('hidden', true);
	}
	else
	{
	  this.element('asynchremote-context-local-download-upload-separator').setAttribute('hidden', false);
	  this.element('asynchremote-context-local-upload').setAttribute('hidden', false);
	  this.element('asynchremote-context-local-download').setAttribute('hidden', false);
	  this.element('asynchremote-context-local-download-to-folder').setAttribute('hidden', false);
	  this.element('asynchremote-context-local-locate').setAttribute('hidden', false);
	  
	  if(this.s.placesLocalGetSelectedPaths(window).length > 1)
	  {
		this.element('asynchremote-context-local-upload').setAttribute('multiple', true);
		this.element('asynchremote-context-local-download').setAttribute('multiple', true);
	  }
	  else
	  {
		this.element('asynchremote-context-local-upload').removeAttribute('multiple');
		this.element('asynchremote-context-local-download').removeAttribute('multiple');
	  }
	}
	this.element('asynchremote-context-local-locate').setAttribute('disabled', true);
  }

/*
 the asynchremote tree context menu
*/

  //disable or enable the tree context menu menuitems depending of the selected items of tree
  this.placesRemoteContextPopupShowing = function(anElement, aEvent)
  {
	var server = this.focusedServer;
	
	//init selection properties
	var multiple = false, file = false, folder = false, root = false;
	if(document.popupNode && document.popupNode == this.element('asynchremote-nav'))//clicked root button..
	{
	  folder = true;
	  root = true;
	}
	else
	{
	  //get tree selection and properties
	  var selectedItems = this.trees[server].selectionSelectedItems;

	  if(selectedItems.length > 1)
		multiple = true;
	  else if(selectedItems.length < 1)//if no selection hide the popup
		return false;
	  for(var id in selectedItems)
	  {
		if(selectedItems[id].isDirectory)
		  folder = true;
		else
		  file = true;
	  }
	}
	//update the context menu
	var items = anElement.childNodes;
	for(var id =0;id<items.length;id++)
	{
	  var item = items[id];
	  if(item.hasAttribute('testDisableIf'))
	  {
		if(folder && item.getAttribute('testDisableIf').indexOf('folder') != -1)
		  item.setAttribute('disabled', true);
		else if(file && item.getAttribute('testDisableIf').indexOf('file') != -1)
		  item.setAttribute('disabled', true);
		else if(multiple && item.getAttribute('testDisableIf').indexOf('multiple') != -1)
		  item.setAttribute('disabled', true);
		else if(root && item.getAttribute('testDisableIf').indexOf('root') != -1)
		  item.setAttribute('disabled', true);
		else
		  item.removeAttribute('disabled');
	  }
	}
	if(multiple)
	{
	  this.element('asynchremote-context-upload').setAttribute('multiple', true);
	  this.element('asynchremote-context-download').setAttribute('multiple', true);
	}
	else
	{
	  this.element('asynchremote-context-upload').removeAttribute('multiple');
	  this.element('asynchremote-context-download').removeAttribute('multiple');
	}
	return true;
  }
  
  this.placesRemoteToolbarProcessListToolbarbuttonPopupShowing = function()
  {
	var server = this.focusedServer;
	var menupopup = this.element('asynchremote-process-list-popup');
	this.s.removeChilds(menupopup);
	
	if(this.connections[server].connected && !this.connections[server].closing)
	  menupopup.firstChild.removeAttribute('disabled');
	else
	  menupopup.firstChild.setAttribute('disabled', true);

	if(this.connections[server].closing)
	{
	}
	else
	{
	  for(var id in this.connections[server].processes)
	  {
		var process = this.connections[server].processes[id];
  
		var menuitem = document.createElement('menuitem');
			menuitem.setAttribute('label', '['+process.id+'] '+process.name);
			menuitem.setAttribute('class', 'menuitem-iconic asynchremote-processes');
			menuitem.setAttribute('running', process.running());
			menuitem.setAttribute('completed', process.completed());
			menuitem.setAttribute('paused', process.paused());
			menuitem.setAttribute('aborted', process.aborted());
			menuitem.setAttribute('process', id);
			menuitem.setAttribute('oncommand', "asynchRemote.placesRemoteToolbarProcessListToolbarbuttonCommand(this)");
			if(process.running())
			  menuitem.setAttribute('tooltiptext', 'Process is currenlty running, click to pause');
			else if(process.completed())
			  menuitem.setAttribute('tooltiptext', 'Process completed, click to re-run');
			else if(process.paused())
			  menuitem.setAttribute('tooltiptext', 'Process paused, click to continue');
			else if(process.aborted())
			  menuitem.setAttribute('tooltiptext', 'Process aborted, click to continue');
		  menupopup.appendChild(menuitem);
	  }
	}
  }
  this.placesRemoteToolbarProcessListToolbarbuttonCommand = function(aElement)
  {
	var server = this.focusedServer;
	var process = aElement.getAttribute('process');
	
	var aProcess = this.connections[server].processes[process];
	
	if(aElement.getAttribute('running') == 'true')
	{
	  aProcess.paused(true);
	  this.connections[server].log('status', 'Process '+aProcess.name+' will pause on next iteration', aProcess.id);
	}
	else if(aElement.getAttribute('completed') == 'true')
	{
	  this.connections[server].log('status', 'Process '+aProcess.name+' was restarted by user', aProcess.id);

	  aProcess.restart();
	  var AsynchRemoteConnection = this.connections[server];
		  asynchRemote.s.runThread(function(){
											  AsynchRemoteConnection.processController(aProcess);
											}, AsynchRemoteConnection.thread);
	}
	else if(
			aElement.getAttribute('paused') == 'true' ||
			aElement.getAttribute('aborted') == 'true'
	)
	{
	  this.connections[server].log('status', 'Process '+aProcess.name+' will continue', aProcess.id);
	  aProcess.continue();
	  var AsynchRemoteConnection = this.connections[server];
		  asynchRemote.s.runThread(function(){
											  AsynchRemoteConnection.processController(aProcess);
											}, AsynchRemoteConnection.thread);
	}
  }
  this.placesRemoteToolbarToolsToolbarbuttonPopupShowing = function()
  {
	var aBase = this.connections[this.focusedServer].cache.currentPath;
	//can go up
	if(aBase != '' && aBase != '/')
	  this.element('asynchremote-tools-toolbarbutton-go-up').removeAttribute('disabled');
	else
	  this.element('asynchremote-tools-toolbarbutton-go-up').setAttribute('disabled', 'true');
	  
	//upload.and.rename
	if(this.s.pref('upload.and.rename'))
	  this.element('asynchremote-tools-toolbarbutton-upload-and-rename').setAttribute('checked', 'true');
	else
	  this.element('asynchremote-tools-toolbarbutton-upload-and-rename').setAttribute('checked', 'false');
  }

  /*rebase tree to folder*/
  this.placesRemoteChangeTreeBase = function(server, aBase)
  {
	aBase = '/'+(aBase.replace(/^\/+/, '').replace(/\/+$/, ''));
	
	if(aBase != this.connections[server].cache.currentPath)
	{
	  this.connections[server].cache.currentPath = aBase;
	  
	  this.placesRemoteToolbarUpdate(server);
	  
	  this.trees[server].resetSoft();
	  this.connections[server].directoryListing(0, aBase);
	}
  }
  /*update tree toolbar*/
  this.placesRemoteToolbarUpdate = function(server)
  {
	var aBase = this.connections[server].cache.currentPath;
	
	//update breadcrumb
	this.element('asynchremote-nav').setAttribute('label', (aBase.split('/').pop() || server));
	this.element('asynchremote-nav').setAttribute('tooltiptext', aBase);
	
	//update connection status
	this.element('asynchremote-nav').removeAttribute('connected');
	this.element('asynchremote-nav').removeAttribute('connecting');
	//we are connected
	if(this.connections[server] && this.connections[server].connected)
	  this.element('asynchremote-nav').setAttribute('connected', 'true');
	//the connection is loading
	if(this.connections[server] && this.connections[server].connecting)
	  this.element('asynchremote-nav').setAttribute('connecting', 'true');
		
	//back forward buttons
	if(this.trees[server].history.canGoBack())
	  this.element('asynchremote-toolbarbutton-back').removeAttribute('disabled');
	else
	  this.element('asynchremote-toolbarbutton-back').setAttribute('disabled', 'true');  
	if(this.trees[server].history.canGoForward())
	  this.element('asynchremote-toolbarbutton-forward').removeAttribute('disabled');
	else
	  this.element('asynchremote-toolbarbutton-forward').setAttribute('disabled', 'true');
	
	//can go up
	if(aBase != '' && aBase != '/')
	  this.element('asynchremote-toolbarbutton-go-up').removeAttribute('disabled');
	else
	  this.element('asynchremote-toolbarbutton-go-up').setAttribute('disabled', 'true');
	  
	var countErrors = document.getAnonymousElementByAttribute(this.element('asynchremote-log'), 'anonid', 'errors');
	if(this.connections[server].errorCount > 0)
	{
	  countErrors.setAttribute('value', this.connections[server].errorCount);
	  countErrors.setAttribute('hidden', false);
	}
	else
	  countErrors.setAttribute('hidden', true);
	  
	var countProcesses = document.getAnonymousElementByAttribute(this.element('asynchremote-log'), 'anonid', 'queue');
	var count = this.connections[server].connecting;
	for(var id in this.connections[server].processes)
	{
	  if(this.connections[server].processes[id].running())
		count += this.connections[server].processes[id].runnables.length;
	}
	if(count > 0)
	{
	  countProcesses.setAttribute('value', count);
	  countProcesses.setAttribute('hidden', false);
	}
	else
	  countProcesses.setAttribute('hidden', true);
	  
	//update icons on toolbarbutton menuitems but only if it is opened
	if(this.element('asynchremote-places-toolbar-button-menupopup').state == 'open')
	  this.placesLocalToolbarServersToolbarbuttonPopupShowing();
  }
  this.placesRemotePanelSetOptions = function()
  {
	this.s.pref('log.show.progress', this.element('asynchremote-toolbar-panel-show-progress').checked);
	this.s.pref('log.show.warning', this.element('asynchremote-toolbar-panel-show-warning').checked);
	this.s.pref('log.show.error', this.element('asynchremote-toolbar-panel-show-error').checked);
	this.s.pref('log.show.sucess', this.element('asynchremote-toolbar-panel-show-sucess').checked);
	this.actionFromRemote('log-update-if-opened');
  }
  this.placesRemotePanelClearLog = function()
  {
	this.connections[this.focusedServer].logs = [];
	this.actionFromRemote('log-update-if-opened');
  }
  //the action when clicking a menuitem from "places local context menu"
  this.actionFromLocal = function(action, aboutFocusedTab)
  {
	var server = this.focusedServer;
	if(!server || !action || server == '' || action == '')
	  return false;
	
	//selection
  	var selectedItems = this.s.placesLocalGetSelectedPaths(window, aboutFocusedTab);
	
	var selectedPath = selectedItems[0];//the very first path on the selection
	
	//vars
	var currentRemotePath = this.connections[server].cache.currentPath
	var currentLocalPath 	= this.s.placesLocalCurrentPath(window);
	var tree = this.trees[server];
	
	switch(action)
	{
	  case 'download':
		{
		  var aProcess = false;//group the processes into one process object
		  for(var id in selectedItems)
		  {
			var file = this.s.getRemotePathFromLocalPath(
														 currentRemotePath,
														 currentLocalPath,
														 selectedItems[id])
			
			if(this.s.pathIsFolder(selectedItems[id]))
			{
			  aProcess = this.connections[server]
					.downloadDirectory(
								  file,
								  currentRemotePath,
								  currentLocalPath,
								  aProcess
								  );
			}
			else
			{
			  aProcess = this.connections[server].downloadFile(
											file,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
		  }
		  break;
		}
	  case 'download-to-folder':
		{
		  var f = ko.filepicker.getFolder(null, 'Download selected items to…');
		  if(f && f != '')
		  {
			var aProcess = false;//group the processes into one process object
			for(var id in selectedItems)
			{
			  var file = this.s.getRemotePathFromLocalPath(
														   currentRemotePath,
														   currentLocalPath,
														   selectedItems[id])

			  if(this.s.pathIsFolder(selectedItems[id]))
			  {
				aProcess = this.connections[server]
					  .downloadDirectory(
									file,
									currentRemotePath,
									f,
									aProcess
									);
			  }
			  else
			  {
				aProcess = this.connections[server].downloadFile(
											  file,
											  currentRemotePath,
											  f,
											  aProcess
											  );
			  }
			}
		  }
		  break;
		}
	  case 'upload':
		{
		  var aProcess = false;//group the processes into one process object
		  for(var id in selectedItems)
		  {
			var file = this.s.getRemotePathFromLocalPath(
														 currentRemotePath,
														 currentLocalPath,
														 selectedItems[id])

			if(this.s.pathIsFolder(selectedItems[id]))
			{
			   aProcess = this.connections[server].uploadDirectory(
											file,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
			else
			{
			   aProcess = this.connections[server].uploadFile(
											file,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
		  }
		  break;
		}
	}
	this.placesRemoteToolbarUpdate(server);
  }
  //the action when clicking a menuitem from "places remote context menu"
  this.actionFromRemote = function(action)
  {
	var server = this.focusedServer;
	if(!server || !action || server == '' || action == '')
	  return false;
	
	//context on root button
  	if(document.popupNode && document.popupNode == this.element('asynchremote-nav'))
	{
	  //simulate tree selection and properties
	  var selectedItems = [];
		  selectedItems[0] = {};
		  selectedItems[0].getFilepath = this.connections[server].cache.currentPath;
		  selectedItems[0].isDirectory = true;
		  
	  var selectedPaths = [];
	  for(var id in selectedItems)
		selectedPaths[selectedPaths.length] = selectedItems[id].getFilepath;
	  var selectedPath = selectedPaths[0];//the very first path on the selection
	  var selectedItem = selectedItems[0];//the very first item on the selection
	}
	else
	{
	  //get tree selection and properties
	  var selectedItems = this.trees[server].selectionSelectedItems;
	  var selectedPaths = [];
	  for(var id in selectedItems)
		selectedPaths[selectedPaths.length] = selectedItems[id].getFilepath;
	  var selectedPath = selectedPaths[0];//the very first path on the selection
	  var selectedItem = selectedItems[0];//the very first item on the selection
	}
	
	var currentRemotePath 	= this.connections[server].cache.currentPath
	var currentLocalPath 	= this.s.placesLocalCurrentPath(window);
	var tree = this.trees[server];
	
	switch(action)
	{
	  case 'rebase':
		{
		  if(!selectedItem.isDirectory)
		  {
			var selectedPath = selectedPath.split('/');
				selectedPath.pop();
				selectedPath = selectedPath.join('/');
		  }
		  tree.history.change(currentRemotePath);
		  this.placesRemoteChangeTreeBase(server, selectedPath);
		  
		  break;
		}
  	  case 'go-up':
		{
		  var parentPath = currentRemotePath.split('/');
			  parentPath.pop();
			  parentPath = parentPath.join('/');
		  
		  if(parentPath != currentRemotePath)
		  {
			tree.history.change(currentRemotePath);
			this.placesRemoteChangeTreeBase(server, parentPath);
		  }
		  break;
		}
	  case 'history-back':
		{
		  if(tree.history.canGoBack())
		  {
			this.placesRemoteChangeTreeBase(server, tree.history.goBack(currentRemotePath));
		  }
		  break;
		}
	  case 'history-forward':
		{
		  if(tree.history.canGoForward())
		  {
			this.placesRemoteChangeTreeBase(server, tree.history.goForward(currentRemotePath));
		  }
		  break;
		}
	  case 'log-open':
		{
		  this.element('asynchremote-toolbar-panel-show-progress')
				  .checked = this.s.pref('log.show.progress');
		  this.element('asynchremote-toolbar-panel-show-warning')
				  .checked = this.s.pref('log.show.warning');
		  this.element('asynchremote-toolbar-panel-show-error')
				  .checked = this.s.pref('log.show.error');
		  this.element('asynchremote-toolbar-panel-show-sucess')
				  .checked = this.s.pref('log.show.sucess');
				  
		  this.element('asynchremote-toolbar-panel')
				.openPopup(
							this.element('asynchremote-log'),
							'after_start'
						  );
				
		  this.actionFromRemote('log-update');
		  this.connections[server].errorCount = 0;
		  this.placesRemoteToolbarUpdate(server);
		  break;
		}
	  case 'log-save':
	  {
		var f = ko.filepicker.saveFile(null, 'remote-log-'+this.focusedServer+'.html','Save log in…', null); 
		if(f)
		  this.s.fileWrite(f, this.element('asynchremote-toolbar-panel').firstChild.firstChild.contentDocument.documentElement.innerHTML);
		break;
	  }
	  case 'log-update':
		{
		  var log = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd"><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><style>div{font-size:11px;font-family:arial, tahoma, sans-serif;} .sucess{ color:#45a44e; }  .status{color:#5d61af;}.error{ color:#d73d3d; } .warning{ color:#666666;}.canceled{ color:#876F71;}.progress{ color:#999999;}.process{ color:#45a44e;font-weight:bold;}</style></head><body>';
		  
		  var showErrors = this.s.pref('log.show.error');
		  var showWarnings = this.s.pref('log.show.warning');
		  var showProgress = this.s.pref('log.show.progress');
		  var showSucess = this.s.pref('log.show.sucess');
		  
		  var searchString = this.element('asynchremote-toolbar-panel-search').value;
		  for(var id in this.connections[server].logs)
		  {
			var aType = this.connections[server].logs[id].aType;
			if(
			   aType == 'error' && !showErrors ||
			   aType == 'warning' && !showWarnings ||
			   aType == 'sucess' && !showSucess ||
			   aType == 'progress' && !showProgress
			  )
			{
			  continue;
			}
			
			if(searchString != '' && !this.s.searchEngineSearch(searchString, this.connections[server].logs[id].aMsg ))
			  continue;
			
			log += '<div class="'+this.connections[server].logs[id].aType+'">';
			log += this.connections[server].logs[id].aDate;
			log += ' [';
			log += this.connections[server].logs[id].aProcessID;
			log += '] → ';			
			log += this.connections[server].logs[id].aType;
			log += ' : ';
			log += this.connections[server].logs[id].aMsg;
			log += '\n';
			log += '</div>'
		  }

		  var browser = this.element('asynchremote-toolbar-panel').firstChild.firstChild.contentDocument.documentElement;
		   try{
			var selectionStart = String(browser.selectionStart);
			var selectionEnd = String(browser.selectionEnd);
		  }catch(e){var noSelection = true;}
		 
		  //save scrollbar position
		  var scrollTop = browser.scrollTop;
		  browser.scrollTop = 500000;
		  var scrollTop2 = browser.scrollTop;
		  if (scrollTop+10 == scrollTop2)
			var scrollTop = 500000;
		 
		  //set text
		  browser.innerHTML = log;
		  //restore selection
		  if(!noSelection)
		  {
			browser.selectionStart = selectionStart;
			browser.selectionEnd = selectionEnd;
		  }
		  //restore scrollbar position
		  browser.scrollTop = scrollTop;
		  break;
		}
	  case 'log-update-if-opened':
		{
		  if(this.element('asynchremote-toolbar-panel').state == 'open')
			this.actionFromRemote('log-update');
		  break;
		}
	  case 'delete':
		{
		  if(this.s.confirm('Are you sure you want to delete?\n\n\t'+selectedPaths.join('\n\t')+'\n'))
		  {
			var aProcess = false;//group the processes into one process object
			for(var id in selectedItems)
			{
			  if(selectedItems[id].isDirectory)
				aProcess = this.connections[server].removeDirectory(selectedItems[id].getFilepath, aProcess);
			  else
				aProcess = this.connections[server].removeFile(selectedItems[id].getFilepath, aProcess);
			}
		  }
		  break;
		}
	  case 'permissions':
		{
		  var newPermissions = this.s.prompt('Enter new permissions…', 755, false, null, null, 'Apply recursive on folders?')
		  if(newPermissions.value != '')
		  {
			var aProcess = false;//group the processes into one process object
			for(var id in selectedItems)
			{
			  if(selectedItems[id].isDirectory)
				aProcess = this.connections[server].chmodDirectory(
																   selectedItems[id].getFilepath,
																   newPermissions.value,
																   newPermissions.check,
																   aProcess
																   );
			  else
				aProcess = this.connections[server].chmodFile(
															  selectedItems[id].getFilepath,
															  newPermissions.value,
															  aProcess);
			}
		  }
		  break;
		}
	  case 'rename':
		{
		  if(selectedPath != '' && selectedPath != '/')//avoid move the root directory
		  {
			var parentPath = selectedPath.split('/');
			var aPath = parentPath.pop();
			parentPath = parentPath.join('/');
			if(aPath && aPath != '')
			{
			  var newName = this.s.prompt('Enter new name…', aPath);
			  if(newName != '' && parentPath+'/'+newName != selectedPath)
				this.connections[server].rename(selectedPath, parentPath+'/'+newName);
			}
		  }
		  break;
		}
	  case 'move':
		{
		  if(selectedPath != '' && selectedPath != '/')//avoid move the root directory
		  {
			var newName = this.s.prompt('Move to…', selectedPath);
			if(newName != '' && newName != selectedPath)
			  this.connections[server].rename(selectedPath, newName);
		  }
		  break;
		}
	  case 'new-folder':
		{
		  var newName = this.s.prompt('Enter folder name…', '');
		  if(newName != '')
		  {
			if(!selectedItem.isDirectory)
			{
			  var selectedPath = selectedPath.split('/');
				  selectedPath.pop();
				  selectedPath = selectedPath.join('/');
			}
			this.connections[server].createDirectory(selectedPath, newName);
		  }
		  break;
		}
	  case 'open':
		{
		  var aProcess = false;//group the processes into one process object
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory)
			{
			  if(!selectedItems[id].isContainerOpen)
				tree.toggleOpenState(-1, selectedItems[id]);
			}
			else
			{
			  aProcess = this.connections[server].openFile(
											selectedItems[id].getFilepath,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
		  }
		  break;
		}
	  case 'download':
		{
		  var aProcess = false;//group the processes into one process object
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory)
			{
			  aProcess = this.connections[server].downloadDirectory(
											selectedItems[id].getFilepath,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
			else
			{
			  aProcess = this.connections[server].downloadFile(
											selectedItems[id].getFilepath,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
		  }
		  break;
		}
	  case 'download-to-folder':
		{

		  var f = ko.filepicker.getFolder(null, 'Download selected items to…');
		  if(f && f != '')
		  {
			var aProcess = false;//group the processes into one process object
			for(var id in selectedItems)
			{
			  if(selectedItems[id].isDirectory)
			  {
				aProcess = this.connections[server].downloadDirectory(
											  selectedItems[id].getFilepath,
											  currentRemotePath,
											  f,
											  aProcess
											  );
			  }
			  else
			  {
				aProcess = this.connections[server].downloadFile(
											  selectedItems[id].getFilepath,
											  currentRemotePath,
											  f,
											  aProcess
											  );
			  }
			}
		  }
		  break;
		}
	  case 'upload':
		{
		  var aProcess = false;//group the processes into one process object
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory)
			{
			  aProcess = this.connections[server].uploadDirectory(
											selectedItems[id].getFilepath,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
			else
			{
			  aProcess = this.connections[server].uploadFile(
											selectedItems[id].getFilepath,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
		  }
		  break;
		}
	  case 'upload-from-remote-toolbarbutton':
		{
		  if(
			//if the local places has no focus and the remote places has  focus
			 ((!ko.places.viewMgr || !ko.places.viewMgr.focused) && this.trees[server].focused) ||
			 //if there is selected files on remote, and there is NO selected files on local
			 (this.s.placesLocalGetSelectedPaths(window).length === 0 && this.trees[server].selectionSelectedItems.length > 0)
			 
		  )
		  {
			this.actionFromRemote('upload');
		  }
		  else if(
				  //if the remote pane has NO focus and the places pane has focus
				  (!this.trees[server].focused && ko.places.viewMgr && ko.places.viewMgr.focused) ||
				  //if there is selected files on local pane, and there is NO selected files on remote
				  (this.trees[server].selectionSelectedItems.length === 0 && this.s.placesLocalGetSelectedPaths(window).length > 0)
				  )
		  {
			this.actionFromLocal('upload');
		  }
		  else
		  {
			this.connections[server].log('error', 'Not sure about what file to upload,  the panels local and remote are unfocused.', 0);
		  }
		  break;
		}
	  case 'download-from-remote-toolbarbutton':
		{
		  if(
			//if the local places has no focus and the remote places has  focus
			 ((!ko.places.viewMgr || !ko.places.viewMgr.focused) && this.trees[server].focused) ||
			 //if there is selected files on remote, and there is NO selected files on local
			 (this.s.placesLocalGetSelectedPaths(window).length === 0 && this.trees[server].selectionSelectedItems.length > 0)
			 
		  )
		  {
			this.actionFromRemote('download');
		  }
		  else if(
				  //if the remote pane has NO focus and the places pane has focus
				  (!this.trees[server].focused && ko.places.viewMgr && ko.places.viewMgr.focused) ||
				  //if there is selected files on local pane, and there is NO selected files on remote
				  (this.trees[server].selectionSelectedItems.length === 0 && this.s.placesLocalGetSelectedPaths(window).length > 0)
				  )
		  {
			this.actionFromLocal('download');
		  }
		  else
		  {
			this.connections[server].log('error', 'Not sure about what file to download,  the panels local and remote are unfocused.', 0);
		  }
		  break;
		}
	  case 'new-file':
		{
		  var newName = this.s.prompt('Enter file name…', '');
		  if(newName != '')
		  {
			if(!selectedItem.isDirectory)
			{
			  var selectedPath = selectedPath.split('/');
				  selectedPath.pop();
				  selectedPath = selectedPath.join('/');
			}
			this.connections[server].createFile(
												  (selectedPath+'/'+newName).replace(/^\/+/, '/'),
												  currentRemotePath,
												  currentLocalPath
												);
		  }
		  break;
		}
	  case 'collapse':
		{
		  this.element('asynchremote-box').setAttribute('collapsed', 'true');
		  this.element('asynchremote-box-splitter').setAttribute('collapsed', 'true');
		  this.onLocationChange(this.s.tabGetFocused(window));
		  break;
		}
	  case 'close':
		{
		  this.connections[server].close();
		  break;
		}
	  case 'clean-cache-modified':
		{
		  this.connections[server].cleanCacheModified();
		  break;
		}
	  case 'clean-cache-connection':
		{
		  this.connections[server].cleanCacheConnection();
		  break;
		}
	  case 'clean-cache-overwrite':
		{
		  this.connections[server].cleanCacheOverWrite();
		  break;
		}
	  case 'pref-set-upload-and-rename':
		{
		  this.s.pref('upload.and.rename', this.element('asynchremote-tools-toolbarbutton-upload-and-rename').getAttribute('checked') == 'true')
		  break;
		}
	  case 'contribute':
		{
		  this.s.openURI('https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=H738SJGDU3NJ8');
		  break;
		}
	  case 'refresh-all':
		{
		  this.s.serializedSessionRemove(server);
		  this.connections[server].cleanCacheConnection();
		  this.connections[server].cache.currentPath = '';
		  this.placesRemoteChangeTreeBase(server, currentRemotePath);
		  break;
		}
	  case 'refresh-selected':
		{
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory)
			{	
			  this.connections[server].cacheDirectoryItemAdd(selectedItems[id].getFilepath);
			}
		  }
		  break;
		}
	  case 'refresh-all-soft':
		{
		  //this.dump('refresh')
		  //this.s.serializedSessionRemove(server);
		  //this.connections[server].cleanCacheConnection();
		  this.connections[server].cache.currentPath = '';
		  this.placesRemoteChangeTreeBase(server, currentRemotePath);
		  break;
		}
	  case 'refresh':
		{
		  this.connections[server].reset();
		  tree.resetHard();

		  break;
		}
	}
	this.placesRemoteToolbarUpdate(server);
  }

  this.onLocationChange = function(aTab)
  {
	var focusedPath = this.s.documentGetLocation(this.s.documentGetFromTab(aTab));
	var currentLocalPath 	= this.s.placesLocalCurrentPath(window);
	var server = this.focusedServer;
	if(
	   focusedPath.indexOf(currentLocalPath) !== 0 ||
	  !this.connections[server]
	)
	{
	  this.element('asynchremote-toolbar-local-upload').setAttribute('disabled', true);
	  this.element('asynchremote-toolbar-local-download').setAttribute('disabled', true);
	}
	else
	{
	  this.element('asynchremote-toolbar-local-upload').removeAttribute('disabled');
	  this.element('asynchremote-toolbar-local-download').removeAttribute('disabled');
	}
  }
  this.onApplicationClose = function(aSubject)
  {
	var processesRunning = 0;
	var servers = this.mRCService.getServerInfoList({});
	var server;
	for(var id in servers)
	{
	  server = servers[id].alias;
	  if(!this.connections[server]){}
	  else
	  {
		processesRunning += this.connections[server].connecting;
		for(var id in this.connections[server].processes)
		{
		  if(this.connections[server].processes[id].running())
			processesRunning += this.connections[server].processes[id].runnables.length;
		}
	  }
	}
	
	if(processesRunning > 0 && !this.s.confirm('There is processes running into "Remote Places".\n Do you still want to close the application?'))
	{
	  aSubject.data = true;
	}
	else
	{
	  this.quitingApplication = true;
	}

  }
  this.notifyProgress =  function(server)
  {
	//when at last one server is connected show the icon as "connected"
	var servers = this.mRCService.getServerInfoList({});
	var button = this.element('asynchremote-places-toolbar-button');
		button.removeAttribute('connecting');
		button.removeAttribute('connected');
	for(var id in servers)
	{
	  if(this.connections[servers[id].alias] && this.connections[servers[id].alias].connected)
		button.setAttribute('connected', 'true');
	  if(this.connections[servers[id].alias] && this.connections[servers[id].alias].connecting)
		button.setAttribute('connecting', 'true');
	}
	if(server == this.focusedServer)
	{
	  this.placesRemoteToolbarUpdate(server);
	  //if the log is opened update the value
	  this.actionFromRemote('log-update-if-opened');
	}
  }
  this.uninitExtension = function()
  {
	//I alerted the user that there is processes running..
	//the user request kill all
  }
  
/*
	UTILS!
*/

  this.element = function(anElement)
  {
	return document.getElementById(anElement);
  }
  this.dump = function(aName, aString, aError)
  {
	if(!this.debug && !aError)
	  return;
	if(typeof(aString) ==  'undefined')
	  aString = '';
	  
	this.s.dump(aName+':'+aString);
  }

  return this;
}

var asynchRemote = new AsynchRemote();

addEventListener('load', asynchRemote.loadExtension, false);
addEventListener('unload', asynchRemote.unloadExtension, false);