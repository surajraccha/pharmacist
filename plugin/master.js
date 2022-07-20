(function () {

	// Don't emit events from inside of notes windows
	if (window.location.search.match(/receiver/gi)) { return; }

	var multiplex = Reveal.getConfig().multiplex;

	var socket = io.connect(multiplex.url);

	const domain = multiplex.domain;

	function post(evt) {
		//console.log("test",OverView);
		// console.log(evt);
		var messageData = {
			state: Reveal.getState(),
			secret: multiplex.secret,
			socketId: multiplex.id,
			content: (evt || {}).content,
			domain: domain
		};
			
		socket.emit('multiplex-statechanged', messageData);
	};

	function unload() {
		console.log("page unload");
		var messageData = {
			state: Reveal.getState(),
			secret: multiplex.secret,
			socketId: multiplex.id,
			domain: domain
		};

		socket.emit('page-unload', messageData);
	};


	// post once the page is loaded, so the client follows also on "open URL".
	//	window.addEventListener( 'load', post );
	//Executes on on page unload
	//  window.addEventListener( 'unload', unload );
	// Monitor events that trigger a change in state

	Reveal.addEventListener('slidechanged', post);
	//Reveal.addEventListener( 'fragmentshown', post );
	//Reveal.addEventListener( 'fragmenthidden', post );

	//Reveal.addEventListener( 'paused', post );
	//Reveal.addEventListener( 'resumed', post );
	//document.addEventListener( 'send', post ); // broadcast custom events sent by other plugins

}());
