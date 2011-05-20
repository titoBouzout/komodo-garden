
function AsynchRemoteTree(server)
{
  this.server = server;
  this._rows =  asynchRemote.s.serializedSessionGet(server, {'tree':[],'server':{}}, asynchRemote.s.serializerParser).tree;

  this.history = new asynchRemote.s.history();

  this.updating = 0;//perform one operation in the tree at time
  this.operationsQueue = [];//queue of operations
  
  this.selectionGoingToChange = 0;//holds if it is appropiated to save the selection
  this.selectionSelectedItems = [];//save selected items for reselection when they are unselected
  this.focused = false;
  this.event = {};
  this.event.renameClick = new Date();
  this.event.renameItem = false;
  this.event.renameTimeout = 0;
  this.event.renameEditing = false;
}

AsynchRemoteTree.prototype = {

tree:null,
selection:null,
setCellValue:function(row, col,value){},
canDrop:function(index, orientation, dataTransfer){ return false;},
drop:function(row, orientation, dataTransfer){},
get rowCount(){return this._rows.length;},
get treeElement(){ return asynchRemote.element(this.treeElementID);},
startEditing:function(row, col){
  this.event.renameEditing = true;
  // hack hack hack avoids tree autoresizing when editing
  this.treeElement.setAttribute('height', this.treeElement.getAttribute('height')+1);
  this.treeElement.setAttribute('height', this.treeElement.getAttribute('height')-1);
  //set the field to editing state
  this.treeElement.startEditing(row, col);
  // hack hack hack avoids tree autoresizing when editing
  this.treeElement.setAttribute('height', this.treeElement.getAttribute('height')+1);
  this.treeElement.setAttribute('height', this.treeElement.getAttribute('height')-1);
   this.event.renameEditing = false;
  },
setTree:function(tree){this.tree = tree;},
getCellText : function(row, col){return this._rows[row].getFilename;},
setCellText : function(row, col, value)
{
  var aData = {}
	  aData.oldName = this._rows[row].getFilepath;
	  aData.newName = value;
	  aData.isDirectory = this._rows[row].isDirectory;
  asynchRemote.actionFromRemote('renameFromTree', aData);
},
isContainer:function(row){return this._rows[row].isDirectory;},
isContainerOpen:function(row){return this._rows[row].isContainerOpen;},
isContainerEmpty:function(row){return this._rows[row].isContainerEmpty;},
isSeparator:function(row){return false;},
isSorted:function(){return true;},
isEditable:function(row, col){return true;},
isSelectable:function(row, col){ return true;},
getParentIndex: function(row){return -1;},
getLevel:function(row){return this._rows[row].getLevel;},
hasNextSibling:function(row, after){return false;},
getImageSrc:function(row, col){ return ''},
getProgressMode :function(row, col){ return 0},
getCellValue :function(row, col){ return ''},
cycleHeader:function(col){},
selectionChanged:function(forceRefresh)
{
  if(this.selectionGoingToChange == 0 || forceRefresh)
  {
	this.selectionGoingToChange++;
	  this.selectionSelectedItems = [];
	  try
	  {
		this.selectionSelectedItems = this.selectionGetSelectedItems();
		
	  } catch(e){ asynchRemote.dump('selectionChanged', e, true); }
	this.selectionGoingToChange--;
  }
},
selectionGetSelectedItems:function()
{
  this.selectionGoingToChange++;
	var selected = [];
	var rangeCount = this.selection.getRangeCount();
	var currentIndex = -1;
	for (var i = 0; i < rangeCount; i++)
	{
	   var start = {};
	   var end = {};
	   this.selection.getRangeAt(i, start, end);
	   for(var c = start.value; c <= end.value; c++)
	   {
		  if(currentIndex === -1)
			this.selection.currentIndex = c;
		  selected[selected.length] = this._rows[c];
	   }
	}
  this.selectionGoingToChange--;
  return selected;
},
selectionGetSelectedItem:function()
{
  this.selectionGoingToChange++;
	var selected = this._rows[this.selection.currentIndex];
  this.selectionGoingToChange--;
  return selected;
},
selectionReselect:function(forceRefresh)
{
  this.selectionGoingToChange++;
	if(this.selectionGoingToChange == 1 || forceRefresh)
	{
	  try
	  {
		this.selection.clearSelection();
		var row;
		for(var id in this.selectionSelectedItems)
		{
		  row = this.findRowID(this.selectionSelectedItems[id]);
		  if(row != -1)
			this.selection.rangedSelect(row,row,true);
		}
	  } catch(e){ asynchRemote.dump('selectionReselect', e, true); }
	}
  this.selectionGoingToChange--;
},
selectionClear:function()
{
  this.selectionSelectedItems = [];
  this.selection.clearSelection();
},
selectionClearSoft:function()
{
  this.selection.clearSelection();
},
cycleCell:function(row, col){},
performAction:function(action){},
performActionOnCell: function(action, row, col) {},
performActionOnRow: function(action, row) {},
getRowProperties:function(row,properties){},
getCellProperties:function(row,col,properties)
{
  var rowObject = this._rows[row];
  if(rowObject.isBusy)
	properties.AppendElement(asynchRemote.iconBusy);
  else if(rowObject.isDirectory)
  {
	if(rowObject.isContainerOpen)
	  properties.AppendElement(asynchRemote.iconDirectoryOpen);
	else
	  properties.AppendElement(asynchRemote.iconDirectoryClosed);
  }
  else
  {
	properties.AppendElement(asynchRemote.iconFile);
	properties.AppendElement(asynchRemote.atomService.getAtom((rowObject.getFilename.split('.').pop() || '').toLowerCase()));
  }
},
getColumnProperties:function(col,properties){},
findRowID:function(aRow){
  for(var id in this._rows)
  {
	if(this._rows[id].getFilepath == aRow.getFilepath)
	{
	  return id;
	}
  }
  return -1;
},
findRowByPath:function(aRowPath){
  for(var id in this._rows)
  {
	if(this._rows[id].getFilepath == aRowPath)
	{
	  return id;
	}
  }
  return -1;
},
treeOperationsQueue:function(aFunction)
{
  if(!aFunction)
  {
	if(this.operationsQueue.length)
	  this.operationsQueue.pop()();
	else
	  asynchRemote.s.serializedSessionSet(this.server,  {
												  'tree':asynchRemote.trees[this.server]._rows,
												  'server':asynchRemote.connections[this.server].cache
												   });
  }
  else
  {
	this.operationsQueue[this.operationsQueue.length] = aFunction;
  }
},
toggleOpenState:function(row, rowObject) {
  
  this.event.renameClick = new Date()+1000;//when dblclking two times quicly the childrenOnClick fires, when need to cheat the time in order to prevent that
  
  if(this.updating != 0)//queue
  {
	if(!rowObject)
	  rowObject = this._rows[row];
	var server = this.server;
	this.treeOperationsQueue(function(){asynchRemote.trees[server].toggleOpenState(row, rowObject);});
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
	//asynchRemote.dump('toggleOpenState:element was removed');
	this.updating--;
	this.treeOperationsQueue();
	return;
  }

  if(rowObject.isContainerOpen)
  {
	//asynchRemote.dump('toggleOpenState:container is open');
	  rowObject.isContainerOpen = false;
	  
	  this.selectionGoingToChange++;

		try{
		  this.removeNextLevel(row);
		} catch(e) { asynchRemote.dump('toggleOpenState:1:', e, true); }
		  
	  this.selectionGoingToChange--;
	
	this.selectionReselect();
	this.updating--;
	this.treeOperationsQueue();
  }
  else
  {
	//asynchRemote.dump('toggleOpenState:container is closed');
	
	rowObject.isLoading = true;
	rowObject.isBusy = true;
	
	this.selectionGoingToChange++;
	
	  try{this.tree.invalidateRow(row);} catch(e) { asynchRemote.dump('toggleOpenState:2:', e, true); }
	  
	this.selectionGoingToChange--;
	
	this.selectionReselect();
	this.updating--;
	this.treeOperationsQueue();
	
	asynchRemote.connections[this.server].directoryListing(rowObject.getLevel+1, rowObject.getFilepath, rowObject);
  }
},
removeNextLevel:function(row)
{
  //asynchRemote.dump('removeNextLevel');
  if(!this._rows[row])//the very first insert dont have next levels
  {
	//asynchRemote.dump('removeNextLevel:!this._rows[row]');
	return;
  }
  try
  {
	//asynchRemote.dump('removeNextLevel:removing next level on row:'+row);
	row = parseInt(row);
	
	var thisLevel = this._rows[row].getLevel;
	var deletecount = 0;
	row++;
	for (var t = row; t < this._rows.length; t++) {
		if (this.getLevel(t) > thisLevel)
		  deletecount++;
		else
		  break;
	}
	if (deletecount)
	{
	  //asynchRemote.dump('removeNextLevel:delte count :'+deletecount);
	  var firstVisible = this.tree.getFirstVisibleRow();
	  
	  this._rows.splice(row, deletecount);
	  this.tree.invalidateRow(--row);
	  this.tree.rowCountChanged(thisLevel, -deletecount);
	  
	  this.tree.scrollToRow(firstVisible);  
	}
  } catch(e) { asynchRemote.dump('removeNextLevel:', e, true); }
  
},
insertRows:function(aLevel, aRows, aParentRow)
{
  if(this.updating != 0)
  {
	var server = this.server;
	this.treeOperationsQueue(function(){asynchRemote.trees[server].insertRows(aLevel, aRows, aParentRow);});
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
	//	try{this.tree.invalidateRow(row); }catch(e) { asynchRemote.dump('insertRows:1:', e, true); }
	  this.selectionGoingToChange--;
	  
	  this.updating--;
	  this.treeOperationsQueue();
	  return;
	}
	  
	aParentRow.isBusy = false;
	aParentRow.isContainerOpen = true;
	aParentRow.isLoading = false;	

	if(aRows.length <1)
	{
	  aParentRow.isContainerEmpty = true;
	  this.selectionGoingToChange++;
		try{this.tree.invalidateRow(row); }catch(e) { asynchRemote.dump('insertRows:1:', e, true); }
	  this.selectionGoingToChange--;
	  this.updating--;
	  this.treeOperationsQueue();
	  return;
	}
	this.selectionGoingToChange++;
	try{this.tree.invalidateRow(row); }catch(e) { asynchRemote.dump('insertRows:2:', e, true); }
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
		if(this._rows[id] == aParentRow)
		  break;
		a++;
	  }
	  var b=0;
	  for(var id in aRows)
	  {
		this._rows.splice(a + b + 1, 0, aRows[id]);
		b++;
	  }
	  
	  var visibleFirst = this.tree.getFirstVisibleRow();
	  
	  this.tree.rowCountChanged(aLevel, aRows.length);
	  this.tree.scrollToRow(visibleFirst);
	  
	  for (var id in aRows)
	  {
		if(aRows[id].isContainerOpen || aRows[id].isLoading)
		{
		  aRows[id].isContainerOpen = false;
		  this.toggleOpenState(-1, aRows[id]);
		}
	  }
	  
	}catch(e) { asynchRemote.dump('insertRows:3:', e, true); }
  
  this.selectionGoingToChange--;
  this.selectionReselect();
  this.updating--;
  this.treeOperationsQueue();
},
resetSoft: function()
{
 if(this.updating != 0)
  {
	var server = this.server;
	this.treeOperationsQueue(function(){asynchRemote.trees[server].resetSoft();});
	return;
  }
  this.updating++;
    
	this.selectionGoingToChange++;
	
	  var length = this._rows.length;
	  this._rows = [];
	  try	{
		this.tree.rowCountChanged(0, -length);
	  }catch(e) { asynchRemote.dump('resetSoft:', e, true); }
	  
	this.selectionGoingToChange--;
	
  this.updating--;
  this.treeOperationsQueue();
},

removeRowByPath:function(aPath){
  
  if(this.updating != 0)//queue
  {
	var server = this.server;
	this.treeOperationsQueue(function(){asynchRemote.trees[server].removeRowByPath(aPath);});
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
		//asynchRemote.dump(aRowID+' no tiene parent row');
	  }
	  else
	  {
		aParentRowID = this.findRowID(this._rows[aRowID].aParentRow);
	  }
	  
	  this.removeNextLevel(aRowID);
	  
	  var aLevel = this._rows[aRowID].getLevel;
	  this._rows.splice(aRowID, 1);
	  var firstVisible = this.tree.getFirstVisibleRow();

	  if(aParentRowID != -1)
		this.tree.invalidateRow(aParentRowID);
	  this.tree.rowCountChanged(aLevel, -1);
	  this.tree.scrollToRow(firstVisible); 
	}
	
  this.selectionGoingToChange--;
  this.selectionClear();
  this.updating--;
  this.treeOperationsQueue();
},

insertRow:function(aRow)
{
 if(this.updating != 0)//queue
  {
	var server = this.server;
	this.treeOperationsQueue(function(){asynchRemote.trees[server].insertRow(aRow);});
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
	  var thisLevel = aRow.getLevel;

	  if(thisLevel > 0)
		row++;
	  //then where to insert the row?
	  for (var t = row; t < this._rows.length; t++)
	  {
		if (this.getLevel(t) > thisLevel){}//not in a subfolder
		else if (this.getLevel(t) < thisLevel)//break if we are in a sibling folder
		  break;
		else if (aRow.isDirectory == this._rows[t].isDirectory && asynchRemote.s.sortLocale(this._rows[t].getFilename.toLowerCase(), aRow.getFilename.toLowerCase()) > 0)//found the position?
		  break;
		row++;
	  }
	  
	  //insert the row
	  this._rows.splice(row, 0, aRow);

	  //keep scroll
	  var visibleFirst = this.tree.getFirstVisibleRow();
	  this.tree.rowCountChanged(aRow.aLevel, +1);
	  this.tree.scrollToRow(visibleFirst);
	  
	}catch(e) { asynchRemote.dump('insertRows:3:', e, true); }
  
  this.selectionGoingToChange--;
  //reselect
  this.selectionReselect();
  this.updating--;
  this.treeOperationsQueue();
},


getEventRow:function(event)
{
  var row = this.getEventRowID(event);
  if(row === false)
	return false;
  else
	return this._rows[row];
},
getEventRowID:function(event)
{
  var row = {};
  this.selectionGoingToChange++;
  this.tree.getCellAt(event.pageX, event.pageY, row, {},{});
  this.selectionGoingToChange--;
  this.selectionReselect();
  return row.value;
},
getEventColumn:function(event)
{
  var row = {};
  var column = {};
  this.selectionGoingToChange++;
  this.tree.getCellAt(event.pageX, event.pageY, row, column, {});
  this.selectionGoingToChange--;
  this.selectionReselect();
  return column;
},
editCurrentRow:function()
{
  if(this.selectionGetSelectedItems().length === 1)
  {
	this.startEditing(this.selection.currentIndex, this.tree.columns.getColumnAt(0));
	asynchRemote.s.notifyStatusBar(window, 'Type to edit the item name');
  }
  else
  {
	asynchRemote.s.notifyStatusBar(window, 'Can\'t rename multiples items at the same time');
  }
},
childrenOnClick:function(event)
{
  if(event.button == 2)
	return true;
  var diff = new Date() - this.event.renameClick;
  if(diff > 200 && diff < 700 && this.event.renameItem == this.getEventRow(event))
  {
	var tree = this;
	this.event.renameTimeout = setTimeout(function(){tree.editCurrentRow();}, 180)
  }
  else
  {
	this.event.renameClick = new Date();
	this.event.renameItem = this.getEventRow(event);
  }
  return true;
},
childrenOnDblClick:function(event)
{
  this.event.renameClick = new Date()+1000;//when dblclking two times quicly the childrenOnClick fires, when need to cheat the time in order to prevent that 
  if(event.button == 2)
	return true;

  try{clearTimeout(this.event.renameTimeout);/*yeah!*/}catch(e){}
  var row = this.getEventRow(event)

	if(row)
	{
	  if(row.isDirectory){}
	  else
	  {
		asynchRemote.actionFromRemote('open');
	  }
	}
  return true;
},
childrenOnDragStart:function(event){ asynchRemote.s.dump('childrenOnDragStart'); return false},
childrenOnDragOver:function(event){  asynchRemote.s.dump('childrenOnDragOver'); return false},
childrenOnDragEnter:function(event){ asynchRemote.s.dump('childrenOnDragEnter');  return false},
childrenOnDrop:function(event){asynchRemote.s.dump('childrenOnDrop');  return false},
childrenOnDragDrop:function(event){asynchRemote.s.dump('childrenOnDragDrop');  return false},
childrenOnDragExit:function(event){asynchRemote.s.dump('childrenOnDragExit');  return false},


treeOnDragStart:function(event){ asynchRemote.s.dump('treeOnDragStart'); return false},
treeOnDragOver:function(event){ asynchRemote.s.dump('treeOnDragOver'); return false},
treeOnDragEnter:function(event){ asynchRemote.s.dump('treeOnDragEnter'); return false},
treeOnDrop:function(event){ asynchRemote.s.dump('treeOnDrop'); return false},
treeOnDragDrop:function(event){ asynchRemote.s.dump('treeOnDragDrop'); return false},
treeOnDragExit:function(event){ asynchRemote.s.dump('treeOnDragExit'); return false},
treeOnKeyPress:function(event)
{
  if(event.originalTarget.tagName == 'html:input'){}
  else
  {
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
		  this.editCurrentRow();
		  break;
		}
	  case 116://F5 refresh
		{
		  asynchRemote.actionFromRemote('refresh-all-hard');
		  break;
		}

	}
	event.stopPropagation();
	event.preventDefault();
	return true;
  }
}
};