const process  = function(aName, aID)//instanceable
{

  this.id = aID;
  this.name = aName;
  
  this.pause = false;
  this.abort = false;
  this.start = false;
  //properties
  this.p = {};
  this.p.l = {};// properties
  this.p.r = {};// properties
  
  this.runnables = [];
  this.runnablesCopy = [];

 //flags get
 
  this.running  = function()
  {
	return !this.completed() && !this.paused() && !this.aborted();
  }
  this.stopped = function()
  {
	return this.paused() || this.aborted();
  }
  this.completed = function()
  {
	return (this.runnables.length === 0 && this.started() === true);
  }
  this.paused = function(pause)
  {
	if(typeof(pause) == 'undefined')
	  return this.pause;
	else
	  return this.pause = pause;
  }
  this.aborted = function(abort)
  {
	if(typeof(abort) == 'undefined')
	  return this.abort;
	else
	  return this.abort = abort;
  }
  this.started = function(start)
  {
	if(typeof(start) == 'undefined')
	  return this.start;
	else
	  return this.start = start;
  }
  this.hasPendingTask = function()
  {
	return this.runnables.length > 0;
  }
//start, restarting, continue

  this.restart = function()//restart the process again by calling the first function
  {
	this.aborted(false);
	this.paused(false);
	this.runnables = [];
	for(var id in this.runnablesCopy)
	  this.runnables[this.runnables.length] = this.runnablesCopy[id];
  }
  this.continue = function() //should continue a paused or aborted process.
  {
	this.aborted(false);
	this.paused(false);
  }
//queriyng
  this.canRun  = function()
  {
	return this.running();
  }
//adding
  this.queue = function(aFunction, aInternal)
  {
	this.runnables.push(aFunction);
	if(!aInternal)
	  this.runnablesCopy.push(aFunction);
  }
//adding these that failed
  this.reQueue = function(aFunction)
  {
	this.runnables.unshift(aFunction);
  }
//running one
  this.run = function()
  {
	this.lastRunnuable = this.runnables.shift();
	return this.lastRunnuable;
  }
}