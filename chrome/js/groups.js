(function(){
  
  this.groupsGet = function()
  {
	return garden.shared.session.get('groups', []);
  }
  
  this.groupsSet = function(groups)
  {
	garden.shared.session.set('groups', groups);
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
	groupsSorting = groupsSorting.sort(myAPI.string().sortLocale);
	
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
			groupMenuitem.setAttribute('tooltiptext', 'Right click to attach a tree');
  
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
			treeSorting = treeSorting.sort(myAPI.string().sortLocale);
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
	  treeSorting = treeSorting.sort(myAPI.string().sortLocale);
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
			//menuitem.setAttribute('type', 'folders');
			menuitem.setAttribute('action', 'add-tree');
			  
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
		  connectionMenu.setAttribute('label', 'Add tree to group from '+this.gardenDrivers.driversTypes[id].description);
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
							.previousSibling
						  );
	}
	
	//if the context is on a tree show "remove tree from group"
	if(document.popupNode.hasAttribute('treeID'))
	{
	  
	  context.lastChild.setAttribute('hidden', false);
	  if(this.groupTreeIsSibling(
								 document.popupNode.getAttribute('groupID'),
								 document.popupNode.getAttribute('treeID')
								 )
	  )
		context.lastChild.previousSibling.setAttribute('checked', true);
	  else
		context.lastChild.previousSibling.setAttribute('checked', false);
		
	  context.lastChild.previousSibling.setAttribute('hidden', false);
	  context.lastChild.previousSibling.previousSibling.setAttribute('hidden', false);
	}
	else
	{
	  context.lastChild.setAttribute('hidden', true);
	  context.lastChild.previousSibling.setAttribute('hidden', true);
	  context.lastChild.previousSibling.previousSibling.setAttribute('hidden', true);
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
		  if(garden.shared.confirm('Are you sure you want to delete the group?'))
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
				  //delete the trees elements and references
				  for(var a in groups[id].trees)
				  {
					var treeID =  groups[id].trees[a].id;
					if(this.element('g-tree-'+treeID))
					  this.element('g-tree-'+treeID).parentNode.removeChild(this.element('g-tree-'+treeID));
					if(this.trees[treeID])
					{
					  this.trees[treeID].sessionRemove();
					  this.trees[treeID] = null;
					  this.instances[treeID] = null;
					}
				  }
				  
				  groups.splice(i, 1);
				  this.groupsSet(groups);
				  
				  //delete the group element
				  if(this.element('g-group-'+groupID))
				  {
					this.element('g-group-'+groupID).parentNode.removeChild(this.element('g-group-'+groupID))
					this.element('g-toolbar-top').setAttribute('collapsed', true);
				  }
				  //try to focus another group and tree
				  if(this.element('g-groups') && this.element('g-groups').firstChild)
				  {
					//focus group with at least one tree
					for(var i=0;i<this.element('g-groups').childNodes.length;i++)
					{
					  if(this.element('g-groups').childNodes[i].firstChild)
					  {
						this.switchToTreeData(
						  this.element('g-groups').childNodes[i].firstChild.getAttribute('groupID'),
						  this.element('g-groups').childNodes[i].firstChild.getAttribute('treeID'),
						  this.trees[this.element('g-groups').childNodes[i].firstChild.getAttribute('treeID')].currentPath
						);
						break;
					  }
					}
				  }
				  break;
				}
				i++;
			  }
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
			var aName = garden.shared.prompt('New tree group name...', aName);
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
		  var aName = garden.shared.prompt('Tree group name...');
		  if(aName && aName != '')
		  {
			var groups = this.groupsGet();
			
			var newGroup = {};
				newGroup.name = aName;
				newGroup.id = myAPI.crypto().sha1(new Date());
				newGroup.trees = [];
				groups[groups.length] = newGroup;
				
			this.groupsSet(groups);
		  }
		  break;
		}
	  case 'add-tree':
		{
		  var path 				= aElement.getAttribute('path');
		  var aDriverTypeID 	= aElement.getAttribute('aDriverTypeID');
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
								  id : myAPI.crypto().sha1(new Date()),
								  entryID:entryID,
								  isSibling:true
								}
				//this.s.dump('newTree:', newTree);
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
					newTree = groups[id].trees[i];
					break;
				  }
				}
				if(!found)
				{
				  groups[id].trees.push(newTree);
				}
				this.groupsSet(groups);
				this.switchToTreeData(groupID, newTree.id, path);
				break;
			  }
			}
			
		  }
		  break;
		}
	  case 'delete-tree':
		{
		  if(garden.shared.confirm('Are you sure you want to delete the tree from the group?'))
		  {
			var groupID = value.getAttribute('groupID');
			var treeID = value.getAttribute('treeID');
			var groups = this.groupsGet();
		   
			//this.s.dump('going to delete treeID '+treeID+' from groupID'+groupID);
			for(var id in groups)
			{
			  //this.s.dump('looking for groupID '+groupID+' on '+groups[id].id );
			  if(groups[id].id == groupID)
			  {
				//this.s.dump('found groupID ');
				var a=0;
				for(var i in groups[id].trees)
				{
				 // this.s.dump('looking for treeID '+treeID+' on '+groups[id].trees[i].id);
				  if(treeID == groups[id].trees[i].id)
				  {
					//this.s.dump('found treeID ');
					groups[id].trees.splice(a, 1);
					this.groupsSet(groups);
					
					if(this.element('g-tree-'+treeID))
					{
					  this.element('g-tree-'+treeID).parentNode.removeChild(this.element('g-tree-'+treeID));
					  this.trees[treeID].sessionRemove();
					  this.trees[treeID] = null;
					  this.instances[treeID] = null;
					  //if there is another tree into this group
					  if(this.element('g-group-'+groupID) && this.element('g-group-'+groupID).firstChild)
					  {
						this.switchToTreeData(
						  this.element('g-group-'+groupID).firstChild.getAttribute('groupID'),
						  this.element('g-group-'+groupID).firstChild.getAttribute('treeID'),
						  this.trees[this.element('g-group-'+groupID).firstChild.getAttribute('treeID')].currentPath
						);
					  }
					  //there is no tree into this group, delete the group and try to focus another tree
					  else if(this.element('g-group-'+groupID))
					  {
						this.element('g-group-'+groupID).parentNode.removeChild(this.element('g-group-'+groupID))
						//the toolbar should be hhidden
						this.element('g-toolbar-top').setAttribute('collapsed', true);
						//try to focus another group and tree
						if(this.element('g-groups') && this.element('g-groups').firstChild)
						{
						  //focus group with at least one tree
						  for(var i=0;i<this.element('g-groups').childNodes.length;i++)
						  {
							if(this.element('g-groups').childNodes[i].firstChild)
							{
							  this.switchToTreeData(
								this.element('g-groups').childNodes[i].firstChild.getAttribute('groupID'),
								this.element('g-groups').childNodes[i].firstChild.getAttribute('treeID'),
								this.trees[this.element('g-groups').childNodes[i].firstChild.getAttribute('treeID')].currentPath
							  );
							  break;
							}
						  }
						}
					  }
					  break;
					}
				  }
				  a++;
				}
				break;
			  }
			}
		  }
		  break;
		}
	  case 'sibling-tree':
		{
		  var groupID = value.getAttribute('groupID');
		  var treeID = value.getAttribute('treeID');
		  var groups = this.groupsGet();
		 
		  //this.s.dump('going to delete treeID '+treeID+' from groupID'+groupID);
		  for(var id in groups)
		  {
			//this.s.dump('looking for groupID '+groupID+' on '+groups[id].id );
			if(groups[id].id == groupID)
			{
			  //this.s.dump('found groupID ');
			  var a=0;
			  for(var i in groups[id].trees)
			  {
			   // this.s.dump('looking for treeID '+treeID+' on '+groups[id].trees[i].id);
				if(treeID == groups[id].trees[i].id)
				{
				  groups[id].trees[i].isSibling = !groups[id].trees[i].isSibling;
				  this.groupsSet(groups);
				  break;
				}
				a++;
			  }
			  break;
			}
		  }
		  break;
		}

	}
	
	var popup = document.popupNode.parentNode;
	
	if(popup && popup.id == 'g-groups-menupopup')
	{
	  myAPI.timer().setTimeout(function(){
		if(popup.state == 'closed')
		  popup.openPopup(popup.parentNode, 'before_start');
	  }, 210);
	}

	this.element('g-group-context').hidePopup();
	this.element('g-groups-menupopup').hidePopup();
	this.element('g-toolbar-group-menupopup').hidePopup();
  }
  
  this.groupTreeExists = function(groupID, treeID)
  {
	var groups = this.groupsGet();
		   
	for(var id in groups)
	{
	  if(groups[id].id == groupID)
	  {
		for(var i in groups[id].trees)
		{
		  if(treeID ==  groups[id].trees[i].id)
		  {
			return true;
		  }
		}
	  }
	}
	return false;
  }
  this.groupTreeIsSibling = function(groupID, treeID)
  {
	var groups = this.groupsGet();
		   
	for(var id in groups)
	{
	  if(groups[id].id == groupID)
	  {
		for(var i in groups[id].trees)
		{
		  if(treeID ==  groups[id].trees[i].id)
		  {
			if(groups[id].trees[i].isSibling)
			  return true;
			else
			  return false;
		  }
		}
	  }
	}
	return false;
  }
  this.groupTreeGetSiblingLocal = function(treeElement)
  {
	var groupID = treeElement.getAttribute('groupID');
	var treeID = treeElement.getAttribute('treeID');
	
	var groups = this.groupsGet();
		   
	for(var id in groups)
	{
	  if(groups[id].id == groupID)
	  {
		for(var i in groups[id].trees)
		{
		  if(treeID !=  groups[id].trees[i].id)
		  {
			if(groups[id].trees[i].isSibling && this.instances && this.instances[groups[id].trees[i].id].type == 'local')
			  return [
					  groups[id].trees[i].path,
					  this.instances[groups[id].trees[i].id].__DS,
					  this.instances[groups[id].trees[i].id]
					  ];
		  }
		}
	  }
	}
	return false;
  }

}).apply(garden);