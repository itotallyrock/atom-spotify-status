# Spotify Status DBUS
This package's purpose is to provide an interface between the Spotify dbus service and atom.  This package itself provides no features to atom, for this see [list of packages](#)

### Documentation

```javascript
consumeService(player) {
  player.on('track-changed', track => {
    // Use updated track
  })
  player.on('error', () => {
    // Stop consuming service
  })
  player.on('end', () => {
    // Called when Spotify is closed
  })
  player.on('ready', () => {
    // Called when Spotify is re-opened
  })
  player.on('pause', () => {
    // Called when paused
  })
  player.on('unpause', () => {
    // Called when unpaused
  })
  player.on('toggle-pause', playing => {
    // Called when pause state changes, true is passed if unpaused
  })

  let song = await player.getCurrentSong()
  /*
  {
    album: 'Back In Black',
    artists: [ 'AC/DC' ],
    artwork: 'https://open.spotify.com/image/b7b31914e0c4951249fad37271248212c8ac3025',
    title: 'Shoot to Thrill',
    url: 'https://open.spotify.com/track/0C80GCp0mMuBzLf3EAXqxv',
    uri: 'spotify:track:0C80GCp0mMuBzLf3EAXqxv'
  }
  */
  let playing = await player.playing() // Boolean for if playing or paused
  await player.next() // Skips song
  await player.prev() // Goes back a song

  await player.play() // Will unpause if paused
  await player.pause() // Will pause if playing
  await player.togglePause() // Will toggle pause
}
```