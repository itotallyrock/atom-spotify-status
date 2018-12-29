'use babel'

import util from 'util'
import EventEmitter from 'events'
import dbus from 'dbus'
import isEqual from 'lodash.isequal'
import { CompositeDisposable } from 'atom'

const { commands } = atom


const CHECK_INTERVAL = 500

export default {

  interface: null,
  player: new EventEmitter(),
  subscriptions: null,
  interval: null,

  async activate(state) {
    const bus = dbus.getBus('session')
    this.interface = await util.promisify(bus.getInterface).call(bus, 'org.mpris.MediaPlayer2.spotify', '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player')
    this.subscriptions = new CompositeDisposable()

    this.player.getCurrentSong = this.getCurrentSong.bind(this)
    this.player.togglePause = util.promisify(this.interface.PlayPause).bind(this.interface)
    this.player.pause = util.promisify(this.interface.Pause).bind(this.interface)
    this.player.play = util.promisify(this.interface.Play).bind(this.interface)
    this.player.next = util.promisify(this.interface.Next).bind(this.interface)
    this.player.prev = util.promisify(this.interface.Previous).bind(this.interface)
    this.player.playing = this.playing.bind(this)

    this.subscriptions.add(
      commands.add('atom-workspace', 'spotify-status:toggle-pause', this.player.togglePause),
      commands.add('atom-workspace', 'spotify-status:next', this.player.next),
      commands.add('atom-workspace', 'spotify-status:previous', this.player.prev)
    )

    let currentSong = null
    let currentPlaying = null
    let currentError = null

    // Interval to update service
    this.interval = setInterval(async () => {
      try {
        let newSong = await this.getCurrentSong()
        let newPlaying = await this.playing()
        if (!isEqual(currentSong, newSong)) {
          currentSong = newSong
          this.player.emit('track-change', newSong)
        }
        if (newPlaying != currentPlaying) {
          currentPlaying = newPlaying
          this.player.emit('toggle-pause', newPlaying)

          if (newPlaying) this.player.emit('unpause')
          else this.player.emit('pause')
        }
        if (currentError != null) {
          if (currentError.dbusName === 'org.freedesktop.DBus.Error.NoReply' || currentError.dbusName === 'org.freedesktop.DBus.Error.ServiceUnknown') {
            this.player.emit('ready')
          }
          currentError = null
        }
      } catch (error) {
        currentError = error
        if (error.dbusName === 'org.freedesktop.DBus.Error.NoReply' || currentError.dbusName === 'org.freedesktop.DBus.Error.ServiceUnknown') {
          this.player.emit('end')
        } else {
          // If unknown error deactivate package
          this.player.emit('error', error)
          this.deactivate()
        }
      }
    }, CHECK_INTERVAL)
  },

  async playing() {
    const playing = await util.promisify(this.interface.getProperty).call(this.interface, 'PlaybackStatus')
    return playing === 'Playing'
  },

  async getCurrentSong() {
    const status = await util.promisify(this.interface.getProperty).call(this.interface, 'Metadata')
    return {
      album: status['xesam:album'],
      artists: status['xesam:artist'],
      artwork: status['mpris:artUrl'],
      title: status['xesam:title'],
      url: status['xesam:url'],
      uri: status['mpris:trackid']
    }
  },

  provideService() {
    return this.player
  },

  deactivate() {
    clearInterval(this.interval)
    this.subscriptions.dispose()
  }

}
