const g = require('./static/js/g.js');

module.exports.server = {
	// map of all connected players
	players: {},
	// complete game state
	state: {},
	// handlers for all player connection events
	player: {
		connected: function(player)
		{
			console.log('player: ' + player.id + ' connected');
		},
		on_message: function(player, message)
		{
			console.log('player: ' + player.id + ' on_message');
		},
		update: function(player)
		{
			console.log('player: ' + player.id + ' tick');
		},
		disconnected: function(player)
		{
			console.log('player: ' + player.id + ' disconnected');
		}
	},
	// main game loop
	update: function(dt)
	{
		const child_process = require("child_process");
		// Sleep for 5 seconds
		child_process.execSync("sleep 1");
	}
};
