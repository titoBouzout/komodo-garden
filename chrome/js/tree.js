
function gardenTree(){}

gardenTree.prototype = {

  _rows : [],
  _rowsStates : [],
  
  focused : false,
  
  init : function(server)
  {
	this.server = server;
	this.history = new this.s.history();
  },
  
/* listeners */
  _listeners : [],  
  addEventListener : function(aEvent, aFunction)
  {
	if(!this._listeners[aEvent])
	  this._listeners[aEvent] = [];
	this._listeners[aEvent][this._listeners[aEvent].length] = aFunction;
  },
  removeEventListener : function(aEvent, aFunction)
  {
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
	this.s.dump('dispatchEvent:aEvent:'+aEvent);
	this.s.dump('dispatchEvent:aData:', aData);
	var errors = [];
	if(this._listeners[aEvent])
	{
	  for(var id in this._listeners[aEvent])
	  {
		try{this._listeners[aEvent][id](aData);}catch(e){errors[errors.length] = e;}
	  }
	}
	for(var id in errors)
	  throw new Error(errors[id]);
  },
  
  /*nose*/

  findRowID : function(aRow)
  {
	this.s.dump('findRowID');
	for(var id in this._rows)
	{
	  this.s.dump('findRowIDFOR');
	  if(this._rows[id].getFilepath == aRow.getFilepath)
	  {
		return id;
	  }
	}
	return -1;
  },
  findRowByPath : function(aRowPath)
  {
	this.s.dump('findRowByPath');
	for(var id in this._rows)
	{
	  this.s.dump('findRowByPathFOR');
	  if(this._rows[id].getFilepath == aRowPath)
	  {
		return id;
	  }
	}
	return -1;
  },

  toggleOpenState : function(row, rowObject)
  {
	this.s.dump('toggleOpenState');
	
	this.event.renameClick = new Date()+1000;//when dblclking two times quicly the childrenOnClick fires, when need to cheat the time in order to prevent that
	
	if(this.updating != 0)//queue
	{
	  if(!rowObject)
		rowObject = this._rows[row];
	  var tree = this;
	  this.treeOperationsQueue(function(){tree.toggleOpenState(row, rowObject);});
	  return;
	}
	this.updating++;
	
	if(!rowObject)
	  rowObject = this._rows[row];
	else
	  row = this.findRowID(rowObject);
	
	//the row was closed/removed
	if(row == -1)
	{
	  //this.s.dump('toggleOpenState:element was removed');
	  this.updating--;
	  this.treeOperationsQueue();
	  return;
	}
	
	if(rowObject.isContainerOpen)
	{
	  //this.s.dump('toggleOpenState:container is open');
		rowObject.isContainerOpen = false;
		
		this.selectionGoingToChange++;
	
		  try{
			this.removeNextLevel(row);
		  } catch(e) { this.s.dump('toggleOpenState:1:', e, true); }
			
		this.selectionGoingToChange--;
	  
	  this.selectionRestore();
	  this.updating--;
	  this.treeOperationsQueue();
	}
	else
	{
	  //this.s.dump('toggleOpenState:container is closed');
	  
	  rowObject.isLoading = true;
	  rowObject.isBusy = true;
	  
	  this.selectionGoingToChange++;
	  
		try{this.tree.invalidateRow(row);} catch(e) { this.s.dump('toggleOpenState:2:', e, true); }
		
	  this.selectionGoingToChange--;
	  
	  this.selectionRestore();
	  this.updating--;
	  this.treeOperationsQueue();
	  
	  asynchRemote.connections[this.server].directoryListing(rowObject.getLevel2+1, rowObject.getFilepath, rowObject);
	}
  },
  removeNextLevel : function(row)
  {
	this.s.dump('removeNextLevel');
	//this.s.dump('removeNextLevel');
	if(!this._rows[row])//the very first insert dont have next levels
	{
	  //this.s.dump('removeNextLevel:!this._rows[row]');
	  return;
	}
	try
	{
	  //this.s.dump('removeNextLevel:removing next level on row:'+row);
	  row = parseInt(row);
	  
	  var thisLevel = this._rows[row].getLevel2;
	  var deletecount = 0;
	  row++;
	  for (var t = row; t < this._rows.length; t++) {
		this.s.dump('removeNextLevelFOR');
		  if (this._rows[t].getLevel2 > thisLevel)
			deletecount++;
		  else
			break;
	  }
	  if (deletecount)
	  {
		//this.s.dump('removeNextLevel:delte count :'+deletecount);
		var firstVisible = this.tree.getFirstVisibleRow();
		
		this._rows.splice(row, deletecount);
		this.tree.invalidateRow(--row);
		this.tree.rowCountChanged(thisLevel, -deletecount);
		this.s.dump('removeNextLevel:thisLevel:'+thisLevel+'deletecount:'+deletecount);
		this.tree.scrollToRow(firstVisible);  
	  }
	} catch(e) { this.s.dump('removeNextLevel:', e, true); }
	
  },
  insertRows : function(aLevel, aRows, aParentRow)
  {
	this.s.dump('insertRows');
	if(this.updating != 0)
	{
	  var tree = this;
	  this.treeOperationsQueue(function(){tree.insertRows(aLevel, aRows, aParentRow);});
	  this.s.dump('insertRowsend');
	  return;
	}
	this.updating++;
	
	if(typeof(aParentRow) != 'undefined')
	{
	  var row = this.findRowID(aParentRow);
	  
	  //the parentRow was closed/removed
	  if(row == -1)
	  {
		this.selectionGoingToChange++;
	  //	try{this.tree.invalidateRow(row); }catch(e) { this.s.dump('insertRows:1:', e, true); }
		this.selectionGoingToChange--;
		
		this.updating--;
		this.treeOperationsQueue();
		 this.s.dump('insertRowsend');
		return;
	  }
		
	  aParentRow.isBusy = false;
	  aParentRow.isContainerOpen = true;
	  aParentRow.isLoading = false;	
	
	  if(aRows.length <1)
	  {
		aParentRow.isContainerEmpty = true;
		this.selectionGoingToChange++;
		  try{this.tree.invalidateRow(row); }catch(e) { this.s.dump('insertRows:1:', e, true); }
		this.selectionGoingToChange--;
		this.updating--;
		this.treeOperationsQueue();
		 this.s.dump('insertRowsend');
		return;
	  }
	  this.selectionGoingToChange++;
	  try{this.tree.invalidateRow(row); }catch(e) { this.s.dump('insertRows:2:', e, true); }
	  this.selectionGoingToChange--;
	}
	else
	{
	  var row = 0;
	}
	
	this.selectionGoingToChange++;
	
	//remove any previous rows
	  this.removeNextLevel(row);
	  
	//add new rows;
	  try
	  {
		var a = 0;
		for (var id in this._rows)
		{
		  this.s.dump('insertRowsFOR1');
		  if(this._rows[id] == aParentRow)
			break;
		  a++;
		}
		var b=0;
		for(var id in aRows)
		{
		  this.s.dump('insertRowsFOR2');
		  this._rows.splice(a + b + 1, 0, aRows[id]);
		  b++;
		}
		
		var visibleFirst = this.tree.getFirstVisibleRow();
		
		this.tree.rowCountChanged(aLevel, aRows.length);
		this.s.dump('insertRows:thisLevel:'+aLevel+':aRows.length:'+aRows.length);
		this.tree.scrollToRow(visibleFirst);
		
		for (var id in aRows)
		{
		  this.s.dump('insertRowsFOR3');
		  if(aRows[id].isContainerOpen || aRows[id].isLoading)
		  {
			aRows[id].isContainerOpen = false;
			this.toggleOpenState(-1, aRows[id]);
		  }
		}
		
	  }catch(e) { this.s.dump('insertRows:3:', e, true); }
	
	this.selectionGoingToChange--;
	this.selectionRestore();
	this.updating--;
	this.treeOperationsQueue();
	 this.s.dump('insertRowsend');
  },
  resetSoft : function()
  {
	this.s.dump('resetSoft');
	if(this.updating != 0)
	{
	  var tree = this;
	  this.treeOperationsQueue(function(){tree.resetSoft();});
	  return;
	}
	this.updating++;
	  
	  this.selectionGoingToChange++;
	  
		var length = this._rows.length;
		this._rows = [];
		try	{
		  this.tree.rowCountChanged(0, -length);
		  this.s.dump('resetSoft:thisLevel:'+0+':length:'+length);
		}catch(e) { this.s.dump('resetSoft:', e, true); }
		
	  this.selectionGoingToChange--;
	  
	this.updating--;
	this.treeOperationsQueue();
  },
  
  removeRowByPath : function(aPath)
  {
	this.s.dump('removeRowByPath');
	if(this.updating != 0)//queue
	{
	  var tree = this;
	  this.treeOperationsQueue(function(){tree.removeRowByPath(aPath);});
	  return;
	}
	
	this.updating++;
	this.selectionGoingToChange++;
	
	  var aRowID = this.findRowByPath(aPath);
	  if(aRowID != -1)
	  {
		aParentRowID = -1;
		if(!this._rows[aRowID].aParentRow)
		{
		  //this.s.dump(aRowID+' no tiene parent row');
		}
		else
		{
		  aParentRowID = this.findRowID(this._rows[aRowID].aParentRow);
		}
		
		this.removeNextLevel(aRowID);
		
		var aLevel = this._rows[aRowID].getLevel2;
		this._rows.splice(aRowID, 1);
		var firstVisible = this.tree.getFirstVisibleRow();
	
		if(aParentRowID != -1)
		  this.tree.invalidateRow(aParentRowID);
		this.tree.rowCountChanged(aLevel, -1);
		this.s.dump('removeRowByPath:thisLevel:'+aLevel+':length:-1');
		this.tree.scrollToRow(firstVisible); 
	  }
	  
	this.selectionGoingToChange--;
	this.selectionClear();
	this.updating--;
	this.treeOperationsQueue();
  },
  
  insertRow : function(aRow)
  {
	this.s.dump('insertRow');
	if(this.updating != 0)//queue
	{
	  var tree = this;
	  this.treeOperationsQueue(function(){tree.insertRow(aRow);});
	  return;
	}
	
	this.updating++;
	
	//look if the parent is on the tree
	if(typeof(aRow.aParentRow) != 'undefined' && aRow.aParentRow != -1 )
	{
	  var row = this.findRowID(aRow.aParentRow);
	  //the parentRow was closed/removed
	  if(row == -1)
	  {
		this.updating--;
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
		var thisLevel = aRow.getLevel2;
	
		if(thisLevel > 0)
		  row++;
		//then where to insert the row?
		for (var t = row; t < this._rows.length; t++)
		{
		  this.s.dump('insertRowFOR');
		  if (this._rows[t].getLevel2 > thisLevel){}//not in a subfolder
		  else if (this._rows[t].getLevel2 < thisLevel)//break if we are in a sibling folder
			break;
		  else if (aRow.isDirectory == this._rows[t].isDirectory && this.s.sortLocale(this._rows[t].getFilename.toLowerCase(), aRow.getFilename.toLowerCase()) > 0)//found the position?
			break;
		  row++;
		}
		
		//insert the row
		this._rows.splice(row, 0, aRow);
	
		//keep scroll
		var visibleFirst = this.tree.getFirstVisibleRow();
		this.tree.rowCountChanged(aRow.getLevel2, +1);
		this.s.dump('insertRow:thisLevel:'+aRow.getLevel2+':length:+1');

		this.tree.scrollToRow(visibleFirst);
		
	  }catch(e) { this.s.dump('insertRows:3:', e, true); }
	
	this.selectionGoingToChange--;
	//reselect
	this.selectionRestore();
	this.updating--;
	this.treeOperationsQueue();
  },
  


/* selection */

  selection : null,
  isSelectable : function(row, col){return true;},
  selectionChanged : function() { },
  selectionGoingToChange : 0,//holds if it is appropiated to save the selection
  selectionSelectedItems : [],//save selected items for restoring when they are unselected

  selectionSave : function(forceRefresh)
  {
	this.s.dump('selectionSave');
	if(this.selectionGoingToChange == 0 || forceRefresh)
	{
	  this.selectionGoingToChange++;
		this.selectionSelectedItems = [];
		try
		{
		  this.selectionSelectedItems = this.selectionGetSelectedItems();
		  
		} catch(e){ this.s.dump('selectionSave', e, true); }
	  this.selectionGoingToChange--;
	}
  },
  
  selectionGetSelectedItems : function()
  {
	this.s.dump('selectionGetSelectedItems');
	this.selectionGoingToChange++;
	//this.selection.selectEventsSuppressed = true;
	  var selected = [];
	  var rangeCount = this.selection.getRangeCount();
	  var currentIndex = -1;
	  for (var i = 0; i < rangeCount; i++)
	  {
		this.s.dump('selectionGetSelectedItemsFOR1');
		 var start = {};
		 var end = {};
		 this.selection.getRangeAt(i, start, end);
		 for(var c = start.value; c <= end.value; c++)
		 {
		  this.s.dump('selectionGetSelectedItemsFOR2');
			if(currentIndex === -1)
			  this.selection.currentIndex = c;
			selected[selected.length] = this._rows[c];
		 }
	  }
	//this.selection.selectEventsSuppressed = false;
	this.selectionGoingToChange--;
	this.s.dump('selectionGetSelectedItemsend');
	return selected;
  },
  
  selectionGetSelectedItem : function()
  {
	this.s.dump('selectionGetSelectedItem');
	this.selectionGoingToChange++;
	//this.selection.selectEventsSuppressed = true;
	  var selected = this._rows[this.selection.currentIndex];
	//this.selection.selectEventsSuppressed = false;
	this.selectionGoingToChange--;
	this.s.dump('selectionGetSelectedItemend');
	return selected;
  },
  
  selectionRestore : function(forceRefresh)
  {
	this.s.dump('selectionRestore');
	this.selectionGoingToChange++;
	  if(this.selectionGoingToChange == 1 || forceRefresh)
	  {
		//this.selection.selectEventsSuppressed = true;
		if(this.selectionSelectedItems != this.selectionGetSelectedItems())
		{
		  try
		  {
			  this.selection.clearSelection();
			  var row;
			  for(var id in this.selectionSelectedItems)
			  {
				this.s.dump('selectionRestoreFOR');
				row = this.findRowID(this.selectionSelectedItems[id]);
				if(row != -1)
				  this.selection.rangedSelect(row,row,true);
			  }
		  } catch(e){ this.s.dump('selectionRestore', e, true); }
		}
		else
		{
		  this.s.dump('Skiping reselect selection is the same');
		}
		//this.selection.selectEventsSuppressed = false;
	  }
	this.selectionGoingToChange--;
	this.s.dump('selectionRestoreend');
  },
  
  selectionClear : function()
  {
	this.s.dump('selectionClear');
	//this.selection.selectEventsSuppressed = true;
	this.selectionSelectedItems = [];
	this.selection.clearSelection();
	//this.selection.selectEventsSuppressed = false;
  },
  
  selectionClearSoft : function()
  {
	this.s.dump('selectionClearSoft');
	//this.selection.selectEventsSuppressed = true;
	this.selection.clearSelection();
	//this.selection.selectEventsSuppressed = false;
  },
  
/* events */

  getEventRowObject : function(event)
  {
	this.s.dump('getEventRowObject');
	var row = this.getEventRowID(event);
	if(row === false)
	  return false;
	else
	  return this._rows[row];
  },
  getEventRowID : function(event)
  {
	this.s.dump('getEventRowID');
	var row = {};
	this.selectionGoingToChange++;
	this.tree.getCellAt(event.pageX, event.pageY, row, {},{});
	this.selectionGoingToChange--;
	this.selectionRestore();
	return row.value;
  },
  getEventColumn : function(event)
  {
	this.s.dump('getEventColumn');
	var row = {};
	var column = {};
	this.selectionGoingToChange++;
	this.tree.getCellAt(event.pageX, event.pageY, row, column, {});
	this.selectionGoingToChange--;
	this.selectionRestore();
	return column;
  },
  childrenOnClick : function(event)
  {
	this.s.dump('childrenOnClick');
	if(event.button == 2){}
	else
	{
	  if(this.editable)
	  {
		var diff = new Date() - this.event.renameClick;
		if(diff > 200 && diff < 700 && this.event.renameItem == this.getEventRowID(event))
		{
		  try{this.event.renameTimeout.cancel();/*yeah!*/}catch(e){}
		  var tree = this;
		  this.event.renameTimeout = this.s.timerAdd(180, function(){tree.startEditing();});
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
	if(event.button == 2){}
	else
	{
	  if(this.editable)
	  {
		this.s.dump('childrenOnDblClick');
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
		  asynchRemote.actionFromRemote('open');
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
	  this.s.dump('treeOnKeyPress');
	  switch(event.keyCode)
	  {
		case 8://back
		  {
			if(!this.history.canGoBack())
			  asynchRemote.actionFromRemote('go-up');
			else
			  asynchRemote.actionFromRemote('history-back');
			 break;
		  }
		case 13://open
		  {
			asynchRemote.actionFromRemote('open-from-tree');
			break;
		  }
		case 46://delete
		  {
			asynchRemote.actionFromRemote('delete');
			break
		  }
		case 27://escape ( this should focus previous folder )...for now go-up!
		  {
			asynchRemote.actionFromRemote('go-up');
			break;
		  }
		case 0://space bar ( focus next folder )
		  {
			break;
		  }
		case 113://F2 rename
		  {
			if(this.editable)
			  this.startEditing();
			break;
		  }
		case 116://F5 refresh
		  {
			asynchRemote.actionFromRemote('refresh-all-hard');
			break;
		  }
	  }
	}
  },

/* drag and drop */

  drop : function(row, orientation, dataTransfer){ this.s.dump('drop');return false;},
  canDrop : function(index, orientation, dataTransfer){ this.s.dump('canDrop');return false;},

  treeOnDragStart : function(event){ this.s.dump('treeOnDragStart'); return false},
  treeOnDragOver : function(event){ this.s.dump('treeOnDragOver'); return false},
  treeOnDragEnter : function(event){ this.s.dump('treeOnDragEnter'); return false},
  treeOnDrop : function(event){ this.s.dump('treeOnDrop'); return false},
  treeOnDragDrop : function(event){ this.s.dump('treeOnDragDrop'); return false},
  treeOnDragExit : function(event){ this.s.dump('treeOnDragExit'); return false},
  
  childrenOnDragStart : function(event){ this.s.dump('childrenOnDragStart'); return false},
  childrenOnDragOver : function(event){  this.s.dump('childrenOnDragOver'); return false},
  childrenOnDragEnter : function(event){ this.s.dump('childrenOnDragEnter');  return false},
  childrenOnDrop : function(event){this.s.dump('childrenOnDrop');  return false},
  childrenOnDragDrop : function(event){this.s.dump('childrenOnDragDrop');  return false},
  childrenOnDragExit : function(event){this.s.dump('childrenOnDragExit');  return false},
  
/* controller */

  updating : 0,//perform one operation in the tree at time
  operationsQueue : [],//queue of operations
  treeOperationsQueue : function(aFunction)
  {
	this.s.dump('treeOperationsQueue');
	if(!aFunction)
	{
	  if(this.operationsQueue.length)
		this.operationsQueue.pop()();
	  else
	  {
		this.s.serializedSessionSet(this.server,  {
													'tree':asynchRemote.trees[this.server]._rows,
													'server':asynchRemote.connections[this.server].cache
													 });
	  }
	}
	else
	{
	  this.operationsQueue[this.operationsQueue.length] = aFunction;
	}
	this.s.dump('treeOperationsQueueend');
  },


/* editing */
  
  editable : false,  
  isEditable : function(row, col){return this.event.renaming;},
  
  setCellText : function(row, col, value)
  {
	this.s.dump('setCellText');
	if(this.editable && this._rows[row].getFilename != value)
	{
	  var aData = {}
		  aData.path = this._rows[row].getFilepath;
		  aData.newName = value;
		  aData.isDirectory = this._rows[row].isDirectory;
	  this.dispatchEvent('onNewName', aData);
	}
	this.s.dump('setCellTextend');
  },

  event : {
	renaming : false,
	renameClick : new Date(),
	renameItem : false,
	renameTimeout : 0
  },
  
  startEditing : function()
  {
	this.s.dump('startEditing');
	if(this.selectionGetSelectedItems().length === 1)
	{
	  // hack hack hack avoids tree autoresizing when editing
	  this.event.renaming = true;
	 
	  this.treeElement.setAttribute('height', this.treeElement.getAttribute('height')+1);
	  this.treeElement.setAttribute('height', this.treeElement.getAttribute('height')-1);
	  //set the field to editing state
	  this.treeElement.startEditing(this.selection.currentIndex, this.tree.columns.getColumnAt(0));
	  this.treeElement.inputField.left = this.treeElement.inputField.left-4;
	  // hack hack hack avoids tree autoresizing when editing
	  this.treeElement.setAttribute('height', this.treeElement.getAttribute('height')+1);
	  this.treeElement.setAttribute('height', this.treeElement.getAttribute('height')-1);
	  this.event.renaming = false;
	
	  this.s.notifyStatusBar(window, 'Type to edit the item name');
	}
	else
	{
	  this.s.notifyStatusBar(window, 'Can\'t rename multiples items at the same time');
	}
  },
  
/* properties */

  _atoms : [],
  getImageSrc : function(row, col){},
  getColumnProperties : function(col,properties){},
  getRowProperties : function(row,properties){},
  getCellProperties : function(row,col,properties)
  {
	//meter esto es un switch
	var rowObject = this._rows[row];
	if(rowObject.isBusy)
	  properties.AppendElement(this.s.mIconBusy);
	else if(!rowObject.isDirectory)
	  properties.AppendElement(this.getAtom(rowObject.getFileextension));
  },
  getAtom : function(aName)
  {
   if (!this._atoms[aName])
      this._atoms[aName] = this.s.mAtomService.getAtom(aName)
    return this._atoms[aName];
  },
  

/* something */

  tree : null,
  
  getParentIndex : function(i)
  {
	var aLevel = this._rows[i].getLevel2;
	while(--i >= 0 && this._rows[i].getLevel2 >= aLevel){}
	return i;
  },
  hasNextSibling : function(i, afterIndex)
  {
	var aLevel = this._rows[i].getLevel2;
	var rowCount = this.rowCount;
	i = afterIndex;
	while(++i < rowCount && this._rows[i].getLevel2 > aLevel){}
	if(this._rows[i] && this._rows[i].getLevel2 == aLevel)
	  return true;
	else
	  return false;
  },
  
  setTree : function(tree){this.tree = tree;},
  
  setCellValue : function(row, col,value){this.s.dump('setCellValue');},
  getCellValue : function(row, col){},
  getCellText : function(row, col){return this._rows[row].getFilename;},
  getProgressMode : function(row, col){this.s.dump('getProgressMode');return 0;},
  getLevel : function(row){return this._rows[row].getLevel2;},
  
  isSeparator : function(row){return false;},
  isSorted : function(){return true;},
  isContainer : function(row){return this._rows[row].isDirectory;},
  isContainerOpen : function(row){return this._rows[row].isContainerOpen;},
  isContainerEmpty : function(row){return this._rows[row].isContainerEmpty;},
  
  cycleCell : function(row, col){this.s.dump('cycleCell');},
  cycleHeader : function(col){this.s.dump('cycleHeader');},
  
  performAction : function(action){this.s.dump('performAction');},
  performActionOnCell : function(action, row, col) {this.s.dump('performActionOnCell');},
  performActionOnRow : function(action, row) {this.s.dump('performActionOnRow');},
  
  rowCount : null,
  get rowCount function(){this.s.dump('rowCount:'+this._rows.length);return this._rows.length;}
}