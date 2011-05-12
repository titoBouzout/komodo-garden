
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
}

AsynchRemoteTree.prototype = {


tree:null,
selection:null,
setCellValue:function(row, col,value){},
canDrop:function(index, orientation, dataTransfer){ return false;},
drop:function(row, orientation, dataTransfer){},
get rowCount(){return this._rows.length;},
setTree:function(tree){this.tree = tree;},
getCellText : function(row, col){return this._rows[row].getFilename;},
setCellText : function(row, col, value){ /*alert(value)*/},
isContainer:function(row){return this._rows[row].isDirectory;},
isContainerOpen:function(row){return this._rows[row].isContainerOpen;},
isContainerEmpty:function(row){return this._rows[row].isContainerEmpty;},
isSeparator:function(row){return false;},
isSorted:function(){return true;},
isEditable:function(row, col){return false;},
isSelectable:function(row, col){ return true;},
getParentIndex: function(row){return -1;},
getLevel:function(row){return this._rows[row].getLevel;},
hasNextSibling:function(row, after){return false;},
getImageSrc:function(row, col){ return ''},
getProgressMode :function(row, col){ return 0},
getCellValue :function(row, col){ return ''},
cycleHeader:function(col){},
selectionChanged:function()
{
  if(this.selectionGoingToChange == 0)
  {
	this.selectionGoingToChange++;
	  this.selectionSelectedItems = [];
	  try
	  {
		var rangeCount = this.selection.getRangeCount();
		for (var i = 0; i < rangeCount; i++)
		{
		   var start = {};
		   var end = {};
		   this.selection.getRangeAt(i, start, end);
		   for(var c = start.value; c <= end.value; c++)
			  this.selectionSelectedItems[this.selectionSelectedItems.length] = this._rows[c];
		}
	  } catch(e){ asynchRemote.dump('selectionChanged', e, true); }
	this.selectionGoingToChange--;
  }
},
selectionReselect:function()
{
  this.selectionGoingToChange++;
	if(this.selectionGoingToChange == 1)
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
	this.updating--;
	this.treeOperationsQueue();
	return;
  }

  if(rowObject.isContainerOpen)
  {
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
  /*else if(rowObject.isLoading)
  {
	this.updating--;
	this.treeOperationsQueue();
	return;
  }*/
  else
  {
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
  if(!this._rows[row])//the very first insert dont have next levels
	return;
  try
  {
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
		try{this.tree.invalidateRow(row); }catch(e) { asynchRemote.dump('insertRows:1:', e, true); }
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
	  //for (var i = 0, count = aRows.length; i < count; i++)
		this._rows.splice(a + b + 1, 0, aRows[id]);
		b++;
	  }
	  //for (var i = 0, count = aRows.length; i < count; i++)
		//this._rows.splice(a + i + 1, 0, aRows[i]);
	  
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
	  
	  var aLevel = this._rows[aRowID].getLevel;
	  this._rows.splice(aRowID, 1);
	  var firstVisible = this.tree.getFirstVisibleRow();
	  if(aParentRowID != -1)
		this.tree.invalidateRow(aParentRowID);
	  this.tree.rowCountChanged(aLevel, -1);
	  this.tree.scrollToRow(firstVisible); 
	}
	
  this.selectionGoingToChange--;
  this.selectionReselect();
  this.updating--;
  this.treeOperationsQueue();
},

invalidateRowByPath:function(aPath)
{
  
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
		if(this._rows[aRowID].isContainerOpen)
		{
		  this._rows[aRowID].isContainerOpen = false;
		  this.toggleOpenState(-1, this._rows[aRowID]);
		}
	  }
  
  this.selectionGoingToChange--;
  this.selectionReselect();
  this.updating--;
  this.treeOperationsQueue();
},

childrenOnDragStart:function(event, aElement){ return false},
childrenOnDragOver:function(event, aElement){ return false},
childrenOnDragEnter:function(event,aElement){ return false},
childrenOnClick:function(event, aElement){ },
childrenOnDblClick:function(event, aElement){ },
childrenOnDrop:function(event, aElement){ return false},

treeOnDragStart:function(event){ return false},
treeOnDragOver:function(event){ return false},
treeOnDragEnter:function(event){ return false},
treeOnClick:function(event){ },
treeOnDblClick:function(event){ },
treeOnDrop:function(event){ return false}
};