(function(){
  
  this.treeContextAllowMouseOver = true;
  
  this.treeContextMouseOver = function(aEvent)
  {
	if(
		this.treeContextAllowMouseOver && 
		!this.treeContextAllowMouseOut &&
		aEvent.relatedTarget &&
		(
		  aEvent.relatedTarget == this.element('g-tree-context')
		  /*||
		  (
			aEvent.relatedTarget.parentNode && 
			aEvent.relatedTarget.parentNode == this.element('g-tree-context')
		  )*/
		)
	)
	{
	  //this.s.dump('the mouse is over!');
	  myAPI.timer().setTimeout(function(){ garden.treeContextAllowMouseOut = true;}, 50);
	}

	this.s.hideSiblingsPopupsOpened(aEvent.originalTarget);
	
	if(
	  aEvent.originalTarget &&
	  (
		(
		  aEvent.originalTarget.parentNode &&
		  aEvent.originalTarget.parentNode == this.element('g-tree-context')
		  ||
		  aEvent.originalTarget.parentNode.parentNode &&
		  aEvent.originalTarget.parentNode.parentNode == this.element('g-tree-context')
		  ||
		  aEvent.originalTarget.parentNode.parentNode.parentNode &&
		  aEvent.originalTarget.parentNode.parentNode.parentNode == this.element('g-tree-context')
		)
	  )
	)
	{
	  var aTagName = this.s.tagName(aEvent.originalTarget)
	  if(
		 aTagName != 'menu' &&
		 aTagName != 'menupopup' &&
		 aTagName != 'menuitem' &&
		 aTagName != 'menuseparator' &&
		 aTagName != 'xul:menu' &&
		 aTagName != 'xul:menupopup' &&
		 aTagName != 'xul:menuitem' &&
		 aTagName != 'xul:menuseparator' 
		 )
	  {
		//this.s.dump(aTagName);
		this.s.hideChildrensPopupsOpened(this.element('g-tree-context'));
	  }
	  /*else if(aTagName == 'menu' || aTagName == 'xul:menu')
	  {
		if(!aEvent.originalTarget.hasAttribute('disabled'))
		{
		  //this.s.dump(aTagName);
		  //aEvent.originalTarget.firstChild.openPopup(aEvent.originalTarget, 'end_before');
		}
	  }*/
	}
	return true;
  }
  
  /*
   when the mouse is out we should hide the popup
   this allow to rigth click other elements when using context on the "browser".
  */

  this.treeContextMouseOut = function(aEvent)
  {
	if(
	   this.treeContextAllowMouseOut &&
	   aEvent.relatedTarget &&
	   aEvent.relatedTarget.parentNode &&
	   aEvent.relatedTarget.parentNode != this.element('g-tree-context') && 
	   aEvent.relatedTarget.parentNode.parentNode &&
	   aEvent.relatedTarget.parentNode.parentNode != this.element('g-tree-context') && 
	   aEvent.relatedTarget.parentNode.parentNode.parentNode &&
	   aEvent.relatedTarget.parentNode.parentNode.parentNode != this.element('g-tree-context')
	)
	{
	  //this.s.dump('the mouse is out!');
	  this.treeContextAllowMouseOver = false;
	  myAPI.timer().setTimeout(function(){ garden.treeContextAllowMouseOver = true;}, 50);
	  this.treeContextAllowMouseOut = false;
	  
	  //dont auto-hide the context menu if the clicked element if from the tree
	  if(
		document.popupNode && document.popupNode.hasAttribute('path') && 
		document.popupNode != this.element('g-toolbar-breadcrumb')
	  )
		this.element('g-tree-context').hidePopup();
	}
  }

  this.treeContextPopupShowing = function(aEvent)
  {
	if(aEvent.originalTarget.parentNode)
	  this.s.hideSiblingsPopupsOpened(aEvent.originalTarget.parentNode);
	  
	//this.s.dump(aEvent.relatedTarget.tagName);
	//init selection properties
	var multiple = false,
		file = false,
		folder = false,
		root = false,
		numFiles = 0,
		numFolders = 0,
		parentIsRoot = false,
		browser = false,
		type = 'local';
		
	if(document.popupNode && document.popupNode == this.element('g-toolbar-breadcrumb'))//clicked root button..
	{
	  //this.s.dump('the context menu is shown from the root button');
	  
	  var selectedTree = this.focusedTree;
	  var selectedInstance = this.focusedInstance;
	  
	  folder = true;
	  root = true;
	  numFolders = 1;
	  type = selectedInstance.type;
	}
	else if(document.popupNode && document.popupNode.hasAttribute('path'))
	{
	  //this.s.dump('the context menu is shown from the "browser" element');
		  
	  var selectedTree = this.trees[document.popupNode.getAttribute('treeID')];
	  var selectedInstance = this.instances[document.popupNode.getAttribute('treeID')] ||  this										.gardenDrivers.getInstance(
										  document.popupNode.getAttribute('treeID'),
										  document.popupNode.getAttribute('aDriverTypeID'),
										  document.popupNode.getAttribute('entryID')
										);
		  
	  multiple = false;
	  file = !(document.popupNode.getAttribute('isDirectory') == 'true');
	  if(file)
		numFiles = 1;
	  else
		numFolders = 1;
	  folder = (document.popupNode.getAttribute('isDirectory') == 'true');
	  browser = true;
	  type = selectedInstance.type;
	}
	else
	{
	  //this.s.dump('the context menu is shown from the tree');
	  
	  var selectedTree = this.focusedTree;
	  var selectedInstance = this.focusedInstance;
	  
	  type = selectedInstance.type;
	  
	  //get tree selection and properties
	  var selectedItems = selectedTree.selectionGetSelectedItems();

	  if(selectedItems.length > 1)
		multiple = true;
	  else if(selectedItems.length < 1)//if no selection hide the popup
		return false;

	  for(var id in selectedItems)
	  {
		if(selectedItems[id].isDirectory)
		{
		  folder = true;
		  numFolders++;
		}
		else
		{
		  file = true;
		  numFiles++;
		  //resolve if parent is root
		  if(
			this.s.subStrCount(
					  selectedItems[id].path.replace(selectedTree.currentPath, '')
					  , selectedInstance.__DS
			) < 2
		  )	  
			parentIsRoot = true;
		}
	  }
	}
	
	var aContext = this.element('g-tree-context');
	
	//update the context menu disableif items
	var items = aContext.childNodes, andSubItems = [], item;
	for(var id =0;id<items.length;id++)
	{
	  andSubItems = [];
	  andSubItems[andSubItems.length] = items[id];
	  var anonItems = document.getAnonymousElementByAttribute(items[id], 'anonid', 'container')
	  if(!anonItems){}
	  else
	  {
		anonItems = anonItems.childNodes;
		for(var i =0;i<anonItems.length;i++)
		{
		  //this.s.dump('looking into '+anonItems[i].getAttribute('label'));
		  if(anonItems[i].hasAttribute('disableif'))
		  {
			andSubItems[andSubItems.length] = anonItems[i];
		  }
		}
	  }
	  for(var a=0;a<andSubItems.length;a++)
	  {
		item = andSubItems[a];
		
		if(item.hasAttribute('disableif'))
		{
		  var disableif = item.getAttribute('disableif');
		  if(!file && folder && disableif.indexOf('onlyFolders') != -1)
			item.setAttribute('disabled', true);
		  else if(!file && folder && browser && type == 'remote' && disableif.indexOf('OnlyFoldersBrowserRemote') != -1)
			item.setAttribute('disabled', true);
		  else if(file && !folder && disableif.indexOf('onlyFiles') != -1)
			item.setAttribute('disabled', true);
		  else if(numFiles != 2 && disableif.indexOf('notTwoFiles') != -1)
			item.setAttribute('disabled', true);
		  else if(folder && disableif.indexOf('folder') != -1)
			item.setAttribute('disabled', true);
		  else if(file && disableif.indexOf('file') != -1)
			item.setAttribute('disabled', true);
		  else if(multiple && disableif.indexOf('multiple') != -1)
			item.setAttribute('disabled', true);
		  else if(root && disableif.indexOf('root') != -1)
			item.setAttribute('disabled', true);
		  else if(parentIsRoot && disableif.indexOf('parentIsRoot') != -1)
			item.setAttribute('disabled', true);
		  else if(browser && disableif.indexOf('browser') != -1)
			item.setAttribute('disabled', true);
		  else if(type == 'remote' && disableif.indexOf('remote') != -1)
			item.setAttribute('disabled', true);
		  else if(type == 'local' && disableif.indexOf('local') != -1)
			item.setAttribute('disabled', true);
		  else if(disableif.indexOf('noClipboard') != -1 && this.s.clipboardGetFilesPaths().length < 1)
			item.setAttribute('disabled', true);
		  else if(disableif.indexOf('disabled') != -1)
			item.setAttribute('disabled', true);
		  else
			item.removeAttribute('disabled');
		}
	  }
	}
  
	//if multiples files are selected change icons to "multiple"
	if(multiple)
	  this.element('g-context-upload-download').setAttribute('multiple', true);
	else
	  this.element('g-context-upload-download').removeAttribute('multiple');
	
	//based on driver features hide or show these "features"
	if(typeof(selectedInstance.object.chmod) == 'function')
	{
	  this.element('g-context-permissions-separator').removeAttribute('hidden');
	  this.element('g-context-permissions').removeAttribute('hidden');
	}
	else
	{
	  this.element('g-context-permissions-separator').setAttribute('hidden', true);
	  this.element('g-context-permissions').setAttribute('hidden', true);
	}
	
	//based on "view type" tree or browser change some functions
	
	if(browser)
	{
	  this.element('g-context-rename-move').setAttribute('action1', 'rename-from-browser');
	}
	else
	{
	  this.element('g-context-rename-move').setAttribute('action1', 'rename-from-tree');
	}
	
	return true;
  }
  
}).apply(garden);
