(function(){ 
 
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
	
	// when the user makes click on a file of the browser we need to open the file no change the tree path
	if(aElement.getAttribute('isDirectory') == 'false')
	{
	  this.gardenCommand('open');
	  this.s.stopEvent(aEvent);
	  return false;
	}

	//this.s.dump('el group es'+aElement.getAttribute('groupID'));
	//this.s.dump('el tree es'+aElement.getAttribute('treeID'));
	 
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
	//this.s.dump('groupData', groupData);
	for(var id in groupData.trees)
	{
	  var treeData = groupData.trees[id];

	  //look if the tree is there, if not create the tree
	  //if the tree was not created the path to load is from the last session if exist
	  //if no exists load the path saved on the tree
	  //if the user is changing the path via the browser element change to that path
	  //change to the path of the browser element only if the user is no selecting to change of tree ( the first childs of the breadcrumb )
	  var treeDataElementID = 'g-tree-'+treeData.id;
	  var treeElement = this.element(treeDataElementID);
	  
	  //the tree is not there create the tree
	  if(!treeElement)
	  {
		//this.s.dump('The tree was not created yet:'+treeData.id+', creating tree..');
		var treeElement = this.element('g-tree').cloneNode(true);
			treeElement.setAttribute('id', treeDataElementID);
			treeElement.setAttribute('treeID', treeData.id);
			treeElement.setAttribute('groupID', groupID);
			treeElement.setAttribute('originalPath', treeData.path);
			
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
			
			//treeView.currentPath = session.currentPath;
			
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
		
		treeView.originalPath = treeData.path;
	  }
	  
	//focusing the tree
	
	  //this.s.dump('The tree is already created:'+treeData.id+'');
	  if(treeElementID == treeDataElementID)
	  {
		//this.s.dump('The tree is the one that we want to focus:'+treeData.id+', switching to tree');
		this.focusedTree = treeElement.garden;
		this.focusedInstance = this.instances[treeData.id];
	  }
	  
	//changing the base
	
	  if(treeElement.hasAttribute('not-loaded'))
	  {
		//this should not happen, anyway dont care, just in case
		treeElement.removeAttribute('not-loaded');
		var session = this.s.serializedSessionGet('tree.'+treeData.id, {_rows:[],_rowsStates:{},currentPath:''});
		if(this.s.serializedSessionExists('tree.'+treeData.id))
		{
		  if(treeElementID == treeDataElementID)
			path = session.currentPath;
		  treeElement.garden.baseChange(session.currentPath, false);
		}
		else
		{
		  if(treeElementID == treeDataElementID)
			path = treeData.path;
		  treeElement.garden.baseChange(treeData.path, false);
		}
	  }
	  else
	  {
		//just focus the tree and not change the base
		if(
			aElement.parentNode &&
			(
			  aElement.parentNode.parentNode &&
			  aElement.parentNode.parentNode.id && 
			  aElement.parentNode.parentNode.id == 'g-toolbar-breadcrumb'
			)
			||
			(
			  aElement.parentNode && 
			  aElement.parentNode.id && 
			  aElement.parentNode.id == 'g-groups-menupopup'
			)
		)
		{
		  if(treeElementID == treeDataElementID)
		  {
			this.s.dump('clicked the first childs of the breadcrumb or the tree from the bottom toolbar menupopup');
			path = this.focusedTree.currentPath;
		  }
		  //treeElement.garden.baseChange(aElement.getAttribute('path'), true);
		}
		else
		{
		  if(treeElementID == treeDataElementID)
		  {
			this.s.dump('clicked a sub element of the breadcrumb');
			path = aElement.getAttribute('path');
			treeElement.garden.baseChange(aElement.getAttribute('path'), true);
		  }
		}
	  }
	  
	//showing or collapsing the tree
	
	  //the tree we want to focus
	  if(treeElementID == treeDataElementID)
	  {
		treeElement.setAttribute('collapsed', false);
		treeElement.focus();
	  }
	  //if there is a single view hide the non-selected
	  else if(this.s.pref('sidebar.view.type.single'))
	  {
		treeElement.setAttribute('collapsed', true);
	  }
	  //if the view is multiple show the tree
	  else
	  {
		treeElement.setAttribute('collapsed', false);
	  }
	}
	
	if(this.s.pref('sidebar.view.type.multiple.horizontal'))
	  groupContainer.removeAttribute('orient');
	else
	  groupContainer.setAttribute('orient', 'vertical');
	  
	this.element('g-toolbar-group-menupopup').hidePopup();
	
	//this.s.dump('switchToTree:toolbarUpdate');
	this.toolbarUpdate();
	
	//show the top toolbar if it is collapsed
	this.element('g-toolbar-top').setAttribute('collapsed', false);
	
	this.onLocationChange(this.s.tabGetFocused(window));
	
	this.s.pref('last.focused.treeID', treeID);
	this.s.pref('last.focused.groupID', groupID);
	this.s.pref('last.focused.path', path);
  }
  this.setTreeFocus = function(treeElement)
  {
	this.focusedTree = this.trees[treeElement.getAttribute('treeID')]
	this.focusedInstance = this.instances[treeElement.getAttribute('treeID')]
	this.focusedTree.focused = true;
	
	this.s.pref('last.focused.treeID', treeElement.getAttribute('treeID'));
	this.s.pref('last.focused.groupID', treeElement.getAttribute('groupID'));
	this.s.pref('last.focused.path', this.focusedTree.currentPath);
	//this.s.dump('setTreeFocus:toolbarUpdate');
	this.toolbarUpdate();
  }
  this.setTreeBlur = function(treeElement)
  {
	if(this.trees[treeElement.getAttribute('treeID')])
	  this.trees[treeElement.getAttribute('treeID')].focused = false;
  }
  this.switchViewType = function()
  {
	this.s.pref('sidebar.view.type.single', this.element('g-tools-sidebar-view-single').getAttribute('checked') == 'true');
	this.s.pref('sidebar.view.type.multiple.horizontal', this.element('g-tools-sidebar-view-multiple-horizontal').getAttribute('checked') == 'true');
	this.s.pref('sidebar.view.type.multiple.vertical', this.element('g-tools-sidebar-view-multiple-vertical').getAttribute('checked') == 'true');
	
	//simulating click
	var aElement = this.s.create(document, 'menuitem');
		aElement.setAttribute('groupID', this.focusedTree.groupID);
		aElement.setAttribute('treeID', this.focusedTree.treeID);
		aElement.setAttribute('path', this.focusedTree.currentPath);
	var aEvent = {};
		aEvent.type = 'switch.view';
		  
	this.switchToTree(aEvent, aElement);
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
  
}).apply(garden);