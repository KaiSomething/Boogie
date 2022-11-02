const { Client, Intents, MessageEmbed } = require('discord.js');
const { token, youtubeAPI } = require('./config.json');
const {joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, entersState, StreamType, AudioPlayerState, AudioPlayerStatus, VoiceConnectionStatus} = require("@discordjs/voice")
const YoutubeMusicApi = require('youtube-music-api')
const YoutubeMp3Downloader = require("youtube-mp3-downloader");
const fs = require("fs");
const url = require('url');
const fetch = require('node-fetch');

var song_path = "D:/BoogieSongs"

var cachedSongsFile = fs.readFileSync(song_path+"/songs.json");
var cachedSongs = JSON.parse(cachedSongsFile);

const api = new YoutubeMusicApi()
api.initalize()

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS],
                            partials: ['MESSAGE', 'CHANNEL', 'REACTION']});
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});



players = {}

client.on("messageCreate", msg => {
    if (msg.content.startsWith("-ping ")) {
        msg.reply("pong");
    }

    if (msg.content.startsWith("-play ")) {
        try{
            song = msg.content.substring(6)

            const channel = msg.member.voice.channel;
            if(song.length > 0 && channel){
                //https://www.youtube.com/watch?v=diUReYyCVGc&ab_channel=CallMeCarsonLIVE

                api.search(song, "song").then(result => {
                    if(result.content.length > 0){
                        if(song.startsWith("https://www.youtube.com/watch?v")){
                            song = url.parse(song,true).query["v"]
                        }else{
                            song = result.content[0].videoId
                        }

                        if(!cachedSongs.songs.includes(song)){
                            fetch('https://www.googleapis.com/youtube/v3/videos?id='+song+'&part=contentDetails,snippet&key='+youtubeAPI)
                            .then(res => res.json())
                            .then(json => {
                                const regexpTime = /((\d+)H)*((\d+)M)*((\d+)S)*/gm
                                duration = json.items[0].contentDetails.duration.substring(2)
                                duration = regexpTime.exec(duration)
                                if(duration[2] == undefined){duration[2] = 0}
                                if(duration[4] == undefined){duration[4] = 0}
                                if(duration[6] == undefined){duration[6] = 0}
                                duration = Number(duration[2])*60+Number(duration[4])+Number(duration[6])/60
                                
                                if(duration < 10 || msg.author.id == 400808340734738443){
                                    if(!Object.keys(players).includes(msg.guild.id)){
                                        players[msg.guild.id] = createAudioPlayer();
                                    }
                                    const player = players[msg.guild.id]

                                    player.stop()

                                    const connection = joinVoiceChannel({
                                        channelId: channel.id,
                                        guildId: channel.guild.id,
                                        adapterCreator: channel.guild.voiceAdapterCreator,
                                    });
                                    var YD = new YoutubeMp3Downloader({
                                        "ffmpegPath": "C:/ffmpeg/ffmpeg.exe",        // FFmpeg binary location
                                        "outputPath": song_path,    // Output file location (default: the home directory)
                                        "youtubeVideoQuality": "highestaudio",  // Desired video quality (default: highestaudio)
                                        "queueParallelism": 2,                  // Download parallelism (default: 1)
                                        "progressTimeout": 2000,                // Interval in ms for the progress reports (default: 1000)
                                        "allowWebm": false                      // Enable download from WebM sources (default: false)
                                    });
                                    YD.download(song, song+".mp3");
                                    YD.on("finished", function(err, data) {
                                        cachedSongs.songs.push(song)
                                        fs.writeFile(song_path+'/songs.json', JSON.stringify(cachedSongs), function (err) {
                                            if (err) return console.log(err);
                                        });
                                        connection.subscribe(player)
                                        const resource = createAudioResource(song_path+'/'+song+".mp3");
                                        player.play(resource);
                                        var embed = new MessageEmbed()
                                        .setColor('#0099ff')
                                        .setTitle(json.items[0].snippet.title)
                                        .setURL('https://www.youtube.com/watch?v='+song)
                                        notice = msg.channel.send({ embeds: [embed] })
                                        .then(message => {
                                            message.react("⏯")
                                            message.react("🛑")
                                        })
                                    });
                                }else{
                                    var embed = new MessageEmbed()
                                    .setColor('#0099ff')
                                    .setTitle("You cannot play songs longer than 10 minutes.")
                                    msg.channel.send({ embeds: [embed] })
                                }
                            })
                            
                        }else{
                            if(!Object.keys(players).includes(msg.guild.id)){
                                players[msg.guild.id] = createAudioPlayer();
                            }
                            const player = players[msg.guild.id]

                            player.stop()

                            const connection = joinVoiceChannel({
                                channelId: channel.id,
                                guildId: channel.guild.id,
                                adapterCreator: channel.guild.voiceAdapterCreator,
                            });

                            connection.subscribe(player)
                            const resource = createAudioResource(song_path+'/'+song+".mp3");
                            player.play(resource);
                            fetch('https://www.googleapis.com/youtube/v3/videos?id='+song+'&part=contentDetails,snippet&key='+youtubeAPI)
                            .then(res => res.json())
                            .then(json => {
                                var embed = new MessageEmbed()
                                .setColor('#0099ff')
                                .setTitle(json.items[0].snippet.title)
                                .setURL('https://www.youtube.com/watch?v='+song)
                                notice = msg.channel.send({ embeds: [embed] })
                                .then(message => {
                                    message.react("⏯")
                                    message.react("🛑")
                                })
                            })
                        }
                    }else{
                        var embed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle("No song was found.")
                        msg.channel.send({ embeds: [embed] })
                    }
                })
            }
        }catch (error) {
            console.log(error);
            var embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle("ERROR ERROR OH NO OH GOD:\n"+error)
            msg.channel.send({ embeds: [embed] })
        }
    }

    if (msg.content.startsWith("-leave")) {
        const connection = getVoiceConnection(msg.guild.id);
        if(Object.keys(players).includes(msg.guild.id)){
            const player = players[msg.guild.id]
            player.stop()
            delete players[msg.guild.id]
        }

        if(connection){
            connection.destroy()
        }
    }

    if (msg.content.startsWith("-stop")) {
        if(Object.keys(players).includes(msg.guild.id)){
            const player = players[msg.guild.id]
            player.stop()
            delete players[msg.guild.id]
        }
    }

    if (msg.content.startsWith("-pause")) {
        if(Object.keys(players).includes(msg.guild.id)){
            const player = players[msg.guild.id]
            player.pause()
        }
    }

    if (msg.content.startsWith("-unpause")) {
        if(Object.keys(players).includes(msg.guild.id)){
            const player = players[msg.guild.id]
            player.unpause()
        }
    }
})


client.on('messageReactionAdd', (reaction, user) => {
    if(!user.bot && reaction.message.author.id == client.user.id){
        if(reaction.emoji.name == "⏯"){
            if(Object.keys(players).includes(reaction.message.guild.id)){
                const player = players[reaction.message.guild.id]
                if(player.state.status == "playing"){
                    player.pause()
                }else if(player.state.status == "paused"){
                    player.unpause()
                }
            }
            reaction.users.remove(user)
        }
        if(reaction.emoji.name == "🛑"){
            if(Object.keys(players).includes(reaction.message.guild.id)){
                const player = players[reaction.message.guild.id]
                player.stop()
                delete players[reaction.message.guild.id]
            }
            reaction.message.delete()
        }
    }

});


client.login(token);