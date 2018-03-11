//Almost a bug. Whoops!
var config = reloadConfig();

//Main Discord API (Unnoficial, but easier for me to understand lol)
const Discord = require("discord.js");


//Twitch Streaming
const twitchStreams = require('twitch-get-stream')(config.twitchSecret);
const m3u8 = require('m3u8stream');

//Audio streaming stuff
const request = require('request');
const Stream = require("stream");

//RNG Stuff
const rand = require("random-js");

const randEngine = rand.engines.nativeMath;

//Database Stuff
const low = require("lowdb");

const FileSync = require("lowdb/adapters/FileSync");

const xpFile = "./levels.json";
const jobFile = "./jobs.json";

var xpAdapter = new FileSync(xpFile);
var xpDb = low(xpAdapter);

xpDb.defaults({users:{}}).write();

var jobAdapter = new FileSync(jobFile);
var jobDb = low(jobAdapter);

jobDb.defaults({users:{}}).write();

//Setting up...
const client = new Discord.Client();

var voiceChannel;

//LEGGO! (Functions etc)

/**

TO-DO:
    1. Finish off rolling system. Unsure if it even works lol
    2. Finish off jobs... that will definently take a while...

**/
function reloadConfig(){
	return require("./config.json");
}

function reloadXP() {
	xpAdapter = new FileSync(xpFile);
	xpDb = low(xpAdapter);
	return xpDb;
}

function getXp(user) {
	xpDb = reloadXP();	
	var xp = xpDb.get('users.'+user+'.xp').value();
	if (xpDb.get('users.'+user+'.name').value() == null) {
		xpDb.set('users.'+user+'.name',user).write();
	}
	if (xp != null) {
		return xp;
	} else {
		xpDb.set('users.'+user+".xp",0).write();
		var temp = xpDb.get('users.'+user+'.xp').value();
		return temp;
	}
}

function getLevel(user) {
	xpDb = reloadXP();	
	var xp = xpDb.get('users.'+user+'.level').value();
	if (xpDb.get('users.'+user+'.name').value() == null) {
		xpDb.set('users.'+user+'.name',user).write();
	}
	if (xp != null) {
		return xp;
	} else {
		xpDb.set('users.'+user+".level",1).write();
		var temp = xpDb.get('users.'+user+'.level').value();
		return temp;
	}
}

function setXp(user,amt) {
	xpDb = reloadXP();
	xpDb.set('users.'+user+'.xp',amt).write();
}

function setLevel(user,amt) {
	xpDb = reloadXP();
	xpDb.set('users.'+user+'.level',amt).write();
}

function changeXp(author,amt,chan,member) {
	xpDb = reloadXP();
	var user = author.username;
	var currentXp = getXp(user);
	var newXp = currentXp + amt;
	var loop = true
	var lvlP = getLevel(user);
	setXp(user,newXp);
	while (loop) {
		if (newXp > calculateLevelXp(user)) {
			changeLevel(user,1)
		} else {
			loop = false
		}
	}
	if (lvlP < getLevel(user)) {
		author.send("Congratulations @"+user+"! You are now chat level "+getLevel(user)); //Send DM
		playFile("levelup",member);
	}
}

function changeLevel(user,amt) {
	xpDb = reloadXP();
	var currentXp = getLevel(user);
	var newXp = currentXp + amt;
	setLevel(user,newXp);
}

function calculateLevelXp(user,testing) {
	var currentLevel = getLevel(user)+1;
	if (testing != undefined) { 
		currentLevel = testing;
	} 
	var nextLevelXp = Math.floor(((6/5)*Math.pow(currentLevel,3))-((15)*Math.pow(currentLevel,2))+(100*(currentLevel))-140) //Medium-slow Pokemon XP formula.
	return nextLevelXp;
}

function calculateXpToNextLevel(user) {
	var nextLevelXp = calculateLevelXp(user);
	var currentXp = getXp(user);
	return {toNext:nextLevelXp-currentXp,formatted:currentXp+"/"+nextLevelXp};
}

function calculateXpGain(user,msg) {
	var newMsg = msg.replace(/\s+/g,"");
	
	var charCount = newMsg.length;

	var xpBonus = charCount; //Floor the charCount. Just in case I want to do voodoo math magic to it.
	if (xpBonus > config.punishMsgLen) { //Punish for rediculously long messages
		xpBonus = config.longMsgPunishment;
	} else if (xpBonus > 270) { //Keep within normal bounds :P
		xpBonus = Math.floor(xpBonus/2); //Square Root
	}

	if (xpBonus != 0) {
		var pokemonLevel = 5;
		var plrLevel = getLevel(user);

		if (config.outputDebugMessages) console.log("[DEBUG]: Base XP for this message: "+xpBonus)
		
		var gain = Math.floor((((1*xpBonus*pokemonLevel)/(5*1))*((Math.pow(2*pokemonLevel+10,2.5))/(Math.pow(pokemonLevel+plrLevel+10),2.5))+1)*1*1*1);
		gain = Math.floor(gain / 100)
		if (gain >= 500) {
			Math.floor(gain/Math.pow(Math.PI,Math.log(gain)));
		}

		if (charCount < config.minMsgLen) {
			gain = Math.floor(gain/2);
		}

		if (config.outputDebugMessages) console.log("[DEBUG]: Total XP Gain for this message: "+gain+"XP");
		return gain;
	} else {
		return 0; //No reason to use extra CPU time calculating 0 lol
	}
}
var twitchVoiceChannel = null;
function playTwitchStream(name,member,chan) {
	if (twitchVoiceChannel != null) {
		stopTwitchStream();
	}

	twitchStreams.get(name)
	.then(function(streams) {
		for (var i=0;i<streams.length;i++) {
			var target = streams[i];
			if (target.quality.toLowerCase() == 'audio only') {
				//console.log(target);

				twitchVoiceChannel = member.voiceChannel;
				if (twitchVoiceChannel == undefined) return console.log("You need to be in a voice channel to play sounds!");
				twitchVoiceChannel.join().then(connection =>{
					var stream = new Stream.PassThrough();
					m3u8(target.url).pipe(stream);
					const dispatcher = connection.playStream(stream);
					chan.send("Joining voice channel '"+twitchVoiceChannel.name+"' to play "+name+"'s stream audio.");
					dispatcher.on("end", end => {
						chan.send("Leaving voice channel.");
						twitchVoiceChannel.leave();
					});
				}).catch(err => {
					console.log(err);
					twitchVoiceChannel.leave();
					return false,err;
				});
				return true,"Success!";

			}
		}
	}).catch(err => {
		console.log(err);
		if (err.status == 404) {
			console.log("Stream not found.");
			chan.send('Stream "'+name+'" not found! Make sure you spelled the name correctly, and that they are live!');
		} else {
			console.log('Unknown error while attempting to resolve twitch stream "'+name+'".');
			chan.send('Unknown error while attempting to connect to Twitch stream "'+name+'". HTTP Code: "'+err.status+'".');
		}
		return;
	});
}

function stopTwitchStream() {
	twitchVoiceChannel.leave();
	twitchVoiceChannel = null;
}

var looping;
function play(media,type,channel) {
	channel.join().then(function(connection) {
		if (type == "file") {
			const dispatcher = connection.playFile("./sounds/"+media+".ogg")
			dispatcher.on("end",function(end) {
				voiceChannel.leave();
			});
		} else if (type == "stream") {
			var pass = Stream.PassThrough();
			request.get(media).pipe(pass);
			const dispatcher = connection.playStream(pass);
			dispatcher.on("end",function(end) {
				voiceChannel.leave();
				return "dont wait";
			});
		} else {
			console.log("[ERROR]: Unknown type!");
		}
	}).catch(function(err) {
		console.log(err);
	});
}

var loop;
function playURL(url,member,loopable) {
	voiceChannel = member.voiceChannel;
	if (voiceChannel == undefined) return false,"You need to be in a voice channel to play sounds!";
	if (loopable) {
		var done = "dont wait";
		loop = setInterval(function() {
			if (client.voiceConnections.array().length < 1) {
				play(url,"stream",voiceChannel);
			}
		},100);
	} else {
		play(url,"stream",voiceChannel);
	}
}

function stopPlaying() {
	voiceChannel.leave();
	if (loop) clearInterval(loop);
}

function playFile(name,member) {
	voiceChannel = member.voiceChannel;
	if (voiceChannel == undefined) return false,"You need to be in a voice channel to play sounds!";
	play(name,"file",voiceChannel);
}
//Not quite ready yet. Next (stable) version
/**function roll(args) {
	var splitroll = undefined;
	var foundRoll = undefined;
	for (var i=0;i<args.length;i++) {
		if (args[i].indexOf("+") > -1) {
			var foundAdding = i;
			var adding = true;
		}
		if (args[i].indexOf("-") > -1) {
			var foundSub = i;
			var subtracting = true;
		}			
		if (args[i].indexOf("d") > -1) {
			var splitRoll = args[i].split("d");
			for (var k=0;k<splitRoll.length;k++) {
				splitRoll[j].replace("d","");
				foundRoll = i;
			}
		}
	}
	if (splitRoll != undefined && foundRoll != undefined) {
		if (args.length > foundRoll) {
			if (splitRoll[0] > 1) {
				var roll = rand.dice(splitRoll[1],splitRoll[2])(randEngine);
			} else {
				var roll = rand.die(splitRoll[0])(randEngine)
			}
			if (roll == 1 || roll == 20) return roll,"Nat "+roll+"!";
			if (adding) {
				amtToChange = args[foundAdding].split("+")[0]
			} else if (subtracting) {
				amtToChange = 0-args[foundSub].split("-")[0]
			}
			newRoll = roll+amtToChange;
			return newRoll,roll,amtToChange;
		}
	}
}**/

client.on("ready", function() { //Bot is ready to go-go :P
	console.log("READY FOR ACTION!");
	if (config.outputDebugMessages) console.log("[DEBUG] Prefix: "+config.prefix);
});

var looping = false;
client.on("message", function (message) {
	//Making life easier
	var msg = message.content;
	var chan = message.channel;
	var author = message.author;
	var member = message.member;
	var user = author.username;
	//Logging message
	/**if (config.logUserMessages) **/console.log("["+chan.name+"]-["+user+"]: "+msg);
	//Check if message starts with prefix and isn't from a bot
	if (author.bot == false) {
		if (msg.startsWith(config.prefix)) {
			//Format variables
			var args = msg.toLowerCase().split(" ");
			var cmd = args[0];
			cmd = cmd.replace(config.prefix,'');
			args = args.splice(1);
			//Check for commands
			if (cmd == "ping") {
				chan.send("Pong! "+Math.floor(client.ping)+" miliseconds");
			} else if (cmd == "check") {
				if (args[0] == "xp") {
					var currentXp = getXp(user);
					var currentLevel = getLevel(user);

					var nextLevel = calculateXpToNextLevel(user).formatted;
					var embed = new Discord.RichEmbed({});

					embed.setThumbnail(author.avatarURL);
					embed.setDescription("Current Level: "+currentLevel+"\n"+"Total XP: "+currentXp+"\n"+"XP To Next Level: "+nextLevel);
					embed.setTitle(user+"'s XP Statistics");

					chan.send(embed);
				}
			} else if (cmd == "test") {
				//console.log("Test command");
				if (user.toLowerCase() != config.ownerUsername) {
					//console.log("No Permission");
					chan.send("You do not have permission to use this command!");
				} else {
					//console.log("Args: "+args);
					if (args[0] == "levelxp") {
						//console.log("LevelXp sub-command")
						chan.send("Xp to level up to level "+args[1]+" is "+calculateLevelXp(user,args[1])+" XP total.");
					} else if (args[0] == "reloadconfig") {
						config = reloadConfig();
					} else if (args[0] == "dm") {
						author.send("Congratulations @"+user+"! You are now chat level "+getLevel(user));
					} else if (args[0] == "sound") {
						var success,code = playFile("levelup",member);
						if (success == false) {
							//chan.send(code);
						}
					} else if (args[0] == "soundurl") {
						if (args[1] == undefined) return chan.send("Specify a URL to play!");
						var success,code = playURL(args[1],member);
					}
				} 
			} else if (cmd == "job" || cmd == "jobs" || cmd == "j") {
				if (config.enableJobs) {
					if (args[0] == "leave") {
						if (args[1] == "all") {
							removeJob(user,"all");
						} else if (args[1] != "all" && args[1] != undefined) {
							removeJob(user,args[1]);
						} else if (args[1] == undefined) {
							chan.send('You need to specify a job to leave, or "all" to leave all jobs!');
						}
					} else if (args[0] == "join") {
						if (args[1] == undefined) {
							chan.send("Specify a job to join!");
							return;
						}
						if (config.jobs.contains(args[1]) == false) {
							chan.send("That job doesn't exist!");
							return;
						}
						addJob(user,args[1]);
					} else if (args[0] == "list") {
						var embed = new Discord.RichEmbed();
						for (var i=0;i<config.jobs.length;i++) {
							cJob = config.jobs[i];
							embed = embed.addField(cJob.id,"Name: "+cJob.name+"\nCashflow: "+cJob.cashflow);
						}
						//Spit out embed.
					}
				}
			} else if (cmd == "play") {
				if (args[0] == undefined) return chan.send("Please specify an audio file to play! Provide the whole url! Eg. https://www.myinstants.com/media/sounds/nooo.swf.mp3");
				playURL(args[0],member);
			} else if (cmd == "stop") {
				looping = false;
				stopPlaying();
			} else if (cmd == "loop") {
				if (args[0] == undefined) return chan.send("Please specify a URL to a sound to loop! Type $play for more info!");
				playURL(args[0],member,true);
			} else if (cmd == "playsound") {
				if (args[0] == undefined) return chan.send("Please specify a sound to play, like `levelup`!");
				voiceChannel = member.voiceChannel
				play(args[0],"file",voiceChannel);
			} else if (cmd == "playtwitch") {
				playTwitchStream(args[0],member,chan);
			} else if (cmd == "stoptwitch") {
				stopTwitchStream();
			}
			tryDelete(message);
		} else {
			var splitMsg = msg.split("");
			for (var i=0;i<config.commandPrefixes.length;i++) {
				splitPrefix = config.commandPrefixes[i].split("");
				var yep = true;
				for (var j=0;j<splitPrefix.length;j++) {
					if (splitPrefix[j] != splitMsg[j] || yep == false) {
						yep = false;
					}
				}
				if (yep == true) {
					if (config.outputDebugMessages == true) console.log("[DEBUG] Starts with a known command prefix. Not giving XP!");
					tryDelete(message);
					return;
				}
			}
			var gain = calculateXpGain(user,msg);
			changeXp(author,gain,chan,member);
			tryDelete(message);
		}
	}
});

function tryDelete(msg) {
	if (config.deleteMsgsInCmdsChans && msg.author.bot == false) {
		for (var i=0;i<config.commandChannelList.length;i++) {
			if (config.ouputDebugMessages) console.log("Checking if "+msg.channel.name+" == "+config.commandChannelList[i]);
			if (msg.channel.name == config.commandChannelList[i]) {
				if (config.ouputDebugMessages) console.log("Found message to delete in channel: "+config.commandChannelList[i]);
				msg.delete().then(function(msg) {
					if (config.ouputDebugMessages) console.log(`Deleted message from ${msg.author.username}`);
				}).catch(function (err) {
					if (err) console.log("Error deleting message: "+err);
				});
			}
		}
	}
}

client.login(config.discordSecret);
