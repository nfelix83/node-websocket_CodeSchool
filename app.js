var express = require('express');
var app  = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/nodeSock');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(callback){
	console.log("Connected to DB");

});

var chatterSchema = mongoose.Schema({
	name: { type: String, required: true}
});

var messageSchema = mongoose.Schema({
	message: String,
	created: { type: Date, default: Date.now },
	name: String
});

var Chatter = mongoose.model('Chatter', chatterSchema);
var Message = mongoose.model('Message', messageSchema);

var storeMessage = function(name, message){
	var message = new Message({message: message, name: name});
	message.save(function (error, message){
		console.log(message);
	});
};

io.on('connection', function(client){
	console.log('Client connected...');
	client.emit('init');
	client.on('connecting', function(name){
		Chatter.find({name:name}, function(err, name){
			if(name.length != 0){
				client.emit('connecting');
			} else {
				client.emit('connected');
				console.log("client emit connected");
			}
		});
	});

	client.on('join', function(name){
		client.nickname = name;

		var chatter = new Chatter({name: name});
		chatter.save( function(err, name){
			Chatter.find({}, function(err, names){
				names.forEach(function(name){
					client.emit('add chatter', name.name);
				});
			});
		});

		client.broadcast.emit('add chatter', name);

		Message.find({}).limit(20).exec(function(err, messages){
			messages.forEach(function(message){
				client.emit("message", message.name + ": " + message.message);
			});
		});
		console.log(client.nickname + " has joined");
	});

	client.on('message', function(message){
		var name = client.nickname;
		client.broadcast.emit('message', name + ': ' + message);
		client.emit('message', name + ': ' + message);
		storeMessage(name, message);
	});

	client.on('disconnect', function(){
		var user = client.nickname;
		client.broadcast.emit('remove chatter', user);
		Chatter.remove({name:user}, function(err){});
	});
});

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.get('/search', function(req, res) {
	http.get({host: "torrentproject.se",
		      path: "/?s" + "John" + "&out=json"},
		      function(req, res){
		      	console.log(res);
		      });
});
server.listen(80);
