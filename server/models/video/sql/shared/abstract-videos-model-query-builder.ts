import validator from 'validator'
import { AbstractVideosQueryBuilder } from './abstract-videos-query-builder'
import { VideoTables } from './video-tables'

/**
 *
 * Abstract builder to create SQL query and fetch video models
 *
 */

export class AbstractVideosModelQueryBuilder extends AbstractVideosQueryBuilder {
  protected attributes: { [key: string]: string } = {}
  protected joins: string[] = []
  protected where: string

  protected tables: VideoTables

  constructor (protected readonly mode: 'list' | 'get') {
    super()

    this.tables = new VideoTables(this.mode)
  }

  protected buildSelect () {
    return 'SELECT ' + Object.keys(this.attributes).map(key => {
      const value = this.attributes[key]
      if (value) return `${key} AS ${value}`

      return key
    }).join(', ')
  }

  protected includeChannels () {
    this.joins.push(
      'INNER JOIN "videoChannel" AS "VideoChannel" ON "video"."channelId" = "VideoChannel"."id"',
      'INNER JOIN "actor" AS "VideoChannel->Actor" ON "VideoChannel"."actorId" = "VideoChannel->Actor"."id"',

      'LEFT OUTER JOIN "server" AS "VideoChannel->Actor->Server" ON "VideoChannel->Actor"."serverId" = "VideoChannel->Actor->Server"."id"',

      'LEFT OUTER JOIN "actorImage" AS "VideoChannel->Actor->Avatar" ' +
        'ON "VideoChannel->Actor"."avatarId" = "VideoChannel->Actor->Avatar"."id"'
    )

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('VideoChannel', this.tables.getChannelAttributes()),
      ...this.buildActorInclude('VideoChannel->Actor'),
      ...this.buildAvatarInclude('VideoChannel->Actor->Avatar'),
      ...this.buildServerInclude('VideoChannel->Actor->Server')
    }
  }

  protected includeAccounts () {
    this.joins.push(
      'INNER JOIN "account" AS "VideoChannel->Account" ON "VideoChannel"."accountId" = "VideoChannel->Account"."id"',
      'INNER JOIN "actor" AS "VideoChannel->Account->Actor" ON "VideoChannel->Account"."actorId" = "VideoChannel->Account->Actor"."id"',

      'LEFT OUTER JOIN "server" AS "VideoChannel->Account->Actor->Server" ' +
        'ON "VideoChannel->Account->Actor"."serverId" = "VideoChannel->Account->Actor->Server"."id"',

      'LEFT OUTER JOIN "actorImage" AS "VideoChannel->Account->Actor->Avatar" ' +
        'ON "VideoChannel->Account->Actor"."avatarId" = "VideoChannel->Account->Actor->Avatar"."id"'
    )

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('VideoChannel->Account', this.tables.getAccountAttributes()),
      ...this.buildActorInclude('VideoChannel->Account->Actor'),
      ...this.buildAvatarInclude('VideoChannel->Account->Actor->Avatar'),
      ...this.buildServerInclude('VideoChannel->Account->Actor->Server')
    }
  }

  protected includeThumbnails () {
    this.joins.push('LEFT OUTER JOIN "thumbnail" AS "Thumbnails" ON "video"."id" = "Thumbnails"."videoId"')

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('Thumbnails', this.tables.getThumbnailAttributes())
    }
  }

  protected includeWebtorrentFiles (required: boolean) {
    const joinType = required ? 'INNER' : 'LEFT'
    this.joins.push(joinType + ' JOIN "videoFile" AS "VideoFiles" ON "VideoFiles"."videoId" = "video"."id"')

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('VideoFiles', this.tables.getFileAttributes())
    }
  }

  protected includeStreamingPlaylistFiles (required: boolean) {
    const joinType = required ? 'INNER' : 'LEFT'

    this.joins.push(
      joinType + ' JOIN "videoStreamingPlaylist" AS "VideoStreamingPlaylists" ON "VideoStreamingPlaylists"."videoId" = "video"."id"',

      joinType + ' JOIN "videoFile" AS "VideoStreamingPlaylists->VideoFiles" ' +
        'ON "VideoStreamingPlaylists->VideoFiles"."videoStreamingPlaylistId" = "VideoStreamingPlaylists"."id"'
    )

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('VideoStreamingPlaylists', this.tables.getStreamingPlaylistAttributes()),
      ...this.buildAttributesObject('VideoStreamingPlaylists->VideoFiles', this.tables.getFileAttributes())
    }
  }

  protected includeUserHistory (userId: number) {
    this.joins.push(
      'LEFT OUTER JOIN "userVideoHistory" ' +
        'ON "video"."id" = "userVideoHistory"."videoId" AND "userVideoHistory"."userId" = :userVideoHistoryId'
    )

    this.replacements.userVideoHistoryId = userId

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('userVideoHistory', this.tables.getUserHistoryAttributes())
    }
  }

  protected includePlaylist (playlistId: number) {
    this.joins.push(
      'INNER JOIN "videoPlaylistElement" as "VideoPlaylistElement" ON "videoPlaylistElement"."videoId" = "video"."id" ' +
        'AND "VideoPlaylistElement"."videoPlaylistId" = :videoPlaylistId'
    )

    this.replacements.videoPlaylistId = playlistId

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('VideoPlaylistElement', this.tables.getPlaylistAttributes())
    }
  }

  protected includeTags () {
    this.joins.push(
      'LEFT OUTER JOIN (' +
        '"videoTag" AS "Tags->VideoTagModel" INNER JOIN "tag" AS "Tags" ON "Tags"."id" = "Tags->VideoTagModel"."tagId"' +
      ') ' +
      'ON "video"."id" = "Tags->VideoTagModel"."videoId"'
    )

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('Tags', this.tables.getTagAttributes()),
      ...this.buildAttributesObject('Tags->VideoTagModel', this.tables.getVideoTagAttributes())
    }
  }

  protected includeBlacklisted () {
    this.joins.push(
      'LEFT OUTER JOIN "videoBlacklist" AS "VideoBlacklist" ON "video"."id" = "VideoBlacklist"."videoId"'
    )

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('VideoBlacklist', this.tables.getBlacklistedAttributes())
    }
  }

  protected includeScheduleUpdate () {
    this.joins.push(
      'LEFT OUTER JOIN "scheduleVideoUpdate" AS "ScheduleVideoUpdate" ON "video"."id" = "ScheduleVideoUpdate"."videoId"'
    )

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('ScheduleVideoUpdate', this.tables.getScheduleUpdateAttributes())
    }
  }

  protected includeLive () {
    this.joins.push(
      'LEFT OUTER JOIN "videoLive" AS "VideoLive" ON "video"."id" = "VideoLive"."videoId"'
    )

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('VideoLive', this.tables.getLiveAttributes())
    }
  }

  protected includeTrackers () {
    this.joins.push(
      'LEFT OUTER JOIN (' +
        '"videoTracker" AS "Trackers->VideoTrackerModel" ' +
          'INNER JOIN "tracker" AS "Trackers" ON "Trackers"."id" = "Trackers->VideoTrackerModel"."trackerId"' +
      ') ON "video"."id" = "Trackers->VideoTrackerModel"."videoId"'
    )

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('Trackers', this.tables.getTrackerAttributes()),
      ...this.buildAttributesObject('Trackers->VideoTrackerModel', this.tables.getVideoTrackerAttributes())
    }
  }

  protected includeWebTorrentRedundancies () {
    this.joins.push(
      'LEFT OUTER JOIN "videoRedundancy" AS "VideoFiles->RedundancyVideos" ON ' +
        '"VideoFiles"."id" = "VideoFiles->RedundancyVideos"."videoFileId"'
    )

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('VideoFiles->RedundancyVideos', this.tables.getRedundancyAttributes())
    }
  }

  protected includeStreamingPlaylistRedundancies () {
    this.joins.push(
      'LEFT OUTER JOIN "videoRedundancy" AS "VideoStreamingPlaylists->RedundancyVideos" ' +
        'ON "VideoStreamingPlaylists"."id" = "VideoStreamingPlaylists->RedundancyVideos"."videoStreamingPlaylistId"'
    )

    this.attributes = {
      ...this.attributes,

      ...this.buildAttributesObject('VideoStreamingPlaylists->RedundancyVideos', this.tables.getRedundancyAttributes())
    }
  }

  protected buildActorInclude (prefixKey: string) {
    return this.buildAttributesObject(prefixKey, this.tables.getActorAttributes())
  }

  protected buildAvatarInclude (prefixKey: string) {
    return this.buildAttributesObject(prefixKey, this.tables.getAvatarAttributes())
  }

  protected buildServerInclude (prefixKey: string) {
    return this.buildAttributesObject(prefixKey, this.tables.getServerAttributes())
  }

  protected buildAttributesObject (prefixKey: string, attributeKeys: string[]) {
    const result: { [id: string]: string} = {}

    const prefixValue = prefixKey.replace(/->/g, '.')

    for (const attribute of attributeKeys) {
      result[`"${prefixKey}"."${attribute}"`] = `"${prefixValue}.${attribute}"`
    }

    return result
  }

  protected whereId (id: string | number) {
    if (validator.isInt('' + id)) {
      this.where = 'WHERE "video".id = :videoId'
    } else {
      this.where = 'WHERE uuid = :videoId'
    }

    this.replacements.videoId = id
  }
}