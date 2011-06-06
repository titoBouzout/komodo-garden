(function(){
  
  this.getPathCurrent = function()
  {
	if(this.focusedTree && this.focusedTree.currentPath && this.focusedInstance.type != 'remote')
	  return this.focusedTree.currentPath;
	else
	  return '';
  }
  
  this.getPathsSelected = function(aboutFocusedTab)
  {
	var aPaths = [];
	if(aboutFocusedTab)
	{
	  aPaths[aPaths.length] = this.s.filePathFromFileURI(this.s.documentFocusedGetLocation(window));
	}
	else
	{
	  if(document.popupNode && document.popupNode == this.element('g-toolbar-breadcrumb'))//clicked root button..
	  {
		//this.s.dump('the command is for the "root" button');
		aPaths[aPaths.length] = this.focusedTree.currentPath;
	  }
	  else if(document.popupNode && document.popupNode.hasAttribute('path'))
	  {
		//this.s.dump('the command is for the "browser" element')
		aPaths[aPaths.length] = document.popupNode.getAttribute('path');
	  }
	  else
	  {
		//this.s.dump('the command is for the tree');
		var selectedTree = this.focusedTree;
		var selectedInstance = this.focusedInstance;
		
		//get tree selection and properties
		var selectedItems = selectedTree.selectionGetSelectedItems();
		for(var id in selectedItems)
		  aPaths[aPaths.length] = selectedItems[id].path;
	  }
	}
	return aPaths;
  }
  
}).apply(garden);