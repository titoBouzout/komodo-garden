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
	  this.s.timerAdd(50, function(){ garden.treeContextAllowMouseOut = true;});
	}
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
	   aEvent.relatedTarget.parentNode != this.element('g-tree-context')
	)
	{
	  //this.s.dump('the mouse is out!');
	  this.treeContextAllowMouseOver = false;
	  this.s.timerAdd(50, function(){ garden.treeContextAllowMouseOver = true;});
	  this.treeContextAllowMouseOut = false;
	  this.element('g-tree-context').hidePopup();
	}
  }

  this.treeContextPopupShowing = function(aEvent)
  {
	//this.s.dump(aEvent.relatedTarget.tagName);
	//init selection properties
	var multiple = false,
		file = false,
		folder = false,
		root = false,
		numFiles = 0,
		numFolders = 0,
		parentIsRoot = false,
		browser = false;
		
	if(document.popupNode && document.popupNode == this.element('g-toolbar-breadcrumb'))//clicked root button..
	{
	  this.s.dump('the clicked element is the root button');
	  
	  multiple = false;
	  file = false;
	  folder = true;
	  root = true;
	}
	else if(document.popupNode && document.popupNode.hasAttribute('path'))
	{
	  multiple = false;
	  file = false;
	  folder = true;
	  root = false;
	  browser = true;
	  this.s.dump('the clicked element is a menuitem from a "browser" element');
	}
	else
	{
	  this.s.dump('the clicked element is a tree childreen');

	  //get tree selection and properties
	  var selectedItems = this.focusedTree.selectionGetSelectedItems();

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
					  selectedItems[id].path.replace(this.focusedTree.currentPath, '')
					  , this.focusedInstance.__DS
			) < 2
		  )	  
			parentIsRoot = true;
		}
	  }
	}
	
	var aContext = this.element('g-tree-context');
	
	//update the context menu
	var items = aContext.childNodes;

	for(var id =0;id<items.length;id++)
	{
	  var item = items[id];
	  if(item.hasAttribute('testDisableIf'))
	  {
		if(!file && folder && item.getAttribute('testDisableIf').indexOf('onlyFolders') != -1)
		  item.setAttribute('disabled', true);
		else if(file && !folder && item.getAttribute('testDisableIf').indexOf('onlyFiles') != -1)
		  item.setAttribute('disabled', true);
		else if(numFiles != 2 && item.getAttribute('testDisableIf').indexOf('notTwoFiles') != -1)
		  item.setAttribute('disabled', true);
		else if(folder && item.getAttribute('testDisableIf').indexOf('folder') != -1)
		  item.setAttribute('disabled', true);
		else if(file && item.getAttribute('testDisableIf').indexOf('file') != -1)
		  item.setAttribute('disabled', true);
		else if(multiple && item.getAttribute('testDisableIf').indexOf('multiple') != -1)
		  item.setAttribute('disabled', true);
		else if(root && item.getAttribute('testDisableIf').indexOf('root') != -1)
		  item.setAttribute('disabled', true);
		else if(parentIsRoot && item.getAttribute('testDisableIf').indexOf('parentIsRoot') != -1)
		  item.setAttribute('disabled', true);
		else if(browser && item.getAttribute('testDisableIf').indexOf('browser') != -1)
		  item.setAttribute('disabled', true);
		else
		  item.removeAttribute('disabled');
	  }
	}
  
	if(multiple)
	{
	  this.element('g-context-upload').setAttribute('multiple', true);
	  this.element('g-context-download').setAttribute('multiple', true);
	}
	else
	{
	  this.element('g-context-upload').removeAttribute('multiple');
	  this.element('g-context-download').removeAttribute('multiple');
	}
	return true;
  }
    
  
  
}).apply(garden);
 