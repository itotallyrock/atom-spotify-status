'use babel';

import promisifyShim from 'util.promisify/shim'
promisifyShim()

import util from 'util'
import dbus from 'dbus'
import _ from 'lodash'
import { Emitter, CompositeDisposable } from 'atom'

const { notifications: Notifications, commands: Commands, config: Config, workspace: Workspace } = atom


const CHECK_INTERVAL = 500
// TODO: Add commands for skipping, pausing, going back

export default {

  interface: null,
  player: null,
  subscriptions: null,
  interval: null,

  async activate(state) {
    const bus = dbus.getBus('session')
    this.interface = await util.promisify(bus.getInterface).call(bus, 'org.mpris.MediaPlayer2.spotify', '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player')
    this.subscriptions = new CompositeDisposable()

    this.player = new Emitter()
    this.subscriptions.add(this.player)

    this.player.getCurrentSong = this.getCurrentSong.bind(this)
    this.player.togglePause = util.promisify(this.interface.PlayPause).bind(this.interface)
    this.player.pause = util.promisify(this.interface.Pause).bind(this.interface)
    this.player.play = util.promisify(this.interface.Play).bind(this.interface)
    this.player.next = util.promisify(this.interface.Next).bind(this.interface)
    this.player.prev = util.promisify(this.interface.Previous).bind(this.interface)
    this.player.playing = this.playing.bind(this)

    let currentSong = await this.getCurrentSong()
    let currentPlaying = await this.playing()
    let currentError = null

    // Interval to update service
    this.interval = setInterval(async () => {
      try {
        let newSong = await this.getCurrentSong()
        let newPlaying = await this.playing()
        if (!_.isEqual(currentSong, newSong)) {
          currentSong = newSong
          this.player.emit('track-change', newSong)
        }
        if (newPlaying != currentPlaying) {
          currentPlaying = newPlaying
          this.player.emit('toggle-paused')

          if (newPlaying) this.player.emit('playing')
          else this.player.emit('paused')
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
    }, CHECK_INTERVAL);
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
    console.log('provideService');
    return this.player
  },

  deactivate() {
    this.subscriptions.dispose()
  }

}
