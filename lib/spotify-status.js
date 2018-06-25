'use babel';

import SpotifyStatusView from './spotify-status-view';
import { CompositeDisposable } from 'atom';
import SpotifyWebHelper from 'spotify-web-helper'

// TODO: Add commands for skipping, pausing, going back

export default {

  helper: null,
  subscriptions: null,

  activate(state) {
    this.helper = new SpotifyWebHelper()
    this.subscriptions = new CompositeDisposable()
  },

  provideService() {
    return this.helper.player
  },

  deactivate() {
    this.subscriptions.dispose()
  }

}
