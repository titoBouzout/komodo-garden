function GardenAPI()
{
  this._listeners = [];

  this.addEventListener = function(aEvent, aFunction)
  {
	//garden.dump('addEventListener:aEvent:'+aEvent);
	//garden.dump('addEventListener:aFunction:', aFunction);
	if(!this._listeners[aEvent])
	  this._listeners[aEvent] = [];
	this._listeners[aEvent][this._listeners[aEvent].length] = aFunction;
  }
  this.removeEventListener = function(aEvent, aFunction)
  {
	//garden.dump('removeEventListener:aEvent:'+aEvent);
	//garden.dump('removeEventListener:aFunction:', aFunction);
	aFunction = aFunction.toSource();
	if(this._listeners[aEvent])
	{
	  for(var id in this._listeners[aEvent])
	  {
		if(this._listeners[aEvent][id].toSource() == aFunction.toSource())
		{
		  this._listeners[aEvent][id] = null;
		  break;
		}
	  }
	}
  }
  this.dispatchEvent = function(aEvent, aData)
  {
	//garden.dump('dispatchEvent:aEvent:'+aEvent);
	//garden.dump('dispatchEvent:aData:', aData);
	if(this._listeners[aEvent])
	{
	  for(var id in this._listeners[aEvent])
	  {
		this._listeners[aEvent][id](aData);
	  }
	}
  }
  
  this.getFocusedPath = function()
  {
	if(garden.focusedTree && garden.focusedTree.currentPath)
	  return garden.focusedTree.currentPath;
	else
	  return '';
  }
  this.getFocusedPathLocal = function()
  {
	if(garden.focusedTree && garden.focusedTree.currentPath && garden.focusedInstance.type == 'local')
	  return garden.focusedTree.currentPath;
	else
	  return '';
  }
  this.getFocusedPathRemote = function()
  {
	if(garden.focusedTree && garden.focusedTree.currentPath && garden.focusedInstance.type == 'remote')
	  return garden.focusedTree.currentPath;
	else
	  return '';
  }

  this.getSelectedPaths = function(aboutFocusedTab)
  {
	var aPaths = [];
	if(aboutFocusedTab)
	{
	  aPaths[aPaths.length] = myAPI.file().pathFromURI(myAPI.doc().getFocusedLocation());
	}
	else
	{
	  if(document.popupNode && document.popupNode == garden.element('g-toolbar-breadcrumb'))//clicked root button..
	  {
		//garden.dump('the command is for the "root" button');
		aPaths[aPaths.length] = garden.focusedTree.currentPath;
	  }
	  else if(document.popupNode && document.popupNode.hasAttribute('path'))
	  {
		//garden.dump('the command is for the "browser" element')
		aPaths[aPaths.length] = document.popupNode.getAttribute('path');
	  }
	  else
	  {
		//garden.dump('the command is for the tree');
		var selectedTree = garden.focusedTree;
		var selectedInstance = garden.focusedInstance;
		
		//get tree selection and properties
		var selectedItems = selectedTree.selectionGetSelectedItems();
		for(var id in selectedItems)
		  aPaths[aPaths.length] = selectedItems[id].path;
	  }
	}
	return aPaths;
  }
  
  this.treesClearStyle = function()
  {
	var groups = garden.element('g-groups').childNodes;
	for(var i=0;i<groups.length;i++)
	{
	  var trees = groups[i].childNodes;
	  for(var a=0;a < trees.length;a++)
	  {
		if(trees[a].garden.tree)
		{
		  trees[a].garden.tree.clearStyleAndImageCaches();
		  trees[a].garden.tree.invalidate();
		}
	  }
	}
  }
  this.treeReloadFocused = function()
  {
	garden.focusedTree.reload();
  }
  this.treesReloadAll = function()
  {
	var groups = garden.element('g-groups').childNodes;
	for(var i=0;i<groups.length;i++)
	{
	  var trees = groups[i].childNodes;
	  for(var a=0;a < trees.length;a++)
	  {
		if(trees[a].garden.tree)
		  trees[a].garden.reload();
	  }
	}
  }
}

var gardenAPI = new GardenAPI();
