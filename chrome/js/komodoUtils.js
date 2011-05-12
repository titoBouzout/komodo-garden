	
function AsynchRemoteKomodo()
{
  this.placesLocalRootButtonClicked = false;
  
  this.placesLocalCurrentPath = function()
  {
	if(ko && ko.places && ko.places.manager && ko.places.manager.currentPlace)
	  return asynchRemote.s.filePathFromFileURI(ko.places.manager.currentPlace);
	else
	  return '';
  }
  //detects when the user right click the placesRootButton
  this.placesLocalPopupShown = function(event)
  {
	if(event.currentTarget == event.originalTarget)
	{
	  if(ko.places.manager._clickedOnRoot())
		this.placesLocalRootButtonClicked = true;
	  else
		this.placesLocalRootButtonClicked = false;
	}
  }

  this.placesLocalGetSelectedPaths = function(focusedTab)
  {
	if(!focusedTab)
	{
	  var selected = gPlacesViewMgr.getSelectedURIs();

	  if(!this.placesLocalRootButtonClicked && selected && selected.length && selected.length > 0)
	  {
		for(var id in selected)
		  selected[id] = asynchRemote.s.filePathFromFileURI(selected[id]);
	  }
	  else
	  {
		selected = [];
		selected[0] = this.placesLocalCurrentPath();
	  }
	}
	else
	{
	  var selected = [];
		  selected[0] = asynchRemote.s.filePathFromFileURI(this.documentFocusedGetLocation());
	}
	return selected;
  }
  this.documentFocusedGetLocation = function()
  {
	return this.documentGetLocation(this.documentGetFocused());
  }
  this.documentGetFocused = function()
  {
	var aDoc = this.documentGetFromTab(this.tabGetFocused());
	if(aDoc)
	  return aDoc;
	else
	  return '';
  }
  this.documentGetLocation = function(aDoc)
  {
	if(aDoc && aDoc.displayPath)
	  return aDoc.displayPath;
	else
	  return '';
  }
  this.documentGetFromTab = function(aTab)
  {
	if(aTab && aTab.document)
	  return aTab.document;
	else
	  return '';
  }
  this.tabGetFocused = function()
  {
	if(ko.views.manager && ko.views.manager.currentView)
	  return ko.views.manager.currentView;
	else
	  return '';
  }
}