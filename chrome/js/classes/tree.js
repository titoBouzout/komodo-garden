
function gardenTree(){}

gardenTree.prototype = {
  
  init : function()
  {
	/* properties */
	
	  this.treeID = null;
	  this.groupID = null;
	  
	  this._rows = [];
	  this._rowsStates = {};
	  this.currentPath = '';
	  this.focused = false;

	  this.tree = null;
	
	/* navigation */
	
	  this.history = myAPI.historyNavigator(true);
	  
	/* selection */
	
	  this.event = {};
	  this.event.renaming = false;
	  this.event.renameClick = new Date();
	  this.event.renameItem = false;
	  this.event.renameTimeout = 0;
	  
	  this.editable = false;
	  
	/* controller */
	
	  this.iterations = 0;//perform one operation in the tree at time
	  this.operationsQueue = [];//queue of operations
	  
	/* selection */
	
	  this.selection = null;
	  this.selectionGoingToChange = 0;//holds if it is appropiated to save the selection
	  this.selectionSelectedItems = [];//save selected items for restoring when they are unselected
	
	/* scroll */
	this.scrollGoingToChange = 0;//holds if it is appropiated to save the scroll
  },
  

  
/*find rows and rows data*/

  findRowIDFromRow : function(aRow)
  {
	//garden.dump('findRowIDFromRow');
	var rowID = aRow.id;
	for(var i in this._rows)
	{
	  if(this._rows[i].id == rowID)
		return parseInt(i);
	}
	return -1;
  },
  findRowIDFromPath : function(aRowPath)
  {
	//garden.dump('findRowIDFromPath');
	for(var i in this._rows)
	{
	  //garden.dump('findRowIDFromPathFOR');
	  if(this._rows[i].path  == aRowPath)
		return parseInt(i);
	}
	return -1;
  },
  getRowStateFromID:function(aRowID)
  {
	//garden.dump('getRowStateFromID');
	if(!this._rowsStates[aRowID])
	{
	  var object = {};
		  object.isContainerOpen = false;
		  object.isContainerEmpty = false;
		  object.isBusy = false;
		  
	  this._rowsStates[aRowID] = object;
	}
	return this._rowsStates[aRowID];
  },
  getEventRowObject : function(event)
  {
	//garden.dump('getEventRowObject');
	var i = this.getEventRowID(event);
	if(i === false)
	  return false;
	else
	  return this._rows[i];
  },
  getEventRowID : function(event)
  {
	//garden.dump('getEventRowID');
	var row = {};
	this.tree.getCellAt(event.pageX, event.pageY, row, {},{});
	return row.value;
  },
  getEventRowIsTwistyOrIsImage :function(event)
  {
	//garden.dump('getEventRowIsTwistyOrIsImage');
	var part = {};
	this.tree.getCellAt(event.pageX, event.pageY, {}, {}, part);
	if(part.value && ( part.value == 'twisty' ||  part.value == 'image' ))
	  return true;
	else
	  return false;
  },
  getEventColumn : function(event)
  {
	//garden.dump('getEventColumn');
	var column = {};
	this.tree.getCellAt(event.pageX, event.pageY, {}, column, {});
	return column;
  },


/* inserting rows  */

  onDataReceived : function(aData)
  {
	//garden.dump('onDataReceived');
	if(this.iterations != 0)
	{
	  var tree = this;
	  this.treeOperationsQueue(function(){tree.onDataReceived(aData);});
	  return;
	}
	this.iterations++;
	
	var aParentRow = aData.aParentRow;
	var aRows = aData.aEntries;
	var aLevel = aData.aLevel;
	
	if(aParentRow != -1)
	{
	  //garden.dump('aParentRow != -1');
	  var aParentRowI = this.findRowIDFromRow(aParentRow);
	  //the parentRow was closed/removed
	  if(aParentRowI == -1)
	  {
		//garden.dump('aParentRow was removed from the tree');
		this.iterations--;
		this.treeOperationsQueue();
		//garden.dump('onDataReceivedend');
		return;
	  }
		
	  var aParentRowState = this.getRowStateFromID(aParentRow.id);
		  aParentRowState.isBusy = false;
		  aParentRowState.isContainerOpen = true;
		  aParentRowState.isLoading = false;	
	  
	  if(!aRows || aRows.length <1)
	  {
		//garden.dump('aParentRow has no childs');
		aParentRowState.isContainerEmpty = true;
		if(!aRows)
		  aParentRowState.unreadable = true;
		this.selectionGoingToChange++;
		
		  try{
			this.tree.invalidateRow(aParentRowI);
		  }catch(e){
			garden.dump('onDataReceived:1:', e, true);
		  }
		  
		this.selectionGoingToChange--;
		this.iterations--;
		this.treeOperationsQueue();
		//garden.dump('onDataReceivedend');
		return;
	  }
	  
	  this.selectionGoingToChange++;
	  
		try{
		  this.tree.invalidateRow(aParentRowI);
		}catch(e){
		  garden.dump('onDataReceived:2:', e, true);
		}
		//remove any previous rows at this level
		this.removeNextLevel(aParentRowI);
		
	  this.selectionGoingToChange--;
	}
	else
	{
	  //the base directory was unreadable
	  if(!aRows)
	  {
		this.iterations--;
		this.treeOperationsQueue();
		//garden.dump('onDataReceivedend');
		return;
	  }
	  var aParentRowI = 0;
	}
	
	//garden.dump('aParentRowI is'+aParentRowI);
	
	this.selectionGoingToChange++;
	
	//add new rows;
	  try
	  {
		var b=1;
		for(var id in aRows)
		{
		  this.getRowStateFromID(aRows[id].id).aLevel = aLevel;
		  //garden.dump('insert of new child '+aRows[id].path+' into position'+(aParentRowI + b));
		  this._rows.splice(aParentRowI + b, 0, aRows[id]);
		  b++;
		}
		
		this.scrollSave();
		
		  this.tree.rowCountChanged(aLevel, aRows.length);
		  //garden.dump('onDataReceived:thisLevel:'+aLevel+':aRows.length:'+aRows.length);
		this.scrollRestore();
		
		//restoring folding
		for (var id in aRows)
		{
		  //garden.dump('onDataReceivedFOR3');
		  var aRowState = this.getRowStateFromID(aRows[id].id);
		  if(aRowState.isContainerOpen || aRowState.isLoading)
		  {
			aRowState.isContainerOpen = false;
			this.toggleOpenState(-1, aRows[id]);
		  }
		}
		
	  }catch(e) { garden.dump('onDataReceived:3:', e, true); }
	
	this.selectionGoingToChange--;
	this.selectionRestore();
	this.iterations--;
	this.treeOperationsQueue();
	//garden.dump('onDataReceivedend');
  },
  openContainerFromPath:function(aPath)
  {
	var aRow = this.findRowIDFromPath(aPath);
	if(aRow != -1)
	{
	  var aRowState = this.getRowStateFromID(this._rows[aRow].id);
	  
	  if(!aRowState.isContainerOpen)
		this.toggleOpenState(aRow);
	}
  },
  toggleOpenState : function(aParentRowI, aParentRow)
  {
	//garden.dump('toggleOpenState');
	
	this.event.renameClick = new Date()+1000;//when dblclking two times quicly the childrenOnClick fires, when need to cheat the time in order to prevent that
	
	if(this.iterations != 0)//queue
	{
	  if(!aParentRow)
		aParentRow = this._rows[aParentRowI];
	  var tree = this;
	  this.treeOperationsQueue(function(){tree.toggleOpenState(aParentRowI, aParentRow);});
	  return;
	}
	this.iterations++;
	
	if(!aParentRow)
	  aParentRow = this._rows[aParentRowI];
	else
	  aParentRowI = this.findRowIDFromRow(aParentRow);
	
	//the row was closed/removed
	if(aParentRowI == -1)
	{
	  //garden.dump('toggleOpenState:element was removed');
	  this.iterations--;
	  this.treeOperationsQueue();
	  return;
	}
	
	var aParentRowState = this.getRowStateFromID(aParentRow.id);
	
	if(aParentRowState.isContainerOpen)
	{
	  //garden.dump('toggleOpenState:container is open');
		aParentRowState.isContainerOpen = false;
		
		this.selectionGoingToChange++;
	
		  try{
			this.removeNextLevel(aParentRowI);
		  } catch(e) {
			garden.dump('toggleOpenState:1:', e, true);
		  }
			
		this.selectionGoingToChange--;
	  
	  this.selectionRestore();
	  this.iterations--;
	  this.treeOperationsQueue();
	}
	else
	{
	  //garden.dump('toggleOpenState:container is closed');
		  
		  aParentRowState.isBusy = true;
		  aParentRowState.isLoading = true;
	  
	  this.selectionGoingToChange++;
	  
		try{
		  this.tree.invalidateRow(aParentRowI);
		} catch(e) {
		  garden.dump('toggleOpenState:2:', e, true);
		}
		
	  this.selectionGoingToChange--;
	  
	  this.selectionRestore();
	  this.iterations--;
	  this.treeOperationsQueue();
		  
	  var aData = {}
		  aData.aLevel = aParentRowState.aLevel+1;
		  aData.path = aParentRow.path;
		  aData.aParentRow = aParentRow;
		  aData.treeID = this.treeID;
	  var treeView = this;
		  aData.aFunction = function(aData){ treeView.onDataReceived(aData);};
		  
	  this.instance.directoryList(aData, garden.shared.pref('no.hidden.items'));
	}
  },
  toggleOpenStateContainers : function(selectedItems, selectedItem)
  {
	if(selectedItem.isDirectory)
	  this.toggleOpenState(-1, selectedItem);
	
	var everyOneOpen = true;
	var everyOneClosed = true;

	for(var id in selectedItems)
	{
	  if(selectedItems[id].isDirectory)
	  {
		if(!this.getRowStateFromID(this._rows[
											  this.findRowIDFromPath
											  (
												selectedItems[id].path
											  )
											].id
								  ).isContainerOpen)
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
		  this.toggleOpenState(-1, selectedItems[id]);
		}
		else if(!this.getRowStateFromID(this._rows[
											  this.findRowIDFromPath
											  (
												selectedItems[id].path
											  )
											].id
								  ).isContainerOpen)
		{
		  this.toggleOpenState(-1, selectedItems[id]);
		}
	  }
	}
  },
  insertRow : function(aRow, aParentRowPath)
  {
	//garden.dump('insertRow');
	if(this.iterations != 0)//queue
	{
	  var tree = this;
	  this.treeOperationsQueue(function(){tree.insertRow(aRow, aParentRowPath);});
	  return;
	}
	
	this.iterations++;
	var aParentRowID = this.findRowIDFromPath(aParentRowPath)
	//garden.dump('insertRow:insertando:'+aRow.path);
	//garden.dump('insertRow:aParentRowID:'+aParentRowID);
	//garden.dump('insertRow:aParentRowPath:'+aParentRowPath);
	
	if(aRow.path.indexOf(this.currentPath) !== 0)
	{
	  myAPI.debug().dump('insertRow:pathNotInCurrentView:aRow.path:'+aRow.path+':aParentRowPath:'+this.currentPath);
	  this.iterations--;
	  this.treeOperationsQueue();
	  
	  return;
	}

	//look if the parent is on the tree
	if(aParentRowID != -1)
	{
	  var aParentRow = this._rows[aParentRowID];
	  var aParentRowState = this.getRowStateFromID(aParentRow.id);
		  aParentRowState.isContainerEmpty = false;
	  var thisLevel = aParentRowState.aLevel+1;
	}
	else
	{
	  var thisLevel = 0;
	  	  aParentRowID = 0;
	}
	
	this.selectionGoingToChange++;
	
	try
	{
	  if(thisLevel > 0)
		aParentRowID++;
		
	  //garden.dump('este nivel es '+thisLevel);
	  //garden.dump('aParentRowID '+aParentRowID);
	  //then where to insert the row?
	  for (var t = aParentRowID; t < this._rows.length; t++)
	  {
		if (this.getLevel(t) > thisLevel){}//not in a subfolder
		else if (this.getLevel(t) < thisLevel)//break if we are in a sibling folder
		  break;
		else if(!aRow.isDirectory && this._rows[t].isDirectory){}//for example: inserting a file and this is a directory
		else if (
		  aRow.isDirectory == this._rows[t].isDirectory &&
		  myAPI.string().sortLocale(this._rows[t].name.toLowerCase(), aRow.name.toLowerCase()) > 0
		)//found the position?
		  break;
		else if(aRow.isDirectory != this._rows[t].isDirectory)//for example: reach end of folder and the list of file is starting
		  break;
		aParentRowID++;
	  }
	  this.getRowStateFromID(aRow.id).aLevel = thisLevel;
	  //insert the row
	  this._rows.splice(aParentRowID, 0, aRow);
  
	//keep scroll
	this.scrollSave();
	 
	  this.tree.rowCountChanged(thisLevel, 1);
	  
	this.scrollRestore();
	  
	}catch(e) { garden.dump('onDataReceived:3:', e, true); }
	
	this.selectionGoingToChange--;
	//reselect
	this.selectionRestore();
	this.iterations--;
	this.treeOperationsQueue();
  },

/* removing rows */

  removeNextLevel : function(i)
  {
	//garden.dump('removeNextLevel');
	try
	{
	  //garden.dump('removeNextLevel:removing next level on row:'+row);
	  i = parseInt(i);
	  
	  var aLevel = this.getLevel(i);
	  var deleteCount = 0;
	  i++;
	  for (var n = i; n < this.rowCount; n++) {
		//garden.dump('removeNextLevelFOR');
		  if (this.getLevel(n) > aLevel)
			deleteCount++;
		  else
			break;
	  }
	  if (deleteCount)
	  {
		//garden.dump('removeNextLevel:delte count :'+deletecount);
		this.scrollSave();
		
		this._rows.splice(i, deleteCount);
		this.tree.invalidateRow(--i);
		this.tree.rowCountChanged(aLevel, -deleteCount);
		//garden.dump('removeNextLevel:thisLevel:'+aLevel+'deletecount:'+deleteCount);
		
		this.scrollRestore();
	  }
	} catch(e) { garden.dump('removeNextLevel:', e, true); }
  },

  removeChilds : function()
  {
	//garden.dump('removeChilds');
	if(this.iterations != 0)
	{
	  var tree = this;
	  this.treeOperationsQueue(function(){tree.removeChilds();});
	  return;
	}
	
	this.iterations++;
	  
	  this.selectionGoingToChange++;
	  
		var length = this._rows.length;
		this._rows = [];
		try	{
		  this.tree.rowCountChanged(0, -length);
		  //garden.dump('removeChilds:level:'+0+':length:'+length);
		}catch(e) { garden.dump('removeChilds:', e, true); }
		
	  this.selectionGoingToChange--;
	  
	this.iterations--;
	this.treeOperationsQueue();
  },
  removeRowByPath : function(aPath, emptyContainers)
  {
	//garden.dump('removeRowByPath');
	if(this.iterations != 0)//queue
	{
	  var tree = this;
	  this.treeOperationsQueue(function(){tree.removeRowByPath(aPath);});
	  return;
	}
	
	this.iterations++;
	this.selectionGoingToChange++;
	
	  var aRowID = this.findRowIDFromPath(aPath);
	  if(aRowID != -1)
	  {
		this.scrollSave();
		
		  for(var id in emptyContainers)
		  {
			var aEmptyContainerI = this.findRowIDFromPath(emptyContainers[id]);
			if(aEmptyContainerI == -1)
			  continue;
			this.getRowStateFromID(this._rows[aEmptyContainerI].id).isContainerEmpty = true;
			this.tree.invalidateRow(aEmptyContainerI);
		  }
		  
		  this.removeNextLevel(aRowID);
		  
		  var aLevel = this.getRowStateFromID(this._rows[aRowID].id).aLevel;
		  this._rows.splice(aRowID, 1);
			
		  this.tree.rowCountChanged(aLevel, -1);
		 // garden.dump('removeRowByPath:aLevel:'+aLevel+':length:-1');
		
		this.scrollRestore();
		
	  }
	  else
	  {
		//garden.dump('aPath '+aPath+' was not found in the tree');
	  }
	
	this.selectionGoingToChange--;
	this.selectionRestore();
	this.iterations--;
	this.treeOperationsQueue();
  },

/* scolling */

  scrollSave :function()
  {
	this.scrollGoingToChange++;
	if(this.scrollGoingToChange == 1)
	  this.firstVisibleRow = this.tree.getFirstVisibleRow();
  },
  scrollRestore :function()
  {
	this.scrollGoingToChange--;
	if(this.scrollGoingToChange==0)
	  this.tree.scrollToRow(this.firstVisibleRow);
  },
  scrollFocusParent:function()
  {
	var aParent = this.getParentIndex(this.selection.currentIndex);
	if(aParent != -1)
	{
	  //this.tree.scrollToRow(aParent);
	  this.selection.select(aParent);
	  this.tree.ensureRowIsVisible(aParent);
	}
	else
	{
	  var previousSibling = this.getPreviousSiblingIndex(this.selection.currentIndex);
	  if(previousSibling != -1)
	  {
		//this.tree.scrollToRow(previousSibling);
		this.selection.select(previousSibling);
		this.tree.ensureRowIsVisible(previousSibling);
	  }
	}
  },
  scrollFocusParentNextSibling:function()
  {
	var aParentSibling = this.getParentNextSiblingIndex(this.selection.currentIndex);
	if(aParentSibling != -1)
	{
	  //this.tree.scrollToRow(aParentSibling);
	  this.selection.select(aParentSibling);
	  this.tree.ensureRowIsVisible(aParentSibling);
	}
	else
	{
	  var nextSibling = this.getNextSiblingIndex(this.selection.currentIndex);
	  if(nextSibling != -1)
	  {
		//this.tree.scrollToRow(nextSibling);
		this.selection.select(nextSibling);
		this.tree.ensureRowIsVisible(nextSibling);
	  }
	}
  },
/* selection */

  isSelectable : function(row, col){return true;},
  selectionChanged : function() { },

  selectionSave : function(forceRefresh)
  {
	if(this.selectionGoingToChange == 0 || forceRefresh)
	{
	  //garden.dump('selectionSave');
	  this.selectionGoingToChange++;
		this.selectionSelectedItems = [];
		try
		{
		  this.selectionSelectedItems = this.selectionGetSelectedItems();
		  
		} catch(e){ garden.dump('selectionSave', e, true); }
	  this.selectionGoingToChange--;
	}
  },
  
  selectionGetSelectedItems : function()
  {
	//garden.dump('selectionGetSelectedItems');
	this.selectionGoingToChange++;
	//this.selection.selectEventsSuppressed = true;
	  var selected = [];
	  var rangeCount = this.selection.getRangeCount();
	  for (var i = 0; i < rangeCount; i++)
	  {
		//garden.dump('selectionGetSelectedItemsFOR1');
		 var start = {};
		 var end = {};
		 this.selection.getRangeAt(i, start, end);
		 for(var c = start.value; c <= end.value; c++)
		 {
		  //garden.dump('selectionGetSelectedItemsFOR2');
			selected[selected.length] = this._rows[c];
		 }
	  }

	//this.selection.currentIndex = currentIndex;
	this.selectionGoingToChange--;
	//garden.dump('selectionGetSelectedItemsend');
	return selected;
  },
  selectionGetSelectedItem : function()
  {
	//garden.dump('selectionGetSelectedItem');
	this.selectionGoingToChange++;
	//this.selection.selectEventsSuppressed = true;
	  var selected = this._rows[this.selection.currentIndex];
	//this.selection.selectEventsSuppressed = false;
	this.selectionGoingToChange--;
	//garden.dump('selectionGetSelectedItemend');
	return selected;
  },
  
  selectionRestore : function(forceRefresh)
  {
	this.selectionGoingToChange++;
	if(this.selectionGoingToChange == 1 || forceRefresh)
	{
	  //garden.dump('selectionRestore');
	  this.selection.selectEventsSuppressed = true;
	  if(this.selectionSelectedItems != this.selectionGetSelectedItems())
	  {
		try
		{
			this.selection.clearSelection();
			var row;
			for(var id in this.selectionSelectedItems)
			{
			  //garden.dump('selectionRestoreFOR');
			  row = this.findRowIDFromRow(this.selectionSelectedItems[id]);
			  if(row != -1)
				this.selection.rangedSelect(row,row,true);
			}
		} catch(e){ garden.dump('selectionRestore', e, true); }
	  }
	  else
	  {
		//garden.dump('Skiping reselect selection is the same');
	  }
	  this.selection.selectEventsSuppressed = false;
	 // garden.dump('selectionRestoreend');
	}
	this.selectionGoingToChange--;

  },
  
  selectionClear : function()
  {
	//garden.dump('selectionClear');
	this.selection.selectEventsSuppressed = true;
	this.selectionSelectedItems = [];
	this.selection.clearSelection();
	this.selection.selectEventsSuppressed = false;
  },
  
  selectionClearSoft : function()
  {
	//garden.dump('selectionClearSoft');
	this.selection.selectEventsSuppressed = true;
	this.selection.clearSelection();
	this.selection.selectEventsSuppressed = false;
  },
  
/* events */

  childrenOnClick : function(event)
  {
	//garden.dump('childrenOnClick'+event.button);
	if(event.button == 2){}
	else if(event.button == 1)
	{
	  document.popupNode = null;
	  garden.gardenCommand('show-in-folder');
	  myAPI.DOM().stopEvent(event);
	}
	else
	{
	  if(this.editable && !this.getEventRowIsTwistyOrIsImage(event))
	  {
		var diff = new Date() - this.event.renameClick;
		if(diff > 200 && diff < 700 && this.event.renameItem == this.getEventRowID(event))
		{
		  try{this.event.renameTimeout.cancel();/*yeah!*/}catch(e){}
		  var tree = this;
		  this.event.renameTimeout = myAPI.timer().setTimeout(function(){tree.startEditing();}, 180);
		}
		else
		{
		  this.event.renameClick = new Date();
		  this.event.renameItem = this.getEventRowID(event);
		}
	  }
	}
	return true;
  },
  
  childrenOnDblClick : function(event)
  {
	//garden.dump('childrenOnDblClick');
	if(event.button == 2){ myAPI.DOM().stopEvent(event);return false; }
	else
	{
	  if(this.editable)
	  {
		//garden.dump('childrenOnDblClick');
		this.event.renameClick = new Date()+1000;//when dblclking two times quicly the childrenOnClick fires, when need to cheat the time in order to prevent that 
		try{this.event.renameTimeout.cancel();/*yeah!*/}catch(e){}
	  }
	  
	  var row = this.getEventRowObject(event);
	  if(row)
	  {
		if(row.isDirectory)
		{
		  
		}
		else
		{
		  document.popupNode = null;
		  garden.gardenCommand('edit');
		}
	  }
	}
	return true;
  },
  treeOnDblClick :function(event)
  {
	if(event.button == 2){ myAPI.DOM().stopEvent(event);return false; }
  },
  treeOnKeyPress : function(event)
  {
	if(event.originalTarget.tagName == 'html:input'){}
	else
	{
	  //garden.dump('keyCode:'+event.keyCode);
	  //garden.dump('which:'+event.which);
	
	  switch(event.which)
	  {
		case 32://space bar ( focus parent next sibling or next sibling )
		  {
			this.scrollFocusParentNextSibling();
			myAPI.DOM().stopEvent(event);
			break;
		  }
		case 102://CTRL F find and replace
		  {
			if(event.ctrlKey)
			{
			  document.popupNode = null;
			  garden.gardenCommand('find-replace');
			  myAPI.DOM().stopEvent(event);
			}
			break;
		  }
		case 101://CTRL E edit with komodo
		  {
			if(event.ctrlKey)
			{
			  document.popupNode = null;
			  garden.gardenCommand('show-in-folder');
			  myAPI.DOM().stopEvent(event);
			}
			break;
		  }
		case 97://CTRL A select all
		  {
			if(event.ctrlKey)
			{
			   this.selection.selectAll()
			   myAPI.DOM().stopEvent(event);
			}
			break;
		  }
		case 105://CTRL I select inverse
		  {
			if(event.ctrlKey)
			{
			   this.selection.invertSelection()
			   myAPI.DOM().stopEvent(event);
			}
			break;
		  }
		case 110://CTRL N new file
		case 116://CTRL T new file
		  {
			if(event.ctrlKey)
			{
			  document.popupNode = null;
			  garden.gardenCommand('new-file');
			  myAPI.DOM().stopEvent(event);
			}
			break;
		  }
		case 114://CTRL R soft refresh
		  {
			if(event.ctrlKey)
			{
			  document.popupNode = null;
			  garden.gardenCommand('refresh');
			  myAPI.DOM().stopEvent(event);
			}
			break;
		  }
		case 100://CTRL D duplicate
		  {
			if(event.ctrlKey)
			{
			  document.popupNode = null;
			  garden.gardenCommand('duplicate');
			  myAPI.DOM().stopEvent(event);
			}
			break;
		  }
		case 118://CTRL V paste
		  {
			if(event.ctrlKey)
			{
			  document.popupNode = null;
			  garden.gardenCommand('paste');
			  myAPI.DOM().stopEvent(event);
			}
			break;
		  }
		case 99://CTRL C copy
		  {
			if(event.ctrlKey)
			{
			  document.popupNode = null;
			  garden.gardenCommand('copy');
			  myAPI.DOM().stopEvent(event);
			}
			break;
		  }
		case 120://CTRL X cut
		  {
			if(event.ctrlKey)
			{
			  document.popupNode = null;
			  garden.gardenCommand('cut');
			  myAPI.DOM().stopEvent(event);
			}
			break;
		  }
		case 111://CTRL O open
		  {
			if(event.ctrlKey)
			{
			  document.popupNode = null;
			  garden.gardenCommand('open-from-tree');
			  myAPI.DOM().stopEvent(event);
			}
			break;
		  }
		default:
		  {
			garden.dump('which:'+event.which);
		  }
	  }
	  switch(event.keyCode)
	  {
		case 8://back on history <-- key
		  {
			if(!this.historyGoBack())
			  this.baseGoUp();
			myAPI.DOM().stopEvent(event);
			break;
		  }
		case 37://alt + left arrow
		  {
			if(event.altKey)
			  this.historyGoBack();
			myAPI.DOM().stopEvent(event);
			break;
		  }
		case 38://alt + up arrow
		  {
			if(event.altKey)
			  this.baseGoUp();
			myAPI.DOM().stopEvent(event);
			break;
		  }
		case 40://alt + down arrow
		  {
			if(event.altKey)
			  this.historyGoBack();
			myAPI.DOM().stopEvent(event);
			break;
		  }
		case 39://alt + rigth arrow
		  {
			if(event.altKey)
			  this.historyGoForward();
			myAPI.DOM().stopEvent(event);
			break;
		  }
		case 113://F2 rename
		  {
			if(this.editable)
			  this.startEditing();
			myAPI.DOM().stopEvent(event);
			break;
		  }
		case 116://F5 reload
		  {
			this.selectionGoingToChange++;
			this.selectionSave();
			  this.scrollSave();
				this.reload();
			  this.scrollRestore();
			this.selectionGoingToChange--;
			this.selectionRestore();
			break;
		  }
		case 46://delete
		  {
			document.popupNode = null;
			if(event.shiftKey)
			  garden.gardenCommand('delete');
			else
			  garden.gardenCommand('trash');
			break
		  }
		case 27://escape ( focus Parent folder or previous sibling )
		  {
			this.scrollFocusParent();
			myAPI.DOM().stopEvent(event);
			break;
		  }
		case 13://enter
		  {
			if(event.ctrlKey)
			{
			  document.popupNode = null;
			  myAPI.timer().setTimeout(function(){ garden.gardenCommand('open-from-tree');}, 30);
			  myAPI.DOM().stopEvent(event);
			  return false;
			}
			else
			{
			  document.popupNode = null;
			  myAPI.timer().setTimeout(function(){ garden.gardenCommand('edit-from-tree');}, 30);
			  myAPI.DOM().stopEvent(event);
			  return false;
			}
			break;
		  }
		case 114://F3
		  {
			document.popupNode = null;
			garden.gardenCommand('find-replace');
			myAPI.DOM().stopEvent(event);
			break;
		  }
		default:
		  {
			garden.dump('keyCode:'+event.keyCode);
		  }
	  }
	}
	return true;
  },

  drop : function(row, orientation, dataTransfer){ garden.dump('drop');return false;},
  canDrop : function(index, orientation, dataTransfer){ garden.dump('canDrop');return false;},

  treeOnDragStart : function(event){ garden.dump('treeOnDragStart'); return false},
  treeOnDragOver : function(event){ garden.dump('treeOnDragOver'); return false},
  treeOnDragEnter : function(event){ garden.dump('treeOnDragEnter'); return false},
  treeOnDrop : function(event){ garden.dump('treeOnDrop'); return false},
  treeOnDragDrop : function(event){ garden.dump('treeOnDragDrop'); return false},
  treeOnDragExit : function(event){ garden.dump('treeOnDragExit'); return false},
  
  childrenOnDragStart : function(event){ garden.dump('childrenOnDragStart'); return false},
  childrenOnDragOver : function(event){  garden.dump('childrenOnDragOver'); return false},
  childrenOnDragEnter : function(event){ garden.dump('childrenOnDragEnter');  return false},
  childrenOnDrop : function(event){garden.dump('childrenOnDrop');  return false},
  childrenOnDragDrop : function(event){garden.dump('childrenOnDragDrop');  return false},
  childrenOnDragExit : function(event){garden.dump('childrenOnDragExit');  return false},
  
/* controller */

  treeOperationsQueue : function(aFunction)
  {
	//garden.dump('treeOperationsQueue');
	if(!aFunction)
	{
	  if(this.operationsQueue.length)
		this.operationsQueue.pop()();
	  else
	  {
		//garden.dump('treeOperationsQueue:serializedSessionSet');
		if(this.serializedSessionSetTimer)
		  this.serializedSessionSetTimer.cancel();
		
		var tree = this;
		this.serializedSessionSetTimer = myAPI.timer().setTimeout(
												  function(){
													tree.sessionSave();
													tree.instance.sessionSave();
		}, 200);
	  }
	}
	else
	{
	  this.operationsQueue[this.operationsQueue.length] = aFunction;
	}
	//garden.dump('treeOperationsQueue:end');
  },

/* session */

  sessionSave:function()
  {
	garden.shared.session.set(
							'tree.'+this.treeID,
							{
							  _rows:this._rows,
							  _rowsStates:this._rowsStates,
							  currentPath:this.currentPath
							}
						  );
  },
  sessionRemove:function()
  {
	garden.shared.session.remove('tree.'+this.treeID);
  },
/* navigation */
  
  baseChange : function(aPath, addToHistory)
  {
	aPath = aPath.replace(/\/+$/, '').replace(/\\+$/, '');
	
	if(aPath == '')
	  aPath = this.instance.__DS;
	  
	if(aPath != this.currentPath)
	{
	  if(addToHistory)
		this.history.change(this.currentPath);
		
	  this.currentPath = aPath;
	  	  
	  if(this.tree)//if the tree was created
		this.removeChilds();
	  
	  var aData = {}
		  aData.aLevel = 0;
		  aData.path = this.currentPath;
		  aData.aParentRow = -1;
		  aData.treeID = this.treeID;
	  var treeView = this;
		  aData.aFunction = function(aData){ treeView.onDataReceived(aData);};
		  
	  this.instance.directoryList(aData, garden.shared.pref('no.hidden.items'));
	  return true;
	}
	return false;
  },
  historyGoBack:function()
  {
	if(this.history.canGoBack())
	{
	  this.baseChange(this.history.goBack(this.currentPath));
	  return true;
	}
	return false;
  },
  historyGoForward:function()
  {
	if(this.history.canGoForward())
	{
	  this.baseChange(this.history.goForward(this.currentPath));
	  return true;
	}
	return false;
  },
  baseGoUp:function()
  {
	if(this.baseCanGoUp())
	{
	  var parentPath = this.currentPath.split(this.instance.__DS);
		  parentPath.pop();
		  parentPath = parentPath.join(this.instance.__DS);
	  
	  if(parentPath == '')
		parentPath = this.instance.__DS;
		
	  if(parentPath != this.currentPath)
	  {
		this.baseChange(parentPath, true);
		return true;
	  }
	  return false;
	}
	return false;
  },
  baseCanGoUp:function()
  {
	if(
	   this.currentPath == this.instance.__DS ||
	   this.currentPath == this.instance.__DS+this.instance.__DS ||
	   // C:
	   this.currentPath.indexOf(this.instance.__DS) == -1 ||
	   //network \\titook
	   (
		this.currentPath.indexOf(this.instance.__DS+this.instance.__DS) == 0 &&
		myAPI.string().subStrCount(this.currentPath, this.instance.__DS) == 3
	   )
	)
	  return false;
	var parentPath = this.currentPath.split(this.instance.__DS);
		parentPath.pop();
		parentPath = parentPath.join(this.instance.__DS);
	
	if(parentPath == '')
	  parentPath = this.instance.__DS;
	  
	if(parentPath != this.currentPath)
	  return true;
	else
	  return false;
  },
  get currentPathTitle()
  {
	var currentPath = this.currentPath.split(this.instance.__DS).pop();
		if(!currentPath || currentPath == '')
		  currentPath = this.instance.label+''+this.instance.__DS;
	return currentPath;
  },
  
/* refresh */

  reload :function()
  {
	this.instance.sessionRemove();
	this.instance.cleanCacheListings();
	this.instance.cleanCacheModified();
	this.sessionRemove();
	
	var currentPath = this.currentPath;
	this.currentPath = '';
	this.baseChange(currentPath);
	//garden.dump('reload:end');
  },
  refreshPath:function(aPath)
  {
	var listings = this.instance.listings;
	for(var id in listings)
	{
	  if(aPath == id || id.indexOf(aPath+this.instance.__DS) === 0)
		this.instance.listings[id] = {};
	}
	
	var aRow = this.findRowIDFromPath(aPath);
	if(aRow != -1)
	{
	  var aRowState = this.getRowStateFromID(this._rows[aRow].id);
	  
	  if(aRowState.isContainerOpen)
	  {
		aRowState.isContainerOpen = false;
		this.toggleOpenState(aRow);
	  }
	}
	else
	{
	  this.reload();
	}
  },
  
/* editing */
  
  isEditable : function(row, col){return this.event.renaming;},
  
  setCellText : function(row, col, value)
  {
	//garden.dump('setCellText');
	if(this.editable && this._rows[row].name != value)
	{
	  var aData = {}
		  aData.path = this._rows[row].path;
		  aData.newName = value;
		  aData.isDirectory = this._rows[row].isDirectory;
	  document.popupNode = null;
	  garden.gardenCommand('rename', aData);
	}
	//garden.dump('setCellTextend');
  },
  
  startEditing : function()
  {
	//garden.dump('startEditing');
	var selectedItems = this.selectionGetSelectedItems();
	if(selectedItems.length === 1)
	{
	  this.event.renaming = true;
	 
	  //hack hack hack avoids tree autoresizing when editing
	  //var height =  this.treeElement.getAttribute('height');
	  //var width =  this.treeElement.getAttribute('width');

	  //set the field to editing state
	  this.treeElement.startEditing(this.selection.currentIndex, this.tree.columns.getColumnAt(0));
	  //avoid the text input overlay the tree scrollbar drawing a white bar
	  this.treeElement.inputField.width = this.treeElement.inputField.width-18;
	  //hack hack hack avoids tree autoresizing when editing
	  //this.treeElement.setAttribute('height', height);
	  //this.treeElement.setAttribute('width', width);

	  this.event.renaming = false;
	}
	else if(selectedItems.length > 1)
	{
	  //garden.s.notifyStatusBar(window, 'Can\'t rename multiples items at the same time');
	}
  },
  
/* properties */

  getImageSrc : function(i, col){
	if(!this._rows[i].isDirectory && !garden.shared.hasCustomIcon(this._rows[i].extension))
	  return "moz-icon://n." + this._rows[i].extension + "?size=16";
  },
  getColumnProperties : function(col,properties){},
  getRowProperties : function(row,properties){},
  getCellProperties : function(i,col,properties)
  {
	var rowObject = this._rows[i];
	var rowState = this.getRowStateFromID(rowObject.id);
	
	//loading
	  if(rowState.isBusy && this.instance.object.shouldShowLoading)
		properties.AppendElement(garden.shared.mAtomIconBusy);
	  
	//nice extension icon
	  else if(!rowObject.isDirectory && rowObject.extension != '')
		properties.AppendElement(myAPI.tree().atom('g'+rowObject.extension));
		
	/*icons based on item name*/
	  if(rowObject.isDirectory){}
	  else
	  {
		switch(rowObject.name)
		{
		  case 'todo.txt':
		  case 'todo':
		  case 'TODO':
		  {
			properties.AppendElement(myAPI.tree().atom('todo'));
			break;
		  }
		}
	  }
	  
	/*labels*/
	  if(rowObject.isHidden)
		properties.AppendElement(garden.shared.mAtomIconHidden);
	  if(rowObject.isSymlink)
		properties.AppendElement(garden.shared.mAtomIconSymlink);
	  if(!rowObject.isWritable)
		properties.AppendElement(garden.shared.mAtomIconUnWritable);
	  if(!rowObject.isReadable || rowState.unreadable)
		properties.AppendElement(garden.shared.mAtomIconUnReadable);
	
	/* Extensible getCellProperties */
	  var aData = {};
		  aData.originalTarget = rowObject;
		  aData.properties = properties;
		  aData.appendAtom = function(aProperty){ this.properties.AppendElement(myAPI.tree().atom(aProperty)); };
	  gardenAPI.dispatchEvent('onPropertiesRequired', aData);
  },
  
/* something */

  getParentIndex : function(i)
  {
	var aLevel = this.getLevel(i);
	while(--i >= 0 && this.getLevel(i) >= aLevel){}
	return i;
  },
  getParentNextSiblingIndex : function(i)
  {
	var aParentI = this.getParentIndex(i);
	if(aParentI == -1)
	  return -1;
	var aLevel = this.getLevel(aParentI);
	var rowCount = this.rowCount;
	while(++i < rowCount && this.getLevel(i) != aLevel){}
	if(this._rows[i])
		return i;
	else
	  return -1;
  },
  getPreviousSiblingIndex:function(i)
  {
	var aLevel = this.getLevel(i);
	while(--i >= 0 && this.getLevel(i) != aLevel){}
	return i;
  },
  getNextSiblingIndex:function(i)
  {
	var aLevel = this.getLevel(i);
	var rowCount = this.rowCount;
	while(++i < rowCount && this.getLevel(i) != aLevel){}
	if(this._rows[i])
		return i;
	else
	  return -1;
  },
  hasNextSibling : function(i, afterIndex)
  {
	var aLevel = this.getLevel(i);
	var rowCount = this.rowCount;
	i = afterIndex;
	while(++i < rowCount && this.getLevel(i) > aLevel){}
	if(this._rows[i] && this.getLevel(i) == aLevel)
	  return true;
	else
	  return false;
  },
  
  setTree : function(tree){this.tree = tree;},
  
  setCellValue : function(row, col,value){garden.dump('setCellValue');},
  getCellValue : function(row, col){},
  getCellText : function(i, col){return this._rows[i].name;},
  getProgressMode : function(row, col){garden.dump('getProgressMode');return 0;},
  getLevel : function(i){return this.getRowStateFromID(this._rows[i].id).aLevel;},
  
  isSeparator : function(row){return false;},
  isSorted : function(){return true;},
  isContainer : function(i){return this._rows[i].isDirectory;},
  isContainerOpen : function(i){return this.getRowStateFromID(this._rows[i].id).isContainerOpen;},
  isContainerOpenFromPathID : function(aPathID)
  {
	return this.getRowStateFromID(aPathID).isContainerOpen;
  },
  isContainerEmpty : function(i){return this.getRowStateFromID(this._rows[i].id).isContainerEmpty;},
  
  cycleCell : function(row, col){garden.dump('cycleCell');},
  cycleHeader : function(col){garden.dump('cycleHeader');},
  
  performAction : function(action){garden.dump('performAction');},
  performActionOnCell : function(action, row, col){garden.dump('performActionOnCell');},
  performActionOnRow : function(action, row){garden.dump('performActionOnRow');},
  
  get rowCount(){/*garden.dump('rowCount:'+this._rows.length);*/return this._rows.length;}
}