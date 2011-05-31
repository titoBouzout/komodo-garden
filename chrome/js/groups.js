(function(){
  
  this.groupsGet = function()
  {
	return this.s.serializedSessionGet('groups', []);
  }
  
  this.groupsSet = function(groups)
  {
	this.s.serializedSessionSet('groups', groups);
  }
  
  this.groupGetFromID = function(aID)
  {
	var groups = this.groupsGet();
	for(var id in groups)
	{
	  if(groups[id].id == aID)
	  {
		return groups[id];
	  }
	}
  }

  this.groupsPopupshowing = function()
  {
	if(!this.groupsPopupshowingBuilding){}
	else
	  return;
	this.groupsPopupshowingBuilding = true;
	
	var menupopup = this.element('g-groups-menupopup');
	this.s.removeChilds(menupopup);

	var groups = this.groupsGet();
	var groupsSorting = [];
	for(var id in groups)
	  groupsSorting[groupsSorting.length] = groups[id].name+' '+groups[id].id;
	groupsSorting = groupsSorting.sort(this.s.sortLocale);
	
	var globalConnected = false;
	var globalIterations = false;
	
	for(var id in groupsSorting)
	{
	  //sorting!
	  for(var i in groups)
	  {
		if(groups[i].name+' '+groups[i].id == groupsSorting[id])
		{
		  var group = groups[i];
		  break;
		}
	  }
		var groupMenuitem = document.createElement('menuitem');
			groupMenuitem.setAttribute('label', group.name);
			groupMenuitem.setAttribute('groupID', group.id);
			groupMenuitem.setAttribute('class', 'menuitem-iconic g-group');
  
			menupopup.insertBefore(groupMenuitem, menupopup.lastChild.previousSibling);
	  
		  var groupConnected = false;
		  var groupIterations = false;

		  //adding trees
		  if(group.trees)
		  {
			var treeSorting = [];
			for(var e in group.trees)
			{
			  treeSorting[treeSorting.length] = group.trees[e].label = 
			  this.gardenDrivers.getEntry(
														group.trees[e].aDriverTypeID,
														group.trees[e].entryID).labelWithoutPath+
														group.trees[e].path;
			}
			treeSorting = treeSorting.sort(this.s.sortLocale);
			for(var h in treeSorting)
			{
			  //sorting!
			  for(var e in group.trees)
			  {
				if(treeSorting[h] == group.trees[e].label)
				{
				  var tree = group.trees[e];
				  break;
				}
			  }

			  var menuitem = document.createElement('menuitem');
				  menuitem.setAttribute('label', tree.label);
				  menuitem.setAttribute('tooltiptext', tree.label);
				  menuitem.setAttribute('groupID', group.id);
				  menuitem.setAttribute('treeID', tree.id);
				  menuitem.setAttribute('path', tree.path);
				  menuitem.setAttribute('class', 'menuitem-iconic g-group-tree');
				  menuitem.setAttribute('crop', 'center');
				  
				  //check if we are connected
				  if(this.trees[tree.id] && this.instances[tree.id].connected)
				  {
					menuitem.setAttribute('connected', true);
					groupConnected = true;
					globalConnected = true;
				  }
				  //check if the connection is loading
				  if(this.trees[tree.id] && this.instances[tree.id].iterations)
				  {
					groupIterations = true;
					globalIterations = true;
					menuitem.setAttribute('iterations', true);
				  }
					
			  menupopup.insertBefore(menuitem, menupopup.lastChild.previousSibling);
			}
			if(groupConnected)
			  groupMenuitem.setAttribute('connected', true);
			if(groupIterations)
			  groupMenuitem.setAttribute('iterations', true);
		  }
	}
	menupopup.parentNode.removeAttribute('connected', true);
	menupopup.parentNode.removeAttribute('iterations', true);
	
	//check if we are connected to any of the groups
	if(globalConnected)
	  menupopup.parentNode.setAttribute('connected', true);
  
	//check if the connection is loading on any of the groups
	if(globalIterations)
	  menupopup.parentNode.setAttribute('iterations', true);
	  
	this.groupsPopupshowingBuilding = false;
  }
  
  this.groupToolbarPopupshowing = function()
  {
	var menupopup = this.element('g-toolbar-group-menupopup');
	
	this.s.removeChilds(menupopup);

	var group = this.groupGetFromID(this.focusedTree.treeElement.getAttribute('groupID'));
	
	//adding trees
	if(group.trees)
	{
	  var treeSorting = [];
	  for(var e in group.trees)
	  {
		treeSorting[treeSorting.length] = group.trees[e].label = 
		this.gardenDrivers.getEntry(
												  group.trees[e].aDriverTypeID,
												  group.trees[e].entryID).labelWithoutPath+
												  group.trees[e].path;
	  }
	  treeSorting = treeSorting.sort(this.s.sortLocale);
	  for(var h in treeSorting)
	  {
		//sorting!
		for(var e in group.trees)
		{
		  if(treeSorting[h] == group.trees[e].label)
		  {
			var tree = group.trees[e];
			break;
		  }
		}

		var menuitem = document.createElement('menuitem');
			menuitem.setAttribute('label', tree.label);
			menuitem.setAttribute('tooltiptext', tree.label);
			menuitem.setAttribute('class', 'menuitem-iconic g-browser-container');
			
			menuitem.setAttribute('groupID', group.id);
			menuitem.setAttribute('treeID', tree.id);
			
			menuitem.setAttribute('aDriverTypeID', tree.aDriverTypeID);
			menuitem.setAttribute('entryID', tree.entryID);
			menuitem.setAttribute('path', tree.path);
			
			menuitem.setAttribute('isDirectory', 'true');
			menuitem.setAttribute("crop", 'center');
			menuitem.setAttribute('type', 'folders');
			menuitem.setAttribute('action', 'add-tree');
			
			/*
			//check if we are connected
			if(this.trees[tree.id] && this.instances[tree.id].connected)
			  menuitem.setAttribute('connected', true);
			//check if the connection is loading
			if(this.trees[tree.id] && this.instances[tree.id].iterations)
			  menuitem.setAttribute('iterations', true);
			*/
			  
		menupopup.appendChild(menuitem);
	  }
	}
  }

  this.groupContextPopupshowing = function(event, aElement)
  {
	if(!aElement.hasAttribute('groupID'))
	{
	  this.s.stopEvent(event);
	  return false;
	}
	var context = this.element('g-group-context');
	this.s.removeChilds(context);
	
	for(var id in this.gardenDrivers.driversTypes)
	{
	  //the menupopup of the connnection type (example: ftp) with all the available servers
	  var connectionMenu = document.createElement('menu');
		  connectionMenu.setAttribute('label', 'Add tree from '+this.gardenDrivers.driversTypes[id].description);
		  connectionMenu.setAttribute('class', 'menu-iconic');
		  connectionMenu.setAttribute('image', 'chrome://asynchremote/content/js/drivers/'+id+'.png');
		  //connectionMenu.setAttribute('action','add-tree');
		  
	  //the entries of that connection type
	  var menupopup = document.createElement('menupopup');
		  menupopup.setAttribute('class', 'g-browser-menupopup-xbl');
	  var entries = this.gardenDrivers.getEntries(id);
	  for(var i in entries)
	  {
		var menuitem  = document.createElement('menuitem');
			menuitem.setAttribute('label', entries[i].labelWithPath);
			menuitem.setAttribute('tooltiptext', entries[i].labelWithPath);
			menuitem.setAttribute('class', 'menuitem-iconic g-browser-container');
			
			menuitem.setAttribute('aDriverTypeID', id);
			menuitem.setAttribute('path', entries[i].path);
			menuitem.setAttribute('entryID', entries[i].id);
			
			menuitem.setAttribute('isDirectory', 'true');
			menuitem.setAttribute("crop", 'center');
			menuitem.setAttribute('type', 'folders');
			menuitem.setAttribute('action', 'add-tree');
			menuitem.setAttribute('isContext', 'true');
		menupopup.appendChild(menuitem);
	  }
	  //if connections entries are editbale add a "edit connections" menuitem
	  if(this.gardenDrivers.isEditable(id))
	  {
		var menuitem  = document.createElement('menuitem');
		menuitem.setAttribute('label', 'Edit '+this.gardenDrivers.driversTypes[id].description+' connections');
		menuitem.setAttribute('oncommand', 'garden.gardenDrivers.edit("'+id+'")');
		menuitem.setAttribute('class', 'menuitem-iconic g-group-connection-edit');
		menupopup.appendChild(document.createElement('menuseparator'));
		menupopup.appendChild(menuitem);
	  }
	  connectionMenu.appendChild(menupopup);
	  
	  //appending to context menu
	  context.insertBefore(connectionMenu,
						   context
							.lastChild
							.previousSibling
							.previousSibling
							.previousSibling
							.previousSibling
						  );
	}
	
	//if the context is on a tree show "remove tree from group"
	if(document.popupNode.hasAttribute('treeID'))
	{
	  context.lastChild.setAttribute('hidden', false);
	  context.lastChild.previousSibling.setAttribute('hidden', false);
	}
	else
	{
	  context.lastChild.setAttribute('hidden', true);
	  context.lastChild.previousSibling.setAttribute('hidden', true);
	}
  }
  
  this.groupContextAction = function(aEvent, aElement)
  {
	// if the clicks comes from a mouseup and the clicked element is a menuitem
	//then we will receive an oncommand.
	//mouseup is here to receive clicks from menus or menupoups
	if(aEvent.type == 'mouseup' && (
								aEvent.originalTarget.tagName == 'menuitem' || 
								aEvent.button == 2
							  )
	)
	  return false;
	
	//this.s.dump('groupContextAction:aElement.label:'+aElement.getAttribute('label'));
	
	if(!aElement.hasAttribute('action'))
	  return;
		
	var action = aElement.getAttribute('action');
	var value = document.popupNode;

	switch(action)
	{
	  case 'delete-group':
		{
		  if(this.s.confirm('Are you sure you want to delete the group?'))
		  {
			if(value.hasAttribute('groupID'))
			{
			  var groupID = value.getAttribute('groupID')
			  var groups = this.groupsGet();
			  var i = 0; 
			  for(var id in groups)
			  {
				if(groups[id].id == groupID)
				{
				  groups.splice(i, 1);
				  break;
				}
				i++;
			  }
			  this.groupsSet(groups);
			}
		  }
		  break;
		}
	  case 'rename-group':
		{
		  if(value.hasAttribute('groupID'))
		  {
			var groupID = value.getAttribute('groupID')
			var groups = this.groupsGet();
			for(var id in groups)
			{
			  if(groups[id].id == groupID)
			  {
				var aName = groups[id].name;
				break;
			  }
			}
			var aName = this.s.prompt('New tree group name...', aName);
			if(aName && aName != '')
			{
			  var groups = this.groupsGet();
			  for(var id in groups)
			  {
				if(groups[id].id == groupID)
				{
				  groups[id].name = aName;
				  break;
				}
			  }
			  this.groupsSet(groups);
			}
			
		  }
		  break;
		}
	  case 'add-group':
		{
		  var aName = this.s.prompt('Tree group name...');
		  if(aName && aName != '')
		  {
			var groups = this.groupsGet();
			
			var newGroup = {};
				newGroup.name = aName;
				newGroup.id = this.s.sha1(new Date());
				groups[groups.length] = newGroup;
				
			this.groupsSet(groups);
		  }
		  break;
		}
	  case 'add-tree':
		{
		  var path 				= aElement.getAttribute('path');
		  var aDriverTypeID = aElement.getAttribute('aDriverTypeID');
		  var entryID 			= aElement.getAttribute('entryID');
		  var groupID 			= value.getAttribute('groupID');
		  
		  if(
			 path && path != '' &&
			 aDriverTypeID && aDriverTypeID != '' &&
			 groupID && groupID != '' && 
			 entryID && entryID != ''
		  )
		  {
			var groups = this.groupsGet();
			for(var id in groups)
			{
			  if(groups[id].id == groupID)
			  {
				if(!groups[id].trees)
				  groups[id].trees = [];
				var newTree = 
								{
								  path:path,
								  aDriverTypeID:aDriverTypeID,
								  id : this.s.sha1(new Date()),
								  entryID:entryID
								}
				var found = false;
				for(var i in groups[id].trees)
				{
				  if(
					 groups[id].trees[i].path == newTree.path && 
					 groups[id].trees[i].aDriverTypeID == newTree.aDriverTypeID && 
					 groups[id].trees[i].entryID == newTree.entryID
				  )
				  {
					found = true;
					break;
				  }
				}
				if(!found)
				  groups[id].trees.push(newTree);
				break;
			  }
			}
			this.groupsSet(groups);
		  }
		  break;
		}
	  case 'delete-tree':
		{
		  if(this.s.confirm('Are you sure you want to delete the tree from the group?'))
		  {
			var groupID = value.getAttribute('groupID');
			var groups = this.groupsGet();
		   
			for(var id in groups)
			{
			  if(groups[id].id == groupID)
			  {
				var treeID = value.getAttribute('treeID');
				var a=0;
				for(var i in groups[id].trees)
				{
				  if(treeID ==  groups[id].trees[i].id)
				  {
					groups[id].trees.splice(a, 1);
				  }
				  a++;
				}
			  }
			  break;
			}
			this.groupsSet(groups);
		  }
		  break;
		}
	}
	
	var popup = document.popupNode.parentNode;
	
	if(popup.id == 'g-groups-menupopup')
	{
	  this.s.timerAdd(210, function(){
		if(popup.state == 'closed')
		  popup.openPopup(popup.parentNode, 'before_start');
	  });
	}

	this.element('g-group-context').hidePopup();
	this.element('g-groups-menupopup').hidePopup();
	this.element('g-toolbar-group-menupopup').hidePopup();
  }

}).apply(garden);