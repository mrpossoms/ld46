const g = require('./static/js/g.js');
const vox_parser = require('parse-magica-voxel')

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

		},
		disconnected: function(player)
		{
			console.log('player: ' + player.id + ' disconnected');
		}
	},
	// main game loop
	update: function(dt)
	{

	}
};
