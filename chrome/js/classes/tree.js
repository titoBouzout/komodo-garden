
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
	  this._listeners = [];
	  this.tree = null;
	
	/* navigation */
	
	  this.history = new garden.s.history();
	  
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
  },
  
/* listeners */

  addEventListener : function(aEvent, aFunction)
  {
	//garden.s.dump('addEventListener:aEvent:'+aEvent);
	//garden.s.dump('addEventListener:aFunction:', aFunction);
	if(!this._listeners[aEvent])
	  this._listeners[aEvent] = [];
	this._listeners[aEvent][this._listeners[aEvent].length] = aFunction;
  },
  removeEventListener : function(aEvent, aFunction)
  {
	//garden.s.dump('removeEventListener:aEvent:'+aEvent);
	//garden.s.dump('removeEventListener:aFunction:', aFunction);
	aFunction = aFunction.toSource();
	if(this._listeners[aEvent])
	{
	  for(var id in this._listeners[aEvent])
	  {
		if(this._listeners[aEvent][id].toSource() == aFunction.toSource())
		{
		  delete this._listeners[aEvent][id];
		  break;
		}
	  }
	}
  },
  dispatchEvent : function(aEvent, aData)
  {
	//garden.s.dump('dispatchEvent:aEvent:'+aEvent);
	//garden.s.dump('dispatchEvent:aData:', aData);
	if(this._listeners[aEvent])
	{
	  for(var id in this._listeners[aEvent])
	  {
		this._listeners[aEvent][id](aData);
	  }
	}
  },
  
/*find rows and rows data*/

  findRowIDFromRow : function(aRow)
  {
	//garden.s.dump('findRowIDFromRow');
	var rowID = aRow.id;
	for(var i in this._rows)
	{
	  if(this._rows[i].id == rowID)
		return parseInt(i);
	}
	return -1;
  },
  findRowByPath : function(aRowPath)
  {
	//garden.s.dump('findRowByPath');
	for(var i in this._rows)
	{
	  //garden.s.dump('findRowByPathFOR');
	  if(this._rows[i].path  == aRowPath)
		return parseInt(i);
	}
	return -1;
  },
  getRowStateFromID:function(aRowID)
  {
	//garden.s.dump('getRowStateFromID');
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
	//garden.s.dump('getEventRowObject');
	var i = this.getEventRowID(event);
	if(i === false)
	  return false;
	else
	  return this._rows[i];
  },
  getEventRowID : function(event)
  {
	//garden.s.dump('getEventRowID');
	var row = {};
	this.tree.getCellAt(event.pageX, event.pageY, row, {},{});
	return row.value;
  },
  getEventRowIsTwistyOrIsImage :function(event)
  {
	//garden.s.dump('getEventRowIsTwistyOrIsImage');
	var part = {};
	this.tree.getCellAt(event.pageX, event.pageY, {}, {}, part);
	if(part.value && ( part.value == 'twisty' ||  part.value == 'image' ))
	  return true;
	else
	  return false;
  },
  getEventColumn : function(event)
  {
	//garden.s.dump('getEventColumn');
	var column = {};
	this.tree.getCellAt(event.pageX, event.pageY, {}, column, {});
	return column;
  },


/* inserting rows  */

  onDataReceived : function(aData)
  {
	//garden.s.dump('onDataReceived');
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
	  //garden.s.dump('aParentRow != -1');
	  var aParentRowI = this.findRowIDFromRow(aParentRow);
	  //the parentRow was closed/removed
	  if(aParentRowI == -1)
	  {
		//garden.s.dump('aParentRow was removed from the tree');
		this.iterations--;
		this.treeOperationsQueue();
		//garden.s.dump('onDataReceivedend');
		return;
	  }
		
	  var aParentRowState = this.getRowStateFromID(aParentRow.id);
		  aParentRowState.isBusy = false;
		  aParentRowState.isContainerOpen = true;
		  aParentRowState.isLoading = false;	
	  
	  if(!aRows || aRows.length <1)
	  {
		//garden.s.dump('aParentRow has no childs');
		aParentRowState.isContainerEmpty = true;
		if(!aRows)
		  aParentRowState.unreadable = true;
		this.selectionGoingToChange++;
		
		  try{
			this.tree.invalidateRow(aParentRowI);
		  }catch(e){
			garden.s.dump('onDataReceived:1:', e, true);
		  }
		  
		this.selectionGoingToChange--;
		this.iterations--;
		this.treeOperationsQueue();
		//garden.s.dump('onDataReceivedend');
		return;
	  }
	  
	  this.selectionGoingToChange++;
	  
		try{
		  this.tree.invalidateRow(aParentRowI);
		}catch(e){
		  garden.s.dump('onDataReceived:2:', e, true);
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
		//garden.s.dump('onDataReceivedend');
		return;
	  }
	  var aParentRowI = 0;
	}
	
	//garden.s.dump('aParentRowI is'+aParentRowI);
	
	this.selectionGoingToChange++;
	
	//add new rows;
	  try
	  {
		var b=1;
		for(var id in aRows)
		{
		  this.getRowStateFromID(aRows[id].id).aLevel = aLevel;
		  //garden.s.dump('insert of new child '+aRows[id].path+' into position'+(aParentRowI + b));
		  this._rows.splice(aParentRowI + b, 0, aRows[id]);
		  b++;
		}
		
		this.scrollSave();
		
		  this.tree.rowCountChanged(aLevel, aRows.length);
		  //garden.s.dump('onDataReceived:thisLevel:'+aLevel+':aRows.length:'+aRows.length);
		this.scrollRestore();
		
		//restoring folding
		for (var id in aRows)
		{
		  //garden.s.dump('onDataReceivedFOR3');
		  var aRowState = this.getRowStateFromID(aRows[id].id);
		  if(aRowState.isContainerOpen || aRowState.isLoading)
		  {
			aRowState.isContainerOpen = false;
			this.toggleOpenState(-1, aRows[id]);
		  }
		}
		
	  }catch(e) { garden.s.dump('onDataReceived:3:', e, true); }
	
	this.selectionGoingToChange--;
	this.selectionRestore();
	this.iterations--;
	this.treeOperationsQueue();
	//garden.s.dump('onDataReceivedend');
  },
  toggleOpenState : function(aParentRowI, aParentRow)
  {
	//garden.s.dump('toggleOpenState');
	
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
	  //garden.s.dump('toggleOpenState:element was removed');
	  this.iterations--;
	  this.treeOperationsQueue();
	  return;
	}
	
	var aParentRowState = this.getRowStateFromID(aParentRow.id);
	
	if(aParentRowState.isContainerOpen)
	{
	  //garden.s.dump('toggleOpenState:container is open');
		aParentRowState.isContainerOpen = false;
		
		this.selectionGoingToChange++;
	
		  try{
			this.removeNextLevel(aParentRowI);
		  } catch(e) {
			garden.s.dump('toggleOpenState:1:', e, true);
		  }
			
		this.selectionGoingToChange--;
	  
	  this.selectionRestore();
	  this.iterations--;
	  this.treeOperationsQueue();
	}
	else
	{
	  //garden.s.dump('toggleOpenState:container is closed');
		  
		  aParentRowState.isBusy = true;
		  aParentRowState.isLoading = true;
	  
	  this.selectionGoingToChange++;
	  
		try{
		  this.tree.invalidateRow(aParentRowI);
		} catch(e) {
		  garden.s.dump('toggleOpenState:2:', e, true);
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
		  
	  this.instance.directoryList(aData);
	}
  },
  

/* removing rows */

  removeNextLevel : function(i)
  {
	//garden.s.dump('removeNextLevel');
	try
	{
	  //garden.s.dump('removeNextLevel:removing next level on row:'+row);
	  i = parseInt(i);
	  
	  var aLevel = this.getLevel(i);
	  var deleteCount = 0;
	  i++;
	  for (var n = i; n < this.rowCount; n++) {
		//garden.s.dump('removeNextLevelFOR');
		  if (this.getLevel(n) > aLevel)
			deleteCount++;
		  else
			break;
	  }
	  if (deleteCount)
	  {
		//garden.s.dump('removeNextLevel:delte count :'+deletecount);
		this.scrollSave();
		
		this._rows.splice(i, deleteCount);
		this.tree.invalidateRow(--i);
		this.tree.rowCountChanged(aLevel, -deleteCount);
		//garden.s.dump('removeNextLevel:thisLevel:'+aLevel+'deletecount:'+deleteCount);
		
		this.scrollRestore();
	  }
	} catch(e) { garden.s.dump('removeNextLevel:', e, true); }
  },

  removeChilds : function()
  {
	//garden.s.dump('removeChilds');
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
		  //garden.s.dump('removeChilds:level:'+0+':length:'+length);
		}catch(e) { garden.s.dump('removeChilds:', e, true); }
		
	  this.selectionGoingToChange--;
	  
	this.iterations--;
	this.treeOperationsQueue();
  },
  
  
  
  
  /*asdasd*/
  removeRowByPath : function(aPath)
  {
	garden.s.dump('removeRowByPath');
	if(this.iterations != 0)//queue
	{
	  var tree = this;
	  this.treeOperationsQueue(function(){tree.removeRowByPath(aPath);});
	  return;
	}
	
	this.iterations++;
	this.selectionGoingToChange++;
	
	  var aRowID = this.findRowByPath(aPath);
	  if(aRowID != -1)
	  {
		aParentRowID = -1;
		if(!this._rows[aRowID].aParentRow)
		{
		  //garden.s.dump(aRowID+' no tiene parent row');
		}
		else
		{
		  aParentRowID = this.findRowIDFromRow(this._rows[aRowID].aParentRow);
		}
		
		this.removeNextLevel(aRowID);
		
		var aLevel = this._rows[aRowID].aLevel;
		this._rows.splice(aRowID, 1);
		var firstVisible = this.tree.getFirstVisibleRow();
	
		if(aParentRowID != -1)
		  this.tree.invalidateRow(aParentRowID);
		this.tree.rowCountChanged(aLevel, -1);
		garden.s.dump('removeRowByPath:thisLevel:'+aLevel+':length:-1');
		this.tree.scrollToRow(firstVisible); 
	  }
	  
	this.selectionGoingToChange--;
	this.selectionClear();
	this.iterations--;
	this.treeOperationsQueue();
  },
  
  insertRow : function(aRow)
  {
	garden.s.dump('insertRow');
	if(this.iterations != 0)//queue
	{
	  var tree = this;
	  this.treeOperationsQueue(function(){tree.insertRow(aRow);});
	  return;
	}
	
	this.iterations++;
	
	//look if the parent is on the tree
	if(typeof(aRow.aParentRow) != 'undefined' && aRow.aParentRow != -1 )
	{
	  var row = this.findRowIDFromRow(aRow.aParentRow);
	  //the parentRow was closed/removed
	  if(row == -1)
	  {
		this.iterations--;
		this.treeOperationsQueue();
		return;
	  }
	}
	else
	{
	  var row = 0;
	}
	
	this.selectionGoingToChange++;
	  
	  try
	  {
		var thisLevel = aRow.aLevel;
	
		if(thisLevel > 0)
		  row++;
		//then where to insert the row?
		for (var t = row; t < this._rows.length; t++)
		{
		  garden.s.dump('insertRowFOR');
		  if (this._rows[t].aLevel > thisLevel){}//not in a subfolder
		  else if (this._rows[t].aLevel < thisLevel)//break if we are in a sibling folder
			break;
		  else if (aRow.isDirectory == this._rows[t].isDirectory && garden.s.sortLocale(this._rows[t].name.toLowerCase(), aRow.name.toLowerCase()) > 0)//found the position?
			break;
		  row++;
		}
		
		//insert the row
		this._rows.splice(row, 0, aRow);
	
		//keep scroll
		var visibleFirst = this.tree.getFirstVisibleRow();
		this.tree.rowCountChanged(aRow.aLevel, +1);
		garden.s.dump('insertRow:thisLevel:'+aRow.aLevel+':length:+1');

		this.tree.scrollToRow(visibleFirst);
		
	  }catch(e) { garden.s.dump('onDataReceived:3:', e, true); }
	
	this.selectionGoingToChange--;
	//reselect
	this.selectionRestore();
	this.iterations--;
	this.treeOperationsQueue();
  },
  

/* scolling */

  scrollSave :function()
  {
	this.firstVisibleRow = this.tree.getFirstVisibleRow();
  },
  scrollRestore :function()
  {
	this.tree.scrollToRow(this.firstVisibleRow);
  },
  
/* selection */

  isSelectable : function(row, col){return true;},
  selectionChanged : function() { },

  selectionSave : function(forceRefresh)
  {
	if(this.selectionGoingToChange == 0 || forceRefresh)
	{
	  //garden.s.dump('selectionSave');
	  this.selectionGoingToChange++;
		this.selectionSelectedItems = [];
		try
		{
		  this.selectionSelectedItems = this.selectionGetSelectedItems();
		  
		} catch(e){ garden.s.dump('selectionSave', e, true); }
	  this.selectionGoingToChange--;
	}
  },
  
  selectionGetSelectedItems : function()
  {
	//garden.s.dump('selectionGetSelectedItems');
	this.selectionGoingToChange++;
	//this.selection.selectEventsSuppressed = true;
	  var selected = [];
	  var rangeCount = this.selection.getRangeCount();
	  var currentIndex = -1;
	  for (var i = 0; i < rangeCount; i++)
	  {
		//garden.s.dump('selectionGetSelectedItemsFOR1');
		 var start = {};
		 var end = {};
		 this.selection.getRangeAt(i, start, end);
		 for(var c = start.value; c <= end.value; c++)
		 {
		  //garden.s.dump('selectionGetSelectedItemsFOR2');
			if(currentIndex === -1)
			  this.selection.currentIndex = c;
			selected[selected.length] = this._rows[c];
		 }
	  }
	//this.selection.selectEventsSuppressed = false;
	this.selectionGoingToChange--;
	//garden.s.dump('selectionGetSelectedItemsend');
	return selected;
  },
  
  selectionGetSelectedItem : function()
  {
	//garden.s.dump('selectionGetSelectedItem');
	this.selectionGoingToChange++;
	//this.selection.selectEventsSuppressed = true;
	  var selected = this._rows[this.selection.currentIndex];
	//this.selection.selectEventsSuppressed = false;
	this.selectionGoingToChange--;
	//garden.s.dump('selectionGetSelectedItemend');
	return selected;
  },
  
  selectionRestore : function(forceRefresh)
  {
	this.selectionGoingToChange++;
	if(this.selectionGoingToChange == 1 || forceRefresh)
	{
	  //garden.s.dump('selectionRestore');
	  this.selection.selectEventsSuppressed = true;
	  if(this.selectionSelectedItems != this.selectionGetSelectedItems())
	  {
		try
		{
			this.selection.clearSelection();
			var row;
			for(var id in this.selectionSelectedItems)
			{
			  //garden.s.dump('selectionRestoreFOR');
			  row = this.findRowIDFromRow(this.selectionSelectedItems[id]);
			  if(row != -1)
				this.selection.rangedSelect(row,row,true);
			}
		} catch(e){ garden.s.dump('selectionRestore', e, true); }
	  }
	  else
	  {
		//garden.s.dump('Skiping reselect selection is the same');
	  }
	  this.selection.selectEventsSuppressed = false;
	 // garden.s.dump('selectionRestoreend');
	}
	this.selectionGoingToChange--;

  },
  
  selectionClear : function()
  {
	//garden.s.dump('selectionClear');
	this.selection.selectEventsSuppressed = true;
	this.selectionSelectedItems = [];
	this.selection.clearSelection();
	this.selection.selectEventsSuppressed = false;
  },
  
  selectionClearSoft : function()
  {
	//garden.s.dump('selectionClearSoft');
	this.selection.selectEventsSuppressed = true;
	this.selection.clearSelection();
	this.selection.selectEventsSuppressed = false;
  },
  
/* events */

  childrenOnClick : function(event)
  {
	//garden.s.dump('childrenOnClick');
	if(event.button == 2){}
	else
	{
	  if(this.editable && !this.getEventRowIsTwistyOrIsImage(event))
	  {
		var diff = new Date() - this.event.renameClick;
		if(diff > 200 && diff < 700 && this.event.renameItem == this.getEventRowID(event))
		{
		  try{this.event.renameTimeout.cancel();/*yeah!*/}catch(e){}
		  var tree = this;
		  this.event.renameTimeout = garden.s.timerAdd(180, function(){tree.startEditing();});
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
	//garden.s.dump('childrenOnDblClick');
	if(event.button == 2){}
	else
	{
	  if(this.editable)
	  {
		//garden.s.dump('childrenOnDblClick');
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
		  garden.gardenCommand('open');
		}
	  }
	}
	return true;
  },
  
  treeOnKeyPress : function(event)
  {
	if(event.originalTarget.tagName == 'html:input'){}
	else
	{
	  switch(garden.s.eventKeyCode(event))
	  {
		case 8://back on history <-- key
		  {
			if(!this.historyGoBack())
			  this.baseGoUp();
			garden.s.stopEvent(event);
			break;
		  }
		case 27://escape ( this should focus previous folder )
		  {
			garden.gardenCommand('focusPreviousFolderParentLevel');
			garden.s.stopEvent(event);
			break;
		  }
		case 37://alt + left arrow
		  {
			if(event.altKey)
			  this.historyGoBack();
			garden.s.stopEvent(event);
			break;
		  }
		case 38://alt + up arrow
		  {
			if(event.altKey)
			  this.baseGoUp();
			garden.s.stopEvent(event);
			break;
		  }
		case 40://alt + down arrow
		  {
			if(event.altKey)
			  this.historyGoBack();
			garden.s.stopEvent(event);
			break;
		  }
		case 39://alt + rigth arrow
		  {
			if(event.altKey)
			  this.historyGoForward();
			garden.s.stopEvent(event);
			break;
		  }
		case 113://F2 rename
		  {
			if(this.editable)
			  this.startEditing();
			garden.s.stopEvent(event);
			break;
		  }
		case 116://F5 refresh
		  {
			this.refreshHard();
			break;
		  }
		case 13://open
		  {
			garden.gardenCommand('open-from-tree');
			break;
		  }
		case 102://CTRL F
		  {
			if(event.ctrlKey)
			{
			 garden.gardenCommand('find');
			 garden.s.stopEvent(event);
			}
			break;
		  }
		case 46://delete
		  {
			garden.gardenCommand('delete');
			break
		  }
		case 32://space bar ( focus next folder )
		  {
			garden.gardenCommand('focusNextFolderSameLevel');
			break;
		  }
		default:
		  {
			garden.s.dump(garden.s.eventKeyCode(event));
		  }
	  }
	}
  },


  drop : function(row, orientation, dataTransfer){ garden.s.dump('drop');return false;},
  canDrop : function(index, orientation, dataTransfer){ garden.s.dump('canDrop');return false;},

  treeOnDragStart : function(event){ garden.s.dump('treeOnDragStart'); return false},
  treeOnDragOver : function(event){ garden.s.dump('treeOnDragOver'); return false},
  treeOnDragEnter : function(event){ garden.s.dump('treeOnDragEnter'); return false},
  treeOnDrop : function(event){ garden.s.dump('treeOnDrop'); return false},
  treeOnDragDrop : function(event){ garden.s.dump('treeOnDragDrop'); return false},
  treeOnDragExit : function(event){ garden.s.dump('treeOnDragExit'); return false},
  
  childrenOnDragStart : function(event){ garden.s.dump('childrenOnDragStart'); return false},
  childrenOnDragOver : function(event){  garden.s.dump('childrenOnDragOver'); return false},
  childrenOnDragEnter : function(event){ garden.s.dump('childrenOnDragEnter');  return false},
  childrenOnDrop : function(event){garden.s.dump('childrenOnDrop');  return false},
  childrenOnDragDrop : function(event){garden.s.dump('childrenOnDragDrop');  return false},
  childrenOnDragExit : function(event){garden.s.dump('childrenOnDragExit');  return false},
  
/* controller */

  treeOperationsQueue : function(aFunction)
  {
	//garden.s.dump('treeOperationsQueue');
	if(!aFunction)
	{
	  if(this.operationsQueue.length)
		this.operationsQueue.pop()();
	  else
	  {
		//garden.s.dump('treeOperationsQueue:serializedSessionSet');
		if(this.serializedSessionSetTimer)
		  this.serializedSessionSetTimer.cancel();
		
		var tree = this;
		this.serializedSessionSetTimer = garden.s.timerAdd(200,
												  function(){
													tree.sessionSave();
													tree.instance.sessionSave();
		});
	  }
	}
	else
	{
	  this.operationsQueue[this.operationsQueue.length] = aFunction;
	}
	//garden.s.dump('treeOperationsQueue:end');
  },

/* session */
  sessionSave:function()
  {
	garden.s.serializedSessionSet(
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
	garden.s.serializedSessionRemove('tree.'+this.treeID);
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
	  	  
	  this.removeChilds();
	  
	  var aData = {}
		  aData.aLevel = 0;
		  aData.path = this.currentPath;
		  aData.aParentRow = -1;
		  aData.treeID = this.treeID;
	  var treeView = this;
		  aData.aFunction = function(aData){ treeView.onDataReceived(aData);};
		  
	  this.instance.directoryList(aData);
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
		garden.s.subStrCount(this.currentPath, this.instance.__DS) == 3
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
  get currentPathTitle function()
  {
	var currentPath = this.currentPath.split(this.instance.__DS).pop();
		if(!currentPath || currentPath == '')
		  currentPath = this.instance.name+''+this.instance.__DS;
	return currentPath;
  },
  refreshHard :function()
  {
	this.instance.sessionRemove();
	this.instance.cleanCacheListings();
	this.instance.cleanCacheModified();
	this.sessionRemove();
	
	var currentPath = this.currentPath;
	this.currentPath = '';
	this.baseChange(currentPath);
	//garden.s.dump('refreshHard:end');
  },
  
/* editing */
  
  isEditable : function(row, col){return this.event.renaming;},
  
  setCellText : function(row, col, value)
  {
	//garden.s.dump('setCellText');
	if(this.editable && this._rows[row].name != value)
	{
	  var aData = {}
		  aData.path = this._rows[row].path;
		  aData.newName = value;
		  aData.isDirectory = this._rows[row].isDirectory;
	  garden.gardenCommand('renameFromTree', aData);
	}
	//garden.s.dump('setCellTextend');
  },
  
  startEditing : function()
  {
	//garden.s.dump('startEditing');
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
	  garden.s.notifyStatusBar(window, 'Can\'t rename multiples items at the same time');
	}
  },
  
/* properties */


  getImageSrc : function(i, col){
	if(!this._rows[i].isDirectory && !garden.s.hasCustomIcon(this._rows[i].extension))
	  return "moz-icon://name." + this._rows[i].extension + "?size=16";
  },
  getColumnProperties : function(col,properties){},
  getRowProperties : function(row,properties){},
  getCellProperties : function(i,col,properties)
  {
	var rowObject = this._rows[i];
	var rowState = this.getRowStateFromID(rowObject.id);
	if(rowState.isBusy)
	  properties.AppendElement(garden.s.mAtomIconBusy);
	else if(!rowObject.isDirectory && rowObject.extension != '')
	  properties.AppendElement(garden.s.getAtom('g'+rowObject.extension));
	if(rowObject.isHidden)
	  properties.AppendElement(garden.s.mAtomIconHidden);
	if(rowObject.isSymlink)
	  properties.AppendElement(garden.s.mAtomIconSymlink);
	if(!rowObject.isWritable)
	  properties.AppendElement(garden.s.mAtomIconUnWritable);
	if(!rowObject.isReadable || rowState.unreadable)
	  properties.AppendElement(garden.s.mAtomIconUnReadable);
	  
	if(rowObject.isDirectory)
	{
	  
	}
	else
	{
	  switch(rowObject.name)
	  {
		case 'todo.txt':
		case 'todo':
		case 'TODO':
		{
		  properties.AppendElement(garden.s.getAtom('todo'));
		  break;
		}
	  }
	}
  },
  
/* something */

  getParentIndex : function(i)
  {
	var aLevel = this.getLevel(i);
	while(--i >= 0 && this.getLevel(i) >= aLevel){}
	return i;
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
  
  setCellValue : function(row, col,value){garden.s.dump('setCellValue');},
  getCellValue : function(row, col){},
  getCellText : function(i, col){return this._rows[i].name;},
  getProgressMode : function(row, col){garden.s.dump('getProgressMode');return 0;},
  getLevel : function(i){return this.getRowStateFromID(this._rows[i].id).aLevel;},
  
  isSeparator : function(row){return false;},
  isSorted : function(){return true;},
  isContainer : function(i){return this._rows[i].isDirectory;},
  isContainerOpen : function(i){return this.getRowStateFromID(this._rows[i].id).isContainerOpen;},
  isContainerEmpty : function(i){return this.getRowStateFromID(this._rows[i].id).isContainerEmpty;},
  
  cycleCell : function(row, col){garden.s.dump('cycleCell');},
  cycleHeader : function(col){garden.s.dump('cycleHeader');},
  
  performAction : function(action){garden.s.dump('performAction');},
  performActionOnCell : function(action, row, col){garden.s.dump('performActionOnCell');},
  performActionOnRow : function(action, row){garden.s.dump('performActionOnRow');},
  
  get rowCount function(){/*garden.s.dump('rowCount:'+this._rows.length);*/return this._rows.length;}
}