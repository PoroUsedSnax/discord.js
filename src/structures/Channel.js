'use strict';

const Base = require('./Base');
const { ChannelTypes } = require('../util/Constants');
const SnowflakeUtil = require('../util/SnowflakeUtil');

/**
 * Represents any channel on Discord.
 * @extends {Base}
 * @abstract
 */
class Channel extends Base {
  constructor(client, data, immediatePatch = true) {
    super(client);

    const type = ChannelTypes[data.type];
    /**
     * The type of the channel, either:
     * * `dm` - a DM channel
     * * `text` - a guild text channel
     * * `voice` - a guild voice channel
     * * `category` - a guild category channel
     * * `news` - a guild news channel
     * * `store` - a guild store channel
     * * `news_thread` - a guild news channel's public thread channel
     * * `public_thread` - a guild text channel's public thread channel
     * * `private_thread` - a guild text channel's private thread channel
     * * `stage` - a guild stage channel
     * * `unknown` - a generic channel of unknown type, could be Channel or GuildChannel
     * @type {string}
     */
    this.type = type ? type.toLowerCase() : 'unknown';

    /**
     * Whether the channel has been deleted
     * @type {boolean}
     */
    this.deleted = false;

    if (data && immediatePatch) this._patch(data);
  }

  _patch(data) {
    /**
     * The unique ID of the channel
     * @type {Snowflake}
     */
    this.id = data.id;
  }

  /**
   * The timestamp the channel was created at
   * @type {number}
   * @readonly
   */
  get createdTimestamp() {
    return SnowflakeUtil.deconstruct(this.id).timestamp;
  }

  /**
   * The time the channel was created at
   * @type {Date}
   * @readonly
   */
  get createdAt() {
    return new Date(this.createdTimestamp);
  }

  /**
   * When concatenated with a string, this automatically returns the channel's mention instead of the Channel object.
   * @returns {string}
   * @example
   * // Logs: Hello from <#123456789012345678>!
   * console.log(`Hello from ${channel}!`);
   */
  toString() {
    return `<#${this.id}>`;
  }

  /**
   * Deletes this channel.
   * @returns {Promise<Channel>}
   * @example
   * // Delete the channel
   * channel.delete()
   *   .then(console.log)
   *   .catch(console.error);
   */
  delete() {
    return this.client.api
      .channels(this.id)
      .delete()
      .then(() => this);
  }

  /**
   * Fetches this channel.
   * @param {boolean} [force=false] Whether to skip the cache check and request the API
   * @returns {Promise<Channel>}
   */
  fetch(force = false) {
    return this.client.channels.fetch(this.id, true, force);
  }

  /**
   * Indicates whether this channel is text-based.
   * @returns {boolean}
   */
  isText() {
    return 'messages' in this;
  }

  static create(client, data, guild) {
    const Structures = require('../util/Structures');
    let channel;
    if (!data.guild_id && !guild) {
      if ((data.recipients && data.type !== ChannelTypes.GROUP) || data.type === ChannelTypes.DM) {
        const DMChannel = Structures.get('DMChannel');
        channel = new DMChannel(client, data);
      } else if (data.type === ChannelTypes.GROUP) {
        const PartialGroupDMChannel = require('./PartialGroupDMChannel');
        channel = new PartialGroupDMChannel(client, data);
      }
    } else {
      guild = guild || client.guilds.cache.get(data.guild_id);
      if (guild) {
        switch (data.type) {
          case ChannelTypes.TEXT: {
            const TextChannel = Structures.get('TextChannel');
            channel = new TextChannel(guild, data);
            break;
          }
          case ChannelTypes.VOICE: {
            const VoiceChannel = Structures.get('VoiceChannel');
            channel = new VoiceChannel(guild, data);
            break;
          }
          case ChannelTypes.CATEGORY: {
            const CategoryChannel = Structures.get('CategoryChannel');
            channel = new CategoryChannel(guild, data);
            break;
          }
          case ChannelTypes.NEWS: {
            const NewsChannel = Structures.get('NewsChannel');
            channel = new NewsChannel(guild, data);
            break;
          }
          case ChannelTypes.STORE: {
            const StoreChannel = Structures.get('StoreChannel');
            channel = new StoreChannel(guild, data);
            break;
          }
          case ChannelTypes.STAGE: {
            const StageChannel = Structures.get('StageChannel');
            channel = new StageChannel(guild, data);
            break;
          }
          case ChannelTypes.NEWS_THREAD:
          case ChannelTypes.PUBLIC_THREAD:
          case ChannelTypes.PRIVATE_THREAD: {
            const ThreadChannel = Structures.get('ThreadChannel');
            channel = new ThreadChannel(guild, data);
            channel.parent?.threads.cache.set(channel.id, channel);
            break;
          }
        }
        if (channel) guild.channels?.cache.set(channel.id, channel);
      }
    }
    return channel;
  }

  toJSON(...props) {
    return super.toJSON({ createdTimestamp: true }, ...props);
  }
}

module.exports = Channel;

/**
 * @external APIChannel
 * @see {@link https://discord.com/developers/docs/resources/channel#channel-object}
 */
