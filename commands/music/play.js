const { prefix } = require('../../config.json');
const colours = require('../../colours.json');
const { MessageEmbed } = require('discord.js');
const { Utils } = require('erela.js');

module.exports = {
    config: {
    name: 'play',
    description: 'Plays a song / playlist or searches for a song',
    usage: `${prefix}play [song | playlist]`,
    category: 'music',
    access: 'everyone'
},

run: async (client, message, args) => {
    
    const { channel } = message.member.voice;
    if (!channel) return message.reply('You need to be in a voice channel to play music!')

    const permissions = channel.permissionsFor(client.user);
    if (!permissions.has('CONNECT')) return message.reply('I don\'t have permission to connect to your voice channel!');
    if (!permissions.has('SPEAK')) return message.reply('I don\'t have permission to connect to your voice channel!');

    if (!args[0]) return message.reply('Please provide a song name or a link to search.');

    const player = client.music.players.spawn({
        guild: message.guild,
        textChannel: message.channel,
        voiceChannel: channel
    });

    client.music.search(args.join(' '), message.author).then(async res => {
        switch (res.loadType) {
            case 'TRACK_LOADED':
                player.queue.add(res.tracks[0]);
                message.channel.send(`Enqueuing \`${res.tracks[0].title}\``)
                if (!player.playing) player.play()
                break;

            case 'SEARCH_RESULT':
                let index = 1;
                const tracks = res.tracks.slice(0, 5);
                const embed = new MessageEmbed()
                .setAuthor('Song Selection', message.author.displayAvatarURL())
                .setDescription(tracks.map(video => `**${index++}.** ${video.title}`))
                .setFooter('Your response time closes within the next 30 seconds. Type \'cancel\' to cancel the selection')

            await message.channel.send(embed);

            const collector = message.channel.createMessageCollector(m => {
                return m.author.id === message.author.id && new RegExp(`^([1-5]|cancel)$`, 'i').test(m.content)
            }, { time: 30000, max: 1});

            collector.on('collect', m => {
                if (/cancel/i.test(m.content)) return collector.stop('cancelled')

                const track = tracks[Number(m.content) - 1];
                player.queue.add(track)
                message.channel.send(`Enqueuing \`${track.title}\``)
                if (!player.playing) player.play()
            });

            collector.on('end', (_, reason) => {
                if(['time', 'cancelled'].includes(reason)) return message.channel.send('Cancelled selection.')
            });
            break;

            case 'PLAYLIST_LOADED':
                res.playlist.tracks.forEach(track => player.queue.add(track));
                message.channel.send(`Enqueuing \`${res.playlist.tracks.length}\` tracks in playlist \`${res.playlist.info.name}\``)
                if (!player.playing) player.play()
        }
    })
}
}