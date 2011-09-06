(function(){
  
  //replaces a menuitem that is equivalent to a path,
  //for a menu with the path as label and as childs the subpaths
  this.browserNavigate = function(aEvent)
  {
	if(this.element('g-tree-context').state == 'open')
	  return;
	var item = aEvent.originalTarget;//the hovered element
	
	var tagName = this.s.tagName(item);
	
	if(
	   (tagName == 'xul:menu' || tagName == 'menu' || tagName == 'menuitem')
	   &&  item.hasAttribute('path')
	)
	{
	  if(aEvent.type == 'mouseover')
	  {
		item.setAttribute('isFocused', true);
		if(tagName == 'xul:menu' || tagName == 'menu')
		  item.firstChild.timer = myAPI.timer().setTimeout(function(){garden.browserOpenpopupFix(item.firstChild);}, 220);
	  }
	  else if(aEvent.type == 'mouseout')
	  {
		item.removeAttribute('isFocused');
	  }
	  if(!item.hasAttribute('done'))
	  {
		if(aEvent.type == 'mouseover' && !item.hasAttribute('busy'))
		{
		  item.setAttribute('busy', true);
		  item.interval = myAPI.timer().setTimeout(function(){garden.browserRequest(item);}, 190);
		}
		else if(aEvent.type == 'mouseout')
		{
		  if(item.interval)
			item.interval.cancel();
		  item.removeAttribute('busy');
		}
	  }
	}
  }
  
  this.browserOpenpopupFix = function(item)
  {
	if(item && item.parentNode && item.parentNode.hasAttribute('isFocused') && item.state=='closed')
	{
	  if(item.hasAttribute('isContext'))
		item.openPopup(item.parentNode, 'end_before', null, null, true, false, true);
	  else
		item.openPopup(item.parentNode, 'end_before', null, null, false, false, true);
	  //item.parentNode.focus();
	  item.focus();
	}
	else
	{
	  item.timer.cancel();
	}
  }
  
  this.browserRequest = function(item, aData)
  {
	item.setAttribute('done', true);
	
	var instance = this.gardenDrivers.getInstance(
												 'garden',
												 item.getAttribute('aDriverTypeID'),
												 item.getAttribute('entryID')
												);
	if(!aData)
	{
	  var aData = {}
		  aData.path = item.getAttribute('path');
		  aData.aFunction = function(aData){ garden.browserRequest(item, aData); }
	 
	  instance.directoryList(aData, this.shared.pref('no.hidden.items'));
	  return;
	}
	if(!aData.aEntries)
	{
	  item.setAttribute('label', item.getAttribute('label')+instance.__DS);
	  item.setAttribute('class', 'menuitem-iconic g-browser-container');
	  item.setAttribute('unreadable', 'true');
	  item.setAttribute('tooltiptext', 'Unreadable: '+item.getAttribute('label'));
	}
	else if(aData.aEntries.length < 1)
	{
	  if(item.getAttribute('isDirectory'))
	  {
		item.setAttribute('label', item.getAttribute('label')+instance.__DS);
		item.setAttribute('class', 'menuitem-iconic g-browser-container');
	  }
	  else
	  {
		item.setAttribute('class', 'menuitem-iconic g-browser-leaf');
		item.setAttribute("ext", item.getAttribute('label').split('.').pop().toLowerCase());
	  }
	}
	else
	{
	  var hasFolders = false;
	  if(item.hasAttribute('type') && item.getAttribute('type') == 'folders')
	  {
		for(var id in aData.aEntries)
		{
		  if(aData.aEntries[id].isDirectory)
		  {
			hasFolders = true;
			break;
		  }
		}
		if(hasFolders)
		  this.browserBuildSubmenu(instance, item, aData.aEntries);
		else
		{
		  item.setAttribute('label', item.getAttribute('label')+instance.__DS);
		  item.setAttribute('class', 'menuitem-iconic g-browser-container');
		}
	  }
	  else
	  {
		this.browserBuildSubmenu(instance, item, aData.aEntries);
	  }
	}
	item.removeAttribute('busy');
  }
  
  this.browserBuildSubmenu = function(instance, item, aEntries)
  {
	var path = item.getAttribute('path');

	//normal menu
	var menu = this.s.create(document, 'menu');
		menu.setAttribute('label', item.getAttribute('label'));
		menu.setAttribute('path', path);
		menu.setAttribute('tooltiptext', path);
		menu.setAttribute('done', 'true');
		menu.setAttribute('class', 'menu-iconic g-browser-container');
		menu.setAttribute("crop", 'center');
		menu.setAttribute("isDirectory", item.getAttribute('isDirectory'));
		if(item.hasAttribute('action'))
		  menu.setAttribute("action", item.getAttribute('action'));
		if(item.hasAttribute('isContext'))
		  menu.setAttribute("isContext", item.getAttribute('isContext'));
		menu.setAttribute('aDriverTypeID', item.getAttribute('aDriverTypeID'));
		if(item.hasAttribute('symlink'))
		  menu.setAttribute('symlink', true);
		if(item.hasAttribute('isHidden'))
		  menu.setAttribute('isHidden', true);
		if(item.hasAttribute('unwritable'))
		  menu.setAttribute('unwritable', true);
		if(item.hasAttribute('unreadable'))
		  menu.setAttribute('unreadable', true);
		menu.setAttribute('entryID', item.getAttribute('entryID'));
		menu.setAttribute('groupID', item.getAttribute('groupID'));
		menu.setAttribute('treeID', item.getAttribute('treeID'));
		
	var menupopup = this.s.create(document, 'menupopup');
		menupopup.setAttribute('class', 'menupopup-iconic');
	//adding the items
	for(var id in aEntries)
	{
	  if(item.hasAttribute('type') && item.getAttribute('type') == 'folders' && !aEntries[id].isDirectory)
		continue;
	  var add = this.s.create(document, "menuitem");
		  add.setAttribute("label", aEntries[id].name);
		  add.setAttribute("path", aEntries[id].path);
		  add.setAttribute("tooltiptext", aEntries[id].path);
		  if(aEntries[id].isDirectory)
			add.setAttribute('class', 'menuitem-iconic g-browser-container');
		  else
		  {
			add.setAttribute('done', 'true');
			add.setAttribute('class', 'menuitem-iconic g-browser-leaf');
			add.setAttribute("ext", 'g'+aEntries[id].extension);
		  }
		  if(aEntries[id].isSymlink)
			add.setAttribute('symlink', true);
		  if(aEntries[id].isHidden)
			add.setAttribute('isHidden', true);
		  if(!aEntries[id].isWritable)
			add.setAttribute('unwritable', true);
		  if(!aEntries[id].isReadable)
			add.setAttribute('unreadable', true);
		
		  add.setAttribute('aDriverTypeID', item.getAttribute('aDriverTypeID'));
		  add.setAttribute('entryID', item.getAttribute('entryID'));
		  add.setAttribute('groupID', item.getAttribute('groupID'));
		  add.setAttribute('treeID', item.getAttribute('treeID'));
		  add.setAttribute('isDirectory', aEntries[id].isDirectory);
		  add.setAttribute("crop", 'center');
		  if(item.hasAttribute('type'))
			add.setAttribute('type', item.getAttribute('type'));
		  if(item.hasAttribute('isContext'))
			add.setAttribute('isContext', item.getAttribute('isContext'));
		  if(item.hasAttribute('action'))
			add.setAttribute("action", item.getAttribute('action'));
	  menupopup.appendChild(add);
	}
	menu.appendChild(menupopup);
	
	//parents menu
	if(this.s.subStrCount(path, instance.__DS) > 0)
	{
	  var menuParents = this.s.create(document, 'menu');
		  menuParents.setAttribute('label', 'Parents');
		  menuParents.setAttribute('tooltiptext', path);
		  menuParents.setAttribute('done', 'true');
		  menuParents.setAttribute('class', 'menu-iconic g-browser-parents');
	
	  var menupopupParents = this.s.create(document, 'menupopup');
		  menupopupParents.setAttribute('class', 'menupopup-iconic');
	
	  var aNodes = path.split(instance.__DS);
	  var path = '';
	  var somethingAdded = false;
	  for(var id in aNodes)
	  {
		if(id==aNodes.length-1)
			break;
		path += aNodes[id];
		
		if(
		   path == '\\' ||
		   (path == '' && instance.__DS == '\\') ||
		   (
			path.indexOf(instance.__DS+instance.__DS) == 0 &&
			this.s.subStrCount(path, '\\') < 3
		   )
		)
		//dont show root Windows networks such "\\" "\\titook"
		{}
		else
		{
		  if(path == '')
		  {
			path = instance.__DS;
			var addedSlash = true;
		  }
			
		  somethingAdded = true;
		  var add = this.s.create(document, 'menuitem');
			  add.setAttribute('path', path);
			  add.setAttribute('tooltiptext', path);
			  add.setAttribute('label', path);
			  add.setAttribute('class', 'menuitem-iconic g-browser-container');
			  add.setAttribute('crop', 'center');
			  add.setAttribute('aDriverTypeID', item.getAttribute('aDriverTypeID'));
			  add.setAttribute('entryID', item.getAttribute('entryID'));
			  add.setAttribute('groupID', item.getAttribute('groupID'));
			  add.setAttribute('treeID', item.getAttribute('treeID'));
			  add.setAttribute('isDirectory', 'true');
			  if(item.hasAttribute('type'))
				add.setAttribute('type', item.getAttribute('type'));
			  if(item.hasAttribute('action'))
				add.setAttribute("action", item.getAttribute('action'));
			  if(item.hasAttribute('isContext'))
				add.setAttribute("isContext", item.getAttribute('isContext'));
			  menupopupParents.appendChild(add);
			  
		  if(addedSlash)
		  {
			path = '';
			addedSlash = false;
		  }
		}
		path+=instance.__DS;
	  }
	  if(somethingAdded)
	  {
		menuParents.appendChild(menupopupParents);
		menupopup.appendChild(this.s.create(document, 'menuseparator'));
		menupopup.appendChild(menuParents);
	  }
	}
	
	//appending the menus
	if(item && item.hasAttribute('isFocused'))
	{
	  if(item && item.parentNode)
	  {
		if(item.hasAttribute('id'))
		{
			menu.setAttribute('id', item.getAttribute('id'));
			menu.setAttribute('style', item.getAttribute('style'));
		}
		if(item.hasAttribute('temporal'))
			menu.setAttribute('temporal', item.getAttribute('temporal'));
  
		try
		{
		  if(item && item.parentNode)
			item.parentNode.replaceChild(menu, item);
		}
		catch(e)
		{
		  if(item && item.parentNode)
			item.appendChild(menupopup);
		}
		if(menupopup && menu && menupopup.openPopup)//if this is false, at this time the menu was removed, for example when the menupopup is closed we maybe remove all childs.
		{
		  if(menu.hasAttribute('isContext'))
			menupopup.openPopup(menu, 'end_before', null, null, true, false, true);
		  else
			menupopup.openPopup(menu, 'end_before', null, null, false, false, true);
		  //menupopup.parentNode.focus();
		  menupopup.focus();
		}
	  }
	}
	else
	{
	  if(item && item.parentNode)
	  {
		if(item.hasAttribute('id'))
		{
		  menu.setAttribute('id', item.getAttribute('id'));
		  menu.setAttribute('style', item.getAttribute('style'));
		}
		if(item.hasAttribute('temporal'))
		  menu.setAttribute('temporal', item.getAttribute('temporal'));
		try
		{
		  if(item && item.parentNode)
			item.parentNode.replaceChild(menu, item);
		}
		catch(e)
		{
		  if(item && item.parentNode && menupopup)
			item.appendChild(menupopup);
		}
	  }
	}
  }

}).apply(garden);