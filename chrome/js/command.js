(function(){
  
  
   //the action when clicking a menuitem from "places local context menu"
  this.actionFromLocal = function(action, aboutFocusedTab, aData)
  {
	var server = this.focusedServer;
	if(!server || !action || server == '' || action == '')
	  return false;
	
	//selection
  	var selectedItems = this.s.placesLocalGetSelectedPaths(window, aboutFocusedTab);
	var selectedPath = selectedItems[0];//the very first path on the selection
	
	//vars
	var currentRemotePath = this.connections[server].cache.currentPath
	var currentLocalPath 	= this.s.placesLocalCurrentPath(window);
	var tree = this.trees[server];
	
	switch(action)
	{
	  case 'download':
		{
		  var aProcess = false;//group the processes into one process object
		  for(var id in selectedItems)
		  {
			var file = this.s.getRemotePathFromLocalPath(
														 currentRemotePath,
														 currentLocalPath,
														 selectedItems[id])
			
			if(this.s.pathIsFolder(selectedItems[id]))
			{
			  var aDestination = this.s.getRemotePathFromLocalPath(currentRemotePath, currentLocalPath, file)
			  if(aDestination == '' || aDestination == '/')
			  {
				if(!this.s.confirm('Are you sure you want to download all the tree?') ||
				   !this.s.confirm('Are you REALLY sure you want to download all the tree?'))
				  break;
			  }
			  aProcess = this.connections[server]
					.downloadDirectory(
								  file,
								  currentRemotePath,
								  currentLocalPath,
								  aProcess
								  );
			}
			else
			{
			  aProcess = this.connections[server].downloadFile(
											file,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
		  }
		  break;
		}
	  case 'download-to-folder':
		{
		  var f = ko.filepicker.getFolder(null, 'Download selected items to…');
		  if(f && f != '')
		  {
			var aProcess = false;//group the processes into one process object
			for(var id in selectedItems)
			{
			  var file = this.s.getRemotePathFromLocalPath(
														   currentRemotePath,
														   currentLocalPath,
														   selectedItems[id])

			  if(this.s.pathIsFolder(selectedItems[id]))
			  {
				aProcess = this.connections[server]
					  .downloadDirectory(
									file,
									currentRemotePath,
									f,
									aProcess
									);
			  }
			  else
			  {
				aProcess = this.connections[server].downloadFile(
											  file,
											  currentRemotePath,
											  f,
											  aProcess
											  );
			  }
			}
		  }
		  break;
		}
	  case 'upload':  
		{ 
		  var aProcess = false;//group the processes into one process object
		   
		  if(aboutFocusedTab)
		  {
			if(this.s.documentGetFocused(window).isDirty)
			{
			  var saveBeforeUpload = this.s.pref('save.before.upload');
			  var prompt;
			  if(saveBeforeUpload || (prompt = this.s.confirmWithCheckbox('The document was not saved, do you want to save the document before uploading?', 'Save my preference')).value)
			  {
				if(prompt && prompt.check)
				  this.s.pref('save.before.upload', true);
				this.s.tabGetFocused(window).save();
			  }
			  else
			  {
				break;
			  }
			}
		  }
		  for(var id in selectedItems)
		  {
			var file = this.s.getRemotePathFromLocalPath(
														 currentRemotePath,
														 currentLocalPath,
														 selectedItems[id])

			if(this.s.pathIsFolder(selectedItems[id]))
			{
			  var aDestination = this.s.getRemotePathFromLocalPath(currentRemotePath, currentLocalPath, file)
			  if(aDestination == '' || aDestination == '/')
			  {
				if(!this.s.confirm('Are you sure you want to upload all the tree?') ||
				   !this.s.confirm('Are you REALLY sure you want to upload all the tree?'))
				  break;
			  }
			  aProcess = this.connections[server].uploadDirectory(
											file,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
			else
			{
			   aProcess = this.connections[server].uploadFile(
											file,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
		  }
		  break;
		}
	}
	//this.s.dump('actionFromLocal:toolbarUpdate');
	this.toolbarUpdate();
  }
  
  //the action or command when clicking a menuitem from "tree or browser context menu"
  //the idea of this method is to "fire" some action from a selection, a tree selection or a browser selection
  //if no selection exists then the command shoul't be here
  this.gardenCommand = function(aCommand, aData)
  {
	if(!aCommand || aCommand == '')
	  return false;
	var fromBrowser = false;
	if(document.popupNode && document.popupNode == this.element('g-toolbar-breadcrumb'))//clicked root button..
	{
	  //this.s.dump('the command is for the "root" button');
	  var selectedTree = this.focusedTree;
	  var selectedInstance = this.focusedInstance;
	  
	  //simulate tree selection and properties
	  var selectedItems = [];
		  selectedItems[0] = {};
		  selectedItems[0].path = selectedTree.currentPath;
		  selectedItems[0].isDirectory = true;
		  
	  var selectedPaths = [];
	  for(var id in selectedItems)
		selectedPaths[selectedPaths.length] = selectedItems[id].path;
	  var selectedPath = selectedPaths[0];//the very first path on the selection
	  var selectedItem = selectedItems[0];//the very first item on the selection
	}
	else if(document.popupNode && document.popupNode.hasAttribute('path'))
	{
	  fromBrowser = true;
	  
	  //this.s.dump('the command is for the "browser" element');
	  var selectedTree = this.trees[document.popupNode.getAttribute('treeID')];
	  var selectedInstance = this.instances[document.popupNode.getAttribute('treeID')];
	  
	  //simulate tree selection and properties
	  var selectedItems = [];
		  selectedItems[0] = {};
		  selectedItems[0].path = document.popupNode.getAttribute('path');
		  selectedItems[0].isDirectory = document.popupNode.getAttribute('isDirectory') == 'true';
		  
	  var selectedPaths = [];
	  for(var id in selectedItems)
		selectedPaths[selectedPaths.length] = selectedItems[id].path;
	  var selectedPath = selectedPaths[0];//the very first path on the selection
	  var selectedItem = selectedItems[0];//the very first item on the selection
	}
	else
	{
	  //this.s.dump('the command is for the tree');
	  var selectedTree = this.focusedTree;
	  var selectedInstance = this.focusedInstance;
	  
	  //get tree selection and properties
	  var selectedItems = selectedTree.selectionGetSelectedItems();
	  var selectedPaths = [];
	  for(var id in selectedItems)
		selectedPaths[selectedPaths.length] = selectedItems[id].path;
	  var selectedItem = selectedTree.selectionGetSelectedItem();
	  if(!selectedItem){}
	  else
	  {
		var selectedPath = selectedItem.path;//the very first path on the selection
	  }
	}
	
	var currentPath = selectedTree.currentPath
	
	this.element('g-tree-context').hidePopup();
	
	switch(aCommand)
	{
	  case 'rebase':
		{
		  if(!selectedItem.isDirectory)
		  {
			var selectedPath = selectedPath.split(selectedInstance.__DS);
				selectedPath.pop();
				selectedPath = selectedPath.join(selectedInstance.__DS);
		  }
		  if(selectedPath == '')
			selectedPath = selectedInstance.__DS;
		  selectedTree.baseChange(selectedPath, true);
		  
		  break;
		}

	  case 'delete':
		{
		  if(selectedPaths.join('') != '' && this.s.confirm('Are you sure you want to PERMANENTLY delete the following items?\n\n\t'+selectedPaths.join('\n\t')+'\n'))
		  {
			var aProcess = false;//group the processes into one process object
			for(var id in selectedItems)
			{
			  if(selectedItems[id].isDirectory)
				aProcess = selectedInstance.removeDirectory(selectedItems[id].path, aProcess);
			  else
				aProcess = selectedInstance.removeFile(selectedItems[id].path, aProcess);
			  
			}
		  }
		  break;
		}
	  case 'trash':
		{
		  if(selectedInstance.type == 'local')
		  {
			if(selectedPaths.join('') != '' && this.s.confirm('Are you sure you want to send to the trash the following items?\n\n\t'+selectedPaths.join('\n\t')+'\n'))
			{
			  var aProcess = false;//group the processes into one process object
			  for(var id in selectedItems)
			  {
				if(selectedItems[id].isDirectory)
				  aProcess = selectedInstance.trashDirectory(selectedItems[id].path, aProcess);
				else
				  aProcess = selectedInstance.trashFile(selectedItems[id].path, aProcess);
				
			  }
			}
		  }
		  break;
		}
	  case 'permissions':
		{
		  var newPermissions = this.s.prompt('Enter new permissions…', 755, false, null, null, 'Apply recursive on folders?')
		  if(newPermissions.value != '')
		  {
			var aProcess = false;//group the processes into one process object
			for(var id in selectedItems)
			{
			  if(selectedItems[id].isDirectory)
			  {
				aProcess = selectedInstance.chmodDirectory(
																   selectedItems[id].path,
																   newPermissions.value,
																   newPermissions.check,
																   aProcess
																   );
			  }
			  else
			  {
				aProcess = selectedInstance.chmodFile(
															  selectedItems[id].path,
															  newPermissions.value,
															  aProcess);
			  }
			}
		  }
		  break;
		}
	  case 'rename-from-tree':
		{
		  selectedTree.startEditing();
		  break;
		}
	  case 'rename-from-browser':
		{
		  var aName = selectedPath.split(selectedInstance.__DS);
			  aName = aName.pop();
		  var newName = this.s.prompt('Enter new name…', aName);
		  if(newName != '' && newName != aName)
		  {
			var aData = {}
				aData.path = selectedPath;
				aData.newName = newName;
				aData.isDirectory = selectedItem.isDirectory;
			  this.gardenCommand('rename', aData);
		  }
		  break;
		}
	  case 'rename':
		{
		  if(aData.path != '' && aData.path != selectedInstance.__DS)//avoid move the root directory
		  {
			var parentPath = aData.path.split(selectedInstance.__DS);
			var aPath = parentPath.pop();
			parentPath = parentPath.join(selectedInstance.__DS);
			if(aPath && aPath != '')
			{
			  var newName = aData.newName
								  .replace(/^\/+/g, '').replace(/\/+$/g, '')
								  .replace(/^\\+/g, '').replace(/\\+$/g, '')
								  .replace(/\\+/g, '\\').replace(/\/+/g, '/')
								  .split('/').join(selectedInstance.__DS);

			  if(
				 newName != '' &&
				 newName != selectedInstance.__DS &&
				 parentPath+selectedInstance.__DS+newName != aData.path
			  )
			  {
				newName = parentPath+selectedInstance.__DS+newName;
				if(selectedInstance.__DS == '\\')
				  var ds = '\\\\';
				else
				  var ds = '\/';
				var regexp = new RegExp(ds+'[^'+ds+']+'+ds+'\.\.'+ds);
				while(regexp.test(newName))
				  newName = newName.replace(regexp, selectedInstance.__DS);
				if(
				 newName != '' &&
				 newName != selectedInstance.__DS
				)
				{
				  selectedInstance.rename(aData.path, newName, aData.isDirectory);
				}
			  }
			}
		  }
		  break;
		}
	  case 'move':
		{
		  if(selectedPath != '' && selectedPath != selectedInstance.__DS)//avoid move the root directory
		  {
			var newName = this.s.prompt('Move to…', selectedPath);
			if(!newName	|| newName == ''){}
			else
			{
				newName = newName
								  .replace(/\/+$/g, '')
								  .replace(/\\+$/g, '')
								  .split('/').join(selectedInstance.__DS);
			  if(selectedInstance.__DS == '\\')
				var ds = '\\\\';
			  else
				var ds = '\/';
			  var regexp = new RegExp(ds+'[^'+ds+']+'+ds+'\.\.'+ds);
			  while(regexp.test(newName))
				newName = newName.replace(regexp, selectedInstance.__DS);
			  if(
				 newName != '' &&
				 newName != selectedPath &&
				 newName != selectedInstance.__DS
			  )
			  {
				if(!this.s.confirm('Are you sure you want to move \n\t"'+selectedPath+'" \nto \n\t"'+newName+'"?'))
					break;
				selectedInstance.rename(selectedPath, newName, selectedItem.isDirectory);
			  }
			}
		  }
		  break;
		}
	  case 'new-folder':
		{
		  var newName = this.s.prompt('Enter folder name…', '');
		  if(newName != '')
		  {
			if(!selectedItem.isDirectory)
			{
			  var selectedPath = selectedPath.split(selectedInstance.__DS);
				  selectedPath.pop();
				  selectedPath = selectedPath.join(selectedInstance.__DS);
			}
			newName = newName
								.replace(/^\/+/g, '').replace(/\/+$/g, '')
								.replace(/^\\+/g, '').replace(/\\+$/g, '')
								.replace(/\\+/g, '\\').replace(/\/+/g, '/')
								.split('/').join(selectedInstance.__DS);
			if(newName != '' && newName != selectedInstance.__DS)
			  selectedInstance.createDirectory(selectedPath, newName);
		  }
		  break;
		}
	  case 'new-file':
		{
		  if(selectedInstance.type == 'local')
		  {
			var newName = this.s.prompt('Enter file name…', '');
			if(newName != '')
			{
			  if(!selectedItem.isDirectory)
			  {
				var selectedPath = selectedPath.split(selectedInstance.__DS);
					selectedPath.pop();
					selectedPath = selectedPath.join(selectedInstance.__DS);
			  }
			  newName = newName
								  .replace(/^\/+/g, '').replace(/\/+$/g, '')
								  .replace(/^\\+/g, '').replace(/\\+$/g, '')
								  .replace(/\\+/g, '\\').replace(/\/+/g, '/')
								  .split('/').join(selectedInstance.__DS);
			  if(newName != '' && newName != selectedInstance.__DS)
				selectedInstance.createFile(selectedPath+selectedInstance.__DS+newName);
			}
		  }
		  break;
		}
	  case 'reload':
		{
		  selectedTree.reload();
		  break;
		}
	  case 'refresh':
		{
		  var pathsToRefresh = [];
		  
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory)
			  pathsToRefresh[pathsToRefresh.length] = selectedItems[id].path;
			else
			{
			  var selectedPath = selectedItems[id].path.split(selectedInstance.__DS);
				  selectedPath.pop();
				  selectedPath = selectedPath.join(selectedInstance.__DS);
			  pathsToRefresh[pathsToRefresh.length] = selectedPath;	  
			}
		  }
		  pathsToRefresh = this.s.arrayUnique(pathsToRefresh);
		  //this.s.dump('paths to refresh ', pathsToRefresh);
			 
		  for(var id in pathsToRefresh)
			selectedTree.refreshPath(pathsToRefresh[id]);
			
		  break;
		}
	  case 'find-replace':
		{
		  if(selectedInstance.type == 'local')
			ko.launch.findInFiles.apply(ko.launch, ['', selectedPaths.join(';')]);
		  break;
		}
	  case 'show-in-folder':
		{
		  if(selectedInstance.type == 'local')
		  {
			for(var id in selectedPaths)
			  this.s.reveal(selectedPaths[id]);
		  }
		  break;
		}

	  case 'open':
		{
		  var aProcess = false;//group the processes into one process object
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory)
			{
			  if(fromBrowser)
				this.s.launch(selectedItems[id].path);
			  else
				selectedTree.openContainerFromPath(selectedItems[id].path);
			}
			else
			{
			  if(selectedInstance.type == 'remote')
			  {
				var aSibling;
				if(aSibling = this.groupTreeGetSiblingLocal(selectedTree.treeElement))
				{
				  var aLocalPath = this.s.resolveLocalPath(
														  selectedItems[id].path,
														  selectedTree.originalPath,
														  aSibling[0],
														  selectedInstance.__DS,
														  aSibling[1]
														);
				  aProcess = selectedInstance.downloadAndOpenFile(
								selectedItems[id].path,
								aLocalPath,
								aSibling[2],
								aProcess
							);
				}
				else
				{
				  this.s.alert('There is no local sibling tree for the remote tree "'+selectedInstance.label+'"');
				  break;
				}
			  }
			  else
			  {
				this.s.launch(selectedItems[id].path);
			  }
			}
		  }
		  break;
		}
	  case 'edit-from-tree':
		{
		  var aProcess = false;//group the processes into one process object
		  
		  for(var id in selectedItems)
		  {
			if(!selectedItems[id].isDirectory)
			{
			  if(selectedInstance.type == 'remote')
			  {
				var aSibling;
				if(aSibling = this.groupTreeGetSiblingLocal(selectedTree.treeElement))
				{
				  var aLocalPath = this.s.resolveLocalPath(
														  selectedItems[id].path,
														  selectedTree.originalPath,
														  aSibling[0],
														  selectedInstance.__DS,
														  aSibling[1]
														);
				  aProcess = selectedInstance.downloadAndEditFile(
								selectedItems[id].path,
								aLocalPath,
								aSibling[2],
								aProcess
							);
				}
				else
				{
				  this.s.alert('There is no local sibling tree for the remote tree "'+selectedInstance.label+'"');
				  break;
				}
			  }
			  else
			  {
				this.s.openURL(window, selectedItems[id].path, true);
			  }
			}
		  }
		  selectedTree.toggleOpenStateContainers(selectedItems, selectedItems[selectedItems.length-1]);
		  break;
		}
	  case 'open-from-tree':
		{
		  var aProcess = false;//group the processes into one process object
		  
		  for(var id in selectedItems)
		  {
			if(!selectedItems[id].isDirectory)
			{
			  if(selectedInstance.type == 'remote')
			  {
				var aSibling;
				if(aSibling = this.groupTreeGetSiblingLocal(selectedTree.treeElement))
				{
				  var aLocalPath = this.s.resolveLocalPath(
														  selectedItems[id].path,
														  selectedTree.originalPath,
														  aSibling[0],
														  selectedInstance.__DS,
														  aSibling[1]
														);
				  aProcess = selectedInstance.downloadAndOpenFile(
								selectedItems[id].path,
								aLocalPath,
								aSibling[2],
								aProcess
							);
				}
				else
				{
				  this.s.alert('There is no local sibling tree for the remote tree "'+selectedInstance.label+'"');
				  break;
				}
			  }
			  else
			  {
				this.s.launch(selectedItems[id].path);
			  }
			}
			else
			{
			  if(selectedInstance.type == 'remote'){}
			  else
				this.s.launch(selectedItems[id].path);
			}
		  }
		  break;
		}
	  case 'edit':
		{
		  var aProcess = false;//group the processes into one process object
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory)
			{
			  //middle click on tree is edit on komodo but if middle click on a folder open the folder.
			  if(selectedInstance.type == 'local')
				this.s.launch(selectedItems[id].path);
			}
			else
			{
			  if(selectedInstance.type == 'remote')
			  {
				var aSibling;
				if(aSibling = this.groupTreeGetSiblingLocal(selectedTree.treeElement))
				{
				  var aLocalPath = this.s.resolveLocalPath(
														  selectedItems[id].path,
														  selectedTree.originalPath,
														  aSibling[0],
														  selectedInstance.__DS,
														  aSibling[1]
														);
				  aProcess = selectedInstance.downloadAndEditFile(
								selectedItems[id].path,
								aLocalPath,
								aSibling[2],
								aProcess
							);
				}
				else
				{
				  this.s.alert('There is no local sibling tree for the remote tree "'+selectedInstance.label+'"');
				  break;
				}
			  }
			  else
			  {
				this.s.openURL(window, selectedItems[id].path, true);
			  }
			}
		  }
		  break;
		}
	  case 'duplicate':
		{
		  var aProcess = false;//group the processes into one process object
		  if(selectedInstance.type == 'local')
		  {
			for(var id in selectedItems)
			{
			  if(selectedItems[id].isDirectory)
			  {
				aProcess = selectedInstance.duplicateDirectory(selectedItems[id].path, aProcess);
			  }
			  else
			  {
				aProcess = selectedInstance.duplicateFile(selectedItems[id].path, aProcess);
			  }
			}
		  }
		  break;
		}
	  case 'paste':
		{
		  var aProcess = false;//group the processes into one process object
		  if(selectedInstance.type == 'local')
		  {
			var pathsToCopy = this.s.clipboardGetFilesPaths();
			var isCuting = this.s.clipboardGetFilesPathsIsCuting();
			//alert(pathsToCopy.toSource());
			for(var i in pathsToCopy)
			{
			  var isDirectory = this.s.pathIsFolder(pathsToCopy[i]);
			  var aName = this.s.file(pathsToCopy[i]).leafName;
			  for(var id in selectedItems)
			  {
				if(selectedItems[id].isDirectory)
				{
				  var aDestination = selectedItems[id].path;
				}
				else
				{
				  var aDestination = selectedItems[id].path.split(selectedInstance.__DS);
					  aDestination.pop();
					  aDestination = aDestination.join(selectedInstance.__DS);
					  if(!aDestination || aDestination == '')
						aDestination = selectedInstance.__DS;
				}
				aDestination = aDestination+selectedInstance.__DS+aName;
				if(isDirectory)
				{
				  if(!isCuting)
					aProcess = selectedInstance.copyDirectory(pathsToCopy[i], aDestination, aProcess);
				  else
					aProcess = selectedInstance.rename(pathsToCopy[i], aDestination, true, aProcess);
				}
				else
				{
				  if(!isCuting)
					aProcess = selectedInstance.copyFile(pathsToCopy[i], aDestination, aProcess);
				  else
					aProcess = selectedInstance.rename(pathsToCopy[i], aDestination, false, aProcess);
				}
			  }
			}
		  }
		  break;
		}
	  case 'cut':
		{
		  var aProcess = false;//group the processes into one process object
		  if(selectedInstance.type == 'local')
		  {
			var pathsToCopy = [];
			for(var id in selectedItems)
			{
			  pathsToCopy[pathsToCopy.length] =  selectedItems[id].path;
			}
			this.s.clipboardSetFilesPaths(pathsToCopy, true);
		  }
		  break;
		}
	  case 'copy':
		{
		  var aProcess = false;//group the processes into one process object
		  if(selectedInstance.type == 'local')
		  {
			var pathsToCopy = [];
			for(var id in selectedItems)
			{
			  pathsToCopy[pathsToCopy.length] =  selectedItems[id].path;
			}
			this.s.clipboardSetFilesPaths(pathsToCopy);
		  }
		  break;
		}
	  case 'download':
		{
		  var aProcess = false;//group the processes into one process object

		  if(selectedInstance.type == 'remote')
		  {
			var aSibling;
			if(aSibling = this.groupTreeGetSiblingLocal(selectedTree.treeElement))
			{
			  for(var id in selectedItems)
			  {
				if(selectedItems[id].isDirectory)
				{
				  var aLocalPath = this.s.resolveLocalPath(
														  selectedItems[id].path,
														  selectedTree.originalPath,
														  aLocalOriginalPath[0],
														  selectedInstance.__DS,
														  aLocalOriginalPath[1]
														);
				  aProcess = selectedInstance.downloadAndEditFile(
								selectedItems[id].path,
								aLocalPath,
								aProcess
							);				 
				}
				else
				{
				  var aLocalPath = this.s.resolveLocalPath(
														  selectedItems[id].path,
														  selectedTree.originalPath,
														  aLocalOriginalPath[0],
														  selectedInstance.__DS,
														  aLocalOriginalPath[1]
														);
				  aProcess = selectedInstance.downloadAndEditFile(
								selectedItems[id].path,
								aLocalPath,
								aProcess
							);
				}
			  }
			}
			else
			{
			  this.s.alert('There is no local sibling tree for the remote tree "'+selectedInstance.label+'"');
			  break;
			}
		  }
		  else
		  {
			
		  }
		  break;
		  
		  
		  
		  
		  
		  var aProcess = false;//group the processes into one process object
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory)
			{
			  var aDestination = this.s.getRemotePathFromLocalPath(currentRemotePath, currentLocalPath, selectedItems[id].getFilepath)
			  if(aDestination == '' || aDestination == '/')
			  {
				if(
				   !this.s.confirm('Are you sure you want to download all the tree?') || 
				   !this.s.confirm('Are you REALLY sure you want to download all the tree?')
				   )
				  break;
			  }
			  aProcess = this.connections[server].downloadDirectory(
											selectedItems[id].getFilepath,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
			else
			{
			  aProcess = this.connections[server].downloadFile(
											selectedItems[id].getFilepath,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
		  }
		  break;
		}
	  case 'download-to-folder':
		{

		  var f = ko.filepicker.getFolder(null, 'Download selected items to…');
		  if(f && f != '')
		  {
			var aProcess = false;//group the processes into one process object
			for(var id in selectedItems)
			{
			  if(selectedItems[id].isDirectory)
			  {
				aProcess = this.connections[server].downloadDirectory(
											  selectedItems[id].getFilepath,
											  currentRemotePath,
											  f,
											  aProcess
											  );
			  }
			  else
			  {
				aProcess = this.connections[server].downloadFile(
											  selectedItems[id].getFilepath,
											  currentRemotePath,
											  f,
											  aProcess
											  );
			  }
			}
		  }
		  break;
		}
	  case 'download-from-remote-toolbarbutton':
		{
		  if(
			//if the local places has no focus and the remote places has  focus
			 ((!ko.places.viewMgr || !ko.places.viewMgr.focused) && this.trees[server].focused) ||
			 //if there is selected files on remote, and there is NO selected files on local
			 (this.s.placesLocalGetSelectedPaths(window).length === 0 && this.trees[server].selectionGetSelectedItems().length > 0)
			 
		  )
		  {
			this.gardenCommand('download');
		  }
		  else if(
				  //if the remote pane has NO focus and the places pane has focus
				  (!this.trees[server].focused && ko.places.viewMgr && ko.places.viewMgr.focused) ||
				  //if there is selected files on local pane, and there is NO selected files on remote
				  (this.trees[server].selectionGetSelectedItems().length === 0 && this.s.placesLocalGetSelectedPaths(window).length > 0)
				  )
		  {
			this.actionFromLocal('download');
		  }
		  else
		  {
			this.connections[server].log('error', 'Not sure about what file to download,  the panels local and remote are both unfocused.', 0);
		  }
		  break;
		}	  

	  
	  case 'diff':
		{
		  var aProcess = false;//group the processes into one process object
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory){}
			else
			{
			  if(selectedInstance.type == 'remote')
			  {
				var aLocalOriginalPath;
				if(aLocalOriginalPath = this.groupTreeGetSiblingLocal(selectedTree.treeElement))
				{
				  var aLocalPath = this.s.resolveLocalPath(
														  selectedItems[id].path,
														  selectedTree.originalPath,
														  aLocalOriginalPath[0],
														  selectedInstance.__DS,
														  aLocalOriginalPath[1]
														);
				  aProcess = selectedInstance.downloadAndEditFile(
								selectedItems[id].path,
								aLocalPath,
								aProcess
							);
				  
				  var aTemporalLocalPath = this.s.folderCreateTemporal('diff');
				  
				}
				else
				{
				  this.s.alert('There is no local sibling tree for the remote tree "'+selectedInstance.label+'"');
				  break;
				}
			  }
			  else
			  {
				this.s.openURL(window, selectedItems[id].path, true);
			  }
			}
		  }
		  break;
		}


	  
	  

	  case 'upload':
		{
		  var aProcess = false;//group the processes into one process object
		  for(var id in selectedItems)
		  {
			if(selectedItems[id].isDirectory)
			{
			  var aDestination = this.s.getRemotePathFromLocalPath(currentRemotePath, currentLocalPath, selectedItems[id].getFilepath)
			  if(aDestination == '' || aDestination == '/')
			  {
				if(!this.s.confirm('Are you sure you want to upload all the tree?') ||
				   !this.s.confirm('Are you REALLY sure you want to upload all the tree?'))
				  break;
			  }
			  aProcess = this.connections[server].uploadDirectory(
											selectedItems[id].getFilepath,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
			else
			{
			  aProcess = this.connections[server].uploadFile(
											selectedItems[id].getFilepath,
											currentRemotePath,
											currentLocalPath,
											aProcess
											);
			}
		  }
		  break;
		}
	  case 'upload-from-remote-toolbarbutton':
		{
		  if(
			//if the local places has no focus and the remote places has  focus
			 ((!ko.places.viewMgr || !ko.places.viewMgr.focused) && this.trees[server].focused) ||
			 //if there is selected files on remote, and there is NO selected files on local
			 (this.s.placesLocalGetSelectedPaths(window).length === 0 && this.trees[server].selectionGetSelectedItems().length > 0)
			 
		  )
		  {
			this.gardenCommand('upload');
		  }
		  else if(
				  //if the remote pane has NO focus and the places pane has focus
				  (!this.trees[server].focused && ko.places.viewMgr && ko.places.viewMgr.focused) ||
				  //if there is selected files on local pane, and there is NO selected files on remote
				  (this.trees[server].selectionGetSelectedItems().length === 0 && this.s.placesLocalGetSelectedPaths(window).length > 0)
				  )
		  {
			this.actionFromLocal('upload');
		  }
		  else
		  {
			this.connections[server].log('error', 'Not sure about what file to upload,  the panels local and remote are unfocused.', 0);
		  }
		  break;
		}

	  default:
	  {
		throw new Error('the switch of actions cant match the action:'+aCommand);
	  }
	}
	this.element('g-toolbar-group-menupopup').hidePopup();
	this.toolbarUpdate();
  }
  
  
}).apply(garden);