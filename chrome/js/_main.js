
function AsynchRemote()
{
  this.loadExtension = function(event)
  {
	event.currentTarget.removeEventListener('load', garden.loadExtension, false);
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
	this.s.include('observer','preference','file','history','string','thread','serialize','sharedMemory','DOM','prompt','process','search','search','places','window','listener','application','tab','document','urls','clipboard', 'notification','tree','timer','hash','array');
	this.s.includeShared('prompt', 'variete');
	this.windowID = this.s.getWindowID();
	//end global singleton object
		
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
	this.s.addObserver('quit-application-requested',
						function(aSubject)
						{
						  garden.onApplicationClose(aSubject);
						});
	if(
	   this.s.pref('last.focused.groupID') != '0' &&
	   this.s.pref('last.focused.treeID') != '0' &&
	   this.s.pref('last.focused.path') != ''   
	)
	{
	  //simulating click
	  var aElement = this.s.create(document, 'menuitem');
		  aElement.setAttribute('groupID', this.s.pref('last.focused.groupID'));
		  aElement.setAttribute('treeID', this.s.pref('last.focused.treeID'));
		  aElement.setAttribute('path', this.s.pref('last.focused.path'));
	  var aEvent = {};
		  aEvent.type = 'startup';
		  
	  this.switchToTree(aEvent, aElement);
	  this.element('g-toolbar-top').setAttribute('collapsed', 'false');
	}
  }
  this.registerDriverClass = function(aClass)
  {
	if(!this.drivers)
	  this.drivers = [];
	this.drivers[this.drivers.length] = aClass
  }
  //look for the group and switch to that group, create the group and the tree if needed no exists
  this.switchToTree = function(aEvent, aElement)
  {
	// if the clicks comes from a mouseup and the clicked element is a menuitem
	//then we will receive an oncommand.
	//mouseup is here to receive clicks from menus or menupoups
	if(aEvent.type == 'mouseup' && (
								aEvent.originalTarget.tagName == 'menuitem' || 
								aEvent.button == 2
							  )
	)
	  return true;
	  
	if(
	   !aElement.hasAttribute('groupID') ||
	   !aElement.hasAttribute('treeID') ||
	   aElement.hasAttribute('unreadable')
	)
	{
	  this.s.stopEvent(aEvent);
	  return false;
	}

	//this.s.dump('el group es'+aElement.hasAttribute('groupID'));
	//this.s.dump('el tree es'+aElement.hasAttribute('treeID'));
	 
	var groupID = aElement.getAttribute('groupID');
	var groupElementID = 'g-group-'+groupID;
	
	var treeID = aElement.getAttribute('treeID');
	var treeElementID = 'g-tree-'+treeID;
	
	var path = '';
	//this.s.dump('Requested tree:'+treeID+' from group:'+groupID);
	
	//groups container
	var groupsContainer = this.element('g-groups').childNodes;
	
	//hide other groups, show selected group if it is there
	var found = false;
	var groupContainer;
	for(var id =0;id<groupsContainer.length;id++)
	{
	  if(groupsContainer[id].hasAttribute('id'))
	  {
		if(groupsContainer[id].getAttribute('id') == groupElementID)
		{
		  //this.s.dump('The group is already created:'+groupID+', switching to group');
		  groupsContainer[id].setAttribute('collapsed', false);
		  groupContainer = groupsContainer[id];
		  found = true;
		}
		else
		{
		  groupsContainer[id].setAttribute('collapsed', true);
		}
	  }
	}
	//create the group if no exists
	if(!found)
	{
	  //this.s.dump('The group was not created yet:'+groupID+', creating group..');
	  groupContainer = this.s.create(document, 'hbox');
	  groupContainer.setAttribute('id', groupElementID);
	  groupContainer.setAttribute('flex', '1');
	  groupContainer.setAttribute('groupID', groupID);
	  this.element('g-groups').appendChild(groupContainer);
	}
	
	//check if all the trees are there
	var groupData = this.groupGetFromID(groupID);
	
	for(var id in groupData.trees)
	{
	  var treeData = groupData.trees[id];

	  //look if the tree is there, if not create the tree
	  var treeDataElementID = 'g-tree-'+treeData.id;
	  var treeElement = this.element(treeDataElementID);
	  //the tree is there show the tree if this is the focused one
	  if(treeElement)
	  {
		if(treeElementID == treeDataElementID)
		{
		  //this.s.dump('The tree is already created:'+treeData.id+', switching to tree');

		  this.focusedTree = treeElement.garden;
		  this.focusedInstance = this.instances[treeData.id];
		  
		  if(treeElement.hasAttribute('not-loaded'))
		  {
			treeElement.removeAttribute('not-loaded');
			/*var session = this.s.serializedSessionGet('tree.'+treeData.id, {_rows:[],_rowsStates:{},currentPath:''});
			if(this.s.serializedSessionExists('tree.'+treeData.id))
			  treeElement.garden.baseChange(session.currentPath, false);
			else
			*/
		  }
		  path = aElement.getAttribute('path');
		  treeElement.garden.baseChange(aElement.getAttribute('path'), true);		  
		  treeElement.setAttribute('collapsed', false);
		}
		else
		  treeElement.setAttribute('collapsed', true);
		  
		//if the tree is already create continue
		continue;
	  }
	  //this.s.dump('The tree was not created yet:'+treeData.id+', creating tree..');
	  //if the tree is not there create the tree
	  var treeElement = this.element('g-tree').cloneNode(true);
		  treeElement.setAttribute('id', treeDataElementID);
		  treeElement.setAttribute('treeID', treeID);
		  treeElement.setAttribute('groupID', groupID);
		  
	  //append the tree to the container
	  groupContainer.appendChild(treeElement);
	  
	  var session = this.s.serializedSessionGet('tree.'+treeData.id,
												{
												  _rows:[],
												  _rowsStates:{},
												  currentPath:''
												});
	  
	  //view
	  var treeView = new gardenTree();
		  treeView.init();
		  
		  treeView._rows = session._rows;
		  treeView._rowsStates = session._rowsStates;
		  treeView.currentPath = session.currentPath;
		  
	  treeElement.treeBoxObject.view = treeView;
	  treeElement.garden = treeView;
	  
		  treeView.treeElement = treeElement;
		  treeView.treeID = treeData.id;
		  treeView.groupID = groupID;
		  treeView.editable = true;
		  
		  this.trees[treeData.id] = treeView;

		  this.instances[treeData.id] = this.gardenDrivers.getInstance(
										  treeData.id,
										  treeData.aDriverTypeID,
										  treeData.entryID
										);
		  
		  this.instances[treeData.id].tree = treeView;
		  treeView.instance = this.instances[treeData.id];
		  
		  this.instances[treeData.id].treeID = treeData.id;

	  if(treeElementID == treeDataElementID)
	  {
		this.focusedTree = treeView;
		this.focusedInstance = this.instances[treeData.id];
		
		if(this.s.serializedSessionExists('tree.'+treeData.id))
		{
		   path = session.currentPath;
		}
		else
		{
		  path = treeData.path;
		  treeView.baseChange(treeData.path, false);
		}
		  
		treeElement.setAttribute('collapsed', false);
		treeElement.removeAttribute('not-loaded');
	  }
	  else
	  {
		treeElement.setAttribute('collapsed', true);
	  }
	}
	
	this.element('g-toolbar-group-menupopup').hidePopup();
	
	//this.s.dump('switchToTree:toolbarUpdate');
	this.toolbarUpdate();
	
	//show the top toolbar if it is collapsed
	this.element('g-toolbar-top').setAttribute('collapsed', 'false');
	
	this.onLocationChange(this.s.tabGetFocused(window));
	
	this.s.pref('last.focused.treeID', treeID);
	this.s.pref('last.focused.groupID', groupID);
	this.s.pref('last.focused.path', path);
  }

  this.toolbarUpdate = function()
  {
	//update breadcrumb
	this.element('g-toolbar-breadcrumb').setAttribute('label', this.focusedTree.currentPathTitle);
	this.element('g-toolbar-breadcrumb').setAttribute('tooltiptext', this.focusedTree.currentPath);
	
	//update connection status
	this.element('g-toolbar-breadcrumb').removeAttribute('connected');
	this.element('g-toolbar-breadcrumb').removeAttribute('iterations');
	
	//we are connected
	if(this.focusedInstance.connected)
	  this.element('g-toolbar-breadcrumb').setAttribute('connected', 'true');
	//the connection is loading
	if(this.focusedInstance.iterations)
	  this.element('g-toolbar-breadcrumb').setAttribute('iterations', 'true');

	//back forward buttons
	if(this.focusedTree.history.canGoBack())
	  this.element('g-toolbar-base-back').removeAttribute('disabled');
	else
	  this.element('g-toolbar-base-back').setAttribute('disabled', 'true');  
	if(this.focusedTree.history.canGoForward())
	  this.element('g-toolbar-base-forward').removeAttribute('disabled');
	else
	  this.element('g-toolbar-base-forward').setAttribute('disabled', 'true');
	
	//can go up
	if(this.focusedTree.baseCanGoUp())
	  this.element('g-toolbar-base-up').removeAttribute('disabled');
	else
	  this.element('g-toolbar-base-up').setAttribute('disabled', 'true');
	  
	//show count of iterations and errors into the log button
	var errorCountElement = document.getAnonymousElementByAttribute(
																this.element('g-toolbar-log'),
																'anonid',
																'errors');
	if(this.focusedInstance.errorCount > 0)
	{
	  errorCountElement.setAttribute('value', this.focusedInstance.errorCount);
	  errorCountElement.setAttribute('hidden', false);
	}
	else
	  errorCountElement.setAttribute('hidden', true);

	var processCountElement = document.getAnonymousElementByAttribute(
																   this.element('g-toolbar-log'),
																   'anonid',
																   'iterations');
	var count = this.focusedInstance.iterations;
	for(var id in this.focusedInstance.processes)
	{
	  if(this.focusedInstance.processes[id].running())
		count += this.focusedInstance.processes[id].runnables.length;
	}
	if(count > 0)
	{
	  processCountElement.setAttribute('value', count);
	  processCountElement.setAttribute('hidden', false);
	}
	else
	  processCountElement.setAttribute('hidden', true);
	  
	//update icons on toolbarbutton and menuitems but only if it is opened
	if(this.element('g-groups-menupopup').state == 'open')
	  this.groupsPopupshowing();
	  	
	this.element('g-toolbar-free-space').setAttribute('value', this.focusedInstance.diskSpaceAvailable);
  }

  //disable or enable the tree context menu menuitems depending of the selected items of tree
 
  //the action when clicking a menuitem from "places local context menu"
  this.actionFromLocal = function(action, aboutFocusedTab, aData)
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
			  var aDestination = this.s.getRemotePathFromLocalPath(currentRemotePath, currentLocalPath, file)
			  if(aDestination == '' || aDestination == '/')
			  {
				if(!this.s.confirm('Are you sure you want to download all the tree?') ||
				   !this.s.confirm('Are you REALLY sure you want to download all the tree?'))
				  break;
			  }
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
		   
		  if(aboutFocusedTab)
		  {
			if(this.s.documentGetFocused(window).isDirty)
			{
			  var saveBeforeUpload = this.s.pref('save.before.upload');
			  var prompt;
			  if(saveBeforeUpload || (prompt = this.s.confirmWithCheckbox('The document was not saved, do you want to save the document before uploading?', 'Save my preference')).value)
			  {
				if(prompt && prompt.check)
				  this.s.pref('save.before.upload', true);
				this.s.tabGetFocused(window).save();
			  }
			  else
			  {
				break;
			  }
			}
		  }
		  for(var id in selectedItems)
		  {
			var file = this.s.getRemotePathFromLocalPath(
														 currentRemotePath,
														 currentLocalPath,
														 selectedItems[id])

			if(this.s.pathIsFolder(selectedItems[id]))
			{
			  var aDestination = this.s.getRemotePathFromLocalPath(currentRemotePath, currentLocalPath, file)
			  if(aDestination == '' || aDestination == '/')
			  {
				if(!this.s.confirm('Are you sure you want to upload all the tree?') ||
				   !this.s.confirm('Are you REALLY sure you want to upload all the tree?'))
				  break;
			  }
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
	//this.s.dump('actionFromLocal:toolbarUpdate');
	this.toolbarUpdate();
  }
  //the action or command when clicking a menuitem from "tree or browser context menu"
  //the idea of this method is to "fire" some action from a selection, a tree selection or a browser selection
  //if no selection exists then the command shoul't be here
  this.gardenCommand = function(aCommand, aData)
  {
  
	if(document.popupNode && document.popupNode == this.element('g-toolbar-breadcrumb'))//clicked root button..
	{
	  this.s.dump('the clicked element is the root button');
	  var tree = this.focusedTree;
	  var instance = this.focusedInstance;
	  
	  //simulate tree selection and properties
	  var selectedItems = [];
		  selectedItems[0] = {};
		  selectedItems[0].path = tree.currentPath;
		  selectedItems[0].isDirectory = true;
		  
	  var selectedPaths = [];
	  for(var id in selectedItems)
		selectedPaths[selectedPaths.length] = selectedItems[id].path;
	  var selectedPath = selectedPaths[0];//the very first path on the selection
	  var selectedItem = selectedItems[0];//the very first item on the selection
	}
	else if(document.popupNode && document.popupNode.hasAttribute('path'))
	{
	  this.s.dump('the clicked element is a menuitem from a "browser" element');
	  //simulate tree selection and properties
	  var selectedItems = [];
		  selectedItems[0] = {};
		  selectedItems[0].path = document.popupNode.getAttribute('path');
		  selectedItems[0].isDirectory = true;
		  
	  var selectedPaths = [];
	  for(var id in selectedItems)
		selectedPaths[selectedPaths.length] = selectedItems[id].path;
	  var selectedPath = selectedPaths[0];//the very first path on the selection
	  var selectedItem = selectedItems[0];//the very first item on the selection
	}
	else
	{
	  this.s.dump('the clicked element is a tree childreen');
	  var tree = this.focusedTree;
	  var instance = this.focusedInstance;
	  
	  //get tree selection and properties
	  var selectedItems = tree.selectionGetSelectedItems();
	  var selectedPaths = [];
	  for(var id in selectedItems)
		selectedPaths[selectedPaths.length] = selectedItems[id].path;
	  var selectedItem = tree.selectionGetSelectedItem();
	  if(!selectedItem){}
	  else
	  {
		var selectedPath = selectedItem.path;//the very first path on the selection
	  }
	}
	
	var currentPath = this.focusedTree.currentPath
	
	switch(aCommand)
	{
	  case 'rebase':
		{
		  if(!selectedItem.isDirectory)
		  {
			var selectedPath = selectedPath.split(instance.__DS);
				selectedPath.pop();
				selectedPath = selectedPath.join(instance.__DS);
		  }
		  if(selectedPath == '')
			selectedPath = instance.__DS;
		  this.focusedTree.baseChange(selectedPath, true);
		  
		  break;
		}

	  case 'delete':
		{
		  if(selectedPaths.join('') != '' && this.s.confirm('Are you sure you want to delete?\n\n\t'+selectedPaths.join('\n\t')+'\n'))
		  {
			var aProcess = false;//group the processes into one process object
			for(var id in selectedItems)
			{
			  /*
			  if(selectedItems[id].isDirectory)
				aProcess = instance.removeDirectory(selectedItems[id].path, aProcess);
			  else
				aProcess = instance.removeFile(selectedItems[id].path, aProcess);
			  */
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
			  {
				aProcess = this.connections[server].chmodDirectory(
																   selectedItems[id].getFilepath,
																   newPermissions.value,
																   newPermissions.check,
																   aProcess
																   );
			  }
			  else
			  {
				aProcess = this.connections[server].chmodFile(
															  selectedItems[id].getFilepath,
															  newPermissions.value,
															  aProcess);
			  }
			}
		  }
		  break;
		}
	  case 'rename':
		{
		  this.trees[server].startEditing();
		  break;
		}
	  case 'renameFromTree':
		{
		  if(aData.path != '' && aData.path != '/')//avoid move the root directory
		  {
			var parentPath = aData.path.split('/');
			var aPath = parentPath.pop();
			parentPath = parentPath.join('/');
			if(aPath && aPath != '')
			{
			  var newName = aData.newName;
			  if(newName != '' && parentPath+'/'+newName != aData.path)
				this.connections[server].rename(aData.path, parentPath+'/'+newName, aData.isDirectory);
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
			{
			  if(!this.s.confirm('Are you sure you want to move \n\t"'+selectedPath+'" \nto \n\t"'+newName+'"?'))
				  break;
			  this.connections[server].rename(selectedPath, newName, selectedItem.isDirectory);
			}
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
	  case 'open-from-tree':
		{
		 // alert('open from tree');
		  var aProcess = false;//group the processes into one process object
		  
		  var everyOneOpen = true;
		  var everyOneClosed = true;
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory)
			{
			  if(!selectedItems[id].isContainerOpen)
				everyOneOpen = false;
			  else
				everyOneClosed = false;
			}
		  }
		  
		  var toggledSelected = false;
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory)
			{
			  if(everyOneOpen)
			  {
				tree.toggleOpenState(-1, selectedItems[id]);
				if(selectedItem == selectedItems[id])
				  toggledSelected = true;
			  }
			  else if(!selectedItems[id].isContainerOpen)
			  {
				tree.toggleOpenState(-1, selectedItems[id]);
				if(selectedItem == selectedItems[id])
				  toggledSelected = true;
			  }
			}
			else if(!selectedItems[id].isDirectory)
			{
			  aProcess = this.connections[server].openFile(
											selectedItems[id].getFilepath,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
		  }
		  if(everyOneOpen || everyOneClosed)
		  {
			if(toggledSelected)
			  tree.toggleOpenState(-1, selectedItem);
		  }
		  else if(!everyOneOpen && !everyOneClosed)
		  {
			if(!toggledSelected && selectedItem.isDirectory)
			  tree.toggleOpenState(-1, selectedItem);
		  }
		  break;
		}
	  case 'edit':
		{
		  var aProcess = false;//group the processes into one process object
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory){}
			else
			{
			  aProcess = this.connections[server].editFile(
											selectedItems[id].getFilepath,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
		  }
		  break;
		}
	  case 'diff':
		{
		  var aProcess = false;//group the processes into one process object
		  var aTemporalLocalPath = this.s.folderCreateTemporal('diff');
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory){}
			else
			{
			  aProcess = this.connections[server].compareWithLocal(
											selectedItems[id].getFilepath,
											currentRemotePath,
											currentLocalPath,
											aTemporalLocalPath,
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
			  var aDestination = this.s.getRemotePathFromLocalPath(currentRemotePath, currentLocalPath, selectedItems[id].getFilepath)
			  if(aDestination == '' || aDestination == '/')
			  {
				if(
				   !this.s.confirm('Are you sure you want to download all the tree?') || 
				   !this.s.confirm('Are you REALLY sure you want to download all the tree?')
				   )
				  break;
			  }
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
			  var aDestination = this.s.getRemotePathFromLocalPath(currentRemotePath, currentLocalPath, selectedItems[id].getFilepath)
			  if(aDestination == '' || aDestination == '/')
			  {
				if(!this.s.confirm('Are you sure you want to upload all the tree?') ||
				   !this.s.confirm('Are you REALLY sure you want to upload all the tree?'))
				  break;
			  }
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
			 (this.s.placesLocalGetSelectedPaths(window).length === 0 && this.trees[server].selectionGetSelectedItems().length > 0)
			 
		  )
		  {
			this.gardenCommand('upload');
		  }
		  else if(
				  //if the remote pane has NO focus and the places pane has focus
				  (!this.trees[server].focused && ko.places.viewMgr && ko.places.viewMgr.focused) ||
				  //if there is selected files on local pane, and there is NO selected files on remote
				  (this.trees[server].selectionGetSelectedItems().length === 0 && this.s.placesLocalGetSelectedPaths(window).length > 0)
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
			 (this.s.placesLocalGetSelectedPaths(window).length === 0 && this.trees[server].selectionGetSelectedItems().length > 0)
			 
		  )
		  {
			this.gardenCommand('download');
		  }
		  else if(
				  //if the remote pane has NO focus and the places pane has focus
				  (!this.trees[server].focused && ko.places.viewMgr && ko.places.viewMgr.focused) ||
				  //if there is selected files on local pane, and there is NO selected files on remote
				  (this.trees[server].selectionGetSelectedItems().length === 0 && this.s.placesLocalGetSelectedPaths(window).length > 0)
				  )
		  {
			this.actionFromLocal('download');
		  }
		  else
		  {
			this.connections[server].log('error', 'Not sure about what file to download,  the panels local and remote are both unfocused.', 0);
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
		  this.onLocationChange(this.s.tabGetFocused(window));
		  break;
		}


	  /*mmmm*/
	  case 'refresh-selected':
		{
		  break;
		}
	  default:
	  {
		throw new Error('the switch of actions cant match the action'+aCommand);
	  }
	}
	this.toolbarUpdate();
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
	
	if(processesRunning > 0 && !this.s.confirm('There is processes running into "Garden Extension".\n Do you still want to close the application?'))
	{
	  aSubject.data = true;
	}
	else
	{
	  this.s.folderDeleteTemporal();
	}
  }
  this.notifyProgress =  function(aNotifierTreeID)
  {
	if(!this.focusedTree)
	{
	  /*
	    when loading the first tree, we open all the trees for that group.
	    until the selected tree is created there is no focusedTree
	  */
	}
	else
	{
	  //when at last one server is connected show the icon as "connected"
	  var button = this.element('g-groups-button');
		  button.removeAttribute('iterations');
		  button.removeAttribute('connected');
		  
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
			if(this.instances[treeID].connected)
			{
			  button.setAttribute('connected', 'true');
			  connected = true;
			}
			if(this.instances[treeID].iterations)
			{
			  button.setAttribute('iterations', 'true');
			  iterations = true;
			}
			if(connected && iterations)
			  break;
		  }
		}
		if(connected && iterations)
		  break;
	  }
	  if(aNotifierTreeID == this.focusedTree.treeID)
	  {
		//this.s.dump('notifyProgress:toolbarUpdate'+this.focusedTree.treeID);
		this.toolbarUpdate();
		//if the log is opened update the value
		this.logUpdateIfOpened();
	  }
	}
  }
  this.uninitExtension = function(){}

  this.element = function(aElement)
  {
	return document.getElementById(aElement);
  }
  this.dump = function(aName, aString)
  {
	this.s.dump(aName+':'+aString);
  }

  return this;
}

var asynchRemote = new AsynchRemote();
var garden = asynchRemote;

addEventListener('load', garden.loadExtension, false);
addEventListener('unload', garden.unloadExtension, false);