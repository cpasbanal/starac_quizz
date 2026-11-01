/*
 * MediaPlayer: plays a YouTube or Spotify clip with play/pause and replay buttons.
 * While `hidden` is true the video is covered by a stage visual (equalizer), so only the audio
 * gives the song away — used by the blind test. Uses the official YouTube and Spotify embed APIs.
 *
 *   React.createElement(MediaPlayer, { media: parseMedia(link), hidden: true, autoPlay: true })
 *
 * Controlled by the app instead (blind test): pass `play` (true / false) and `controls: false`;
 * the clip plays or pauses whenever `play` changes.
 */
(function () {
  var ytReady = null, spReady = null;

  function loadScript(src) {
    var s = document.createElement('script');
    s.src = src; s.async = true;
    document.head.appendChild(s);
    return s;
  }

  function loadYouTube() {
    if (!ytReady) {
      ytReady = new Promise(function (resolve, reject) {
        if (window.YT && window.YT.Player) { resolve(window.YT); return; }
        var prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () { if (prev) prev(); resolve(window.YT); };
        loadScript('https://www.youtube.com/iframe_api').onerror = function () { ytReady = null; reject(new Error('YouTube')); };
      });
    }
    return ytReady;
  }

  function loadSpotify() {
    if (!spReady) {
      spReady = new Promise(function (resolve, reject) {
        window.onSpotifyIframeApiReady = function (api) { resolve(api); };
        loadScript('https://open.spotify.com/embed/iframe-api/v1').onerror = function () { spReady = null; reject(new Error('Spotify')); };
      });
    }
    return spReady;
  }

  var BARS = [0.55, 0.9, 0.7, 1, 0.6, 0.85, 0.5, 0.95, 0.65, 0.8, 0.45, 0.75];

  class MediaPlayer extends React.Component {
    constructor(props) {
      super(props);
      this.state = { ready: false, playing: false, failed: false };
      this.box = React.createRef();
      this.togglePlay = this.togglePlay.bind(this);
      this.replay = this.replay.bind(this);
    }

    wantsPlay() { return this.props.play != null ? !!this.props.play : !!this.props.autoPlay; }

    // Plays or pauses to match the `play` prop. Spotify's first play() loads the track; later ones resume it.
    applyPlay() {
      var m = this.props.media, on = this.wantsPlay();
      if (this.yt && this.yt.playVideo) { if (on) this.yt.playVideo(); else this.yt.pauseVideo(); }
      else if (this.sp) {
        if (on && !this.started) { this.started = true; this.sp.play(); if (m && m.start) this.sp.seek(m.start); }
        else if (on) this.sp.resume();
        else if (this.started) this.sp.pause();
      }
    }

    componentDidUpdate(prev) {
      if (prev.play !== this.props.play && this.state.ready) this.applyPlay();
    }

    componentDidMount() {
      var self = this, m = this.props.media;
      if (!m) return;
      var mount = document.createElement('div');
      mount.style.width = '100%'; mount.style.height = '100%';
      this.box.current.appendChild(mount);
      if (m.kind === 'youtube') {
        loadYouTube().then(function (YT) {
          if (self.dead) return;
          self.yt = new YT.Player(mount, {
            width: '100%', height: '100%', videoId: m.id,
            playerVars: { start: m.start || 0, autoplay: self.wantsPlay() ? 1 : 0, rel: 0, playsinline: 1, modestbranding: 1 },
            events: {
              onReady: function () { if (!self.dead) self.setState({ ready: true }); },
              onStateChange: function (e) { if (!self.dead) self.setState({ playing: e.data === 1 || e.data === 3 }); }
            }
          });
        }).catch(function () { if (!self.dead) self.setState({ failed: true }); });
      } else if (m.kind === 'spotify') {
        loadSpotify().then(function (api) {
          if (self.dead) return;
          api.createController(mount, { uri: m.uri, width: '100%', height: '100%' }, function (c) {
            if (self.dead) { c.destroy(); return; }
            self.sp = c;
            c.addListener('ready', function () {
              if (self.dead) return;
              self.setState({ ready: true });
              if (self.wantsPlay()) self.applyPlay();
            });
            c.addListener('playback_update', function (e) { if (!self.dead) self.setState({ playing: !e.data.isPaused }); });
          });
        }).catch(function () { if (!self.dead) self.setState({ failed: true }); });
      }
    }

    componentWillUnmount() {
      this.dead = true;
      try { if (this.yt && this.yt.destroy) this.yt.destroy(); } catch (e) {}
      try { if (this.sp && this.sp.destroy) this.sp.destroy(); } catch (e) {}
    }

    togglePlay() {
      if (this.yt && this.yt.getPlayerState) { if (this.state.playing) this.yt.pauseVideo(); else this.yt.playVideo(); }
      else if (this.sp) { if (!this.started) { this.started = true; this.sp.play(); } else this.sp.togglePlay(); }
    }

    replay() {
      var start = (this.props.media && this.props.media.start) || 0;
      if (this.yt && this.yt.seekTo) { this.yt.seekTo(start, true); this.yt.playVideo(); }
      else if (this.sp) { this.sp.seek(start); this.sp.resume(); }
    }

    render() {
      var p = this.props, st = this.state;
      var hidden = !!p.hidden;
      return html`
<div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; gap: 12px">
<div style="position: relative; flex-grow: 1; min-height: 160px; max-height: 100%; aspect-ratio: 16 / 9; max-width: 100%; border-radius: var(--radius-lg); overflow: hidden; background: var(--color-neutral-900); box-shadow: var(--shadow-md), 0 0 0 1px var(--color-divider), 0 0 48px color-mix(in srgb, var(--color-accent) 25%, transparent)">
<div ref=${this.box} style="position: absolute; inset: 0"></div>
<div aria-hidden=${!hidden} style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; background: radial-gradient(ellipse 80% 70% at 50% 110%, color-mix(in srgb, var(--color-accent) 30%, transparent), transparent 70%), linear-gradient(to bottom, var(--color-section), var(--color-bg)); transition: opacity .6s; opacity: ${hidden ? 1 : 0}; pointer-events: ${hidden ? 'auto' : 'none'}">
<div style="display: flex; align-items: flex-end; gap: 7px; height: 96px">
${BARS.map(function (b, i) { return html`<span key=${i} style="width: 12px; height: ${Math.round(b * 96)}px; border-radius: 6px 6px 2px 2px; background: linear-gradient(to top, var(--color-accent-600), var(--color-accent-300)); box-shadow: 0 0 14px color-mix(in srgb, var(--color-accent) 50%, transparent); transform-origin: bottom; animation: qpEq ${0.7 + (i % 4) * 0.18}s ease-in-out ${(i % 5) * 0.11}s infinite alternate; animation-play-state: ${st.playing ? 'running' : 'paused'}"></span>`; })}
</div>
<span style="font-size: 14px; letter-spacing: .12em; text-transform: uppercase; color: var(--color-accent-300)">${st.failed ? 'Lecteur indisponible' : st.playing ? 'Écoutez bien…' : !st.ready ? 'Chargement…' : this.wantsPlay() || this.started ? 'En pause' : 'Prêt'}</span>
</div>
</div>
${p.controls === false ? null : html`<div style="display: flex; gap: 8px">
<button class="btn btn-secondary" onClick=${this.togglePlay} disabled=${!st.ready} style="height: 44px; padding: 0 18px; font-size: 15px; gap: 8px">${st.playing
  ? html`<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><rect x="56" y="40" width="48" height="176" rx="8"></rect><rect x="152" y="40" width="48" height="176" rx="8"></rect></svg>`
  : html`<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M72 39.9v176.2a8 8 0 0 0 12.2 6.8l144-88.1a8 8 0 0 0 0-13.6l-144-88.1A8 8 0 0 0 72 39.9z"></path></svg>`}${st.playing ? 'Pause' : 'Lecture'}</button>
<button class="btn btn-secondary" onClick=${this.replay} disabled=${!st.ready} style="height: 44px; padding: 0 18px; font-size: 15px; gap: 8px"><svg width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M40 128a88 88 0 1 0 26-62.5L40 92"></path><path d="M40 44v48h48"></path></svg>Réécouter</button>
</div>`}
</div>`;
    }
  }

  window.MediaPlayer = MediaPlayer;
})();
