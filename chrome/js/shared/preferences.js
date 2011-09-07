    
  this.preferences = myAPI.pref(true, this.id);
  
  this.pref = function(aName, aValue, aCreate)
  {
	return this.preferences.pref(aName, aValue, aCreate);
  }
  
  this.pref('log.show.error', true, true);
  this.pref('log.show.warning', false, true);
  this.pref('log.show.progress', true, true);
  this.pref('log.show.sucess', true, true);
  
  this.pref('overwrite.no.ask', false, true);
  
  this.pref('no.hidden.items', true, true);
  
  this.pref('dont.cache.last.modified', false, true);
  
  this.pref('save.before.upload', false, true);
  
  this.pref('last.focused.treeID', '0', true);
  this.pref('last.focused.groupID', '0', true);
  this.pref('last.focused.path', '', true);
  
  this.pref('sidebar.view.type.single', true, true);
  this.pref('sidebar.view.type.multiple.horizontal', false, true);
  this.pref('sidebar.view.type.multiple.vertical', false, true);