(function() {
	var multiplex = Reveal.getConfig().multiplex;
	var socketId = multiplex.id;
	var socket = io.connect(multiplex.url);
	const params = new URLSearchParams(window.location.search);
	const domain = multiplex.domain;

	socket.on(multiplex.id, function(message) {
		console.log("state>>",message,message.state);
		// ignore data from sockets that aren't ours
		if (message.socketId !== socketId) { return; }
		
		if(message.domain !== domain){return;}
		
		if( window.location.host === 'localhost:1947' ) return;
       
		if ( message.state ) {
			Reveal.setState(message.state);
		}
		if ( message.content ) {
			// forward custom events to other plugins
			var event = new CustomEvent('received');
			event.content = message.content;
			document.dispatchEvent( event );
		}
		
	});

}());
